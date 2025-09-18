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
      <h1 style={{ textAlign: 'center' }}>Event Organizer Settings</h1>
      
      {/* Organization Profile Section */}
      <div className="settings-section">
        <h2 style={{ textAlign: 'center' }}>Organization Profile</h2>
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
            <div key={field} className="settings-item" style={{ textAlign: 'center' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>{fieldLabel}:</label>
              <span> {fieldValue} </span>
              <button onClick={() => handleEditProfile(field, fieldValue, fieldLabel)}>Edit</button>
            </div>
          );
        })}
      </div>

      {/* Organization Media Section */}
      <div className="settings-section">
        <h2 style={{ textAlign: 'center' }}>Organization Media</h2>
        <p className="section-description" style={{ textAlign: 'center' }}>Upload your organization logo and event space photos. Your logo will appear in event markers on the map.</p>
        <EventOrganizerMediaUploader />
      </div>

      {/* Social Media Links Section */}
      <div className="settings-section">
        <h2 style={{ textAlign: 'center' }}>Social Media Links</h2>
        <p className="section-description" style={{ textAlign: 'center' }}>Add your social media links to display on your event information.</p>
        <div className="social-links-grid">
          <div className="social-link-item facebook-item">
            <label htmlFor="facebook">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook:
            </label>
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

          <div className="social-link-item instagram-item">
            <label htmlFor="instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Instagram:
            </label>
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

          <div className="social-link-item tiktok-item">
            <label htmlFor="tiktok">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
              TikTok:
            </label>
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

          <div className="social-link-item twitter-item">
            <label htmlFor="twitter">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X (Twitter):
            </label>
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
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={handleSaveSocialLinks} className="save-btn">
            💾 Save Social Media Links
          </button>
        </div>
      </div>

      {/* Account Settings Section */}
      <div className="settings-section">
        <h2 style={{ textAlign: 'center' }}>Account Settings</h2>
        <div className="account-settings">
          <div className="account-item">
            <label style={{ textAlign: 'center', display: 'block' }}>Email Address:</label>
            <div className="email-section" style={{ textAlign: 'center' }}>
              <span className="current-email">{userProfile.email}</span>
              <div className="email-change">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email"
                  className="email-input"
                  style={{ textAlign: 'center' }}
                />
                <button onClick={handleEmailChange} className="change-email-btn">
                  Change Email
                </button>
              </div>
            </div>
          </div>

          <div className="account-item">
            <label style={{ textAlign: 'center', display: 'block' }}>Password:</label>
            <div className="password-section" style={{ textAlign: 'center' }}>
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
        <h2 style={{ textAlign: 'center' }}>Notification Preferences</h2>
        <div className="notification-settings" style={{ textAlign: 'center' }}>
          <div className="notification-item" style={{ textAlign: 'center', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              📧 Email Notifications
            </label>
            <span className="notification-description" style={{ display: 'block', marginTop: '5px' }}>Receive emails about event applications and updates</span>
          </div>

          <div className="notification-item" style={{ textAlign: 'center', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={smsNotifications}
                onChange={(e) => setSmsNotifications(e.target.checked)}
              />
              📱 SMS Notifications
            </label>
            <span className="notification-description" style={{ display: 'block', marginTop: '5px' }}>Receive text messages for urgent event updates</span>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="settings-section">
        <h2 style={{ textAlign: 'center' }}>Subscription & Billing</h2>
        <div className="subscription-info" style={{ textAlign: 'center' }}>
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
