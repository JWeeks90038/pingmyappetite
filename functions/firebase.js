const admin = require("firebase-admin");

// Initialize Firebase Admin if not already initialized
try {
  if (!admin.apps.length) {
    // Construct service account config from environment variables
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('Firebase Admin initialized successfully with project:', process.env.FIREBASE_PROJECT_ID);
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  console.error('Project ID:', process.env.FIREBASE_PROJECT_ID);
  console.error('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
  throw error;
}

const firestore = admin.firestore();

module.exports = { firestore };
