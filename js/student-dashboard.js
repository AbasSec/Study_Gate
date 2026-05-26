/* ============================================
   Student Portal - Application Status Tracking
   ============================================ */

const STAGES = ['Applied', 'Finding_Course', 'Visa_Stage', 'Waiting_Commission', 'Enrolled'];

let currentUser = null;
let studentDoc = null;
let studentStatusDoc = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof auth === 'undefined') return;

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                await loadStudentData(user);
            } else {
                showLogin();
            }
        });
    }, 500);

    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
});

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    clearError();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
        // onAuthStateChanged handles the rest
    } catch (error) {
        showError(mapAuthError(error.code));
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    clearError();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        // Update Firebase Auth display name
        await cred.user.updateProfile({ displayName: name });
        // onAuthStateChanged will call loadStudentData automatically
    } catch (error) {
        showError(mapAuthError(error.code));
    }
}

// Load student data
async function loadStudentData(user) {
    try {
        // Query students by email
        const snapshot = await db.collection('students')
            .where('email', '==', user.email)
            .limit(1)
            .get();

        if (snapshot.empty) {
            // No student record found for this email
            showDashboard(user);
            showNoRecord();
            return;
        }

        const doc = snapshot.docs[0];
        studentDoc = { id: doc.id, ...doc.data() };

        // Load status separately
        await loadStudentStatus(studentDoc.id);

        showDashboard(user);
        populateDetails();
    } catch (error) {
        console.error('loadStudentData error:', error);
        showError('Error loading your data. Please try again.');
    }
}

// Load student status
async function loadStudentStatus(studentId) {
    try {
        // Query by studentId field
        const snapshot = await db.collection('studentStatus')
            .where('studentId', '==', studentId)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            studentStatusDoc = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        }

        renderProgressStages(studentStatusDoc?.status || studentDoc?.status || 'Applied');
        document.getElementById('statusNotes').textContent = studentStatusDoc?.notes || '';
    } catch (error) {
        console.error('loadStudentStatus error:', error);
        renderProgressStages(studentDoc?.status || 'Applied');
    }
}

// Render progress stages
function renderProgressStages(currentStatus) {
    const currentIndex = STAGES.indexOf(currentStatus);
    STAGES.forEach((stage, i) => {
        const el = document.getElementById(`stage-${stage}`);
        if (!el) return;
        el.classList.remove('active', 'completed');
        if (i < currentIndex) el.classList.add('completed');
        else if (i === currentIndex) el.classList.add('active');
    });

    // Update connector lines
    document.querySelectorAll('.stage-connector').forEach((connector, i) => {
        connector.classList.toggle('completed', i < currentIndex);
    });

    const label = document.getElementById('currentStatusLabel');
    label.textContent = `Status: ${currentStatus.replace(/_/g, ' ')}`;
}

// Load status history
async function loadStatusHistory() {
    if (!studentDoc) return;
    try {
        const snapshot = await db.collection('studentStatusHistory')
            .where('studentId', '==', studentDoc.id)
            .orderBy('setAt', 'desc')
            .limit(10)
            .get();

        const timeline = document.getElementById('statusTimeline');
        if (snapshot.empty) {
            timeline.innerHTML = '<p style="color:var(--gray-500); font-size:0.875rem;">No history yet.</p>';
            return;
        }

        timeline.innerHTML = '';
        snapshot.forEach(doc => {
            const d = doc.data();
            const date = d.setAt ? new Date(d.setAt.toDate()).toLocaleDateString() : 'N/A';
            const statusLabel = (d.status || '').replace(/_/g, ' ');
            timeline.innerHTML += `
                <div class="timeline-entry">
                    <div class="timeline-dot"><i class="bi bi-check-lg"></i></div>
                    <div class="timeline-content">
                        <strong>${escapeHtml(statusLabel)}</strong>
                        ${d.notes ? `<p>${escapeHtml(d.notes)}</p>` : ''}
                        <span class="timeline-date">${date} ${d.setBy ? '· by ' + escapeHtml(d.setBy) : ''}</span>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('loadStatusHistory error:', error);
    }
}

// Populate student details
function populateDetails() {
    if (!studentDoc) return;
    document.getElementById('detailName').textContent = studentDoc.name || '—';
    document.getElementById('detailEmail').textContent = studentDoc.email || '—';
    document.getElementById('detailPhone').textContent = studentDoc.phone || '—';
    document.getElementById('detailCountry').textContent = studentDoc.country || '—';
    loadStatusHistory();
}

// Show login screen
function showLogin() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('studentDashboard').style.display = 'none';
}

// Show dashboard
function showDashboard(user) {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('studentDashboard').style.display = 'block';
    document.getElementById('studentGreeting').textContent =
        `Welcome, ${user.displayName || user.email}`;
}

// Show no record state
function showNoRecord() {
    document.getElementById('statusCard').style.display = 'none';
    document.getElementById('applicationSection').style.display = 'none';
    document.getElementById('historySection').style.display = 'none';
    document.getElementById('noRecordSection').style.display = 'block';
}

// Show/hide tab
function showTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
    document.getElementById('registerForm').style.display = isLogin ? 'none' : 'block';
    document.getElementById('tabLogin').classList.toggle('active', isLogin);
    document.getElementById('tabRegister').classList.toggle('active', !isLogin);
    clearError();
}

// Show error
function showError(msg) {
    const el = document.getElementById('loginError');
    if (el) el.textContent = msg;
}

// Clear error
function clearError() {
    showError('');
}

// Map Firebase auth error codes to user-friendly messages
function mapAuthError(code) {
    const messages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.'
    };
    return messages[code] || 'An error occurred. Please try again.';
}

// Handle logout
async function handleLogout() {
    studentDoc = null;
    studentStatusDoc = null;
    await auth.signOut();
    showLogin();
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
    showTab('login');
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
