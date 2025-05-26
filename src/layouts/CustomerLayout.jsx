// src/layouts/CustomerLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/navbar'; // your actual navbar for customers
import Footer from '../components/footer';

const CustomerLayout = () => {
  return (
    <>
 
      <main>
        <Outlet /> {/* This is critical */}
      </main>
      <Footer />
    </>
  );
};

export default CustomerLayout;
