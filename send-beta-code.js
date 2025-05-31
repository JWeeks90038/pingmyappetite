const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  const code = "GRUBANA2024"; // or generate a unique code

  const msg = {
    to: email,
    from: 'grubana.co@gmail.com', // Use your verified sender
    subject: 'Your Grubana Beta Access Code',
    text: `Welcome to the Grubana Beta! Your access code is: ${code}`,
  };

  try {
    await sgMail.send(msg);
    res.status(200).json({ message: 'Invite sent!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email.' });
  }
}