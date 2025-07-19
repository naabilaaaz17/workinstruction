import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Search, Bell, Calendar, ArrowRight, Play, BarChart3, TrendingUp, CheckCircle, FileText, Activity, MoreHorizontal } from 'lucide-react';
import './HomePage.css';
import logoLRS from '../assets/images/logoLRS.png';
// Import Firebase functions dengan error handling
import { handleFirebaseError } from '../../firebase';

const HomePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Task');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showDropdown, setShowDropdown] = useState(false);
  const [userData, setUserData] = useState({
    nama: 'User',
    email: 'No email',
    avatar: ''
  });
  const [loading, setLoading] = useState(false);
  const [firebaseError, setFirebaseError] = useState(false);

  // Load user data dengan Firebase fallback handling
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Prioritaskan localStorage untuk menghindari Firebase errors
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
          const user = JSON.parse(currentUser);
          setUserData({
            nama: user.nama || user.fullName || user.username || 'User',
            email: user.email || 'No email',
            avatar: user.avatar || ''
          });
        }
        
        // Jika perlu sync dengan Firebase, lakukan dengan error handling
        // Uncomment jika menggunakan Firebase untuk user data
        /*
        try {
          // Firebase operations di sini
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const firebaseData = userDoc.data();
            setUserData(prev => ({
              ...prev,
              ...firebaseData
            }));
            // Sync ke localStorage sebagai backup
            localStorage.setItem('currentUser', JSON.stringify(firebaseData));
          }
        } catch (firebaseError) {
          console.warn('Firebase sync failed, using localStorage data:', firebaseError);
          setFirebaseError(true);
          // Tetap gunakan data dari localStorage
        }
        */
        
      } catch (error) {
        console.error('Error loading user data:', error);
        setUserData({
          nama: 'User',
          email: 'No email',
          avatar: ''
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) {
      try {
        // Clear localStorage data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userToken');
        
        // Jika menggunakan Firebase Auth, tambahkan error handling
        /*
        try {
          await signOut(auth);
        } catch (firebaseError) {
          console.warn('Firebase signout error (will continue logout):', firebaseError);
          handleFirebaseError(firebaseError);
        }
        */
        
        alert('Logout berhasil!');
        window.location.href = '/';
      } catch (error) {
        console.error('Error during logout:', error);
        alert('Terjadi kesalahan saat logout');
      }
    }
  };

  const handleProfileClick = () => {
    console.log('Navigate to profile page');
    setShowDropdown(false);
  };

  const handleSettingsClick = () => {
    console.log('Navigate to settings page');
    setShowDropdown(false);
  };

  const handleStartTask = (taskId) => {
    try {
      localStorage.setItem('currentTaskId', taskId);
      navigate('/task');
    } catch (error) {
      console.error('Error navigating to task page:', error);
      alert('Terjadi kesalahan saat membuka halaman task');
    }
  };

  const handleMenuClick = (menuName) => {
    setActiveTab(menuName);
    
    switch (menuName) {
      case 'Task':
        break;
      case 'Log Progress':
        try {
          navigate('/progress');
        } catch (error) {
          console.error('Error navigating to progress page:', error);
          alert('Terjadi kesalahan saat membuka halaman log progress');
        }
        break;
      case 'Report':
        try {
          navigate('/report');
        } catch (error) {
          console.error('Error navigating to report page:', error);
          alert('Terjadi kesalahan saat membuka halaman report');
        }
        break;
      default:
        break;
    }
  };

  const handleLainnyaClick = () => {
    console.log('Navigate to lainnya page');
    // Add navigation logic here
  };

  const handleSidebarSettingsClick = () => {
    console.log('Navigate to settings page from sidebar');
    // Add navigation logic here
  };

  const tasks = [
    {
      id: 1,
      title: 'Wiring & Terminasi Main 3 Aspect V3',
      description: 'Instalasi dan terminasi kabel utama untuk sistem persinyalan 3 aspek versi 3 dengan standar keselamatan tinggi dan akurasi yang presisi.',
      tags: ['Wiring', 'Terminasi', '3 Aspect V3'],
      priority: 'High',
      progress: 45,
      status: 'In Progress'
    }
  ];

  const menuItems = [
    { name: 'Task', icon: CheckCircle },
    { name: 'Log Progress', icon: Activity },
    { name: 'Report', icon: FileText }
  ];

  const stats = [
    { label: 'Total Tasks', value: '1', change: '+0%', color: 'bg-blue-500' },
    { label: 'Completed', value: '0', change: '0%', color: 'bg-green-500' },
    { label: 'In Progress', value: '1', change: '+1%', color: 'bg-yellow-500' },
    { label: 'Overdue', value: '0', change: '0%', color: 'bg-red-500' }
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Firebase Error Notification (Optional) */}
      {firebaseError && (
        <div className="firebase-error-notification" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#ff6b6b',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '5px',
          zIndex: 1000,
          fontSize: '14px'
        }}>
          ⚠️ Mode Offline - Data disimpan lokal
        </div>
      )}

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src={logoLRS} alt="Len Railway Systems" className="logo-image" />
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-title">Menu</div>
          <div className="nav-items">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  className={`nav-item ${activeTab === item.name ? 'nav-item-active' : ''}`}
                  onClick={() => handleMenuClick(item.name)}
                >
                  <Icon className={`nav-icon ${activeTab === item.name ? 'nav-icon-active' : ''}`} />
                  <span className="nav-label">{item.name}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-stats">
          <div className="stats-container">
            <div className="nav-title">LAINNYA</div>
            <div className="nav-items">
              <button className="nav-item" onClick={handleSidebarSettingsClick}>
                <Settings className="nav-icon" />
                <span className="nav-label">Pengaturan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <div className="header-content">
            <div className="header-left">
              <div>
                <h1 className="page-title">Task Harian Pekerjaan</h1>
                <p className="page-subtitle">Kelola dan pantau tugas harian Anda</p>
              </div>
            </div>
            
            <div className="header-right">
              <div className="search-container">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Cari task..."
                  className="search-input"
                />
              </div>

              <div className="filter-container">
                <button 
                  className={`filter-btn ${selectedFilter === 'All' ? 'filter-btn-active' : ''}`}
                  onClick={() => setSelectedFilter('All')}
                >
                  All
                </button>
                <button 
                  className={`filter-btn ${selectedFilter === 'Completed' ? 'filter-btn-active' : ''}`}
                  onClick={() => setSelectedFilter('Completed')}
                >
                  Completed
                </button>
              </div>

              <button className="notification-btn">
                <Bell className="notification-icon" />
                <span className="notification-badge"></span>
              </button>

              <div className="profile-container">
                <button
                  className="profile-btn"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <div className="profile-avatar">
                    <span className="avatar-text">
                      {userData.nama.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="profile-info">
                    <div className="profile-name">{userData.nama}</div>
                  </div>
                </button>

                {showDropdown && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <div className="dropdown-name">{userData.nama}</div>
                      <div className="dropdown-email">{userData.email}</div>
                    </div>
                    <button className="dropdown-item" onClick={handleProfileClick}>
                      <User className="dropdown-icon" />
                      <span>Profile</span>
                    </button>
                    <button className="dropdown-item" onClick={handleSettingsClick}>
                      <Settings className="dropdown-icon" />
                      <span>Settings</span>
                    </button>
                    <hr className="dropdown-divider" />
                    <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
                      <LogOut className="dropdown-icon" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="content-area">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-card-content">
                  <div>
                    <p className="stat-card-label">{stat.label}</p>
                    <p className="stat-card-value">{stat.value}</p>
                    <p className={`stat-card-change ${stat.change.startsWith('+') ? 'positive' : 'negative'}`}>
                      {stat.change} from last week
                    </p>
                  </div>
                  <div className={`stat-card-indicator ${stat.color}`}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="tasks-container">
            {tasks.map((task) => (
              <div key={task.id} className="task-card">
                <div className="task-card-content">
                  <div className="task-header">
                    <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </div>
                  
                  <h3 className="task-title">{task.title}</h3>
                  <p className="task-description">{task.description}</p>
                  
                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-label">Progress</span>
                      <span className="progress-value">{task.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="tags-container">
                    {task.tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
                
                <div className="task-footer">
                  <button 
                    className="start-btn"
                    onClick={() => handleStartTask(task.id)}
                  >
                    <Play className="start-icon" />
                    <span>Mulai Pengerjaan</span>
                    <ArrowRight className="arrow-icon" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;