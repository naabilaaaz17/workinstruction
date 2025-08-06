import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../../firebase'; // Adjusted import - removed storage
import { User, LogOut, ArrowLeft } from 'lucide-react';
import './ProfilePage.css';
import logoLRS from '../assets/images/logoLRS.png';
import { signOut, onAuthStateChanged } from 'firebase/auth';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({
    displayName: '',
    email: '',
    uid: '',
    photoURL: ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData();
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserInfo({
            displayName: userData.displayName || 'Nama tidak tersedia',
            email: userData.email || user.email,
            uid: userData.uid || user.uid,
            photoURL: userData.photoURL || user.photoURL || ''
          });
          setNewDisplayName(userData.displayName || '');
        } else {
          // If document doesn't exist, use auth user data
          setUserInfo({
            displayName: user.displayName || 'Nama tidak tersedia',
            email: user.email,
            uid: user.uid,
            photoURL: user.photoURL || ''
          });
          setNewDisplayName(user.displayName || '');
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async () => {
    setUpdating(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated. Silakan login ulang.');
      }

      const updateData = {
        displayName: newDisplayName
      };

      console.log('🔄 Updating Firebase Auth profile...');
      // Update Firebase Auth profile (only displayName)
      await updateProfile(user, updateData);
      console.log('✅ Auth profile updated');

      console.log('🔄 Updating Firestore document...');
      // Update Firestore document (only displayName)
      const userDocRef = doc(db, 'users', user.uid);
      const firestoreData = {
        displayName: newDisplayName,
        updatedAt: new Date()
      };

      await updateDoc(userDocRef, firestoreData);
      console.log('✅ Firestore document updated');

      // Update local state
      setUserInfo(prev => ({
        ...prev,
        displayName: newDisplayName
      }));

      // Reset edit mode
      setEditMode(false);
      
      console.log('✅ Profile update completed successfully');
      alert('Nama berhasil diperbarui!');
      
    } catch (error) {
      console.error('❌ Profile update error:', error);
      
      // Handle specific errors
      let errorMessage = 'Gagal memperbarui nama. ';
      
      if (error.code === 'auth/network-request-failed') {
        errorMessage += 'Masalah jaringan. Periksa koneksi internet.';
      } else if (error.message.includes('User not authenticated')) {
        errorMessage += 'Sesi login expired. Silakan login ulang.';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) {
      try {
        await signOut(auth);
        
        // Clear localStorage data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userToken');
        localStorage.removeItem('previousStats');
        
        alert('Logout berhasil!');
        navigate('/login');
      } catch (error) {
        console.error('Error during logout:', error);
        alert('Terjadi kesalahan saat logout: ' + error.message);
      }
    }
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  const generateUserId = (uid) => {
    if (!uid) return 'ID tidak tersedia';
    return uid.substring(0, 8).toUpperCase();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Memuat data profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      {/* Header Bar */}
      <div className="profile-header-bar">
        <div className="profile-header-content">
          <div className="profile-header-left">
            <button 
              className="profile-back-btn"
              onClick={handleBackToHome}
              title="Kembali ke Home"
            >
              <ArrowLeft size={20} />
            </button>
            <img 
              src={logoLRS} 
              alt="Len Railway Systems" 
              className="profile-logo"
              onClick={handleBackToHome}
            />
          </div>
          
          <div className="profile-header-center">
            <h1 className="profile-title-header">Profile</h1>
          </div>
          
          <div className="profile-header-right">
            <div className="profile-header-profile-container">
              <button
                className="profile-header-profile-btn"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="profile-header-profile-avatar">
                  {userInfo.photoURL ? (
                    <img src={userInfo.photoURL} alt="Avatar" className="profile-header-avatar-image" />
                  ) : (
                    <span className="profile-header-avatar-text">
                      {userInfo.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="profile-header-profile-info">
                  <div className="profile-header-profile-name">{userInfo.displayName}</div>
                  <div className="profile-header-profile-id">ID: {generateUserId(userInfo.uid)}</div>
                </div>
              </button>

              {showDropdown && (
                <div className="profile-header-dropdown-menu">
                  <div className="profile-header-dropdown-header">
                    <div className="profile-header-profile-avatar">
                      {userInfo.photoURL ? (
                        <img src={userInfo.photoURL} alt="Avatar" className="profile-header-avatar-image" />
                      ) : (
                        <span className="profile-header-avatar-text">
                          {userInfo.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="profile-header-dropdown-info">
                      <div className="profile-header-dropdown-name">{userInfo.displayName}</div>
                      <div className="profile-header-dropdown-email">{userInfo.email}</div>
                      <div className="profile-header-dropdown-id">ID: {generateUserId(userInfo.uid)}</div>
                    </div>
                  </div>
                  <button className="profile-header-dropdown-item" onClick={() => setShowDropdown(false)}>
                    <User className="profile-header-dropdown-icon" />
                    <span>Profile</span>
                  </button>
                  <hr className="profile-header-dropdown-divider" />
                  <button className="profile-header-dropdown-item logout" onClick={handleLogout}>
                    <LogOut className="profile-header-dropdown-icon" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="profile-main-content">
        <div className="profile-container">
          <div className="profile-card">
            <div className="profile-header">
              <h2>Informasi Akun</h2>
            </div>

            <div className="profile-content">
              {/* Profile Image Section - Display Only */}
              <div className="profile-image-section">
                <div className="profile-image-container">
                  <img
                    src={userInfo.photoURL || '/default-avatar.png'}
                    alt="Profile"
                    className="profile-image"
                    onError={(e) => {
                      e.target.src = '/default-avatar.png';
                    }}
                  />
                </div>
              </div>

              {/* Profile Information */}
              <div className="profile-info">
                <div className="info-item">
                  <label>Nama:</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="edit-input"
                      placeholder="Masukkan nama"
                    />
                  ) : (
                    <span className="info-value">{userInfo.displayName}</span>
                  )}
                </div>

                <div className="info-item">
                  <label>Email:</label>
                  <span className="info-value">{userInfo.email}</span>
                </div>

                <div className="info-item">
                  <label>ID:</label>
                  <span className="info-value user-id">{generateUserId(userInfo.uid)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="profile-actions">
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="edit-button"
                  >
                    Edit Nama
                  </button>
                ) : (
                  <div className="edit-actions">
                    <button
                      onClick={updateUserProfile}
                      disabled={updating}
                      className="save-button"
                    >
                      {updating ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setNewDisplayName(userInfo.displayName);
                      }}
                      disabled={updating}
                      className="cancel-button"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;