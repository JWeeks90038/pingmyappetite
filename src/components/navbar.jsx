import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LogoutLink from './logout';
import Logo from './logo.jsx'; 
import '../assets/navbar.css';
import useSubscriptionStatus from "../hooks/useSubscriptionStatus";
import { useAuthState } from "react-firebase-hooks/auth";

const Navbar = () => {
  const { user, userRole, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { status: subscriptionStatus, loading: subLoading } = useSubscriptionStatus();


  return (
    <nav className="navbar">
      <div className="navbar-header">
        <div className="navbar-logo">
          <Link to="/home">
            <Logo />
          </Link>
        </div>
        <div
          className="hamburger"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
          tabIndex={0}
          onKeyPress={e => { if (e.key === 'Enter') setMenuOpen(open => !open); }}
        >
          <span />
          <span />
          <span />
        </div>
      </div>
      <ul className={`nav-links${menuOpen ? ' open' : ''}`}>
  <li><Link to="/home" onClick={() => setMenuOpen(false)}>Home</Link></li>
  <li><Link to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link></li>
  <li><Link to="/contact" onClick={() => setMenuOpen(false)}>Contact Us</Link></li>
  <li><Link to="/about" onClick={() => setMenuOpen(false)}>About Us</Link></li>
  {loading ? (
    <li>Loading...</li>
  ) : user ? (
    <>
      <li><Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link></li>
      <li><Link to="/settings" onClick={() => setMenuOpen(false)}>Settings</Link></li>
      <li><LogoutLink /></li>
    </>
  ) : (
    <>
      <li><Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link></li>
      {!user && <li><Link to="/signup" onClick={() => setMenuOpen(false)}>Sign Up</Link></li>}
    </>
  )}
</ul>
    </nav>
  );
};

export default Navbar;