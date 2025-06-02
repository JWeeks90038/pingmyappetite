import admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  const { code } = req.body;
  if (!code) return res.status(400).json({ valid: false });

  const doc = await db.collection("betaCodes").doc(code.trim().toUpperCase()).get();
  if (doc.exists && !doc.data().used) {
    // Optionally mark as used:
    // await db.collection("betaCodes").doc(code.trim().toUpperCase()).update({ used: true });
    return res.json({ valid: true });
  }
  return res.json({ valid: false });
}