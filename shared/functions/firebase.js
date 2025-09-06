import admin from "firebase-admin";

// Initialize Firebase Admin - simpler initialization for Cloud Functions
if (!admin.apps.length) {
  admin.initializeApp();
}

export const firestore = admin.firestore();
