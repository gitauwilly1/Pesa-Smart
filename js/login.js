(function() {
    'use strict';

    /**
     * SECTION 1: STORAGE KEYS
     */
    const STORAGE_KEYS = {
        SESSION: 'pesasmart_session',
        USERS: 'pesasmart_users',
        REMEMBER: 'pesasmart_remember'
    };

    //INITIALIZATION
    
    function initLoginPage() {
        console.log('Initializing login page...');
        
        // Check if already logged in
        checkExistingSession();
        
        // Transform M-Pesa button to Google button
        transformMpesaButton();
        
        // Setup login form
        setupLoginForm();
        
        // Setup Google Sign-In
        setupGoogleSignIn();
        
        // Load saved credentials if "Remember Me" was checked
        loadSavedCredentials();
    }

    //GOOGLE SIGN-IN
    
    function transformMpesaButton() {
        const mpesaBtn = document.getElementById('mpesa-login');
        if (!mpesaBtn) return;
        
        // Change button text and styling
        mpesaBtn.textContent = 'Sign in with Google';
        mpesaBtn.innerHTML = '<i class="fab fa-google mr-2"></i> Sign in with Google';
        
        // Remove M-Pesa classes and add Google-specific styling
        mpesaBtn.classList.remove('border-green-500', 'text-green-600', 'hover:bg-green-50');
        mpesaBtn.classList.add('border-red-500', 'text-red-600', 'hover:bg-red-50');
        
        // Replace event listeners (will be added in setupGoogleSignIn)
    }

    function setupGoogleSignIn() {
        const googleBtn = document.getElementById('mpesa-login');
        if (!googleBtn) return;
        
        googleBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Disable button during processing
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Signing in...';
            
            try {
                // Check if Firebase is available
                if (window.FirebaseAuth) {
                    // Use Firebase Google Sign-In
                    const result = await FirebaseAuth.signInWithGoogle();
                    
                    if (result.success) {
                        // Get additional user data from Firestore or create profile
                        let userData = await FirebaseStore.getUserData(result.user.uid);
                        
                        if (!userData) {
                            // New user - create profile
                            userData = {
                                firstName: result.user.displayName?.split(' ')[0] || 'Google',
                                lastName: result.user.displayName?.split(' ').slice(1).join(' ') || 'User',
                                email: result.user.email,
                                phone: result.user.phoneNumber || '',
                                photoURL: result.user.photoURL,
                                profile: {},
                                preferences: {
                                    language: 'en',
                                    notifications: true
                                }
                            };
                            
                            await FirebaseStore.saveUserData(result.user.uid, userData);
                        }
                        
                        // Create session
                        createSession({
                            id: result.user.uid,
                            ...userData
                        }, true);
                        
                        showSuccess('Login successful! Redirecting...');
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 1500);
                    } else {
                        showError(result.error || 'Google sign-in failed');
                        resetGoogleButton(googleBtn);
                    }
                } else {
                    // Fallback to localStorage my mode
                    simulateGoogleLogin();
                }
            } catch (error) {
                console.error('Google sign-in error:', error);
                showError('Failed to sign in with Google');
                resetGoogleButton(googleBtn);
            }
        });
    }

    function resetGoogleButton(btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fab fa-google mr-2"></i> Sign in with Google';
    }

    //Simulate Google login for my user (when Firebase not configured)
    
    function simulateGoogleLogin() {
        // Create a  Google user
        const myUser = {
            id: 'google_' + Date.now(),
            firstName: 'Google',
            lastName: 'User',
            email: 'user@gmail.com',
            phone: '+254712345678',
            photoURL: 'https://lh3.googleusercontent.com/a-/default-user',
            profile: {
                occupation: 'employed',
                incomeRange: '30000-70000'
            },
            preferences: {
                language: 'en',
                notifications: true
            }
        };
        
        // Save to localStorage
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || {};
        users[myUser.email] = myUser;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        
        // Create session
        createSession(myUser, true);
        
        showSuccess('my Google login successful!');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }

    //EMAIL/PASSWORD LOGIN
    
    function setupLoginForm() {
        const form = document.getElementById('login-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const email = document.getElementById('email')?.value || 
                         document.getElementById('phone')?.value; // Fallback to phone field
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember')?.checked || false;
            
            // Validate
            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Logging in...';
            
            try {
                let success = false;
                let userData = null;
                
                // Try Firebase first
                if (window.FirebaseAuth) {
                    const result = await FirebaseAuth.signInWithEmail(email, password);
                    
                    if (result.success) {
                        userData = await FirebaseStore.getUserData(result.user.uid);
                        success = true;
                    } else {
                        // Fallback to localStorage
                        const localResult = localLogin(email, password);
                        success = localResult.success;
                        userData = localResult.user;
                    }
                } else {
                    // Use localStorage only
                    const localResult = localLogin(email, password);
                    success = localResult.success;
                    userData = localResult.user;
                }
                
                if (success && userData) {
                    // Create session
                    createSession(userData, remember);
                    
                    // Save credentials if remember me
                    if (remember) {
                        saveCredentials(email, password);
                    } else {
                        clearSavedCredentials();
                    }
                    
                    showSuccess('Login successful! Redirecting...');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    showError('Invalid email or password');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('Login failed. Please try again.');
            } finally {
                // Reset button
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    //LocalStorage-based login
    
    function localLogin(email, password) {
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || {};
        
        // Find user by email (or phone if email field used for phone)
        const user = Object.values(users).find(u => 
            u.email === email || u.phone === email
        );
        
        if (user && user.password === hashPassword(password)) {
            return { success: true, user };
        }
        
        // My users for testing
        const myUsers = {
            'ann@email.com': {
                id: 'USR001',
                firstName: 'Ann',
                lastName: 'Muthoni',
                email: 'ann@email.com',
                phone: '+254712345678',
                password: hashPassword('password123'),
                financialScore: 4.2
            },
            'john@email.com': {
                id: 'USR002',
                firstName: 'John',
                lastName: 'Kamau',
                email: 'john@email.com',
                phone: '+254723456789',
                password: hashPassword('password123'),
                financialScore: 3.5
            }
        };
        
        if (myUsers[email] && myUsers[email].password === hashPassword(password)) {
            return { success: true, user: myUsers[email] };
        }
        
        return { success: false };
    }

    //SESSION MANAGEMENT
    
    function createSession(user, remember = false) {
        const session = {
            userId: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            photoURL: user.photoURL || null,
            loginTime: new Date().toISOString(),
            expires: remember ? 
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : // 30 days
                new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };
        
        // Store in sessionStorage (cleared when browser closes)
        sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
        
        // Also store in localStorage if remember me
        if (remember) {
            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
        }
    }

    function checkExistingSession() {
        // Check localStorage first (remember me)
        let session = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION));
        
        // Then check sessionStorage
        if (!session) {
            session = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.SESSION));
        }
        
        if (session) {
            // Check if session expired
            const expires = new Date(session.expires);
            if (expires > new Date()) {
                // Valid session - redirect to dashboard
                window.location.href = 'index.html';
            } else {
                // Expired session - clear storage
                localStorage.removeItem(STORAGE_KEYS.SESSION);
                sessionStorage.removeItem(STORAGE_KEYS.SESSION);
            }
        }
    }

    //REMEMBER ME FUNCTIONALITY
    
    function saveCredentials(email, password) {
        
        const credentials = {
            email: email,
            token: btoa(email + ':' + Date.now()) 
        };
        localStorage.setItem(STORAGE_KEYS.REMEMBER, JSON.stringify(credentials));
    }

    function loadSavedCredentials() {
        const saved = localStorage.getItem(STORAGE_KEYS.REMEMBER);
        if (saved) {
            try {
                const credentials = JSON.parse(saved);
                const emailInput = document.getElementById('email') || 
                                 document.getElementById('phone');
                if (emailInput) {
                    emailInput.value = credentials.email;
                    document.getElementById('remember').checked = true;
                }
            } catch (e) {
            }
        }
    }

    function clearSavedCredentials() {
        localStorage.removeItem(STORAGE_KEYS.REMEMBER);
    }

    // HELPER FUNCTIONS
    
    function hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    function showError(message) {
        // Check if error container exists
        let errorDiv = document.querySelector('.error-message');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4';
            
            const form = document.getElementById('login-form');
            if (form) {
                form.parentNode.insertBefore(errorDiv, form.nextSibling);
            } else {
                document.querySelector('.container').appendChild(errorDiv);
            }
        }
        
        errorDiv.innerHTML = `
            <strong class="font-bold">Error!</strong>
            <span class="block sm:inline"> ${message}</span>
        `;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.classList.add('animate-fade-out');
            setTimeout(() => successDiv.remove(), 500);
        }, 3000);
    }

    //ADD GOOGLE ICON IF NOT PRESENT
    
    function addFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
            document.head.appendChild(link);
        }
    }

    //Start the login page
    
    addFontAwesome();
    document.addEventListener('DOMContentLoaded', initLoginPage);

})();