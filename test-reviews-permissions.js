const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://foodtruckfinder-27eba-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function testReviewsPermissions() {
  try {
    console.log('🔍 Testing reviews collection access...');
    
    // Try to read the reviews collection
    const reviewsSnapshot = await db.collection('reviews').limit(1).get();
    console.log('✅ Successfully accessed reviews collection');
    console.log('📊 Collection exists:', !reviewsSnapshot.empty);
    console.log('📊 Document count:', reviewsSnapshot.size);
    
    // If empty, create a test review to initialize the collection
    if (reviewsSnapshot.empty) {
      console.log('📝 Creating test review to initialize collection...');
      
      const testReview = {
        userId: 'test-user-id',
        truckId: 'i2MGhY36bbht8p7mrZSzwholsIm2',
        rating: 5,
        comment: 'Test review to initialize collection',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userName: 'Test User'
      };
      
      await db.collection('reviews').add(testReview);
      console.log('✅ Test review created successfully');
    }
    
    // List all reviews
    const allReviews = await db.collection('reviews').get();
    console.log('📊 Total reviews in collection:', allReviews.size);
    
    if (!allReviews.empty) {
      allReviews.forEach(doc => {
        console.log('📝 Review:', {
          id: doc.id,
          data: doc.data()
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing reviews collection:', error);
  }
}

testReviewsPermissions().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
