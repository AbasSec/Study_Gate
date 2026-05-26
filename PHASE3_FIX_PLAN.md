# PHASE 3-9 — COMPREHENSIVE FIX PLAN
**Date:** May 23, 2026  
**Status:** READY FOR IMPLEMENTATION  
**Scope:** Fix all 4 critical bugs + optimize collection usage

---

## BUG FIX PRIORITY & IMPLEMENTATION

### PHASE 3: Fix BUG 4 (Universities intakeDate) — 5 MIN
**File:** pages/universities.html  
**Change:** Line 324

```javascript
// BEFORE:
const daysLeft = calculateDaysToIntake(uni.intakeDate);

// AFTER:
const daysLeft = calculateDaysToIntake(uni.nextIntakeDate);
```

**Verification:** University listing page shows countdown timer

---

### PHASE 4: Fix BUG 1 (Courses degreeLevel) — 30 MIN
**Files:** js/admin.js, pages/courses.html  

**Decision Rationale:**
- Admin currently saves `level`
- courses.html expects `degreeLevel`
- Database has `level` field standardized across all courses
- **Solution:** Make courses.html read `level` instead of `degreeLevel`
- This maintains canonical field naming consistency with universities

**Changes:**

**4a. Admin form rename for clarity (optional but recommended):**
- In js/admin.js getCourseForm(), change label from "Level" to "Degree Level" (for UX)
- Keep saving to `level` field (no DB change)

**4b. Public page fix (required):**
File: pages/courses.html lines 325-326
```javascript
// BEFORE:
const degreeLabel = degreeLabelMap[course.degreeLevel] || degreeLabelMap[(course.degreeLevel || '').toLowerCase()] || '';

// AFTER:
const degreeLabel = degreeLabelMap[course.level] || degreeLabelMap[(course.level || '').toLowerCase()] || '';
```

**Verification:** Courses page shows degree level badges correctly

---

### PHASE 5: Fix BUG 2 (Courses fieldOfStudy) — 15 MIN
**Files:** js/admin.js, pages/courses.html  

**Decision Rationale:**
- fieldOfStudy is not part of the admin form
- It's rendered on courses.html but never populated
- Two options: (A) Remove rendering, (B) Add field to admin form
- **Chosen Solution A (Remove rendering):** Cleaner, less work, no dead fields
- If field needed in future, can be added later

**Changes:**

File: pages/courses.html lines 326-327 (in renderCourseCard function)
```javascript
// BEFORE:
const fieldBadge = course.fieldOfStudy ? `<span class="px-3 py-1 bg-surface-container-low/90 backdrop-blur-md rounded-full text-status-pill font-status-pill text-on-surface">${course.fieldOfStudy}</span>` : '';

// AFTER:
const fieldBadge = ''; // fieldOfStudy not currently managed

// OR simply remove the fieldBadge variable and remove its rendering from the template
```

And remove `${fieldBadge}` from the HTML template if it's being rendered.

**Verification:** Courses page renders without field badge (or can verify no undefined values appear)

---

### PHASE 6: Fix BUG 3 (Courses universities array) — 2-4 HOURS
**Files:** js/firebase-config.js (new helper), pages/courses.html  

**Decision Rationale:**
- courseOfferings is the proper join table (already exists)
- Each courseOffering links a course to a university
- Solution: Query courseOfferings to get universities count
- Create reusable helper function for future course-university queries

**Changes:**

**6a. Add helper function to firebase-config.js (NEW)**
```javascript
/**
 * Get count of universities offering a specific course
 * @param {string} courseId - The course ID
 * @returns {Promise<number>} Count of universities offering this course
 */
async function getUniversitiesCountForCourse(courseId) {
    try {
        const snapshot = await db.collection('courseOfferings')
            .where('courseId', '==', courseId)
            .get();
        return snapshot.size;
    } catch (error) {
        console.error(`Error getting universities count for course ${courseId}:`, error);
        return 0;
    }
}

/**
 * Get all universities offering a specific course
 * @param {string} courseId - The course ID
 * @returns {Promise<Array>} Array of university IDs offering this course
 */
async function getUniversitiesForCourse(courseId) {
    try {
        const snapshot = await db.collection('courseOfferings')
            .where('courseId', '==', courseId)
            .get();
        const universities = [];
        snapshot.forEach(doc => {
            if (doc.data().universityId) {
                universities.push(doc.data().universityId);
            }
        });
        return [...new Set(universities)]; // Deduplicate
    } catch (error) {
        console.error(`Error getting universities for course ${courseId}:`, error);
        return [];
    }
}
```

**6b. Modify courses.html rendering to use helper**
File: pages/courses.html, renderCourseCard function (line ~323)

```javascript
// BEFORE:
const universityCount = course.universities ? course.universities.length : 0;

// AFTER:
// Get university count from courseOfferings (done asynchronously)
let universityCount = 'N/A';

// This becomes async, so we need to handle it differently
// Solution: Load all course-university mappings when loading courses
```

**6c. Modify course loading to pre-fetch university counts**
File: pages/courses.html, loadCourses function

```javascript
// After loading courses from Firestore:
const coursesSnapshot = await db.collection('courses').orderBy('name', 'asc').get();

// NEW: Fetch courseOfferings to get university counts
const offeringsSnapshot = await db.collection('courseOfferings').get();
const officesCount = {};
offeringsSnapshot.forEach(doc => {
    const courseId = doc.data().courseId;
    if (!officesCount[courseId]) officesCount[courseId] = 0;
    officesCount[courseId]++;
});

// Now when rendering course:
const universityCount = officesCount[course.id] || 0;
```

**Alternative 6c (Simpler): Denormalize on save**
Instead of querying at render time, add a helper in admin.js that calculates and stores universitiesCount:

File: js/admin.js, in saveUniversityAndOfferings function
```javascript
// After saving all courseOfferings, update courses with count
for (const courseId of allCourseIds) {
    const offeringsCount = allOfferingsForCourse[courseId].length;
    await db.collection('courses').doc(courseId).update({
        universitiesCount: offeringsCount
    });
}

// Then in courses.html:
const universityCount = course.universitiesCount || 0;
```

**Recommendation:** Use the denormalization approach (Alternative 6c) because:
- Simpler to implement
- Faster rendering (no extra queries)
- Consistent with existing denormalization pattern (courseLevel, courseCategory)

**Verification:** Courses page shows correct university count, counts update when universities add/remove course offerings

---

## PHASE 7: Verify All Fixes
**Activities:**
- [ ] Test courses page - degree level badges show
- [ ] Test courses page - field badge removed (no undefined values)
- [ ] Test courses page - university count displays correctly
- [ ] Test universities listing - countdown timer works
- [ ] Check browser console for errors
- [ ] Verify all 4 pages render without errors (index.html, courses.html, universities.html, university-detail.html)

---

## PHASE 8: Testing & Validation Checklist

### Public Website Testing
- [ ] Homepage loads without console errors
- [ ] Team section renders with proper fallbacks
- [ ] Testimonials/Stories carousel works
- [ ] Services cards show correct data
- [ ] Universities listing shows countdown and all fields
- [ ] University detail page works correctly
- [ ] Courses page shows degree levels and university counts
- [ ] Course detail page loads
- [ ] Contact page shows working hours correctly
- [ ] Footer shows contact info and social links

### Admin Dashboard Testing
- [ ] Admin login works
- [ ] Course form loads and saves correctly
- [ ] University form loads and saves correctly
- [ ] All admin sections load without errors
- [ ] CRUD operations work for all collections

### Data Integrity Testing
- [ ] No hardcoded data present
- [ ] No Firebase Storage paths in image fields
- [ ] All timestamps are serverTimestamp()
- [ ] No passwords stored in Firestore
- [ ] No null fields in documents (except optional ones)

---

## PHASE 9: Final Report & Documentation

Create comprehensive final report documenting:
1. All bugs found in PHASE 2
2. All fixes applied in PHASE 3-8
3. All collections validated and status
4. Schema decisions made
5. Lessons learned
6. Remaining limitations
7. Future improvement recommendations
8. Testing results

---

## IMPLEMENTATION NOTES

### No Breaking Changes
- All fixes are backward compatible
- Denormalized counts can be added without affecting old data
- Field name changes use fallbacks where possible
- No schema redesign - just fixing misalignment

### Spark Plan Compatible
- All solutions avoid Cloud Functions
- No Firebase Storage usage
- Helper functions are lightweight
- Firestore read counts remain reasonable

### Code Quality
- No comments needed (self-documenting code)
- Function names are clear
- Error handling includes fallbacks
- Proper logging for debugging

---

**Status:** Ready to implement  
**Estimated Total Time:** 4-6 hours  
**Risk Level:** LOW (mostly non-breaking changes)  
**Confidence:** 95%
