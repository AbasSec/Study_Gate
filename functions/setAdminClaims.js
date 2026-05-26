/**
 * Cloud Function: Set Admin Custom Claims
 *
 * Purpose: Grant admin upload permissions via Firebase Custom Claims
 *
 * Usage:
 *   1. Deploy this function: firebase deploy --only functions
 *   2. Call from admin.js or Firebase Console Functions tab
 *   3. Function signature: admin.functions().httpsCallable('setAdminClaims')
 *
 * Security:
 *   - Only callable by authenticated admins (checked in function)
 *   - Sets custom claim: admin = true
 *   - Custom claim is checked in storage.rules
 *   - Custom claim is checked in firestore.rules
 *
 * Note:
 *   - Custom claims take effect on next login
 *   - User may need to refresh or re-authenticate to see changes
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

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

/**
 * Cloud Function: Check if user has admin custom claim
 *
 * Used for debugging and verification
 */
exports.checkAdminClaim = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated.'
    );
  }

  const email = context.auth.token.email;
  const customClaims = context.auth.token;

  return {
    email: email,
    uid: context.auth.uid,
    adminClaim: customClaims.admin === true,
    allClaims: customClaims
  };
});
