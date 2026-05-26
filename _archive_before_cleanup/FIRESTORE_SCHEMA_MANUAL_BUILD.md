# HORIZONS Firestore Manual Database Schema Build Guide

**Platform:** Firebase Spark Plan (No Cloud Functions, No Storage)  
**Date:** May 22, 2026  
**Target:** Complete manual Firestore setup in Firebase Console  
**Status:** Production-Ready Schema

---

## CRITICAL SPARK PLAN NOTES

**All image/file fields store EXTERNAL HTTPS URLs only, not Firebase Storage paths.**

Example:
```
❌ WRONG (Spark): /brand/logo/file.png (Firebase Storage path)
❌ WRONG (Spark): gs://horizons-cee8d.firebasestorage.app/logo.png
✅ RIGHT (Spark): https://example.com/path/to/logo.png or assets/images/logo.png
```

**Passwords:** Never stored in Firestore. Firebase Auth only.

**Admin/Agent Creation:** Manual in Firebase Console, then Firestore profile created via admin dashboard.

---

# COMPLETE COLLECTION SCHEMAS

---

## COLLECTION 1: admins

**Purpose:** Admin user accounts and authorization.  
**Firestore Rule:** Only admins can read/write. Document ID is lowercase email.  
**Manual Creation Required:** Yes - first admin before first login.

**Document ID Strategy:** Email-based (lowercase)

**Required Starter Document:**
- Email: `admin.horizons.test@gmail.com`
- UID: `xOlH7JLIAegVHblBngMBF33LdI32`

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| uid | string | YES | xOlH7JLIAegVHblBngMBF33LdI32 | Firebase Auth UID |
| email | string | YES | admin.horizons.test@gmail.com | Lowercase, matches doc ID |
| name | string | YES | Admin | Display name |
| role | string | YES | "admin" | MUST be "admin" for isAdminUser() to work |
| status | string | YES | "active" | Must be "active", or authorization fails |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Set automatically by Firestore helper |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Set automatically on updates |
| permissions | array | NO | [...] | Optional: list of permission strings |
| authUserCreated | boolean | NO | true | Metadata: whether Auth user was created |

**Security:** Admin-only read/write. Firestore rules check role='admin' AND status='active'.

**Public Site Behavior:** Not visible.

**Admin Dashboard:** Admins can create additional admin profiles by providing Firebase UID (from Firebase Console). They cannot set custom claims or change passwords via dashboard.

**Example Document:**
```json
{
  "uid": "xOlH7JLIAegVHblBngMBF33LdI32",
  "email": "admin.horizons.test@gmail.com",
  "name": "Admin",
  "role": "admin",
  "status": "active",
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200},
  "permissions": ["manage_courses", "manage_universities", "manage_team", "manage_testimonials", "manage_services", "manage_agents", "manage_students", "view_analytics", "manage_contact_settings", "view_audit_logs"],
  "authUserCreated": true
}
```

**Manual Firebase Console Steps:**
1. Go to **Authentication** → Create user with email/password
2. Copy the UID
3. Go to **Firestore** → **admins** collection → Document ID: `admin.horizons.test@gmail.com`
4. Add the fields above

---

## COLLECTION 2: siteSettings

**Purpose:** Global website branding (logo, hero image).  
**Firestore Rule:** Public read, admin write.  
**Manual Creation Required:** Optional but recommended (migration script creates it).

**Document ID Strategy:** Fixed document ID: `main`

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| logoUrl | string | NO | https://example.com/logo.png | External HTTPS URL only (NOT Firebase Storage path) |
| heroImageUrl | string | NO | https://example.com/hero.jpg | External HTTPS URL only |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Public read, admin-only write.

**Public Site Behavior:** Homepage displays logoUrl in navbar and heroImageUrl as hero section background.

**Admin Dashboard:** Admin can update logo/hero via Settings section. Fields accept external HTTPS URLs.

**Example Document:**
```json
{
  "logoUrl": "https://example.com/horizons-logo.png",
  "heroImageUrl": "https://example.com/horizons-hero-bg.jpg",
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200}
}
```

**Manual Firebase Console Steps:**
1. **Firestore** → **+ Create Collection** → Name: `siteSettings`
2. Document ID: `main`
3. Add fields with external URLs

---

## COLLECTION 3: contactSettings

**Purpose:** Global contact information displayed on website.  
**Firestore Rule:** Public read, admin write.  
**Manual Creation Required:** Optional but recommended.

**Document ID Strategy:** Fixed document ID: `main`

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| whatsappNumber | string | NO | +60102503706 | E.164 format or local format. Used for WhatsApp widget |
| whatsapp | string | NO | +60102503706 | Legacy field name (support both) |
| email | string | NO | info@horizons.edu | Contact email |
| phone | string | NO | +60312345678 | Office phone |
| address | string | NO | Kuala Lumpur, Malaysia | Office address |
| workingHours | string | NO | Mon-Fri 9am-5pm | Display text |
| mapLink | string | NO | https://maps.google.com/... | Google Maps embed URL |
| socialMedia | object | NO | {linkedin: "url", facebook: "url"} | Social media links |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Public read, admin-only write.

**Public Site Behavior:** Contact page displays all fields. WhatsApp widget uses whatsappNumber or whatsapp field.

**Admin Dashboard:** Contact Settings section allows editing all fields.

**Example Document:**
```json
{
  "whatsappNumber": "+60102503706",
  "email": "info@horizons.edu",
  "phone": "+60312345678",
  "address": "Kuala Lumpur, Malaysia",
  "workingHours": "Monday - Friday, 9:00 AM - 5:00 PM",
  "mapLink": "https://www.google.com/maps/embed?pb=...",
  "socialMedia": {
    "linkedin": "https://linkedin.com/company/horizons",
    "facebook": "https://facebook.com/horizons"
  },
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 4: universities

**Purpose:** List of universities displayed on public website.  
**Firestore Rule:** Public read, admin write.  
**Manual Creation Required:** No (admin creates via dashboard).

**Document ID Strategy:** Auto-generated by Firestore

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| name | string | YES | University of Malaya | Display name |
| shortCode | string | YES | UM | 2-10 char code used in forms |
| order | number | NO | 1 | Sort order on public listing |
| location | string | NO | Kuala Lumpur | City or campus location |
| ranking | number | NO | 65 | QS World Ranking (or similar) |
| active | boolean | YES | true | Visibility control |
| intro | string | NO | Brief intro text | Short description for header |
| aboutContent | string | NO | Full HTML description | Detailed about page, can include HTML tags |
| logo | string | NO | assets/universities/um_logo.png | External HTTPS URL or asset path |
| campusImage | string | NO | assets/universities/um_campus.jpg | External HTTPS URL or asset path |
| youtubeId | string | NO | dQw4w9WgXcQ | YouTube video ID (not full URL) |
| accommodation | string | NO | Petaling+Jaya | Search term for accommodation (URL-encoded) |
| nextIntake | timestamp | NO | 2026-09-01T00:00:00Z | Countdown timer on listing |
| intakeMonths | array | NO | ["September", "February"] | Array of month strings |
| offerLetterFree | boolean | NO | true | Whether offer letter is free |
| courseOfferings | array | YES | [...] | Array of course offering objects (see below) |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**courseOfferings Array Structure (nested):**
```
Each object in courseOfferings array:
{
  "courseId": "docId_or_global_id",
  "courseGlobalId": "BSC-COMP-SCI",  // Optional: global course code for mapping
  "courseName": "Computer Science",
  "level": "Bachelor",
  "fees": 30000,
  "currency": "MYR",
  "durationYears": 3,
  "semesters": 6,
  "intake": ["September", "February"]
}
```

**Security:** Public read, admin-only write.

**Public Site Behavior:**
- Universities listing page reads all active universities
- University detail page displays name, intro, aboutContent, logo, campusImage, youtubeId
- Intake countdown shows on listing if nextIntake is set
- Courses offered are merged with course master data by courseId or courseGlobalId

**Admin Dashboard:** Universities section allows CRUD. Courses can be added via course picker or CSV import.

**Example Document:**
```json
{
  "name": "University of Malaya",
  "shortCode": "UM",
  "order": 1,
  "location": "Kuala Lumpur",
  "ranking": 65,
  "active": true,
  "intro": "Malaysia's premier research university",
  "aboutContent": "<p>Founded in 1905...</p>",
  "logo": "assets/universities/um_logo.png",
  "campusImage": "assets/universities/um_campus.jpg",
  "youtubeId": "dQw4w9WgXcQ",
  "accommodation": "Petaling+Jaya",
  "nextIntake": {"_seconds": 1756819200},
  "intakeMonths": ["September", "February"],
  "offerLetterFree": true,
  "courseOfferings": [
    {
      "courseId": "doc-id-123",
      "courseGlobalId": "BSC-COMP-SCI",
      "courseName": "Computer Science",
      "level": "Bachelor",
      "fees": 30000,
      "currency": "MYR",
      "durationYears": 3,
      "semesters": 6,
      "intake": ["September", "February"]
    }
  ],
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 5: courses

**Purpose:** Master list of courses that universities can offer.  
**Firestore Rule:** Public read, admin write.  
**Manual Creation Required:** No (admin imports or creates via dashboard).

**Document ID Strategy:** Auto-generated by Firestore

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| name | string | YES | Computer Science | Course name |
| courseId | string | YES | BSC-COMP-SCI | Global unique identifier for CSV mapping |
| level | string | YES | Bachelor | Foundation, Diploma, Bachelor, Masters, PhD |
| category | string | NO | IT | Category for filtering (IT, Engineering, Business, etc.) |
| basePrice | number | NO | 25000 | Base tuition fee |
| baseCurrency | string | NO | MYR | Default currency (MYR, USD, GBP, etc.) |
| baseDurationYears | number | NO | 3 | Base duration in years |
| duration | string | NO | 3 years | Display label |
| totalSemesters | number | NO | 6 | Total semesters |
| credits | string | NO | 120 credits | Credit hours |
| image | string | NO | assets/courses/computer-science.jpg | External HTTPS URL or asset path |
| description | string | NO | Study core computing... | Course description |
| folderId | string | NO | folder-doc-id | Reference to courseFolders collection (for admin organization) |
| active | boolean | NO | true | Whether visible on public listings |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Public read, admin-only write.

**Public Site Behavior:**
- Courses directory lists all active courses
- Course detail page displays name, level, description, image
- Universities can override fees, duration, semesters, intake on a per-university basis via courseOfferings

**Admin Dashboard:** Courses section allows CRUD. Can organize courses into folders. CSV import creates/updates courses in bulk.

**Example Document:**
```json
{
  "name": "Bachelor of Computer Science",
  "courseId": "BSC-COMP-SCI",
  "level": "Bachelor",
  "category": "IT",
  "basePrice": 30000,
  "baseCurrency": "MYR",
  "baseDurationYears": 3,
  "duration": "3 years",
  "totalSemesters": 6,
  "credits": "120 credits",
  "image": "assets/courses/computer-science.jpg",
  "description": "Study core computing and software engineering fundamentals...",
  "folderId": "folder-123",
  "active": true,
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 6: courseFolders

**Purpose:** Organizational folders for grouping courses in admin dashboard.  
**Firestore Rule:** Public read, admin write.  
**Manual Creation Required:** No.

**Document ID Strategy:** Auto-generated by Firestore

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| name | string | YES | Engineering Programs | Folder display name |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Public read, admin-only write.

**Example Document:**
```json
{
  "name": "Engineering Programs",
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 7: team

**Purpose:** Team member profiles displayed on public website.  
**Firestore Rule:** Public read, admin write.  
**Manual Creation Required:** No.

**Document ID Strategy:** Auto-generated by Firestore

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| name | string | YES | Dr. Ahmad Mokadam | Full name |
| role | string | YES | Founder & Lead Counselor | Job title |
| bio | string | NO | Lorem ipsum... | Short biography (HTML allowed) |
| photoPath | string | NO | assets/team/ahmad.jpg | External HTTPS URL or asset path |
| photo | string | NO | assets/team/ahmad.jpg | LEGACY NAME (support both photoPath and photo) |
| whatsappNumber | string | NO | +60102503706 | WhatsApp contact link |
| whatsapp | string | NO | +60102503706 | LEGACY NAME (support both) |
| order | number | NO | 1 | Display order on team page |
| active | boolean | NO | true | Show on both homepage and team page |
| showOnHome | boolean | NO | true | Show on homepage |
| showOnTeam | boolean | NO | true | Show on team page |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Public read, admin-only write.

**Public Site Behavior:**
- Homepage displays team members with showOnHome=true, ordered by order field
- Team page displays all active team members
- WhatsApp number creates a link to initiate WhatsApp chat

**Admin Dashboard:** Team section allows CRUD. Fields include legacy names for backward compatibility.

**Example Document:**
```json
{
  "name": "Dr. Ahmad Mokadam",
  "role": "Founder & Lead Counselor",
  "bio": "With over 20 years of experience in international education...",
  "photoPath": "assets/team/ahmad.jpg",
  "whatsappNumber": "+60102503706",
  "order": 1,
  "active": true,
  "showOnHome": true,
  "showOnTeam": true,
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 8: testimonials

**Purpose:** Student testimonials displayed on public website.  
**Firestore Rule:** Public read, admin write.  
**Manual Creation Required:** No.

**Document ID Strategy:** Auto-generated by Firestore

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| name | string | YES | Ahmed Khan | Student name |
| program | string | YES | BSc Computer Science @ UTM | Program/university |
| quote | string | YES | "The counseling was excellent..." | Testimonial text |
| photoPath | string | NO | assets/testimonials/ahmed.jpg | External HTTPS URL or asset path |
| photo | string | NO | assets/testimonials/ahmed.jpg | LEGACY NAME |
| featured | boolean | NO | true | Show on homepage |
| active | boolean | NO | true | Visibility |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Public read, admin-only write.

**Public Site Behavior:**
- Homepage testimonials slider displays featured=true testimonials
- Testimonials page lists all active testimonials

**Admin Dashboard:** Testimonials section allows CRUD.

**Example Document:**
```json
{
  "name": "Ahmed Khan",
  "program": "BSc Computer Science @ UTM",
  "quote": "The counseling and guidance provided by Horizons was excellent. They helped me secure a full scholarship!",
  "photoPath": "assets/testimonials/ahmed.jpg",
  "featured": true,
  "active": true,
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 9: services

**Purpose:** Services listed on public website.  
**Firestore Rule:** Public read, admin write.  
**Manual Creation Required:** Optional (for services like "Free Counseling", "Visa Assistance", etc.).

**Document ID Strategy:** Auto-generated by Firestore

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| title | string | YES | Free Counseling | Service name |
| icon | string | NO | bi-chat-dots | Icon class (Bootstrap Icons) or emoji |
| description | string | NO | Get expert guidance... | Service description (HTML allowed) |
| order | number | NO | 1 | Display order |
| active | boolean | NO | true | Visibility |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Public read, admin-only write.

**Public Site Behavior:** Services section displays active services ordered by order field.

**Example Document:**
```json
{
  "title": "Free Counseling",
  "icon": "bi-chat-dots",
  "description": "Get expert guidance from our counselors...",
  "order": 1,
  "active": true,
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 10: applications

**Purpose:** Student applications for university admission.  
**Firestore Rule:** Public create (anyone can submit), admin read all, agents read their own.  
**Manual Creation Required:** No.

**Document ID Strategy:** Auto-generated by Firestore (then referenced as applicationId)

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| id | string | NO | app-doc-id | Document ID (for reference) |
| universityId | string | NO | uni-doc-id | Reference to universities doc |
| universityName | string | NO | University of Malaya | Snapshot of university name |
| student | map | YES | {...} | Student information object |
| guardian | map | YES | {...} | Guardian information object |
| documents | map | NO | {...} | Submitted documents (URLs if Spark) |
| storageFolder | string | NO | applications/app-id-... | Metadata about where documents were stored |
| status | string | YES | new, in_review, accepted, rejected | Application status |
| referralCode | string | NO | AGENT_ABC123 | Referral code if submitted via agent link |
| agentId | string | NO | agent-doc-id | Agent who referred this applicant |
| notes | string | NO | Called applicant on 5/22 | Admin notes |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**student Object (nested map):**
```
{
  "name": "Khalid Ahmed",
  "nationality": "Saudi Arabia",
  "email": "khalid@example.com",
  "country": "Saudi Arabia",
  "city": "Riyadh",
  "phone": "9665012345",
  "phoneCode": "+966",
  "programmeId": "course-doc-id",
  "programme": "Bachelor of Computer Science"
}
```

**guardian Object (nested map):**
```
{
  "name": "Hassan Ahmed",
  "email": "hassan@example.com",
  "phone": "9665012346",
  "phoneCode": "+966",
  "country": "Saudi Arabia"
}
```

**documents Object (nested map):**
```
{
  "highSchool": {"path": "...", "name": "high-school.pdf", "size": 2048},
  "photo": {"path": "...", "name": "photo.jpg", "size": 1024},
  "passport": {"path": "...", "name": "passport.pdf", "size": 3072},
  "additional": {"path": "...", "name": "extra.pdf", "size": 512}
}
```
**NOTE:** On Spark, these are null or empty URLs since Firebase Storage is unavailable. The apply form will need to be updated to only collect applicant info, not files.

**Security:** 
- Public create
- Admin read all
- Agents can read if agentId matches their document

**Public Site Behavior:** Not visible on public site (admin-only).

**Admin Dashboard:** Applications section shows all applications. Admins can change status, add notes, view student details.

**Example Document:**
```json
{
  "id": "K8x4mQ2nL9p",
  "universityId": "uni-doc-123",
  "universityName": "University of Malaya",
  "student": {
    "name": "Khalid Ahmed",
    "nationality": "Saudi Arabia",
    "email": "khalid@example.com",
    "country": "Saudi Arabia",
    "city": "Riyadh",
    "phone": "9665012345",
    "phoneCode": "+966",
    "programmeId": "course-123",
    "programme": "Bachelor of Computer Science"
  },
  "guardian": {
    "name": "Hassan Ahmed",
    "email": "hassan@example.com",
    "phone": "9665012346",
    "phoneCode": "+966",
    "country": "Saudi Arabia"
  },
  "documents": null,
  "status": "new",
  "referralCode": "AGENT_ABC123",
  "agentId": "agent-doc-456",
  "notes": "",
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 11: inquiries

**Purpose:** Contact form submissions from website.  
**Firestore Rule:** Public create, admin read/update/delete.  
**Manual Creation Required:** No.

**Document ID Strategy:** Auto-generated by Firestore

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| name | string | YES | Sarah Khan | Inquirer name |
| email | string | YES | sarah@example.com | Email address |
| phone | string | NO | +60102345678 | Optional phone |
| country | string | NO | Malaysia | Country of origin |
| interest | string | NO | Bachelor Engineering | Field of interest |
| message | string | NO | I'm interested in... | Message body |
| subject | string | NO | Course Inquiry | LEGACY: alternative to interest |
| status | string | YES | new, reviewed, resolved | Admin status |
| notes | string | NO | Sent brochure | Admin notes |
| timestamp | string | NO | 2026-05-22T10:00:00Z | Timestamp (alternative to createdAt) |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Public create, admin-only read/update/delete.

**Public Site Behavior:** Contact form submissions stored here. Not visible to public.

**Admin Dashboard:** Inquiries section shows new submissions. Admins can mark as reviewed, add notes, etc.

**Example Document:**
```json
{
  "name": "Sarah Khan",
  "email": "sarah@example.com",
  "phone": "+60102345678",
  "country": "Malaysia",
  "interest": "Bachelor Engineering",
  "message": "Hi, I'm very interested in your engineering programs...",
  "status": "new",
  "notes": "",
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 12: agents

**Purpose:** Agent/referral partner accounts.  
**Firestore Rule:** Public read referralLinks, admin CRUD agents, agents read/update own.  
**Manual Creation Required:** No (admin creates via dashboard, but Auth user must be created first in Firebase Console).

**Document ID Strategy:** Either UID or email (check admin.js line 3235 - uses agentUid in code)

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| uid | string | YES | agent-uid-123 | Firebase Auth UID |
| name | string | YES | Ahmad Ismail | Agent name |
| email | string | YES | ahmad@agent.com | Email (lowercase) |
| phone | string | NO | +60102345678 | Phone number |
| role | string | YES | "agent" | Must be "agent" |
| status | string | YES | active | active or inactive |
| referralCode | string | NO | AHMAD_XYZ123 | Auto-generated referral code |
| referralUrl | string | NO | https://horizons-cee8d.web.app/?ref=AHMAD_XYZ123 | Full referral URL |
| commissionStructure | string | NO | 5% per enrollment | Commission terms |
| country | string | NO | Malaysia | Agent location |
| userId | string | NO | agent-uid-123 | LEGACY: alias for uid |
| permissions | array | NO | ["view_own_analytics"] | Agent permissions |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| authUserCreated | boolean | NO | true | Metadata |

**Security:** 
- Public read for referral validation only
- Admin CRUD
- Agents can read/update own

**Public Site Behavior:** Referral codes validated against this collection when processing applications.

**Admin Dashboard:** Agents section allows CRUD. Referral code and URL auto-generated.

**Example Document:**
```json
{
  "uid": "agent-uid-abc123",
  "name": "Ahmad Ismail",
  "email": "ahmad@agent.com",
  "phone": "+60102345678",
  "role": "agent",
  "status": "active",
  "referralCode": "AHMAD_XYZ123",
  "referralUrl": "https://horizons-cee8d.web.app/?ref=AHMAD_XYZ123",
  "commissionStructure": "5% per enrollment",
  "country": "Malaysia",
  "permissions": ["view_own_analytics"],
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 13: referralLinks

**Purpose:** Track agent referral codes and links.  
**Firestore Rule:** Public read, admin create/update/delete.  
**Manual Creation Required:** No (auto-created when agent is created).

**Document ID Strategy:** Document ID is the referral code itself (e.g., "AHMAD_XYZ123")

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| agentId | string | YES | agent-doc-id | Reference to agents document |
| agentEmail | string | YES | ahmad@agent.com | Snapshot of agent email |
| code | string | YES | AHMAD_XYZ123 | Referral code (matches doc ID) |
| fullUrl | string | YES | https://horizons-cee8d.web.app/?ref=AHMAD_XYZ123 | Full URL with ?ref parameter |
| status | string | YES | active | active or inactive |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| createdBy | string | NO | admin@horizons.edu | Admin who created it |

**Security:** Public read (for validation), admin-only write.

**Public Site Behavior:** Applications check this to resolve referral code → agentId.

**Example Document:**
```json
{
  "agentId": "agent-doc-id",
  "agentEmail": "ahmad@agent.com",
  "code": "AHMAD_XYZ123",
  "fullUrl": "https://horizons-cee8d.web.app/?ref=AHMAD_XYZ123",
  "status": "active",
  "createdAt": {"_seconds": 1747987200},
  "createdBy": "admin@horizons.edu"
}
```

---

## COLLECTION 14: referralVisits

**Purpose:** Analytics - track when referral links are visited.  
**Firestore Rule:** Public create, admin/agent read own.  
**Manual Creation Required:** No (auto-created by frontend).

**Document ID Strategy:** Auto-generated by Firestore

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| agentId | string | YES | agent-doc-id | Which agent's link was clicked |
| code | string | NO | AHMAD_XYZ123 | Referral code |
| page | string | NO | /pages/universities.html | Page where link was followed |
| timestamp | timestamp | NO | 2026-05-22T10:00:00Z | When the visit occurred |
| ipAddress | string | NO | 203.0.113.5 | IP address (optional) |
| userAgent | string | NO | Mozilla/5.0... | Browser user agent (optional) |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Public create, admin/agent read.

**Public Site Behavior:** Frontend logs visits when referral link is clicked.

**Example Document:**
```json
{
  "agentId": "agent-doc-id",
  "code": "AHMAD_XYZ123",
  "page": "/pages/universities.html",
  "timestamp": {"_seconds": 1747987200},
  "ipAddress": "203.0.113.5",
  "createdAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 15: whatsappClicks

**Purpose:** Analytics - track WhatsApp contact clicks.  
**Firestore Rule:** Public create, admin read, agents read own (if assigned).  
**Manual Creation Required:** No.

**Document ID Strategy:** Auto-generated by Firestore

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| agentId | string | NO | agent-doc-id | If clicked from agent profile |
| page | string | NO | /pages/team.html | Where WhatsApp was clicked |
| target | string | NO | +60102503706 | WhatsApp number that was clicked |
| timestamp | timestamp | NO | 2026-05-22T10:00:00Z | When clicked |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Public create, admin read.

**Example Document:**
```json
{
  "agentId": "agent-doc-id",
  "page": "/pages/team.html",
  "target": "+60102503706",
  "timestamp": {"_seconds": 1747987200},
  "createdAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 16: students

**Purpose:** Student profiles created during applications.  
**Firestore Rule:** Created by public (during application), admin CRUD, agents can read if student agent-assigned, students can read own.  
**Manual Creation Required:** No (auto-created during application submission).

**Document ID Strategy:** Auto-generated by Firestore or application-derived ID

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| name | string | YES | Khalid Ahmed | Student name |
| email | string | YES | khalid@example.com | Email |
| phone | string | NO | +9665012345 | Phone |
| phoneCode | string | NO | +966 | Country code |
| nationality | string | NO | Saudi Arabia | Nationality |
| country | string | NO | Saudi Arabia | Country of residence |
| city | string | NO | Riyadh | City |
| agentId | string | NO | agent-doc-id | Assigned agent (if referred) |
| applicationIds | array | NO | [app-id-1, app-id-2] | References to student's applications |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** 
- Public create
- Admin CRUD
- Agents can read if their applicant
- Students can read own

**Example Document:**
```json
{
  "name": "Khalid Ahmed",
  "email": "khalid@example.com",
  "phone": "+9665012345",
  "phoneCode": "+966",
  "nationality": "Saudi Arabia",
  "country": "Saudi Arabia",
  "city": "Riyadh",
  "agentId": "agent-doc-id",
  "applicationIds": ["app-id-1", "app-id-2"],
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 17: studentStatus

**Purpose:** Track application status for each student-university pair.  
**Firestore Rule:** Admin CRUD, students can read own.  
**Manual Creation Required:** No (admin creates via dashboard).

**Document ID Strategy:** Auto-generated or "studentId-universityCombination"

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| studentId | string | YES | student-doc-id | Reference to students |
| universityId | string | NO | uni-doc-id | Reference to universities |
| status | string | YES | applied, accepted, rejected, enrolled | Current status |
| notes | string | NO | Pending interview | Admin notes |
| lastUpdated | timestamp | NO | 2026-05-22T10:00:00Z | When status last changed |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |
| updatedAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Admin CRUD, students read own via studentId query.

**Example Document:**
```json
{
  "studentId": "student-doc-id",
  "universityId": "uni-doc-id",
  "status": "applied",
  "notes": "Application received, pending review",
  "lastUpdated": {"_seconds": 1747987200},
  "createdAt": {"_seconds": 1747987200},
  "updatedAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 18: studentStatusHistory

**Purpose:** Audit trail of application status changes.  
**Firestore Rule:** Admin-only. Immutable (no update/delete).  
**Manual Creation Required:** No (auto-created when status changes).

**Document ID Strategy:** Auto-generated by Firestore

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| studentId | string | YES | student-doc-id | Which student |
| previousStatus | string | NO | applied | Status before change |
| newStatus | string | YES | accepted | Status after change |
| changedBy | string | YES | admin@horizons.edu | Admin who made change |
| reason | string | NO | Interview passed | Reason for change |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set (timestamp of change) |

**Security:** Admin-only create. Immutable.

**Example Document:**
```json
{
  "studentId": "student-doc-id",
  "previousStatus": "applied",
  "newStatus": "accepted",
  "changedBy": "admin@horizons.edu",
  "reason": "Interview passed with excellent results",
  "createdAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 19: applicationStatusHistory

**Purpose:** Audit trail of application status changes.  
**Firestore Rule:** Admin-only. Immutable.  
**Manual Creation Required:** No.

**Document ID Strategy:** Auto-generated by Firestore

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| applicationId | string | YES | app-doc-id | Which application |
| previousStatus | string | NO | new | Status before |
| newStatus | string | YES | in_review | Status after |
| changedBy | string | YES | admin@horizons.edu | Admin who changed it |
| reason | string | NO | Started review process | Reason |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Admin-only create. Immutable.

**Example Document:**
```json
{
  "applicationId": "app-doc-id",
  "previousStatus": "new",
  "newStatus": "in_review",
  "changedBy": "admin@horizons.edu",
  "reason": "Started document review",
  "createdAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 20: roles

**Purpose:** Admin-defined roles and their permission sets.  
**Firestore Rule:** Admin-only read/write.  
**Manual Creation Required:** No (optional, can create default roles).

**Document ID Strategy:** Auto-generated or role name (e.g., "admin", "editor")

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| name | string | YES | admin | Role name |
| description | string | NO | Full system access | Role description |
| permissions | array | YES | ["manage_courses", "manage_universities"] | Array of permission keys |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Admin-only.

**Example Document:**
```json
{
  "name": "admin",
  "description": "Full system access",
  "permissions": ["manage_courses", "manage_universities", "manage_team", "manage_testimonials", "manage_services", "manage_agents", "manage_students", "view_analytics", "manage_contact_settings", "view_audit_logs"],
  "createdAt": {"_seconds": 1747987200}
}
```

---

## COLLECTION 21: permissions

**Purpose:** Define what each permission key means.  
**Firestore Rule:** Admin-only read/write.  
**Manual Creation Required:** No (optional reference).

**Document ID Strategy:** Permission key (e.g., "manage_courses")

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| key | string | YES | manage_courses | Permission identifier |
| description | string | YES | Can create, edit, delete courses | What it allows |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Admin-only.

---

## COLLECTION 22: auditLogs

**Purpose:** System audit trail of admin actions.  
**Firestore Rule:** Admin-only read. Admin/system create. Immutable.  
**Manual Creation Required:** No.

**Document ID Strategy:** Auto-generated by Firestore

**Fields:**

| Field | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| admin | string | YES | admin@horizons.edu | Who performed action |
| action | string | YES | UPDATE | Action type |
| collection | string | YES | courses | Which collection affected |
| documentId | string | YES | course-123 | Which document |
| changes | map | NO | {name: {old: "...", new: "..."}} | What changed |
| timestamp | timestamp | NO | 2026-05-22T10:00:00Z | When it happened |
| createdAt | timestamp | NO | 2026-05-22T10:00:00Z | Auto-set |

**Security:** Admin-only read. Immutable.

---

# SECTION A — Manual Setup Order

**Follow this exact order to set up Firestore:**

## Phase 1: Core Settings (Required before anything else)
1. **admins/admin.horizons.test@gmail.com** - First admin account
   - Must be done AFTER creating Auth user in Firebase Console
   - Fields: uid, email, name, role="admin", status="active"

2. **siteSettings/main** - Website branding
   - Fields: logoUrl (external URL), heroImageUrl (external URL)

3. **contactSettings/main** - Contact info
   - Fields: whatsappNumber, email, phone, address, etc.

## Phase 2: Content (Can be empty initially, admin adds later via dashboard)
4. **universities** collection - Can be created empty
5. **courses** collection - Can be created empty
6. **courseFolders** collection - Can be created empty
7. **team** collection - Can be created empty
8. **testimonials** collection - Can be created empty
9. **services** collection - Can be created empty

## Phase 3: Analytics/Tracking (Can be created empty)
10. **agents** collection - Can be created empty
11. **referralLinks** collection - Can be created empty
12. **referralVisits** collection - Can be created empty
13. **whatsappClicks** collection - Can be created empty

## Phase 4: Applications/Students (Auto-populated by forms)
14. **applications** collection - Can be created empty (public creates documents)
15. **students** collection - Can be created empty
16. **studentStatus** collection - Can be created empty
17. **studentStatusHistory** collection - Can be created empty
18. **applicationStatusHistory** collection - Can be created empty

## Phase 5: Admin Management (Optional)
19. **inquiries** collection - Can be created empty (public creates documents)
20. **roles** collection - Optional starter document
21. **permissions** collection - Optional reference
22. **auditLogs** collection - Can be created empty

---

# SECTION B — Collections That Can Stay Empty Initially

The following collections can be created but left empty. The admin dashboard will populate them:

- **universities** - Admin creates via dashboard
- **courses** - Admin creates or imports CSV
- **courseFolders** - Admin creates as needed
- **team** - Admin creates team profiles
- **testimonials** - Admin adds student testimonials
- **services** - Admin adds service descriptions
- **agents** - Admin creates after Auth users exist
- **referralLinks** - Auto-created when agents created
- **roles** - Optional, admin can set up
- **permissions** - Optional reference

Only **admins** and **siteSettings** MUST have initial documents before the site can function.

---

# SECTION C — Spark Plan Limitations & Workarounds

### 1. Firebase Storage Unavailable

**Problem:** Spark plan cannot initialize Storage buckets.

**Solution:** All image/file fields store external HTTPS URLs only.

**Examples:**
- `logoUrl: "https://example.com/logo.png"` ✅
- `photoPath: "assets/team/ahmad.jpg"` ✅ (relative asset path)
- `storageFolder: "gs://bucket/path"` ❌ (Firebase Storage)
- `documentUrl: "/brand/logo/file.png"` ❌ (Storage path)

**Files in applications:** On Spark, the apply form cannot upload files to Storage. Current code attempts Firebase Storage. **ACTION REQUIRED:**

Edit `js/apply.js` line 161-167:
```javascript
// REMOVE or COMMENT OUT this function on Spark
async function uploadIfPresent(file, path) {
    // On Spark: Return null or empty object
    // Do NOT call uploadFileToStorage
    return null;
}
```

Then in application submission (line 224-228), set `documents: {}` or `documents: null`.

### 2. Cloud Functions Unavailable

**Problem:** Spark plan cannot deploy Cloud Functions.

**Workaround:** All admin/agent creation is manual via Firebase Console + Firestore profile creation via dashboard.

See admin dashboard UI messages for "Spark Plan Instructions".

### 3. Custom Claims Unavailable

**Problem:** No Cloud Functions means no custom claims for Storage authorization.

**Solution:** Spark uses hardcoded UID allowlist in storage.rules (only first admin can upload brand assets without code changes).

See `storage.rules`:
```javascript
function isAdmin() {
  return request.auth != null && 
         request.auth.uid == 'xOlH7JLIAegVHblBngMBF33LdI32';
}
```

To add uploading admins: Edit storage.rules and redeploy.

### 4. No Real-time Database

**Note:** Spark supports Firestore (used here), not Realtime Database. No changes needed.

---

# SECTION D — Code Fixes Required Before Database Build

### Fix 1: Remove Firebase Storage References from apply.js

**File:** `js/apply.js`  
**Lines:** 161-167, 224-228  
**Change:**

```javascript
// OLD (Storage-based - fails on Spark)
async function uploadIfPresent(file, path) {
    if (!file) return null;
    return uploadFileToStorage(file, path);  // ❌ Fails on Spark
}

// NEW (Spark-compatible)
async function uploadIfPresent(file, path) {
    // Spark plan: No file uploads to Storage
    return null;
}
```

Then update the documents map:
```javascript
const uploaded = {
    highSchool: null,
    photo: null,
    passport: null,
    additional: null
};

// In application object:
documents: null,  // No file uploads on Spark
```

### Fix 2: Ensure Image Fields Are URLs

**Throughout codebase:**  
Check that all image/file fields accept external HTTPS URLs or asset paths.

**Already correct:**
- `logoUrl` in siteSettings ✅
- `heroImageUrl` in siteSettings ✅
- `logo` in universities ✅
- `campusImage` in universities ✅
- `image` in courses ✅
- `photoPath` in team ✅
- `photoPath` in testimonials ✅

No changes needed.

### Fix 3: Verify Admin Authorization Logic

**File:** `firestore.rules`  
**Current:** ✅ Correct (checks admins/{email} document)

No changes needed - rules are Spark-compatible.

---

# SECTION E — Firestore Rules Alignment

**Current firestore.rules:** ✅ ALIGNED with schema

The rules correctly reference all collections in this schema:
- ✅ admins
- ✅ siteSettings
- ✅ contactSettings
- ✅ universities
- ✅ courses
- ✅ courseOfferings (nested in universities, not separate)
- ✅ services
- ✅ testimonials
- ✅ successStories
- ✅ team
- ✅ courseFolders
- ✅ applications
- ✅ inquiries
- ✅ agents
- ✅ referralLinks
- ✅ referralVisits
- ✅ whatsappClicks
- ✅ students
- ✅ studentStatus
- ✅ studentStatusHistory
- ✅ applicationStatusHistory
- ✅ roles
- ✅ permissions
- ✅ auditLogs

**No rule changes needed.**

---

# SECTION F — Final Checklist

**Collection-by-collection setup checklist:**

### Phase 1: Core (REQUIRED)
- [ ] **admins** collection created
  - [ ] Document ID: `admin.horizons.test@gmail.com`
  - [ ] Fields: uid, email, name, role, status, createdAt
  - [ ] uid matches Firebase Auth UID

- [ ] **siteSettings** collection created
  - [ ] Document ID: `main`
  - [ ] Fields: logoUrl, heroImageUrl
  - [ ] URLs are external HTTPS or assets paths

- [ ] **contactSettings** collection created
  - [ ] Document ID: `main`
  - [ ] Fields: whatsappNumber, email, phone, address, etc.

### Phase 2: Content
- [ ] **universities** collection created (can be empty)
- [ ] **courses** collection created (can be empty)
- [ ] **courseFolders** collection created (can be empty)
- [ ] **team** collection created (can be empty)
- [ ] **testimonials** collection created (can be empty)
- [ ] **services** collection created (can be empty)

### Phase 3: Analytics
- [ ] **agents** collection created (can be empty)
- [ ] **referralLinks** collection created (can be empty)
- [ ] **referralVisits** collection created (can be empty)
- [ ] **whatsappClicks** collection created (can be empty)

### Phase 4: Applications
- [ ] **applications** collection created (can be empty)
- [ ] **students** collection created (can be empty)
- [ ] **studentStatus** collection created (can be empty)
- [ ] **studentStatusHistory** collection created (can be empty)
- [ ] **applicationStatusHistory** collection created (can be empty)

### Phase 5: Admin
- [ ] **inquiries** collection created (can be empty)
- [ ] **roles** collection created (optional)
- [ ] **permissions** collection created (optional)
- [ ] **auditLogs** collection created (can be empty)

### Verification
- [ ] Firestore rules deployed (`firebase deploy --only firestore:rules`)
- [ ] Storage rules deployed with hardcoded admin UID (`firebase deploy --only storage`)
- [ ] First admin can log in to admin.html
- [ ] Admin dashboard loads and shows empty sections
- [ ] Contact form submits to inquiries collection
- [ ] Application form displays (even if file upload disabled)

---

# PRODUCTION READINESS SUMMARY

### ✅ Schema Completeness
- All 22 collections designed
- All fields documented with types
- All relationships defined
- All manual starter documents identified
- Spark plan limitations documented

### ✅ Code Alignment
- Firestore rules aligned with schema
- Storage rules use hardcoded admin UID (Spark-compatible)
- Admin authorization uses Firestore document check (Spark-compatible)
- No Cloud Functions dependencies

### ⚠️ Required Fixes (Before Going Live)
1. Update `js/apply.js` to remove Storage file uploads
2. Verify all image fields use external URLs (mostly done)
3. Create first admin in Firebase Console → Copy UID → Create Firestore doc
4. Create siteSettings/main and contactSettings/main documents
5. Deploy updated code to Hosting

### 🚀 Ready for Spark Deployment
This schema works on Firebase Spark plan with NO upgrades needed. All functionality is available except:
- File uploads to Storage (use external URLs instead)
- Secure server-side admin creation (manual Console + dashboard)
- Dynamic admin UID list (hardcoded in rules, update as needed)

---

**End of Schema Document**

All collections, fields, document IDs, security rules, and manual setup steps are now defined. You can build this database collection-by-collection in Firebase Console following Section A's manual setup order.

