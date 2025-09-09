/**
 * Firestore Index Setup for Event Management
 * 
 * REQUIRED INDEX:
 * The event management system requires a composite index for the "events" collection
 * to support querying by organizerId and ordering by startDate.
 * 
 * AUTOMATIC SETUP:
 * 1. Visit the Firebase Console link provided in the error message:
 *    https://console.firebase.google.com/v1/r/project/foodtruckfinder-27eba/firestore/indexes?create_composite=ClRwcm9qZWN0cy9mb29kdHJ1Y2tmaW5kZXItMjdlYmEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2V2ZW50cy9pbmRleGVzL18QARoPCgtvcmdhbml6ZXJJZBABGg0KCXN0YXJ0RGF0ZRABGgwKCF9fbmFtZV9fEAE
 * 
 * 2. Click "Create Index" to automatically create the required index
 * 
 * MANUAL SETUP:
 * If the automatic link doesn't work, manually create the index:
 * 
 * 1. Go to Firebase Console > Firestore Database > Indexes
 * 2. Click "Create Index"
 * 3. Set up the following index:
 *    - Collection ID: events
 *    - Fields:
 *      - organizerId (Ascending)
 *      - startDate (Ascending)
 *      - __name__ (Ascending) [automatically added]
 * 
 * INDEX DEFINITION (for firestore.indexes.json):
 */

const requiredIndex = {
  "collectionGroup": "events",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "organizerId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "startDate", 
      "order": "ASCENDING"
    }
  ]
};

/**
 * Why this index is needed:
 * 
 * The EventsScreen performs this query for event organizers:
 * 
 * query(
 *   collection(db, 'events'),
 *   where('organizerId', '==', user.uid),
 *   orderBy('startDate', 'asc')
 * )
 * 
 * Firestore requires a composite index for queries that:
 * 1. Filter by a field (organizerId)
 * 2. Order by a different field (startDate)
 * 
 * This index allows event organizers to efficiently retrieve their own events
 * ordered by date.
 */



export { requiredIndex };
