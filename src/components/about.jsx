import React from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles.css';

const About = () => {
  return (
    <div>
      {/* Mission Statement Section */}
      <section className="about-mission">
        <h1>About Us</h1>
        <h2>Our Mission</h2>
        <p>
          At <strong>Grubana</strong>, our mission is simple: to bridge the gap between mobile food vendors and the communities they serve. Born out of a genuine need for better connection, visibility, and support within the mobile food industry, Grubana was created to fill the space that traditional platforms often overlook.
        </p>
        <p>
          We started Grubana after realizing just how disconnected the experience was for food truck owners, trailer operators, and their customers. Mobile kitchens are on the rise, but too many vendors struggle to be discovered, and too many hungry customers miss out on amazing local food — simply because there wasn’t a modern, reliable system in place to connect the two. We saw the gap, and we decided to close it.
        </p>
        <p>
          Grubana is built to complete the circle — to support food truck, trailer, and cart owners in growing their businesses, while helping customers easily find and enjoy unique food experiences near them. From real-time drop alerts and live maps to vendor profiles and interactive features, our platform is designed to be as dynamic and mobile as the vendors it supports.
        </p>
        <p>
          While there are other food truck websites and apps out there, most tend to focus heavily on private events, catering, or scheduled bookings. Grubana takes a different approach. Our focus is on the everyday customer — the person walking down the street, exploring their neighborhood, or searching for a great local bite. We aim to make mobile food discoverable in real time, helping people connect with the food trucks and trailers operating in their community right now. It’s about spontaneity, convenience, and community — not just events.
        </p>
        <p>
          We’re not just here to build a platform — we’re here to build a community. That means listening closely to the feedback of both vendors and customers, embracing constructive criticism, and continuously improving the system to better serve everyone involved. Whether you’re cooking behind the wheel or searching for your next favorite meal on the go, Grubana is here to make that experience smoother, smarter, and more satisfying.
        </p>
        <p>
          <strong>Grubana is proudly veteran-owned and operated</strong>, built with dedication, discipline, and a deep respect for service — values we bring into everything we do.
        </p>
      </section>

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