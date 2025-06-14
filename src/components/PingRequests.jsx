import React from 'react';
import LiveMap from '../components/LiveMap';
import { Link } from 'react-router-dom';
import PinDrop from '../utils/pinDrop'; // Correct default import
import Footer from '../components/footer';
import { auth } from '../firebase';
import '../assets/styles.css';

const PingRequests = () => {
  const handleReportSpam = (pingId) => {
    fetch('/report-spam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pingId }),
    })
      .then((response) => response.json())
      .then((data) => alert(data.message))
      .catch((error) => console.error('Error:', error));
  };

  const handleMapClick = async (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    const notes = "Customers want tacos here!";

    if (auth.currentUser) {
      await PinDrop({
        lat,
        lng,
        userId: auth.currentUser.uid,
        notes,
        cuisine: 'tacos', // Or dynamically based on dropdown
      });
      alert('Pin dropped!');
    } else {
      alert('Please log in to drop a pin.');
    }
  };

  return (
    <div>
      <nav>
        <Link to="/home">Home</Link>
        <Link to="/map">Map</Link>
        <Link to="/contact">Contact</Link>
      </nav>

      {/* Ping Request Section */}
      <section className="ping-section">
        <h1>Request a Food Truck</h1>
        <p>Let food trucks know where you want them! Drop a pin and create demand.</p>

        <form className="ping-form">
          <label htmlFor="location">Enter Your Location:</label>
          <input type="text" id="location" placeholder="e.g. 123 Main St, Los Angeles, CA" />

          <label htmlFor="cuisine">Preferred Cuisine:</label>
          <select id="cuisine">
            <option value="any">Any</option>
            <option value="mexican">Mexican</option>
            <option value="bbq">BBQ</option>
            <option value="asian">Asian</option>
            <option value="desserts">Desserts</option>
            <option value="vegan">Vegan</option>
          </select>

          <button type="submit" className="ping-btn">Send Ping</button>
        </form>
      </section>

      {/* Live Demand Heat Map */}
      <section className="heatmap-section">
        <h2>Live Food Truck Demand</h2>
        <p>See where people are requesting food trucks in real-time.</p>
        <LiveMap onMapClick={handleMapClick} />
      </section>

      {/* Active Pings List */}
      <section className="active-pings">
        <h2>Active Requests</h2>
        <ul id="ping-list">
          <li><strong>Downtown LA</strong> - 15 Requests for Tacos 🌮</li>
          <li><strong>Venice Beach</strong> - 8 Requests for Ice Cream 🍦</li>
          <li><strong>Santa Monica Pier</strong> - 12 Requests for BBQ 🍖</li>
        </ul>
      </section>

      {/* Example Ping Request */}
      <div id="ping-list">
        <div className="ping-request" data-ping-id="123">
          <p><strong>Location:</strong> Downtown LA</p>
          <p><strong>Requested Cuisine:</strong> Tacos</p>
          <p><strong>Time:</strong> 2:30 PM</p>
          <button className="report-spam-btn" onClick={() => handleReportSpam('123')}>
            Report Spam
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PingRequests;
