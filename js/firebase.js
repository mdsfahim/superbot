// ==========================================
// FIREBASE INITIALIZATION ONLY
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAIy5CYDeeYgHjJ9QBtlOFnM6Dy5eZu3AA",
    authDomain: "m-c-bot.firebaseapp.com",
    projectId: "m-c-bot",
    storageBucket: "m-c-bot.firebasestorage.app",
    messagingSenderId: "390271091201",
    appId: "1:390271091201:web:c04f9c143e4c851abcf600"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Global Database Variable
window.db = firebase.firestore();