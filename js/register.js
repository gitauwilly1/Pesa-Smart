const firebaseConfig = {
    apiKey: "AIzaSyBezb4LCxqZgLXe6wm4CPhtY1f6zHqsetk",
    authDomain: "pesa-smart1.firebaseapp.com",
    projectId: "pesa-smart1",
    storageBucket: "pesa-smart1.firebasestorage.app",
    messagingSenderId: "631129633560",
    appId: "1:631129633560:web:4386e12f80bc49afcca46d",
    measurementId: "G-8DR3QZZ5MB"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

//State Management for Step 2 Selections
let selectedOccupation = "";
const profileButtons = document.querySelectorAll('.profile-btn');

profileButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // UI Reset
        profileButtons.forEach(b => {
            b.classList.remove('border-green-500', 'bg-green-50');
            b.classList.add('border-gray-300');
        });
        // Select logic
        btn.classList.add('border-green-500', 'bg-green-50');
        selectedOccupation = btn.querySelector('p').innerText;
    });
});

//Password Toggle Logic
document.querySelectorAll('button[type="button"]').forEach(btn => {
    btn.addEventListener('click', function() {
        const input = this.parentElement.querySelector('input');
        const icon = this.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

//Form Submission
const registrationForm = document.getElementById('registrationForm');

registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Data Extraction
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const phone = document.getElementById('phone').value;
    const incomeRange = document.querySelector('select').value;
    
    // Collect Goals
    const goals = [];
    if (document.getElementById('goal1').checked) goals.push("Emergency Fund");
    if (document.getElementById('goal2').checked) goals.push("Investing");
    if (document.getElementById('goal3').checked) goals.push("Insurance");
    if (document.getElementById('goal4').checked) goals.push("School Fees");
    if (document.getElementById('goal5').checked) goals.push("Business Growth");

    // Basic Validation
    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    if (!selectedOccupation) {
        alert("Please select your occupation in Step 2.");
        document.getElementById('step-2').checked = true;
        return;
    }

    try {
        // Create User in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Save Extended Profile to Firestore
        await db.collection("users").doc(user.uid).set({
            uid: user.uid,
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: `+254${phone}`,
            occupation: selectedOccupation,
            incomeRange: incomeRange,
            goals: goals,
            virtualBalance: 50.00, // The welcome benefit
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isNewUser: true
        });

        // Store basic info locally for personalization on dashboard
        localStorage.setItem('pesaSmart_user', JSON.stringify({
            name: firstName,
            uid: user.uid
        }));

        // Redirect to Dashboard Page
        window.location.href = "index.html";

    } catch (error) {
        console.error("Registration Error:", error);
        alert(error.message);
    }
});