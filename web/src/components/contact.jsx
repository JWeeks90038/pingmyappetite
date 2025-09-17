import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!formData.name || !formData.email || !formData.message) {
    setError('Please fill out all fields.');
    return;
  }
  setError('');
  setSubmitted(false);

  try {
    // Send contact form via Formspree
    const response = await fetch('https://formspree.io/f/xovnlpyz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        message: formData.message,
        _subject: `Contact Form Submission from ${formData.name}`,
        _replyto: formData.email,
      }),
    });
    
    if (response.ok) {
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
    } else {
      setError('Failed to send message. Please try again later.');
    }
  } catch (err) {

    setError('Failed to send message. Please try again later.');
  }
};

  return (
    <div className="contact-page" style={{
      backgroundColor: '#0B0B1A',
      color: '#FFFFFF',
      minHeight: '100vh',
      padding: '20px 0'
    }}>
  
      <header style={{
        backgroundColor: '#1A1036',
        padding: '40px 20px',
        margin: '20px auto',
        maxWidth: '1200px',
        borderRadius: '12px',
        border: '1px solid #FF4EC9',
        boxShadow: '0 8px 32px rgba(255, 78, 201, 0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{
          color: '#FF4EC9',
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '20px'
        }}>Contact Us</h1>
        <p style={{
          color: '#FFFFFF',
          fontSize: '1.2rem',
          lineHeight: '1.6',
          opacity: '0.9'
        }}>If you have any questions, feedback, or partnership inquiries, please reach out using the form below or via our contact details.</p>
      </header>

            <div className="contact-content" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '30px',
        maxWidth: '1200px',
        margin: '20px auto',
        padding: '0 20px'
      }}>
        <form className="contact-form" onSubmit={handleSubmit} style={{
          backgroundColor: '#1A1036',
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid #4DBFFF',
          boxShadow: '0 8px 32px rgba(77, 191, 255, 0.1)',
          textAlign: 'center'
        }}>
          {error && <div className="form-error" style={{
            backgroundColor: '#FF4EC9',
            color: '#0B0B1A',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontWeight: '600'
          }}>{error}</div>}
          {submitted && <div className="form-success" style={{
            backgroundColor: '#00E676',
            color: '#0B0B1A',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontWeight: '600'
          }}>Thank you for your message! We'll get back to you soon.</div>}
          
          <label htmlFor="name" style={{
            color: '#4DBFFF',
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '8px',
            display: 'block'
          }}>Your Name:</label>
          <input 
            type="text" 
            id="name" 
            name="name" 
            value={formData.name}
            onChange={handleChange}
            required 
            autoComplete="name"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #4DBFFF',
              backgroundColor: '#0B0B1A',
              color: '#FFFFFF',
              fontSize: '1rem',
              marginBottom: '20px',
              boxSizing: 'border-box'
            }}
          />

          <label htmlFor="email" style={{
            color: '#4DBFFF',
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '8px',
            display: 'block'
          }}>Your Email:</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            value={formData.email}
            onChange={handleChange}
            required 
            autoComplete="email"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #4DBFFF',
              backgroundColor: '#0B0B1A',
              color: '#FFFFFF',
              fontSize: '1rem',
              marginBottom: '20px',
              boxSizing: 'border-box'
            }}
          />

          <label htmlFor="message" style={{
            color: '#4DBFFF',
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '8px',
            display: 'block'
          }}>Your Message:</label>
          <textarea 
            id="message" 
            name="message" 
            rows="5"
            placeholder="How can we help you?"
            value={formData.message}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #4DBFFF',
              backgroundColor: '#0B0B1A',
              color: '#FFFFFF',
              fontSize: '1rem',
              marginBottom: '25px',
              boxSizing: 'border-box',
              resize: 'vertical',
              minHeight: '120px'
            }}
          ></textarea>

          <button type="submit" className="btn" style={{
            width: '100%',
            padding: '15px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#FF4EC9',
            color: '#0B0B1A',
            fontSize: '1.1rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 16px rgba(255, 78, 201, 0.3)'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#4DBFFF';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#FF4EC9';
            e.target.style.transform = 'translateY(0)';
          }}>Send Message</button>
        </form>

        <div className="contact-info" style={{
          backgroundColor: '#1A1036',
          padding: '40px',
          borderRadius: '12px',
          border: '1px solid #00E676',
          boxShadow: '0 8px 32px rgba(0, 230, 118, 0.1)',
          textAlign: 'center'
        }}>
          <h2 style={{
            color: '#FF4EC9',
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '25px'
          }}>Other Ways to Connect</h2>
          <p style={{
            color: '#FFFFFF',
            fontSize: '1.1rem',
            lineHeight: '1.8',
            marginBottom: '25px',
            opacity: '0.9'
          }}>
            <strong style={{ color: '#4DBFFF' }}>Email:</strong> <a href="mailto:flavor@grubana.com" style={{
              color: '#00E676',
              textDecoration: 'none',
              fontWeight: '600'
            }}>flavor@grubana.com</a><br />
            <strong style={{ color: '#4DBFFF' }}>Instagram:</strong> <a href="https://www.instagram.com/grubanaapp/" target="_blank" rel="noopener noreferrer" style={{
              color: '#00E676',
              textDecoration: 'none',
              fontWeight: '600'
            }}>@grubanaapp</a><br />
            <strong style={{ color: '#4DBFFF' }}>Facebook:</strong> <a href="https://www.facebook.com/profile.php?id=61576765928284" target="_blank" rel="noopener noreferrer" style={{
              color: '#00E676',
              textDecoration: 'none',
              fontWeight: '600'
            }}>Grubana on Facebook</a>
          </p>
          <p style={{
            color: '#FFFFFF',
            fontSize: '1.1rem',
            lineHeight: '1.8',
            opacity: '0.9'
          }}>
            <strong style={{ color: '#4DBFFF' }}>Business Hours:</strong><br />
            Monday – Friday: 9am – 6pm<br />
            Saturday – Sunday: 10am – 4pm
          </p>
        </div>
      </div>

      <div style={{ textAlign: 'center', margin: '40px auto' }}>
        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          style={{
            display: "inline-block",
            color: "#4DBFFF",
            textDecoration: "none",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "1.1rem",
            padding: "12px 24px",
            border: "2px solid #4DBFFF",
            borderRadius: "8px",
            backgroundColor: "transparent",
            transition: "all 0.3s ease"
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#4DBFFF';
            e.target.style.color = '#0B0B1A';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = '#4DBFFF';
          }}
        >
          Back to Top ↑
        </a>
      </div>
    </div>
  );
};

export default Contact;