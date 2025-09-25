import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegisterPage.css';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { 
  collection, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc 
} from 'firebase/firestore';
import { db } from '../../firebase';
import app from '../../firebase';
import logoLRS from '../assets/images/logoLRS.png';

// Icon components untuk styling yang lebih modern
const EmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <circle cx="12" cy="16" r="1"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22,4 12,14.01 9,11.01"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12,5 5,12 12,19"/>
  </svg>
);

export default function RegisterPage() {
  // State untuk form data
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  
  // State untuk UI
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitDisabled, setSubmitDisabled] = useState(false); // Extra protection
  
  const navigate = useNavigate();
  const auth = getAuth(app);

  // Admin email restriction
  const ADMIN_EMAIL = 'admin@gmail.com';

  // Handle input changes dengan validation real-time
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (error) setError('');
  };

  // Check if email already exists in database
  const checkEmailExists = async (email) => {
    try {
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', email.toLowerCase().trim()));
      const existingUsers = await getDocs(emailQuery);
      return !existingUsers.empty;
    } catch (err) {
      console.error('Error checking email:', err);
      // If we can't check, assume it doesn't exist to allow the process to continue
      return false;
    }
  };

  // Check if username already exists in database
  const checkUsernameExists = async (username) => {
    try {
      const usersRef = collection(db, 'users');
      const usernameQuery = query(usersRef, where('username', '==', username.toLowerCase().trim()));
      const existingUsers = await getDocs(usernameQuery);
      return !existingUsers.empty;
    } catch (err) {
      console.error('Error checking username:', err);
      return false;
    }
  };

  // Validate form sebelum submit
  const validateForm = () => {
    const { email, username, password, confirmPassword } = formData;
    
    if (!email.trim()) {
      setError('Email harus diisi');
      return false;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      setError('Format email tidak valid');
      return false;
    }

    // Check if trying to register with admin email
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setError('Email ini tidak dapat digunakan untuk registrasi. Silakan gunakan email lain.');
      return false;
    }
    
    if (!username.trim()) {
      setError('Username harus diisi');
      return false;
    }
    
    if (username.length < 3) {
      setError('Username minimal 3 karakter');
      return false;
    }

    // Prevent admin username
    if (username.toLowerCase() === 'admin') {
      setError('Username "admin" tidak dapat digunakan. Silakan pilih username lain.');
      return false;
    }
    
    if (!password) {
      setError('Password harus diisi');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return false;
    }
    
    return true;
  };

  // Enhanced register dengan comprehensive duplicate prevention
  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isLoading || submitDisabled || isSuccess) return;
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setSubmitDisabled(true); // Extra protection
    setError('');
    
    try {
      const { email, username, password } = formData;
      const cleanEmail = email.toLowerCase().trim();
      const cleanUsername = username.trim();
      
      // 1. Check if email already exists in Firestore
      const emailExists = await checkEmailExists(cleanEmail);
      if (emailExists) {
        throw new Error('Email sudah terdaftar dalam sistem. Silakan gunakan email lain atau login.');
      }

      // 2. Check if username already exists
      const usernameExists = await checkUsernameExists(cleanUsername);
      if (usernameExists) {
        throw new Error('Username sudah digunakan. Silakan pilih username lain.');
      }
      
      // 3. Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;
      
      // 4. Update profile with username
      await updateProfile(user, {
        displayName: cleanUsername
      });

      // 5. Create user document using UID as document ID (prevents duplicates)
      const userDocRef = doc(db, 'users', user.uid);
      
      // Double-check if document already exists
      const existingDoc = await getDoc(userDocRef);
      if (existingDoc.exists()) {
        console.log('User document already exists, updating status...');
        await updateDoc(userDocRef, {
          username: cleanUsername,
          displayName: cleanUsername,
          status: 'pending',
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new document
        await setDoc(userDocRef, {
          uid: user.uid,
          email: cleanEmail,
          username: cleanUsername,
          displayName: cleanUsername,
          role: 'employee',
          status: 'pending',
          provider: 'email',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // 6. Sign out user after registration (they need admin approval)
      await auth.signOut();
      
      // 7. Show success message
      setIsSuccess(true);

      // 8. Redirect to login after 5 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            successMessage: 'Akun Anda sedang menunggu persetujuan admin. Anda akan menerima email ketika akun telah disetujui.',
            registeredEmail: cleanEmail
          } 
        });
      }, 5000);
      
    } catch (err) {
      console.error('Registration error:', err);
      
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('Email sudah terdaftar di sistem autentikasi. Silakan gunakan email lain atau login.');
          break;
        case 'auth/weak-password':
          setError('Password terlalu lemah. Gunakan minimal 6 karakter.');
          break;
        case 'auth/invalid-email':
          setError('Format email tidak valid.');
          break;
        case 'auth/network-request-failed':
          setError('Koneksi internet bermasalah. Coba lagi.');
          break;
        case 'auth/too-many-requests':
          setError('Terlalu banyak percobaan. Silakan tunggu beberapa saat sebelum mencoba lagi.');
          break;
        default:
          setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
      // Re-enable submit after a short delay to prevent rapid clicking
      setTimeout(() => {
        setSubmitDisabled(false);
      }, 2000);
    }
  };

  // Komponen pesan sukses
  const SuccessMessage = () => (
    <div className="success-container">
      <div className="success-animation">
        <div className="success-icon">
          <CheckIcon />
        </div>
      </div>
      
      <div className="success-content">
        <h2>Pendaftaran Berhasil!</h2>
        <p>Akun Anda sedang dalam proses persetujuan oleh admin. Anda akan menerima pemberitahuan via email setelah akun disetujui.</p>
        
        <div className="success-details">
          <div className="detail-item">
            <strong>Email:</strong> {formData.email}
          </div>
          <div className="detail-item">
            <strong>Username:</strong> {formData.username}
          </div>
        </div>

        <div className="redirect-info">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>Anda akan diarahkan ke halaman login...</p>
        </div>

        <button 
          onClick={() => navigate('/login')}
          className="goto-login-btn"
        >
          Ke Halaman Login
        </button>
      </div>
    </div>
  );

  // Handle navigation ke login
  const handleLoginRedirect = () => {
    navigate('/login');
  };

  // Handle cancel/back
  const handleCancel = () => {
    navigate(-1);
  };

  // Handle logo click - Navigate to LandingPage
  const handleLogoClick = () => {
    navigate('/');
  };

  const isFormDisabled = isLoading || submitDisabled || isSuccess;

  return (
    <div className="modern-register-container">
      {/* Background Pattern */}
      <div className="background-pattern">
        <div className="pattern-circle circle-1"></div>
        <div className="pattern-circle circle-2"></div>
        <div className="pattern-circle circle-3"></div>
      </div>

      {/* Header - Outside the card */}
      <div className="page-header">
        <div className="header-left">
          <button 
            onClick={handleCancel}
            className="register-back-button"
            aria-label="Kembali"
            disabled={isFormDisabled}
          >
            <ArrowLeftIcon />
          </button>
          
          <div 
            className="logo-section"
            onClick={handleLogoClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleLogoClick();
              }
            }}
            aria-label="Kembali ke halaman utama"
          >
            <img 
              src={logoLRS} 
              alt="Len Railway Systems" 
              className="company-logo" 
            />
          </div>
        </div>
      </div>

      <div className="register-card">
        {/* Main Content */}
        <div className="register-content">
          {!isSuccess ? (
            <>
              <div className="register-intro">
                <h1>Buat Akun Baru</h1>
                <p>Bergabunglah dengan platform manajemen proyek terdepan untuk efisiensi maksimal</p>
              </div>

              <form className="modern-register-form" onSubmit={handleRegister}>
                {/* Email Input */}
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <div className="input-container">
                    <div className="input-icon">
                      <EmailIcon />
                    </div>
                    <input
                      id="email"
                      type="email"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Masukkan email"
                      disabled={isFormDisabled}
                      required
                    />
                  </div>
                </div>

                {/* Username Input */}
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <div className="input-container">
                    <div className="input-icon">
                      <UserIcon />
                    </div>
                    <input
                      id="username"
                      type="text"
                      className="form-input"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder="Masukkan username"
                      disabled={isFormDisabled}
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-container">
                    <div className="input-icon">
                      <LockIcon />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="form-input"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Minimal 6 karakter"
                      disabled={isFormDisabled}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isFormDisabled}
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="form-group">
                  <label htmlFor="confirmPassword">Konfirmasi Password</label>
                  <div className="input-container">
                    <div className="input-icon">
                      <LockIcon />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      className="form-input"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Ulangi password"
                      disabled={isFormDisabled}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isFormDisabled}
                      aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="error-message" role="alert">
                    <div className="error-icon">⚠️</div>
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className={`submit-button ${isLoading ? 'loading' : ''} ${submitDisabled ? 'disabled' : ''}`}
                  disabled={isFormDisabled}
                  style={{ 
                    pointerEvents: isFormDisabled ? 'none' : 'auto',
                    opacity: isFormDisabled ? 0.7 : 1 
                  }}
                >
                  {isLoading ? (
                    <>
                      <div className="spinner"></div>
                      <span>Membuat akun...</span>
                    </>
                  ) : (
                    'Buat Akun'
                  )}
                </button>

                {/* Login Link */}
                <div className="form-footer">
                  <p>
                    Sudah punya akun? {' '}
                    <button 
                      type="button"
                      onClick={handleLoginRedirect} 
                      className="link-button"
                      disabled={isFormDisabled}
                    >
                      Masuk di sini
                    </button>
                  </p>
                </div>
              </form>
            </>
          ) : (
            <SuccessMessage />
          )}
        </div>
      </div>
    </div>
  );
}