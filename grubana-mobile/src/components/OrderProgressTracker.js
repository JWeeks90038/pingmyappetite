import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OrderProgressTracker = ({ 
  currentStatus, 
  estimatedTime, 
  orderTime, 
  timeOverriddenAt = null,
  confirmedAt = null,
  preparingAt = null 
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update the current time every minute to refresh the countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const steps = [
    { key: 'pending', label: 'Order Placed', icon: 'checkmark-circle', description: 'Order received' },
    { key: 'confirmed', label: 'Confirmed', icon: 'thumbs-up', description: 'Kitchen confirmed' },
    { key: 'preparing', label: 'Cooking', icon: 'flame', description: 'Food being prepared' },
    { key: 'ready', label: 'Ready!', icon: 'notifications', description: 'Ready for pickup' },
    { key: 'completed', label: 'Complete', icon: 'checkmark-done', description: 'Order fulfilled' }
  ];

  const getStepStatus = (stepKey) => {
    const stepIndex = steps.findIndex(step => step.key === stepKey);
    const currentIndex = steps.findIndex(step => step.key === currentStatus);
    
    if (currentStatus === 'cancelled') {
      return stepIndex === 0 ? 'completed' : 'inactive';
    }
    
    if (stepIndex <= currentIndex) {
      return 'completed';
    } else if (stepIndex === currentIndex + 1) {
      return 'active';
    }
    return 'inactive';
  };

  const getStepColor = (status) => {
    switch (status) {
      case 'completed': return '#00E676';
      case 'active': return '#4DBFFF';
      case 'inactive': return '#1A1036';
      default: return '#1A1036';
    }
  };

  const getIconColor = (status) => {
    switch (status) {
      case 'completed': return '#FFFFFF';
      case 'active': return '#FFFFFF';
      case 'inactive': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusMessageStyle = (status) => {
    const baseStyle = [styles.statusMessageContainer];
    switch (status) {
      case 'pending_payment':
        return [...baseStyle, { backgroundColor: '#FF9800' }]; // Orange for payment processing
      case 'pending':
        return [...baseStyle, { backgroundColor: '#FF4EC9' }];
      case 'confirmed':
        return [...baseStyle, { backgroundColor: '#00E676' }];
      case 'preparing':
        return [...baseStyle, { backgroundColor: '#4DBFFF' }];
      case 'ready':
        return [...baseStyle, { backgroundColor: '#FF4EC9' }];
      case 'completed':
        return [...baseStyle, { backgroundColor: '#00E676' }];
      default:
        return baseStyle;
    }
  };

  const getEstimatedTimeRemaining = () => {
    if (!estimatedTime || currentStatus === 'completed' || currentStatus === 'cancelled') {
      return null;
    }

    // Determine the most appropriate start time for countdown
    const getCountdownStartTime = () => {
      // If time was manually overridden, use that timestamp as the NEW starting point
      // This means the countdown starts fresh from when the kitchen adjusted the time
      if (timeOverriddenAt) {
        return timeOverriddenAt instanceof Date ? timeOverriddenAt : new Date(timeOverriddenAt);
      }
      
      // If order is preparing, use when cooking started
      if (currentStatus === 'preparing' && preparingAt) {
        return preparingAt instanceof Date ? preparingAt : new Date(preparingAt);
      }
      
      // If order is confirmed, use when it was confirmed (when estimate became active)
      if ((currentStatus === 'confirmed' || currentStatus === 'preparing') && confirmedAt) {
        return confirmedAt instanceof Date ? confirmedAt : new Date(confirmedAt);
      }
      
      // For pending orders, use order time (order just placed, timer starts immediately)
      // For other statuses without specific timestamps, also use order time
      return orderTime;
    };

    const startTime = getCountdownStartTime();
    if (!startTime) {
      return null;
    }

    try {
      const startTimestamp = startTime instanceof Date ? startTime.getTime() : new Date(startTime).getTime();
      
      // When time is overridden, the estimatedTime should be the NEW time set by kitchen
      // The countdown starts fresh from timeOverriddenAt using the current estimatedTime
      const estimatedReadyTime = startTimestamp + (estimatedTime * 60 * 1000);
      const timeRemaining = Math.max(0, Math.floor((estimatedReadyTime - currentTime) / 60000));

      // Always return the time remaining, even if it's 0 (we'll handle 0 differently)
      return timeRemaining;
    } catch (error) {
      console.log('Error calculating time remaining:', error);
      return null;
    }
  };

  const timeRemaining = getEstimatedTimeRemaining();

  if (currentStatus === 'cancelled') {
    return (
      <View style={[styles.container, styles.darkContainer]}>
        <View style={styles.cancelledContainer}>
          <Ionicons name="close-circle" size={48} color="#FF4EC9" />
          <Text style={[styles.cancelledTitle, styles.darkCancelledTitle]}>Order Cancelled</Text>
          <Text style={[styles.cancelledSubtitle, styles.darkCancelledSubtitle]}>This order was cancelled. Refund in 3-5 days.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.darkContainer]}>
      {/* Time Remaining */}
      {(timeRemaining !== null || (estimatedTime && currentStatus !== 'completed' && currentStatus !== 'cancelled')) && (
        <View style={[styles.timeContainer, styles.darkTimeContainer]}>
          <Ionicons name="time-outline" size={20} color="#4DBFFF" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.timeText, styles.darkTimeText]}>
              {timeRemaining !== null ? (
                timeRemaining > 0 ? (
                  <>Estimated time remaining: {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''}</>
                ) : (
                  <>Order should be ready any moment!</>
                )
              ) : estimatedTime ? (
                <>Estimated prep time: {estimatedTime} minute{estimatedTime !== 1 ? 's' : ''}</>
              ) : (
                <>Preparing your order...</>
              )}
            </Text>
            {timeOverriddenAt && (
              <Text style={[styles.adjustedText]}>
                ⚡ Time adjusted by kitchen
              </Text>
            )}
          </View>
        </View>
      )}

      {timeRemaining === 0 && currentStatus !== 'ready' && currentStatus !== 'completed' && (
        <View style={[styles.timeContainer, styles.darkTimeContainer]}>
          <Ionicons name="hourglass-outline" size={20} color="#FF4EC9" />
          <Text style={[styles.timeText, styles.darkTimeText, { color: '#FF4EC9' }]}>
            Order should be ready soon!
          </Text>
        </View>
      )}

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {steps.map((step, index) => {
          const status = getStepStatus(step.key);
          const isLast = index === steps.length - 1;
          
          return (
            <View key={step.key} style={styles.stepContainer}>
              <View style={styles.stepContent}>
                {/* Step Circle */}
                <View style={[styles.stepCircle, { backgroundColor: getStepColor(status) }]}>
                  <Ionicons 
                    name={step.icon} 
                    size={20} 
                    color={getIconColor(status)}
                  />
                </View>
                
                {/* Step Info */}
                <View style={styles.stepInfo}>
                  <Text style={[
                    styles.stepLabel,
                    styles.darkStepLabel,
                    status === 'completed' && styles.completedText,
                    status === 'active' && styles.activeText
                  ]}>
                    {step.label}
                  </Text>
                  <Text style={[
                    styles.stepDescription,
                    styles.darkStepDescription,
                    status === 'completed' && styles.completedDescription,
                    status === 'active' && styles.activeDescription
                  ]}>
                    {step.description}
                  </Text>
                </View>
              </View>
              
              {/* Connecting Line */}
              {!isLast && (
                <View style={[
                  styles.connectingLine,
                  { backgroundColor: status === 'completed' ? '#00E676' : '#1A1036' }
                ]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Current Status Message */}
      <View style={getStatusMessageStyle(currentStatus)}>
        {currentStatus === 'pending_payment' && (
          <Text style={[styles.statusMessage, styles.statusMessageWhite]}>
            💳 Processing your payment...
          </Text>
        )}
        {currentStatus === 'pending' && (
          <Text style={[styles.statusMessage, styles.statusMessageWhite]}>
            🕐 Waiting for kitchen to confirm your order...
          </Text>
        )}
        {currentStatus === 'confirmed' && (
          <Text style={[styles.statusMessage, styles.statusMessageWhite]}>
            ✅ Great! The kitchen has confirmed your order and will start cooking soon.
          </Text>
        )}
        {currentStatus === 'preparing' && (
          <Text style={[styles.statusMessage, styles.statusMessageWhite]}>
            🔥 Your awesome order is being prepared right now!
          </Text>
        )}
        {currentStatus === 'ready' && (
          <Text style={[styles.statusMessage, styles.statusMessageWhite]}>
            🎉 Your order is ready for pickup! Head over to the truck.
          </Text>
        )}
        {currentStatus === 'completed' && (
          <Text style={[styles.statusMessage, styles.statusMessageWhite]}>
            ✨ Order complete! Thanks for choosing us. Enjoy!
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkContainer: {
    backgroundColor: '#0B0B1A',
    borderWidth: 1,
    borderColor: '#1A1036',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  darkTimeContainer: {
    backgroundColor: '#1A1036',
    borderWidth: 1,
    borderColor: '#4DBFFF',
  },
  timeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  darkTimeText: {
    color: '#4DBFFF',
  },
  adjustedText: {
    fontSize: 12,
    color: '#FF4EC9',
    fontStyle: 'italic',
    marginTop: 2,
  },
  progressContainer: {
    paddingVertical: 8,
  },
  stepContainer: {
    marginBottom: 16,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepInfo: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#757575',
    marginBottom: 2,
  },
  darkStepLabel: {
    color: '#FFFFFF',
  },
  stepDescription: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  darkStepDescription: {
    color: '#FFFFFF',
    opacity: 0.7,
  },
  completedText: {
    color: '#00E676',
  },
  activeText: {
    color: '#4DBFFF',
  },
  completedDescription: {
    color: '#00E676',
    opacity: 0.8,
  },
  activeDescription: {
    color: '#4DBFFF',
    opacity: 0.8,
  },
  connectingLine: {
    width: 2,
    height: 16,
    marginLeft: 19,
    marginTop: 4,
    marginBottom: -12,
  },
  statusMessageContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  statusMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  statusMessageWhite: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  readyMessage: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 8,
    color: '#2E7D32',
    fontWeight: '600',
  },
  cancelledContainer: {
    alignItems: 'center',
    padding: 20,
  },
  cancelledTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 8,
    marginBottom: 4,
  },
  darkCancelledTitle: {
    color: '#FF4EC9',
  },
  cancelledSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  darkCancelledSubtitle: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
});

export default OrderProgressTracker;
