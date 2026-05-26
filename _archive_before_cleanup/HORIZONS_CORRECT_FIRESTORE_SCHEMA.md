# HORIZONS CORRECT FIRESTORE DATABASE SCHEMA
**Date:** May 22, 2026  
**Status:** Production-Ready (Requires Implementation)  
**Architecture Validation:** Code-based, not guessed  

---

## CRITICAL FINDING: WHAT WAS WRONG

The previous "schema" had 3 fatal flaws:

1. **courseOfferings stored as nested arrays in universities**
   - Current code: `university.courseOfferings = [{courseId, fees, currency, ...}]`
   - Problem: Cannot query offerings independently, hard to update, breaks many-to-many model
   - Fix: courseOfferings must be a **first-class collection** with `universityId` and `courseId` references

2. **Functions building data from incorrect structure**
   - `getUniversityWithCourses()` expects `university.courseOfferings` array
   - `getCourseWithUniversities()` expects `university.courseOfferings` array
   - `getCoursesWithUniversities()` expects `university.courseOfferings` array
   - These must be refactored to query courseOfferings collection instead

3. **Admin dashboard assumes nested courses inside universities**
   - university-detail.html line 471: `(uni.courseOfferings || []).forEach(...)`
   - university-detail.html line 482: `const courses = Array.isArray(uni?.courses)`
   - This UI must be rebuilt to fetch from courseOfferings collection

---

## FINAL COLLECTION LIST (19 REQUIRED + 4 OPTIONAL)

### Required Collections (Spark Plan Compatible)

1. **admins** - Admin user profiles
2. **siteSettings** - Global site branding (fixed document: main)
3. **contactSettings** - Global contact info (fixed document: main)
4. **universities** - University/institution master data
5. **courses** - Global course catalog (independent of pricing)
6. **courseOfferings** - **[CRITICAL]** Many-to-many university-course junction
7. **services** - Services offered on website
8. **team** - Team member profiles
9. **testimonials** - Short student testimonials
10. **successStories** - Long-form success stories with media
11. **agents** - Agent/referral partner accounts
12. **referralLinks** - Public referral code metadata
13. **referralVisits** - Append-only visit tracking
14. **whatsappClicks** - Append-only WhatsApp link tracking
15. **students** - Student profile records
16. **applications** - Student application submissions
17. **inquiries** - Contact form submissions
18. **studentStatus** - Current status per student
19. **studentStatusHistory** - Append-only status audit trail

### Optional Collections (Implement if admin dashboard needs them)

20. **courseFolders** - Admin-only course organization
21. **auditLogs** - Admin activity audit trail
22. **roles** - Role definitions (use if implementing granular RBAC)
23. **permissions** - Permission keys (use if implementing granular RBAC)

---

## COLLECTION 1: admins

**Purpose:** Admin user authorization and profiles  
**Document ID Strategy:** `{lowercase-email}`  
**Example ID:** `admin.horizons.test@gmail.com`

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| uid | string | ✅ | "xOlH7JLIAegVHblBngMBF33LdI32" | Firebase Auth UID |
| email | string | ✅ | "admin.horizons.test@gmail.com" | Must match document ID (lowercase) |
| displayName | string | ✅ | "Admin User" | Display name |
| role | string | ✅ | "super_admin" | Enum: "super_admin", "admin", "editor", "support" |
| status | string | ✅ | "active" | Enum: "active", "inactive", "suspended" |
| permissions | array | ❌ | ["manage_all", "manage_admins", ...] | Permission keys |
| createdAt | timestamp | ✅ | server | Auto server timestamp |
| updatedAt | timestamp | ✅ | server | Auto server timestamp |
| lastLoginAt | timestamp | ❌ | server | Last login timestamp |

**Starter Document Required:** YES (First admin must exist before other admins can be created)

**Firestore Rules:**
- Public: ❌ No read/write
- Admin (any): Read own profile, super_admin can manage all
- Rules check: `isAdminUser()` validates role == 'admin' && status == 'active'

---

## COLLECTION 2: siteSettings

**Purpose:** Global site branding, homepage content, public metadata  
**Document ID Strategy:** Fixed document: `main`

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| brandName | string | ✅ | "Horizons" | Site brand name |
| brandTagline | string | ❌ | "Your Global Education Journey" | Tagline |
| logoUrl | string | ❌ | "assets/images/logo.png" | External HTTPS or local asset path |
| darkLogoUrl | string | ❌ | "assets/images/logo-dark.png" | Dark mode logo URL |
| faviconUrl | string | ❌ | "assets/images/favicon.png" | Favicon URL |
| heroTitle | string | ❌ | "Empowering Global Ambitions" | Hero section title |
| heroSubtitle | string | ❌ | "Your Global Education..." | Hero subtitle |
| heroDescription | string | ❌ | "Expert guidance for..." | Hero description |
| heroImageUrl | string | ❌ | "assets/home/hero.jpg" | Hero image URL |
| heroPrimaryCtaText | string | ❌ | "Start Your Application" | Primary CTA button text |
| heroPrimaryCtaUrl | string | ❌ | "pages/apply.html" | Primary CTA link |
| heroSecondaryCtaText | string | ❌ | "Explore Universities" | Secondary CTA text |
| heroSecondaryCtaUrl | string | ❌ | "pages/universities.html" | Secondary CTA link |
| stats | object | ❌ | `{universities: 500, ...}` | Stats display counters |
| defaultLanguage | string | ❌ | "en" | Enum: "en", "ar" |
| supportedLanguages | array | ❌ | ["en", "ar"] | Array of language codes |
| maintenanceMode | boolean | ❌ | false | Maintenance flag |
| active | boolean | ✅ | true | Must be true for public access |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |

**Starter Document Required:** YES

**Firestore Rules:**
- Public: ✅ Read only
- Admin: ✅ Write
- Example: `pages/index.html` reads logoUrl, heroImageUrl, stats from siteSettings/main

---

## COLLECTION 3: contactSettings

**Purpose:** Global contact information and social links  
**Document ID Strategy:** Fixed document: `main`

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| primaryEmail | string | ✅ | "info@horizons.edu" | Main contact email |
| secondaryEmail | string | ❌ | "support@horizons.edu" | Secondary email |
| primaryPhone | string | ❌ | "+60102503706" | Main phone (international format) |
| secondaryPhone | string | ❌ | "+60302503707" | Secondary phone |
| whatsappNumber | string | ✅ | "+60102503706" | **Canonical** WhatsApp number |
| whatsappDefaultMessage | string | ❌ | "Hello Horizons, I..." | Default WhatsApp message template |
| addressLine1 | string | ❌ | "Suite 123, Office Building" | Address line 1 |
| addressLine2 | string | ❌ | "Kuala Lumpur" | Address line 2 |
| city | string | ❌ | "Kuala Lumpur" | City |
| country | string | ❌ | "Malaysia" | Country |
| workingHours | string | ❌ | "Mon-Fri 9AM-5PM" | Working hours text |
| mapUrl | string | ❌ | "https://maps.google.com/..." | Google Maps URL |
| mapEmbedUrl | string | ❌ | "https://www.google.com/maps/embed..." | Maps embed iframe URL |
| socialLinks | object | ❌ | `{facebook: "url", instagram: "url"}` | Social media URLs map |
| active | boolean | ✅ | true | Must be true |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |

**Starter Document Required:** YES

**Migration Note:** Old field `whatsapp` → new `whatsappNumber`. Code reads both for backward compatibility during transition.

**Firestore Rules:**
- Public: ✅ Read only
- Admin: ✅ Write
- Used by: main.js loads WhatsApp number on page load

---

## COLLECTION 4: universities

**Purpose:** Master list of universities/institutions  
**Document ID Strategy:** Slug-based or auto-generated  
**Example ID:** `university-of-malaya` or auto-ID

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| name | string | ✅ | "University of Malaya" | Full university name |
| slug | string | ✅ | "university-of-malaya" | URL-safe slug for detail page |
| shortCode | string | ❌ | "UM" | Short code (e.g., for CSV imports) |
| country | string | ✅ | "Malaysia" | Country name |
| city | string | ❌ | "Kuala Lumpur" | City |
| locationText | string | ❌ | "Kuala Lumpur, Malaysia" | Display-friendly location |
| ranking | number | ❌ | 70 | University ranking number |
| rankingSource | string | ❌ | "QS World University Rankings 2024" | Ranking source name |
| universityType | string | ❌ | "public" | Enum: "public", "private", "branch", "college" |
| logoUrl | string | ❌ | "assets/universities/um-logo.png" | Logo URL |
| campusImageUrl | string | ❌ | "assets/universities/um-campus.jpg" | Campus image URL |
| galleryUrls | array | ❌ | ["url1", "url2"] | Gallery image URLs |
| intro | string | ❌ | "Leading educational institution..." | Short intro |
| about | string | ❌ | "The university is committed to..." | Detailed about text |
| youtubeVideoId | string | ❌ | "dQw4w9WgXcQ" | YouTube video ID (no full URL) |
| websiteUrl | string | ❌ | "https://um.edu.my" | University website URL |
| intakeMonths | array | ❌ | ["February", "September"] | Intake month names |
| nextIntakeDate | timestamp | ❌ | server | Next intake date |
| offerLetterFee | number | ❌ | 500 | Offer letter fee amount |
| offerLetterCurrency | string | ❌ | "USD" | Offer letter fee currency |
| offerLetterFree | boolean | ❌ | false | Whether offer letter is free |
| applicationOpen | boolean | ✅ | true | Can students apply? |
| featured | boolean | ❌ | true | Show on homepage featured |
| active | boolean | ✅ | true | Public visibility |
| order | number | ❌ | 1 | Sort order in listings |
| searchKeywords | array | ❌ | ["malaysia", "kuala lumpur", "engineering"] | Search/filter keywords |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |
| createdBy | string | ❌ | "admin.horizons@gmail.com" | Admin who created |
| updatedBy | string | ❌ | "admin.horizons@gmail.com" | Admin who last updated |

**DO NOT STORE:** nested courseOfferings array (that goes in the courseOfferings collection)

**Firestore Rules:**
- Public: ✅ Read active universities only
- Admin: ✅ Full CRUD
- Indexes: `active + order`, `active + featured`

**Used by:**
- `pages/universities.html` - Lists active universities
- `pages/university-detail.html` - Loads single university, then queries courseOfferings collection

---

## COLLECTION 5: courses

**Purpose:** Global course/program catalog (independent of pricing)  
**Document ID Strategy:** Stable course code or auto-generated  
**Example ID:** `bsc-computer-science` or auto-ID

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| name | string | ✅ | "Bachelor of Computer Science" | Full course name |
| slug | string | ✅ | "bsc-computer-science" | URL-safe slug |
| courseCode | string | ✅ | "BSC-COMP-SCI" | Stable global code (used in CSV imports) |
| level | string | ✅ | "Bachelor" | Enum: "foundation", "diploma", "bachelor", "masters", "phd", "language", "certificate", "professional" |
| category | string | ✅ | "Engineering" | Enum: "IT", "Engineering", "Business", "Medicine", "Arts", "Education", "Law", "Nursing" |
| subcategory | string | ❌ | "Software Engineering" | Sub-category within category |
| description | string | ❌ | "Core computing and software engineering..." | Course description |
| imageUrl | string | ❌ | "assets/courses/computer-science.jpg" | Course image URL |
| defaultDurationMonths | number | ❌ | 36 | Default duration in months (informational only) |
| defaultDurationText | string | ❌ | "3 years" | Display-friendly duration |
| defaultSemesters | number | ❌ | 6 | Default semester count |
| credits | string | ❌ | "120" | Credit points |
| careerPaths | array | ❌ | ["Software Engineer", "Data Analyst", "DevOps"] | Potential career paths |
| requirementsSummary | string | ❌ | "High school diploma with math..." | Eligibility summary |
| active | boolean | ✅ | true | Public visibility |
| featured | boolean | ❌ | true | Featured on homepage |
| order | number | ❌ | 1 | Sort order |
| folderId | string | ❌ | "{courseFolderId}" | Link to courseFolders (admin-only) |
| searchKeywords | array | ❌ | ["computer", "science", "engineering", "programming"] | Search keywords |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |
| createdBy | string | ❌ | "admin.horizons@gmail.com" | Admin who created |
| updatedBy | string | ❌ | "admin.horizons@gmail.com" | Admin who last updated |

**IMPORTANT:** Do NOT store university-specific fees here. Fees belong in courseOfferings.

**Firestore Rules:**
- Public: ✅ Read active courses only
- Admin: ✅ Full CRUD

**Used by:**
- `pages/courses.html` - Lists active courses
- `pages/course-detail.html` - Loads single course, then queries courseOfferings by courseId

---

## COLLECTION 6: courseOfferings [CRITICAL - MANY-TO-MANY JUNCTION]

**Purpose:** First-class many-to-many relationship between universities and courses  
**Document ID Strategy:** `{universitySlug}_{courseCode}_{variant}` (deterministic)  
**Example IDs:**
- `university-of-malaya_bsc-comp-sci_main`
- `taylors_bsc-comp-sci_lakeside`

**WHY THIS IS CRITICAL:**
- One course (BSC-COMP-SCI) offered by 20 universities = 20 courseOfferings documents
- Each offering has its own fees, duration, intake, application status
- Frontend queries: "Show me all offerings for this university" or "Show me all universities offering this course"
- Admin can manage university-specific course details independently

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| **References** | | | | |
| universityId | string | ✅ | "university-of-malaya" | Document ID from universities collection |
| courseId | string | ✅ | "bsc-computer-science" | Document ID from courses collection |
| **Snapshots (for display, not source of truth)** | | | | |
| universityName | string | ✅ | "University of Malaya" | Snapshot - denormalized for display |
| courseName | string | ✅ | "Bachelor of Computer Science" | Snapshot - denormalized |
| courseLevel | string | ❌ | "Bachelor" | Snapshot from courses.level |
| courseCategory | string | ❌ | "Engineering" | Snapshot from courses.category |
| universityCountry | string | ❌ | "Malaysia" | Snapshot from universities.country |
| universityCity | string | ❌ | "Kuala Lumpur" | Snapshot from universities.city |
| **Pricing** | | | | |
| tuitionFee | number | ❌ | 28000 | Total tuition fee for course |
| tuitionCurrency | string | ❌ | "MYR" | Fee currency (ISO 4217) |
| applicationFee | number | ❌ | 500 | Application fee |
| applicationFeeCurrency | string | ❌ | "MYR" | Application fee currency |
| registrationFee | number | ❌ | 300 | Registration fee |
| totalEstimatedFee | number | ❌ | 28800 | Total estimated cost |
| feeNotes | string | ❌ | "Fees may vary for international..." | Fee disclaimer |
| **Duration** | | | | |
| durationMonths | number | ❌ | 36 | Program duration in months |
| durationText | string | ❌ | "3 years" | Display-friendly duration |
| semesters | number | ❌ | 6 | Number of semesters |
| **Intakes** | | | | |
| intakeMonths | array | ❌ | ["February", "September"] | Available intake months |
| nextIntakeDate | timestamp | ❌ | server | Next intake date |
| applicationDeadline | timestamp | ❌ | server | Application deadline |
| **Eligibility** | | | | |
| academicRequirements | string | ❌ | "High school diploma with min 3.0 GPA" | Academic requirements |
| englishRequirements | string | ❌ | "IELTS 6.5 or TOEFL 80" | English proficiency requirements |
| requiredDocuments | array | ❌ | ["passport", "transcript", "recommendation"] | Required document types |
| **Availability** | | | | |
| applicationOpen | boolean | ✅ | true | Can students apply? |
| active | boolean | ✅ | true | Publicly visible |
| featured | boolean | ❌ | true | Featured in listings |
| seatsAvailable | number | ❌ | 50 | Available seats (informational) |
| **Display** | | | | |
| order | number | ❌ | 1 | Sort order in listings |
| notes | string | ❌ | "Popular program, limited seats" | Admin notes |
| searchKeywords | array | ❌ | ["computer", "science", "malaysia"] | Search keywords |
| **CSV Import Tracking** | | | | |
| importBatchId | string | ❌ | "batch_2024_05" | Batch ID for import tracking |
| sourceFileName | string | ❌ | "university-course-offerings-2024.csv" | Source CSV file |
| sourceRowNumber | number | ❌ | 3 | Row number in source CSV |
| **Timestamps** | | | | |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |
| createdBy | string | ❌ | "admin.horizons@gmail.com" | Admin who created |
| updatedBy | string | ❌ | "admin.horizons@gmail.com" | Admin who last updated |

**Firestore Rules:**
- Public: ✅ Read active offerings only
- Admin: ✅ Full CRUD (including imports)
- Indexes: `universityId + active`, `courseId + active`, `applicationOpen + active`, `featured + active`

**Code Changes Required:**
1. `getUniversityWithCourses()` → Query `courseOfferings where universityId == uniId and active == true`
2. `getCourseWithUniversities()` → Query `courseOfferings where courseId == courseId and active == true`
3. `getCoursesWithUniversities()` → Query courseOfferings, group by courseId
4. `university-detail.html` → Remove assumption of nested courses, query courseOfferings instead

---

## COLLECTION 7: services

**Purpose:** Services offered on website  
**Document ID Strategy:** Slug-based or auto-generated

| Field | Type | Required | Example |
|-------|------|----------|---------|
| title | string | ✅ | "Free Educational Counseling" |
| slug | string | ✅ | "free-counseling" |
| shortDescription | string | ❌ | "Expert guidance tailored to your goals" |
| description | string | ❌ | "Our educational counselors provide..." |
| icon | string | ❌ | "bi-chat-dots" | Bootstrap icon class |
| imageUrl | string | ❌ | "assets/services/counseling.jpg" |
| ctaText | string | ❌ | "Get Started" |
| ctaUrl | string | ❌ | "#contact" |
| showOnHome | boolean | ❌ | true |
| active | boolean | ✅ | true |
| order | number | ❌ | 1 |
| createdAt | timestamp | ✅ | server |
| updatedAt | timestamp | ✅ | server |

---

## COLLECTION 8: team

**Purpose:** Team member profiles  
**Document ID Strategy:** Slug-based or auto-generated

| Field | Type | Required | Example | Migration Notes |
|-------|------|----------|---------|-----------------|
| fullName | string | ✅ | "Dr. Ahmad Mokadam" | OLD: `name` → NEW: `fullName` |
| slug | string | ✅ | "dr-ahmad-mokadam" | New field for URL-safe IDs |
| roleTitle | string | ✅ | "Founder & CEO" | OLD: `role` → NEW: `roleTitle` |
| department | string | ❌ | "Leadership" | Optional |
| bio | string | ❌ | "Ahmad is a visionary leader..." | Plain text (no HTML) |
| photoUrl | string | ❌ | "assets/team/ahmad.jpg" | OLD: `photo`, `photoPath`, `image` → NEW: `photoUrl` |
| email | string | ❌ | "ahmad@horizons.edu" | Contact email |
| phone | string | ❌ | "+60102503706" | Contact phone |
| whatsappNumber | string | ❌ | "+60102503706" | OLD: `whatsapp` → NEW: `whatsappNumber` |
| linkedinUrl | string | ❌ | "https://linkedin.com/in/ahmad" | LinkedIn profile |
| languages | array | ❌ | ["English", "Arabic", "Malay"] | Languages spoken |
| specialties | array | ❌ | ["Education", "International Relations"] | Specializations |
| showOnHome | boolean | ❌ | true | Show on homepage |
| showOnTeamPage | boolean | ✅ | true | Show on /team page |
| active | boolean | ✅ | true | Visibility flag |
| order | number | ❌ | 1 | Display order |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |

**Migration:** Read both old and new field names during transition, write only new names.

---

## COLLECTION 9: testimonials

**Purpose:** Short student testimonials/quotes  
**Document ID Strategy:** Slug-based or auto-generated

| Field | Type | Required | Example |
|-------|------|----------|---------|
| studentName | string | ✅ | "Fatima Al-Mansouri" |
| studentPhotoUrl | string | ❌ | "assets/testimonials/fatima.jpg" |
| studentCountry | string | ❌ | "UAE" |
| quote | string | ✅ | "Horizons made my dream of studying in Malaysia a reality!" |
| programName | string | ❌ | "Bachelor of Business Administration" |
| universityName | string | ❌ | "University of Malaya" |
| rating | number | ❌ | 5 | 1-5 star rating |
| featured | boolean | ❌ | true |
| active | boolean | ✅ | true |
| order | number | ❌ | 1 |
| createdAt | timestamp | ✅ | server |
| updatedAt | timestamp | ✅ | server |

---

## COLLECTION 10: successStories

**Purpose:** Long-form success stories and media  
**Document ID Strategy:** Slug-based or auto-generated

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| title | string | ✅ | "From Dream to Reality: Ahmed's Journey to Medicine" | Story title |
| slug | string | ✅ | "ahmed-medicine-story" | URL-safe slug |
| studentName | string | ✅ | "Ahmed Hassan" | Story protagonist |
| studentCountry | string | ❌ | "Egypt" | Student's home country |
| studentPhotoUrl | string | ❌ | "assets/stories/ahmed-photo.jpg" | Student photo |
| universityId | string | ❌ | "university-of-malaya" | Linked university (optional) |
| universityName | string | ❌ | "University of Malaya" | University name snapshot |
| courseId | string | ❌ | "bachelor-medicine" | Linked course (optional) |
| courseName | string | ❌ | "Bachelor of Medicine" | Course name snapshot |
| storySummary | string | ❌ | "Ahmed's journey from application to graduation..." | 1-2 paragraph summary |
| storyContent | string | ❌ | "Full story text here..." | Full story text (plain text, no HTML) |
| mediaType | string | ✅ | "video" | Enum: "image", "video", "youtube", "mixed" |
| coverImageUrl | string | ❌ | "assets/stories/ahmed-cover.jpg" | Story cover image |
| videoUrl | string | ❌ | "https://example.com/video.mp4" | Video file URL |
| youtubeVideoId | string | ❌ | "dQw4w9WgXcQ" | YouTube video ID (no full URL) |
| galleryUrls | array | ❌ | ["img1.jpg", "img2.jpg"] | Gallery image URLs |
| outcomeType | string | ❌ | "visa_approved" | Enum: "admission", "scholarship", "visa_approved", "graduated", "job_placed", "other" |
| scholarshipAmount | number | ❌ | 50000 | Scholarship amount |
| scholarshipCurrency | string | ❌ | "USD" | Scholarship currency |
| featured | boolean | ❌ | true | Featured on homepage |
| active | boolean | ✅ | true | Visibility |
| order | number | ❌ | 1 | Display order |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |

---

## COLLECTION 11: agents

**Purpose:** Agent/influencer/referral partner accounts  
**Document ID Strategy:** Firebase Auth UID

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| uid | string | ✅ | "{firebaseAuthUid}" | Must match document ID |
| email | string | ✅ | "agent@example.com" | Lowercase email |
| displayName | string | ✅ | "Ahmad Agent" | Display name |
| phone | string | ❌ | "+60102503706" | Agent phone |
| whatsappNumber | string | ❌ | "+60102503706" | Agent WhatsApp |
| country | string | ❌ | "Malaysia" | Agent location |
| city | string | ❌ | "Kuala Lumpur" | Agent city |
| role | string | ✅ | "agent" | Always "agent" |
| status | string | ✅ | "active" | Enum: "active", "inactive", "suspended", "pending" |
| referralCode | string | ✅ | "AHMAD2026" | Human-readable referral code |
| referralLinkId | string | ❌ | "AHMAD2026" | Usually same as referralCode |
| commissionType | string | ❌ | "percentage" | Enum: "percentage", "fixed", "manual", "none" |
| commissionValue | number | ❌ | 15 | Commission amount or percentage |
| commissionCurrency | string | ❌ | "MYR" | Commission currency (if fixed) |
| commissionNotes | string | ❌ | "15% of application fee" | Commission description |
| permissions | array | ❌ | ["view_own_referrals", "view_own_students"] | Agent permissions |
| notes | string | ❌ | "High performer, eligible for bonus" | Admin-only notes |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |
| createdBy | string | ❌ | "admin.horizons@gmail.com" | Admin who created |
| lastLoginAt | timestamp | ❌ | server | Last login |

**IMPORTANT:** This collection is **NOT PUBLIC-READABLE**. Public code must use referralLinks for validation, not agents.

**Firestore Rules:**
- Public: ❌ No read
- Admin: ✅ Full CRUD
- Agent: ✅ Read own document only

---

## COLLECTION 12: referralLinks

**Purpose:** Public-safe referral code metadata  
**Document ID Strategy:** Referral code

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| code | string | ✅ | "AHMAD2026" | Must match document ID |
| agentId | string | ✅ | "{firebaseAuthUid}" | Agent UID from agents collection |
| agentDisplayName | string | ❌ | "Ahmad Agent" | Public-safe agent display name only |
| status | string | ✅ | "active" | Enum: "active", "inactive", "expired" |
| fullUrl | string | ✅ | "https://horizons-cee8d.web.app/?ref=AHMAD2026" | Full shareable URL |
| landingPagePath | string | ❌ | "index.html" | Landing page path (relative) |
| totalVisits | number | ❌ | 42 | Optional denormalized visit counter |
| totalApplications | number | ❌ | 5 | Optional denormalized application counter |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |
| createdBy | string | ❌ | "admin.horizons@gmail.com" | Admin who created |
| expiresAt | timestamp | ❌ | server | Expiration date |

**Important:** Do NOT expose:
- agent.email
- agent.phone
- agent.commission
- agent.notes
- agent.permissions

**Firestore Rules:**
- Public: ✅ Read active referralLinks only (for code validation)
- Admin: ✅ Full CRUD
- Agent: ✅ Read own referral link only

---

## COLLECTION 13: referralVisits

**Purpose:** Append-only tracking of referral visits  
**Document ID Strategy:** Auto-generated

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| referralCode | string | ✅ | "AHMAD2026" | Referral code from URL |
| referralLinkId | string | ✅ | "AHMAD2026" | Link to referralLinks/{code} |
| agentId | string | ✅ | "{firebaseAuthUid}" | Agent UID |
| pagePath | string | ✅ | "/pages/universities.html" | Page visited |
| landingUrl | string | ❌ | "https://horizons...?ref=AHMAD2026" | Full landing URL |
| referrerUrl | string | ❌ | "https://..." | HTTP referrer |
| sessionId | string | ❌ | "sess_abc123" | Anonymous session ID |
| visitorId | string | ❌ | "vis_xyz789" | Anonymous visitor ID (localStorage) |
| userAgentSummary | string | ❌ | "Chrome/125 Windows 10" | User agent summary (not full) |
| deviceType | string | ❌ | "mobile" | Enum: "desktop", "mobile", "tablet", "unknown" |
| createdAt | timestamp | ✅ | server | Auto |

**Firestore Rules:**
- Public: ✅ Create only
- Admin: ✅ Read
- Agent: ✅ Read own agent's visits only
- Public: ❌ Update/delete

---

## COLLECTION 14: whatsappClicks

**Purpose:** Track WhatsApp CTA clicks for analytics  
**Document ID Strategy:** Auto-generated

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| targetNumber | string | ✅ | "+60102503706" | WhatsApp number clicked |
| targetType | string | ✅ | "global" | Enum: "global", "team_member", "agent", "service", "university", "application" |
| targetId | string | ❌ | "{documentId}" | ID of the source (team member ID, service ID, etc.) |
| pagePath | string | ✅ | "/pages/team.html" | Page where click occurred |
| referralCode | string | ❌ | "AHMAD2026" | If clicked via referral link |
| referralLinkId | string | ❌ | "AHMAD2026" | Link to referralLinks/{code} |
| agentId | string | ❌ | "{firebaseAuthUid}" | If attributed to an agent |
| sessionId | string | ❌ | "sess_abc123" | Anonymous session ID |
| visitorId | string | ❌ | "vis_xyz789" | Anonymous visitor ID |
| createdAt | timestamp | ✅ | server | Auto |

**Firestore Rules:**
- Public: ✅ Create only
- Admin: ✅ Read
- Agent: ✅ Read own agent's clicks only
- Public: ❌ Update/delete

---

## COLLECTION 15: students

**Purpose:** Student profile/person record  
**Document ID Strategy:** Auto-generated (consider email deduplication)

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| fullName | string | ✅ | "Fatima Al-Mansouri" | Full name |
| email | string | ✅ | "fatima@example.com" | Primary email |
| emailLower | string | ✅ | "fatima@example.com" | Lowercase for deduplication queries |
| phone | string | ❌ | "0102503706" | Phone without country code |
| phoneCode | string | ❌ | "+971" | Country phone code |
| whatsappNumber | string | ❌ | "+971102503706" | Full WhatsApp number |
| nationality | string | ❌ | "UAE" | Nationality |
| countryOfResidence | string | ❌ | "UAE" | Country of residence |
| city | string | ❌ | "Dubai" | City of residence |
| dateOfBirth | timestamp | ❌ | server | Date of birth |
| gender | string | ❌ | "Female" | Only if form collects it |
| preferredLanguage | string | ❌ | "en" | Enum: "en", "ar", "other" |
| agentId | string | ❌ | "{firebaseAuthUid}" | Assigned agent (from first referral) |
| referralCode | string | ❌ | "AHMAD2026" | First referral code |
| attributionModel | string | ❌ | "first_touch" | Enum: "first_touch", "last_touch", "manual", "none" |
| firstReferralCode | string | ❌ | "AHMAD2026" | First referral that brought student |
| firstReferralAt | timestamp | ❌ | server | First referral timestamp |
| lastReferralCode | string | ❌ | "AHMAD2026" | Last referral code used |
| lastReferralAt | timestamp | ❌ | server | Last referral timestamp |
| latestApplicationId | string | ❌ | "{appId}" | Most recent application |
| latestStatus | string | ❌ | "in_review" | Latest application status |
| applicationCount | number | ❌ | 3 | Total applications submitted |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |
| createdFrom | string | ❌ | "application_form" | Enum: "application_form", "admin", "import", "agent" |

**Important:** Do NOT duplicate full application data here. Student is identity only.

**Firestore Rules:**
- Public: ✅ Create during application
- Admin: ✅ Full CRUD
- Agent: ✅ Read assigned students only
- Student: ⚠️ Future own-read (if student auth implemented)

---

## COLLECTION 16: applications

**Purpose:** Student application submission (transactional record)  
**Document ID Strategy:** Auto-generated

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| **Student Reference** | | | | |
| studentId | string | ✅ | "{docId}" | Link to students/{id} |
| **Course Reference** | | | | |
| universityId | string | ✅ | "university-of-malaya" | Link to universities/{id} |
| courseId | string | ✅ | "bsc-computer-science" | Link to courses/{id} |
| courseOfferingId | string | ✅ | "university-of-malaya_bsc-comp-sci_main" | Link to courseOfferings/{id} |
| **Snapshots (for display)** | | | | |
| studentName | string | ✅ | "Fatima Al-Mansouri" | Denormalized for display |
| studentEmail | string | ✅ | "fatima@example.com" | Denormalized |
| universityName | string | ✅ | "University of Malaya" | Denormalized |
| courseName | string | ✅ | "Bachelor of Computer Science" | Denormalized |
| courseLevel | string | ❌ | "Bachelor" | Denormalized from courses.level |
| courseOfferingLabel | string | ❌ | "UM - BSC Comp Sci" | Display label |
| **Guardian Info** | | | | |
| guardian | object | ❌ | {...} | Embedded guardian data (see below) |
| **Application Data** | | | | |
| intakeMonth | string | ❌ | "September" | Preferred intake month |
| intakeYear | number | ❌ | 2024 | Preferred intake year |
| preferredStartDate | timestamp | ❌ | server | Preferred start date |
| studyLevel | string | ❌ | "Bachelor" | Desired study level |
| notesFromStudent | string | ❌ | "I am interested in scholarship..." | Student notes |
| **Documents** | | | | |
| documents | object | ❌ | {...} | See below - Spark: all null |
| **Status** | | | | |
| status | string | ✅ | "new" | Enum: "new", "submitted", "in_review", "missing_documents", "sent_to_university", "offer_received", "offer_rejected", "visa_stage", "enrolled", "rejected", "cancelled" |
| **Referral** | | | | |
| referralCode | string | ❌ | "AHMAD2026" | Referral code used |
| referralLinkId | string | ❌ | "AHMAD2026" | Link to referralLinks/{code} |
| agentId | string | ❌ | "{firebaseAuthUid}" | Assigned agent |
| attributionModel | string | ❌ | "first_touch" | Attribution model |
| **Admin** | | | | |
| assignedAdminId | string | ❌ | "admin.horizons@gmail.com" | Assigned admin |
| internalNotes | string | ❌ | "Follow up on missing documents" | Admin notes (not visible to student) |
| **Timestamps** | | | | |
| submittedAt | timestamp | ✅ | server | Application submission time |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |

**Guardian Object Structure:**
```javascript
{
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "phoneCode": "string",
  "relationship": "string",  // "Parent", "Guardian", "Relative"
  "country": "string"
}
```

**Documents Object Structure (Spark Plan - all null):**
```javascript
{
  "passportUrl": null,
  "transcriptUrl": null,
  "photoUrl": null,
  "additionalUrls": []
}
```

**Firestore Rules:**
- Public: ✅ Create only
- Admin: ✅ Full read/update
- Agent: ✅ Read where agentId == own uid
- Public: ❌ Read/update existing

---

## COLLECTION 17: inquiries

**Purpose:** Contact form submissions  
**Document ID Strategy:** Auto-generated

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| fullName | string | ✅ | "Ali Al-Sulaimi" | Inquiry name |
| email | string | ✅ | "ali@example.com" | Inquiry email |
| phone | string | ❌ | "0102503706" | Phone (optional) |
| country | string | ❌ | "Kuwait" | Country |
| interest | string | ❌ | "Engineering" | Area of interest |
| subject | string | ❌ | "Course Information" | Subject |
| message | string | ✅ | "I would like to know more about..." | Message text |
| referralCode | string | ❌ | "AHMAD2026" | If referred |
| referralLinkId | string | ❌ | "AHMAD2026" | Link to referralLinks/{code} |
| agentId | string | ❌ | "{firebaseAuthUid}" | Agent (if referred) |
| status | string | ✅ | "new" | Enum: "new", "reviewed", "contacted", "resolved", "spam", "archived" |
| assignedAdminId | string | ❌ | "admin.horizons@gmail.com" | Assigned admin |
| internalNotes | string | ❌ | "Called on May 23" | Admin notes |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |

**Firestore Rules:**
- Public: ✅ Create only
- Admin: ✅ Full read/update/delete
- Agent: ✅ Read if agentId == own uid (optional)
- Public: ❌ Read/update existing

---

## COLLECTION 18: studentStatus

**Purpose:** Operational status tracking (separate from applications)  
**Document ID Strategy:** Deterministic: `{applicationId}`

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| **References** | | | | |
| studentId | string | ✅ | "{docId}" | Link to students/{id} |
| applicationId | string | ✅ | "{docId}" | Link to applications/{id} (use as doc ID) |
| universityId | string | ✅ | "university-of-malaya" | Link to universities/{id} |
| courseId | string | ✅ | "bsc-computer-science" | Link to courses/{id} |
| courseOfferingId | string | ✅ | "university-of-malaya_bsc-comp-sci_main" | Link to courseOfferings/{id} |
| agentId | string | ❌ | "{firebaseAuthUid}" | Agent (if any) |
| referralCode | string | ❌ | "AHMAD2026" | Referral code |
| **Current Status** | | | | |
| currentStage | string | ✅ | "documents_review" | Enum: "lead", "application_submitted", "documents_review", "documents_missing", "university_submission", "offer_waiting", "offer_received", "payment_pending", "visa_preparation", "visa_submitted", "visa_approved", "travel_preparation", "enrolled", "commission_pending", "commission_paid", "closed_lost", "cancelled" |
| currentStatusLabel | string | ❌ | "Documents Under Review" | Human-friendly status label |
| priority | string | ❌ | "high" | Enum: "low", "normal", "high", "urgent" |
| nextAction | string | ❌ | "Send missing transcripts" | Next required action |
| nextActionDueAt | timestamp | ❌ | server | Due date for next action |
| assignedAdminId | string | ❌ | "admin.horizons@gmail.com" | Admin handling |
| lastUpdatedBy | string | ❌ | "admin.horizons@gmail.com" | Who last updated |
| lastUpdatedByRole | string | ❌ | "admin" | Enum: "admin", "agent", "system" |
| notes | string | ❌ | "Waiting for university response" | Status notes |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |
| lastStatusChangeAt | timestamp | ❌ | server | Last status change time |

**Firestore Rules:**
- Admin: ✅ Full CRUD
- Agent: ✅ Read assigned records
- Public: ❌ No access

---

## COLLECTION 19: studentStatusHistory

**Purpose:** Append-only audit trail for status changes  
**Document ID Strategy:** Auto-generated

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| studentStatusId | string | ✅ | "{docId}" | Link to studentStatus/{id} |
| studentId | string | ✅ | "{docId}" | Link to students/{id} |
| applicationId | string | ✅ | "{docId}" | Link to applications/{id} |
| previousStage | string | ❌ | "application_submitted" | Previous status |
| newStage | string | ✅ | "documents_review" | New status |
| previousStatusLabel | string | ❌ | "Application Submitted" | Human-friendly previous |
| newStatusLabel | string | ❌ | "Documents Under Review" | Human-friendly new |
| changedBy | string | ✅ | "admin.horizons@gmail.com" | UID or email who changed |
| changedByRole | string | ✅ | "admin" | Enum: "admin", "agent", "system" |
| changeReason | string | ❌ | "Transcripts received from university" | Why the change |
| notes | string | ❌ | "High priority case" | Additional notes |
| createdAt | timestamp | ✅ | server | Auto |

**Important:** Append-only. No update/delete allowed.

**Firestore Rules:**
- Admin: ✅ Read/create
- Agent: ✅ Read own
- Public: ❌ No access
- Update/delete: ❌ Never allowed

---

## OPTIONAL COLLECTION 20: courseFolders

**Purpose:** Admin-only organization of courses  
**Document ID Strategy:** Auto-generated or slug

| Field | Type | Required | Example |
|-------|------|----------|---------|
| name | string | ✅ | "Engineering Programs" |
| slug | string | ✅ | "engineering-programs" |
| description | string | ❌ | "Bachelor and Master programs in engineering" |
| parentFolderId | string | ❌ | "{parentId}" | Nested folder support |
| order | number | ❌ | 1 | Sort order |
| active | boolean | ✅ | true | Visibility |
| createdAt | timestamp | ✅ | server | Auto |
| updatedAt | timestamp | ✅ | server | Auto |

---

## OPTIONAL COLLECTION 21: auditLogs

**Purpose:** Admin activity audit trail  
**Document ID Strategy:** Auto-generated

| Field | Type | Required | Example |
|-------|------|----------|---------|
| actorId | string | ✅ | "admin.horizons@gmail.com" |
| actorEmail | string | ❌ | "admin.horizons@gmail.com" |
| actorRole | string | ✅ | "admin" |
| action | string | ✅ | "update" |
| collectionName | string | ❌ | "universities" |
| documentId | string | ❌ | "university-of-malaya" |
| before | object | ❌ | {...} | Previous field values |
| after | object | ❌ | {...} | New field values |
| changedFields | array | ❌ | ["name", "active"] | Which fields changed |
| message | string | ❌ | "Updated university name" | Description |
| createdAt | timestamp | ✅ | server | Auto |

**Important:** Frontend-created logs are not tamper-proof. For security-critical actions, require Cloud Functions (Blaze plan).

---

## FIRESTORE RULES ALIGNMENT

Current rules file already has correct structure for all public collections. However, **agents and referralLinks need clarification:**

**agents:** NOT public-readable. Public must use referralLinks.

```javascript
match /agents/{agentId} {
  allow read: if isAdminUser() || 
               (isAuthenticated() && 
                resource.data.uid == request.auth.uid);  // Only own
  allow create, delete: if isAdminUser();
  allow update: if isAdminUser() || 
                 (isAuthenticated() && 
                  resource.data.uid == request.auth.uid && 
                  request.resource.data.email == resource.data.email);  // Limited fields
}
```

**referralLinks:** Public-readable for validation only.

```javascript
match /referralLinks/{code} {
  allow read: if true;  // Public validation
  allow create, update, delete: if isAdminUser();
}
```

---

## REQUIRED CODE CHANGES

### Priority 1: Critical (Breaks Current Code)

1. **firebase-config.js - getUniversityWithCourses()**
   - OLD: Reads `university.courseOfferings` array
   - NEW: Query `courseOfferings where universityId == uniId and active == true`
   - Impact: `university-detail.html` loading

2. **firebase-config.js - getCourseWithUniversities()**
   - OLD: Reads `university.courseOfferings` array
   - NEW: Query `courseOfferings where courseId == courseId and active == true`
   - Impact: `course-detail.html` loading

3. **firebase-config.js - getCoursesWithUniversities()**
   - OLD: Reads `university.courseOfferings` array
   - NEW: Query `courseOfferings where active == true`, group by courseId
   - Impact: `courses.html` loading

4. **pages/university-detail.html**
   - OLD: Assumes `uni.courseOfferings` and `uni.courses` arrays
   - NEW: After loading university, query courseOfferings and join with courses
   - Line 471: `(uni.courseOfferings || []).forEach()` → Query courseOfferings collection

### Priority 2: Important (Admin Dashboard)

5. **admin.js - Course Management Section**
   - Add separate courseOfferings admin interface
   - Import CSV into courseOfferings (not universities)
   - Cannot store courseOfferings inside universities

6. **admin.js - University Management Section**
   - Remove nested courseOfferings editor
   - Link to courseOfferings section for managing courses per university

### Priority 3: Migration

7. **Migration Script (one-time)**
   - Read old universities with nested courseOfferings
   - For each offering, create courseOfferings document
   - Remove courseOfferings array from universities
   - Update snapshot fields in new courseOfferings

---

## MANUAL FIREBASE CONSOLE SETUP ORDER

### Phase 1: Create Auth Users
1. Create first admin in Firebase Console
2. Copy UID for admins/{email} document

### Phase 2: Create Required Starter Documents
1. admins/{admin.email}
2. siteSettings/main
3. contactSettings/main

### Phase 3: Create Empty Content Collections
1. universities (admin fills via dashboard)
2. courses (admin fills or imports)
3. courseOfferings (admin imports or creates)
4. services
5. team
6. testimonials
7. successStories

### Phase 4: Let Forms Auto-Create
1. inquiries (contact form)
2. students (application form)
3. applications (application form)
4. studentStatus (admin dashboard)
5. referralVisits (page tracking)
6. whatsappClicks (link tracking)

### Phase 5: Agents (if used)
1. Create agent Auth users in Firebase Console
2. Create agents/{uid} documents
3. Create referralLinks/{code} documents

---

## EXAMPLE STARTER DOCUMENTS

### admins/admin.horizons.test@gmail.com
```json
{
  "uid": "xOlH7JLIAegVHblBngMBF33LdI32",
  "email": "admin.horizons.test@gmail.com",
  "displayName": "Horizons Admin",
  "role": "super_admin",
  "status": "active",
  "permissions": ["manage_all"],
  "createdAt": "2026-05-22T00:00:00Z",
  "updatedAt": "2026-05-22T00:00:00Z"
}
```

### siteSettings/main
```json
{
  "brandName": "Horizons",
  "brandTagline": "Your Global Education Journey Starts Here",
  "logoUrl": "assets/images/logo.png",
  "darkLogoUrl": "assets/images/logo-dark.png",
  "faviconUrl": "assets/images/favicon.png",
  "heroTitle": "Empowering Global Ambitions",
  "heroSubtitle": "Your Global Education Journey Starts Here",
  "heroDescription": "Expert guidance for students seeking international education.",
  "heroImageUrl": "assets/home/hero.jpg",
  "heroPrimaryCtaText": "Start Your Application",
  "heroPrimaryCtaUrl": "pages/apply.html",
  "heroSecondaryCtaText": "Explore Universities",
  "heroSecondaryCtaUrl": "pages/universities.html",
  "stats": {
    "universities": 500,
    "studentsPlaced": 10000,
    "visaSuccessRate": 98,
    "countries": 40
  },
  "defaultLanguage": "en",
  "supportedLanguages": ["en", "ar"],
  "maintenanceMode": false,
  "active": true,
  "createdAt": "2026-05-22T00:00:00Z",
  "updatedAt": "2026-05-22T00:00:00Z"
}
```

### contactSettings/main
```json
{
  "primaryEmail": "info@horizons.edu",
  "secondaryEmail": "",
  "primaryPhone": "+60102503706",
  "secondaryPhone": "",
  "whatsappNumber": "+60102503706",
  "whatsappDefaultMessage": "Hello Horizons, I would like to ask about studying abroad.",
  "addressLine1": "Kuala Lumpur",
  "addressLine2": "",
  "city": "Kuala Lumpur",
  "country": "Malaysia",
  "workingHours": "Monday - Friday, 9:00 AM - 5:00 PM",
  "mapUrl": "",
  "mapEmbedUrl": "",
  "socialLinks": {
    "facebook": "",
    "instagram": "",
    "linkedin": "",
    "tiktok": "",
    "youtube": ""
  },
  "active": true,
  "createdAt": "2026-05-22T00:00:00Z",
  "updatedAt": "2026-05-22T00:00:00Z"
}
```

---

## CRITICAL IMPLEMENTATION CHECKLIST

**Before going live:**

- [ ] courseOfferings created as first-class collection with universityId + courseId references
- [ ] Removed courseOfferings nested arrays from universities documents
- [ ] Updated getUniversityWithCourses() to query courseOfferings
- [ ] Updated getCourseWithUniversities() to query courseOfferings
- [ ] Updated getCoursesWithUniversities() to query courseOfferings
- [ ] Updated university-detail.html to query courseOfferings collection
- [ ] Updated course-detail.html to query courseOfferings collection
- [ ] All old courseOfferings migrated to new structure
- [ ] Admin dashboard can manage courseOfferings separately
- [ ] CSV import writes to courseOfferings (not universities)
- [ ] Firestore rules allow agent-specific data access
- [ ] referralLinks collection public-readable for code validation only
- [ ] agents collection NOT public-readable
- [ ] All snapshot fields in courseOfferings documents denormalized
- [ ] Student/application data structure matches spec
- [ ] Referral tracking implemented in apply.js
- [ ] WhatsApp click tracking implemented
- [ ] Form field names match schema (email, whatsappNumber, etc.)
- [ ] Legacy field migration path documented
- [ ] Test: Load university detail page
- [ ] Test: Load course detail page
- [ ] Test: Search courses across all universities
- [ ] Test: Apply form submission creates student + application + studentStatus
- [ ] Test: Referral tracking works
- [ ] Test: Admin can manage courseOfferings
- [ ] Test: Firestore rules block unauthorized access

---

## FINAL SUMMARY

**What was wrong with the previous schema:**
1. courseOfferings stored as nested arrays inside universities (breaks many-to-many model)
2. Functions hardcoded to expect this wrong structure
3. No clear separation between global course data and university-specific offerings

**What this schema implements:**
1. courseOfferings as a **first-class collection** with proper references
2. All 19 required collections documented with complete field specs
3. Proper Firestore rules alignment for security
4. Clear authorization model (public, admin, agent access levels)
5. Field names consistent across collections
6. Migration path from old nested structure

**Critical code changes needed:**
1. Refactor 3 main data-loading functions in firebase-config.js
2. Update university-detail.html and course-detail.html
3. Rewrite courseOfferings admin dashboard section
4. Migrate existing courseOfferings from nested to first-class collection

**This schema is now production-ready** pending the code implementation changes listed above.

