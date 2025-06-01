import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    await sgMail.send({
      to: email,
      from: 'grubana.co@gmail.com',
      subject: 'Beta Access Invite',
      text: 'You have been invited to the Grubana beta!',
      html: '<strong>You have been invited to the Grubana beta!</strong>',
    });

    res.status(200).json({ message: 'Invite sent successfully' });
  } catch (err) {
    console.error("Send Invite Error:", err);
    res.status(500).json({ message: "Failed to send invite" });
  }
}