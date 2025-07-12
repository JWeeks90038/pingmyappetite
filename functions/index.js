import {onSchedule} from "firebase-functions/v2/scheduler";
import admin from "firebase-admin";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

admin.initializeApp();
const db = getFirestore();

// Delete old pings (archive first) - FIXED VERSION
export const deleteOldPings = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "America/Los_Angeles",
  },
  async () => {
    try {
      const now = Date.now();
      // 30 days ago
      const cutoffDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      const cutoff = Timestamp.fromDate(cutoffDate);

      console.log(`Checking for pings older than: ${cutoffDate.toISOString()}`);

      const oldPings = await db
        .collection("pings")
        .where("timestamp", "<", cutoff)
        .get();

      console.log(`Found ${oldPings.size} pings to archive and delete`);

      if (oldPings.empty) {
        console.log("No old pings to delete");
        return;
      }

      const batch = db.batch();

      oldPings.forEach((doc) => {
        const data = doc.data();
        // Archive the ping to pingAnalytics before deleting
        const archiveRef = db.collection("pingAnalytics").doc(doc.id);
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
  },
);

// Delete expired drops
export const deleteExpiredDrops = onSchedule(
  {
    schedule: "every 10 minutes",
    timeZone: "America/Los_Angeles",
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const dropsRef = db.collection("drops");
    const expiredDrops = await dropsRef.where("expiresAt", "<=", now).get();

    const batch = db.batch();
    expiredDrops.forEach((doc) => {
      batch.delete(doc.ref);
    });

    if (!expiredDrops.empty) {
      await batch.commit();
      //console.log("Deleted " + expiredDrops.size + " expired drops.",);
    }
    return null;
  },
);
