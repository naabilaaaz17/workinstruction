import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export default function ProtectedRoute({ children, akses }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const adminEmails = ["admin@gmail.com"]; // Ganti dengan email admin kamu

  if (akses === "admin" && !adminEmails.includes(user.email)) {
    return <Navigate to="/home" replace />;
  }

  if (akses === "karyawan" && adminEmails.includes(user.email)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
