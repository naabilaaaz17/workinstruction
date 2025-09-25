import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  collection, 
  serverTimestamp, 
  getDocs, 
  setDoc,
  query,
  where,
  limit,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import app from '../../firebase';
import logoLRS from '../assets/images/logoLRS.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const navigate = useNavigate();
  const auth = getAuth(app);
  
  // Configure Google Provider
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });

  // Admin credentials
  const ADMIN_EMAIL = 'admin@gmail.com';
  const ADMIN_PASSWORD = 'admin123';

  // Check if user is already authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Skip auto-redirect for admin to allow manual login
          if (user.email !== ADMIN_EMAIL) {
            // Check user status for regular users
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().status === 'approved') {
              navigate('/home');
              return;
            }
          }
          // If admin or user that needs approval, stay on login page
        } catch (err) {
          console.error('Auth state check error:', err);
          // If error occurs, stay on login page
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  // Navigation functions
  const handleRegister = () => navigate('/register');
  const handleCancel = () => navigate(-1);
  const handleLogoClick = () => navigate('/');

  const ArrowLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12,5 5,12 12,19"/>
    </svg>
  );

  // Function to create admin user document if it doesn't exist
  const createAdminUserDoc = async (user) => {
    try {
      const adminDocRef = doc(db, 'users', user.uid);
      
      // Try to get existing document first
      let adminDoc;
      try {
        adminDoc = await getDoc(adminDocRef);
      } catch (readErr) {
        console.log('Could not read admin document, will create new one');
      }
      
      // Create or update admin document
      const adminData = {
        uid: user.uid,
        email: user.email,
        username: 'admin',
        displayName: 'System Administrator',
        role: 'admin',
        status: 'approved',
        isSystemAdmin: true,
        provider: 'email',
        updatedAt: serverTimestamp(),
        loginHistory: adminDoc?.exists() ? adminDoc.data().loginHistory || [] : []
      };

      // Add createdAt only if document doesn't exist
      if (!adminDoc?.exists()) {
        adminData.createdAt = serverTimestamp();
      }

      await setDoc(adminDocRef, adminData, { merge: true });
      console.log('Admin user document created/updated successfully');
      
    } catch (err) {
      console.error('Error creating/updating admin user document:', err);
      // Don't throw error, just log it - admin can still access system
      console.log('Admin will continue without document creation');
    }
  };

  // Function to update login history
  const updateLoginHistory = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const loginHistory = userData.loginHistory || [];
        
        // Add new login record
        const newLoginRecord = {
          timestamp: serverTimestamp(),
          ip: 'unknown', // You can implement IP detection if needed
          userAgent: navigator.userAgent
        };
        
        // Keep only last 10 login records
        const updatedHistory = [newLoginRecord, ...loginHistory].slice(0, 10);
        
        await updateDoc(userRef, {
          lastLogin: serverTimestamp(),
          loginHistory: updatedHistory
        });
      }
    } catch (err) {
      console.error('Error updating login history:', err);
      // Don't throw error as this is not critical for login process
    }
  };

  // Enhanced sign-in function with better error handling
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (loading || googleLoading || authLoading) return;
    
    setLoading(true);
    setError('');
    setResetEmailSent(false);

    try {
      // Input validation
      if (!email || !password) {
        throw new Error('Email dan password wajib diisi');
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Format email tidak valid');
      }

      // Attempt to sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Handle admin login - only if both email AND password match admin credentials
      if (user.email === ADMIN_EMAIL && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Try to create/update admin document but don't fail if it doesn't work
        try {
          await createAdminUserDoc(user);
        } catch (err) {
          console.error('Admin document creation failed, but allowing login:', err);
        }
        
        try {
          await updateLoginHistory(user.uid);
        } catch (err) {
          console.error('Login history update failed, but allowing login:', err);
        }
        
        navigate('/admin');
        return;
      }
      
      // Handle regular user login - check if user document exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      let userDoc;
      
      try {
        userDoc = await getDoc(userDocRef);
      } catch (firestoreError) {
        console.error('Error fetching user document:', firestoreError);
        throw new Error('Terjadi kesalahan saat mengakses data pengguna. Silakan coba lagi.');
      }
      
      // If user document doesn't exist, they might have been created through Firebase Auth only
      if (!userDoc.exists()) {
        // Create a basic user document with pending status
        try {
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            username: user.displayName || user.email.split('@')[0],
            role: 'employee',
            status: 'pending', // Set to pending for admin approval
            provider: 'email',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            loginHistory: []
          });
          
          console.log('Created new user document for existing Firebase user');
          
          // Sign out the user and inform them about pending approval
          await auth.signOut();
          throw new Error('Akun Anda telah dibuat dan sedang menunggu persetujuan admin. Kami akan mengirim email ketika akun telah disetujui.');
          
        } catch (createError) {
          console.error('Error creating user document:', createError);
          await auth.signOut();
          throw new Error('Terjadi kesalahan saat membuat profil pengguna. Silakan hubungi administrator.');
        }
      }
      
      const userData = userDoc.data();
      
      // Check user status
      if (userData.status === 'pending') {
        await auth.signOut();
        throw new Error('Akun Anda sedang menunggu persetujuan admin. Kami akan mengirim email ketika akun telah disetujui.');
      } else if (userData.status === 'rejected') {
        await auth.signOut();
        throw new Error('Akun Anda telah ditolak oleh admin. Silakan hubungi administrator untuk informasi lebih lanjut.');
      } else if (userData.status !== 'approved') {
        await auth.signOut();
        throw new Error('Status akun tidak valid. Silakan hubungi administrator.');
      }
      
      // Update login history for approved users
      await updateLoginHistory(user.uid);
      
      navigate('/home');
      
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Terjadi kesalahan saat login. Silakan coba lagi.';
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = email === ADMIN_EMAIL 
            ? 'Akun admin tidak ditemukan. Silakan hubungi administrator sistem.' 
            : 'Email tidak terdaftar. Silakan periksa email Anda atau daftar terlebih dahulu.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Password salah. Silakan periksa kembali password Anda.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Format email tidak valid.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Terlalu banyak percobaan login yang gagal. Silakan coba lagi nanti atau reset password Anda.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Email atau password tidak valid.';
          break;
        default:
          errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced Google sign-in function
  const handleGoogleSignIn = async () => {
    if (loading || googleLoading || authLoading) return;
    
    setGoogleLoading(true);
    setError('');
    setResetEmailSent(false);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // For Google sign-in, admin access is not allowed
      // Admin must use email/password login with the specific admin credentials
      if (user.email === ADMIN_EMAIL) {
        await auth.signOut();
        throw new Error('Akun admin tidak dapat menggunakan Google Sign-in. Silakan gunakan email dan password admin.');
      }
      
      // Handle regular Google sign-in
      const userDocRef = doc(db, 'users', user.uid);
      let userDoc;
      
      try {
        userDoc = await getDoc(userDocRef);
      } catch (firestoreError) {
        console.error('Error fetching user document:', firestoreError);
        throw new Error('Terjadi kesalahan saat mengakses data pengguna. Silakan coba lagi.');
      }
      
      if (!userDoc.exists()) {
        // Create new user document for Google sign-up with pending status
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          username: user.displayName || user.email.split('@')[0],
          role: 'employee',
          status: 'pending', // Google users need admin approval too
          provider: 'google',
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          loginHistory: []
        });
        
        console.log('New Google user created with pending status');
        await auth.signOut();
        throw new Error('Akun Google Anda telah dibuat dan sedang menunggu persetujuan admin.');
      } else {
        const userData = userDoc.data();
        
        // Check status for existing Google users
        if (userData.status === 'pending') {
          await auth.signOut();
          throw new Error('Akun Google Anda sedang menunggu persetujuan admin.');
        } else if (userData.status === 'rejected') {
          await auth.signOut();
          throw new Error('Akun Google Anda telah ditolak oleh admin.');
        } else if (userData.status !== 'approved') {
          await auth.signOut();
          throw new Error('Status akun Google tidak valid.');
        }
      }
      
      await updateLoginHistory(user.uid);
      navigate('/home');
      
    } catch (err) {
      console.error('Google sign-in error:', err);
      
      let errorMessage = 'Gagal login dengan Google. Silakan coba lagi.';
      
      switch (err.code) {
        case 'auth/popup-closed-by-user':
          // User cancelled - don't show error
          setGoogleLoading(false);
          return;
        case 'auth/popup-blocked':
          errorMessage = 'Popup diblokir browser. Silakan aktifkan popup untuk login dengan Google.';
          break;
        case 'auth/cancelled-popup-request':
          // User cancelled - don't show error
          setGoogleLoading(false);
          return;
        case 'auth/network-request-failed':
          errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'Akun dengan email ini sudah terdaftar dengan metode login lain. Silakan gunakan email dan password.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Login dengan Google tidak diaktifkan. Silakan hubungi administrator.';
          break;
        default:
          errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Enhanced forgot password function
  const handleForgotPassword = async () => {
    if (loading || googleLoading) return;
    
    if (!email.trim()) {
      setError('Silakan masukkan email Anda terlebih dahulu.');
      return;
    }

    // Prevent password reset for admin account
    if (email === ADMIN_EMAIL) {
      setError('Reset password tidak tersedia untuk akun admin. Gunakan password default: admin123');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Format email tidak valid.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if user exists and is approved
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.trim()), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Email tidak ditemukan dalam sistem. Pastikan Anda sudah mendaftar.');
      }
      
      const userData = querySnapshot.docs[0].data();
      
      if (userData.status === 'pending') {
        throw new Error('Akun Anda masih pending approval. Reset password hanya tersedia untuk akun yang sudah disetujui.');
      } else if (userData.status === 'rejected') {
        throw new Error('Akun Anda telah ditolak. Silakan hubungi administrator.');
      } else if (userData.status !== 'approved') {
        throw new Error('Status akun tidak valid. Silakan hubungi administrator.');
      }

      // Configure password reset email
      const actionCodeSettings = {
        url: `${window.location.origin}/login?email=${encodeURIComponent(email)}`,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      setResetEmailSent(true);
      
      // Auto-hide success message after 15 seconds
      setTimeout(() => {
        setResetEmailSent(false);
      }, 15000);
      
    } catch (err) {
      console.error('Password reset error:', err);
      
      let errorMessage = 'Gagal mengirim email reset password. Silakan coba lagi.';
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'Email tidak ditemukan dalam sistem autentikasi.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Format email tidak valid.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Terlalu banyak permintaan reset password. Silakan coba lagi dalam beberapa menit.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
          break;
        default:
          errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    if (loading || googleLoading) return;
    setShowPassword(!showPassword);
  };

  const isAnyLoading = loading || googleLoading || authLoading;

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="modern-login-container">
        <div className="background-pattern">
          <div className="pattern-circle circle-1"></div>
          <div className="pattern-circle circle-2"></div>
          <div className="pattern-circle circle-3"></div>
        </div>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="spinner mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-login-container">
      {/* Background Pattern */}
      <div className="background-pattern">
        <div className="pattern-circle circle-1"></div>
        <div className="pattern-circle circle-2"></div>
        <div className="pattern-circle circle-3"></div>
      </div>

      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button 
            onClick={handleCancel}
            className="login-back-button"
            aria-label="Kembali"
            disabled={isAnyLoading}
          >
            <ArrowLeftIcon />
          </button>
          
          <div className="logo-section" onClick={handleLogoClick}>
            <img src={logoLRS} alt="Len Railway Systems" className="company-logo" />
          </div>
        </div>
        <div className="header-right">
          <div className="auth-links">
            <span className="auth-text">Belum punya akun?</span>
            <button 
              onClick={handleRegister} 
              className="header-register-btn"
              disabled={isAnyLoading}
            >
              Daftar
            </button>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="login-card">
        <div className="login-content">
          <div className="login-intro">
            <h1>Sign In</h1>
            <p>Welcome back to Len Railway System</p>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isAnyLoading}
            className="google-signin-btn"
            type="button"
          >
            {googleLoading ? (
              <>
                <div className="spinner"></div>
                Signing in...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="google-icon">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="divider">
            <span className="divider-text">or</span>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSignIn} className="modern-login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-container">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="Enter your email"
                  required
                  disabled={isAnyLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-container">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="Enter your password"
                  required
                  disabled={isAnyLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="password-toggle-btn"
                  disabled={isAnyLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="forgot-password-section">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="forgot-password-btn"
                disabled={isAnyLoading}
              >
                Lupa password?
              </button>
            </div>

            {/* Success Message for Password Reset */}
            {resetEmailSent && (
              <div className="success-message">
                <div className="flex items-center gap-2">
                  <span className="success-icon">✅</span>
                  <div className="flex-1">
                    <p className="font-medium">Email reset password berhasil dikirim!</p>
                    <p className="text-sm opacity-90">
                      Silakan cek inbox atau folder spam di <strong>{email}</strong>
                    </p>
                    <p className="text-xs opacity-75 mt-1">
                      Email mungkin memerlukan beberapa menit untuk sampai.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="error-message">
                <div className="flex items-start gap-2">
                  <span className="error-icon">⚠️</span>
                  <div className="flex-1">
                    <p>{error}</p>
                    {error.includes('Terlalu banyak percobaan') && (
                      <p className="text-sm opacity-90 mt-1">
                        Anda dapat mencoba lagi dalam beberapa menit atau menggunakan fitur "Lupa password".
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={isAnyLoading || !email.trim() || !password.trim()}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}