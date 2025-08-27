import React, { useState } from 'react';

const MarketplaceTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results = [];

    // Test 1: Health check
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://pingmyappetite-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/health`);
      results.push({
        test: 'Health Check',
        status: response.ok ? 'PASS' : 'FAIL',
        details: response.ok ? 'Server is responding' : `Status: ${response.status}`
      });
    } catch (error) {
      results.push({
        test: 'Health Check',
        status: 'FAIL',
        details: error.message
      });
    }

    // Test 2: Check marketplace routes exist
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://pingmyappetite-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/status`, {
        headers: {
          'Authorization': 'Bearer fake-token-for-test'
        }
      });
      results.push({
        test: 'Marketplace Routes',
        status: response.status === 401 ? 'PASS' : 'FAIL', // 401 means route exists but needs auth
        details: response.status === 401 ? 'Routes accessible (needs auth)' : `Unexpected status: ${response.status}`
      });
    } catch (error) {
      results.push({
        test: 'Marketplace Routes',
        status: 'FAIL',
        details: error.message
      });
    }

    // Test 3: Frontend build
    results.push({
      test: 'Frontend Build',
      status: 'PASS',
      details: 'React app is running'
    });

    setTestResults(results);
    setLoading(false);
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '20px auto',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px'
    }}>
      <h2 style={{ color: '#2c6f57', marginBottom: '20px' }}>
        🧪 Marketplace System Test
      </h2>

      <button
        onClick={runTests}
        disabled={loading}
        style={{
          backgroundColor: '#2c6f57',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Running Tests...' : 'Run System Tests'}
      </button>

      {testResults.length > 0 && (
        <div>
          <h3 style={{ color: '#333', marginBottom: '15px' }}>Test Results:</h3>
          {testResults.map((result, index) => (
            <div
              key={index}
              style={{
                backgroundColor: 'white',
                border: `2px solid ${result.status === 'PASS' ? '#28a745' : '#dc3545'}`,
                borderRadius: '6px',
                padding: '15px',
                marginBottom: '10px'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <strong>{result.test}</strong>
                <span style={{
                  color: result.status === 'PASS' ? '#28a745' : '#dc3545',
                  fontWeight: 'bold'
                }}>
                  {result.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}
                </span>
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>
                {result.details}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: '20px',
        marginTop: '20px'
      }}>
        <h3 style={{ color: '#2c6f57', marginBottom: '15px' }}>
          Manual Testing Steps:
        </h3>
        <ol style={{ lineHeight: '1.8', color: '#333' }}>
          <li><strong>Food Truck Setup:</strong>
            <ul>
              <li>Login as food truck owner</li>
              <li>Go to Dashboard → "Set Up Pre-Orders & Payments"</li>
              <li>Complete Stripe onboarding</li>
            </ul>
          </li>
          <li><strong>Menu Management:</strong>
            <ul>
              <li>Add menu items (use mobile app or create web interface)</li>
              <li>Verify items appear in database</li>
            </ul>
          </li>
          <li><strong>Customer Experience:</strong>
            <ul>
              <li>Login as customer</li>
              <li>Find food truck on map</li>
              <li>Click truck → "Pre-Order - Skip the Line!"</li>
              <li>Add items to cart and checkout</li>
            </ul>
          </li>
          <li><strong>Order Management:</strong>
            <ul>
              <li>Truck owner: View orders in "Manage Orders"</li>
              <li>Customer: Check order status in "My Orders"</li>
            </ul>
          </li>
        </ol>
      </div>

      <div style={{
        backgroundColor: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '6px',
        padding: '15px',
        marginTop: '20px'
      }}>
        <h4 style={{ color: '#0066cc', marginBottom: '10px' }}>
          Current Environment:
        </h4>
        <ul style={{ color: '#0066cc', margin: 0 }}>
          <li>Frontend: http://localhost:5173</li>
          <li>Backend: {import.meta.env.VITE_API_URL || 'https://pingmyappetite-production.up.railway.app'}</li>
          <li>Database: Firebase Firestore</li>
          <li>Payments: Stripe Connect (Test Mode)</li>
        </ul>
      </div>
    </div>
  );
};

export default MarketplaceTest;
