# Horizons Redesign - Quick Start Guide

**Time to start:** 5 minutes  
**First page to redesign:** Homepage  
**Estimated completion:** 4-6 weeks

---

## Step 1: Import Design System (5 minutes)

Every HTML file needs to import the new design system CSS:

### Add to the `<head>` section of each HTML file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- ← ADD THIS LINE FIRST (before styles.css) -->
    <link rel="stylesheet" href="../css/design-system.css">
    
    <!-- Then keep existing styles -->
    <link rel="stylesheet" href="../css/styles.css">
    <link rel="stylesheet" href="../css/mobile-fixes.css">
</head>
```

**Important:** `design-system.css` must come BEFORE other CSS files so that existing styles can override specific design system rules while using the variables.

---

## Step 2: Reference the Color Palette

**Stop using old hex colors.** Use CSS variables instead:

### ❌ OLD (Don't do this)
```css
.button {
  background: #dc2626;      /* Red - old */
  color: white;
}

.card {
  border: 1px solid #dde0ea;
  background: #f9f9fc;
}
```

### ✅ NEW (Do this)
```css
.button {
  background: var(--color-primary);       /* Navy #0f172a */
  color: white;
}

.card {
  border: 1px solid var(--color-border);  /* #e2e8f0 */
  background: var(--color-surface);       /* #f8f9ff */
}
```

---

## Step 3: Update Typography

### ❌ OLD (Don't do this)
```html
<h1 style="font-size: 2.5rem; color: #1e293b;">Welcome</h1>
<p style="font-family: Inter; font-size: 16px;">Paragraph text</p>
```

### ✅ NEW (Do this)
```html
<h1 class="headline-lg">Welcome</h1>
<p class="body-md">Paragraph text</p>
```

**Typography Classes Available:**
- `.display-lg` — 56px headlines
- `.headline-lg` — 32px section headings
- `.headline-md` — 24px subheadings
- `.body-lg` — 18px body text
- `.body-md` — 16px standard text
- `.label-md` — 14px labels (uppercase)
- `.status-pill` — 13px status badges

---

## Step 4: Update Spacing

### ❌ OLD (Don't do this)
```css
.card {
  padding: 20px;
  margin-bottom: 30px;
  gap: 15px;
}
```

### ✅ NEW (Do this)
```css
.card {
  padding: var(--space-lg);        /* 24px */
  margin-bottom: var(--space-lg);  /* 24px */
  gap: var(--space-md);            /* 16px */
}
```

**Spacing Scale:**
- `var(--space-xs)` = 4px
- `var(--space-sm)` = 8px
- `var(--space-md)` = 16px
- `var(--space-lg)` = 24px
- `var(--space-xl)` = 32px
- `var(--space-2xl)` = 48px
- `var(--space-3xl)` = 64px
- `var(--space-5xl)` = 120px (section gaps)

---

## Step 5: Update Component Styles

### Buttons
```html
<!-- ✅ NEW BUTTONS -->
<a href="#" class="btn btn-primary">Primary Action</a>
<a href="#" class="btn btn-secondary">Secondary</a>
<a href="#" class="btn btn-ghost">Ghost Button</a>
<a href="#" class="btn btn-tertiary">Tertiary</a>
```

### Cards
```html
<!-- ✅ NEW CARDS -->
<div class="card">
  <h3 class="headline-md">Card Title</h3>
  <p class="body-md">Card content goes here</p>
</div>
```

### Forms
```html
<!-- ✅ NEW FORMS -->
<form class="form">
  <div class="form-group">
    <label for="name">Your Name</label>
    <input type="text" id="name" />
  </div>
  <button type="submit" class="btn btn-primary">Submit</button>
</form>
```

### Badges
```html
<!-- ✅ NEW BADGES -->
<span class="badge badge-success">Active</span>
<span class="badge badge-primary">New</span>
<span class="badge badge-tertiary">In Progress</span>
<span class="badge badge-error">Error</span>
```

---

## Step 6: Implement a Page

### Example: Homepage Redesign Pattern

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Horizons Educational Agency</title>
    
    <!-- ✅ Add design system first -->
    <link rel="stylesheet" href="css/design-system.css">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="container">
            <a href="#" class="nav-logo">Horizons</a>
            <!-- Navigation items -->
            <a href="#" class="btn btn-primary">Apply now</a>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <h1 class="display-lg">Study abroad is closer than you think</h1>
            <p class="body-lg">From course selection to campus arrival, we guide every step.</p>
            <div class="flex gap-lg">
                <a href="#" class="btn btn-primary">Start your journey</a>
                <a href="#" class="btn btn-ghost">Explore services</a>
            </div>
        </div>
    </section>

    <!-- About Section -->
    <section class="section" style="padding: var(--space-5xl) 0;">
        <div class="container">
            <h2 class="headline-lg">Welcome to Horizons</h2>
            <p class="body-lg">Since 2007, we've helped students succeed.</p>

            <!-- Stat Cards -->
            <div class="grid grid-cols-3 gap-lg" style="margin-top: var(--space-5xl);">
                <div class="card">
                    <h3 class="headline-md">2000+</h3>
                    <p class="body-md">Students Placed</p>
                </div>
                <div class="card">
                    <h3 class="headline-md">150+</h3>
                    <p class="body-md">Partner Universities</p>
                </div>
                <div class="card">
                    <h3 class="headline-md">98%</h3>
                    <p class="body-md">Success Rate</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p class="body-sm">&copy; 2026 Horizons. All rights reserved.</p>
        </div>
    </footer>

    <!-- Scripts (keep existing) -->
    <script src="js/firebase-config.js"></script>
    <script src="js/main.js"></script>
    <script src="js/dark-mode.js"></script>
</body>
</html>
```

---

## Step 7: Critical Preservation Checklist

Before considering a page "done," verify:

### Universities Page (⚠️ CRITICAL)
- [ ] Ranking badge shows QS rank or "Ranking TBA"
- [ ] Each university card has its own countdown timer
- [ ] Countdown shows days + hours (e.g., "45d 12h")
- [ ] Countdown updates hourly
- [ ] Countdown shows "Intake closed" if date passed
- [ ] Countdown removed if no intake date
- [ ] Timers clean up on page unload
- [ ] Filters still work (location, level, fee range)
- [ ] Search still works

### Courses Page (⚠️ CRITICAL)
- [ ] "From X" price displays for courses with multiple offerings
- [ ] Fee filtering works
- [ ] Currency conversion works
- [ ] Course counts accurate
- [ ] Links to university detail work

### University Detail (⚠️ CRITICAL)
- [ ] Shows offering-specific fees (not global prices)
- [ ] Shows offering-specific duration
- [ ] Shows offering-specific intake
- [ ] Course offerings list complete
- [ ] Apply button passes correct uni + course

### All Pages
- [ ] All Firestore data loads
- [ ] All forms submit correctly
- [ ] All links work
- [ ] Dark mode looks good
- [ ] Mobile/tablet/desktop responsive
- [ ] No console errors
- [ ] No missing images

---

## Page Order (Recommended)

Redesign in this order for best efficiency:

1. **Homepage** (index.html) - Establish visual pattern
2. **Universities** (pages/universities.html) - CRITICAL
3. **Courses** (pages/courses.html) - CRITICAL
4. **University Detail** (pages/university-detail.html) - CRITICAL
5. **Login** (pages/login.html or auth page)
6. **Apply** (pages/apply.html)
7. **Contact** (pages/contact.html)
8. **Admin Dashboard** (admin.html)
9. **Agent Dashboard** (agent.html)
10. **Management Pages** (agent management, etc.)
11. **Supporting Pages** (team, services, success stories)

---

## Common Patterns

### Color Scheme
```css
/* Primary (Navy) */
background: var(--color-primary);              /* #0f172a */
color: var(--color-text-primary);              /* #0b1c30 */

/* Secondary (Emerald - Success) */
background: var(--color-secondary);            /* #006c49 */
border: 1px solid var(--color-secondary);

/* Surfaces (Light) */
background: var(--color-surface);              /* #f8f9ff */
background: var(--color-surface-container-low); /* #eff4ff */

/* Borders */
border: 1px solid var(--color-border);         /* #e2e8f0 */

/* Dark Mode */
[data-theme="dark"] {
  background: var(--color-surface);            /* #0f172a */
  color: var(--color-text-primary);            /* #f4f6ff */
}
```

### Card Styling
```css
.card {
  background: var(--color-surface-container-low);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
  transition: all var(--transition-normal);
}

.card:hover {
  border-color: var(--color-outline-variant);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  transform: translateY(-4px);
}
```

### Section Spacing
```css
.section {
  padding: var(--space-5xl) 0;  /* 120px top/bottom */
  gap: var(--space-5xl);        /* 120px between sections */
}

@media (max-width: 768px) {
  .section {
    padding: var(--space-3xl) 0; /* 64px on mobile */
  }
}
```

---

## Dark Mode Support

Every CSS variable has a dark mode variant. The theme toggle sets `data-theme="dark"` on the HTML element.

```css
/* Light mode (default) */
:root {
  --color-surface: #f8f9ff;
  --color-text-primary: #0b1c30;
}

/* Dark mode */
[data-theme="dark"] {
  --color-surface: #0f172a;
  --color-text-primary: #f4f6ff;
}
```

Test dark mode by clicking the theme toggle button. All variables update automatically.

---

## Testing Before Submitting

```bash
# Check for console errors (F12 → Console)
# Check for CSS errors (F12 → Inspector)
# Test on mobile (F12 → Toggle device toolbar)
# Test dark mode (click theme button)
# Verify Firestore loading (check Network tab)
```

---

## Key CSS Files

| File | Purpose | Edit? |
|------|---------|-------|
| `css/design-system.css` | Design tokens & variables | No (Foundation) |
| `css/styles.css` | Page-specific styles | Update with new patterns |
| `css/admin.css` | Admin dashboard styles | Update with new patterns |
| `css/mobile-fixes.css` | Responsive fixes | Keep as-is |

---

## Getting Help

### Design Questions
→ See `REDESIGN_GUIDE.md` for detailed page specs

### Code Pattern Questions
→ Look for HTML/CSS examples in `REDESIGN_GUIDE.md`

### Preservation Questions
→ Check "What's NOT Changing" in `REDESIGN_SUMMARY.md`

### Variable Reference
→ All variables listed in `css/design-system.css` top section

---

## Success Looks Like

✅ Professional, modern appearance  
✅ Consistent typography across all pages  
✅ Unified color palette (Navy/Emerald/Teal)  
✅ Proper spacing using 8px rhythm  
✅ Soft, professional shadows  
✅ All functionality working as before  
✅ Responsive design on all breakpoints  
✅ Dark mode looking good  
✅ No console errors  
✅ Zero Firestore regressions  

---

## Let's Get Started!

1. Open `pages/universities.html` (first critical page)
2. Add design system import to `<head>`
3. Update colors to use CSS variables
4. Update typography classes
5. Update button and card styling
6. Test thoroughly
7. Move to next page

**You've got this! 🚀**
