import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  BackHandler,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

export default function SecureCheckoutScreen({ route, navigation }) {
  const { plan, hasValidReferral, referralCode, userId, securityEnforced } = route.params || {};
  const { user, userData } = useAuth();
  const { createPaymentMethod, confirmPayment, confirmSetupIntent } = useStripe();
  
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardDetails, setCardDetails] = useState(null);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  
  const selectedPlan = plan || userData?.plan || 'event-premium';

  // Toast notification system (replaces Alert.alert)
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Custom modal system for confirmations (replaces Alert.alert)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtons, setModalButtons] = useState([]);

  // Prevent navigation away from checkout
  useFocusEffect(
    React.useCallback(() => {
      return () => {
      };
    }, [])
  );

  // Toast notification function (replaces simple Alert.alert)
  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);

    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastVisible(false);
      });
    }, 3000);
  };

  // Custom modal function (replaces Alert.alert)
  const showCustomModal = (title, message, buttons = []) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalButtons(buttons.length > 0 ? buttons : [
      { text: 'OK', onPress: () => setModalVisible(false), style: 'default' }
    ]);
    setModalVisible(true);
  };

  // Block hardware back button
  useEffect(() => {
    const backAction = () => {
      showCustomModal(
        'Payment Required',
        'You must complete payment to access your account. Would you like to sign out instead?',
        [
          { text: 'Cancel', onPress: () => setModalVisible(false), style: 'cancel' },
          { 
            text: 'Sign Out', 
            style: 'destructive',
            onPress: async () => {
              setModalVisible(false);
              try {
                await signOut(auth);
              } catch (error) {
                showToastMessage('Failed to sign out. Please try again.', 'error');
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

  const planDetails = {
    'pro': {
      name: 'Pro Plan',
      price: '$9',
      priceAmount: 9.99,
      description: 'Pro plan for food truck owners with advanced features',
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
      description: 'All-access plan with premium features for serious food truck businesses',
      features: [
        'Everything in Pro',
        'Advanced analytics',
        'Event management'
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

  const currentPlan = planDetails[selectedPlan];

  // Check if user has valid referral for free trial
  const isValidReferralTrial = hasValidReferral && referralCode;
  const buttonText = isValidReferralTrial ? 'Start 30-Day Trial' : `Pay ${currentPlan.price}`;
  const priceDisplayText = isValidReferralTrial ? '' : currentPlan.price;
  const subscriptionText = isValidReferralTrial ? 'FREE 30-day trial' : '/month';
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

    showCustomModal(
      'Return to Previous Plan',
      `Are you sure you want to go back to your ${previousPlanName}? You can always upgrade again later.`,
      [
        { text: 'Stay Here', onPress: () => setModalVisible(false), style: 'cancel' },
        { 
          text: 'Go Back', 
          style: 'default',
          onPress: async () => {
            setModalVisible(false);
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
              showToastMessage('Failed to return to previous plan. Please try again.', 'error');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handlePayment = async () => {
    // Enhanced card validation
    if (!cardComplete || !cardDetails) {
      showToastMessage('Please enter valid card details', 'error');
      return;
    }

    // Additional validation checks
    if (cardDetails.validNumber !== 'Valid' || 
        cardDetails.validExpiryDate !== 'Valid' || 
        cardDetails.validCVC !== 'Valid') {
      showToastMessage('Please check your card details. All fields must be valid.', 'error');
      return;
    }

    // Check if postal code is provided (required for most cards)
    if (!cardDetails.postalCode || cardDetails.postalCode.length < 5) {
      showToastMessage('Please enter a valid postal code', 'error');
      return;
    }
    setLoading(true);
    setPaymentInProgress(true);
    
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
        showToastMessage(result.error || 'Failed to create payment', 'error');
        setLoading(false);
        setPaymentInProgress(false);
        return;
      }
      // Create payment method from the card field
      const { error: createError, paymentMethod } = await createPaymentMethod({
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            email: user.email,
          },
        },
      });

      if (createError) {
        showToastMessage(
          `Payment method creation failed: ${createError.message}. Please verify your card details and try again.`,
          'error'
        );
        setLoading(false);
        setPaymentInProgress(false);
        return;
      }
      // Check if this is a Setup Intent (for trials) or Payment Intent (for regular payments)
      if (result.isSetupIntent) {
        // For Setup Intents (trials), use confirmSetupIntent
        const { error: confirmError, setupIntent } = await confirmSetupIntent(result.clientSecret, {
          paymentMethodType: 'Card',
          paymentMethodData: {
            billingDetails: {
              email: user.email,
            },
          },
        });

        if (confirmError) {
          showToastMessage(`Setup Failed: ${confirmError.message}`, 'error');
          setLoading(false);
          setPaymentInProgress(false);
          return;
        }
        // For trials, the subscription is already created, just update payment status
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          paymentCompleted: true,
          subscriptionStatus: 'trialing',
          paymentMethodSetup: true,
          trialStartDate: new Date().toISOString(),
          stripeSetupIntentId: setupIntent.id,
          stripeSubscriptionId: result.subscriptionId,
          lastPaymentUpdate: new Date().toISOString()
        });
        showCustomModal(
          'Trial Started!',
          'Your 30-day free trial has started. Enjoy premium features!',
          [
            {
              text: 'Continue',
              onPress: () => {
                setModalVisible(false);
                // Navigation will automatically redirect to the dashboard
              },
              style: 'default'
            }
          ]
        );

      } else {
        // For Payment Intents (regular payments), use confirmPayment
        const { error: confirmError, paymentIntent } = await confirmPayment(result.clientSecret, {
          paymentMethodType: 'Card',
          paymentMethodData: {
            billingDetails: {
              email: user.email,
            },
          },
        });

        if (confirmError) {
          showToastMessage(`Payment Failed: ${confirmError.message}`, 'error');
          setLoading(false);
          setPaymentInProgress(false);
          return;
        }
        // For regular payments, call the subscription update function
        const subscriptionResponse = await fetch('https://us-central1-foodtruckfinder-27eba.cloudfunctions.net/handleSubscriptionUpdate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            paymentIntentId: paymentIntent.id,
          }),
        });

        const subscriptionResult = await subscriptionResponse.json();
        
        if (!subscriptionResponse.ok || subscriptionResult.error) {
          showToastMessage('Payment succeeded but subscription setup failed. Please contact support.', 'error');
          setLoading(false);
          setPaymentInProgress(false);
          return;
        }
        showCustomModal(
          'Payment Successful!',
          'Your subscription is now active. Welcome to premium features!',
          [
            {
              text: 'Continue',
              onPress: () => {
                setModalVisible(false);
                // Navigation will automatically redirect to the dashboard
              },
              style: 'default'
            }
          ]
        );
      }

    } catch (error) {
      showToastMessage(error.message || 'An unexpected error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
      setPaymentInProgress(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={48} color="#2c6f57" />
          <Text style={styles.title}>Secure Payment</Text>
          <Text style={styles.subtitle}>Complete your subscription to access premium features</Text>
        </View>

        {/* Plan Details */}
        <View style={styles.planCard}>
          <View style={isValidReferralTrial ? styles.planHeaderCentered : styles.planHeader}>
            <Text style={isValidReferralTrial ? styles.planNameCentered : styles.planName}>
              {currentPlan.name}
            </Text>
            {!isValidReferralTrial && (
              <View style={styles.priceContainer}>
                <Text style={styles.planPrice}>{priceDisplayText}</Text>
                <Text style={styles.subscriptionText}>{subscriptionText}</Text>
              </View>
            )}
          </View>
          {isValidReferralTrial && (
            <View style={styles.trialBanner}>
              <Ionicons name="gift" size={16} color="#2c6f57" />
              <Text style={styles.trialText}>
                🎉 Referral Code Applied! Start with a FREE 30-day trial
              </Text>
            </View>
          )}
          <Text style={styles.planDescription}>{currentPlan.description}</Text>
          
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>What's included:</Text>
            {currentPlan.features.slice(0, 8).map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2c6f57" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
            {currentPlan.features.length > 8 && (
              <Text style={styles.moreFeatures}>
                + {currentPlan.features.length - 8} more premium features
              </Text>
            )}
          </View>
        </View>

        {/* Payment Form */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          
          <View style={styles.cardContainer}>
            <CardField
              postalCodeEnabled={true}
              placeholders={{
                number: '4242 4242 4242 4242',
                postalCode: '12345',
                cvc: 'CVC',
                expiration: 'MM/YY',
              }}
              cardStyle={{
                backgroundColor: '#FFFFFF',
                textColor: '#000000',
                borderColor: '#E0E0E0',
                borderWidth: 1,
                borderRadius: 8,
                fontSize: 16,
                placeholderColor: '#999999',
              }}
              style={{
                width: '100%',
                height: 50,
                marginVertical: 10,
              }}
              onCardChange={(cardDetails) => {
                setCardDetails(cardDetails);
                setCardComplete(cardDetails.complete);
              }}
            />
          </View>

          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={16} color="#2c6f57" />
            <Text style={styles.securityText}>
              Your payment information is encrypted and secure
            </Text>
          </View>
        </View>

        {/* Go Back to Previous Plan Button */}
        {userData?.plan && userData.plan !== 'basic' && (
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
        )}

        {/* Payment Button */}
        <TouchableOpacity 
          style={[
            styles.payButton, 
            (!cardComplete || paymentInProgress) && styles.payButtonDisabled
          ]}
          onPress={handlePayment}
          disabled={!cardComplete || paymentInProgress}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="card" size={20} color="#fff" />
              <Text style={styles.payButtonText}>
                {paymentInProgress ? 'Processing...' : buttonText}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Security Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔒 Secured by Stripe • No hidden fees • Cancel anytime
          </Text>
        </View>

        {/* Sign Out Option */}
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={() => {
            showCustomModal(
              'Sign Out',
              'Are you sure you want to sign out? You will need to complete payment to access premium features.',
              [
                { text: 'Cancel', onPress: () => setModalVisible(false), style: 'cancel' },
                { 
                  text: 'Sign Out', 
                  style: 'destructive',
                  onPress: async () => {
                    setModalVisible(false);
                    try {
                      await signOut(auth);
                    } catch (error) {
                      showToastMessage('Failed to sign out. Please try again.', 'error');
                    }
                  }
                }
              ]
            );
          }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Toast Notification (replaces simple Alert.alert) */}
      {toastVisible && (
        <Animated.View 
          style={[
            styles.toastContainer,
            {
              opacity: toastOpacity,
              backgroundColor: toastType === 'error' ? '#dc3545' : '#28a745'
            }
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Custom Modal (replaces Alert.alert) */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalContainer}>
            <Text style={styles.customModalTitle}>{modalTitle}</Text>
            <Text style={styles.customModalMessage}>{modalMessage}</Text>
            <View style={styles.customModalButtons}>
              {modalButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.customModalButton,
                    button.style === 'cancel' && styles.customModalButtonCancel,
                    button.style === 'destructive' && styles.customModalButtonDestructive
                  ]}
                  onPress={button.onPress}
                >
                  <Text style={[
                    styles.customModalButtonText,
                    button.style === 'cancel' && styles.customModalButtonTextCancel,
                    button.style === 'destructive' && styles.customModalButtonTextDestructive
                  ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginTop: 15,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planHeaderCentered: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c6f57',
    flex: 1,
  },
  planNameCentered: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c6f57',
    textAlign: 'center',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c6f57',
  },
  subscriptionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
  trialPriceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c6f57',
    textAlign: 'right',
  },
  planDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  trialBanner: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#2c6f57',
  },
  trialText: {
    fontSize: 14,
    color: '#2c6f57',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  featuresContainer: {
    marginTop: 10,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 10,
    flex: 1,
  },
  moreFeatures: {
    fontSize: 14,
    color: '#2c6f57',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  paymentSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  cardContainer: {
    borderRadius: 8,
    marginBottom: 15,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  securityText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  payButton: {
    backgroundColor: '#2c6f57',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#2c6f57',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  goBackButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#2c6f57',
  },
  goBackButtonText: {
    color: '#2c6f57',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  signOutButton: {
    alignItems: 'center',
    paddingVertical: 15,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: '600',
  },
  // Toast notification styles (replaces Alert.alert)
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 1000,
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Custom modal styles (replaces Alert.alert)
  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 350,
    width: '90%',
  },
  customModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  customModalMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  customModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  customModalButton: {
    backgroundColor: '#2c6f57',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
  },
  customModalButtonCancel: {
    backgroundColor: '#6c757d',
  },
  customModalButtonDestructive: {
    backgroundColor: '#dc3545',
  },
  customModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  customModalButtonTextCancel: {
    color: '#fff',
  },
  customModalButtonTextDestructive: {
    color: '#fff',
  },
});
