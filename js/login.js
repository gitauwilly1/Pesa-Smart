// Firebase Configuration (Replace with your keys)
const firebaseConfig = {
    apiKey: "AIzaSyBezb4LCxqZgLXe6wm4CPhtY1f6zHqsetk",
    authDomain: "pesa-smart1.firebaseapp.com",
    projectId: "pesa-smart1",
    storageBucket: "pesa-smart1.firebasestorage.app",
    messagingSenderId: "631129633560",
    appId: "1:631129633560:web:4386e12f80bc49afcca46d",
    measurementId: "G-8DR3QZZ5MB"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('remember');
    const passwordToggleBtn = document.querySelector('.relative button');
    const googleLoginBtn = document.querySelector('button[type="button"].border-2');

    // --- 1. Load Saved Preference ---
    const savedEmail = localStorage.getItem('ps_remembered_email');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMeCheckbox.checked = true;
    }

    // --- 2. Password Visibility Toggle ---
    passwordToggleBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const icon = passwordToggleBtn.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    // --- 3. Email/Password Login ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Handle "Remember Me"
            if (rememberMeCheckbox.checked) {
                localStorage.setItem('ps_remembered_email', email);
            } else {
                localStorage.removeItem('ps_remembered_email');
            }

            // Session persistence in Local Storage
            localStorage.setItem('ps_user_session', JSON.stringify({
                uid: user.uid,
                email: user.email,
                lastLogin: new Date().toISOString()
            }));

            window.location.href = 'index.html';
        } catch (error) {
            console.error("Firebase Error Code:", error.code);

            if (error.code === 'auth/user-not-found') {
                alert('No account exists with this email.');
            } else if (error.code === 'auth/wrong-password') {
                alert('Incorrect password.');
            } else {
                alert('Login failed: ' + error.message);
            }
        }
    });

    // --- 4. Google Sign-In ---
    googleLoginBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            localStorage.setItem('ps_user_session', JSON.stringify({
                uid: user.uid,
                displayName: user.displayName,
                email: user.email
            }));

            window.location.href = 'index.html';
        } catch (error) {
            console.error("Google Auth Error:", error.message);
        }
    });
});