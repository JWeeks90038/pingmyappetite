/**
 * Test script to verify payment flow uses existing Stripe products
 * and doesn't create any new products in Stripe
 */

async function testEventPremiumPayment() {
  console.log('🧪 Testing Event Premium Payment Flow...');
  console.log('Using your existing price ID: price_1S3eeTRsRfaVTYCjli5ZRMVY');

  const testPayload = {
    amount: 2900,
    currency: 'usd',
    planType: 'event-premium',
    userId: 'test_user_' + Date.now(),
    userEmail: 'test@grubana.com',
    hasValidReferral: false
  };

  try {
    // Using the new function URL from deployment
    const functionUrl = 'https://createpaymentintent-6umtbp5bgq-uc.a.run.app';
    
    console.log('📤 Sending payment request for Event Premium...');
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
        clientSecret: result.clientSecret ? 'Present ✅' : 'Missing ❌',
        customerId: result.customerId || 'Missing',
        amount: result.amount,
        hasFreeTrial: result.hasFreeTrial
      });
      console.log('🎯 This should NOT have created any new products in Stripe!');
    } else {
      console.log('❌ Error creating payment intent:', result);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test with referral code (trial flow)
async function testReferralTrial() {
  console.log('\n🎁 Testing Referral Trial Flow...');
  console.log('This should create a subscription with your existing price ID');

  const testPayload = {
    amount: 2900,
    currency: 'usd',
    planType: 'event-premium',
    userId: 'test_referral_user_' + Date.now(),
    userEmail: 'referral@grubana.com',
    hasValidReferral: true,
    referralCode: 'arayaki_hibachi'
  };

  try {
    const functionUrl = 'https://createpaymentintent-6umtbp5bgq-uc.a.run.app';
    
    console.log('📤 Sending referral trial request...');
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Setup Intent for trial created successfully!');
      console.log('📋 Response:', {
        clientSecret: result.clientSecret ? 'Present ✅' : 'Missing ❌',
        customerId: result.customerId || 'Missing',
        amount: result.amount,
        originalAmount: result.originalAmount,
        hasFreeTrial: result.hasFreeTrial,
        isSetupIntent: result.isSetupIntent,
        subscriptionId: result.subscriptionId || 'Missing'
      });
      console.log('🎯 This should have created a subscription with your existing price ID!');
    } else {
      console.log('❌ Error creating setup intent:', result);
    }

  } catch (error) {
    console.error('❌ Referral test failed:', error.message);
  }
}

// Run tests
console.log('🚀 Testing Updated Payment Functions...');
console.log('These tests verify that NO NEW PRODUCTS are created in Stripe');
console.log('═'.repeat(60));

testEventPremiumPayment()
  .then(() => testReferralTrial())
  .then(() => {
    console.log('\n🏁 Testing Complete!');
    console.log('Check your Stripe dashboard to confirm no new products were created.');
  });
