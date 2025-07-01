// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

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

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics only in production and if supported
let analytics = null;
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Analytics not available:', error);
  }
}

// Configure Firestore settings for better reliability
// Note: We don't need to access internal properties directly

// Development mode: Connect to emulators if needed
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    console.warn('Emulator connection failed:', error);
  }
}

export { analytics };
export default app;