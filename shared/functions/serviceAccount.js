const fs = require('fs');
const path = require('path');

// Write service account from environment variable
exports.initializeServiceAccount = () => {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    const tempPath = path.join(__dirname, 'serviceAccount.json');
    fs.writeFileSync(tempPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
  }
};
