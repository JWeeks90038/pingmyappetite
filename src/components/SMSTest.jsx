import React, { useState, useEffect } from 'react';

const SMSTest = () => {
  const [testPhone, setTestPhone] = useState('');
  const [welcomePhone, setWelcomePhone] = useState('');
  const [username, setUsername] = useState('Test User');
  const [role, setRole] = useState('customer');
  const [plan, setPlan] = useState('basic');
  const [loading, setLoading] = useState('');
  const [results, setResults] = useState({});
  const [functions, setFunctions] = useState(null);
  const [initError, setInitError] = useState(null);

  // Initialize Firebase Functions dynamically
  useEffect(() => {
    const initializeFunctions = async () => {
      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const { app } = await import('../firebase');
        
        const functionsInstance = getFunctions(app, 'us-central1');
        setFunctions({
          testSMS: httpsCallable(functionsInstance, 'testSMS'),
          sendWelcomeSMS: httpsCallable(functionsInstance, 'sendWelcomeSMS')
        });
        console.log('✅ Firebase Functions initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Firebase Functions:', error);
        setInitError(error.message);
      }
    };

    initializeFunctions();
  }, []);

  const showResult = (type, success, message, data = null) => {
    setResults(prev => ({
      ...prev,
      [type]: {
        success,
        message,
        data,
        timestamp: new Date().toLocaleTimeString()
      }
    }));
  };

  const runBasicTest = async () => {
    if (!functions) {
      showResult('basic', false, 'Firebase Functions not initialized yet. Please wait...');
      return;
    }

    if (!testPhone.trim()) {
      showResult('basic', false, 'Please enter a phone number');
      return;
    }

    if (!testPhone.startsWith('+')) {
      showResult('basic', false, 'Phone number must be in E.164 format (start with +)');
      return;
    }

    setLoading('basic');
    try {
      const result = await functions.testSMS({ phoneNumber: testPhone });
      
      if (result.data.success) {
        showResult('basic', true, 
          `SMS sent successfully to ${result.data.to}. Check your phone!`, 
          { messageSid: result.data.messageSid }
        );
      } else {
        showResult('basic', false, result.data.error, result.data);
      }
    } catch (error) {
      showResult('basic', false, `Function call failed: ${error.message}`, error);
    } finally {
      setLoading('');
    }
  };

  const runWelcomeTest = async () => {
    if (!functions) {
      showResult('welcome', false, 'Firebase Functions not initialized yet. Please wait...');
      return;
    }

    if (!welcomePhone.trim() || !username.trim()) {
      showResult('welcome', false, 'Please enter phone number and username');
      return;
    }

    if (!welcomePhone.startsWith('+')) {
      showResult('welcome', false, 'Phone number must be in E.164 format (start with +)');
      return;
    }

    setLoading('welcome');
    try {
      const result = await functions.sendWelcomeSMS({ 
        phoneNumber: welcomePhone, 
        username, 
        role, 
        plan: plan || undefined 
      });
      
      if (result.data.success) {
        showResult('welcome', true, 
          `Welcome SMS sent successfully to ${result.data.to}. Check your phone!`, 
          { messageSid: result.data.messageSid }
        );
      } else {
        showResult('welcome', false, result.data.error, result.data);
      }
    } catch (error) {
      showResult('welcome', false, `Function call failed: ${error.message}`, error);
    } finally {
      setLoading('');
    }
  };

  const ResultDisplay = ({ result }) => {
    if (!result) return null;
    
    return (
      <div className={`result ${result.success ? 'success' : 'error'}`} style={{
        margin: '15px 0',
        padding: '15px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        fontSize: '14px',
        backgroundColor: result.success ? '#d4edda' : '#f8d7da',
        color: result.success ? '#155724' : '#721c24',
        border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`
      }}>
        <strong>{result.success ? '✅ Success!' : '❌ Error!'}</strong><br/>
        {result.message}
        {result.data && (
          <>
            <br/><br/>
            Details: {JSON.stringify(result.data, null, 2)}
          </>
        )}
        <br/>
        <small>Time: {result.timestamp}</small>
      </div>
    );
  };

  if (initError) {
    return (
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h1 style={{ color: '#dc3545', textAlign: 'center' }}>❌ SMS Test Error</h1>
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>Failed to initialize Firebase Functions:</strong><br/>
          {initError}
          <br/><br/>
          <strong>Possible solutions:</strong>
          <ul>
            <li>Make sure Firebase is properly configured</li>
            <li>Check that Firebase Functions are deployed</li>
            <li>Verify internet connection</li>
            <li>Try refreshing the page</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>📱 SMS Testing Dashboard</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px', border: '1px solid #b3d9ff' }}>
        <strong>🔧 Functions Status:</strong> {!functions ? '⏳ Initializing...' : '✅ Ready'}
        <br/>
        <strong>📍 Region:</strong> us-central1
        <br/>
        <strong>🔥 Firebase Project:</strong> foodtruckfinder-27eba
      </div>

      {/* Basic SMS Test */}
      <div style={{ 
        marginBottom: '40px', 
        padding: '20px', 
        border: '2px solid #007bff', 
        borderRadius: '10px',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ color: '#007bff', marginBottom: '15px' }}>📤 Basic SMS Test</h3>
        <p style={{ marginBottom: '15px', color: '#666' }}>
          Send a simple test message to verify SMS functionality.
        </p>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Phone Number (E.164 format):
          </label>
          <input
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+1234567890"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '5px'
            }}
          />
          <small style={{ color: '#666' }}>Format: +[country code][phone number]</small>
        </div>

        <button
          onClick={runBasicTest}
          disabled={loading === 'basic' || !functions}
          style={{
            backgroundColor: loading === 'basic' ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 25px',
            fontSize: '16px',
            borderRadius: '5px',
            cursor: loading === 'basic' || !functions ? 'not-allowed' : 'pointer',
            opacity: loading === 'basic' || !functions ? 0.6 : 1
          }}
        >
          {loading === 'basic' ? '⏳ Sending...' : '📤 Send Test SMS'}
        </button>

        <ResultDisplay result={results.basic} />
      </div>

      {/* Welcome SMS Test */}
      <div style={{ 
        marginBottom: '40px', 
        padding: '20px', 
        border: '2px solid #28a745', 
        borderRadius: '10px',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ color: '#28a745', marginBottom: '15px' }}>🎉 Welcome SMS Test</h3>
        <p style={{ marginBottom: '15px', color: '#666' }}>
          Send a personalized welcome message with user role and plan information.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Phone Number:
            </label>
            <input
              type="tel"
              value={welcomePhone}
              onChange={(e) => setWelcomePhone(e.target.value)}
              placeholder="+1234567890"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Username:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Test User"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              User Role:
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            >
              <option value="customer">Customer</option>
              <option value="owner">Food Truck Owner</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Plan (for owners):
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              disabled={role !== 'owner'}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                opacity: role !== 'owner' ? 0.6 : 1
              }}
            >
              <option value="basic">Basic Plan</option>
              <option value="premium">Premium Plan</option>
            </select>
          </div>
        </div>

        <button
          onClick={runWelcomeTest}
          disabled={loading === 'welcome' || !functions}
          style={{
            backgroundColor: loading === 'welcome' ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            padding: '12px 25px',
            fontSize: '16px',
            borderRadius: '5px',
            cursor: loading === 'welcome' || !functions ? 'not-allowed' : 'pointer',
            opacity: loading === 'welcome' || !functions ? 0.6 : 1
          }}
        >
          {loading === 'welcome' ? '⏳ Sending...' : '🎉 Send Welcome SMS'}
        </button>

        <ResultDisplay result={results.welcome} />
      </div>

      {/* Instructions */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#fff3cd', 
        border: '1px solid #ffeaa7', 
        borderRadius: '8px',
        marginTop: '30px'
      }}>
        <h4 style={{ color: '#856404', marginBottom: '10px' }}>📋 Testing Instructions:</h4>
        <ul style={{ color: '#856404', margin: 0 }}>
          <li>Enter phone numbers in E.164 format (e.g., +1234567890)</li>
          <li>Make sure you have phone access to verify SMS delivery</li>
          <li>Basic test sends a simple "Hello from PingMyAppetite!" message</li>
          <li>Welcome test sends personalized messages based on role and plan</li>
          <li>Check the console for detailed logs and debugging information</li>
        </ul>
      </div>
    </div>
  );
};

export default SMSTest;
