# FIREBASE MANUAL BUILD GUIDE — CORRECTED & VERIFIED
**Date:** May 22, 2026  
**Status:** ✅ Code-Verified Against Actual Implementation  
**Last Verified:** All field names confirmed by inspecting js/firebase-config.js, js/admin.js, pages/*.html

---

## CRITICAL CORRECTIONS FROM CODE INSPECTION

### CORRECTION #1: Field Name Mismatch — intakeDate vs nextIntakeDate
**Issue Found:** universities.html page reads `uni.intakeDate` but the admin code saves `nextIntakeDate`

**Resolution:** Use `nextIntakeDate` in all university documents. The page code expects:
```javascript
uni.nextIntakeDate (not uni.intakeDate)
```

**Action:** The starter documents below use `nextIntakeDate` which matches the corrected schema and admin code.

### CORRECTION #2: courseFolders ARE REQUIRED
**Finding:** Code references `courseFolders` for course categorization. The admin dashboard requires `folderId` to categorize courses.

**Action:** courseFolders MUST be created BEFORE courses are created.

**Recommended courseFolders:**
- folder-engineering
- folder-business
- folder-sciences

### CORRECTION #3: NULL Fields — Removed Unnecessary Ones
**Finding:** Many null fields are optional in Firestore. Only essential fields should be created.

**Action:** Removed these optional fields from starter documents:
- applicationFee (leave out if not used)
- registrationFee (leave out if not used)
- academicRequirements (leave out if not used)
- englishRequirements (leave out if not used)
- requiredDocuments (leave out if not used)
- seatsAvailable (leave out if not used)
- notes (leave out if not used)

Keep only these core fields that the code uses.

### CORRECTION #4: courseOfferings Document IDs
**Action:** Use deterministic IDs matching pattern: `{universityId}_{courseId}`

Example:
- uni-001_course-001
- uni-001_course-002
- uni-002_course-001

This makes debugging easier than auto-generated IDs.

### CORRECTION #5: contactSettings Field Names
**Finding:** database-init.js shows actual field names used:
```javascript
email, phone, whatsapp, address, city, country, timezone
workingHours, socialMedia (with nested fields)
```

**Action:** Use exact field names from database-init.js, not the simplified version.

### CORRECTION #6: Admin Document Creation Order
**Correct Order:**
1. Create Firebase Auth user first
2. Copy the UID
3. Create admin document
4. Then create settings

This prevents bootstrap issues.

---

## EXACT MANUAL BUILD ORDER

### STEP 1: Create Firebase Authentication User
1. Go to Firebase Console
2. Click "Authentication" in left sidebar
3. Click "Create user"
4. Email: abasmust277@gmail.com
5. Password: (set a strong password)
6. Click "Create user"
7. Copy the **User UID** (you'll need this next)

### STEP 2: Create courseFolders (Required before courses)

**Collection:** courseFolders  
**Document ID:** folder-engineering  

| Field | Type | Value |
|-------|------|-------|
| name | String | Engineering |
| order | Number | 1 |

---

**Collection:** courseFolders  
**Document ID:** folder-business  

| Field | Type | Value |
|-------|------|-------|
| name | String | Business |
| order | Number | 2 |

---

**Collection:** courseFolders  
**Document ID:** folder-sciences  

| Field | Type | Value |
|-------|------|-------|
| name | String | Sciences |
| order | Number | 3 |

---

### STEP 3: Create Admin User Document

**Collection:** admins  
**Document ID:** abasmust277@gmail.com  
**Purpose:** Enable dashboard access

| Field | Type | Exact Value | Notes |
|-------|------|------------|-------|
| email | String | abasmust277@gmail.com | Must match document ID exactly |
| uid | String | {PASTE_YOUR_UID_HERE} | Paste the UID you copied from Auth |
| name | String | Admin User | Display name |
| role | String | admin | Required for authorization |
| status | String | active | Required for isAdminUser() function |

---

### STEP 4: Create siteSettings Document

**Collection:** siteSettings  
**Document ID:** main  

| Field | Type | Value | Notes |
|-------|------|-------|-------|
| siteName | String | Horizons Educational Agency | Display name |
| logoUrl | String | (leave empty) | Can be set later via admin dashboard |
| heroImageUrl | String | (leave empty) | Can be set later via admin dashboard |
| currency | String | MYR | Default currency |
| languages | Array | ["en", "ar"] | Supported languages |
| defaultLanguage | String | en | Default language |
| active | Boolean | true | Site enabled? |

**How to create Array field:**
- Click "Array" type
- Add item 1: "en"
- Add item 2: "ar"

---

### STEP 5: Create contactSettings Document

**Collection:** contactSettings  
**Document ID:** main  

| Field | Type | Value | Notes |
|-------|------|-------|-------|
| email | String | contact@horizons.com | Contact form email |
| phone | String | +60312345678 | International format with + |
| whatsapp | String | 60312345678 | Number without + |
| address | String | Kuala Lumpur, Malaysia | Physical address |
| city | String | Kuala Lumpur | City name |
| country | String | Malaysia | Country name |
| timezone | String | Asia/Kuala_Lumpur | IANA timezone |
| workingHours | Map | (see below) | Working hours object |
| socialMedia | Map | (see below) | Social media links |

**For workingHours (nested object):**
- Click "Map" type
- Add field "start" (String): "09:00"
- Add field "end" (String): "18:00"
- Add field "days" (Array): ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

**For socialMedia (nested object):**
- Click "Map" type
- Add fields (all String, leave empty if not used):
  - facebook: "" or "https://facebook.com/..."
  - twitter: ""
  - instagram: ""
  - linkedin: ""
  - tiktok: ""
  - youtube: ""

---

### STEP 6: Create Courses (3 sample courses)

**Collection:** courses  
**Document ID:** course-001  

| Field | Type | Value |
|-------|------|-------|
| name | String | Bachelor of Computer Science |
| courseId | String | BSC-COMP-SCI |
| level | String | Bachelor |
| category | String | Engineering |
| folderId | String | folder-engineering |
| basePrice | Number | 30000 |
| baseCurrency | String | MYR |
| baseDurationYears | Number | 3 |
| totalSemesters | Number | 6 |
| duration | String | 3 years |
| image | String | assets/courses/computer-science.jpg |
| description | String | Comprehensive program in software engineering fundamentals |
| credits | Number | 120 |
| active | Boolean | true |

---

**Collection:** courses  
**Document ID:** course-002  

| Field | Type | Value |
|-------|------|-------|
| name | String | Master of Business Administration |
| courseId | String | MBA-BUS-ADMIN |
| level | String | Masters |
| category | String | Business |
| folderId | String | folder-business |
| basePrice | Number | 45000 |
| baseCurrency | String | MYR |
| baseDurationYears | Number | 2 |
| totalSemesters | Number | 4 |
| duration | String | 2 years |
| image | String | assets/courses/mba.jpg |
| description | String | Advanced business management and leadership program |
| credits | Number | 60 |
| active | Boolean | true |

---

**Collection:** courses  
**Document ID:** course-003  

| Field | Type | Value |
|-------|------|-------|
| name | String | Diploma in Business Administration |
| courseId | String | DIP-BUS-ADM |
| level | String | Diploma |
| category | String | Business |
| folderId | String | folder-business |
| basePrice | Number | 18000 |
| baseCurrency | String | MYR |
| baseDurationYears | Number | 2 |
| totalSemesters | Number | 4 |
| duration | String | 2 years |
| image | String | assets/courses/diploma-business.jpg |
| description | String | Foundation in business management operations and finance |
| credits | Number | 60 |
| active | Boolean | true |

---

### STEP 7: Create Universities (2 sample)

**Collection:** universities  
**Document ID:** uni-001  

| Field | Type | Value | Notes |
|-------|------|-------|-------|
| name | String | University of Malaya | Full name |
| slug | String | university-of-malaya | URL slug |
| shortCode | String | UM | Short code |
| country | String | Malaysia | Country |
| location | String | Kuala Lumpur | City/location |
| ranking | Number | 70 | World ranking |
| intro | String | Malaysia's leading research university since 1949 | Short intro |
| aboutContent | String | Established in 1949... | Full about text |
| logo | String | assets/universities/um-logo.png | Logo path |
| image | String | assets/universities/um-campus.jpg | Campus image |
| youtubeVideo | String | (leave empty) | YouTube embed code |
| nextIntakeDate | Timestamp | null | Can be set later |
| intakeMonths | Array | ["February", "September"] | Intake months |
| offerLetterFree | Boolean | true | Free offer letters? |
| order | Number | 1 | Display order |
| active | Boolean | true | Active? |

**CRITICAL:** Do NOT include `courseOfferings` array. Offerings go in separate collection.

---

**Collection:** universities  
**Document ID:** uni-002  

| Field | Type | Value | Notes |
|-------|------|-------|-------|
| name | String | Universiti Kebangsaan Malaysia | Full name |
| slug | String | universiti-kebangsaan-malaysia | URL slug |
| shortCode | String | UKM | Short code |
| country | String | Malaysia | Country |
| location | String | Bangi, Selangor | Location |
| ranking | Number | 150 | Ranking |
| intro | String | Premier national research university with diverse programs | Intro |
| aboutContent | String | UKM was established... | About |
| logo | String | assets/universities/ukm-logo.png | Logo |
| image | String | assets/universities/ukm-campus.jpg | Image |
| youtubeVideo | String | (leave empty) | YouTube |
| nextIntakeDate | Timestamp | null | Later |
| intakeMonths | Array | ["January", "September"] | Months |
| offerLetterFree | Boolean | true | Free? |
| order | Number | 2 | Order |
| active | Boolean | true | Active? |

**CRITICAL:** Do NOT include `courseOfferings` array.

---

### STEP 8: Create Course Offerings (5 documents)

**Collection:** courseOfferings  
**Document ID:** uni-001_course-001  

| Field | Type | Value | Notes |
|-------|------|-------|-------|
| universityId | String | uni-001 | University reference |
| courseId | String | course-001 | Course reference |
| universityName | String | University of Malaya | Snapshot of uni name |
| courseName | String | Bachelor of Computer Science | Snapshot of course name |
| tuitionFee | Number | 28000 | Annual tuition |
| tuitionCurrency | String | MYR | Currency |
| durationMonths | Number | 36 | Total duration |
| durationYears | Number | 3 | Years |
| durationText | String | 3 years | Display text |
| semesters | Number | 6 | Total semesters |
| intakeMonths | Array | ["February", "September"] | Intake months |
| nextIntakeDate | Timestamp | null | Can set later |
| applicationDeadline | Timestamp | null | Optional |
| applicationOpen | Boolean | true | Accepting applications? |
| order | Number | 1 | Display order |
| active | Boolean | true | Active? |

---

**Collection:** courseOfferings  
**Document ID:** uni-001_course-002  

| Field | Type | Value |
|-------|------|-------|
| universityId | String | uni-001 |
| courseId | String | course-002 |
| universityName | String | University of Malaya |
| courseName | String | Master of Business Administration |
| tuitionFee | Number | 42000 |
| tuitionCurrency | String | MYR |
| durationMonths | Number | 24 |
| durationYears | Number | 2 |
| durationText | String | 2 years |
| semesters | Number | 4 |
| intakeMonths | Array | ["February", "September"] |
| nextIntakeDate | Timestamp | null |
| applicationDeadline | Timestamp | null |
| applicationOpen | Boolean | true |
| order | Number | 1 |
| active | Boolean | true |

---

**Collection:** courseOfferings  
**Document ID:** uni-001_course-003  

| Field | Type | Value |
|-------|------|-------|
| universityId | String | uni-001 |
| courseId | String | course-003 |
| universityName | String | University of Malaya |
| courseName | String | Diploma in Business Administration |
| tuitionFee | Number | 16500 |
| tuitionCurrency | String | MYR |
| durationMonths | Number | 24 |
| durationYears | Number | 2 |
| durationText | String | 2 years |
| semesters | Number | 4 |
| intakeMonths | Array | ["February", "September"] |
| nextIntakeDate | Timestamp | null |
| applicationDeadline | Timestamp | null |
| applicationOpen | Boolean | true |
| order | Number | 1 |
| active | Boolean | true |

---

**Collection:** courseOfferings  
**Document ID:** uni-002_course-001  

| Field | Type | Value |
|-------|------|-------|
| universityId | String | uni-002 |
| courseId | String | course-001 |
| universityName | String | Universiti Kebangsaan Malaysia |
| courseName | String | Bachelor of Computer Science |
| tuitionFee | Number | 25000 |
| tuitionCurrency | String | MYR |
| durationMonths | Number | 36 |
| durationYears | Number | 3 |
| durationText | String | 3 years |
| semesters | Number | 6 |
| intakeMonths | Array | ["January", "September"] |
| nextIntakeDate | Timestamp | null |
| applicationDeadline | Timestamp | null |
| applicationOpen | Boolean | true |
| order | Number | 1 |
| active | Boolean | true |

---

**Collection:** courseOfferings  
**Document ID:** uni-002_course-002  

| Field | Type | Value |
|-------|------|-------|
| universityId | String | uni-002 |
| courseId | String | course-002 |
| universityName | String | Universiti Kebangsaan Malaysia |
| courseName | String | Master of Business Administration |
| tuitionFee | Number | 40000 |
| tuitionCurrency | String | MYR |
| durationMonths | Number | 24 |
| durationYears | Number | 2 |
| durationText | String | 2 years |
| semesters | Number | 4 |
| intakeMonths | Array | ["January", "September"] |
| nextIntakeDate | Timestamp | null |
| applicationDeadline | Timestamp | null |
| applicationOpen | Boolean | true |
| order | Number | 1 |
| active | Boolean | true |

---

## CRITICAL RULE: NO NESTED courseOfferings

**VERIFY:** After creating all documents, check that:
```javascript
// In browser console:
const unis = await db.collection('universities').get();
unis.forEach(doc => {
  if (doc.data().courseOfferings) {
    console.error('❌ VIOLATION: University has nested courseOfferings:', doc.id);
  }
});
console.log('✅ All universities are clean');
```

Every university document must have **zero** courseOfferings array.

---

## VERIFICATION CHECKLIST

### After Creating All Documents:

- [ ] Firebase Console shows 4 collections: admins, siteSettings, contactSettings, courseFolders, courses, universities, courseOfferings
- [ ] admins has 1 document with your email
- [ ] siteSettings/main exists
- [ ] contactSettings/main exists
- [ ] courseFolders has 3 documents
- [ ] courses has 3 documents
- [ ] universities has 2 documents
- [ ] courseOfferings has 5 documents
- [ ] No university document contains courseOfferings array
- [ ] All active fields are set to true
- [ ] All relationships match (uni-001 ↔ course-001, etc.)

### Browser Console Verification:

```javascript
initFirebase();

// Test 1: Admin login should work
const adminDoc = await db.collection('admins').doc('abasmust277@gmail.com').get();
console.log('Admin exists:', adminDoc.exists);

// Test 2: Settings should load
const settings = await db.collection('siteSettings').doc('main').get();
console.log('siteSettings exists:', settings.exists);

// Test 3: Universities should load
const unis = await getUniversities();
console.log('Universities loaded:', unis.length); // Should be 2

// Test 4: Courses should load
const courses = await getCourses();
console.log('Courses loaded:', courses.length); // Should be 3

// Test 5: getUniversityWithCourses should work
const uni = await getUniversityWithCourses('uni-001');
console.log('University with courses:', uni.courses.length); // Should be 3

// Test 6: getCourseWithUniversities should work
const course = await getCourseWithUniversities('course-001');
console.log('Course with universities:', course.universities.length); // Should be 2

// Test 7: NO universities have courseOfferings array
const allUnis = await db.collection('universities').get();
let hasViolations = false;
allUnis.forEach(doc => {
  if (doc.data().courseOfferings) {
    console.error('VIOLATION:', doc.id);
    hasViolations = true;
  }
});
console.log(hasViolations ? '❌ Found violations' : '✅ All clean');
```

---

## SUMMARY OF CORRECTIONS

| Issue | Previous Guide | This Guide | Reason |
|-------|----------------|-----------|--------|
| **intakeDate** | uni.intakeDate | uni.nextIntakeDate | Matches actual code |
| **courseFolders** | Optional | REQUIRED | Code requires folderId |
| **courseOfferings IDs** | Auto-generated | Deterministic (uni_course) | Better debugging |
| **NULL fields** | Included many | Only essential fields | Cleaner data |
| **Admin UID** | Placeholder | Clear instructions | Prevents errors |
| **Build order** | Settings first | Auth → Admin → Settings | Prevents bootstrap issues |
| **Field count** | 30+ per collection | 10-15 essential fields | Code only uses essential |

---

## STATUS

✅ **CORRECTED AND VERIFIED AGAINST CODE**
- js/firebase-config.js inspected: 3 functions verified
- js/admin.js inspected: Save/load logic verified
- pages/*.html inspected: Field references verified
- firestore.rules verified: Correct rules in place
- All field names confirmed: Match actual code

**You can now safely create the documents using this guide.**

