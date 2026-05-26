/* ============================================
   StudyGate International Admin Panel JavaScript
   With Course Picker & Category Management
   ============================================ */

// ============================================
// ADMIN SECURITY - FIRESTORE-BASED AUTHORIZATION
// ============================================

// Check Firestore for admin authorization (source of truth)
// Spark plan: Checks admins/{email} Firestore document
// No custom claims or Cloud Functions (not available on Spark)
async function checkAdminAuthorization(user) {
    if (!user || !user.email) return false;
    const email = user.email.toLowerCase();

    try {
        const adminDoc = await db.collection('admins').doc(email).get();
        if (adminDoc.exists) {
            const adminData = adminDoc.data();
            if (adminData.status === 'active' && adminData.role === 'admin') {
                return true;
            }
        }
    } catch (error) {
        console.error('Error checking admin status in Firestore:', error);
        // Do NOT auto-logout on temporary Firestore error
        // Return null to show loading state instead
        return null;
    }

    return false;
}

// Current state
let currentSection = 'dashboard';
let editingId = null;
let editingType = null;
let availableCourses = [];
let availableCategories = ['IT', 'Engineering', 'Business', 'Health Sciences', 'Arts', 'Science', 'Law', 'Education', 'Other'];
let universityCoursesTemp = []; // Temporary storage for courses being added to university

function getUniversityLogoValue(university) {
    return university.logo || university.logoUrl || university.logoPath || '';
}
function getUniversityCampusImageValue(university) {
    return university.campusImage || university.campusImageUrl || university.image || '';
}
function getUniversityOfferings(university) {
    return Array.isArray(university.courseOfferings) ? university.courseOfferings : [];
}
function getUniversityOfferingCount(university) {
    return getUniversityOfferings(university).length;
}
const OFFERING_CURRENCIES = ['MYR', 'USD', 'GBP', 'EUR', 'SAR', 'AED', 'PKR', 'BDT', 'NGN'];
const DEFAULT_BASE_CURRENCY = 'MYR';
const UNIFIED_COURSE_CSV_HEADERS = [
    'course_id',
    'course_name',
    'level',
    'fees',
    'currency',
    'duration_years',
    'semesters',
    'intake',
    'credits',
    'description',
    'image'
];
const UNIFIED_COURSE_CSV_TEMPLATE_ROWS = [
    'BSC-COMP-SCI,Bachelor of Computer Science,Bachelor,30000,MYR,3,6,September|February,120,Core computing and software engineering fundamentals,assets/courses/computer-science.jpg',
    'DIP-BUS-ADM,Diploma in Business Administration,Diploma,19000,MYR,2,4,September,90,Foundation in management finance and operations,assets/courses/diploma-business.jpg',
    'MSC-DATA-SCI,Master of Data Science,Masters,35000,MYR,1.5,3,February,42,Advanced analytics machine learning and AI applications,assets/courses/master-data-science.jpg'
];
let activeQuickAddFolderId = null;
let applicationsCache = [];
let selectedApplicationId = null;
let inquiriesUnsubscribe = null;
let applicationsUnsubscribe = null;
let inquiriesRealtimeReady = false;
let applicationsRealtimeReady = false;
let inquiryIdsSeen = new Set();
let applicationIdsSeen = new Set();
let notificationFeed = [];
let unreadNotifications = 0;

const MAX_ADMIN_NOTIFICATIONS = 30;

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// Authentication
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (auth) {
            auth.onAuthStateChanged(async user => {
                if (user) {
                    // Show loading state while checking authorization
                    showLoginWithMessage('Loading admin profile...');

                    try {
                        // Check if user is authorized admin
                        const isAuthorized = await checkAdminAuthorization(user);

                        if (isAuthorized === true) {
                            // Authorized - show dashboard
                            showDashboard(user);
                        } else if (isAuthorized === false) {
                            // Explicitly unauthorized - sign out
                            auth.signOut();
                            showLogin();
                            showUnauthorizedError(user.email);
                        } else if (isAuthorized === null) {
                            // Firestore error - show error state, do NOT logout
                            showLoginWithError('Could not verify admin status. Please check your internet connection and try again.');
                        }
                    } catch (error) {
                        console.error('Auth check failed:', error);
                        showLoginWithError('Error checking authorization: ' + error.message);
                    }
                } else {
                    // Not authenticated
                    showLogin();
                }
            });
        }
    }, 500);

    setupEventListeners();
});

function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleEmailLogin);
    
    const googleBtn = document.getElementById('googleSignIn');
    if (googleBtn) googleBtn.addEventListener('click', handleGoogleLogin);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section) switchSection(section);
            // Close mobile sidebar after selection
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.admin-sidebar');
                if (sidebar) sidebar.classList.remove('mobile-open');
            }
        });
    });

    // Mobile sidebar toggle
    setupMobileSidebarToggle();

    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSaveSettings);
        // Initialize image input fields for settings
        setTimeout(() => initializeImageInputFields('siteSettings'), 100);
    }

    const inquiryFilter = document.getElementById('inquiryFilter');
    if (inquiryFilter) inquiryFilter.addEventListener('change', () => loadInquiries());
    const courseCsvInput = document.getElementById('courseCsvInput');
    if (courseCsvInput) courseCsvInput.addEventListener('change', handleCourseCsvImport);
    const universityOfferingsInput = document.getElementById('universityOfferingsInput');
    if (universityOfferingsInput) universityOfferingsInput.addEventListener('change', handleUniversityOfferingsImport);

    const appSearch = document.getElementById('appSearch');
    if (appSearch) appSearch.addEventListener('input', debounce(applyApplicationFilters, 300));
    const appStatusFilter = document.getElementById('appStatusFilter');
    if (appStatusFilter) appStatusFilter.addEventListener('change', applyApplicationFilters);
    const appUniversityFilter = document.getElementById('appUniversityFilter');
    if (appUniversityFilter) appUniversityFilter.addEventListener('change', applyApplicationFilters);
    const appCourseFilter = document.getElementById('appCourseFilter');
    if (appCourseFilter) appCourseFilter.addEventListener('change', applyApplicationFilters);
    const appSort = document.getElementById('appSort');
    if (appSort) appSort.addEventListener('change', applyApplicationFilters);

    const studentStatusFilter = document.getElementById('studentStatusFilter');
    if (studentStatusFilter) studentStatusFilter.addEventListener('change', loadStudentsAdmin);
}

// Mobile sidebar toggle functionality
function setupMobileSidebarToggle() {
    const sidebar = document.querySelector('.admin-sidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');

    if (!sidebar) return;

    // Show toggle button and wire click on mobile
    const applyMobileState = () => {
        if (window.innerWidth <= 768) {
            if (toggleBtn) toggleBtn.style.display = 'flex';
        } else {
            if (toggleBtn) toggleBtn.style.display = 'none';
            sidebar.classList.remove('mobile-open');
        }
    };
    applyMobileState();

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            !e.target.closest('.admin-sidebar') &&
            !e.target.closest('.sidebar-toggle-btn') &&
            !e.target.closest('#sidebarToggleBtn')) {
            sidebar.classList.remove('mobile-open');
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        applyMobileState();
    });
}

async function handleEmailLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        errorEl.textContent = error.message;
    }
}

async function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const errorEl = document.getElementById('loginError');
    
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        errorEl.textContent = error.message;
    }
}

async function handleLogout() {
    try {
        stopAdminRealtimeListeners();
        await auth.signOut();
        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function showLogin() {
    stopAdminRealtimeListeners();
    unreadNotifications = 0;
    notificationFeed = [];
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('adminContainer').style.display = 'none';
}

function showUnauthorizedError(email) {
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
        errorEl.innerHTML = `<strong>Access Denied</strong><br>The email "${email}" is not authorized to access this admin panel.<br>Please contact the administrator.`;
        errorEl.style.display = 'block';
    }
}

function showLoginWithMessage(message) {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('adminContainer').style.display = 'none';
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
        errorEl.innerHTML = message;
        errorEl.style.display = 'block';
        errorEl.style.color = '#666';
    }
}

function showLoginWithError(message) {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('adminContainer').style.display = 'none';
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
        errorEl.innerHTML = `<strong>Error:</strong> ${message}`;
        errorEl.style.display = 'block';
        errorEl.style.color = 'var(--error-color, red)';
    }
}

function showDashboard(user) {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('adminContainer').style.display = 'flex';
    document.getElementById('adminEmail').textContent = user.email;
    initAdminNotificationCenter();
    loadSidebarLogo();
    loadDashboard();
    loadAvailableCourses();
    loadCategories();
    startAdminRealtimeListeners();
}

function initAdminNotificationCenter() {
    const btn = document.getElementById('adminNotificationBtn');
    const panel = document.getElementById('adminNotificationPanel');
    const markReadBtn = document.getElementById('markNotificationsRead');
    const enableBrowserBtn = document.getElementById('enableBrowserNotifications');

    if (btn && !btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel?.classList.toggle('open');
            if (panel?.classList.contains('open')) {
                markAllAdminNotificationsRead();
            }
        });
    }

    if (markReadBtn && !markReadBtn.dataset.bound) {
        markReadBtn.dataset.bound = 'true';
        markReadBtn.addEventListener('click', () => markAllAdminNotificationsRead());
    }

    if (enableBrowserBtn && !enableBrowserBtn.dataset.bound) {
        enableBrowserBtn.dataset.bound = 'true';
        enableBrowserBtn.addEventListener('click', requestBrowserNotificationPermission);
    }

    if (!document.body.dataset.adminNotifDocBound) {
        document.body.dataset.adminNotifDocBound = 'true';
        document.addEventListener('click', (e) => {
            if (!panel || !btn) return;
            if (!panel.contains(e.target) && !btn.contains(e.target)) {
                panel.classList.remove('open');
            }
        });
    }

    renderAdminNotifications();
}

async function loadSidebarLogo() {
    try {
        const doc = await db.collection('siteSettings').doc('main').get();
        const logoUrl = doc.exists && doc.data().logoUrl ? doc.data().logoUrl : '';

        if (logoUrl) {
            const sidebarLogoImg = document.querySelector('.sidebar-header img.site-logo-img');
            if (sidebarLogoImg) {
                sidebarLogoImg.src = logoUrl;
                sidebarLogoImg.onerror = function() {
                    this.src = 'assets/images/logo.png';
                };
            }
        }
    } catch (error) {
        console.error('Error loading sidebar logo:', error);
    }
}

function requestBrowserNotificationPermission() {
    if (!('Notification' in window)) {
        alert('Browser notifications are not supported on this device/browser.');
        return;
    }
    Notification.requestPermission().then((result) => {
        if (result === 'granted') {
            showAdminToast({
                kind: 'inquiry',
                title: 'Browser alerts enabled',
                message: 'You will now receive browser notifications for new items.'
            });
        }
    }).catch((error) => {
        console.error('Notification permission error:', error);
    });
}

function startAdminRealtimeListeners() {
    stopAdminRealtimeListeners();
    inquiriesRealtimeReady = false;
    applicationsRealtimeReady = false;
    inquiryIdsSeen = new Set();
    applicationIdsSeen = new Set();

    inquiriesUnsubscribe = db.collection('inquiries')
        .where('status', '==', 'new')
        .onSnapshot((snapshot) => {
            const count = snapshot.size;
            const inquiryBadge = document.getElementById('inquiryBadge');
            if (inquiryBadge) inquiryBadge.textContent = count;
            const statInquiries = document.getElementById('statInquiries');
            if (statInquiries) statInquiries.textContent = count;

            const currentIds = new Set(snapshot.docs.map(doc => doc.id));
            if (!inquiriesRealtimeReady) {
                inquiryIdsSeen = currentIds;
                inquiriesRealtimeReady = true;
                return;
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type !== 'added') return;
                if (inquiryIdsSeen.has(change.doc.id)) return;
                const data = change.doc.data() || {};
                pushAdminNotification({
                    kind: 'inquiry',
                    title: 'New inquiry received',
                    message: `${data.name || 'A student'} • ${data.interest || data.subject || 'General inquiry'}`,
                    section: 'inquiries'
                });
            });

            inquiryIdsSeen = currentIds;
        }, (error) => {
            console.error('Inquiries realtime listener error:', error);
        });

    applicationsUnsubscribe = db.collection('applications')
        .where('status', '==', 'new')
        .onSnapshot((snapshot) => {
            const count = snapshot.size;
            const appBadge = document.getElementById('applicationsBadge');
            if (appBadge) appBadge.textContent = count;

            const currentIds = new Set(snapshot.docs.map(doc => doc.id));
            if (!applicationsRealtimeReady) {
                applicationIdsSeen = currentIds;
                applicationsRealtimeReady = true;
                return;
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type !== 'added') return;
                if (applicationIdsSeen.has(change.doc.id)) return;
                const data = change.doc.data() || {};
                const studentName = data.student?.name || 'New applicant';
                const uni = data.universityName || 'University';
                pushAdminNotification({
                    kind: 'application',
                    title: 'New application submitted',
                    message: `${studentName} • ${uni}`,
                    section: 'applications'
                });
            });

            applicationIdsSeen = currentIds;
        }, (error) => {
            console.error('Applications realtime listener error:', error);
        });
}

function stopAdminRealtimeListeners() {
    if (typeof inquiriesUnsubscribe === 'function') {
        inquiriesUnsubscribe();
        inquiriesUnsubscribe = null;
    }
    if (typeof applicationsUnsubscribe === 'function') {
        applicationsUnsubscribe();
        applicationsUnsubscribe = null;
    }
}

function pushAdminNotification(entry) {
    const item = {
        id: `${entry.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: entry.kind || 'inquiry',
        title: entry.title || 'New update',
        message: entry.message || '',
        section: entry.section || 'dashboard',
        createdAt: new Date()
    };
    notificationFeed.unshift(item);
    if (notificationFeed.length > MAX_ADMIN_NOTIFICATIONS) {
        notificationFeed = notificationFeed.slice(0, MAX_ADMIN_NOTIFICATIONS);
    }
    unreadNotifications += 1;
    renderAdminNotifications();
    showAdminToast(item);
    showBrowserNotification(item);
}

function renderAdminNotifications() {
    const countEl = document.getElementById('adminNotificationCount');
    const listEl = document.getElementById('adminNotificationsList');
    if (countEl) {
        countEl.textContent = unreadNotifications;
        countEl.style.display = unreadNotifications > 0 ? 'inline-block' : 'none';
    }
    if (!listEl) return;

    if (!notificationFeed.length) {
        listEl.innerHTML = '<div class="notification-empty">No notifications yet</div>';
        return;
    }

    listEl.innerHTML = notificationFeed.map((item) => `
        <div class="notification-item ${item.kind}">
            <span class="notification-dot"></span>
            <div>
                <strong>${escapeHtml(item.title)}</strong>
                <p>${escapeHtml(item.message)}</p>
            </div>
            <span class="notification-time">${formatTimeAgo(item.createdAt)}</span>
        </div>
    `).join('');
}

function markAllAdminNotificationsRead() {
    unreadNotifications = 0;
    renderAdminNotifications();
}

function showAdminToast(item) {
    let wrap = document.getElementById('adminToastWrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'adminToastWrap';
        wrap.className = 'admin-toast-wrap';
        document.body.appendChild(wrap);
    }

    const toast = document.createElement('div');
    toast.className = `admin-toast ${item.kind || ''}`;
    toast.innerHTML = `
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.message)}</p>
    `;
    wrap.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 4500);
}

function showBrowserNotification(item) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
        const notification = new Notification(item.title, {
            body: item.message,
            icon: 'assets/images/logo.png'
        });
        notification.onclick = () => {
            window.focus();
            switchSection(item.section || 'dashboard');
        };
    } catch (error) {
        console.error('Browser notification error:', error);
    }
}

function formatTimeAgo(date) {
    const now = Date.now();
    const target = date instanceof Date ? date.getTime() : Date.now();
    const diffSec = Math.max(1, Math.floor((now - target) / 1000));
    if (diffSec < 60) return `${diffSec}s`;
    const min = Math.floor(diffSec / 60);
    if (min < 60) return `${min}m`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Load courses for autocomplete
async function loadAvailableCourses() {
    try {
        const snapshot = await db.collection('courses').orderBy('name', 'asc').get();
        availableCourses = [];
        snapshot.forEach(doc => {
            availableCourses.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// Load categories
async function loadCategories() {
    try {
        const doc = await db.collection('settings').doc('categories').get();
        if (doc.exists && doc.data().list) {
            availableCategories = doc.data().list;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Save categories
async function saveCategories() {
    try {
        await db.collection('settings').doc('categories').set({ list: availableCategories });
    } catch (error) {
        console.error('Error saving categories:', error);
    }
}

function openCourseCsvImportPicker() {
    const input = document.getElementById('courseCsvInput');
    if (!input) return;
    input.value = '';
    input.click();
}

function openUniversityOfferingsImportPicker() {
    const input = document.getElementById('universityOfferingsInput');
    if (!input) return;
    input.value = '';
    input.click();
}

function downloadUnifiedCourseTemplate(fileName = 'course-import-template.csv') {
    const templateLines = [
        UNIFIED_COURSE_CSV_HEADERS.join(','),
        ...UNIFIED_COURSE_CSV_TEMPLATE_ROWS
    ];
    const blob = new Blob([templateLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function downloadUniversityOfferingsTemplate() {
    downloadUnifiedCourseTemplate('university-course-offerings-template.csv');
}

async function handleCourseCsvImport(event) {
    const input = event.target;
    const file = input?.files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const rows = parseCsvToObjects(text);
        if (!rows.length) {
            alert('CSV is empty or invalid.');
            return;
        }

        const confirmImport = confirm(`Import ${rows.length} course rows from "${file.name}"?`);
        if (!confirmImport) return;

        const summary = await importCoursesFromCsvRows(rows);
        await loadCoursesWithFolders();
        await loadAvailableCourses();

        const errorPreview = (summary.errors || []).slice(0, 8).join('\n');
        const extraCount = (summary.errors || []).length > 8 ? `\n...and ${(summary.errors || []).length - 8} more issue(s).` : '';
        alert(
            `Import completed.\n` +
            `Processed: ${summary.processed}\n` +
            `Created: ${summary.created}\n` +
            `Updated: ${summary.updated}\n` +
            `Skipped: ${summary.skipped}\n` +
            `Folders created: ${summary.foldersCreated}` +
            ((summary.errors || []).length ? `\n\nIssues:\n${errorPreview}${extraCount}` : '')
        );
    } catch (error) {
        console.error('CSV import failed:', error);
        alert('CSV import failed. Check console for details.');
    } finally {
        if (input) input.value = '';
    }
}

function normalizeImportRow(rawRow) {
    const normalized = {};
    Object.entries(rawRow || {}).forEach(([key, value]) => {
        const cleanKey = normalizeCsvKey(key);
        if (!cleanKey) return;
        normalized[cleanKey] = value;
    });
    return normalized;
}

function parseNumberValue(rawValue) {
    const cleaned = String(rawValue || '')
        .replace(/,/g, '')
        .trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseIntakeValue(rawValue, fallback = ['September']) {
    if (!rawValue || String(rawValue).trim() === '') return fallback;
    const items = String(rawValue)
        .split(/[\|,;/]+/)
        .map(item => item.trim())
        .filter(Boolean);
    return items.length ? items : fallback;
}

function resolveCourseForOfferingRow(row) {
    const providedCourseId = normalizeCourseIdentifier(getRowValue(row, ['course_id', 'courseid', 'global_course_id', 'id']));
    if (providedCourseId) {
        const byGlobalId = availableCourses.find(c => normalizeCourseIdentifier(c.courseId) === providedCourseId);
        if (byGlobalId) return byGlobalId;
        const byDocId = availableCourses.find(c => c.id === providedCourseId);
        if (byDocId) return byDocId;
    }

    const courseName = getRowValue(row, ['course_name', 'course', 'name']);
    if (!courseName) return null;
    const level = getRowValue(row, ['level', 'course_level']).toLowerCase();
    const nameMatches = availableCourses.filter(c => String(c.name || '').trim().toLowerCase() === courseName.trim().toLowerCase());
    if (!nameMatches.length) return null;
    if (!level) return nameMatches[0];
    return nameMatches.find(c => String(c.level || '').toLowerCase() === level) || nameMatches[0];
}

function upsertAvailableCourse(courseDoc) {
    if (!courseDoc || !courseDoc.id) return;
    const idx = availableCourses.findIndex(c => c.id === courseDoc.id);
    if (idx >= 0) {
        availableCourses[idx] = { ...availableCourses[idx], ...courseDoc };
        return;
    }
    availableCourses.push(courseDoc);
}

async function getOrCreateFolderByName(folderName) {
    const normalizedName = String(folderName || 'Uncategorized').trim() || 'Uncategorized';
    const localMatch = courseFolders.find(
        (folder) => String(folder?.name || '').trim().toLowerCase() === normalizedName.toLowerCase()
    );
    if (localMatch) return localMatch;

    const byNameSnapshot = await db.collection('courseFolders').where('name', '==', normalizedName).limit(1).get();
    if (!byNameSnapshot.empty) {
        const doc = byNameSnapshot.docs[0];
        const folder = { id: doc.id, ...doc.data() };
        courseFolders.push(folder);
        return folder;
    }

    const maxOrder = courseFolders.reduce((max, folder) => {
        const order = Number(folder?.order);
        return Number.isFinite(order) && order > max ? order : max;
    }, 0);
    const ref = await db.collection('courseFolders').add({
        name: normalizedName,
        order: maxOrder + 1,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const folder = { id: ref.id, name: normalizedName, order: maxOrder + 1 };
    courseFolders.push(folder);
    return folder;
}

async function ensureGlobalCourseForOfferingRow(row, rowNumber, summary) {
    const providedCourseId = normalizeCourseIdentifier(getRowValue(row, ['course_id', 'courseid', 'global_course_id', 'id']));
    if (!providedCourseId) {
        summary.skipped += 1;
        summary.errors.push(`Row ${rowNumber}: course_id is required.`);
        return null;
    }

    const directMatch = availableCourses.find(c => normalizeCourseIdentifier(c.courseId) === providedCourseId);
    if (directMatch) return directMatch;

    const courseName = getRowValue(row, ['course_name', 'course', 'name']);
    if (!courseName) {
        summary.skipped += 1;
        summary.errors.push(`Row ${rowNumber}: course_name is required when creating a new global course.`);
        return null;
    }

    const level = getRowValue(row, ['level', 'course_level'], 'Bachelor');
    const byNameLevel = availableCourses.find((course) =>
        String(course.name || '').trim().toLowerCase() === courseName.trim().toLowerCase()
        && String(course.level || '').trim().toLowerCase() === String(level || '').trim().toLowerCase()
    );

    if (byNameLevel) {
        const existingCourseId = normalizeCourseIdentifier(byNameLevel.courseId);
        if (existingCourseId && existingCourseId !== providedCourseId) {
            summary.skipped += 1;
            summary.errors.push(
                `Row ${rowNumber}: ${courseName} (${level}) already exists with course_id "${existingCourseId}".`
            );
            return null;
        }
    }

    const feesRaw = getRowValue(row, ['base_price', 'base_fees', 'fees', 'fee', 'amount', 'price', 'tuition_fee', 'tuition'], '');
    const basePrice = parseNumberValue(feesRaw);
    if (feesRaw !== '' && basePrice === null) {
        summary.skipped += 1;
        summary.errors.push(`Row ${rowNumber}: invalid fees "${feesRaw}".`);
        return null;
    }

    const durationRaw = getRowValue(row, ['base_duration_years', 'duration_years', 'duration', 'years'], '');
    const baseDurationYears = parseNumberValue(durationRaw) ?? parseDurationYearsFromText(durationRaw);
    if (durationRaw !== '' && (baseDurationYears === null || baseDurationYears < 1)) {
        summary.skipped += 1;
        summary.errors.push(`Row ${rowNumber}: invalid duration "${durationRaw}".`);
        return null;
    }

    const semestersRaw = getRowValue(row, ['total_semesters', 'semesters', 'semester_count'], '');
    const totalSemesters = parseNumberValue(semestersRaw);
    if (semestersRaw !== '' && (totalSemesters === null || totalSemesters < 1)) {
        summary.skipped += 1;
        summary.errors.push(`Row ${rowNumber}: invalid semesters "${semestersRaw}".`);
        return null;
    }

    const currencyRaw = getRowValue(row, ['base_currency', 'currency'], DEFAULT_BASE_CURRENCY).toUpperCase();
    const baseCurrency = OFFERING_CURRENCIES.includes(currencyRaw) ? currencyRaw : DEFAULT_BASE_CURRENCY;
    const credits = getRowValue(row, ['credits'], '');
    const descriptionInput = getRowValue(row, ['description', 'details'], '');
    const folderName = level || getRowValue(row, ['folder_name', 'folder', 'category', 'discipline'], 'Uncategorized');
    const folderMeta = await getOrCreateFolderByName(folderName);
    const csvImage = getRowValue(row, ['image', 'image_path', 'image_link'], '');

    const payload = {
        name: courseName,
        courseId: providedCourseId,
        level,
        folderId: folderMeta.id,
        category: folderMeta.name,
        basePrice: basePrice ?? 0,
        baseCurrency,
        baseDurationYears: baseDurationYears ? Number(baseDurationYears) : null,
        totalSemesters: totalSemesters ? Number(totalSemesters) : null,
        duration: baseDurationYears ? `${baseDurationYears} years` : '',
        credits: credits || '',
        image: csvImage || '',
        imageFallback: buildOnlineCourseImage(courseName, folderMeta.name, level),
        description: buildCourseDescription(courseName, level, folderMeta.name, descriptionInput)
    };

    if (byNameLevel) {
        await db.collection('courses').doc(byNameLevel.id).update(payload);
        const updated = { ...byNameLevel, ...payload };
        upsertAvailableCourse(updated);
        summary.globalCoursesUpdated = (summary.globalCoursesUpdated || 0) + 1;
        return updated;
    }

    const ref = await db.collection('courses').add(payload);
    const created = { id: ref.id, ...payload };
    upsertAvailableCourse(created);
    summary.globalCoursesCreated = (summary.globalCoursesCreated || 0) + 1;
    return created;
}

async function applyUniversityOfferingsRows(rawRows) {
    const summary = {
        processed: 0,
        added: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        globalCoursesCreated: 0,
        globalCoursesUpdated: 0
    };

    for (let index = 0; index < rawRows.length; index += 1) {
        const rawRow = rawRows[index];
        summary.processed += 1;
        const row = normalizeImportRow(rawRow);
        const rowNumber = index + 2;
        const course = await ensureGlobalCourseForOfferingRow(row, rowNumber, summary);

        if (!course) {
            continue;
        }

        const feesRaw = getRowValue(row, ['fees', 'fee', 'amount', 'price', 'tuition_fee', 'tuition'], '');
        const parsedFees = parseNumberValue(feesRaw);
        if (feesRaw !== '' && parsedFees === null) {
            summary.skipped += 1;
            summary.errors.push(`Row ${rowNumber}: invalid fees "${feesRaw}".`);
            continue;
        }

        const durationRaw = getRowValue(row, ['duration_years', 'duration', 'years'], '');
        const parsedDuration = parseNumberValue(durationRaw) ?? parseDurationYearsFromText(durationRaw);
        if (durationRaw !== '' && (parsedDuration === null || parsedDuration < 1)) {
            summary.skipped += 1;
            summary.errors.push(`Row ${rowNumber}: invalid duration "${durationRaw}".`);
            continue;
        }
        const semestersRaw = getRowValue(row, ['semesters', 'total_semesters', 'semester_count'], '');
        const parsedSemesters = parseNumberValue(semestersRaw);
        if (semestersRaw !== '' && (parsedSemesters === null || parsedSemesters < 1)) {
            summary.skipped += 1;
            summary.errors.push(`Row ${rowNumber}: invalid semesters "${semestersRaw}".`);
            continue;
        }

        const currencyRaw = getRowValue(row, ['currency'], course.baseCurrency || DEFAULT_BASE_CURRENCY).toUpperCase();
        const currency = OFFERING_CURRENCIES.includes(currencyRaw) ? currencyRaw : (course.baseCurrency || DEFAULT_BASE_CURRENCY);
        const intakeValue = getRowValue(row, ['intake', 'intakes', 'intake_months'], '');
        const intake = parseIntakeValue(intakeValue);
        const baseDuration = Number(course.baseDurationYears);
        const effectiveDuration = parsedDuration ?? (Number.isFinite(baseDuration) && baseDuration > 0 ? baseDuration : null);
        const baseSemesters = Number(course.totalSemesters);
        const effectiveSemesters =
            parsedSemesters ??
            (Number.isFinite(baseSemesters) && baseSemesters > 0 ? baseSemesters : (effectiveDuration ? Math.round(effectiveDuration * 2) : null));

        const idx = universityCoursesTemp.findIndex(uc => uc.courseId === course.id);
        if (idx === -1) {
            universityCoursesTemp.push({
                courseId: course.id,
                courseGlobalId: course.courseId || '',
                courseName: course.name,
                level: course.level || 'Bachelor',
                category: course.category || 'Other',
                fees: parsedFees ?? Number(course.basePrice) ?? 0,
                currency,
                durationYears: effectiveDuration,
                semesters: effectiveSemesters,
                intake
            });
            summary.added += 1;
            continue;
        }

        const existing = universityCoursesTemp[idx];
        const mergedDuration =
            parsedDuration ??
            existing.durationYears ??
            (Number.isFinite(baseDuration) && baseDuration > 0 ? baseDuration : null);
        const mergedSemesters =
            parsedSemesters ??
            existing.semesters ??
            (Number.isFinite(baseSemesters) && baseSemesters > 0 ? baseSemesters : (mergedDuration ? Math.round(mergedDuration * 2) : null));
        universityCoursesTemp[idx] = {
            ...existing,
            courseName: existing.courseName || course.name,
            level: existing.level || course.level || 'Bachelor',
            category: existing.category || course.category || 'Other',
            courseGlobalId: existing.courseGlobalId || course.courseId || '',
            fees: parsedFees ?? existing.fees ?? Number(course.basePrice) ?? 0,
            currency: currency || existing.currency || course.baseCurrency || DEFAULT_BASE_CURRENCY,
            durationYears: mergedDuration,
            semesters: mergedSemesters,
            intake: intake.length ? intake : (existing.intake || ['September'])
        };
        summary.updated += 1;
    }

    return summary;
}

function parseUniversityOfferingsRowsFromText(text, fileName = '') {
    const lowerName = String(fileName || '').toLowerCase();
    if (lowerName.endsWith('.json')) {
        const parsed = JSON.parse(text);
        const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.offerings) ? parsed.offerings : []);
        if (!rows.length) return [];
        return rows;
    }
    return parseCsvToObjects(text);
}

async function handleUniversityOfferingsImport(event) {
    const input = event.target;
    const file = input?.files?.[0];
    if (!file) return;

    try {
        if (availableCourses.length === 0) {
            await loadAvailableCourses();
        }
        const text = await file.text();
        const rows = parseUniversityOfferingsRowsFromText(text, file.name);
        if (!rows.length) {
            alert('No import rows found. Use the template format.');
            return;
        }

        const summary = await applyUniversityOfferingsRows(rows);
        refreshFolderPicker();

        const errorPreview = summary.errors.slice(0, 8).join('\n');
        const extraCount = summary.errors.length > 8 ? `\n...and ${summary.errors.length - 8} more issue(s).` : '';
        alert(
            `University offerings import completed.\n` +
            `Processed: ${summary.processed}\n` +
            `Added: ${summary.added}\n` +
            `Updated: ${summary.updated}\n` +
            `Skipped: ${summary.skipped}\n` +
            `Global courses created: ${summary.globalCoursesCreated}\n` +
            `Global courses updated: ${summary.globalCoursesUpdated}` +
            (summary.errors.length ? `\n\nIssues:\n${errorPreview}${extraCount}` : '')
        );
    } catch (error) {
        console.error('University offerings import failed:', error);
        alert('Import failed. Ensure the file is valid CSV or JSON.');
    } finally {
        if (input) input.value = '';
    }
}

function parseCsvToObjects(csvText) {
    const rows = [];
    let current = '';
    let row = [];
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i += 1) {
        const char = csvText[i];
        const next = csvText[i + 1];

        if (char === '"' && inQuotes && next === '"') {
            current += '"';
            i += 1;
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === ',' && !inQuotes) {
            row.push(current);
            current = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') i += 1;
            row.push(current);
            if (row.some(cell => String(cell).trim() !== '')) rows.push(row);
            row = [];
            current = '';
            continue;
        }

        current += char;
    }

    if (current.length || row.length) {
        row.push(current);
        if (row.some(cell => String(cell).trim() !== '')) rows.push(row);
    }

    if (!rows.length) return [];

    const headers = rows[0].map((header) => normalizeCsvKey(header));
    return rows.slice(1).map((values) => {
        const obj = {};
        headers.forEach((key, idx) => {
            if (!key) return;
            obj[key] = (values[idx] || '').trim();
        });
        return obj;
    }).filter((obj) => Object.keys(obj).length > 0);
}

function normalizeCsvKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '_');
}

function getRowValue(row, keys, fallback = '') {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
            return String(row[key]).trim();
        }
    }
    return fallback;
}

function normalizeCourseIdentifier(value) {
    return String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[^\w-]/g, '-')
        .replace(/_+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function parseDurationYearsFromText(rawValue) {
    const text = String(rawValue || '').toLowerCase();
    if (!text) return null;
    const match = text.match(/(\d+(\.\d+)?)/);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function generateCourseIdentifier(courseName, level = '') {
    const levelMap = {
        foundation: 'FDN',
        diploma: 'DIP',
        bachelor: 'BSC',
        masters: 'MSC',
        phd: 'PHD'
    };
    const levelCode = levelMap[String(level || '').trim().toLowerCase()] || 'CRS';
    const words = String(courseName || '')
        .toUpperCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
    const nameCode = words.slice(0, 3).map((w) => w.slice(0, 3)).join('-');
    return normalizeCourseIdentifier(`${levelCode}-${nameCode || 'COURSE'}`);
}

function getUniqueCourseIdentifier(preferredId, courseName, level, ignoreDocId = null) {
    const used = new Set(
        availableCourses
            .filter((course) => !ignoreDocId || course.id !== ignoreDocId)
            .map((course) => normalizeCourseIdentifier(course.courseId))
            .filter(Boolean)
    );
    const base = normalizeCourseIdentifier(preferredId) || generateCourseIdentifier(courseName, level);
    if (!used.has(base)) return base;
    let i = 2;
    while (used.has(`${base}-${i}`)) i += 1;
    return `${base}-${i}`;
}

function sanitizePathSegment(value, fallback) {
    const cleaned = String(value || '')
        .trim()
        .replace(/[\\\/]+/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s-]/g, '')
        .trim();
    return cleaned || fallback;
}

function formatCourseFileName(courseName) {
    const base = String(courseName || '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w-]/g, '');
    return base || 'course';
}

function buildOnlineCourseImage(courseName, category, level) {
    const query = encodeURIComponent(`${courseName} ${category} ${level} education university`);
    return `https://source.unsplash.com/1600x900/?${query}`;
}

function buildCourseDescription(courseName, level, category, shortDescription) {
    const trimmed = String(shortDescription || '').trim();
    if (trimmed.length >= 110) return trimmed;

    const intro = trimmed || `${courseName} prepares students with industry-aligned knowledge and practical skills.`;
    return `${intro} This ${level} programme in ${category} combines academic foundations, applied projects, and real-world case studies to strengthen employability outcomes. Students develop critical thinking, communication, and professional competencies for university progression and long-term career growth.`;
}

async function importCoursesFromCsvRows(rows) {
    const summary = {
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        foldersCreated: 0,
        errors: []
    };

    const foldersSnapshot = await db.collection('courseFolders').orderBy('order', 'asc').get();
    const folderMap = new Map();
    foldersSnapshot.forEach((doc) => {
        const name = String(doc.data().name || '').trim();
        if (!name) return;
        folderMap.set(name.toLowerCase(), { id: doc.id, name });
    });

    const coursesSnapshot = await db.collection('courses').get();
    const existingCoursesMap = new Map();
    const existingByStableId = new Map();
    coursesSnapshot.forEach((doc) => {
        const data = doc.data() || {};
        const key = `${String(data.name || '').trim().toLowerCase()}__${String(data.level || '').trim().toLowerCase()}`;
        if (key && key !== '__') {
            existingCoursesMap.set(key, { id: doc.id, data });
        }
        const stableId = normalizeCourseIdentifier(data.courseId);
        if (stableId) {
            existingByStableId.set(stableId, { id: doc.id, data });
        }
    });

    const seenImportCourseIds = new Map();
    for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        summary.processed += 1;
        const rowNumber = index + 2;

        const courseName = getRowValue(row, ['course_name', 'name', 'course']);
        if (!courseName) {
            summary.skipped += 1;
            summary.errors.push(`Row ${rowNumber}: course_name is required.`);
            continue;
        }

        const level = getRowValue(row, ['level', 'course_level'], 'Bachelor');
        const fallbackFolderName = getRowValue(row, ['folder_name', 'folder', 'category', 'discipline'], 'Uncategorized');
        // Per project rule: level names are used as folder names.
        const folderName = level || fallbackFolderName;
        const preferredStableId = normalizeCourseIdentifier(getRowValue(row, ['course_id', 'courseid', 'global_course_id'], ''));
        if (!preferredStableId) {
            summary.skipped += 1;
            summary.errors.push(`Row ${rowNumber}: course_id is required.`);
            continue;
        }
        const duration = getRowValue(row, ['duration'], '');
        const credits = getRowValue(row, ['credits'], '');
        const baseCurrencyRaw = getRowValue(row, ['base_currency', 'currency'], DEFAULT_BASE_CURRENCY).toUpperCase();
        const baseCurrency = OFFERING_CURRENCIES.includes(baseCurrencyRaw) ? baseCurrencyRaw : DEFAULT_BASE_CURRENCY;
        const basePrice = parseNumberValue(getRowValue(row, ['base_price', 'base_fees', 'fees', 'price', 'amount', 'tuition_fee'], ''));
        const baseDurationYears =
            parseNumberValue(getRowValue(row, ['base_duration_years', 'duration_years'], '')) ??
            parseDurationYearsFromText(duration);
        const totalSemesters =
            parseNumberValue(getRowValue(row, ['total_semesters', 'semesters'], '')) ??
            (baseDurationYears ? Math.round(baseDurationYears * 2) : null);
        const sourceDescription = getRowValue(row, ['description', 'details'], '');
        const description = buildCourseDescription(courseName, level, folderName, sourceDescription);
        const csvImage = getRowValue(row, ['image', 'image_path', 'image_link'], '');
        const image = csvImage;
        const imageFallback = buildOnlineCourseImage(courseName, folderName, level);

        let folderMeta = folderMap.get(folderName.toLowerCase());
        if (!folderMeta) {
            const newFolderRef = await db.collection('courseFolders').add({
                name: folderName,
                order: folderMap.size + 1,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            folderMeta = { id: newFolderRef.id, name: folderName };
            folderMap.set(folderName.toLowerCase(), folderMeta);
            summary.foldersCreated += 1;
        }

        const payload = {
            name: courseName,
            courseId: preferredStableId,
            level,
            folderId: folderMeta.id,
            category: folderMeta.name,
            basePrice: basePrice ?? 0,
            baseCurrency,
            baseDurationYears: baseDurationYears ? Number(baseDurationYears) : null,
            totalSemesters: totalSemesters ? Number(totalSemesters) : null,
            duration: duration || (baseDurationYears ? `${baseDurationYears} years` : ''),
            credits,
            image,
            imageFallback,
            description
        };

        const courseKey = `${courseName.trim().toLowerCase()}__${level.trim().toLowerCase()}`;
        const importFingerprint = `${courseKey}`;
        const alreadySeenFingerprint = seenImportCourseIds.get(preferredStableId);
        if (alreadySeenFingerprint && alreadySeenFingerprint !== importFingerprint) {
            summary.skipped += 1;
            summary.errors.push(`Row ${rowNumber}: duplicate course_id "${preferredStableId}" maps to multiple course names/levels in this import.`);
            continue;
        }
        seenImportCourseIds.set(preferredStableId, importFingerprint);

        const existingById = existingByStableId.get(preferredStableId);
        const existingByName = existingCoursesMap.get(courseKey);
        if (!existingById && existingByName) {
            const nameMatchedCourseId = normalizeCourseIdentifier(existingByName.data?.courseId);
            if (nameMatchedCourseId && nameMatchedCourseId !== preferredStableId) {
                summary.skipped += 1;
                summary.errors.push(`Row ${rowNumber}: "${courseName}" (${level}) already exists with course_id "${nameMatchedCourseId}".`);
                continue;
            }
        }

        const existing = existingById || existingByName;

        if (existing) {
            await db.collection('courses').doc(existing.id).update(payload);
            existingByStableId.set(preferredStableId, { id: existing.id, data: payload });
            existingCoursesMap.set(courseKey, { id: existing.id, data: payload });
            summary.updated += 1;
        } else {
            const docRef = await db.collection('courses').add(payload);
            existingCoursesMap.set(courseKey, { id: docRef.id, data: payload });
            existingByStableId.set(preferredStableId, { id: docRef.id, data: payload });
            summary.created += 1;
        }
    }

    return summary;
}

// ============================================
// Section Navigation
// ============================================

function switchSection(section) {
    currentSection = section;
    
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) item.classList.add('active');
    });
    
    const titles = {
        dashboard: 'Dashboard',
        courses: 'Courses',
        universities: 'Universities',
        team: 'Team Members',
        testimonials: 'Testimonials',
        services: 'Services',
        inquiries: 'Inquiries',
        applications: 'Applications',
        agents: 'Agents',
        admins: 'Admins',
        students: 'Students',
        settings: 'Settings'
    };
    document.getElementById('sectionTitle').textContent = titles[section] || section;
    
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section + 'Section').classList.add('active');
    
    loadSectionData(section);
}

function loadSectionData(section) {
    switch(section) {
        case 'dashboard': loadDashboard(); break;
        case 'courses': loadCoursesWithFolders(); break;
        case 'universities': loadUniversitiesAdmin(); break;
        case 'team': loadTeam(); break;
        case 'testimonials': loadTestimonials(); break;
        case 'services': loadServices(); break;
        case 'inquiries': loadInquiries(); break;
        case 'applications': loadApplications(); break;
        case 'agents': loadAgents(); break;
        case 'admins': loadAdmins(); break;
        case 'students': loadStudentsAdmin(); break;
        case 'settings': loadSettings(); loadLogoSetting(); loadHeroImageSetting(); loadPageHeroImageSettings(); break;
    }
}

// ============================================
// Dashboard
// ============================================

async function loadDashboard() {
    try {
        const [inquiries, courses, universities, team, applications, testimonials, agents] = await Promise.all([
            db.collection('inquiries').where('status', '==', 'new').get(),
            db.collection('courses').get(),
            db.collection('universities').get(),
            db.collection('team').get(),
            db.collection('applications').get(),
            db.collection('testimonials').get(),
            db.collection('agents').where('status', '==', 'active').get()
        ]);

        // Update primary KPI stats
        document.getElementById('statInquiries').textContent = inquiries.size;
        document.getElementById('statApplications').textContent = applications.size;
        document.getElementById('statStudents').textContent = applications.size;
        document.getElementById('statAgents').textContent = agents.size;

        // Update secondary metrics
        document.getElementById('statCourses').textContent = courses.size;
        document.getElementById('statUniversities').textContent = universities.size;
        document.getElementById('statTeam').textContent = team.size;
        document.getElementById('statTestimonials').textContent = testimonials.size;

        // Update badges
        document.getElementById('inquiryBadge').textContent = inquiries.size;
        const applicationsBadge = document.getElementById('applicationsBadge');
        if (applicationsBadge) applicationsBadge.textContent = applications.size;

        // Load recent inquiries
        const recentInquiriesSnapshot = await db.collection('inquiries').orderBy('createdAt', 'desc').limit(5).get();
        const inquiriesTbody = document.querySelector('#recentInquiriesTable tbody');
        inquiriesTbody.innerHTML = '';

        if (recentInquiriesSnapshot.empty) {
            inquiriesTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">No inquiries yet</td></tr>';
        } else {
            recentInquiriesSnapshot.forEach(doc => {
                const data = doc.data();
                const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A';
                inquiriesTbody.innerHTML += `
                    <tr>
                        <td>${data.name || 'N/A'}</td>
                        <td>${data.email || 'N/A'}</td>
                        <td>${data.interest || data.subject || 'N/A'}</td>
                        <td><span class="status status-${data.status || 'new'}">${data.status || 'new'}</span></td>
                        <td>${date}</td>
                    </tr>
                `;
            });
        }

        // Load recent applications
        const recentApplicationsSnapshot = await db.collection('applications').orderBy('createdAt', 'desc').limit(5).get();
        const applicationsTbody = document.querySelector('#recentApplicationsTable tbody');
        if (applicationsTbody) {
            applicationsTbody.innerHTML = '';

            if (recentApplicationsSnapshot.empty) {
                applicationsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#888;">No applications yet</td></tr>';
            } else {
                recentApplicationsSnapshot.forEach(doc => {
                    const data = doc.data();
                    const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A';
                    const studentName = data.student?.name || 'N/A';
                    const universityName = data.universityName || 'N/A';
                    const status = data.status || 'new';
                    applicationsTbody.innerHTML += `
                        <tr>
                            <td>${studentName}</td>
                            <td>${universityName}</td>
                            <td><span class="status status-${status}">${status}</span></td>
                            <td>${date}</td>
                        </tr>
                    `;
                });
            }
        }

        // Render application status distribution chart
        renderApplicationStatusChart(applications);
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Render application status distribution donut chart
function renderApplicationStatusChart(applicationsSnapshot) {
    const statusCounts = {
        new: 0,
        contacted: 0,
        applied: 0,
        offer: 0,
        enrolled: 0,
        rejected: 0
    };

    applicationsSnapshot.forEach(doc => {
        const status = (doc.data().status || 'new').toLowerCase();
        if (status in statusCounts) {
            statusCounts[status]++;
        }
    });

    const total = applicationsSnapshot.size;
    const statuses = [
        { key: 'new', label: 'New', color: '#0f172a' },
        { key: 'contacted', label: 'Contacted', color: '#066c49' },
        { key: 'applied', label: 'Applied', color: '#0d9488' },
        { key: 'offer', label: 'Offer', color: '#f59e0b' },
        { key: 'enrolled', label: 'Enrolled', color: '#10b981' },
        { key: 'rejected', label: 'Rejected', color: '#ef4444' }
    ];

    // Create donut chart SVG
    const svg = document.getElementById('appStatusChart');
    if (!svg) return;
    svg.innerHTML = '';

    const centerX = 100, centerY = 100;
    const radius = 70, innerRadius = 45;
    let currentAngle = -90; // Start from top

    statuses.forEach(status => {
        const count = statusCounts[status.key];
        if (count === 0) return;

        const percentage = (count / total) * 100;
        const sliceAngle = (percentage / 100) * 360;
        const endAngle = currentAngle + sliceAngle;

        // Create arc path
        const startRad = (currentAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1 = centerX + radius * Math.cos(startRad);
        const y1 = centerY + radius * Math.sin(startRad);
        const x2 = centerX + radius * Math.cos(endRad);
        const y2 = centerY + radius * Math.sin(endRad);

        const ix1 = centerX + innerRadius * Math.cos(startRad);
        const iy1 = centerY + innerRadius * Math.sin(startRad);
        const ix2 = centerX + innerRadius * Math.cos(endRad);
        const iy2 = centerY + innerRadius * Math.sin(endRad);

        const largeArc = sliceAngle > 180 ? 1 : 0;

        const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;

        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', path);
        pathEl.setAttribute('fill', status.color);
        pathEl.setAttribute('stroke', 'var(--color-surface)');
        pathEl.setAttribute('stroke-width', '2');
        pathEl.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))';
        svg.appendChild(pathEl);

        currentAngle = endAngle;
    });

    // Update center label
    document.getElementById('appStatusTotal').textContent = total;

    // Create legend
    const legend = document.getElementById('appStatusLegend');
    legend.innerHTML = '';
    statuses.forEach(status => {
        const count = statusCounts[status.key];
        if (count === 0) return;

        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background-color: ${status.color};"></div>
            <div class="legend-label">${status.label}</div>
            <div class="legend-value">${count}</div>
        `;
        legend.appendChild(item);
    });
}

// ============================================
// Applications
// ============================================

async function loadApplications() {
    try {
        if (!availableCourses.length) {
            await loadAvailableCourses();
        }
        const snapshot = await db.collection('applications').orderBy('createdAt', 'desc').get();
        applicationsCache = [];
        snapshot.forEach(doc => {
            applicationsCache.push({ id: doc.id, ...doc.data() });
        });
        populateApplicationFilters(applicationsCache);
        renderApplications(applicationsCache);
    } catch (error) {
        console.error('Error loading applications:', error);
    }
}

function getProgrammeDisplay(app) {
    const label = app?.student?.programmeLabel || app?.student?.programmeName;
    if (label) return label;
    const raw = app?.student?.programme || '';
    if (!raw) return 'N/A';
    const directMatch = availableCourses.find(c => c.id === raw);
    if (directMatch?.name) return directMatch.name;
    const byProgrammeId = availableCourses.find(c => c.id === app?.student?.programmeId);
    if (byProgrammeId?.name) return byProgrammeId.name;
    return raw;
}

function populateApplicationFilters(apps) {
    const uniSelect = document.getElementById('appUniversityFilter');
    const courseSelect = document.getElementById('appCourseFilter');
    if (!uniSelect || !courseSelect) return;
    const universities = [...new Set(apps.map(a => a.universityName).filter(Boolean))].sort();
    const courses = [...new Set(apps.map(a => getProgrammeDisplay(a)).filter(Boolean))].sort();
    uniSelect.innerHTML = '<option value="all">All</option>' + universities.map(u => `<option value="${u}">${u}</option>`).join('');
    courseSelect.innerHTML = '<option value="all">All</option>' + courses.map(c => `<option value="${c}">${c}</option>`).join('');
}

function renderApplications(apps) {
    const tbody = document.querySelector('#applicationsTable tbody');
    if (!tbody) return;
    if (apps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No applications found.</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    apps.forEach(app => {
        const date = app.createdAt?.toDate ? app.createdAt.toDate().toLocaleDateString() : 'N/A';
        const studentName = app.student?.name || 'N/A';
        const studentEmail = app.student?.email || 'N/A';
        const programme = getProgrammeDisplay(app);
        tbody.innerHTML += `
            <tr>
                <td><strong>${studentName}</strong><br><span style="color:#64748b;font-size:0.8rem;">${studentEmail}</span></td>
                <td>${app.universityName || 'N/A'}</td>
                <td>${programme}</td>
                <td><span class="status status-${app.status || 'new'}">${app.status || 'new'}</span></td>
                <td>${date}</td>
                <td class="action-btns">
                    <button class="btn-view" onclick="openApplicationDrawer('${app.id}')">View</button>
                    <button class="btn-delete" onclick="openDeleteApplicationConfirm('${app.id}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

function applyApplicationFilters() {
    const search = document.getElementById('appSearch')?.value.toLowerCase().trim() || '';
    const status = document.getElementById('appStatusFilter')?.value || 'all';
    const uni = document.getElementById('appUniversityFilter')?.value || 'all';
    const course = document.getElementById('appCourseFilter')?.value || 'all';
    const dateFrom = document.getElementById('appDateFrom')?.value || '';
    const dateTo = document.getElementById('appDateTo')?.value || '';
    const sort = document.getElementById('appSort')?.value || 'newest';

    let filtered = applicationsCache.filter(app => {
        const displayProgramme = getProgrammeDisplay(app);
        const hay = `${app.student?.name || ''} ${app.student?.email || ''} ${app.universityName || ''} ${displayProgramme}`.toLowerCase();
        if (search && !hay.includes(search)) return false;
        if (status !== 'all' && (app.status || 'new') !== status) return false;
        if (uni !== 'all' && app.universityName !== uni) return false;
        const programme = displayProgramme;
        if (course !== 'all' && programme !== course) return false;
        if (dateFrom || dateTo) {
            const created = app.createdAt?.toDate ? app.createdAt.toDate() : null;
            if (!created) return false;
            if (dateFrom && created < new Date(dateFrom)) return false;
            if (dateTo && created > new Date(dateTo)) return false;
        }
        return true;
    });

    filtered.sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        switch (sort) {
            case 'oldest': return aDate - bDate;
            case 'status': return (a.status || '').localeCompare(b.status || '');
            case 'university': return (a.universityName || '').localeCompare(b.universityName || '');
            case 'course': {
                const ac = getProgrammeDisplay(a);
                const bc = getProgrammeDisplay(b);
                return ac.localeCompare(bc);
            }
            default: return bDate - aDate;
        }
    });

    renderApplications(filtered);
}

function resetApplicationFilters() {
    const ids = ['appSearch','appStatusFilter','appUniversityFilter','appCourseFilter','appDateFrom','appDateTo','appSort'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'INPUT') el.value = '';
        else el.value = id === 'appSort' ? 'newest' : 'all';
    });
    renderApplications(applicationsCache);
}

function openApplicationDrawer(appId) {
    selectedApplicationId = appId;
    const app = applicationsCache.find(a => a.id === appId);
    if (!app) return;
    const drawer = document.getElementById('applicationDrawer');
    const name = app.student?.name || 'Applicant';
    document.getElementById('drawerTitle').textContent = name;
    document.getElementById('drawerSubtitle').textContent = app.student?.email || '';
    document.getElementById('detailStudent').textContent = `${app.student?.name || ''} • ${app.student?.nationality || 'N/A'}`;
    document.getElementById('detailContact').textContent = `${app.student?.phoneCode || ''} ${app.student?.phone || ''} • ${app.student?.email || ''}`;
    document.getElementById('detailLocation').textContent = `${app.student?.city || ''} ${app.student?.country ? '• ' + app.student.country : ''}`;
    document.getElementById('detailGuardian').textContent = `${app.guardian?.name || 'N/A'} • ${app.guardian?.email || ''}`;
    document.getElementById('detailGuardianContact').textContent = `${app.guardian?.phoneCode || ''} ${app.guardian?.phone || ''}`;
    document.getElementById('detailUniversity').textContent = app.universityName || 'N/A';
    document.getElementById('detailProgramme').textContent = getProgrammeDisplay(app);
    const statusSelect = document.getElementById('detailStatus');
    if (statusSelect) statusSelect.value = app.status || 'new';
    const docs = document.getElementById('detailDocuments');
    if (docs) {
        docs.innerHTML = '';
        const entries = app.documents || {};
        Object.keys(entries).forEach(key => {
            const doc = entries[key];
            const label = key.replace(/([A-Z])/g, ' $1').trim();
            if (doc?.path) {
                docs.innerHTML += `<li>${label}: <button class="btn btn-outline btn-compact" onclick="downloadApplicationFile('${doc.path}', '${key}', '${app.id}')">Download</button></li>`;
            } else {
                docs.innerHTML += `<li>${label}: <code>N/A</code></li>`;
            }
        });
    }
    document.getElementById('detailNotes').value = app.notes || '';
    if (drawer) drawer.classList.add('open');
}

async function downloadApplicationFile(path, key, appId) {
    alert('File downloads are not available on Spark Plan. Please contact the agent or student to request this document.');
}

function closeApplicationDrawer() {
    const drawer = document.getElementById('applicationDrawer');
    if (drawer) drawer.classList.remove('open');
    selectedApplicationId = null;
}

async function updateApplicationStatus() {
    if (!selectedApplicationId) return;
    const status = document.getElementById('detailStatus').value;
    try {
        await updateDocument('applications', selectedApplicationId, { status });
        const app = applicationsCache.find(a => a.id === selectedApplicationId);
        if (app) app.status = status;
        applyApplicationFilters();
    } catch (error) {
        console.error('Error updating application status:', error);
    }
}

async function saveApplicationNotes() {
    if (!selectedApplicationId) return;
    const notes = document.getElementById('detailNotes').value;
    try {
        await updateDocument('applications', selectedApplicationId, { notes });
        const app = applicationsCache.find(a => a.id === selectedApplicationId);
        if (app) app.notes = notes;
        alert('Notes saved');
    } catch (error) {
        console.error('Error saving notes:', error);
        alert('Error saving notes');
    }
}

function exportApplicationsCsv() {
    if (!applicationsCache.length) return;
    const rows = [
        ['Name','Email','University','Programme','Status','Date']
    ];
    applicationsCache.forEach(app => {
        const date = app.createdAt?.toDate ? app.createdAt.toDate().toISOString() : '';
        rows.push([
            app.student?.name || '',
            app.student?.email || '',
            app.universityName || '',
            getProgrammeDisplay(app),
            app.status || '',
            date
        ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'applications.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================
// APPLICATION DELETION
// ============================================

let pendingDeleteApplicationId = null;

function openDeleteApplicationConfirm(appId) {
    const app = applicationsCache.find(a => a.id === appId);
    if (!app) {
        console.error('Application not found');
        return;
    }

    pendingDeleteApplicationId = appId;

    // Populate modal with application details
    document.getElementById('delAppStudent').textContent = app.student?.name || 'N/A';
    document.getElementById('delAppEmail').textContent = app.student?.email || 'N/A';
    document.getElementById('delAppUniversity').textContent = app.universityName || 'N/A';
    document.getElementById('delAppProgramme').textContent = getProgrammeDisplay(app);
    document.getElementById('delAppStatus').textContent = app.status || 'new';
    const date = app.createdAt?.toDate ? app.createdAt.toDate().toLocaleDateString() : 'N/A';
    document.getElementById('delAppDate').textContent = date;

    // Show modal
    const overlay = document.getElementById('deleteApplicationOverlay');
    if (overlay) overlay.style.display = 'flex';
}

function closeDeleteApplicationConfirm() {
    const overlay = document.getElementById('deleteApplicationOverlay');
    if (overlay) overlay.style.display = 'none';
    pendingDeleteApplicationId = null;
}

async function confirmDeleteApplication() {
    if (!pendingDeleteApplicationId) return;

    try {
        const overlay = document.getElementById('deleteApplicationOverlay');
        const btn = overlay?.querySelector('.btn-danger');
        if (btn) btn.disabled = true;

        // Get current admin email
        const adminEmail = document.getElementById('adminEmail')?.textContent || 'unknown@email.com';

        // Get application data for audit log
        const app = applicationsCache.find(a => a.id === pendingDeleteApplicationId);

        // Delete the application
        await db.collection('applications').doc(pendingDeleteApplicationId).delete();

        // Create audit log entry
        await db.collection('auditLogs').add({
            action: 'DELETE_APPLICATION',
            collection: 'applications',
            documentId: pendingDeleteApplicationId,
            adminEmail: adminEmail,
            deletedApplicationSummary: {
                studentName: app?.student?.name || 'N/A',
                studentEmail: app?.student?.email || 'N/A',
                university: app?.universityName || 'N/A',
                status: app?.status || 'new',
                createdAt: app?.createdAt || null
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Close modal
        closeDeleteApplicationConfirm();

        // Reload applications
        await loadApplications();

        // Show success message
        showAdminToast({
            kind: 'application',
            title: 'Application deleted',
            message: `${app?.student?.name || 'Application'} has been permanently removed.`
        });

    } catch (error) {
        console.error('Error deleting application:', error);
        showAdminToast({
            kind: 'application',
            title: 'Deletion failed',
            message: error.message || 'Could not delete application'
        });
        const overlay = document.getElementById('deleteApplicationOverlay');
        const btn = overlay?.querySelector('.btn-danger');
        if (btn) btn.disabled = false;
    }
}

// ============================================
// CRUD - Courses (Master List)
// ============================================

async function loadCourses() {
    try {
        const snapshot = await db.collection('courses').orderBy('name', 'asc').get();
        const tbody = document.querySelector('#coursesTable tbody');
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No courses yet. Click "Add Course" to create one.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>${data.image ? `<img src="${data.image}" class="table-img" alt="">` : '<i class="bi bi-journal-bookmark"></i>'}</td>
                    <td><strong>${data.name || 'N/A'}</strong></td>
                    <td>${data.level || 'Bachelor'}</td>
                    <td>${data.category || 'Other'}</td>
                    <td>${data.duration || 'N/A'}</td>
                    <td class="action-btns">
                        <button class="btn-edit" onclick="editItem('course', '${doc.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteItem('courses', '${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// ============================================
// CRUD - Universities
// ============================================

async function loadUniversitiesAdmin() {
    try {
        const snapshot = await db.collection('universities').orderBy('order', 'asc').get();
        const tbody = document.querySelector('#universitiesTable tbody');
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No universities yet. Click "Add University" to create one.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        snapshot.forEach(async doc => {
            const data = doc.data();
            // Count offerings from courseOfferings collection (first-class collection)
            let courseCount = '—';
            try {
                const offeringsSnap = await db.collection('courseOfferings')
                    .where('universityId', '==', doc.id)
                    .where('active', '==', true)
                    .get();
                courseCount = offeringsSnap.size;
            } catch (err) {
                console.warn('Error counting offerings:', err);
            }
            tbody.innerHTML += `
                <tr>
                    <td><strong>${data.shortCode || 'N/A'}</strong></td>
                    <td>${data.name || 'N/A'}</td>
                    <td>${data.ranking ? '#' + data.ranking : 'N/A'}</td>
                    <td>${courseCount} courses</td>
                    <td class="action-btns">
                        <button class="btn-view" onclick="window.open('pages/university-detail.html?id=${doc.id}', '_blank')">View</button>
                        <button class="btn-edit" onclick="editItem('university', '${doc.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteItem('universities', '${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading universities:', error);
    }
}

// ============================================
// Other CRUD Operations
// ============================================

async function loadTeam() {
    try {
        const snapshot = await db.collection('team').orderBy('order', 'asc').get();
        const tbody = document.querySelector('#teamTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No team members yet.</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><img src="${data.photoPath || data.photo || 'assets/images/logo.png'}" class="table-img" alt="${data.name}"></td>
                    <td>${data.name || 'N/A'}</td>
                    <td>${data.role || 'N/A'}</td>
                    <td><span class="status status-${data.active ? 'active' : 'inactive'}">${data.active ? 'Active' : 'Inactive'}</span></td>
                    <td class="action-btns">
                        <button class="btn-edit" onclick="editItem('team', '${doc.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteItem('team', '${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading team:', error);
    }
}

async function loadTestimonials() {
    try {
        const snapshot = await db.collection('testimonials').orderBy('createdAt', 'desc').get();
        const tbody = document.querySelector('#testimonialsTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No testimonials yet.</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><img src="${data.photoPath || data.photo || 'assets/images/logo.png'}" class="table-img" alt="${data.studentName || data.name}"></td>
                    <td>${data.studentName || data.name || 'N/A'}</td>
                    <td>${data.university || data.program || 'N/A'}</td>
                    <td><span class="status status-${data.featured ? 'active' : 'inactive'}">${data.featured ? 'Featured' : 'Hidden'}</span></td>
                    <td class="action-btns">
                        <button class="btn-edit" onclick="editItem('testimonial', '${doc.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteItem('testimonials', '${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading testimonials:', error);
    }
}

async function loadServices() {
    try {
        const snapshot = await db.collection('services').orderBy('order', 'asc').get();
        const tbody = document.querySelector('#servicesTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No services yet.</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>${renderServiceIcon(data.icon)}</td>
                    <td>${data.title || 'N/A'}</td>
                    <td>${data.order || 0}</td>
                    <td><span class="status status-${data.active ? 'active' : 'inactive'}">${data.active ? 'Active' : 'Inactive'}</span></td>
                    <td class="action-btns">
                        <button class="btn-edit" onclick="editItem('service', '${doc.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteItem('services', '${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

function renderServiceIcon(icon) {
    if (!icon) return '<i class="bi bi-tools"></i>';
    const trimmed = icon.trim();
    if (trimmed.startsWith('<i')) return trimmed;
    if (trimmed.startsWith('bi-')) return `<i class="bi ${trimmed}"></i>`;
    if (trimmed.startsWith('bi ')) return `<i class="${trimmed}"></i>`;
    return '<i class="bi bi-tools"></i>';
}

async function loadInquiries() {
    try {
        const filter = document.getElementById('inquiryFilter').value;
        let query = db.collection('inquiries').orderBy('createdAt', 'desc');
        
        if (filter !== 'all') {
            query = db.collection('inquiries').where('status', '==', filter).orderBy('createdAt', 'desc');
        }
        
        const snapshot = await query.get();
        const tbody = document.querySelector('#inquiriesTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No inquiries found.</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A';
            tbody.innerHTML += `
                <tr>
                    <td>${data.name || 'N/A'}</td>
                    <td>${data.email || 'N/A'}</td>
                    <td>${data.phone || 'N/A'}</td>
                    <td>${data.country || 'N/A'}</td>
                    <td>${data.interest || data.subject || 'N/A'}</td>
                    <td>
                        <select onchange="updateInquiryStatus('${doc.id}', this.value)">
                            <option value="new" ${data.status === 'new' ? 'selected' : ''}>New</option>
                            <option value="contacted" ${data.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                            <option value="converted" ${data.status === 'converted' ? 'selected' : ''}>Converted</option>
                        </select>
                    </td>
                    <td>${date}</td>
                    <td class="action-btns">
                        <button class="btn-view" onclick="viewInquiry('${doc.id}')">View</button>
                        <button class="btn-delete" onclick="deleteItem('inquiries', '${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading inquiries:', error);
    }
}

async function updateInquiryStatus(docId, status) {
    try {
        await updateDocument('inquiries', docId, { status });
        loadDashboard();
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

async function viewInquiry(docId) {
    const doc = await getDocument('inquiries', docId);
    if (doc) {
        alert(`Name: ${doc.name}\nEmail: ${doc.email}\nPhone: ${doc.phone || 'N/A'}\nCountry: ${doc.country || 'N/A'}\nInterest: ${doc.interest}\nMessage: ${doc.message || 'N/A'}`);
    }
}

// ============================================
// Settings
// ============================================

async function loadSettings() {
    try {
        const doc = await db.collection('contactSettings').doc('main').get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('settingEmail').value = data.email || '';
            document.getElementById('settingPhone').value = data.phone || '';
            document.getElementById('settingWhatsApp').value = data.whatsapp || '';
            document.getElementById('settingHours').value = (data.workingHours && `${data.workingHours.start}-${data.workingHours.end}`) || '';
            document.getElementById('settingAddress').value = data.address || '';
            document.getElementById('settingFacebook').value = (data.socialMedia && data.socialMedia.facebook) || '';
            document.getElementById('settingInstagram').value = (data.socialMedia && data.socialMedia.instagram) || '';
            document.getElementById('settingTwitter').value = (data.socialMedia && data.socialMedia.twitter) || '';
            document.getElementById('settingYouTube').value = (data.socialMedia && data.socialMedia.youtube) || '';
            document.getElementById('settingLinkedIn').value = (data.socialMedia && data.socialMedia.linkedin) || '';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function handleSaveSettings(e) {
    e.preventDefault();

    // Prefer ImageInputField instance value (holds live data URL); fall back to raw input
    const getImgVal = (id) =>
        (imageFieldInstances[id] ? imageFieldInstances[id].getValue() : null)
        ?? document.getElementById(id)?.value ?? '';

    const logoUrl = getImgVal('logoUrl');
    const heroImageUrl = getImgVal('heroImageUrl');

    // Collect page-specific hero image URLs
    const pageHeroUrls = {
        universitiesHeroImageUrl: getImgVal('universitiesHeroImageUrl'),
        universityDetailHeroImageUrl: getImgVal('universityDetailHeroImageUrl'),
        coursesHeroImageUrl: getImgVal('coursesHeroImageUrl'),
        courseDetailHeroImageUrl: getImgVal('courseDetailHeroImageUrl'),
        servicesHeroImageUrl: getImgVal('servicesHeroImageUrl'),
        teamHeroImageUrl: getImgVal('teamHeroImageUrl'),
        contactHeroImageUrl: getImgVal('contactHeroImageUrl'),
        applyHeroImageUrl: getImgVal('applyHeroImageUrl')
    };

    if (logoUrl && !isValidImageUrl(logoUrl)) {
        alert('Invalid logo URL. Use HTTPS URL or assets/path');
        return;
    }
    if (heroImageUrl && !isValidImageUrl(heroImageUrl)) {
        alert('Invalid hero image URL. Use HTTPS URL or assets/path');
        return;
    }

    // Validate all page hero URLs
    for (const [key, url] of Object.entries(pageHeroUrls)) {
        if (url && !isValidImageUrl(url)) {
            alert(`Invalid URL for ${key}. Use HTTPS URL or assets/path`);
            return;
        }
    }

    const hoursStr = document.getElementById('settingHours').value;
    const [startTime, endTime] = hoursStr.includes('-') ? hoursStr.split('-').map(t => t.trim()) : ['09:00', '18:00'];

    const contactSettings = {
        email: document.getElementById('settingEmail').value,
        phone: document.getElementById('settingPhone').value,
        whatsapp: document.getElementById('settingWhatsApp').value,
        address: document.getElementById('settingAddress').value,
        workingHours: {
            start: startTime,
            end: endTime,
            days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        },
        socialMedia: {
            facebook: document.getElementById('settingFacebook').value,
            instagram: document.getElementById('settingInstagram').value,
            twitter: document.getElementById('settingTwitter').value,
            youtube: document.getElementById('settingYouTube').value,
            linkedin: document.getElementById('settingLinkedIn').value
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const siteSettings = {};
    if (logoUrl) siteSettings.logoUrl = logoUrl;
    if (heroImageUrl) siteSettings.heroImageUrl = heroImageUrl;

    // Add page-specific hero image URLs
    for (const [key, url] of Object.entries(pageHeroUrls)) {
        if (url) {
            siteSettings[key] = url;
        }
    }

    try {
        if (Object.keys(siteSettings).length > 0) {
            await db.collection('siteSettings').doc('main').set(siteSettings, { merge: true });
        }
        await db.collection('contactSettings').doc('main').set(contactSettings, { merge: true });
        alert('Settings saved successfully!');
        loadLogoSetting();
        loadHeroImageSetting();
        loadPageHeroImageSettings();
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings');
    }
}

async function loadLogoSetting() {
    try {
        const doc = await db.collection('siteSettings').doc('main').get();
        const logoUrl = doc.exists && doc.data().logoUrl ? doc.data().logoUrl : '';
        const input = document.getElementById('logoUrl');
        if (input) input.value = logoUrl;
        const preview = document.getElementById('logoPreview');
        const previewText = document.getElementById('logoPreviewText');
        if (logoUrl) {
            preview.src = logoUrl;
            preview.style.display = 'block';
            if (previewText) previewText.style.display = 'none';
        } else {
            if (preview) preview.style.display = 'none';
            if (previewText) previewText.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading logo setting:', error);
    }
}

function isValidImageUrl(url) {
    if (!url || url.trim() === '') return true;
    const trimmed = url.trim();
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) return true;
    if (trimmed.startsWith('assets/') || trimmed.startsWith('/assets/')) return true;
    if (trimmed.startsWith('data:')) return true;
    return false;
}

async function handleLogoRemove() {
    if (!confirm('Are you sure you want to remove the logo? The text fallback will be used.')) {
        return;
    }

    try {
        await db.collection('siteSettings').doc('main').update({ logoUrl: firebase.firestore.FieldValue.delete() });

        const preview = document.getElementById('logoPreview');
        const previewText = document.getElementById('logoPreviewText');
        preview.style.display = 'none';
        previewText.style.display = 'block';
        previewText.textContent = 'No logo uploaded (using text fallback)';

        alert('Logo removed successfully');
    } catch (error) {
        console.error('Error removing logo:', error);
        alert('Error removing logo');
    }
}

async function loadHeroImageSetting() {
    try {
        const doc = await db.collection('siteSettings').doc('main').get();
        const heroImageUrl = doc.exists && doc.data().heroImageUrl ? doc.data().heroImageUrl : '';
        const input = document.getElementById('heroImageUrl');
        if (input) input.value = heroImageUrl;
        const preview = document.getElementById('heroPreview');
        const previewText = document.getElementById('heroPreviewText');
        if (heroImageUrl) {
            if (preview) { preview.src = heroImageUrl; preview.style.display = 'block'; }
            if (previewText) previewText.style.display = 'none';
        } else {
            if (preview) preview.style.display = 'none';
            if (previewText) previewText.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading hero image setting:', error);
    }
}


async function loadPageHeroImageSettings() {
    try {
        const doc = await db.collection('siteSettings').doc('main').get();
        if (!doc.exists) return;

        const data = doc.data();
        const pageFieldIds = {
            'universitiesHeroImageUrl': 'universitiesHeroImageUrl',
            'universityDetailHeroImageUrl': 'universityDetailHeroImageUrl',
            'coursesHeroImageUrl': 'coursesHeroImageUrl',
            'courseDetailHeroImageUrl': 'courseDetailHeroImageUrl',
            'servicesHeroImageUrl': 'servicesHeroImageUrl',
            'teamHeroImageUrl': 'teamHeroImageUrl',
            'contactHeroImageUrl': 'contactHeroImageUrl',
            'applyHeroImageUrl': 'applyHeroImageUrl'
        };

        for (const [fieldName, inputId] of Object.entries(pageFieldIds)) {
            const url = data[fieldName] || '';
            const input = document.getElementById(inputId);
            if (input) input.value = url;
        }
    } catch (error) {
        console.error('Error loading page hero image settings:', error);
    }
}

async function handleHeroImageRemove() {
    if (!confirm('Remove the hero image? The gradient placeholder will be shown.')) return;
    try {
        await db.collection('siteSettings').doc('main').update({ heroImageUrl: firebase.firestore.FieldValue.delete() });
        const preview = document.getElementById('heroPreview');
        const previewText = document.getElementById('heroPreviewText');
        if (preview) preview.style.display = 'none';
        if (previewText) { previewText.style.display = 'block'; previewText.textContent = 'No hero image uploaded (gradient placeholder shown)'; }
        alert('Hero image removed successfully');
    } catch (error) {
        console.error('Error removing hero image:', error);
        alert('Error removing hero image');
    }
}

// ============================================
// Modal Functions
// ============================================

// Edit item - called by Edit buttons
function editItem(type, id) {
    openModal(type, id);
}

async function openModal(type, id = null) {
    editingType = type;
    editingId = id;
    universityCoursesTemp = [];
    activeQuickAddFolderId = null;
    if (type === 'course' && availableCourses.length === 0) {
        await loadAvailableCourses();
    }
    
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = id ? `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}` : `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    
    let formHTML = '';
    switch(type) {
        case 'course': formHTML = getCourseForm(); break;
        case 'university': formHTML = getUniversityForm(); break;
        case 'team': formHTML = getTeamForm(); break;
        case 'testimonial': formHTML = getTestimonialForm(); break;
        case 'service': formHTML = getServiceForm(); break;
        case 'agent': formHTML = getAgentForm(); break;
        case 'admin': formHTML = getAdminForm(); break;
    }
    
    modalBody.innerHTML = formHTML;
    document.getElementById('modalOverlay').classList.add('active');

    // Initialize image input fields
    setTimeout(() => {
        initializeImageInputFields(type);
    }, 50);

    if (id) {
        loadItemForEdit(type, id);
    } else if (type === 'university') {
        if (availableCourses.length === 0) {
            await loadAvailableCourses();
        }
        // Initialize folder picker for new university
        setTimeout(() => {
            const container = document.getElementById('coursePickerContainer');
            if (container) container.innerHTML = renderFolderPicker();
        }, 100);
    }
}

// ============================================
// Image Input Field Integration
// ============================================

let imageFieldInstances = {}; // Track ImageInputField instances by fieldId

const imageFieldConfigs = {
    course: [
        { inputId: 'itemImage', label: 'Course Image', folderHint: 'assets/courses', suggestedFolder: 'assets/courses' }
    ],
    university: [
        { inputId: 'itemLogo', label: 'Logo Image', folderHint: 'assets/logos', suggestedFolder: 'assets/logos' },
        { inputId: 'itemCampusImage', label: 'Campus Image', folderHint: 'assets/universities', suggestedFolder: 'assets/universities' }
    ],
    team: [
        { inputId: 'itemPhoto', label: 'Photo', folderHint: 'assets/team', suggestedFolder: 'assets/team' }
    ],
    testimonial: [
        { inputId: 'itemPhoto', label: 'Photo', folderHint: 'assets/testimonials', suggestedFolder: 'assets/testimonials' }
    ],
    siteSettings: [
        { inputId: 'logoUrl', label: 'Logo', folderHint: 'assets/logos', suggestedFolder: 'assets/logos' },
        { inputId: 'heroImageUrl', label: 'Hero Image', folderHint: 'assets/site', suggestedFolder: 'assets/site' },
        { inputId: 'universitiesHeroImageUrl', label: 'Universities Page Hero', folderHint: 'assets/home', suggestedFolder: 'assets/home' },
        { inputId: 'coursesHeroImageUrl', label: 'Courses Page Hero', folderHint: 'assets/home', suggestedFolder: 'assets/home' },
        { inputId: 'servicesHeroImageUrl', label: 'Services Page Hero', folderHint: 'assets/home', suggestedFolder: 'assets/home' },
        { inputId: 'teamHeroImageUrl', label: 'Team Page Hero', folderHint: 'assets/home', suggestedFolder: 'assets/home' },
        { inputId: 'contactHeroImageUrl', label: 'Contact Page Hero', folderHint: 'assets/home', suggestedFolder: 'assets/home' },
        { inputId: 'applyHeroImageUrl', label: 'Apply Page Hero', folderHint: 'assets/home', suggestedFolder: 'assets/home' },
        { inputId: 'universityDetailHeroImageUrl', label: 'University Detail Hero', folderHint: 'assets/home', suggestedFolder: 'assets/home' },
        { inputId: 'courseDetailHeroImageUrl', label: 'Course Detail Hero', folderHint: 'assets/home', suggestedFolder: 'assets/home' }
    ]
};

function initializeImageInputFields(type) {
    // Clear previous instances
    imageFieldInstances = {};

    const configs = imageFieldConfigs[type] || [];

    configs.forEach(config => {
        const textInput = document.getElementById(config.inputId);
        if (!textInput) return;

        const currentValue = textInput.value;
        const label = textInput.previousElementSibling?.textContent || config.label;

        // Create ImageInputField component
        const imageField = new ImageInputField({
            fieldId: config.inputId,
            label: label,
            value: currentValue,
            placeholder: `${config.suggestedFolder}/example.jpg`,
            suggestedFolder: config.suggestedFolder,
            maxSizeMB: config.maxSizeMB || 5,
            onChange: (newValue) => {
                // Keep the hidden input updated for form submission
                textInput.value = newValue;
            },
            help: `Upload an image or enter a path. Suggested folder: <code>${config.suggestedFolder}</code>`
        });

        // Store instance reference for later
        imageFieldInstances[config.inputId] = imageField;

        // Replace the text input with the image field component
        const labelElement = textInput.previousElementSibling;
        if (labelElement && labelElement.tagName === 'LABEL') {
            labelElement.parentNode.insertBefore(imageField.render(), labelElement);
            labelElement.style.display = 'none';
            textInput.style.display = 'none';
        } else {
            textInput.parentNode.insertBefore(imageField.render(), textInput);
            textInput.style.display = 'none';
        }
    });
}

function updateImageFieldAfterLoad(fieldId, value) {
    if (imageFieldInstances[fieldId]) {
        imageFieldInstances[fieldId].setValue(value);
    } else {
        // Fallback: just set the hidden input value
        const input = document.getElementById(fieldId);
        if (input) input.value = value;
    }
}

// ============================================
// FAQ Editor Functions
// ============================================

let faqCounter = 0;

function addFaqRow(question = '', answer = '') {
    const editor = document.getElementById('faqEditor');
    const hint = document.getElementById('noFaqsHint');
    if (hint) hint.style.display = 'none';
    
    const faqId = `faq_${faqCounter++}`;
    const div = document.createElement('div');
    div.className = 'faq-row';
    div.id = faqId;
    div.style.cssText = 'background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 12px;';
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <strong style="font-size: 0.875rem; color: #64748b;">FAQ Item</strong>
            <div style="display: flex; gap: 8px;">
                <button type="button" onclick="toggleFaqRow('${faqId}')" style="background: #e2e8f0; color: #334155; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Minimize</button>
                <button type="button" onclick="removeFaqRow('${faqId}')" style="background: #fee2e2; color: #dc2626; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Remove</button>
            </div>
        </div>
        <div class="faq-row-body">
            <input type="text" class="faq-question" placeholder="Question" value="${question.replace(/"/g, '&quot;')}" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px;">
            <textarea class="faq-answer" placeholder="Answer" rows="2" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; resize: vertical;">${answer}</textarea>
        </div>
    `;
    editor.appendChild(div);
}

function removeFaqRow(id) {
    const row = document.getElementById(id);
    if (row) row.remove();
    
    // Show hint if no FAQs left
    const editor = document.getElementById('faqEditor');
    if (editor.children.length === 1) { // Only the hint remains
        const hint = document.getElementById('noFaqsHint');
        if (hint) hint.style.display = 'block';
    }
}

function toggleFaqRow(id) {
    const row = document.getElementById(id);
    if (!row) return;
    row.classList.toggle('collapsed');
    const btn = row.querySelector('button[onclick^="toggleFaqRow"]');
    if (btn) {
        btn.textContent = row.classList.contains('collapsed') ? 'Expand' : 'Minimize';
    }
}

function getFaqsFromEditor() {
    const faqs = [];
    document.querySelectorAll('.faq-row').forEach(row => {
        const question = row.querySelector('.faq-question').value.trim();
        const answer = row.querySelector('.faq-answer').value.trim();
        if (question && answer) {
            faqs.push({ question, answer });
        }
    });
    return faqs;
}

function renderMonthPicker(selected = []) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const options = months.map(m => `
        <label class="month-option">
            <input type="checkbox" value="${m}" ${selected.includes(m) ? 'checked' : ''} onchange="updateMonthSummary()">
            <span>${m}</span>
        </label>
    `).join('');
    return `
        <button type="button" class="month-dropdown-toggle" onclick="toggleMonthDropdown()">
            <span id="monthSummary">Select months</span>
            <i class="bi bi-chevron-down"></i>
        </button>
        <div class="month-dropdown-menu">
            ${options}
        </div>
    `;
}

function getSelectedMonths() {
    const container = document.getElementById('itemIntakeMonths');
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
}

function setSelectedMonths(months) {
    const container = document.getElementById('itemIntakeMonths');
    if (!container) return;
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = months.includes(cb.value);
    });
    updateMonthSummary();
}

function toggleMonthDropdown() {
    const container = document.getElementById('itemIntakeMonths');
    if (!container) return;
    container.classList.toggle('open');
}

function updateMonthSummary() {
    const selected = getSelectedMonths();
    const summary = document.getElementById('monthSummary');
    if (!summary) return;
    summary.textContent = selected.length ? selected.join(', ') : 'Select months';
}

function stepperChange(inputId, delta) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const min = parseInt(input.min || '1', 10);
    const max = parseInt(input.max || '50', 10);
    const current = parseInt(input.value || min, 10);
    const next = Math.min(max, Math.max(min, current + delta));
    input.value = next;
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    editingId = null;
    editingType = null;
    universityCoursesTemp = [];
    activeQuickAddFolderId = null;
}

// ============================================
// Form Templates
// ============================================

function getCourseForm() {
    const folderOptions = courseFolders.map(f => 
        `<option value="${f.id}">${f.name}</option>`
    ).join('');
    
    return `
        <form id="itemForm" onsubmit="saveItem(event)">
            <div class="form-group">
                <label>Course Name *</label>
                <input type="text" id="itemName" required placeholder="Computer Science">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Course ID *</label>
                    <input type="text" id="itemCourseId" placeholder="BSC-COM-SCI">
                    <p class="form-hint" style="color: #64748b; font-size: 0.8125rem;">Unique global code used for university CSV mapping.</p>
                </div>
                <div class="form-group">
                    <label>Base Currency</label>
                    <select id="itemBaseCurrency">
                        ${OFFERING_CURRENCIES.map(code => `<option value="${code}" ${code === DEFAULT_BASE_CURRENCY ? 'selected' : ''}>${code}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Base Price</label>
                    <input type="number" id="itemBasePrice" min="0" step="1" placeholder="25000">
                </div>
                <div class="form-group">
                    <label>Total Semesters</label>
                    <input type="number" id="itemTotalSemesters" min="1" step="1" placeholder="6">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Folder *</label>
                    <select id="itemFolder" required>
                        <option value="">Select a folder...</option>
                        ${folderOptions}
                    </select>
                    <p class="form-hint" style="color: #64748b; font-size: 0.8125rem;">Create folders first in Courses section</p>
                </div>
                <div class="form-group">
                    <label>Level *</label>
                    <select id="itemLevel" required>
                        <option value="Foundation">Foundation</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Bachelor" selected>Bachelor</option>
                        <option value="Masters">Masters</option>
                        <option value="PhD">PhD</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Base Duration (Years)</label>
                    <input type="number" id="itemBaseDurationYears" min="0.5" step="0.5" placeholder="3">
                </div>
                <div class="form-group">
                    <label>Duration Label</label>
                    <input type="text" id="itemDuration" placeholder="3 years">
                </div>
            </div>
            <div class="form-group">
                <label>Credits</label>
                <input type="text" id="itemCredits" placeholder="120 credits">
            </div>
            <div class="form-group">
                <label>Image Path</label>
                <input type="text" id="itemImage" placeholder="assets/students/student-hero.jpeg">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="itemDescription" placeholder="Course description..."></textarea>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-cancel" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Course</button>
            </div>
        </form>
    `;
}

function getUniversityForm() {
    return `
        <form id="itemForm" onsubmit="saveItem(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>Short Code *</label>
                    <input type="text" id="itemShortCode" required placeholder="UM" maxlength="10">
                </div>
                <div class="form-group">
                    <label>Order</label>
                    <input type="number" id="itemOrder" value="1" min="1">
                </div>
            </div>
            <div class="form-group">
                <label>University Name *</label>
                <input type="text" id="itemName" required placeholder="University of Malaya">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" id="itemLocation" placeholder="Kuala Lumpur">
                </div>
                <div class="form-group">
                    <label>QS Ranking</label>
                    <input type="number" id="itemRanking" placeholder="65">
                </div>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
            <h4 style="margin-bottom: 16px; color: #1e293b; display: flex; align-items: center; gap: 8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Content Sections</h4>
            
            <div class="form-group">
                <label>Intro Text (short description for header)</label>
                <textarea id="itemIntro" placeholder="Brief introduction shown at the top..." rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>About Content (detailed description, can include HTML)</label>
                <textarea id="itemAboutContent" placeholder="Full university description. You can use HTML tags for formatting..." rows="5"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Logo Image Path</label>
                    <input type="text" id="itemLogo" placeholder="assets/universities/UPM/upm_logo.png">
                </div>
                <div class="form-group">
                    <label>Campus Image Path</label>
                    <input type="text" id="itemCampusImage" placeholder="assets/universities/UPM/upm_campus.jpg">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>YouTube Video ID</label>
                    <input type="text" id="itemYouTube" placeholder="dQw4w9WgXcQ">
                </div>
                <div class="form-group">
                    <label>Accommodation Search Term</label>
                    <input type="text" id="itemAccommodation" placeholder="Petaling+Jaya">
                </div>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
            <h4 style="margin-bottom: 16px; color: #1e293b; display: flex; align-items: center; gap: 8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Intake & Quick Info</h4>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Next Intake Date (for countdown)</label>
                    <input type="date" id="itemNextIntake">
                </div>
                <div class="form-group">
                    <label>Intake Months</label>
                    <div class="month-dropdown" id="itemIntakeMonths">
                        ${renderMonthPicker()}
                    </div>
                </div>
            </div>
            <div class="checkbox-group" style="margin-bottom: 16px;">
                <input type="checkbox" id="itemOfferLetterFree" checked>
                <label for="itemOfferLetterFree">Offer Letter is Free</label>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
            <h4 style="margin-bottom: 16px; color: #1e293b; display: flex; align-items: center; gap: 8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> Courses Offered</h4>
            <div class="offerings-import-tools">
                <button type="button" class="btn btn-outline btn-compact" onclick="downloadUniversityOfferingsTemplate()">
                    Download Template
                </button>
                <button type="button" class="btn btn-outline btn-compact" onclick="openUniversityOfferingsImportPicker()">
                    Import CSV/JSON
                </button>
                <input type="file" id="universityOfferingsInput" accept=".csv,text/csv,.json,application/json" onchange="handleUniversityOfferingsImport(event)" style="display:none;">
            </div>
            <p class="form-hint" style="margin-bottom: 14px;">Use the same CSV format as Courses import. Required fields: <code>course_id</code>, <code>course_name</code>, <code>level</code>. If a <code>course_id</code> does not exist yet, it will be created in Courses automatically. University-specific values: <code>fees</code>, <code>currency</code>, <code>duration_years</code>, <code>semesters</code>, <code>intake</code>.</p>
            
            <div class="form-group">
                <div class="course-picker" id="coursePickerContainer">
                    <!-- Folder picker rendered dynamically -->
                </div>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
            <h4 style="margin-bottom: 16px; color: #1e293b; display: flex; align-items: center; gap: 8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> FAQs</h4>
            
            <div class="form-group">
                <div id="faqEditor">
                    <p class="empty-hint" id="noFaqsHint">No FAQs added. Click button below to add.</p>
                </div>
                <button type="button" class="btn btn-outline" onclick="addFaqRow()" style="margin-top: 10px;">+ Add FAQ</button>
            </div>
            
            <div class="checkbox-group">
                <input type="checkbox" id="itemActive" checked>
                <label for="itemActive">Active (visible on website)</label>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-cancel" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save University</button>
            </div>
        </form>
    `;
}

// ============================================
// Course Picker Functions
// ============================================

function filterCourses(query) {
    const suggestionsDiv = document.getElementById('courseSuggestions');
    
    if (!query || query.length < 2) {
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    const queryLower = query.toLowerCase();
    const matches = availableCourses.filter(c => 
        c.name.toLowerCase().includes(queryLower) &&
        !universityCoursesTemp.some(uc => uc.courseId === c.id)
    );
    
    let html = '';
    
    if (matches.length > 0) {
        html = matches.slice(0, 5).map(c => `
            <div class="suggestion-item" onclick="selectCourse('${c.id}', '${c.name.replace(/'/g, "\\'")}', '${c.level}')">
                <strong>${c.name}</strong>
                <span>${c.level} • ${c.category || 'Other'}</span>
            </div>
        `).join('');
    }
    
    // Add "Create new" option
    const exactMatch = availableCourses.some(c => c.name.toLowerCase() === queryLower);
    if (!exactMatch) {
        html += `
            <div class="suggestion-item create-new" onclick="createAndSelectCourse('${query.replace(/'/g, "\\'")}')">
                <strong>+ Create "${query}"</strong>
                <span>Add as new course in Other category</span>
            </div>
        `;
    }
    
    suggestionsDiv.innerHTML = html;
    suggestionsDiv.style.display = 'block';
}

function selectCourse(courseId, courseName, courseLevel) {
    // Hide suggestions
    document.getElementById('courseSuggestions').style.display = 'none';
    document.getElementById('courseSearchInput').value = '';
    
    const course = availableCourses.find((c) => c.id === courseId);
    const baseDuration = Number(course?.baseDurationYears);
    const durationYears =
        (Number.isFinite(baseDuration) && baseDuration > 0)
            ? baseDuration
            : (parseDurationYearsFromText(course?.duration) || null);
    const baseSemesters = Number(course?.totalSemesters);
    const semesters =
        (Number.isFinite(baseSemesters) && baseSemesters > 0)
            ? baseSemesters
            : (durationYears ? Math.round(durationYears * 2) : null);
    // Add to temp array
    universityCoursesTemp.push({
        courseId: courseId,
        courseGlobalId: course?.courseId || '',
        courseName: courseName,
        level: courseLevel,
        fees: Number(course?.basePrice) || 0,
        currency: course?.baseCurrency || DEFAULT_BASE_CURRENCY,
        durationYears: durationYears,
        semesters: semesters,
        intake: ['September']
    });
    
    renderSelectedCourses();
}

async function createAndSelectCourse(courseName) {
    // Create course silently in "Other" category
    try {
        const generatedCourseId = getUniqueCourseIdentifier('', courseName, 'Bachelor');
        const newCourse = {
            name: courseName,
            courseId: generatedCourseId,
            level: 'Bachelor',
            category: 'Other',
            basePrice: 0,
            baseCurrency: DEFAULT_BASE_CURRENCY,
            baseDurationYears: null,
            totalSemesters: null,
            duration: '',
            description: '',
            image: ''
        };
        
        const docId = await addDocument('courses', newCourse);
        
        // Add to available courses
        availableCourses.push({ id: docId, ...newCourse });
        
        // Select it
        selectCourse(docId, courseName, 'Bachelor');
        
    } catch (error) {
        console.error('Error creating course:', error);
        alert('Error creating course');
    }
}

function renderSelectedCourses() {
    const container = document.getElementById('selectedCourses');
    const hint = document.getElementById('noCoursesHint');
    
    if (universityCoursesTemp.length === 0) {
        hint.style.display = 'block';
        container.innerHTML = '<p class="empty-hint" id="noCoursesHint">No courses added yet. Search above to add courses.</p>';
        return;
    }
    
    container.innerHTML = '';
}

function removeCourse(index) {
    universityCoursesTemp.splice(index, 1);
    renderSelectedCourses();
}

function updateCourseFees(index, fees) {
    universityCoursesTemp[index].fees = parseInt(fees) || 0;
}

function updateCourseCurrency(index, currency) {
    universityCoursesTemp[index].currency = currency;
}

function updateCourseDuration(index, years) {
    const raw = String(years || '').trim();
    if (!raw) {
        universityCoursesTemp[index].durationYears = null;
        return;
    }
    const parsed = Number(raw);
    universityCoursesTemp[index].durationYears = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function updateCourseIntake(index, intake) {
    if (intake === 'Both') {
        universityCoursesTemp[index].intake = ['September', 'February'];
    } else {
        universityCoursesTemp[index].intake = [intake];
    }
}

// ============================================
// Category Management
// ============================================

function addNewCategory() {
    const newCat = prompt('Enter new category name:');
    if (newCat && newCat.trim()) {
        const trimmed = newCat.trim();
        if (!availableCategories.includes(trimmed)) {
            availableCategories.push(trimmed);
            saveCategories();
            
            // Update dropdown
            const select = document.getElementById('itemCategory');
            const option = document.createElement('option');
            option.value = trimmed;
            option.textContent = trimmed;
            option.selected = true;
            select.appendChild(option);
        }
    }
}

// ============================================
// Other Form Templates
// ============================================

function getTeamForm() {
    return `
        <form id="itemForm" onsubmit="saveItem(event)">
            <div class="form-group">
                <label>Name *</label>
                <input type="text" id="itemName" required placeholder="Dr. Ahmad Mokadam">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Role *</label>
                    <input type="text" id="itemRole" required placeholder="Founder & Lead Counselor">
                </div>
                <div class="form-group">
                    <label>Order</label>
                    <input type="number" id="itemOrder" value="1" min="1">
                </div>
            </div>
            <div class="form-group">
                <label>Bio</label>
                <textarea id="itemBio" placeholder="Short biography..."></textarea>
            </div>
            <div class="form-group">
                <label>Photo Path</label>
                <input type="text" id="itemPhoto" placeholder="assets/team/profile-placeholder.webp">
            </div>
            <div class="form-group">
                <label>WhatsApp Number (for direct contact link)</label>
                <input type="tel" id="itemWhatsApp" placeholder="+60102503706">
                <small style="display: block; color: var(--gray-500); margin-top: 4px;">Format: +60102503706 or 0102503706. Both international and local formats supported.</small>
            </div>
            <div class="checkbox-group">
                <input type="checkbox" id="itemActive" checked>
                <label for="itemActive">Active</label>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-cancel" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `;
}

function getTestimonialForm() {
    return `
        <form id="itemForm" onsubmit="saveItem(event)">
            <div class="form-group">
                <label>Student Name *</label>
                <input type="text" id="itemName" required placeholder="Ahmed Khan">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>University *</label>
                    <input type="text" id="itemUniversity" required placeholder="University of Malaya">
                </div>
                <div class="form-group">
                    <label>Country</label>
                    <input type="text" id="itemCountry" placeholder="Malaysia">
                </div>
            </div>
            <div class="form-group">
                <label>Status (e.g. Enrolled 2024)</label>
                <input type="text" id="itemStatus" placeholder="Enrolled 2024">
            </div>
            <div class="form-group">
                <label>Testimonial Quote *</label>
                <textarea id="itemQuote" required placeholder="What the student said..."></textarea>
            </div>
            <div class="form-group">
                <label>Photo Path</label>
                <input type="text" id="itemPhoto" placeholder="assets/students/yeamim-hossain-lien.webp">
                <small style="display: block; color: var(--gray-500); margin-top: 4px;">Path or URL to student photo</small>
            </div>
            <div class="checkbox-group">
                <input type="checkbox" id="itemFeatured" checked>
                <label for="itemFeatured">Featured (show on homepage)</label>
            </div>
            <div class="checkbox-group">
                <input type="checkbox" id="itemActive" checked>
                <label for="itemActive">Active (show on website)</label>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-cancel" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `;
}

function getServiceForm() {
    return `
        <form id="itemForm" onsubmit="saveItem(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>Icon (Emoji)</label>
                    <input type="text" id="itemIcon" placeholder="bi-chat-dots" maxlength="30">
                </div>
                <div class="form-group">
                    <label>Order</label>
                    <input type="number" id="itemOrder" value="1" min="1">
                </div>
            </div>
            <div class="form-group">
                <label>Title *</label>
                <input type="text" id="itemTitle" required placeholder="Free Consultation">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="itemDescription" placeholder="Service description..."></textarea>
            </div>
            <div class="checkbox-group">
                <input type="checkbox" id="itemActive" checked>
                <label for="itemActive">Active</label>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-cancel" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `;
}

// ============================================
// Load Item for Editing
// ============================================

async function loadItemForEdit(type, id) {
    const collectionMap = {
        course: 'courses',
        university: 'universities',
        team: 'team',
        testimonial: 'testimonials',
        service: 'services'
    };
    
    try {
        const doc = await getDocument(collectionMap[type], id);
        if (!doc) return;
        
        switch(type) {
            case 'course':
                document.getElementById('itemName').value = doc.name || '';
                document.getElementById('itemCourseId').value = doc.courseId || '';
                document.getElementById('itemBasePrice').value = Number.isFinite(Number(doc.basePrice)) ? Number(doc.basePrice) : '';
                document.getElementById('itemBaseCurrency').value = doc.baseCurrency || DEFAULT_BASE_CURRENCY;
                document.getElementById('itemBaseDurationYears').value = Number.isFinite(Number(doc.baseDurationYears)) ? Number(doc.baseDurationYears) : '';
                document.getElementById('itemTotalSemesters').value = Number.isFinite(Number(doc.totalSemesters)) ? Number(doc.totalSemesters) : '';
                document.getElementById('itemLevel').value = doc.level || 'Bachelor';
                document.getElementById('itemFolder').value = doc.folderId || '';
                document.getElementById('itemDuration').value = doc.duration || '';
                document.getElementById('itemCredits').value = doc.credits || '';
                updateImageFieldAfterLoad('itemImage', doc.image || '');
                document.getElementById('itemImage').value = doc.image || '';
                document.getElementById('itemDescription').value = doc.description || '';
                break;
                
            case 'university':
                document.getElementById('itemShortCode').value = doc.shortCode || '';
                document.getElementById('itemOrder').value = doc.order || 1;
                document.getElementById('itemName').value = doc.name || '';
                document.getElementById('itemLocation').value = doc.location || '';
                document.getElementById('itemRanking').value = doc.ranking || '';
                document.getElementById('itemIntro').value = doc.intro || '';
                document.getElementById('itemAboutContent').value = doc.aboutContent || doc.overview || '';
                updateImageFieldAfterLoad('itemLogo', doc.logo || doc.logoUrl || doc.logoPath || '');
                updateImageFieldAfterLoad('itemCampusImage', doc.campusImage || doc.campusImageUrl || doc.image || '');
                document.getElementById('itemYouTube').value = doc.youtubeVideo || '';
                document.getElementById('itemActive').checked = doc.active !== false;
                
                // New fields
                if (doc.nextIntakeDate) {
                    const date = doc.nextIntakeDate.toDate ? doc.nextIntakeDate.toDate() : new Date(doc.nextIntakeDate);
                    document.getElementById('itemNextIntake').value = date.toISOString().split('T')[0];
                }
                setSelectedMonths(doc.intakeMonths || []);
                document.getElementById('itemOfferLetterFree').checked = doc.offerLetterFree !== false;
                
                // Load FAQs
                if (doc.faqs && doc.faqs.length > 0) {
                    doc.faqs.forEach(faq => addFaqRow(faq.question, faq.answer));
                }
                
                // Load course offerings from courseOfferings collection (first-class collection)
                try {
                    const offeringsSnap = await db.collection('courseOfferings')
                        .where('universityId', '==', editingId)
                        .where('active', '==', true)
                        .get();

                    universityCoursesTemp = [];
                    offeringsSnap.forEach(offeringDoc => {
                        const co = offeringDoc.data();
                        const course = availableCourses.find(c => c.id === co.courseId);
                        const offeringDuration = Number(co.durationYears || co.durationMonths ? Math.round(co.durationMonths / 12) : null);
                        const courseDuration = Number(course?.baseDurationYears);
                        const parsedCourseDuration = parseDurationYearsFromText(course?.duration);
                        const durationYears =
                            (Number.isFinite(offeringDuration) && offeringDuration > 0)
                                ? offeringDuration
                                : ((Number.isFinite(courseDuration) && courseDuration > 0) ? courseDuration : (parsedCourseDuration || null));
                        const offeringSemesters = Number(co.semesters);
                        const courseSemesters = Number(course?.totalSemesters);
                        const semesters =
                            (Number.isFinite(offeringSemesters) && offeringSemesters > 0)
                                ? offeringSemesters
                                : ((Number.isFinite(courseSemesters) && courseSemesters > 0) ? courseSemesters : (durationYears ? Math.round(durationYears * 2) : null));

                        universityCoursesTemp.push({
                            courseId: co.courseId,
                            courseGlobalId: course?.courseId || '',
                            courseName: course ? course.name : (co.courseName || 'Unknown Course'),
                            level: course ? course.level : 'Bachelor',
                            category: course ? course.category : 'Other',
                            fees: Number(co.tuitionFee ?? course?.basePrice ?? 0) || 0,
                            currency: co.tuitionCurrency || course?.baseCurrency || DEFAULT_BASE_CURRENCY,
                            durationYears: durationYears,
                            semesters: semesters,
                            intake: co.intakeMonths || ['September']
                        });
                    });
                } catch (err) {
                    console.warn('Could not load courseOfferings from collection:', err);
                    universityCoursesTemp = [];
                }
                // Initialize folder picker
                setTimeout(() => {
                    const container = document.getElementById('coursePickerContainer');
                    if (container) container.innerHTML = renderFolderPicker();
                    setIndeterminateStates();
                    updateSelectedSummary();
                }, 100);
                break;
                
            case 'team':
                document.getElementById('itemName').value = doc.name || '';
                document.getElementById('itemRole').value = doc.role || '';
                document.getElementById('itemOrder').value = doc.order || 1;
                document.getElementById('itemBio').value = doc.bio || '';
                updateImageFieldAfterLoad('itemPhoto', doc.photoPath || doc.photo || '');
                document.getElementById('itemWhatsApp').value = doc.whatsappNumber || '';
                document.getElementById('itemActive').checked = doc.active !== false;
                break;

            case 'testimonial':
                document.getElementById('itemName').value = doc.studentName || doc.name || '';
                document.getElementById('itemUniversity').value = doc.university || doc.program || '';
                document.getElementById('itemCountry').value = doc.country || '';
                document.getElementById('itemStatus').value = doc.status || '';
                document.getElementById('itemQuote').value = doc.quote || '';
                updateImageFieldAfterLoad('itemPhoto', doc.photoPath || doc.photo || '');
                document.getElementById('itemFeatured').checked = doc.featured !== false;
                document.getElementById('itemActive').checked = doc.active !== false;
                break;
                
            case 'service':
                document.getElementById('itemIcon').value = doc.icon || '';
                document.getElementById('itemOrder').value = doc.order || 1;
                document.getElementById('itemTitle').value = doc.title || '';
                document.getElementById('itemDescription').value = doc.description || '';
                document.getElementById('itemActive').checked = doc.active !== false;
                break;
        }
    } catch (error) {
        console.error('Error loading item:', error);
    }
}

// ============================================
// Save University with Course Offerings
// ============================================

async function saveUniversityAndOfferings(universityId, data) {
    // Extract courseOfferings and universityId from data
    const offerings = data._courseOfferingsTemp || [];
    const actualUniId = data._universityId || universityId;
    delete data._courseOfferingsTemp;
    delete data._universityId;

    // Save or update the university document
    if (universityId) {
        await updateDocument('universities', universityId, data);
    } else {
        const docRef = await db.collection('universities').add(data);
        universityId = docRef.id;
    }

    // Query existing courseOfferings for this university
    const existingOfferingsSnap = await db.collection('courseOfferings')
        .where('universityId', '==', universityId)
        .get();
    const existingMap = new Map();
    existingOfferingsSnap.forEach(doc => {
        const d = doc.data();
        existingMap.set(d.courseId, { id: doc.id, data: d });
    });

    // Process offerings: create, update, or delete
    const offeringIds = new Set(offerings.map(o => o.courseId));

    // Create or update offerings from the temp array
    for (const offering of offerings) {
        const courseId = offering.courseId;
        const existingOffering = existingMap.get(courseId);

        const courseDoc = await getDocument('courses', courseId);
        if (!courseDoc) continue;

        const offeringData = {
            universityId: universityId,
            courseId: courseId,
            universityName: data.name,
            courseName: courseDoc.name || 'Unknown Course',
            courseLevel: courseDoc.level || '',
            courseCategory: courseDoc.category || '',
            tuitionFee: Number(offering.fees) || 0,
            tuitionCurrency: offering.currency || DEFAULT_BASE_CURRENCY,
            durationMonths: offering.durationYears ? Math.round(offering.durationYears * 12) : null,
            durationYears: offering.durationYears,
            durationText: offering.durationText || '',
            semesters: offering.semesters,
            intakeMonths: offering.intake || ['September'],
            nextIntakeDate: null,
            applicationDeadline: null,
            applicationOpen: true,
            applicationFee: null,
            registrationFee: null,
            academicRequirements: null,
            englishRequirements: null,
            requiredDocuments: null,
            seatsAvailable: null,
            notes: null,
            order: 1,
            active: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (existingOffering) {
            // Update existing offering
            await db.collection('courseOfferings').doc(existingOffering.id).update(offeringData);
            existingMap.delete(courseId);
        } else {
            // Create new offering
            offeringData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('courseOfferings').add(offeringData);
        }
    }

    // Delete offerings that are no longer in the temp array
    for (const [courseId, offering] of existingMap) {
        if (!offeringIds.has(courseId)) {
            await db.collection('courseOfferings').doc(offering.id).delete();
        }
    }
}

// ============================================
// Save Item
// ============================================

async function saveItem(e) {
    e.preventDefault();
    
    const collectionMap = {
        course: 'courses',
        university: 'universities',
        team: 'team',
        testimonial: 'testimonials',
        service: 'services'
    };
    
    let data = {};
    
    switch(editingType) {
        case 'course':
            const folderVal = document.getElementById('itemFolder').value;
            const courseName = document.getElementById('itemName').value.trim();
            const level = document.getElementById('itemLevel').value;
            const rawCourseId = document.getElementById('itemCourseId').value;
            const requestedCourseId = normalizeCourseIdentifier(rawCourseId);
            const stableCourseId = getUniqueCourseIdentifier(rawCourseId, courseName, level, editingId);
            if (requestedCourseId && stableCourseId !== requestedCourseId) {
                alert(`Course ID "${requestedCourseId}" already exists. Please use a different ID.`);
                return;
            }
            const basePrice = parseInt(document.getElementById('itemBasePrice').value, 10);
            const baseDurationYears = Number(document.getElementById('itemBaseDurationYears').value);
            const totalSemesters = parseInt(document.getElementById('itemTotalSemesters').value, 10);
            const durationLabel = document.getElementById('itemDuration').value.trim();
            // Get folder name as category
            const selectedFolder = courseFolders.find(f => f.id === folderVal);
            data = {
                name: courseName,
                courseId: stableCourseId,
                level: level,
                folderId: folderVal || null,
                category: selectedFolder ? selectedFolder.name : 'Uncategorized',
                basePrice: Number.isFinite(basePrice) ? basePrice : 0,
                baseCurrency: document.getElementById('itemBaseCurrency').value || DEFAULT_BASE_CURRENCY,
                baseDurationYears: Number.isFinite(baseDurationYears) && baseDurationYears > 0 ? baseDurationYears : null,
                totalSemesters: Number.isFinite(totalSemesters) && totalSemesters > 0 ? totalSemesters : null,
                duration: durationLabel || (Number.isFinite(baseDurationYears) && baseDurationYears > 0 ? `${baseDurationYears} years` : ''),
                credits: document.getElementById('itemCredits').value,
                image: document.getElementById('itemImage').value,
                description: document.getElementById('itemDescription').value
            };
            break;
            
        case 'university':
            // Parse intake months from picker
            const intakeMonths = getSelectedMonths();

            // Parse next intake date
            const nextIntakeDateStr = document.getElementById('itemNextIntake').value;
            const nextIntakeDate = nextIntakeDateStr ? new Date(nextIntakeDateStr) : null;

            // Build data WITHOUT courseOfferings (now a separate collection)
            data = {
                shortCode: document.getElementById('itemShortCode').value,
                order: parseInt(document.getElementById('itemOrder').value) || 1,
                name: document.getElementById('itemName').value,
                location: document.getElementById('itemLocation').value,
                ranking: parseInt(document.getElementById('itemRanking').value) || null,
                intro: document.getElementById('itemIntro').value,
                aboutContent: document.getElementById('itemAboutContent').value,
                logo: document.getElementById('itemLogo').value,
                campusImage: document.getElementById('itemCampusImage').value,
                youtubeVideo: document.getElementById('itemYouTube').value,
                nextIntakeDate: nextIntakeDate,
                intakeMonths: intakeMonths,
                offerLetterFree: document.getElementById('itemOfferLetterFree').checked,
                faqs: getFaqsFromEditor(),
                active: document.getElementById('itemActive').checked
            };
            // Store courseOfferings for later processing in saveUniversityAndOfferings
            data._courseOfferingsTemp = universityCoursesTemp;
            data._universityId = editingId;
            break;
            
        case 'team':
            const whatsappInput = (document.getElementById('itemWhatsApp').value || '').trim();
            let whatsappNumber = '';
            if (whatsappInput) {
                whatsappNumber = whatsappInput.replace(/\D/g, '');
                if (whatsappNumber.length < 9) {
                    alert('Invalid WhatsApp number. Please enter a valid phone number.');
                    return;
                }
            }
            data = {
                name: document.getElementById('itemName').value,
                role: document.getElementById('itemRole').value,
                order: parseInt(document.getElementById('itemOrder').value) || 1,
                bio: document.getElementById('itemBio').value,
                photoPath: document.getElementById('itemPhoto').value,
                whatsappNumber: whatsappNumber,
                active: document.getElementById('itemActive').checked
            };
            break;
            
        case 'testimonial':
            data = {
                studentName: document.getElementById('itemName').value,
                university: document.getElementById('itemUniversity').value,
                country: document.getElementById('itemCountry').value,
                status: document.getElementById('itemStatus').value,
                quote: document.getElementById('itemQuote').value,
                photoPath: document.getElementById('itemPhoto').value,
                featured: document.getElementById('itemFeatured').checked,
                active: document.getElementById('itemActive').checked
            };
            break;
            
        case 'service':
            data = {
                icon: document.getElementById('itemIcon').value,
                order: parseInt(document.getElementById('itemOrder').value) || 1,
                title: document.getElementById('itemTitle').value,
                description: document.getElementById('itemDescription').value,
                active: document.getElementById('itemActive').checked
            };
            break;

        case 'agent': {
            const agentName = document.getElementById('itemAgentName').value.trim();
            const agentEmail = document.getElementById('itemAgentEmail').value.trim().toLowerCase();
            const agentPassword = document.getElementById('itemAgentPassword').value;
            const agentPasswordConfirm = document.getElementById('itemAgentPasswordConfirm').value;
            const agentPhone = document.getElementById('itemAgentPhone').value.trim();
            const agentCountry = document.getElementById('itemAgentCountry').value.trim();
            const agentStatus = document.getElementById('itemAgentStatus').value;
            const agentCommission = document.getElementById('itemCommission').value.trim();
            let agentReferralCode = document.getElementById('itemAgentReferralCode').value.trim();

            const uploadBtn = document.querySelector('.btn-primary');
            const originalText = uploadBtn.textContent;
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Creating...';

            try {
                // Password validation
                if (agentPassword !== agentPasswordConfirm) {
                    alert('❌ Error: Passwords do not match.');
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = originalText;
                    return;
                }
                if (agentPassword.length < 8) {
                    alert('❌ Error: Password must be at least 8 characters long.');
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = originalText;
                    return;
                }
                // Password strength check (warn but allow)
                const hasUppercase = /[A-Z]/.test(agentPassword);
                const hasLowercase = /[a-z]/.test(agentPassword);
                const hasNumber = /[0-9]/.test(agentPassword);
                const hasSpecialChar = /[^A-Za-z0-9]/.test(agentPassword);
                if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
                    const msg = 'Password strength warning: should contain uppercase, lowercase, number, and special character. Continue anyway?';
                    if (!confirm(msg)) {
                        uploadBtn.disabled = false;
                        uploadBtn.textContent = originalText;
                        return;
                    }
                }

                // Auto-generate referral code if blank
                if (!agentReferralCode) {
                    const namePart = agentName.split(' ')[0].toUpperCase();
                    const randomPart = Math.random().toString(36).substr(2, 6).toUpperCase();
                    agentReferralCode = `${namePart}_${randomPart}`;
                }

                // Check referral code uniqueness
                const existingRefLink = await db.collection('referralLinks').doc(agentReferralCode).get();
                if (existingRefLink.exists) {
                    alert(`❌ Error: Referral code "${agentReferralCode}" already exists. Please use a different code.`);
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = originalText;
                    return;
                }

                // Create Firebase Auth user via secondary app
                const secAuth = initSecondaryAuth();
                if (!secAuth) throw new Error('Cannot initialize secondary auth');

                const authResult = await createAuthUserWithSecondaryApp(agentEmail, agentPassword);
                const uid = authResult.uid;
                console.log('Agent auth user created with secondary app:', uid);

                // Build agent data (NO password field)
                const referralUrl = `${window.location.origin}/?ref=${agentReferralCode}`;
                const agentData = {
                    uid: uid,
                    userId: uid,
                    name: agentName,
                    email: agentEmail,
                    phone: agentPhone,
                    country: agentCountry,
                    role: 'agent',
                    status: agentStatus,
                    referralCode: agentReferralCode,
                    referralUrl: referralUrl,
                    commissionStructure: agentCommission,
                    authUserCreated: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: auth.currentUser?.email || 'admin'
                };

                // Write agents/{uid} document
                await db.collection('agents').doc(uid).set(agentData);
                console.log('Agent Firestore profile created at agents/' + uid);

                // Create referralLinks/{code} document
                const refLinkData = {
                    code: agentReferralCode,
                    agentId: uid,
                    agentEmail: agentEmail,
                    agentName: agentName,
                    fullUrl: referralUrl,
                    status: 'active',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: auth.currentUser?.email || 'admin'
                };
                await db.collection('referralLinks').doc(agentReferralCode).set(refLinkData);
                console.log('Referral link created for code:', agentReferralCode);

                closeModal();
                loadSectionData(currentSection);
                alert(`✅ Agent account created successfully!\n\nName: ${agentName}\nEmail: ${agentEmail}\nReferral Code: ${agentReferralCode}\n\nAgent Auth account created.\nFirestore profile saved.\nReferral link created.\n\nPassword was NOT stored in Firestore.`);
            } catch (error) {
                console.error('Error creating agent:', error);
                // Check if Auth user was created but Firestore failed
                if (error.message && error.message.includes('firestore') || error.message.includes('permission')) {
                    alert(`⚠️ Partial error creating agent account:\n\nFirebase Auth account was created, but Firestore profile creation failed.\n\nError: ${error.message}\n\nPlease create or repair the agent Firestore profile manually.`);
                } else {
                    alert(`❌ Error creating agent account:\n${error.message}`);
                }
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.textContent = originalText;
            }
            return;
        }

        case 'admin': {
            const adminName = document.getElementById('itemAdminName').value.trim();
            const adminEmail = document.getElementById('itemAdminEmail').value.trim();
            const adminStatus = document.getElementById('itemAdminStatus').value;
            const adminUid = document.getElementById('itemAdminUid')?.value.trim() || '';

            // Spark plan: Create Firestore profile only (Auth user created manually in Firebase Console)
            try {
                if (!adminUid) {
                    alert('❌ Error: Firebase UID is required.\n\nTo create an admin on Spark plan:\n1. Go to Firebase Console → Authentication\n2. Create user with email: ' + adminEmail + '\n3. Copy the UID from the user details\n4. Paste the UID here and try again.');
                    return;
                }

                const docId = adminEmail.toLowerCase();
                await db.collection('admins').doc(docId).set({
                    uid: adminUid,
                    name: adminName,
                    email: docId,
                    role: 'admin',
                    status: adminStatus,
                    permissions: ['manage_courses','manage_universities','manage_team','manage_testimonials','manage_services','manage_agents','manage_students','view_analytics','manage_contact_settings','view_audit_logs'],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: auth.currentUser?.email || 'admin'
                });

                closeModal();
                loadSectionData(currentSection);
                alert(
                    `✅ Admin profile created in Firestore!\n\n` +
                    `Admin: ${adminEmail}\n` +
                    `UID: ${adminUid}\n\n` +
                    `The admin can now log in. ` +
                    `To allow ${adminEmail} to upload brand assets (logo/hero), ` +
                    `either:\n\n` +
                    `Option 1 (Current):\n` +
                    `Upgrade to Blaze plan and use Cloud Functions for dynamic admin claims.\n\n` +
                    `Option 2 (Spark only):\n` +
                    `Contact developer to add ${adminUid} to storage.rules admin UID allowlist.`
                );
            } catch (error) {
                console.error('Admin creation error:', error);
                alert(`❌ Error creating admin profile:\n${error.message}`);
            }
            return;
        }
    } // end switch

    try {
        if (editingType === 'university') {
            await saveUniversityAndOfferings(editingId, data);
        } else if (editingId) {
            await updateDocument(collectionMap[editingType], editingId, data);
        } else {
            await addDocument(collectionMap[editingType], data);
        }

        closeModal();
        loadSectionData(currentSection);

        // Refresh courses cache
        if (editingType === 'course') {
            loadAvailableCourses();
        }

        alert('Saved successfully!');
    } catch (error) {
        console.error('Error saving:', error);
        alert('Error saving. Please try again.');
    }
}

// ============================================
// Delete Item
// ============================================

async function deleteItem(collection, id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        await deleteDocument(collection, id);
        loadSectionData(currentSection);
        loadDashboard();
        loadAvailableCourses();
    } catch (error) {
        console.error('Error deleting:', error);
        alert('Error deleting item');
    }
}

// ============================================
// FOLDER MANAGEMENT
// ============================================

let courseFolders = [];
let draggedCourseId = null;
let openPickerFolders = new Set();
let selectedCourseIds = new Set();
let allCourseIds = [];

// Load folders and courses with folder tree view
async function loadCoursesWithFolders() {
    const folderTree = document.getElementById('folderTree');
    if (!folderTree) return;
    
    try {
        // Load folders
        const foldersSnap = await db.collection('courseFolders').orderBy('order', 'asc').get();
        courseFolders = [];
        foldersSnap.forEach(doc => {
            courseFolders.push({ id: doc.id, ...doc.data() });
        });
        
        // Load all courses
        const coursesSnap = await db.collection('courses').orderBy('name', 'asc').get();
        const allCourses = [];
        coursesSnap.forEach(doc => {
            allCourses.push({ id: doc.id, ...doc.data() });
        });
        allCourseIds = allCourses.map((course) => course.id);
        selectedCourseIds = new Set([...selectedCourseIds].filter((id) => allCourseIds.includes(id)));
        
        // Group courses by folder
        const coursesByFolder = {};
        const uncategorized = [];
        
        allCourses.forEach(course => {
            if (course.folderId && courseFolders.some(f => f.id === course.folderId)) {
                if (!coursesByFolder[course.folderId]) {
                    coursesByFolder[course.folderId] = [];
                }
                coursesByFolder[course.folderId].push(course);
            } else {
                uncategorized.push(course);
            }
        });
        
        // Render folder tree
        let html = '';
        
        // Render folders
        courseFolders.forEach(folder => {
            const courses = coursesByFolder[folder.id] || [];
            html += renderFolder(folder, courses);
        });
        
        // Render uncategorized
        if (uncategorized.length > 0 || courseFolders.length === 0) {
            html += renderUncategorizedSection(uncategorized);
        }
        
        if (html === '') {
            html = '<div class="loading-state">No courses yet. Click "+ Add Course" to create one.</div>';
        }
        
        folderTree.innerHTML = html;
        updateCourseBulkActionsUI();
        setupDragAndDrop();
        
    } catch (error) {
        console.error('Error loading courses with folders:', error);
        folderTree.innerHTML = '<div class="loading-state">Error loading courses</div>';
    }
}

function renderFolder(folder, courses) {
    const coursesHTML = courses.map(c => renderCourseRow(c)).join('');
    return `
        <div class="folder-item" data-folder-id="${folder.id}">
            <div class="folder-header" onclick="toggleFolder('${folder.id}')" 
                 ondragover="handleDragOver(event, '${folder.id}')"
                 ondragleave="handleDragLeave(event)"
                 ondrop="handleDrop(event, '${folder.id}')">
                <span class="folder-toggle">▶</span>
                <span class="folder-icon"><i class="bi bi-folder2"></i></span>
                <span class="folder-name">${folder.name}</span>
                <span class="folder-count">${courses.length}</span>
                <div class="folder-actions" onclick="event.stopPropagation()">
                    <button onclick="renameFolder('${folder.id}', '${folder.name.replace(/'/g, "\\'")}')">Rename</button>
                    <button class="btn-delete-folder" onclick="deleteFolder('${folder.id}')">Delete</button>
                </div>
            </div>
            <div class="folder-courses">
                ${coursesHTML || '<div class="empty-hint" style="padding: 16px 52px; font-size: 0.875rem;">No courses in this folder</div>'}
            </div>
        </div>
    `;
}

function renderUncategorizedSection(courses) {
    const coursesHTML = courses.map(c => renderCourseRow(c)).join('');
    return `
        <div class="uncategorized-section">
            <div class="uncategorized-header"
                 ondragover="handleDragOver(event, null)"
                 ondragleave="handleDragLeave(event)"
                 ondrop="handleDrop(event, null)">
                <span><i class="bi bi-collection"></i></span>
                <span>Uncategorized (${courses.length})</span>
            </div>
            <div class="folder-courses" style="display: block;">
                ${coursesHTML}
            </div>
        </div>
    `;
}

function renderCourseRow(course) {
    const checked = selectedCourseIds.has(course.id) ? 'checked' : '';
    const stableId = course.courseId ? `ID: ${course.courseId}` : 'ID: not set';
    return `
        <div class="course-row" draggable="true" data-course-id="${course.id}"
             ondragstart="handleDragStart(event, '${course.id}')"
             ondragend="handleDragEnd(event)">
            <label class="course-select-box" onclick="event.stopPropagation()">
                <input type="checkbox" ${checked} onchange="toggleCourseSelection('${course.id}', this.checked)">
            </label>
            <span class="course-drag-handle">⋮⋮</span>
            <div class="course-row-info">
                <strong>${course.name || 'Untitled'}</strong>
                <span>${course.level || 'Bachelor'} • ${course.category || 'Other'} • ${stableId}</span>
            </div>
            <div class="action-btns">
                <button class="btn-edit" onclick="editItem('course', '${course.id}')">Edit</button>
                <button class="btn-delete" onclick="deleteItem('courses', '${course.id}')">Delete</button>
            </div>
        </div>
    `;
}

function toggleCourseSelection(courseId, isChecked) {
    if (isChecked) {
        selectedCourseIds.add(courseId);
    } else {
        selectedCourseIds.delete(courseId);
    }
    updateCourseBulkActionsUI();
}

function toggleSelectAllCourses() {
    const shouldSelectAll = selectedCourseIds.size !== allCourseIds.length;
    if (shouldSelectAll) {
        selectedCourseIds = new Set(allCourseIds);
    } else {
        selectedCourseIds.clear();
    }
    loadCoursesWithFolders();
}

function updateCourseBulkActionsUI() {
    const deleteSelectedBtn = document.getElementById('deleteSelectedCoursesBtn');
    const selectAllBtn = document.getElementById('selectAllCoursesBtn');
    const selectedCount = selectedCourseIds.size;
    const totalCount = allCourseIds.length;

    if (deleteSelectedBtn) {
        deleteSelectedBtn.disabled = selectedCount === 0;
        deleteSelectedBtn.textContent = `Delete Selected (${selectedCount})`;
    }

    if (selectAllBtn) {
        selectAllBtn.textContent = selectedCount > 0 && selectedCount === totalCount
            ? 'Unselect All'
            : 'Select All';
    }
}

async function deleteSelectedCourses() {
    const ids = Array.from(selectedCourseIds);
    if (!ids.length) return;

    if (!confirm(`Delete ${ids.length} selected course(s)? This action cannot be undone.`)) return;

    try {
        await deleteCoursesInBatches(ids);
        selectedCourseIds.clear();
        await loadCoursesWithFolders();
        await loadAvailableCourses();
        await loadDashboard();
        alert(`Deleted ${ids.length} course(s).`);
    } catch (error) {
        console.error('Error deleting selected courses:', error);
        alert('Failed to delete selected courses.');
    }
}

async function deleteAllCourses() {
    if (!allCourseIds.length) {
        alert('No courses found.');
        return;
    }

    const confirmed = confirm(`Delete ALL ${allCourseIds.length} courses? This action cannot be undone.`);
    if (!confirmed) return;

    try {
        await deleteCoursesInBatches(allCourseIds);
        selectedCourseIds.clear();
        await loadCoursesWithFolders();
        await loadAvailableCourses();
        await loadDashboard();
        alert('All courses deleted successfully.');
    } catch (error) {
        console.error('Error deleting all courses:', error);
        alert('Failed to delete all courses.');
    }
}

async function deleteCoursesInBatches(courseIds) {
    if (!Array.isArray(courseIds) || courseIds.length === 0) return;

    const chunkSize = 400;
    for (let i = 0; i < courseIds.length; i += chunkSize) {
        const chunk = courseIds.slice(i, i + chunkSize);
        const batch = db.batch();
        chunk.forEach((id) => {
            batch.delete(db.collection('courses').doc(id));
        });
        await batch.commit();
    }
}

function toggleFolder(folderId) {
    const folderEl = document.querySelector(`.folder-item[data-folder-id="${folderId}"]`);
    if (folderEl) {
        folderEl.classList.toggle('open');
    }
}

// Folder CRUD
function openFolderModal() {
    const name = prompt('Enter folder name:');
    if (name && name.trim()) {
        createFolder(name.trim());
    }
}

async function createFolder(name) {
    try {
        const order = courseFolders.length + 1;
        await db.collection('courseFolders').add({ name, order, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        loadCoursesWithFolders();
    } catch (error) {
        console.error('Error creating folder:', error);
        alert('Error creating folder');
    }
}

async function renameFolder(folderId, currentName) {
    const newName = prompt('Rename folder:', currentName);
    if (newName && newName.trim() && newName !== currentName) {
        try {
            await db.collection('courseFolders').doc(folderId).update({ name: newName.trim() });
            loadCoursesWithFolders();
        } catch (error) {
            console.error('Error renaming folder:', error);
            alert('Error renaming folder');
        }
    }
}

async function deleteFolder(folderId) {
    if (!confirm('Delete this folder? Courses will be moved to Uncategorized.')) return;
    
    try {
        // Move courses to uncategorized
        const coursesSnap = await db.collection('courses').where('folderId', '==', folderId).get();
        const batch = db.batch();
        coursesSnap.forEach(doc => {
            batch.update(doc.ref, { folderId: null });
        });
        
        // Delete folder
        batch.delete(db.collection('courseFolders').doc(folderId));
        await batch.commit();
        
        loadCoursesWithFolders();
    } catch (error) {
        console.error('Error deleting folder:', error);
        alert('Error deleting folder');
    }
}

// Drag and Drop
function setupDragAndDrop() {
    // Drag and drop is handled via inline event handlers
}

function handleDragStart(event, courseId) {
    draggedCourseId = courseId;
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', courseId);
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    draggedCourseId = null;
}

function handleDragOver(event, folderId) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

async function handleDrop(event, folderId) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const courseId = event.dataTransfer.getData('text/plain') || draggedCourseId;
    if (!courseId) return;
    
    try {
        await db.collection('courses').doc(courseId).update({ folderId: folderId });
        loadCoursesWithFolders();
    } catch (error) {
        console.error('Error moving course:', error);
        alert('Error moving course');
    }
}

// Override original loadCourses
async function loadCourses() {
    await loadCoursesWithFolders();
}

// ============================================
// FOLDER PICKER FOR UNIVERSITY FORM
// ============================================

function renderFolderPicker() {
    let html = '<div class="folder-picker" id="folderPickerContainer">';
    
    // Group available courses by folder
    const coursesByFolder = {};
    const uncategorized = [];
    
    availableCourses.forEach(course => {
        if (course.folderId) {
            if (!coursesByFolder[course.folderId]) {
                coursesByFolder[course.folderId] = [];
            }
            coursesByFolder[course.folderId].push(course);
        } else {
            uncategorized.push(course);
        }
    });
    
    // Render folders (show all folders, including empty ones for quick add)
    courseFolders.forEach(folder => {
        const courses = coursesByFolder[folder.id] || [];
        html += renderPickerFolder(folder, courses);
    });
    
    // Render uncategorized bucket
    html += renderPickerFolder({ id: 'uncategorized', name: 'Uncategorized' }, uncategorized);
    
    html += '</div>';
    html += '<div class="selected-summary" id="selectedSummary">0 courses selected</div>';
    
    return html;
}

function renderOfferingCurrencyOptions(selected = 'MYR') {
    return OFFERING_CURRENCIES.map(code => (
        `<option value="${code}" ${selected === code ? 'selected' : ''}>${code}</option>`
    )).join('');
}

function renderPickerFolder(folder, courses) {
    const coursesHTML = courses.map(c => {
        const isSelected = universityCoursesTemp.some(uc => uc.courseId === c.id);
        const selectedCourse = isSelected ? universityCoursesTemp.find(uc => uc.courseId === c.id) : null;
        const baseDuration = Number(c.baseDurationYears);
        const defaultDurationYears =
            (Number.isFinite(baseDuration) && baseDuration > 0)
                ? baseDuration
                : (parseDurationYearsFromText(c.duration) || null);
        const baseSemesters = Number(c.totalSemesters);
        const defaultSemesters =
            (Number.isFinite(baseSemesters) && baseSemesters > 0)
                ? baseSemesters
                : (defaultDurationYears ? Math.round(defaultDurationYears * 2) : null);
        const feesVal = selectedCourse ? selectedCourse.fees : (Number(c.basePrice) || '');
        const currencyVal = selectedCourse ? selectedCourse.currency : (c.baseCurrency || DEFAULT_BASE_CURRENCY);
        const durationVal = selectedCourse ? (selectedCourse.durationYears ?? '') : (defaultDurationYears ?? '');
        const semestersVal = selectedCourse ? (selectedCourse.semesters ?? '') : (defaultSemesters ?? '');
        return `
            <div class="picker-course" data-course-row="${c.id}">
                <div class="picker-course-main" onclick="togglePickerCourse('${c.id}', '${c.name.replace(/'/g, "\\'")}', '${c.level}')">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} data-course-id="${c.id}">
                    <div class="picker-course-info">
                        <strong>${c.name}</strong>
                        <span>${c.level} • ${c.category || 'Other'}${c.courseId ? ` • ${c.courseId}` : ''}</span>
                    </div>
                </div>
                <div class="picker-course-fields ${isSelected ? '' : 'disabled'}">
                    <div class="mini-field">
                        <label>Amount / Year</label>
                        <input type="number" value="${feesVal}" placeholder="25000" ${isSelected ? '' : 'disabled'} onchange="updateCourseFeesById('${c.id}', this.value)">
                    </div>
                    <div class="mini-field">
                        <label>Currency</label>
                        <select ${isSelected ? '' : 'disabled'} onchange="updateCourseCurrencyById('${c.id}', this.value)">
                            <option value="MYR" ${currencyVal === 'MYR' ? 'selected' : ''}>MYR</option>
                            <option value="USD" ${currencyVal === 'USD' ? 'selected' : ''}>USD</option>
                            <option value="GBP" ${currencyVal === 'GBP' ? 'selected' : ''}>GBP</option>
                            <option value="EUR" ${currencyVal === 'EUR' ? 'selected' : ''}>EUR</option>
                            <option value="SAR" ${currencyVal === 'SAR' ? 'selected' : ''}>SAR</option>
                            <option value="AED" ${currencyVal === 'AED' ? 'selected' : ''}>AED</option>
                            <option value="PKR" ${currencyVal === 'PKR' ? 'selected' : ''}>PKR</option>
                            <option value="BDT" ${currencyVal === 'BDT' ? 'selected' : ''}>BDT</option>
                            <option value="NGN" ${currencyVal === 'NGN' ? 'selected' : ''}>NGN</option>
                        </select>
                    </div>
                    <div class="mini-field">
                        <label>Duration (Years)</label>
                        <input type="number" value="${durationVal}" min="0.5" max="10" step="0.5" ${isSelected ? '' : 'disabled'} onchange="updateCourseDurationById('${c.id}', this.value)">
                    </div>
                    <div class="mini-field">
                        <label>Semesters</label>
                        <input type="number" value="${semestersVal}" min="1" max="20" step="1" ${isSelected ? '' : 'disabled'} onchange="updateCourseSemestersById('${c.id}', this.value)">
                    </div>
                </div>
                <div class="picker-course-row-actions ${isSelected ? '' : 'hidden'}">
                    <button type="button" class="picker-remove-course-btn" onclick="event.stopPropagation(); removeUniversityCourseById('${c.id}')">Remove</button>
                </div>
            </div>
        `;
    }).join('');
    
    const hasCourses = courses.length > 0;
    const allSelected = hasCourses && courses.every(c => universityCoursesTemp.some(uc => uc.courseId === c.id));
    const someSelected = hasCourses && courses.some(c => universityCoursesTemp.some(uc => uc.courseId === c.id));
    const selectedCount = hasCourses
        ? courses.filter(c => universityCoursesTemp.some(uc => uc.courseId === c.id)).length
        : 0;
    
    const isOpen = openPickerFolders.has(folder.id);
    const quickAddOpen = activeQuickAddFolderId === folder.id;
    return `
        <div class="picker-folder${isOpen ? ' open' : ''}" data-picker-folder="${folder.id}">
            <div class="picker-folder-header" onclick="togglePickerFolder('${folder.id}')">
                <input type="checkbox" 
                       ${allSelected ? 'checked' : ''} 
                       ${someSelected && !allSelected ? 'class="indeterminate"' : ''}
                       ${hasCourses ? '' : 'disabled'}
                       onclick="event.stopPropagation(); toggleFolderSelection('${folder.id}')"
                       data-folder-checkbox="${folder.id}">
                <span class="picker-folder-toggle">▶</span>
                <span class="picker-folder-name">${folder.name}</span>
                <span class="picker-folder-count">${selectedCount} offered · ${courses.length} in catalog</span>
                <button type="button"
                        class="picker-remove-folder-btn"
                        ${selectedCount > 0 ? '' : 'disabled'}
                        onclick="event.stopPropagation(); removeFolderSelection('${folder.id}')">
                    Remove selected (${selectedCount})
                </button>
                <button type="button" class="picker-add-course-btn" onclick="event.stopPropagation(); toggleQuickAddCourseForm('${folder.id}')">+ Add Course</button>
            </div>
            <div class="picker-quick-add ${quickAddOpen ? 'open' : ''}" onclick="event.stopPropagation()">
                <div class="picker-quick-add-form" onkeydown="if(event.key === 'Enter'){ event.preventDefault(); event.stopPropagation(); }">
                    <input type="text" name="courseName" placeholder="Course name">
                    <input type="number" name="fees" min="0" step="1" placeholder="Amount / Year">
                    <select name="currency">
                        ${renderOfferingCurrencyOptions(DEFAULT_BASE_CURRENCY)}
                    </select>
                    <input type="number" name="durationYears" min="0.5" max="10" step="0.5" placeholder="Years (optional)">
                    <input type="number" name="semesters" min="1" max="20" step="1" placeholder="Semesters (optional)">
                    <button type="button" class="btn btn-primary btn-compact" onclick="event.stopPropagation(); saveQuickCourseToFolder('${folder.id}', this)">Add</button>
                    <button type="button" class="btn btn-outline btn-compact" onclick="event.stopPropagation(); toggleQuickAddCourseForm('${folder.id}')">Cancel</button>
                </div>
            </div>
            <div class="picker-courses">
                ${coursesHTML || '<div class="empty-hint" style="padding: 14px 16px; text-align: left;">No courses yet in this folder. Use + Add Course.</div>'}
            </div>
        </div>
    `;
}

function toggleQuickAddCourseForm(folderId) {
    activeQuickAddFolderId = activeQuickAddFolderId === folderId ? null : folderId;
    if (activeQuickAddFolderId) {
        openPickerFolders.add(folderId);
    }
    refreshFolderPicker();
}

async function saveQuickCourseToFolder(folderId, triggerButton) {
    const form = triggerButton?.closest('.picker-quick-add-form');
    if (!form) return;

    const courseNameInput = form.querySelector('input[name="courseName"]');
    const feesInput = form.querySelector('input[name="fees"]');
    const currencySelect = form.querySelector('select[name="currency"]');
    const durationInput = form.querySelector('input[name="durationYears"]');
    const semestersInput = form.querySelector('input[name="semesters"]');

    const courseName = String(courseNameInput?.value || '').trim();
    const fees = parseInt(feesInput?.value, 10);
    const currencyRaw = String(currencySelect?.value || DEFAULT_BASE_CURRENCY).toUpperCase();
    const durationRaw = String(durationInput?.value || '').trim();
    const semestersRaw = String(semestersInput?.value || '').trim();
    const durationYears = durationRaw === '' ? null : Number(durationRaw);
    const semesters = semestersRaw === '' ? null : parseInt(semestersRaw, 10);

    if (!courseName) {
        alert('Please enter a course name.');
        return;
    }
    if (!Number.isFinite(fees) || fees < 0) {
        alert('Please enter a valid amount.');
        return;
    }
    if (durationRaw !== '' && (!Number.isFinite(durationYears) || durationYears <= 0)) {
        alert('Please enter a valid duration.');
        return;
    }
    if (semestersRaw !== '' && (!Number.isFinite(semesters) || semesters < 1)) {
        alert('Please enter valid semesters.');
        return;
    }

    const currency = OFFERING_CURRENCIES.includes(currencyRaw) ? currencyRaw : DEFAULT_BASE_CURRENCY;
    const folderMeta = folderId === 'uncategorized'
        ? { id: null, name: 'Uncategorized' }
        : (courseFolders.find(f => f.id === folderId) || { id: folderId, name: 'Other' });
    const normalizedName = courseName.toLowerCase();

    try {
        let course = availableCourses.find(c =>
            String(c.name || '').trim().toLowerCase() === normalizedName &&
            String(c.level || 'Bachelor').toLowerCase() === 'bachelor'
        );

        if (!course) {
            const stableCourseId = getUniqueCourseIdentifier('', courseName, 'Bachelor');
            const newCourse = {
                name: courseName,
                courseId: stableCourseId,
                level: 'Bachelor',
                folderId: folderMeta.id,
                category: folderMeta.name || 'Other',
                basePrice: fees,
                baseCurrency: currency,
                baseDurationYears: durationYears,
                totalSemesters: semesters,
                duration: durationYears ? `${durationYears} years` : '',
                credits: '',
                image: '',
                imageFallback: buildOnlineCourseImage(courseName, folderMeta.name || 'Other', 'Bachelor'),
                description: ''
            };
            const docRef = await db.collection('courses').add(newCourse);
            course = { id: docRef.id, ...newCourse };
            availableCourses.push(course);
        } else if (!course.courseId) {
            const generatedCourseId = getUniqueCourseIdentifier('', course.name, course.level || 'Bachelor', course.id);
            const existingBaseDuration = Number(course.baseDurationYears);
            const existingSemesters = Number(course.totalSemesters);
            await db.collection('courses').doc(course.id).update({
                courseId: generatedCourseId,
                basePrice: Number(course.basePrice) || fees,
                baseCurrency: course.baseCurrency || currency,
                baseDurationYears: (Number.isFinite(existingBaseDuration) && existingBaseDuration > 0) ? existingBaseDuration : durationYears,
                totalSemesters: (Number.isFinite(existingSemesters) && existingSemesters > 0) ? existingSemesters : semesters
            });
            course.courseId = generatedCourseId;
            course.basePrice = Number(course.basePrice) || fees;
            course.baseCurrency = course.baseCurrency || currency;
            course.baseDurationYears = (Number.isFinite(existingBaseDuration) && existingBaseDuration > 0) ? existingBaseDuration : durationYears;
            course.totalSemesters = (Number.isFinite(existingSemesters) && existingSemesters > 0) ? existingSemesters : semesters;
        }

        const existingIdx = universityCoursesTemp.findIndex(uc => uc.courseId === course.id);
        if (existingIdx === -1) {
            universityCoursesTemp.push({
                courseId: course.id,
                courseGlobalId: course.courseId || '',
                courseName: course.name,
                level: course.level || 'Bachelor',
                category: course.category || folderMeta.name || 'Other',
                fees,
                currency,
                durationYears,
                semesters,
                intake: ['September']
            });
        } else {
            universityCoursesTemp[existingIdx] = {
                ...universityCoursesTemp[existingIdx],
                fees,
                currency,
                durationYears,
                semesters
            };
        }

        activeQuickAddFolderId = null;
        refreshFolderPicker();
    } catch (error) {
        console.error('Error creating quick course:', error);
        alert('Could not add course. Please try again.');
    }
}

function togglePickerFolder(folderId) {
    const el = document.querySelector(`.picker-folder[data-picker-folder="${folderId}"]`);
    if (el) {
        el.classList.toggle('open');
        if (el.classList.contains('open')) {
            openPickerFolders.add(folderId);
        } else {
            openPickerFolders.delete(folderId);
        }
    }
}

function toggleFolderSelection(folderId) {
    const checkbox = document.querySelector(`[data-folder-checkbox="${folderId}"]`);
    const shouldSelect = checkbox.checked;
    
    // Get courses in this folder
    const folderCourses = folderId === 'uncategorized' 
        ? availableCourses.filter(c => !c.folderId)
        : availableCourses.filter(c => c.folderId === folderId);
    
    folderCourses.forEach(course => {
        const idx = universityCoursesTemp.findIndex(uc => uc.courseId === course.id);
        if (shouldSelect && idx === -1) {
            const baseDuration = Number(course.baseDurationYears);
            const durationYears =
                (Number.isFinite(baseDuration) && baseDuration > 0)
                    ? baseDuration
                    : (parseDurationYearsFromText(course.duration) || null);
            const baseSemesters = Number(course.totalSemesters);
            const semesters =
                (Number.isFinite(baseSemesters) && baseSemesters > 0)
                    ? baseSemesters
                    : (durationYears ? Math.round(durationYears * 2) : null);
            universityCoursesTemp.push({
                courseId: course.id,
                courseGlobalId: course.courseId || '',
                courseName: course.name,
                level: course.level,
                fees: Number(course.basePrice) || 0,
                category: course.category || 'Other',
                currency: course.baseCurrency || DEFAULT_BASE_CURRENCY,
                durationYears: durationYears,
                semesters: semesters,
                intake: ['September']
            });
        } else if (!shouldSelect && idx !== -1) {
            universityCoursesTemp.splice(idx, 1);
        }
    });
    
    refreshFolderPicker();
}

function removeFolderSelection(folderId) {
    const folderCourses = folderId === 'uncategorized'
        ? availableCourses.filter(c => !c.folderId)
        : availableCourses.filter(c => c.folderId === folderId);

    if (!folderCourses.length) return;
    const removableIds = new Set(
        folderCourses
            .map(course => course.id)
            .filter(id => universityCoursesTemp.some(uc => uc.courseId === id))
    );

    if (!removableIds.size) return;
    universityCoursesTemp = universityCoursesTemp.filter(uc => !removableIds.has(uc.courseId));
    refreshFolderPicker();
}

function removeUniversityCourseById(courseId) {
    const idx = universityCoursesTemp.findIndex(uc => uc.courseId === courseId);
    if (idx === -1) return;
    universityCoursesTemp.splice(idx, 1);
    refreshFolderPicker();
}

function togglePickerCourse(courseId, courseName, level) {
    const idx = universityCoursesTemp.findIndex(uc => uc.courseId === courseId);
    
    if (idx !== -1) {
        universityCoursesTemp.splice(idx, 1);
    } else {
        const course = availableCourses.find(c => c.id === courseId);
        const baseDuration = Number(course?.baseDurationYears);
        const durationYears =
            (Number.isFinite(baseDuration) && baseDuration > 0)
                ? baseDuration
                : (parseDurationYearsFromText(course?.duration) || null);
        const baseSemesters = Number(course?.totalSemesters);
        const semesters =
            (Number.isFinite(baseSemesters) && baseSemesters > 0)
                ? baseSemesters
                : (durationYears ? Math.round(durationYears * 2) : null);
        universityCoursesTemp.push({
            courseId: courseId,
            courseGlobalId: course?.courseId || '',
            courseName: courseName,
            level: level,
            fees: Number(course?.basePrice) || 0,
            category: course?.category || 'Other',
            currency: course?.baseCurrency || DEFAULT_BASE_CURRENCY,
            durationYears: durationYears,
            semesters: semesters,
            intake: ['September']
        });
    }
    
    refreshFolderPicker();
}

function updateCourseFeesById(courseId, fees) {
    const idx = universityCoursesTemp.findIndex(uc => uc.courseId === courseId);
    if (idx === -1) return;
    universityCoursesTemp[idx].fees = parseInt(fees) || 0;
}

function updateCourseCurrencyById(courseId, currency) {
    const idx = universityCoursesTemp.findIndex(uc => uc.courseId === courseId);
    if (idx === -1) return;
    universityCoursesTemp[idx].currency = currency;
}

function updateCourseDurationById(courseId, years) {
    const idx = universityCoursesTemp.findIndex(uc => uc.courseId === courseId);
    if (idx === -1) return;
    const raw = String(years || '').trim();
    if (!raw) {
        universityCoursesTemp[idx].durationYears = null;
        return;
    }
    const parsed = Number(raw);
    universityCoursesTemp[idx].durationYears = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function updateCourseSemestersById(courseId, semesters) {
    const idx = universityCoursesTemp.findIndex(uc => uc.courseId === courseId);
    if (idx === -1) return;
    const raw = String(semesters || '').trim();
    if (!raw) {
        universityCoursesTemp[idx].semesters = null;
        return;
    }
    const parsed = parseInt(raw, 10);
    universityCoursesTemp[idx].semesters = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function refreshFolderPicker() {
    const container = document.querySelector('.course-picker');
    if (container) {
        container.innerHTML = renderFolderPicker();
        updateSelectedSummary();
        // Re-apply indeterminate states
        setIndeterminateStates();
    }
}

function updateSelectedSummary() {
    const summaryEl = document.getElementById('selectedSummary');
    if (summaryEl) {
        summaryEl.textContent = `${universityCoursesTemp.length} courses selected`;
    }
}

function setIndeterminateStates() {
    courseFolders.concat([{ id: 'uncategorized' }]).forEach(folder => {
        const folderCourses = folder.id === 'uncategorized'
            ? availableCourses.filter(c => !c.folderId)
            : availableCourses.filter(c => c.folderId === folder.id);
        
        if (folderCourses.length === 0) return;
        
        const selectedCount = folderCourses.filter(c => 
            universityCoursesTemp.some(uc => uc.courseId === c.id)
        ).length;
        
        const checkbox = document.querySelector(`[data-folder-checkbox="${folder.id}"]`);
        if (checkbox) {
            checkbox.indeterminate = selectedCount > 0 && selectedCount < folderCourses.length;
        }
    });
}

// Load folders when loading available courses
const originalLoadAvailableCourses = loadAvailableCourses;
loadAvailableCourses = async function() {
    await originalLoadAvailableCourses.call(this);
    
    // Also load folders
    try {
        const foldersSnap = await db.collection('courseFolders').orderBy('order', 'asc').get();
        courseFolders = [];
        foldersSnap.forEach(doc => {
            courseFolders.push({ id: doc.id, ...doc.data() });
        });
        
        // Add folderId to available courses
        const coursesSnap = await db.collection('courses').get();
        coursesSnap.forEach(doc => {
            const course = availableCourses.find(c => c.id === doc.id);
            if (course) {
                course.folderId = doc.data().folderId || null;
            }
        });
    } catch (error) {
        console.error('Error loading folders:', error);
    }
};

// ============================================
// AGENTS MANAGEMENT
// ============================================

async function loadAgents() {
    const tbody = document.querySelector('#agentsTable tbody');
    if (!tbody) return;

    const summaryDiv = document.getElementById('agentAnalyticsSummary');

    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Loading agent performance…</td></tr>';

    try {
        // Load analytics data if not already loaded
        if (!agentAnalyticsCache.isLoaded) {
            await loadAgentAnalyticsData();
        }

        if (agentAnalyticsCache.agents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No agents found.</td></tr>';
            if (summaryDiv) summaryDiv.textContent = '';
            return;
        }

        // Get date range bounds
        const bounds = getDateRangeBounds(
            agentAnalyticsCurrentFilters.dateRange,
            agentAnalyticsCurrentFilters.customStart,
            agentAnalyticsCurrentFilters.customEnd
        );

        // Calculate metrics for all agents
        const agentsWithMetrics = agentAnalyticsCache.agents.map(agent =>
            calculateAgentMetrics(agent, bounds)
        );

        // Sort agents
        const sortedAgents = sortAgentsByMetric(
            agentsWithMetrics,
            agentAnalyticsCurrentFilters.sortMetric,
            agentAnalyticsCurrentFilters.sortDirection
        );

        // Render table
        tbody.innerHTML = '';
        sortedAgents.forEach(agent => {
            const latestActivityText = agent.latestActivity ? formatTimeAgo(agent.latestActivity) : 'No activity';
            const conversionRateText = isNaN(agent.conversionRate) ? '0.0' : agent.conversionRate;
            const visitsDisplay = agentAnalyticsCurrentFilters.dateRange === 'allTime' ? agent.visitsTotal : agent.visitsRange;

            tbody.innerHTML += `
                <tr>
                    <td class="name-cell">${escapeHtml(agent.name)}</td>
                    <td class="email-cell">${escapeHtml(agent.email)}</td>
                    <td class="referral-code-cell"><code>${escapeHtml(agent.referralCode)}</code></td>
                    <td><span class="status status-${agent.status === 'active' ? 'active' : 'inactive'}">${escapeHtml(agent.status)}</span></td>
                    <td class="numeric-cell">${visitsDisplay}</td>
                    <td class="numeric-cell">${agent.whatsappClicks}</td>
                    <td class="numeric-cell">${agent.applications}</td>
                    <td class="numeric-cell">${conversionRateText}%</td>
                    <td>${latestActivityText}</td>
                    <td class="action-btns">
                        <button class="btn-view" onclick="openAgentDetailsModal('${escapeHtml(agent.agentId)}')">View Details</button>
                        <button class="btn-delete" onclick="deleteItem('agents', '${escapeHtml(agent.agentId)}')">Delete</button>
                    </td>
                </tr>
            `;
        });

        // Update summary
        const dateRangeLabels = {
            'today': 'Today',
            'thisWeek': 'This Week',
            'thisMonth': 'This Month',
            'last7': 'Last 7 Days',
            'last30': 'Last 30 Days',
            'last90': 'Last 90 Days',
            'allTime': 'All Time',
            'custom': `Custom (${agentAnalyticsCurrentFilters.customStart} to ${agentAnalyticsCurrentFilters.customEnd})`
        };

        const sortLabels = {
            'name': 'Agent Name',
            'createdAt': 'Created Date',
            'visitsTotal': 'Total Visits',
            'visitsRange': 'Visits in Range',
            'whatsappClicks': 'WhatsApp Clicks',
            'applications': 'Applications',
            'applicationsAccepted': 'Accepted Apps',
            'applicationsEnrolled': 'Enrolled Apps',
            'applicationsRejected': 'Rejected Apps',
            'applicationsPending': 'Pending Apps',
            'conversionRate': 'Conversion Rate',
            'enrollmentRate': 'Enrollment Rate',
            'latestVisit': 'Latest Visit',
            'latestApplication': 'Latest Application',
            'latestActivity': 'Latest Activity'
        };

        if (summaryDiv) {
            summaryDiv.textContent = `Showing agent performance for: ${dateRangeLabels[agentAnalyticsCurrentFilters.dateRange]} | Sorted by: ${sortLabels[agentAnalyticsCurrentFilters.sortMetric]}`;
        }

    } catch (error) {
        console.error('loadAgents error:', error);
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color: red;">Error loading agents</td></tr>';
    }
}

// ============================================
// AGENT DETAILS & ANALYTICS
// ============================================

async function openAgentDetailsModal(agentId) {
    const overlay = document.getElementById('agentDetailsOverlay');
    const contentDiv = document.getElementById('agentDetailsContent');
    if (!overlay || !contentDiv) return;

    overlay.style.display = 'flex';
    contentDiv.innerHTML = '<div style="text-align: center;"><div style="font-size: 2rem; margin-bottom: 12px;"><i class="bi bi-hourglass-split"></i></div><p style="color: #666;">Loading agent details...</p></div>';

    try {
        const stats = await loadAgentStats(agentId);
        renderAgentDetailsModal(stats);
    } catch (error) {
        console.error('Error loading agent details:', error);
        contentDiv.innerHTML = `<div style="text-align: center; color: red;"><p><strong>Error loading agent details</strong></p><p>${escapeHtml(error.message)}</p></div>`;
    }
}

function closeAgentDetailsModal() {
    const overlay = document.getElementById('agentDetailsOverlay');
    if (overlay) overlay.style.display = 'none';
}

// ============================================
// AGENT ANALYTICS - GLOBAL STATE & HELPERS
// ============================================

let agentAnalyticsCache = {
    agents: [],
    referralVisits: [],
    whatsappClicks: [],
    applications: [],
    referralLinks: [],
    isLoaded: false
};

let agentAnalyticsCurrentFilters = {
    dateRange: 'last30',
    customStart: null,
    customEnd: null,
    sortMetric: 'conversionRate',
    sortDirection: 'highest'
};

function getDateRangeBounds(rangeType, customStart = null, customEnd = null) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let start, end = now;

    switch (rangeType) {
        case 'today':
            start = new Date(today);
            break;
        case 'thisWeek':
            start = startOfWeek();
            break;
        case 'thisMonth':
            start = startOfMonth();
            break;
        case 'last7':
            start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'last30':
            start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'last90':
            start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        case 'custom':
            if (customStart && customEnd) {
                start = new Date(customStart);
                start.setHours(0, 0, 0, 0);
                end = new Date(customEnd);
                end.setHours(23, 59, 59, 999);
            } else {
                return { start: null, end: null, type: 'none' };
            }
            break;
        case 'allTime':
            return { start: null, end: null, type: 'none' };
        default:
            start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end, type: rangeType };
}

function calculateAgentMetrics(agent, bounds) {
    const agentId = agent.id;
    const agentData = agent;
    const uid = agent.userId || agent.uid;
    const referralCode = agent.referralCode;

    // Get referral visits
    let visits = agentAnalyticsCache.referralVisits.filter(v => {
        const doc = v.id;
        const data = v;
        return (data.agentId === agentId || data.agentId === uid || data.code === referralCode);
    });

    // Deduplicate by document ID
    const visitIds = new Set();
    visits = visits.filter(v => {
        if (visitIds.has(v.id)) return false;
        visitIds.add(v.id);
        return true;
    });

    // Count visits in range
    let visitsInRange = 0;
    if (bounds.type !== 'none') {
        visitsInRange = visits.filter(v => {
            const visitDate = getVisitDate(v);
            return isWithin(visitDate, bounds.start, bounds.end);
        }).length;
    } else {
        visitsInRange = visits.length;
    }

    // Get latest visit
    let latestVisit = null;
    visits.forEach(v => {
        const visitDate = getVisitDate(v);
        if (visitDate && (!latestVisit || visitDate > latestVisit)) {
            latestVisit = visitDate;
        }
    });

    // Get WhatsApp clicks
    let clicks = agentAnalyticsCache.whatsappClicks.filter(c => {
        const data = c;
        return (data.agentId === agentId || data.agentId === uid || data.code === referralCode);
    });

    const clickIds = new Set();
    clicks = clicks.filter(c => {
        if (clickIds.has(c.id)) return false;
        clickIds.add(c.id);
        return true;
    });

    // Get applications
    let apps = agentAnalyticsCache.applications.filter(a => {
        const data = a;
        return (data.agentId === agentId || data.agentId === uid || data.referralCode === referralCode);
    });

    const appIds = new Set();
    apps = apps.filter(a => {
        if (appIds.has(a.id)) return false;
        appIds.add(a.id);
        return true;
    });

    // Count applications by status
    const statusCounts = {};
    apps.forEach(a => {
        const status = a.status || 'new';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Get latest application
    let latestApp = null;
    apps.forEach(a => {
        const appDate = getApplicationDate(a);
        if (appDate && (!latestApp || appDate > latestApp)) {
            latestApp = appDate;
        }
    });

    // Calculate rates
    const totalApps = apps.length;
    const totalVisits = visits.length;
    const conversionRate = totalVisits > 0 ? ((totalApps / totalVisits) * 100).toFixed(1) : '0.0';
    const enrolledCount = statusCounts['enrolled'] || 0;
    const enrollmentRate = totalApps > 0 ? ((enrolledCount / totalApps) * 100).toFixed(1) : '0.0';

    // Latest activity (most recent of all activities)
    let latestActivity = null;
    [latestVisit, latestApp].forEach(date => {
        if (date && (!latestActivity || date > latestActivity)) {
            latestActivity = date;
        }
    });

    return {
        agentId,
        name: agent.name || 'N/A',
        email: agent.email || 'N/A',
        referralCode: agent.referralCode || '—',
        status: agent.status || 'inactive',
        createdAt: agent.createdAt,
        visitsTotal: totalVisits,
        visitsRange: visitsInRange,
        whatsappClicks: clicks.length,
        applications: totalApps,
        applicationsAccepted: statusCounts['accepted'] || 0,
        applicationsEnrolled: enrolledCount,
        applicationsRejected: statusCounts['rejected'] || 0,
        applicationsPending: statusCounts['new'] + (statusCounts['contacted'] || 0) + (statusCounts['applied'] || 0) + (statusCounts['offer'] || 0),
        conversionRate: parseFloat(conversionRate),
        enrollmentRate: parseFloat(enrollmentRate),
        latestVisit,
        latestApplication: latestApp,
        latestActivity
    };
}

async function loadAgentAnalyticsData() {
    try {
        // Load agents
        const agentsSnapshot = await db.collection('agents').get();
        agentAnalyticsCache.agents = agentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Load referral visits
        const visitsSnapshot = await db.collection('referralVisits').get();
        agentAnalyticsCache.referralVisits = visitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Load WhatsApp clicks
        const clicksSnapshot = await db.collection('whatsappClicks').get();
        agentAnalyticsCache.whatsappClicks = clicksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Load applications
        const appsSnapshot = await db.collection('applications').get();
        agentAnalyticsCache.applications = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Load referral links
        const linksSnapshot = await db.collection('referralLinks').get();
        agentAnalyticsCache.referralLinks = linksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        agentAnalyticsCache.isLoaded = true;
    } catch (error) {
        console.error('Error loading agent analytics data:', error);
    }
}

function sortAgentsByMetric(agentsWithMetrics, metric, direction) {
    const agents = [...agentsWithMetrics];

    agents.sort((a, b) => {
        let aValue = a[metric];
        let bValue = b[metric];

        // Handle missing values
        if (aValue === null || aValue === undefined) aValue = direction.includes('lowest') || direction.includes('oldest') ? -Infinity : Infinity;
        if (bValue === null || bValue === undefined) bValue = direction.includes('lowest') || direction.includes('oldest') ? -Infinity : Infinity;

        // Text sorting
        if (typeof aValue === 'string') {
            if (direction === 'aToZ') return aValue.localeCompare(bValue);
            if (direction === 'zToA') return bValue.localeCompare(aValue);
        }

        // Date sorting
        if (aValue instanceof Date && bValue instanceof Date) {
            if (direction === 'newest') return bValue - aValue;
            if (direction === 'oldest') return aValue - bValue;
            return bValue - aValue;
        }

        // Numeric sorting
        if (direction === 'highest') return (bValue || 0) - (aValue || 0);
        if (direction === 'lowest') return (aValue || 0) - (bValue || 0);
        if (direction === 'newest') return (bValue || 0) - (aValue || 0);
        if (direction === 'oldest') return (aValue || 0) - (bValue || 0);

        return 0;
    });

    return agents;
}

function agentAnalyticsDateRangeChanged() {
    const select = document.getElementById('agentAnalyticsDateRange');
    const customStartWrapper = document.getElementById('customStartWrapper');
    const customEndWrapper = document.getElementById('customEndWrapper');

    if (select.value === 'custom') {
        customStartWrapper.style.display = 'block';
        customEndWrapper.style.display = 'block';
    } else {
        customStartWrapper.style.display = 'none';
        customEndWrapper.style.display = 'none';
    }
}

async function agentAnalyticsApply() {
    const dateRangeSelect = document.getElementById('agentAnalyticsDateRange');
    const sortMetricSelect = document.getElementById('agentAnalyticsSortMetric');
    const sortDirectionSelect = document.getElementById('agentAnalyticsSortDirection');

    agentAnalyticsCurrentFilters.dateRange = dateRangeSelect.value;
    agentAnalyticsCurrentFilters.sortMetric = sortMetricSelect.value;
    agentAnalyticsCurrentFilters.sortDirection = sortDirectionSelect.value;

    if (dateRangeSelect.value === 'custom') {
        agentAnalyticsCurrentFilters.customStart = document.getElementById('agentAnalyticsStartDate').value;
        agentAnalyticsCurrentFilters.customEnd = document.getElementById('agentAnalyticsEndDate').value;
    }

    // Reload agents with new filters
    await loadAgents();
}

function agentAnalyticsReset() {
    document.getElementById('agentAnalyticsDateRange').value = 'last30';
    document.getElementById('agentAnalyticsSortMetric').value = 'conversionRate';
    document.getElementById('agentAnalyticsSortDirection').value = 'highest';
    document.getElementById('agentAnalyticsStartDate').value = '';
    document.getElementById('agentAnalyticsEndDate').value = '';

    agentAnalyticsCurrentFilters = {
        dateRange: 'last30',
        customStart: null,
        customEnd: null,
        sortMetric: 'conversionRate',
        sortDirection: 'highest'
    };

    agentAnalyticsDateRangeChanged();
    loadAgents();
}

// ============================================
// TIMESTAMP PARSING HELPERS
// ============================================

function parseFirestoreDate(value) {
    if (!value) return null;

    if (typeof value.toDate === 'function') {
        try {
            return value.toDate();
        } catch {
            return null;
        }
    }

    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'object') {
        if (typeof value.seconds === 'number') {
            return new Date(value.seconds * 1000);
        }
        if (typeof value._seconds === 'number') {
            return new Date(value._seconds * 1000);
        }
    }

    if (typeof value === 'number') {
        return value < 100000000000 ? new Date(value * 1000) : new Date(value);
    }

    if (typeof value === 'string') {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
}

function getVisitDate(visit) {
    return parseFirestoreDate(
        visit.timestamp ||
        visit.createdAt ||
        visit.visitedAt ||
        visit.date
    );
}

function getClickDate(click) {
    return parseFirestoreDate(
        click.timestamp ||
        click.createdAt ||
        click.clickedAt ||
        click.date
    );
}

function getApplicationDate(app) {
    return parseFirestoreDate(
        app.createdAt ||
        app.submittedAt ||
        app.date ||
        app.timestamp
    );
}

function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function startOfWeek() {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

function startOfMonth() {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}

function isWithin(date, start, end = new Date()) {
    if (!date || isNaN(date.getTime())) return false;
    return date >= start && date <= end;
}

function formatTimeAgo(date) {
    if (!date || isNaN(date.getTime())) return 'Unknown';

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;

    const years = Math.floor(months / 12);
    return `${years}y ago`;
}

async function loadAgentStats(agentId) {
    const agent = await db.collection('agents').doc(agentId).get();
    if (!agent.exists) {
        throw new Error('Agent not found');
    }

    const agentData = agent.data();
    const uid = agentData.userId || agentData.uid || null;

    // Load referral links
    let referralLinks = [];
    const linksQuery = db.collection('referralLinks')
        .where('agentId', '==', agentId);
    const linksSnapshot = await linksQuery.get();
    referralLinks = linksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Load referral visits (with timestamp grouping)
    let referralVisits = [];
    const refsPerCode = {};
    const visitsQuery = db.collection('referralVisits');
    const visitsSnapshot = await visitsQuery.get();
    visitsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.agentId === agentId || (agentData.referralCode && data.code === agentData.referralCode)) {
            referralVisits.push({ id: doc.id, ...data });
            if (!refsPerCode[data.code]) refsPerCode[data.code] = [];
            refsPerCode[data.code].push(data);
        }
    });

    // Calculate visit analytics with robust date parsing
    const today = startOfToday();
    const weekStart = startOfWeek();
    const monthStart = startOfMonth();

    let visitsToday = 0, visitsThisWeek = 0, visitsThisMonth = 0;
    let latestVisitTime = null;
    let mostVisitedPage = {};

    referralVisits.forEach(visit => {
        const visitDate = getVisitDate(visit);
        if (visitDate) {
            if (isWithin(visitDate, today)) visitsToday++;
            if (isWithin(visitDate, weekStart)) visitsThisWeek++;
            if (isWithin(visitDate, monthStart)) visitsThisMonth++;
            if (!latestVisitTime || visitDate > latestVisitTime) latestVisitTime = visitDate;
        }
        if (visit.page) {
            mostVisitedPage[visit.page] = (mostVisitedPage[visit.page] || 0) + 1;
        }
    });

    const topPage = Object.entries(mostVisitedPage).sort((a, b) => b[1] - a[1])[0];

    // Load WhatsApp clicks
    let whatsappClicks = [];
    const clicksQuery = db.collection('whatsappClicks');
    const clicksSnapshot = await clicksQuery.get();
    let clicksToday = 0, clicksThisWeek = 0, clicksThisMonth = 0;
    let latestClickTime = null;
    let mostClickedNumber = {};
    let mostClickedPage = {};

    clicksSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.agentId === agentId || (agentData.referralCode && data.code === agentData.referralCode)) {
            whatsappClicks.push({ id: doc.id, ...data });
            const clickDate = getClickDate(data);
            if (clickDate) {
                if (isWithin(clickDate, today)) clicksToday++;
                if (isWithin(clickDate, weekStart)) clicksThisWeek++;
                if (isWithin(clickDate, monthStart)) clicksThisMonth++;
                if (!latestClickTime || clickDate > latestClickTime) latestClickTime = clickDate;
            }
            if (data.number) {
                mostClickedNumber[data.number] = (mostClickedNumber[data.number] || 0) + 1;
            }
            if (data.page) {
                mostClickedPage[data.page] = (mostClickedPage[data.page] || 0) + 1;
            }
        }
    });

    const topNumber = Object.entries(mostClickedNumber).sort((a, b) => b[1] - a[1])[0];
    const topClickPage = Object.entries(mostClickedPage).sort((a, b) => b[1] - a[1])[0];

    // Load applications
    let applications = [];
    const appsSnapshot = await db.collection('applications').get();
    const statusCounts = {};
    let latestAppDate = null;

    appsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.agentId === agentId) {
            applications.push({ id: doc.id, ...data });
            statusCounts[data.status || 'new'] = (statusCounts[data.status || 'new'] || 0) + 1;
            const appDate = getApplicationDate(data);
            if (appDate && (!latestAppDate || appDate > latestAppDate)) latestAppDate = appDate;
        }
    });

    const conversionRate = referralVisits.length > 0 ? ((applications.length / referralVisits.length) * 100).toFixed(1) : '0';

    // Load student data
    let studentCount = 0;
    const studentsSnapshot = await db.collection('students').get();
    studentsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.agentId === agentId) {
            studentCount++;
        }
    });

    return {
        agentId,
        agent: agentData,
        referralLinks,
        referralVisits: {
            total: referralVisits.length,
            today: visitsToday,
            thisWeek: visitsThisWeek,
            thisMonth: visitsThisMonth,
            latest: latestVisitTime,
            topPage: topPage ? topPage[0] : null,
            topPageCount: topPage ? topPage[1] : 0,
            all: referralVisits
        },
        whatsappClicks: {
            total: whatsappClicks.length,
            today: clicksToday,
            thisWeek: clicksThisWeek,
            thisMonth: clicksThisMonth,
            latest: latestClickTime,
            topNumber: topNumber ? topNumber[0] : null,
            topNumberCount: topNumber ? topNumber[1] : 0,
            topPage: topClickPage ? topClickPage[0] : null,
            topPageCount: topClickPage ? topClickPage[1] : 0,
            all: whatsappClicks
        },
        applications: {
            total: applications.length,
            latest: latestAppDate,
            statusCounts,
            conversionRate,
            all: applications
        },
        students: {
            total: studentCount
        }
    };
}

function renderAgentDetailsModal(stats) {
    const agent = stats.agent;
    const contentDiv = document.getElementById('agentDetailsContent');
    const titleEl = document.getElementById('agentDetailsTitle');

    if (titleEl) titleEl.textContent = `${agent.name || 'Agent'} - Details & Analytics`;

    const dateFormat = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = parseFirestoreDate(timestamp);
        if (!date) return 'N/A';
        return date.toLocaleDateString();
    };

    contentDiv.innerHTML = `
        <div style="padding: 0;">
            <!-- PROFILE SECTION -->
            <div style="background: linear-gradient(135deg, #0066cc 0%, #16a34a 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 12px 0; font-size: 1.2rem;">${escapeHtml(agent.name || 'N/A')}</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.9rem;">
                    <div><strong>Email:</strong> ${escapeHtml(agent.email || 'N/A')}</div>
                    <div><strong>Phone:</strong> ${escapeHtml(agent.phone || 'N/A')}</div>
                    <div><strong>Country:</strong> ${escapeHtml(agent.country || 'N/A')}</div>
                    <div><strong>Status:</strong> ${escapeHtml(agent.status || 'inactive')}</div>
                    <div><strong>Referral Code:</strong> <code>${escapeHtml(agent.referralCode || '—')}</code></div>
                    <div><strong>Created:</strong> ${dateFormat(agent.createdAt)}</div>
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <div style="font-size: 0.85rem;"><strong>Commission Structure:</strong> ${escapeHtml(agent.commissionStructure || 'Not specified')}</div>
                    <div style="font-size: 0.85rem; margin-top: 4px;"><strong>Referral URL:</strong> <code style="word-break: break-all; display: block; margin-top: 4px;">${escapeHtml(agent.referralUrl || 'N/A')}</code></div>
                </div>
            </div>

            <!-- REFERRAL LINKS SECTION -->
            <div style="margin-bottom: 20px;">
                <h5 style="margin: 0 0 12px 0; color: #333;">Referral Links</h5>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
                    ${stats.referralLinks.length > 0 ? `
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                            <thead style="background: #e2e8f0;">
                                <tr>
                                    <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Code</th>
                                    <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Status</th>
                                    <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${stats.referralLinks.map(link => `
                                    <tr style="border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 8px; border: 1px solid #cbd5e1;"><code>${escapeHtml(link.code || 'N/A')}</code></td>
                                        <td style="padding: 8px; border: 1px solid #cbd5e1;"><span class="status status-${link.status || 'active'}">${link.status || 'active'}</span></td>
                                        <td style="padding: 8px; border: 1px solid #cbd5e1;">${dateFormat(link.createdAt)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p style="color: #666; margin: 0;">No referral links created yet.</p>'}
                </div>
            </div>

            <!-- REFERRAL VISITS ANALYTICS -->
            <div style="margin-bottom: 20px;">
                <h5 style="margin: 0 0 12px 0; color: #333;">Referral Visit Analytics</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 12px;">
                    <div style="background: #eef2ff; border-left: 4px solid #0066cc; padding: 12px; border-radius: 4px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #0066cc;">${stats.referralVisits.total}</div>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #666;">Total Visits</p>
                    </div>
                    <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; border-radius: 4px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #16a34a;">${stats.referralVisits.today}</div>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #666;">Today</p>
                    </div>
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${stats.referralVisits.thisWeek}</div>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #666;">This Week</p>
                    </div>
                    <div style="background: #fce7f3; border-left: 4px solid #ec4899; padding: 12px; border-radius: 4px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #ec4899;">${stats.referralVisits.thisMonth}</div>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #666;">This Month</p>
                    </div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 0.9rem;">
                    <p style="margin: 0;"><strong>Latest Visit:</strong> ${formatTimeAgo(stats.referralVisits.latest)}</p>
                    <p style="margin: 8px 0 0 0;"><strong>Most Visited Page:</strong> ${stats.referralVisits.topPage ? escapeHtml(stats.referralVisits.topPage) + ` (${stats.referralVisits.topPageCount}x)` : 'N/A'}</p>
                </div>
            </div>

            <!-- WHATSAPP CLICKS ANALYTICS -->
            <div style="margin-bottom: 20px;">
                <h5 style="margin: 0 0 12px 0; color: #333;">WhatsApp Click Analytics</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 12px;">
                    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; border-radius: 4px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${stats.whatsappClicks.total}</div>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #666;">Total Clicks</p>
                    </div>
                    <div style="background: #eef2ff; border-left: 4px solid #0066cc; padding: 12px; border-radius: 4px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #0066cc;">${stats.whatsappClicks.today}</div>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #666;">Today</p>
                    </div>
                    <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; border-radius: 4px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #16a34a;">${stats.whatsappClicks.thisWeek}</div>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #666;">This Week</p>
                    </div>
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${stats.whatsappClicks.thisMonth}</div>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #666;">This Month</p>
                    </div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 0.9rem;">
                    <p style="margin: 0;"><strong>Latest Click:</strong> ${formatTimeAgo(stats.whatsappClicks.latest)}</p>
                    <p style="margin: 8px 0 0 0;"><strong>Top Number:</strong> ${stats.whatsappClicks.topNumber ? escapeHtml(stats.whatsappClicks.topNumber) + ` (${stats.whatsappClicks.topNumberCount}x)` : 'N/A'}</p>
                    <p style="margin: 8px 0 0 0;"><strong>Top Page:</strong> ${stats.whatsappClicks.topPage ? escapeHtml(stats.whatsappClicks.topPage) + ` (${stats.whatsappClicks.topPageCount}x)` : 'N/A'}</p>
                </div>
            </div>

            <!-- APPLICATION ANALYTICS -->
            <div style="margin-bottom: 20px;">
                <h5 style="margin: 0 0 12px 0; color: #333;">Application Analytics</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 12px;">
                    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 4px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #ef4444;">${stats.applications.total}</div>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #666;">Total Applications</p>
                    </div>
                    <div style="background: #f8fafc; border-left: 4px solid #64748b; padding: 12px; border-radius: 4px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #64748b;">${stats.applications.conversionRate}%</div>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #666;">Conversion Rate</p>
                    </div>
                    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; border-radius: 4px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${stats.students.total}</div>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #666;">Linked Students</p>
                    </div>
                </div>

                <!-- Status Breakdown -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                    <p style="margin: 0 0 12px 0; font-weight: bold; font-size: 0.9rem;">Status Breakdown:</p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; font-size: 0.85rem;">
                        ${Object.entries(stats.applications.statusCounts).map(([status, count]) => `
                            <div style="padding: 8px; background: white; border: 1px solid #e2e8f0; border-radius: 4px; text-align: center;">
                                <div style="font-weight: bold; color: #0066cc;">${count}</div>
                                <div style="color: #666; margin-top: 4px;">${escapeHtml(status)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Latest Application -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 0.9rem;">
                    <p style="margin: 0;"><strong>Latest Application:</strong> ${stats.applications.latest ? dateFormat(stats.applications.latest) : 'N/A'}</p>
                </div>
            </div>

            <!-- RECENT APPLICATIONS -->
            ${stats.applications.all.length > 0 ? `
                <div style="margin-bottom: 0;">
                    <h5 style="margin: 0 0 12px 0; color: #333;">Recent Applications</h5>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                            <thead style="background: #e2e8f0;">
                                <tr>
                                    <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Student</th>
                                    <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">University</th>
                                    <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Programme</th>
                                    <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Status</th>
                                    <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${stats.applications.all.slice(0, 10).map(app => {
                                    const programme = getProgrammeDisplay(app);
                                    const appDate = parseFirestoreDate(app.createdAt);
                                    const date = appDate ? appDate.toLocaleDateString() : 'N/A';
                                    return `
                                        <tr style="border-bottom: 1px solid #e2e8f0;">
                                            <td style="padding: 8px; border: 1px solid #cbd5e1;">${escapeHtml(app.student?.name || 'N/A')}</td>
                                            <td style="padding: 8px; border: 1px solid #cbd5e1;">${escapeHtml(app.universityName || 'N/A')}</td>
                                            <td style="padding: 8px; border: 1px solid #cbd5e1;">${escapeHtml(programme)}</td>
                                            <td style="padding: 8px; border: 1px solid #cbd5e1;"><span class="status status-${app.status || 'new'}">${escapeHtml(app.status || 'new')}</span></td>
                                            <td style="padding: 8px; border: 1px solid #cbd5e1;">${date}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function getAgentForm() {
    return `
        <form id="itemForm" onsubmit="saveItem(event)">
            <div style="background: #e8f4f8; border: 1px solid #0084d1; border-radius: 4px; padding: 12px; margin-bottom: 16px; font-size: 0.8125rem;">
                <strong>Create Agent Account</strong>
                <p style="margin: 8px 0 0 0; color: #333; font-size: 0.875rem;">Password is sent only to Firebase Authentication. It is never stored in Firestore.</p>
            </div>
            <div class="form-group">
                <label>Agent Name *</label>
                <input type="text" id="itemAgentName" required placeholder="John Smith">
            </div>
            <div class="form-group">
                <label>Email *</label>
                <input type="email" id="itemAgentEmail" required placeholder="agent@email.com">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Password * <span style="color: #666; font-size: 0.8rem;">(minimum 8 characters)</span></label>
                    <input type="password" id="itemAgentPassword" required placeholder="Min 8 chars, uppercase, lowercase, number, special char" minlength="8">
                    <small style="display: block; color: var(--gray-500); margin-top: 4px;">Minimum 8 characters. Must contain uppercase, lowercase, number, and special character.</small>
                </div>
                <div class="form-group">
                    <label>Confirm Password *</label>
                    <input type="password" id="itemAgentPasswordConfirm" required placeholder="Re-enter password" minlength="8">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Phone (optional)</label>
                    <input type="tel" id="itemAgentPhone" placeholder="+60102503706">
                </div>
                <div class="form-group">
                    <label>Country (optional)</label>
                    <input type="text" id="itemAgentCountry" placeholder="Malaysia">
                </div>
            </div>
            <div class="form-group">
                <label>Referral Code (auto-generated if blank)</label>
                <input type="text" id="itemAgentReferralCode" placeholder="Leave blank to auto-generate">
                <small style="display: block; color: var(--gray-500); margin-top: 4px;">Unique code for tracking referrals. Auto-generated as Name_XXXXXX if left blank.</small>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Commission Structure</label>
                    <input type="text" id="itemCommission" placeholder="e.g. 5% per enrollment">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="itemAgentStatus">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-cancel" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Create Agent</button>
            </div>
        </form>
    `;
}

function getAdminForm() {
    return `
        <form id="itemForm" onsubmit="saveItem(event)">
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 12px; margin-bottom: 16px; font-size: 0.8125rem;">
                <strong>Spark Plan Instructions:</strong>
                <ol style="margin: 8px 0 0 0; padding-left: 20px;">
                    <li>Go to <strong>Firebase Console → Authentication → Create user</strong></li>
                    <li>Create user with email below, set a temporary password</li>
                    <li><strong>Copy the UID</strong> from the user detail page</li>
                    <li>Paste the UID below and click Create Admin</li>
                </ol>
            </div>
            <div class="form-group">
                <label>Admin Name *</label>
                <input type="text" id="itemAdminName" required placeholder="John Doe">
            </div>
            <div class="form-group">
                <label>Email *</label>
                <input type="email" id="itemAdminEmail" required placeholder="admin@email.com">
            </div>
            <div class="form-group">
                <label>Firebase UID * <span style="color: #666; font-size: 0.8rem;">(from Firebase Console → Authentication)</span></label>
                <input type="text" id="itemAdminUid" required placeholder="xOlH7JLIAegVHblBngMBF33LdI32">
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="itemAdminStatus">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>
            <p style="font-size:0.8125rem; color: var(--gray-500); margin-bottom:16px;">
                After creation, the admin can sign in to <strong>admin.html</strong> using their email and password from Firebase Console.
            </p>
            <div class="modal-footer">
                <button type="button" class="btn btn-cancel" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Create Admin</button>
            </div>
        </form>
    `;
}

async function loadAdmins() {
    const tbody = document.querySelector('#adminsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    try {
        const snapshot = await db.collection('admins').orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No additional admins created yet. Click "+ Add Admin" to create one.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const d = doc.data();
            const date = d.createdAt ? new Date(d.createdAt.toDate()).toLocaleDateString() : 'N/A';
            tbody.innerHTML += `
                <tr>
                    <td>${escapeHtml(d.name || 'N/A')}</td>
                    <td>${escapeHtml(d.email || 'N/A')}</td>
                    <td><span class="status status-${d.status === 'active' ? 'active' : 'inactive'}">${d.status || 'inactive'}</span></td>
                    <td>${date}</td>
                    <td class="action-btns">
                        <button class="btn-delete" onclick="deleteItem('admins', '${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('loadAdmins error:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Error loading admins.</td></tr>';
    }
}

// ============================================
// STUDENTS MANAGEMENT (Admin View)
// ============================================

let selectedStudentId = null;

async function loadStudentsAdmin() {
    const tbody = document.querySelector('#studentsTableAdmin tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading...</td></tr>';

    const filter = document.getElementById('studentStatusFilter')?.value || 'all';

    try {
        let query = db.collection('applications').orderBy('createdAt', 'desc');
        if (filter !== 'all') {
            query = db.collection('applications').where('status', '==', filter).orderBy('createdAt', 'desc');
        }
        const snapshot = await query.get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No students found.</td></tr>';
            return;
        }

        // Batch-load agent names for display
        const agentIds = [...new Set(snapshot.docs.map(d => d.data().agentId).filter(Boolean))];
        const agentNames = {};
        await Promise.all(agentIds.map(async (agentId) => {
            try {
                const agentSnap = await db.collection('agents').doc(agentId).get();
                agentNames[agentId] = agentSnap.exists ? (agentSnap.data().name || agentId) : agentId;
            } catch { agentNames[agentId] = agentId; }
        }));

        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const d = doc.data();
            const studentName = d.student?.name || d.name || 'N/A';
            const studentEmail = d.student?.email || d.email || 'N/A';
            const studentCountry = d.student?.country || d.country || 'N/A';
            const date = d.createdAt ? new Date(d.createdAt.toDate()).toLocaleDateString() : 'N/A';
            const agentName = agentNames[d.agentId] || '—';
            const statusClass = (d.status || 'applied').toLowerCase().replace(/_/g, '-');
            tbody.innerHTML += `
                <tr>
                    <td>${escapeHtml(studentName)}</td>
                    <td>${escapeHtml(studentEmail)}</td>
                    <td>${escapeHtml(studentCountry)}</td>
                    <td>${escapeHtml(agentName)}</td>
                    <td><span class="status status-${statusClass}">${(d.status || 'Applied').replace(/_/g, ' ')}</span></td>
                    <td>${date}</td>
                    <td class="action-btns">
                        <button class="btn-view" onclick="openStudentDrawer('${doc.id}')">View</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('loadStudentsAdmin error:', error);
    }
}

async function openStudentDrawer(studentId) {
    selectedStudentId = studentId;
    const drawer = document.getElementById('studentDrawer');
    if (!drawer) return;

    try {
        const doc = await db.collection('applications').doc(studentId).get();
        if (!doc.exists) return;
        const d = doc.data();

        const studentName = d.student?.name || d.name || 'Student';
        const studentEmail = d.student?.email || d.email || '';
        const studentPhone = d.student?.phone || d.phone || '—';
        const studentCountry = d.student?.country || d.country || '—';

        document.getElementById('studentDrawerTitle').textContent = studentName;
        document.getElementById('studentDrawerSubtitle').textContent = studentEmail;
        document.getElementById('studentDetailName').textContent = studentName;
        document.getElementById('studentDetailEmail').textContent = studentEmail;
        document.getElementById('studentDetailPhone').textContent = studentPhone;
        document.getElementById('studentDetailCountry').textContent = studentCountry;

        document.getElementById('studentDetailStatus').value = d.status || 'Applied';
        document.getElementById('studentDetailNotes').value = d.adminNotes || '';

        drawer.classList.add('open');
    } catch (error) {
        console.error('openStudentDrawer error:', error);
    }
}

function closeStudentDrawer() {
    const drawer = document.getElementById('studentDrawer');
    if (drawer) drawer.classList.remove('open');
    selectedStudentId = null;
}

async function saveStudentStatus() {
    if (!selectedStudentId) return;
    const newStatus = document.getElementById('studentDetailStatus').value;
    const notes = document.getElementById('studentDetailNotes').value.trim();
    const setBy = auth.currentUser?.email || 'admin';

    try {
        // Update status and notes on the application document
        await db.collection('applications').doc(selectedStudentId).update({
            status: newStatus,
            adminNotes: notes,
            statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            statusUpdatedBy: setBy
        });

        // Append to history log
        await db.collection('applicationStatusHistory').add({
            applicationId: selectedStudentId,
            status: newStatus,
            notes,
            setAt: firebase.firestore.FieldValue.serverTimestamp(),
            setBy
        });

        closeStudentDrawer();
        loadStudentsAdmin();
        alert('Status updated successfully.');
    } catch (error) {
        console.error('saveStudentStatus error:', error);
        alert('Error saving status. Please try again.');
    }
}

