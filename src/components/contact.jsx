import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Thank you for your message! We’ll get back to you soon.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <>
      {/* Navigation Menu */}
      <nav>
        <Link to="/home">Home</Link>
        <Link to="/map">Map</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/signup">Signup</Link>
      </nav>

      {/* Contact Section */}
      <header>
        <h1>Contact Us</h1>
        <p>If you have any questions or feedback, feel free to reach out!</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Your Name:</label><br />
          <input 
            type="text" 
            id="name" 
            name="name" 
            value={formData.name}
            onChange={handleChange}
            required 
          /><br /><br />

          <label htmlFor="email">Your Email:</label><br />
          <input 
            type="email" 
            id="email" 
            name="email" 
            value={formData.email}
            onChange={handleChange}
            required 
          /><br /><br />

          <textarea 
            id="message" 
            name="message" 
            rows="4" 
            cols="50" 
            placeholder="Your message..."
            value={formData.message}
            onChange={handleChange}
          ></textarea><br /><br />

          <button type="submit">Submit</button>
        </form>
      </header>
    </>
  );
};

export default Contact;
