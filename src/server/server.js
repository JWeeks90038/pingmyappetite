import { fileURLToPath } from 'url';
import path from 'path'; // Import path module

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // Get the directory name

import express from "express";
import multer from "multer";
import authRoutes from '../../auth.js'; // Import the authentication routes
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
import cors from "cors";
import { v4 as uuidv4 } from 'uuid';
import admin from "firebase-admin";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);


const app = express();
app.use(cors({
  origin: [
    'https://grubana.com',
    'http://localhost:5173',
    /^https:\/\/.*\.vercel\.app$/ // Allow any Vercel preview deployment
  ],
  credentials: true,
}));
app.use(express.urlencoded({ extended: true })); // Parse from data
app.use(express.json()); // Parse JSON data
app.use('/auth', authRoutes); // Use the authentication routes

app.get('/map', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'map.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/analytics', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

app.get('/checkout', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});

app.get('login-customer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login-customer.html'));
});

app.get('/logout', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'logout.html'));
});

app.get('/messages', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'messages.html'));
});

app.get('/ping-request', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ping-request.html'));
});

app.get('/pricing', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pricing.html'));
});

app.get('/privacy-policy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

app.get('/reviews', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reviews.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/signup-customer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup-customer.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/terms-of-service', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms-of-service.html'));
});

app.get('/truck-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'truck-profile.html'));
});

// Report Spam Endpoint
app.post("/report-spam", async (req, res) => {
    const { pingId } = req.body;
    
    try {
        const ping = await Ping.findById(pingId);
        if (!ping) return res.status(404).json({ message: "Ping not found" });

        ping.reports += 1;
        await ping.save();

        // Check if this ping should be removed
        if (ping.reports >= 3) {
            await Ping.findByIdAndDelete(pingId);
            return res.json({ message: "Ping removed due to spam reports" });
        }

        res.json({ message: "Report received" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Check if User is Allowed to Drop Pins
app.post("/drop-pin", async (req, res) => {
    const { userId, location, cuisine } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent pin drops if restricted
    if (user.isRestricted) return res.status(403).json({ message: "Pin dropping restricted" });

    // Check pin drop limit
    if (user.pinDrops <= 0) {
        user.isRestricted = true;
        await user.save();
        return res.status(403).json({ message: "Too many pin drops. Verification required." });
    }

    // Drop the pin
    await Ping.create({ location, cuisine, userId });
    user.pinDrops -= 1;
    await user.save();

    res.json({ message: "Pin dropped successfully" });
});

// Restore Pin Drop Limits Every Day
setInterval(async () => {
    await User.updateMany({}, { pinDrops: 5, isRestricted: false });
}, 24 * 60 * 60 * 1000); // Reset every 24 hours

// Set up storage for uploaded files (Multer configuration)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Define the directory to store images
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Ensure unique filenames
    }
});

const upload = multer({ storage: storage });

// Serve static files (so images can be accessed via URL)
app.use('/uploads', express.static('uploads'));

// POST route to handle image upload
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    // Send the URL of the uploaded image to the client
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
});

// Route to the Login Page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
}
);

// Route to other pages (adjust paths if needed)
app.get(/index.html/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware to serve static files
app.use(express.static("public"));

// Example API route
app.get("/api/example", (req, res) => {
    res.json({ message: "This is an example API route." });
});

app.post('/create-customer-portal-session', async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: { message: 'No user ID provided.' } });
    }

    // Get the user's Stripe customer ID from Firestore
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: { message: 'User not found.' } });
    }
    const userData = userDoc.data();
    const customerId = userData.stripeCustomerId;
    if (!customerId) {
      return res.status(400).json({ error: { message: 'No Stripe customer ID found for user.' } });
    }

    // Create a portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://www.grubana.com/settings', // Use your production URL
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating customer portal session:', err.message);
    res.status(400).json({ error: { message: err.message } });
  }
});

// Start server
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
   // console.log(`Server is running on http://localhost:${PORT}`);
});
