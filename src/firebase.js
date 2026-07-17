import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCGNuOy0YCmztpgQHiaiGwS6V3a1J_sG9A',
  authDomain: 'akademika-learning.firebaseapp.com',
  projectId: 'akademika-learning',
  storageBucket: 'akademika-learning.firebasestorage.app',
  messagingSenderId: '999105004293',
  appId: '1:999105004293:web:c39900a78b2f8394f96d6c',
  measurementId: 'G-TVJBK7BH0K',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
