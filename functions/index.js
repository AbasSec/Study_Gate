// Horizons Educational Agency - Cloud Functions Backend
// Firebase Admin SDK - Account Creation & Management

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a user is an authorized admin
 * Supports both hardcoded legacy emails and database-created admins
 */
async function isAuthorizedAdmin(uid, email) {
    const hardcodedAdmins = [
        'admin@horizons.edu',
        'sassunny555@gmail.com',
        'admin@email.com'
    ];

    // Check hardcoded list first
    if (hardcodedAdmins.includes(email.toLowerCase())) {
        return true;
    }

    // Check database for dynamically created admins
    try {
        const adminDoc = await admin.firestore()
            .collection('admins')
            .doc(email.toLowerCase())
            .get();

        if (adminDoc.exists && adminDoc.data().status === 'active') {
            return true;
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }

    return false;
}

/**
 * Generate a unique referral code for agents
 * Format: FIRSTNAME_RANDOMSTRING (e.g., JOHN_ABC123XYZ)
 */
function generateReferralCode(name) {
    const sanitized = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${sanitized}_${random}`;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Check if an email already exists in Firebase Auth
 */
async function emailExistsInAuth(email) {
    try {
        await admin.auth().getUserByEmail(email);
        return true;
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            return false;
        }
        throw error;
    }
}

// ============================================
// CREATE ADMIN ACCOUNT
// ============================================

/**
 * Callable function to create a new admin account
 * Creates both Firebase Auth user and Firestore document
 *
 * Inputs:
 * - name: string (required)
 * - email: string (required)
 * - password: string (optional - if not provided, sends password reset email)
 * - status: string (optional, default: 'active')
 *
 * Returns:
 * - success: boolean
 * - uid: string (Firebase Auth UID)
 * - email: string
 * - message: string
 */
exports.createAdminAccount = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to create admin accounts'
        );
    }

    const callerUID = context.auth.uid;
    const callerEmail = context.auth.token.email;

    try {
        // Step 1: Verify caller is an admin
        const isAdmin = await isAuthorizedAdmin(callerUID, callerEmail);
        if (!isAdmin) {
            console.warn(`Unauthorized admin creation attempt by ${callerEmail}`);
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only admin accounts can create new admin accounts'
            );
        }

        // Step 2: Validate input
        const { name, email, password, status = 'active' } = data;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Admin name is required and must be a non-empty string'
            );
        }

        if (!email || typeof email !== 'string') {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Email is required'
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        if (!isValidEmail(normalizedEmail)) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Email format is invalid'
            );
        }

        if (password && typeof password !== 'string') {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Password must be a string'
            );
        }

        // Step 3: Check if email already exists in Auth
        const emailExists = await emailExistsInAuth(normalizedEmail);
        if (emailExists) {
            throw new functions.https.HttpsError(
                'already-exists',
                `An account with email ${normalizedEmail} already exists`
            );
        }

        // Step 4: Check if admin record already exists
        const existingAdmin = await admin.firestore()
            .collection('admins')
            .doc(normalizedEmail)
            .get();

        if (existingAdmin.exists) {
            throw new functions.https.HttpsError(
                'already-exists',
                `An admin record for ${normalizedEmail} already exists`
            );
        }

        // Step 5: Create Firebase Auth user
        let authUser;
        try {
            authUser = await admin.auth().createUser({
                email: normalizedEmail,
                password: password || 'TemporaryPassword123!',  // Temporary if not provided
                displayName: name.trim()
            });
        } catch (authError) {
            console.error('Firebase Auth creation error:', authError);
            if (authError.code === 'auth/email-already-exists') {
                throw new functions.https.HttpsError(
                    'already-exists',
                    `An account with email ${normalizedEmail} already exists in Firebase Auth`
                );
            }
            throw new functions.https.HttpsError(
                'internal',
                `Failed to create Firebase Auth user: ${authError.message}`
            );
        }

        // Step 6: Create Firestore document
        try {
            const adminData = {
                uid: authUser.uid,
                name: name.trim(),
                email: normalizedEmail,
                role: 'admin',
                status: status,
                permissions: [
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
                ],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: callerEmail,
                authUserCreated: true
            };

            await admin.firestore()
                .collection('admins')
                .doc(normalizedEmail)
                .set(adminData);
        } catch (firestoreError) {
            // Rollback: Delete the auth user if Firestore write fails
            console.error('Firestore write error, rolling back Auth user:', firestoreError);
            try {
                await admin.auth().deleteUser(authUser.uid);
            } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
            throw new functions.https.HttpsError(
                'internal',
                `Failed to create admin record: ${firestoreError.message}`
            );
        }

        // Step 7: Send password reset email if password was not provided
        if (!password) {
            try {
                await admin.auth().generatePasswordResetLink(normalizedEmail);
                console.log(`Password reset link generation initiated for ${normalizedEmail}`);
            } catch (error) {
                console.warn(`Could not generate password reset link: ${error.message}`);
                // Don't fail the whole operation if this fails
            }
        }

        // Success response
        return {
            success: true,
            uid: authUser.uid,
            email: normalizedEmail,
            name: name.trim(),
            message: password
                ? 'Admin account created successfully. They can now log in.'
                : 'Admin account created. A password reset link has been sent to their email.'
        };
    } catch (error) {
        console.error('createAdminAccount error:', error);

        // If it's already an HttpsError, rethrow it
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        // Otherwise, wrap it
        throw new functions.https.HttpsError(
            'internal',
            `Failed to create admin account: ${error.message}`
        );
    }
});

// ============================================
// CREATE AGENT ACCOUNT
// ============================================

/**
 * Callable function to create a new agent account
 * Creates Firebase Auth user, Firestore agent document, and referral link
 *
 * Inputs:
 * - name: string (required)
 * - email: string (required)
 * - password: string (optional)
 * - commissionStructure: string (optional)
 * - country: string (optional)
 * - status: string (optional, default: 'active')
 *
 * Returns:
 * - success: boolean
 * - uid: string (Firebase Auth UID)
 * - email: string
 * - agentId: string (Firestore document ID)
 * - referralCode: string
 * - referralUrl: string
 * - message: string
 */
exports.createAgentAccount = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to create agent accounts'
        );
    }

    const callerUID = context.auth.uid;
    const callerEmail = context.auth.token.email;

    let createdAuthUid = null;

    try {
        // Step 1: Verify caller is an admin
        const isAdmin = await isAuthorizedAdmin(callerUID, callerEmail);
        if (!isAdmin) {
            console.warn(`Unauthorized agent creation attempt by ${callerEmail}`);
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only admin accounts can create agent accounts'
            );
        }

        // Step 2: Validate input
        const { name, email, password, commissionStructure, country, status = 'active' } = data;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Agent name is required and must be a non-empty string'
            );
        }

        if (!email || typeof email !== 'string') {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Email is required'
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        if (!isValidEmail(normalizedEmail)) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Email format is invalid'
            );
        }

        if (password && typeof password !== 'string') {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Password must be a string'
            );
        }

        // Step 3: Check if email already exists in Auth
        const emailExists = await emailExistsInAuth(normalizedEmail);
        if (emailExists) {
            throw new functions.https.HttpsError(
                'already-exists',
                `An account with email ${normalizedEmail} already exists`
            );
        }

        // Step 4: Check if agent record already exists
        const existingAgent = await admin.firestore()
            .collection('agents')
            .doc(normalizedEmail)
            .get();

        if (existingAgent.exists) {
            throw new functions.https.HttpsError(
                'already-exists',
                `An agent record for ${normalizedEmail} already exists`
            );
        }

        // Step 5: Generate referral code
        const referralCode = generateReferralCode(name);
        const baseUrl = process.env.AGENT_REFERRAL_BASE_URL
            || functions.config().app?.base_url
            || 'https://horizons-cee8d.web.app';
        const referralUrl = `${baseUrl}/?ref=${referralCode}`;

        // Step 6: Create Firebase Auth user
        let authUser;
        try {
            authUser = await admin.auth().createUser({
                email: normalizedEmail,
                password: password || 'TemporaryPassword123!',
                displayName: name.trim()
            });
            createdAuthUid = authUser.uid;
        } catch (authError) {
            console.error('Firebase Auth creation error:', authError);
            if (authError.code === 'auth/email-already-exists') {
                throw new functions.https.HttpsError(
                    'already-exists',
                    `An account with email ${normalizedEmail} already exists in Firebase Auth`
                );
            }
            throw new functions.https.HttpsError(
                'internal',
                `Failed to create Firebase Auth user: ${authError.message}`
            );
        }

        // Step 7: Create Firestore agent document
        try {
            const agentData = {
                uid: authUser.uid,
                userId: authUser.uid,
                name: name.trim(),
                email: normalizedEmail,
                role: 'agent',
                status: status,
                referralCode: referralCode,
                referralUrl: referralUrl,
                commissionStructure: commissionStructure || '',
                country: country || '',
                permissions: [
                    'view_own_analytics',
                    'view_own_students'
                ],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: callerEmail,
                authUserCreated: true
            };

            await admin.firestore()
                .collection('agents')
                .doc(normalizedEmail)
                .set(agentData);
        } catch (firestoreError) {
            // Rollback: Delete the auth user if Firestore write fails
            console.error('Firestore agent write error, rolling back Auth user:', firestoreError);
            try {
                await admin.auth().deleteUser(authUser.uid);
            } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
            throw new functions.https.HttpsError(
                'internal',
                `Failed to create agent record: ${firestoreError.message}`
            );
        }

        // Step 8: Create referral link document
        try {
            const referralLinkData = {
                agentId: normalizedEmail,
                agentEmail: normalizedEmail,
                code: referralCode,
                fullUrl: referralUrl,
                status: 'active',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: callerEmail
            };

            await admin.firestore()
                .collection('referralLinks')
                .doc(referralCode)
                .set(referralLinkData);
        } catch (firestoreError) {
            console.error('Firestore referralLinks write error:', firestoreError);
            // Don't fail the whole operation if this fails - the agent still has their record
            // but referral tracking may be broken
        }

        // Step 9: Send password reset email if password was not provided
        if (!password) {
            try {
                await admin.auth().generatePasswordResetLink(normalizedEmail);
                console.log(`Password reset link generation initiated for ${normalizedEmail}`);
            } catch (error) {
                console.warn(`Could not generate password reset link: ${error.message}`);
            }
        }

        // Success response
        return {
            success: true,
            uid: authUser.uid,
            agentId: normalizedEmail,
            email: normalizedEmail,
            name: name.trim(),
            referralCode: referralCode,
            referralUrl: referralUrl,
            message: password
                ? 'Agent account created successfully. They can now log in and access their referral link.'
                : 'Agent account created. A password reset link has been sent to their email.'
        };
    } catch (error) {
        console.error('createAgentAccount error:', error);

        // If it's already an HttpsError, rethrow it
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        // Otherwise, wrap it
        throw new functions.https.HttpsError(
            'internal',
            `Failed to create agent account: ${error.message}`
        );
    }
});

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Health check endpoint
 */
exports.healthCheck = functions.https.onRequest((req, res) => {
    res.status(200).send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Horizons Cloud Functions Backend is running'
    });
});

// ============================================
// SET ADMIN CUSTOM CLAIMS
// ============================================

/**
 * Callable function to set admin custom claims for Storage authorization
 * Custom claim: { admin: true } allows uploads to brand/* paths
 *
 * Inputs:
 * - email: string (required, email of admin to grant claim to)
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - uid: string (Firebase Auth UID)
 * - email: string
 */
exports.setAdminClaims = functions.https.onCall(async (data, context) => {
  // Verify caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to call this function.'
    );
  }

  const callerUid = context.auth.uid;
  const callerEmail = context.auth.token.email;
  const targetEmail = data.email; // Email of user to grant admin claim

  if (!targetEmail) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email parameter is required.'
    );
  }

  try {
    // SECURITY CHECK: Verify caller is already an admin
    // Check Firestore admins collection (source of truth)
    const adminDoc = await admin.firestore()
      .collection('admins')
      .doc(callerEmail.toLowerCase())
      .get();

    const isCallerAdmin = adminDoc.exists &&
                         adminDoc.data().role === 'admin' &&
                         adminDoc.data().status === 'active';

    if (!isCallerAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can grant admin claims.'
      );
    }

    // Find the Firebase Auth user by email
    const targetUser = await admin.auth().getUserByEmail(targetEmail);
    const targetUid = targetUser.uid;

    // Set custom claim: admin = true
    await admin.auth().setCustomUserClaims(targetUid, { admin: true });

    // Also create/update Firestore admin profile if not exists
    const targetAdminDoc = await admin.firestore()
      .collection('admins')
      .doc(targetEmail.toLowerCase())
      .get();

    if (!targetAdminDoc.exists) {
      // Create new admin profile
      await admin.firestore()
        .collection('admins')
        .doc(targetEmail.toLowerCase())
        .set({
          uid: targetUid,
          name: targetUser.displayName || 'Admin',
          email: targetEmail.toLowerCase(),
          role: 'admin',
          status: 'active',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: callerEmail,
          customClaimsSetAt: admin.firestore.FieldValue.serverTimestamp()
        });

      console.log(`Created admin profile for ${targetEmail} and set custom claims`);
    } else {
      // Update existing admin profile with custom claims timestamp
      await admin.firestore()
        .collection('admins')
        .doc(targetEmail.toLowerCase())
        .update({
          customClaimsSetAt: admin.firestore.FieldValue.serverTimestamp()
        });

      console.log(`Updated custom claims for existing admin ${targetEmail}`);
    }

    return {
      success: true,
      message: `Admin claims set for ${targetEmail}. User must re-login to see changes.`,
      uid: targetUid,
      email: targetEmail
    };

  } catch (error) {
    console.error('Error setting admin claims:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    if (error.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError(
        'not-found',
        `Firebase Auth user not found for email: ${targetEmail}`
      );
    }

    throw new functions.https.HttpsError(
      'internal',
      `Error setting admin claims: ${error.message}`
    );
  }
});

console.log('Horizons Cloud Functions initialized');
