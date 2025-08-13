const admin = require("firebase-admin");

// Initialize Firebase Admin if not already initialized
try {
  admin.initializeApp();
} catch (error) {
  // App already initialized
}

const firestore = admin.firestore();

module.exports = { firestore };
