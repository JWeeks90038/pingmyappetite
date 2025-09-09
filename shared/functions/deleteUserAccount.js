import { onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

// CORS headers for mobile app
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const deleteUserAccount = onRequest({
  region: "us-central1",
  cors: true
}, async (req, res) => {
  // Initialize Stripe with the secret from environment
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.set(corsHeaders);
    res.status(200).send("");
    return;
  }

  if (req.method !== "POST") {
    res.set(corsHeaders);
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const { userId, idToken } = req.body;

    if (!userId || !idToken) {
      res.set(corsHeaders);
      res.status(400).json({ error: "Missing required fields: userId and idToken" });
      return;
    }

    // Verify the ID token to ensure this is a legitimate request
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
      if (decodedToken.uid !== userId) {
        res.set(corsHeaders);
        res.status(403).json({ error: "Token does not match user ID" });
        return;
      }
    } catch (tokenError) {
      res.set(corsHeaders);
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }



    // Get user data from Firestore to check for Stripe information
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    let stripeCleanupResults = {
      subscription: null,
      customer: null
    };

    // Handle Stripe cleanup if user has Stripe data
    if (userData) {
      // Cancel subscription if exists
      if (userData.stripeSubscriptionId) {
        try {

          const subscription = await stripe.subscriptions.cancel(userData.stripeSubscriptionId, {
            prorate: false, // Don't prorate charges
            invoice_now: false // Don't invoice immediately
          });
          stripeCleanupResults.subscription = `Canceled subscription: ${subscription.id}`;
       
        } catch (stripeError) {
     
          stripeCleanupResults.subscription = `Error canceling subscription: ${stripeError.message}`;
        }
      }

      // Delete Stripe customer if exists
      if (userData.stripeCustomerId) {
        try {
         
          const deletedCustomer = await stripe.customers.del(userData.stripeCustomerId);
          stripeCleanupResults.customer = `Deleted customer: ${deletedCustomer.id}`;
         
        } catch (stripeError) {
        
          stripeCleanupResults.customer = `Error deleting customer: ${stripeError.message}`;
        }
      }
    }

    // Clean up Firestore data based on user role
    const firestoreCleanup = {
      events: 0,
      menuItems: 0,
      pings: 0,
      favorites: 0,
      truckLocation: false,
      truckDocument: false,
      referrals: false,
      userDocument: false
    };

    if (userData) {
      const userRole = userData.role;

      // Delete events for event organizers
      if (userRole === 'event-organizer') {
        try {
          const eventsQuery = await db.collection('events').where('organizerId', '==', userId).get();
          const batch = db.batch();
          eventsQuery.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          firestoreCleanup.events = eventsQuery.docs.length;
         
        } catch (error) {
         
        }
      }

      // Always attempt to delete truck-related data (regardless of role for safety)
      // This ensures cleanup even if user role data is missing or incorrect
      try {
        await db.collection('truckLocations').doc(userId).delete();
        firestoreCleanup.truckLocation = true;
        
      } catch (error) {
      
      }

      try {
        await db.collection('trucks').doc(userId).delete();
        firestoreCleanup.truckDocument = true;
   
      } catch (error) {
 
      }

      try {
        const menuItemsQuery = await db.collection('menuItems').where('ownerId', '==', userId).get();
        const batch = db.batch();
        menuItemsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        firestoreCleanup.menuItems = menuItemsQuery.docs.length;
 
      } catch (error) {
  
      }

      // Delete events for event organizers (keep role-specific logic for events)
      if (userRole === 'event-organizer') {
        try {
          const eventsQuery = await db.collection('events').where('organizerId', '==', userId).get();
          const batch = db.batch();
          eventsQuery.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          firestoreCleanup.events = eventsQuery.docs.length;
       
        } catch (error) {
     
        }
      }

      // Delete pings for all user types
      try {
        const pingsQuery = await db.collection('pings').where('userId', '==', userId).get();
        const batch = db.batch();
        pingsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        firestoreCleanup.pings = pingsQuery.docs.length;
     
      } catch (error) {
 
      }

      // Delete favorites for all user types
      try {
        const favoritesQuery = await db.collection('favorites').where('userId', '==', userId).get();
        const batch = db.batch();
        favoritesQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        firestoreCleanup.favorites = favoritesQuery.docs.length;

      } catch (error) {

      }

      // Delete referral document
      try {
        await db.collection('referrals').doc(userId).delete();
        firestoreCleanup.referrals = true;
  
      } catch (error) {

      }
    }

    // Delete user document from Firestore
    try {
      await db.collection('users').doc(userId).delete();
      firestoreCleanup.userDocument = true;
 
    } catch (error) {
 
    }

    // Delete Firebase Auth user
    try {
      await auth.deleteUser(userId);
   
    } catch (error) {

      // Don't fail the entire operation if auth deletion fails
    }



    res.set(corsHeaders);
    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
      cleanup: {
        stripe: stripeCleanupResults,
        firestore: firestoreCleanup
      }
    });

  } catch (error) {

    res.set(corsHeaders);
    res.status(500).json({ 
      error: "Failed to delete account",
      details: error.message 
    });
  }
});
