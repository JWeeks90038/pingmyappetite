const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
db.collection('users').limit(1).get().then(snap => {

}).catch(err => {

  process.exit(1);
});

async function setClaimsForAllAccessOwners() {
  const usersRef = db.collection("users");
  const snapshot = await usersRef
    .where("role", "==", "owner")
    .where("plan", "==", "all-access")
    .get();

  if (snapshot.empty) {

    return;
  }

  const promises = [];
  snapshot.forEach(doc => {
  const uid = doc.id;

  promises.push(
    admin.auth().getUser(uid)
      .then(userRecord => {

        return admin.auth().setCustomUserClaims(uid, { isTruckOwner: true });
      })
      .catch(err => {

      })
  );
});

  await Promise.all(promises);

}

setClaimsForAllAccessOwners()
  .then(() => process.exit(0))
  .catch(err => {

    process.exit(1);
  });