import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import '../assets/EventModal.css';

const EventModal = ({ event, isOpen, onClose, onApply }) => {
  const [organizerSocialLinks, setOrganizerSocialLinks] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event?.createdBy && isOpen) {
      fetchOrganizerSocialLinks();
    }
  }, [event?.createdBy, isOpen]);

  const fetchOrganizerSocialLinks = async () => {
    if (!event?.createdBy) return;
    
    setLoading(true);
    try {
      const organizerDoc = await getDoc(doc(db, "users", event.createdBy));
      if (organizerDoc.exists()) {
        const organizerData = organizerDoc.data();
        setOrganizerSocialLinks({
          facebook: organizerData.facebook || '',
          instagram: organizerData.instagram || '',
          tiktok: organizerData.tiktok || '',
          twitter: organizerData.twitter || '',
          organizationName: organizerData.organizationName || organizerData.truckName || 'Event Organizer'
        });
      }
    } catch (error) {
      console.error("Error fetching organizer social links:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !event) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getVendorCount = () => {
    // This would be calculated from applications or vendor assignments
    return event.confirmedVendors || event.maxVendors || 'TBD';
  };

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          ✕
        </button>

        <div className="event-modal-header">
          <div className="event-type-badge">
            {event.eventType === 'festival' && '🎪'}
            {event.eventType === 'market' && '🏪'}
            {event.eventType === 'fair' && '🎡'}
            {event.eventType === 'street-festival' && '🛣️'}
            {event.eventType === 'corporate' && '🏢'}
            {event.eventType === 'private' && '🏠'}
            {event.eventType === 'other' && '🎭'}
            <span className="event-type-text">
              {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
            </span>
          </div>

          <h2 className="event-title">{event.eventName}</h2>
          
          {event.eventPhotos && event.eventPhotos.length > 0 && (
            <div className="event-photos">
              <img 
                src={event.eventPhotos[0]} 
                alt={event.eventName}
                className="event-main-photo"
              />
            </div>
          )}
        </div>

        <div className="event-modal-body">
          <div className="event-info-grid">
            
            {/* Location Info */}
            <div className="info-section">
              <h4>📍 Location</h4>
              <div className="location-details">
                <p className="venue-name">{event.venueName}</p>
                <p className="address">
                  {event.address}<br />
                  {event.city}, {event.state} {event.zipCode}
                </p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="info-section">
              <h4>📅 Date & Time</h4>
              <div className="datetime-details">
                <p><strong>Date:</strong> {formatDate(event.startDate || event.date)}</p>
                <p><strong>Start Time:</strong> {formatTime(event.startTime || event.time)}</p>
                {(event.endTime || event.endTime) && (
                  <p><strong>End Time:</strong> {formatTime(event.endTime || event.endTime)}</p>
                )}
                {event.endDate && event.endDate !== (event.startDate || event.date) && (
                  <p><strong>End Date:</strong> {formatDate(event.endDate)}</p>
                )}
              </div>
            </div>

            {/* Vendor Info */}
            <div className="info-section">
              <h4>🚚 Mobile Vendors</h4>
              <div className="vendor-info">
                <div className="vendor-count">
                  <span className="count-number">{getVendorCount()}</span>
                  <span className="count-label">
                    {event.maxVendors ? `of ${event.maxVendors} vendors` : 'vendors expected'}
                  </span>
                </div>
                {event.vendorCategories && event.vendorCategories.length > 0 && (
                  <div className="vendor-categories">
                    <p><strong>Food Types:</strong></p>
                    <div className="category-tags">
                      {event.vendorCategories.slice(0, 4).map((category, index) => (
                        <span key={index} className="category-tag">
                          {category}
                        </span>
                      ))}
                      {event.vendorCategories.length > 4 && (
                        <span className="category-tag more">
                          +{event.vendorCategories.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {event.eventDescription && (
              <div className="info-section full-width">
                <h4>📝 About This Event</h4>
                <p className="event-description">{event.eventDescription}</p>
              </div>
            )}

            {/* Contact Info */}
            <div className="info-section">
              <h4>📞 Contact</h4>
              <div className="contact-info">
                <p><strong>{event.contactName}</strong></p>
                <p>{event.contactEmail}</p>
                {event.contactPhone && <p>{event.contactPhone}</p>}
              </div>
            </div>

            {/* Additional Info */}
            <div className="info-section">
              <h4>ℹ️ Additional Info</h4>
              <div className="additional-info">
                {event.vendorFee && (
                  <p><strong>Vendor Fee:</strong> ${event.vendorFee}</p>
                )}
                {event.applicationDeadline && (
                  <p><strong>Application Deadline:</strong> {formatDate(event.applicationDeadline)}</p>
                )}
                {event.parkingInfo && (
                  <p><strong>Parking:</strong> {event.parkingInfo}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="event-actions">
            {event.website && (
              <a 
                href={event.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="action-btn website-btn"
              >
                🌐 Visit Website
              </a>
            )}
            
            {/* Only show Apply button for events that accept applications */}
            {event.acceptingApplications && event.eventType === 'full-event' && (
              <button 
                className="action-btn apply-btn"
                onClick={() => {
                  console.log('Apply to event:', event.id);
                  if (onApply) {
                    onApply();
                  }
                }}
              >
                📝 Apply as Vendor
              </button>
            )}
            
            {/* Show different message for display-only events */}
            {event.eventType === 'display-only' && (
              <div style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '15px',
                textAlign: 'center',
                margin: '10px 0'
              }}>
                <p style={{ margin: 0, color: '#6c757d' }}>
                  📍 This is a display marker. For vendor applications, check the "Create Event" section in the Event Dashboard.
                </p>
              </div>
            )}
            
            <button 
              className="action-btn interested-btn"
              onClick={() => {
                // Handle marking as interested for customers
                console.log('Mark as interested:', event.id);
              }}
            >
              ⭐ I'm Interested
            </button>
          </div>

          {/* Social Media Links */}
          {(event.socialMedia?.facebook || event.socialMedia?.instagram || event.socialMedia?.twitter || 
            organizerSocialLinks.facebook || organizerSocialLinks.instagram || organizerSocialLinks.tiktok || organizerSocialLinks.twitter) && (
            <div className="social-links">
              {/* Event-specific social media */}
              {(event.socialMedia?.facebook || event.socialMedia?.instagram || event.socialMedia?.twitter) && (
                <div className="social-section">
                  <h4>📱 Follow this Event</h4>
                  <div className="social-buttons">
                    {event.socialMedia.facebook && (
                      <a href={event.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="social-btn facebook">
                        📘 Facebook
                      </a>
                    )}
                    {event.socialMedia.instagram && (
                      <a href={event.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="social-btn instagram">
                        📷 Instagram
                      </a>
                    )}
                    {event.socialMedia.twitter && (
                      <a href={event.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="social-btn twitter">
                        ❌ X (Twitter)
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Organizer social media */}
              {(organizerSocialLinks.facebook || organizerSocialLinks.instagram || organizerSocialLinks.tiktok || organizerSocialLinks.twitter) && (
                <div className="social-section">
                  <h4>🏢 Follow {organizerSocialLinks.organizationName}</h4>
                  <div className="social-buttons">
                    {organizerSocialLinks.facebook && (
                      <a href={organizerSocialLinks.facebook} target="_blank" rel="noopener noreferrer" className="social-btn facebook">
                        � Facebook
                      </a>
                    )}
                    {organizerSocialLinks.instagram && (
                      <a href={organizerSocialLinks.instagram} target="_blank" rel="noopener noreferrer" className="social-btn instagram">
                        📷 Instagram
                      </a>
                    )}
                    {organizerSocialLinks.tiktok && (
                      <a href={organizerSocialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="social-btn tiktok">
                        🎵 TikTok
                      </a>
                    )}
                    {organizerSocialLinks.twitter && (
                      <a href={organizerSocialLinks.twitter} target="_blank" rel="noopener noreferrer" className="social-btn twitter">
                        ❌ X (Twitter)
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal;
