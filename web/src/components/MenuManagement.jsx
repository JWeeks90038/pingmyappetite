import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

const MenuManagement = () => {
  // FORCE UPDATE - BUTTON SIZING FIX v3.0
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    image: null,
    imageUrl: '',
    isNewItem: false
  });
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    'Appetizers', 'Entree', 'Sides', 'Desserts', 'Beverages', 'Specials'
  ];

  useEffect(() => {
    if (user?.uid) {
      loadMenuItems();
    }
  }, [user]);

  const loadMenuItems = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      console.log('🍽️ MenuManagement: Loading menu items for user:', user.uid);
      const menuItemsRef = collection(db, 'menuItems');
      const menuSnapshot = await getDocs(query(menuItemsRef, where('ownerId', '==', user.uid)));
      
      const items = [];
      menuSnapshot.forEach(doc => {
        const itemData = { id: doc.id, ...doc.data() };
        console.log('🍽️ MenuManagement: Menu item loaded:', {
          id: itemData.id,
          name: itemData.name,
          category: itemData.category,
          price: itemData.price,
          imageUrl: itemData.imageUrl ? 'HAS_IMAGE' : 'NO_IMAGE',
          isNewItem: itemData.isNewItem
        });
        items.push(itemData);
      });

      // Sort by category and then by name
      items.sort((a, b) => {
        if (a.category !== b.category) {
          return (a.category || '').localeCompare(b.category || '');
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      console.log('🍽️ MenuManagement: Total menu items loaded:', items.length);
      console.log('🍽️ MenuManagement: All items:', items.map(item => ({ name: item.name, category: item.category })));
      setMenuItems(items);
    } catch (error) {
      console.error('Error loading menu items:', error);
      alert('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      image: null,
      imageUrl: '',
      isNewItem: false
    });
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    setFormData({
      name: item.name || '',
      description: item.description || '',
      price: item.price?.toString() || '',
      category: item.category || '',
      image: null,
      imageUrl: item.imageUrl || '',
      isNewItem: item.isNewItem || false
    });
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Please select an image smaller than 5MB');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }
      
      setFormData(prev => ({ ...prev, image: file }));
    }
  };

  const uploadImage = async (imageFile) => {
    if (!imageFile) return null;

    try {
      setUploading(true);
      
      // Create a reference with timestamp to ensure uniqueness
      const timestamp = Date.now();
      const imageRef = ref(storage, `menuItems/${user.uid}/${timestamp}`);
      
      // Upload the image
      await uploadBytes(imageRef, imageFile);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
      
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const saveMenuItem = async () => {
    console.log('🍽️ MenuManagement: Saving Menu Item with formData:', formData);
    
    if (!formData.name.trim() || !formData.price.trim()) {
      alert('Please fill in the name and price');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    try {
      setUploading(true);
      
      let imageUrl = formData.imageUrl;
      
      // Upload new image if selected
      if (formData.image) {
        imageUrl = await uploadImage(formData.image);
      }

      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: price,
        category: formData.category || 'Uncategorized',
        imageUrl: imageUrl || '',
        isNewItem: formData.isNewItem,
        ownerId: user.uid,
        updatedAt: serverTimestamp()
      };

      if (editingItem) {
        // Update existing item
        await updateDoc(doc(db, 'menuItems', editingItem.id), itemData);
        alert('Menu item updated successfully!');
      } else {
        // Add new item
        itemData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'menuItems'), itemData);
        alert('Menu item added successfully!');
      }

      setShowAddModal(false);
      resetForm();
      await loadMenuItems();
      
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Failed to save menu item');
    }
  };

  const deleteMenuItem = (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      handleDeleteMenuItem(item);
    }
  };

  const handleDeleteMenuItem = async (item) => {
    try {
      await deleteDoc(doc(db, 'menuItems', item.id));
      alert('Menu item deleted successfully!');
      await loadMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Failed to delete menu item');
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'Uncategorized') {
      return !item.category || item.category === 'Uncategorized';
    }
    const shouldShow = item.category === selectedCategory;
    console.log('🔍 MenuManagement: Filtering item:', item.name, 'category:', item.category, 'selectedCategory:', selectedCategory, 'shouldShow:', shouldShow);
    return shouldShow;
  });

  const groupedMenuItems = filteredMenuItems.reduce((groups, item) => {
    const category = item.category || 'Uncategorized';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    console.log('📋 MenuManagement: Grouped item:', item.name, 'into category:', category);
    return groups;
  }, {});

  console.log('📊 MenuManagement: Final grouped menu items:', groupedMenuItems);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" style={{background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)'}}>
      {/* Header Section */}
      <div className="bg-white shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🍽️ Menu Management</h1>
            <p className="text-gray-600 mb-6">Create and manage your delicious menu items</p>
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow transition duration-200 flex items-center mx-auto text-sm"
              style={{padding: '8px 16px', fontSize: '14px'}}
            >
              <svg className="w-4 h-4 mr-2" style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Menu Item
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{menuItems.length}</div>
            <div className="text-gray-600 font-medium">Total Items</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{Object.keys(groupedMenuItems).length}</div>
            <div className="text-gray-600 font-medium">Categories</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{menuItems.filter(item => item.isNewItem).length}</div>
            <div className="text-gray-600 font-medium">New Items</div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Category</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full font-medium transition duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({menuItems.length})
            </button>
            {categories.map(category => {
              const count = menuItems.filter(item => item.category === category).length;
              if (count === 0) return null;
              
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full font-medium transition duration-200 ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
            {menuItems.some(item => !item.category || item.category === 'Uncategorized') && (
              <button
                onClick={() => setSelectedCategory('Uncategorized')}
                className={`px-4 py-2 rounded-full font-medium transition duration-200 ${
                  selectedCategory === 'Uncategorized'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Uncategorized ({menuItems.filter(item => !item.category || item.category === 'Uncategorized').length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        {Object.keys(groupedMenuItems).length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-gray-400 mb-6">
              <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No menu items yet</h3>
            <p className="text-gray-600 mb-8 text-lg">Start building your delicious menu by adding your first item</p>
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow transition duration-200"
            >
              Create First Menu Item
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedMenuItems).map(([category, items]) => (
              <div key={category} className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{category}</h2>
                      <p className="text-gray-600">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {items.length}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {items.map(item => {
                      console.log('🎨 MenuManagement: Rendering item:', item.name, 'in category:', category);
                      return (
                        <div key={item.id} className="bg-gray-50 rounded-lg p-5 hover:shadow-lg transition duration-300 border border-gray-200">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-12 h-12 object-cover rounded-lg"
                                  style={{width: '48px', height: '48px'}}
                                  onError={(e) => {
                                    console.log('🍽️ MenuManagement: Image load error for item:', item.name, 'URL:', item.imageUrl);
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center mb-2">
                                <h3 className="text-lg font-semibold text-gray-900 truncate">{item.name}</h3>
                                {item.isNewItem && (
                                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    NEW
                                  </span>
                                )}
                              </div>
                              <p className="text-2xl font-bold text-green-600 mb-2">${item.price?.toFixed(2)}</p>
                              {item.description && (
                                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                              )}
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium py-2 px-3 rounded-lg transition duration-200 text-sm"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteMenuItem(item)}
                                  className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 font-medium py-2 px-3 rounded-lg transition duration-200 text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Image Preview */}
                {(formData.imageUrl || formData.image) && (
                  <div className="text-center">
                    <img
                      src={formData.image ? URL.createObjectURL(formData.image) : formData.imageUrl}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg mx-auto"
                    />
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Enter delicious item name"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-gray-500 text-lg">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Describe your delicious creation..."
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Photo</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition duration-200">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-600 font-medium text-sm">Click to upload photo</p>
                      <p className="text-gray-400 text-xs">PNG, JPG up to 5MB</p>
                    </label>
                  </div>
                </div>

                {/* New Item Toggle */}
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
                  <div>
                    <label htmlFor="isNewItem" className="block text-sm font-semibold text-gray-700">
                      Mark as New Item
                    </label>
                    <p className="text-xs text-gray-600">Show "NEW" badge on this item</p>
                  </div>
                  <input
                    type="checkbox"
                    id="isNewItem"
                    checked={formData.isNewItem}
                    onChange={(e) => setFormData(prev => ({ ...prev, isNewItem: e.target.checked }))}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>

              <div className="flex space-x-4 mt-8">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold py-3 px-6 rounded-xl transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveMenuItem}
                  disabled={uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
                >
                  {uploading ? 'Saving...' : (editingItem ? 'Update Item' : 'Add Item')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
