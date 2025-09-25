import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function ProtectedRoute({ children, requiredRole }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const ADMIN_EMAIL = "admin@gmail.com";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Special case for admin@gmail.com
          if (currentUser.email === ADMIN_EMAIL) {
            setUserData({
              role: "admin",
              status: "approved",
              isSystemAdmin: true,
              email: ADMIN_EMAIL
            });
            setUser(currentUser);
            setLoading(false);
            return;
          }

          // Normal user flow - get data from Firestore
          try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUserData(data);
              console.log("User data loaded:", data);
            } else {
              console.error("User document not found for:", currentUser.uid);
              setError("User profile not found. Please contact administrator.");
            }
          } catch (firestoreError) {
            console.error("Firestore error:", firestoreError);
            setError("Failed to load user profile");
          }
        } else {
          setUserData(null);
        }
        setUser(currentUser);
      } catch (err) {
        console.error("Auth state error:", err);
        setError("Authentication error occurred");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="loading-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: '1rem'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="error-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <p style={{ color: '#e74c3c', fontWeight: 'bold' }}>Error: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // No user logged in
  if (!user) {
    console.log("No user authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Check if we have user data (required for role checks)
  if (!userData) {
    console.log("No user data available, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Special admin detection
  const isSystemAdmin = user.email === ADMIN_EMAIL && userData.isSystemAdmin;

  console.log("ProtectedRoute Debug:", {
    userEmail: user.email,
    userDataRole: userData.role,
    userDataStatus: userData.status,
    requiredRole,
    isSystemAdmin,
    currentPath: window.location.pathname
  });

  // Check account status (skip for system admin)
  if (!isSystemAdmin) {
    if (userData.status === "pending") {
      console.log("User status pending, redirecting to login");
      return (
        <Navigate 
          to="/login" 
          state={{ 
            message: "Your account is pending approval. Please wait for admin confirmation." 
          }} 
          replace 
        />
      );
    }
    
    if (userData.status === "rejected") {
      console.log("User status rejected, redirecting to login");
      return (
        <Navigate 
          to="/login" 
          state={{ 
            message: "Your account has been rejected. Please contact administrator." 
          }} 
          replace 
        />
      );
    }
    
    if (userData.status !== "approved") {
      console.log("User status not approved:", userData.status);
      return (
        <Navigate 
          to="/login" 
          state={{ 
            message: "Account status invalid. Please contact administrator." 
          }} 
          replace 
        />
      );
    }
  }

  // Role-based access control
  if (requiredRole) {
    console.log(`Checking access for required role: ${requiredRole}`);
    
    // Admin route protection
    if (requiredRole === "admin") {
      if (!isSystemAdmin && userData.role !== "admin") {
        console.log("Non-admin trying to access admin route, redirecting to home");
        return <Navigate to="/home" replace />;
      }
    }
    
    // Employee route protection - DIPERBAIKI UNTUK TASK
    if (requiredRole === "employee" || requiredRole === "karyawan" || requiredRole === "task") {
      if (isSystemAdmin) {
        // System admin bisa akses semua route
        console.log("System admin accessing employee/task route - ALLOWED");
      } else {
        // Accept multiple employee role variants
        const validEmployeeRoles = ["employee", "karyawan", "operator"];
        if (!validEmployeeRoles.includes(userData.role)) {
          console.log(`User with role '${userData.role}' trying to access ${requiredRole} route`);
          console.log(`Valid roles are: ${validEmployeeRoles.join(', ')}`);
          return (
            <Navigate 
              to="/login" 
              state={{ 
                message: `Access denied. Required role: ${requiredRole}. Your role: ${userData.role}` 
              }} 
              replace 
            />
          );
        }
      }
    }
  }

  // If all checks pass, render the protected component
  console.log("All checks passed, rendering protected content");
  return children;
}