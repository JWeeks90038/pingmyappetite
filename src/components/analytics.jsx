import React, { useEffect, useState } from 'react';
import {
  collection, query, where, onSnapshot, Timestamp, doc, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { differenceInMinutes } from 'date-fns';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement, BarElement, ArcElement,
  CategoryScale, LinearScale, Tooltip, Legend,
  PointElement
} from 'chart.js';
import '../assets/Analytics.css';

ChartJS.register(LineElement, BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement);

const Analytics = ({ ownerData }) => {
  console.log("Analytics ownerData:", ownerData);

  const [plan, setPlan] = useState(null);
  const [pingStats, setPingStats] = useState({
    last7Days: 0,
    last30Days: 0,
    recentPings: [],
    cuisineMatchCount: 0,
    topHours: [],
    topLocations: [],
    cuisineTrends: [],
    dailyAvg: 0,
    trendDiff: 0,
    last7DaysByDate: [], // for charting
    cuisineMap: {},       // for charting
    hourCounts: {},       // for charting
  });

  const [favoritesCount, setFavoritesCount] = useState(0);

useEffect(() => {
  if (!ownerData?.uid) return;

  // Listen for changes in favorites for this owner
  const favQuery = query(
    collection(db, 'favorites'),
    where('truckId', '==', ownerData.uid)
  );
  const unsubscribeFav = onSnapshot(favQuery, (snapshot) => {
    setFavoritesCount(snapshot.size);
  });

  return () => {
    unsubscribeFav();
    
  };
}, [ownerData]);

  useEffect(() => {
  if (!ownerData?.uid) return;

  let unsubscribeUser = null;
  let unsubscribePings = null;

  const userDocRef = doc(db, 'users', ownerData.uid);

  unsubscribeUser = onSnapshot(userDocRef, async (ownerDoc) => {
    if (!ownerDoc.exists()) {
      setPlan('basic');
      return;
    }
    setPlan(ownerDoc.data().plan || 'basic');
    if ((ownerDoc.data().plan || 'basic') !== 'all-access') return;

    const cuisines = Array.isArray(ownerData.cuisines)
      ? ownerData.cuisines
      : [ownerData.cuisine].filter(Boolean);

    const truckDoc = await getDoc(doc(db, 'truckLocations', ownerData.uid));
    if (!truckDoc.exists()) return;

    const { lat, lng } = truckDoc.data();
    if (!lat || !lng) return;

    const truckLocation = { lat, lng };
    const nowMs = Date.now();
    const sevenDaysAgo = Timestamp.fromDate(new Date(nowMs - 7 * 24 * 60 * 60 * 1000));
    const thirtyDaysAgo = Timestamp.fromDate(new Date(nowMs - 30 * 24 * 60 * 60 * 1000));
    const prevWeekStart = Timestamp.fromDate(new Date(nowMs - 14 * 24 * 60 * 60 * 1000));

    const q = query(collection(db, 'pings'), where('timestamp', '>=', thirtyDaysAgo));
    if (unsubscribePings) unsubscribePings(); // Clean up previous listener
    unsubscribePings = onSnapshot(q, (snapshot) => {
      const pings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const last7 = pings.filter(p => p.timestamp.seconds >= sevenDaysAgo.seconds);
      const cuisineMatches = last7.filter(p => cuisines.includes(p.cuisineType));

      const getLoc = (p) =>
        p.location || (p.lat && p.lng ? { lat: p.lat, lng: p.lng } : null);

      const nearbyPings7 = last7.filter(p => {
        const loc = getLoc(p);
        return loc && getDistanceFromLatLonInKm(truckLocation.lat, truckLocation.lng, loc.lat, loc.lng) <= 5;
      });

      const nearbyPings30 = pings.filter(p => {
        const loc = getLoc(p);
        return loc && getDistanceFromLatLonInKm(truckLocation.lat, truckLocation.lng, loc.lat, loc.lng) <= 80;
      });

      const recentPings = [...nearbyPings7].slice(-5).reverse();

      const hourCounts = {};
      const dateCounts = {};
      const cuisineMap = {};

      last7.forEach(p => {
        const date = new Date(p.timestamp.seconds * 1000);
        const day = date.toISOString().slice(0, 10);
        const hour = date.getHours();

        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        dateCounts[day] = (dateCounts[day] || 0) + 1;

        if (p.cuisineType) {
          cuisineMap[p.cuisineType] = (cuisineMap[p.cuisineType] || 0) + 1;
        }
      });

      const topHours = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour, count]) => `${formatHour(hour)} (${count} pings)`);

      const locationMap = {};
      last7.forEach(p => {
        const address = p.address;
        if (address) {
          locationMap[address] = (locationMap[address] || 0) + 1;
        }
      });

      const topLocations = Object.entries(locationMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([address, count]) => ({ address, count }));

      const cuisineTrends = Object.entries(cuisineMap)
        .sort((a, b) => b[1] - a[1])
        .map(([cuisine, count]) => `${cuisine} (${count})`);

      const dailyAvg = (last7.length / 7).toFixed(1);
      const prevWeekPings = pings.filter(p =>
        p.timestamp.seconds >= prevWeekStart.seconds &&
        p.timestamp.seconds < sevenDaysAgo.seconds
      );
      const trendDiff = last7.length - prevWeekPings.length;

      setPingStats({
        last7Days: nearbyPings7.length,
        last30Days: nearbyPings30.length,
        recentPings,
        cuisineMatchCount: cuisineMatches.length,
        topHours,
        topLocations,
        cuisineTrends,
        dailyAvg,
        trendDiff,
        last7DaysByDate: dateCounts,
        cuisineMap,
        hourCounts
      });
    });
  });

  return () => {
    if (unsubscribeUser) unsubscribeUser();
    if (unsubscribePings) unsubscribePings();
  };
}, [ownerData]);
  

  if (plan === null) return <p>Loading analytics...</p>;
  if (plan !== 'all-access') {
    return (
      <div className="analytics-container">
        <h2>Analytics Unavailable</h2>
        <p>This feature is only available with the <strong>All-Access</strong> plan.</p>
      </div>
    );
  }

  // Chart Data
  const lineChartData = {
    labels: Object.keys(pingStats.last7DaysByDate),
    datasets: [{
      label: 'Pings per Day',
      data: Object.values(pingStats.last7DaysByDate),
      fill: false,
      borderColor: '#4bc0c0',
      tension: 0.3
    }]
  };

  const barChartData = {
    labels: Object.keys(pingStats.hourCounts).map(formatHour),
    datasets: [{
      label: 'Pings by Hour',
      data: Object.values(pingStats.hourCounts),
      backgroundColor: '#ff6384'
    }]
  };

  const doughnutData = {
    labels: Object.keys(pingStats.cuisineMap),
    datasets: [{
      label: 'Cuisine Types',
      data: Object.values(pingStats.cuisineMap),
      backgroundColor: ['#ffcd56', '#36a2eb', '#ff6384', '#4bc0c0', '#9966ff']
    }]
  };

  return (
    <div className="analytics-container">
      <h2>Analytics Dashboard</h2>

      <div className="chart-block">
        <h3>Pings Per Day (Last 7 Days)</h3>
        <Line data={lineChartData} />
      </div>

      <div className="chart-block">
        <h3>Popular Ping Times</h3>
        <Bar data={barChartData} />
      </div>

      <div className="chart-block doughnut-chart"><br></br>
        <h3>Top Cuisines</h3>
        <Doughnut data={doughnutData} />
      </div><br></br><br></br><br></br><br></br><br></br><br></br>

      <div className="analytics-item"><strong>Total Pings (Last 7 Days within 3 Miles):</strong> {pingStats.last7Days}</div>
      <div className="analytics-item"><strong>Total Pings (Last 30 Days within 50 Miles):</strong> {pingStats.last30Days}</div>
      <div className="analytics-item"><strong>Current Cuisine Match Requests:</strong> {pingStats.cuisineMatchCount}</div>
      <div className="analytics-item"><strong>Recent Ping Locations:</strong>

        <ul style={{ listStyleType: 'none', paddingLeft: 0, marginLeft: 0 }}>
  {pingStats.recentPings.map((ping, i) => (
    <li key={i}>{ping.address || `Lat: ${ping.location?.lat}, Lng: ${ping.location?.lng}`}</li>
  ))}
</ul>
      </div>
      <div className="analytics-item"><strong>Top Ping Locations:</strong>
  <ul style={{ listStyleType: 'none', paddingLeft: 0, marginLeft: 0 }}>
  {pingStats.topLocations.map((loc, i) => (
    <li key={i}>{loc.address} - {loc.count} pings</li>
  ))}
</ul>
</div>
      <div className="analytics-item"><strong>Daily Avg:</strong> {pingStats.dailyAvg}</div>
      <div className="analytics-item"><strong>Interest Change vs Last Week:</strong> {pingStats.trendDiff >= 0 ? '+' : ''}{pingStats.trendDiff} pings</div>
      <div className="analytics-item"><strong>Customer Favorites:</strong> {favoritesCount}</div>
    </div>
    
  );
};

// Utility Functions
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
function formatHour(hour) {
  const h = parseInt(hour);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}${suffix}`;
}
function calculateLiveMinutes(sessions) {
  const now = new Date();
  return sessions.reduce((acc, session) => {
    const start = session.start?.toDate?.();
    const end = session.end?.toDate?.();
    if (start && end) {
      acc += differenceInMinutes(end, start);
    } else if (start && !end) {
      acc += differenceInMinutes(now, start);
    }
    return acc;
  }, 0);
}

export default Analytics;
