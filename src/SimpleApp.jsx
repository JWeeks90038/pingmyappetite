import React from 'react';

function SimpleApp() {
  console.log('🎯 Simple App rendered at:', new Date().toISOString());
  
  return (
    <div style={{padding: '20px', fontSize: '18px'}}>
      <h1>Simple Test App</h1>
      <p>Current time: {new Date().toLocaleString()}</p>
      <p>If you see this message stable without refreshing, the issue is in the main App.jsx</p>
      <button onClick={() => window.location.href = '/'}>Back to Main App</button>
    </div>
  );
}

export default SimpleApp;
