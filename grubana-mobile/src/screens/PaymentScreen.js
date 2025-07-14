import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PaymentScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Screen</Text>
      <Text style={styles.subtitle}>Payment processing coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
