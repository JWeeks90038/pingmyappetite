import sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  // You may need to adjust the path to your serviceAccountKey.json
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  // Generate a unique 6-character code
  const code = uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase();

  // Store code and email in Firestore
  await db.collection("betaCodes").doc(code).set({
    email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    used: false,
  });

  try {
    await sgMail.send({
      to: email,
      from: 'team@grubana.com',
      subject: 'Your Grubana Beta Access Code',
      text: `Welcome to the Grubana Beta! Your access code is: ${code}`,
      html: `<strong>Welcome to the Grubana Beta!</strong><br>Your access code is: <b>${code}</b>`,
    });

    res.status(200).json({ message: 'Invite sent successfully' });
  } catch (err) {
    console.error("Send Invite Error:", err);
    res.status(500).json({ message: "Failed to send invite" });
  }
}