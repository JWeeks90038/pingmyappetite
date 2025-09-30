import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

/**
 * Service for managing foodie profiles and personalized markers
 */
class FoodieProfileService {
  // Default marker icons available to users
  static DEFAULT_MARKERS = {
    browse: '🍽️',
    hungry: '😋',
    pizza: '🍕',
    burger: '🍔',
    taco: '🌮',
    sushi: '🍱',
    coffee: '☕',
    dessert: '🍰',
    vegan: '🥗',
    spicy: '🌶️',
    bbq: '🍖',
    seafood: '🦐',
    italian: '🍝',
    asian: '🥢',
    mexican: '🇲🇽',
    american: '🇺🇸',
    foodie: '👨‍🍳',
    chef: '👩‍🍳',
    star: '⭐',
    heart: '❤️',
    fire: '🔥',
    crown: '👑'
  };

  /**
   * Get user's foodie profile including their profile photo
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile with photo info
   */
  static async getFoodieProfile(userId) {
    try {
      const profileRef = doc(db, 'foodieProfiles', userId);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        const profile = profileDoc.data();
        return {
          ...profile,
          profilePhotoURL: profile.profilePhotoURL || null,
          markerIcon: profile.markerIcon || this.DEFAULT_MARKERS.browse, // Fallback for users without photos
          displayName: profile.displayName || 'Anonymous Foodie',
          level: profile.level || 1,
          totalPoints: profile.totalPoints || 0
        };
      }
      
      // Return default profile
      return {
        profilePhotoURL: null,
        markerIcon: this.DEFAULT_MARKERS.browse,
        displayName: 'Anonymous Foodie',
        level: 1,
        totalPoints: 0,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error getting foodie profile:', error);
      return {
        profilePhotoURL: null,
        markerIcon: this.DEFAULT_MARKERS.browse,
        displayName: 'Anonymous Foodie',
        level: 1,
        totalPoints: 0
      };
    }
  }

  /**
   * Update user's personalized marker icon
   * @param {string} userId - User ID
   * @param {string} markerIcon - Selected marker icon
   * @param {string} displayName - Display name (optional)
   * @returns {Promise<Object>} Update result
   */
  static async updateMarkerIcon(userId, markerIcon, displayName = null) {
    try {
      const profileRef = doc(db, 'foodieProfiles', userId);
      const updateData = {
        markerIcon,
        updatedAt: serverTimestamp()
      };
      
      if (displayName) {
        updateData.displayName = displayName;
      }
      
      await updateDoc(profileRef, updateData);
      
      return { success: true, markerIcon };
    } catch (error) {
      console.error('Error updating marker icon:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available marker icons grouped by category
   * @returns {Object} Grouped marker icons
   */
  static getAvailableMarkers() {
    return {
      'Basic': {
        browse: '🍽️ Browse',
        hungry: '😋 Hungry',
        foodie: '👨‍🍳 Foodie',
        chef: '👩‍🍳 Chef'
      },
      'Food Types': {
        pizza: '🍕 Pizza',
        burger: '🍔 Burger',
        taco: '🌮 Taco',
        sushi: '🍱 Sushi',
        coffee: '☕ Coffee',
        dessert: '🍰 Dessert',
        vegan: '🥗 Vegan',
        bbq: '🍖 BBQ',
        seafood: '🦐 Seafood',
        italian: '🍝 Italian',
        asian: '🥢 Asian'
      },
      'Special': {
        spicy: '🌶️ Spicy',
        star: '⭐ Star',
        heart: '❤️ Heart',
        fire: '🔥 Fire',
        crown: '👑 Crown'
      },
      'Regional': {
        mexican: '🇲🇽 Mexican',
        american: '🇺🇸 American'
      }
    };
  }

  /**
   * Create a personalized marker HTML for the map
   * @param {Object} foodieData - Foodie check-in data
   * @param {string} markerIcon - Custom marker icon
   * @param {number} level - User level
   * @returns {string} HTML string for custom marker
   */
  static createPersonalizedMarkerHTML(foodieData, markerIcon = null, level = 1) {
    const icon = markerIcon || this.DEFAULT_MARKERS.browse;
    const displayName = foodieData.displayName || 'Anonymous';
    
    // Get level-based border color
    const getLevelColor = (level) => {
      if (level >= 10) return '#FFD700'; // Gold
      if (level >= 7) return '#9C27B0';  // Purple
      if (level >= 5) return '#2196F3';  // Blue
      if (level >= 3) return '#4CAF50';  // Green
      return '#FF9800'; // Orange for beginners
    };
    
    const borderColor = getLevelColor(level);
    
    return `
      <div style="
        background: white;
        border: 3px solid ${borderColor};
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        position: relative;
      ">
        <span style="font-size: 18px;">${icon}</span>
        <div style="
          position: absolute;
          bottom: -8px;
          right: -8px;
          background: ${borderColor};
          color: white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          border: 2px solid white;
        ">${level}</div>
      </div>
    `;
  }

  /**
   * Get enriched nearby foodies with their profile data
   * @param {Array} nearbyFoodies - Raw nearby foodie data
   * @returns {Promise<Array>} Enriched foodie data with profiles
   */
  static async enrichNearbyFoodies(nearbyFoodies) {
    try {
      const enrichedFoodies = await Promise.all(
        nearbyFoodies.map(async (foodie) => {
          const profile = await this.getFoodieProfile(foodie.userId);
          return {
            ...foodie,
            profile: profile,
            markerIcon: profile.markerIcon,
            displayName: profile.displayName,
            level: profile.level || 1,
            totalPoints: profile.totalPoints || 0
          };
        })
      );
      
      return enrichedFoodies;
    } catch (error) {
      console.error('Error enriching nearby foodies:', error);
      return nearbyFoodies.map(foodie => ({
        ...foodie,
        markerIcon: this.DEFAULT_MARKERS.browse,
        displayName: 'Anonymous Foodie',
        level: 1,
        totalPoints: 0
      }));
    }
  }
}

export default FoodieProfileService;