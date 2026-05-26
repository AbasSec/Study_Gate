# PHASE 2 — MANUALLY CREATED COLLECTIONS VALIDATION
**Date:** May 23, 2026  
**Status:** IN PROGRESS  
**Scope:** Validate all 13 manually created collections for schema alignment

---

## Collections to Validate (13 Total)

- [ ] permissions (auto-initialized)
- [ ] roles (auto-initialized)
- [x] courseFolders (manual, sub-section of courses)
- [ ] admins (manual, full CRUD)
- [ ] siteSettings (manual, managed in settings section)
- [ ] contactSettings (manual, managed in settings section)
- [ ] universities (manual, full CRUD)
- [ ] courseOfferings (auto-generated from university save)
- [ ] team (manual, full CRUD)
- [ ] services (manual, full CRUD)
- [ ] testimonials (manual, full CRUD)
- [ ] successStories (manual, NOT USED IN CODE)
- [ ] courses (manual, full CRUD)

---

## PHASE 2 FINDINGS

### 🔴 CRITICAL BUGS FOUND

#### BUG 1: COURSES — Missing degreeLevel and fieldOfStudy fields
**Severity:** CRITICAL — Courses page won't render correctly

**Issue:**
- Admin form saves: `level`, NOT `degreeLevel`
- Courses.html reads: `course.degreeLevel` (line 325) and `course.fieldOfStudy` (line 326)
- Result: These fields are always undefined, breaking field badge and degree label displays

**Evidence:**
```javascript
// Admin saves (js/admin.js line 3209):
level: level,  // saves as "level"

// Public reads (pages/courses.html line 325):
const degreeLabel = degreeLabelMap[course.degreeLevel]  // expects "degreeLevel"
```

**Impact:**
- Degree level badges won't display
- Field of study badges missing
- Course filtering by degree won't work

**Requires Fix:** YES

---

#### BUG 2: COURSES — Missing universities array
**Severity:** CRITICAL — University count won't display

**Issue:**
- Admin form has NO field to link courses to universities
- Courses.html reads: `course.universities` (line 323)
- Result: University count always 0

**Evidence:**
```javascript
// Admin form has no universities array
// Public reads (pages/courses.html line 323):
const universityCount = course.universities ? course.universities.length : 0;
```

**Impact:**
- University count showing 0 for all courses
- No course-to-university linking in admin UI

**Requires Fix:** YES (major schema change needed)

---

#### BUG 3: SERVICES — Inconsistent field naming (name vs title)
**Severity:** MODERATE — Service cards may show incorrect data

**Issue:**
- Admin form saves: `title` field (js/admin.js line 3292)
- Public pages read: BOTH `svc.title` AND `svc.name`
- No fallback chain defined

**Evidence:**
```javascript
// Admin saves:
title: document.getElementById('itemTitle').value,

// Public reads (both versions):
${svc.title || svc.name}  // in some places
${svc.name}  // in other places
```

**Status:** Partially working with inconsistent fallback

**Requires Fix:** YES (establish canonical field)

---

#### BUG 4: UNIVERSITIES — Wrong intake date field name
**Severity:** HIGH — Countdown timers broken

**Issue:**
- Admin saves: `nextIntakeDate` (line 3243)
- universities.html reads: `uni.intakeDate` (line 324) — WRONG field name!
- university-detail.html reads: `uni.nextIntakeDate` (line 647) — CORRECT

**Evidence:**
```javascript
// Admin saves (js/admin.js line 3243):
nextIntakeDate: nextIntakeDate,

// Universities listing reads (pages/universities.html line 324):
const daysLeft = calculateDaysToIntake(uni.intakeDate);  // WRONG!

// University detail reads (pages/university-detail.html line 647):
if (uni.nextIntakeDate) { ... }  // CORRECT
```

**Impact:**
- University listing shows "Loading..." instead of days countdown
- Only university detail page works correctly
- Data is saved but not read by listing page

**Requires Fix:** YES

---

### ✅ COLLECTIONS VERIFIED OK

#### ✅ courseFolders
- **Status:** OK
- **Admin UI:** Sub-section of courses admin
- **Fields:** name, order, createdAt
- **Notes:** Properly scoped, serverTimestamp used

#### ✅ team
- **Status:** OK
- **Admin saves:** name, role, order, bio, photoPath, whatsappNumber, active
- **Public renders:** name, role, photoPath, whatsappNumber (with fallbacks)
- **Notes:** Proper fallback chains (photoPath || photo, whatsappNumber || whatsapp)

#### ✅ testimonials
- **Status:** OK
- **Admin saves:** studentName, university, country, status, quote, photo, featured, active
- **Public renders:** studentName, university, country, status, photo
- **Notes:** Correctly aligned on both homepage and public pages

#### ✅ services
- **Status:** MOSTLY OK with minor inconsistency
- **Admin saves:** icon, order, title, description, active
- **Public reads:** title, icon, description (with name as fallback in some places)
- **Notes:** Fallback chains exist but inconsistent; canonical field is `title`

---

## STATUS SUMMARY

**CRITICAL BUGS FOUND: 4**
- Courses: degreeLevel field missing
- Courses: fieldOfStudy field missing
- Courses: universities array missing
- Universities: intakeDate field name wrong

**WORKING CORRECTLY: 4**
- courseFolders ✓
- team ✓
- testimonials ✓
- services ✓

**REMAINING TO AUDIT:**
- [ ] universities (detailed field validation)
- [ ] admins (creation workflow and profile fields)
- [ ] siteSettings (logo, heroImageUrl structure)
- [ ] contactSettings (field structure and admin form)
- [ ] permissions/roles (initialization correctness)
- [ ] successStories (still marked as unused)

---

## Next Actions

1. **Immediate:** Document all courses schema issues
2. **Then:** Complete validation of all 13 collections
3. **Then:** Create fix plan for each identified bug
4. **Finally:** Execute Phase 3-9 of comprehensive audit

---

**Current Status:** Bugs 1-3 identified in COURSES collection. Validation continuing for remaining 12 collections.
