import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OrderProgressTracker = ({ currentStatus, estimatedTime, orderTime }) => {
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
      case 'completed': return '#4CAF50';
      case 'active': return '#2196F3';
      case 'inactive': return '#E0E0E0';
      default: return '#E0E0E0';
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

  const getEstimatedTimeRemaining = () => {
    if (!estimatedTime || !orderTime || currentStatus === 'completed' || currentStatus === 'cancelled') {
      return null;
    }

    const orderTimestamp = orderTime.getTime();
    const estimatedReadyTime = orderTimestamp + (estimatedTime * 60 * 1000);
    const now = Date.now();
    const timeRemaining = Math.max(0, Math.floor((estimatedReadyTime - now) / 60000));

    return timeRemaining;
  };

  const timeRemaining = getEstimatedTimeRemaining();

  if (currentStatus === 'cancelled') {
    return (
      <View style={styles.container}>
        <View style={styles.cancelledContainer}>
          <Ionicons name="close-circle" size={48} color="#F44336" />
          <Text style={styles.cancelledTitle}>Order Cancelled</Text>
          <Text style={styles.cancelledSubtitle}>This order was cancelled. Refund in 3-5 days.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Time Remaining */}
      {timeRemaining !== null && timeRemaining > 0 && (
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={20} color="#2196F3" />
          <Text style={styles.timeText}>
            Estimated time remaining: {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {timeRemaining === 0 && currentStatus !== 'ready' && currentStatus !== 'completed' && (
        <View style={styles.timeContainer}>
          <Ionicons name="hourglass-outline" size={20} color="#FF9800" />
          <Text style={[styles.timeText, { color: '#FF9800' }]}>
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
                    status === 'completed' && styles.completedText,
                    status === 'active' && styles.activeText
                  ]}>
                    {step.label}
                  </Text>
                  <Text style={[
                    styles.stepDescription,
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
                  { backgroundColor: status === 'completed' ? '#4CAF50' : '#E0E0E0' }
                ]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Current Status Message */}
      <View style={styles.statusMessageContainer}>
        {currentStatus === 'pending' && (
          <Text style={styles.statusMessage}>
            🕐 Waiting for kitchen to confirm your order...
          </Text>
        )}
        {currentStatus === 'confirmed' && (
          <Text style={styles.statusMessage}>
            ✅ Great! The kitchen has confirmed your order and will start cooking soon.
          </Text>
        )}
        {currentStatus === 'preparing' && (
          <Text style={styles.statusMessage}>
            🔥 Your delicious food is being prepared right now!
          </Text>
        )}
        {currentStatus === 'ready' && (
          <Text style={[styles.statusMessage, styles.readyMessage]}>
            🎉 Your order is ready for pickup! Head over to the truck.
          </Text>
        )}
        {currentStatus === 'completed' && (
          <Text style={styles.statusMessage}>
            ✨ Order complete! Thanks for choosing us. Enjoy your meal!
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
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  timeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
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
  stepDescription: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  completedText: {
    color: '#4CAF50',
  },
  activeText: {
    color: '#2196F3',
  },
  completedDescription: {
    color: '#4CAF50',
  },
  activeDescription: {
    color: '#2196F3',
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
  cancelledSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default OrderProgressTracker;
