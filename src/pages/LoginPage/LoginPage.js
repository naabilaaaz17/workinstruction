import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import app from '../../firebase';
import logoLRS from '../assets/images/logoLRS.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const auth = getAuth(app);

  const handleRegister = () => navigate('/register');

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError('');
      navigate('/home');
    } catch (err) {
      console.error(err);
      setError('Email atau password salah, atau akun belum terdaftar.');
    }
  };

  return (
    <div className="login-container">
      {/* Left Side - Form */}
      <div className="login-left-side">
        <div className="login-header">
          <img src={logoLRS} alt="Len Railway Systems" className="login-header-logo" />
        </div>

        <div className="login-form-wrapper">
          <h2 className="login-title">Sign In</h2>
          <p className="login-welcome-text">Welcome to Len Railway System</p>

          <div className="login-form-container">
            <div>
              <label className="login-input-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input-field"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="login-input-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input-field"
                placeholder="Enter your password"
              />
            </div>

            {error && <p className="login-error-message">{error}</p>}

            <button onClick={handleSignIn} className="login-button">
              Sign In
            </button>

            <p className="login-register-link">
              Belum punya akun?{' '}
              <button onClick={handleRegister} className="login-register-button">
                Daftar
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Hero */}
      <div className="login-right-side">
        <div className="login-hero-content">
          <h2 className="login-hero-title">
            Optimalkan<br />
            Manajemen Proyek<br />
            Anda dengan<br />
            <span className="login-hero-highlight">Work Instruction</span>
          </h2>

          <p className="login-hero-desc">
            Pantau kemajuan tim dan pekerja secara real-time untuk<br />
            memaksimalkan efisiensi kerja. Pastikan setiap langkah<br />
            tercatat dengan baik untuk hasil yang maksimal.
          </p>

          <div className="login-hero-features">
            <div className="login-feature-item">
              <div className="login-feature-icon-wrapper">
                <span className="login-feature-icon">📊</span>
              </div>
              <div className="login-feature-content">
                <span className="login-feature-title">Real-time Monitoring</span>
                <span className="login-feature-desc">Pantau progress secara langsung</span>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon-wrapper">
                <span className="login-feature-icon">✅</span>
              </div>
              <div className="login-feature-content">
                <span className="login-feature-title">Task Management</span>
                <span className="login-feature-desc">Kelola tugas dengan mudah</span>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon-wrapper">
                <span className="login-feature-icon">📈</span>
              </div>
              <div className="login-feature-content">
                <span className="login-feature-title">Progress Tracking</span>
                <span className="login-feature-desc">Lacak kemajuan proyek</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="login-decorative-element">
          <div className="login-decorative-gradient"></div>
        </div>
        <div className="login-decorative-circle1"></div>
        <div className="login-decorative-circle2"></div>
        <div className="login-decorative-circle3"></div>
        <div className="login-floating-shapes">
          <div className="login-floating-shape login-shape-1"></div>
          <div className="login-floating-shape login-shape-2"></div>
          <div className="login-floating-shape login-shape-3"></div>
        </div>
      </div>
    </div>
  );
}