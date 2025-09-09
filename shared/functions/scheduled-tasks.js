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



    const oldPings = await firestore
      .collection("pings")
      .where("timestamp", "<", cutoff)
      .get();



    if (oldPings.empty) {
     
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
 
  } catch (error) {

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
  
    }
    return null;
  } catch (error) {

  }
});

// Manage truck visibility with 8-hour minimum duration
export const manageTruckVisibility = onSchedule("every 5 minutes", async (event) => {
  try {

    
    const now = Date.now();
    const EIGHT_HOURS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    const GRACE_PERIOD = 15 * 60 * 1000; // 15 minutes grace period
    
    const trucksRef = firestore.collection("truckLocations");
    const allTrucks = await trucksRef.get();
    
    let updatedCount = 0;
    let hiddenCount = 0;
    
    const batch = firestore.batch();
    
    for (const doc of allTrucks.docs) {
      const truck = doc.data();
      const truckId = doc.id;
      
      // Skip if truck doesn't have required fields
      if (!truck.lastActive || typeof truck.lastActive !== 'number') {
        continue;
      }
      
      const timeSinceActive = now - truck.lastActive;
      const sessionDuration = truck.sessionStartTime ? now - truck.sessionStartTime : timeSinceActive;
      
      // Determine if truck should remain visible
      let shouldBeVisible = truck.visible;
      let shouldBeLive = truck.isLive;
      
      // Case 1: Truck has been active recently (within grace period) - keep alive
      if (timeSinceActive <= GRACE_PERIOD) {
        shouldBeVisible = true;
        shouldBeLive = true;
 
      }
      // Case 2: Truck has been inactive but within 8-hour minimum visibility window
      else if (sessionDuration < EIGHT_HOURS) {
        shouldBeVisible = true;
        shouldBeLive = false; // Not actively updating, but still visible
  
      }
      // Case 3: Truck has exceeded 8-hour minimum and grace period - hide it
      else if (timeSinceActive > EIGHT_HOURS) {
        shouldBeVisible = false;
        shouldBeLive = false;
  
        hiddenCount++;
      }
      
      // Update truck if visibility or live status needs to change
      const needsUpdate = (
        truck.visible !== shouldBeVisible || 
        truck.isLive !== shouldBeLive ||
        !truck.sessionStartTime
      );
      
      if (needsUpdate) {
        const updates = {
          visible: shouldBeVisible,
          isLive: shouldBeLive,
          lastChecked: now,
        };
        
        // Set session start time if not already set and truck is going live
        if (!truck.sessionStartTime && shouldBeVisible) {
          updates.sessionStartTime = truck.lastActive || now;
        }
        
        // Clear session start time if hiding truck
        if (!shouldBeVisible) {
          updates.sessionStartTime = admin.firestore.FieldValue.delete();
        }
        
        batch.update(doc.ref, updates);
        updatedCount++;
        
      
      }
    }
    
    // Commit all updates
    if (updatedCount > 0) {
      await batch.commit();
    }
    
    const message = `🚚 Truck visibility management complete: ${updatedCount} updated, ${hiddenCount} hidden, ${allTrucks.size} total trucks`;
   
    
    return { 
      success: true, 
      totalTrucks: allTrucks.size, 
      updatedCount, 
      hiddenCount 
    };
    
  } catch (error) {

    throw error;
  }
});
