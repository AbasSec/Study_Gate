# EXACT STARTER DOCUMENTS FOR FIREBASE CONSOLE
**Generated:** May 22, 2026  
**Instructions:** Copy each field exactly as specified. Use Firebase Console UI to create documents.

---

## DOCUMENT 1: Admin User

**Collection:** admins  
**Document ID:** abasmust277@gmail.com  
**Purpose:** First admin to enable dashboard access

### Fields to Create:

| Field Name | Type | Exact Value | Notes |
|-----------|------|------------|-------|
| email | String | abasmust277@gmail.com | Must match document ID exactly |
| uid | String | {REPLACE_WITH_YOUR_UID} | Get from Firebase Console → Auth → Users → Copy UID |
| name | String | System Administrator | Display name for admin |
| role | String | admin | Required value for authorization |
| status | String | active | Required for isAdminUser() check |
| createdAt | Timestamp | (current time) | Let Firebase auto-generate or set to now |

### How to Find Your UID:
1. Go to Firebase Console
2. Click "Authentication" in left menu
3. Click "Users" tab
4. Find your user account (abasmust277@gmail.com)
5. Click the copy icon next to "User UID"
6. Paste that value into the uid field above

---

## DOCUMENT 2: Site Settings

**Collection:** siteSettings  
**Document ID:** main  
**Purpose:** Global site configuration

### Fields to Create:

| Field Name | Type | Exact Value | Notes |
|-----------|------|------------|-------|
| siteName | String | Horizons Educational Agency | Display name |
| tagline | String | Gateway to Global Education | Short description |
| logoUrl | String | (leave empty or enter URL) | External HTTPS URL or local asset path |
| heroImageUrl | String | (leave empty or enter URL) | Hero section background image |
| currency | String | MYR | Default currency code |
| languages | Array | ["en", "ar"] | Supported languages |
| defaultLanguage | String | en | Default UI language |
| active | Boolean | true | Enable/disable site |
| updatedAt | Timestamp | (current time) | Auto-generated |

### Field Details:

**logoUrl options:**
- Leave empty (system will use initials)
- Or provide: assets/images/logo.png
- Or provide HTTPS URL: https://example.com/logo.png

**languages:** Must be array with strings. Exactly ["en", "ar"]

**defaultLanguage:** Either "en" or "ar"

---

## DOCUMENT 3: Contact Settings

**Collection:** contactSettings  
**Document ID:** main  
**Purpose:** Contact information for footer and contact page

### Fields to Create:

| Field Name | Type | Exact Value | Notes |
|-----------|------|------------|-------|
| address | String | Kuala Lumpur, Malaysia | Physical address |
| phone | String | +60312345678 | International format |
| email | String | contact@horizons.com | Contact email |
| whatsapp | String | 60312345678 | Number without + |
| facebook | String | (leave empty) | Facebook URL or empty |
| instagram | String | (leave empty) | Instagram URL or empty |
| twitter | String | (leave empty) | Twitter URL or empty |
| linkedin | String | (leave empty) | LinkedIn URL or empty |
| updatedAt | Timestamp | (current time) | Auto-generated |

### Field Details:

**phone & whatsapp:** Use international format without + for whatsapp

**social media fields:** Either:
- Leave empty (don't display)
- Or provide: https://facebook.com/yourpage

---

## DOCUMENT 4: Course 1

**Collection:** courses  
**Document ID:** course-001  
**Purpose:** Global course definition

### Fields to Create:

| Field Name | Type | Exact Value | Notes |
|-----------|------|------------|-------|
| name | String | Bachelor of Computer Science | Full course name |
| courseId | String | BSC-COMP-SCI | Unique identifier, auto-generated |
| level | String | Bachelor | Required: Bachelor, Diploma, Masters, etc. |
| category | String | Engineering | Must match a courseFolders name |
| folderId | String | {FOLDER_ID_1} | Get from courseFolders collection |
| basePrice | Number | 30000 | Base price in MYR |
| baseCurrency | String | MYR | Base currency code |
| baseDurationYears | Number | 3 | Years, can be decimal |
| totalSemesters | Number | 6 | Total semesters |
| duration | String | 3 years | Display text |
| image | String | assets/courses/computer-science.jpg | Path or HTTPS URL |
| description | String | Comprehensive program in software engineering... | Long description |
| credits | Number | 120 | Total credits |
| active | Boolean | true | Enable/disable course |

### How to Get FOLDER_ID:
1. Firebase Console → courseFolders collection
2. Click on any folder document
3. Copy the Document ID

---

## DOCUMENT 5: Course 2

**Collection:** courses  
**Document ID:** course-002  

### Fields to Create:

| Field Name | Type | Exact Value | Notes |
|-----------|------|------------|-------|
| name | String | Master of Business Administration | Full course name |
| courseId | String | MBA-BUS-ADMIN | Unique identifier |
| level | String | Masters | Required level value |
| category | String | Business | Must match courseFolders name |
| folderId | String | {FOLDER_ID_2} | Folder ID from courseFolders |
| basePrice | Number | 45000 | Price in MYR |
| baseCurrency | String | MYR | Currency |
| baseDurationYears | Number | 2 | Duration |
| totalSemesters | Number | 4 | Semesters |
| duration | String | 2 years | Display text |
| image | String | assets/courses/mba.jpg | Image path/URL |
| description | String | Advanced business management and leadership program. | Description |
| credits | Number | 60 | Credits |
| active | Boolean | true | Active status |

---

## DOCUMENT 6: Course 3

**Collection:** courses  
**Document ID:** course-003  

### Fields to Create:

| Field Name | Type | Exact Value | Notes |
|-----------|------|------------|-------|
| name | String | Diploma in Business Administration | Full course name |
| courseId | String | DIP-BUS-ADM | Unique identifier |
| level | String | Diploma | Required level |
| category | String | Business | Must match courseFolders name |
| folderId | String | {FOLDER_ID_2} | Same folder as Course 2 |
| basePrice | Number | 18000 | Price in MYR |
| baseCurrency | String | MYR | Currency |
| baseDurationYears | Number | 2 | Duration |
| totalSemesters | Number | 4 | Semesters |
| duration | String | 2 years | Display text |
| image | String | assets/courses/diploma-business.jpg | Image path/URL |
| description | String | Foundation in business management operations and finance. | Description |
| credits | Number | 60 | Credits |
| active | Boolean | true | Active status |

---

## DOCUMENT 7: University 1

**Collection:** universities  
**Document ID:** uni-001  
**Purpose:** University master data (NO courseOfferings array)

### Fields to Create:

| Field Name | Type | Exact Value | Notes |
|-----------|------|------------|-------|
| name | String | University of Malaya | Full university name |
| slug | String | university-of-malaya | URL-friendly name |
| shortCode | String | UM | 2-3 letter code |
| country | String | Malaysia | Country name |
| location | String | Kuala Lumpur | City or campus location |
| ranking | Number | 70 | World ranking (0 if unknown) |
| intro | String | Malaysia's leading research university since 1949 | Short intro |
| aboutContent | String | Established in 1949 as Universiti Malaya... | Full about text |
| logo | String | assets/universities/um-logo.png | Logo path/HTTPS URL |
| image | String | assets/universities/um-campus.jpg | Campus photo path/URL |
| youtubeVideo | String | (leave empty) | YouTube embed code or empty |
| nextIntakeDate | Timestamp | null | Leave null if not available |
| intakeMonths | Array | ["February", "September"] | Array of month strings |
| offerLetterFree | Boolean | true | Free offer letters? |
| faqs | Array | [] | Empty array (can add later) |
| order | Number | 1 | Display order |
| active | Boolean | true | Enable/disable university |

### CRITICAL NOTE:
**DO NOT include a courseOfferings field!**  
Offerings are now stored as separate courseOfferings collection documents.

---

## DOCUMENT 8: University 2

**Collection:** universities  
**Document ID:** uni-002  

### Fields to Create:

| Field Name | Type | Exact Value | Notes |
|-----------|------|------------|-------|
| name | String | Universiti Kebangsaan Malaysia | Full university name |
| slug | String | universiti-kebangsaan-malaysia | URL-friendly name |
| shortCode | String | UKM | 2-3 letter code |
| country | String | Malaysia | Country name |
| location | String | Bangi, Selangor | Campus location |
| ranking | Number | 150 | World ranking |
| intro | String | Premier national research university with diverse programs | Short intro |
| aboutContent | String | Universiti Kebangsaan Malaysia (UKM) was established... | Full about text |
| logo | String | assets/universities/ukm-logo.png | Logo path/URL |
| image | String | assets/universities/ukm-campus.jpg | Campus photo path/URL |
| youtubeVideo | String | (leave empty) | YouTube embed or empty |
| nextIntakeDate | Timestamp | null | Leave null |
| intakeMonths | Array | ["January", "September"] | Intake months |
| offerLetterFree | Boolean | true | Free offers? |
| faqs | Array | [] | Empty array |
| order | Number | 2 | Display order |
| active | Boolean | true | Active? |

### CRITICAL NOTE:
**DO NOT include courseOfferings field!**

---

## DOCUMENT 9: Course Offering 1

**Collection:** courseOfferings  
**Document ID:** (auto-generate - click "+" then auto ID)  
**Purpose:** University-specific course pricing and availability

### Fields to Create:

| Field Name | Type | Exact Value | Notes |
|-----------|------|------------|-------|
| universityId | String | uni-001 | Reference to University 1 |
| courseId | String | course-001 | Reference to Course 1 (BSC-COMP-SCI) |
| universityName | String | University of Malaya | Snapshot of university name |
| courseName | String | Bachelor of Computer Science | Snapshot of course name |
| tuitionFee | Number | 28000 | Annual tuition in MYR |
| tuitionCurrency | String | MYR | Currency code |
| durationMonths | Number | 36 | Total duration in months |
| durationYears | Number | 3 | Duration in years |
| durationText | String | 3 years | Display text |
| semesters | Number | 6 | Total semesters |
| intakeMonths | Array | ["February", "September"] | When students can start |
| nextIntakeDate | Timestamp | null | Leave null |
| applicationDeadline | Timestamp | null | Leave null if not set |
| applicationOpen | Boolean | true | Can students apply? |
| applicationFee | Number | null | Leave null if free |
| registrationFee | Number | null | Leave null if included |
| academicRequirements | String | null | Leave null |
| englishRequirements | String | null | Leave null |
| requiredDocuments | String | null | Leave null |
| seatsAvailable | Number | null | Leave null if unlimited |
| notes | String | null | Leave null |
| order | Number | 1 | Display order |
| active | Boolean | true | Is this offering active? |
| createdAt | Timestamp | (current time) | Auto-generated |
| updatedAt | Timestamp | (current time) | Auto-generated |

---

## DOCUMENT 10: Course Offering 2

**Collection:** courseOfferings  
**Document ID:** (auto-generate)

### Fields to Create:

| Field Name | Type | Exact Value | Notes |
|-----------|------|------------|-------|
| universityId | String | uni-001 | University of Malaya |
| courseId | String | course-002 | MBA-BUS-ADMIN |
| universityName | String | University of Malaya | Snapshot |
| courseName | String | Master of Business Administration | Snapshot |
| tuitionFee | Number | 42000 | Annual fee |
| tuitionCurrency | String | MYR | Currency |
| durationMonths | Number | 24 | Duration |
| durationYears | Number | 2 | Years |
| durationText | String | 2 years | Display text |
| semesters | Number | 4 | Semesters |
| intakeMonths | Array | ["February", "September"] | Intake months |
| nextIntakeDate | Timestamp | null | Leave null |
| applicationDeadline | Timestamp | null | Leave null |
| applicationOpen | Boolean | true | Active? |
| applicationFee | Number | null | Leave null |
| registrationFee | Number | null | Leave null |
| academicRequirements | String | null | Leave null |
| englishRequirements | String | null | Leave null |
| requiredDocuments | String | null | Leave null |
| seatsAvailable | Number | null | Leave null |
| notes | String | null | Leave null |
| order | Number | 1 | Order |
| active | Boolean | true | Active? |
| createdAt | Timestamp | (current time) | Auto |
| updatedAt | Timestamp | (current time) | Auto |

---

## DOCUMENT 11: Course Offering 3

**Collection:** courseOfferings  
**Document ID:** (auto-generate)

### Fields to Create:

| Field Name | Type | Exact Value | Notes |
|-----------|------|------------|-------|
| universityId | String | uni-001 | University of Malaya |
| courseId | String | course-003 | DIP-BUS-ADM |
| universityName | String | University of Malaya | Snapshot |
| courseName | String | Diploma in Business Administration | Snapshot |
| tuitionFee | Number | 16500 | Annual fee |
| tuitionCurrency | String | MYR | Currency |
| durationMonths | Number | 24 | Duration |
| durationYears | Number | 2 | Years |
| durationText | String | 2 years | Display text |
| semesters | Number | 4 | Semesters |
| intakeMonths | Array | ["February", "September"] | Intake months |
| nextIntakeDate | Timestamp | null | Leave null |
| applicationDeadline | Timestamp | null | Leave null |
| applicationOpen | Boolean | true | Active? |
| applicationFee | Number | null | Leave null |
| registrationFee | Number | null | Leave null |
| academicRequirements | String | null | Leave null |
| englishRequirements | String | null | Leave null |
| requiredDocuments | String | null | Leave null |
| seatsAvailable | Number | null | Leave null |
| notes | String | null | Leave null |
| order | Number | 1 | Order |
| active | Boolean | true | Active? |
| createdAt | Timestamp | (current time) | Auto |
| updatedAt | Timestamp | (current time) | Auto |

---

## DOCUMENT 12: Course Offering 4

**Collection:** courseOfferings  
**Document ID:** (auto-generate)

### Fields to Create:

| Field Name | Type | Exact Value | Notes |
|-----------|------|------------|-------|
| universityId | String | uni-002 | UKM |
| courseId | String | course-001 | BSC-COMP-SCI |
| universityName | String | Universiti Kebangsaan Malaysia | Snapshot |
| courseName | String | Bachelor of Computer Science | Snapshot |
| tuitionFee | Number | 25000 | Annual fee |
| tuitionCurrency | String | MYR | Currency |
| durationMonths | Number | 36 | Duration |
| durationYears | Number | 3 | Years |
| durationText | String | 3 years | Display text |
| semesters | Number | 6 | Semesters |
| intakeMonths | Array | ["January", "September"] | Intake months |
| nextIntakeDate | Timestamp | null | Leave null |
| applicationDeadline | Timestamp | null | Leave null |
| applicationOpen | Boolean | true | Active? |
| applicationFee | Number | null | Leave null |
| registrationFee | Number | null | Leave null |
| academicRequirements | String | null | Leave null |
| englishRequirements | String | null | Leave null |
| requiredDocuments | String | null | Leave null |
| seatsAvailable | Number | null | Leave null |
| notes | String | null | Leave null |
| order | Number | 1 | Order |
| active | Boolean | true | Active? |
| createdAt | Timestamp | (current time) | Auto |
| updatedAt | Timestamp | (current time) | Auto |

---

## DOCUMENT 13: Course Offering 5

**Collection:** courseOfferings  
**Document ID:** (auto-generate)

### Fields to Create:

| Field Name | Type | Exact Value | Notes |
|-----------|------|------------|-------|
| universityId | String | uni-002 | UKM |
| courseId | String | course-002 | MBA-BUS-ADMIN |
| universityName | String | Universiti Kebangsaan Malaysia | Snapshot |
| courseName | String | Master of Business Administration | Snapshot |
| tuitionFee | Number | 40000 | Annual fee |
| tuitionCurrency | String | MYR | Currency |
| durationMonths | Number | 24 | Duration |
| durationYears | Number | 2 | Years |
| durationText | String | 2 years | Display text |
| semesters | Number | 4 | Semesters |
| intakeMonths | Array | ["January", "September"] | Intake months |
| nextIntakeDate | Timestamp | null | Leave null |
| applicationDeadline | Timestamp | null | Leave null |
| applicationOpen | Boolean | true | Active? |
| applicationFee | Number | null | Leave null |
| registrationFee | Number | null | Leave null |
| academicRequirements | String | null | Leave null |
| englishRequirements | String | null | Leave null |
| requiredDocuments | String | null | Leave null |
| seatsAvailable | Number | null | Leave null |
| notes | String | null | Leave null |
| order | Number | 1 | Order |
| active | Boolean | true | Active? |
| createdAt | Timestamp | (current time) | Auto |
| updatedAt | Timestamp | (current time) | Auto |

---

## CREATION CHECKLIST

### Step 1: Preparation
- [ ] Open Firebase Console
- [ ] Go to Firestore Database
- [ ] Have this document open for reference

### Step 2: Create Settings Collections FIRST
- [ ] Create siteSettings/main
- [ ] Create contactSettings/main

### Step 3: Create Admin
- [ ] Get your UID from Firebase Auth
- [ ] Create admins/{your-email}

### Step 4: Create Courses
- [ ] Create courses/course-001 (Computer Science)
- [ ] Create courses/course-002 (MBA)
- [ ] Create courses/course-003 (Diploma)

### Step 5: Create Universities
- [ ] Create universities/uni-001 (University of Malaya)
- [ ] Create universities/uni-002 (UKM)

### Step 6: Create Course Offerings (THE NEW COLLECTION)
- [ ] Create courseOfferings/{auto} (UKM + BSC-COMP-SCI)
- [ ] Create courseOfferings/{auto} (UKM + MBA)
- [ ] Create courseOfferings/{auto} (UM + BSC-COMP-SCI)
- [ ] Create courseOfferings/{auto} (UM + MBA)
- [ ] Create courseOfferings/{auto} (UM + DIP-BUS-ADM)

### Step 7: Verify
- [ ] All collections exist in Firebase Console
- [ ] courseOfferings has 5 documents
- [ ] No universities have courseOfferings field
- [ ] All timestamps are set

---

## EXACT CREATION STEPS IN FIREBASE CONSOLE

### For Each Document:

1. Go to Firestore Database
2. Click "+" next to collection name
3. Either:
   - Click "+" to auto-generate ID (for courseOfferings, courseFolders)
   - OR enter specific ID (for courses, universities, etc.)
4. Click "Add field" for each field
5. Enter:
   - Field name (exactly as specified)
   - Type (from dropdown)
   - Value (exactly as specified)
6. Click "Save"

### Field Type Selection in Firebase Console:

- **String** → Type: "Text"
- **Number** → Type: "Number"
- **Boolean** → Type: "Boolean"
- **Array** → Type: "Array" then add items
- **Timestamp** → Type: "Date and time"
- **null** → Leave field empty or don't create it

### For Array Fields (like intakeMonths):

1. Click "Array" type
2. Click "+" to add item
3. Enter value as String
4. Click "+" again for next item
5. Repeat for each month

Example for intakeMonths: ["February", "September"]
- Add item 1: "February"
- Add item 2: "September"

---

## FINAL VERIFICATION

After creating all documents, verify:

```javascript
// In browser console on admin dashboard:
initFirebase();

// Check all collections exist
const collections = await db.collection('siteSettings').get();
console.log('Settings:', collections.size); // Should be 1

const courses = await db.collection('courses').get();
console.log('Courses:', courses.size); // Should be 3

const unis = await db.collection('universities').get();
console.log('Universities:', unis.size); // Should be 2

const offerings = await db.collection('courseOfferings').get();
console.log('Course Offerings:', offerings.size); // Should be 5

// Verify no universities have courseOfferings array
unis.forEach(doc => {
  const data = doc.data();
  if (data.courseOfferings) {
    console.error('ERROR: University has nested courseOfferings:', doc.id);
  }
});
console.log('✅ All universities are clean (no nested courseOfferings)');
```

---

**All values are ready to copy into Firebase Console.**  
**Follow the exact field types and values specified above.**

