// Debug script to test the customer portal endpoint
const fetch = require('node-fetch');

const testCustomerPortal = async () => {
  const API_URL = 'https://pingmyappetite-production.up.railway.app';
  const uid = 'vtXnkYhgHiTYg62Xihb8rFepdDh2'; // Your user ID
  
  try {

    
    const response = await fetch(`${API_URL}/create-customer-portal-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    
    const data = await response.json();
    

    
    if (response.ok) {

    } else {

    }
    
  } catch (error) {

  }
};

testCustomerPortal();
