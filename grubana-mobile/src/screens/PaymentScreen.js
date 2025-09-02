import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { useStripe } from '@stripe/stripe-react-native';

export default function PaymentScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(route.params?.plan || 'pro');
  const { user, logout } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  const { hasValidReferral, referralCode, userId } = route.params || {};

  const plans = {
    pro: {
      name: 'Pro Plan',
      price: '$9.99',
      priceAmount: 9.99,
      description: 'Perfect for individual food trucks',
      features: [
        'Go live and share location',
        'Receive customer pings',
        'Basic analytics',
        'Event participation',
        'Email support'
      ]
    },
    'all-access': {
      name: 'All-Access Plan',
      price: '$19.99',
      priceAmount: 19.99,
      description: 'Complete solution for growing businesses',
      features: [
        'All Pro features included',
        'Advanced analytics & insights',
        'Priority event placement',
        'Enhanced customer engagement',
        'Premium support',
        'Multiple truck management'
      ]
    }
  };

  const handlePayment = async () => {
    console.log('🔍 handlePayment started');
    setLoading(true);
    
    try {
      console.log('🔍 Creating payment intent...');
      // Create payment intent using Firebase Functions
      const response = await fetch('https://us-central1-foodtruckfinder-27eba.cloudfunctions.net/createPaymentIntent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(plans[selectedPlan].priceAmount * 100), // Amount in cents
          currency: 'usd',
          planType: selectedPlan,
          userId: user.uid,
          userEmail: user.email,
          hasValidReferral,
          referralCode,
        }),
      });

      const result = await response.json();
      console.log('🔍 Payment intent response:', result);

      if (!response.ok || result.error) {
        Alert.alert('Error', result.error || 'Failed to create payment');
        setLoading(false);
        return;
      }

      console.log('🔍 Initializing payment sheet...');
      
      let initResponse;
      if (result.isSetupIntent) {
        // For free trials, use Setup Intent
        initResponse = await initPaymentSheet({
          setupIntentClientSecret: result.clientSecret,
          merchantDisplayName: 'Grubana',
          countryCode: 'US',
          currencyCode: 'USD',
          applePay: {
            merchantId: 'merchant.com.pingmyappetite.grubana',
            merchantCountryCode: 'US',
          },
          googlePay: {
            merchantId: 'merchant.com.pingmyappetite.grubana',
            merchantCountryCode: 'US',
            testEnvironment: false,
          },
          returnURL: 'grubana://payment-return',
          defaultBillingDetails: {
            email: user.email,
          },
        });
      } else {
        // For regular payments, use Payment Intent
        initResponse = await initPaymentSheet({
          paymentIntentClientSecret: result.clientSecret,
          merchantDisplayName: 'Grubana',
          countryCode: 'US',
          currencyCode: 'USD',
          applePay: {
            merchantId: 'merchant.com.pingmyappetite.grubana',
            merchantCountryCode: 'US',
          },
          googlePay: {
            merchantId: 'merchant.com.pingmyappetite.grubana',
            merchantCountryCode: 'US',
            testEnvironment: false,
          },
          returnURL: 'grubana://payment-return',
          defaultBillingDetails: {
            email: user.email,
          },
        });
      }

      console.log('🔍 Payment sheet init response:', initResponse);

      if (initResponse.error) {
        console.error('🔍 Payment sheet init error:', initResponse.error);
        Alert.alert('Error', initResponse.error.message);
        setLoading(false);
        return;
      }

      console.log('🔍 Presenting payment sheet...');
      // Present payment sheet
      const paymentResponse = await presentPaymentSheet();

      console.log('🔍 Payment response:', paymentResponse);

      if (paymentResponse.error) {
        if (paymentResponse.error.code !== 'Canceled') {
          Alert.alert('Payment failed', paymentResponse.error.message);
        }
        setLoading(false);
        return;
      }

      // Payment successful - update user's subscription status locally
      // The webhook will also update this, but we do it here for immediate UI feedback
      const userRef = doc(db, 'users', user.uid);
      const updateData = {
        plan: selectedPlan,
        paymentCompleted: true,
        stripeCustomerId: result.customerId,
      };

      // Handle free trial vs regular payment
      if (result.hasFreeTrial) {
        updateData.subscriptionStatus = 'trialing';
        updateData.trialStartDate = new Date();
      } else {
        updateData.subscriptionStatus = 'active';
        updateData.subscriptionStartDate = new Date();
      }

      await updateDoc(userRef, updateData);

      // Show success message with appropriate info
      let successMessage;
      if (result.hasFreeTrial) {
        successMessage = `🎉 Welcome to ${plans[selectedPlan].name}!\n\nYour 30-day FREE trial has started! You'll be charged ${plans[selectedPlan].price}/month after the trial period ends.`;
      } else if (result.discountApplied) {
        const savings = ((result.originalAmount - result.amount) / 100).toFixed(2);
        successMessage = `Welcome to ${plans[selectedPlan].name}! Your subscription is now active.\n\nReferral discount applied! You saved $${savings}.`;
      } else {
        successMessage = `Welcome to ${plans[selectedPlan].name}! Your subscription is now active.`;
      }

      Alert.alert(
        result.hasFreeTrial ? 'Free Trial Started!' : 'Payment Successful!',
        successMessage,
        [{ text: 'Continue', onPress: () => {
          // Navigation will automatically switch to owner dashboard
          // since subscriptionStatus is now 'active' or 'trialing'
        }}]
      );

    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPlanCard = (planKey, plan) => {
    const isSelected = selectedPlan === planKey;
    
    return (
      <TouchableOpacity
        key={planKey}
        style={[styles.planCard, isSelected && styles.selectedPlan]}
        onPress={() => setSelectedPlan(planKey)}
      >
        <View style={styles.planHeader}>
          <Text style={[styles.planName, isSelected && styles.selectedText]}>
            {plan.name}
          </Text>
          <Text style={[styles.planPrice, isSelected && styles.selectedText]}>
            {plan.price}/month
          </Text>
        </View>
        
        <Text style={[styles.planDescription, isSelected && styles.selectedText]}>
          {plan.description}
        </Text>
        
        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons 
                name="checkmark-circle" 
                size={16} 
                color={isSelected ? '#fff' : '#2c6f57'} 
              />
              <Text style={[styles.featureText, isSelected && styles.selectedText]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>
        
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Select the perfect plan for your food truck business
        </Text>
        
        {hasValidReferral && (
          <View style={styles.referralBanner}>
            <Ionicons name="gift" size={20} color="#2c6f57" />
            <Text style={styles.referralText}>
              Referral Code Applied: {referralCode}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.plansContainer}>
        {Object.entries(plans).map(([key, plan]) => renderPlanCard(key, plan))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.disabledButton]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.continueText}>
                Continue with {plans[selectedPlan].name}
              </Text>
              <Text style={styles.continuePrice}>
                {plans[selectedPlan].price}/month
              </Text>
            </>
          )}
        </TouchableOpacity>
        
                <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Alert.alert(
              'Go Back',
              'Would you like to sign out and return to the login screen?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', onPress: logout }
              ]
            );
          }}
        >
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c6f57',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  referralText: {
    fontSize: 14,
    color: '#2c6f57',
    fontWeight: '600',
    marginLeft: 8,
  },
  plansContainer: {
    padding: 20,
    gap: 15,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  selectedPlan: {
    backgroundColor: '#2c6f57',
    borderColor: '#2c6f57',
  },
  planHeader: {
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c6f57',
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  selectedText: {
    color: '#fff',
  },
  featuresContainer: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  continueButton: {
    backgroundColor: '#2c6f57',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.7,
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continuePrice: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 2,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backText: {
    color: '#666',
    fontSize: 16,
  },
});
