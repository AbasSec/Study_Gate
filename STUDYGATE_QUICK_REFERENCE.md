# StudyGate International - Quick Reference Guide

## 🎨 Brand Guidelines

### Logo Usage
- **Short Form**: "StudyGate" (navigation, mobile headers, compact spaces)
- **Full Form**: "StudyGate International" (homepage hero, footer, formal documentation)

### Color Palette
```css
--color-primary:      #0066CC  /* Primary Blue - main actions, links */
--color-secondary:    #16A34A  /* Growth Green - success states */
--color-tertiary:     #FF6B1A  /* Gateway Orange - high-priority CTAs */
--color-dark:         #111827  /* Dark Navy - dark mode background */
--color-surface:      #F8FAFC  /* Light Background - main surface */
--color-text:         #1F2937  /* Text Dark - primary text */
--color-muted:        #6B7280  /* Muted Text - secondary labels */
```

### Typography
- Font Family: Plus Jakarta Sans (Headlines & Body)
- Font Family: Tajawal (Arabic text)
- Material Symbols: Material Icons (Icon system)

---

## 📁 File Structure Changes

### Updated Files
- **index.html**: Homepage with new branding
- **admin.html**: Admin dashboard login
- **agent.html**: Agent portal login
- **pages/***: All page templates updated
- **css/design-system.css**: Core design tokens (PRIMARY CHANGE)
- **js/translations.js**: English & Arabic translations

### Key Locations
```
Root Files:
├── index.html (Homepage)
├── admin.html (Admin login)
├── agent.html (Agent login)
├── STUDYGATE_REBRAND_COMPLETE.md (Full documentation)
│
Pages:
├── pages/universities.html
├── pages/university-detail.html
├── pages/courses.html
├── pages/course-detail.html
├── pages/services.html
├── pages/team.html
├── pages/contact.html
├── pages/apply.html
└── pages/student-dashboard.html

Styles:
├── css/design-system.css (NEW COLOR SYSTEM)
├── css/styles.css
├── css/admin.css
└── css/components.css

Scripts:
├── js/translations.js (UPDATED - EN/AR)
├── js/main.js
├── js/admin.js
└── js/firebase-config.js
```

---

## 🔧 Important CSS Variables

### Primary Colors
```css
--color-primary: #0066CC;           /* Main blue */
--color-primary-light: #1E81FF;     /* Lighter blue for hover */
--color-primary-lighter: #EAF4FF;   /* Light blue backgrounds */
```

### Secondary Colors
```css
--color-secondary: #16A34A;         /* Green for success */
--color-secondary-light: #ECFDF5;   /* Light green backgrounds */
```

### Tertiary (Accent)
```css
--color-tertiary: #FF6B1A;          /* Orange for CTAs */
--color-tertiary-light: #FFF4EC;    /* Light orange backgrounds */
```

### Dark Mode
```css
[data-theme="dark"] {
  --color-surface: #111827;         /* Dark background */
  --color-text-primary: #F3F4F6;    /* Light text */
}
```

---

## 🌐 Translation Keys to Update

If adding new content, use these translation keys:

**English (en):**
```javascript
translations.en.nav.home = 'Home'
translations.en.home.ctaTitle = 'Ready to Start Your Journey?'
translations.en.footer.copyright = '© 2026 StudyGate International. All Rights Reserved.'
```

**Arabic (ar):**
```javascript
translations.ar.nav.home = 'الرئيسية'
translations.ar.footer.copyright = '© 2026 StudyGate International. جميع الحقوق محفوظة.'
```

---

## 🔐 Firebase Configuration

### Collections (Unchanged)
- users
- universities
- courses
- services
- team
- testimonials
- contactSettings
- siteSettings
- applications

### Important Settings in Firestore
**siteSettings/main:**
- logoUrl: Logo image URL
- heroImageUrl: Hero section background image

**contactSettings/main:**
- email: Contact email
- phone: Contact phone
- address: Office address
- whatsappNumber: WhatsApp contact number
- socialMedia: Social media links

---

## 🧪 Testing Checklist

### Visual
- [ ] Homepage loads with StudyGate branding
- [ ] Footer shows "StudyGate International"
- [ ] All page titles show "StudyGate International"
- [ ] Colors match the new palette
- [ ] Dark mode colors are correct

### Functional
- [ ] Navigation works
- [ ] Login page accessible
- [ ] Form submission works
- [ ] Dark mode toggle functions
- [ ] Language toggle works (EN/AR)
- [ ] Database reads data correctly
- [ ] Images load from siteSettings/main

### Responsive
- [ ] Mobile view (320px) - no horizontal scroll
- [ ] Tablet view (768px) - proper layout
- [ ] Desktop view (1024px+) - full features
- [ ] All buttons and forms work on mobile

---

## 🚀 Deployment

### Pre-Deployment
1. Test all pages in browser (light & dark mode)
2. Test responsive design on mobile/tablet
3. Verify Firebase/Firestore connectivity
4. Check console for errors
5. Test forms and submissions
6. Verify all links work

### Deployment Command
```bash
firebase deploy
```

### Post-Deployment
1. Verify site loads at your domain
2. Test on real devices
3. Check mobile performance
4. Verify all pages accessible

---

## 📝 Important Notes

### What Changed
✅ Brand name: Horizons → StudyGate International
✅ Logo text: Horizons → StudyGate
✅ Colors: Navy/Emerald/Teal → Blue/Green/Orange
✅ Page titles: All updated
✅ Footer copyright: Updated
✅ Translations: English & Arabic updated

### What Did NOT Change
✅ Firestore collection names (same)
✅ Database structure (same)
✅ Firebase authentication (same)
✅ Admin functionality (same)
✅ User data (same)
✅ Responsive design approach (same)
✅ JavaScript functionality (same)

---

## 🆘 Troubleshooting

### Issue: Old colors still showing
**Solution**: Clear browser cache or do a hard refresh (Ctrl+Shift+R)

### Issue: Branding text not updated on a page
**Solution**: Check the page title in the <title> tag, update if needed

### Issue: Dark mode colors wrong
**Solution**: Check css/design-system.css `[data-theme="dark"]` section

### Issue: Logo not showing
**Solution**: Verify siteSettings/main has logoUrl set in Firestore

---

## 📞 Contact Information

For questions about the rebrand:
- Check STUDYGATE_REBRAND_COMPLETE.md for full documentation
- Review css/design-system.css for color definitions
- Check js/translations.js for text content

---

**Version**: StudyGate International v1.0
**Last Updated**: 2026-05-24
**Status**: Production Ready
