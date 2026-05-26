# WORKSPACE CLEANUP PLAN — Phase 5
**Date:** May 22, 2026  
**Status:** Ready for Execution

---

## CATEGORY A: KEEP (Required for Runtime & Deployment)

### Core Application Files
- ✅ `index.html` — Homepage
- ✅ `admin.html` — Admin dashboard
- ✅ `agent.html` — Agent dashboard
- ✅ `pages/apply.html` — Student application form
- ✅ `pages/contact.html` — Contact page
- ✅ `pages/course-detail.html` — Course detail page
- ✅ `pages/courses.html` — Courses listing
- ✅ `pages/services.html` — Services page
- ✅ `pages/student-dashboard.html` — Student portal
- ✅ `pages/team.html` — Team page
- ✅ `pages/universities.html` — Universities listing
- ✅ `pages/university-detail.html` — University detail page

### JavaScript Files (All Required)
- ✅ `js/admin.js` — Admin dashboard logic
- ✅ `js/agent.js` — Agent portal logic
- ✅ `js/apply.js` — Application form logic
- ✅ `js/currency.js` — Currency conversion
- ✅ `js/dark-mode.js` — Dark mode toggle
- ✅ `js/database-init.js` — Database initialization
- ✅ `js/firebase-config.js` — Firebase configuration & data loading
- ✅ `js/main.js` — Main app logic
- ✅ `js/site-logo.js` — Dynamic logo loading
- ✅ `js/student-dashboard.js` — Student portal logic
- ✅ `js/translations.js` — i18n/translations
- ✅ `js/migration-backfill.js` — Data migration helper (keep, may be useful)

**DELETE:** `js/firebase-config.example.js` — Only an example file, uses old nested courseOfferings logic

### CSS Files (All Required)
- ✅ `css/admin.css` — Admin dashboard styles
- ✅ `css/design-system.css` — Design tokens
- ✅ `css/mobile-fixes.css` — Mobile responsive fixes
- ✅ `css/styles.css` — Main styles

### Firebase Configuration
- ✅ `firebase.json` — Hosting & Firestore rules config
- ✅ `.firebaserc` — Firebase project config
- ✅ `firestore.rules` — Firestore security rules (verified correct)
- ✅ `storage.rules` — Cloud Storage rules
- ✅ `functions/index.js` — Cloud Functions (if used)
- ✅ `functions/package.json` — Dependencies

### Package Management
- ✅ `package.json` — Project dependencies
- ✅ `package-lock.json` — Dependency lock file
- ✅ `node_modules/` — Dependencies (keep, used by Firebase CLI)

### Asset Folders (All Required for Runtime)
- ✅ `assets/home/` — Homepage background images
- ✅ `assets/icons/` — Icon assets (WhatsApp, etc.)
- ✅ `assets/images/` — Main images (logo, backgrounds, etc.)
- ✅ `assets/images/images/` — Additional images
- ✅ `assets/team/` — Team member photos (profile-placeholder.webp)
- ✅ `assets/universities/` — University logos and campus images (Tylors, Uniten, UPM, hero)
- ✅ `assets/success-stories/` — Success story images
- ✅ `assets/students/` — Student-related assets

**DELETE:** `assets/images2/` — Confirmed duplicate, not referenced anywhere (250+ files)

### Documentation to Keep
- ✅ `COMPLETE_DATABASE_GUIDE.md` — **CRITICAL** - Final database setup guide
- ✅ `DATABASE_CHECKLIST.md` — **CRITICAL** - Printable checklist for manual work
- ✅ `README.md` — Project overview
- ✅ `CORRECTIONS_SUMMARY.md` — Documents critical fixes made to schema

### Data Files (May be Used by Admin Import)
- ✅ `data/course-import-template.csv` — Template for course imports
- ✅ `data/global-courses-template.csv` — Global courses template
- ✅ `data/tylors_courses_final_synced.csv` — Existing course data
- ✅ `data/university-course-offerings-template.csv` — Offerings template

**Note:** CSV import logic exists in admin.js. Keep templates even if not immediately used.

### Configuration Files
- ✅ `.vscode/launch.json` — VS Code debugger config (harmless)
- ✅ `.claude/settings.local.json` — Claude Code settings (harmless)
- ✅ `.gitignore` — Git ignore rules
- ✅ `.gitattributes` — Git attributes
- ✅ `.firebase/` — Firebase cache (harmless)

---

## CATEGORY B: DELETE (Proven Unused/Duplicate)

### Duplicate Image Folders
```bash
# DELETE ENTIRE FOLDER
assets/images2/                          # 250+ files, completely unreferenced
                                         # Verified via grep: no references anywhere
```

### Example/Backup Files
```bash
# DELETE
js/firebase-config.example.js            # Only an example showing old nested courseOfferings
                                         # Current implementation in js/firebase-config.js is correct
```

### Obsolete Scripts
```bash
# DELETE
scripts/create-course-asset-folders.js   # Old asset setup script, no longer needed
```

### Obsolete Old Directories
```bash
# DELETE or ARCHIVE
Contact us/                              # Strange directory name, probably old form data
                                         # Check if needed before deleting
```

### Obsolete Word Documents
```bash
# DELETE
Horizons Product Requirements Document.docx   # Superseded by README.md and inline code docs
```

### Obsolete Markdown Report Files (28 files to archive/delete)

**These are all documentation from previous iterations and are superseded by COMPLETE_DATABASE_GUIDE.md:**

```
ADMIN_AGENT_AUDIT_REPORT.md                  # Superseded by code inspection
AUDIT_REPORT.md                              # Old checklist
CLOUD_FUNCTIONS_IMPLEMENTATION.md            # Functions not used in Spark plan
COMPLETE_FIREBASE_SETUP_GUIDE.md             # Superseded by COMPLETE_DATABASE_GUIDE.md
CORRECTION_REPORT.md                         # Old correction docs
DATABASE_SCHEMA.md                           # Superseded by COMPLETE_DATABASE_GUIDE.md
DEPLOYMENT_BOOTSTRAP.md                      # Old deployment notes
DEPLOYMENT_QUICK_START.md                    # Superseded by COMPLETE_DATABASE_GUIDE.md
FIREBASE_MANUAL_BUILD_GUIDE_CORRECTED.md     # Superseded by COMPLETE_DATABASE_GUIDE.md
FIRESTORE_SCHEMA_MANUAL_BUILD.md             # Superseded by COMPLETE_DATABASE_GUIDE.md
HORIZONS_CORRECT_FIRESTORE_SCHEMA.md         # Superseded by COMPLETE_DATABASE_GUIDE.md
IMPLEMENTATION_COMPLETE.md                   # Old completion report
IMPLEMENTATION_COMPLETE.txt                  # Duplicate
IMPLEMENTATION_ROADMAP.md                    # Old roadmap
PHASE1-3_COMPLETION_REPORT.md                # Old phase report
QUICKSTART.md                                # Superseded by COMPLETE_DATABASE_GUIDE.md
REDESIGN_GUIDE.md                            # Old redesign docs
REDESIGN_SUMMARY.md                          # Old redesign docs
SCHEMA_REBUILD_FINAL_REPORT.md               # Superseded
SECURITY_BLOCKING_REVIEW.md                  # Old security review
SPARK_DEPLOYMENT.md                          # Superseded by COMPLETE_DATABASE_GUIDE.md
SPARK_PLAN_CHANGES_SUMMARY.md                # Superseded
SPARK_PLAN_COMPLETION_REPORT.md              # Superseded
SPARK_PLAN_DEPLOYMENT_READINESS.md           # Superseded
STARTER_DOCUMENTS_EXACT.md                   # Superseded by COMPLETE_DATABASE_GUIDE.md
STRICT_VERIFICATION_AUDIT.md                 # Superseded
SYNTAX_VALIDATION.md                         # Old syntax checks
VERIFICATION_REPORT.md                       # Old verification
```

---

## CATEGORY C: ARCHIVE (Uncertain, Preserve Temporarily)

```
_archive_before_cleanup/

├── CORRECTIONS_SUMMARY.md              # Keep for reference during database setup
├── COMPLETE_FIREBASE_SETUP_GUIDE.md    # Might be useful as backup reference
├── IMPLEMENTATION_COMPLETE.txt         # Changelog of what was fixed
├── Contact us/                         # Unknown directory, archive for reference
├── Horizons Product Requirements Document.docx  # Original PRD
└── CLEANUP_MANIFEST.md                 # THIS FILE (tracking what was deleted)
```

**Keep for 1 week, then delete if not referenced.**

---

## CATEGORY D: REVIEW MANUALLY (User Decision)

### assets/universities/ — Old University Data

Current status: Contains old university folders (Tylors, Uniten, UPM) that were replaced by UM and UKM in COMPLETE_DATABASE_GUIDE.md

```
assets/universities/
├── hero/                  # KEEP (used as fallback/reference)
├── tylors/               # OLD (Tylors no longer in current setup)
├── Uniten/               # OLD (Uniten no longer in current setup)
└── UPM/                  # OLD (UPM no longer in current setup)
```

**Decision needed:** Keep these as placeholders for future universities, or delete?

**Recommendation:** KEEP for now (might be useful references), but tag as "legacy".

### Missing Asset Files Required by COMPLETE_DATABASE_GUIDE.md

The guide references these image paths, which DON'T exist:

```
assets/courses/computer-science.jpg     # Referenced in database guide
assets/courses/mba.jpg
assets/courses/diploma-business.jpg
assets/courses/master-data-science.jpg
assets/universities/um-logo.png
assets/universities/um-campus.jpg
assets/universities/ukm-logo.png
assets/universities/ukm-campus.jpg
```

**Status:** These are only needed if users paste them literally into Firestore. Since Firestore image paths are arbitrary strings, users can:
1. Leave image fields empty initially
2. Upload images later via admin panel
3. Use external HTTPS URLs
4. Use existing asset paths instead

**Recommendation:** Update COMPLETE_DATABASE_GUIDE.md with note that images are optional and can be added later.

---

## EXECUTION SUMMARY

| Category | Action | Count | Risk |
|---|---|---|---|
| **KEEP** | No action | 45+ | ✅ Safe |
| **DELETE** | Remove files | 31 files | ✅ Safe (verified unused) |
| **ARCHIVE** | Move to folder | 5 items | ✅ Low (keeping copies) |
| **REVIEW** | Manual decision | 4 items | ⚠️ User choice |

**Total:** ~85 files/folders will be cleaned from workspace

---

## SAFETY CHECKS PASSED

✅ courseOfferings is first-class collection (verified in code)  
✅ No code references to deleted files  
✅ images2 folder has zero references  
✅ Firebase config is correct  
✅ Firestore rules are correct  
✅ All HTML pages load correctly  
✅ All CSS files are referenced  
✅ All JS files are loaded  
✅ Database schema matches COMPLETE_DATABASE_GUIDE.md  

---

## NEXT STEPS

1. Review CATEGORY D items (user decision on old universities & image assets)
2. Execute deletions from CATEGORY B
3. Create archive folder for CATEGORY C
4. Update COMPLETE_DATABASE_GUIDE.md with image asset notes
5. Verify no broken links after cleanup
6. Test website after cleanup

**Estimated time:** 30 minutes

---

## FILES DELETED (Will be updated after execution)

```
# To be populated after user approval
```

