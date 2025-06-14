import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const FavoriteButton = ({ userId, truckOwnerId, truckName }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favDocId, setFavDocId] = useState(null);

  useEffect(() => {
    if (!userId || !truckOwnerId) return;
    const checkFavorite = async () => {
      const q = query(
        collection(db, 'favorites'),
        where('userId', '==', userId),
        where('truckId', '==', truckOwnerId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setIsFavorite(true);
        setFavDocId(snap.docs[0].id);
      } else {
        setIsFavorite(false);
        setFavDocId(null);
      }
    };
    checkFavorite();
  }, [userId, truckOwnerId]);

  const addFavorite = async (customerId, truckOwnerId) => {
  await addDoc(collection(db, 'favorites'), {
    customerId,
    truckOwnerId,
    timestamp: serverTimestamp(),
  });
};

  const handleToggleFavorite = async () => {
    if (!userId || !truckOwnerId) return;
    if (isFavorite && favDocId) {
      await deleteDoc(doc(db, 'favorites', favDocId));
      setIsFavorite(false);
      setFavDocId(null);
    } else {
      await addDoc(collection(db, 'favorites'), {
        userId,
        truckId: truckOwnerId,
        truckName: truckName || '', // <-- Add this line
        createdAt: new Date(),
      });
      setIsFavorite(true);
      // No need to setFavDocId here, onSnapshot will update it
    }
  };

  return (
    <button onClick={handleToggleFavorite}>
      {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
    </button>
  );
};

export default FavoriteButton;