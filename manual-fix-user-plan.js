// Manual script to fix user plan in Firestore
// Run this once to fix the current user's plan

import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// User who needs to be fixed
const userId = "h78WrnY1ueRTXLE74dd8Jn5CxYh1";

async function fixUserPlan() {
  try {
    const db = admin.firestore();
    
    // Update the user's plan to "pro"
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      plan: 'pro',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Successfully updated user ${userId} plan to "pro"`);
    console.log('The user should now see Pro plan features in their dashboard');
    console.log('User should refresh their browser to see the changes');
    
  } catch (error) {
    console.error('Error updating user plan:', error);
  }
  
  // Exit the process
  process.exit(0);
}

fixUserPlan();
