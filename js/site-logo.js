/**
 * Site Logo Loader
 * Loads admin-managed logo from Firebase siteSettings/main
 * Falls back to text "StudyGate International" if no logo is uploaded
 * Handles path normalization for /pages/* subdirectories
 */

function applySiteLogo(rawLogoUrl) {
    const logoSrc = normalizeAssetPath(rawLogoUrl);

    console.log('[Logo] Raw Firestore logoUrl:', rawLogoUrl);
    console.log('[Logo] Normalized logo src:', logoSrc);

    // Multi-selector approach for robustness across pages
    const logoImages = document.querySelectorAll('.site-logo-img');
    const logoTexts = document.querySelectorAll('.site-logo-text-only');

    console.log('[Logo] Logo image elements found:', logoImages.length);
    console.log('[Logo] Logo text elements found:', logoTexts.length);

    if (!logoImages.length) {
        console.warn('[Logo] No logo image elements found on this page.');
        return;
    }

    logoImages.forEach((img) => {
        // CRITICAL: Make sure image is visible by default
        img.style.display = 'inline-block';
        img.style.visibility = 'visible';
        img.style.opacity = '1';

        if (!logoSrc) {
            // No valid logo URL - hide image, show text
            img.style.display = 'none';
            logoTexts.forEach(text => {
                text.style.display = 'inline-flex';
                text.style.visibility = 'visible';
            });
            console.log('[Logo] No valid logo URL, showing text fallback');
            return;
        }

        // Set up load handler BEFORE setting src
        img.onload = function () {
            console.log('[Logo] Image loaded successfully:', logoSrc);
            img.style.display = 'inline-block';
            img.style.visibility = 'visible';
            img.style.opacity = '1';

            // Keep text visible alongside image
            logoTexts.forEach(text => {
                text.style.display = 'inline-flex';
                text.style.visibility = 'visible';
            });
        };

        img.onerror = function () {
            console.error('[Logo] Failed to load image:', logoSrc);
            img.style.display = 'none';

            // Show text fallback if image fails
            logoTexts.forEach(text => {
                text.style.display = 'inline-flex';
                text.style.visibility = 'visible';
            });
        };

        // Set src AFTER handlers are ready
        img.src = logoSrc;
        console.log('[Logo] Set img.src to:', logoSrc);
    });
}

async function loadSiteLogo(retryCount = 0) {
    if (typeof db === 'undefined') {
        if (retryCount < 10) {
            setTimeout(() => loadSiteLogo(retryCount + 1), 300);
        }
        return;
    }

    try {
        const doc = await db.collection('siteSettings').doc('main').get();
        const logoUrl = doc.exists && doc.data() && doc.data().logoUrl;

        console.log('[Logo] Fetched from Firestore:', logoUrl);

        if (logoUrl) {
            applySiteLogo(logoUrl);
        } else {
            console.log('[Logo] No logoUrl in siteSettings, showing text fallback');
            // No logo - show text fallback only
            const logoImages = document.querySelectorAll('.site-logo-img');
            logoImages.forEach(img => {
                img.style.display = 'none';
            });

            const logoTexts = document.querySelectorAll('.site-logo-text-only');
            logoTexts.forEach(el => {
                el.style.display = 'inline-flex';
            });
        }
    } catch (e) {
        console.error('[Logo] Failed to load siteSettings:', e);
        // Stay on text fallback
        const logoImages = document.querySelectorAll('.site-logo-img');
        logoImages.forEach(img => {
            img.style.display = 'none';
        });
        const logoTexts = document.querySelectorAll('.site-logo-text-only');
        logoTexts.forEach(el => {
            el.style.display = 'inline-flex';
        });
    }
}

// Call when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSiteLogo);
} else {
    loadSiteLogo();
}

