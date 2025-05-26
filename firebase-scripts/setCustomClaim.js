const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
db.collection('users').limit(1).get().then(snap => {
  console.log('Firestore connection test: Found', snap.size, 'user(s)');
}).catch(err => {
  console.error('Firestore connection failed:', err);
  process.exit(1);
});

async function setClaimsForAllAccessOwners() {
  const usersRef = db.collection("users");
  const snapshot = await usersRef
    .where("role", "==", "owner")
    .where("plan", "==", "all-access")
    .get();

  if (snapshot.empty) {
    console.log("No owners with all-access plan found.");
    return;
  }

  const promises = [];
  snapshot.forEach(doc => {
  const uid = doc.id;
  console.log(`Checking UID: ${uid}`);
  promises.push(
    admin.auth().getUser(uid)
      .then(userRecord => {
        console.log(`User exists: ${userRecord.uid}`);
        return admin.auth().setCustomUserClaims(uid, { isTruckOwner: true });
      })
      .catch(err => {
        console.error(`User not found in Auth for UID: ${uid}`, err);
      })
  );
});

  await Promise.all(promises);
  console.log("Custom claims set for all matching owners.");
}

setClaimsForAllAccessOwners()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error setting custom claims:", err);
    process.exit(1);
  });