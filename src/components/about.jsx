import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaFacebook, FaTiktok } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import '../assets/styles.css';
import founderImg from '../assets/link-preview-image.png';


const About = () => {
  return (
    <div>
      <div id="top"></div>
      {/* Mission Statement Section */}
      <section className="about-mission">
        <h2>Our Mission</h2>
        <p>
          At <strong>Grubana</strong>, our mission is simple: to bridge the gap between mobile food vendors and the communities they serve. Born out of a genuine need for better connection, visibility, and support within the mobile food industry, Grubana was created to fill the space that traditional platforms often overlook.
        </p>
        <p>
          We started Grubana after realizing just how disconnected the experience was for food truck owners, trailer operators, and their customers. Mobile kitchens are on the rise, but too many vendors struggle to be discovered, and too many hungry customers miss out on amazing local food — simply because there wasn’t a modern, reliable system in place to connect the two. We saw the gap, and we decided to close it.
        </p>
        <p>
          Grubana is built to complete the circle — to support food truck and trailer owners in growing their businesses, while helping customers easily find and enjoy unique food experiences near them. From real-time drop alerts and live maps to vendor profiles and interactive features, our platform is designed to be as dynamic and mobile as the vendors it supports.
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

      <section className="about-team">
  <h2>Meet the Founder & Developer</h2>
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
        width: "150px", // Keep the current width
        height: "150px", // Keep the current height
        borderRadius: "50%", // Reduce borderRadius to expose more of the image
        objectFit: "cover",
        boxShadow: "20px 2px 8px rgba(0,0,0,0.08)"
      }}
    />
    <p style={{ flex: 1, minWidth: "200px" }}>
      Grubana was created & developed by Jonas Weeks, a passionate foodie and veteran who saw the need for a better way to connect mobile kitchens with hungry communities. With experience in the mobile food industry, logisitcs & technology, Jonas is dedicated to helping mobile venders thrive and food lovers discover new favorites.
    </p>
  </div>
</section>

      <section className="about-values">
        <h2>Our Core Values</h2>
        <div>
          <div>✅ Community First</div>
          <div>🔷 Innovation & Simplicity</div>
          <div>🤝 Integrity & Service</div>
          <div>⭐ Empowering Small Businesses</div>
        </div>
      </section>

      <section className="about-cta">
        <h2>Join the Grubana Community!</h2>
        <p>
          Whether you’re a food truck owner or a foodie fan, we invite you to join us on this journey. <Link to="/signup">Sign up today</Link> or <Link to="/contact">contact us</Link> to learn more!
        </p>
      </section>

      <section className="about-social">
        <h2>Follow Us</h2>
        <div className="social-media">
          <h3 style={{ textAlign: "center" }}>Follow Grubana</h3>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
              fontSize: "28px",
              marginTop: "10px",
            }}
          >
            <a
              href="https://www.instagram.com/grubanaapp/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#E1306C" }}
              className="social-icon"
            >
              <FaInstagram />
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61576765928284"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1877F2" }}
              className="social-icon"
            >
              <FaFacebook />
            </a>
            <a
              href="https://grubana.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#010101" }}
              className="social-icon"
            >
              <FaTiktok />
            </a>
                <a
                          href="https://grubana.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#000000' }}
                          className="social-icon"
                          aria-label="X"
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