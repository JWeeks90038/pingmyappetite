import { useState } from "react";
import "../assets/styles.css";
import { Link } from "react-router-dom";
import HeatMap from "../components/HeatMap"; // Assuming HeatMap component is correctly implemented
import "../assets/BlurEffect.css"; // Assuming you have a blur effect for the map
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import "../assets/social-icon.css"; // Assuming you have a CSS file for social icons


const Home = () => {
  const [email, setEmail] = useState("");

  return (
    <>
      {/* New Feature Banner */}
      <div className="new-feature-banner">
        <div className="banner-content">
          <span className="banner-text">🎉 NEW: Event Organizers Welcome!</span>
          <span className="banner-subtext">Boost your event visibility</span>
        </div>
      </div>
      
      <header className="hero">
        <div id="top"></div>
        <h1>Grubana: Find Mobile Food Vendors Near You</h1>
<h2>The Ultimate Mobile Kitchen Locator in Real-Time — Now Serving Your Area!</h2>
  <meta name="description" content="Discover the best food trucks and food trailers near you in real time. Explore trending locations, exclusive deals, and live maps with Grubana—the ultimate street food finder." />
  <div className="hero-buttons">
    <Link to="/signup" className="btn">Foodie Fans — Let's Go!</Link>
    <Link to="/signup" className="btn">Mobile Vendors - Let's Roll!</Link>
    <Link to="/signup?role=event-organizer" className="btn btn-event-organizer">Event Organizers — Join Now!</Link>
    <section className="image-section">
        <img 
          src="/arayaki-trailer.png" 
          alt="Delicious food trucks"
        />
      </section>
  </div>
</header>

<section className="heat-map">
  <div className="heatmap-video-bg">
    <video
      src="/homepage.mp4"
      autoPlay
      loop
      muted
      playsInline
      className="heatmap-bg-video"
    />
  </div>
  <div className="heatmap-content">
    <h3>Where's the Flavor Trending?</h3>
    <p>Drop a pin and show food trucks & food trailers where the next big craving is. They're ready to roll where the demand is hot!</p>
    <div className="heatmap-wrapper">
      <HeatMap />
      <div className="heatmap-frost">
        <div className="blur-message">
          <Link to="/signup" className="blur-link">
            <p>Sign up to unlock the full map!</p>
          </Link>
        </div>
      </div>
    </div>
  </div>
</section>

     <section className="how-it-works">
  <h2>How Grubana Works:</h2>
  <div className="steps">
    <div>
      <h3>Foodie Fans</h3>
      <p><strong>1. Drop a Pin</strong> – Show mobile kitchens where the hunger is by dropping a pin at your location.</p>
      <p><strong>2. Favorite & Follow Your Faves</strong> – Click on any mobile kitchen business icon to view the menu, claim a drop and follow your favorite vendors in real-time.</p>
      <p><strong>3. Grab the Drop</strong> – Snag exclusive deals, discounts, or limited-time items when trucks and trailers drop them in your area.</p>
      <p><strong>4. Feast Smarter</strong> – Check menus in advance and skip the guesswork. Your next bite is just a tap away.</p>
    </div>
    <div>
      <h3>Food Trucks & Food Trailers</h3>
      <p><strong>1. Get Discovered</strong> – View real-time pin drops from hungry fans and ride the demand wave using your heatmap.</p>
      <p><strong>2. Drop a Deal</strong> – Paid subscribers can create 'drops' — special offers, flash deals, or secret menu items — to attract nearby foodies.</p>
      <p><strong>3. Drive with Insight</strong> – Access powerful dashboard analytics, customer behavior trends, and real-time location tracking to optimize your route and revenue.</p>
      <p><strong>4. Build Loyalty</strong> – Allows foodie fans to click on your icon to view your menu ahead of time to speed up lines, get favorited by fans, grow your following, and keep them coming back with smart engagement tools.</p>
    </div>
    <div>
      <h3>Event Organizers</h3>
      <p><strong>1. Create Your Event</strong> – List festivals, markets, fairs, and special events with detailed venue and vendor information.</p>
      <p><strong>2. Attract Vendors</strong> – Food trucks and trailers can discover and apply to participate in your events through our platform.</p>
      <p><strong>3. Manage Applications</strong> – Review vendor applications, approve participants, and communicate requirements seamlessly.</p>
      <p><strong>4. Boost Visibility</strong> – Reach hungry customers and quality vendors while building your event's reputation in the community.</p>
    </div>
  </div>
</section>

<section className="image-section">
        <img 
          src="/bdexpress.png" 
          alt="Delicious food trucks"
        />
      </section>

      <section className="testimonials">
  <h2>The Community is Eating It Up with Grubana!</h2>

  <div className="testimonial">
    <p>
      "I dropped a pin and favorited my go-to taco truck — 30 minutes later, it rolled up with a 'Taco Tuesday' deal just for us. Unreal!" 
      – <strong>Ashley, Foodie Fan</strong>
    </p>
  </div>

  <div className="testimonial">
    <p>
      "Grubana completely changed the game. Instead of guessing where to go, I follow the heatmap and drop deals on the fly. My sales have doubled and I'm finally working smarter." 
      – <strong>Mike, Rolling BBQ</strong>
    </p>
  </div>

  <div className="testimonial">
    <p>
      "Since joining the all-access plan, I can see exactly where the action is and track real-time results. The drops bring in customers fast, and the analytics help me plan every move." 
      – <strong>Tonya, Vegan Nomad</strong>
    </p>
  </div>

  <div className="testimonial">
    <p>
      "Grubana's event organizer features helped me attract the perfect food vendors for our summer festival. The application process was smooth and we had great participation!" 
      – <strong>Sarah, Downtown Festival Coordinator</strong>
    </p>
  </div>
</section>

<section className="image-section">
        <img 
          src="/weenie.png" 
          alt="Delicious food trucks"
        />
      </section>
      
      {/* Social Media Section */}

      <section className="blog-social">
        <h2>Follow us, Fuel your Hustle & Feed the Cravings</h2>
<div className="blog-preview">
  <p><strong>Grubana connects foodies with mobile food vendors, helps vendors discover events, and empowers event organizers to create amazing culinary experiences. <br></br><br></br>Follow us below to discover where your next favorite mobile food kitchen is serving -- in real time.</strong></p>
</div>
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
              href="#"
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
      </section>
    </>
  );
};

export default Home;
