import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import "../assets/NewDropForm.css";

const NewDropForm = ({ truckLat, truckLng }) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    quantity: 10,
    expiresInMinutes: 60,
  });

  const [location, setLocation] = useState({
    
    lat: truckLat || null,
    lng: truckLng || null,
  });

  const [creationMessage, setCreationMessage] = useState("");

  useEffect(() => {
  // Log currentUser to confirm authentication
  console.log("🔍 NewDropForm - Current user UID:", auth.currentUser?.uid);

  if (currentUser) {
    // Fetch and log custom claims to check isTruckOwner
    currentUser.getIdTokenResult()
      .then((idTokenResult) => {
        console.log("🔍 NewDropForm - Custom Claims:", idTokenResult.claims);
        console.log("🔍 NewDropForm - Has isTruckOwner:", !!idTokenResult.claims.isTruckOwner);
      })
      .catch((error) => {
        console.error("❌ Error fetching ID token result:", error);
      });
  }

  if (!truckLat || !truckLng) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => console.warn("Geolocation error:", err)
    );
  }
}, [currentUser, truckLat, truckLng]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.name === "quantity" || e.target.name === "expiresInMinutes"
        ? parseInt(e.target.value)
        : e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert("You must be logged in to create a drop.");
      return;
    }

    console.log("🔄 Refreshing auth token to get latest custom claims...");
    try {
      // Force refresh the auth token to get updated custom claims
      await currentUser.getIdToken(true);
      console.log("✅ Auth token refreshed successfully");
      
      // Get the latest token result
      const idTokenResult = await currentUser.getIdTokenResult();
      console.log("🔍 Latest Custom Claims:", idTokenResult.claims);
      console.log("🔍 Has isTruckOwner:", !!idTokenResult.claims.isTruckOwner);
      
      if (!idTokenResult.claims.isTruckOwner) {
        alert("Error: You don't have permission to create drops. Please contact support.");
        console.error("❌ Missing isTruckOwner claim after token refresh");
        return;
      }
    } catch (tokenError) {
      console.error("❌ Error refreshing token:", tokenError);
      alert("Error refreshing authentication. Please try logging out and back in.");
      return;
    }

    const expiresAt = Timestamp.fromDate(new Date(Date.now() + formData.expiresInMinutes * 60 * 1000));

    const drop = {
      title: formData.title,
      description: formData.description,
      truckId: currentUser.uid,
      lat: location.lat,
      lng: location.lng,
      quantity: formData.quantity,
      expiresAt,
      claimedBy: [],
      createdAt: serverTimestamp(),
    };

    console.log("🚀 NewDropForm - Submitting drop:", drop);
    console.log("🚀 NewDropForm - User UID:", currentUser.uid);
    console.log("🚀 NewDropForm - Location:", { lat: location.lat, lng: location.lng });

    try {
      await addDoc(collection(db, "drops"), drop);
      console.log("✅ Drop created successfully!");
      setFormData({ title: "", description: "", quantity: 10, expiresInMinutes: 60 });
      setCreationMessage("Drop created!");
setTimeout(() => setCreationMessage(""), 5000);
    } catch (err) {
      console.error("❌ Error creating drop:", err);
      console.error("❌ Error code:", err.code);
      console.error("❌ Error message:", err.message);
      console.error("❌ Full error object:", JSON.stringify(err, null, 2));
      alert(`Failed to create drop: ${err.message}`);
      setCreationMessage(`Failed to create drop: ${err.message}`);
    setTimeout(() => setCreationMessage(""), 5000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="new-drop-form">
  <h2>Create a New Drop</h2>

  <label>Title:</label>
  <input name="title" value={formData.title} onChange={handleChange} required />

  <label>Description:</label>
  <textarea name="description" value={formData.description} onChange={handleChange} required />

  <label>Quantity:</label>
  <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" required />

  <label>Expires In (Minutes):</label>
  <input type="number" name="expiresInMinutes" value={formData.expiresInMinutes} onChange={handleChange} min="1" required />

  <button type="submit" disabled={!location.lat || !location.lng}>Create Drop</button>
    {creationMessage && <p style={{ color: "green", marginBottom: "10px" }}>{creationMessage}</p>}

</form>
  );
};

export default NewDropForm;
