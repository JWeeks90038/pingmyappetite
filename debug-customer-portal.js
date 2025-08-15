// Debug script to test the customer portal endpoint
const fetch = require('node-fetch');

const testCustomerPortal = async () => {
  const API_URL = 'https://pingmyappetite-production.up.railway.app';
  const uid = 'vtXnkYhgHiTYg62Xihb8rFepdDh2'; // Your user ID
  
  try {
    console.log('Testing customer portal endpoint...');
    console.log('API URL:', API_URL);
    console.log('User ID:', uid);
    
    const response = await fetch(`${API_URL}/create-customer-portal-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Success! Portal URL:', data.url);
    } else {
      console.log('❌ Error:', data.error?.message);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
};

testCustomerPortal();
