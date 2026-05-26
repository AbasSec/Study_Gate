/* ============================================
   Agent Portal - Dashboard & Analytics
   ============================================ */

let agentDoc = null;
let currentSection = 'stats';
let authCheckInProgress = false;
let authCheckCompleted = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof auth === 'undefined') {
            showError('Firebase not initialized.');
            return;
        }
        auth.onAuthStateChanged(async (user) => {
            // Auth state fired with no user (logout or session expiry)
            if (authCheckCompleted && !user) {
                authCheckCompleted = false;
                agentDoc = null;
                showLogin();
                return;
            }

            if (authCheckInProgress) return; // Prevent concurrent checks
            authCheckInProgress = true;

            try {
                if (user) {
                    // Only perform full agent check once
                    if (!authCheckCompleted) {
                        const found = await resolveAgentDoc(user.uid);
                        if (found) {
                            authCheckCompleted = true;
                            showDashboard(user);
                        } else {
                            authCheckCompleted = true;
                            const deniedEmail = user.email || '';
                            await auth.signOut();
                            showLogin();
                            showError(
                                `Access denied for "${deniedEmail}". ` +
                                'No active agent profile was found for this account. ' +
                                'Ask your admin to create an agent profile with this exact email address.'
                            );
                        }
                    }
                } else {
                    showLogin();
                    authCheckCompleted = false;
                    agentDoc = null;
                }
            } finally {
                authCheckInProgress = false;
            }
        });
    }, 500);

    setupEventListeners();
});

// Resolve agent document by userId or email (first-time linking)
async function resolveAgentDoc(uid) {
    try {
        // First: try by userId (already linked)
        let snapshot = await db.collection('agents')
            .where('userId', '==', uid)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (!snapshot.empty) {
            agentDoc = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            return true;
        }

        // Second: try by email (first-time login — links UID to existing Firestore doc)
        const user = auth.currentUser;
        if (!user?.email) {
            console.warn('resolveAgentDoc: no email on auth user');
            return false;
        }

        const emailLower = user.email.toLowerCase();
        console.log(`resolveAgentDoc: querying agents by email "${emailLower}"`);

        snapshot = await db.collection('agents')
            .where('email', '==', emailLower)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (snapshot.empty) {
            // Try without status filter in case doc exists but has no status field
            const fallback = await db.collection('agents')
                .where('email', '==', emailLower)
                .limit(1)
                .get();
            if (!fallback.empty) {
                const docData = fallback.docs[0].data();
                console.warn(`resolveAgentDoc: agent doc exists for "${emailLower}" but status="${docData.status}" (expected "active")`);
            } else {
                console.warn(`resolveAgentDoc: no agent document found for email "${emailLower}". ` +
                    'Create an agent profile via the Admin panel with this exact email address, status="active".');
            }
            return false;
        }

        const agentDocRef = snapshot.docs[0];
        // Link this agent document to the authenticated UID for future logins
        await db.collection('agents').doc(agentDocRef.id).update({ userId: uid });
        agentDoc = { id: agentDocRef.id, ...agentDocRef.data(), userId: uid };
        return true;
    } catch (error) {
        console.error('resolveAgentDoc error:', error.code, error.message);
        showError(`Login error: ${error.message}. Please try again or contact support.`);
        return false;
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('loginForm')?.addEventListener('submit', handleEmailLogin);
    document.getElementById('googleSignIn')?.addEventListener('click', handleGoogleLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section) switchSection(section);
            if (window.innerWidth <= 768) {
                document.querySelector('.admin-sidebar')?.classList.remove('mobile-open');
            }
        });
    });

    // University change handler to filter courses
    const universitySelect = document.getElementById('agentAppUniversity');
    if (universitySelect) {
        universitySelect.addEventListener('change', loadCoursesForUniversity);
    }

    setupMobileSidebarToggle();
}

// Handle email/password login
async function handleEmailLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
        // onAuthStateChanged handles the rest
    } catch (error) {
        showError(error.message);
    }
}

// Handle Google login
async function handleGoogleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
    } catch (error) {
        showError(error.message);
    }
}

// Handle logout
async function handleLogout() {
    agentDoc = null;
    authCheckCompleted = false;
    authCheckInProgress = false;
    await auth.signOut();
    showLogin();
}

// Show login screen
function showLogin() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('agentContainer').style.display = 'none';
}

// Show dashboard
function showDashboard(user) {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('agentContainer').style.display = 'flex';
    document.getElementById('agentEmail').textContent = user.email;
    loadUniversitiesForAgent();
    loadCoursesForAgent();
    loadStats();  // Load first section on entry
    loadReferralLink();  // Load referral data on dashboard entry
}

// Switch between sections
function switchSection(section) {
    currentSection = section;
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) item.classList.add('active');
    });

    const titles = {
        stats: 'Overview',
        referral: 'Referral Link',
        students: 'My Students',
        submitApplication: 'Submit Student Application'
    };
    document.getElementById('sectionTitle').textContent = titles[section] || section;

    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section + 'Section').classList.add('active');

    switch (section) {
        case 'stats': loadStats(); break;
        case 'referral': loadReferralLink(); break;
        case 'students': loadStudents(); break;
        case 'submitApplication': clearAgentApplicationForm(); break;
    }
}

// Load and display stats
async function loadStats() {
    if (!agentDoc) return;
    const agentDocId = agentDoc.id;
    try {
        const [visitsSnap, clicksSnap, applicationsSnap] = await Promise.all([
            db.collection('referralVisits').where('agentId', '==', agentDocId).get(),
            db.collection('whatsappClicks').where('agentId', '==', agentDocId).get(),
            db.collection('applications').where('agentId', '==', agentDocId).get()
        ]);

        const visits = visitsSnap.size;
        const clicks = clicksSnap.size;
        const applications = applicationsSnap.size;

        document.getElementById('statVisits').textContent = visits;
        document.getElementById('statClicks').textContent = clicks;
        document.getElementById('statStudents').textContent = applications;
        document.getElementById('studentsBadge').textContent = applications;

        // Render referral funnel chart
        renderReferralFunnelChart(visits, clicks, applications);
    } catch (error) {
        console.error('loadStats error:', error);
    }
}

// Render referral funnel ring chart
function renderReferralFunnelChart(visits, clicks, applications) {
    const svg = document.getElementById('referralFunnelChart');
    const conversionEl = document.getElementById('funnelConversion');
    if (!svg) return;

    svg.innerHTML = '';

    const centerX = 100, centerY = 100;
    const radius = 70, innerRadius = 45;

    // Calculate conversion rate (visits -> applications)
    const conversionRate = visits > 0 ? Math.round((applications / visits) * 100) : 0;
    conversionEl.textContent = conversionRate + '%';

    // Create three-segment ring: visits (outer), clicks (middle), applications (inner)
    const segments = [
        { label: 'Visits', value: visits, color: '#0d9488', angle: 0 },
        { label: 'Clicks', value: clicks, color: '#066c49', angle: 120 },
        { label: 'Apps', value: applications, color: '#10b981', angle: 240 }
    ];

    segments.forEach(segment => {
        const angle = (segment.angle * Math.PI) / 180;
        const arcRadius = 60;

        // Draw arc background
        const arcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const x1 = centerX + arcRadius * Math.cos(angle - 0.4);
        const y1 = centerY + arcRadius * Math.sin(angle - 0.4);
        const x2 = centerX + arcRadius * Math.cos(angle + 0.4);
        const y2 = centerY + arcRadius * Math.sin(angle + 0.4);
        arcPath.setAttribute('d', `M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 0 1 ${x2} ${y2}`);
        arcPath.setAttribute('stroke', segment.color);
        arcPath.setAttribute('stroke-width', '12');
        arcPath.setAttribute('fill', 'none');
        arcPath.setAttribute('stroke-linecap', 'round');
        arcPath.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))';
        svg.appendChild(arcPath);

        // Add label text
        const labelX = centerX + (arcRadius + 20) * Math.cos(angle);
        const labelY = centerY + (arcRadius + 20) * Math.sin(angle);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', labelX);
        text.setAttribute('y', labelY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dy', '0.3em');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', '600');
        text.setAttribute('fill', segment.color);
        text.textContent = segment.value;
        svg.appendChild(text);
    });

    // Create legend
    const legend = document.getElementById('funnelLegend');
    legend.innerHTML = '';

    const funnelOrder = [
        { label: 'Referral Visits', value: visits, color: '#0d9488' },
        { label: 'WhatsApp Clicks', value: clicks, color: '#066c49' },
        { label: 'Applications', value: applications, color: '#10b981' }
    ];

    funnelOrder.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background-color: ${item.color};"></div>
            <div class="legend-label">${item.label}</div>
            <div class="legend-value">${item.value}</div>
        `;
        legend.appendChild(legendItem);
    });
}

// Load and display referral link (updates all instances)
function loadReferralLink() {
    if (!agentDoc) return;
    const code = agentDoc.referralCode || '—';
    const url = agentDoc.referralUrl || `${window.location.origin}/?ref=${code}`;

    // Update all referral code displays
    document.querySelectorAll('.referral-code-display').forEach(el => {
        el.textContent = code;
    });

    // Update all referral URL inputs
    document.querySelectorAll('.referral-url-input').forEach(el => {
        el.value = url;
    });
}

// Copy referral URL to clipboard (works with all referral sections)
function copyReferralUrl(event) {
    // Find the input field - either passed in event or fallback to first one
    let input = null;
    let confirmation = null;

    if (event && event.currentTarget) {
        // Find the nearest input and confirmation relative to the button
        const container = event.currentTarget.closest('[class*="card"], [class*="zone"]') || event.currentTarget.parentElement.parentElement;
        input = container?.querySelector('.referral-url-input');
        confirmation = container?.querySelector('.copy-confirmation');
    }

    // Fallback to first available elements if not found via event context
    if (!input) input = document.querySelector('.referral-url-input');
    if (!confirmation) confirmation = document.querySelector('.copy-confirmation');

    if (!input) return;

    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        if (confirmation) {
            confirmation.style.display = 'block';
            setTimeout(() => { confirmation.style.display = 'none'; }, 2000);
        }
    }).catch(() => {
        // Fallback for older browsers
        document.execCommand('copy');
        if (confirmation) {
            confirmation.style.display = 'block';
            setTimeout(() => { confirmation.style.display = 'none'; }, 2000);
        }
    });
}

// Load and display students (applications referred by this agent)
async function loadStudents() {
    if (!agentDoc) return;
    const tbody = document.querySelector('#studentsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';

    try {
        // Query without orderBy on the same field as where clause (avoids Firestore index requirement)
        const snapshot = await db.collection('applications')
            .where('agentId', '==', agentDoc.id)
            .get();

        // Sort results in JavaScript to avoid composite index
        const docs = snapshot.docs.sort((a, b) => {
            const dateA = a.data().createdAt?.toDate() || new Date(0);
            const dateB = b.data().createdAt?.toDate() || new Date(0);
            return dateB - dateA; // Descending order
        });

        if (docs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#888;">No applications referred yet.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        docs.forEach(doc => {
            const d = doc.data();
            const date = d.createdAt ? new Date(d.createdAt.toDate()).toLocaleDateString() : 'N/A';
            const statusClass = (d.status || 'new').toLowerCase().replace(/_/g, '-');
            const studentName = d.student?.name || 'N/A';
            const country = d.student?.country || 'N/A';
            tbody.innerHTML += `
                <tr>
                    <td>${escapeHtml(studentName)}</td>
                    <td>${escapeHtml(country)}</td>
                    <td><span class="status status-${statusClass}">${(d.status || 'New').replace(/_/g, ' ')}</span></td>
                    <td>${date}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('loadStudents error - Collection:', 'applications', 'Field:', 'agentId', 'Value:', agentDoc?.id, 'Error:', error.message);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red;">Error loading applications. Check console for details.</td></tr>';
    }
}

// Helper: Escape HTML
function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Show error message
function showError(msg) {
    const el = document.getElementById('loginError');
    if (el) el.textContent = msg;
}

// Setup mobile sidebar toggle
function setupMobileSidebarToggle() {
    const sidebar = document.querySelector('.admin-sidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');

    if (!sidebar) return;

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

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            !e.target.closest('.admin-sidebar') &&
            !e.target.closest('.sidebar-toggle-btn') &&
            !e.target.closest('#sidebarToggleBtn')) {
            sidebar.classList.remove('mobile-open');
        }
    });

    window.addEventListener('resize', () => {
        applyMobileState();
    });
}

// Load universities for agent application form
async function loadUniversitiesForAgent() {
    const select = document.getElementById('agentAppUniversity');
    if (!select || typeof getDocuments !== 'function') return;

    try {
        // Load all universities from Firestore
        const universities = await getDocuments('universities', 'name', 'asc');
        universities.forEach(uni => {
            const option = document.createElement('option');
            option.value = uni.id || uni.name;
            option.textContent = uni.name || 'Unknown University';
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading universities:', error);
        const option = document.createElement('option');
        option.textContent = 'Error loading universities';
        option.disabled = true;
        select.appendChild(option);
    }
}

// Initial load of courses (empty until university is selected)
async function loadCoursesForAgent() {
    // Courses will be loaded after university selection via loadCoursesForUniversity
    // Initialize empty for now
}

// Load courses for selected university
async function loadCoursesForUniversity() {
    const universitySelect = document.getElementById('agentAppUniversity');
    const courseSelect = document.getElementById('agentAppCourse');

    if (!universitySelect || !courseSelect) return;

    const universityId = universitySelect.value;

    // Clear current courses
    courseSelect.innerHTML = '<option value="">Select Course...</option>';

    // If no university selected, return
    if (!universityId) return;

    try {
        // Get the selected university with its courses
        const university = await getUniversityWithCourses(universityId);
        if (!university || !university.courses) {
            courseSelect.innerHTML = '<option value="">No courses available</option>';
            return;
        }

        // Populate courses specific to this university
        university.courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = course.name || 'Unknown Course';
            courseSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading courses for university:', error);
        courseSelect.innerHTML = '<option value="">Error loading courses</option>';
    }
}

// Clear agent application form
function clearAgentApplicationForm() {
    document.getElementById('agentAppStudentName').value = '';
    document.getElementById('agentAppStudentEmail').value = '';
    document.getElementById('agentAppStudentCountry').value = '';
    document.getElementById('agentAppStudentPhone').value = '';
    document.getElementById('agentAppUniversity').value = '';
    document.getElementById('agentAppCourse').value = '';
    document.getElementById('agentAppNotes').value = '';
    document.getElementById('agentAppPassportFile').value = '';
    document.getElementById('agentAppCertificateFile').value = '';
    document.getElementById('passportFileError').style.display = 'none';
    document.getElementById('certificateFileError').style.display = 'none';
    document.getElementById('agentAppError').style.display = 'none';
    document.getElementById('agentAppSuccess').style.display = 'none';
}

// Submit application on behalf of student
async function submitAgentApplication() {
    if (!agentDoc) {
        showErrorMessage('agentAppError', 'Not authenticated as agent');
        return;
    }

    // Clear previous error
    document.getElementById('agentAppError').style.display = 'none';

    // Validate required fields
    const name = document.getElementById('agentAppStudentName').value.trim();
    const email = document.getElementById('agentAppStudentEmail').value.trim();
    const country = document.getElementById('agentAppStudentCountry').value.trim();

    if (!name || !email || !country) {
        showErrorMessage('agentAppError', 'Please fill in all required fields (Name, Email, Country)');
        return;
    }

    if (!isValidEmail(email)) {
        showErrorMessage('agentAppError', 'Please enter a valid email address');
        return;
    }

    try {
        // Show loading state
        const submitBtn = document.querySelector('#submitApplicationSection .btn-primary');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Submitting...';
        }
        document.getElementById('agentAppSuccess').style.display = 'none';

        // Create unique ID for this application
        const applicationId = db.collection('applications').doc().id;

        // Create application document (without file uploads - Spark Plan compatible)
        const application = {
            id: applicationId,
            student: {
                name: name,
                email: email,
                country: country,
                phone: document.getElementById('agentAppStudentPhone').value.trim(),
                nationality: '',
                city: '',
                programmeId: document.getElementById('agentAppCourse').value || '',
                programme: document.querySelector('#agentAppCourse option:checked')?.textContent || ''
            },
            guardian: {
                name: '',
                email: '',
                phone: '',
                phoneCode: '',
                country: ''
            },
            documents: {
                passport: null,
                certificate: null
            },
            status: 'new',
            referralCode: agentDoc.referralCode || null,
            agentId: agentDoc.id,
            universityId: document.getElementById('agentAppUniversity').value || null,
            universityName: document.querySelector('#agentAppUniversity option:checked')?.textContent || null,
            source: 'agent_manual_submission',
            agentNotes: document.getElementById('agentAppNotes').value.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Submit to Firestore
        const applicationRef = db.collection('applications').doc(application.id);
        await applicationRef.set(application);

        // Show success message
        showSuccessMessage('agentAppSuccess', 'Application submitted successfully! Student will appear in your My Students list.');

        // Reset form after 2 seconds
        setTimeout(() => {
            clearAgentApplicationForm();
            switchSection('students');
            loadStudents(); // Refresh students list
        }, 2000);

    } catch (error) {
        console.error('Error submitting application:', error);
        showErrorMessage('agentAppError', 'Error submitting application: ' + error.message);
    } finally {
        const submitBtn = document.querySelector('#submitApplicationSection .btn-primary');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Submit Application';
        }
    }
}

// Helper: Show error message
function showErrorMessage(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// Helper: Show success message
function showSuccessMessage(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// Helper: Validate email
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
