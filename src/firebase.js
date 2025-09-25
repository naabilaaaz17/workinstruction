// src/firebase.js - Versi lengkap dengan error handling dan optimasi
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  connectAuthEmulator,
  setPersistence,
  browserSessionPersistence,
  inMemoryPersistence
} from "firebase/auth";
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyA3zcD5eay3FbT1yqrNs7TnFUIKKm_0I0U",
  authDomain: "work-instruction-8ace7.firebaseapp.com",
  projectId: "work-instruction-8ace7",
  storageBucket: "work-instruction-8ace7.appspot.com",
  messagingSenderId: "163344858359",
  appId: "1:163344858359:web:184edf7dde09d91fb467f2",
  measurementId: "G-RRHHEX4XSC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth dengan persistence yang lebih baik
export const auth = getAuth(app);

// Konfigurasi persistence auth
export const configureAuthPersistence = async (persistenceType = 'session') => {
  try {
    await setPersistence(auth, 
      persistenceType === 'session' ? 
        browserSessionPersistence : 
        inMemoryPersistence
    );
  } catch (error) {
    console.error('Error setting auth persistence:', error);
  }
};

// Initialize Firestore dengan konfigurasi optimal
export let db;
export const initializeFirestoreDB = async () => {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        // Fallback ke memory cache jika IndexedDB error
        fallbackToMemory: true
      }),
      ignoreUndefinedProperties: true
    });
  } catch (error) {
    console.warn('Firestore initialization error, falling back to default:', error);
    db = getFirestore(app);
  }
  return db;
};

// Panggil inisialisasi
initializeFirestoreDB();

// Initialize Storage dengan error handling
export let storage;
try {
  storage = getStorage(app);
} catch (error) {
  console.error('Storage initialization failed:', error);
  storage = null;
}

// Initialize Functions
export const functions = getFunctions(app);

// Initialize Analytics dengan cek environment
export let analytics;
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
  }
}

// Emulator connection handler
const connectEmulators = () => {
  if (process.env.NODE_ENV === 'development') {
    try {
      // Auth Emulator
      if (!auth._emulatorConfig) {
        connectAuthEmulator(auth, "http://localhost:9099", {
          disableWarnings: true
        });
      }

      // Firestore Emulator
      if (!db._settings?.host) {
        connectFirestoreEmulator(db, 'localhost', 8080);
      }

      // Storage Emulator
      if (storage && !storage._app._getService('storage')._host.includes('localhost')) {
        connectStorageEmulator(storage, 'localhost', 9199);
      }

      // Functions Emulator
      if (!functions._regionOrCustomDomain) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }
    } catch (error) {
      console.warn('Emulator connection error:', error);
    }
  }
};

// Aktifkan emulator jika diperlukan
if (process.env.REACT_APP_USE_EMULATOR === 'true') {
  connectEmulators();
}

// Enhanced error handling utilities
export class FirebaseErrorHandler {
  static isIndexedDBError(error) {
    return error.code === 'app/idb-set' || 
           error.message.includes('IndexedDB') ||
           error.name === 'FirebaseError';
  }

  static handle(error, context = '') {
    console.error(`Firebase Error [${context}]:`, error);
    
    if (this.isIndexedDBError(error)) {
      console.warn('IndexedDB issue detected, applying fallbacks');
      return {
        shouldFallback: true,
        message: 'Storage unavailable, using fallback methods'
      };
    }

    return {
      shouldFallback: false,
      message: error.message
    };
  }
}

// Safe operation wrappers
export const safeOperation = async (operation, context = '') => {
  try {
    return await operation();
  } catch (error) {
    const { shouldFallback } = FirebaseErrorHandler.handle(error, context);
    
    if (shouldFallback) {
      // Implement fallback strategy here
      throw new Error('FALLBACK_REQUIRED');
    }
    
    throw error;
  }
};

// Auth state wrapper dengan error handling
export const getAuthState = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(
      user => {
        unsubscribe();
        resolve(user);
      },
      error => {
        unsubscribe();
        FirebaseErrorHandler.handle(error, 'auth-state');
        reject(error);
      }
    );
  });
};

export default app;