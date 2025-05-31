import { useState } from "react";
import "../assets/styles.css";
import { Link } from "react-router-dom";
import HeatMap from "../components/HeatMap"; // Assuming HeatMap component is correctly implemented
import "../assets/BlurEffect.css"; // Assuming you have a blur effect for the map
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa";
import "../assets/social-icon.css"; // Assuming you have a CSS file for social icons

const VALID_CODES = ["GRUBANA2024", "BETAFOODIE"]; // Add your codes here

const Home = () => {
  const [hasAccess, setHasAccess] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

const handleCodeSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setStatus("Checking code...");
  try {
    const res = await fetch("http://localhost:3000/api/validate-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (data.valid) {
      setHasAccess(true);
      setError("");
      setStatus("");
    } else {
      setError("Invalid code. Please try again.");
      setStatus("");
    }
  } catch {
    setError("Failed to validate code. Please try again.");
    setStatus("");
  }
};

    const handleBetaSubmit = async (e) => {
    e.preventDefault();
    setStatus("Sending...");
    try {
      const res = await fetch('http://localhost:3000/api/send-beta-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("Success! Check your email for the code.");
      } else {
        setStatus(data.error || "Failed to send invite.");
      }
    } catch {
      setStatus("Failed to send invite.");
    }
  };

  // Beta code access gate
  // If the user does not have access, show the access gate

  if (!hasAccess) {
    return (
      <div className="access-gate">
        <h2>Enter Beta Access Code</h2>
        <form onSubmit={handleCodeSubmit}>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Enter your code"
            required
            style={{ padding: "10px", fontSize: "16px", marginRight: "10px" }}
          />
          <button type="submit" className="btn" style={{ padding: "10px 20px", fontSize: "16px" }}>
            Enter
          </button>
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}

        {/* Add this below the code form */}
        <div style={{ marginTop: "2rem" }}>
          <h3>Don't have a code?</h3>
          <form className="beta-form" onSubmit={handleBetaSubmit}>
            <input
              type="email"
              name="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email to request access"
              required
              style={{ padding: "10px", fontSize: "16px", marginRight: "10px" }}
            />
            <button
              type="submit"
              className="btn"
              style={{ padding: "10px 20px", fontSize: "16px" }}
            >
              Request Beta Access
            </button>
            {status && <p>{status}</p>}
          </form>
        </div>
      </div>
    );
  }

  //end of beta code access gate
  return (
    <>
      <header className="hero">
        <h1>Welcome to Grubana!</h1>
  <h2>Hungry for Something Amazing?</h2>
  <p>
    Foodie Fans: Crave it, pin it, get it!   <span className="footer-divider">  |  </span>    Mobile Kitchens: Try free for 30 days!
  </p>
  <div className="hero-buttons">
    <Link to="/signup" className="btn">I’m a Foodie Fan — Let’s Go!</Link>
    <Link to="/signup" className="btn">I'm a Food Truck or Food Trailer Owner</Link>
  </div>
</header>

<section className="heat-map">
  <h3>Where’s the Flavor Trending?</h3>
  <p>Drop a pin and show mobile kitchens where the next big craving is. They're ready to roll where the demand is hot!</p>


        <div className="heatmap-wrapper">
          {/* HeatMap component rendering */}
          <HeatMap />

          {/* Frosted overlay (blurred effect) */}
          <div className="heatmap-frost">
            <div className="blur-message">
              <Link to="/signup" className="blur-link">
                <p>Sign up to unlock the full map!</p>
              </Link>
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
      <p><strong>2. Favorite & Follow Your Faves</strong> – Click on food truck or trailer icon to view the menu, claim a drop and follow your favorite food trucks and trailers in real-time.</p>
      <p><strong>3. Grab the Drop</strong> – Snag exclusive deals, discounts, or limited-time items when trucks and trailers drop them in your area.</p>
      <p><strong>4. Feast Smarter</strong> – Check menus in advance and skip the guesswork. Your next bite is just a tap away.</p>
    </div>
    <div>
      <h3>Food Trucks & Food Trailers</h3>
      <p><strong>1. Get Discovered</strong> – View real-time pin drops from hungry fans and ride the demand wave using your heatmap.</p>
      <p><strong>2. Drop a Deal</strong> – Paid subscribers can create ‘drops’ — special offers, flash deals, or secret menu items — to attract nearby foodies.</p>
      <p><strong>3. Drive with Insight</strong> – Access powerful dashboard analytics, customer behavior trends, and real-time location tracking to optimize your route and revenue.</p>
      <p><strong>4. Build Loyalty</strong> – Allows foodie fans to click on your icon to view your menu ahead of time to speed up lines, get favorited by fans, grow your following, and keep them coming back with smart engagement tools.</p>
    </div>
  </div>
</section>

      <section className="testimonials">
  <h2>The Community is Eating It Up with Grubana!</h2>

  <div className="testimonial">
    <p>
      "I dropped a pin and favorited my go-to taco truck — 30 minutes later, it rolled up with a ‘Taco Tuesday’ deal just for us. Unreal!" 
      – <strong>Ashley, Foodie Fan</strong>
    </p>
  </div>

  <div className="testimonial">
    <p>
      "Grubana completely changed the game. Instead of guessing where to go, I follow the heatmap and drop deals on the fly. My sales have doubled and I’m finally working smarter." 
      – <strong>Mike, Rolling BBQ</strong>
    </p>
  </div>

  <div className="testimonial">
    <p>
      "Since joining the all-access plan, I can see exactly where the action is and track real-time results. The drops bring in customers fast, and the analytics help me plan every move." 
      – <strong>Tonya, Vegan Nomad</strong>
    </p>
  </div>
</section>

      {/* Beta Testing Section */}
      {!hasAccess && (
      <section className="beta-testing">
  <h2>🚀 Join the Grubana Beta!</h2>
  <p>
    Be among the first to try Grubana and help shape the future of food truck discovery. Sign up below to get early access and exclusive updates!
  </p>
  <form
    className="beta-form"
    onSubmit={handleBetaSubmit} // <-- use your handler here
  >
    <input
      type="email"
      name="email"
      value={email} // <-- bind to state
      onChange={e => setEmail(e.target.value)} // <-- update state on change
      placeholder="Enter your email"
      required
      style={{ padding: "10px", fontSize: "16px", marginRight: "10px" }}
    />
    <button
      type="submit"
      className="btn"
      style={{ padding: "10px 20px", fontSize: "16px" }}
    >
      Request Beta Access
    </button>
    {status && <p>{status}</p>} {/* Show status message */}
  </form>
</section>
)}
      {/* End Beta Testing Section */}
      
      {/* Social Media Section */}

      <section className="blog-social">
        <h2>Follow us, Fuel your Hustle & Feed the Cravings</h2>
<div className="blog-preview">
  <p><strong>Grubana doesn’t focus on private catering or events — we’re all about helping hungry people find amazing food trucks and food trailers near them, right when they’re serving. <br></br><br></br>Follow us below to discover where your next favorite food truck is serving -- in real time.</strong></p>
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
              href="#"
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
  href="#WithinTheQuotationMarksForNowUntilICanImplementTheCorrectURLs"
  target="_blank"
  rel="noopener noreferrer"
  style={{ color: '#000000' }}
  className="social-icon"
  aria-label="X"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="28"
    viewBox="0 0 448 512"
    fill="currentColor"
  >
    <path d="M400 32L272 208l128 240H320L224 280 128 480H48L176 288 48 32h96l96 160L304 32h96z" />
  </svg>
</a>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;