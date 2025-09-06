import express from 'express';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBzTNlQMkIiK1_IOphDwE34L2kzpdMQWD8",
    authDomain: "foodtruckfinder-27eba.firebaseapp.com",
    projectId: "foodtruckfinder-27eba",
    storageBucket: "foodtruckfinder-27eba.appspot.com",
    messagingSenderId: "418485074487",
    appId: "1:418485074487:web:14b0febd3cca4e724b1db2",
    measurementId: "G-MHVKR07V99"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


// Create an Express router
const router = express.Router();

export { auth, db, storage };

// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

       // console.log("User logged in:", user.uid);
        res.status(200).send({ message: "Login successful", userId: user.uid });
    } catch (error) {
        console.error("Login failed:", error.message);
        res.status(401).send({ error: "Invalid credentials" });
    }
});

// Export the router
export default router;