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
    // Use Formspree as backup if SendGrid fails
    const sendGridResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    
    if (sendGridResponse.ok) {
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      return;
    }
    
    // If SendGrid fails, fall back to Formspree
    console.log('SendGrid failed, trying Formspree fallback...');
    const formspreeResponse = await fetch('https://formspree.io/f/xdkobklr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        message: formData.message,
        _subject: `Contact Form from ${formData.name}`,
      }),
    });
    
    if (formspreeResponse.ok) {
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
    } else {
      setError('Failed to send message. Please try again later.');
    }
  } catch (err) {
    console.error('Contact form error:', err);
    setError('Failed to send message. Please try again later.');
  }
};

  return (
    <div className="contact-page">
  
      <header>
        <h1>Contact Us</h1>
        <p>If you have any questions, feedback, or partnership inquiries, please reach out using the form below or via our contact details.</p>
      </header>

      <div className="contact-content">
        <form className="contact-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
          {submitted && <div className="form-success">Thank you for your message! We’ll get back to you soon.</div>}
          <label htmlFor="name">Your Name:</label>
          <input 
            type="text" 
            id="name" 
            name="name" 
            value={formData.name}
            onChange={handleChange}
            required 
            autoComplete="name"
          />

          <label htmlFor="email">Your Email:</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            value={formData.email}
            onChange={handleChange}
            required 
            autoComplete="email"
          />

          <label htmlFor="message">Your Message:</label>
          <textarea 
            id="message" 
            name="message" 
            rows="5"
            placeholder="How can we help you?"
            value={formData.message}
            onChange={handleChange}
            required
          ></textarea>

          <button type="submit" className="btn">Send Message</button>
        </form>

        <div className="contact-info">
          <h2>Other Ways to Connect</h2>
          <p>
            <strong>Email:</strong> <a href="mailto:grubana.co@gmail.com">grubana.co@gmail.com</a><br />
            <strong>Instagram:</strong> <a href="https://www.instagram.com/grubanaapp/" target="_blank" rel="noopener noreferrer">@grubanaapp</a><br />
            <strong>Facebook:</strong> <a href="https://www.facebook.com/profile.php?id=61576765928284" target="_blank" rel="noopener noreferrer">Grubana on Facebook</a>
          </p>
          <p>
            <strong>Business Hours:</strong><br />
            Monday – Friday: 9am – 6pm<br />
            Saturday – Sunday: 10am – 4pm
          </p>
        </div>
      </div>

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

export default Contact;