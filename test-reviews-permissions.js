const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://foodtruckfinder-27eba-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function testReviewsPermissions() {
  try {

    
    // Try to read the reviews collection
    const reviewsSnapshot = await db.collection('reviews').limit(1).get();

    
    // If empty, create a test review to initialize the collection
    if (reviewsSnapshot.empty) {

      
      const testReview = {
        userId: 'test-user-id',
        truckId: 'i2MGhY36bbht8p7mrZSzwholsIm2',
        rating: 5,
        comment: 'Test review to initialize collection',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userName: 'Test User'
      };
      
      await db.collection('reviews').add(testReview);
 
    }
    
    // List all reviews
    const allReviews = await db.collection('reviews').get();

    
    if (!allReviews.empty) {
      allReviews.forEach(doc => {
        ('📝 Review:', {
          id: doc.id,
          data: doc.data()
        });
      });
    }
    
  } catch (error) {

  }
}

testReviewsPermissions().then(() => {
  process.exit(0);
}).catch(error => {

  process.exit(1);
});
