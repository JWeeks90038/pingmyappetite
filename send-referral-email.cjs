const fetch = require('node-fetch');

async function sendReferralNotification() {
  try {
    console.log('📧 Sending referral notification email via Formspree...');
    
    const emailData = {
      to: 'grubana.co@gmail.com',
      subject: '🎯 PAID Arayaki Hibachi Referral - TestOwner (pro plan)',
      message: `🎉 CONFIRMED REFERRAL PAYMENT - Arayaki Hibachi

Payment Completed Successfully!

Referral Details:
• Referral Code Used: arayaki_hibachi
• New User Name: TestOwner
• New User Email: grubana.co@gmail.com
• Food Truck Name: Test Food 2
• Selected Plan: pro
• User ID: TlFwP8hAVwWfypwLu7jWl95dWlm2
• Stripe Customer ID: cus_SuS9rL5CFmapAp
• Subscription ID: sub_1RydHDRsRfaVTYCjf8pT7eQQ

30-Day Free Trial: This user has successfully started their pro plan with a 30-day free trial.

This notification was sent after successful Stripe payment completion.

Best regards,
Grubana System`,
      referralCode: 'arayaki_hibachi',
      newUserEmail: 'grubana.co@gmail.com',
      newUserName: 'TestOwner',
      truckName: 'Test Food 2',
      selectedPlan: 'pro',
      userId: 'TlFwP8hAVwWfypwLu7jWl95dWlm2',
      subscriptionId: 'sub_1RydHDRsRfaVTYCjf8pT7eQQ',
      customerId: 'cus_SuS9rL5CFmapAp',
      _subject: '🎯 PAID Arayaki Hibachi Referral - TestOwner (pro plan)',
    };
    
    const formspreeResponse = await fetch('https://formspree.io/f/mpwlvzaj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData),
    });
    
    if (formspreeResponse.ok) {
      console.log('✅ Referral notification email sent successfully via Formspree');
      
      // Update referral document to mark email as sent
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
      const userId = 'TlFwP8hAVwWfypwLu7jWl95dWlm2';
      
      await db.collection('referrals').doc(userId).update({
        emailSent: true,
        emailSentAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Referral document updated with email sent status');
      
    } else {
      console.error('❌ Failed to send referral notification via Formspree:', formspreeResponse.status);
      const errorText = await formspreeResponse.text();
      console.error('Error details:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error sending referral notification:', error);
  }
}

sendReferralNotification().then(() => {
  console.log('🏁 Email notification script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Email script failed:', error);
  process.exit(1);
});
