import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles.css';

const ContactFormspree = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    setLoading(true);

    try {
      // Direct Formspree submission - no backend needed
      const response = await fetch('https://formspree.io/f/xdkobklr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          _subject: `Contact Form from ${formData.name}`,
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
      console.error('Contact form error:', err);
      setError('Failed to send message. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <header className="contact-header">
        <div className="container">
          <nav className="navbar">
            <Link to="/" className="logo">
              🚚 Grubana
            </Link>
            <div className="nav-links">
              <Link to="/">Home</Link>
              <Link to="/about">About</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/contact" className="active">Contact</Link>
              <Link to="/login" className="cta-button">Login</Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="contact-main">
        <div className="container">
          <div className="contact-content">
            <div className="contact-info">
              <h1>Get in Touch</h1>
              <p>We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
              
              <div className="contact-details">
                <div className="contact-item">
                  <h3>📧 Email</h3>
                  <p>grubana.co@gmail.com</p>
                </div>
                <div className="contact-item">
                  <h3>💬 Response Time</h3>
                  <p>We typically respond within 24 hours</p>
                </div>
                <div className="contact-item">
                  <h3>🚚 For Food Truck Owners</h3>
                  <p>Questions about partnerships, features, or technical support</p>
                </div>
                <div className="contact-item">
                  <h3>🍕 For Customers</h3>
                  <p>App feedback, suggestions, or general inquiries</p>
                </div>
              </div>
            </div>

            <div className="contact-form-container">
              {submitted ? (
                <div className="success-message">
                  <h2>✅ Message Sent!</h2>
                  <p>Thank you for contacting us. We'll get back to you soon!</p>
                  <button 
                    onClick={() => setSubmitted(false)}
                    className="cta-button"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="contact-form">
                  <h2>Send us a Message</h2>
                  
                  {error && (
                    <div className="error-message">
                      {error}
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="name">Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">Message *</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows="6"
                      required
                      disabled={loading}
                    ></textarea>
                  </div>

                  <button 
                    type="submit" 
                    className="cta-button"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContactFormspree;
