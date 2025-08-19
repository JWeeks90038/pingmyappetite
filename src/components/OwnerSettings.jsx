import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../assets/styles.css";
import MediaUploader from "./MediaUploader"; // Import the MediaUploader component
import Alert from "./Alert";
import Prompt from "./Prompt";
import Confirm from "./Confirm";


const OwnerSettings = ({
  plan,
  cardInfo,
  handleManageSubscription,
  stripeMsg
}) => {
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

  // Modal states
  const [alert, setAlert] = useState({ isOpen: false, message: '', type: 'info', title: '' });
  const [prompt, setPrompt] = useState({ isOpen: false, message: '', field: '', defaultValue: '', title: '' });
  const [confirm, setConfirm] = useState({ isOpen: false, message: '', onConfirm: null, title: '', type: 'warning' });

  const [loading, setLoading] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [resetMsg, setResetMsg] = useState('');
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
      setAlert({
        isOpen: true,
        message: 'Social media links updated successfully!',
        type: 'success',
        title: 'Success'
      });
    } catch (error) {
      console.error("Error updating social links:", error);
      setAlert({
        isOpen: true,
        message: 'Failed to update social media links. Please try again.',
        type: 'error',
        title: 'Error'
      });
    }
  };

  const editField = async (field) => {
    const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
    setPrompt({
      isOpen: true,
      message: `Enter new ${fieldName.toLowerCase()}:`,
      field: field,
      defaultValue: userProfile[field],
      title: `Edit ${fieldName}`
    });
  };

  const handlePromptConfirm = async (value) => {
    if (value && value.trim()) {
      try {
        await updateDoc(doc(db, "users", userId), { [prompt.field]: value });
        setUserProfile((prev) => ({ ...prev, [prompt.field]: value }));
        setAlert({
          isOpen: true,
          message: 'Information updated successfully!',
          type: 'success',
          title: 'Success'
        });
      } catch (error) {
        console.error("Error updating:", error);
        setAlert({
          isOpen: true,
          message: 'Failed to update information. Please try again.',
          type: 'error',
          title: 'Error'
        });
      }
    }
    setPrompt({ isOpen: false, message: '', field: '', defaultValue: '', title: '' });
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
    setAlert({
      isOpen: true,
      message: 'Verification email sent! Please check your new email and follow the link to confirm the change.',
      type: 'success',
      title: 'Email Change Initiated'
    });
  } catch (error) {
    console.error("Error updating email:", error);
    setResetMsg("Error updating email. Please make sure your password is correct and try again.");
    setAlert({
      isOpen: true,
      message: 'Error updating email. Please make sure your password is correct and try again.',
      type: 'error',
      title: 'Email Change Failed'
    });
  }
};

  const handleChangePassword = async () => {
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setResetMsg("Password reset email sent! Please check your inbox.");
      setAlert({
        isOpen: true,
        message: 'Password reset email sent! Please check your inbox.',
        type: 'success',
        title: 'Password Reset'
      });
    } catch (error) {
      console.error("Error sending reset email:", error);
      setResetMsg("There was an error sending the password reset email. Please try again.");
      setAlert({
        isOpen: true,
        message: 'There was an error sending the password reset email. Please try again.',
        type: 'error',
        title: 'Password Reset Failed'
      });
    }
  };

  const handleDeleteAccount = async () => {
    setConfirm({
      isOpen: true,
      message: 'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.',
      title: 'Delete Account',
      type: 'danger',
      onConfirm: async () => {
        try {
          await auth.currentUser.delete();
          setAlert({
            isOpen: true,
            message: 'Account deleted successfully.',
            type: 'success',
            title: 'Account Deleted'
          });
          setTimeout(() => navigate("/signup"), 2000);
        } catch (error) {
          console.error("Error deleting account:", error);
          setAlert({
            isOpen: true,
            message: 'You may need to re-login before deleting your account.',
            type: 'error',
            title: 'Account Deletion Failed'
          });
        }
      }
    });
  };

  const saveNotificationPreferences = () => {
    setAlert({
      isOpen: true,
      message: 'Notification preferences saved! (This feature will be enhanced in a future update)',
      type: 'info',
      title: 'Preferences Saved'
    });
  };

  const manageSubscription = () => {
    alert("Subscription management coming soon!");
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#media-uploader") {
      const mediaUploaderSection = document.querySelector("h2:contains('Media Uploader')");
      if (mediaUploaderSection) {
        mediaUploaderSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

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
        <h2>Media Uploader</h2>
        <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "10px" }}>
          Upload your truck and menu photos. These will be displayed on your dashboard and map icon.
        </p>
        <MediaUploader showCover={true} showProfile={false} showMenu={true} />
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
          X (Twitter):
          <input
            type="url"
            name="twitter"
            value={socialLinks.twitter}
            onChange={handleChange}
            placeholder="https://x.com/yourprofile"
          />
        </label>
        <br />
        <button onClick={handleSaveSocialLinks}>Save Social Media Links</button>
      </section>

       <section style={{ marginTop: '40px' }}>
        <h2>Subscription Management</h2>
        <p>
          <strong>Current Plan:</strong> {
            plan === 'all-access' ? 'All-Access (Paid)' : 
            plan === 'pro' ? 'Pro (Paid)' : 
            'Basic (Free)'
          }
        </p>
        {cardInfo && (
          <p>
            <strong>Card on file:</strong> {cardInfo.brand?.toUpperCase()} ending in {cardInfo.last4}
          </p>
        )}
        <button onClick={handleManageSubscription}>
          Manage Subscription
        </button>
        {stripeMsg && (
          <p style={{ color: "red", marginTop: "10px" }}>{stripeMsg}</p>
        )}
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

      {/* Custom Modals */}
      <Alert
        isOpen={alert.isOpen}
        onClose={() => setAlert({ isOpen: false, message: '', type: 'info', title: '' })}
        message={alert.message}
        type={alert.type}
        title={alert.title}
      />

      <Prompt
        isOpen={prompt.isOpen}
        onClose={() => setPrompt({ isOpen: false, message: '', field: '', defaultValue: '', title: '' })}
        onConfirm={handlePromptConfirm}
        message={prompt.message}
        defaultValue={prompt.defaultValue}
        title={prompt.title}
      />

      <Confirm
        isOpen={confirm.isOpen}
        onClose={() => setConfirm({ isOpen: false, message: '', onConfirm: null, title: '', type: 'warning' })}
        onConfirm={confirm.onConfirm}
        message={confirm.message}
        title={confirm.title}
        type={confirm.type}
        confirmText="Delete Account"
        cancelText="Cancel"
      />
    </div>
  );
};

export default OwnerSettings;