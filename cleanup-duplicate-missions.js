const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, deleteDoc, doc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBX-hKZZQmtZCu9SxgYG4JrvP4nNkYtlKw",
  authDomain: "ping-my-appetite.firebaseapp.com",
  projectId: "ping-my-appetite",
  storageBucket: "ping-my-appetite.firebasestorage.app",
  messagingSenderId: "932649857260",
  appId: "1:932649857260:web:b86c4b78f58a6c7e5e6bb0",
  measurementId: "G-0B7Z1YBRF4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupDuplicateMissions() {
  try {

    
    // Get all active missions
    const missionsQuery = query(
      collection(db, 'activeMissions'),
      where('status', '==', 'active')
    );
    
    const snapshot = await getDocs(missionsQuery);
    const missions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    

    
    // Group by userId and missionId to find duplicates
    const grouped = {};
    const toDelete = [];
    
    missions.forEach(mission => {
      const key = `${mission.userId}-${mission.missionId}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      
      grouped[key].push(mission);
    });
    
    // For each group, keep the first one and mark others for deletion
    Object.values(grouped).forEach(group => {
      if (group.length > 1) {
 
        // Keep the first one, delete the rest
        for (let i = 1; i < group.length; i++) {
          toDelete.push(group[i]);
        }
      }
    });
    

    
    // Delete duplicates
    for (const mission of toDelete) {
      await deleteDoc(doc(db, 'activeMissions', mission.id));

    }
    

    
  } catch (error) {

  }
}

cleanupDuplicateMissions().then(() => {

  process.exit(0);
});