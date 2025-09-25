// ProgressPageLogic.js - All logic, hooks, and data handling
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { collection, getDocs, query, where, orderBy, doc, getDoc, limit, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

// Import helper functions from TaskPage folder
import {
  STEP_STATUS,
  formatTime,
  formatStepTime,
  getStepStatusColor,
  getStepStatusText
} from '../TaskPage/TaskPageComponent';

export const useProgressPageLogic = () => {
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

  // 🔥 FIXED: Add real-time listener ref
  const [realtimeUnsubscribe, setRealtimeUnsubscribe] = useState(null);

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
      case 'in_progress': return '#20c997'; // 🔥 FIXED: Match TaskPage status
      case 'active': return '#20c997';
      default: return '#6c757d';
    }
  };

  const getProgressStatusIcon = (status) => {
    const icons = {
      approved: '✓',
      rejected: '✗',
      pending: '⏱',
      completed: '✓',
      in_progress: '▶',
      active: '▶',
      default: '⚠'
    };
    return icons[status] || icons.default;
  };

  const getProgressStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'pending': return 'Menunggu Review';
      case 'submitted': return 'Terkirim';
      case 'completed': return 'Selesai';
      case 'in_progress': return 'Sedang Dikerjakan'; // 🔥 FIXED: Match TaskPage status
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

  // 🔥 FIXED: Complete real-time listener with proper TaskPage field mapping
  const setupWorkSessionsListener = useCallback(() => {
    if (!currentUser?.uid) return;

    console.log('📊 Setting up COMPLETE real-time listener for user:', currentUser.uid);

    // Clean up existing listener first
    if (realtimeUnsubscribe) {
      console.log('🧹 Cleaning up previous listener');
      realtimeUnsubscribe();
    }

    const sessionsRef = collection(db, 'workSessions');
    
    // 🔥 FIXED: Use multiple query strategies for maximum compatibility
    let queries = [];
    
    // Strategy 1: Use operatorId (TaskPage standard)
    try {
      const q1 = query(
        sessionsRef,
        where('operatorId', '==', currentUser.uid),
        where('type', '==', 'work_session')
      );
      queries.push(q1);
    } catch (error) {
      console.warn('⚠️ operatorId query failed:', error);
    }

    // Strategy 2: Use createdBy (fallback)
    try {
      const q2 = query(
        sessionsRef,
        where('createdBy', '==', currentUser.uid),
        where('type', '==', 'work_session')
      );
      queries.push(q2);
    } catch (error) {
      console.warn('⚠️ createdBy query failed:', error);
    }

    // 🔥 FIXED: Use the first working query
    const activeQuery = queries[0] || query(
      sessionsRef,
      where('operatorId', '==', currentUser.uid)
    );

    // Setup real-time listener with COMPLETE session mapping
    const unsubscribe = onSnapshot(activeQuery, 
      (snapshot) => {
        console.log('📡 REAL-TIME UPDATE received:', snapshot.size, 'documents');
        
        const sessions = [];
        const sessionIds = new Set();

        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Skip duplicates
          if (sessionIds.has(doc.id)) {
            console.log('⚠️ Duplicate session detected:', doc.id);
            return;
          }
          sessionIds.add(doc.id);

          // 🔥 FIXED: Complete field mapping from TaskPage to ProgressPage
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
            
            // 🔥 FIXED: Admin status handling
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
          console.log(`📋 Session ${doc.id}:`, {
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

        // 🔥 FIXED: Sort by lastUpdated (most recent first)
        sessions.sort((a, b) => {
          const dateA = a.lastUpdated || a.createdAt || new Date(0);
          const dateB = b.lastUpdated || b.createdAt || new Date(0);
          return dateB - dateA;
        });

        console.log(`✅ REAL-TIME: ${sessions.length} sessions loaded and sorted`);
        console.log('📊 Session breakdown:', {
          total: sessions.length,
          active: sessions.filter(s => s.isActive).length,
          completed: sessions.filter(s => s.rawStatus === 'completed').length,
          in_progress: sessions.filter(s => s.rawStatus === 'in_progress').length
        });

        setWorkSessions(sessions);
        setLoading(false);
        setError(null); // Clear any previous errors

        // 🔥 FIXED: Auto-select completed session if redirected from task
        if (completedSessionId && fromTaskCompletion && sessions.length > 0) {
          const completedSession = sessions.find(s => s.id === completedSessionId);
          if (completedSession) {
            console.log('🎯 Auto-selecting completed session:', completedSession.workInstructionTitle);
            setSelectedSession(completedSession);
            fetchSessionDetails(completedSession);
          }
        }
      },
      (error) => {
        console.error('❌ Real-time listener error:', error);
        
        let errorMessage = 'Gagal memuat data progress secara real-time';
        
        if (error.code === 'failed-precondition') {
          errorMessage = 'Database index diperlukan. Membuat query alternatif...';
          console.error('❌ Required Firestore indexes:', {
            collection: 'workSessions',
            indexes: [
              'operatorId ASC, type ASC',
              'createdBy ASC, type ASC',
              'operatorId ASC, type ASC, lastUpdated DESC'
            ]
          });
          
          // 🔥 FALLBACK: Try simpler query without compound index
          setTimeout(() => {
            console.log('🔄 Attempting fallback query...');
            setupFallbackQuery();
          }, 1000);
          
        } else if (error.code === 'permission-denied') {
          errorMessage = 'Tidak memiliki izin untuk mengakses data real-time.';
        } else if (error.code === 'unavailable') {
          errorMessage = 'Layanan database tidak tersedia. Mencoba koneksi ulang...';
          
          // 🔥 RETRY: Attempt reconnection
          setTimeout(() => {
            console.log('🔄 Retrying real-time connection...');
            setupWorkSessionsListener();
          }, 5000);
          
        } else {
          errorMessage = `${errorMessage}: ${error.message}`;
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    );

    setRealtimeUnsubscribe(() => unsubscribe);
    return unsubscribe;
  }, [currentUser?.uid, completedSessionId, fromTaskCompletion, realtimeUnsubscribe]);

  // 🔥 ADDED: Fallback query for when compound indexes aren't available
  const setupFallbackQuery = useCallback(async () => {
    if (!currentUser?.uid) return;

    console.log('🔄 Setting up fallback query without compound index...');

    try {
      const sessionsRef = collection(db, 'workSessions');
      
      // Simple query without compound index
      const q = query(
        sessionsRef,
        where('operatorId', '==', currentUser.uid)
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          console.log('📡 FALLBACK: Real-time update received:', snapshot.size);
          
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
          
          console.log(`✅ FALLBACK: ${sessions.length} sessions loaded`);
          setWorkSessions(sessions);
          setLoading(false);
          setError(null);
        },
        (error) => {
          console.error('❌ Fallback query also failed:', error);
          setError('Tidak dapat memuat data. Silakan refresh halaman.');
        }
      );

      setRealtimeUnsubscribe(() => unsubscribe);
      
    } catch (error) {
      console.error('❌ Fallback setup failed:', error);
      setError('Tidak dapat memuat data. Silakan refresh halaman.');
    }
  }, [currentUser?.uid]);

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
        totalSteps: session.totalSteps || 0,
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

  // 🔥 FIXED: Get session status badge with proper TaskPage status mapping
  const getSessionStatusBadge = (session) => {
    const rawStatus = session.rawStatus; // TaskPage status
    const adminStatus = session.adminStatus;
    const isActive = session.isActive;

    let status, displayText;
      
    // 🔥 FIXED: Map TaskPage statuses correctly
    if (rawStatus === 'in_progress' || isActive) {
      status = 'in_progress';
      displayText = '🔄 Sedang Dikerjakan';
    } else if (rawStatus === 'completed') {
      // Use admin status if available for completed tasks
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
      status = rawStatus || 'unknown';
      displayText = `❓ ${getProgressStatusText(status)}`;
    }

    return {
      status,
      displayText,
      color: getProgressStatusBadgeColor(status)
    };
  };

  // Handle continue active session - navigate to task page with resume data
  const handleContinueActiveSession = useCallback((session) => {
    // Navigate to task page with resume session data including MO number
    navigate('/task', { 
      state: { 
        resumeSessionId: session.id,
        moNumber: session.moNumber,
        workInstructionId: session.workInstructionId,
        currentStep: session.currentStep || 0,
        stepStatuses: session.stepStatuses || [],
        totalTime: session.totalTime || 0,
        stepCompletionTimes: session.stepCompletionTimes || [],
        // Include all necessary data to resume properly
        resumeData: {
          moNumber: session.moNumber,
          workInstructionId: session.workInstructionId,
          workInstructionTitle: session.workInstructionTitle,
          currentStep: session.currentStep || 0,
          stepStatuses: session.stepStatuses || [],
          totalTime: session.totalTime || 0,
          stepCompletionTimes: session.stepCompletionTimes || [],
          sessionId: session.id
        }
      } 
    });
  }, [navigate]);

  // Handle logout
  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) {
      try {
        // Clean up real-time listener before logout
        if (realtimeUnsubscribe) {
          realtimeUnsubscribe();
          setRealtimeUnsubscribe(null);
        }

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

  // 🔥 FIXED: Setup real-time listener on component mount with proper cleanup
  useEffect(() => {
    if (currentUser) {
      console.log('🔄 Setting up COMPLETE real-time data listener...');
      const unsubscribe = setupWorkSessionsListener();
      
      // Cleanup listener on unmount or user change
      return () => {
        if (unsubscribe) {
          console.log('🧹 Cleaning up real-time listener...');
          unsubscribe();
        }
        if (realtimeUnsubscribe) {
          realtimeUnsubscribe();
          setRealtimeUnsubscribe(null);
        }
      };
    } else {
      // Clean up when user logs out
      if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
        setRealtimeUnsubscribe(null);
      }
    }
  }, [currentUser]);

  // 🔥 ADDED: Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (realtimeUnsubscribe) {
        console.log('🧹 Component unmount: cleaning up real-time listener');
        realtimeUnsubscribe();
      }
    };
  }, [realtimeUnsubscribe]);

  // Return all state and functions that the UI component needs
  return {
    // State
    workSessions,
    selectedSession,
    sessionDetails,
    loading,
    error,
    taskInstructions,
    currentUser,
    isAuthLoading,
    showDropdown,
    realtimeUnsubscribe,
    fromTaskCompletion,
    
    // Functions
    handleSessionClick,
    calculateBasicProgress,
    getSessionStatusBadge,
    handleContinueActiveSession,
    handleLogout,
    handleProfileClick,
    handleBackClick,
    formatDate,
    setupFallbackQuery,
    getProgressStatusBadgeColor,
    getProgressStatusIcon,
    getProgressStatusText,
    
    // Setters
    setShowDropdown,
    setError,
    setLoading,
    
    // Helper functions for components
    formatTime,
    STEP_STATUS,
    getStepStatusColor,
    getStepStatusText
  };
};