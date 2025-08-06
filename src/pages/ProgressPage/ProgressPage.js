import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, FileText, Settings, LogOut, Calendar, ArrowLeft, X, User, Activity, Home, CheckCircle2, XCircle, AlertTriangle, Clock, MessageSquare } from 'lucide-react';
import './ProgressPage.css';
import { db, auth } from '../../firebase';
import { collection, getDocs, query, where, orderBy, doc, getDoc, limit, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import logoLRS from '../assets/images/logoLRS.png';

// Import helper functions from TaskPage folder
import {
  STEP_STATUS,
  formatTime,
  formatStepTime,
  getStepStatusColor,
  getStepStatusText
} from '../TaskPage/TaskPageComponent';

const ProgressPage = () => {
  // State declarations
  const [workSessions, setWorkSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [taskInstructions, setTaskInstructions] = useState({});
  
  // States for standardized header
  const [activeMenuItem, setActiveMenuItem] = useState('Log Progress');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  // Hooks
  const location = useLocation();
  const navigate = useNavigate();
  const authInstance = getAuth();

  // Get current user
  const userId = currentUser?.uid || 'anonymous';

  // Check if redirected from completed task
  const completedSessionId = location.state?.completedSessionId;
  const fromTaskCompletion = location.state?.fromTaskCompletion;

  // Status management functions - UPDATED TO MATCH ADMIN STATUS
  const getProgressStatusBadgeColor = (status) => {
    switch (status) {
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545'; 
      case 'pending': return '#ffc107';
      case 'submitted': return '#17a2b8';
      case 'completed': return '#6f42c1';
      case 'active': return '#20c997';
      default: return '#6c757d';
    }
  };

  const getProgressStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle2 size={16} />;
      case 'rejected': return <XCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      case 'completed': return <CheckCircle2 size={16} />;
      case 'active': return <Activity size={16} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  const getProgressStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'pending': return 'Menunggu Review';
      case 'submitted': return 'Terkirim';
      case 'completed': return 'Selesai';
      case 'active': return 'Aktif';
      default: return 'Status Tidak Diketahui';
    }
  };

  // Listen untuk auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [authInstance]);

  // IMPROVED: Real-time listener untuk work sessions dengan status updates
  const setupWorkSessionsListener = useCallback(() => {
    if (!currentUser?.uid) return;

    console.log('📊 Setting up real-time listener for user:', currentUser.uid);

    const sessionsRef = collection(db, 'workSessions');
    const q = query(
      sessionsRef,
      where('userId', '==', currentUser.uid)
    );

    // Setup real-time listener
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('📡 Real-time update received, processing...');
        
        const sessions = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          sessions.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            completedAt: data.completedAt?.toDate(),
            startTime: data.startTime?.toDate(),
            lastUpdated: data.lastUpdated?.toDate(),
            // FIXED: Use proper admin status fields
            adminStatus: data.status || data.adminStatus || (data.completedAt ? 'pending' : 'active'),
            adminComment: data.adminComment || '',
            adminId: data.adminId || null,
            adminName: data.adminName || null,
            reviewedAt: data.reviewedAt?.toDate() || data.statusUpdatedAt?.toDate() || null,
            statusUpdatedBy: data.statusUpdatedBy || null
          });
        });

        // Sort sessions by creation date
        sessions.sort((a, b) => {
          const dateA = a.createdAt || new Date(0);
          const dateB = b.createdAt || new Date(0);
          return dateB - dateA;
        });

        console.log(`✅ Real-time update: ${sessions.length} sessions loaded`);
        
        // Log status information for debugging
        sessions.forEach(session => {
          if (session.completedAt) {
            console.log(`📋 Session ${session.id}: status="${session.adminStatus}", completedAt=${session.completedAt}`);
          }
        });

        setWorkSessions(sessions);
        setLoading(false);

        // Auto-select the most recent completed session if redirected from task completion
        if (completedSessionId && fromTaskCompletion && sessions.length > 0) {
          const completedSession = sessions.find(s => s.id === completedSessionId);
          if (completedSession) {
            setSelectedSession(completedSession);
            fetchSessionDetails(completedSession);
          }
        }
      },
      (error) => {
        console.error('❌ Real-time listener error:', error);
        
        let errorMessage = 'Gagal memuat data progress';
        
        if (error.code === 'failed-precondition') {
          errorMessage = 'Database index sedang dibangun. Silakan coba lagi dalam beberapa menit.';
        } else if (error.code === 'permission-denied') {
          errorMessage = 'Tidak memiliki izin untuk mengakses data.';
        } else if (error.code === 'unavailable') {
          errorMessage = 'Layanan database tidak tersedia. Silakan coba lagi.';
        } else {
          errorMessage = `${errorMessage}: ${error.message}`;
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser?.uid, completedSessionId, fromTaskCompletion]);

  // Fetch work sessions from Firestore with fallback approach - LEGACY FALLBACK
  const fetchWorkSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching work sessions for user:', userId);

      const sessionsRef = collection(db, 'workSessions');
      
      let sessions = [];
      
      try {
        console.log('🔍 Attempting query with orderBy...');
        const qWithOrder = query(
          sessionsRef,
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        
        const querySnapshot = await getDocs(qWithOrder);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          sessions.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            completedAt: data.completedAt?.toDate(),
            startTime: data.startTime?.toDate(),
            lastUpdated: data.lastUpdated?.toDate(),
            // FIXED: Use proper admin status fields
            adminStatus: data.status || data.adminStatus || (data.completedAt ? 'pending' : 'active'),
            adminComment: data.adminComment || '',
            adminId: data.adminId || null,
            adminName: data.adminName || null,
            reviewedAt: data.reviewedAt?.toDate() || data.statusUpdatedAt?.toDate() || null,
            statusUpdatedBy: data.statusUpdatedBy || null
          });
        });
        
        console.log(`✅ Query with orderBy successful: ${sessions.length} sessions`);
        
      } catch (orderError) {
        console.warn('⚠️ OrderBy query failed, falling back to simple query:', orderError);
        
        const qSimple = query(
          sessionsRef,
          where('userId', '==', userId)
        );
        
        const querySnapshot = await getDocs(qSimple);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          sessions.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            completedAt: data.completedAt?.toDate(),
            startTime: data.startTime?.toDate(),
            lastUpdated: data.lastUpdated?.toDate(),
            // FIXED: Use proper admin status fields
            adminStatus: data.status || data.adminStatus || (data.completedAt ? 'pending' : 'active'),
            adminComment: data.adminComment || '',
            adminId: data.adminId || null,
            adminName: data.adminName || null,
            reviewedAt: data.reviewedAt?.toDate() || data.statusUpdatedAt?.toDate() || null,
            statusUpdatedBy: data.statusUpdatedBy || null
          });
        });
        
        sessions.sort((a, b) => {
          const dateA = a.createdAt || new Date(0);
          const dateB = b.createdAt || new Date(0);
          return dateB - dateA;
        });
        
        console.log(`✅ Simple query successful: ${sessions.length} sessions`);
      }

      setWorkSessions(sessions);

      // Auto-select the most recent completed session if redirected from task completion
      if (completedSessionId && fromTaskCompletion) {
        const completedSession = sessions.find(s => s.id === completedSessionId);
        if (completedSession) {
          setSelectedSession(completedSession);
          await fetchSessionDetails(completedSession);
        }
      }

    } catch (error) {
      console.error('❌ Error fetching work sessions:', error);
      
      let errorMessage = 'Gagal memuat data progress';
      
      if (error.code === 'failed-precondition') {
        errorMessage = 'Database index sedang dibangun. Silakan coba lagi dalam beberapa menit.';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Tidak memiliki izin untuk mengakses data.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Layanan database tidak tersedia. Silakan coba lagi.';
      } else {
        errorMessage = `${errorMessage}: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, completedSessionId, fromTaskCompletion]);

  // Fetch detailed session information
  const fetchSessionDetails = useCallback(async (session) => {
    try {
      console.log('📋 Fetching details for session:', session.id);

      if (!taskInstructions[session.workInstructionId]) {
        try {
          const taskRef = doc(db, 'tasks', session.workInstructionId);
          const taskDoc = await getDoc(taskRef);
          
          if (taskDoc.exists()) {
            const taskData = taskDoc.data();
            setTaskInstructions(prev => ({
              ...prev,
              [session.workInstructionId]: taskData
            }));
          } else {
            console.warn(`⚠️ Task document not found: ${session.workInstructionId}`);
          }
        } catch (taskError) {
          console.warn('⚠️ Error fetching task details:', taskError);
        }
      }

      setSessionDetails(session);
      console.log('✅ Session details loaded');

    } catch (error) {
      console.error('❌ Error fetching session details:', error);
    }
  }, [taskInstructions]);

  // Handle session selection - simplified
  const handleSessionClick = useCallback(async (session) => {
    setSelectedSession(session);
    await fetchSessionDetails(session);
  }, [fetchSessionDetails]);

  // Calculate basic session progress
  const calculateBasicProgress = useCallback((session) => {
    if (!session.stepStatuses || !Array.isArray(session.stepStatuses)) {
      return {
        totalSteps: 0,
        completedSteps: 0,
        completionRate: 0
      };
    }

    const totalSteps = session.stepStatuses.length;
    const completedSteps = session.stepStatuses.filter(status => status === STEP_STATUS.COMPLETED).length;
    const completionRate = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    return {
      totalSteps,
      completedSteps,
      completionRate
    };
  }, []);

  // IMPROVED: Get session status badge with proper admin status handling
  const getSessionStatusBadge = (session) => {
    const adminStatus = session.adminStatus;
    const isActive = session.isActive;
    const isCompleted = session.completedAt;

    let status, displayText;
    
    if (isActive) {
      status = 'active';
      displayText = '🔄 Sedang Dikerjakan';
    } else if (isCompleted) {
      // Use admin status if available
      status = adminStatus || 'pending';
      switch (status) {
        case 'approved':
          displayText = '✅ Disetujui';
          break;
        case 'rejected':
          displayText = '❌ Ditolak';
          break;
        case 'pending':
        default:
          displayText = '⏳ Menunggu Review';
          break;
      }
    } else {
      status = 'paused';
      displayText = '⏸️ Terhenti';
    }

    return (
      <span 
        className="progress-status-badge" 
        style={{ 
          backgroundColor: `${getProgressStatusBadgeColor(status)}20`,
          color: getProgressStatusBadgeColor(status),
          border: `1px solid ${getProgressStatusBadgeColor(status)}40`
        }}
      >
        {displayText}
      </span>
    );
  };

  // Handle logout
  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) {
      try {
        await signOut(auth);
        
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userToken');
        localStorage.removeItem('previousStats');
        
        navigate('/login');
      } catch (error) {
        console.error('Error signing out:', error);
        alert('Terjadi kesalahan saat logout: ' + error.message);
      }
    }
  };

  // Handle profile click
  const handleProfileClick = () => {
    console.log('Navigate to profile page');
    navigate('/profil');
    setShowDropdown(false);
  };

  // Handle back navigation
  const handleBackClick = () => {
    navigate('/home');
  };

  // Format date function
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

  // IMPROVED: Setup real-time listener on component mount
  useEffect(() => {
    if (currentUser) {
      console.log('🔄 Setting up real-time data listener...');
      const unsubscribe = setupWorkSessionsListener();
      
      // Cleanup listener on unmount
      return () => {
        if (unsubscribe) {
          console.log('🔄 Cleaning up real-time listener...');
          unsubscribe();
        }
      };
    }
  }, [setupWorkSessionsListener, currentUser]);

  // Loading state untuk auth
  if (isAuthLoading) {
    return (
      <div className="progress-loading-container">
        <div className="progress-loading-content">
          <div className="progress-loading-spinner"></div>
          <p className="progress-loading-text">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // State ketika user belum login
  if (!currentUser) {
    return (
      <div className="progress-page">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            Anda harus login terlebih dahulu
          </div>
          <div style={{ color: '#666', marginBottom: '30px' }}>
            Silakan login untuk mengakses halaman progress
          </div>
          <button 
            onClick={() => navigate('/login')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            Login Sekarang
          </button>
        </div>
      </div>
    );
  }

  // Render loading state
  if (loading) {
    return (
      <div className="progress-page">
        {/* Header Bar */}
        <div className="progress-header-bar">
          <div className="progress-header-left">
            <button className="progress-back-button" onClick={handleBackClick}>
              <ArrowLeft size={20} />
            </button>
            <img 
              src={logoLRS} 
              alt="Len Railway Systems" 
              className="progress-logo"
              onClick={() => navigate('/home')}
            />
          </div>
          
          <div className="progress-header-center">
            <h1 className="progress-title-header">Log Progress</h1>
          </div>
          
          <div className="progress-header-right">
            <div className="progress-profile-container">
              <button
                className="progress-profile-btn"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="progress-profile-avatar">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Avatar" className="progress-avatar-image" />
                  ) : (
                    <span className="progress-avatar-text">
                      {(currentUser.displayName || currentUser.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="progress-profile-info">
                  <div className="progress-profile-name">
                    {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                  </div>
                  <div className="progress-profile-id">ID: {currentUser.uid?.substring(0, 8) || 'N/A'}</div>
                </div>
              </button>

              {showDropdown && (
                <div className="progress-dropdown-menu">
                  <div className="progress-dropdown-header">
                    <div className="progress-profile-avatar">
                      {currentUser.photoURL ? (
                        <img src={currentUser.photoURL} alt="Avatar" className="progress-avatar-image" />
                      ) : (
                        <span className="progress-avatar-text">
                          {(currentUser.displayName || currentUser.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="progress-dropdown-name">
                        {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                      </div>
                      <div className="progress-dropdown-email">{currentUser.email}</div>
                      <div className="progress-dropdown-id">ID: {currentUser.uid?.substring(0, 8) || 'N/A'}</div>
                    </div>
                  </div>
                  <button className="progress-dropdown-item" onClick={handleProfileClick}>
                    <User className="progress-dropdown-icon" />
                    <span>Profile</span>
                  </button>
                  <hr className="progress-dropdown-divider" />
                  <button className="progress-dropdown-item progress-dropdown-logout" onClick={handleLogout}>
                    <LogOut className="progress-dropdown-icon" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="progress-loading-container">
          <div className="progress-loading-spinner"></div>
          <p>Memuat data progress...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="progress-page">
        <div className="progress-error-container">
          <h2>Terjadi Kesalahan</h2>
          <p>{error}</p>
          <div className="progress-error-actions">
            <button onClick={fetchWorkSessions} className="progress-retry-button">
              Coba Lagi
            </button>
            <Link to="/task" className="progress-start-new-button">
              Mulai Task Baru
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-page">
      {/* Header Bar */}
      <div className="progress-header-bar">
        <div className="progress-header-left">
          <button className="progress-back-button" onClick={handleBackClick}>
            <ArrowLeft size={20} />
          </button>
          <img 
            src={logoLRS} 
            alt="Len Railway Systems" 
            className="progress-logo"
            onClick={() => navigate('/home')}
          />
        </div>
        
        <div className="progress-header-center">
          <h1 className="progress-title-header">Log Progress</h1>
          {fromTaskCompletion && (
            <p className="progress-completion-notice">🎉 Task baru saja diselesaikan!</p>
          )}
        </div>
        
        <div className="progress-header-right">
          <div className="progress-profile-container">
            <button
              className="progress-profile-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="progress-profile-avatar">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" className="progress-avatar-image" />
                ) : (
                  <span className="progress-avatar-text">
                    {(currentUser.displayName || currentUser.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="progress-profile-info">
                <div className="progress-profile-name">
                  {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                </div>
                <div className="progress-profile-id">ID: {currentUser.uid?.substring(0, 8) || 'N/A'}</div>
              </div>
            </button>

            {showDropdown && (
              <div className="progress-dropdown-menu">
                <div className="progress-dropdown-header">
                  <div className="progress-profile-avatar">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="progress-avatar-image" />
                    ) : (
                      <span className="progress-avatar-text">
                        {(currentUser.displayName || currentUser.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="progress-dropdown-name">
                      {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                    </div>
                    <div className="progress-dropdown-email">{currentUser.email}</div>
                    <div className="progress-dropdown-id">ID: {currentUser.uid?.substring(0, 8) || 'N/A'}</div>
                  </div>
                </div>
                <button className="progress-dropdown-item" onClick={handleProfileClick}>
                  <User className="progress-dropdown-icon" />
                  <span>Profile</span>
                </button>
                <hr className="progress-dropdown-divider" />
                <button className="progress-dropdown-item progress-dropdown-logout" onClick={handleLogout}>
                  <LogOut className="progress-dropdown-icon" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - No Sidebar */}
      <div className="progress-main-content">
        <div className="progress-container-layout">
          {/* Sessions List - Left Side */}
          <div className="progress-sessions-section">
            <h2>Riwayat Sessions ({workSessions.length})</h2>
            
            {workSessions.length === 0 ? (
              <div className="progress-no-sessions">
                <p>Belum ada riwayat progress.</p>
                <Link to="/task" className="progress-start-task-button">
                  Mulai Task Pertama
                </Link>
              </div>
            ) : (
              <div className="progress-sessions-list">
                {workSessions.map((session) => {
                  const progress = calculateBasicProgress(session);
                  const isSelected = selectedSession?.id === session.id;
                  
                  return (
                    <div
                      key={session.id}
                      className={`progress-session-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSessionClick(session)}
                    >
                      <div className="progress-session-header">
                        <h4>{session.workInstructionTitle || 'Untitled Task'}</h4>
                        {getSessionStatusBadge(session)}
                      </div>
                      
                      <div className="progress-session-info">
                        <div className="progress-session-progress">
                          <div className="progress-progress-bar">
                            <div 
                              className="progress-progress-fill" 
                              style={{ width: `${progress.completionRate}%` }}
                            />
                          </div>
                          <span>{progress.completedSteps}/{progress.totalSteps} langkah</span>
                        </div>
                        
                        <div className="progress-session-time">
                          <span>⏱️ {formatTime(session.totalTime || 0)}</span>
                        </div>
                      </div>
                      
                      <div className="progress-session-date">
                        {session.createdAt ? (
                          <small>
                            {session.createdAt.toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </small>
                        ) : (
                          <small>Tanggal tidak diketahui</small>
                        )}
                      </div>

                      {/* Quick Action for Active Sessions */}
                      {session.isActive && (
                        <div className="progress-session-action">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/task', { 
                                state: { resumeSessionId: session.id } 
                              });
                            }}
                            className="progress-continue-quick-btn"
                          >
                            ▶️ Lanjutkan
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session Details - Right Side */}
          <div className="progress-details-section">
            {selectedSession ? (
              <div className="progress-session-detail">
                <div className="progress-detail-header">
                  <h3>{selectedSession.workInstructionTitle || 'Untitled Task'}</h3>
                  {getSessionStatusBadge(selectedSession)}
                </div>

                <div className="progress-detail-content">
                  <div className="progress-detail-item">
                    <label>Status:</label>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center', 
                      gap: '8px',
                      color: getProgressStatusBadgeColor(selectedSession.adminStatus || 'pending')
                    }}>
                      {getProgressStatusIcon(selectedSession.adminStatus || 'pending')}
                      <span style={{ fontWeight: 'bold' }}>
                        {getProgressStatusText(selectedSession.adminStatus || 'pending')}
                      </span>
                    </div>
                  </div>

                  <div className="progress-detail-item">
                    <label>Progress:</label>
                    {(() => {
                      const progress = calculateBasicProgress(selectedSession);
                      return (
                        <div>
                          <div className="progress-progress-bar" style={{ marginBottom: '8px' }}>
                            <div 
                              className="progress-progress-fill" 
                              style={{ width: `${progress.completionRate}%` }}
                            />
                          </div>
                          <span>{progress.completedSteps}/{progress.totalSteps} langkah ({progress.completionRate.toFixed(1)}%)</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="progress-detail-item">
                    <label>Total Waktu:</label>
                    <span>⏱️ {formatTime(selectedSession.totalTime || 0)}</span>
                  </div>

                  <div className="progress-detail-item">
                    <label>Tanggal Mulai:</label>
                    <span>{formatDate(selectedSession.createdAt)}</span>
                  </div>

                  {selectedSession.completedAt && (
                    <div className="progress-detail-item">
                      <label>Tanggal Selesai:</label>
                      <span>{formatDate(selectedSession.completedAt)}</span>
                    </div>
                  )}

                  {/* Admin Feedback */}
                  {selectedSession.adminComment && (
                    <div className="progress-detail-item">
                      <label>Komentar Admin:</label>
                      <div className="progress-admin-comment">
                        <p>{selectedSession.adminComment}</p>
                        {selectedSession.adminName && (
                          <div className="progress-admin-info">
                            <span>Oleh: {selectedSession.adminName}</span>
                            {selectedSession.reviewedAt && (
                              <span>pada {formatDate(selectedSession.reviewedAt)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step Summary */}
                  {selectedSession.stepStatuses && Array.isArray(selectedSession.stepStatuses) && (
                    <div className="progress-detail-item">
                      <label>Ringkasan Langkah:</label>
                      <div className="progress-steps-preview">
                        {selectedSession.stepStatuses.slice(0, 5).map((status, index) => {
                          const taskData = taskInstructions[selectedSession.workInstructionId];
                          const stepData = taskData?.steps?.[index];
                          const stepTime = selectedSession.stepCompletionTimes?.[index] || 0;
                          
                          return (
                            <div key={index} className="progress-step-preview-item">
                              <span className="progress-step-number">{index + 1}.</span>
                              <span className="progress-step-name">
                                {stepData?.title || `Langkah ${index + 1}`}
                              </span>
                              <span 
                                className="progress-step-status-mini"
                                style={{ color: getStepStatusColor(status) }}
                              >
                                {status === STEP_STATUS.COMPLETED ? '✓' : 
                                 status === STEP_STATUS.SKIPPED ? '⊘' : '○'}
                              </span>
                            </div>
                          );
                        })}
                        {selectedSession.stepStatuses.length > 5 && (
                          <div className="progress-steps-more">
                            +{selectedSession.stepStatuses.length - 5} langkah lainnya
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="progress-detail-actions">
                  {selectedSession.isActive ? (
                    <button
                      onClick={() => navigate('/task', { 
                        state: { resumeSessionId: selectedSession.id } 
                      })}
                      className="progress-action-btn progress-continue-btn"
                    >
                      🚀 Lanjutkan Pekerjaan
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/task')}
                      className="progress-action-btn progress-new-task-btn"
                    >
                      ➕ Mulai Task Baru
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="progress-no-selection">
                <div className="progress-no-selection-content">
                  <h3>Pilih Session</h3>
                  <p>Klik pada salah satu session di sebelah kiri untuk melihat detailnya.</p>
                  {workSessions.length === 0 && (
                    <div className="progress-empty-state">
                      <p>Belum ada session yang tersedia.</p>
                      <Link to="/task" className="progress-start-first-btn">
                        Mulai Task Pertama
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );
};

export default ProgressPage;