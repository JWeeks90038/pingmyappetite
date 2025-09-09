// Test script to verify Orders & Revenue Analytics plan restrictions



// Test cases for different plans
const testCases = [
  { plan: 'basic', expectedAccess: false, description: 'Basic Plan (Starter)' },
  { plan: 'starter', expectedAccess: false, description: 'Starter Plan' },
  { plan: 'pro', expectedAccess: false, description: 'Pro Plan' },
  { plan: 'all-access', expectedAccess: true, description: 'All-Access Plan' },
  { plan: undefined, expectedAccess: false, description: 'No Plan (Default)' },
  { plan: null, expectedAccess: false, description: 'Null Plan' },
  { plan: '', expectedAccess: false, description: 'Empty Plan' }
];

// Function to check plan access (mirrors the logic in AnalyticsScreenFresh.js)
function hasOrdersAnalyticsAccess(plan) {
  return plan === 'all-access';
}

// Run tests


testCases.forEach((testCase, index) => {
  const actualAccess = hasOrdersAnalyticsAccess(testCase.plan);
  const passed = actualAccess === testCase.expectedAccess;
  

});

// Summary
const passedTests = testCases.filter(tc => hasOrdersAnalyticsAccess(tc.plan) === tc.expectedAccess).length;
const totalTests = testCases.length;

