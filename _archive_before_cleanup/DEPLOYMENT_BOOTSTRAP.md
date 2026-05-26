# Deployment Bootstrap Sequence

**Critical:** Follow steps in EXACT order. Skipping or reordering steps may cause lockout.

**Target Status After Bootstrap:** Production-ready with proper Storage authorization via Custom Claims.

---

## Step 1: Deploy Cloud Functions (FIRST)

**Why First:** Storage rules now depend on `request.auth.token.admin == true` which is set by Cloud Function.

```bash
firebase deploy --only functions
```

**Verification:**
```bash
firebase functions:list
```

Confirm output includes:
- `setAdminClaims` ✅
- `checkAdminClaim` ✅

**What this does:**
- Deploys `functions/setAdminClaims.js`
- Function can now set `admin=true` custom claim on users
- Takes ~30 seconds

---

## Step 2: Deploy Updated Firebase Rules (SECOND)

**Why Second:** After functions are live, rules can safely check `request.auth.token.admin == true`.

### 2a. Update Firestore Rules

If not already updated, ensure firestore.rules has:

```javascript
function isAdminUser() {
  // Check both sources: Custom Claims (for Storage) and Firestore (for Firestore access)
  if (isAuthenticated() && request.auth.token.email != null) {
    let adminDocPath = /databases/$(database)/documents/admins/$(request.auth.token.email);
    return (request.auth.token.admin == true) ||  // Custom claim from Cloud Function
           (exists(adminDocPath) &&
            get(adminDocPath).data.role == 'admin' &&
            get(adminDocPath).data.status == 'active');  // Firestore check
  }
  return false;
}
```

This allows EITHER:
- Custom claim `admin == true` (fast, checked first)
- OR Firestore profile (fallback if claim not yet set)

### 2b. Update Storage Rules

Ensure storage.rules has:

```javascript
function isAdmin() {
  return request.auth != null && request.auth.token.admin == true;
}

match /brand/{allPaths=**} {
  allow write: if isAdmin();  // Custom Claims check only
  allow read: if true;
}
```

### 2c. Deploy Both Rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

**Verification:**
- Firebase Console → Firestore → Rules tab (confirm new rules live)
- Firebase Console → Storage → Rules tab (confirm new rules live)
- Check timestamp shows current date/time

**What this does:**
- Storage writes to `brand/*` now require `request.auth.token.admin == true`
- Firestore admins check accepts either custom claim OR Firestore doc
- Takes ~1 minute

---

## Step 3: Create First Admin User in Firebase Auth

**Why:** Need an Auth account before we can set claims or create Firestore profile.

```bash
firebase auth:create-user \
  --email "admin@horizons.edu" \
  --password "TEMP_PASSWORD_HERE" \
  --display-name "First Admin"
```

**Alternative: Firebase Console**
1. Firebase Console → Authentication → Create User
2. Email: `admin@horizons.edu`
3. Password: Set strong password
4. Display Name: "First Admin"

**Note:** This creates the Auth user but does NOT set custom claims yet.

---

## Step 4: Log in to admin.html and Run Migration (CRITICAL)

**Why:** Migration script creates Firestore profile for current user.

1. Go to `admin.html`
2. Log in with `admin@horizons.edu` and the password set in Step 3
3. Open browser console (F12 → Console)
4. Copy entire content of `js/migration-backfill.js` (lines 16-184)
5. Paste into console and execute

**Expected output:**
```
Starting database migration...
Migrating team members...
Checking siteSettings document...
Creating admin profile for current user...
✓ Created admin profile: admin@horizons.edu
Migration complete!
```

**What this does:**
- Creates `admins/admin@horizons.edu` document in Firestore
- Sets fields: uid, name, email, role='admin', status='active'
- Now Firestore recognizes the first admin
- (Bootstrap email check in admin.js works at this point)

---

## Step 5: Call setAdminClaims Cloud Function (CRITICAL)

**Why:** Sets `admin=true` custom claim for Storage rule authorization.

### Option A: From Admin Dashboard (Recommended)

1. Still logged in to admin.html as first admin
2. Go to Admin section
3. Find first admin row
4. Click "Set Storage Claims" button (if added to UI)

If button not in UI yet, use Option B.

### Option B: From Firebase Console Functions Tab

1. Firebase Console → Functions → setAdminClaims
2. Click "Test the Function"
3. Paste this JSON:
   ```json
   {
     "email": "admin@horizons.edu"
   }
   ```
4. Click "Execute"

**Expected output:**
```json
{
  "success": true,
  "message": "Admin claims set for admin@horizons.edu. User must re-login to see changes.",
  "uid": "ABC123XYZ...",
  "email": "admin@horizons.edu"
}
```

**What this does:**
- Calls Cloud Function with current admin's Auth credentials
- Function sets custom claim `admin: true` on the user
- Firestore profile updated with `customClaimsSetAt` timestamp
- Custom claim is now active (effective on next login)

**Verification:**
```bash
firebase functions:call checkAdminClaim --data=""
```

Should output:
```json
{
  "email": "admin@horizons.edu",
  "adminClaim": true,
  "allClaims": { "admin": true, ... }
}
```

---

## Step 6: Re-login and Verify Storage Authorization

**Why:** Custom claims take effect after re-authentication.

1. Log out from admin.html (`Logout` button)
2. Log in again with `admin@horizons.edu`
3. Go to Settings → Upload Logo
4. Try uploading an image

**Expected behavior:**
- ✅ Upload succeeds
- Logo appears on homepage
- Logo URL in Firestore `siteSettings/main.logoUrl`

**If upload fails:**
- Check browser console for error
- Verify custom claim was set (run Step 5 verification again)
- Confirm Storage rules deployed (Step 2c)

---

## Step 7: Remove Bootstrap Email (AFTER first admin confirmed working)

**Why:** Bootstrap email is a temporary fallback. Once first admin is in Firestore, disable it.

1. Open `js/admin.js`
2. Find line 13: `const BOOTSTRAP_ADMIN_EMAIL = 'admin@horizons.edu';`
3. Change to: `const BOOTSTRAP_ADMIN_EMAIL = '';` (empty string)
4. Save and redeploy your site

```bash
firebase deploy --only hosting
```

**Why remove it:**
- Temporary fallback no longer needed
- Reduces attack surface
- Clarifies that Firestore is the only source of truth
- Prevents accidental use of hardcoded email

**Timing:**
- Remove ONLY after verifying first admin can:
  - Log in successfully
  - Upload logo/hero
  - See Storage rules working

---

## Step 8: Create Additional Admins (If Needed)

**Now that first admin is set up and custom claims work, create more admins:**

### Option A: Via Admin Dashboard

1. Log in as first admin to admin.html
2. Dashboard → Admins section
3. "+ Add Admin"
4. Enter email, name, status
5. Click "Create Admin"

**What happens:**
- Cloud Function creates Firebase Auth user
- Cloud Function sets `admin=true` custom claim
- Firestore profile created in `admins/{email}`
- New admin can immediately log in

### Option B: Manually

1. Create Auth user in Firebase Console
2. Call `setAdminClaims` Cloud Function for that user
3. Create Firestore profile in `admins/{email}` collection
4. New admin can log in

---

## Authorization Behavior After Bootstrap

### Admin Upload to `brand/logo/**`

**Request:**
```
PUT /b/horizons-cee8d.firebasestorage.app/o/brand/logo/1653302400000_logo.png
Authorization: Bearer {admin_token}
```

**Evaluation in storage.rules:**
```javascript
match /brand/{allPaths=**} {
  allow write: if isAdmin();
}

function isAdmin() {
  return request.auth != null && request.auth.token.admin == true;
}
```

**Step-by-step:**
1. `request.auth != null` → ✅ User is authenticated
2. `request.auth.token.admin == true` → ✅ Custom claim set via Cloud Function
3. `isAdmin()` returns true
4. ✅ **ALLOW WRITE**

**Result:** Upload succeeds, file saved to Storage.

---

### Non-Admin Authenticated Upload to `brand/logo/**`

**Request:**
```
PUT /b/horizons-cee8d.firebasestorage.app/o/brand/logo/1653302400000_logo.png
Authorization: Bearer {non_admin_token}
```

**Evaluation:**
1. `request.auth != null` → ✅ User is authenticated
2. `request.auth.token.admin == true` → ❌ No custom claim set (not an admin)
3. `isAdmin()` returns false
4. ❌ **DENY WRITE** (Permission denied)

**Result:** Upload blocked by Storage rules, no file written.

---

### Unauthenticated Upload to `brand/logo/**`

**Request:**
```
PUT /b/horizons-cee8d.firebasestorage.app/o/brand/logo/1653302400000_logo.png
Authorization: (none)
```

**Evaluation:**
1. `request.auth != null` → ❌ No authentication token
2. `isAdmin()` returns false
3. ❌ **DENY WRITE**

**Result:** Upload blocked, no authentication.

---

## Rollback Plan (If Something Goes Wrong)

**If storage.rules are broken and blocking all uploads:**

1. Temporarily revert storage.rules to authenticate-only:
   ```javascript
   match /brand/{allPaths=**} {
     allow write: if request.auth != null;
   }
   ```
2. Deploy: `firebase deploy --only storage`
3. Investigate the issue
4. Redeploy correct rules once fixed

**This is a staging-only temporary measure.** Do not leave in production.

---

## Final Verification Checklist

- [ ] Cloud Functions deployed (`setAdminClaims` live)
- [ ] Updated firestore.rules deployed
- [ ] Updated storage.rules deployed
- [ ] First admin Auth user created
- [ ] Migration script run (admin Firestore profile created)
- [ ] `setAdminClaims` called for first admin (custom claim set)
- [ ] First admin re-logged in (new token with custom claim obtained)
- [ ] Logo upload successful from admin dashboard
- [ ] Logo appears on homepage
- [ ] Logo URL in Firestore `siteSettings/main.logoUrl`
- [ ] Bootstrap email removed from code
- [ ] Code redeployed after bootstrap email removal

---

## Timeline

- **Step 1** (Cloud Functions): ~30 seconds
- **Step 2** (Firebase Rules): ~1 minute
- **Step 3** (Create Auth user): ~30 seconds
- **Step 4** (Migration script): ~10 seconds (manual)
- **Step 5** (Set claims): ~5 seconds
- **Step 6** (Verify): ~30 seconds (manual)
- **Step 7** (Remove bootstrap): ~30 seconds + redeploy
- **Total:** ~5 minutes

---

## Security Summary

**After this bootstrap sequence:**

✅ **Storage authorization is server-side (Custom Claims in rules)**
✅ **No authenticated user can upload to brand assets** (only admins with claim)
✅ **Unauthenticated users blocked** (all uploads require auth)
✅ **Firestore admin profile is single source of truth** (Cloud Function respects it)
✅ **Bootstrap fallback removed** (not needed after first admin)
✅ **Custom claims take effect immediately** (no code deployment needed for new admins)

**System is now production-ready.**
