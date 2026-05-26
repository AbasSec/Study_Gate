/**
 * Migration & Backfill Script for Horizons Database
 *
 * This script safely updates existing Firestore documents with missing fields.
 * It does NOT delete any existing data.
 *
 * Run this ONCE after updating the codebase:
 * 1. Open browser console on admin.html
 * 2. Copy-paste the entire runMigration() call
 * 3. Wait for completion message
 * 4. Refresh the page
 *
 * This script is idempotent - it can be run multiple times safely.
 */

async function runMigration() {
    if (typeof db === 'undefined') {
        alert('Firebase not initialized. Make sure you are on admin.html');
        return;
    }

    console.log('Starting database migration...');
    let teamUpdated = 0;
    let teamErrors = 0;
    let siteSettingsUpdated = 0;

    try {
        // ========================================
        // MIGRATION 1: Team Member Fields
        // ========================================
        console.log('Migrating team members...');
        const teamSnapshot = await db.collection('team').get();

        for (const doc of teamSnapshot.docs) {
            const teamData = doc.data();
            const updates = {};
            let needsUpdate = false;

            // Add missing whatsappNumber
            if (!teamData.whatsappNumber && !teamData.whatsapp) {
                updates.whatsappNumber = '';
                needsUpdate = true;
            }

            // Add missing active field (default true)
            if (teamData.active === undefined) {
                updates.active = true;
                needsUpdate = true;
            }

            // Add missing showOnHome field (default true)
            if (teamData.showOnHome === undefined) {
                updates.showOnHome = true;
                needsUpdate = true;
            }

            // Add missing showOnTeam field (default true)
            if (teamData.showOnTeam === undefined) {
                updates.showOnTeam = true;
                needsUpdate = true;
            }

            // Add missing order field (default 1)
            if (!teamData.order) {
                updates.order = 1;
                needsUpdate = true;
            }

            // Add missing timestamps (only if creating new)
            if (!teamData.createdAt) {
                updates.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                needsUpdate = true;
            }
            if (!teamData.updatedAt) {
                updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                needsUpdate = true;
            }

            // Normalize photo field name to photoPath (preserve value)
            if (teamData.photo && !teamData.photoPath) {
                updates.photoPath = teamData.photo;
                // Do NOT delete the old field - keep it for backward compatibility
                needsUpdate = true;
            }

            // Normalize position field name to role (preserve value)
            if (teamData.position && !teamData.role) {
                updates.role = teamData.position;
                // Do NOT delete the old field
                needsUpdate = true;
            }

            if (needsUpdate) {
                try {
                    await db.collection('team').doc(doc.id).update(updates);
                    teamUpdated++;
                    console.log(`✓ Updated team member: ${teamData.name}`);
                } catch (error) {
                    teamErrors++;
                    console.error(`✗ Error updating team member ${doc.id}:`, error);
                }
            }
        }

        // ========================================
        // MIGRATION 2: Site Settings Document
        // ========================================
        console.log('Checking siteSettings document...');
        const siteSettingsDoc = await db.collection('siteSettings').doc('main').get();

        if (!siteSettingsDoc.exists) {
            console.log('Creating siteSettings/main document...');
            await db.collection('siteSettings').doc('main').set({
                logoUrl: '',
                heroImageUrl: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            siteSettingsUpdated++;
            console.log('✓ Created siteSettings/main');
        } else {
            const settingsData = siteSettingsDoc.data();
            const settingsUpdates = {};
            let settingsNeedsUpdate = false;

            if (!settingsData.logoUrl) {
                settingsUpdates.logoUrl = '';
                settingsNeedsUpdate = true;
            }
            if (!settingsData.heroImageUrl) {
                settingsUpdates.heroImageUrl = '';
                settingsNeedsUpdate = true;
            }

            if (settingsNeedsUpdate) {
                await db.collection('siteSettings').doc('main').update(settingsUpdates);
                siteSettingsUpdated++;
                console.log('✓ Updated siteSettings/main fields');
            }
        }

        // ========================================
        // MIGRATION 3: Admin Profile Setup (Bootstrap)
        // ========================================
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            const adminEmail = currentUser.email.toLowerCase();
            const adminDoc = await db.collection('admins').doc(adminEmail).get();

            if (!adminDoc.exists) {
                console.log('Creating admin profile for current user...');
                try {
                    await db.collection('admins').doc(adminEmail).set({
                        uid: currentUser.uid,
                        name: currentUser.displayName || 'Admin',
                        email: adminEmail,
                        role: 'admin',
                        status: 'active',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        authUserCreated: true
                    });
                    console.log(`✓ Created admin profile: ${adminEmail}`);
                } catch (error) {
                    console.error('Error creating admin profile:', error);
                }
            }
        }

        // ========================================
        // SUMMARY
        // ========================================
        console.log('\n=== MIGRATION COMPLETE ===');
        console.log(`✓ Team members updated: ${teamUpdated}`);
        if (teamErrors > 0) console.log(`✗ Team member errors: ${teamErrors}`);
        console.log(`✓ Site settings updated: ${siteSettingsUpdated}`);
        alert(`Migration complete!\n\nTeam members updated: ${teamUpdated}\nSite settings updated: ${siteSettingsUpdated}\n\nPlease refresh the page.`);

    } catch (error) {
        console.error('Migration failed:', error);
        alert('Migration error: ' + error.message);
    }
}

// Run the migration
runMigration();
