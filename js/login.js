const firebaseConfig = {
    apiKey: "AIzaSyBezb4LCxqZgLXe6wm4CPhtY1f6zHqsetk",
    authDomain: "pesa-smart1.firebaseapp.com",
    projectId: "pesa-smart1",
    storageBucket: "pesa-smart1.firebasestorage.app",
    messagingSenderId: "631129633560",
    appId: "1:631129633560:web:4386e12f80bc49afcca46d",
    measurementId: "G-8DR3QZZ5MB"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Selectors
const loginForm = document.querySelector('form');
const googleBtn = document.querySelector('button .fa-google').closest('button');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const forgotPasswordLink = document.querySelector('a[href="#"]'); 

// --- Google Sign-In with Popup  ---
googleBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Force the account picker to show every time
    provider.setCustomParameters({ prompt: 'select_account' });

    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            // Merge user data so we don't overwrite their balance/progress
            return db.collection('users').doc(user.uid).set({
                fullName: user.displayName,
                email: user.email,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        })
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch((error) => {
            if (error.code === 'auth/popup-blocked') {
                alert("Please enable popups for this website to sign in with Google.");
            } else if (error.code === 'auth/popup-closed-by-user') {
                console.log("User closed the popup before finishing.");
            } else {
                alert("Google Error: " + error.message);
            }
        });
});

// --- Email/Password Login ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
        .then(() => window.location.href = 'index.html')
        .catch(err => alert(err.message));
});

// --- Forgot Password Logic ---
forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    
    if (!email) {
        alert("Please enter your email address first so we can send a reset link.");
        return;
    }

    auth.sendPasswordResetEmail(email)
        .then(() => {
            alert("Password reset email sent! Check your inbox.");
        })
        .catch((error) => {
            alert("Error: " + error.message);
        });
});

// Password Visibility Toggle 
const togglePasswordBtn = document.querySelector('.fa-eye').parentElement;
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePasswordBtn.querySelector('i').classList.toggle('fa-eye');
    togglePasswordBtn.querySelector('i').classList.toggle('fa-eye-slash');
});