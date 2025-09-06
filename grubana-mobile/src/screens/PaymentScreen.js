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
import { colors } from '../theme/colors';

export default function PaymentScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(route.params?.plan || 'pro');
  const { user, userData, userRole } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  const { hasValidReferral, referralCode, userId } = route.params || {};

  // Ensure this screen is always focused and cannot be navigated away from
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔒 PaymentScreen focused - enforcing payment security');
      
      // Check if user has somehow gained access without paying
      const hasActiveSubscription = userData?.subscriptionStatus === 'active' || userData?.subscriptionStatus === 'trialing';
      const paymentCompleted = userData?.paymentCompleted === true;
      const hasPaidPlan = userData?.plan === 'pro' || userData?.plan === 'all-access' || userData?.plan === 'event-premium';
      
      if (hasPaidPlan && (!hasActiveSubscription || !paymentCompleted)) {
        console.log('🔒 SECURITY: User on paid plan without payment - enforcing payment screen');
        // User must stay on this screen
      }
      
      return () => {
        console.log('🔒 PaymentScreen losing focus - payment still required');
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
                console.error('Error signing out:', error);
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
    console.log('🔒 PaymentScreen Security Check:', {
      plan: selectedPlan,
      userPlan: userData?.plan,
      subscriptionStatus: userData?.subscriptionStatus,
      paymentCompleted: userData?.paymentCompleted
    });

    // If user somehow has an active subscription or payment completed, they shouldn't be here
    const hasActiveSubscription = userData?.subscriptionStatus === 'active' || userData?.subscriptionStatus === 'trialing';
    const paymentCompleted = userData?.paymentCompleted === true;
    
    if (hasActiveSubscription && paymentCompleted) {
      console.log('🔒 User has completed payment, should not be on payment screen');
      // They've already paid, let navigation handle the redirect
      return;
    }

    // If they have a paid plan but no active subscription, they must stay here
    const hasPaidPlan = userData?.plan === 'pro' || userData?.plan === 'all-access' || userData?.plan === 'event-premium';
    if (hasPaidPlan && !hasActiveSubscription) {
      console.log('🔒 User has paid plan but no active subscription - enforcing payment');
    }
  }, [userData, selectedPlan]);

  const plans = {
    pro: {
      name: 'Pro Plan',
      price: '$9',
      priceAmount: 9.99,
      description: 'Perfect for individual mobile kitchen businesses',
      features: [
        'Everything in Starter',
        'Heat maps showing customer demand',
        'Create Drops providing exclusive deals'
      ]
    },
    'all-access': {
      name: 'All-Access Plan',
      price: '$19',
      priceAmount: 19.99,
      description: 'Complete solution for growing businesses',
      features: [
        'Everything in Pro',
        'Advanced analytics',
        'Event management'
      ]
    },
        'event-basic': {
      name: 'Event Starter',
      price: 'Free',
      priceAmount: 0,
      description: 'Perfect for getting started with event organizing',
      features: [
        'Up to 3 events per month',
        'Basic event page with details',
        'Vendor application management',
        'Map location marker',
        'Email notifications',
        'Basic analytics'
      ]
    },
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

  // Filter plans based on user role
  const getFilteredPlans = () => {
    if (userRole === 'event-organizer') {
      // Event organizers should only see event plans
      return {
        'event-premium': plans['event-premium']
      };
    } else if (userRole === 'owner') {
      // Food truck owners should only see truck plans
      return {
        'pro': plans['pro'],
        'all-access': plans['all-access']
      };
    }
    // Default: return all plans
    return plans;
  };

  const filteredPlans = getFilteredPlans();

  // Function to go back to previous plan
  const handleGoBackToPreviousPlan = async () => {
    const currentUserPlan = userData?.plan || 'basic';
    
    // Determine what plan to go back to
    let previousPlanName = 'Starter (Free)';
    if (currentUserPlan === 'pro') {
      previousPlanName = 'Pro Plan';
    } else if (currentUserPlan === 'all-access') {
      previousPlanName = 'All-Access Plan';
    } else if (currentUserPlan === 'event-premium') {
      previousPlanName = 'Event Premium Plan';
    }

    Alert.alert(
      'Return to Previous Plan',
      `Are you sure you want to go back to your ${previousPlanName}? You can always upgrade again later.`,
      [
        { text: 'Stay Here', style: 'cancel' },
        { 
          text: 'Go Back', 
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Update user document to remove any pending upgrade flags
              if (userData) {
                await updateDoc(doc(db, 'users', user.uid), {
                  pendingUpgrade: null,
                  upgradeAttempt: null,
                  lastUpgradeAttempt: new Date().toISOString()
                });
              }
              
              // Navigate back based on user role and current plan
              if (userData?.role === 'organizer') {
                navigation.replace('EventDashboard');
              } else if (userData?.role === 'owner') {
                navigation.replace('Dashboard');
              } else {
                navigation.replace('Dashboard');
              }
              
            } catch (error) {
              console.error('Error returning to previous plan:', error);
              Alert.alert('Error', 'Failed to return to previous plan. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
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
        if (paymentResponse.error.code === 'Canceled') {
          console.log('🔍 Payment was cancelled by user');
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
                    console.error('Error signing out:', error);
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
        <Text style={styles.title}>Secure Checkout</Text>
        <Text style={styles.subtitle}>
          {userRole === 'event-organizer' 
            ? hasValidReferral 
              ? 'Payment required to start your 30-day FREE trial with Event Premium features'
              : 'Complete payment to access your Event Premium features'
            : 'Complete payment to access your premium features'
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

      {/* Go Back to Previous Plan Button */}
      {userData?.plan && userData.plan !== 'basic' && (
        <View style={styles.goBackContainer}>
          <TouchableOpacity 
            style={styles.goBackButton}
            onPress={handleGoBackToPreviousPlan}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={20} color="#2c6f57" />
            <Text style={styles.goBackButtonText}>
              Go Back to {userData.plan === 'pro' ? 'Pro Plan' : 
                         userData.plan === 'all-access' ? 'All-Access Plan' : 
                         userData.plan === 'event-premium' ? 'Event Premium Plan' : 
                         'Previous Plan'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.plansContainer}>
        {Object.entries(filteredPlans).map(([key, plan]) => renderPlanCard(key, plan))}
      </View>

      <View style={styles.footer}>
        {filteredPlans[selectedPlan]?.priceAmount === 0 ? (
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.disabledButton]}
            onPress={async () => {
              setLoading(true);
              try {
                // For free plans, just update the user's plan directly
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                  plan: selectedPlan,
                  subscriptionStatus: 'active',
                  subscriptionStartDate: new Date(),
                  paymentCompleted: true
                });

                Alert.alert(
                  'Plan Activated!',
                  `Welcome to ${filteredPlans[selectedPlan].name}! Your free plan is now active.`,
                  [{ text: 'Continue' }]
                );
              } catch (error) {
                console.error('Error activating free plan:', error);
                Alert.alert('Error', 'Failed to activate plan. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueText}>
                Activate {filteredPlans[selectedPlan].name} - Free
              </Text>
            )}
          </TouchableOpacity>
        ) : (
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
                  {hasValidReferral ? 'Start Trial' : `Continue with ${filteredPlans[selectedPlan].name}`}
                </Text>
                <Text style={styles.continuePrice}>
                  {hasValidReferral 
                    ? '30-day free trial - payment required first'
                    : `${filteredPlans[selectedPlan].price}/month`
                  }
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
                <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Alert.alert(
              'Go Back',
              userRole === 'event-organizer' 
                ? 'What would you like to do?'
                : 'What would you like to do?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Change Plan', 
                  onPress: () => {
                    // Allow them to select a different plan or downgrade to free
                    Alert.alert(
                      'Change Plan',
                      userRole === 'event-organizer'
                        ? 'Would you like to switch to the free Event Starter plan instead?'
                        : 'Would you like to switch to the free Starter plan instead?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Switch to Free Plan', 
                          onPress: async () => {
                            try {
                              const userRef = doc(db, 'users', user.uid);
                              const freePlan = userRole === 'event-organizer' ? 'event-basic' : 'basic';
                              await updateDoc(userRef, {
                                plan: freePlan,
                                subscriptionStatus: 'active',
                                subscriptionStartDate: new Date(),
                                paymentCompleted: true
                              });
                              Alert.alert(
                                'Plan Updated!',
                                `You've been switched to the free ${userRole === 'event-organizer' ? 'Event Starter' : 'Starter'} plan.`,
                                [{ text: 'Continue' }]
                              );
                            } catch (error) {
                              console.error('Error updating plan:', error);
                              Alert.alert('Error', 'Failed to update plan. Please try again.');
                            }
                          }
                        }
                      ]
                    );
                  }
                },
                { 
                  text: 'Sign Out', 
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await signOut(auth);
                    } catch (error) {
                      console.error('Error signing out:', error);
                      Alert.alert('Error', 'Failed to sign out. Please try again.');
                    }
                  }
                }
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
    backgroundColor: colors.background.primary,
  },
  header: {
    padding: 20,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent.pink,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    borderWidth: 1,
    borderColor: colors.accent.blue,
  },
  referralText: {
    fontSize: 14,
    color: colors.accent.blue,
    fontWeight: '600',
    marginLeft: 8,
  },
  plansContainer: {
    padding: 20,
    gap: 15,
  },
  planCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  selectedPlan: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.accent.pink,
  },
  planHeader: {
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
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
  goBackContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  goBackButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2c6f57',
  },
  goBackButtonText: {
    color: '#2c6f57',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backText: {
    color: '#666',
    fontSize: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b35',
  },
  warningText: {
    color: '#ff6b35',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
});
