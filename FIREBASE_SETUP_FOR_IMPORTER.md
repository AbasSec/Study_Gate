# Firebase Setup for University Content Importer

The importer script requires Firebase Admin SDK credentials to write to Firestore. This guide explains how to set them up.

---

## Quick Setup (3 Steps)

### Step 1: Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **horizons-cee8d**
3. Click **⚙️ Project Settings** (top-right gear icon)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the file as `serviceAccountKey.json` in your project root

### Step 2: Keep the Key Secure

Add to `.gitignore` (already done):
```
serviceAccountKey.json
```

This prevents the key from being committed to Git.

### Step 3: Run Commit Mode

```bash
npm run import:university-content:commit
```

The importer will find and use `serviceAccountKey.json` automatically.

---

## Alternative: Environment Variable

Instead of placing the file in your project root, you can use an environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
npm run import:university-content:commit
```

Or on Windows:
```cmd
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\serviceAccountKey.json
npm run import:university-content:commit
```

---

## File Locations (Checked in Order)

The importer looks for the service account key in these locations:

1. `./serviceAccountKey.json` (project root)
2. `./.firebase/serviceAccountKey.json`
3. `./firebase/serviceAccountKey.json`
4. Path from `GOOGLE_APPLICATION_CREDENTIALS` env var

Use the first one for simplicity.

---

## What's in the Key?

The service account key JSON file contains:

```json
{
  "type": "service_account",
  "project_id": "horizons-cee8d",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

This grants admin access to your Firestore. **Keep it secret.**

---

## Security Best Practices

✅ **DO:**
- Store the key in `.gitignore`
- Use environment variables in CI/CD
- Restrict service account permissions in Firebase Console
- Rotate keys periodically

❌ **DON'T:**
- Commit the key to Git
- Share the key in emails or messaging apps
- Use the same key across multiple environments
- Leave the key visible in code

---

## Troubleshooting

### "Firebase service account key not found"

This means the importer can't find the credentials file.

**Fix:**
1. Download the key from Firebase Console (see Step 1 above)
2. Save it as `serviceAccountKey.json` in project root
3. Run commit again

### "Permission denied" errors

This means the service account lacks permissions in Firestore.

**Fix:**
1. Go to Firebase Console → Firestore Database → Rules
2. Ensure rules allow the service account to write
3. The default rules should work fine

### "Project ID mismatch"

The key is for a different Firebase project.

**Fix:**
1. Verify you downloaded the key for **horizons-cee8d**
2. Delete the wrong key and download the correct one
3. Run commit again

---

## Firebase Admin SDK Features Used

The importer uses these Firebase Admin SDK capabilities:

- ✅ `admin.initializeApp()` — Initialize Firebase
- ✅ `admin.credential.cert()` — Load service account credentials
- ✅ `admin.firestore()` — Access Firestore database
- ✅ `.collection().add()` — Create new documents
- ✅ `.collection().doc().update()` — Update documents
- ✅ `.collection().where()` — Query for duplicates
- ✅ `.FieldValue.serverTimestamp()` — Auto timestamps

---

## Testing the Setup

After setting up the key, test it:

```bash
# This should succeed and show your project ID
npm run import:university-content:commit
```

You'll see:
```
✅ Firebase initialized for project: horizons-cee8d
📤 Writing to Firestore...
```

If it doesn't work, see Troubleshooting section above.

---

## Next Steps

1. ✅ Install firebase-admin: `npm install` (already done)
2. ⏳ Download serviceAccountKey.json from Firebase Console
3. ⏳ Place it in project root
4. ⏳ Run: `npm run import:university-content:commit`

The importer will then write INTI university, 129 courses, and 129 offerings to Firestore.
