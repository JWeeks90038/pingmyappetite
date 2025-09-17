import React from 'react';

export const GeolocationStatus = ({ className = "" }) => {
  const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
  const isGeolocationSupported = 'geolocation' in navigator;

  if (!isGeolocationSupported) {
    return (
      <div className={`geolocation-warning ${className}`} style={{
        backgroundColor: '#FFF3CD',
        border: '1px solid #FFEAA7',
        borderRadius: '4px',
        padding: '12px',
        margin: '10px 0',
        color: '#856404'
      }}>
        <strong>⚠️ Geolocation Not Supported</strong>
        <p>Your browser doesn't support location services. The map will show a default location.</p>
      </div>
    );
  }

  if (!isSecureContext) {
    return (
      <div className={`geolocation-warning ${className}`} style={{
        backgroundColor: '#F8D7DA',
        border: '1px solid #F1B2B5',
        borderRadius: '4px',
        padding: '12px',
        margin: '10px 0',
        color: '#721C24'
      }}>
        <strong>🔒 Location Access Limited</strong>
        <p>
          Location services may not work properly because this site is not using HTTPS. 
          {location.hostname !== 'localhost' && ' Please use the HTTPS version of this site for better location accuracy.'}
        </p>
      </div>
    );
  }

  return null;
};

export default GeolocationStatus;