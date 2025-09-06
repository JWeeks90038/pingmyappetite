import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const PreOrderWaitTimeEstimator = ({ truckId, cartItems = [], onEstimateUpdate }) => {
  const [estimates, setEstimates] = useState({
    currentWaitTime: null,
    peakTimeAdjustment: 0,
    queuePosition: 0,
    estimatedReadyTime: null,
    loading: true
  });

  const [truckMetrics, setTruckMetrics] = useState({
    averagePrepTime: 15, // Default 15 minutes
    currentCapacity: 0,
    maxCapacity: 3, // Default max 3 concurrent orders
    isRushHour: false
  });

  useEffect(() => {
    if (!truckId) return;

    calculateWaitTime();
    
    // Update estimates every 30 seconds
    const interval = setInterval(calculateWaitTime, 30000);
    
    return () => clearInterval(interval);
  }, [truckId, cartItems]);

  const calculateWaitTime = async () => {
    try {
      setEstimates(prev => ({ ...prev, loading: true }));

      // 1. Get truck's current metrics
      const truckData = await getTruckMetrics(truckId);
      setTruckMetrics(truckData);

      // 2. Get current queue status
      const queueData = await getCurrentQueue(truckId);

      // 3. Calculate item complexity for current cart
      const itemComplexity = calculateItemComplexity(cartItems);

      // 4. Determine if it's peak/rush hour
      const rushHourMultiplier = getRushHourMultiplier();

      // 5. Calculate base preparation time
      const basePrepTime = Math.max(
        truckData.averagePrepTime * itemComplexity.multiplier,
        itemComplexity.minimumTime
      );

      // 6. Add queue wait time
      const queueWaitTime = queueData.estimatedWaitMinutes;

      // 7. Apply peak hour adjustments
      const peakAdjustment = basePrepTime * (rushHourMultiplier - 1);

      // 8. Calculate final wait time
      const totalWaitMinutes = Math.ceil(
        queueWaitTime + basePrepTime + peakAdjustment
      );

      // 9. Estimate ready time
      const estimatedReadyTime = new Date(Date.now() + (totalWaitMinutes * 60 * 1000));

      const newEstimates = {
        currentWaitTime: totalWaitMinutes,
        peakTimeAdjustment: Math.ceil(peakAdjustment),
        queuePosition: queueData.position + 1, // +1 because they'll be next
        estimatedReadyTime,
        preparationTime: Math.ceil(basePrepTime),
        queueTime: Math.ceil(queueWaitTime),
        loading: false
      };

      setEstimates(newEstimates);
      
      // Notify parent component
      if (onEstimateUpdate) {
        onEstimateUpdate(newEstimates);
      }

    } catch (error) {
      console.error('❌ Error calculating wait time:', error);
      setEstimates(prev => ({ ...prev, loading: false }));
    }
  };

  const getTruckMetrics = async (truckId) => {
    try {
      // Get truck's basic info
      const truckDoc = await getDoc(doc(db, 'users', truckId));
      const truckData = truckDoc.exists() ? truckDoc.data() : {};

      // Get recent order history to calculate average prep times
      const recentOrdersQuery = query(
        collection(db, 'orders'),
        where('truckId', '==', truckId),
        where('status', 'in', ['completed', 'ready']),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const recentOrders = await getDocs(recentOrdersQuery);
      let totalPrepTime = 0;
      let completedOrders = 0;

      recentOrders.forEach(doc => {
        const order = doc.data();
        if (order.actualPrepTime) {
          totalPrepTime += order.actualPrepTime;
          completedOrders++;
        }
      });

      const averagePrepTime = completedOrders > 0 
        ? Math.ceil(totalPrepTime / completedOrders)
        : truckData.defaultPrepTime || 15;

      return {
        averagePrepTime,
        maxCapacity: truckData.maxConcurrentOrders || 3,
        defaultPrepTime: truckData.defaultPrepTime || 15,
        efficiency: truckData.efficiency || 1.0
      };

    } catch (error) {
      console.error('Error getting truck metrics:', error);
      return {
        averagePrepTime: 15,
        maxCapacity: 3,
        defaultPrepTime: 15,
        efficiency: 1.0
      };
    }
  };

  const getCurrentQueue = async (truckId) => {
    try {
      // Get currently active orders (confirmed, preparing)
      const activeOrdersQuery = query(
        collection(db, 'orders'),
        where('truckId', '==', truckId),
        where('status', 'in', ['confirmed', 'preparing']),
        orderBy('createdAt', 'asc')
      );

      const activeOrders = await getDocs(activeOrdersQuery);
      const queueLength = activeOrders.size;

      // Estimate wait time based on average prep time and queue
      const estimatedWaitMinutes = queueLength > 0 
        ? queueLength * (truckMetrics.averagePrepTime * 0.7) // 70% overlap efficiency
        : 0;

      return {
        position: queueLength,
        estimatedWaitMinutes: Math.ceil(estimatedWaitMinutes),
        activeOrders: queueLength
      };

    } catch (error) {
      console.error('Error getting current queue:', error);
      return {
        position: 0,
        estimatedWaitMinutes: 0,
        activeOrders: 0
      };
    }
  };

  const calculateItemComplexity = (items) => {
    if (!items || items.length === 0) {
      return { multiplier: 1, minimumTime: 5 };
    }

    let complexityScore = 0;
    let totalItems = 0;

    items.forEach(item => {
      const quantity = item.quantity || 1;
      totalItems += quantity;

      // Base complexity per item
      complexityScore += quantity * 1;

      // Category-based complexity
      if (item.category) {
        const category = item.category.toLowerCase();
        if (category.includes('grill') || category.includes('bbq')) {
          complexityScore += quantity * 2;
        } else if (category.includes('fried') || category.includes('cooked')) {
          complexityScore += quantity * 1.5;
        } else if (category.includes('sandwich') || category.includes('wrap')) {
          complexityScore += quantity * 1.2;
        }
      }

      // Special preparation complexity
      if (item.customizations && item.customizations.length > 0) {
        complexityScore += quantity * 0.5;
      }
    });

    // Calculate multiplier (min 1.0, max 3.0)
    const multiplier = Math.min(3.0, Math.max(1.0, 1 + (complexityScore / 10)));
    
    // Minimum time based on item count
    const minimumTime = Math.max(5, totalItems * 2);

    return {
      multiplier,
      minimumTime,
      complexityScore,
      totalItems
    };
  };

  const getRushHourMultiplier = () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Weekend rush hours
    if (day === 0 || day === 6) {
      if (hour >= 11 && hour <= 14) return 1.3; // Weekend lunch
      if (hour >= 17 && hour <= 20) return 1.2; // Weekend dinner
    }

    // Weekday rush hours
    if (day >= 1 && day <= 5) {
      if (hour >= 11 && hour <= 14) return 1.4; // Weekday lunch rush
      if (hour >= 17 && hour <= 19) return 1.3; // Weekday dinner rush
    }

    return 1.0; // Normal time
  };

  const formatEstimatedTime = (minutes) => {
    if (minutes <= 0) return 'Ready now!';
    if (minutes <= 5) return '~5 minutes';
    if (minutes <= 15) return `${Math.ceil(minutes / 5) * 5} minutes`;
    if (minutes <= 30) return `${Math.ceil(minutes / 5) * 5} minutes`;
    return `${Math.ceil(minutes / 10) * 10} minutes`;
  };

  const getWaitTimeColor = (minutes) => {
    if (minutes <= 10) return '#28a745'; // Green
    if (minutes <= 20) return '#ffc107'; // Yellow
    if (minutes <= 30) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };

  const getQueueStatusText = () => {
    if (estimates.queuePosition === 1) {
      return "You'll be next in line!";
    } else if (estimates.queuePosition <= 3) {
      return `${estimates.queuePosition - 1} orders ahead of you`;
    } else {
      return `${estimates.queuePosition - 1} orders in queue`;
    }
  };

  if (estimates.loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        margin: '10px 0'
      }}>
        <div style={{ fontSize: '16px', color: '#666' }}>
          ⏱️ Calculating wait time...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '20px',
      color: 'white',
      margin: '15px 0',
      boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
    }}>
      {/* Main Wait Time Display */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ 
          fontSize: '14px', 
          opacity: 0.9,
          marginBottom: '5px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Estimated Wait Time
        </div>
        <div style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: getWaitTimeColor(estimates.currentWaitTime),
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          marginBottom: '5px'
        }}>
          {formatEstimatedTime(estimates.currentWaitTime)}
        </div>
        {estimates.estimatedReadyTime && (
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            Ready around {estimates.estimatedReadyTime.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        )}
      </div>

      {/* Queue Status */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '15px',
        marginBottom: '15px'
      }}>
        <div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Queue Position</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            #{estimates.queuePosition}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {getQueueStatusText()}
          </div>
        </div>
      </div>

      {/* Time Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        fontSize: '13px'
      }}>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '10px',
          textAlign: 'center'
        }}>
          <div style={{ opacity: 0.8 }}>Queue Wait</div>
          <div style={{ fontWeight: 'bold' }}>
            {estimates.queueTime || 0} min
          </div>
        </div>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '10px',
          textAlign: 'center'
        }}>
          <div style={{ opacity: 0.8 }}>Prep Time</div>
          <div style={{ fontWeight: 'bold' }}>
            {estimates.preparationTime || 0} min
          </div>
        </div>
      </div>

      {/* Peak Time Notice */}
      {estimates.peakTimeAdjustment > 0 && (
        <div style={{
          marginTop: '15px',
          backgroundColor: 'rgba(255,193,7,0.2)',
          border: '1px solid rgba(255,193,7,0.3)',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          🔥 Peak time - {estimates.peakTimeAdjustment} min added to normal wait
        </div>
      )}

      {/* Live Updates Notice */}
      <div style={{
        marginTop: '15px',
        fontSize: '11px',
        opacity: 0.7,
        textAlign: 'center'
      }}>
        ⚡ Live updates • Times may vary based on order complexity
      </div>
    </div>
  );
};

export default PreOrderWaitTimeEstimator;
