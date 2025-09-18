import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { sendPasswordResetEmail, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { validatePhoneNumber } from '../utils/phoneValidation';
import "../assets/styles.css";

<div id="top"></div>

const CustomerSettings = () => {
  const [userProfile, setUserProfile] = useState({
    email: "Loading...",
    phone: "Loading...",
  });

  const [newEmail, setNewEmail] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [resetMsg, setResetMsg] = useState('');
  const [notificationUpdateMsg, setNotificationUpdateMsg] = useState('');
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
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUserProfile(userData);
        
        // Load notification preferences
        const notifPrefs = userData.notificationPreferences || {};
        setEmailNotifications(notifPrefs.emailNotifications !== false);
        setSmsNotifications(notifPrefs.smsNotifications !== false);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const editPhone = async () => {
    const newPhone = prompt("Edit Phone Number:", userProfile.phone);
    if (newPhone) {
      // Validate phone number
      if (!validatePhoneNumber(newPhone)) {
        alert("Please enter a valid US phone number (10 digits)");
        return;
      }
      
      try {
        await updateDoc(doc(db, "users", userId), { phone: newPhone });
        setUserProfile(prev => ({ ...prev, phone: newPhone }));
        alert("Phone number updated!");
      } catch (error) {
        console.error("Error updating phone:", error);
        alert("Error updating phone number. Please try again.");
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

  const updateNotificationPreferences = async (emailEnabled, smsEnabled) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        "notificationPreferences.emailNotifications": emailEnabled,
        "notificationPreferences.smsNotifications": smsEnabled
      });
      
      setNotificationUpdateMsg("✅ Notification preferences updated!");
      setTimeout(() => setNotificationUpdateMsg(''), 3000);
      
      console.log('📧 Notification preferences updated:', { emailEnabled, smsEnabled });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      setNotificationUpdateMsg("❌ Error updating preferences. Please try again.");
      setTimeout(() => setNotificationUpdateMsg(''), 3000);
    }
  };

  const handleEmailNotificationChange = (checked) => {
    setEmailNotifications(checked);
    updateNotificationPreferences(checked, smsNotifications);
  };

  const handleSmsNotificationChange = (checked) => {
    setSmsNotifications(checked);
    updateNotificationPreferences(emailNotifications, checked);
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.confirm("Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost, including any active subscriptions.");
    if (confirmation) {
      try {
        const currentUser = auth.currentUser;
        const userId = currentUser?.uid;
        
        if (!userId) {
          alert('Unable to verify user credentials.');
          return;
        }

        // Get ID token for verification
        const idToken = await currentUser.getIdToken();
        
        // Call Firebase Function to handle complete account deletion
        console.log('🗑️ Calling account deletion function...');
        const response = await fetch('https://us-central1-foodtruckfinder-27eba.cloudfunctions.net/deleteUserAccount', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            idToken: idToken
          }),
        });

        const result = await response.json();
        
        if (!response.ok || result.error) {
          console.error('Account deletion failed:', result.error);
          alert(result.error || 'Failed to delete account. You may need to re-login before deleting your account.');
          return;
        }
        
        console.log('✅ Account deletion completed:', result);
        
        alert("Account and all associated data deleted successfully, including any active subscriptions.");
        navigate("/signup");
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("You may need to re-login before deleting your account.");
      }
    }
  };

  return (
    <div className="settings-page" style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', backgroundColor: '#0B0B1A', color: '#FFFFFF' }}>
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
  <p style={{ color: resetMsg.startsWith("Password reset") ? "#00E676" : "#EF4444", marginTop: "10px" }}>
    {resetMsg}
  </p>
)}
        </div>
      </section>

      <section style={{ marginTop: '40px', backgroundColor: '#1A1036', padding: '20px', borderRadius: '8px', border: '1px solid #4DBFFF' }}>
        <h2 style={{ color: '#FF4EC9', marginBottom: '15px' }}>Notifications</h2>
        {notificationUpdateMsg && (
          <p style={{ 
            color: notificationUpdateMsg.includes('✅') ? '#00E676' : '#EF4444', 
            marginBottom: '10px', 
            fontWeight: 'bold' 
          }}>
            {notificationUpdateMsg}
          </p>
        )}
        <label style={{ display: 'block', marginBottom: '10px', color: '#FFFFFF' }}>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => handleEmailNotificationChange(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          📧 Email Notifications
        </label>
        <label style={{ display: 'block', marginBottom: '10px', color: '#FFFFFF' }}>
          <input
            type="checkbox"
            checked={smsNotifications}
            onChange={(e) => handleSmsNotificationChange(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          📱 SMS Notifications {!userProfile.phone && <span style={{ color: '#FB923C' }}>(Add phone number to enable)</span>}
        </label>
        <p style={{ fontSize: '14px', color: '#FFFFFF', marginTop: '10px', opacity: '0.9' }}>
          Choose how you'd like to receive notifications about your favorite food trucks, deals, and updates.
        </p>
      </section>

      <section style={{ marginTop: '40px', backgroundColor: '#DC2626', padding: '20px', borderRadius: '8px', border: '2px solid #EF4444' }}>
        <h2 style={{ color: '#FFFFFF' }}>Danger Zone</h2>
        <button onClick={handleDeleteAccount} style={{ backgroundColor: '#991B1B', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '6px' }}>
          Delete Account
        </button>
      </section>

      <a
  href="#"
  onClick={e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
  style={{
    display: "inline-block",
    margin: "30px auto 0 auto",
    color: "#2c6f57",
    textDecoration: "underline",
    cursor: "pointer",
    fontWeight: "bold"
  }}
>
  Back to Top ↑
</a>
    </div>
  );
};

export default CustomerSettings;
