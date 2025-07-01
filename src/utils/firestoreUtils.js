// src/utils/firestoreUtils.js
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  addDoc,
  query,
  where,
  orderBy,
  limit,
  enableNetwork,
  disableNetwork,
  waitForPendingWrites,
  onSnapshot
} from "firebase/firestore";
import { db } from "../firebase";

// Enhanced error handling wrapper
const handleFirestoreError = (error, operation) => {
  console.error(`Firestore ${operation} error:`, error);
  
  // Handle specific error codes
  switch (error.code) {
    case 'unavailable':
      console.warn('Firestore temporarily unavailable, retrying...');
      return { retry: true, message: 'Service temporarily unavailable' };
    case 'permission-denied':
      return { retry: false, message: 'Permission denied' };
    case 'not-found':
      return { retry: false, message: 'Document not found' };
    case 'cancelled':
      return { retry: true, message: 'Operation cancelled' };
    case 'deadline-exceeded':
      return { retry: true, message: 'Request timeout' };
    default:
      return { retry: false, message: error.message || 'Unknown error' };
  }
};

// Retry mechanism for operations
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const errorInfo = handleFirestoreError(error, 'operation');
      
      if (!errorInfo.retry || attempt === maxRetries) {
        throw error;
      }
      
      console.log(`Retrying operation (${attempt}/${maxRetries}) after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

// Create document with retry
export const createDocument = async (collectionName, documentId, data) => {
  return retryOperation(async () => {
    const docRef = doc(db, collectionName, documentId);
    await setDoc(docRef, {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef;
  });
};

// Add document to collection with retry
export const addDocument = async (collectionName, data) => {
  return retryOperation(async () => {
    const colRef = collection(db, collectionName);
    return await addDoc(colRef, {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
};

// Get document with retry
export const getDocument = async (collectionName, documentId) => {
  return retryOperation(async () => {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Document not found');
    }
  });
};

// Update document with retry
export const updateDocument = async (collectionName, documentId, data) => {
  return retryOperation(async () => {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return docRef;
  });
};

// Delete document with retry
export const deleteDocument = async (collectionName, documentId) => {
  return retryOperation(async () => {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
    return documentId;
  });
};

// Get collection with retry
export const getCollection = async (collectionName, queryConstraints = []) => {
  return retryOperation(async () => {
    const colRef = collection(db, collectionName);
    const q = queryConstraints.length > 0 ? query(colRef, ...queryConstraints) : colRef;
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });
};

// Real-time listener with error handling
export const subscribeToDocument = (collectionName, documentId, callback, errorCallback) => {
  const docRef = doc(db, collectionName, documentId);
  
  return onSnapshot(docRef, 
    (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      } else {
        callback(null);
      }
    },
    (error) => {
      const errorInfo = handleFirestoreError(error, 'subscription');
      if (errorCallback) {
        errorCallback(errorInfo);
      }
    }
  );
};

// Real-time collection listener
export const subscribeToCollection = (collectionName, queryConstraints = [], callback, errorCallback) => {
  const colRef = collection(db, collectionName);
  const q = queryConstraints.length > 0 ? query(colRef, ...queryConstraints) : colRef;
  
  return onSnapshot(q,
    (querySnapshot) => {
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(documents);
    },
    (error) => {
      const errorInfo = handleFirestoreError(error, 'collection subscription');
      if (errorCallback) {
        errorCallback(errorInfo);
      }
    }
  );
};

// Network management utilities
export const enableFirestoreNetwork = async () => {
  try {
    await enableNetwork(db);
    console.log('Firestore network enabled');
  } catch (error) {
    console.error('Failed to enable Firestore network:', error);
  }
};

export const disableFirestoreNetwork = async () => {
  try {
    await disableNetwork(db);
    console.log('Firestore network disabled');
  } catch (error) {
    console.error('Failed to disable Firestore network:', error);
  }
};

// Wait for pending writes to complete
export const waitForPendingWrites = async () => {
  try {
    await waitForPendingWrites(db);
    console.log('All pending writes completed');
  } catch (error) {
    console.error('Error waiting for pending writes:', error);
  }
};

// Connection health check
export const checkFirestoreConnection = async () => {
  try {
    // Try to read a small document or create a test document
    const testDoc = doc(db, '_health', 'test');
    await getDoc(testDoc);
    return { connected: true, message: 'Firestore connection healthy' };
  } catch (error) {
    const errorInfo = handleFirestoreError(error, 'health check');
    return { connected: false, message: errorInfo.message };
  }
};