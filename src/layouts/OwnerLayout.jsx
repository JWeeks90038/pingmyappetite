import React from 'react';
import { Outlet } from 'react-router-dom';

import Footer from '../components/footer';

const OwnerLayout = () => {
  return (
    <>
    
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
};

export default OwnerLayout;
