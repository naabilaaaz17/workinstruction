import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import './ProfilePage.css';

const ProfilePage = ({ onBack }) => {
  const [userData, setUserData] = useState({
    nama: '',
    idPetugas: '',
    email: '',
    avatar: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Load from localStorage first
      const savedData = localStorage.getItem(`user_${user.uid}`);
      if (savedData) {
        const data = JSON.parse(savedData);
        setUserData(prev => ({ ...prev, ...data }));
      }

      // Then try to load from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({
          nama: data.nama || user.displayName || '',
          idPetugas: data.idPetugas || '',
          email: data.email || user.email || '',
          avatar: data.avatar || user.photoURL || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Update Firebase Auth profile
      if (userData.nama !== user.displayName) {
        await updateProfile(user, {
          displayName: userData.nama
        });
      }

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        nama: userData.nama,
        updatedAt: new Date()
      });

      // Update localStorage
      localStorage.setItem(`user_${user.uid}`, JSON.stringify(userData));

      setIsEditing(false);
      alert('Profile berhasil diperbarui!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Gagal menyimpan profile. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button className="back-btn" onClick={onBack}>
          ← Kembali
        </button>
        <h1>Profile Saya</h1>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {userData.avatar ? (
                <img src={userData.avatar} alt="Profile" />
              ) : (
                <span className="avatar-initial-large">
                  {userData.nama ? userData.nama.charAt(0).toUpperCase() : 'U'}
                </span>
              )}
            </div>
            <div className="profile-basic-info">
              <h2>{userData.nama || 'User'}</h2>
              <p className="profile-id">ID: {userData.idPetugas}</p>
              <p className="profile-email">{userData.email}</p>
            </div>
          </div>

          <div className="profile-form-section">
            <div className="form-actions">
              {!isEditing ? (
                <button 
                  className="edit-btn"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
              ) : (
                <div className="edit-actions">
                  <button 
                    className="save-btn"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button 
                    className="cancel-btn"
                    onClick={() => {
                      setIsEditing(false);
                      loadUserProfile(); // Reset data
                    }}
                    disabled={saving}
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>

            <div className="profile-form">
              <div className="form-group">
                <label>Nama Lengkap</label>
                <input
                  type="text"
                  name="nama"
                  value={userData.nama}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div className="form-group">
                <label>ID Petugas</label>
                <input
                  type="text"
                  value={userData.idPetugas}
                  disabled={true}
                  placeholder="ID Petugas (otomatis)"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={userData.email}
                  disabled={true}
                  placeholder="Email (tidak dapat diubah)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;