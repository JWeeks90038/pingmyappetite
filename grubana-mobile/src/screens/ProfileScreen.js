import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert 
} from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../components/AuthContext';
import { auth, db } from '../firebase';

export default function ProfileScreen() {
  const { user, userData, userRole } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    username: userData?.username || '',
    instagram: userData?.instagram || '',
    facebook: userData?.facebook || '',
    tiktok: userData?.tiktok || '',
    twitter: userData?.twitter || '',
    menuUrl: userData?.menuUrl || '',
  });

  const handleSaveProfile = async () => {
    try {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, editedData);
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error('Error signing out:', error);
            }
          }
        }
      ]
    );
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'owner': return 'Food Truck Owner';
      case 'eventOrganizer': return 'Event Organizer';
      default: return 'Foodie Fan';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Manage your account settings</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(userData?.username || user?.email || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.displayName}>
          {userData?.username || user?.displayName || user?.email}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>{getRoleDisplayName(userRole)}</Text>
      </View>

      <View style={styles.formSection}>
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Username</Text>
          {editing ? (
            <TextInput
              style={styles.textInput}
              value={editedData.username}
              onChangeText={(text) => setEditedData({...editedData, username: text})}
              placeholder="Enter username"
            />
          ) : (
            <Text style={styles.fieldValue}>{userData?.username || 'Not set'}</Text>
          )}
        </View>

        {userRole === 'owner' && (
          <>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Menu URL</Text>
              {editing ? (
                <TextInput
                  style={styles.textInput}
                  value={editedData.menuUrl}
                  onChangeText={(text) => setEditedData({...editedData, menuUrl: text})}
                  placeholder="Enter menu URL"
                />
              ) : (
                <Text style={styles.fieldValue}>{userData?.menuUrl || 'Not set'}</Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>Social Media</Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Instagram</Text>
              {editing ? (
                <TextInput
                  style={styles.textInput}
                  value={editedData.instagram}
                  onChangeText={(text) => setEditedData({...editedData, instagram: text})}
                  placeholder="Instagram handle"
                />
              ) : (
                <Text style={styles.fieldValue}>{userData?.instagram || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Facebook</Text>
              {editing ? (
                <TextInput
                  style={styles.textInput}
                  value={editedData.facebook}
                  onChangeText={(text) => setEditedData({...editedData, facebook: text})}
                  placeholder="Facebook page"
                />
              ) : (
                <Text style={styles.fieldValue}>{userData?.facebook || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>TikTok</Text>
              {editing ? (
                <TextInput
                  style={styles.textInput}
                  value={editedData.tiktok}
                  onChangeText={(text) => setEditedData({...editedData, tiktok: text})}
                  placeholder="TikTok handle"
                />
              ) : (
                <Text style={styles.fieldValue}>{userData?.tiktok || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Twitter</Text>
              {editing ? (
                <TextInput
                  style={styles.textInput}
                  value={editedData.twitter}
                  onChangeText={(text) => setEditedData({...editedData, twitter: text})}
                  placeholder="Twitter handle"
                />
              ) : (
                <Text style={styles.fieldValue}>{userData?.twitter || 'Not set'}</Text>
              )}
            </View>
          </>
        )}
      </View>

      <View style={styles.buttonSection}>
        {editing ? (
          <View style={styles.editButtonsContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={() => {
                setEditing(false);
                setEditedData({
                  username: userData?.username || '',
                  instagram: userData?.instagram || '',
                  facebook: userData?.facebook || '',
                  tiktok: userData?.tiktok || '',
                  twitter: userData?.twitter || '',
                  menuUrl: userData?.menuUrl || '',
                });
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.saveButton]} 
              onPress={handleSaveProfile}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.button, styles.editButton]} 
            onPress={() => setEditing(true)}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.button, styles.logoutButton]} 
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
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
    backgroundColor: '#2c6f57',
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  profileSection: {
    backgroundColor: 'white',
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2c6f57',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  displayName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  role: {
    fontSize: 14,
    color: '#2c6f57',
    backgroundColor: 'rgba(44, 111, 87, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  formSection: {
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginTop: 20,
    marginBottom: 15,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#666',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  textInput: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  buttonSection: {
    padding: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2c6f57',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    flex: 0.48,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2c6f57',
    flex: 0.48,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
