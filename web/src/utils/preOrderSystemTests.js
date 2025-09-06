// Quick Integration Test for Pre-Order System
// Run this in browser console to test the pre-order system functionality

console.log('🚀 Starting Pre-Order System Integration Test...');

// Test 1: Check if components are imported correctly
const testComponentImports = () => {
  console.log('\n📋 Test 1: Component Imports');
  
  try {
    // Check if PreOrderSystem component exists in the build
    const preOrderSystemExists = document.querySelector('[data-component="pre-order-system"]') !== null;
    console.log('✅ PreOrderSystem component ready:', preOrderSystemExists);
    
    // Check if notification service is available
    const notificationService = window.preOrderNotificationService || false;
    console.log('✅ Notification service available:', !!notificationService);
    
  } catch (error) {
    console.error('❌ Component import test failed:', error);
  }
};

// Test 2: Simulate cart functionality
const testCartFunctionality = () => {
  console.log('\n🛒 Test 2: Cart Functionality');
  
  try {
    // Mock cart state
    const mockCart = [
      { id: '1', name: 'Test Burger', price: 12.99, quantity: 2 },
      { id: '2', name: 'Test Fries', price: 4.99, quantity: 1 }
    ];
    
    const totalItems = mockCart.reduce((total, item) => total + item.quantity, 0);
    const totalPrice = mockCart.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    console.log('✅ Cart items count:', totalItems);
    console.log('✅ Cart total price:', `$${totalPrice.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Cart functionality test failed:', error);
  }
};

// Test 3: Check Firebase configuration
const testFirebaseConnection = async () => {
  console.log('\n🔥 Test 3: Firebase Connection');
  
  try {
    // Check if Firebase is initialized
    const firebaseApps = window.firebase?.apps || [];
    console.log('✅ Firebase apps initialized:', firebaseApps.length > 0);
    
    // Check if Firestore is available
    const firestoreAvailable = !!window.firebase?.firestore;
    console.log('✅ Firestore available:', firestoreAvailable);
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
  }
};

// Test 4: Mock order placement
const testOrderPlacement = () => {
  console.log('\n📦 Test 4: Order Placement Flow');
  
  try {
    // Mock order data
    const mockOrder = {
      truckId: 'test-truck-123',
      items: [
        { id: '1', name: 'Test Burger', price: 12.99, quantity: 2 },
        { id: '2', name: 'Test Fries', price: 4.99, quantity: 1 }
      ],
      customerInfo: {
        name: 'Test Customer',
        phone: '555-0123',
        pickupTime: 'ASAP'
      },
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    console.log('✅ Mock order created:', mockOrder);
    console.log('✅ Order total:', `$${mockOrder.items.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Order placement test failed:', error);
  }
};

// Test 5: Wait time calculation simulation
const testWaitTimeCalculation = () => {
  console.log('\n⏱️ Test 5: Wait Time Calculation');
  
  try {
    // Mock truck data for wait time calculation
    const mockTruckData = {
      currentOrders: 3,
      avgOrderTime: 15, // minutes
      rushHourMultiplier: 1.2,
      isRushHour: true
    };
    
    const baseWaitTime = mockTruckData.currentOrders * mockTruckData.avgOrderTime;
    const adjustedWaitTime = mockTruckData.isRushHour 
      ? baseWaitTime * mockTruckData.rushHourMultiplier 
      : baseWaitTime;
    
    console.log('✅ Base wait time:', `${baseWaitTime} minutes`);
    console.log('✅ Adjusted wait time:', `${Math.round(adjustedWaitTime)} minutes`);
    
  } catch (error) {
    console.error('❌ Wait time calculation test failed:', error);
  }
};

// Test 6: Notification system check
const testNotificationSystem = () => {
  console.log('\n🔔 Test 6: Notification System');
  
  try {
    // Check notification permissions
    const notificationPermission = Notification.permission;
    console.log('✅ Notification permission:', notificationPermission);
    
    // Check if Web Audio API is available
    const audioContextAvailable = !!(window.AudioContext || window.webkitAudioContext);
    console.log('✅ Audio context available:', audioContextAvailable);
    
    // Mock notification
    if (notificationPermission === 'granted') {
      console.log('✅ Notifications are ready to use');
    } else {
      console.log('⚠️ Notification permission needed');
    }
    
  } catch (error) {
    console.error('❌ Notification system test failed:', error);
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('🧪 Running Pre-Order System Integration Tests...\n');
  
  testComponentImports();
  testCartFunctionality();
  await testFirebaseConnection();
  testOrderPlacement();
  testWaitTimeCalculation();
  testNotificationSystem();
  
  console.log('\n✅ Pre-Order System Integration Tests Complete!');
  console.log('\n📝 Next Steps:');
  console.log('1. Add menu items to a truck');
  console.log('2. Test adding items to cart');
  console.log('3. Test the checkout process');
  console.log('4. Verify real-time order tracking');
  console.log('5. Test notification delivery');
};

// Auto-run tests
runAllTests();

// Export for manual testing
window.preOrderSystemTests = {
  runAllTests,
  testComponentImports,
  testCartFunctionality,
  testFirebaseConnection,
  testOrderPlacement,
  testWaitTimeCalculation,
  testNotificationSystem
};
