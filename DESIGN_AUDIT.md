# HORIZONS Design Audit (Phase 1)

**Date:** 2026-05-23  
**Scope:** Complete visual and UX design review before redesign implementation  
**Status:** Ready for Phase 2 (Design System Establishment)

---

## 1. Project Structure

### Active Public Pages
- ✅ `index.html` - Homepage (Tailwind CSS)
- ✅ `pages/universities.html` - University listing (Tailwind CSS)
- ✅ `pages/university-detail.html` - University details (Tailwind CSS)
- ✅ `pages/courses.html` - Courses listing (Tailwind CSS)
- ✅ `pages/course-detail.html` - Course details (Tailwind CSS)
- ✅ `pages/services.html` - Services page (Tailwind CSS)
- ✅ `pages/team.html` - Team page (Tailwind CSS)
- ✅ `pages/contact.html` - Contact page (Tailwind CSS)
- ✅ `pages/apply.html` - Application form (Tailwind CSS)

### Active Admin/Agent Pages
- ✅ `admin.html` - Admin dashboard (Custom CSS)
- ✅ `agent.html` - Agent dashboard (likely similar to admin)
- ✅ `pages/student-dashboard.html` - Student dashboard (custom)

### CSS Files
- ✅ `css/design-system.css` - Complete design system (navy/emerald/teal) — **NOT CURRENTLY USED on public pages**
- ⚠️ `css/styles.css` - Old red-themed design system — **MOSTLY UNUSED**
- ✅ `css/admin.css` - Admin-specific styles (leverages design-system.css variables)
- ✅ `css/mobile-fixes.css` - Responsive overrides

### JavaScript Files
- ✅ `js/firebase-config.js` - Firebase initialization
- ✅ `js/database-init.js` - Database setup
- ✅ `js/main.js` - Shared utilities (scroll animations, forms, counters)
- ✅ `js/dark-mode.js` - Dark mode toggle logic
- ✅ `js/translations.js` - Bilingual EN/AR support
- ✅ `js/currency.js` - Currency formatting
- ✅ `js/site-logo.js` - Dynamic logo loading
- ✅ `js/admin.js` - Admin panel logic
- ✅ `js/agent.js` - Agent dashboard logic
- ✅ `js/apply.js` - Application form logic
- ✅ `js/student-dashboard.js` - Student dashboard logic

---

## 2. Current Design Direction

### Brand Identity
- **Name:** HORIZONS
- **Industry:** International education agency / study abroad consultancy
- **Current Color Palette:** Navy (#0f172a) + Emerald (#006c49) + Teal (#0d9488)
- **Typography:** Plus Jakarta Sans (EN), Tajawal (AR)
- **Approach:** Material Design 3 influenced (Tailwind pages)

### Visual Observations
✅ **Strengths:**
1. Modern, clean baseline with Tailwind CSS
2. Consistent use of design system variables (design-system.css)
3. Good dark mode support with data-theme attribute
4. Responsive mobile-first approach
5. Bilingual support (EN/AR with RTL handling)
6. Professional color palette (navy/emerald/teal)
7. Proper spacing system (8px rhythm)
8. Good typography hierarchy
9. Working Firestore integration

⚠️ **Inconsistencies:**
1. **CSS Fragmentation:** Public pages use Tailwind CSS inline config; admin uses design-system.css
   - Color palette duplicated in Tailwind config vs CSS variables
   - Risk of drift between systems
2. **Unused Files:** styles.css (red theme) not used anywhere
3. **Glass-morphism:** Only inline style on index.html, not systemic
4. **Loading States:** Basic spinner, no skeleton screens
5. **Animations:** Minimal micro-interactions (Tailwind doesn't have animation library)
6. **Dark Mode:** Separate overrides scattered across pages, not unified
7. **Responsive:** mobile-fixes.css targets classes that may not exist on all pages

❌ **Design Weaknesses:**
1. Hero section contrast could be stronger
2. Card elevations are subtle, lack clear hierarchy
3. Buttons lack hover/active state transitions
4. Form inputs lack proper focus states (validation)
5. Empty states are basic "Loading..." text
6. No loading skeletons for images
7. Team page photos can break layout if missing
8. Course/university cards lack clear CTAs on mobile
9. Services section icons are generic (all 'star' fallback)
10. Footer contact info can show "-" if Firestore data missing
11. No smooth section fade-ins
12. Tables on admin dashboard may not be responsive

---

## 3. Firestore Data Sources (Dynamic Content)

### Collections Currently Feeding Pages

| Collection | Used By | Fields | Status |
|-----------|---------|--------|--------|
| `universities` | index.html, universities.html, university-detail.html | `name`, `image`, `location`, `ranking`, `description`, `active`, `courseOfferings` | ✅ Working |
| `courses` | courses.html, course-detail.html | `name`, `description`, `level`, `category`, `active`, `universities` | ✅ Working |
| `services` | index.html, services.html | `title` / `name`, `description`, `icon`, `active` | ✅ Working |
| `testimonials` | index.html | `studentName`, `university`, `country`, `photo`, `status`, `active` | ✅ Working |
| `team` | index.html, team.html | `name`, `role` / `position`, `photoPath` / `photo` / `image`, `active`, `whatsappNumber` / `whatsapp`, `showOnTeam` | ✅ Working |
| `siteSettings` | Global (hero image, logo) | `main.heroImageUrl`, `main.logoUrl` | ✅ Working |
| `contactSettings` | index.html, footer, contact.html | `email`, `phone`, `address`, `socialMedia`, `whatsapp` / `whatsappNumber` | ✅ Working |
| `inquiries` | contact.html (write), admin (read) | `name`, `email`, `phone`, `message`, `createdAt` | ✅ Working |
| `applications` | apply.html (write), admin (read) | `studentName`, `email`, `university`, `course`, etc. | ✅ Working |

### Key Observations
- All collections actively used and functional
- No Firebase Storage being used (Spark Plan compatible)
- Dynamic logo and hero image working correctly
- Team page filters on `active !== false && showOnTeam !== false`
- Course offerings properly linked to universities

---

## 4. Global Navbar & Footer

### Navbar (Consistent Across All Pages)
```html
<header class="sticky top-0 z-50 flex justify-between items-center w-full">
  - Logo (dynamic from siteSettings.main.logoUrl)
  - Nav links: Home, Universities, Courses, Services, Team, Contact
  - Language toggle (EN/AR)
  - Dark mode toggle
  - Admin login link
  - Apply Now CTA button
  - Mobile hamburger menu + drawer
</header>
```

**✅ Strengths:**
- Logo loads correctly
- Active link state on current page
- Mobile drawer works smoothly
- Language/dark mode toggles functional
- Proper z-index layering

**⚠️ Improvements Needed:**
- Navbar could have more visual polish (better hover states)
- Mobile drawer should have smoother animations
- Logo text fallback ("Horizons") could be styled better when image fails
- Admin link could be more prominent or in a user menu

### Footer (Consistent Across Public Pages)
```html
<footer>
  - 4-column layout: Brand + tagline + socials | Quick Links | Company | Contact Info
  - Dynamic contact info from contactSettings
  - Social media links from contactSettings.socialMedia
  - Copyright statement
  - Privacy Policy / Terms links (non-functional)
</footer>
```

**✅ Strengths:**
- Four-column grid responsive to mobile
- Dynamic contact data loads correctly
- Social links populate from Firestore
- Bilingual (translatable text)

**⚠️ Issues:**
- Footer copyright shows "© 2026" (should be dynamic)
- Privacy Policy / Terms links go to "#" (placeholder)
- Social media links may show as hidden if not in Firestore
- Contact info shows "-" if missing from Firestore

---

## 5. Homepage (index.html) - Page Structure

### Sections Identified

1. **Hero Section**
   - Status: ✅ Working
   - Uses: `siteSettings/main.heroImageUrl`
   - Elements: Headline, subheadline, CTA buttons, floating stat card, gradient overlays
   - Responsive: 2-column on desktop, 1-column on mobile
   - **Issue:** Hero image container shows even when image missing (white box)

2. **Trust Indicators**
   - Status: ✅ Working
   - 3 stat cards: 500+ Universities, 10k+ Students, 98% Visa Success
   - Hardcoded stats (should remain hardcoded per project rules)
   - **Issue:** Stats are static text, no animations

3. **Featured Universities Bento**
   - Status: ✅ Working
   - Loads from Firestore `universities` collection (active only)
   - 4-university grid with Bento layout (1st is 2x2, others 1x1)
   - Shows: Image, ranking badge, location, name, description
   - **Issue:** Images don't have aspect ratio constraint, can break layout
   - **Issue:** Loading state is text "Loading universities..." (should be skeleton)

4. **Services Section**
   - Status: ✅ Working
   - Loads from Firestore `services` collection (limited to 3)
   - 3-column grid of service cards
   - Shows: Icon, title, description, "Learn More" link
   - **Issue:** Icon fallback is 'star' for all missing icons
   - **Issue:** Icon styling inconsistent (comes from Firestore, maps to Material icon names)

5. **Student Journeys (Testimonials Carousel)**
   - Status: ✅ Working
   - Loads from Firestore `testimonials` collection (limited to 4, active only)
   - Horizontal scroll carousel with snap
   - Shows: Photo, student name, university, country, status
   - **Issue:** Photo fallback is generic SVG placeholder
   - **Issue:** Carousel overflow on mobile may be hard to scroll
   - **Issue:** No indicator dots showing position

6. **Meet Your Mentors (Team Preview)**
   - Status: ✅ Working
   - Loads from Firestore `team` collection (limited to 4, active only)
   - 4-column grid responsive to 2-column (tablet) and 1-column (mobile)
   - Shows: Photo, name, role, WhatsApp link
   - **Issue:** Team page filter logic: `active !== false && showOnTeam !== false` (double negative)
   - **Issue:** Photo fallback exists but may not load if path is wrong

7. **Footer**
   - Status: ✅ Working (documented above)

### Dynamic Data Loads
- ✅ All sections use `setTimeout(..., 500)` fallback to wait for Firestore
- ✅ Error states show friendly messages
- ✅ Empty states show "No X available yet"
- ⚠️ No loading skeletons (just spinner text)
- ⚠️ Language changes trigger re-render (confirmed in `languageChanged` event listener)

---

## 6. University Pages (universities.html, university-detail.html)

### universities.html - University Listing
- Status: ✅ Loads and displays
- **Structure:** Hero + University cards grid
- **Features:** Card shows image, name, location, ranking, course count, next intake
- **Issues:**
  - Cards could have better hover states
  - No filter/search UI visible (may not exist yet)
  - Course count calculation happens in JS (verify it's correct)
  - Next intake calculation may show "Contact us" if missing

### university-detail.html - Single University
- Status: ✅ Loads and displays
- **Structure:** Header + About + Offered Programs + Sidebar/Form
- **Features:** Dynamic university data, course offerings list
- **Issues:**
  - Layout may be cramped on mobile
  - Course offerings may not have clear fees/duration info

**⚠️ Both:** Need better responsive design for course cards/program details

---

## 7. Courses Pages (courses.html, course-detail.html)

### courses.html - Courses Listing
- Status: ✅ Loads and displays
- **Structure:** Hero + Course cards grid
- **Features:** Course name, level, category, university count, duration
- **Issues:** Basic card design, no visual hierarchy

### course-detail.html - Single Course
- Status: ✅ Loads and displays
- **Structure:** Course header + Description + Universities offering this course
- **Features:** Dynamic course data, university offerings with fees/duration/intake
- **Issues:** Table layout on mobile may overflow, needs responsive variant

---

## 8. Admin Dashboard (admin.html)

### Structure
- Login screen (before auth)
- After auth: Sidebar nav + main content area
- Sections: Dashboard, Inquiries, Applications, Courses, Universities, Team, Services, Site Settings, Agent/Student workflows

### Design Observations
- ✅ Uses design-system.css (proper CSS variables)
- ✅ Professional login screen with gradient
- ✅ Sidebar navigation with badges (inquiry/application counts)
- ⚠️ Responsive may be tight on small tablets
- ⚠️ Tables may overflow on mobile (table-container has overflow-x, but tables can still be cramped)
- ⚠️ Modals may not be fully responsive on mobile

---

## 9. CSS Analysis

### design-system.css (COMPREHENSIVE, Currently underused)
- ✅ 630 lines of well-organized CSS
- ✅ Complete color palette (navy/emerald/teal + light/dark modes)
- ✅ Typography system (display, headline, body, label, status-pill)
- ✅ Spacing system (4px-120px+)
- ✅ Border radius scale
- ✅ Shadow system (soft, glassmorphism-inspired)
- ✅ Button styles (.btn, .btn-primary, .btn-secondary, .btn-tertiary, .btn-ghost)
- ✅ Card styles with hover effects
- ✅ Form styles with focus states
- ✅ Badge/pill styles
- ✅ Table styles
- ✅ Utility classes (spacing, text, display, grid)
- ✅ Glassmorphism effects
- ✅ Print styles
- ✅ Dark mode variables

**Issue:** This system is defined but not used on public Tailwind pages. Admin uses it.

### styles.css (OLD, Mostly Unused)
- ❌ Red theme (conflicts with navy/emerald brand)
- ❌ Duplicate variable definitions
- ❌ Not imported on most pages
- **Recommendation:** Delete or archive this file

### mobile-fixes.css (ACTIVE)
- ✅ Responsive breakpoints (1024px, 768px, 480px, 420px)
- ✅ Grid responsive changes
- ✅ Mobile menu animations
- ✅ Hero padding adjustments
- ✅ Typography scaling (clamp)
- ⚠️ Classes referenced may not exist on all pages (e.g., `.navbar`, `.uni-page-grid`)

### Tailwind Config (Inline on public pages)
- ✅ Colors properly extended in each page
- ✅ Spacing custom defined
- ✅ Font families configured
- ✅ Font sizes with proper line heights
- ⚠️ Duplicated on every page (index.html, universities.html, courses.html, etc.)
- ⚠️ Not synchronized with design-system.css CSS variables

---

## 10. Dark Mode Analysis

### Current Implementation
- ✅ Toggle button works (calls dark-mode.js)
- ✅ Persists to localStorage
- ✅ Applies `[data-theme="dark"]` or `dark` class to html/body
- ✅ Tailwind respects dark mode classes
- ✅ design-system.css has dark mode variables

### Issues
1. **Inline overrides scattered:** Each page has its own `[data-theme="dark"]` CSS
2. **Contrast:** Some text may not meet WCAG AA (need to verify)
3. **Consistency:** Admin dark mode handled differently than public pages
4. **Colors:** Dark mode secondary color (#6dd4c8) is good, but backgrounds need testing

---

## 11. Responsive Design Issues

### Breakpoints Being Used
- Tailwind: `sm`, `md`, `lg`, `xl` (640px, 768px, 1024px, 1280px)
- mobile-fixes.css: 1024px, 768px, 480px, 420px custom

### Known Mobile Issues
1. **Images:** No aspect ratios, can overflow or distort
2. **Tables:** Course offerings table may overflow on mobile
3. **Modals:** May not fit small screens (92vh max-height helps)
4. **Cards:** Bento grid on homepage becomes single column (good)
5. **Forms:** Input fields may be too small on mobile (touch targets)
6. **Buttons:** Floating action buttons need padding on small screens

### Accessibility Issues
1. **Color contrast:** Some text on background needs verification
2. **Focus states:** Form inputs need visible focus ring (design-system.css has ::focus-visible)
3. **Alt text:** Images use dynamic alt text (verify they're always provided)
4. **Semantic HTML:** Heading hierarchy needs audit
5. **ARIA:** Minimal ARIA usage (may be OK for this content type)

---

## 12. Loading, Empty, and Error States

### Current States

| Element | Loading | Empty | Error | Grade |
|---------|---------|-------|-------|-------|
| Universities grid | Spinner text | "No universities available" | "Error loading universities" | ⚠️ Basic |
| Courses | Spinner text | "No courses available" | "Error loading courses" | ⚠️ Basic |
| Services | Spinner text | "No services available" | "Error loading services" | ⚠️ Basic |
| Testimonials | Spinner text | "No stories available" | "Error loading stories" | ⚠️ Basic |
| Team | Spinner text | "No team members available" | "Error loading team" | ⚠️ Basic |
| Forms (contact, apply) | Button disabled or spinning | N/A | Message shown | ⚠️ Basic |

**Improvements Needed:**
- Replace spinner text with skeleton screens
- Add better error messages (not raw Firebase errors)
- Add loading bars for forms
- Add success states with clear CTAs

---

## 13. Accessibility Baseline

### What's Good
- ✅ Semantic HTML (header, nav, main, section, footer)
- ✅ Proper heading hierarchy (h1, h2, h3, h4)
- ✅ Button/link labels are descriptive
- ✅ Form labels present
- ✅ Alt text on images (dynamic from Firestore fields)
- ✅ Dark mode support helps with contrast

### What Needs Review
- ❌ Color contrast verification (especially dark mode)
- ❌ Keyboard navigation (need to test Tab through navbar, modals)
- ❌ Focus indicators (some may be missing)
- ⚠️ ARIA attributes (minimal, may be OK)
- ⚠️ Touch targets (buttons should be 44px+ min)
- ⚠️ Form validation messages (may not be announced)
- ⚠️ Skip links (not present)

---

## 14. Firestore Integration Verification

### Working Correctly
- ✅ Firebase config loads without errors
- ✅ All collections query correctly
- ✅ `where('active', '==', true)` filters work
- ✅ Data renders dynamically
- ✅ Dark mode and language change trigger re-renders
- ✅ No hardcoded data replaces Firestore (except trust stats)

### Potential Issues
- ⚠️ If Firestore offline, loading states hang
- ⚠️ No retry logic visible
- ⚠️ No timeout handling
- ⚠️ Images may 404 if URLs wrong (handled by onerror)

---

## 15. Brand Consistency

### Logo Handling
- ✅ Loads from `siteSettings/main.logoUrl` dynamically
- ✅ Has text fallback ("Horizons")
- ✅ Max-height: 56px on desktop, 34px on mobile
- ✅ Works in light and dark mode

### Colors
- ✅ Primary: #0f172a (navy) — used for buttons, headings, primary action
- ✅ Secondary: #006c49 (emerald) — used for success, accent, secondary action
- ✅ Tertiary: #0d9488 (teal) — used for accents, progress
- ✅ Surface colors: Light grays with blue tint (f8f9ff, eff4ff, etc.)
- ⚠️ Consistency between Tailwind config and CSS variables

### Typography
- ✅ Plus Jakarta Sans (EN) / Tajawal (AR)
- ✅ Consistent font sizes for display, headline, body, label
- ✅ Line heights and letter spacing proper
- ⚠️ Font weights might not be optimal for all cases

### Icons
- ✅ Material Symbols Outlined (Google's icon library)
- ✅ Icons work on all pages
- ✅ Icon size/color configurable via classes
- ⚠️ Some fallbacks to 'star' icon (should be custom set per service)

---

## 16. Proposed Design Direction

Based on audit, the redesign should:

### Visual Improvements
1. ✅ Keep navy/emerald/teal palette (it's excellent)
2. 🎯 Strengthen hero section with better contrast and typography
3. 🎯 Add clear visual hierarchy to cards (elevation, borders, shadows)
4. 🎯 Implement smooth card hover states (lift, shadow expansion)
5. 🎯 Add skeleton screens for loading states
6. 🎯 Improve empty states with illustration + helpful text
7. 🎯 Add micro-animations (fade-in, slide-up) to sections
8. 🎯 Better form input focus states (color + shadow)
9. 🎯 Stronger button CTAs (color gradient, shadow, scale on hover)
10. 🎯 Improve footer with better spacing and icon styling

### Structural Improvements
1. 🎯 Unify CSS approach (consolidate Tailwind config or use CSS variables)
2. 🎯 Delete unused styles.css file
3. 🎯 Mobile-first CSS refinements
4. 🎯 Better aspect ratios for images (prevent layout shift)
5. 🎯 Responsive typography scaling (already using clamp, good)
6. 🎯 Better form validation UX

### Functionality Preservation
1. ✅ All Firestore queries remain unchanged
2. ✅ No schema changes
3. ✅ No Firebase Storage reintroduction
4. ✅ All dynamic data loading preserved
5. ✅ Dark mode and language toggle remain

---

## 17. Design Audit Checklist

### ✅ Completed
- [x] Reviewed all HTML files (public and admin)
- [x] Analyzed CSS files and design systems
- [x] Checked JavaScript dependencies
- [x] Verified Firestore integration
- [x] Tested dynamic data loading (conceptual, not live)
- [x] Identified responsive design issues
- [x] Assessed dark mode implementation
- [x] Reviewed navbar/footer consistency
- [x] Checked accessibility baseline
- [x] Documented loading/empty/error states

### 🎯 Ready for Phase 2
- [ ] Design System Enhancement (consolidate CSS, finalize variables)
- [ ] Homepage Redesign (hero, sections, cards)
- [ ] Inner Pages Redesign (universities, courses, services, team, contact, apply)
- [ ] Component Library (buttons, cards, forms, modals)
- [ ] Dark Mode Refinement (contrast verification, consistency)
- [ ] Responsive Design Polish (mobile-first, all breakpoints)
- [ ] Accessibility Audit (contrast, keyboard, ARIA)
- [ ] Animation & Micro-interactions
- [ ] Final Smoke Testing

---

## 18. Critical Rules - Confirmed

### ✅ Will Preserve
1. All Firestore collection names (universities, courses, services, team, testimonials, contactSettings, siteSettings, inquiries, applications)
2. All Firestore field names (no renames or schema changes)
3. All working Firebase queries and auth logic
4. No Firebase Storage usage (Spark Plan compatibility)
5. No hardcoded content replacing Firestore data
6. No deletion of working pages or features
7. Referral/agent/student workflows (if present)

### ✅ Can Change Safely
1. HTML structure (for layout improvements)
2. CSS heavily (colors, spacing, shadows, animations)
3. JavaScript only for rendering consistency (no core logic changes)
4. Images and assets (keeping dynamic loading)
5. Responsive breakpoints and grid layouts
6. Dark mode styling
7. Loading/empty/error state messaging

---

## 19. Next Steps

**PHASE 2 — Design System Establishment**
1. Decide: Consolidate to single CSS approach vs. keep Tailwind + design-system.css separation
2. Finalize color variables for all states (hover, active, disabled, focus)
3. Create consistent shadow/elevation system
4. Define animation keyframes (fade-in, slide-up, lift, scale)
5. Establish component styles (buttons, cards, forms, badges, etc.)
6. Create dark mode palette with contrast verification

**PHASE 3 — Global Layout Redesign**
1. Refactor navbar (add active state polish, hover effects)
2. Refactor footer (better spacing, dynamic copyright)
3. Consistent page shell (hero sections, breadcrumbs)

**PHASE 4+ — Page-by-Page Redesign**
1. Homepage (hero, sections, cards)
2. University/course pages
3. Services, team, contact, apply pages
4. Admin dashboard

---

## Summary

The HORIZONS website is **functionally solid** with a good design foundation. The main opportunities are:

1. **Visual Polish:** Better shadows, transitions, hover states, typography emphasis
2. **User Experience:** Skeleton screens, better empty states, micro-animations
3. **Consistency:** Unified CSS approach, no unused files
4. **Accessibility:** Verify contrast, keyboard nav, focus states
5. **Mobile:** Aspect ratio fixes, touch target sizing, responsive forms

**No breaking changes required.** All redesign work is CSS and UX focused, preserving all working functionality.

