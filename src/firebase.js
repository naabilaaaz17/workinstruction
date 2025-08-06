// src/firebase.js - Versi yang diperbaiki untuk mengatasi IndexedDB error
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, initializeFirestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage"; // ← Tambahkan import storage

const firebaseConfig = {
  apiKey: "AIzaSyA3zcD5eay3FbT1yqrNs7TnFUIKKm_0I0U",
  authDomain: "work-instruction-8ace7.firebaseapp.com",
  projectId: "work-instruction-8ace7",
  storageBucket: "work-instruction-8ace7.appspot.com",
  messagingSenderId: "163344858359",
  appId: "1:163344858359:web:184edf7dde09d91fb467f2",
  measurementId: "G-RRHHEX4XSC",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore dengan konfigurasi yang lebih stabil
let db;
try {
  // Coba inisialisasi Firestore dengan pengaturan cache yang lebih baik
  db = initializeFirestore(app, {
    cache: {
      // Gunakan memory cache untuk menghindari masalah IndexedDB
      kind: 'memory'
    },
    // Tambahkan settings untuk stabilitas
    ignoreUndefinedProperties: true,
    // Disable offline persistence untuk sementara
    localCache: {
      kind: 'memory'
    }
  });
} catch (error) {
  console.warn('Failed to initialize Firestore with custom settings, falling back to default:', error);
  // Fallback ke inisialisasi default
  db = getFirestore(app);
}

export { db };

// Initialize Storage - TAMBAHAN BARU
export const storage = getStorage(app);

// Initialize Analytics dengan error handling yang lebih baik
let analytics = null;
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Analytics not available:', error);
  }
}

// Development mode: Connect to emulators dengan error handling
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATOR === 'true') {
  try {
    // Pastikan emulator belum terhubung sebelumnya
    if (!auth.config.emulator) {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    }
    
    if (!db._delegate._databaseId.projectId.includes('demo-')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }

    // Connect Storage Emulator jika diperlukan
    if (process.env.REACT_APP_USE_STORAGE_EMULATOR === 'true') {
      connectStorageEmulator(storage, 'localhost', 9199);
    }
  } catch (error) {
    console.warn('Emulator connection failed:', error);
  }
}

export { analytics };
export default app;

// Utility function untuk handle Firebase operations dengan error handling
export const handleFirebaseError = (error) => {
  console.error('Firebase error:', error);
  
  // Jika error terkait IndexedDB, coba fallback
  if (error.code === 'app/idb-set' || error.message.includes('IndexedDB')) {
    console.warn('IndexedDB error detected, using fallback method');
    return true; // Indicate fallback should be used
  }
  
  return false;
};

// Wrapper function untuk Firestore operations
export const safeFirestoreOperation = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    const shouldFallback = handleFirebaseError(error);
    if (shouldFallback) {
      // Implementasi fallback, misalnya menggunakan localStorage
      console.warn('Using localStorage fallback due to Firestore error');
      throw new Error('FALLBACK_REQUIRED');
    }
    throw error;
  }
};

// Utility function untuk Storage operations dengan error handling
export const safeStorageOperation = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    console.error('Storage operation error:', error);
    throw error;
  }
};