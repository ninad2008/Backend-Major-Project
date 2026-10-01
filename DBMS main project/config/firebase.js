const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseApp = null;

const initFirebase = () => {
  try {
    const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[Firebase] Admin SDK initialized successfully');
    } else {
      console.warn('[Firebase Warning] Service account JSON file not found');
    }
  } catch (error) {
    console.error('[Firebase Error] Initialization failed:', error.message);
  }
};

module.exports = { initFirebase, admin };
