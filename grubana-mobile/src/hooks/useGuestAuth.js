import { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNavigation } from '@react-navigation/native';

export const useGuestAuth = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authPromptFeature, setAuthPromptFeature] = useState('');

  const requireAuth = (feature = 'this feature', callback) => {
    if (!user) {
      setAuthPromptFeature(feature);
      setShowAuthPrompt(true);
      return false;
    }
    
    if (callback) {
      callback();
    }
    return true;
  };

  const handleLogin = () => {
    setShowAuthPrompt(false);
    // Navigate to login tab in guest mode
    navigation.navigate('Login');
  };

  const hideAuthPrompt = () => {
    setShowAuthPrompt(false);
  };

  return {
    isAuthenticated: !!user,
    showAuthPrompt,
    authPromptFeature,
    requireAuth,
    handleLogin,
    hideAuthPrompt,
  };
};

export default useGuestAuth;