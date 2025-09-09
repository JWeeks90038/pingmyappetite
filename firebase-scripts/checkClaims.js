const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = "ZwulCgjrukVVsh7CylHEU9V58gi1";

admin.auth().setCustomUserClaims(uid, { isTruckOwner: true })
  .then(() => {
   
    process.exit(0);
  })
  .catch(err => {

    process.exit(1);
  });