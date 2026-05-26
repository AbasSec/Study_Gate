# Horizons Database Creation Checklist
**Print this page or keep it open while creating documents in Firebase Console**

---

## PHASE 0: Prerequisites
- [ ] Firebase project created
- [ ] Firestore Database enabled
- [ ] Firebase Auth enabled (Email/Password)
- [ ] Cloud Storage enabled
- [ ] Firebase Auth user created: `abasmust277@gmail.com`
- [ ] **SAVED UID:** `_____________________`

---

## PHASE 1: Deploy Rules
```bash
firebase login
firebase deploy --only firestore:rules
```
- [ ] Rules deployed successfully

---

## PHASE 2: Create Collections

### Collection: `permissions` (8 documents)
- [ ] manage_agents
- [ ] view_analytics
- [ ] manage_students
- [ ] manage_universities
- [ ] manage_courses
- [ ] manage_team
- [ ] manage_contact_settings
- [ ] view_audit_logs

### Collection: `roles`
- [ ] admin (with all 8 permissions)

### Collection: `courseFolders` (3 documents)
- [ ] folder-engineering (name: Engineering, order: 1)
- [ ] folder-business (name: Business, order: 2)
- [ ] folder-sciences (name: Sciences, order: 3)

### Collection: `admins`
- [ ] abasmust277@gmail.com (uid: [YOUR UID], role: admin, status: active)

### Collection: `siteSettings`
- [ ] main (siteName, currency, languages, defaultLanguage, active)

### Collection: `contactSettings`
- [ ] main (email, phone, whatsapp, address, city, country, timezone)
- [ ] Nested: workingHours {start, end, days[]}
- [ ] Nested: socialMedia {facebook, twitter, instagram, linkedin, tiktok, youtube}

### Collection: `courses` (3 documents)
- [ ] course-001 (Bachelor of Computer Science)
  - folderId: `folder-engineering`
  - basePrice: 30000
  - baseDurationYears: 3
  - totalSemesters: 6
- [ ] course-002 (Master of Business Administration)
  - folderId: `folder-business`
  - basePrice: 45000
  - baseDurationYears: 2
  - totalSemesters: 4
- [ ] course-003 (Diploma in Business Administration)
  - folderId: `folder-business`
  - basePrice: 19000
  - baseDurationYears: 2
  - totalSemesters: 4

### Collection: `universities` (2 documents)
- [ ] uni-001 (University of Malaya)
  - ❌ NO courseOfferings array
  - nextIntakeDate: 2025-09-01
  - intakeMonths: [September, February]
- [ ] uni-002 (Universiti Kebangsaan Malaysia)
  - ❌ NO courseOfferings array
  - nextIntakeDate: 2025-02-01
  - intakeMonths: [February, August]

### Collection: `courseOfferings` (5 documents)
- [ ] uni-001_course-001 (UM + BSC)
  - tuitionFee: 30000
  - intakeMonths: [September, February]
- [ ] uni-001_course-002 (UM + MBA)
  - tuitionFee: 45000
  - intakeMonths: [February]
- [ ] uni-001_course-003 (UM + Diploma)
  - tuitionFee: 19000
  - intakeMonths: [September, February]
- [ ] uni-002_course-001 (UKM + BSC)
  - tuitionFee: 28000
  - intakeMonths: [August]
- [ ] uni-002_course-002 (UKM + MBA)
  - tuitionFee: 42000
  - intakeMonths: [February]

---

## PHASE 3: Connect Code
- [ ] `firebase-config.js` updated with your config
- [ ] `firebase deploy --only hosting` successful

---

## PHASE 4: Verification

### Browser Console Tests
```javascript
// Test 1
console.log('Firebase initialized:', !!db); // Should be true

// Test 2
const uniCount = await db.collection('universities').get();
console.log('Universities:', uniCount.size); // Should be 2

// Test 3
const offeringsCount = await db.collection('courseOfferings').get();
console.log('Offerings:', offeringsCount.size); // Should be 5
```

- [ ] Firebase initialized
- [ ] 2 universities found
- [ ] 5 courseOfferings found
- [ ] Can log into admin dashboard
- [ ] Universities page loads
- [ ] Apply form works

---

## PHASE 5: Optional Content (Add Later via Admin)
- [ ] Team members (3+ people)
- [ ] Services (3+ services)
- [ ] Testimonials (3+ testimonials)
- [ ] Success stories (2+ videos)

---

## Key Numbers to Remember
- **25 total collections** (not all created manually)
- **9 in Phase 2** (manually created)
- **4 auto-created by app** (applications, students, inquiries, etc.)
- **12 created by users later** (team, services, testimonials, etc.)

---

## Critical Rules ⚠️
1. ✅ courseFolders MUST exist before courses
2. ✅ courses MUST have folderId matching courseFolders
3. ✅ courseOfferings MUST NOT be nested on universities
4. ✅ courseOfferings doc IDs MUST be `uni-###_course-###`
5. ✅ admin document ID MUST match email (lowercase)
6. ✅ admin.uid MUST be your Firebase Auth UID
7. ✅ All timestamps MUST be server timestamp (not manual)

---

## If Something Goes Wrong

| Problem | Solution |
|---|---|
| "Permission denied" | Deploy rules: `firebase deploy --only firestore:rules` |
| Admin says "unauthorized" | Check `admins/{email}` doc exists with role=admin, status=active |
| Universities don't load | Check Firestore rules deployed + courseFolders exist |
| courseOfferings don't appear | Check doc IDs are `uni-001_course-001` format + universityId/courseId match |
| Can't find my Auth UID | Firebase Console → Authentication → Users → click user → copy UID |

---

**Status:** ___/40 items complete  
**Date Started:** __________  
**Date Completed:** __________  
**Estimated Time:** 60-90 minutes
