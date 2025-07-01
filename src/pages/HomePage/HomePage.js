import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import ProfilePage from '../ProfilePage/ProfilePage';
import SettingsPage from '../SettingPage/SettingPage';
import './HomePage.css';

const HomePage = () => {
  const [activeTab, setActiveTab] = useState('Task');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'profile', 'settings'
  const [userData, setUserData] = useState({
    nama: '',
    idPetugas: '',
    email: '',
    avatar: ''
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // ✅ Optimized auth monitoring dengan timeout
  useEffect(() => {
    let timeoutId;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('Auth state changed:', currentUser);
      
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (currentUser) {
        console.log('User is logged in:', currentUser.email);
        setUser(currentUser);
        
        // ✅ Set basic data immediately from auth
        const basicUserData = {
          nama: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          idPetugas: 'Loading...',
          email: currentUser.email || '',
          avatar: currentUser.photoURL || ''
        };
        setUserData(basicUserData);
        
        // ✅ End loading immediately - don't wait for additional data
        setLoading(false);
        
        // ✅ Try to get better data in background (non-blocking)
        loadUserDataInBackground(currentUser.uid);
        
      } else {
        console.log('No user logged in');
        
        // ✅ Set timeout for redirect to prevent infinite loading
        timeoutId = setTimeout(() => {
          alert('Tidak ada user yang login. Mengarahkan ke halaman login...');
          window.location.href = '/login';
        }, 2000);
        
        setLoading(false);
      }
    });

    // ✅ Failsafe timeout - always stop loading after 3 seconds
    const failsafeTimeout = setTimeout(() => {
      console.warn('Auth check timeout - stopping loading');
      setLoading(false);
      
      if (!auth.currentUser) {
        alert('Timeout checking authentication. Silakan refresh halaman.');
      }
    }, 3000);

    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(failsafeTimeout);
    };
  }, []);

  // ✅ Background data loading (non-blocking)
  const loadUserDataInBackground = async (uid) => {
    try {
      console.log('Loading user data in background for:', uid);
      
      // ✅ Try localStorage first (instant)
      const savedUserData = localStorage.getItem(`user_${uid}`) || 
                           localStorage.getItem("userData");
      
      if (savedUserData) {
        const userData = JSON.parse(savedUserData);
        console.log('Found data in localStorage:', userData);
        
        setUserData(prev => ({
          ...prev,
          nama: userData.namaLengkap || userData.nama || prev.nama,
          idPetugas: userData.idPetugas || prev.idPetugas,
          email: userData.email || prev.email,
          avatar: userData.avatar || prev.avatar
        }));
        return; // Don't try Firestore if localStorage has data
      }
      
      // ✅ Try Firestore with timeout (only if localStorage empty)
      const firestorePromise = getDoc(doc(db, 'users', uid));
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore timeout')), 3000)
      );
      
      const userDoc = await Promise.race([firestorePromise, timeoutPromise]);
      
      if (userDoc.exists()) {
        console.log('Got data from Firestore:', userDoc.data());
        const data = userDoc.data();
        
        setUserData(prev => ({
          ...prev,
          nama: data.nama || data.fullName || prev.nama,
          idPetugas: data.idPetugas || data.employeeId || prev.idPetugas,
          email: data.email || prev.email,
          avatar: data.avatar || data.profilePicture || prev.avatar
        }));
      }
      
    } catch (error) {
      console.warn('Background data loading failed:', error);
      
      // ✅ Generate fallback ID if still loading
      if (userData.idPetugas === 'Loading...') {
        setUserData(prev => ({
          ...prev,
          idPetugas: 'PET-' + uid.substring(0, 6).toUpperCase()
        }));
      }
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) {
      try {
        await signOut(auth);
        setUserData({ nama: '', idPetugas: '', email: '', avatar: '' });
        setUser(null);
        alert('Logout berhasil!');
      } catch (error) {
        console.error('Error during logout:', error);
        alert('Terjadi kesalahan saat logout. Silakan coba lagi.');
      }
    }
  };

  const handleProfileClick = () => {
    setCurrentPage('profile');
    setShowDropdown(false);
  };

  const handleSettingsClick = () => {
    setCurrentPage('settings');
    setShowDropdown(false);
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
  };

  const tasks = [
    {
      id: 1,
      title: 'Sistem Persinyalan Kereta Api',
      description: 'Sistem Interlocking Berbasis Komputer (CBI) Perkeretaapian dengan tingkat keselamatan dan keandalan yang tinggi menggunakan platform keselamatan bersertifikat SIL-4.',
      tags: ['SilSafe 4000', 'SilSafe 5000', 'SilTrack LS3000']
    },
    {
      id: 2,
      title: 'Sistem Persinyalan Kereta Api',
      description: 'Sistem Interlocking Berbasis Komputer (CBI) Perkeretaapian dengan tingkat keselamatan dan keandalan yang tinggi menggunakan platform keselamatan bersertifikat SIL-4.',
      tags: ['SilSafe 4000', 'SilSafe 5000', 'SilTrack LS3000']
    },
    {
      id: 3,
      title: 'Sistem Persinyalan Kereta Api',
      description: 'Sistem Interlocking Berbasis Komputer (CBI) Perkeretaapian dengan tingkat keselamatan dan keandalan yang tinggi menggunakan platform keselamatan bersertifikat SIL-4.',
      tags: ['SilSafe 4000', 'SilSafe 5000', 'SilTrack LS3000']
    }
  ];

  const menuItems = ['Task', 'Progress', 'Statistics'];

  // ✅ Show loading with timeout info
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
        <small style={{color: '#666', marginTop: '10px'}}>
          Jika loading terlalu lama, silakan refresh halaman
        </small>
      </div>
    );
  }

  // Render different pages based on currentPage state
  if (currentPage === 'profile') {
    return <ProfilePage onBack={handleBackToHome} />;
  }

  if (currentPage === 'settings') {
    return <SettingsPage onBack={handleBackToHome} />;
  }

  return (
    <div className="homepage">
      <div className="sidebar">
        <div className="logo">
          <h2>Len Railway Systems</h2>
        </div>
        <nav className="menu">
          <div className="menu-label">Menu</div>
          {menuItems.map((item) => (
            <button
              key={item}
              className={`menu-item ${activeTab === item ? 'active' : ''}`}
              onClick={() => setActiveTab(item)}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      <div className="main-content">
        <div className="header">
          <div className="header-left">
            <h1>Task Harian Pekerjaan</h1>
          </div>
          <div className="header-right">
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${selectedFilter === 'All' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('All')}
              >
                All
              </button>
              <button 
                className={`filter-btn ${selectedFilter === 'Completed' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('Completed')}
              >
                Completed
              </button>
            </div>
            <div className="user-profile" onClick={() => setShowDropdown(!showDropdown)}>
              <div className="user-avatar">
                {userData.avatar ? (
                  <img src={userData.avatar} alt="Profile" />
                ) : (
                  <span className="avatar-initial">
                    {userData.nama ? userData.nama.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
              <div className="user-info">
                <span className="username">{userData.nama || 'User'}</span>
                <span className="user-id">{userData.idPetugas || 'Loading...'}</span>
              </div>
              <span className="dropdown-arrow">▼</span>
              {showDropdown && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <div className="dropdown-user-info">
                      <strong>{userData.nama}</strong>
                      <small>{userData.email}</small>
                      <small>ID: {userData.idPetugas}</small>
                    </div>
                  </div>
                  <hr className="dropdown-divider" />
                  <button className="dropdown-item" onClick={handleProfileClick}>
                    Profile
                  </button>
                  <button className="dropdown-item" onClick={handleSettingsClick}>
                    Settings
                  </button>
                  <hr className="dropdown-divider" />
                  <button className="dropdown-item logout" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="tasks-container">
          {tasks.map((task) => (
            <div key={task.id} className="task-card">
              <h3 className="task-title">{task.title}</h3>
              <p className="task-description">{task.description}</p>
              <div className="task-footer">
                <div className="task-tags">
                  {task.tags.map((tag, index) => (
                    <span key={index} className="task-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <button className="detail-btn">Mulai Pengerjaan</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;