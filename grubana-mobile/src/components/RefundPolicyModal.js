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

const RefundPolicyModal = ({ visible, onClose }) => {
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
          <Text style={styles.headerTitle}>Refund Policy</Text>
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
            <Text style={styles.sectionTitle}>1. No Refunds Policy</Text>
            <Text style={styles.paragraph}>
              All subscription payments and fees made to Grubana are <Text style={styles.bold}>non-refundable</Text> except as expressly required by applicable law or as otherwise stated in this policy.
            </Text>
            <Text style={styles.paragraph}>
              By subscribing to our services, you acknowledge and agree that you are not entitled to a refund or credit for any portion of your subscription period, including for unused time, accidental purchases, or dissatisfaction with the service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Cancellation</Text>
            <Text style={styles.paragraph}>
              You may cancel your subscription at any time through your account settings or by contacting customer support. Upon cancellation, your subscription will remain active until the end of the current billing period, after which access to paid features will be revoked.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>No refunds or prorated credits</Text> will be issued for partial billing periods, unused services, or automatic renewals.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Chargebacks and Disputes</Text>
            <Text style={styles.paragraph}>
              Initiating a chargeback or payment dispute without first contacting Grubana to resolve the issue may result in the immediate suspension or termination of your account. We reserve the right to dispute any chargeback and to recover any costs or fees incurred as a result.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Exceptional Circumstances</Text>
            <Text style={styles.paragraph}>
              Refunds may be granted, at our sole and absolute discretion, in cases of duplicate charges, proven technical errors resulting in incorrect billing, or other extenuating circumstances.
            </Text>
            <Text style={styles.paragraph}>
              To request a refund under these circumstances, you must contact us at <Text style={styles.emailLink}>flavor@grubana.com</Text> within 14 days of the charge and provide all relevant details and supporting documentation. Grubana's decision regarding refunds is final.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Changes to This Policy</Text>
            <Text style={styles.paragraph}>
              Grubana reserves the right to modify or update this Refund Policy at any time, at its sole discretion. Any changes will be effective immediately upon posting on this page. Your continued use of the Platform after changes are posted constitutes your acceptance of those changes.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have any questions about this Refund Policy or wish to request a refund, please contact us at <Text style={styles.emailLink}>flavor@grubana.com</Text>.
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
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  bold: {
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  emailLink: {
    color: theme.colors.accent.blue,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  backToTopButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 20,
    backgroundColor: theme.colors.accent.orange,
    borderRadius: 8,
  },
  backToTopText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default RefundPolicyModal;
