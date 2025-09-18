import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
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
      message: 'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost. This includes all truck location data, any events you have created, and any active subscriptions will be canceled.',
      title: 'Delete Account',
      type: 'danger',
      onConfirm: async () => {
        try {
          const currentUser = auth.currentUser;
          const userId = currentUser?.uid;
          
          if (!userId) {
            setAlert({
              isOpen: true,
              message: 'Unable to verify user credentials.',
              type: 'error',
              title: 'Account Deletion Failed'
            });
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
            setAlert({
              isOpen: true,
              message: result.error || 'Failed to delete account. You may need to re-login before deleting your account.',
              type: 'error',
              title: 'Account Deletion Failed'
            });
            return;
          }
          
          console.log('✅ Account deletion completed:', result);
          
          setAlert({
            isOpen: true,
            message: 'Account and all associated data deleted successfully, including any active subscriptions.',
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
    <div className="settings-page" style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', backgroundColor: '#0B0B1A', color: '#FFFFFF' }}>
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

        <div className="settings-item" style={{ marginTop: '10px', backgroundColor: '#1A1036', border: '1px solid #4DBFFF' }}>
          <input
            type="email"
            placeholder="New Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button onClick={handleChangeEmail}>Change Email</button>
        </div>

        <div className="settings-item" style={{ marginTop: '10px', backgroundColor: '#1A1036', border: '1px solid #4DBFFF' }}>
          <button onClick={handleChangePassword}>Send Password Reset Email</button>
          {resetMsg && (
  <p style={{ color: resetMsg.startsWith("Password reset") ? "#00E676" : "#EF4444", marginTop: "10px" }}>
    {resetMsg}
  </p>
)}
        </div>
      </section>
      
      <section style={{ marginTop: '40px', backgroundColor: '#1A1036', padding: '20px', borderRadius: '8px', border: '1px solid #4DBFFF' }}>
        <h2 style={{ color: '#FF4EC9', marginBottom: '15px' }}>Media Uploader</h2>
        <p style={{ fontSize: "0.9rem", color: "#FFFFFF", marginBottom: "10px", opacity: "0.9" }}>
          Upload your truck/logo and menu photos. These will be displayed on your dashboard and map icon.
        </p>
        <MediaUploader showCover={true} showProfile={false} showMenu={true} />
      </section>

      <section style={{ marginTop: '40px', backgroundColor: '#1A1036', padding: '20px', borderRadius: '8px', border: '1px solid #4DBFFF' }}>
        <h2 style={{ color: '#FF4EC9', marginBottom: '15px' }}>Social Media Links</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          <div className="instagram-item" style={{ background: '#1A1036', border: '2px solid #E4405F', borderRadius: '12px', padding: '16px' }}>
            <label style={{ color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#E4405F">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Instagram:
            </label>
            <input
              type="url"
              name="instagram"
              value={socialLinks.instagram}
              onChange={handleChange}
              placeholder="https://instagram.com/yourprofile"
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                backgroundColor: '#0B0B1A', 
                color: '#FFFFFF', 
                border: '1px solid #4DBFFF', 
                borderRadius: '8px',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div className="facebook-item" style={{ background: '#1A1036', border: '2px solid #1877F2', borderRadius: '12px', padding: '16px' }}>
            <label style={{ color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook:
            </label>
            <input
              type="url"
              name="facebook"
              value={socialLinks.facebook}
              onChange={handleChange}
              placeholder="https://facebook.com/yourprofile"
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                backgroundColor: '#0B0B1A', 
                color: '#FFFFFF', 
                border: '1px solid #4DBFFF', 
                borderRadius: '8px',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div className="tiktok-item" style={{ background: '#1A1036', border: '2px solid #000000', borderRadius: '12px', padding: '16px' }}>
            <label style={{ color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000" style={{ background: '#FFFFFF', borderRadius: '4px', padding: '2px' }}>
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
              TikTok:
            </label>
            <input
              type="url"
              name="tiktok"
              value={socialLinks.tiktok}
              onChange={handleChange}
              placeholder="https://tiktok.com/@yourprofile"
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                backgroundColor: '#0B0B1A', 
                color: '#FFFFFF', 
                border: '1px solid #4DBFFF', 
                borderRadius: '8px',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div className="twitter-item" style={{ background: '#1A1036', border: '2px solid #000000', borderRadius: '12px', padding: '16px' }}>
            <label style={{ color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFFFFF">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X (Twitter):
            </label>
            <input
              type="url"
              name="twitter"
              value={socialLinks.twitter}
              onChange={handleChange}
              placeholder="https://x.com/yourprofile"
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                backgroundColor: '#0B0B1A', 
                color: '#FFFFFF', 
                border: '1px solid #4DBFFF', 
                borderRadius: '8px',
                fontSize: '0.95rem'
              }}
            />
          </div>
        </div>
        <br />
        <button onClick={handleSaveSocialLinks}>Save Social Media Links</button>
      </section>

       <section style={{ marginTop: '40px', backgroundColor: '#1A1036', padding: '20px', borderRadius: '8px', border: '1px solid #4DBFFF' }}>
        <h2 style={{ color: '#FF4EC9', marginBottom: '15px' }}>Subscription Management</h2>
        <p style={{ color: '#FFFFFF', marginBottom: '10px' }}>
          <strong>Current Plan:</strong> {
            plan === 'all-access' ? 'All-Access (Paid)' : 
            plan === 'pro' ? 'Pro (Paid)' : 
            'Starter (Free)'
          }
        </p>
        {cardInfo && (
          <p style={{ color: '#FFFFFF', marginBottom: '10px' }}>
            <strong>Card on file:</strong> {cardInfo.brand?.toUpperCase()} ending in {cardInfo.last4}
          </p>
        )}
        <button onClick={handleManageSubscription}>
          Manage Subscription
        </button>
        {stripeMsg && (
          <p style={{ color: "#EF4444", marginTop: "10px" }}>{stripeMsg}</p>
        )}
      </section>

      <section style={{ marginTop: '40px', backgroundColor: '#1A1036', padding: '20px', borderRadius: '8px', border: '1px solid #4DBFFF' }}>
        <h2 style={{ color: '#FF4EC9', marginBottom: '15px' }}>Notifications</h2>
        <label style={{ color: '#FFFFFF', display: 'block', marginBottom: '10px' }}>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={() => setEmailNotifications(!emailNotifications)}
            style={{ marginRight: '8px' }}
          />
          Email Notifications
        </label>
        <br />
        <label style={{ color: '#FFFFFF', display: 'block', marginBottom: '10px' }}>
          <input
            type="checkbox"
            checked={smsNotifications}
            onChange={() => setSmsNotifications(!smsNotifications)}
            style={{ marginRight: '8px' }}
          />
          SMS Notifications
        </label>
        <br />
        <button onClick={saveNotificationPreferences}>Save Notification Settings</button>
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