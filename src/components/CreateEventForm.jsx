import React, { useState } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { validatePhoneNumber, formatPhoneE164 } from '../utils/twilioService';
import '../assets/CreateEventForm.css';

const CreateEventForm = ({ organizerId, onEventCreated }) => {
  const [formData, setFormData] = useState({
    // Basic Event Information
    eventName: '',
    eventDescription: '',
    eventType: 'festival', // festival, market, fair, other
    
    // Location Information
    venueName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    
    // Date and Time
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    
    // Vendor Information
    maxVendors: '',
    vendorCategories: [],
    applicationDeadline: '',
    vendorFee: '',
    
    // Contact Information
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    
    // Additional Information
    website: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: ''
    },
    additionalRequirements: '',
    parkingInfo: '',
    setupInfo: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const eventTypes = [
    { value: 'festival', label: 'Food Festival' },
    { value: 'market', label: 'Farmers Market' },
    { value: 'fair', label: 'County Fair' },
    { value: 'street-festival', label: 'Street Festival' },
    { value: 'corporate', label: 'Corporate Event' },
    { value: 'private', label: 'Private Event' },
    { value: 'other', label: 'Other' }
  ];

  const vendorCategoryOptions = [
    'Food Trucks',
    'Dessert Vendors',
    'Beverage Vendors',
    'Local Restaurants',
    'Specialty Foods',
    'International Cuisine',
    'Healthy Options',
    'BBQ & Grilling',
    'Baked Goods',
    'Craft Vendors',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Handle nested objects (like socialMedia.facebook)
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCategoryChange = (category) => {
    setFormData(prev => ({
      ...prev,
      vendorCategories: prev.vendorCategories.includes(category)
        ? prev.vendorCategories.filter(c => c !== category)
        : [...prev.vendorCategories, category]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.eventName.trim()) newErrors.eventName = 'Event name is required';
    if (!formData.eventDescription.trim()) newErrors.eventDescription = 'Event description is required';
    if (!formData.venueName.trim()) newErrors.venueName = 'Venue name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    if (!formData.contactName.trim()) newErrors.contactName = 'Contact name is required';
    if (!formData.contactEmail.trim()) newErrors.contactEmail = 'Contact email is required';
    if (!formData.contactPhone.trim()) newErrors.contactPhone = 'Contact phone is required';

    // Date validation
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    // Application deadline validation
    if (formData.applicationDeadline && formData.startDate) {
      if (new Date(formData.applicationDeadline) >= new Date(formData.startDate)) {
        newErrors.applicationDeadline = 'Application deadline must be before event start date';
      }
    }

    // Phone validation
    if (formData.contactPhone && !validatePhoneNumber(formData.contactPhone)) {
      newErrors.contactPhone = 'Please enter a valid phone number';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.contactEmail && !emailRegex.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    // Vendor categories validation
    if (formData.vendorCategories.length === 0) {
      newErrors.vendorCategories = 'Please select at least one vendor category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Format phone number
      const formattedPhone = formatPhoneE164(formData.contactPhone);

      // Prepare event data
      const eventData = {
        ...formData,
        contactPhone: formattedPhone,
        organizerId,
        status: 'draft', // draft, published, cancelled
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Generate event URL slug
        urlSlug: formData.eventName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
          
        // Initialize counters
        viewCount: 0,
        interestedCount: 0,
        vendorApplicationCount: 0
      };

      // Create event in Firestore
      const eventRef = await addDoc(collection(db, 'events'), eventData);
      
      console.log('✅ Event created successfully:', eventRef.id);
      
      // Reset form
      setFormData({
        eventName: '',
        eventDescription: '',
        eventType: 'festival',
        venueName: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        maxVendors: '',
        vendorCategories: [],
        applicationDeadline: '',
        vendorFee: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        website: '',
        socialMedia: {
          facebook: '',
          instagram: '',
          twitter: ''
        },
        additionalRequirements: '',
        parkingInfo: '',
        setupInfo: ''
      });

      setErrors({});
      
      // Notify parent component
      if (onEventCreated) {
        onEventCreated();
      }

      alert('🎉 Event created successfully! You can now manage it from your events tab.');

    } catch (error) {
      console.error('❌ Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-form">
      <form onSubmit={handleSubmit} className="event-form">
        
        {/* Basic Event Information */}
        <div className="form-section">
          <h4>📋 Basic Event Information</h4>
          
          <div className="form-group">
            <label htmlFor="eventName">Event Name *</label>
            <input
              type="text"
              id="eventName"
              name="eventName"
              value={formData.eventName}
              onChange={handleInputChange}
              placeholder="e.g., Downtown Food Truck Festival"
              className={errors.eventName ? 'error' : ''}
            />
            {errors.eventName && <span className="error-message">{errors.eventName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="eventType">Event Type *</label>
            <select
              id="eventType"
              name="eventType"
              value={formData.eventType}
              onChange={handleInputChange}
            >
              {eventTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="eventDescription">Event Description *</label>
            <textarea
              id="eventDescription"
              name="eventDescription"
              value={formData.eventDescription}
              onChange={handleInputChange}
              placeholder="Describe your event, what makes it special, and what attendees can expect..."
              rows="4"
              className={errors.eventDescription ? 'error' : ''}
            />
            {errors.eventDescription && <span className="error-message">{errors.eventDescription}</span>}
          </div>
        </div>

        {/* Location Information */}
        <div className="form-section">
          <h4>📍 Location Information</h4>
          
          <div className="form-group">
            <label htmlFor="venueName">Venue Name *</label>
            <input
              type="text"
              id="venueName"
              name="venueName"
              value={formData.venueName}
              onChange={handleInputChange}
              placeholder="e.g., Downtown City Park"
              className={errors.venueName ? 'error' : ''}
            />
            {errors.venueName && <span className="error-message">{errors.venueName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="address">Street Address *</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="123 Main Street"
              className={errors.address ? 'error' : ''}
            />
            {errors.address && <span className="error-message">{errors.address}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City *</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="City"
                className={errors.city ? 'error' : ''}
              />
              {errors.city && <span className="error-message">{errors.city}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="state">State *</label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                placeholder="State"
                className={errors.state ? 'error' : ''}
              />
              {errors.state && <span className="error-message">{errors.state}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="zipCode">ZIP Code *</label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                placeholder="12345"
                className={errors.zipCode ? 'error' : ''}
              />
              {errors.zipCode && <span className="error-message">{errors.zipCode}</span>}
            </div>
          </div>
        </div>

        {/* Date and Time */}
        <div className="form-section">
          <h4>📅 Date and Time</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className={errors.startDate ? 'error' : ''}
              />
              {errors.startDate && <span className="error-message">{errors.startDate}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="endDate">End Date *</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className={errors.endDate ? 'error' : ''}
              />
              {errors.endDate && <span className="error-message">{errors.endDate}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">Start Time *</label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                className={errors.startTime ? 'error' : ''}
              />
              {errors.startTime && <span className="error-message">{errors.startTime}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="endTime">End Time *</label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                className={errors.endTime ? 'error' : ''}
              />
              {errors.endTime && <span className="error-message">{errors.endTime}</span>}
            </div>
          </div>
        </div>

        {/* Vendor Information */}
        <div className="form-section">
          <h4>🚚 Vendor Information</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="maxVendors">Maximum Number of Vendors</label>
              <input
                type="number"
                id="maxVendors"
                name="maxVendors"
                value={formData.maxVendors}
                onChange={handleInputChange}
                placeholder="e.g., 25"
                min="1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="vendorFee">Vendor Participation Fee ($)</label>
              <input
                type="number"
                id="vendorFee"
                name="vendorFee"
                value={formData.vendorFee}
                onChange={handleInputChange}
                placeholder="e.g., 150"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="applicationDeadline">Application Deadline</label>
            <input
              type="date"
              id="applicationDeadline"
              name="applicationDeadline"
              value={formData.applicationDeadline}
              onChange={handleInputChange}
              className={errors.applicationDeadline ? 'error' : ''}
            />
            {errors.applicationDeadline && <span className="error-message">{errors.applicationDeadline}</span>}
          </div>

          <div className="form-group">
            <label>Vendor Categories *</label>
            <div className="checkbox-grid">
              {vendorCategoryOptions.map(category => (
                <label key={category} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.vendorCategories.includes(category)}
                    onChange={() => handleCategoryChange(category)}
                  />
                  {category}
                </label>
              ))}
            </div>
            {errors.vendorCategories && <span className="error-message">{errors.vendorCategories}</span>}
          </div>
        </div>

        {/* Contact Information */}
        <div className="form-section">
          <h4>📞 Contact Information</h4>
          
          <div className="form-group">
            <label htmlFor="contactName">Contact Name *</label>
            <input
              type="text"
              id="contactName"
              name="contactName"
              value={formData.contactName}
              onChange={handleInputChange}
              placeholder="Your full name"
              className={errors.contactName ? 'error' : ''}
            />
            {errors.contactName && <span className="error-message">{errors.contactName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contactEmail">Contact Email *</label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                placeholder="your@email.com"
                className={errors.contactEmail ? 'error' : ''}
              />
              {errors.contactEmail && <span className="error-message">{errors.contactEmail}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="contactPhone">Contact Phone *</label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                placeholder="(555) 123-4567"
                className={errors.contactPhone ? 'error' : ''}
              />
              {errors.contactPhone && <span className="error-message">{errors.contactPhone}</span>}
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="form-section">
          <h4>🌐 Additional Information</h4>
          
          <div className="form-group">
            <label htmlFor="website">Event Website</label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              placeholder="https://www.yourevent.com"
            />
          </div>

          <div className="form-group">
            <label>Social Media</label>
            <div className="form-row">
              <input
                type="url"
                name="socialMedia.facebook"
                value={formData.socialMedia.facebook}
                onChange={handleInputChange}
                placeholder="Facebook URL"
              />
              <input
                type="url"
                name="socialMedia.instagram"
                value={formData.socialMedia.instagram}
                onChange={handleInputChange}
                placeholder="Instagram URL"
              />
              <input
                type="url"
                name="socialMedia.twitter"
                value={formData.socialMedia.twitter}
                onChange={handleInputChange}
                placeholder="Twitter URL"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="parkingInfo">Parking Information</label>
            <textarea
              id="parkingInfo"
              name="parkingInfo"
              value={formData.parkingInfo}
              onChange={handleInputChange}
              placeholder="Describe parking availability, costs, restrictions..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="setupInfo">Setup Information for Vendors</label>
            <textarea
              id="setupInfo"
              name="setupInfo"
              value={formData.setupInfo}
              onChange={handleInputChange}
              placeholder="Setup times, electrical availability, space dimensions..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="additionalRequirements">Additional Requirements</label>
            <textarea
              id="additionalRequirements"
              name="additionalRequirements"
              value={formData.additionalRequirements}
              onChange={handleInputChange}
              placeholder="Insurance requirements, permits, special instructions..."
              rows="3"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? '🔄 Creating Event...' : '🎉 Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEventForm;
