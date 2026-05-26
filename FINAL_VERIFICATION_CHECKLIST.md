# HORIZONS Website Redesign — Final Verification Checklist
**PHASE 13-14 Ready**  
**Status:** Design system complete. All pages import enhanced CSS.  
**Ready to test:** All 30 smoke test points + responsive + dark mode

---

## Quick Status

✅ **PHASE 2:** Design system enhanced (shadows, animations, transitions, dark mode)  
✅ **PHASE 3:** Component library created (15+ styled components)  
✅ **PHASE 4:** Navbar/footer redesigned and styled  
✅ **PHASE 5:** Homepage redesigned with better card rendering  
✅ **CSS Imported:** All 9 public pages now load design-system.css + components.css  
✅ **Firebase Preserved:** All Firestore queries, collections, fields unchanged  
✅ **Dark Mode:** All components have dark mode color variants  
✅ **Responsive:** Mobile-first CSS with breakpoints at 320px, 480px, 768px, 1024px, 1440px

---

## Smoke Test — 30 Points

### Public Pages Load Correctly

#### Homepage (index.html)
- [ ] Page loads without errors
- [ ] Hero section displays with image from Firestore
- [ ] Trust stat cards ("500+ Universities", "10k+ Students", "98% Visa Success") visible
- [ ] Featured universities grid loads and displays
- [ ] Service cards display with icons and hover effects
- [ ] Student journeys carousel loads and scrolls
- [ ] Team preview cards load with WhatsApp links
- [ ] Footer loads contact info from Firestore
- [ ] WhatsApp floating button appears

#### Universities (pages/universities.html)
- [ ] Page loads without errors
- [ ] University cards display from Firestore
- [ ] Course count shows on each card
- [ ] Next intake or "Contact us" shows correctly
- [ ] Click links work (nav to detail page)

#### Courses (pages/courses.html)
- [ ] Page loads without errors
- [ ] Course cards display from Firestore
- [ ] University count shows on each card
- [ ] Detail page links work

#### Services (pages/services.html)
- [ ] Page loads without errors
- [ ] Service cards display from Firestore
- [ ] Icons render correctly
- [ ] Description text visible

#### Team (pages/team.html)
- [ ] Page loads without errors
- [ ] Team member cards display from Firestore
- [ ] Photos load (or fallback placeholder)
- [ ] WhatsApp links present and clickable

#### Contact (pages/contact.html)
- [ ] Page loads without errors
- [ ] Contact form present
- [ ] Contact info from Firestore displays
- [ ] Form submit works (creates Firestore inquiries doc)

#### Apply (pages/apply.html)
- [ ] Page loads without errors
- [ ] Application form present
- [ ] Form fields render correctly
- [ ] Submit works (creates Firestore applications doc)
- [ ] No Firebase Storage upload attempts

### Navigation & Functionality

#### Navbar
- [ ] Logo loads from siteSettings/main.logoUrl
- [ ] Nav links work (Home, Universities, Courses, Services, Team, Contact)
- [ ] Active link shows on current page
- [ ] Admin Login link works

#### Footer
- [ ] Consistent across all pages
- [ ] Contact info from Firestore displays
- [ ] Social links load from Firestore
- [ ] Links work (Quick Links, Company)

#### Language Toggle
- [ ] EN/AR toggle works
- [ ] Page re-renders in selected language
- [ ] Tajawal font applies to Arabic text

#### Dark Mode Toggle
- [ ] Dark mode toggle button works
- [ ] All text readable in dark mode
- [ ] Card backgrounds adjust for dark mode
- [ ] Settings persist (localStorage)

#### Mobile Menu
- [ ] Hamburger menu appears on mobile
- [ ] Menu opens/closes smoothly
- [ ] Links clickable and close menu
- [ ] Menu position doesn't overlap content

---

## Responsive Design Verification

Test on these widths (using browser DevTools):

### 320px (Small Phone)
- [ ] No horizontal scroll
- [ ] Text doesn't overflow
- [ ] Images scale properly
- [ ] Buttons full width
- [ ] Navbar menu button visible
- [ ] Cards single column

### 375px (iPhone-size)
- [ ] Content readable
- [ ] Form inputs usable
- [ ] Cards display clearly

### 480px (Tablet Portrait)
- [ ] 2-column grids work
- [ ] Form layout proper
- [ ] Footer columns stack

### 768px (Tablet)
- [ ] 3-column grids display
- [ ] Desktop navbar visible (not hamburger)
- [ ] Cards 2-3 column layout

### 1024px (Laptop)
- [ ] Full 3-4 column grids
- [ ] All desktop features visible
- [ ] Proper spacing

### 1440px (Desktop Large)
- [ ] Content centered with max-width
- [ ] Full layout width used
- [ ] Spacing balanced

---

## Dark Mode Verification

Toggle dark mode on each page:

### Color Contrast ✓
- [ ] Text on surface backgrounds readable (WCAG AA)
- [ ] Buttons have good contrast
- [ ] Links distinguishable from body text
- [ ] Form inputs visible (not white on white)
- [ ] Card borders visible

### Component Colors ✓
- [ ] Navbar background dark
- [ ] Footer background dark
- [ ] Cards darker shade (not light)
- [ ] Badges have dark mode colors
- [ ] Form fields styled for dark mode
- [ ] Status spinners visible

### No White-on-White ✓
- [ ] No text disappears in dark mode
- [ ] No invisible buttons
- [ ] No invisible form fields
- [ ] All colors have dark variants

---

## Accessibility Verification

### Keyboard Navigation
- [ ] Tab through navbar links
- [ ] Tab through footer links
- [ ] Tab through form inputs
- [ ] Focus indicators visible (green outline)

### Form Accessibility
- [ ] Form labels present (not just placeholders)
- [ ] Form inputs have focus states
- [ ] Error messages clear (in words, not just color)

### Image Alt Text
- [ ] All images have alt text (or empty if decorative)
- [ ] Alt text describes content

### Heading Hierarchy
- [ ] H1 once per page
- [ ] H2 for sections
- [ ] H3/H4 for subsections
- [ ] Not skipping levels

### Color Contrast (Tool)
- [ ] Run automated contrast checker
- [ ] All text WCAG AA minimum
- [ ] Prefer AAA where possible

---

## Firestore Integration Tests

### Collections Loading
- [ ] Universities collection loads
- [ ] Courses collection loads
- [ ] Services collection loads
- [ ] Team collection loads
- [ ] Testimonials collection loads
- [ ] Contact settings load (footer)
- [ ] Site settings load (hero image, logo)

### Active Filter
- [ ] Only `active: true` items show
- [ ] Admin can control visibility

### Relationship Links
- [ ] University detail shows course offerings
- [ ] Course detail shows offering universities
- [ ] Team detail has WhatsApp link

### Form Submissions
- [ ] Contact form → Firestore inquiries collection
- [ ] Apply form → Firestore applications collection
- [ ] No errors in console

---

## No Regressions

### Firebase Storage ✓
- [ ] No Firebase Storage upload code active
- [ ] Apply form doesn't require file upload
- [ ] Document fields can be null

### Database Schema ✓
- [ ] No collection names changed
- [ ] No field names changed
- [ ] No fields deleted
- [ ] Query filters still work

### Admin Dashboard ✓
- [ ] Admin login works
- [ ] CRUD operations work
- [ ] Site settings save (logoUrl, heroImageUrl)
- [ ] Contact settings save

### Dynamic Content ✓
- [ ] No hardcoded mock data
- [ ] All content from Firestore
- [ ] Language change triggers re-render
- [ ] Dark mode doesn't break loading

---

## Browser Compatibility

Test on:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

---

## Performance Notes

### Page Load
- [ ] No console errors on load
- [ ] No 404s for missing assets
- [ ] CSS files load correctly
- [ ] JavaScript executes without errors

### Animations
- [ ] Hover effects smooth (not choppy)
- [ ] Transitions use reasonable durations
- [ ] No animation jank on scroll
- [ ] Reduced motion respected

---

## Final Sign-Off

If all 30+ points above pass:

✅ **Design System:** Complete, unified, well-documented  
✅ **Component Library:** Defined, reusable, tested  
✅ **Responsive Design:** Works at all breakpoints  
✅ **Dark Mode:** Fully supported, high contrast  
✅ **Accessibility:** Keyboard navigable, screen-reader friendly  
✅ **Firestore:** All collections loading, forms submitting correctly  
✅ **Firebase:** No Storage usage, auth working  
✅ **No Regressions:** All prior functionality intact  

---

## Deployment Readiness

**Ready to Deploy If:**
1. ✅ All 30 smoke test points pass
2. ✅ Responsive design verified at 6 breakpoints
3. ✅ Dark mode readable on all pages
4. ✅ No console errors on any page
5. ✅ All Firestore queries working
6. ✅ All forms submitting correctly
7. ✅ No Firebase Storage calls active

**Deployment Steps:**
```bash
# 1. Backup current production
# 2. Upload CSS files:
#    - css/design-system.css (enhanced)
#    - css/components.css (new)
# 3. Verify no errors in CloudFlare/hosting logs
# 4. Run smoke tests on production
# 5. Announce to users if desired
```

---

**Status:** ✅ READY FOR FINAL VERIFICATION  
**Next:** Execute smoke test above, document results, deploy when all green.

