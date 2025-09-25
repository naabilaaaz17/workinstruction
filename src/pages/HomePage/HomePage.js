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

  // 🔥 ADDED: Real-time listener state
  const [realtimeUnsubscribe, setRealtimeUnsubscribe] = useState(null);

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

  // 🔥 FIXED: Complete work sessions loading with real-time updates matching ProgressPage
  const loadWorkSessions = async (userId) => {
    try {
      console.log('📊 [HomePage] Setting up COMPLETE real-time listener for user:', userId);

      // Clean up existing listener first
      if (realtimeUnsubscribe) {
        console.log('🧹 [HomePage] Cleaning up previous listener');
        realtimeUnsubscribe();
      }

      const sessionsRef = collection(db, 'workSessions');
      
      // 🔥 FIXED: Use multiple query strategies matching ProgressPage
      let activeQuery;
      
      try {
        // Strategy 1: Use operatorId (TaskPage standard)
        activeQuery = query(
          sessionsRef,
          where('operatorId', '==', userId),
          where('type', '==', 'work_session')
        );
      } catch (error) {
        console.warn('⚠️ [HomePage] operatorId compound query failed, using simple query:', error);
        
        // Fallback: Simple operatorId query
        activeQuery = query(
          sessionsRef,
          where('operatorId', '==', userId)
        );
      }

      // Setup real-time listener with COMPLETE session mapping (matching ProgressPage)
      const unsubscribe = onSnapshot(activeQuery, 
        (snapshot) => {
          console.log('📡 [HomePage] REAL-TIME UPDATE received:', snapshot.size, 'documents');
          
          const sessions = [];
          const sessionIds = new Set();

          snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Skip duplicates
            if (sessionIds.has(doc.id)) {
              console.log('⚠️ [HomePage] Duplicate session detected:', doc.id);
              return;
            }

            // Only include work_session type
            if (data.type !== 'work_session') {
              return;
            }

            sessionIds.add(doc.id);

            // 🔥 FIXED: Complete field mapping from TaskPage to HomePage (matching ProgressPage)
            const mappedSession = {
              id: doc.id,
              
              // Basic task info - map from TaskPage fields
              workInstructionTitle: data.taskName || data.workInstructionTitle || 'Unknown Task',
              workInstructionId: data.taskId || data.workInstructionId || 'unknown',
              moNumber: data.moNumber || data.moDisplay || 'No MO',
              
              // Operator info - use TaskPage operatorId
              operatorId: data.operatorId || data.createdBy,
              operatorName: data.operatorName || 'Unknown Operator',
              userId: data.operatorId || data.createdBy, // Backward compatibility
              
              // 🔥 FIXED: Status mapping - show ALL sessions including active ones
              rawStatus: data.status || 'unknown', // Keep original TaskPage status
              isActive: data.isActive !== false && data.status === 'in_progress', // Show in-progress sessions
              
              // 🔥 FIXED: Timestamps mapping
              createdAt: data.createdAt?.toDate() || data.startTime?.toDate() || new Date(),
              completedAt: data.status === 'completed' ? (data.completedAt?.toDate() || data.lastUpdated?.toDate()) : null,
              startTime: data.startTime?.toDate(),
              lastUpdated: data.lastUpdated?.toDate() || data.createdAt?.toDate() || new Date(),
              
              // Progress data - direct from TaskPage
              currentStep: data.currentStep || 0,
              stepStatuses: data.stepStatuses || [],
              totalTime: data.totalTime || 0,
              stepCompletionTimes: data.stepCompletionTimes || [],
              stepTimes: data.stepTimes || [],
              totalSteps: data.totalSteps || (data.stepStatuses?.length || 0),
              
              // 🔥 FIXED: Admin status handling (matching ProgressPage logic)
              adminStatus: data.adminStatus || (
                data.status === 'completed' ? 'pending' : 
                data.status === 'in_progress' ? 'in_progress' :  // Keep in_progress
                data.isActive ? 'active' :
                'unknown'
              ),
              adminComment: data.adminComment || '',
              adminId: data.adminId || null,
              adminName: data.adminName || null,
              reviewedAt: data.reviewedAt?.toDate() || data.statusUpdatedAt?.toDate() || null,
              statusUpdatedBy: data.statusUpdatedBy || null,
              
              // 🔥 ADDED: Additional TaskPage fields
              participants: data.participants || [],
              stepOperators: data.stepOperators || {},
              troubleshootHistory: data.troubleshootHistory || [],
              
              // Efficiency calculation data
              stepTargetTimes: data.stepTargetTimes || [],
              totalTargetTime: data.totalTargetTime || data.targetTime || 0,
              finalEfficiency: data.finalEfficiency || 0,
              
              // Meta data
              type: data.type || 'work_session'
            };

            sessions.push(mappedSession);

            // Enhanced logging for debugging
            console.log(`📋 [HomePage] Session ${doc.id}:`, {
              taskName: mappedSession.workInstructionTitle,
              moNumber: mappedSession.moNumber,
              rawStatus: mappedSession.rawStatus,
              adminStatus: mappedSession.adminStatus,
              isActive: mappedSession.isActive,
              currentStep: mappedSession.currentStep,
              totalSteps: mappedSession.totalSteps,
              operatorId: mappedSession.operatorId,
              lastUpdated: mappedSession.lastUpdated
            });
          });

          // 🔥 FIXED: Sort by lastUpdated (most recent first) - matching ProgressPage
          sessions.sort((a, b) => {
            const dateA = a.lastUpdated || a.createdAt || new Date(0);
            const dateB = b.lastUpdated || b.createdAt || new Date(0);
            return dateB - dateA;
          });

          console.log(`✅ [HomePage] REAL-TIME: ${sessions.length} sessions loaded and sorted`);
          console.log('📊 [HomePage] Session breakdown:', {
            total: sessions.length,
            active: sessions.filter(s => s.isActive).length,
            completed: sessions.filter(s => s.rawStatus === 'completed').length,
            in_progress: sessions.filter(s => s.rawStatus === 'in_progress').length
          });

          setWorkSessions(sessions);
          setError(null); // Clear any previous errors
        },
        (error) => {
          console.error('❌ [HomePage] Real-time listener error:', error);
          
          let errorMessage = 'Gagal memuat work sessions secara real-time';
          
          if (error.code === 'failed-precondition') {
            errorMessage = 'Database index diperlukan. Mencoba query alternatif...';
            console.error('❌ [HomePage] Required Firestore indexes:', {
              collection: 'workSessions',
              indexes: [
                'operatorId ASC, type ASC',
                'createdBy ASC, type ASC',
                'operatorId ASC, type ASC, lastUpdated DESC'
              ]
            });
            
            // 🔥 FALLBACK: Try simpler query without compound index
            setTimeout(() => {
              console.log('🔄 [HomePage] Attempting fallback query...');
              setupFallbackWorkSessionsQuery(userId);
            }, 1000);
            
          } else if (error.code === 'permission-denied') {
            errorMessage = 'Tidak memiliki izin untuk mengakses work sessions.';
          } else if (error.code === 'unavailable') {
            errorMessage = 'Layanan database tidak tersedia. Mencoba koneksi ulang...';
            
            // 🔥 RETRY: Attempt reconnection
            setTimeout(() => {
              console.log('🔄 [HomePage] Retrying work sessions connection...');
              loadWorkSessions(userId);
            }, 5000);
            
          } else {
            errorMessage = `${errorMessage}: ${error.message}`;
          }
          
          console.warn('⚠️ [HomePage] Work sessions error:', errorMessage);
          // Don't set error state for work sessions, just log it
          setWorkSessions([]);
        }
      );

      setRealtimeUnsubscribe(() => unsubscribe);
      return unsubscribe;

    } catch (error) {
      console.error('❌ [HomePage] Error setting up work sessions listener:', error);
      setWorkSessions([]);
    }
  };

  // 🔥 ADDED: Fallback query for work sessions when compound indexes aren't available
  const setupFallbackWorkSessionsQuery = async (userId) => {
    try {
      console.log('🔄 [HomePage] Setting up fallback work sessions query...');

      const sessionsRef = collection(db, 'workSessions');
      
      // Simple query without compound index
      const q = query(
        sessionsRef,
        where('operatorId', '==', userId)
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          console.log('📡 [HomePage] FALLBACK: Work sessions update received:', snapshot.size);
          
          const sessions = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Only include work_session type
            if (data.type === 'work_session') {
              // Use same mapping logic as main listener
              sessions.push({
                id: doc.id,
                workInstructionTitle: data.taskName || data.workInstructionTitle || 'Unknown Task',
                workInstructionId: data.taskId || data.workInstructionId || 'unknown',
                moNumber: data.moNumber || data.moDisplay || 'No MO',
                operatorId: data.operatorId || data.createdBy,
                operatorName: data.operatorName || 'Unknown Operator',
                userId: data.operatorId || data.createdBy,
                rawStatus: data.status || 'unknown',
                isActive: data.isActive !== false && data.status === 'in_progress',
                createdAt: data.createdAt?.toDate() || data.startTime?.toDate() || new Date(),
                completedAt: data.status === 'completed' ? (data.completedAt?.toDate() || data.lastUpdated?.toDate()) : null,
                lastUpdated: data.lastUpdated?.toDate() || data.createdAt?.toDate() || new Date(),
                currentStep: data.currentStep || 0,
                stepStatuses: data.stepStatuses || [],
                totalTime: data.totalTime || 0,
                stepCompletionTimes: data.stepCompletionTimes || [],
                totalSteps: data.totalSteps || (data.stepStatuses?.length || 0),
                adminStatus: data.adminStatus || (
                  data.status === 'completed' ? 'pending' : 
                  data.status === 'in_progress' ? 'in_progress' : 
                  'unknown'
                ),
                type: data.type
              });
            }
          });

          sessions.sort((a, b) => (b.lastUpdated || b.createdAt) - (a.lastUpdated || a.createdAt));
          
          console.log(`✅ [HomePage] FALLBACK: ${sessions.length} work sessions loaded`);
          setWorkSessions(sessions);
        },
        (error) => {
          console.error('❌ [HomePage] Fallback work sessions query also failed:', error);
          setWorkSessions([]);
        }
      );

      setRealtimeUnsubscribe(() => unsubscribe);
      
    } catch (error) {
      console.error('❌ [HomePage] Fallback work sessions setup failed:', error);
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
        // Clean up real-time listener before logout
        if (realtimeUnsubscribe) {
          realtimeUnsubscribe();
          setRealtimeUnsubscribe(null);
        }

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

  // 🔥 FIXED: Get approval status function updated for TaskPage status values (matching ProgressPage)
  const getApprovalStatus = (status, adminStatus) => {
    // Prioritize adminStatus if available
    if (adminStatus) {
      switch (adminStatus.toLowerCase()) {
        case 'approved':
          return { text: 'Disetujui', class: 'status-approved' };
        case 'rejected':
          return { text: 'Ditolak', class: 'status-rejected' };
        case 'pending':
          return { text: 'Menunggu Review', class: 'status-pending' };
        case 'in_progress':
          return { text: 'Sedang Dikerjakan', class: 'status-active' };
        default:
          return { text: 'Belum Direview', class: 'status-pending' };
      }
    }
    
    // Fallback to TaskPage status
    switch (status) {
      case 'completed':
        return { text: 'Menunggu Review', class: 'status-pending' };
      case 'in_progress':
        return { text: 'Sedang Dikerjakan', class: 'status-active' };
      default:
        return { text: 'Status Tidak Dikenal', class: 'status-unknown' };
    }
  };

  // 🔥 FIXED: Calculate work sessions statistics matching ProgressPage logic
  const getWorkSessionsStats = () => {
    console.log('📊 [HomePage] Calculating stats for', workSessions.length, 'sessions');
    
    const activeCount = workSessions.filter(session => {
      const isActive = session.isActive === true || session.rawStatus === 'in_progress';
      return isActive;
    }).length;
    
    const completedCount = workSessions.filter(session => {
      const isCompleted = session.rawStatus === 'completed' || session.completedAt != null;
      return isCompleted;
    }).length;
    
    const pausedCount = workSessions.filter(session => {
      const isPaused = !session.isActive && session.rawStatus !== 'completed' && !session.completedAt;
      return isPaused;
    }).length;

    const stats = {
      total: workSessions.length,
      completed: completedCount,
      active: activeCount,
      paused: pausedCount
    };

    console.log('📊 [HomePage] Stats calculated:', stats);
    return stats;
  };

  // 🔥 FIXED: Get recent work sessions for summary - Updated to use adminStatus (matching ProgressPage)
  const getRecentWorkSessions = () => {
    console.log('📋 [HomePage] Getting recent work sessions from', workSessions.length, 'total sessions');
    
    return workSessions
      .slice(0, 5)
      .map(session => {
        // Map TaskPage status to display status (matching ProgressPage logic)
        let displayStatus = 'Tidak Dikenal';
        if (session.rawStatus === 'in_progress') {
          displayStatus = 'Sedang Dikerjakan';
        } else if (session.rawStatus === 'completed') {
          displayStatus = 'Selesai';
        } else if (session.isActive) {
          displayStatus = 'Aktif';
        } else {
          displayStatus = 'Terhenti';
        }

        // Calculate completion rate
        const stepStatuses = session.stepStatuses || [];
        const totalSteps = stepStatuses.length;
        const completedSteps = stepStatuses.filter(s => s === 'completed').length;
        const completionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

        // 🔥 FIXED: Get approval status using adminStatus field (matching ProgressPage)
        const approvalStatus = getApprovalStatus(session.rawStatus, session.adminStatus);

        const result = {
          id: session.id,
          title: session.workInstructionTitle || 'Untitled Task',
          status: displayStatus,
          date: session.createdAt,
          completionRate: completionRate,
          totalTime: session.totalTime || 0,
          approvalStatus: approvalStatus,
          // Enhanced debugging info
          rawStatus: session.rawStatus,
          adminStatus: session.adminStatus,
          moNumber: session.moNumber,
          operatorId: session.operatorId
        };

        console.log(`📋 [HomePage] Recent session ${session.id}:`, {
          title: result.title,
          displayStatus: result.status,
          approvalStatus: result.approvalStatus.text,
          completionRate: result.completionRate,
          rawStatus: result.rawStatus,
          adminStatus: result.adminStatus
        });

        return result;
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

  // 🔥 ADDED: Cleanup effect for real-time listener
  useEffect(() => {
    return () => {
      if (realtimeUnsubscribe) {
        console.log('🧹 [HomePage] Component unmount: cleaning up real-time listener');
        realtimeUnsubscribe();
      }
    };
  }, [realtimeUnsubscribe]);

  if (loading) {
    return (
      <div className="modern-loading-container">
        <div className="modern-loading-content">
          <div className="modern-loading-spinner"></div>
          <p className="modern-loading-text">Memuat dashboard...</p>
          <p className="modern-loading-subtitle">🔄 Menghubungkan real-time data...</p>
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

  console.log('🎨 [HomePage] Rendering with stats:', workSessionsStats);
  console.log('🎨 [HomePage] Rendering with recent sessions:', recentWorkSessions.length);

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
                  <span>Profile</span>
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
          {/* 🔥 ADDED: Real-time status indicator */}
          {workSessions.length > 0 && (
            <div className="modern-realtime-status">
              {realtimeUnsubscribe ? (
                <span className="modern-realtime-active">
                  🟢 Real-time aktif • Data terupdate otomatis
                </span>
              ) : (
                <span className="modern-realtime-inactive">
                  🟡 Mode statis • Refresh manual
                </span>
              )}
            </div>
          )}
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

          {/* 🔥 FIXED: Stats Overview with proper data display */}
          <section className="modern-stats-overview">
            <h2 className="modern-section-title">
              <div className="modern-section-icon">
                <BarChart3 size={20} />
              </div>
              Overview
              {/* 🔥 ADDED: Loading indicator for work sessions */}
              {workSessions.length === 0 && !error && (
                <small style={{ color: '#666', fontWeight: 'normal' }}>
                  🔄 Memuat...
                </small>
              )}
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
                  ? `Terakhir diperbarui: ${formatDate(workSessions[0]?.lastUpdated || workSessions[0]?.createdAt)}`
                  : 'Belum ada aktivitas work session'
                }
              </p>
              {/* 🔥 ADDED: Real-time status in overview */}
              {realtimeUnsubscribe && (
                <small style={{ color: '#28a745', display: 'block', marginTop: '0.5rem' }}>
                  🟢 Data real-time aktif
                </small>
              )}
            </div>
          </section>
        </div>

        {/* 🔥 FIXED: Recent Activity with proper data handling */}
        <section className="modern-recent-activity">
          <h2 className="modern-section-title">
            <div className="modern-section-icon">
              <Award size={20} />
            </div>
            Recent Work Sessions
            {/* 🔥 ADDED: Session count indicator */}
            {recentWorkSessions.length > 0 && (
              <span className="modern-section-count">
                ({recentWorkSessions.length})
              </span>
            )}
          </h2>
          
          {recentWorkSessions.length > 0 ? (
            <div className="modern-activity-list">
              {recentWorkSessions.map((session) => (
                <div key={session.id} className="modern-activity-item">
                  <div className="modern-activity-content">
                    <div className="modern-activity-icon">
                      {/* 🔥 ADDED: Active session indicator */}
                      {session.rawStatus === 'in_progress' && (
                        <div className="modern-activity-pulse">🔴</div>
                      )}
                    </div>
                    <div className="modern-activity-text">
                      <div className="modern-activity-title">{session.title}</div>
                      <div className="modern-activity-subtitle">
                        Progress: {session.completionRate}% • Duration: {formatTime(session.totalTime)}
                        {/* 🔥 ADDED: MO number display */}
                        {session.moNumber && (
                          <> • MO: {session.moNumber}</>
                        )}
                      </div>
                      <div className="modern-activity-approval">
                        Status Approval: <span className={`modern-approval-badge ${session.approvalStatus.class}`}>
                          {session.approvalStatus.text}
                        </span>
                        {/* 🔥 ENHANCED: Debug info with better formatting */}
                        {process.env.NODE_ENV === 'development' && (
                          <details style={{ fontSize: '0.75rem', color: '#999', marginTop: '4px' }}>
                            <summary>Informasi</summary>
                            <div>
                              Raw Status: {session.rawStatus || 'none'}<br/>
                              Admin Status: {session.adminStatus || 'none'}<br/>
                              Operator: {session.operatorId?.substring(0, 8) || 'unknown'}
                            </div>
                          </details>
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
                      {/* 🔥 ADDED: Live indicator for active sessions */}
                      {session.rawStatus === 'in_progress' && (
                        <small className="modern-live-indicator"> LIVE</small>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="modern-no-data">
              <div className="modern-no-data-icon">📊</div>
              <h3>
                {workSessions.length === 0 && !error 
                  ? 'Memuat work sessions...' 
                  : 'Belum ada work sessions'}
              </h3>
              <p>
                {workSessions.length === 0 && !error
                  ? '🔄 Menghubungkan ke database real-time...'
                  : 'Mulai bekerja pada tugas untuk melihat aktivitas di sini.'}
              </p>
              {workSessions.length === 0 && !loading && (
                <div className="modern-no-data-actions">
                  <button 
                    onClick={() => {
                      console.log('🔄 Manual refresh work sessions');
                      if (userData.uid) {
                        loadWorkSessions(userData.uid);
                      }
                    }}
                    className="modern-refresh-btn"
                  >
                    🔄 Refresh Work Sessions
                  </button>
                  <button 
                    onClick={() => navigate('/task')}
                    className="modern-start-btn"
                  >
                    🚀 Mulai Task Baru
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* 🔥 ADDED: View all sessions link */}
          {recentWorkSessions.length > 0 && (
            <div className="modern-section-footer">
              <button 
                onClick={handleNavigateToProgress}
                className="modern-view-all-btn"
              >
                Lihat Semua Sessions ({workSessions.length}) →
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default HomePage;