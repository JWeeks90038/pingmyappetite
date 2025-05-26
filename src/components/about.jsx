import React from 'react';
import { Link } from 'react-router-dom';// Adjust the path based on your structure
import '../assets/styles.css'; // Adjust the path based on your structure

const About = () => {
  return (
    <div>
      {/* Navigation */}
      <nav>
        <ul>
        <Link to="/index">Home</Link>
        <Link to="/map">Home</Link>
        <Link to="/ping-requests">Home</Link>
        <Link to="/pricing">Home</Link>
        <Link to="/about">Home</Link>
        <Link to="/contact">Home</Link>
        </ul>
      </nav>

      {/* About Section */}
      <section className="about">
        <h1>Ping My Appetite</h1>
        <p>
          Connecting food lovers with their favorite food trucks has never been easier! Our platform revolutionizes the way customers and food truck owners interact, making it effortless to discover, request, and follow mobile food vendors in real-time.
        </p>

        <div className="about-content">
          <div className="about-box">
            <h2>For Customers</h2>
            <p>Are you tired of searching for your favorite food truck only to find out it's already moved? With our platform, you can:</p>
            <ul>
              <li>📍 <strong>Locate food trucks in real-time</strong> using our interactive map.</li>
              <li>🍔 <strong>Request trucks to come to your area</strong> with a simple "ping."</li>
              <li>🌟 <strong>Vote for the best food trucks</strong> in different categories.</li>
              <li>🔔 <strong>Get notifications</strong> when your favorite trucks are nearby.</li>
            </ul>
          </div>

          <div className="about-box">
            <h2>For Food Truck Owners</h2>
            <p>We empower food truck businesses to grow by providing the tools they need to succeed:</p>
            <ul>
              <li>🚀 <strong>Boost revenue</strong> by responding to real-time customer demand.</li>
              <li>📊 <strong>Use heat maps</strong> to identify high-traffic areas.</li>
              <li>📢 <strong>Gain exposure</strong> through featured listings and customer votes.</li>
              <li>💬 <strong>Engage with customers</strong> via reviews and notifications.</li>
            </ul>
          </div>
        </div>

        <div className="how-it-works">
          <h2>How It Works</h2>
          <p>We’ve made it easy for both food lovers and business owners to use our platform. Here’s a simple breakdown:</p>
          <div className="steps">
            <div className="step">
              <h3>1. Discover</h3>
              <p>Customers can browse an interactive map to find food trucks near them or see where their favorite ones are heading next.</p>
            </div>
            <div className="step">
              <h3>2. Request</h3>
              <p>Customers can "ping" food trucks to request them in specific areas, allowing truck owners to see real-time demand.</p>
            </div>
            <div className="step">
              <h3>3. Connect</h3>
              <p>Food truck owners can communicate with customers, update their locations, and maximize their sales with analytics and heat maps.</p>
            </div>
          </div>
        </div>

        <div className="success-stories">
          <h2>Success Stories</h2>
          <p>See how food trucks have transformed their businesses with our platform.</p>
          <div className="testimonial">
            <p>"Since joining, I've doubled my daily sales! Knowing where customers want us to be has changed the game."</p>
            <h4>- Carlos, Owner of Taco Paradise 🌮</h4>
          </div>
          <div className="testimonial">
            <p>"The heat maps and analytics help us plan our schedule better, leading to sold-out days more often!"</p>
            <h4>- Amy, Owner of Sweet Treats 🍦</h4>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
