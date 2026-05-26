# Horizons Educational Platform - Visual Redesign Guide

**Status:** Phase 3 Complete - Design System CSS Created  
**Foundation:** Stitch Premium Design System (Plus Jakarta Sans, Navy/Emerald/Teal Palette)  
**Last Updated:** 2026-05-20

---

## Quick Reference

### New Design System
- **Font:** Plus Jakarta Sans (import already in `css/design-system.css`)
- **Primary Color:** Navy #0f172a
- **Secondary Color:** Emerald Green #006c49
- **Tertiary Color:** Teal #0d9488
- **Surfaces:** Light #f8f9ff to #ffffff
- **Spacing Unit:** 8px base (multiples: sm=8px, md=16px, lg=24px, xl=32px, 2xl=48px, 3xl=64px, 5xl=120px)
- **Border Radius:** 16px standard (xl), 24px large (2xl), 9999px full (pills)
- **Shadows:** Soft diffused (blur 32px, opacity 4-8%)
- **CSS File:** `css/design-system.css` (contains all variables and utility classes)

### How to Use Design System
```html
<!-- In HEAD of HTML file -->
<link rel="stylesheet" href="../css/design-system.css">
<link rel="stylesheet" href="../css/styles.css">
```

All CSS variables are available:
```css
/* Colors */
color: var(--color-primary);
background: var(--color-surface);
border: 1px solid var(--color-border);

/* Typography */
font-size: var(--font-size-headline-lg);
font-weight: var(--font-weight-semibold);

/* Spacing */
padding: var(--space-lg);
gap: var(--space-md);

/* Shadows & Radius */
box-shadow: var(--shadow-lg);
border-radius: var(--radius-xl);
```

---

## Page-by-Page Redesign Specifications

### 1. HOMEPAGE (index.html)

**Key Changes:**
- Typography: Plus Jakarta Sans, Navy headings
- Color Scheme: Navy primary, light surfaces, emerald accents
- Spacing: 120px section gaps, generous padding
- Hero Section: Navy overlay, white text, clear CTA hierarchy
- Cards: Soft shadows, thin borders, hover lift effect
- Buttons: Navy primary, emerald secondary

**Critical Preservation:**
- Firestore CMS loading for dynamic content
- Newsletter signup functionality
- Translation system (data-translate attributes)
- All existing JavaScript hooks and event listeners

**HTML Pattern Example:**

```html
<!-- Hero Section -->
<section class="hero">
  <div class="container">
    <div class="hero-content">
      <h1 class="headline-lg">Study abroad is closer than you think</h1>
      <p class="body-lg">From course selection to campus arrival, we guide every step.</p>
      <div class="flex gap-md">
        <a href="#" class="btn btn-primary">Start your journey</a>
        <a href="#" class="btn btn-ghost">Explore services</a>
      </div>
    </div>
  </div>
</section>

<!-- About Section with Stat Cards -->
<section class="section">
  <div class="container">
    <h2 class="headline-lg">Welcome to Horizons</h2>
    <p class="body-lg">Since 2007...</p>
    
    <div class="grid grid-cols-3 gap-lg">
      <div class="card">
        <h3 class="headline-md">2000+</h3>
        <p class="body-md">Students Placed</p>
      </div>
      <!-- More cards -->
    </div>
  </div>
</section>
```

**CSS Overrides Needed:**
- Navigation bar styling
- Hero section background and overlay
- Section spacing (120px gaps)
- Card hover effects
- Button styling consistency

---

### 2. UNIVERSITIES PAGE (pages/universities.html)

⚠️ **CRITICAL PRESERVATION REQUIRED**

**What MUST Stay:**
1. **Ranking Badge** - QS rank display with "Ranking TBA" fallback
2. **Per-University Intake Countdown** - Each card has own timer based on university's `nextIntakeDate`
   - Shows: days + hours
   - Updates hourly
   - Handles expired intake ("Intake closed")
   - Cleanup on page unload
   - **NOT a global timer - each university has its own**

**Visual Changes Only:**
- Card design: Thin border, soft shadow, 16px radius
- Filter UI: Plus Jakarta Sans, emerald buttons
- Hero Section: Navy background with gradient overlay
- Spacing: Updated gutters and gaps
- Badges: New status pill styling

**Code Preservation Example:**

```javascript
// KEEP THIS UNCHANGED - Critical functionality
function updateCountdownDisplay(badge, targetDate) {
  const updateTimer = () => {
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const diff = target - now;

    if (diff <= 0) {
      badge.textContent = 'Intake closed';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    const daysEl = badge.querySelector('[data-days]');
    const hoursEl = badge.querySelector('[data-hours]');

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
  };

  updateTimer();
  const interval = setInterval(updateTimer, 3600000);
  countdownIntervals.push(interval);
}

// This cleanup on unload MUST be preserved
window.addEventListener('beforeunload', () => {
  stopAllCountdowns();
});
```

**HTML Pattern - University Card:**

```html
<a href="university-detail.html?id=${uni.id}" class="card uni-card">
  <!-- Logo Section -->
  <div class="uni-logo-wrapper">
    <div class="uni-logo">
      <img src="${uni.logo}" alt="${uni.name}">
    </div>
  </div>

  <!-- Content -->
  <div class="uni-content">
    <h3 class="headline-md">${uni.name}</h3>
    <p class="body-sm location">${uni.location}</p>

    <!-- Metadata Row -->
    <div class="uni-meta flex-between">
      <span class="badge badge-primary">${uni.courseOfferings?.length || 0} Courses</span>
      <span class="badge">${uni.ranking ? `QS #${uni.ranking}` : 'Ranking TBA'}</span>
    </div>

    <!-- Intake Countdown (PER-UNIVERSITY) -->
    ${uni.nextIntakeDate ? `
      <div class="intake-countdown" data-intake-date="${uni.nextIntakeDate.toDate ? uni.nextIntakeDate.toDate().toISOString() : uni.nextIntakeDate}">
        <span class="countdown-value" data-days="0">0</span>d
        <span class="countdown-value" data-hours="0">0</span>h remaining
      </div>
    ` : ''}

    <a href="apply.html?uni=${uni.id}" class="btn btn-primary">Apply Now</a>
  </div>
</a>
```

**CSS for University Cards:**

```css
.uni-card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface-container-low);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
  transition: all var(--transition-normal);
  text-decoration: none;
  color: var(--color-text-primary);
}

.uni-card:hover {
  border-color: var(--color-outline-variant);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  transform: translateY(-4px);
}

.uni-logo-wrapper {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-lg);
}

.uni-logo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: white;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.uni-meta {
  margin: var(--space-md) 0;
  gap: var(--space-md);
}

.intake-countdown {
  background: var(--color-secondary-light);
  color: var(--color-secondary-container);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--font-size-status-pill);
  font-weight: var(--font-weight-status);
  text-align: center;
  margin: var(--space-md) 0;
}

.countdown-value {
  font-family: var(--font-family);
  font-weight: 700;
}
```

---

### 3. COURSES PAGE (pages/courses.html)

⚠️ **CRITICAL PRESERVATION REQUIRED**

**What MUST Stay:**
1. **Pricing Model** - Preserve `courseOfferings` array structure
2. **"From {price}" Logic** - Show minimum price when multiple offerings exist
3. **Multi-offering Support** - Same course can be offered by different universities at different prices
4. **Fee Filtering** - All fee range filters must continue working
5. **Currency Conversion** - Keep currency manager integration

**Visual Changes:**
- Course cards with new styling (borders, shadows, spacing)
- Filter UI update
- Typography upgrade to Plus Jakarta Sans
- Color scheme: Navy headers, emerald buttons

**Code Preservation Example:**

```javascript
// KEEP THIS - Critical pricing logic
function renderCourses(courses) {
  const html = courses.map(course => {
    const minPrice = course.offerings?.length > 0
      ? Math.min(...course.offerings.map(o => o.fee))
      : null;

    return `
      <div class="course-card">
        <h3>${course.name}</h3>
        <p>${course.description}</p>
        ${minPrice ? `<p class="price">From RM ${minPrice.toLocaleString()}</p>` : ''}
        <a href="course-detail.html?id=${course.id}" class="btn btn-primary">View Details</a>
      </div>
    `;
  }).join('');

  document.getElementById('coursesGrid').innerHTML = html;
}
```

**HTML Pattern - Course Card:**

```html
<div class="card course-card">
  <img src="${course.image}" alt="${course.name}" class="course-image">
  
  <div class="course-content">
    <h3 class="headline-md">${course.name}</h3>
    <p class="body-sm">${course.description}</p>
    
    <!-- Show minimum price from offerings -->
    ${minPrice ? `
      <div class="price-badge">
        <span class="label-md">From</span>
        <span class="body-lg">RM ${minPrice.toLocaleString()}</span>
      </div>
    ` : ''}
    
    <div class="course-meta flex-between">
      <span class="badge badge-tertiary">${course.offerings?.length || 0} Universities</span>
      <a href="course-detail.html?id=${course.id}" class="btn btn-primary">View</a>
    </div>
  </div>
</div>
```

---

### 4. UNIVERSITY DETAIL PAGE (pages/university-detail.html)

⚠️ **CRITICAL PRESERVATION REQUIRED**

**What MUST Stay:**
1. **Course Offerings Grid** - Preserve offering-specific pricing display
2. **Fee Display** - Show university-specific fees (not global prices)
3. **Duration Display** - Show offering-specific duration/semesters
4. **Firestore Queries** - Keep `getUniversityWithCourses()` logic

**Visual Changes:**
- Page layout with new spacing
- Offering cards with new styling
- Typography upgrade
- Color scheme consistency

**Code Preservation Example:**

```javascript
// KEEP THIS - Critical data structure
// Each offering can have university-specific fees
async function loadUniversityDetails(uniId) {
  const uni = await getUniversityWithCourses(uniId);
  
  // uni.courseOfferings = [{
  //   courseId: '...',
  //   fees: 25000,
  //   currency: 'MYR',
  //   durationYears: 3,
  //   intake: 'September 2026'
  // }, ...]
  
  renderOfferings(uni.courseOfferings);
}
```

**HTML Pattern - Offering Card:**

```html
<div class="card offering-card">
  <h3 class="headline-md">${offering.courseName}</h3>
  
  <div class="offering-details">
    <div class="detail-row">
      <span class="label-md">Duration</span>
      <span class="body-md">${offering.durationYears} years</span>
    </div>
    
    <div class="detail-row">
      <span class="label-md">Fee</span>
      <span class="body-lg price">${offering.currency} ${offering.fees.toLocaleString()}</span>
    </div>
    
    <div class="detail-row">
      <span class="label-md">Next Intake</span>
      <span class="body-md">${offering.intake}</span>
    </div>
  </div>
  
  <a href="apply.html?uni=${uniId}&course=${offering.courseId}" class="btn btn-primary">Apply Now</a>
</div>
```

---

### 5. APPLY PAGE (pages/apply.html)

**Visual Changes:**
- Form styling with new design system
- Input fields: 1px borders, 12px radius, emerald focus
- Labels: above fields, label-md style
- Buttons: Navy primary, full width CTA
- Section spacing: 120px gaps
- Color scheme: Navy headings, light backgrounds

**Critical Preservation:**
- Form submission logic
- Firestore data saving
- URL parameter prefill (e.g., ?uni=X&course=Y)
- Multi-step form functionality if exists
- All validation logic

**HTML Pattern:**

```html
<section class="form-section">
  <div class="container">
    <h1 class="headline-lg">Apply to Your Chosen University</h1>
    
    <form id="applyForm" class="form">
      <div class="form-group">
        <label for="firstName">First Name *</label>
        <input type="text" id="firstName" required />
      </div>
      
      <div class="form-group">
        <label for="email">Email Address *</label>
        <input type="email" id="email" required />
      </div>
      
      <!-- More fields -->
      
      <button type="submit" class="btn btn-primary btn-full">Submit Application</button>
    </form>
  </div>
</section>
```

**CSS for Form:**

```css
.form {
  max-width: 500px;
  margin: var(--space-5xl) auto;
}

.form-group {
  margin-bottom: var(--space-lg);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-sm);
  font-size: var(--font-size-label-md);
  font-weight: var(--font-weight-label);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-family: var(--font-family);
  font-size: var(--font-size-body-md);
  transition: all var(--transition-fast);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-secondary);
  box-shadow: var(--shadow-focus);
}

.btn-full {
  width: 100%;
}
```

---

### 6. CONTACT PAGE (pages/contact.html)

**Visual Changes:**
- Contact form styling with new design system
- Contact info cards: Navy heading, light backgrounds
- Hero section: Navy background
- Section spacing and layout
- Emerald buttons and accents

**Critical Preservation:**
- Settings loading from Firestore
- WhatsApp integration if exists
- Email submission logic
- Contact information display
- All form submissions

---

### 7. LOGIN PAGE (pages/auth/login.html or similar)

**Visual Changes:**
- Form styling: Center layout, card-based
- Card styling: Thin border, soft shadow
- Button styling: Navy primary
- Typography: Plus Jakarta Sans
- Color scheme: Navy/Emerald

**Critical Preservation:**
- Authentication logic
- Role-based routing (admin vs agent)
- Firebase Auth integration
- Error message handling
- Session management

---

### 8. ADMIN DASHBOARD (admin.html)

**Visual Changes:**
- Sidebar: Navy background, emerald highlights
- Table styling: Clean, minimal, subtle separators
- Metric cards: Navy headings, green accents
- Cards: Thin borders, soft shadows
- Buttons: Navy primary, emerald secondary

**Critical Preservation:**
- All data loading from Firestore
- Real-time updates
- CRUD operations
- Role-based access control
- All management functionality

**Sidebar Pattern:**

```html
<aside class="sidebar">
  <nav class="nav-primary">
    <a href="#" class="nav-item">Dashboard</a>
    <a href="#" class="nav-item">Universities</a>
    <a href="#" class="nav-item">Agents</a>
    <a href="#" class="nav-item">Students</a>
  </nav>
</aside>

<style>
  .sidebar {
    background: var(--color-primary);
    color: white;
    padding: var(--space-lg);
    width: 250px;
  }

  .nav-item {
    display: block;
    padding: var(--space-md);
    color: white;
    text-decoration: none;
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);
  }

  .nav-item:hover,
  .nav-item.active {
    background: var(--color-secondary);
  }
</style>
```

---

### 9. AGENT DASHBOARD (agent.html)

**Visual Changes:**
- Layout: Metric cards, data displays
- Cards: Navy headings, light backgrounds
- Data visualization: Clean, readable
- Button styling: Emerald accents

**Critical Preservation:**
- Role-specific data loading
- Real-time updates
- All agent functionality
- Authentication checks

---

### 10. MANAGEMENT PAGES

**Agent Management, Student Management, Institution Management**

**Visual Changes:**
- Table styling: Clean separators, hover effects
- Action buttons: Styled consistently
- Modal styling: If modals exist
- Form styling: As per form pattern

**Critical Preservation:**
- All CRUD operations
- Data table functionality
- Filtering/sorting if exists
- Modal interactions
- All business logic

---

## Dark Mode Considerations

**All redesigned pages must work in dark mode:**

```css
/* Example dark mode colors */
[data-theme="dark"] {
  --color-surface: #0f172a;
  --color-surface-container-low: #141a31;
  --color-text-primary: #f4f6ff;
  --color-border: #2b3557;
}
```

**Test these specifically:**
- Universities page: Ranking badge visibility
- Course cards: Price display readability
- Forms: Input field contrast
- Tables: Text contrast
- Buttons: Hover states visibility

---

## Implementation Checklist

- [ ] Import design-system.css in all HTML files (before styles.css)
- [ ] Update all headings to use headline-lg, headline-md classes
- [ ] Update all paragraphs to use body-lg, body-md classes
- [ ] Update button classes to use new btn-primary, btn-secondary, btn-ghost
- [ ] Update cards to use card class with border and shadow
- [ ] Update form inputs to use new styling
- [ ] Update spacing to use CSS variables (--space-*)
- [ ] Update colors to use CSS variables (--color-*)
- [ ] Update border radius to use var(--radius-xl), var(--radius-lg), etc.
- [ ] Test dark mode on every page
- [ ] Test responsive design on mobile/tablet/desktop
- [ ] Verify all Firestore loading still works
- [ ] Verify all form submissions still work
- [ ] Verify all filtering/searching still works
- [ ] Test universities page ranking badge and countdown
- [ ] Test courses page "From price" logic
- [ ] Test university detail offering-specific pricing

---

## Testing Checklist

### Functional Tests
- [ ] Homepage loads with CMS data
- [ ] Universities page displays all universities
- [ ] Ranking badges show correctly or display "Ranking TBA"
- [ ] Per-university countdown timers work independently
- [ ] Courses page shows "From X" pricing for multi-offering courses
- [ ] University detail shows offering-specific fees
- [ ] Apply form prefills from URL parameters
- [ ] Contact form submissions work
- [ ] Login authentication works
- [ ] Admin dashboard loads and updates in real-time
- [ ] All management tables load and update

### Design Tests
- [ ] All text uses Plus Jakarta Sans
- [ ] All colors match design system palette
- [ ] All spacing uses 8px rhythm
- [ ] All shadows are soft and diffused
- [ ] All border radius is consistent (16px standard, 24px large, 9999px pills)
- [ ] All buttons have consistent styling and hover states
- [ ] All cards have thin borders and soft shadows
- [ ] All form inputs have consistent styling

### Responsive Tests
- [ ] Desktop layout (1440px) displays correctly
- [ ] Tablet layout (768px) displays correctly
- [ ] Mobile layout (375px) displays correctly
- [ ] No horizontal scrolling on any device
- [ ] Cards stack properly on mobile
- [ ] Forms are usable on all devices
- [ ] Tables have responsive alternative on mobile or scroll

### Dark Mode Tests
- [ ] All pages work in dark mode
- [ ] Text contrast is readable
- [ ] Universities ranking/countdown visible
- [ ] Form inputs visible and usable
- [ ] Tables readable in dark mode
- [ ] Buttons clearly visible

### Performance Tests
- [ ] No console errors
- [ ] No CSS selector errors
- [ ] No JavaScript syntax errors
- [ ] Firestore loading works
- [ ] No broken assets or missing images
- [ ] Page load time acceptable

---

## Next Steps

1. Update all HTML pages to import design-system.css
2. Redesign pages in this order:
   - Homepage
   - Universities page
   - Courses page
   - University detail
   - Login page
   - Apply page
   - Contact page
   - Admin dashboard
   - Agent dashboard
   - Management pages
   - Supporting pages (Team, Services, Success Stories)
3. Test each page thoroughly
4. Run comprehensive final testing
5. Generate completion report
