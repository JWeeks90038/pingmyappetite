import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LogoutLink from './logout';
import '../assets/navbar.css';
import useSubscriptionStatus from "../hooks/useSubscriptionStatus";
import { useAuthState } from "react-firebase-hooks/auth";
import grubanaLogoImg from "../assets/grubana-logo-1.png";

const Navbar = () => {
  const { user, userRole, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { status: subscriptionStatus, loading: subLoading } = useSubscriptionStatus();

  // Debug logging to help identify issues
  console.log('🍔 Navbar: Render state', {
    user: !!user,
    userRole,
    loading,
    menuOpen,
    subscriptionStatus
  });


  return (
    <nav className="navbar">
      <div className="navbar-header">
        <div className="navbar-logo">
          <Link to="/home">
            <img 
              src={grubanaLogoImg} 
              alt="Grubana Logo" 
              className="navbar-logo-img"
            />
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
          <li><span style={{ color: '#2c6f57', padding: '15px 20px', display: 'block' }}>Loading...</span></li>
        ) : user ? (
          <>
            <li>
              <Link 
                to={
                  userRole === 'customer' ? '/customer-dashboard' :
                  userRole === 'owner' ? '/dashboard' :
                  userRole === 'event-organizer' ? '/event-dashboard' :
                  '/dashboard'
                } 
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
            </li>
            {userRole === 'customer' && (
              <li>
                <Link to="/my-orders" onClick={() => setMenuOpen(false)}>
                  My Orders
                </Link>
              </li>
            )}
            {userRole === 'owner' && (
              <li>
                <Link to="/orders" onClick={() => setMenuOpen(false)}>
                  Order Management
                </Link>
              </li>
            )}
            <li><Link to="/settings" onClick={() => setMenuOpen(false)}>Settings</Link></li>
            <li><LogoutLink /></li>
          </>
        ) : (
          <>
            <li><Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link></li>
            <li><Link to="/signup" onClick={() => setMenuOpen(false)}>Sign Up</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;