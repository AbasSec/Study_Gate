/* ============================================
   StudyGate International Database Initialization Script
   Set up new collections and seed data
   ============================================ */

// Initialize Firestore with new collections structure
async function initializeStudyGate InternationalDatabase() {
    if (!db) {
        console.error('Firebase not initialized');
        return false;
    }

    try {
        console.log('Starting StudyGate International database initialization...');

        // 1. Create contactSettings if not exists
        await ensureContactSettingsExists();

        // 2. Create initial admin role if not exists
        await ensureAdminRoleExists();

        // 3. Verify basic permissions exist
        await ensureBasicPermissionsExist();

        console.log('✓ Database initialization complete');
        return true;
    } catch (error) {
        console.error('Database initialization failed:', error);
        return false;
    }
}

// Ensure contactSettings document exists with default values
async function ensureContactSettingsExists() {
    try {
        const settingsRef = db.collection('contactSettings').doc('main');
        const settingsDoc = await settingsRef.get();

        if (!settingsDoc.exists) {
            const defaultSettings = {
                email: 'info@StudyGate International.edu',
                phone: '+60 12-345-6789',
                whatsapp: '+60102503706',
                address: 'Kuala Lumpur, Malaysia',
                city: 'Kuala Lumpur',
                country: 'Malaysia',
                timezone: 'Asia/Kuala_Lumpur',
                workingHours: {
                    start: '09:00',
                    end: '18:00',
                    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                },
                socialMedia: {
                    facebook: '',
                    twitter: '',
                    instagram: '',
                    linkedin: '',
                    tiktok: '',
                    youtube: ''
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: 'system'
            };

            await settingsRef.set(defaultSettings);
            console.log('✓ Created default contactSettings');
        }
    } catch (error) {
        console.error('Error ensuring contactSettings:', error);
    }
}

// Ensure admin role exists
async function ensureAdminRoleExists() {
    try {
        const rolesRef = db.collection('roles').doc('admin');
        const roleDoc = await rolesRef.get();

        if (!roleDoc.exists) {
            // Get all permission IDs first
            const permissionsSnapshot = await db.collection('permissions').get();
            const permissionIds = permissionsSnapshot.docs.map(doc => doc.id);

            const adminRole = {
                name: 'Admin',
                description: 'Full access to all platform features',
                permissions: permissionIds,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await rolesRef.set(adminRole);
            console.log('✓ Created admin role');
        }
    } catch (error) {
        console.error('Error ensuring admin role:', error);
    }
}

// Ensure basic permissions exist
async function ensureBasicPermissionsExist() {
    try {
        const permissions = [
            { id: 'manage_agents', category: 'agents', name: 'Manage Agents', description: 'Create, edit, and delete agent accounts' },
            { id: 'view_analytics', category: 'analytics', name: 'View Analytics', description: 'View referral and student analytics' },
            { id: 'manage_students', category: 'students', name: 'Manage Students', description: 'Create, edit, and delete student records' },
            { id: 'manage_universities', category: 'content', name: 'Manage Universities', description: 'Create, edit, and delete universities' },
            { id: 'manage_courses', category: 'content', name: 'Manage Courses', description: 'Create, edit, and delete courses' },
            { id: 'manage_team', category: 'content', name: 'Manage Team', description: 'Create, edit, and delete team members' },
            { id: 'manage_contact_settings', category: 'settings', name: 'Manage Contact Settings', description: 'Edit contact information' },
            { id: 'view_audit_logs', category: 'admin', name: 'View Audit Logs', description: 'View system audit logs' }
        ];

        for (const permission of permissions) {
            const permRef = db.collection('permissions').doc(permission.id);
            const permDoc = await permRef.get();

            if (!permDoc.exists) {
                await permRef.set({
                    ...permission,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(`✓ Created permission: ${permission.id}`);
            }
        }
    } catch (error) {
        console.error('Error ensuring permissions:', error);
    }
}

// Create a new admin account
// NOTE: This creates a Firestore document but does NOT create a Firebase Auth account
// A new admin cannot log in until a Firebase Auth user is created separately
// SOLUTION REQUIRED: Implement backend Cloud Function to call admin.auth().createUser()
async function createAdminAccount(adminData) {
    try {
        if (!adminData.email || !adminData.name || !adminData.role) {
            throw new Error('Missing required fields: email, name, role');
        }

        const adminRecord = {
            ...adminData,
            email: adminData.email.toLowerCase(), // Normalize email
            permissions: adminData.role === 'admin' ? [
                'manage_courses',
                'manage_universities',
                'manage_team',
                'manage_testimonials',
                'manage_services',
                'manage_agents',
                'manage_students',
                'view_analytics',
                'manage_contact_settings',
                'view_audit_logs'
            ] : [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: adminData.createdBy || 'system',
            authUserCreated: false  // Flag: indicates if Firebase Auth user was created
        };

        // Use email as document ID so Firestore rules can check by email
        const docRef = db.collection('admins').doc(adminData.email.toLowerCase());
        await docRef.set(adminRecord);

        console.log(`✓ Created admin document: ${adminData.name} (${adminData.email})`);
        console.warn('⚠️  IMPORTANT: Firebase Auth account NOT created. Backend Cloud Function needed to call admin.auth().createUser()');

        return adminData.email.toLowerCase();
    } catch (error) {
        console.error('Error creating admin account:', error);
        throw error;
    }
}

// Create a new agent/influencer account
// NOTE: This creates Firestore documents but does NOT create a Firebase Auth account
// A new agent cannot log in until a Firebase Auth user is created separately
// SOLUTION REQUIRED: Implement backend Cloud Function to call admin.auth().createUser()
async function createAgentAccount(agentData) {
    try {
        if (!agentData.email || !agentData.name || !agentData.role) {
            throw new Error('Missing required fields: email, name, role');
        }

        // Generate referral code
        const referralCode = generateReferralCode(agentData.name);
        const referralUrl = `${window.location.origin}/?ref=${referralCode}`;

        const agentRecord = {
            ...agentData,
            email: agentData.email.toLowerCase(), // Normalize email
            referralCode,
            referralUrl,
            status: 'active',
            userId: '',  // Will be linked when agent first signs in (if Auth user exists)
            permissions: agentData.role === 'agent' ? [
                'view_own_analytics',
                'view_own_students'
            ] : [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: agentData.createdBy || 'admin@StudyGate International.edu',
            authUserCreated: false  // Flag: indicates if Firebase Auth user was created
        };

        // Use email as document ID so Firestore rules and code can look up by email
        const agentDocId = agentData.email.toLowerCase();
        const docRef = db.collection('agents').doc(agentDocId);
        await docRef.set(agentRecord);

        // Also create referral link record
        await db.collection('referralLinks').doc(referralCode).set({
            agentId: agentDocId,
            agentEmail: agentData.email.toLowerCase(),
            code: referralCode,
            fullUrl: referralUrl,
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: agentData.createdBy || 'admin@StudyGate International.edu'
        });

        console.log(`✓ Created agent document: ${agentData.name} (${agentData.email})`);
        console.warn('⚠️  IMPORTANT: Firebase Auth account NOT created. Backend Cloud Function needed to call admin.auth().createUser()');

        return agentDocId;
    } catch (error) {
        console.error('Error creating agent account:', error);
        throw error;
    }
}

// Generate unique referral code
function generateReferralCode(name) {
    const sanitized = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${sanitized}_${random}`;
}

// Track a referral visit (call from public site when user visits via referral link)
async function trackReferralVisit(agentId, referralCode, page = '') {
    try {
        const visitorId = getOrCreateVisitorId();
        const sessionId = getSessionId();

        await db.collection('referralVisits').add({
            agentId,
            referralCode,
            visitorId,
            sessionId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            page: page || window.location.pathname,
            source: 'direct',
            userAgent: navigator.userAgent,
            ipAddress: await getClientIP() || 'unknown',
            countryCode: ''
        });

        console.log(`✓ Tracked referral visit for code: ${referralCode}`);
    } catch (error) {
        console.error('Error tracking referral visit:', error);
    }
}

// Track WhatsApp click
async function trackWhatsAppClick(agentId, referralCode, page = '') {
    try {
        const visitorId = getOrCreateVisitorId();

        await db.collection('whatsappClicks').add({
            agentId: agentId || null,
            referralCode: referralCode || null,
            visitorId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            page: page || window.location.pathname,
            userAgent: navigator.userAgent,
            ipAddress: await getClientIP() || 'unknown'
        });

        console.log('✓ Tracked WhatsApp click');
    } catch (error) {
        console.error('Error tracking WhatsApp click:', error);
    }
}

// Get or create visitor ID (stored in localStorage)
function getOrCreateVisitorId() {
    let visitorId = localStorage.getItem('StudyGate International_visitor_id');
    if (!visitorId) {
        visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('StudyGate International_visitor_id', visitorId);
    }
    return visitorId;
}

// Get current session ID
function getSessionId() {
    let sessionId = sessionStorage.getItem('StudyGate International_session_id');
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('StudyGate International_session_id', sessionId);
    }
    return sessionId;
}

// Get referral code from URL if present
function getReferralCodeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref') || null;
}

// Store referral code in localStorage for persistence
function persistReferralCode(code) {
    if (code) {
        localStorage.setItem('StudyGate International_referral_code', code);
    }
}

// Get referral code (from URL or localStorage)
function getCurrentReferralCode() {
    const urlCode = getReferralCodeFromUrl();
    if (urlCode) {
        persistReferralCode(urlCode);
        return urlCode;
    }
    return localStorage.getItem('StudyGate International_referral_code') || null;
}

// Get client IP (requires backend call or third-party API)
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.warn('Could not fetch client IP:', error);
        return null;
    }
}

// Initialize referral tracking on page load (call from public pages)
function initReferralTracking() {
    const referralCode = getCurrentReferralCode();

    if (referralCode) {
        // Look up agent by referral code
        db.collection('referralLinks')
            .where('code', '==', referralCode)
            .limit(1)
            .get()
            .then(snapshot => {
                if (!snapshot.empty) {
                    const linkDoc = snapshot.docs[0].data();
                    trackReferralVisit(linkDoc.agentId, referralCode);
                }
            })
            .catch(error => console.warn('Error initializing referral tracking:', error));
    }
}

// Attach tracking to WhatsApp button
function attachWhatsAppTracking() {
    const whatsappButtons = document.querySelectorAll('.whatsapp-chat-widget, a[href*="wa.me"]');
    const referralCode = getCurrentReferralCode();

    whatsappButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Look up agent if referral code exists
            if (referralCode) {
                db.collection('referralLinks')
                    .where('code', '==', referralCode)
                    .limit(1)
                    .get()
                    .then(snapshot => {
                        if (!snapshot.empty) {
                            const linkDoc = snapshot.docs[0].data();
                            trackWhatsAppClick(linkDoc.agentId, referralCode);
                        }
                    })
                    .catch(error => console.warn('Error tracking WhatsApp click:', error));
            } else {
                trackWhatsAppClick(null, null);
            }
        });
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('admin-body')) {
        // Only run on public pages
        initReferralTracking();
        attachWhatsAppTracking();
    }
});

console.log('StudyGate International database initialization module loaded');

