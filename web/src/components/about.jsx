import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaFacebook, FaTiktok } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import '../assets/styles.css';
import founderImg from '../assets/link-preview-image.png';

const About = () => {
  return (
    <div style={{
      backgroundColor: '#0B0B1A',
      color: '#FFFFFF',
      minHeight: '100vh',
      padding: '20px 0'
    }}>
      <div id="top"></div>
      {/* Mission Statement Section */}
      {/* Mission Statement Section */}
      <section className="about-mission" style={{
        backgroundColor: '#1A1036',
        padding: '40px 20px',
        margin: '20px auto',
        maxWidth: '1200px',
        borderRadius: '12px',
        border: '1px solid #4DBFFF',
        boxShadow: '0 8px 32px rgba(77, 191, 255, 0.1)'
      }}>
        <h2 style={{
          color: '#FF4EC9',
          fontSize: '2.5rem',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '30px'
        }}>Our Mission</h2>
                <p style={{
          color: '#FFFFFF',
          fontSize: '1.1rem',
          lineHeight: '1.6',
          marginBottom: '20px',
          opacity: '0.9'
        }}>
          At <strong style={{ color: '#4DBFFF' }}>Grubana</strong>, our mission is simple: to bridge the gap between mobile food vendors and the communities they serve. Born out of a genuine need for better connection, visibility, and support within the mobile food industry, Grubana was created to fill the space that traditional platforms often overlook.
        </p>
        <p style={{
          color: '#FFFFFF',
          fontSize: '1.1rem',
          lineHeight: '1.6',
          marginBottom: '20px',
          opacity: '0.9'
        }}>
          We started Grubana after realizing just how disconnected the experience was for food truck owners, trailer operators, and their customers. Mobile kitchens are on the rise, but too many vendors struggle to be discovered, and too many hungry customers miss out on amazing local food — simply because there wasn't a modern, reliable system in place to connect the two. We saw the gap, and we decided to close it.
        </p>
        <p style={{
          color: '#FFFFFF',
          fontSize: '1.1rem',
          lineHeight: '1.6',
          marginBottom: '20px',
          opacity: '0.9'
        }}>
          Grubana is built to complete the circle — to support food truck and trailer owners in growing their businesses, while helping customers easily find and enjoy unique food experiences near them. From real-time drop alerts and live maps to vendor profiles and interactive features, our platform is designed to be as dynamic and mobile as the vendors it supports.
        </p>
        <p style={{
          color: '#FFFFFF',
          fontSize: '1.1rem',
          lineHeight: '1.6',
          marginBottom: '20px',
          opacity: '0.9'
        }}>
          While there are other food truck websites and apps out there, most tend to focus heavily on private events, catering, or scheduled bookings. Grubana takes a different approach. Our focus is on the everyday customer — the person walking down the street, exploring their neighborhood, or searching for a great local bite. We aim to make mobile food discoverable in real time, helping people connect with the food trucks and trailers operating in their community right now. It's about spontaneity, convenience, and community — not just events.
        </p>
        <p style={{
          color: '#FFFFFF',
          fontSize: '1.1rem',
          lineHeight: '1.6',
          marginBottom: '20px',
          opacity: '0.9'
        }}>
          We're not just here to build a platform — we're here to build a community. That means listening closely to the feedback of both vendors and customers, embracing constructive criticism, and continuously improving the system to better serve everyone involved. Whether you're cooking behind the wheel or searching for your next favorite meal on the go, Grubana is here to make that experience smoother, smarter, and more satisfying.
        </p>
        <p style={{
          color: '#FFFFFF',
          fontSize: '1.1rem',
          lineHeight: '1.6',
          marginBottom: '0',
          opacity: '0.9'
        }}>
          <strong style={{ color: '#00E676' }}>Grubana is proudly veteran-owned and operated</strong>, built with dedication, discipline, and a deep respect for service — values we bring into everything we do.
        </p>
      </section>

      <section className="about-team" style={{
        backgroundColor: '#1A1036',
        padding: '40px 20px',
        margin: '20px auto',
        maxWidth: '1200px',
        borderRadius: '12px',
        border: '1px solid #FF4EC9',
        boxShadow: '0 8px 32px rgba(255, 78, 201, 0.1)'
      }}>
        <h2 style={{
          color: '#FF4EC9',
          fontSize: '2.5rem',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '30px'
        }}>Meet the Founder & Developer</h2>
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "18px",
            textAlign: "center",
            marginBottom: "24px"
          }}
        >
          <img
            src={founderImg}
            alt="Jonas Weeks, Founder of Grubana"
            style={{
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              objectFit: "cover",
              boxShadow: "0 8px 32px rgba(77, 191, 255, 0.3)",
              border: "3px solid #4DBFFF"
            }}
          />
          <p style={{ 
            flex: 1, 
            minWidth: "200px",
            color: '#FFFFFF',
            fontSize: '1.1rem',
            lineHeight: '1.6',
            opacity: '0.9'
          }}>
            Grubana was created & developed by <strong style={{ color: '#4DBFFF' }}>Jonas Weeks</strong>, a passionate foodie and veteran who saw the need for a better way to connect mobile kitchens with hungry communities. With experience in the mobile food industry, logisitcs & technology, Jonas is dedicated to helping mobile venders thrive and food lovers discover new favorites.
          </p>
        </div>
      </section>

      <section className="about-values" style={{
        backgroundColor: '#1A1036',
        padding: '40px 20px',
        margin: '20px auto',
        maxWidth: '1200px',
        borderRadius: '12px',
        border: '1px solid #00E676',
        boxShadow: '0 8px 32px rgba(0, 230, 118, 0.1)'
      }}>
        <h2 style={{
          color: '#FF4EC9',
          fontSize: '2.5rem',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '30px'
        }}>Our Core Values</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: '#0B0B1A',
            padding: '25px',
            borderRadius: '12px',
            border: '2px solid #4DBFFF',
            color: '#FFFFFF',
            fontSize: '1.2rem',
            fontWeight: '600',
            boxShadow: '0 4px 16px rgba(77, 191, 255, 0.2)'
          }}>✅ Community First</div>
          <div style={{
            backgroundColor: '#0B0B1A',
            padding: '25px',
            borderRadius: '12px',
            border: '2px solid #FF4EC9',
            color: '#FFFFFF',
            fontSize: '1.2rem',
            fontWeight: '600',
            boxShadow: '0 4px 16px rgba(255, 78, 201, 0.2)'
          }}>🔷 Innovation & Simplicity</div>
          <div style={{
            backgroundColor: '#0B0B1A',
            padding: '25px',
            borderRadius: '12px',
            border: '2px solid #00E676',
            color: '#FFFFFF',
            fontSize: '1.2rem',
            fontWeight: '600',
            boxShadow: '0 4px 16px rgba(0, 230, 118, 0.2)'
          }}>🤝 Integrity & Service</div>
          <div style={{
            backgroundColor: '#0B0B1A',
            padding: '25px',
            borderRadius: '12px',
            border: '2px solid #4DBFFF',
            color: '#FFFFFF',
            fontSize: '1.2rem',
            fontWeight: '600',
            boxShadow: '0 4px 16px rgba(77, 191, 255, 0.2)'
          }}>⭐ Empowering Small Businesses</div>
        </div>
      </section>

    <section className="about-cta" style={{
  backgroundColor: '#1A1036',
  padding: '40px 20px',
  margin: '20px auto',
  maxWidth: '1200px',
  borderRadius: '12px',
  border: '1px solid #FF4EC9',
  boxShadow: '0 8px 32px rgba(255, 78, 201, 0.1)',
  textAlign: 'center'
}}>
  <h2 style={{
    color: '#FF4EC9',
    fontSize: '2.5rem',
    fontWeight: '700',
    marginBottom: '20px'
  }}>Join the Grubana Community!</h2>
  <p style={{
    color: '#FFFFFF',
    fontSize: '1.2rem',
    lineHeight: '1.6',
    opacity: '0.9'
  }}>
    Whether you're a food truck owner or a foodie fan, we invite you to join us on this journey. <Link to="/signup" style={{
      color: '#4DBFFF',
      textDecoration: 'none',
      fontWeight: '700',
      borderBottom: '2px solid #4DBFFF'
    }}>Sign up today</Link> or <Link to="/contact" style={{
      color: '#00E676',
      textDecoration: 'none',
      fontWeight: '700',
      borderBottom: '2px solid #00E676'
    }}>contact us</Link> to learn more!
  </p>
</section>

      <section className="about-social" style={{
  backgroundColor: '#1A1036 !important',
  padding: '40px 20px',
  margin: '20px auto',
  maxWidth: '1200px',
  borderRadius: '12px',
  border: '1px solid #4DBFFF',
  boxShadow: '0 8px 32px rgba(77, 191, 255, 0.1)',
  textAlign: 'center'
}}>
  <h2 style={{
    color: '#FF4EC9',
    fontSize: '2.5rem',
    fontWeight: '700',
    marginBottom: '30px'
  }}>Follow Us</h2>
  <div style={{
    backgroundColor: 'transparent !important',
    background: 'none !important',
    padding: '0 !important',
    margin: '0 !important',
    border: 'none !important'
  }}>
    <h3 style={{ 
      textAlign: "center",
      color: '#4DBFFF !important',
      fontSize: '1.5rem',
      fontWeight: '600',
      marginBottom: '20px',
      backgroundColor: 'transparent !important',
      background: 'none !important',
      padding: '0 !important',
      border: 'none !important'
    }}>Follow Grubana</h3>
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "30px",
        fontSize: "36px",
        marginTop: "10px",
        backgroundColor: 'transparent !important',
        background: 'none !important'
      }}
    >
      <a
        href="https://www.instagram.com/grubanaapp/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
          color: "#E1306C !important",
          transition: 'transform 0.3s ease',
          display: 'inline-block',
          backgroundColor: 'transparent !important',
          background: 'none !important'
        }}
        className="social-icon"
        onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        <FaInstagram />
      </a>
      <a
        href="https://www.facebook.com/profile.php?id=61576765928284"
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
          color: "#1877F2 !important",
          transition: 'transform 0.3s ease',
          display: 'inline-block',
          backgroundColor: 'transparent !important',
          background: 'none !important'
        }}
        className="social-icon"
        onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        <FaFacebook />
      </a>
      <a
        href="https://grubana.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
          color: "#FF0050 !important",
          transition: 'transform 0.3s ease',
          display: 'inline-block',
          backgroundColor: 'transparent !important',
          background: 'none !important'
        }}
        className="social-icon"
        onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        <FaTiktok />
      </a>
      <a
        href="https://grubana.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
          color: '#FFFFFF !important',
          transition: 'transform 0.3s ease',
          display: 'inline-block',
          backgroundColor: 'transparent !important',
          background: 'none !important'
        }}
        className="social-icon"
        aria-label="X"
        onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        <FaXTwitter />
      </a>
    </div>
  </div>
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

    </div>
  );
};

export default About;