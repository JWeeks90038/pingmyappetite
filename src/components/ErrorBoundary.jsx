import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Check if it's a Firebase or network related error
    if (error.message && (
      error.message.includes('Firebase') || 
      error.message.includes('firestore') ||
      error.message.includes('network') ||
      error.message.includes('fetch')
    )) {
      console.log('🔥 Network/Firebase error detected in ErrorBoundary');
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          backgroundColor: '#f8d7da',
          color: '#721c24'
        }}>
          <h2>🚨 Something went wrong</h2>
          <p>We're sorry, but something unexpected happened. This might be due to:</p>
          <ul>
            <li>Network connectivity issues</li>
            <li>Temporary server problems</li>
            <li>Browser compatibility issues</li>
          </ul>
          <p>Please try:</p>
          <ul>
            <li>Refreshing the page</li>
            <li>Checking your internet connection</li>
            <li>Clearing your browser cache</li>
          </ul>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2c6f57',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Refresh Page
          </button>
          
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '20px' }}>
              <summary>Error Details (Development Only)</summary>
              <pre style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '3px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
