# STRICT VERIFICATION AUDIT - Critical Issues Found

**Date:** 2026-05-19  
**Status:** MAJOR ISSUES IDENTIFIED  
**Audit Type:** Code-level verification (not assumption-based)

---

## SUMMARY OF CRITICAL FAILURES

Out of 5 major implemented features, **3 are completely non-functional**, and **2 have serious security issues**.

| Feature | Status | Issue |
|---------|--------|-------|
| Admin Account Creation | ❌ BROKEN | No Firebase Auth account created |
| Agent Account Creation | ❌ BROKEN | No Firebase Auth account created |
| Referral Code Capture | ✅ WORKING | localStorage + URL param works |
| Agent Dashboard Reading Apps | ❌ BROKEN | Blocked by Firestore rules |
| Permission Enforcement | ❌ MISSING | Permissions stored but never checked |

---

## ISSUE #1: NO FIREBASE AUTHENTICATION ACCOUNTS CREATED

### The Problem

**File:** `js/database-init.js`, lines 131-163 (createAdminAccount)  
**File:** `js/database-init.js`, lines 166-204 (createAgentAccount)

```javascript
async function createAdminAccount(adminData) {
    // ... validation ...
    const docRef = await db.collection('admins').add(adminRecord);
    return docRef.id;
}
```

**What happens:** Only a Firestore document is created. NO Firebase Auth user.

**Impact:**
- New admin tries to log in at admin.html with email/password
- Firebase Auth looks for user in Auth system
- User doesn't exist → "User not found" error
- **New admin cannot log in**
- Same for agents

### The Missing Code

Neither function calls `auth.createUserWithEmailAndPassword()` which is required to create a Firebase Auth user.

### Why It Matters

Firebase Authentication is required for:
- Storing the password securely
- Session management
- Security token generation
- Permission verification (`request.auth.uid`, `request.auth.token.email`)

Without a Firebase Auth user, the Firestore rules that check `request.auth` will fail.

### Current Flow (Broken)

```
Admin clicks "Create Admin"
→ Form submitted
→ createAdminAccount() called
→ Firestore document created in 'admins' collection ✓
→ NEW admin tries to log in
→ auth.signInWithEmailAndPassword() called
→ Firebase says "User not found" ✗
→ Login fails
```

### Expected Flow

```
Admin clicks "Create Admin"
→ Form submitted
→ createAdminAccount() called
→ Firebase Auth user created ✓
→ Firestore document created ✓
→ NEW admin tries to log in
→ Firebase finds user ✓
→ User sets password / uses Google ✓
→ Login succeeds ✓
```

---

## ISSUE #2: FIRESTORE RULES MISMATCH - New Admins Aren't Recognized

### The Problem

**File:** `firestore.rules`, lines 187-191

```
match /adminAccounts/{accountId} {
  allow read: if isAdminUser();
  create, update, delete: if isAdminUser();
}
```

**File:** `js/admin.js`, line 156

```javascript
const docRef = await db.collection('admins').add(adminRecord);
```

**Mismatch:** Rules define rules for `adminAccounts` collection, but code writes to `admins` collection.

### The isAdminUser() Problem

**File:** `firestore.rules`, lines 12-22

```
function isAdmin(email) {
  return email in [
    'admin@horizons.edu',
    'sassunny555@gmail.com',
    'admin@email.com'
  ];
}

function isAdminUser() {
  return isAuthenticated() && isAdmin(request.auth.token.email);
}
```

**What happens:** isAdminUser() only checks this hardcoded list. It does NOT check the `admins` Firestore collection.

**Impact:**
- Even if a new admin IS created in Firestore
- And even if they somehow get a Firebase Auth account
- Firestore rules won't recognize them as an admin
- They will be blocked from reading/writing most collections
- **New admins are effectively locked out by security rules**

### Current Access Control Flow

```
New Admin logs in
→ Firebase Auth succeeds (IF account created)
→ Admin tries to read courses
→ Firestore rule checks: isAdminUser()?
→ Rule queries hardcoded email list
→ Email not in list ✗
→ "Permission Denied" ✗
```

---

## ISSUE #3: AGENTS CANNOT READ THEIR OWN APPLICATIONS

### The Problem

**File:** `js/agent.js`, lines 215-217

```javascript
const snapshot = await db.collection('applications')
  .where('agentId', '==', agentDocId)
  .get();
```

**File:** `firestore.rules`, lines 94-97

```
match /applications/{document} {
  allow create: if true;
  allow read, update, delete: if isAdminUser();
}
```

**Issue:** Rule only allows admins to read applications. Agents are not mentioned.

**Impact:**
- Agent tries to view their dashboard
- Agent clicks "My Students" tab
- Code queries applications by agentId
- Firestore rule blocks the read
- **Agent sees "Error loading applications"**
- Agent dashboard is non-functional for viewing referred students

### Current Agent Dashboard Flow

```
Agent clicks "My Students"
→ loadStudents() executes
→ Query: applications where agentId == this agent
→ Firestore rule evaluation:
   - Is user authenticated? ✓
   - Is user an admin? ✗
→ "Permission Denied" ✗
→ Error message shown
```

---

## ISSUE #4: PERMISSIONS STORED BUT NEVER ENFORCED

### The Problem

**File:** `js/database-init.js`, lines 139-150 (admin permissions)

```javascript
permissions: adminData.role === 'admin' ? [
    'manage_courses',
    'manage_universities',
    // ... 8 more permissions ...
] : [],
```

These are stored in Firestore as data. But nowhere in the code are they actually checked.

**File:** Search for "permissions" enforcement in admin.js

```bash
$ grep -n "if.*permission\|check.*permission" js/admin.js
# No results
```

**Issue:** Permissions are metadata only. No actual access control.

**Current Reality:**
- New admin created with full permissions (stored in database)
- Stored permissions are never read or checked
- Any admin can do anything (UI just shows everything anyway)
- Agent/influencer roles don't exist yet, but if they did, permission checking is missing

**Example:** If we wanted to restrict an admin to only managing courses:
```javascript
permissions: ['manage_courses']
```

This would be stored but **ignored**. The admin could still delete universities, manage agents, etc.

---

## ISSUE #5: FIRESTORE RULES USE DEPRECATED/INCOMPLETE PATTERNS

### The isAgentUser() Bug

**File:** `firestore.rules`, lines 24-28

```
function isAgentUser() {
  return isAuthenticated() &&
         resource.data.userId == request.auth.uid &&
         resource.data.role == 'agent';
}
```

**Problem:** This tries to access `resource.data` which doesn't exist on CREATE operations.

**Impact:** When Firestore evaluates this rule on a create/write, `resource` is undefined, causing the rule to fail.

---

## VERIFICATION: REFERRAL TRACKING (PARTIALLY WORKING)

### What's Actually Working

1. ✅ `getReferralCodeFromUrl()` correctly gets `?ref=` param from URL
2. ✅ `persistReferralCode()` stores code in localStorage with key `horizons_referral_code`
3. ✅ `getCurrentReferralCode()` retrieves from localStorage
4. ✅ apply.js queries `referralLinks` to resolve agentId
5. ✅ Application document stores agentId

### The Process (Traced)

**Step 1: Agent gets referral URL**
```
Admin creates agent "John Smith"
→ referralCode = "JOHN_ABC123XYZ" (generated)
→ referralUrl = "https://horizons.edu/?ref=JOHN_ABC123XYZ"
→ Stored in agents document ✓
→ Stored in referralLinks document ✓
→ Agent dashboard displays URL ✓
```

**Step 2: Student visits referral link**
```
Student clicks: "https://horizons.edu/?ref=JOHN_ABC123XYZ"
→ index.html loads
→ database-init.js loads (included in index.html) ✓
→ initReferralTracking() called ✓
→ getCurrentReferralCode() returns "JOHN_ABC123XYZ" ✓
→ persistReferralCode() stores in localStorage ✓
→ trackReferralVisit() records visit in Firestore ✓
```

**Step 3: Student navigates to apply page**
```
Student clicks "Apply Now"
→ Navigates to pages/apply.html
→ apply.js loads
→ database-init.js loads (added in previous work) ✓
→ Referral code still in localStorage ✓
```

**Step 4: Student submits application**
```
Student fills form and clicks "Submit"
→ submitApplication() executes
→ getCurrentReferralCode() = "JOHN_ABC123XYZ" ✓
→ Query: referralLinks where code == "JOHN_ABC123XYZ"
→ Gets agentId from result ✓
→ Application document created with agentId ✓
→ Firestore rule allows create (public) ✓
```

**Summary: Referral tracking logic is CORRECT and WORKING**

However, agent cannot VIEW the applications because of Issue #3 (Firestore rules).

---

## VERIFICATION: AUTHORIZATION CHECKS

### Admin Login Flow

**File:** `js/admin.js`, lines 104-120

```javascript
auth.onAuthStateChanged(async user => {
    if (user) {
        const isAuthorized = await checkAdminAuthorization(user);
        if (isAuthorized) {
            showDashboard(user);
        } else {
            auth.signOut();
            showLogin();
            showUnauthorizedError(user.email);
        }
    }
});
```

**What checkAdminAuthorization() does:**

```javascript
async function checkAdminAuthorization(user) {
    // Check hardcoded list
    if (ADMIN_EMAILS.includes(email)) return true;
    
    // Check admins collection
    const snapshot = await db.collection('admins')
        .where('email', '==', email)
        .limit(1)
        .get();
    return !snapshot.empty;
}
```

**Analysis:**
- ✅ Hardcoded list check works
- ✅ Database lookup added (by my changes)
- ❌ But new admins still can't be created (no Firebase Auth)
- ⚠️ Race condition: Function queries admins collection before user's Firestore rules are evaluated
- ⚠️ No permission checking (permissions stored but not used)

---

## THE COMPLETE BROKEN FLOW: End-to-End

### Scenario: Create Admin and Try to Log In

```
Step 1: Original Admin Creates New Admin
├─ Click "Admins" → Works (original admin is in hardcoded list)
├─ Click "+ Add Admin" → Modal opens ✓
├─ Fill: Name="Bob", Email="bob@example.com", Status="Active"
├─ Click "Create Admin"
└─ createAdminAccount() executes
   ├─ Firestore document created ✓
   ├─ NO Firebase Auth user created ✗
   └─ Alert shows "Admin created successfully" (false positive)

Step 2: New Admin Tries to Log In
├─ Go to admin.html
├─ Click "Sign in with Email/Password"
├─ Enter: bob@example.com / (any password)
├─ auth.signInWithEmailAndPassword() called
├─ Firebase Auth system checked
├─ User "bob@example.com" not found in Auth system ✗
└─ Error: "There is no user record corresponding to this identifier"

Result: Cannot log in ❌
```

### Scenario: Admin Creates Agent and Try to See Students

```
Step 1: Admin Creates Agent
├─ Create agent "Alice" with email "alice@example.com"
├─ Agent document created ✓
├─ Referral code generated ✓
├─ Referral link created ✓
└─ Alert shows "Agent created" (correct so far)

Step 2: Agent Tries to Log In
├─ Same as above
├─ No Firebase Auth user exists
└─ Cannot log in ✗

Step 3: (IF Agent could somehow log in)
├─ Agent goes to agent.html
├─ Dashboard loads
├─ Click "My Students"
├─ loadStudents() queries applications where agentId=alice_id
├─ Firestore rule evaluates:
│  ├─ isAdminUser()? No (alice not in hardcoded admin list)
│  └─ Block access ✗
├─ Read fails with "Permission denied"
└─ Error shown: "Error loading applications"

Result: Cannot see students ✗
```

### Scenario: Student Applies (This Actually Works)

```
Step 1: Student Visits Agent's Referral Link
├─ URL: https://horizons.edu/?ref=ALICE_CODE
├─ Home page loads
├─ database-init.js loads
├─ Referral code captured ✓
├─ Stored in localStorage ✓
└─ trackReferralVisit() records visit ✓

Step 2: Student Goes to Apply
├─ Navigates to pages/apply.html
├─ Referral code in localStorage ✓
└─ Continue...

Step 3: Student Fills and Submits
├─ Form submitted
├─ getCurrentReferralCode() retrieves code ✓
├─ agentId resolved from referralLinks ✓
├─ Application created with agentId ✓
├─ Firestore allows create (public) ✓
└─ Success shown ✓

Result: Application attributed to agent ✓
```

**But...**
```
Step 4: Agent Tries to See Their Application
├─ (Can't log in anyway - Issue #1)
└─ Even if they could:
   ├─ Dashboard queries applications by agentId
   ├─ Firestore rules block agent reads
   └─ Cannot see their students ✗
```

---

## COLLECTION NAME MISMATCHES

| Collection Name | Where Used | Firestore Rules | Status |
|---|---|---|---|
| `admins` | Code creates here | Rules check `adminAccounts` | ❌ MISMATCH |
| `agents` | Code uses | Rules reference as 'agents' | ✓ Match |
| `applications` | Code uses | Rules reference as 'applications' | ✓ Match |
| `referralLinks` | Code uses | Rules reference as 'referralLinks' | ✓ Match |

---

## PERMISSION MODEL ISSUES

**Current Implementation:**
```
Admin created
→ Assigned 10 permissions in Firestore document
→ Permissions array: ['manage_courses', 'manage_universities', ...]
→ Permissions NEVER READ by code
→ Permission checking COMPLETELY MISSING
→ No access control based on permissions
```

**Reality:**
- All admins in the hardcoded ADMIN_EMAILS list have full access
- No partial admin roles exist
- No permission checking in code anywhere
- Stored permissions are dead code

---

## WHAT ACTUALLY WORKS

1. ✅ **Referral Code Generation** - Random, unique, properly formatted
2. ✅ **Referral URL Creation** - Uses `window.location.origin` (correct)
3. ✅ **Referral Code Capture** - localStorage + URL param (correct)
4. ✅ **Referral Persistence** - localStorage survives navigation (correct)
5. ✅ **Application Linking** - agentId properly resolved and stored
6. ✅ **Firestore Basic Rules** - Public content readable, admin-only restricted
7. ✅ **Original Admin Auth** - Hardcoded admins can still log in

---

## WHAT'S BROKEN

1. ❌ **New Admin Creation** - No Firebase Auth account created
2. ❌ **New Agent Creation** - No Firebase Auth account created
3. ❌ **Agent Application Visibility** - Blocked by Firestore rules
4. ❌ **Permission Enforcement** - Permissions stored but never checked
5. ❌ **Firestore Rules** - Hardcoded admin list in rules (doesn't include new admins)
6. ❌ **Collection Naming** - Rules use `adminAccounts`, code uses `admins`
7. ⚠️ **Error Handling** - Creates show success alerts even when they can't log in later

---

## ROOT CAUSES

1. **Frontend-only limitation**: Firebase Auth doesn't allow creating users from frontend. Requires backend (Cloud Functions, Admin SDK, etc.)

2. **Security rules too restrictive**: `isAdminUser()` checks hardcoded list instead of database

3. **Over-scoped implementation**: Tried to implement admin account creation without the backend infrastructure needed

4. **No integration testing**: Changes made without testing actual login/access flows

5. **Assumption-based approach**: Previous report assumed things worked without verifying actual code execution

---

## FILES THAT NEED CHANGES

1. ❌ `firestore.rules` - Multiple issues:
   - Collection name mismatch
   - Admin list hardcoded
   - No agent read permissions
   - Fix isAgentUser() bug

2. ❌ `js/database-init.js` - Current approach won't work:
   - createAdminAccount() doesn't create Auth users
   - createAgentAccount() doesn't create Auth users
   - Need new approach or backend implementation

3. ⚠️ `js/admin.js` - Needs updates:
   - createAdminAccount alert is misleading
   - Should include backend call or new flow
   - checkAdminAuthorization logic is good but incomplete

4. ⚠️ `admin.html` - UX issue:
   - Suggests new admins can log in immediately
   - Actually they cannot

---

## RECOMMENDED SOLUTIONS

### Option A: Backend Cloud Functions (Recommended)

Create Cloud Functions that:
1. Accept email from admin frontend
2. Use Admin SDK to create Firebase Auth user
3. Create Firestore document
4. Return confirmation to frontend

Pros:
- Secure (credentials never sent to frontend)
- Proper authentication
- Can send verification emails
- Scalable

### Option B: Invitation Link Flow

1. Admin creates admin record
2. System generates invitation token
3. Invitation link sent to new admin email
4. New admin clicks link and sets password
5. Firebase account created
6. Redirect to login

Pros:
- No backend needed
- Email verification built-in
- Industry standard

### Option C: Manual Password Creation

1. Admin creates record
2. Admin manually creates temporary password
3. New admin logs in and must change password
4. Frontend: Allow password signup without pre-existing Auth user

Pros:
- Simple UI
- No backend needed

Cons:
- Not secure (exposing passwords in UI)
- Manual process

### Option D: Google/OAuth Only

Allow only Google sign-in, no email/password. Skip the account creation step entirely - just add to database.

Pros:
- Simple
- Secure

Cons:
- Limited flexibility

---

## VERIFICATION CHECKLIST - WHAT FAILED

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| New admin can log in immediately | ✓ Yes | ✗ No - No Firebase Auth user | ❌ FAIL |
| New agent can log in immediately | ✓ Yes | ✗ No - No Firebase Auth user | ❌ FAIL |
| Admin sees all admins in table | ✓ Yes | ✓ Yes - Firestore query works | ✅ PASS |
| New admin recognized by Firestore rules | ✓ Yes | ✗ No - Not in hardcoded list | ❌ FAIL |
| Agent can view own applications | ✓ Yes | ✗ No - Blocked by rules | ❌ FAIL |
| Permissions are enforced | ✓ Yes | ✗ No - Never checked | ❌ FAIL |
| Referral code captured on home page | ✓ Yes | ✓ Yes - Verified in code | ✅ PASS |
| Referral code persists to apply page | ✓ Yes | ✓ Yes - localStorage works | ✅ PASS |
| Application linked to agent | ✓ Yes | ✓ Yes - agentId stored | ✅ PASS |
| Referral URL uses real domain | ✓ Yes | ✓ Yes - window.location.origin | ✅ PASS |

**Score: 5 passing, 5 failing (50%)**

