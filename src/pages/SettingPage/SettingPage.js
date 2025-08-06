import React, { useState, useEffect } from 'react';
import './SettingPage.css';

const SettingsPage = ({ onBack = () => {} }) => {
  const [settings, setSettings] = useState({
    darkMode: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Simulasi Firebase auth user
  const mockUser = {
    email: 'user@example.com',
    currentPassword: 'oldpass123' // Simulasi untuk demo
  };

  useEffect(() => {
    // Apply dark mode on component mount
    if (settings.darkMode) {
      document.body.classList.add('dark-mode');
    }
    return () => {
      document.body.classList.remove('dark-mode');
    };
  }, [settings.darkMode]);

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
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
      // Simulasi penyimpanan dengan delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Apply dark mode immediately
      if (settings.darkMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }

      showMessage('Pengaturan berhasil disimpan!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('Gagal menyimpan pengaturan. Silakan coba lagi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('Password baru dan konfirmasi password tidak cocok!', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage('Password minimal 6 karakter!', 'error');
      return;
    }

    if (passwordData.currentPassword !== mockUser.currentPassword) {
      showMessage('Password lama salah!', 'error');
      return;
    }

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showMessage('Semua field password harus diisi!', 'error');
      return;
    }

    setLoading(true);
    try {
      // Simulasi update password dengan delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      showMessage('Password berhasil diubah!', 'success');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordSection(false);
    } catch (error) {
      console.error('Error changing password:', error);
      showMessage('Gagal mengubah password. Silakan coba lagi.', 'error');
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

  return (
    <div className={`settings-container ${settings.darkMode ? 'dark-mode' : ''}`}>
      <div className="settings-page">
        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}

        <div className="settings-header">
          <button className="back-btn" onClick={onBack}>
            ← Kembali
          </button>
          <h1>Pengaturan</h1>
        </div>

        <div className="settings-content">
          <div className="settings-card">
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
                  <div>
                    <div className="form-group">
                      <label>Password Lama</label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordInputChange}
                        placeholder="Masukkan password lama (demo: oldpass123)"
                      />
                    </div>
                    <div className="form-group">
                      <label>Password Baru</label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordInputChange}
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
                        placeholder="Konfirmasi password baru"
                      />
                    </div>
                    <button
                      className="submit-btn"
                      disabled={loading}
                      onClick={handlePasswordChange}
                    >
                      {loading ? 'Mengubah...' : 'Ubah Password'}
                    </button>
                  </div>
                </div>
              )}
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
    </div>
  );
};

export default SettingsPage;