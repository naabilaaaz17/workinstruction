// ProgressPage.js - Enhanced with Activity History & Team Mode - FIXED TEAM OPERATOR DETECTION
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, FileText, Settings, LogOut, Calendar, ArrowLeft, X, User, Activity, Home, 
  CheckCircle2, XCircle, AlertTriangle, Clock, MessageSquare, Users, UserCheck, 
  Play, Pause, SkipForward, RotateCcw, Wrench, Eye, ChevronDown, ChevronRight 
} from 'lucide-react';
import './ProgressPage.css';
import logoLRS from '../assets/images/logoLRS.png';

// Import the logic hook
import { useProgressPageLogic } from './ProgressPageLogic';

const ProgressPage = () => {
  // 🔥 NEW: State untuk Activity History Modal dan Tab
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedActivitySession, setSelectedActivitySession] = useState(null);
  const [activeActivityTab, setActiveActivityTab] = useState('timeline'); // 'timeline' | 'participants' | 'troubleshoot'

  // Get all logic and state from the custom hook
  const {
    // State
    workSessions,
    selectedSession,
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
    
    // Helper functions
    formatTime,
    STEP_STATUS,
    getStepStatusColor,
    getStepStatusText
  } = useProgressPageLogic();

  // 🔥 FIXED: Complete function to determine session mode and get all operators
  const getSessionMode = (session) => {
    console.log('🔍 Analyzing session mode for:', session.id, {
      participants: session.participants,
      stepOperators: session.stepOperators,
      operatorId: session.operatorId,
      operatorName: session.operatorName
    });

    // Collect all unique operators from various sources
    const operators = new Set();
    const operatorDetails = new Map();
    
    // 1. Add main session operator (creator/primary)
    if (session.operatorId) {
      operators.add(session.operatorId);
      operatorDetails.set(session.operatorId, {
        userId: session.operatorId,
        userName: session.operatorName || 'Unknown Operator',
        role: 'creator',
        isActive: session.isActive || false,
        joinedAt: session.createdAt || new Date()
      });
    }

    // 2. Add from participants array (most reliable source)
    if (session.participants && Array.isArray(session.participants)) {
      session.participants.forEach(participant => {
        if (participant.userId) {
          operators.add(participant.userId);
          operatorDetails.set(participant.userId, {
            ...participant,
            role: participant.userId === session.operatorId ? 'creator' : 'participant',
            isActive: participant.isActive !== false
          });
        }
      });
    }

    // 3. Add from stepOperators (who worked on specific steps)
    if (session.stepOperators && typeof session.stepOperators === 'object') {
      Object.entries(session.stepOperators).forEach(([stepIndex, operatorData]) => {
        if (operatorData.userId) {
          operators.add(operatorData.userId);
          if (!operatorDetails.has(operatorData.userId)) {
            operatorDetails.set(operatorData.userId, {
              userId: operatorData.userId,
              userName: operatorData.userName || 'Unknown Operator',
              role: 'step_operator',
              isActive: false,
              joinedAt: operatorData.startedAt || new Date(),
              stepsWorked: [stepIndex]
            });
          } else {
            // Add step to existing operator
            const existing = operatorDetails.get(operatorData.userId);
            if (!existing.stepsWorked) existing.stepsWorked = [];
            if (!existing.stepsWorked.includes(stepIndex)) {
              existing.stepsWorked.push(stepIndex);
            }
          }
        }
      });
    }

    // 4. Add from stepStartedBy, stepCompletedBy tracking
    ['stepStartedBy', 'stepCompletedBy', 'stepSkippedBy', 'stepStoppedBy'].forEach(field => {
      if (session[field] && typeof session[field] === 'object') {
        Object.entries(session[field]).forEach(([stepIndex, data]) => {
          if (data.userId) {
            operators.add(data.userId);
            if (!operatorDetails.has(data.userId)) {
              operatorDetails.set(data.userId, {
                userId: data.userId,
                userName: data.userName || 'Unknown Operator',
                role: 'step_operator',
                isActive: false,
                joinedAt: data.startedAt || data.completedAt || data.skippedAt || data.stoppedAt || new Date(),
                stepsWorked: [stepIndex]
              });
            }
          }
        });
      }
    });

    // 5. Add from troubleshoot history
    if (session.troubleshootHistory && Array.isArray(session.troubleshootHistory)) {
      session.troubleshootHistory.forEach(entry => {
        if (entry.userId) {
          operators.add(entry.userId);
          if (!operatorDetails.has(entry.userId)) {
            operatorDetails.set(entry.userId, {
              userId: entry.userId,
              userName: entry.userName || 'Unknown Operator',
              role: 'troubleshooter',
              isActive: false,
              joinedAt: new Date(entry.timestamp)
            });
          }
        }
      });
    }

    const participantCount = operators.size;
    const isTeamMode = participantCount > 1;
    
    console.log('✅ Session mode analysis complete:', {
      sessionId: session.id,
      totalOperators: participantCount,
      operatorIds: Array.from(operators),
      isTeamMode,
      operatorDetails: Array.from(operatorDetails.values())
    });
    
    return {
      mode: isTeamMode ? 'team' : 'individual',
      participantCount,
      operators: Array.from(operatorDetails.values()),
      label: isTeamMode ? `Tim (${participantCount})` : 'Individu',
      icon: isTeamMode ? '👥' : '👤',
      isTeamMode
    };
  };

  // 🔥 FIXED: Enhanced function to generate comprehensive activity timeline with all operators
  const generateActivityTimeline = (session) => {
    console.log('📊 Generating activity timeline for session:', session.id);
    const activities = [];
    
    // 1. Session creation
    if (session.createdAt) {
      activities.push({
        id: `created_${session.id}`,
        timestamp: session.createdAt,
        type: 'session_created',
        icon: '🆕',
        title: 'Session Dibuat',
        description: `Session dimulai oleh ${session.operatorName || 'operator'}`,
        userId: session.operatorId || session.createdBy,
        userName: session.operatorName || 'Unknown Operator',
        stepIndex: null
      });
    }

    // 2. Participant join activities - FIXED: More comprehensive detection
    if (session.participants && Array.isArray(session.participants)) {
      session.participants.forEach((participant, index) => {
        if (participant.joinedAt) {
          activities.push({
            id: `joined_${participant.userId}_${index}`,
            timestamp: participant.joinedAt,
            type: 'participant_joined',
            icon: '🤝',
            title: 'Operator Bergabung',
            description: `${participant.userName || 'Unknown'} bergabung ke session`,
            userId: participant.userId,
            userName: participant.userName || 'Unknown',
            stepIndex: null,
            isCreator: participant.userId === session.createdBy || participant.userId === session.operatorId
          });
        }

        if (participant.leftAt) {
          activities.push({
            id: `left_${participant.userId}_${index}`,
            timestamp: participant.leftAt,
            type: 'participant_left',
            icon: '👋',
            title: 'Operator Keluar',
            description: `${participant.userName || 'Unknown'} keluar dari session`,
            userId: participant.userId,
            userName: participant.userName || 'Unknown',
            stepIndex: null
          });
        }

        if (participant.rejoinedAt) {
          activities.push({
            id: `rejoined_${participant.userId}_${index}`,
            timestamp: participant.rejoinedAt,
            type: 'participant_rejoined',
            icon: '🔄',
            title: 'Operator Bergabung Kembali',
            description: `${participant.userName || 'Unknown'} bergabung kembali`,
            userId: participant.userId,
            userName: participant.userName || 'Unknown',
            stepIndex: null
          });
        }
      });
    }

    // 3. Step activities from detailed tracking data - FIXED: Handle all tracking fields
    const stepTrackingFields = {
      stepStartedBy: { icon: '▶️', title: 'Dimulai', action: 'memulai langkah kerja' },
      stepCompletedBy: { icon: '✅', title: 'Selesai', action: 'menyelesaikan langkah' },
      stepSkippedBy: { icon: '⭐', title: 'Dilewati', action: 'melewati langkah' },
      stepStoppedBy: { icon: '⏸️', title: 'Dihentikan', action: 'menghentikan langkah' }
    };

    Object.entries(stepTrackingFields).forEach(([field, config]) => {
      if (session[field] && typeof session[field] === 'object') {
        Object.entries(session[field]).forEach(([stepIndex, data]) => {
          if (data.userId) {
            const activityId = `${field}_${stepIndex}_${data.userId}`;
            const timestamp = data.startedAt || data.completedAt || data.skippedAt || data.stoppedAt || new Date();
            
            let description = `${data.userName || 'Unknown'} ${config.action}`;
            
            // Add additional context based on field
            if (field === 'stepCompletedBy' && data.completionTime) {
              description += ` (${formatTime(data.completionTime)})`;
            } else if (field === 'stepSkippedBy' && data.reason) {
              description += `: ${data.reason}`;
            } else if (field === 'stepStoppedBy' && data.stoppedAtTime) {
              description += ` pada ${formatTime(data.stoppedAtTime)}`;
            }
            
            activities.push({
              id: activityId,
              timestamp: timestamp,
              type: field.replace('By', '').toLowerCase(),
              icon: config.icon,
              title: `Step ${parseInt(stepIndex) + 1} ${config.title}`,
              description: description,
              userId: data.userId,
              userName: data.userName || 'Unknown',
              stepIndex: parseInt(stepIndex),
              completionTime: data.completionTime,
              reason: data.reason,
              stoppedAtTime: data.stoppedAtTime
            });
          }
        });
      }
    });

    // 4. Troubleshoot activities - FIXED: Enhanced tracking
    if (session.troubleshootHistory && Array.isArray(session.troubleshootHistory)) {
      session.troubleshootHistory.forEach((entry, index) => {
        activities.push({
          id: `troubleshoot_${entry.id || index}`,
          timestamp: new Date(entry.timestamp),
          type: 'troubleshoot',
          icon: '🔧',
          title: `Troubleshoot Step ${(entry.stepIndex || 0) + 1}`,
          description: entry.description || 'Troubleshoot dilakukan',
          userId: entry.userId,
          userName: entry.userName || 'Unknown',
          stepIndex: entry.stepIndex || 0,
          solution: entry.solution,
          category: entry.category
        });
      });
    }

    // 5. Session completion
    if (session.completedAt) {
      activities.push({
        id: `completed_${session.id}`,
        timestamp: session.completedAt,
        type: 'session_completed',
        icon: '🎉',
        title: 'Session Selesai',
        description: `Session diselesaikan oleh ${session.operatorName || 'operator'}`,
        userId: session.operatorId,
        userName: session.operatorName || 'Unknown',
        stepIndex: null,
        efficiency: session.finalEfficiency
      });
    }

    // 6. Reset activities if any
    if (session.resetBy && typeof session.resetBy === 'object') {
      Object.entries(session.resetBy).forEach(([resetId, data]) => {
        activities.push({
          id: `reset_${resetId}`,
          timestamp: data.resetAt,
          type: 'session_reset',
          icon: '🔄',
          title: 'Session Reset',
          description: `${data.userName || 'Unknown'} mereset session`,
          userId: data.userId,
          userName: data.userName || 'Unknown',
          stepIndex: null
        });
      });
    }

    // Sort by timestamp and remove duplicates
    const uniqueActivities = activities.filter((activity, index, arr) => {
      return arr.findIndex(a => a.id === activity.id) === index;
    }).sort((a, b) => {
      const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : a.timestamp?.getTime() || 0;
      const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : b.timestamp?.getTime() || 0;
      return timeA - timeB;
    });

    console.log(`📈 Generated ${uniqueActivities.length} timeline activities for session ${session.id}`);
    return uniqueActivities;
  };

  // 🔥 NEW: Memoized activity timeline
  const activityTimeline = useMemo(() => {
    return selectedActivitySession ? generateActivityTimeline(selectedActivitySession) : [];
  }, [selectedActivitySession]);

  // 🔥 NEW: Function to open activity modal
  const handleShowActivityHistory = (session) => {
    console.log('📊 Opening activity history for session:', session.id);
    setSelectedActivitySession(session);
    setShowActivityModal(true);
    setActiveActivityTab('timeline');
  };

  // 🔥 FIXED: Enhanced function to get participant statistics with better operator detection
  const getParticipantStats = (session) => {
    console.log('📊 Calculating participant stats for session:', session.id);
    
    const sessionMode = getSessionMode(session);
    const operators = sessionMode.operators;
    
    return operators.map(operator => {
      // Count activities by this operator from timeline
      const operatorActivities = activityTimeline.filter(activity => 
        activity.userId === operator.userId
      );

      const stepsStarted = operatorActivities.filter(a => a.type === 'step_started').length;
      const stepsCompleted = operatorActivities.filter(a => a.type === 'step_completed').length;
      const stepsSkipped = operatorActivities.filter(a => a.type === 'step_skipped').length;
      const stepsStopped = operatorActivities.filter(a => a.type === 'step_stopped').length;
      const troubleshoots = operatorActivities.filter(a => a.type === 'troubleshoot').length;

      // Calculate total work time if available
      let totalWorkTime = 0;
      operatorActivities.filter(a => a.type === 'step_completed' && a.completionTime).forEach(activity => {
        totalWorkTime += activity.completionTime;
      });

      return {
        ...operator,
        stats: {
          stepsStarted,
          stepsCompleted,
          stepsSkipped,
          stepsStopped,
          troubleshoots,
          totalActivities: operatorActivities.length,
          totalWorkTime,
          stepsWorked: operator.stepsWorked || []
        }
      };
    });
  };

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
            onClick={handleBackClick}
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
              onClick={handleBackClick}
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
          <p>🔄 Menghubungkan real-time data...</p>
        </div>
      </div>
    );
  }

  // Render error state with retry options
  if (error) {
    return (
      <div className="progress-page">
        <div className="progress-error-container">
          <h2>⚠️ Terjadi Kesalahan</h2>
          <p>{error}</p>
          <div className="progress-error-actions">
            <button 
              onClick={() => {
                setError(null);
                setLoading(true);
                setupFallbackQuery();
              }} 
              className="progress-fallback-button"
            >
              🔄 Mode Kompatibilitas
            </button>
            <Link to="/task" className="progress-start-new-button">
              ➕ Mulai Task Baru
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
            onClick={handleBackClick}
          />
        </div>
        
        <div className="progress-header-center">
          <h1 className="progress-title-header">Log Progress</h1>
          {fromTaskCompletion && (
            <p className="progress-completion-notice">🎉 Task baru saja diselesaikan!</p>
          )}
          {/* 🔥 ADDED: Real-time status indicator */}
          <div className="progress-realtime-status">
            {realtimeUnsubscribe ? (
              <span className="progress-realtime-active">
                🟢 Real-time aktif • Auto-update
              </span>
            ) : (
              <span className="progress-realtime-inactive">
                🟡 Mode statis • Refresh manual
              </span>
            )}
          </div>
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
            <div className="progress-sessions-header">
              <h2>Riwayat Sessions ({workSessions.length})</h2>
              {/* 🔥 ADDED: Session breakdown stats */}
              <div className="progress-sessions-stats">
                <span className="progress-stat-item">
                  🔄 Aktif: {workSessions.filter(s => s.isActive).length}
                </span>
                <span className="progress-stat-item">
                  ✅ Selesai: {workSessions.filter(s => s.rawStatus === 'completed').length}
                </span>
              </div>
              {/* 🔥 ADDED: Manual refresh button */}
              <button 
                onClick={() => {
                  console.log('🔄 Manual refresh requested');
                  if (realtimeUnsubscribe) {
                    // setupWorkSessionsListener(); // Will be available from logic hook
                  } else {
                    setupFallbackQuery();
                  }
                }}
                className="progress-refresh-btn"
                title="Refresh data"
              >
                🔄 Refresh
              </button>
            </div>
            
            {workSessions.length === 0 ? (
              <div className="progress-no-sessions">
                <div className="progress-empty-state-icon">📋</div>
                <h3>Belum Ada Sessions</h3>
                <p>Anda belum memiliki riwayat progress task.</p>
                <p>Mulai mengerjakan task pertama Anda!</p>
                <Link to="/task" className="progress-start-task-button">
                  🚀 Mulai Task Pertama
                </Link>
              </div>
            ) : (
              <div className="progress-sessions-list">
                {workSessions.map((session) => {
                  const progress = calculateBasicProgress(session);
                  const isSelected = selectedSession?.id === session.id;
                  const statusBadge = getSessionStatusBadge(session);
                  // 🔥 FIXED: Get session mode with enhanced operator detection
                  const sessionMode = getSessionMode(session);
                  
                  console.log(`🔍 Session ${session.id} mode analysis:`, {
                    mode: sessionMode.mode,
                    participantCount: sessionMode.participantCount,
                    operatorCount: sessionMode.operators.length,
                    isTeamMode: sessionMode.isTeamMode
                  });
                  
                  return (
                    <div
                      key={session.id}
                      className={`progress-session-item ${isSelected ? 'selected' : ''} ${session.isActive ? 'active-session' : ''}`}
                      onClick={() => handleSessionClick(session)}
                    >
                      <div className="progress-session-header">
                        <h4>{session.workInstructionTitle || 'Untitled Task'}</h4>
                        <span 
                          className="progress-status-badge" 
                          style={{ 
                            backgroundColor: `${statusBadge.color}20`,
                            color: statusBadge.color,
                            border: `1px solid ${statusBadge.color}40`
                          }}
                        >
                          {statusBadge.displayText}
                        </span>
                        {/* 🔥 ADDED: Active session indicator */}
                        {session.isActive && (
                          <span className="progress-active-indicator" title="Session sedang aktif">
                            🔴 LIVE
                          </span>
                        )}
                      </div>

                      {/* Display MO Number */}
                      <div className="progress-session-mo">
                        <span className="progress-mo-label">MO:</span>
                        <span className="progress-mo-number">{session.moNumber}</span>
                      </div>

                      {/* 🔥 FIXED: Enhanced Session Mode Label with complete operator count */}
                      <div className="progress-session-mode">
                        <span className="progress-mode-label">Mode:</span>
                        <span className={`progress-mode-badge ${sessionMode.mode}`}>
                          <span className="progress-mode-icon">{sessionMode.icon}</span>
                          <span className="progress-mode-text">{sessionMode.label}</span>
                          {sessionMode.isTeamMode && (
                            <span className="progress-operators-count" title={`${sessionMode.operators.length} operator terlibat`}>
                              • {sessionMode.operators.length} ops
                            </span>
                          )}
                        </span>
                      </div>
                      
                      <div className="progress-session-info">
                        <div className="progress-session-progress">
                          <div className="progress-progress-bar">
                            <div 
                              className="progress-progress-fill" 
                              style={{ 
                                width: `${progress.completionRate}%`,
                                backgroundColor: session.isActive ? '#20c997' : '#6f42c1'
                              }}
                            />
                          </div>
                          <span>
                            {progress.completedSteps}/{progress.totalSteps} langkah
                            {session.isActive && session.currentStep !== undefined && (
                              <small> • Saat ini: Step {session.currentStep + 1}</small>
                            )}
                          </span>
                        </div>
                        
                        <div className="progress-session-time">
                          <span>⏱️ {formatTime(session.totalTime || 0)}</span>
                        </div>
                      </div>
                      
                      <div className="progress-session-date">
                        {session.lastUpdated ? (
                          <small>
                            {session.isActive ? 'Terakhir aktif: ' : 'Dibuat: '}
                            {session.lastUpdated.toLocaleDateString('id-ID', {
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

                      {/* 🔥 ENHANCED: Quick Action for Active Sessions with better UX */}
                      {session.isActive && (
                        <div className="progress-session-action">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContinueActiveSession(session);
                            }}
                            className="progress-continue-quick-btn"
                            title={`Lanjutkan dari Step ${session.currentStep + 1}`}
                          >
                            ▶️ Lanjutkan Step {session.currentStep + 1}
                          </button>
                        </div>
                      )}

                      {/* 🔥 NEW: Activity History Button */}
                      <div className="progress-session-activity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowActivityHistory(session);
                          }}
                          className="progress-activity-btn"
                          title="Lihat riwayat aktivitas"
                        >
                          <Activity size={16} />
                          <span>Riwayat Aktivitas</span>
                        </button>
                      </div>

                      {/* 🔥 ENHANCED: Team indicator with complete operator list */}
                      {sessionMode.isTeamMode && (
                        <div className="progress-session-team">
                          <small>
                            👥 Tim ({sessionMode.participantCount} operator)
                            {sessionMode.operators.length > 0 && (
                              <div className="progress-team-preview">
                                {sessionMode.operators.slice(0, 3).map((op, idx) => (
                                  <span key={idx} className="progress-team-member-mini" title={op.userName}>
                                    {op.userName.charAt(0).toUpperCase()}
                                  </span>
                                ))}
                                {sessionMode.operators.length > 3 && (
                                  <span className="progress-team-more">+{sessionMode.operators.length - 3}</span>
                                )}
                              </div>
                            )}
                          </small>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session Details - Right Side */}
          <div className='wrapper'>
            <div className="progress-details-section">
              {selectedSession ? (
                <div className="progress-session-detail">
                  <div className="progress-detail-header">
                    <h3>{selectedSession.workInstructionTitle || 'Untitled Task'}</h3>
                    {(() => {
                      const statusBadge = getSessionStatusBadge(selectedSession);
                      const sessionMode = getSessionMode(selectedSession);
                      
                      return (
                        <div className="progress-detail-badges">
                          <span 
                            className="progress-status-badge" 
                            style={{ 
                              backgroundColor: `${statusBadge.color}20`,
                              color: statusBadge.color,
                              border: `1px solid ${statusBadge.color}40`
                            }}
                          >
                            {statusBadge.displayText}
                          </span>
                          {/* 🔥 ENHANCED: Mode badge in detail header with operator count */}
                          <span className={`progress-mode-badge ${sessionMode.mode}`}>
                            <span className="progress-mode-icon">{sessionMode.icon}</span>
                            <span className="progress-mode-text">{sessionMode.label}</span>
                            {sessionMode.isTeamMode && (
                              <small className="progress-operators-detail">
                                ({sessionMode.operators.length} operator)
                              </small>
                            )}
                          </span>
                        </div>
                      );
                    })()}
                    {/* 🔥 ADDED: Real-time update indicator */}
                    {selectedSession.isActive && (
                      <div className="progress-realtime-indicator">
                        <span className="progress-pulse-dot"></span>
                      </div>
                    )}
                  </div>

                  <div className="progress-detail-content">
                    {/* 🔥 ENHANCED: Status with more detail */}
                    <div className="progress-detail-item">
                      <label>Status Detail:</label>
                      <div className="progress-status-detail">
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: getProgressStatusBadgeColor(selectedSession.adminStatus || selectedSession.rawStatus)
                        }}>
                          <span>{getProgressStatusIcon(selectedSession.adminStatus || selectedSession.rawStatus)}</span>
                          <span style={{ fontWeight: 'bold' }}>
                            {getProgressStatusText(selectedSession.adminStatus || selectedSession.rawStatus)}
                          </span>
                        </div>
                        {selectedSession.isActive && (
                          <small className="progress-status-note">
                            📍 Sedang di Step {selectedSession.currentStep + 1}
                            {(() => {
                              const sessionMode = getSessionMode(selectedSession);
                              if (sessionMode.isTeamMode) {
                                const activeOps = sessionMode.operators.filter(op => op.isActive).length;
                                return <> • Operator aktif: {activeOps}/{sessionMode.operators.length}</>;
                              }
                              return null;
                            })()}
                          </small>
                        )}
                      </div>
                    </div>

                    {/* Progress with enhanced visualization */}
                    <div className="progress-detail-item">
                      <label>Progress Lengkap:</label>
                      {(() => {
                        const progress = calculateBasicProgress(selectedSession);
                        return (
                          <div>
                            <div className="progress-progress-bar" style={{ marginBottom: '8px', height: '12px' }}>
                              <div
                                className="progress-progress-fill"
                                style={{ 
                                  width: `${progress.completionRate}%`,
                                  backgroundColor: selectedSession.isActive ? '#20c997' : '#6f42c1',
                                  transition: 'width 0.3s ease'
                                }}
                              />
                            </div>
                            <div className="progress-stats-row">
                              <span>{progress.completedSteps}/{progress.totalSteps} langkah ({progress.completionRate.toFixed(1)}%)</span>
                              {selectedSession.stepStatuses && (
                                <span className="progress-step-breakdown">
                                  ✅ {selectedSession.stepStatuses.filter(s => s === STEP_STATUS.COMPLETED).length} • 
                                  ⭐ {selectedSession.stepStatuses.filter(s => s === STEP_STATUS.SKIPPED).length} • 
                                  ⏸️ {selectedSession.stepStatuses.filter(s => s === STEP_STATUS.PENDING).length}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* 🔥 ENHANCED: Time tracking with efficiency */}
                    <div className="progress-detail-item">
                      <label>Waktu & Efisiensi:</label>
                      <div className="progress-time-stats">
                        <div className="progress-time-main">
                          <span>⏱️ Total: {formatTime(selectedSession.totalTime || 0)}</span>
                          {selectedSession.totalTargetTime > 0 && (
                            <>
                              <span>🎯 Target: {formatTime(selectedSession.totalTargetTime)}</span>
                              <span className={`progress-efficiency ${
                                selectedSession.totalTime <= selectedSession.totalTargetTime ? 'positive' : 'negative'
                              }`}>
                                {selectedSession.totalTargetTime > 0 ? 
                                  `${((selectedSession.totalTargetTime - selectedSession.totalTime) / selectedSession.totalTargetTime * 100).toFixed(1)}%` :
                                  'N/A'
                                }
                              </span>
                            </>
                          )}
                        </div>
                        {selectedSession.isActive && (
                          <small className="progress-time-note">
                            🔄 Timer berjalan • Update real-time
                          </small>
                        )}
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="progress-detail-item">
                      <label>Timeline:</label>
                      <div className="progress-timeline">
                        <div>📅 Dimulai: {formatDate(selectedSession.createdAt)}</div>
                        {selectedSession.lastUpdated && selectedSession.lastUpdated !== selectedSession.createdAt && (
                          <div>🔄 Terakhir update: {
                            selectedSession.lastUpdated.toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          }</div>
                        )}
                        {selectedSession.completedAt && (
                          <div>✅ Diselesaikan: {formatDate(selectedSession.completedAt)}</div>
                        )}
                      </div>
                    </div>

                    {/* 🔥 ENHANCED: Complete team information with all operators */}
                    {(() => {
                      const sessionMode = getSessionMode(selectedSession);
                      if (sessionMode.isTeamMode && sessionMode.operators.length > 0) {
                        return (
                          <div className="progress-detail-item">
                            <label>Tim Operator ({sessionMode.operators.length}):</label>
                            <div className="progress-team-info">
                              {sessionMode.operators.map((operator, index) => (
                                <div key={operator.userId || index} className="progress-team-member">
                                  <div className="progress-member-header">
                                    <span className="progress-member-name">
                                      👤 {operator.userName || 'Unknown'}
                                      {operator.role === 'creator' && ' 👑'}
                                      {operator.userId === selectedSession.operatorId && ' (Lead)'}
                                      {operator.isActive ? ' 🟢' : ' 🔘'}
                                    </span>
                                    <span className="progress-member-role">
                                      {operator.role === 'creator' ? 'Koordinator' : 
                                       operator.role === 'participant' ? 'Anggota Tim' :
                                       operator.role === 'step_operator' ? 'Step Operator' :
                                       operator.role === 'troubleshooter' ? 'Troubleshooter' : 'Operator'}
                                    </span>
                                  </div>
                                  <div className="progress-member-details">
                                    <small>
                                      {operator.isActive ? '🟢 Aktif' : '🔘 Offline'} • 
                                      Bergabung: {(() => {
                                        const joinDate = operator.joinedAt instanceof Date ? operator.joinedAt :
                                                        operator.joinedAt?.toDate ? operator.joinedAt.toDate() :
                                                        new Date(operator.joinedAt);
                                        return joinDate.toLocaleDateString('id-ID');
                                      })()}
                                      {operator.stepsWorked && operator.stepsWorked.length > 0 && (
                                        <> • Steps: {operator.stepsWorked.map(s => parseInt(s) + 1).join(', ')}</>
                                      )}
                                    </small>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Admin Feedback */}
                    {selectedSession.adminComment && (
                      <div className="progress-detail-item">
                        <label>Feedback Admin:</label>
                        <div className="progress-admin-comment">
                          <div className="progress-comment-content">
                            <p>{selectedSession.adminComment}</p>
                          </div>
                          {selectedSession.adminName && (
                            <div className="progress-admin-info">
                              <span>👤 Oleh: <strong>{selectedSession.adminName}</strong></span>
                              {selectedSession.reviewedAt && (
                                <span>📅 pada {formatDate(selectedSession.reviewedAt)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 🔥 ENHANCED: Step Summary with real-time current step highlight */}
                    {selectedSession.stepStatuses && Array.isArray(selectedSession.stepStatuses) && (
                      <div className="progress-detail-item">
                        <label>Ringkasan Langkah:</label>
                        <div className="progress-steps-preview">
                          {selectedSession.stepStatuses.slice(0, 8).map((status, index) => {
                            const taskData = taskInstructions[selectedSession.workInstructionId];
                            const stepData = taskData?.steps?.[index];
                            const stepTime = selectedSession.stepCompletionTimes?.[index] || 0;
                            const isCurrentStep = selectedSession.isActive && selectedSession.currentStep === index;
            
                            return (
                              <div 
                                key={index} 
                                className={`progress-step-preview-item ${isCurrentStep ? 'current-step' : ''}`}
                              >
                                <span className="progress-step-number">
                                  {isCurrentStep ? '🎯' : `${index + 1}.`}
                                </span>
                                <span className="progress-step-name">
                                  {stepData?.title || `Langkah ${index + 1}`}
                                </span>
                                <div className="progress-step-status-info">
                                  <span
                                    className="progress-step-status-mini"
                                    style={{ color: getStepStatusColor(status) }}
                                    title={getStepStatusText(status)}
                                  >
                                    {status === STEP_STATUS.COMPLETED ? '✔' :
                                     status === STEP_STATUS.SKIPPED ? '⊘' :
                                     status === STEP_STATUS.IN_PROGRESS ? '▶️' : '◯'}
                                  </span>
                                  {stepTime > 0 && (
                                    <small className="progress-step-time">
                                      {formatTime(stepTime)}
                                    </small>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {selectedSession.stepStatuses.length > 8 && (
                            <div className="progress-steps-more">
                              +{selectedSession.stepStatuses.length - 8} langkah lainnya
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 🔥 ADDED: Troubleshoot history if available */}
                    {selectedSession.troubleshootHistory && selectedSession.troubleshootHistory.length > 0 && (
                      <div className="progress-detail-item">
                        <label>Riwayat Troubleshoot ({selectedSession.troubleshootHistory.length}):</label>
                        <details className="progress-troubleshoot-details">
                          <summary>Lihat detail troubleshoot</summary>
                          <div className="progress-troubleshoot-list">
                            {selectedSession.troubleshootHistory.slice(0, 5).map((entry, index) => (
                              <div key={index} className="progress-troubleshoot-item">
                                <div className="progress-troubleshoot-header">
                                  <span>🔧 Step {(entry.stepIndex || 0) + 1}</span>
                                  <span className="progress-troubleshoot-time">
                                    {new Date(entry.timestamp).toLocaleString('id-ID')}
                                  </span>
                                </div>
                                <p className="progress-troubleshoot-desc">{entry.description}</p>
                                {entry.solution && (
                                  <p className="progress-troubleshoot-solution">
                                    💡 Solusi: {entry.solution}
                                  </p>
                                )}
                                <div className="progress-troubleshoot-user">
                                  👤 {entry.userName || 'Unknown'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>

                  {/* 🔥 ENHANCED: Action Buttons with better UX */}
                  <div className="progress-detail-actions">
                    {selectedSession.isActive ? (
                      <div className="progress-active-actions">
                        <button
                          onClick={() => handleContinueActiveSession(selectedSession)}
                          className="progress-action-btn progress-continue-btn"
                        >
                          🚀 Lanjutkan dari Step {selectedSession.currentStep + 1}
                        </button>
                        <button
                          onClick={() => handleShowActivityHistory(selectedSession)}
                          className="progress-action-btn progress-activity-btn"
                        >
                          📊 Lihat Riwayat Aktivitas
                        </button>
                        <div className="progress-active-note">
                          <small>
                            💡 Session ini masih aktif dan dapat dilanjutkan kapan saja
                          </small>
                        </div>
                      </div>
                    ) : (
                      <div className="progress-completed-actions">
                        <button
                          onClick={handleBackClick}
                          className="progress-action-btn progress-new-task-btn"
                        >
                          ➕ Mulai Task Baru
                        </button>
                        <button
                          onClick={() => handleShowActivityHistory(selectedSession)}
                          className="progress-action-btn progress-activity-btn"
                        >
                          📊 Lihat Riwayat Aktivitas
                        </button>
                        {selectedSession.rawStatus === 'completed' && (
                          <div className="progress-completed-note">
                            <small>
                              ✅ Session ini telah selesai • 
                              Status: {getProgressStatusText(selectedSession.adminStatus || 'pending')}
                            </small>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="progress-no-selection">
                  <div className="progress-no-selection-content">
                    <div className="progress-no-selection-icon">📋</div>
                    <h3>Pilih Session untuk Detail</h3>
                    <p>Klik pada salah satu session di sebelah kiri untuk melihat informasi lengkapnya.</p>
                    {workSessions.length === 0 && (
                      <div className="progress-empty-state">
                        <p>Belum ada session yang tersedia.</p>
                        <Link to="/task" className="progress-start-first-btn">
                          🚀 Mulai Task Pertama
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

      {/* 🔥 ENHANCED: Activity History Modal with complete operator tracking */}
      {showActivityModal && selectedActivitySession && (
        <div className="modal-overlay activity-modal-overlay" onClick={() => setShowActivityModal(false)}>
          <div className="modal-content activity-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="activity-modal-header">
              <div className="activity-modal-title">
                <Activity className="activity-modal-icon" />
                <div>
                  <h3>Riwayat Aktivitas</h3>
                  <p className="activity-modal-subtitle">
                    {selectedActivitySession.workInstructionTitle} • MO: {selectedActivitySession.moNumber}
                    {(() => {
                      const sessionMode = getSessionMode(selectedActivitySession);
                      if (sessionMode.isTeamMode) {
                        return ` • Tim (${sessionMode.operators.length} operator)`;
                      }
                      return ' • Individual';
                    })()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowActivityModal(false)}
                className="activity-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="activity-tabs">
              <button
                className={`activity-tab ${activeActivityTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setActiveActivityTab('timeline')}
              >
                <Clock size={16} />
                Timeline ({activityTimeline.length})
              </button>
              <button
                className={`activity-tab ${activeActivityTab === 'participants' ? 'active' : ''}`}
                onClick={() => setActiveActivityTab('participants')}
              >
                <Users size={16} />
                Partisipan ({(() => {
                  const sessionMode = getSessionMode(selectedActivitySession);
                  return sessionMode.operators.length;
                })()})
              </button>
              <button
                className={`activity-tab ${activeActivityTab === 'troubleshoot' ? 'active' : ''}`}
                onClick={() => setActiveActivityTab('troubleshoot')}
              >
                <Wrench size={16} />
                Troubleshoot ({selectedActivitySession.troubleshootHistory?.length || 0})
              </button>
            </div>

            {/* Tab Content */}
            <div className="activity-modal-body">
              {/* Timeline Tab */}
              {activeActivityTab === 'timeline' && (
                <div className="activity-timeline-tab">
                  {activityTimeline.length === 0 ? (
                    <div className="activity-empty-state">
                      <Clock className="activity-empty-icon" />
                      <p>Tidak ada aktivitas yang tercatat</p>
                    </div>
                  ) : (
                    <div className="activity-timeline">
                      {activityTimeline.map((activity) => (
                        <div key={activity.id} className={`activity-timeline-item ${activity.type}`}>
                          <div className="activity-timeline-marker">
                            <span className="activity-icon">{activity.icon}</span>
                          </div>
                          <div className="activity-timeline-content">
                            <div className="activity-timeline-header">
                              <h4>{activity.title}</h4>
                              <span className="activity-timestamp">
                                {(() => {
                                  const timestamp = activity.timestamp?.toDate ? activity.timestamp.toDate() : activity.timestamp;
                                  return timestamp instanceof Date 
                                    ? timestamp.toLocaleString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                      })
                                    : 'Waktu tidak diketahui';
                                })()}
                              </span>
                            </div>
                            <p className="activity-description">{activity.description}</p>
                            
                            {/* Additional info based on activity type */}
                            {activity.type === 'step_completed' && activity.completionTime && (
                              <div className="activity-extra-info">
                                <span className="activity-completion-time">
                                  ⏱️ Waktu penyelesaian: {formatTime(activity.completionTime)}
                                </span>
                              </div>
                            )}
                            
                            {activity.type === 'step_skipped' && activity.reason && (
                              <div className="activity-extra-info">
                                <span className="activity-skip-reason">
                                  💭 Alasan: {activity.reason}
                                </span>
                              </div>
                            )}

                            {activity.type === 'troubleshoot' && (
                              <div className="activity-troubleshoot-info">
                                {activity.category && (
                                  <span className="activity-troubleshoot-category">
                                    🏷️ Kategori: {activity.category}
                                  </span>
                                )}
                                {activity.solution && (
                                  <div className="activity-troubleshoot-solution">
                                    💡 Solusi: {activity.solution}
                                  </div>
                                )}
                              </div>
                            )}

                            {activity.type === 'session_completed' && activity.efficiency && (
                              <div className="activity-extra-info">
                                <span className="activity-efficiency">
                                  📈 Efisiensi: {activity.efficiency.toFixed(1)}%
                                </span>
                              </div>
                            )}

                            {activity.userName && (
                              <div className="activity-user-info">
                                <UserCheck size={14} />
                                <span>{activity.userName}</span>
                                {activity.stepIndex !== null && (
                                  <span className="activity-step-badge">Step {activity.stepIndex + 1}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 🔥 ENHANCED: Participants Tab with complete operator statistics */}
              {activeActivityTab === 'participants' && (
                <div className="activity-participants-tab">
                  {(() => {
                    const participantStats = getParticipantStats(selectedActivitySession);
                    return (
                      <div className="participants-list">
                        {participantStats.length === 0 ? (
                          <div className="activity-empty-state">
                            <Users className="activity-empty-icon" />
                            <p>Tidak ada data partisipan</p>
                          </div>
                        ) : (
                          participantStats.map((participant, index) => (
                            <div key={participant.userId || index} className="participant-card">
                              <div className="participant-header">
                                <div className="participant-avatar">
                                  <span>{(participant.userName || 'U').charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="participant-info">
                                  <h4>{participant.userName || 'Unknown User'}</h4>
                                  <div className="participant-badges">
                                    {participant.role === 'creator' && (
                                      <span className="participant-badge creator">👑 Koordinator</span>
                                    )}
                                    {participant.userId === selectedActivitySession.operatorId && (
                                      <span className="participant-badge lead">🎯 Lead</span>
                                    )}
                                    <span className={`participant-badge status ${participant.isActive ? 'active' : 'inactive'}`}>
                                      {participant.isActive ? '🟢 Aktif' : '🔘 Offline'}
                                    </span>
                                    <span className="participant-badge role">
                                      {participant.role === 'creator' ? 'Koordinator' : 
                                       participant.role === 'participant' ? 'Anggota' :
                                       participant.role === 'step_operator' ? 'Step Operator' :
                                       participant.role === 'troubleshooter' ? 'Troubleshooter' : 'Operator'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* 🔥 ENHANCED: Activity Statistics */}
                              <div className="participant-stats">
                                <div className="participant-stats-grid">
                                  <div className="participant-stat">
                                    <span className="stat-label">▶️ Dimulai</span>
                                    <span className="stat-value">{participant.stats.stepsStarted}</span>
                                  </div>
                                  <div className="participant-stat">
                                    <span className="stat-label">✅ Selesai</span>
                                    <span className="stat-value">{participant.stats.stepsCompleted}</span>
                                  </div>
                                  <div className="participant-stat">
                                    <span className="stat-label">⭐ Skip</span>
                                    <span className="stat-value">{participant.stats.stepsSkipped}</span>
                                  </div>
                                  <div className="participant-stat">
                                    <span className="stat-label">⏸️ Stop</span>
                                    <span className="stat-value">{participant.stats.stepsStopped}</span>
                                  </div>
                                  <div className="participant-stat">
                                    <span className="stat-label">🔧 Troubleshoot</span>
                                    <span className="stat-value">{participant.stats.troubleshoots}</span>
                                  </div>
                                  <div className="participant-stat">
                                    <span className="stat-label">📊 Total Aktivitas</span>
                                    <span className="stat-value">{participant.stats.totalActivities}</span>
                                  </div>
                                </div>
                                
                                {/* Work Time Summary */}
                                {participant.stats.totalWorkTime > 0 && (
                                  <div className="participant-work-time">
                                    <span className="work-time-label">⏱️ Total Waktu Kerja:</span>
                                    <span className="work-time-value">{formatTime(participant.stats.totalWorkTime)}</span>
                                  </div>
                                )}

                                {/* Steps Worked */}
                                {participant.stats.stepsWorked && participant.stats.stepsWorked.length > 0 && (
                                  <div className="participant-steps-worked">
                                    <span className="steps-worked-label">🎯 Steps Dikerjakan:</span>
                                    <div className="steps-worked-list">
                                      {participant.stats.stepsWorked.map(stepIndex => (
                                        <span key={stepIndex} className="step-worked-badge">
                                          Step {parseInt(stepIndex) + 1}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="participant-timeline">
                                <div className="participant-join-info">
                                  <span>📅 Bergabung: {(() => {
                                    const joinDate = participant.joinedAt instanceof Date ? participant.joinedAt :
                                                    participant.joinedAt?.toDate ? participant.joinedAt.toDate() :
                                                    new Date(participant.joinedAt);
                                    return joinDate.toLocaleDateString('id-ID');
                                  })()}</span>
                                  {participant.leftAt && (
                                    <span>👋 Keluar: {(() => {
                                      const leftDate = participant.leftAt instanceof Date ? participant.leftAt :
                                                      participant.leftAt?.toDate ? participant.leftAt.toDate() :
                                                      new Date(participant.leftAt);
                                      return leftDate.toLocaleDateString('id-ID');
                                    })()}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Troubleshoot Tab */}
              {activeActivityTab === 'troubleshoot' && (
                <div className="activity-troubleshoot-tab">
                  {(!selectedActivitySession.troubleshootHistory || selectedActivitySession.troubleshootHistory.length === 0) ? (
                    <div className="activity-empty-state">
                      <Wrench className="activity-empty-icon" />
                      <p>Tidak ada troubleshoot yang tercatat</p>
                      <small>Session ini berjalan lancar tanpa masalah</small>
                    </div>
                  ) : (
                    <div className="troubleshoot-list">
                      {selectedActivitySession.troubleshootHistory.map((entry, index) => (
                        <div key={entry.id || index} className="troubleshoot-card">
                          <div className="troubleshoot-header">
                            <div className="troubleshoot-step">
                              🔧 Step {(entry.stepIndex || 0) + 1}
                            </div>
                            <div className="troubleshoot-timestamp">
                              {new Date(entry.timestamp).toLocaleString('id-ID')}
                            </div>
                          </div>
                          
                          <div className="troubleshoot-content">
                            <h4>Masalah:</h4>
                            <p>{entry.description}</p>
                            
                            {entry.category && (
                              <div className="troubleshoot-category">
                                <span className="category-label">🏷️ Kategori:</span>
                                <span className="category-value">{entry.category}</span>
                              </div>
                            )}
                            
                            {entry.solution && (
                              <div className="troubleshoot-solution">
                                <h4>💡 Solusi:</h4>
                                <p>{entry.solution}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="troubleshoot-footer">
                            <span>👤 Ditangani oleh: <strong>{entry.userName}</strong></span>
                            {entry.stepTitle && (
                              <span>📋 Langkah: {entry.stepTitle}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="activity-modal-footer">
              <div className="activity-modal-summary">
                {(() => {
                  const sessionMode = getSessionMode(selectedActivitySession);
                  return (
                    <small>
                      📊 Summary: {activityTimeline.length} aktivitas • 
                      {sessionMode.operators.length} operator • 
                      {selectedActivitySession.troubleshootHistory?.length || 0} troubleshoot
                    </small>
                  );
                })()}
              </div>
              <button 
                onClick={() => setShowActivityModal(false)}
                className="activity-modal-close-btn"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressPage;