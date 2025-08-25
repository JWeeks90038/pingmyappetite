import { onSchedule } from "firebase-functions/v2/scheduler";
import admin from "firebase-admin";
import { firestore } from "./firebase.js";

const { Timestamp } = admin.firestore;

// Delete old pings (archive first) - FIXED VERSION
export const deleteOldPings = onSchedule("every 24 hours", async (event) => {
  try {
    const now = Date.now();
    // 30 days ago
    const cutoffDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const cutoff = Timestamp.fromDate(cutoffDate);

    console.log(`Checking for pings older than: ${cutoffDate.toISOString()}`);

    const oldPings = await firestore
      .collection("pings")
      .where("timestamp", "<", cutoff)
      .get();

    console.log(`Found ${oldPings.size} pings to archive and delete`);

    if (oldPings.empty) {
      console.log("No old pings to delete");
      return;
    }

    const batch = firestore.batch();

    oldPings.forEach((doc) => {
      const data = doc.data();
      // Archive the ping to pingAnalytics before deleting
      const archiveRef = firestore.collection("pingAnalytics").doc(doc.id);
      batch.set(archiveRef, {
        ...data,
        archivedAt: Timestamp.now(),
      });
      // Delete original ping
      batch.delete(doc.ref);
    });

    await batch.commit();
    const message = "Successfully archived and deleted " +
      `${oldPings.size} old pings`;
    console.log(message);
  } catch (error) {
    console.error("Error in deleteOldPings function:", error);
  }
});

// Delete expired drops
export const deleteExpiredDrops = onSchedule("every 10 minutes", async (event) => {
  try {
    const now = Timestamp.now();
    const dropsRef = firestore.collection("drops");
    const expiredDrops = await dropsRef.where("expiresAt", "<=", now).get();

    const batch = firestore.batch();
    expiredDrops.forEach((doc) => {
      batch.delete(doc.ref);
    });

    if (!expiredDrops.empty) {
      await batch.commit();
      console.log("Deleted " + expiredDrops.size + " expired drops.");
    }
    return null;
  } catch (error) {
    console.error("Error in deleteExpiredDrops function:", error);
  }
});
