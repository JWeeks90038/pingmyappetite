import React, { useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Modal,
  SafeAreaView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const TermsOfServiceModal = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = createThemedStyles(theme);
  const scrollViewRef = useRef(null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Introduction</Text>
            <Text style={styles.paragraph}>
              Welcome to Grubana. By accessing or using our website, mobile application, and related services (collectively, the "Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Platform.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Eligibility</Text>
            <Text style={styles.paragraph}>
              You must be at least 18 years old (or the age of majority in your jurisdiction) to use our Platform. By using our services, you represent and warrant that you meet these requirements.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
            <Text style={styles.listItem}>• You are responsible for all activity that occurs under your account</Text>
            <Text style={styles.listItem}>• You agree to provide accurate, current, and complete information during registration and to keep your account information updated</Text>
            <Text style={styles.listItem}>• You are responsible for maintaining the confidentiality of your account credentials</Text>
            <Text style={styles.listItem}>• You agree not to use the Platform for any unlawful or prohibited purpose</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Prohibited Activities</Text>
            <Text style={styles.listItem}>• Posting or transmitting any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable</Text>
            <Text style={styles.listItem}>• Impersonating any person or entity or misrepresenting your affiliation</Text>
            <Text style={styles.listItem}>• Engaging in any activity that could damage, disable, overburden, or impair the Platform</Text>
            <Text style={styles.listItem}>• Attempting to gain unauthorized access to any portion of the Platform or connected systems</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Account Creation and Security</Text>
            <Text style={styles.paragraph}>
              To access certain features, you must create an account. You agree to provide accurate and complete information and to keep your password confidential. You are responsible for all activities that occur under your account.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Subscription and Payments</Text>
            <Text style={styles.listItem}>• Some features of our Platform may require payment. By subscribing, you agree to pay all applicable fees as described for your selected plan</Text>
            <Text style={styles.listItem}>• Payments are processed securely through third-party payment processors</Text>
            <Text style={styles.listItem}>• You authorize us to charge your payment method for recurring subscription fees until you cancel</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Refunds</Text>
            <Text style={styles.paragraph}>
              Refunds will be provided in accordance with our refund policy. Please review our refund policy for details. If you believe you are entitled to a refund, contact us at flavor@grubana.com.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Service Availability</Text>
            <Text style={styles.paragraph}>
              We strive to provide uninterrupted access to our Platform, but we do not guarantee that the Platform will always be available or error-free. We may suspend, withdraw, or restrict the availability of all or any part of our Platform for business or operational reasons.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Email and SMS Communications</Text>
            <Text style={styles.subheading}>Email Communications:</Text>
            <Text style={styles.paragraph}>By creating an account, you consent to receive certain emails from us, including:</Text>
            <Text style={styles.listItem}>• Transactional emails (account confirmations, password resets, payment receipts)</Text>
            <Text style={styles.listItem}>• Important service announcements and security alerts</Text>
            <Text style={styles.listItem}>• Welcome emails and onboarding information</Text>
            <Text style={styles.listItem}>• Marketing emails (only with your explicit consent)</Text>
            
            <Text style={styles.subheading}>SMS Text Messaging:</Text>
            <Text style={styles.paragraph}>If you provide your phone number and consent to SMS communications during signup, you agree to receive text messages including:</Text>
            <Text style={styles.listItem}>• Welcome messages and account confirmations</Text>
            <Text style={styles.listItem}>• Important account notifications and security alerts</Text>
            <Text style={styles.listItem}>• Event reminders and service updates</Text>
            <Text style={styles.listItem}>• Promotional messages (only with explicit consent)</Text>
            
            <Text style={styles.subheading}>Message Frequency and Costs:</Text>
            <Text style={styles.listItem}>• Message frequency varies based on your account activity and preferences</Text>
            <Text style={styles.listItem}>• Standard message and data rates from your wireless carrier may apply</Text>
            <Text style={styles.listItem}>• We do not charge for SMS messages, but carrier charges may apply</Text>
            
            <Text style={styles.subheading}>Opt-Out and Consent Management:</Text>
            <Text style={styles.listItem}>• You can opt-out of promotional SMS messages by replying "STOP" to any text</Text>
            <Text style={styles.listItem}>• You can unsubscribe from marketing emails using the unsubscribe link</Text>
            <Text style={styles.listItem}>• You can manage communication preferences in your account settings</Text>
            <Text style={styles.listItem}>• Essential transactional messages cannot be disabled as they are required for account security</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Intellectual Property</Text>
            <Text style={styles.paragraph}>
              All content, trademarks, logos, and intellectual property on the Platform are owned by Grubana or its licensors. You may not use, reproduce, or distribute any content from the Platform without our prior written permission.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Termination</Text>
            <Text style={styles.paragraph}>
              We reserve the right to suspend or terminate your access to the Platform at any time, without notice, for conduct that we believe violates these Terms or is otherwise harmful to other users or the Platform.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Disclaimers</Text>
            <Text style={styles.paragraph}>
              The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>13. Limitation of Liability</Text>
            <Text style={styles.paragraph}>
              To the fullest extent permitted by law, Grubana and its affiliates, officers, employees, agents, and licensors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>14. Indemnification</Text>
            <Text style={styles.paragraph}>
              You agree to indemnify and hold harmless Grubana and its affiliates, officers, agents, and employees from any claim or demand, including reasonable attorneys' fees, made by any third party due to or arising out of your use of the Platform, your violation of these Terms, or your violation of any rights of another.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>15. Governing Law</Text>
            <Text style={styles.paragraph}>
              These Terms are governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>16. Dispute Resolution</Text>
            <Text style={styles.paragraph}>
              Any disputes arising out of or relating to these Terms or the Platform will be resolved through binding arbitration, except that either party may bring claims in small claims court.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>17. Changes to Terms</Text>
            <Text style={styles.paragraph}>
              We reserve the right to modify these Terms of Service at any time. Updates will be posted on this page with the revision date. Your continued use of the Platform after changes are posted constitutes your acceptance of those changes.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>18. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have any questions about these Terms of Service, please contact us at flavor@grubana.com.
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.backToTopButton}
            onPress={() => {
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }}
          >
            <Text style={styles.backToTopText}>Back to Top ↑</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const createThemedStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background.secondary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginRight: 24, // Compensate for close button
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.text.secondary,
    marginBottom: 8,
    paddingLeft: 8,
  },
  bold: {
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  backToTopButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 20,
    backgroundColor: theme.colors.accent.blue,
    borderRadius: 8,
  },
  backToTopText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default TermsOfServiceModal;
