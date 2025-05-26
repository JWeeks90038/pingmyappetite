import React from 'react';

const gradientColors = [
  "rgba(0, 255, 255, 0)", // Transparent
  "rgba(0, 255, 255, 1)", // Cyan
  "rgba(0, 191, 255, 1)", // Light Blue
  "rgba(0, 127, 255, 1)", // Blue
  "rgba(0, 63, 255, 1)",  // Dark Blue
  "rgba(0, 0, 255, 1)",   // Solid Blue
  "rgba(255, 0, 0, 1)",   // Red (High Demand)
];

const HeatMapKey = () => {
  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Heatmap Intensity Key</h3>
      <p style={styles.description}>
        The gradient represents the intensity of demand or activity. 
        <strong> Lighter colors</strong> indicate lower activity, while <strong>darker colors</strong> and <strong>red</strong> indicate higher activity.
      </p>
      <div style={styles.gradientBox}>
        <div
          style={{
            ...styles.gradient,
            background: `linear-gradient(to right, ${gradientColors.join(", ")})`,
          }}
        />
        <div style={styles.labels}>
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginTop: '20px',
    marginLeft: 'auto',
    marginRight: 'auto',
    padding: '10px',
    borderRadius: '8px',
    backgroundColor: '#f5f5f5',
    width: '400px',
    boxShadow: '0px 0px 10px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  heading: {
    marginBottom: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    fontSize: '14px',
    marginBottom: '15px',
    color: '#555',
    textAlign: 'center',
  },
  gradientBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  gradient: {
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  labels: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: '5px',
    fontSize: '12px',
    color: '#555',
  },
};

export default HeatMapKey;