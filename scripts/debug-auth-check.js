// Quick test to check if you have an event organizer user
// Run this in the browser console on the /event-dashboard page



// Check if Firebase is loaded
if (typeof firebase !== 'undefined') {

  
  const auth = firebase.auth();
  const user = auth.currentUser;
  
  if (user) {

    
    // Check user document in Firestore
    const db = firebase.firestore();
    db.collection('users').doc(user.uid).get().then(doc => {
      if (doc.exists) {
        const data = doc.data();

        
        if (data.role === 'event-organizer') {

        } else {

        }
      } else {
    
      }
    });
  } else {

  }
} else {

}
