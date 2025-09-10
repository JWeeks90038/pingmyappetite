import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Write service account from environment variable
export const initializeServiceAccount = () => {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    const tempPath = path.join(__dirname, 'serviceAccount.json');
    fs.writeFileSync(tempPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
  }
};
