# Firebase Spark Plan Deployment Guide

**Status:** ✅ **SPARK-COMPATIBLE**  
**Date:** May 22, 2026  
**Plan:** Firebase Spark (no Cloud Functions, no custom claims)  
**First Admin:** admin.horizons.test@gmail.com (UID: xOlH7JLIAegVHblBngMBF33LdI32)

---

## Overview

This guide is for deployment on **Firebase Spark Plan** only. The Spark plan has limitations:
- ❌ **No Cloud Functions** (not available on Spark)
- ❌ **No Firebase Custom Claims** (requires Cloud Functions to set)
- ❌ **Storage rules cannot query Firestore** (cannot dynamically check admin status)
- ✅ **Can use Firestore for admin authorization** (via document checks in rules)
- ✅ **Can use Storage UID allowlist** (hardcoded admin UIDs in rules)

**Upgrade to Blaze** to:
- Use Cloud Functions for secure admin creation
- Use Firebase Custom Claims for dynamic admin authorization
- Query Firestore in Storage rules

---

## Architecture - Spark Plan

### Admin Authorization
- **Firestore Rules:** Check `admins/{email}` document with `role == 'admin'` and `status == 'active'`
- **Storage Rules:** Check hardcoded UID allowlist (first admin only: `xOlH7JLIAegVHblBngMBF33LdI32`)
- **Manual Setup:** First admin created in Firebase Console, then Firestore profile added

### Admin/Agent Creation
- **Auth Users:** Created manually in Firebase Console
- **Firestore Profiles:** Created via admin dashboard after Auth user exists
- **Passwords:** Stored in Firebase Auth only (never in Firestore)

### Storage Upload Authorization
- **Brand Assets (logo/hero):** Only UID allowlist in rules (first admin only)
- **To add more uploaders:** Update `storage.rules` and redeploy

---

## Pre-Deployment Checklist

- [ ] First admin account created in Firebase Console
  - Email: admin.horizons.test@gmail.com
  - UID: xOlH7JLIAegVHblBngMBF33LdI32
  - Status: Active
- [ ] Firestore `admins` collection exists
- [ ] Firebase Storage bucket exists
- [ ] Project ID matches in all config files
- [ ] `firestore.rules` updated with Spark-compatible `isAdminUser()`
- [ ] `storage.rules` updated with admin UID allowlist
- [ ] `js/admin.js` updated to work without Cloud Functions

---

## Deployment Steps (Spark Plan Only)

### STEP 1: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

**Expected output:**
```
i deploying firestore
✔ firestore: rules updated
```

**Verification:**
- Go to Firebase Console → Firestore → Rules tab
- Confirm timestamp is current
- Confirm `isAdminUser()` function is present

**What the rule does:**
- Allows anyone to read public collections (universities, courses, team, testimonials, services)
- Allows authenticated users to create applications (students submitting forms)
- Allows admins (via Firestore document check) to manage all content

---

### STEP 2: Deploy Storage Rules

```bash
firebase deploy --only storage
```

**Expected output:**
```
i deploying storage
✔ storage: rules updated
```

**Verification:**
- Go to Firebase Console → Storage → Rules tab
- Confirm timestamp is current
- Confirm admin UID is present: `xOlH7JLIAegVHblBngMBF33LdI32`

**What the rule does:**
- Allows only admin UID (`xOlH7JLIAegVHblBngMBF33LdI32`) to upload to `/brand/*`
- Allows anyone to read `/brand/*` (public access to logo/hero)
- Blocks all other uploads

**⚠️ Important:** To add another admin who can upload, edit `storage.rules` and add their UID to the check, then redeploy.

---

### STEP 3: Create First Admin in Firebase Console

**One-time setup. Do NOT do this for every admin.**

Go to **Firebase Console** → **Authentication** → **Users tab**

**Already exists:**
- Email: admin.horizons.test@gmail.com
- UID: xOlH7JLIAegVHblBngMBF33LdI32
- Status: Active

**Skip to Step 4** if first admin already exists.

**If first admin doesn't exist, create now:**
1. Click **+ Create user**
2. Email: `admin.horizons.test@gmail.com`
3. Password: [set temporary password]
4. Click **Create**
5. Copy the UID shown in the user detail page
6. **Note the UID for Step 4**

---

### STEP 4: Create First Admin Firestore Profile

1. Open `admin.html` in browser
2. Try to log in with: `admin.horizons.test@gmail.com` / [password from Step 3]
3. You will see: **"Access Denied - not authorized to access this admin panel"**
4. This is expected - Firestore profile doesn't exist yet

**Create the profile manually in Firebase Console:**

Go to **Firebase Console** → **Firestore** → **+ Start collection**

**Collection settings:**
- Collection ID: `admins`
- Document ID: `admin.horizons.test@gmail.com`

**Add these fields:**
```
uid: string = "xOlH7JLIAegVHblBngMBF33LdI32"
name: string = "Admin"
email: string = "admin.horizons.test@gmail.com"
role: string = "admin"
status: string = "active"
```

Click **Save**.

---

### STEP 5: First Admin Logs In

1. Go to `admin.html`
2. Log out if logged in
3. Log in with: `admin.horizons.test@gmail.com` / [password from Step 3]
4. Dashboard should load
5. You are now authorized (via Firestore document check)

---

### STEP 6: Deploy Hosting

```bash
firebase deploy --only hosting
```

**Expected output:**
```
i deploying hosting
✔ hosting: file uploading... [1-2 min]
✔ hosting: finalize version [1 min]
✔ Deploy complete!
```

---

### STEP 7: Test Admin Features

**Test Firestore Read/Write:**
1. In admin dashboard, go to **Courses** section
2. Click **+ Add Course**
3. Fill in course details and click **Save**
4. Verify course appears in the list
5. Expected: ✅ Create and update work

**Test Storage Upload (Brand Assets):**
1. In admin dashboard, go to **Settings** section
2. Click **Upload Logo** or **Upload Hero Image**
3. Select an image file
4. Click **Upload**
5. Expected: ✅ Upload succeeds, file appears on homepage

---

## Creating Additional Admins (Spark Plan)

**Spark limitation:** Only one admin can upload to brand assets (the UID in `storage.rules`).

### Option 1: Additional Firestore-Only Admins (Spark)

Can manage content but **cannot upload** logo/hero.

**Steps:**
1. Go to Firebase Console → Authentication → **+ Create user**
2. Email: [new admin email]
3. Password: [set password]
4. Copy the UID
5. Go to Firebase Console → Firestore → admins collection
6. Click **+ Add document**
7. Document ID: [new admin email]
8. Fields:
   ```
   uid: string = "[copied UID from step 4]"
   name: string = "[admin name]"
   email: string = "[new admin email]"
   role: string = "admin"
   status: string = "active"
   ```
9. Click **Save**

**New admin can log in to admin.html and manage all content except brand uploads.**

---

### Option 2: Add Uploading Admin (Requires `storage.rules` Update)

To allow another admin to upload brand assets:

1. Create admin in Firebase Console (Steps 1-4 from Option 1)
2. Create Firestore profile (Steps 5-8 from Option 1)
3. **Edit `storage.rules`:**
   ```javascript
   function isAdmin() {
     return request.auth != null && 
            (request.auth.uid == 'xOlH7JLIAegVHblBngMBF33LdI32' ||
             request.auth.uid == 'NEW_ADMIN_UID_HERE');
   }
   ```
4. Replace `NEW_ADMIN_UID_HERE` with the UID from step 1
5. Save and run:
   ```bash
   firebase deploy --only storage
   ```
6. New admin can now upload to brand assets

---

### Option 3: Upgrade to Blaze to Use Cloud Functions

To allow dynamic admin creation with automatic permissions:

1. Upgrade project to **Firebase Blaze plan**
2. Deploy Cloud Functions:
   ```bash
   firebase deploy --only functions
   ```
3. Use `createAdminAccount` Cloud Function from admin dashboard
4. Cloud Function automatically sets custom claims
5. Admin can upload immediately after re-login

---

## Creating Agents (Spark Plan)

### Option A: Manual Firebase Console Auth (Recommended)

**Steps:**
1. Go to Firebase Console → Authentication → **+ Create user**
2. Email: [agent email]
3. Password: [set password]
4. Copy the UID
5. Go to admin dashboard → **Agents** section
6. Click **+ Add Agent**
7. Check: **"Option A (Recommended): Create Auth user manually in Firebase Console, paste UID here"**
8. Fill in:
   - Name
   - Email
   - **Firebase UID:** [paste UID from step 4]
   - Phone
   - Commission
9. Click **Create Agent**
10. Agent profile created in Firestore
11. Agent can log in to `agent.html` with email and password from step 3

---

### Option B: Client-Side Auth (Spark Fallback - Not Recommended)

**Only use if Option A fails.**

**Limitations:**
- Client-side auth is not server-side secure
- May cause admin session issues
- Only acceptable on Spark due to Cloud Functions unavailability

**Steps:**
1. Go to admin dashboard → **Agents** section
2. Click **+ Add Agent**
3. **Uncheck** "Option A" (use default client-side auth)
4. Fill in all fields including password
5. Click **Create Agent**
6. The app will:
   - Create Firebase Auth user using client-side SDK
   - Create Firestore agent profile
7. Agent can log in with email and password

**Risks:**
- Client-side auth exposed in browser code
- May log out admin if not carefully handled
- **Test thoroughly before using in production**

---

## Upgrading from Spark to Blaze

If you need dynamic admin/agent creation with secure server-side handling:

### Switch to Blaze Plan
1. Go to Firebase Console → Billing
2. Upgrade to **Blaze plan** (pay-as-you-go)
3. Confirm billing setup

### Deploy Cloud Functions
```bash
firebase deploy --only functions
```

### Update Firestore Rules (Remove hardcoded checks)
```bash
firebase deploy --only firestore:rules
```

### Update Storage Rules (Use custom claims)
```bash
firebase deploy --only storage
```

### Use Cloud Functions in Admin Dashboard
- Admin dashboard will automatically call `createAdminAccount` and `setAdminClaims`
- Admin creation becomes server-side and secure
- Custom claims automatically set for Storage authorization

---

## Spark Limitations & Workarounds

| Feature | Spark | Workaround |
|---------|-------|-----------|
| Secure admin creation | ❌ No | Manual Console + Firestore profile |
| Secure agent creation | ❌ No | Manual Console OR client-side (risky) |
| Dynamic admin UID list | ❌ No | Edit `storage.rules` and redeploy |
| Custom claims | ❌ No | Use Firestore document checks |
| Storage Firestore queries | ❌ No | Use hardcoded UID allowlist |
| Cloud Functions | ❌ No | Manual setup via Console |
| **Upgrade to Blaze** | ✅ Yes | All above features become available |

---

## Final Checklist

**Before going live on Spark:**

- [ ] `firestore.rules` deployed with Spark-compatible `isAdminUser()`
- [ ] `storage.rules` deployed with admin UID allowlist
- [ ] First admin created in Firebase Console
- [ ] First admin Firestore profile created in Console
- [ ] First admin can log in to `admin.html`
- [ ] First admin can create courses/content
- [ ] First admin can upload logo and hero image
- [ ] Logo and hero image appear on homepage
- [ ] `hosting` deployed
- [ ] Website is live and functional

**Known limitations documented:**
- [ ] Additional admins cannot upload brand assets without `storage.rules` update
- [ ] Agent creation requires manual Auth user or client-side auth
- [ ] No Cloud Functions available
- [ ] No custom claims available
- [ ] All these become available on Blaze plan upgrade

---

## Files Modified

| File | Change | Reason |
|------|--------|--------|
| `firestore.rules` | Removed custom claims fallback, use Firestore document check only | Spark plan - no custom claims |
| `storage.rules` | Changed from custom claims to hardcoded UID allowlist | Spark plan - Storage rules cannot query Firestore |
| `js/admin.js` | Removed Cloud Function calls, added manual UID input for admin/agent creation | Spark plan - no Cloud Functions |
| `js/admin.js` - `checkAdminAuthorization()` | Simplified to Firestore-only check | Spark plan - no custom claims |
| `js/admin.js` - `getAdminForm()` | Added UID field and Spark instructions | Spark plan - require manual Auth user creation |
| `js/admin.js` - `getAgentForm()` | Added Option A (manual) and Option B (client-side) with warnings | Spark plan - limited agent creation options |

---

## FINAL STATUS

### Syntax Validation: ✅ PASS
- `firestore.rules`: Valid Firebase Rules syntax (Spark-compatible)
- `storage.rules`: Valid Firebase Rules syntax (UID allowlist)
- `js/admin.js`: No Cloud Function dependencies

### Deployability: ✅ PASS
```bash
firebase deploy --only firestore:rules,storage,hosting
```
This is the ONLY deployment command needed for Spark.

### Spark Compatibility: ✅ PASS
- No Cloud Functions required
- No custom claims required
- No Firestore queries in Storage rules
- Manual admin/agent creation documented
- All limitations documented with workarounds

### Production Readiness: ⚠️ WITH LIMITATIONS
- ✅ Admin authorization: Firestore document-based
- ✅ Storage authorization: UID-based (first admin only)
- ✅ Content management: Full CRUD via Firestore rules
- ⚠️ Admin creation: Manual, requires Firebase Console access
- ⚠️ Agent creation: Manual or client-side (not server-secure)
- ⚠️ Brand uploads: First admin only (add more admins requires code update)

### Next Steps
1. Review and confirm Spark limitations are acceptable
2. Deploy `firestore.rules`, `storage.rules`, `hosting`
3. Create first admin in Firebase Console
4. Add first admin Firestore profile
5. Test admin login, content management, and brand uploads
6. **Optional:** Upgrade to Blaze for Cloud Functions when budget allows

---

## Support & Questions

**If you need:**
- Secure multi-admin creation → Upgrade to Blaze
- Secure agent creation → Upgrade to Blaze
- Dynamic admin authorization → Upgrade to Blaze
- Custom claims → Upgrade to Blaze

**Spark is suitable for:**
- Single admin managing content
- Basic CRUD operations
- Static admin list (managed via `storage.rules` edits)
- Minimal user/agent management

