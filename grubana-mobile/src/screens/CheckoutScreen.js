import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { useStripe } from '@stripe/stripe-react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function CheckoutScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(route.params?.plan || 'event-premium');
  const { user, userData, userRole } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  const { hasValidReferral, referralCode, userId } = route.params || {};

  // Ensure this screen is always focused and cannot be navigated away from
  useFocusEffect(
    React.useCallback(() => {
            // Check if user has somehow gained access without paying
      const hasActiveSubscription = userData?.subscriptionStatus === 'active' || userData?.subscriptionStatus === 'trialing';
      const paymentCompleted = userData?.paymentCompleted === true;
      const hasPaidPlan = userData?.plan === 'pro' || userData?.plan === 'all-access' || userData?.plan === 'event-premium';
      
      if (hasPaidPlan && (!hasActiveSubscription || !paymentCompleted)) {
                // User must stay on this screen
      }
      
      return () => {
              };
    }, [userData])
  );

  // Prevent Android back button from bypassing payment
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        'Payment Required',
        'You must complete payment to access your account. Would you like to sign out instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign Out', 
            style: 'destructive',
            onPress: async () => {
              try {
                await signOut(auth);
              } catch (error) {
                                Alert.alert('Error', 'Failed to sign out. Please try again.');
              }
            }
          }
        ]
      );
      return true; // Prevent default back action
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // Security check: Ensure user cannot bypass payment
  useEffect(() => {
        // If user somehow has an active subscription or payment completed, they shouldn't be here
    const hasActiveSubscription = userData?.subscriptionStatus === 'active' || userData?.subscriptionStatus === 'trialing';
    const paymentCompleted = userData?.paymentCompleted === true;
    
    if (hasActiveSubscription && paymentCompleted) {
            // They've already paid, let navigation handle the redirect
      return;
    }

    // If they have a paid plan but no active subscription, they must stay here
    const hasPaidPlan = userData?.plan === 'pro' || userData?.plan === 'all-access' || userData?.plan === 'event-premium';
    if (hasPaidPlan && !hasActiveSubscription) {
          }
  }, [userData, selectedPlan]);

  const planDetails = {
    'event-premium': {
      name: 'Event Premium',
      price: '$29.00',
      priceAmount: 29.00,
      description: 'Full-featured plan for professional event organizers',
      features: [
        'Unlimited events',
        'Enhanced event pages with photos',
        'Priority map placement',
        'Advanced vendor matching',
        'SMS and email notifications',
        'Detailed analytics dashboard',
        'Custom branding options',
        'Social media integration',
        'Featured map placement',
        'Custom event marketing tools',
        'White-label event pages',
        'API access for integrations',
        'Dedicated account manager',
        'Custom reporting',
        'Multi-user team access',
        'Priority vendor recommendations'
      ]
    }
  };

  const currentPlan = planDetails[selectedPlan];

  const handlePayment = async () => {
        setLoading(true);
    
    try {
            // Create payment intent using Firebase Functions
      const response = await fetch('https://us-central1-foodtruckfinder-27eba.cloudfunctions.net/createPaymentIntent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(currentPlan.priceAmount * 100), // Amount in cents
          currency: 'usd',
          planType: selectedPlan,
          userId: user.uid,
          userEmail: user.email,
          hasValidReferral,
          referralCode,
        }),
      });

      const result = await response.json();
            if (!response.ok || result.error) {
        Alert.alert('Error', result.error || 'Failed to create payment');
        setLoading(false);
        return;
      }

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

            if (initResponse.error) {
                Alert.alert('Error', initResponse.error.message);
        setLoading(false);
        return;
      }

            // Present payment sheet
      const paymentResponse = await presentPaymentSheet();

            if (paymentResponse.error) {
        if (paymentResponse.error.code === 'Canceled') {
                    Alert.alert(
            'Payment Required',
            'Payment was cancelled. You must complete payment to access premium features. Please try again.',
            [
              { text: 'Try Again', style: 'default' },
              { 
                text: 'Sign Out', 
                style: 'destructive',
                onPress: async () => {
                  try {
                    await signOut(auth);
                  } catch (error) {
                                        Alert.alert('Error', 'Failed to sign out. Please try again.');
                  }
                }
              }
            ]
          );
        } else {
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
        successMessage = `🎉 Welcome to ${currentPlan.name}!\n\nYour 30-day FREE trial has started! You'll be charged ${currentPlan.price}/month after the trial period ends.`;
      } else if (result.discountApplied) {
        const savings = ((result.originalAmount - result.amount) / 100).toFixed(2);
        successMessage = `Welcome to ${currentPlan.name}! Your subscription is now active.\n\nReferral discount applied! You saved $${savings}.`;
      } else {
        successMessage = `Welcome to ${currentPlan.name}! Your subscription is now active.`;
      }

      Alert.alert(
        result.hasFreeTrial ? 'Free Trial Started!' : 'Payment Successful!',
        successMessage,
        [{ text: 'Continue', onPress: () => {
          // Navigation will automatically switch to event dashboard
          // since subscriptionStatus is now 'active' or 'trialing'
        }}]
      );

    } catch (error) {
            Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Secure Checkout</Text>
        <Text style={styles.subtitle}>
          {hasValidReferral 
            ? 'Payment required to start your 30-day FREE trial with Event Premium features'
            : 'Complete payment to access your Event Premium features'
          }
        </Text>
        
        <View style={styles.warningContainer}>
          <Ionicons name="warning-outline" size={20} color="#ff6b35" />
          <Text style={styles.warningText}>
            {hasValidReferral 
              ? 'Payment required upfront - trial starts after payment completion'
              : 'You must complete payment to access your account'
            }
          </Text>
        </View>
        
        {hasValidReferral && (
          <View style={styles.referralBanner}>
            <Ionicons name="gift" size={20} color="#2c6f57" />
            <Text style={styles.referralText}>
              Referral Code Applied: {referralCode}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.planCard}>
        <Text style={styles.planName}>{currentPlan.name}</Text>
        <Text style={styles.planPrice}>{currentPlan.price}/month</Text>
        
        <Text style={styles.planDescription}>
          {currentPlan.description}
        </Text>
        
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Plan Features:</Text>
          {currentPlan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons 
                name="checkmark-circle" 
                size={16} 
                color="#2c6f57" 
              />
              <Text style={styles.featureText}>
                {feature}
              </Text>
            </View>
          ))}
        </View>
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
                {hasValidReferral ? 'Start Trial' : `Continue with ${currentPlan.name}`}
              </Text>
              <Text style={styles.continuePrice}>
                {hasValidReferral 
                  ? '30-day free trial - payment required first'
                  : `${currentPlan.price}/month`
                }
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Alert.alert(
              'Exit Checkout',
              'You must complete payment to access your account. Would you like to sign out instead?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Sign Out', 
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await signOut(auth);
                    } catch (error) {
                                            Alert.alert('Error', 'Failed to sign out. Please try again.');
                    }
                  }
                }
              ]
            );
          }}
        >
          <Text style={styles.backText}>Exit Checkout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c6f57',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 15,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b35',
    marginBottom: 15,
  },
  warningText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#e65100',
    fontWeight: '500',
  },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2c6f57',
  },
  referralText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#2c6f57',
    fontWeight: '600',
  },
  planCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff6b35',
    marginBottom: 10,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  featuresContainer: {
    marginTop: 10,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#555',
    lineHeight: 18,
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
