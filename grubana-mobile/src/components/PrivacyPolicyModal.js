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

const PrivacyPolicyModal = ({ visible, onClose }) => {
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
          <Text style={styles.headerTitle}>Privacy Policy</Text>
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
              Welcome to Grubana. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how Grubana ("we", "us", "our", or "the Company") collects, uses, discloses, and safeguards your information when you use our website, mobile application, and related services (collectively, the "Platform").
            </Text>
            <Text style={styles.paragraph}>
              By accessing or using our Platform, you agree to the collection and use of information in accordance with this Privacy Policy.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Information We Collect</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Personal Information:</Text> Name, email address, phone number, username, password (hashed), payment information, and other identifiers you provide during registration or use of the Platform.</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Business Information:</Text> Business name, owner name, location, cuisine type, service hours, description, and other business-related details.</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Usage Data:</Text> IP address, device information, access times, interactions with the Platform.</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Location Data:</Text> If you enable location services, we may collect precise or approximate geolocation data to provide location-based services.</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Third-Party Information:</Text> We may receive information about you from third-party services (e.g., payment processors, analytics providers) if you interact with them through our Platform.</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Device Identifiers:</Text> Our app uses third-party services (such as Stripe, Firebase, and Google Maps) that may collect device identifiers for fraud prevention, security, and app functionality.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
            <Text style={styles.listItem}>• To create and manage your account and profile</Text>
            <Text style={styles.listItem}>• To process payments and manage subscriptions</Text>
            <Text style={styles.listItem}>• To provide, operate, and improve our Platform and services</Text>
            <Text style={styles.listItem}>• To personalize your experience and deliver relevant content</Text>
            <Text style={styles.listItem}>• To communicate with you about your account, updates, and customer support</Text>
            <Text style={styles.listItem}>• To send welcome emails and SMS notifications (with your consent)</Text>
            <Text style={styles.listItem}>• To monitor and analyze usage and trends to improve user experience</Text>
            <Text style={styles.listItem}>• To enforce our Terms of Service and protect platform security</Text>
            <Text style={styles.listItem}>• To comply with legal obligations and resolve disputes</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Data Security</Text>
            <Text style={styles.paragraph}>
              We implement industry-standard security measures to protect your personal data, including encryption, secure servers, and access controls. However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Sharing Your Information</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Service Providers:</Text> We may share your information with trusted third-party vendors who help us operate our Platform, process payments, or provide analytics.</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Legal Requirements:</Text> We may disclose your information if required by law, regulation, or governmental request.</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Business Transfers:</Text> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>With Your Consent:</Text> We may share your information for other purposes with your explicit consent.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Email and SMS Communications</Text>
            <Text style={styles.subheading}>Email Communications:</Text>
            <Text style={styles.listItem}>• Welcome emails when you create an account</Text>
            <Text style={styles.listItem}>• Transactional emails (payment confirmations, password resets)</Text>
            <Text style={styles.listItem}>• Service announcements and important platform updates</Text>
            <Text style={styles.listItem}>• Marketing emails (only with your consent, you can unsubscribe anytime)</Text>
            
            <Text style={styles.subheading}>SMS/Text Messaging:</Text>
            <Text style={styles.listItem}>• Welcome text messages when you create an account</Text>
            <Text style={styles.listItem}>• Account notifications and security alerts</Text>
            <Text style={styles.listItem}>• Event reminders and important updates</Text>
            <Text style={styles.listItem}>• Promotional messages (only with explicit consent)</Text>
            
            <Text style={styles.subheading}>Consent and Opt-Out:</Text>
            <Text style={styles.listItem}>• You can opt-out of SMS messages by replying "STOP"</Text>
            <Text style={styles.listItem}>• You can unsubscribe from marketing emails using the unsubscribe link</Text>
            <Text style={styles.listItem}>• You can manage communication preferences in your account settings</Text>
            <Text style={styles.listItem}>• Standard message and data rates may apply from your mobile carrier</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Data Retention</Text>
            <Text style={styles.paragraph}>
              We retain your personal data only as long as necessary to fulfill the purposes described in this Privacy Policy, comply with legal obligations, resolve disputes, and enforce our agreements. When no longer needed, your data will be securely deleted or anonymized.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Your Rights and Choices</Text>
            <Text style={styles.listItem}>• You have the right to access, update, or delete your personal data</Text>
            <Text style={styles.listItem}>• You may withdraw your consent at any time where processing is based on consent</Text>
            <Text style={styles.listItem}>• You may object to or restrict certain processing of your data</Text>
            <Text style={styles.listItem}>• You can opt-out of marketing emails and SMS messages at any time</Text>
            <Text style={styles.listItem}>• To exercise your rights, please contact us at flavor@grubana.com</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
            <Text style={styles.paragraph}>
              Our Platform is not intended for children under 13 (or under 16 in the EEA/UK). We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will take steps to delete such information.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Changes to This Privacy Policy</Text>
            <Text style={styles.paragraph}>
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with the updated date. Your continued use of the Platform after changes are posted constitutes your acceptance of those changes.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at flavor@grubana.com.
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

export default PrivacyPolicyModal;
