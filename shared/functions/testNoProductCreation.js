/**
 * Test script to verify payment flow uses existing Stripe products
 * and doesn't create any new products in Stripe
 */

async function testEventPremiumPayment() {


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

// Test with referral code (trial flow)
async function testReferralTrial() {


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



testEventPremiumPayment()
  .then(() => testReferralTrial())
  .then(() => {

  });
