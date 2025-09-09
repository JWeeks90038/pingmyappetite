import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const PinDrop = async ({ lat, lng, userId, notes, cuisine }) => {
  try {
    await addDoc(collection(db, "pings"), {  // Change "pinDrops" to "pings"
      lat,
      lng,
      userId,
      notes,
      cuisine,  // Add cuisine here
      timestamp: serverTimestamp(),
    });
    //console.log("Pin drop added!");
  } catch (error) {

  }
};

export default PinDrop;