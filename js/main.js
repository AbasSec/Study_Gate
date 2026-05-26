/* ============================================
   StudyGate International Educational Agency - Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    initNavbar();
    initMobileMenu();
    initActiveNavLink();
    initWhatsAppChatWidget();
    initScrollAnimations();
    initSmoothScroll();
    initContactForm();
    initCounterAnimation();
});

/* ---------- Navbar Scroll Effect ---------- */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

/* ---------- Mobile Menu Toggle ---------- */
function initMobileMenu() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (navToggle && navLinks) {
        const closeMenu = () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
        };

        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        
        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });

        // Close menu when clicking outside the navbar area.
        document.addEventListener('click', (event) => {
            const clickedInsideNav = event.target.closest('#navbar');
            if (!clickedInsideNav) {
                closeMenu();
            }
        });

        // Reset mobile menu state when viewport expands.
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                closeMenu();
            }
        });
    }
}

/* ---------- Active Navbar Link ---------- */
function initActiveNavLink() {
    const navLinks = document.querySelectorAll('.nav-links a');
    if (!navLinks.length) return;

    const currentPath = normalizePath(window.location.pathname);

    navLinks.forEach((link) => {
        const href = link.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        try {
            const targetPath = normalizePath(new URL(href, window.location.href).pathname);
            if (targetPath === currentPath) {
                link.classList.add('active');
            }
        } catch (error) {
            // Ignore malformed href values.
        }
    });
}

function normalizePath(path) {
    if (!path) return '/';
    return path.replace(/\/+$/, '') || '/';
}

/* ---------- WhatsApp Chat Widget (Firebase-configured) ---------- */
function initWhatsAppChatWidget() {
    if (document.body.classList.contains('admin-body')) return;
    if (document.querySelector('.whatsapp-chat-widget')) return;

    // Wait for Firebase, then load number from contactSettings
    function tryLoadWhatsApp() {
        if (typeof db === 'undefined') {
            setTimeout(tryLoadWhatsApp, 600);
            return;
        }
        db.collection('contactSettings').doc('main').get().then(doc => {
            const number = doc.exists
                ? (doc.data().whatsapp || doc.data().whatsappNumber || '')
                : '';
            if (!number) return; // No WhatsApp configured — don't show widget

            const cleaned = number.replace(/\D/g, '');
            const message = encodeURIComponent('Hi StudyGate International team, I need guidance for studying abroad.');
            const link = `https://wa.me/${cleaned}?text=${message}`;
            const iconPath = window.location.pathname.includes('/pages/')
                ? '../assets/icons/whatsapp_icon.png'
                : 'assets/icons/whatsapp_icon.png';

            const widget = document.createElement('a');
            widget.href = link;
            widget.target = '_blank';
            widget.rel = 'noopener noreferrer';
            widget.className = 'whatsapp-chat-widget';
            widget.setAttribute('aria-label', 'Chat with us on WhatsApp');
            widget.innerHTML = `
                <span class="whatsapp-chat-label">Need help? Chat with us</span>
                <span class="whatsapp-chat-icon" aria-hidden="true">
                    <img src="${iconPath}" alt="WhatsApp" width="30" height="30">
                </span>
            `;
            document.body.appendChild(widget);
        }).catch(() => {});
    }
    tryLoadWhatsApp();
}

/* ---------- Scroll Reveal Animations ---------- */
function initScrollAnimations() {
    const revealElements = document.querySelectorAll('.reveal, .stagger-reveal');
    
    const revealOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);
    
    revealElements.forEach(el => {
        revealObserver.observe(el);
    });
}

/* ---------- Smooth Scroll for Anchor Links ---------- */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const navbarHeight = document.getElementById('navbar').offsetHeight;
                const targetPosition = targetElement.offsetTop - navbarHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/* ---------- Contact Form Handling ---------- */
function initContactForm() {
    const form = document.getElementById('inquiryForm');
    const formSuccess = document.getElementById('formSuccess');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value || '',
                country: document.getElementById('country').value || '',
                interest: document.getElementById('interest').value || '',
                message: document.getElementById('message').value || '',
                timestamp: new Date().toISOString()
            };
            
            // Validate required fields
            if (!formData.name || !formData.email) {
                alert('Please fill in all required fields.');
                return;
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                alert('Please enter a valid email address.');
                return;
            }
            
            try {
                // Submit inquiry to Firestore (primary path)
                if (typeof submitInquiry === 'function') {
                    await submitInquiry(formData);
                } else if (typeof submitToFirebase === 'function') {
                    // Backward compatibility fallback
                    await submitToFirebase(formData);
                } else {
                    throw new Error('No inquiry submission handler found');
                }
                
                // Show success message
                form.style.display = 'none';
                formSuccess.classList.add('show');
                
                // Reset form
                form.reset();
                
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('There was an error submitting your inquiry. Please try again.');
            }
        });
    }
}

/* ---------- Counter Animation for Statistics ---------- */
function initCounterAnimation() {
    const counters = document.querySelectorAll('.stat-number');
    
    const counterOptions = {
        threshold: 0.5
    };
    
    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValue = parseInt(target.textContent);
                animateCounter(target, finalValue);
                observer.unobserve(target);
            }
        });
    }, counterOptions);
    
    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

function animateCounter(element, target) {
    let current = 0;
    const increment = target / 50;
    const duration = 1500;
    const stepTime = duration / 50;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current) + '+';
        }
    }, stepTime);
}

/* ---------- Testimonials Slider (Optional Enhancement) ---------- */
function initTestimonialsSlider() {
    const slider = document.querySelector('.testimonials-slider');
    if (!slider) return;
    
    let isDown = false;
    let startX;
    let scrollLeft;
    
    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('dragging');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });
    
    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('dragging');
    });
    
    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('dragging');
    });
    
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2;
        slider.scrollLeft = scrollLeft - walk;
    });
}

/* ---------- Utility Functions ---------- */
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

// Initialize testimonials slider on load
document.addEventListener('DOMContentLoaded', initTestimonialsSlider);

