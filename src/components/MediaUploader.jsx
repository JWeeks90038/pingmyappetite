import React, { useRef, useState, useEffect } from "react";
import { storage, db } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const MediaUploader = ({ showProfile, showCover, showMenu }) => {
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [menuFile, setMenuFile] = useState(null);
  const [uploadingType, setUploadingType] = useState(null);

  const profileRef = useRef(null);
  const coverRef = useRef(null);
  const menuRef = useRef(null);

  // Fetch the photos from Firestore when the component mounts
  useEffect(() => {
    const fetchPhotos = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userId = currentUser?.uid;

      if (!userId) return;

      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfilePhoto(userData.profileUrl || null);
        setCoverPhoto(userData.coverUrl || null);
        setMenuFile(userData.menuUrl || null);
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
    const fileRef = ref(storage, `uploads/${fileName}`);

    try {
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        [`${fileType}Url`]: fileUrl,
      });

      if (fileType === "profile") setProfilePhoto(fileUrl);
      if (fileType === "cover") setCoverPhoto(fileUrl);
      if (fileType === "menu") setMenuFile(fileUrl);
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
    <div className="media-uploader media-uploader-container" style={{ textAlign: "center" }}>
      {/* Cover Photo */}
      {showCover && (
        <div className="upload-section" style={{ marginBottom: "1rem" }}>
          {coverPhoto && (
            <img
              src={coverPhoto}
              alt="Cover"
              style={{ width: "100%", maxWidth: "600px", height: "auto", borderRadius: "10px", marginBottom: "0.5rem", objectFit: "cover" }}
            />
          )}
          <input
            type="file"
            ref={coverRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={(e) => handleFileUpload(e.target.files[0], "cover")}
          />
          <button
            onClick={() => triggerFileSelect(coverRef)}
            disabled={uploadingType === "cover"}
            className="upload-button"
          >
            {uploadingType === "cover" ? "Uploading..." : "Upload Truck or Trailer Photo"}
          </button>
        </div>
      )}

      {/* Profile Photo */}
      {showProfile && (
        <div className="upload-section" style={{ marginBottom: "1rem" }}>
          {profilePhoto && (
            <img
              src={profilePhoto}
              alt="Profile"
              style={{ width: "100%", maxWidth: "300px", borderRadius: "10%", marginBottom: "0.5rem" }}
            />
          )}
          <input
            type="file"
            ref={profileRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={(e) => handleFileUpload(e.target.files[0], "profile")}
          />
          <button
            onClick={() => triggerFileSelect(profileRef)}
            disabled={uploadingType === "profile"}
            className="upload-button"
          >
            {uploadingType === "profile" ? "Uploading..." : "Upload Profile Photo"}
          </button>
        </div>
      )}

      {/* Menu File */}
      {showMenu && (
        <div className="upload-section" style={{ marginBottom: "1rem" }}>
          {menuFile && (
            <div style={{ marginBottom: "0.5rem" }}>
              {menuFile.toLowerCase().endsWith(".pdf") ? (
                <p>
                  Menu PDF uploaded:{" "}
                  <a href={menuFile} target="_blank" rel="noopener noreferrer">
                    View Menu
                  </a>
                </p>
              ) : (
                <img
                  src={menuFile}
                  alt="Menu"
                  style={{ width: "100%", maxWidth: "500px", height: "auto", borderRadius: "10px", objectFit: "cover" }}
                />
              )}
            </div>
          )}
          <input
            type="file"
            ref={menuRef}
            style={{ display: "none" }}
            accept="image/*,application/pdf"
            onChange={(e) => handleFileUpload(e.target.files[0], "menu")}
          />
          <button
            onClick={() => triggerFileSelect(menuRef)}
            disabled={uploadingType === "menu"}
            className="upload-button"
          >
            {uploadingType === "menu" ? "Uploading..." : "Upload Menu"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;

