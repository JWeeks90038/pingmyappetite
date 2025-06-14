const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = "ZwulCgjrukVVsh7CylHEU9V58gi1";

admin.auth().setCustomUserClaims(uid, { isTruckOwner: true })
  .then(() => {
    //console.log("Custom claim set for user:", uid);
    process.exit(0);
  })
  .catch(err => {
   // console.error("Error setting custom claim:", err);
    process.exit(1);
  });