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

async function updateReferralStatus() {
  try {
    const userEmail = 'grubana.co@gmail.com';
    
    console.log('🔍 Looking for referral document...');
    
    // Query referrals by email since the referral userId might be different from the actual user ID
    const referralQuery = await db.collection('referrals')
      .where('userEmail', '==', userEmail)
      .get();
    
    if (referralQuery.empty) {
      console.log('❌ No referral document found for this email');
      return;
    }
    
    referralQuery.forEach(async (doc) => {
      const referralData = doc.data();
      console.log('📄 Current referral data:', {
        userEmail: referralData.userEmail,
        referralCode: referralData.referralCode,
        selectedPlan: referralData.selectedPlan,
        paymentCompleted: referralData.paymentCompleted,
        emailSent: referralData.emailSent
      });
      
      if (!referralData.paymentCompleted) {
        console.log('🔧 Updating referral status to mark payment as completed...');
        
        await db.collection('referrals').doc(doc.id).update({
          paymentCompleted: true
        });
        
        console.log('✅ Referral payment status updated successfully!');
      } else {
        console.log('ℹ️ Referral payment status is already marked as completed');
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating referral status:', error);
  }
}

updateReferralStatus().then(() => {
  console.log('🏁 Referral update script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Referral update script failed:', error);
  process.exit(1);
});
