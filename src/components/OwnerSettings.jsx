import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail, updateEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../assets/styles.css";

const OwnerSettings = () => {
  const [userProfile, setUserProfile] = useState({
    truckName: "Loading...",
    ownerName: "Loading...",
    email: "Loading...",
    phone: "Loading...",
    location: "Loading...",
    cuisine: "Loading...",
    hours: "Loading...",
    description: "Loading...",
    subscriptionStatus: "Loading...",
    paymentMethod: "Loading...",
  });

  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    facebook: '',
    tiktok: '',
    twitter: '',
  });

  const [loading, setLoading] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (userId) {
      loadUserProfile();
      fetchSocialLinks();
    } else {
      navigate("/login");
    }
  }, [userId, navigate]);

  const loadUserProfile = async () => {
    try {
      const docSnap = await getDoc(doc(db, "users", userId));
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchSocialLinks = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSocialLinks({
          instagram: userData.instagram || '',
          facebook: userData.facebook || '',
          tiktok: userData.tiktok || '',
          twitter: userData.twitter || '',
        });
      }
    } catch (error) {
      console.error("Error fetching social links:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSocialLinks((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveSocialLinks = async () => {
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, socialLinks);
      alert("Social media links updated successfully!");
    } catch (error) {
      console.error("Error updating social links:", error);
    }
  };

  const editField = async (field) => {
    const newValue = prompt(`Edit ${field.replace("-", " ")}:`, userProfile[field]);
    if (newValue) {
      try {
        await updateDoc(doc(db, "users", userId), { [field]: newValue });
        setUserProfile((prev) => ({ ...prev, [field]: newValue }));
        alert("Updated successfully!");
      } catch (error) {
        console.error("Error updating:", error);
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

    await updateEmail(auth.currentUser, newEmail);
    setResetMsg("Email updated successfully!");
    loadUserProfile();
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

  const saveNotificationPreferences = () => {
    alert("Notification preferences saved! (future enhancement)");
  };

  const manageSubscription = () => {
    alert("Subscription management coming soon!");
  };

  if (loading) {
    return <p>Loading settings...</p>;
  }

  return (
    <div className="settings-page" style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
      <section>
        <h2>Account Information</h2>
        {[
          "truckName",
          "ownerName",
          "phone",
          "location",
          "cuisine",
          "hours",
          "description"
        ].map(field => (
          <div key={field} className="settings-item">
            <label>{field.charAt(0).toUpperCase() + field.slice(1)}:</label>
            <span> {userProfile[field]} </span>
            <button onClick={() => editField(field)}>Edit</button>
          </div>
        ))}
        <div className="settings-item">
          <label>Email:</label>
          <span> {userProfile.email} </span>
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
        <h2>Social Media Links</h2>
        <label>
          Instagram:
          <input
            type="url"
            name="instagram"
            value={socialLinks.instagram}
            onChange={handleChange}
            placeholder="https://instagram.com/yourprofile"
          />
        </label>
        <br />
        <label>
          Facebook:
          <input
            type="url"
            name="facebook"
            value={socialLinks.facebook}
            onChange={handleChange}
            placeholder="https://facebook.com/yourprofile"
          />
        </label>
        <br />
        <label>
          TikTok:
          <input
            type="url"
            name="tiktok"
            value={socialLinks.tiktok}
            onChange={handleChange}
            placeholder="https://tiktok.com/@yourprofile"
          />
        </label>
        <br />
        <label>
          Twitter:
          <input
            type="url"
            name="twitter"
            value={socialLinks.twitter}
            onChange={handleChange}
            placeholder="https://twitter.com/yourprofile"
          />
        </label>
        <br />
        <button onClick={handleSaveSocialLinks}>Save Social Media Links</button>
      </section>

      <section style={{ marginTop: '40px' }}>
        <h2>Subscription Information</h2>
        <p>Status: <strong>{userProfile.subscriptionStatus}</strong></p>
        <p>Payment Method: <strong>{userProfile.paymentMethod}</strong></p>
        <button onClick={manageSubscription}>Manage Subscription</button>
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
        <br />
        <button onClick={saveNotificationPreferences}>Save Notification Settings</button>
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

export default OwnerSettings;