import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Settings, LogOut, Calendar, ArrowRight, Play, 
  BarChart3, CheckCircle, Activity, ChevronRight, Clock, 
  Zap, Target, Award, Briefcase 
} from 'lucide-react';
import './HomePage.css';
import logoLRS from '../assets/images/logoLRS.png';

// Firebase imports
import { auth, db } from '../../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  setDoc,
  limit
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

const HomePage = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [userData, setUserData] = useState({
    nama: 'User',
    email: 'No email',
    avatar: '',
    uid: null
  });
  const [tasks, setTasks] = useState([]);
  const [workSessions, setWorkSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Static task yang selalu ditampilkan
  const staticTask = {
    id: '1',
    title: 'Work Instruction',
    isStatic: true,
  };

  // Load user data from Firebase Auth and Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          setLoading(true);
          
          // Get user data from Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const firestoreData = userDoc.data();
            setUserData({
              nama: firestoreData.nama || firestoreData.fullName || user.displayName || 'User',
              email: user.email || 'No email',
              avatar: firestoreData.avatar || user.photoURL || '',
              uid: user.uid
            });
          } else {
            // Use Firebase Auth data if Firestore document doesn't exist
            setUserData({
              nama: user.displayName || 'User',
              email: user.email || 'No email',
              avatar: user.photoURL || '',
              uid: user.uid
            });
          }
          
          // Load user's data
          await loadUserTasks(user.uid);
          await loadWorkSessions(user.uid);
          await saveUserToFirestore(user);
          
        } catch (error) {
          console.error('Error loading user data:', error);
          setError('Gagal memuat data pengguna');
        } finally {
          setLoading(false);
        }
      } else {
        // User not logged in, redirect to login
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Function untuk menyimpan user data ke Firestore
  const saveUserToFirestore = async (user) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDataToSave = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        photoURL: user.photoURL || null,
        lastLogin: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(userRef, userDataToSave, { merge: true });
      console.log('User data saved to Firestore');
    } catch (error) {
      console.error('Error saving user to Firestore:', error);
    }
  };

  // Load tasks from Firestore and combine with static task
  const loadUserTasks = async (userId) => {
    try {
      const rekapRef = collection(db, 'rekapPengerjaan');

      const q = query(
        rekapRef,
        where('_name_', '==', userId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const rekapData = [];
        snapshot.forEach((doc) => {
          rekapData.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // Gabungkan static task dengan Firebase tasks
        const allTasks = [staticTask, ...rekapData];
        setTasks(allTasks);
      }, (error) => {
        console.error('Error loading rekap:', error);
        setError('Gagal memuat data rekap');
        setTasks([staticTask]);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up rekap listener:', error);
      setError('Gagal memuat data rekap');
      setTasks([staticTask]);
    }
  };

  // FIXED: Load work sessions with real-time updates using the same approach as ProgressPage
  const loadWorkSessions = async (userId) => {
    try {
      console.log('📊 [HomePage] Loading work sessions for user:', userId);

      const sessionsRef = collection(db, 'workSessions');
      
      // Setup real-time listener like in ProgressPage
      const q = query(
        sessionsRef,
        where('userId', '==', userId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const sessionsData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          sessionsData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            completedAt: data.completedAt?.toDate(),
            startTime: data.startTime?.toDate(),
            lastUpdated: data.lastUpdated?.toDate(),
            // FIXED: Use the same admin status fields as ProgressPage
            adminStatus: data.status || data.adminStatus || (data.completedAt ? 'pending' : 'active'),
            adminComment: data.adminComment || '',
            adminId: data.adminId || null,
            adminName: data.adminName || null,
            reviewedAt: data.reviewedAt?.toDate() || data.statusUpdatedAt?.toDate() || null,
            statusUpdatedBy: data.statusUpdatedBy || null
          });
        });

        // Sort by creation date
        sessionsData.sort((a, b) => {
          const dateA = a.createdAt || new Date(0);
          const dateB = b.createdAt || new Date(0);
          return dateB - dateA; // Descending order
        });

        // Limit to 10 for homepage
        const limitedSessions = sessionsData.slice(0, 10);
        
        console.log(`✅ [HomePage] Work sessions loaded: ${limitedSessions.length} sessions`);
        
        // Log status information for debugging
        limitedSessions.forEach(session => {
          if (session.completedAt) {
            console.log(`📋 [HomePage] Session ${session.id}: status="${session.adminStatus}", completedAt=${session.completedAt}`);
          }
        });

        setWorkSessions(limitedSessions);
      }, (error) => {
        console.error('❌ [HomePage] Error in work sessions listener:', error);
        setWorkSessions([]);
      });

      return unsubscribe;

    } catch (error) {
      console.error('❌ [HomePage] Error loading work sessions:', error);
      setWorkSessions([]);
    }
  };

  // Handle task start/continue functionality
  const handleStartTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    if (task.isStatic) {
      console.log('Starting static task:', task.title);
      navigate('/task');
      return;
    }

    console.log('Starting task:', task.title);
    navigate(`/task/${taskId}`);
  };

  // Navigation handlers for Quick Actions
  const handleNavigateToProgress = () => {
    console.log('Navigating to Progress page');
    navigate('/progress');
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

  const handleProfileClick = () => {
    console.log('Navigate to profile page');
    navigate('/profil');
    setShowDropdown(false);
  };

  // Format date helper
  const formatDate = (dateInput) => {
    if (!dateInput) return 'Invalid Date';
    
    let date;
    
    if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
      date = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      date = new Date();
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('id-ID');
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  };

  // FIXED: Get approval status color and text - Updated to match ProgressPage
  const getApprovalStatus = (adminStatus) => {
    switch (adminStatus?.toLowerCase()) {
      case 'approved':
        return { text: 'Disetujui', class: 'status-approved' };
      case 'rejected':
        return { text: 'Ditolak', class: 'status-rejected' };
      case 'pending':
        return { text: 'Menunggu Review', class: 'status-pending' };
      case 'submitted':
        return { text: 'Terkirim', class: 'status-submitted' };
      default:
        return { text: 'Belum Direview', class: 'status-pending' };
    }
  };

  // Calculate work sessions statistics matching ProgressPage logic
  const getWorkSessionsStats = () => {
    const activeCount = workSessions.filter(session => session.isActive).length;
    const completedCount = workSessions.filter(session => session.completedAt).length;
    const pausedCount = workSessions.filter(session => !session.isActive && !session.completedAt).length;
    
    return {
      total: workSessions.length,
      completed: completedCount,
      active: activeCount,
      paused: pausedCount
    };
  };

  // FIXED: Get recent work sessions for summary - Updated to use adminStatus
  const getRecentWorkSessions = () => {
    return workSessions
      .slice(0, 5) // Show more sessions since we removed reports
      .map(session => {
        // Calculate session status
        let status = 'Terhenti';
        if (session.isActive) {
          status = 'Aktif';
        } else if (session.completedAt) {
          status = 'Selesai';
        }

        // Calculate completion rate
        const stepStatuses = session.stepStatuses || [];
        const totalSteps = stepStatuses.length;
        const completedSteps = stepStatuses.filter(s => s === 'completed').length;
        const completionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

        // FIXED: Get approval status using adminStatus field
        const approvalStatus = getApprovalStatus(session.adminStatus);

        return {
          id: session.id,
          title: session.workInstructionTitle || 'Untitled Task',
          status: status,
          date: session.createdAt,
          completionRate: completionRate,
          totalTime: session.totalTime || 0,
          approvalStatus: approvalStatus,
          // Add admin info for debugging
          adminStatus: session.adminStatus,
          adminComment: session.adminComment,
          adminName: session.adminName
        };
      });
  };

  // Helper function to format time (seconds to readable format)
  const formatTime = (totalSeconds) => {
    if (!totalSeconds || totalSeconds === 0) return '0 detik';
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours} jam`);
    if (minutes > 0) parts.push(`${minutes} menit`);
    if (seconds > 0 && hours === 0) parts.push(`${seconds} detik`);
    
    return parts.join(' ') || '0 detik';
  };

  if (loading) {
    return (
      <div className="modern-loading-container">
        <div className="modern-loading-content">
          <div className="modern-loading-spinner"></div>
          <p className="modern-loading-text">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modern-error-container">
        <div className="modern-error-content">
          <div className="modern-error-icon">⚠️</div>
          <h3>Oops! Terjadi Kesalahan</h3>
          <p className="modern-error-text">{error}</p>
          <button onClick={() => window.location.reload()} className="modern-retry-btn">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const workSessionsStats = getWorkSessionsStats();
  const recentWorkSessions = getRecentWorkSessions();

  return (
    <div className="modern-home-container">
      {/* Modern Header */}
      <header className="modern-header">
        <div className="modern-header-content">
          <div className="modern-logo-section">
            <img 
              src={logoLRS} 
              alt="Len Railway Systems" 
              className="modern-logo"
              onClick={() => navigate('/')}
            />
            <div className="modern-brand-text">Task Management</div>
          </div>
          
          <div className="modern-profile-section">
            <button
              className="modern-profile-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="modern-avatar">
                {userData.avatar ? (
                  <img src={userData.avatar} alt="Avatar" />
                ) : (
                  userData.nama.charAt(0).toUpperCase()
                )}
              </div>
              <div className="modern-profile-info">
                <div className="modern-profile-name">{userData.nama}</div>
                <div className="modern-profile-id">ID: {userData.uid?.substring(0, 8) || 'N/A'}</div>
              </div>
            </button>

            {showDropdown && (
              <div className="modern-dropdown">
                <div className="modern-dropdown-header">
                  <div className="modern-avatar">
                    {userData.avatar ? (
                      <img src={userData.avatar} alt="Avatar" />
                    ) : (
                      userData.nama.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="modern-dropdown-info">
                    <h4>{userData.nama}</h4>
                    <p>{userData.email}</p>
                    <p>ID: {userData.uid?.substring(0, 8) || 'N/A'}</p>
                  </div>
                </div>
                
                <button className="modern-dropdown-item" onClick={handleProfileClick}>
                  <User size={18} />
                  <span>Profile Settings</span>
                </button>
                
                <button className="modern-dropdown-item logout" onClick={handleLogout}>
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="modern-main-content">
        {/* Welcome Section */}
        <section className="modern-welcome-section">
          <h1 className="modern-welcome-title">
            Selamat Datang, {userData.nama}!
          </h1>
          <p className="modern-welcome-subtitle">
            Kelola tugas dan monitor progress pekerjaan Anda dengan mudah dan efisien
          </p>
          <div className="modern-time-info">
            <Clock size={18} />
            <span>{new Date().toLocaleDateString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
        </section>

        {/* Tasks Section - Moved here, right after welcome section */}
        <section className="modern-tasks-section">
          <h2 className="modern-section-title">
            <div className="modern-section-icon">
              <Target size={20} />
            </div>
            Your Tasks
          </h2>
          
          {tasks.length === 0 ? (
            <div className="modern-no-data">
              <div className="modern-no-data-icon">📝</div>
              <h3>Tidak ada tugas saat ini</h3>
              <p>Semua tugas Anda telah selesai atau belum ada tugas yang diberikan.</p>
            </div>
          ) : (
            <div className="modern-tasks-grid">
              {tasks.map((task) => (
                <div key={task.id} className="modern-task-card">
                  <div className="modern-task-header">
                    {task.priority && (
                      <span className={`modern-priority-badge ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="modern-task-title">{task.title || 'Untitled Task'}</h3>
                  
                  {task.description && (
                    <p className="modern-task-description">{task.description}</p>
                  )}
                  
                  {task.progress !== undefined && (
                    <div className="modern-progress-section">
                      <div className="modern-progress-header">
                        <span className="modern-progress-label">Progress</span>
                        <span className="modern-progress-value">{task.progress || 0}%</span>
                      </div>
                      <div className="modern-progress-bar">
                        <div 
                          className="modern-progress-fill"
                          style={{ width: `${task.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {(task.tags || task.status) && (
                    <div className="modern-task-tags">
                      {task.tags && task.tags.map((tag, index) => (
                        <span key={index} className="modern-tag">{tag}</span>
                      ))}
                      {task.status && (
                        <span className="modern-tag">
                          {task.status}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="modern-task-footer">
                    {task.dueDate && (
                      <div className="modern-task-date">
                        <Calendar size={16} />
                        <span>{formatDate(task.dueDate)}</span>
                      </div>
                    )}
                    
                    <button 
                      className="modern-start-btn"
                      onClick={() => handleStartTask(task.id)}
                      disabled={task.status === 'Completed'}
                    >
                      <Play size={16} />
                      <span>
                        {task.status === 'Completed' ? 'Selesai' : 
                         task.status === 'In Progress' ? 'Lanjutkan' : 'Mulai'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dashboard Grid - Quick Actions and Overview moved here */}
        <div className="modern-dashboard-grid">
          {/* Quick Actions */}
          <section className="modern-quick-actions">
            <h2 className="modern-section-title">
              <div className="modern-section-icon">
                <Zap size={20} />
              </div>
              Quick Actions
            </h2>
            
            <button 
              className="modern-action-btn"
              onClick={handleNavigateToProgress}
            >
              <div className="modern-action-content">
                <div className="modern-action-icon">
                  <Activity size={24} />
                </div>
                <div className="modern-action-text">
                  <h3>View Work Progress</h3>
                  <p>Lihat dan kelola log progress pekerjaan Anda secara real-time</p>
                </div>
              </div>
              <ChevronRight size={24} />
            </button>
          </section>

          {/* Stats Overview */}
          <section className="modern-stats-overview">
            <h2 className="modern-section-title">
              <div className="modern-section-icon">
                <BarChart3 size={20} />
              </div>
              Overview
            </h2>
            
            <div className="modern-stats-grid">
              <div className="modern-stat-card">
                <span className="modern-stat-number">{workSessionsStats.total}</span>
                <span className="modern-stat-label">Total Sessions</span>
              </div>
              <div className="modern-stat-card">
                <span className="modern-stat-number">{workSessionsStats.completed}</span>
                <span className="modern-stat-label">Completed</span>
              </div>
              <div className="modern-stat-card">
                <span className="modern-stat-number">{workSessionsStats.active}</span>
                <span className="modern-stat-label">Active</span>
              </div>
            </div>

            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              background: 'rgba(102, 126, 234, 0.05)', 
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <p style={{ 
                color: '#667eea', 
                fontWeight: '600', 
                fontSize: '0.9rem',
                margin: 0
              }}>
                {workSessions.length > 0 
                  ? `Terakhir diperbarui: ${formatDate(workSessions[0]?.createdAt)}`
                  : 'Belum ada aktivitas'
                }
              </p>
            </div>
          </section>
        </div>

        {/* Recent Activity */}
        <section className="modern-recent-activity">
          <h2 className="modern-section-title">
            <div className="modern-section-icon">
              <Award size={20} />
            </div>
            Recent Work Sessions
          </h2>
          
          {recentWorkSessions.length > 0 ? (
            <div className="modern-activity-list">
              {recentWorkSessions.map((session) => (
                <div key={session.id} className="modern-activity-item">
                  <div className="modern-activity-content">
                    <div className="modern-activity-icon">
                      <Briefcase size={20} />
                    </div>
                    <div className="modern-activity-text">
                      <div className="modern-activity-title">{session.title}</div>
                      <div className="modern-activity-subtitle">
                        Progress: {session.completionRate}% • Duration: {formatTime(session.totalTime)}
                      </div>
                      <div className="modern-activity-approval">
                        Status Approval: <span className={`modern-approval-badge ${session.approvalStatus.class}`}>
                          {session.approvalStatus.text}
                        </span>
                        {/* Debug info - can be removed in production */}
                        {process.env.NODE_ENV === 'development' && (
                          <span style={{ fontSize: '0.8rem', color: '#999', marginLeft: '10px' }}>
                            (adminStatus: {session.adminStatus || 'none'})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="modern-activity-meta">
                    <div className="modern-activity-time">
                      {formatDate(session.date)}
                    </div>
                    <span className={`modern-activity-status status-${session.status.toLowerCase().replace(' ', '-')}`}>
                      {session.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="modern-no-data">
              <div className="modern-no-data-icon">📊</div>
              <h3>Belum ada work sessions</h3>
              <p>Mulai bekerja pada tugas untuk melihat aktivitas di sini.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default HomePage;