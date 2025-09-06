import React from "react";
import { Link } from "react-router-dom";

const PasswordResetSuccess = () => {
  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>Password Changed</h2>
      <p>Your password has been successfully updated. You can now sign in with your new password.</p>
      <Link to="/login">
        <button style={{ marginTop: "20px", padding: "10px 20px", borderRadius: "5px", backgroundColor: "#4CAF50", color: "white", border: "none", cursor: "pointer" }}>
          Go to Login
        </button>
      </Link>
    </div>
  );
};

export default PasswordResetSuccess;
