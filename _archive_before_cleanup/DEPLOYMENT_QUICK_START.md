# Spark Plan Deployment - Quick Start Guide
**Last Updated:** May 22, 2026  
**Status:** ✅ Ready for immediate deployment  
**Time to Deploy:** ~30 minutes (manual steps included)  

---

## 📋 Pre-Deployment Checklist (5 min)

- [ ] Firebase project created and on **Spark plan** (free tier)
- [ ] First admin email ready: `admin.horizons.test@gmail.com`
- [ ] First admin password set in Firebase Console
- [ ] First admin UID copied: `xOlH7JLIAegVHblBngMBF33LdI32`
- [ ] Project ID verified in config (example: `horizons-cee8d`)
- [ ] Firebase CLI installed and authenticated (`firebase login`)

---

## 🚀 Deployment Steps (25 min)

### STEP 1: Deploy Firestore Rules (2 min)
```bash
firebase deploy --only firestore:rules
```
**Expected:** ✅ Rules deployed successfully  
**Verify:** Firebase Console → Firestore → Rules tab (check timestamp)

### STEP 2: Deploy Storage Rules (2 min)
```bash
firebase deploy --only storage
```
**Expected:** ✅ Rules deployed successfully  
**Verify:** Firebase Console → Storage → Rules tab (check timestamp + admin UID present)

### STEP 3: Create First Admin in Firebase Console (3 min)
1. Go to **Firebase Console → Authentication → Users tab**
2. Click **+ Create user**
3. Email: `admin.horizons.test@gmail.com`
4. Password: [set temporary password]
5. Click **Create**
6. **⚠️ Important:** Copy the UID shown in user detail page
   - Expected UID: `xOlH7JLIAegVHblBngMBF33LdI32`
   - If different, update `storage.rules` before next steps

### STEP 4: Create First Admin Firestore Profile (3 min)
1. Go to **Firebase Console → Firestore**
2. Click **+ Start collection**
3. **Collection ID:** `admins`
4. **Document ID:** `admin.horizons.test@gmail.com`
5. Click **Next**
6. Add these fields:
   ```
   uid: string = "xOlH7JLIAegVHblBngMBF33LdI32"
   name: string = "Admin"
   email: string = "admin.horizons.test@gmail.com"
   role: string = "admin"
   status: string = "active"
   ```
7. Click **Save**

**Expected:** ✅ Admin document created  
**Verify:** Admin can log in to admin.html without "Access Denied" error

### STEP 5: Create Core Settings Collections (5 min)
1. Create **siteSettings** collection, document **main**:
   ```
   siteName: string = "Horizons"
   siteDescription: string = "Educational Agency"
   ```

2. Create **contactSettings** collection, document **main**:
   ```
   contactEmail: string = "contact@horizons.test"
   contactPhone: string = ""
   ```

### STEP 6: Test Admin Dashboard (5 min)
1. Open `admin.html` in browser
2. Log in with:
   - Email: `admin.horizons.test@gmail.com`
   - Password: [from Firebase Console step 3]
3. **Expected:** ✅ Dashboard loads, no errors
4. Try creating a course (verify Firestore write works)
5. Try uploading logo (verify Storage write works)

### STEP 7: Deploy Hosting (2 min)
```bash
firebase deploy --only hosting
```
**Expected:** ✅ Deployment complete, website live  
**Verify:** Visit your Firebase hosting URL, check homepage loads

### STEP 8: Final Verification (Ongoing)
- [ ] Homepage displays with Firestore data
- [ ] Universities listing works
- [ ] Courses page works
- [ ] Application form accepts submissions (documents will be null)
- [ ] Admin can manage all content
- [ ] Admin can upload brand assets
- [ ] Logo/hero images appear on homepage

---

## 📂 Reference Documents

**For detailed information, refer to:**

| Document | Use Case | Read When |
|----------|----------|-----------|
| **SPARK_DEPLOYMENT.md** | Full step-by-step guide with detailed instructions and screenshots | Following deployment for detailed reference |
| **FIRESTORE_SCHEMA_MANUAL_BUILD.md** | Complete 22-collection schema specification | Creating collections beyond basic setup |
| **SPARK_PLAN_DEPLOYMENT_READINESS.md** | Comprehensive checklist, validation, known limitations | Validating pre-deployment requirements |
| **SPARK_PLAN_CHANGES_SUMMARY.md** | Detailed before/after code changes | Understanding what changed and why |

---

## ⚡ Key Spark Plan Constraints

### What Works ✅
- Firestore (free tier, fully functional)
- Firebase Auth (free tier)
- Firebase Hosting (free tier)
- Storage brand uploads (protected by UID allowlist)
- Admin dashboard CRUD
- All public pages

### What Doesn't Work ❌
- Application file uploads (disabled—Spark has no Storage)
- Adding admin uploaders without code change (UID allowlist in rules)
- Secure server-side auth creation (no Cloud Functions)
- Custom claims (requires Cloud Functions)

### Workarounds 🔧
- **Files:** Admins collect via email/WhatsApp
- **New admins:** Edit storage.rules + redeploy
- **Auth users:** Create manually in Firebase Console
- **Upgrade:** Switch to Blaze plan for full features

---

## 🔑 Critical UIDs & Emails

Keep these safe during deployment:

| Item | Value | Used For |
|------|-------|----------|
| First Admin Email | `admin.horizons.test@gmail.com` | Auth login, Firestore profile |
| First Admin UID | `xOlH7JLIAegVHblBngMBF33LdI32` | Storage rules authorization |
| Project ID | `horizons-cee8d` | Firebase config, all deployments |
| Firestore Database | `(default)` | All Firestore reads/writes |

---

## 🐛 Troubleshooting

### "Access Denied - not authorized to access this admin panel"
**Cause:** Firestore admin profile not created yet  
**Fix:** Complete STEP 4 above (create admins/{email} document)

### Admin UID doesn't match storage.rules
**Cause:** You used a different admin email, got different UID  
**Fix:** Update `storage.rules` line 22 with your actual UID, redeploy storage rules

### "Firebase Storage not initialized" on brand upload
**Cause:** Storage rules not deployed or admin UID mismatch  
**Fix:** Run `firebase deploy --only storage` and verify storage.rules has correct UID

### Application form submits but documents are null
**Expected:** This is correct for Spark plan. No file uploads happen.  
**Status:** ✅ Working as designed

### Application form won't submit
**Cause:** Firestore rules not deployed  
**Fix:** Run `firebase deploy --only firestore:rules`

---

## ✅ Final Validation Checklist

After completing all steps:

- [ ] Firestore rules deployed (timestamp current)
- [ ] Storage rules deployed (timestamp current + UID present)
- [ ] First admin account created in Firebase Console
- [ ] First admin Firestore profile exists
- [ ] Admin can log in to admin.html
- [ ] Admin dashboard appears (no errors in browser console)
- [ ] siteSettings/main created
- [ ] contactSettings/main created
- [ ] Hosting deployed successfully
- [ ] Website live at Firebase URL
- [ ] Admin can create/edit content
- [ ] Admin can upload logo and hero
- [ ] Public pages display Firestore data
- [ ] Application form accepts submissions

**All ✅ checked = Ready for production**

---

## 📞 Support

**If deployment fails:**
1. Check browser console for errors (F12)
2. Check Firebase Console for auth/Firestore/Storage errors
3. Verify Firestore rules syntax (SPARK_DEPLOYMENT.md has validation steps)
4. Verify storage.rules admin UID matches Firebase Console user
5. Verify all documents created in STEP 4-5

**Deployment is straightforward if all pre-requirements met.**

---

## 🎯 Next Steps After Deployment

1. **Add more content:** Use admin dashboard to create universities, courses, teams
2. **Create agents:** Via admin dashboard (Option A: manual Console auth recommended)
3. **Create additional admins:** If needed, update storage.rules with new UID
4. **Monitor analytics:** Check referralVisits, whatsappClicks collections for tracking
5. **Plan Blaze upgrade:** When application file uploads needed

---

## 🚀 You're Ready!

**All code is prepared.** Deployment is mechanical—follow the 8 steps above and you'll be live in 30 minutes.

**No Cloud Functions required. No complex setup. Just Spark plan simplicity.**

Good luck! 🎉

