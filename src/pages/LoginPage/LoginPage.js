import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail 
} from 'firebase/auth';
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
  const navigate = useNavigate();
  const auth = getAuth(app);
  
  // Configure Google Provider
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });

  const handleRegister = () => navigate('/register');
  const handleLogoClick = () => navigate('/');

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (loading || googleLoading) return; // Prevent multiple submissions
    
    setLoading(true);
    setError('');
    setResetEmailSent(false);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/home');
    } catch (err) {
      console.error('Email/Password sign-in error:', err);
      setError('Email atau password salah, atau akun belum terdaftar.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading || googleLoading) return; // Prevent multiple clicks
    
    setGoogleLoading(true);
    setError('');
    setResetEmailSent(false);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('Google sign-in successful:', user);
      navigate('/home');
    } catch (err) {
      console.error('Google sign-in error:', err);
      
      // Handle specific error codes
      if (err.code === 'auth/popup-closed-by-user') {
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup diblokir browser. Silakan aktifkan popup untuk login dengan Google.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // User cancelled - don't show error
        console.log('Google sign-in cancelled by user');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
      } else {
        setError('Gagal login dengan Google. Silakan coba lagi.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (loading || googleLoading) return; // Prevent action during loading
    
    if (!email) {
      setError('Silakan masukkan email Anda terlebih dahulu.');
      return;
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Format email tidak valid.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const actionCodeSettings = {
        url: window.location.origin + '/login',
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      setResetEmailSent(true);
      
      // Auto-hide success message after 10 seconds
      setTimeout(() => {
        setResetEmailSent(false);
      }, 10000);
      
    } catch (err) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('Email tidak ditemukan. Pastikan email sudah terdaftar.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Format email tidak valid.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan. Silakan coba lagi nanti.');
      } else {
        setError('Gagal mengirim email reset password. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    if (loading || googleLoading) return; // Prevent action during loading
    setShowPassword(!showPassword);
  };

  const isAnyLoading = loading || googleLoading;

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
          <div className="logo-section" onClick={handleLogoClick}>
            <img src={logoLRS} alt="Len Railway Systems" className="company-logo" />
            <div className="company-info">
              <h3>Len Railway Systems</h3>
              <p>Work Instruction System</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="auth-links">
            <span className="auth-text">Belum punya akun?</span>
            <button onClick={handleRegister} className="header-register-btn">
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
                <span className="success-icon">✅</span>
                Email reset password telah dikirim ke {email}. Silakan cek inbox atau folder spam Anda.
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={isAnyLoading || !email || !password}
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