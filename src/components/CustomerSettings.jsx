import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../assets/styles.css";

const CustomerSettings = () => {
  const [userProfile, setUserProfile] = useState({
    email: "Loading...",
    phone: "Loading...",
  });

  const [newEmail, setNewEmail] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [resetMsg, setResetMsg] = useState('');
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (userId) {
      loadUserProfile();
    } else {
      navigate("/login");
    }
  }, [userId, navigate]);

  const loadUserProfile = async () => {
    try {
      const docSnap = await getDoc(doc(db, "users", userId));
      console.log("Document data:", docSnap.data());
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const editPhone = async () => {
    const newPhone = prompt("Edit Phone Number:", userProfile.phone);
    if (newPhone) {
      try {
        await updateDoc(doc(db, "users", userId), { phone: newPhone });
        setUserProfile(prev => ({ ...prev, phone: newPhone }));
        alert("Phone number updated!");
      } catch (error) {
        console.error("Error updating phone:", error);
      }
    }
  };

const handleChangeEmail = async () => {
  try {
    const password = prompt("Please enter your current password to confirm:");
    if (!password) return;

    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      password
    );
    await reauthenticateWithCredential(auth.currentUser, credential);

    await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
    setResetMsg("Verification email sent! Please check your new email and follow the link to confirm the change.");
    setNewEmail("");
  } catch (error) {
    console.error("Error updating email:", error);
    setResetMsg("Error updating email. Please make sure your password is correct and try again.");
  }
};

  const handleChangePassword = async () => {
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setResetMsg("Password reset email sent! Please check your inbox.");
    } catch (error) {
      console.error("Error sending reset email:", error);
      setResetMsg("There was an error sending the password reset email. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.confirm("Are you sure you want to delete your account? This cannot be undone.");
    if (confirmation) {
      try {
        await auth.currentUser.delete();
        alert("Account deleted.");
        navigate("/signup");
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("You may need to re-login before deleting your account.");
      }
    }
  };

  return (
    <div className="settings-page" style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
      <section>
        <h2>Account Information</h2>

        <div className="settings-item">
          <label>Email:</label>
          <span> {userProfile.email} </span>
        </div>

        <div className="settings-item">
          <label>Phone:</label>
          <span> {userProfile.phone} </span>
          <button onClick={editPhone}>Edit</button>
        </div>

        <div className="settings-item" style={{ marginTop: '10px' }}>
          <input
            type="email"
            placeholder="New Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button onClick={handleChangeEmail}>Change Email</button>
        </div>

        <div className="settings-item" style={{ marginTop: '10px' }}>
          <button onClick={handleChangePassword}>Send Password Reset Email</button>
        {resetMsg && (
  <p style={{ color: resetMsg.startsWith("Password reset") ? "green" : "red", marginTop: "10px" }}>
    {resetMsg}
  </p>
)}
        </div>
      </section>

      <section style={{ marginTop: '40px' }}>
        <h2>Notifications</h2>
        <label>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={() => setEmailNotifications(!emailNotifications)}
          />
          Email Notifications
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={smsNotifications}
            onChange={() => setSmsNotifications(!smsNotifications)}
          />
          SMS Notifications
        </label>
      </section>

      <section style={{ marginTop: '40px', backgroundColor: '#ffe6e6', padding: '20px', borderRadius: '8px' }}>
        <h2 style={{ color: 'red' }}>Danger Zone</h2>
        <button onClick={handleDeleteAccount} style={{ backgroundColor: 'red', color: 'white' }}>
          Delete Account
        </button>
      </section>
    </div>
  );
};

export default CustomerSettings;
