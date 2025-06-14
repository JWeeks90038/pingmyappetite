import { getAuth, signOut } from 'firebase/auth';

export const logoutUser = async () => {
  const auth = getAuth();
  await signOut(auth);
};