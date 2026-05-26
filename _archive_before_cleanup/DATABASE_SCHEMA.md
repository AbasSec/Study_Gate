# Horizons - Database Schema Documentation

This document defines the Firestore database structure for the Horizons Educational Agency platform.

---

## Collections Overview

### Public Content Collections (Read by all, Written by admins)

#### 1. **universities**
Stores information about partner universities.

```javascript
{
  id: string,                    // Document ID
  name: string,                  // University name
  shortCode: string,             // Short code (e.g., "UTM")
  logo: string,                  // Logo image path
  location: string,              // Location (e.g., "Kuala Lumpur, Malaysia")
  description: string,           // About the university
  website: string,               // University website URL
  ranking: number,               // University ranking (optional)
  intakeDate: string,            // Next intake date (ISO format)
  courseOfferings: array,        // Array of course offering references
  active: boolean,               // Active/inactive status
  order: number,                 // Display order
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string              // Admin email
}
```

#### 2. **courses**
Master list of all courses offered.

```javascript
{
  id: string,                    // Document ID
  courseId: string,              // Global course ID (for linking across universities)
  name: string,                  // Course name
  description: string,           // Course description
  level: string,                 // "Bachelor", "Diploma", "Masters", "Foundation", "Other"
  category: string,              // "IT", "Engineering", "Business", etc.
  basePrice: number,             // Base price (if any)
  baseCurrency: string,          // "MYR", "USD", etc.
  baseDurationYears: number,     // Standard duration in years
  totalSemesters: number,        // Standard number of semesters
  image: string,                 // Course image path
  active: boolean,
  order: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 3. **courseOfferings**
University-specific course offerings with pricing and details.

```javascript
{
  id: string,                    // Document ID
  universityId: string,          // Reference to university
  courseId: string,              // Reference to course (by Firestore document ID)
  courseGlobalId: string,        // Global course ID for cross-reference
  fees: number,                  // University-specific fee
  currency: string,              // "MYR", "USD", etc.
  durationYears: number,         // Duration for this offering
  semesters: number,             // Number of semesters
  intake: array,                 // Array of intake dates ["January", "September"]
  availability: string,          // "Open", "Closed", "Limited"
  notes: string,                 // Additional notes
  active: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 4. **services**
Services offered by Horizons.

```javascript
{
  id: string,
  name: string,                  // Service name
  description: string,           // Service description
  icon: string,                  // Icon class or path
  order: number,
  active: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 5. **successStories** / **testimonials**
Success stories and student testimonials.

```javascript
{
  id: string,
  type: string,                  // "testimonial" or "success-story"
  studentName: string,           // Student name
  university: string,            // University name
  country: string,               // Country (optional)
  description: string,           // Testimonial text or story
  image: string,                 // Profile/thumbnail image
  videoUrl: string,              // TikTok/Instagram/YouTube URL (optional)
  featured: boolean,             // Whether to feature this
  order: number,
  active: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 6. **team**
Team members and staff.

```javascript
{
  id: string,
  name: string,                  // Team member name
  role: string,                  // Job title/role
  bio: string,                   // Short bio
  image: string,                 // Profile image
  email: string,                 // Email (optional)
  phone: string,                 // Phone number (optional)
  whatsapp: string,              // WhatsApp link/number (optional)
  linkedin: string,              // LinkedIn profile (optional)
  twitter: string,               // Twitter handle (optional)
  instagram: string,             // Instagram handle (optional)
  order: number,
  active: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 7. **contactSettings**
Central contact information managed by admin.

```javascript
{
  id: "main",                    // Single document ID
  email: string,                 // Primary email
  phone: string,                 // Primary phone
  whatsapp: string,              // WhatsApp number with country code
  address: string,               // Office address
  city: string,
  country: string,
  timezone: string,              // Timezone for office hours
  workingHours: {
    start: string,               // "09:00"
    end: string,                 // "18:00"
    days: array                  // ["Monday", "Tuesday", ..., "Friday"]
  },
  socialMedia: {
    facebook: string,
    twitter: string,
    instagram: string,
    linkedin: string,
    tiktok: string,
    youtube: string
  },
  updatedAt: timestamp,
  updatedBy: string              // Admin email
}
```

#### 8. **settings**
Global platform settings.

```javascript
{
  id: "main",
  brandName: string,             // "Horizons"
  tagline: string,
  logo: string,
  favicon: string,
  defaultLanguage: string,       // "en" or "ar"
  supportedLanguages: array,     // ["en", "ar"]
  timezone: string,
  currency: string,              // Default currency
  updatedAt: timestamp,
  updatedBy: string
}
```

---

### User & Application Collections

#### 9. **applications**
Student application submissions.

```javascript
{
  id: string,
  referralCode: string,          // Which agent referred this student (if any)
  studentName: string,
  studentEmail: string,
  studentPhone: string,
  studentCountry: string,
  university: string,            // University applied to
  course: string,                // Course applied for
  qualifications: string,        // Academic background
  message: string,               // Student message
  status: string,                // "submitted", "under-review", "approved", "rejected"
  notes: string,                 // Admin notes
  attachments: array,            // File paths if any
  ipAddress: string,             // For fraud detection
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 10. **inquiries**
Contact form submissions.

```javascript
{
  id: string,
  name: string,
  email: string,
  phone: string,
  country: string,
  interestedCourse: string,
  message: string,
  status: string,                // "new", "contacted", "closed"
  notes: string,
  referralCode: string,          // If they came via agent link
  createdAt: timestamp,
  updatedAt: timestamp,
  respondedAt: timestamp         // When admin responded
}
```

---

### Agent / Influencer System

#### 11. **agents**
Agent and influencer accounts.

```javascript
{
  id: string,
  userId: string,                // Firebase Auth UID
  role: string,                  // "agent" or "influencer"
  email: string,                 // Email for login
  name: string,                  // Agent name
  country: string,               // Country of residence
  phone: string,                 // Contact phone
  whatsapp: string,              // WhatsApp contact
  referralCode: string,          // Unique referral code (e.g., "AGENT_ABC123")
  referralUrl: string,           // Full referral URL
  bio: string,                   // Agent biography
  image: string,                 // Profile image
  contractStartDate: string,     // ISO date
  contractEndDate: string,       // ISO date (optional)
  commissionStructure: {
    type: string,                // "percentage" or "fixed"
    value: number,               // 15 (for %), or 500 (fixed amount)
    currency: string             // "MYR", "USD"
  },
  status: string,                // "active", "inactive", "suspended"
  permissions: array,            // ["view_students", "view_own_analytics", ...]
  metadata: object,              // Any additional data
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string              // Admin email
}
```

#### 12. **referralLinks**
Tracking referral links issued to agents.

```javascript
{
  id: string,
  agentId: string,               // Reference to agent
  code: string,                  // Short referral code (e.g., "AGENT_ABC123")
  fullUrl: string,               // Full referral URL
  status: string,                // "active", "inactive"
  expiryDate: string,            // ISO date (optional)
  createdAt: timestamp,
  createdBy: string              // Admin
}
```

#### 13. **referralVisits**
Tracks visits through referral links.

```javascript
{
  id: string,
  agentId: string,               // Which agent's link was used
  referralCode: string,          // The code used
  visitorId: string,             // Anonymous visitor ID (from localStorage)
  sessionId: string,             // Browser session ID
  timestamp: timestamp,
  page: string,                  // Page visited
  source: string,                // Direct referral link or shared
  userAgent: string,             // Browser info
  ipAddress: string,             // IP (hashed for privacy)
  countryCode: string            // Detected country
}
```

#### 14. **whatsappClicks**
Tracks WhatsApp CTA clicks attributed to referral sources.

```javascript
{
  id: string,
  agentId: string,               // If clicked via agent's referral
  referralCode: string,          // Referral code if applicable
  visitorId: string,             // Visitor ID
  timestamp: timestamp,
  page: string,                  // Page where clicked
  userAgent: string,
  ipAddress: string
}
```

---

### Student & Application Management

#### 15. **students**
Student records (created from applications with agent attribution).

```javascript
{
  id: string,
  agentId: string,               // Referring agent (if any)
  referralCode: string,          // How they were referred
  applicationId: string,         // Link to original application
  name: string,
  email: string,
  phone: string,
  country: string,
  interestedUniversities: array, // List of university IDs
  interestedCourses: array,      // List of course IDs
  status: string,                // See studentStatus collection
  notes: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  attributedAt: timestamp        // When agent attribution was set
}
```

#### 16. **studentStatus**
Application status records for each student.

```javascript
{
  id: string,
  studentId: string,             // Reference to student
  status: string,                // "Applied", "Enrolled", "Finding_Course", "Visa_Stage", "Waiting_Commission"
  stage: number,                 // Workflow stage number
  setAt: timestamp,
  setBy: string,                 // Admin email
  notes: string,
  reason: string                 // Why status was set
}
```

#### 17. **studentStatusHistory**
Audit trail of all status changes.

```javascript
{
  id: string,
  studentId: string,
  fromStatus: string,
  toStatus: string,
  changedAt: timestamp,
  changedBy: string,             // Admin email
  notes: string
}
```

---

### Admin System

#### 18. **adminAccounts**
Admin user accounts and permissions.

```javascript
{
  id: string,
  userId: string,                // Firebase Auth UID
  email: string,
  name: string,
  role: string,                  // "super_admin", "admin", "moderator"
  permissions: array,            // List of permission IDs
  status: string,                // "active", "inactive"
  lastLogin: timestamp,
  createdAt: timestamp,
  createdBy: string,
  updatedAt: timestamp,
  updatedBy: string
}
```

#### 19. **roles**
Role definitions with permission mappings.

```javascript
{
  id: string,
  name: string,                  // "Super Admin", "Admin", "Moderator"
  description: string,
  permissions: array,            // Array of permission IDs
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 20. **permissions**
Permission definitions.

```javascript
{
  id: string,
  name: string,                  // "manage_agents"
  description: string,           // "Create, edit, and delete agent accounts"
  category: string,              // "agents", "content", "analytics"
  createdAt: timestamp
}
```

#### 21. **auditLogs**
System audit trail for compliance and debugging.

```javascript
{
  id: string,
  action: string,                // "created", "updated", "deleted"
  entityType: string,            // "agent", "student", "course", etc.
  entityId: string,
  changes: object,               // {fieldName: {from: old, to: new}}
  performedBy: string,           // Admin email
  timestamp: timestamp,
  ipAddress: string,
  details: string
}
```

---

## Data Relationships

### Referral Attribution Flow

```
referralLinks (agent's link) 
    ↓
referralVisits (visitor uses link)
    ↓
whatsappClicks (optional: user clicks WhatsApp)
    ↓
applications (user submits application)
    ↓
students (record created with agentId)
    ↓
studentStatus (tracks workflow)
```

### Course-University Relationship

```
universities (has array of courseOfferings)
    ↓
courseOfferings (many-to-many link)
    ↓
courses (master course list)
```

### Agent Permission Model

```
agents (has permissions array)
    ↓
Can view:
  - Own profile and referral links
  - Own referral analytics
  - Students attributed to them (limited fields)
    ↓
Cannot:
  - Edit students
  - View global settings
  - Edit other agents
```

---

## Migration Notes

### From Previous Schema

1. **courseOfferings**: New collection to replace course pricing in universities
2. **agents**: New collection for influencer management
3. **referralLinks, referralVisits, whatsappClicks**: New tracking collections
4. **students, studentStatus, studentStatusHistory**: New student management system
5. **contactSettings**: Extracted from hardcoded values
6. **adminAccounts, roles, permissions**: New RBAC system

### Existing Collections Kept

- universities (enhanced with intakeDate, ranking)
- courses (enhanced with courseId global ID)
- applications (added referralCode, ipAddress)
- inquiries (added referralCode)
- testimonials/successStories (added videoUrl)
- team (added social links)
- services, settings, courseFolders (unchanged structure)

---

## Initialization Steps

1. Manually create collections in Firebase Console (optional - Firestore auto-creates on first write)
2. Run initialization scripts to create initial documents
3. Update Firestore rules (see firestore.rules file)
4. Test security rules with different user roles
5. Populate seed data for testing

---

## Indexes Required

The following composite indexes should be created for performance:

```
- agents (status, createdAt)
- referralVisits (agentId, timestamp)
- whatsappClicks (agentId, timestamp)
- applications (status, createdAt)
- inquiries (status, createdAt)
- students (agentId, status)
- studentStatus (studentId, setAt)
- auditLogs (entityType, timestamp)
```

Note: Firestore will prompt to create indexes automatically when needed.

---

## Best Practices

1. **Consistency**: Always use `createdAt` and `updatedAt` timestamps
2. **Audit Trail**: Use `createdBy` and `updatedBy` fields for admin actions
3. **Soft Deletes**: Use `active` field instead of hard deletes where possible
4. **References**: Use document IDs for references, not copies of data
5. **Timestamps**: Use `firebase.firestore.FieldValue.serverTimestamp()` for server time
6. **Subcollections**: For applications/inquiries related to students, consider subcollections if data grows large

---

