import React from 'react';

const EventStatusLegend = ({ style = {} }) => {
  const legendItems = [
    { status: 'active', color: '#FFD700', label: 'Happening Now', description: 'Event is currently active' },
    { status: 'inactive', color: '#9E9E9E', label: 'Not Active', description: 'Draft, published, completed, or cancelled' },
  ];

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      border: '1px solid #e0e0e0',
      zIndex: 1000,
      fontSize: '12px',
      minWidth: '180px',
      ...style
    }}>
      <h4 style={{ 
        margin: '0 0 10px 0', 
        fontSize: '14px', 
        color: '#333',
        borderBottom: '1px solid #eee',
        paddingBottom: '8px'
      }}>
        ⭐ Event Status
      </h4>
      
      {legendItems.map((item) => (
        <div key={item.status} style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '8px',
          gap: '8px'
        }}>
          <div style={{
            width: '14px',
            height: '14px',
            backgroundColor: item.color,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
            flexShrink: 0
          }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 'bold', color: '#333' }}>
              {item.label}
            </span>
            <br />
            <span style={{ color: '#666', fontSize: '11px' }}>
              {item.description}
            </span>
          </div>
        </div>
      ))}
      
      <div style={{
        marginTop: '10px',
        paddingTop: '8px',
        borderTop: '1px solid #eee',
        fontSize: '11px',
        color: '#888',
        fontStyle: 'italic'
      }}>
        💡 Yellow = Active, Gray = Inactive
      </div>
    </div>
  );
};

export default EventStatusLegend;
