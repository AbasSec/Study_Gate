/**
 * Site Hero Image Loader
 * Loads admin-managed page hero images from Firebase siteSettings/main
 * Supports page-specific hero images with fallback to generic heroImageUrl
 * Handles path normalization for local assets and HTTPS URLs
 * No Firebase Storage - Spark Plan compatible
 */

/**
 * Normalize asset paths for consistency
 * Accepts: /path/to/asset.jpg, assets/path.jpg, https://..., local paths
 * Rejects: gs://, firebase-storage://, brand/hero/*, brand/logo/*, javascript:, data:
 */
function normalizeAssetPath(path) {
    if (!path) return '';

    let value = String(path).trim();
    if (!value) return '';

    // Convert backslashes to forward slashes
    value = value.replace(/\\/g, '/');

    // Allow HTTPS/HTTP URLs as-is
    if (value.startsWith('https://') || value.startsWith('http://')) {
        return value;
    }

    // Allow embedded data URLs (base64 images stored in Firestore)
    if (value.startsWith('data:')) {
        return value;
    }

    // Reject Firebase Storage, admin paths, and dangerous protocols
    if (
        value.startsWith('gs://') ||
        value.startsWith('firebase-storage://') ||
        value.startsWith('javascript:') ||
        value.startsWith('brand/hero') ||
        value.startsWith('brand/logo')
    ) {
        console.warn('[Hero] Rejected unsafe path:', value);
        return '';
    }

    // Accept paths starting with /
    if (value.startsWith('/')) {
        return value;
    }

    // Convert assets/* to /assets/*
    if (value.startsWith('assets/')) {
        return '/' + value.replace(/^\/+/, '');
    }

    // Reject paths without leading / or assets/
    console.warn('[Hero] Rejected path without leading / or assets/:', value);
    return '';
}

/**
 * Resolve the hero image URL for a specific page
 * Priority: page-specific field → fallback to heroImageUrl → empty string
 */
function resolvePageHeroImage(siteSettings, pageKey) {
    if (!siteSettings) {
        console.warn('[Hero] No siteSettings provided');
        return '';
    }

    const pageFieldMap = {
        home: 'heroImageUrl',
        universities: 'universitiesHeroImageUrl',
        universityDetail: 'universityDetailHeroImageUrl',
        courses: 'coursesHeroImageUrl',
        courseDetail: 'courseDetailHeroImageUrl',
        services: 'servicesHeroImageUrl',
        team: 'teamHeroImageUrl',
        contact: 'contactHeroImageUrl',
        apply: 'applyHeroImageUrl'
    };

    const pageField = pageFieldMap[pageKey];
    const pageSpecific = pageField ? siteSettings[pageField] : '';
    const fallback = siteSettings.heroImageUrl || '';

    const resolved = normalizeAssetPath(pageSpecific || fallback);

    console.log('[Hero] Page:', pageKey, 'Resolved URL:', resolved || '(none)');

    return resolved;
}

/**
 * Apply hero image background to the page hero section
 * Handles CSS variable setting and class management
 */
function applyPageHeroImage(pageKey, siteSettings) {
    const hero =
        document.querySelector('[data-page-hero]') ||
        document.querySelector('.page-hero');

    if (!hero) {
        console.warn('[Hero] No page-hero element found on this page');
        return;
    }

    const imageUrl = resolvePageHeroImage(siteSettings, pageKey);

    if (!imageUrl) {
        console.log('[Hero] No image for page:', pageKey, '- using gradient fallback');
        hero.classList.remove('page-hero--with-image');
        hero.classList.add('page-hero--no-image');
        hero.style.removeProperty('--page-hero-image');
        return;
    }

    console.log('[Hero] Setting image for page:', pageKey, '-', imageUrl);
    hero.style.setProperty('--page-hero-image', `url("${imageUrl}")`);
    hero.classList.remove('page-hero--no-image');
    hero.classList.add('page-hero--with-image');
}

/**
 * Load siteSettings and apply hero image for the current page
 * Detects page key from data-page-key attribute or infers from URL
 */
async function loadPageHeroImage(retryCount = 0) {
    if (typeof db === 'undefined') {
        if (retryCount < 10) {
            setTimeout(() => loadPageHeroImage(retryCount + 1), 300);
        }
        return;
    }

    try {
        const doc = await db.collection('siteSettings').doc('main').get();
        if (!doc.exists || !doc.data()) {
            console.warn('[Hero] siteSettings/main not found');
            return;
        }

        const settings = doc.data();
        console.log('[Hero] Loaded siteSettings:', {
            heroImageUrl: settings.heroImageUrl,
            universitiesHeroImageUrl: settings.universitiesHeroImageUrl,
            coursesHeroImageUrl: settings.coursesHeroImageUrl,
            servicesHeroImageUrl: settings.servicesHeroImageUrl,
            teamHeroImageUrl: settings.teamHeroImageUrl,
            contactHeroImageUrl: settings.contactHeroImageUrl,
            applyHeroImageUrl: settings.applyHeroImageUrl
        });

        // Detect page key
        const pageHeroElement = document.querySelector('[data-page-hero]') || document.querySelector('.page-hero');
        let pageKey = pageHeroElement?.getAttribute('data-page-key');

        if (!pageKey) {
            // Infer from URL
            const pathname = window.location.pathname;
            if (pathname.includes('universities.html')) pageKey = 'universities';
            else if (pathname.includes('courses.html')) pageKey = 'courses';
            else if (pathname.includes('services.html')) pageKey = 'services';
            else if (pathname.includes('team.html')) pageKey = 'team';
            else if (pathname.includes('contact.html')) pageKey = 'contact';
            else if (pathname.includes('apply.html')) pageKey = 'apply';
            else if (pathname.includes('course-detail.html')) pageKey = 'courseDetail';
            else if (pathname.includes('university-detail.html')) pageKey = 'universityDetail';
            else pageKey = 'home';
        }

        console.log('[Hero] Detected page key:', pageKey);
        applyPageHeroImage(pageKey, settings);

    } catch (error) {
        console.error('[Hero] Failed to load page hero settings:', error);
    }
}

// Call when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPageHeroImage);
} else {
    loadPageHeroImage();
}
