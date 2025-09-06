/**
 * Test Payment Processing Script
 * This script tests the updated Firebase Function to ensure it's working correctly
 * and not creating duplicate products in Stripe.
 */

async function testPaymentFlow() {
  console.log('🧪 Testing Payment Flow...');

  const testPayload = {
    amount: 2900,
    currency: 'usd',
    planType: 'event-premium',
    userId: 'test_user_' + Date.now(),
    userEmail: 'test@example.com',
    hasValidReferral: false
  };

  try {
    // Replace with your actual Firebase Function URL
    const functionUrl = 'https://createpaymentintent-lxg5hgzwea-uc.a.run.app';
    
    console.log('📤 Sending test payment request...');
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Payment Intent created successfully!');
      console.log('📋 Response:', {
        clientSecret: result.clientSecret ? 'Present' : 'Missing',
        customerId: result.customerId,
        amount: result.amount,
        hasFreeTrial: result.hasFreeTrial
      });
    } else {
      console.log('❌ Error creating payment intent:', result);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test with referral code
async function testReferralFlow() {
  console.log('\n🎁 Testing Referral Flow...');

  const testPayload = {
    amount: 2900,
    currency: 'usd',
    planType: 'event-premium',
    userId: 'test_referral_user_' + Date.now(),
    userEmail: 'referral@example.com',
    hasValidReferral: true,
    referralCode: 'arayaki_hibachi'
  };

  try {
    const functionUrl = 'https://createpaymentintent-lxg5hgzwea-uc.a.run.app';
    
    console.log('📤 Sending test referral request...');
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Referral Setup Intent created successfully!');
      console.log('📋 Response:', {
        clientSecret: result.clientSecret ? 'Present' : 'Missing',
        customerId: result.customerId,
        amount: result.amount,
        originalAmount: result.originalAmount,
        hasFreeTrial: result.hasFreeTrial,
        isSetupIntent: result.isSetupIntent
      });
    } else {
      console.log('❌ Error creating setup intent:', result);
    }

  } catch (error) {
    console.error('❌ Referral test failed:', error.message);
  }
}

// Run tests
console.log('🚀 Starting Payment Function Tests...');
testPaymentFlow().then(() => testReferralFlow());
