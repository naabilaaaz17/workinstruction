import React, { useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import './SettingPage.css';

const SettingsPage = ({ onBack }) => {
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    darkMode: false,
    language: 'id',
    autoSave: true,
    showTaskReminders: true
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem('userSettings', JSON.stringify(settings));
      
      // Apply dark mode immediately
      if (settings.darkMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }

      alert('Pengaturan berhasil disimpan!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Gagal menyimpan pengaturan. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Password baru dan konfirmasi password tidak cocok!');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password minimal 6 karakter!');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Tidak ada user yang login!');
        return;
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, passwordData.newPassword);
      
      alert('Password berhasil diubah!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordSection(false);
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        alert('Password lama salah!');
      } else if (error.code === 'auth/weak-password') {
        alert('Password terlalu lemah!');
      } else {
        alert('Gagal mengubah password. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearCache = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus cache aplikasi? Anda mungkin perlu login ulang.')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        alert('Cache berhasil dibersihkan! Halaman akan di-refresh.');
        window.location.reload();
      } catch (error) {
        console.error('Error clearing cache:', error);
        alert('Gagal membersihkan cache.');
      }
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="back-btn" onClick={onBack}>
          ← Kembali
        </button>
        <h1>Pengaturan</h1>
      </div>

      <div className="settings-content">
        <div className="settings-card">
          <div className="settings-section">
            <h3>Notifikasi</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label>Notifikasi Push</label>
                <span>Terima notifikasi untuk tugas baru dan update</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Notifikasi Email</label>
                <span>Terima notifikasi melalui email</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Pengingat Tugas</label>
                <span>Tampilkan pengingat untuk tugas yang akan deadline</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showTaskReminders}
                  onChange={(e) => handleSettingChange('showTaskReminders', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Tampilan</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label>Mode Gelap</label>
                <span>Aktifkan tema gelap untuk mengurangi kelelahan mata</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Bahasa</label>
                <span>Pilih bahasa untuk aplikasi</span>
              </div>
              <select
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                className="setting-select"
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>Aplikasi</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label>Auto Save</label>
                <span>Simpan otomatis perubahan data</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Keamanan</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label>Ubah Password</label>
                <span>Perbarui password akun Anda</span>
              </div>
              <button
                className="action-btn"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                {showPasswordSection ? 'Batal' : 'Ubah Password'}
              </button>
            </div>

            {showPasswordSection && (
              <div className="password-section">
                <form onSubmit={handlePasswordChange}>
                  <div className="form-group">
                    <label>Password Lama</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordInputChange}
                      required
                      placeholder="Masukkan password lama"
                    />
                  </div>
                  <div className="form-group">
                    <label>Password Baru</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordInputChange}
                      required
                      minLength="6"
                      placeholder="Masukkan password baru (min. 6 karakter)"
                    />
                  </div>
                  <div className="form-group">
                    <label>Konfirmasi Password Baru</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordInputChange}
                      required
                      placeholder="Konfirmasi password baru"
                    />
                  </div>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                  >
                    {loading ? 'Mengubah...' : 'Ubah Password'}
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="settings-section">
            <h3>Data & Storage</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label>Bersihkan Cache</label>
                <span>Hapus data cache aplikasi untuk meningkatkan performa</span>
              </div>
              <button className="action-btn danger" onClick={clearCache}>
                Bersihkan Cache
              </button>
            </div>
          </div>

          <div className="settings-actions">
            <button
              className="save-settings-btn"
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;