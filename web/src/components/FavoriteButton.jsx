import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';

const FavoriteButton = ({ userId, truckOwnerId, truckName, onFavoriteChange }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favDocId, setFavDocId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
    if (!userId || !truckOwnerId || isLoading) return;
    
    setIsLoading(true);
    
    try {
      if (isFavorite && favDocId) {
        await deleteDoc(doc(db, 'favorites', favDocId));
        setIsFavorite(false);
        setFavDocId(null);
        console.log('💔 Removed from favorites:', truckName);
      } else {
        // Get the most up-to-date truck name from the users collection
        let finalTruckName = truckName || '';
        
        if (!finalTruckName) {
          try {
            const ownerDoc = await getDoc(doc(db, 'users', truckOwnerId));
            if (ownerDoc.exists()) {
              const ownerData = ownerDoc.data();
              finalTruckName = ownerData.truckName || ownerData.ownerName || 'Food Truck';
            }
          } catch (error) {
            console.error('Error fetching truck name:', error);
            finalTruckName = 'Food Truck';
          }
        }
        
        const docRef = await addDoc(collection(db, 'favorites'), {
          userId,
          truckId: truckOwnerId,
          truckName: finalTruckName,
          createdAt: new Date(),
        });
        setIsFavorite(true);
        setFavDocId(docRef.id);
        console.log('❤️ Added to favorites:', finalTruckName);
      }
      
      // Call the callback if provided
      if (onFavoriteChange) {
        onFavoriteChange(!isFavorite);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleToggleFavorite}
      disabled={isLoading}
      style={{
        backgroundColor: isFavorite ? '#ffebef' : '#ffffff',
        color: isFavorite ? '#e74c3c' : '#2c6f57',
        border: isFavorite ? '2px solid #e74c3c' : '2px solid #2c6f57',
        borderRadius: '25px',
        padding: '10px 20px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: isLoading ? 'wait' : 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: '160px',
        justifyContent: 'center',
        boxShadow: isFavorite ? '0 2px 8px rgba(231, 76, 60, 0.3)' : '0 2px 8px rgba(44, 111, 87, 0.3)',
        transform: 'scale(1)',
        opacity: isLoading ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = isFavorite 
            ? '0 4px 15px rgba(231, 76, 60, 0.4)' 
            : '0 4px 15px rgba(44, 111, 87, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = isFavorite 
            ? '0 2px 8px rgba(231, 76, 60, 0.3)' 
            : '0 2px 8px rgba(44, 111, 87, 0.3)';
        }
      }}
    >
      <span style={{ fontSize: '18px' }}>
        {isLoading ? '⏳' : (isFavorite ? '❤️' : '🤍')}
      </span>
      {isLoading ? 'Updating...' : (isFavorite ? 'Favorited!' : 'Add to Favorites')}
    </button>
  );
};

export default FavoriteButton;