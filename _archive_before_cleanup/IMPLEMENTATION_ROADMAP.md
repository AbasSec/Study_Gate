# HORIZONS IMPLEMENTATION ROADMAP
**Status:** Code-Ready Blueprint (Awaiting Approval)  
**Scope:** Convert from nested courseOfferings to first-class collection  
**Complexity:** Medium-High (3 data functions + 2 UI pages + 1 import script)  

---

## PHASE 0: UNDERSTANDING THE PROBLEM

### Current Wrong State
```javascript
// Current structure (WRONG):
universities/{id} = {
  name: "University of Malaya",
  courseOfferings: [
    { courseId: "bsc-comp-sci", fees: 28000, currency: "MYR" },
    { courseId: "msc-data-sci", fees: 32000, currency: "MYR" }
  ]
}

// Code that depends on this structure:
// firebase-config.js: getUniversityWithCourses() reads university.courseOfferings
// pages/university-detail.html: iterates uni.courseOfferings or uni.courses
```

### Target Correct State
```javascript
// Target structure (CORRECT):
universities/{id} = {
  name: "University of Malaya",
  slug: "university-of-malaya",
  // NO courseOfferings array here
}

courseOfferings/{id} = {
  universityId: "university-of-malaya",
  courseId: "bsc-comp-sci",
  universityName: "University of Malaya",  // snapshot
  courseName: "Bachelor of Computer Science",  // snapshot
  tuitionFee: 28000,
  tuitionCurrency: "MYR",
  // ... all offering details
}

// Code will query:
const offerings = await db.collection('courseOfferings')
  .where('universityId', '==', universityId)
  .where('active', '==', true)
  .get();
```

---

## PHASE 1: DATA MIGRATION (One-Time)

### Step 1.1: Backup Current Data
```bash
# Export current Firestore data from Firebase Console
# Download: universities collection
# Save as: backup_universities_nested_2026-05-22.json
```

### Step 1.2: Create Migration Script (firebase-config.js)

Add this function to firebase-config.js:

```javascript
// ============================================
// MIGRATION: Nested courseOfferings → First-class Collection
// ============================================
// Run once: await migrateCoursesToSeparateCollection()
// Then delete this function

async function migrateCoursesToSeparateCollection() {
  console.log('🔄 Starting migration: nested courseOfferings → courseOfferings collection...');
  
  try {
    // 1. Get all universities with nested courseOfferings
    const universitiesSnapshot = await db.collection('universities').get();
    const courses = await getCourses();
    const courseMap = new Map();
    courses.forEach(c => courseMap.set(c.id, c));
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const uniDoc of universitiesSnapshot.docs) {
      const uni = { id: uniDoc.id, ...uniDoc.data() };
      const offerings = Array.isArray(uni.courseOfferings) ? uni.courseOfferings : [];
      
      if (!offerings.length) {
        console.log(`  ℹ️  ${uni.name}: No nested offerings to migrate`);
        continue;
      }
      
      console.log(`  📍 Processing ${uni.name}: ${offerings.length} offerings...`);
      
      // 2. For each offering, create courseOfferings document
      for (const offering of offerings) {
        try {
          const course = courseMap.get(offering.courseId);
          if (!course) {
            console.warn(`    ⚠️  Course not found: ${offering.courseId}`);
            continue;
          }
          
          // Generate deterministic document ID
          const uniSlug = uni.slug || slugify(uni.name);
          const courseCode = course.courseCode || slugify(course.name);
          const variant = offering.variant || 'main';
          const offeringDocId = `${uniSlug}_${courseCode}_${variant}`;
          
          // Create courseOffering document
          const courseOfferingData = {
            universityId: uni.id,
            courseId: offering.courseId,
            
            // Snapshots
            universityName: uni.name,
            courseName: course.name,
            courseLevel: course.level,
            courseCategory: course.category,
            universityCountry: uni.country,
            universityCity: uni.city,
            
            // Pricing from offering or course default
            tuitionFee: offering.fees || course.basePrice || 0,
            tuitionCurrency: offering.currency || course.baseCurrency || 'MYR',
            applicationFee: offering.applicationFee,
            registrationFee: offering.registrationFee,
            totalEstimatedFee: offering.totalEstimatedFee,
            feeNotes: offering.feeNotes,
            
            // Duration
            durationMonths: offering.durationMonths || offering.durationYears * 12,
            durationText: offering.durationText,
            semesters: offering.semesters || course.totalSemesters,
            
            // Intakes
            intakeMonths: offering.intake || [],
            nextIntakeDate: offering.nextIntakeDate,
            applicationDeadline: offering.applicationDeadline,
            
            // Requirements
            academicRequirements: offering.academicRequirements,
            englishRequirements: offering.englishRequirements,
            requiredDocuments: offering.requiredDocuments,
            
            // Availability
            applicationOpen: offering.applicationOpen !== false,
            active: uni.active !== false && offering.active !== false,
            featured: offering.featured || false,
            seatsAvailable: offering.seatsAvailable,
            
            // Display
            order: offering.order || 1,
            notes: offering.notes,
            searchKeywords: [
              ...(course.searchKeywords || []),
              ...(uni.searchKeywords || []),
              uni.name,
              course.name,
              uni.country,
              uni.city
            ],
            
            // Migration tracking
            importBatchId: 'migration_nested_to_firstclass',
            sourceFileName: `universities/${uni.id}/courseOfferings`,
            sourceRowNumber: 0,
            
            createdAt: uni.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: uni.createdBy || 'system_migration',
            updatedBy: 'system_migration'
          };
          
          // Write to courseOfferings collection
          await db.collection('courseOfferings').doc(offeringDocId).set(courseOfferingData);
          migratedCount++;
          console.log(`    ✅ Created: courseOfferings/${offeringDocId}`);
          
        } catch (error) {
          errorCount++;
          console.error(`    ❌ Error migrating offering: ${error.message}`);
        }
      }
      
      // 3. Remove courseOfferings from universities document
      try {
        await db.collection('universities').doc(uni.id).update({
          courseOfferings: firebase.firestore.FieldValue.delete()
        });
        console.log(`  ✅ Removed courseOfferings from ${uni.name}`);
      } catch (error) {
        console.error(`  ❌ Error removing courseOfferings: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   Migrated: ${migratedCount} courseOfferings`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`\n⚠️  Next steps:`);
    console.log(`   1. Verify courseOfferings collection in Firebase Console`);
    console.log(`   2. Update getUniversityWithCourses() function`);
    console.log(`   3. Update getCourseWithUniversities() function`);
    console.log(`   4. Update getCoursesWithUniversities() function`);
    console.log(`   5. Update university-detail.html page`);
    console.log(`   6. Delete this migration function`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

### Step 1.3: Run Migration (One-Time Only)
```javascript
// In browser console on admin page:
await initFirebase();
await migrateCoursesToSeparateCollection();

// Or in admin.js, add temporary button:
// <button onclick="migrateCoursesToSeparateCollection()">Migrate Data</button>
```

### Step 1.4: Verify Migration
1. Go to Firebase Console → Firestore
2. Check courseOfferings collection has documents
3. Check universities documents NO LONGER have courseOfferings arrays
4. Compare document count to original offerings count

---

## PHASE 2: REFACTOR DATA LOADING FUNCTIONS

### Change 2.1: Update getUniversityWithCourses()

**File:** `js/firebase-config.js` (Lines 245-293)

**OLD CODE:**
```javascript
async function getUniversityWithCourses(uniId) {
  const uniDoc = await db.collection('universities').doc(uniId).get();
  if (!uniDoc.exists) return null;

  const university = { id: uniDoc.id, ...uniDoc.data() };
  const offerings = Array.isArray(university.courseOfferings) ? university.courseOfferings : [];
  // ... rest of code reading nested offerings
}
```

**NEW CODE:**
```javascript
async function getUniversityWithCourses(uniId) {
  try {
    // Get university document
    const uniDoc = await db.collection('universities').doc(uniId).get();
    if (!uniDoc.exists) return null;

    const university = { id: uniDoc.id, ...uniDoc.data() };
    
    // Query courseOfferings collection (not nested array)
    const offeringsSnapshot = await db.collection('courseOfferings')
      .where('universityId', '==', uniId)
      .where('active', '==', true)
      .orderBy('order', 'asc')
      .get();

    const offerings = [];
    offeringsSnapshot.forEach(doc => {
      offerings.push({ id: doc.id, ...doc.data() });
    });

    if (!offerings.length) {
      university.courses = [];
      return university;
    }

    // Get course details for display
    const courseIds = [...new Set(offerings.map(o => o.courseId))];
    const courses = await Promise.all(
      courseIds.map(id => getDocument('courses', id))
    );
    
    const courseMap = new Map();
    courses.forEach(c => c && courseMap.set(c.id, c));

    // Combine offering data with course details
    university.courses = offerings.map(offering => {
      const course = courseMap.get(offering.courseId) || {};
      return {
        id: offering.id,
        offeringId: offering.id,
        courseId: offering.courseId,
        
        // From course
        name: course.name || offering.courseName,
        slug: course.slug,
        level: course.level || offering.courseLevel,
        category: course.category || offering.courseCategory,
        description: course.description,
        imageUrl: course.imageUrl,
        
        // From offering
        fees: offering.tuitionFee,
        currency: offering.tuitionCurrency,
        durationMonths: offering.durationMonths,
        durationText: offering.durationText,
        semesters: offering.semesters,
        intakeMonths: offering.intakeMonths,
        nextIntakeDate: offering.nextIntakeDate,
        applicationDeadline: offering.applicationDeadline,
        applicationOpen: offering.applicationOpen,
        applicationFee: offering.applicationFee,
        registrationFee: offering.registrationFee,
        academicRequirements: offering.academicRequirements,
        englishRequirements: offering.englishRequirements,
        requiredDocuments: offering.requiredDocuments,
        seatsAvailable: offering.seatsAvailable,
        notes: offering.notes
      };
    });

    return university;
  } catch (error) {
    console.error('Error getting university with courses:', error);
    throw error;
  }
}
```

### Change 2.2: Update getCourseWithUniversities()

**File:** `js/firebase-config.js` (Lines 389-428)

**OLD CODE:**
```javascript
async function getCourseWithUniversities(courseId) {
  const courseDoc = await db.collection('courses').doc(courseId).get();
  if (!courseDoc.exists) return null;

  const course = { id: courseDoc.id, ...courseDoc.data(), universities: [] };
  const universities = await getUniversities();
  // ... reading nested courseOfferings from each university
}
```

**NEW CODE:**
```javascript
async function getCourseWithUniversities(courseId) {
  try {
    // Get course document
    const courseDoc = await db.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) return null;

    const course = { id: courseDoc.id, ...courseDoc.data(), universities: [] };

    // Query courseOfferings collection (not nested in universities)
    const offeringsSnapshot = await db.collection('courseOfferings')
      .where('courseId', '==', courseId)
      .where('active', '==', true)
      .orderBy('order', 'asc')
      .get();

    const offerings = [];
    offeringsSnapshot.forEach(doc => {
      offerings.push({ id: doc.id, ...doc.data() });
    });

    if (!offerings.length) {
      return course;
    }

    // Get university details for display
    const universityIds = [...new Set(offerings.map(o => o.universityId))];
    const universities = await Promise.all(
      universityIds.map(id => getDocument('universities', id))
    );
    
    const universityMap = new Map();
    universities.forEach(u => u && universityMap.set(u.id, u));

    // Combine offering data with university details
    course.universities = offerings.map(offering => {
      const university = universityMap.get(offering.universityId) || {};
      return {
        id: offering.id,
        offeringId: offering.id,
        universityId: offering.universityId,
        
        // From university
        name: university.name || offering.universityName,
        slug: university.slug,
        shortCode: university.shortCode,
        country: university.country || offering.universityCountry,
        city: university.city || offering.universityCity,
        logoUrl: university.logoUrl,
        
        // From offering
        fees: offering.tuitionFee,
        currency: offering.tuitionCurrency,
        durationMonths: offering.durationMonths,
        durationText: offering.durationText,
        semesters: offering.semesters,
        intakeMonths: offering.intakeMonths,
        nextIntakeDate: offering.nextIntakeDate,
        applicationDeadline: offering.applicationDeadline,
        applicationOpen: offering.applicationOpen,
        applicationFee: offering.applicationFee,
        registrationFee: offering.registrationFee,
        seatsAvailable: offering.seatsAvailable
      };
    });

    return course;
  } catch (error) {
    console.error('Error getting course with universities:', error);
    throw error;
  }
}
```

### Change 2.3: Update getCoursesWithUniversities()

**File:** `js/firebase-config.js` (Lines 336-387)

**OLD CODE:**
```javascript
async function getCoursesWithUniversities() {
  const [courses, universities] = await Promise.all([getCourses(), getUniversities()]);
  // ... building map from nested university.courseOfferings
}
```

**NEW CODE:**
```javascript
async function getCoursesWithUniversities() {
  try {
    // Get all courses
    const courses = await getCourses();
    const courseMap = new Map();
    courses.forEach(c => courseMap.set(c.id, { ...c, universities: [] }));

    // Query ALL courseOfferings
    const offeringsSnapshot = await db.collection('courseOfferings')
      .where('active', '==', true)
      .get();

    const offerings = [];
    offeringsSnapshot.forEach(doc => {
      offerings.push({ id: doc.id, ...doc.data() });
    });

    // Get unique universities
    const universityIds = [...new Set(offerings.map(o => o.universityId))];
    const universityDocs = await Promise.all(
      universityIds.map(id => getDocument('universities', id))
    );
    
    const universityMap = new Map();
    universityDocs.forEach(u => u && universityMap.set(u.id, u));

    // Build course → universities mapping
    offerings.forEach(offering => {
      const courseEntry = courseMap.get(offering.courseId);
      if (!courseEntry) return;

      const university = universityMap.get(offering.universityId) || {};
      courseEntry.universities.push({
        id: offering.id,
        offeringId: offering.id,
        universityId: offering.universityId,
        name: university.name || offering.universityName,
        slug: university.slug,
        shortCode: university.shortCode,
        logoUrl: university.logoUrl,
        country: university.country || offering.universityCountry,
        city: university.city || offering.universityCity,
        fees: offering.tuitionFee,
        currency: offering.tuitionCurrency,
        durationMonths: offering.durationMonths,
        durationText: offering.durationText,
        semesters: offering.semesters,
        intakeMonths: offering.intakeMonths,
        nextIntakeDate: offering.nextIntakeDate,
        applicationDeadline: offering.applicationDeadline,
        applicationOpen: offering.applicationOpen,
        applicationFee: offering.applicationFee,
        registrationFee: offering.registrationFee,
        seatsAvailable: offering.seatsAvailable
      });
    });

    return Array.from(courseMap.values())
      .filter(c => c.active !== false)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  } catch (error) {
    console.error('Error getting courses with universities:', error);
    throw error;
  }
}
```

---

## PHASE 3: UPDATE UI PAGES

### Change 3.1: Update university-detail.html

**File:** `pages/university-detail.html`

**OLD CODE (Line 471):**
```javascript
const [courses, universities] = await Promise.all([getCourses(), getUniversities()]);
courses.forEach(c => courseMap.set(c.id, { ...c, universities: [] }));
universities.forEach(uni => {
  (uni.courseOfferings || []).forEach(offering => {
    // Process nested offerings...
  });
});
```

**NEW CODE:**
```javascript
// Load university + its courseOfferings
const university = selectedUni;
const offeringsSnapshot = await db.collection('courseOfferings')
  .where('universityId', '==', university.id)
  .where('active', '==', true)
  .orderBy('order', 'asc')
  .get();

const offerings = [];
offeringsSnapshot.forEach(doc => {
  offerings.push({ id: doc.id, ...doc.data() });
});

// Get course details
const courseIds = [...new Set(offerings.map(o => o.courseId))];
const courses = await Promise.all(
  courseIds.map(id => getDocument('courses', id))
);

const courseMap = new Map();
courses.forEach(c => c && courseMap.set(c.id, c));

// Build display data
const displayCourses = offerings.map(offering => {
  const course = courseMap.get(offering.courseId) || {};
  return {
    id: offering.id,
    name: course.name || offering.courseName,
    level: course.level || offering.courseLevel,
    category: course.category || offering.courseCategory,
    fees: offering.tuitionFee,
    currency: offering.tuitionCurrency,
    durationYears: offering.durationMonths ? Math.round(offering.durationMonths / 12) : null,
    semesters: offering.semesters,
    intake: offering.intakeMonths,
    applicationOpen: offering.applicationOpen,
    applicationFee: offering.applicationFee,
    englishRequirements: offering.englishRequirements,
    academicRequirements: offering.academicRequirements
  };
});

// Use displayCourses for rendering...
```

---

## PHASE 4: CSV IMPORT UPDATE

### Change 4.1: Update CSV Import Functions

**File:** `js/admin.js` (Import section)

Current code imports into `universities.courseOfferings`. Must import into courseOfferings collection instead.

**Example approach:**
```javascript
async function importCoursesToUniversity(file, universityId) {
  // Read CSV file
  const text = await file.text();
  const rows = text.split('\n').slice(1);  // Skip header
  
  const courses = await getCourses();
  const courseMap = new Map();
  courses.forEach(c => {
    const code = (c.courseCode || '').toUpperCase();
    courseMap.set(code, c);
  });

  let importedCount = 0;
  const university = await getDocument('universities', universityId);
  
  for (let rowNum = 0; rowNum < rows.length; rowNum++) {
    const [courseCode, courseName, level, fees, currency, ...rest] = rows[rowNum].split(',');
    
    if (!courseCode.trim()) continue;  // Skip empty rows
    
    const course = courseMap.get(courseCode.toUpperCase().trim());
    if (!course) {
      console.warn(`Course not found: ${courseCode}`);
      continue;
    }
    
    // Create courseOffering document
    const offeringDocId = `${university.slug}_${courseCode.toUpperCase()}_main`;
    const offeringData = {
      universityId: universityId,
      courseId: course.id,
      universityName: university.name,
      courseName: course.name,
      courseLevel: level.trim() || course.level,
      courseCategory: course.category,
      tuitionFee: parseInt(fees) || 0,
      tuitionCurrency: currency.trim() || 'MYR',
      durationYears: parseInt(rest[1]) || null,
      semesters: parseInt(rest[2]) || null,
      intakeMonths: (rest[3] || '').split('|').filter(Boolean),
      importBatchId: `import_${Date.now()}`,
      sourceFileName: file.name,
      sourceRowNumber: rowNum + 2,  // +2 for header + 1-indexed
      active: true,
      applicationOpen: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('courseOfferings').doc(offeringDocId).set(offeringData);
    importedCount++;
  }
  
  return importedCount;
}
```

---

## PHASE 5: TESTING CHECKLIST

### Test 5.1: Data Migration
- [ ] Migration function runs without errors
- [ ] courseOfferings collection created with correct documents
- [ ] universities documents no longer have courseOfferings arrays
- [ ] Document IDs are deterministic (university_course_variant format)
- [ ] Snapshot fields (universityName, courseName) populated

### Test 5.2: Data Loading Functions
- [ ] getUniversityWithCourses() queries courseOfferings correctly
- [ ] getCourseWithUniversities() queries courseOfferings correctly
- [ ] getCoursesWithUniversities() aggregates all offerings correctly
- [ ] No errors in browser console

### Test 5.3: University Detail Page
- [ ] Loads university name and info
- [ ] Displays all offerings for that university
- [ ] Fees, duration, intakes display correctly
- [ ] Application links work
- [ ] Search/filter by course works

### Test 5.4: Course Detail Page
- [ ] Loads course name and info
- [ ] Shows all universities offering this course
- [ ] Pricing varies correctly per university
- [ ] Intakes show correctly per offering

### Test 5.5: Courses Listing Page
- [ ] Lists all active courses
- [ ] Shows which universities offer each
- [ ] Fees show "varies by university" if correct

### Test 5.6: Admin Dashboard
- [ ] Universities section works
- [ ] Courses section works
- [ ] **NEW:** Course Offerings section works
- [ ] CSV import creates courseOfferings (not nested)
- [ ] Can edit offering details

### Test 5.7: Application Form
- [ ] Can still select university → course → apply
- [ ] Application creates studentStatus with courseOfferingId

### Test 5.8: Firestore Rules
- [ ] Public can read active courseOfferings
- [ ] Public cannot read/write
- [ ] Admin can full CRUD
- [ ] Run rules simulator tests

---

## ROLLBACK PLAN (If Needed)

If issues arise during implementation:

1. **Stop:** Do not proceed to next phase
2. **Restore:** Use backup from Step 1.1 to restore old data
3. **Keep functions:** Don't delete OLD versions until tested
4. **Parallel:** Run both old and new data loads during testing

**Old function names (keep as fallback):**
```javascript
async function getUniversityWithCourses_OLD(uniId) { /* old code */ }
async function getCourseWithUniversities_OLD(courseId) { /* old code */ }
async function getCoursesWithUniversities_OLD() { /* old code */ }
```

---

## SUCCESS CRITERIA

✅ **Implementation complete when:**

1. courseOfferings created as first-class collection
2. All universities cleaned (no courseOfferings arrays)
3. All 3 data-loading functions refactored
4. Both UI pages tested and working
5. CSV imports work with new structure
6. All test checklist items passing
7. No errors in browser console
8. Firestore rules validated with simulator
9. Admin dashboard courseOfferings section functional
10. Backup restored and verified

---

## ESTIMATED EFFORT

- Migration script: 2 hours (careful testing)
- Function refactoring: 3 hours
- UI page updates: 2 hours
- Testing: 3 hours
- Documentation: 1 hour

**Total: ~11 hours** (with full testing)

---

## NEXT STEP

**User must approve:**
1. Schema design (HORIZONS_CORRECT_FIRESTORE_SCHEMA.md)
2. Implementation plan (this document)
3. Proceed to actual code changes?

**Once approved, implementation sequence:**
1. Create migration function
2. Back up current data
3. Run migration
4. Refactor 3 functions
5. Update 2 pages
6. Test thoroughly
7. Delete old code/functions
8. Final verification

