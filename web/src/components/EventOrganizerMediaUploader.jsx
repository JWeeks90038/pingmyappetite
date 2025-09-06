import React, { useRef, useState, useEffect } from "react";
import { storage, db } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const EventOrganizerMediaUploader = () => {
  const [logoPhoto, setLogoPhoto] = useState(null);
  const [eventSpacePhoto, setEventSpacePhoto] = useState(null);
  const [uploadingType, setUploadingType] = useState(null);

  const logoRef = useRef(null);
  const eventSpaceRef = useRef(null);

  // Fetch the photos from Firestore when the component mounts
  useEffect(() => {
    const fetchPhotos = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userId = currentUser?.uid;

      if (!userId) return;

      console.log('📷 EventOrganizerMediaUploader: Fetching photos for user:', userId);

      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('👤 User data found:', userData);
        console.log('🖼️ Logo URL:', userData.logoUrl);
        console.log('🏢 Event Space URL:', userData.eventSpaceUrl);
        setLogoPhoto(userData.logoUrl || null);
        setEventSpacePhoto(userData.eventSpaceUrl || null);
      } else {
        console.log('❌ User document not found');
      }
    };

    fetchPhotos();
  }, []);

  const handleFileUpload = async (file, fileType) => {
    if (!file) return;

    setUploadingType(fileType);

    const auth = getAuth();
    const currentUser = auth.currentUser;
    const userId = currentUser?.uid;

    if (!userId) {
      console.error("No authenticated user found.");
      setUploadingType(null);
      return;
    }

    const fileName = `${fileType}-${Date.now()}`;
    const fileRef = ref(storage, `uploads/event-organizers/${fileName}`);

    try {
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);

      console.log(`📸 Uploading ${fileType}:`, fileUrl);

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        [`${fileType}Url`]: fileUrl,
      });

      console.log(`✅ Successfully saved ${fileType}Url to user document`);

      if (fileType === "logo") setLogoPhoto(fileUrl);
      if (fileType === "eventSpace") setEventSpacePhoto(fileUrl);
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setUploadingType(null);
    }
  };

  const triggerFileSelect = (ref) => {
    if (ref.current) ref.current.click();
  };

  return (
    <div className="event-organizer-media-uploader">
      {/* Logo Upload */}
      <div className="upload-section">
        <h3>Organization Logo</h3>
        <p className="upload-description">Upload your organization's logo. This will appear in your event markers on the map.</p>
        {logoPhoto && (
          <div className="logo-preview">
            <img
              src={logoPhoto}
              alt="Organization Logo"
              className="logo-image"
            />
            <div className="logo-marker-preview">
              <div className="marker-preview">
                <div className="logo-marker-with-star" style={{ 
                  position: 'relative',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '3px solid #9E9E9E',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  backgroundImage: `url(${logoPhoto})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '16px',
                    height: '16px',
                    background: '#FFD700',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    border: '2px solid white',
                    fontSize: '10px'
                  }}>
                    ⭐
                  </div>
                </div>
                <span className="preview-label">How it appears on map</span>
              </div>
              <div className="status-examples">
                <small style={{ display: 'block', marginTop: '8px', color: '#666' }}>
                  Border colors: 
                  <span style={{ color: '#9E9E9E', fontWeight: 'bold' }}> Gray</span> (draft), 
                  <span style={{ color: '#2196F3', fontWeight: 'bold' }}> Blue</span> (upcoming), 
                  <span style={{ color: '#4CAF50', fontWeight: 'bold' }}> Green</span> (active), 
                  <span style={{ color: '#FF63B5', fontWeight: 'bold' }}> Orange</span> (completed)
                </small>
              </div>
            </div>
          </div>
        )}
        <input
          type="file"
          ref={logoRef}
          style={{ display: "none" }}
          accept="image/*"
          onChange={(e) => handleFileUpload(e.target.files[0], "logo")}
        />
        <button
          onClick={() => triggerFileSelect(logoRef)}
          disabled={uploadingType === "logo"}
          className="upload-button logo-upload-btn"
        >
          {uploadingType === "logo" ? "Uploading..." : logoPhoto ? "Change Logo" : "Upload Logo"}
        </button>
      </div>

      {/* Event Space Photo */}
      <div className="upload-section">
        <h3>Event Space Photo</h3>
        <p className="upload-description">Upload a photo of your event space or venue to help attendees recognize your location.</p>
        {eventSpacePhoto && (
          <img
            src={eventSpacePhoto}
            alt="Event Space"
            className="event-space-image"
          />
        )}
        <input
          type="file"
          ref={eventSpaceRef}
          style={{ display: "none" }}
          accept="image/*"
          onChange={(e) => handleFileUpload(e.target.files[0], "eventSpace")}
        />
        <button
          onClick={() => triggerFileSelect(eventSpaceRef)}
          disabled={uploadingType === "eventSpace"}
          className="upload-button event-space-upload-btn"
        >
          {uploadingType === "eventSpace" ? "Uploading..." : eventSpacePhoto ? "Change Event Space Photo" : "Upload Event Space Photo"}
        </button>
      </div>
    </div>
  );
};

export default EventOrganizerMediaUploader;
