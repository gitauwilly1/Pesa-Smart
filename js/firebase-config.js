import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";


// Firebase configuration (replace with your own)
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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

//Firebase Auth Functions

const FirebaseAuth = {
    //Sign in with Google
    signInWithGoogle: async function() {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            return {
                success: true,
                user: result.user,
                credential: result.credential
            };
        } catch (error) {
            console.error('Google sign-in error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    //Sign up with email/password
    
    signUpWithEmail: async function(email, password, profileData) {
        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            
            // Update profile with name
            await result.user.updateProfile({
                displayName: `${profileData.firstName} ${profileData.lastName}`
            });
            
            // Store additional user data in Firestore
            await db.collection('users').doc(result.user.uid).set({
                firstName: profileData.firstName,
                lastName: profileData.lastName,
                phone: profileData.phone,
                email: email,
                profile: profileData.profile || {},
                preferences: profileData.preferences || {
                    language: 'en',
                    notifications: true
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return {
                success: true,
                user: result.user
            };
        } catch (error) {
            console.error('Sign up error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    //Sign in with email/password
    
    signInWithEmail: async function(email, password) {
        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            
            // Update last login
            await db.collection('users').doc(result.user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return {
                success: true,
                user: result.user
            };
        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    //Sign out
     
    signOut: async function() {
        try {
            await auth.signOut();
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    //Get current user
    
    getCurrentUser: function() {
        return auth.currentUser;
    },

    //Listen to auth state changes
    
    onAuthStateChanged: function(callback) {
        return auth.onAuthStateChanged(callback);
    }
};

//Firebase Firestore Functions

const FirebaseStore = {
    //Get user data from Firestore
    
    getUserData: async function(uid) {
        try {
            const doc = await db.collection('users').doc(uid).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    },

    //Save user data to Firestore
    
    saveUserData: async function(uid, data) {
        try {
            await db.collection('users').doc(uid).set(data, { merge: true });
            return { success: true };
        } catch (error) {
            console.error('Error saving user data:', error);
            return { success: false, error: error.message };
        }
    },

    //Get user investments
     
    getUserInvestments: async function(uid) {
        try {
            const snapshot = await db.collection('investments')
                .where('userId', '==', uid)
                .orderBy('date', 'desc')
                .get();
                
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting investments:', error);
            return [];
        }
    },

    //Save investment
    
    saveInvestment: async function(investmentData) {
        try {
            const docRef = await db.collection('investments').add({
                ...investmentData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error saving investment:', error);
            return { success: false, error: error.message };
        }
    },

    //Get user goals
    
    getUserGoals: async function(uid) {
        try {
            const snapshot = await db.collection('goals')
                .where('userId', '==', uid)
                .orderBy('deadline', 'asc')
                .get();
                
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting goals:', error);
            return [];
        }
    },

    // Save goal
   
    saveGoal: async function(goalData) {
        try {
            const docRef = await db.collection('goals').add({
                ...goalData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error saving goal:', error);
            return { success: false, error: error.message };
        }
    },

    //Update goal progress
    
    updateGoalProgress: async function(goalId, savedAmount) {
        try {
            await db.collection('goals').doc(goalId).update({
                savedAmount: savedAmount,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Error updating goal:', error);
            return { success: false, error: error.message };
        }
    }
};

// Export for use in other files
window.FirebaseAuth = FirebaseAuth;
window.FirebaseStore = FirebaseStore;