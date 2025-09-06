// src/layouts/PublicLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/navbar"; // or whatever your public nav component is
import Footer from "../components/footer";

const PublicLayout = () => {
  return (
    <>
  
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
};

export default PublicLayout;
