import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

class PreOrderNotificationService {
  constructor() {
    this.subscribers = new Map();
    this.orderListeners = new Map();
  }

  /**
   * Subscribe to real-time order updates
   */
  subscribeToOrder(orderId, callback) {
    if (this.orderListeners.has(orderId)) {
      this.unsubscribeFromOrder(orderId);
    }

    const unsubscribe = onSnapshot(
      doc(db, 'orders', orderId),
      (doc) => {
        if (doc.exists()) {
          const orderData = { id: doc.id, ...doc.data() };
          callback(orderData);
          
          // Trigger browser notification for status changes
          this.handleStatusChangeNotification(orderData);
        }
      },
      (error) => {
        console.error('Error in order subscription:', error);
        callback(null, error);
      }
    );

    this.orderListeners.set(orderId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Unsubscribe from order updates
   */
  unsubscribeFromOrder(orderId) {
    const unsubscribe = this.orderListeners.get(orderId);
    if (unsubscribe) {
      unsubscribe();
      this.orderListeners.delete(orderId);
    }
  }

  /**
   * Subscribe to user's active orders
   */
  subscribeToUserOrders(userId, callback) {
    const activeOrdersQuery = query(
      collection(db, 'orders'),
      where('customerId', '==', userId),
      where('status', 'in', ['pending', 'confirmed', 'preparing', 'ready']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      activeOrdersQuery,
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        callback(orders);
        
        // Check for status changes in active orders
        orders.forEach(order => {
          this.handleStatusChangeNotification(order);
        });
      },
      (error) => {
        console.error('Error in user orders subscription:', error);
        callback([], error);
      }
    );

    this.subscribers.set(`user_orders_${userId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Handle status change notifications
   */
  handleStatusChangeNotification(orderData) {
    const { status, id: orderId } = orderData;
    
    // Store last notified status to avoid duplicate notifications
    const lastNotifiedKey = `last_notified_${orderId}`;
    const lastNotifiedStatus = localStorage.getItem(lastNotifiedKey);
    
    if (lastNotifiedStatus === status) {
      return; // Already notified for this status
    }

    // Update last notified status
    localStorage.setItem(lastNotifiedKey, status);

    // Generate notification based on status
    const notifications = this.getStatusNotifications(orderData);
    const notification = notifications[status];

    if (notification) {
      this.showBrowserNotification(notification);
      this.showInAppNotification(notification);
      
      // Play notification sound
      this.playNotificationSound(status);
    }
  }

  /**
   * Get notification content for each status
   */
  getStatusNotifications(orderData) {
    const shortOrderId = orderData.id.substring(0, 8);
    const truckName = orderData.truckName || 'Food Truck';
    const estimatedTime = orderData.estimatedPrepTime;

    return {
      confirmed: {
        title: '✅ Order Confirmed!',
        body: `${truckName} confirmed your order #${shortOrderId}${estimatedTime ? ` • ~${estimatedTime} min` : ''}`,
        icon: '✅',
        color: '#28a745',
        urgency: 'normal'
      },
      preparing: {
        title: '👨‍🍳 Order Being Prepared',
        body: `Your delicious meal is now being prepared by ${truckName}`,
        icon: '👨‍🍳',
        color: '#ffc107',
        urgency: 'normal'
      },
      ready: {
        title: '🔔 Order Ready for Pickup!',
        body: `Your order #${shortOrderId} from ${truckName} is ready! Come get it while it's hot!`,
        icon: '🔔',
        color: '#007bff',
        urgency: 'high'
      },
      completed: {
        title: '✨ Order Complete',
        body: `Thanks for choosing ${truckName}! Hope you enjoyed your meal!`,
        icon: '✨',
        color: '#28a745',
        urgency: 'low'
      },
      cancelled: {
        title: '❌ Order Cancelled',
        body: `Your order #${shortOrderId} was cancelled. Refund will be processed within 3-5 days.`,
        icon: '❌',
        color: '#dc3545',
        urgency: 'high'
      }
    };
  }

  /**
   * Show browser push notification
   */
  async showBrowserNotification(notification) {
    // Request permission if not granted
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      const options = {
        body: notification.body,
        icon: '/grubana-logo.png',
        badge: '/truck-icon.png',
        vibrate: notification.urgency === 'high' ? [200, 100, 200] : [100],
        requireInteraction: notification.urgency === 'high',
        actions: [
          {
            action: 'view',
            title: '👀 View Order'
          }
        ],
        data: {
          orderId: notification.orderId,
          url: '/my-orders'
        }
      };

      const notif = new Notification(notification.title, options);
      
      notif.onclick = () => {
        window.focus();
        // Navigate to orders page
        if (window.location.pathname !== '/my-orders') {
          window.location.href = '/my-orders';
        }
        notif.close();
      };

      // Auto-close after 10 seconds for normal urgency
      if (notification.urgency !== 'high') {
        setTimeout(() => notif.close(), 10000);
      }
    }
  }

  /**
   * Show in-app notification
   */
  showInAppNotification(notification) {
    // Create floating notification element
    const notifElement = document.createElement('div');
    notifElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${notification.color};
      color: white;
      padding: 15px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideInRight 0.3s ease-out;
      cursor: pointer;
    `;

    notifElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 20px;">${notification.icon}</span>
        <div>
          <div style="font-weight: bold; margin-bottom: 4px;">${notification.title}</div>
          <div style="font-size: 14px; opacity: 0.9;">${notification.body}</div>
        </div>
      </div>
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    // Add click handler
    notifElement.addEventListener('click', () => {
      window.location.href = '/my-orders';
    });

    // Add to DOM
    document.body.appendChild(notifElement);

    // Auto-remove after delay
    const removeDelay = notification.urgency === 'high' ? 8000 : 5000;
    setTimeout(() => {
      notifElement.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (notifElement.parentNode) {
          notifElement.parentNode.removeChild(notifElement);
        }
      }, 300);
    }, removeDelay);
  }

  /**
   * Play notification sound
   */
  playNotificationSound(status) {
    try {
      // Create audio context for different sounds
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const sounds = {
        confirmed: { frequency: 800, duration: 200 },
        preparing: { frequency: 600, duration: 150 },
        ready: { frequency: 1000, duration: 300, repeat: 2 },
        completed: { frequency: 700, duration: 250 },
        cancelled: { frequency: 400, duration: 400 }
      };

      const sound = sounds[status] || sounds.confirmed;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(sound.frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + sound.duration / 1000);

      // Play additional beep for high urgency
      if (sound.repeat && sound.repeat > 1) {
        setTimeout(() => {
          this.playNotificationSound(status);
        }, sound.duration + 100);
      }

    } catch (error) {
      console.log('Audio notification not supported:', error);
    }
  }

  /**
   * Send push notification via service worker
   */
  async sendPushNotification(notification, orderId) {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Check if user is subscribed to push notifications
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          // Send push notification via your backend
          await fetch('/api/send-push-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscription,
              notification,
              orderId
            })
          });
        }
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    }
  }

  /**
   * Update order status with timestamp
   */
  async updateOrderStatus(orderId, newStatus, additionalData = {}) {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        [`${newStatus}At`]: serverTimestamp(), // e.g., confirmedAt, preparingAt, readyAt
        ...additionalData
      });

      console.log(`✅ Order ${orderId} status updated to: ${newStatus}`);
      
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    // Unsubscribe from all order listeners
    this.orderListeners.forEach(unsubscribe => unsubscribe());
    this.orderListeners.clear();

    // Unsubscribe from all other subscriptions
    this.subscribers.forEach(unsubscribe => unsubscribe());
    this.subscribers.clear();
  }

  /**
   * Initialize notification permissions
   */
  async initializeNotifications() {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('📱 Notification permission:', permission);
    }

    // Register service worker for push notifications
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('📱 Service worker registered:', registration);
      } catch (error) {
        console.error('📱 Service worker registration failed:', error);
      }
    }
  }
}

// Create singleton instance
const preOrderNotificationService = new PreOrderNotificationService();

export default preOrderNotificationService;
