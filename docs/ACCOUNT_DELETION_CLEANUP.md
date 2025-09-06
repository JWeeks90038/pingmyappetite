# Account Deletion Data Cleanup Implementation

## Overview
When users delete their accounts, all related data is automatically cleaned up from Firebase to prevent orphaned data and ensure proper data hygiene.

## Data Cleanup by User Type

### 🍕 Food Truck Owners (role: 'owner')
When a food truck owner deletes their account, the following data is removed:

1. **Location Data**
   - `truckLocations/{userId}` - Main location document used for map display
   - `trucks/{userId}` - Additional truck information document

2. **Menu Data**
   - All documents in `menuItems` collection where `ownerId == userId`

3. **User-Generated Content**
   - All documents in `pings` collection where `userId == userId` (demand pings they created)
   - All documents in `favorites` collection where `userId == userId` (trucks they favorited)

4. **User Profile**
   - `users/{userId}` - User profile document
   - `referrals/{userId}` - Referral document if exists

5. **Authentication**
   - Firebase Auth user account

### 🎪 Event Organizers (role: 'event-organizer')
When an event organizer deletes their account, the following data is removed:

1. **Event Data**
   - All documents in `events` collection where `organizerId == userId`

2. **User-Generated Content**
   - All documents in `pings` collection where `userId == userId` (demand pings they created)
   - All documents in `favorites` collection where `userId == userId` (events/trucks they favorited)

3. **User Profile**
   - `users/{userId}` - User profile document
   - `referrals/{userId}` - Referral document if exists

4. **Authentication**
   - Firebase Auth user account

### 👤 Customers (role: 'customer')
When a customer deletes their account, the following data is removed:

1. **User-Generated Content**
   - All documents in `pings` collection where `userId == userId` (demand pings they created)
   - All documents in `favorites` collection where `userId == userId` (trucks/events they favorited)

2. **User Profile**
   - `users/{userId}` - User profile document
   - `referrals/{userId}` - Referral document if exists

3. **Authentication**
   - Firebase Auth user account

## Implementation Details

### Mobile App (React Native)
- **File**: `grubana-mobile/src/screens/ProfileScreen.js`
- **Function**: `handleDeleteAccount()`
- **Security**: Requires password re-authentication before deletion
- **Process**: Deletes Firestore data first, then Firebase Auth user

### Web App - Food Truck Owners
- **File**: `src/components/OwnerSettings.jsx`
- **Function**: `handleDeleteAccount()`
- **Process**: Deletes all related truck and user data

### Web App - Customers
- **File**: `src/components/CustomerSettings.jsx`
- **Function**: `handleDeleteAccount()`
- **Process**: Deletes all customer-generated content

## Security Features

1. **Password Re-authentication**: Mobile app requires password confirmation
2. **Order of Operations**: Firestore data deleted first (while user has permissions), then Auth user
3. **Error Handling**: Non-critical errors don't prevent account deletion
4. **Comprehensive Logging**: All deletion operations are logged for debugging

## User Experience

### Confirmation Messages
Users see detailed warnings about what data will be deleted:
- All events you have created
- All truck location data  
- All menu items
- All customer pings
- All favorites
- Your user profile

### Success Confirmation
After successful deletion, users are redirected to signup page with success message.

## Map Data Integrity

With this implementation, the map will automatically clean up when users delete accounts:
- ✅ No orphaned truck markers from deleted food truck accounts
- ✅ No orphaned event markers from deleted event organizer accounts
- ✅ No orphaned customer pings from deleted customer accounts
- ✅ Complete data cleanup ensures no stale references

## Collections Cleaned Up

| Collection | Field | Cleanup Condition |
|------------|-------|------------------|
| `truckLocations` | `{userId}` | Food truck owners |
| `trucks` | `{userId}` | Food truck owners |
| `events` | `organizerId` | Event organizers |
| `menuItems` | `ownerId` | Food truck owners |
| `pings` | `userId` | All user types |
| `favorites` | `userId` | All user types |
| `users` | `{userId}` | All user types |
| `referrals` | `{userId}` | All user types |

This comprehensive cleanup ensures no lingering data remains in Firebase when users delete their accounts, maintaining data integrity and preventing orphaned markers on the map.
