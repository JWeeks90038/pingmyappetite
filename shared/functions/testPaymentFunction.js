/**
 * Test Payment Processing Script
 * This script tests the updated Firebase Function to ensure it's working correctly
 * and not creating duplicate products in Stripe.
 */

async function testPaymentFlow() {


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
    

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    if (response.ok) {
    
    } else {
    }

  } catch (error) {

  }
}

// Test with referral code
async function testReferralFlow() {


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
    
 
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    if (response.ok) {

    } else {

    }

  } catch (error) {

  }
}



testPaymentFlow().then(() => testReferralFlow());
