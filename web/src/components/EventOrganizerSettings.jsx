import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../assets/styles.css";
import EventOrganizerMediaUploader from "./EventOrganizerMediaUploader";
import Alert from "./Alert";
import Prompt from "./Prompt";
import Confirm from "./Confirm";

const EventOrganizerSettings = ({
  plan,
  cardInfo,
  handleManageSubscription,
  stripeMsg
}) => {
  const [userProfile, setUserProfile] = useState({
    organizationName: "Loading...",
    ownerName: "Loading...",
    email: "Loading...",
    phone: "Loading...",
    location: "Loading...",
    website: "Loading...",
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

  const handleEditProfile = (field, currentValue, title) => {
    setPrompt({
      isOpen: true,
      field,
      defaultValue: currentValue,
      message: `Enter new ${title.toLowerCase()}:`,
      title: `Edit ${title}`
    });
  };

  const handleSaveProfile = async (field, value) => {
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { [field]: value });
      setUserProfile(prev => ({ ...prev, [field]: value }));
      setAlert({
        isOpen: true,
        message: 'Profile updated successfully!',
        type: 'success',
        title: 'Success'
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      setAlert({
        isOpen: true,
        message: 'Failed to update profile. Please try again.',
        type: 'error',
        title: 'Error'
      });
    }
  };

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setResetMsg('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setResetMsg('Error sending password reset email. Please try again.');
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail) {
      setAlert({
        isOpen: true,
        message: 'Please enter a new email address.',
        type: 'warning',
        title: 'Missing Email'
      });
      return;
    }

    setConfirm({
      isOpen: true,
      message: `Are you sure you want to change your email to ${newEmail}? You will need to verify the new email address.`,
      title: 'Confirm Email Change',
      onConfirm: async () => {
        try {
          await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
          setAlert({
            isOpen: true,
            message: 'Verification email sent! Please check your new email and click the verification link.',
            type: 'info',
            title: 'Verification Required'
          });
          setNewEmail("");
        } catch (error) {
          console.error('Error updating email:', error);
          setAlert({
            isOpen: true,
            message: `Error updating email: ${error.message}`,
            type: 'error',
            title: 'Error'
          });
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <h1>Event Organizer Settings</h1>
      
      {/* Organization Profile Section */}
      <div className="settings-section">
        <h2>Organization Profile</h2>
        {[
          "organizationName",
          "ownerName", 
          "phone",
          "location",
          "website",
          "description"
        ].map(field => {
          const fieldValue = field === "organizationName" 
            ? (userProfile.organizationName || userProfile.truckName || 'Not set')
            : (userProfile[field] || 'Not set');
          const fieldLabel = field === "organizationName" 
            ? "Organization Name"
            : field === "ownerName"
            ? "Contact Name"
            : field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
          
          return (
            <div key={field} className="settings-item">
              <label>{fieldLabel}:</label>
              <span> {fieldValue} </span>
              <button onClick={() => handleEditProfile(field, fieldValue, fieldLabel)}>Edit</button>
            </div>
          );
        })}
      </div>

      {/* Organization Media Section */}
      <div className="settings-section">
        <h2>Organization Media</h2>
        <p className="section-description">Upload your organization logo and event space photos. Your logo will appear in event markers on the map.</p>
        <EventOrganizerMediaUploader />
      </div>

      {/* Social Media Links Section */}
      <div className="settings-section">
        <h2>Social Media Links</h2>
        <p className="section-description">Add your social media links to display on your event information.</p>
        <div className="social-links-grid">
          <div className="social-link-item">
            <label htmlFor="facebook">📘 Facebook:</label>
            <input
              type="url"
              id="facebook"
              name="facebook"
              value={socialLinks.facebook}
              onChange={handleChange}
              placeholder="https://facebook.com/yourpage"
              className="social-input"
            />
          </div>

          <div className="social-link-item">
            <label htmlFor="instagram">📷 Instagram:</label>
            <input
              type="url"
              id="instagram"
              name="instagram"
              value={socialLinks.instagram}
              onChange={handleChange}
              placeholder="https://instagram.com/youraccount"
              className="social-input"
            />
          </div>

          <div className="social-link-item">
            <label htmlFor="tiktok">🎵 TikTok:</label>
            <input
              type="url"
              id="tiktok"
              name="tiktok"
              value={socialLinks.tiktok}
              onChange={handleChange}
              placeholder="https://tiktok.com/@youraccount"
              className="social-input"
            />
          </div>

          <div className="social-link-item">
            <label htmlFor="twitter">❌ X (Twitter):</label>
            <input
              type="url"
              id="twitter"
              name="twitter"
              value={socialLinks.twitter}
              onChange={handleChange}
              placeholder="https://x.com/youraccount"
              className="social-input"
            />
          </div>
        </div>
        <button onClick={handleSaveSocialLinks} className="save-btn">
          💾 Save Social Media Links
        </button>
      </div>

      {/* Account Settings Section */}
      <div className="settings-section">
        <h2>Account Settings</h2>
        <div className="account-settings">
          <div className="account-item">
            <label>Email Address:</label>
            <div className="email-section">
              <span className="current-email">{userProfile.email}</span>
              <div className="email-change">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email"
                  className="email-input"
                />
                <button onClick={handleEmailChange} className="change-email-btn">
                  Change Email
                </button>
              </div>
            </div>
          </div>

          <div className="account-item">
            <label>Password:</label>
            <div className="password-section">
              <button onClick={handlePasswordReset} className="reset-password-btn">
                🔐 Send Password Reset Email
              </button>
              {resetMsg && <p className="reset-message">{resetMsg}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="settings-section">
        <h2>Notification Preferences</h2>
        <div className="notification-settings">
          <div className="notification-item">
            <label>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              📧 Email Notifications
            </label>
            <span className="notification-description">Receive emails about event applications and updates</span>
          </div>

          <div className="notification-item">
            <label>
              <input
                type="checkbox"
                checked={smsNotifications}
                onChange={(e) => setSmsNotifications(e.target.checked)}
              />
              📱 SMS Notifications
            </label>
            <span className="notification-description">Receive text messages for urgent event updates</span>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="settings-section">
        <h2>Subscription & Billing</h2>
        <div className="subscription-info">
          <div className="subscription-details">
            <p><strong>Current Plan:</strong> {plan || 'Loading...'}</p>
            <p><strong>Payment Method:</strong> {cardInfo ? `**** **** **** ${cardInfo.last4}` : 'No card on file'}</p>
          </div>
          <button onClick={handleManageSubscription} className="manage-subscription-btn">
            💳 Manage Subscription
          </button>
          {stripeMsg && <p className="stripe-message">{stripeMsg}</p>}
        </div>
      </div>

      {/* Modals */}
      <Alert
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        message={alert.message}
        type={alert.type}
        title={alert.title}
      />

      <Prompt
        isOpen={prompt.isOpen}
        onClose={() => setPrompt({ ...prompt, isOpen: false })}
        onConfirm={(value) => {
          handleSaveProfile(prompt.field, value);
          setPrompt({ ...prompt, isOpen: false });
        }}
        message={prompt.message}
        defaultValue={prompt.defaultValue}
        title={prompt.title}
      />

      <Confirm
        isOpen={confirm.isOpen}
        onClose={() => setConfirm({ ...confirm, isOpen: false })}
        onConfirm={() => {
          if (confirm.onConfirm) confirm.onConfirm();
          setConfirm({ ...confirm, isOpen: false });
        }}
        message={confirm.message}
        title={confirm.title}
        type={confirm.type}
      />
    </div>
  );
};

export default EventOrganizerSettings;
