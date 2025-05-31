import {onSchedule} from "firebase-functions/v2/scheduler";
import admin from "firebase-admin";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

admin.initializeApp();
const db = getFirestore();

// Delete old pings (archive first)
export const deleteOldPings = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "America/Los_Angeles",
  },
  async () => {
    const now = Date.now();
    const cutoffDate = new Date(now - 30 * 24 * 60 * 60 * 1000); // 30 days ago
const cutoff = Timestamp.fromDate(cutoffDate);

    const oldPings = await db
      .collection("pings")
      .where("timestamp", "<", cutoff)
      .get();

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
    console.log(
      "Archived and deleted " + oldPings.size + " old pings.",
    );
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
      console.log(
        "Deleted " + expiredDrops.size + " expired drops.",
      );
    }
    return null;
  },
);
