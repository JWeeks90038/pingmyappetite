const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (reuse existing app if available)
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://foodtruckfinder-27eba-default-rtdb.firebaseio.com/'
  });
}

const db = admin.firestore();

async function createMissingReferralDocument() {
  try {
    const userId = 'TlFwP8hAVwWfypwLu7jWl95dWlm2';
    const userEmail = 'grubana.co@gmail.com';
    
    console.log('🎯 Creating missing referral document for user:', userId);
    
    // Get user data for referral details
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('❌ User document not found');
      return;
    }
    
    const userData = userDoc.data();
    console.log('📄 User data:', {
      email: userData.email,
      username: userData.username,
      truckName: userData.truckName,
      plan: userData.plan,
      hasValidReferral: userData.hasValidReferral,
      referralCode: userData.referralCode
    });
    
    // Create referral document
    const referralData = {
      userId: userId,
      userEmail: userData.email,
      userName: userData.username || userData.ownerName || '',
      truckName: userData.truckName || '',
      referralCode: 'arayaki_hibachi',
      selectedPlan: userData.plan,
      signupAt: admin.firestore.Timestamp.fromDate(userData.createdAt.toDate()),
      paymentCompleted: true, // User already has active subscription
      emailSent: false
    };
    
    await db.collection('referrals').doc(userId).set(referralData);
    console.log('✅ Referral document created successfully:', referralData);
    
  } catch (error) {
    console.error('❌ Error creating referral document:', error);
  }
}

createMissingReferralDocument().then(() => {
  console.log('🏁 Referral document creation completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
