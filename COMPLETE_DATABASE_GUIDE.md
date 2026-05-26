# HORIZONS — Complete Firebase Database Setup Guide
**Updated:** May 23, 2026  
**Status:** Production-Ready ✅  
**Collections:** 24 (all verified against code)

---

## Quick Start

**Prerequisites:**
- Firebase project created (Firestore, Auth, Storage enabled)
- Firebase CLI installed (`npm install -g firebase-tools`)
- Your email address ready
- Firebase Auth UID copied from Firebase Console

**Total Build Time:** ~60-90 minutes (manual Firebase Console clicks)

---

## 📌 Important: Image Assets Note

The guide references image paths for courses and universities (e.g., `assets/courses/computer-science.jpg`).

**You have three options:**

1. **Leave images empty initially** — Skip image fields when creating documents, then upload real images later via admin panel
2. **Use placeholder images** — Placeholder images exist at the referenced paths; they work but are placeholders only
3. **Upload HTTPS URLs** — Instead of asset paths, paste direct URLs to images hosted externally (e.g., AWS S3, CDN)

**Recommendation:** Start with Option 1. Upload real course/university logos and campus photos via the admin dashboard after the database is set up. This is faster than manual entry and allows admins to manage images later.

---

## PHASE 1: Firebase Project Prerequisites

### Step 1a: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Name: `horizons-educational` (or your choice)
4. Enable Google Analytics (optional)
5. Create project

### Step 1b: Enable Firestore Database
1. In Firebase Console, left sidebar → "Build" → "Firestore Database"
2. Click "Create database"
3. **Start in production mode** (we'll deploy rules)
4. Location: Choose closest to your target audience
5. Click "Enable"

### Step 1c: Enable Firebase Authentication
1. Left sidebar → "Build" → "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable **Email/Password**
5. Disable anonymous sign-in

### Step 1d: Enable Cloud Storage
1. Left sidebar → "Build" → "Storage"
2. Click "Get started"
3. Click "Next" on security rules (we'll update them)
4. Default location is fine
5. Click "Done"

### Step 1e: Create Your Firebase Auth User
1. Still in "Authentication" tab
2. Click "Users" tab
3. Click "Add user" button
4. Email: **abasmust277@gmail.com**
5. Password: (create a secure password)
6. Click "Add user"
7. **After user is created, click the user to expand it**
8. **Copy the UID (long string like `abc123def456...`)**
9. **SAVE THIS UID — you'll need it in a few minutes**

---

## PHASE 2: Deploy Firestore Security Rules

The `firestore.rules` file in your project is already correct. Deploy it now:

```bash
firebase login
firebase deploy --only firestore:rules
```

Expected output: `✔  Deploy complete!`

---

## PHASE 3: Create Collections & Documents (Manual Firebase Console)

### Step 3.1: Create `permissions` Collection (8 documents)

1. In Firestore Database tab, click "Start collection"
2. Collection ID: `permissions`
3. First document ID: `manage_agents`
4. Add these fields:
   - `id` (string): `manage_agents`
   - `category` (string): `agents`
   - `name` (string): `Manage Agents`
   - `description` (string): `Create, edit, and delete agent accounts`
   - `createdAt` (timestamp): Click server timestamp

5. Save, then click "Add document" to add the remaining 7:

| Document ID | id | category | name | description |
|---|---|---|---|---|
| view_analytics | view_analytics | analytics | View Analytics | View referral and student analytics |
| manage_students | manage_students | students | Manage Students | Create, edit, and delete student records |
| manage_universities | manage_universities | content | Manage Universities | Create, edit, and delete universities |
| manage_courses | manage_courses | content | Manage Courses | Create, edit, and delete courses |
| manage_team | manage_team | content | Manage Team | Create, edit, and delete team members |
| manage_contact_settings | manage_contact_settings | settings | Manage Contact Settings | Edit contact information |
| view_audit_logs | view_audit_logs | admin | View Audit Logs | View system audit logs |

---

### Step 3.2: Create `roles/admin` Document

1. Click "Start collection"
2. Collection ID: `roles`
3. Document ID: `admin`
4. Add fields:
   - `name` (string): `Admin`
   - `description` (string): `Full access to all platform features`
   - `permissions` (array): Click "Add element" 8 times and add:
     - `manage_agents`
     - `manage_courses`
     - `manage_universities`
     - `manage_team`
     - `manage_contact_settings`
     - `view_analytics`
     - `manage_students`
     - `view_audit_logs`
   - `createdAt` (timestamp): Server timestamp

5. Save

---

### Step 3.3: Create `courseFolders` Collection (3 documents)

1. Click "Start collection"
2. Collection ID: `courseFolders`
3. First document ID: `folder-engineering`
4. Add fields:
   - `name` (string): `Engineering`
   - `order` (number): `1`
   - `createdAt` (timestamp): Server timestamp
5. Save, then add 2 more:

| Document ID | name | order |
|---|---|---|
| folder-business | Business | 2 |
| folder-sciences | Sciences | 3 |

---

### Step 3.4: Create `admins` Collection with YOUR Admin Account

**⚠️ CRITICAL: The document ID MUST be your email lowercase**

1. Click "Start collection"
2. Collection ID: `admins`
3. Document ID: **abasmust277@gmail.com** (exactly as typed, lowercase)
4. Add fields:
   - `uid` (string): **PASTE YOUR UID HERE** (from Step 1e)
   - `name` (string): `Admin`
   - `email` (string): `abasmust277@gmail.com`
   - `role` (string): `admin`
   - `status` (string): `active`
   - `permissions` (array): Click "Add element" 10 times:
     - `manage_courses`
     - `manage_universities`
     - `manage_team`
     - `manage_testimonials`
     - `manage_services`
     - `manage_agents`
     - `manage_students`
     - `view_analytics`
     - `manage_contact_settings`
     - `view_audit_logs`
   - `createdAt` (timestamp): Server timestamp
   - `createdBy` (string): `system`

5. Save

---

### Step 3.5: Create `siteSettings/main` Document

1. Click "Start collection"
2. Collection ID: `siteSettings`
3. Document ID: `main`
4. Add fields:
   - `siteName` (string): `Horizons Educational Agency`
   - `currency` (string): `MYR`
   - `languages` (array): `["en", "ar"]`
   - `defaultLanguage` (string): `en`
   - `active` (boolean): `true`
   - `updatedAt` (timestamp): Server timestamp

5. Save

---

### Step 3.6: Create `contactSettings/main` Document

**⚠️ Note: This has nested objects. Create carefully:**

1. Click "Start collection"
2. Collection ID: `contactSettings`
3. Document ID: `main`
4. Add fields:
   - `email` (string): `info@horizons.edu`
   - `phone` (string): `+60 12-345-6789`
   - `whatsapp` (string): `+60 12-345-6789`
   - `address` (string): `Level 5, Tech Park, Kuala Lumpur`
   - `city` (string): `Kuala Lumpur`
   - `country` (string): `Malaysia`
   - `timezone` (string): `Asia/Kuala_Lumpur`
   - `updatedAt` (timestamp): Server timestamp
   - `updatedBy` (string): `system`

5. Now add **nested object** `workingHours`:
   - Click "Add field" → field name: `workingHours` → type: Map
   - Inside the map, add:
     - `start` (string): `09:00`
     - `end` (string): `18:00`
     - `days` (array): Add 5 elements: Monday, Tuesday, Wednesday, Thursday, Friday

6. Now add **nested object** `socialMedia`:
   - Click "Add field" → field name: `socialMedia` → type: Map
   - Inside the map, add (leave empty or fill with your socials):
     - `facebook` (string): ` `
     - `twitter` (string): ` `
     - `instagram` (string): ` `
     - `linkedin` (string): ` `
     - `tiktok` (string): ` `
     - `youtube` (string): ` `

7. Save

---

### Step 3.7: Create `courses` Collection (3 sample courses)

1. Click "Start collection"
2. Collection ID: `courses`
3. First document ID: `course-001`
4. Add fields:
   - `name` (string): `Bachelor of Computer Science`
   - `courseId` (string): `BSC-COMP-SCI`
   - `level` (string): `Bachelor`
   - `folderId` (string): `folder-engineering`
   - `category` (string): `Engineering`
   - `basePrice` (number): `30000`
   - `baseCurrency` (string): `MYR`
   - `baseDurationYears` (number): `3`
   - `totalSemesters` (number): `6`
   - `duration` (string): `3 years`
   - `credits` (number): `120`
   - `image` (string): `assets/courses/computer-science.jpg`
   - `description` (string): `Core computing and software engineering fundamentals`
   - `active` (boolean): `true`
   - `createdAt` (timestamp): Server timestamp
   - `updatedAt` (timestamp): Server timestamp

5. Save, then add 2 more courses:

**course-002:**
- name: `Master of Business Administration`
- courseId: `MBA-BUS-ADM`
- level: `Masters`
- folderId: `folder-business`
- category: `Business`
- basePrice: `45000`
- baseCurrency: `MYR`
- baseDurationYears: `2`
- totalSemesters: `4`
- duration: `2 years`
- credits: `60`
- image: `assets/courses/mba.jpg`
- description: `Advanced management and business strategy`
- active: `true`

**course-003:**
- name: `Diploma in Business Administration`
- courseId: `DIP-BUS-ADM`
- level: `Diploma`
- folderId: `folder-business`
- category: `Business`
- basePrice: `19000`
- baseCurrency: `MYR`
- baseDurationYears: `2`
- totalSemesters: `4`
- duration: `2 years`
- credits: `90`
- image: `assets/courses/diploma-business.jpg`
- description: `Foundation in management finance and operations`
- active: `true`

---

### Step 3.8: Create `universities` Collection (2 sample universities)

**⚠️ DO NOT add courseOfferings array — that's a separate collection**

1. Click "Start collection"
2. Collection ID: `universities`
3. First document ID: `uni-001`
4. Add fields:
   - `shortCode` (string): `UM`
   - `order` (number): `1`
   - `name` (string): `University of Malaya`
   - `location` (string): `Kuala Lumpur, Malaysia`
   - `ranking` (string): `Top 100 QS World Rankings`
   - `intro` (string): `Malaysia's leading research university`
   - `aboutContent` (string): `The University of Malaya was established in 1949 and is the oldest university in Malaysia. It is consistently ranked among Asia's top universities...`
   - `logo` (string): `assets/logos/um-logo.png`
   - `image` (string): `assets/universities/um-campus.jpg`
   - `youtubeVideo` (string): ` ` (leave empty for now)
   - `nextIntakeDate` (string): `2025-09-01`
   - `intakeMonths` (array): Add 2 elements: September, February
   - `offerLetterFree` (boolean): `true`
   - `faqs` (array): For now, leave empty (can add via admin panel later)
   - `active` (boolean): `true`
   - `createdAt` (timestamp): Server timestamp
   - `updatedAt` (timestamp): Server timestamp

5. Save, then add 1 more university:

**uni-002:**
- shortCode: `UKM`
- order: `2`
- name: `Universiti Kebangsaan Malaysia`
- location: `Selangor, Malaysia`
- ranking: `Top 150 QS World Rankings`
- intro: `Research-focused public university`
- aboutContent: `Universiti Kebangsaan Malaysia (UKM) is one of Malaysia's premier research institutions...`
- logo: `assets/logos/ukm-logo.png`
- image: `assets/universities/ukm-campus.jpg`
- youtubeVideo: ` `
- nextIntakeDate: `2025-02-01`
- intakeMonths: February, August
- offerLetterFree: `true`
- faqs: (empty)
- active: `true`

---

### Step 3.9: Create `courseOfferings` Collection (5 sample offerings)

**Document ID pattern: {universityId}_{courseId}**

1. Click "Start collection"
2. Collection ID: `courseOfferings`
3. First document ID: `uni-001_course-001`
4. Add fields:
   - `universityId` (string): `uni-001`
   - `courseId` (string): `course-001`
   - `universityName` (string): `University of Malaya`
   - `courseName` (string): `Bachelor of Computer Science`
   - `courseLevel` (string): `Bachelor` (snapshot from course.level)
   - `courseCategory` (string): `Engineering` (snapshot from course.category)
   - `tuitionFee` (number): `30000`
   - `tuitionCurrency` (string): `MYR`
   - `durationYears` (number): `3`
   - `durationMonths` (number): `36`
   - `durationText` (string): `3 years`
   - `semesters` (number): `6`
   - `intakeMonths` (array): September, February
   - `nextIntakeDate` (string): `2025-09-01`
   - `applicationOpen` (boolean): `true`
   - `order` (number): `1`
   - `active` (boolean): `true`
   - `createdAt` (timestamp): Server timestamp
   - `updatedAt` (timestamp): Server timestamp

5. Save, then add 4 more:

| Doc ID | universityId | courseId | universityName | courseName | tuitionFee | intakeMonths | nextIntakeDate |
|---|---|---|---|---|---|---|---|
| uni-001_course-002 | uni-001 | course-002 | University of Malaya | Master of Business Administration | 45000 | [Feb] | 2025-02-01 |
| uni-001_course-003 | uni-001 | course-003 | University of Malaya | Diploma in Business Administration | 19000 | [Sep, Feb] | 2025-09-01 |
| uni-002_course-001 | uni-002 | course-001 | Universiti Kebangsaan Malaysia | Bachelor of Computer Science | 28000 | [Aug] | 2025-08-01 |
| uni-002_course-002 | uni-002 | course-002 | Universiti Kebangsaan Malaysia | Master of Business Administration | 42000 | [Feb] | 2025-02-01 |

For each, fill in the common fields:
- tuitionCurrency: `MYR`
- durationYears: `3` (or `2` for Masters)
- durationMonths: `36` (or `24` for Masters)
- durationText: `3 years` (or `2 years`)
- semesters: `6` (or `4` for diploma/masters)
- applicationOpen: `true`
- order: `1`
- active: `true`
- createdAt/updatedAt: Server timestamp

---

## PHASE 4: Verify Collections Exist

1. Go to Firestore Database tab
2. You should see these collections listed:
   - ✅ admins
   - ✅ contactSettings
   - ✅ courseOfferings
   - ✅ courseFolders
   - ✅ courses
   - ✅ permissions
   - ✅ roles
   - ✅ siteSettings
   - ✅ universities

3. Expand each to verify documents exist

---

## PHASE 5: Connect Your Code to Firebase

### Step 5a: Get Firebase Config

1. In Firebase Console, click the gear icon (project settings) → "Project settings"
2. Under "Your apps", click "Web" icon (or add if not present)
3. Register app name: `horizons-web`
4. Copy the config object:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### Step 5b: Update `firebase-config.js`

Open `js/firebase-config.js` in your project:

1. Find the `firebaseConfig` object (should be near the top)
2. Replace it with your config from Step 5a
3. Save the file

### Step 5c: Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Expected output: `✔  Deploy complete!`

Then visit your hosting URL to test.

---

## PHASE 6: Verification Checklist

### Manual Tests (in Browser)

1. **Open your site** (Firebase hosting URL)
2. **Check homepage loads** — check Network tab for Firestore queries
3. **Universities page loads** — should show 2 universities (UM, UKM)
4. **Each university has courses** — click a university, see 2-3 courseOfferings

### Browser Console Tests

Open DevTools Console on your site and run:

```javascript
// Test 1: Check Firebase is initialized
console.log('Firebase initialized:', !!db);

// Test 2: Count universities
const uniCount = await db.collection('universities').get();
console.log('Universities found:', uniCount.size); // Should be 2

// Test 3: Check courseOfferings
const offeringsCount = await db.collection('courseOfferings').get();
console.log('Offerings found:', offeringsCount.size); // Should be 5

// Test 4: Check admin can authenticate
// Try logging into admin panel with abasmust277@gmail.com / your password
// Admin dashboard should load without "unauthorized" error

// Test 5: Verify contactSettings
const settings = await db.collection('contactSettings').doc('main').get();
console.log('Contact email:', settings.data().email); // Should be info@horizons.edu
```

### Admin Dashboard Tests

1. Navigate to `/admin.html`
2. Log in with: **abasmust277@gmail.com** / your password
3. Dashboard should load successfully
4. Click "Universities" tab — should show 2 universities
5. Click "Courses" tab — should show 3 courses
6. Each university should show linked courseOfferings when editing

### Student Application Tests

1. Go to `/apply.html`
2. Select a university from dropdown
3. Select a course/programme
4. Fill form and submit (don't worry if email fails in dev)
5. Check Firestore: new document should appear in `applications` collection

---

## OPTIONAL: Add More Content (Anytime)

### Team Members

Collection: `team`  
Fields: name, role, order, bio, photoPath, whatsappNumber, active, createdAt, updatedAt

Go to Admin Dashboard → Team tab → Add member

### Services

Collection: `services`  
**Canonical Field:** `title` (stores service name)  
Fields: title, icon, order, description, active, createdAt, updatedAt

Go to Admin Dashboard → Services tab → Add service

### Testimonials

Collection: `testimonials`  
**Canonical Fields:** studentName, university, country, status, photo, quote, featured, active  
Fields: studentName, university, country, status, photo, quote, featured, active, createdAt, updatedAt

Go to Admin Dashboard → Testimonials tab → Add testimonial

---

## TROUBLESHOOTING

### "Unauthorized" on Admin Dashboard
- Check that `admins/{your-email}` document exists
- Verify the document ID matches your email exactly (lowercase)
- Verify `role: 'admin'` and `status: 'active'`
- Clear browser cache and log out/in

### Universities/Courses Not Loading
- Check Firestore rules are deployed: `firebase deploy --only firestore:rules`
- Check courseFolders exist (courses reference folderId)
- Check courses have `folderId` field matching a courseFolders document

### "Permission denied" Errors
- Check Firestore rules in Console → rules tab
- Make sure rules include all 24 collections
- Run: `firebase deploy --only firestore:rules`

### courseOfferings Not Showing
- Check `uni-001_course-001` etc documents exist
- Check `universityId` and `courseId` match actual document IDs
- Verify doc IDs follow pattern: `{universityId}_{courseId}`

### WhatsApp/Contact Form Not Working
- Make sure `contactSettings/main` exists
- Check that `whatsapp` field is populated
- Test in browser console: `await db.collection('contactSettings').doc('main').get().then(d => console.log(d.data()))`

---

## What's Next?

1. ✅ Firebase setup complete
2. ✅ Collections created
3. ✅ Documents added
4. ⏭️ Test the admin dashboard (manage universities, courses, agents)
5. ⏭️ Add agents and configure referral tracking
6. ⏭️ Configure Cloud Functions for secure account creation
7. ⏭️ Set up email notifications
8. ⏭️ Deploy to production

---

## PHASE 7: Complete Collection Reference

### Agent Account Creation Workflow

When admins create a new agent via the Admin Dashboard:

1. **Admin form** collects: name, email, password, phone, country, referral code, commission structure, status
2. **Password validation** (client-side):
   - Password must be at least 8 characters
   - Password must match confirmation
   - Password strength encouraged (uppercase, lowercase, number, special char)
   - **Password is NEVER stored in Firestore** — only sent to Firebase Auth
3. **Referral code** auto-generated if blank: `{AgentName}_{6-char-random}`
4. **Firebase Auth user created** via secondary Firebase app instance (preserves admin login):
   - Email registered in Firebase Authentication
   - Password hashed and stored securely by Firebase Auth
5. **Firestore `agents/{uid}` document created** with fields:
   - `uid` (string): Firebase Auth UID
   - `userId` (string): Copy of uid for compatibility
   - `name` (string): Agent name
   - `email` (string): Agent email (lowercase)
   - `phone` (string, optional): Phone number
   - `country` (string, optional): Country
   - `role` (string): Always `"agent"`
   - `status` (string): "active" or "inactive"
   - `referralCode` (string): Unique code for tracking referrals
   - `referralUrl` (string): Full URL with referral parameter (e.g., `https://horizons.edu/?ref=AgentName_ABC123`)
   - `commissionStructure` (object): Commission configuration
   - `authUserCreated` (boolean): Always `true` (indicates password was handled via Firebase Auth)
   - `createdAt` (timestamp): Server timestamp
   - `updatedAt` (timestamp): Server timestamp
   - `createdBy` (string): Admin email who created the agent
6. **Firestore `referralLinks/{referralCode}` document created** with fields:
   - `code` (string): The referral code
   - `agentId` (string): uid of the agent
   - `agentEmail` (string): Email of the agent
   - `agentName` (string): Name of the agent
   - `fullUrl` (string): Complete referral URL
   - `status` (string): "active" or "inactive"
   - `createdAt` (timestamp): Server timestamp
   - `createdBy` (string): Admin email

**Why this approach:** Firebase Auth securely manages the password. Agents log in using their email and password. The admin session remains active (secondary app used for Auth). Referral tracking can immediately begin after agent creation.

### Documented Collections (12 Additional)

#### applications
Stores student applications for courses/universities  
**Fields:**
- `studentName` (string): Full name of applicant
- `studentEmail` (string): Contact email
- `studentPhone` (string): Contact phone
- `universityId` (string): Reference to universities doc
- `courseId` (string): Reference to courses doc
- `status` (string): "submitted", "under_review", "approved", "rejected", "enrolled", "withdrawn"
- `applicationDate` (timestamp): When submitted
- `qualifications` (array of strings): Educational background
- `englishScore` (optional, string): IELTS/TOEFL score
- `additionalNotes` (string): Cover letter or notes
- `referralCode` (optional, string): Agent referral code if applicable
- `agentId` (optional, string): uid of referring agent
- `createdAt` (timestamp): Server timestamp
- `updatedAt` (timestamp): Server timestamp

**Document ID:** Auto-generated or user email

#### applicationStatusHistory
Audit log for application status changes  
**Fields:**
- `applicationId` (string): Reference to applications doc ID
- `previousStatus` (string): Status before this change
- `newStatus` (string): Status after this change
- `changedBy` (string): Admin email or "system"
- `reason` (string): Why status changed
- `createdAt` (timestamp): When change occurred

**Document ID:** Auto-generated

#### inquiries
Stores general inquiries and messages from contact form  
**Fields:**
- `name` (string): Visitor name
- `email` (string): Visitor email
- `phone` (string): Visitor phone
- `message` (string): Inquiry message
- `subject` (string): Inquiry subject
- `source` (string): "contact_form", "whatsapp", "email", etc.
- `status` (string): "new", "responded", "resolved"
- `respondedBy` (string, optional): Admin who responded
- `respondedAt` (timestamp, optional): When response sent
- `createdAt` (timestamp): Server timestamp

**Document ID:** Auto-generated

#### students
Core student profile records  
**Workflow:** Students are created manually by admins AFTER reviewing and approving applications. They are NOT auto-created from applications.

**Fields:**
- `uid` (string): Firebase Auth UID of student
- `email` (string): Student email (lowercase)
- `name` (string): Full name
- `phone` (string, optional): Phone number
- `country` (string, optional): Home country
- `dateOfBirth` (string, optional): ISO date format
- `qualifications` (array of strings): Education background
- `englishLevel` (string, optional): IELTS, TOEFL, or self-assessed level
- `enrolledIn` (array of strings): courseOfferings doc IDs student is enrolled in
- `status` (string): "active", "inactive", "graduated", "withdrawn"
- `referralCode` (optional, string): Code of agent who referred them
- `agentId` (optional, string): uid of referring agent
- `createdAt` (timestamp): Server timestamp
- `updatedAt` (timestamp): Server timestamp

**Document ID:** Firebase Auth UID

**Note:** To create a student, admin must manually create the document in Firestore Console or via an admin form (future implementation). Student records link applications to enrollment tracking via `uid` and `agentId` fields.

#### studentStatus
Current status snapshot for each student in each programme  
**Fields:**
- `studentId` (string): Reference to students/{uid}
- `courseOfferingId` (string): Reference to courseOfferings doc
- `status` (string): "applied", "accepted", "enrolled", "on_leave", "graduated", "withdrawn"
- `enrollmentDate` (timestamp): When officially enrolled
- `expectedGraduationDate` (timestamp, optional): Projected completion
- `lastActivityDate` (timestamp): Last login or interaction
- `createdAt` (timestamp): Server timestamp
- `updatedAt` (timestamp): Server timestamp

**Document ID:** Auto-generated or `{studentId}_{courseOfferingId}`

#### studentStatusHistory
Audit trail for student status changes across programmes  
**Fields:**
- `studentId` (string): Reference to students/{uid}
- `courseOfferingId` (string): Reference to courseOfferings doc
- `previousStatus` (string): Prior status
- `newStatus` (string): Current status
- `reason` (string): Why status changed
- `changedBy` (string): Admin email or "system"
- `createdAt` (timestamp): When change recorded

**Document ID:** Auto-generated

#### agents
Agent/partner account profiles (see Agent Account Creation Workflow above)  
**Primary Fields:**
- `uid` (string): Firebase Auth UID (also the document ID)
- `name`, `email`, `phone`, `country` (contact info)
- `referralCode`, `referralUrl` (referral tracking)
- `commissionStructure` (object): Payment structure
- `status` (string): "active" or "inactive"
- `authUserCreated` (boolean): `true` if Firebase Auth account created
- `createdAt`, `updatedAt` (timestamps)

**Document ID:** Firebase Auth UID (not email)

#### referralLinks
Master index of all active referral codes and URLs  
**Fields:**
- `code` (string): The referral code (also the document ID)
- `agentId` (string): uid of the agent
- `agentEmail`, `agentName` (agent contact info)
- `fullUrl` (string): Complete referral URL with parameter
- `status` (string): "active" or "inactive"
- `createdAt` (timestamp): When referral code created
- `createdBy` (string): Admin who created it

**Document ID:** Referral code (e.g., `AgentName_ABC123`)

#### referralVisits
Tracks each time a referral link is visited  
**Fields:**
- `referralCode` (string): Which code was clicked
- `agentId` (string): uid of agent who owns code
- `visitorIp` (string): IP of visitor (for analytics)
- `visitorCountry` (string, optional): Geolocation
- `referer` (string, optional): HTTP referer header
- `userAgent` (string): Browser/device info
- `convertedToApplication` (boolean): Did visit lead to application?
- `applicationId` (string, optional): Reference if conversion occurred
- `createdAt` (timestamp): When visit logged

**Document ID:** Auto-generated

#### whatsappClicks
Tracks WhatsApp button clicks on the site  
**Fields:**
- `visitorEmail` (string, optional): Email if known
- `visitorName` (string, optional): Name if submitted
- `messageText` (string, optional): Pre-filled message sent
- `referralCode` (string, optional): If visitor came via referral
- `pageUrl` (string): Page where button was clicked
- `createdAt` (timestamp): When click recorded

**Document ID:** Auto-generated

#### settings
General application configuration (optional, for future use)  
**Fields:**
- Varies by use case; examples:
  - `categories` (array): Course category names
  - `emailTemplates` (map): Email templates
  - `featureFlags` (map): Feature toggles

**Document ID:** `categories` or specific key name

#### auditLogs
Admin action audit trail for compliance  
**Fields:**
- `action` (string): "create", "update", "delete", "export", etc.
- `collection` (string): Which collection was modified
- `documentId` (string): Which document
- `performedBy` (string): Admin email
- `changes` (object, optional): Before/after values
- `ipAddress` (string, optional): Admin's IP
- `createdAt` (timestamp): When action occurred

**Document ID:** Auto-generated


## All 24 Collections at a Glance

**Public Content (8):**
- courseFolders
- courses
- courseOfferings
- team
- services
- testimonials
- siteSettings
- contactSettings

**Applications & Inquiries (4):**
- applications
- applicationStatusHistory
- inquiries
- settings

**Student Management (3):**
- students
- studentStatus
- studentStatusHistory

**Agents & Referrals (4):**
- agents
- referralLinks
- referralVisits
- whatsappClicks

**Admin System (5):**
- admins
- roles
- permissions
- auditLogs

---

## Field Validation Quick Reference

### Courses Must Have
- ✅ folderId (must match existing courseFolders doc ID)
- ✅ category (derived from folder name)
- ✅ level (Bachelor / Diploma / Masters / Foundation / Other)

### Universities Must Have
- ✅ nextIntakeDate (ISO date format: "2025-09-01")
- ✅ intakeMonths (array of month names)
- ❌ DO NOT include courseOfferings array

### courseOfferings Must Have
- ✅ universityId (references universities doc ID)
- ✅ courseId (references courses doc ID)
- ✅ Document ID format: `uni-001_course-001`

### Admin Document Must Have
- ✅ Document ID must be your email (lowercase)
- ✅ uid field must be your Firebase Auth UID
- ✅ role must be "admin"
- ✅ status must be "active"

---

**Setup Complete!** 🎉  
Your Horizons database is ready for the website.
