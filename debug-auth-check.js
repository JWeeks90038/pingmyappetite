// Quick test to check if you have an event organizer user
// Run this in the browser console on the /event-dashboard page

console.log('🔍 Current Auth State Check:');
console.log('Current URL:', window.location.href);

// Check if Firebase is loaded
if (typeof firebase !== 'undefined') {
  console.log('Firebase is loaded');
  
  const auth = firebase.auth();
  const user = auth.currentUser;
  
  if (user) {
    console.log('✅ User is logged in:', user.email);
    
    // Check user document in Firestore
    const db = firebase.firestore();
    db.collection('users').doc(user.uid).get().then(doc => {
      if (doc.exists) {
        const data = doc.data();
        console.log('👤 User data:', data);
        console.log('📋 User role:', data.role);
        
        if (data.role === 'event-organizer') {
          console.log('✅ User is an event organizer - dashboard should load');
        } else {
          console.log('❌ User is NOT an event organizer, role is:', data.role);
          console.log('💡 Try logging in as an event organizer or change user role');
        }
      } else {
        console.log('❌ User document does not exist');
      }
    });
  } else {
    console.log('❌ No user is logged in');
    console.log('💡 Go to /login or /signup?role=event-organizer');
  }
} else {
  console.log('❌ Firebase not loaded');
}
