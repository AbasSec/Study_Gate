# LOGO CONSISTENCY AUDIT — PHASE 1 FINDINGS
**Date:** May 23, 2026  
**Status:** Complete Logo Implementation Map Created  
**Critical Issues Found:** 2 major inconsistencies

---

## EXECUTIVE SUMMARY

The website has **2 completely different logo implementations**:

1. **Standard Implementation** (7 pages) - Uses `site-logo.js` to load dynamic logo from Firebase
2. **Legacy Implementation** (1 page) - Uses hardcoded logo path, no Firebase integration

This causes the logo to:
- ✅ Display correctly on: `index.html`, `universities.html`, `courses.html`, `services.html`, `team.html`, `contact.html`, `course-detail.html`, `university-detail.html`
- ❌ Display as hardcoded old logo on: `apply.html`
- ⚠️ Display with inconsistent CSS on a few pages

---

## PHASE 1 — COMPLETE LOGO IMPLEMENTATION MAP

### Homepage & Root Pages

#### 1. `index.html` (CORRECT)
**HTML Structure (Lines 174-178):**
```html
<header class="...">
    <div class="flex items-center gap-base">
        <img class="site-logo-img" src="" alt="Horizons Logo" style="display:none; max-height: 56px; max-width: 200px; object-fit: contain;">
        <span class="site-logo-text-only text-headline-md font-headline-md font-bold ...">Horizons</span>
    </div>
    <!-- navigation -->
</header>
```

**JavaScript (Line 396):**
- Loads: `js/site-logo.js`
- Dynamic: ✅ YES - fetches `siteSettings/main.logoUrl` from Firebase

**Current Behavior:**
- ✅ Shows logo + text together
- ✅ No flickering (fixed in recent update)
- ✅ Falls back to text if no logo

**Issues:** None

---

### Public Pages - `/pages/*`

#### 2. `pages/universities.html` (CORRECT)
**HTML (Lines 187-188):**
```html
<img class="site-logo-img text-headline-md font-headline-md font-bold text-on-surface tracking-tight h-8 w-auto" src="" alt="Horizons Logo" style="display:none;">
<span class="site-logo-text-only text-headline-md font-headline-md font-bold text-on-surface tracking-tight">Horizons</span>
```

**JavaScript (Line 307):**
- Loads: `../js/site-logo.js` ✅
- Path: ✅ Correct (../ for /pages/ subdirectory)

**Current Behavior:**
- ✅ Dynamically loads logo from Firebase
- ⚠️ Logo styling includes text classes that don't affect images but clutter code

**Issues:**
- Minor: CSS classes `text-headline-md font-headline-md` don't apply to `<img>` tags, should be removed

---

#### 3. `pages/courses.html` (CORRECT)
**HTML (Lines 163-164):**
```html
<img class="site-logo-img text-headline-md font-headline-md font-bold text-on-surface tracking-tight h-8 w-auto" src="" alt="Horizons Logo" style="display:none;">
<span class="site-logo-text-only text-headline-md font-headline-md font-bold text-on-surface tracking-tight">Horizons</span>
```

**JavaScript (Line 317):**
- Loads: `../js/site-logo.js` ✅

**Issues:**
- Minor: Same as universities.html - text CSS classes on image

---

#### 4. `pages/services.html` (CORRECT)
**HTML (Lines 148-149):**
```html
<img class="site-logo-img text-headline-md font-headline-md font-bold text-on-surface tracking-tight h-8 w-auto" src="" alt="Horizons Logo" style="display:none;">
<span class="site-logo-text-only text-headline-md font-headline-md font-bold text-on-surface tracking-tight">Horizons</span>
```

**JavaScript (Line 284):**
- Loads: `../js/site-logo.js` ✅

**Issues:**
- Minor: Text CSS classes on image

---

#### 5. `pages/team.html` (PARTIALLY CORRECT)
**HTML (Lines 113-114):**
```html
<img class="site-logo-img h-8 w-auto" src="" alt="Horizons Logo" style="display:none;">
<span class="site-logo-text-only text-headline-md font-headline-md font-bold text-on-surface tracking-tight">Horizons</span>
```

**JavaScript (Line 270):**
- Loads: `../js/site-logo.js` ✅

**Issues:**
- ⚠️ Logo image missing text styling classes (inconsistent with other pages - but actually OK since they don't apply to images)
- Logo image has smaller dimensions (`h-8 w-auto`) vs index.html (`max-height: 56px; max-width: 200px`)

---

#### 6. `pages/contact.html` (CORRECT)
**HTML (Lines 150-151):**
```html
<img class="site-logo-img text-headline-md font-headline-md font-bold text-on-surface tracking-tight h-8 w-auto" src="" alt="Horizons Logo" style="display:none;">
<span class="site-logo-text-only text-headline-md font-headline-md font-bold text-on-surface tracking-tight">Horizons</span>
```

**JavaScript (Line 374):**
- Loads: `../js/site-logo.js` ✅

**Issues:**
- Minor: Text CSS classes on image

---

#### 7. `pages/course-detail.html` (CORRECT - BUT WRAPPED IN ANCHOR)
**HTML:**
```html
<div class="flex items-center gap-base">
    <a href="../index.html" class="flex items-center gap-2">
        <img class="site-logo-img h-8 w-auto" src="" alt="Horizons Logo" style="display:none;">
        <span class="site-logo-text-only text-headline-md font-headline-md font-bold text-on-surface tracking-tight">Horizons</span>
    </a>
</div>
```

**JavaScript (line not shown):**
- Loads: `../js/site-logo.js` ✅

**Issues:**
- ⚠️ Logo wrapped in `<a href>` tag - good for UX but creates extra nesting
- Logo image size smaller than homepage (`h-8 w-auto` vs `max-height: 56px`)

---

#### 8. `pages/university-detail.html` (CORRECT - BUT WRAPPED IN ANCHOR)
**HTML:**
```html
<img class="site-logo-img h-8 w-auto" src="" alt="Horizons Logo" style="display:none;">
<span class="site-logo-text-only text-headline-md font-headline-md font-bold text-on-surface tracking-tight">Horizons</span>
```

**JavaScript (line not shown):**
- Loads: `../js/site-logo.js` ✅

**Issues:**
- Same as course-detail.html

---

#### 9. `pages/apply.html` (BROKEN - DIFFERENT IMPLEMENTATION)
**HTML (Lines 977-980):**
```html
<nav class="navbar" id="navbar">
    <div class="container">
        <a href="../index.html" class="nav-logo">
            <img src="../assets/images/logo.png" alt="Horizons Logo">
            <span>Horizons</span>
        </a>
```

**Key Characteristics:**
- Uses completely different navbar structure (`.navbar`, `.container`, `.nav-logo`)
- Logo is **HARDCODED** to `../assets/images/logo.png`
- No `site-logo-img` or `site-logo-text-only` classes
- No `site-logo.js` script loading ❌

**JavaScript:**
- Does NOT load `site-logo.js`
- Logo will NEVER update from Firebase siteSettings

**Issues:**
- 🔴 CRITICAL: Hardcoded logo path
- 🔴 CRITICAL: No Firebase integration
- Users changing logo in admin settings won't see the change on apply.html
- apply.html is a key public page for applications

---

### Admin/Agent Dashboard Pages

#### 10. `admin.html`
**HTML (Line 55):**
```html
<img src="assets/images/logo.png" alt="Logo" class="site-logo-img">
```

**JavaScript (Lines 299, 346-364):**
- Hardcoded logo on page load
- Dynamic update via `loadSidebarLogo()` function called after auth
- Fetches `siteSettings/main.logoUrl` and updates sidebar logo

**Behavior:**
- ✅ Sidebar logo updates to match siteSettings after login
- ⚠️ Brief flash of old logo during load

**Issues:**
- Minor: Shows old logo briefly before loadSidebarLogo() runs

---

#### 11. `agent.html`
**HTML (Line 55):**
```html
<img src="assets/images/logo.png" alt="Logo" class="site-logo-img">
```

**JavaScript:**
- Similar structure to admin.html
- Logo in sidebar should update dynamically

**Issues:**
- Minor: Same brief flash of old logo

---

---

## PHASE 2 ROOT CAUSE ANALYSIS

### ROOT CAUSE #1: apply.html Uses Legacy Navbar Structure

**Why apply.html is different:**
- Likely created at different time or imported from different template
- Uses `.navbar`, `.container`, `.nav-logo` classes instead of Tailwind flexbox
- Has its own CSS styling completely separate from other pages
- Does NOT integrate with Firebase `site-logo.js` script

**Impact:**
- Logo never updates from Firebase siteSettings on apply.html
- When admin changes logo, apply.html still shows old hardcoded logo
- Users applying through apply.html see outdated branding

### ROOT CAUSE #2: Inconsistent Logo Image Sizing

**Size inconsistencies:**
- `index.html`: `max-height: 56px; max-width: 200px`
- `pages/team.html`: `h-8 w-auto` (≈32px)
- `pages/course-detail.html`: `h-8 w-auto` (≈32px)
- `pages/university-detail.html`: `h-8 w-auto` (≈32px)

**Impact:**
- Logo appears different sizes across pages
- Creates inconsistent branding experience
- Some pages show smaller, less prominent logo

### ROOT CAUSE #3: CSS Classes Clutter

**Issue:**
- Multiple pages apply text styling classes to `<img>` tags:
  - `text-headline-md` ❌ doesn't apply to images
  - `font-headline-md` ❌ doesn't apply to images
  - `font-bold` ❌ doesn't apply to images
  - `text-on-surface` ❌ doesn't apply to images

**Why it doesn't break:** CSS ignores classes that don't apply, but it's messy and confusing

### ROOT CAUSE #4: Path Inconsistency Risk

**Current paths:**
- ✅ Root pages: `js/site-logo.js` (relative to root)
- ✅ `/pages/*` pages: `../js/site-logo.js` (correct relative path)
- ⚠️ All pages: image has `src=""` (initially empty, filled by JavaScript)

**Risk:** If site-logo.js fails to load or runs before Firebase initializes, image stays empty with no fallback

---

## SUMMARY TABLE: Logo Implementation Status

| Page | File | Navbar Type | Logo Source | Firebase? | Script | Status |
|---|---|---|---|---|---|---|
| Homepage | index.html | Tailwind flexbox | Firebase siteSettings | ✅ | site-logo.js | ✅ CORRECT |
| Universities | pages/universities.html | Tailwind flexbox | Firebase siteSettings | ✅ | ../site-logo.js | ✅ CORRECT |
| Courses | pages/courses.html | Tailwind flexbox | Firebase siteSettings | ✅ | ../site-logo.js | ✅ CORRECT |
| Services | pages/services.html | Tailwind flexbox | Firebase siteSettings | ✅ | ../site-logo.js | ✅ CORRECT |
| Team | pages/team.html | Tailwind flexbox | Firebase siteSettings | ✅ | ../site-logo.js | ✅ CORRECT |
| Contact | pages/contact.html | Tailwind flexbox | Firebase siteSettings | ✅ | ../site-logo.js | ✅ CORRECT |
| Course Detail | pages/course-detail.html | Tailwind flexbox | Firebase siteSettings | ✅ | ../site-logo.js | ✅ CORRECT |
| University Detail | pages/university-detail.html | Tailwind flexbox | Firebase siteSettings | ✅ | ../site-logo.js | ✅ CORRECT |
| **Apply** | **pages/apply.html** | **Legacy navbar** | **Hardcoded** | **❌ NO** | **(none)** | **❌ BROKEN** |
| Admin Dashboard | admin.html | Admin sidebar | Firebase siteSettings | ✅ | loadSidebarLogo() | ⚠️ WORKING |
| Agent Dashboard | agent.html | Admin sidebar | Hardcoded default | ✅ | loadSidebarLogo() | ⚠️ WORKING |

---

## RECOMMENDATIONS FOR PHASE 3

1. **🔴 CRITICAL**: Update apply.html to use site-logo.js and load dynamic logo
2. **🟡 HIGH**: Standardize logo image sizes across all pages (use `max-height: 56px; max-width: 200px` everywhere)
3. **🟡 HIGH**: Remove text CSS classes from `<img>` tags (they don't apply to images)
4. **🟢 LOW**: Standardize logo HTML structure across all pages (remove unnecessary `<a>` wrapper)
5. **🟢 LOW**: Add error handling to show fallback if Firebase fails to load

---

**Next Steps:** Proceed to PHASE 3 for standardized implementation

