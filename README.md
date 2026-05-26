# Horizons Educational Agency Website

A modern, premium website for Horizons Educational Agency - helping international students enroll in Malaysian universities.

## 🌐 Live Demo

Once deployed, your website will be available at:
`https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

## 🚀 Deployment Instructions

### GitHub Pages Deployment

1. **Create a GitHub Repository**
   - Go to [github.com](https://github.com) and create a new repository
   - Name it something like `al-mokadam-website`
   - Keep it public for free GitHub Pages hosting

2. **Upload Files**
   - Upload the project files, but do **not** commit local secret-bearing files
   - Keep `js/firebase-config.js` local only; commit `js/firebase-config.example.js` instead
   - Make sure the folder structure is preserved:
     ```
     ├── index.html
     ├── css/
     │   └── styles.css
     ├── js/
     │   ├── main.js
    │   ├── firebase-config.example.js
    │   └── firebase-config.js (local, gitignored)
     └── assets/
         └── images/
     ```

   Files that should stay out of Git:
   - `js/firebase-config.js`
   - Any `service-account*.json`, `*.pem`, `*.key`, `*.jks`, or `*.keystore`
   - `.firebase/`, `.runtimeconfig.json`, and local `.env*` files

3. **Enable GitHub Pages**
   - Go to your repository's **Settings**
   - Scroll down to **Pages** (in left sidebar)
   - Under "Source", select **Deploy from a branch**
   - Select **main** branch and **/ (root)** folder
   - Click **Save**

4. **Wait for Deployment**
   - GitHub will automatically deploy your site
   - It may take a few minutes
   - Your site will be available at `https://YOUR-USERNAME.github.io/REPO-NAME/`

### Firebase Setup (For Contact Form)

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project"
   - Follow the setup wizard

2. **Enable Firestore**
   - Go to Firestore Database
   - Click "Create database"
   - Start in test mode (for development)

3. **Get Firebase Config**
   - Go to Project Settings > Your Apps
   - Click "Add app" and select Web (</>)
   - Register your app
   - Copy the config values

4. **Create local Firebase config**
   - Copy `js/firebase-config.example.js` to `js/firebase-config.js`
   - Replace the placeholder values in `js/firebase-config.js` with your Firebase config

5. **Add Firebase SDK to index.html**
   Add these scripts before your JS files:
   ```html
   <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
   ```

## 📁 Project Structure

```
Horizons Educational agency/
├── index.html              # Main landing page
├── README.md               # This file
├── css/
│   └── styles.css          # All styles
├── js/
│   ├── main.js             # Main JavaScript
│   ├── firebase-config.example.js  # Firebase config template (safe to commit)
│   └── firebase-config.js  # Local Firebase config (ignored by Git)
└── assets/
    ├── home/
    │   ├── hero-cover.jpg
    │   ├── hero-gradient.svg
    │   ├── about-hello-al-mokadam.avif
    │   └── about-hello-al-mokadam.jpg
    ├── students/
    │   ├── group-campus.jpg
    │   ├── student-hero.jpeg
    │   ├── study-session.jpeg
    │   └── yeamim-hossain-lien.webp
    ├── success-stories/
    │   ├── nazmus-sakib.webp
    │   └── azharuddin-khan.webp
    ├── team/
    │   ├── profile-placeholder.webp
    │   └── omar-khalid.webp
    ├── universities/
    │   └── hero/university-top-header.jpg
    └── images/logo.png
```

## ✨ Features

- **Modern Design**: Clean white background with glassmorphism effects
- **Responsive**: Works on all devices (mobile, tablet, desktop)
- **Animations**: Smooth scroll animations and hover effects
- **Contact Form**: Firebase-ready contact form
- **SEO Optimized**: Proper meta tags and semantic HTML

## 🎨 Customization

### Update Colors
Edit the CSS variables in `css/styles.css`:
```css
:root {
    --primary-coral: #DF6951;    /* Main accent color */
    --primary-gold: #F1A501;     /* Secondary accent */
    --primary-navy: #14183E;     /* Dark text color */
}
```

### Update Content
- Edit `index.html` to change text, images, and sections
- Replace images in `assets/home/`, `assets/students/`, `assets/success-stories/`, and `assets/team/`

### Update Contact Info
Search for these in `index.html`:
- `info@al-mokadam.edu` - Email address
- `+60 12-345-6789` - Phone number
- `123 Education Street, Kuala Lumpur` - Address

## 📝 License

© 2026 Horizons Educational Agency. All Rights Reserved.
