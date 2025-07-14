import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { initStripe, usePaymentSheet } from '@stripe/stripe-react-native';

export default function PaymentScreen({ route, navigation }) {
  const { formData, plan, price } = route.params;
  const [loading, setLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

  // Initialize Stripe when component mounts
  React.useEffect(() => {
    initStripe({
      publishableKey: 'pk_test_51QQWWgCWQZ1EBBKR2JZwVTPDhJlF7AJQULESmxe7p1j7dn8TJ1j6VZqUuVGkNiH0JVN9VKoQITNBxlS5SFGC1YLp00hnm9R5V7', // Your Stripe publishable key
      merchantIdentifier: 'merchant.com.grubana.mobile', // Required for Apple Pay
      urlScheme: 'grubana', // Required for 3D Secure and bank redirects
    });
  }, []);

  const planDetails = {
    pro: {
      name: 'Pro Plan',
      price: '$9.99/month',
      features: [
        'Real-time GPS tracking',
        'Menu display and management',
        'Customer notifications',
        'Basic analytics',
        'All Basic plan features'
      ]
    },
    'all-access': {
      name: 'All Access Plan',
      price: '$19.99/month',
      features: [
        'Advanced analytics dashboard',
        'Location drops and scheduling',
        'Featured placement in search',
        'Priority customer support',
        'All Pro plan features'
      ]
    }
  };

  const currentPlan = planDetails[plan];

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Create payment intent on your backend
      const response = await fetch('https://grubana.com/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: plan,
          amount: plan === 'pro' ? 999 : 1999, // $9.99 or $19.99 in cents
          currency: 'usd',
          email: formData.email,
          customerData: formData
        }),
      });

      const { paymentIntent, customer } = await response.json();

      if (!paymentIntent) {
        throw new Error('Failed to create payment intent');
      }

      // Initialize the Payment Sheet
      const { error: paymentSheetError } = await initPaymentSheet({
        merchantDisplayName: 'Grubana',
        customerId: customer.id,
        customerEphemeralKeySecret: customer.ephemeralKey,
        paymentIntentClientSecret: paymentIntent.client_secret,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
        },
      });

      if (paymentSheetError) {
        throw new Error(paymentSheetError.message);
      }

      // Present the Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          // User canceled
          setLoading(false);
          return;
        }
        throw new Error(paymentError.message);
      }

      // Payment successful - complete signup
      await completeSignup();
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Error', error.message || 'Payment processing failed. Please try again.');
      setLoading(false);
    }
  };

  const completeSignup = async () => {
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      const user = userCredential.user;

      // Create user document
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: formData.email,
        username: formData.username,
        ownerName: formData.ownerName,
        phone: formData.phone,
        userType: 'owner',
        plan: formData.plan,
        subscriptionStatus: 'active',
        createdAt: new Date().toISOString(),
        truckName: formData.truckName
      });

      // Create food truck document
      await setDoc(doc(db, 'foodTrucks', user.uid), {
        ownerId: user.uid,
        truckName: formData.truckName,
        ownerName: formData.ownerName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        cuisine: formData.cuisine,
        hours: formData.hours,
        description: formData.description,
        kitchenType: formData.kitchenType,
        plan: formData.plan,
        subscriptionStatus: 'active',
        isActive: false,
        currentLocation: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Log subscription event
      await addDoc(collection(db, 'subscriptions'), {
        userId: user.uid,
        plan: formData.plan,
        price: price,
        status: 'active',
        startDate: new Date().toISOString(),
        paymentMethod: 'demo', // In production, store actual payment method
        createdAt: new Date().toISOString()
      });

      Alert.alert(
        'Success!',
        `Welcome to Grubana! Your ${currentPlan.name} subscription is now active.`,
        [
          {
            text: 'Get Started',
            onPress: () => {
              // Navigate to the main app or dashboard
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../assets/grubana-logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Complete Your Subscription</Text>
      </View>

      <View style={styles.planCard}>
        <Text style={styles.planName}>{currentPlan.name}</Text>
        <Text style={styles.planPrice}>{currentPlan.price}</Text>
        
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Plan Features:</Text>
          {currentPlan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{currentPlan.name}</Text>
          <Text style={styles.summaryValue}>{currentPlan.price}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{currentPlan.price}</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.payButton} 
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.payButtonText}>
              Subscribe Now - {currentPlan.price}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>Back to Plans</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimer}>
        By subscribing, you agree to our Terms of Service and Privacy Policy. 
        You can cancel your subscription at any time.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 200,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  planCard: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ff6b35',
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresContainer: {
    marginTop: 10,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  featureBullet: {
    fontSize: 16,
    color: '#ff6b35',
    marginRight: 8,
    marginTop: 2,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  buttonContainer: {
    padding: 20,
  },
  payButton: {
    backgroundColor: '#ff6b35',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
    lineHeight: 16,
  },
});
