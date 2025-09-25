import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import logoLRS from '../assets/images/logoLRS.png';
import './AdminPage.css';
import excelExport from './ExcelExport';
import { CheckCircle, Briefcase } from 'lucide-react';

import StepDetailsModal from './StepDetailsModal';

import {
  calculateEfficiency,
  calculateSessionEfficiency,
  formatEfficiencyDisplay,
  formatTime,
  formatStepTime,
  calculateTargetTime,
  getCompletionStats
} from './AdminUtils';

const ActivityHistoryModal = ({ isOpen, onClose, sessionData }) => {
  const [activeTab, setActiveTab] = useState('activities');
  
  if (!isOpen || !sessionData) return null;
  
  const getActivityHistory = () => {
    const activities = [];
    const data = sessionData.originalSession || sessionData;
    if (data.createdAt) {
      activities.push({
        type: 'session_created',
        timestamp: data.createdAt,
        userId: data.createdBy || data.operatorId,
        userName: data.operatorName || data.userName || 'Unknown',
        details: `Sesi kerja dibuat untuk ${sessionData.workInstructionTitle}`
      });
    }
    if (data.stepStartedBy) {
      Object.entries(data.stepStartedBy).forEach(([stepIndex, startInfo]) => {
        activities.push({
          type: 'step_started',
          timestamp: startInfo.startedAt,
          userId: startInfo.userId,
          userName: startInfo.userName,
          stepIndex: parseInt(stepIndex),
          details: `Memulai Step ${parseInt(stepIndex) + 1}: ${sessionData.stepTimes[stepIndex]?.step || `Langkah ${parseInt(stepIndex) + 1}`}`
        });
      });
    }
    if (data.stepCompletedBy) {
      Object.entries(data.stepCompletedBy).forEach(([stepIndex, completeInfo]) => {
        activities.push({
          type: 'step_completed',
          timestamp: completeInfo.completedAt,
          userId: completeInfo.userId,
          userName: completeInfo.userName,
          stepIndex: parseInt(stepIndex),
          details: `Menyelesaikan Step ${parseInt(stepIndex) + 1} dalam ${formatTime(completeInfo.completionTime || 0)}`
        });
      });
    }
    if (data.stepSkippedBy) {
      Object.entries(data.stepSkippedBy).forEach(([stepIndex, skipInfo]) => {
        activities.push({
          type: 'step_skipped',
          timestamp: skipInfo.skippedAt,
          userId: skipInfo.userId,
          userName: skipInfo.userName,
          stepIndex: parseInt(stepIndex),
          details: `Melewati Step ${parseInt(stepIndex) + 1}${skipInfo.reason ? `: ${skipInfo.reason}` : ''}`
        });
      });
    }
    
    if (data.stepStoppedBy) {
      Object.entries(data.stepStoppedBy).forEach(([stepIndex, stopInfo]) => {
        activities.push({
          type: 'step_stopped',
          timestamp: stopInfo.stoppedAt,
          userId: stopInfo.userId,
          userName: stopInfo.userName,
          stepIndex: parseInt(stepIndex),
          details: `Menghentikan Step ${parseInt(stepIndex) + 1} pada waktu ${formatTime(stopInfo.stoppedAtTime || 0)}`
        });
      });
    }
    
    // Add troubleshoot activities
    if (sessionData.troubleshootHistory) {
      sessionData.troubleshootHistory.forEach(trouble => {
        activities.push({
          type: 'troubleshoot',
          timestamp: new Date(trouble.timestamp),
          userId: trouble.userId,
          userName: trouble.userName,
          stepIndex: trouble.stepIndex,
          details: `Troubleshoot Step ${trouble.stepIndex + 1}: ${trouble.description}${trouble.solution ? ` | Solusi: ${trouble.solution}` : ''}`
        });
      });
    }
    
    // Add completion activity
    if (data.completedAt) {
      activities.push({
        type: 'session_completed',
        timestamp: data.completedAt,
        userId: data.operatorId || data.createdBy,
        userName: data.operatorName || data.userName || 'Unknown',
        details: `Sesi kerja diselesaikan dengan total waktu ${formatTime(sessionData.totalTime)}`
      });
    }
    
    // Sort by timestamp (newest first)
    return activities.sort((a, b) => {
      const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
      return timeB - timeA;
    });
  };
  
  // Get participants info
  const getParticipantsInfo = () => {
    const data = sessionData.originalSession || sessionData;
    return data.participants || [];
  };
  
  const activities = getActivityHistory();
  const participants = getParticipantsInfo();
  const isTeamWork = participants.length > 1;
  
  return (
    <div className="modal-overlay activity-modal-overlay">
      <div className="modal-content activity-history-modal">
        <div className="modal-header">
          <h3>📊 Riwayat Aktivitas & Detail Sesi</h3>
          <button onClick={onClose} className="modal-close-btn">✕</button>
        </div>
        
        {/* Mode Indicator */}
        <div className="session-mode-indicator">
          <div className={`mode-badge ${isTeamWork ? 'team-mode' : 'individual-mode'}`}>
            <span className="mode-icon">
              {isTeamWork ? '👥' : '👤'}
            </span>
            <span className="mode-text">
              Mode: {isTeamWork ? `Tim (${participants.length} operator)` : 'Individu'}
            </span>
          </div>
          
          {isTeamWork && (
            <div className="team-efficiency-indicator">
              <span className="team-label">Efisiensi Tim:</span>
              <span className={`efficiency-value ${sessionData.efficiency >= 80 ? 'efficient' : 'needs-improvement'}`}>
                {sessionData.efficiency.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        
        {/* Tab Navigation */}
        <div className="activity-tabs">
          <button 
            className={`tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
            onClick={() => setActiveTab('activities')}
          >
            📋 Aktivitas ({activities.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            👥 {isTeamWork ? `Tim (${participants.length})` : 'Operator (1)'}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'steps' ? 'active' : ''}`}
            onClick={() => setActiveTab('steps')}
          >
            📝 Detail Langkah ({sessionData.stepTimes.length})
          </button>
        </div>
        
        <div className="tab-content">
          {/* Activities Tab */}
          {activeTab === 'activities' && (
            <div className="activities-content">
              {activities.length === 0 ? (
                <div className="no-activities">
                  <p>📝 Belum ada aktivitas yang tercatat</p>
                </div>
              ) : (
                <div className="activities-timeline">
                  {activities.map((activity, index) => {
                    const timestamp = activity.timestamp?.toDate ? 
                      activity.timestamp.toDate() : 
                      new Date(activity.timestamp);
                    
                    return (
                      <div key={index} className={`activity-item ${activity.type}`}>
                        <div className="activity-icon">
                          {activity.type === 'session_created' && '🆕'}
                          {activity.type === 'step_started' && '▶️'}
                          {activity.type === 'step_completed' && '✅'}
                          {activity.type === 'step_skipped' && '⭐'}
                          {activity.type === 'step_stopped' && '⏸️'}
                          {activity.type === 'troubleshoot' && '🔧'}
                          {activity.type === 'session_completed' && '🎉'}
                        </div>
                        <div className="activity-content">
                          <div className="activity-header">
                            <span className="activity-user">{activity.userName}</span>
                            <span className="activity-time">
                              {timestamp.toLocaleString('id-ID', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="activity-details">
                            {activity.details}
                          </div>
                          {activity.stepIndex !== undefined && (
                            <div className="activity-step-info">
                              <small>📍 Step {activity.stepIndex + 1}</small>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <div className="participants-content">
              {participants.length === 0 ? (
                <div className="no-participants">
                  <p>👤 Data partisipan tidak tersedia</p>
                </div>
              ) : (
                <div className="participants-list">
                  {participants.map((participant, index) => {
                    // Count activities by this participant
                    const userActivities = activities.filter(a => a.userId === participant.userId).length;
                    const stepsCompleted = activities.filter(a => 
                      a.userId === participant.userId && a.type === 'step_completed'
                    ).length;
                    
                    return (
                      <div key={index} className="participant-card">
                        <div className="participant-header">
                          <div className="participant-avatar">
                            {participant.userName?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="participant-info">
                            <h4 className="participant-name">{participant.userName || 'Unknown'}</h4>
                            <div className="participant-roles">
                              {participant.role === 'creator' && <span className="role-badge creator">👑 Koordinator</span>}
                              {participant.isActive === false && <span className="role-badge inactive">🔴 Keluar</span>}
                              {participant.isActive !== false && <span className="role-badge active">🟢 Aktif</span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="participant-stats">
                          <div className="stat-item">
                            <span className="stat-label">Bergabung:</span>
                            <span className="stat-value">
                              {participant.joinedAt?.toDate().toLocaleString('id-ID') || 'Unknown'}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Total Aktivitas:</span>
                            <span className="stat-value">{userActivities}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Langkah Diselesaikan:</span>
                            <span className="stat-value">{stepsCompleted}</span>
                          </div>
                          {participant.leftAt && (
                            <div className="stat-item">
                              <span className="stat-label">Keluar:</span>
                              <span className="stat-value">
                                {participant.leftAt.toDate().toLocaleString('id-ID')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Team Summary */}
              {isTeamWork && (
                <div className="team-summary">
                  <h4>📊 Ringkasan Tim</h4>
                  <div className="team-stats">
                    <div className="team-stat">
                      <span className="stat-label">Total Operator:</span>
                      <span className="stat-value">{participants.length}</span>
                    </div>
                    <div className="team-stat">
                      <span className="stat-label">Operator Aktif:</span>
                      <span className="stat-value">
                        {participants.filter(p => p.isActive !== false).length}
                      </span>
                    </div>
                    <div className="team-stat">
                      <span className="stat-label">Kolaborasi:</span>
                      <span className="stat-value">
                        {activities.filter(a => a.type.includes('step_')).length} aktivitas step
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Steps Detail Tab */}
          {activeTab === 'steps' && (
            <div className="steps-detail-content">
              <div className="steps-overview">
                <div className="overview-stats">
                  <div className="overview-stat">
                    <span className="stat-number">{sessionData.stepTimes.length}</span>
                    <span className="stat-label">Total Langkah</span>
                  </div>
                  <div className="overview-stat">
                    <span className="stat-number">
                      {sessionData.stepTimes.filter(s => s.status === 'completed').length}
                    </span>
                    <span className="stat-label">Selesai</span>
                  </div>
                  <div className="overview-stat">
                    <span className="stat-number">
                      {sessionData.stepTimes.filter(s => s.status === 'skipped').length}
                    </span>
                    <span className="stat-label">Dilewati</span>
                  </div>
                </div>
              </div>
              
              <div className="steps-list-detailed">
                {sessionData.stepTimes.map((step, index) => {
                  const stepActivities = activities.filter(a => a.stepIndex === index);
                  const isEfficient = step.efficiency >= 80;
                  
                  return (
                    <div key={index} className={`step-detail-card ${step.status}`}>
                      <div className="step-detail-header">
                        <div className="step-number">#{index + 1}</div>
                        <div className="step-title">{step.step}</div>
                        <div className={`step-status-badge ${step.status}`}>
                          {step.status === 'completed' && '✅'}
                          {step.status === 'skipped' && '⭐'}
                          {step.status === 'pending' && '⏳'}
                        </div>
                      </div>
                      
                      <div className="step-detail-info">
                        <div className="step-times">
                          <div className="time-info">
                            <span className="time-label">Waktu Aktual:</span>
                            <span className="time-value actual">{formatTime(step.duration)}</span>
                          </div>
                          {step.targetTime > 0 && (
                            <div className="time-info">
                              <span className="time-label">Waktu Target:</span>
                              <span className="time-value target">{formatTime(step.targetTime)}</span>
                            </div>
                          )}
                          {step.targetTime > 0 && (
                            <div className="efficiency-info">
                              <span className="efficiency-label">Efisiensi:</span>
                              <span className={`efficiency-value ${isEfficient ? 'efficient' : 'inefficient'}`}>
                                {step.efficiency.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {stepActivities.length > 0 && (
                          <div className="step-activities-summary">
                            <strong>Aktivitas ({stepActivities.length}):</strong>
                            <ul>
                              {stepActivities.slice(0, 3).map((activity, actIndex) => (
                                <li key={actIndex}>
                                  <small>
                                    <strong>{activity.userName}</strong> - {activity.details}
                                  </small>
                                </li>
                              ))}
                              {stepActivities.length > 3 && (
                                <li><small>... dan {stepActivities.length - 3} aktivitas lainnya</small></li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== MAIN ADMIN PAGE COMPONENT =====
const AdminPage = () => {
  // State declarations - keeping all existing states
  const [data, setData] = useState([]);
  const [bulan, setBulan] = useState('');
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMO, setSelectedMO] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [moList, setMoList] = useState([]);
  const [workInstructions, setWorkInstructions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [modalData, setModalData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 🔥 NEW: Activity History Modal states
  const [activityModalData, setActivityModalData] = useState(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  
  const navigate = useNavigate();

  // Modal functions - keeping existing ones
  const openModal = (sessionData) => {
    setModalData(sessionData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalData(null);
  };
  
  // 🔥 NEW: Activity modal functions
  const openActivityModal = (sessionData) => {
    setActivityModalData(sessionData);
    setIsActivityModalOpen(true);
  };

  const closeActivityModal = () => {
    setIsActivityModalOpen(false);
    setActivityModalData(null);
  };

  // 🔥 KEEPING ALL EXISTING FUNCTIONS UNCHANGED
  const getUserData = async (session) => {
    try {
      const userId = session.operatorId || session.userId || session.createdBy;
      
      if (!userId) {
        return session.operatorName || session.userName || 'Unknown User';
      }

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.displayName || userData.name || userData.email || userId;
      }
      
      return session.operatorName || session.userName || userId;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return session.operatorName || session.userName || session.userId || session.operatorId || 'Unknown User';
    }
  };

  // Function untuk update status work session - UNCHANGED
  const updateSessionStatus = async (sessionId, newStatus) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [sessionId]: true }));
      
      const sessionRef = doc(db, 'workSessions', sessionId);
      await updateDoc(sessionRef, {
        status: newStatus,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: 'admin'
      });

      setData(prevData => 
        prevData.map(session => 
          session.id === sessionId 
            ? { 
                ...session, 
                status: newStatus,
                statusUpdatedAt: new Date(),
                statusUpdatedBy: 'admin'
              }
            : session
        )
      );

      console.log(`✅ Status updated for session ${sessionId}: ${newStatus}`);
      
    } catch (error) {
      console.error('⚠️ Error updating status:', error);
      alert(`Gagal mengupdate status: ${error.message}`);
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  // KEEPING ALL EXISTING fetchWorkInstructions UNCHANGED
  const fetchWorkInstructions = async () => {
    try {
      const tasksRef = collection(db, 'tasks');
      const querySnapshot = await getDocs(tasksRef);
      const instructions = {};
      
      console.log(`📊 Found ${querySnapshot.size} task documents`);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📄 Processing task document: ${doc.id}`, data);
        
        const rawSteps = data.steps || [];
        let totalStepTargetTime = 0;
        let stepsWithTarget = 0;
        
        const normalizedSteps = Array.isArray(rawSteps) ? rawSteps.map((step, index) => {
          let maxTime = 0;
          
          if (step.maxTime !== undefined) {
            maxTime = typeof step.maxTime === 'string' 
              ? parseInt(step.maxTime, 10) || 0
              : (typeof step.maxTime === 'number' ? step.maxTime : 0);
          }
          
          if (maxTime > 0) {
            totalStepTargetTime += maxTime;
            stepsWithTarget++;
          }
          
          return {
            ...step,
            maxTime: maxTime,
            title: step.title || step.name || step.stepName || `Langkah ${index + 1}`
          };
        }) : [];
        
        console.log(`📊 Task "${data.title}": ${stepsWithTarget} steps with targets, total: ${totalStepTargetTime}s`);
        
        instructions[doc.id] = {
          title: data.title || data.name || `Instruksi ${doc.id}`,
          targetTime: data.targetTime || totalStepTargetTime,
          standardTime: data.standardTime || data.targetTime || totalStepTargetTime,
          steps: normalizedSteps,
          totalStepTargetTime: totalStepTargetTime,
          stepsWithTarget: stepsWithTarget,
          totalSteps: normalizedSteps.length
        };
      });
      
      console.log('✅ Work Instructions loaded:', Object.keys(instructions).map(id => ({
        id,
        title: instructions[id].title,
        totalStepTargetTime: instructions[id].totalStepTargetTime,
        stepsWithTarget: instructions[id].stepsWithTarget
      })));
      
      setWorkInstructions(instructions);
      return instructions;
    } catch (error) {
      console.error('⚠️ Error fetching work instructions:', error);
      return {};
    }
  };

  // Navigation functions - UNCHANGED
  const handleApproval = () => {
    navigate('/approvals');
  };

  const handleMenuClick = () => {
    navigate('/add-mo');
  };

  const handleAddTask = () => {
    navigate('/addtask');
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleBackClick = () => {
    navigate('/');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Enhanced handleExport function - UNCHANGED
  const handleExport = async () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }

    try {
      setExporting(true);
      
      const result = await excelExport.exportWorkSessions(filteredData, bulan, tahun, selectedUser, selectedStatus, selectedMO);
      
      alert(`✅ Export berhasil!\nFile: ${result.fileName}\nJumlah data: ${result.recordCount} sessions`);
      
    } catch (error) {
      console.error('Export error:', error);
      alert(`⚠️ Export gagal: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Render functions - KEEPING ALL EXISTING ONES UNCHANGED
  const renderStatusBadge = (status) => {
    const statusConfig = {
      approved: { label: 'Disetujui', class: 'approved', icon: '✓' },
      rejected: { label: 'Ditolak', class: 'rejected', icon: '✕' },
      pending: { label: 'Menunggu', class: 'pending', icon: '⏳' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`admin-status-badge ${config.class}`}>
        <span className="admin-status-icon">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const renderMOBadge = (moNumber) => {
    return (
      <span className="admin-mo-badge">
        {moNumber || 'N/A'}
      </span>
    );
  };

  const renderActionButtons = (sessionId, currentStatus) => {
    const isUpdating = updatingStatus[sessionId];
    
    return (
      <div className="admin-action-buttons">
        {currentStatus !== 'approved' && (
          <button
            onClick={() => updateSessionStatus(sessionId, 'approved')}
            disabled={isUpdating}
            className="admin-action-btn approve"
            title="Setujui"
          >
            {isUpdating ? (
              <div className="mini-spinner"></div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            )}
          </button>
        )}
        
        {currentStatus !== 'rejected' && (
          <button
            onClick={() => updateSessionStatus(sessionId, 'rejected')}
            disabled={isUpdating}
            className="admin-action-btn reject"
            title="Tolak"
          >
            {isUpdating ? (
              <div className="mini-spinner"></div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            )}
          </button>
        )}
        
        {currentStatus !== 'pending' && (
          <button
            onClick={() => updateSessionStatus(sessionId, 'pending')}
            disabled={isUpdating}
            className="admin-action-btn pending"
            title="Set Pending"
          >
            {isUpdating ? (
              <div className="mini-spinner"></div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            )}
          </button>
        )}
      </div>
    );
  };

  const renderStepsDetailButton = (entry) => {
    return (
      <button
        onClick={() => openModal(entry)}
        className="admin-steps-modal-btn"
        title="Lihat detail langkah"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        Lihat Detail ({entry.stepTimes.length} langkah)
      </button>
    );
  };

  // 🔥 NEW: Render team mode indicator and activity button
  const renderTeamModeIndicator = (entry) => {
    const participants = entry.originalSession?.participants || [];
    const isTeamWork = participants.length > 1;
    
    return (
      <div className="team-mode-indicator">
        <span className={`mode-badge ${isTeamWork ? 'team' : 'individual'}`}>
          <span className="mode-icon">
            {isTeamWork ? '👥' : '👤'}
          </span>
          <span className="mode-text">
            {isTeamWork ? `Tim (${participants.length})` : 'Individu'}
          </span>
        </span>
        {isTeamWork && (
          <span className="team-efficiency-badge">
            Kolaborasi
          </span>
        )}
      </div>
    );
  };

  // 🔥 NEW: Render activity history button
  const renderActivityHistoryButton = (entry) => {
    const participants = entry.originalSession?.participants || [];
    const activities = [];
    
    // Count activities from originalSession data
    const data = entry.originalSession || entry;
    let activityCount = 0;
    
    if (data.stepStartedBy) activityCount += Object.keys(data.stepStartedBy).length;
    if (data.stepCompletedBy) activityCount += Object.keys(data.stepCompletedBy).length;
    if (data.stepSkippedBy) activityCount += Object.keys(data.stepSkippedBy).length;
    if (data.stepStoppedBy) activityCount += Object.keys(data.stepStoppedBy).length;
    if (entry.troubleshootHistory) activityCount += entry.troubleshootHistory.length;
    
    return (
      <div className="activity-buttons">
        <button
          onClick={() => openActivityModal(entry)}
          className="admin-activity-modal-btn"
          title="Lihat riwayat aktivitas dan detail tim"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span className="activity-btn-text">
            Riwayat Aktivitas ({activityCount})
          </span>
        </button>
        {participants.length > 1 && (
          <div className="team-info-preview">
            <small>{participants.length} operator berkolaborasi</small>
          </div>
        )}
      </div>
    );
  };

  // Main data fetching effect - KEEPING ALL EXISTING LOGIC UNCHANGED
  useEffect(() => {
    const fetchWorkSessions = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch work instructions first
        const instructions = await fetchWorkInstructions();
        
        const workSessionsRef = collection(db, 'workSessions');
        let sessions = [];
        
        try {
          const qWithOrder = query(
            workSessionsRef,
            orderBy('createdAt', 'desc')
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
              statusUpdatedAt: data.statusUpdatedAt?.toDate()
            });
          });
          
        } catch (orderError) {
          console.warn('OrderBy query failed, falling back to simple query:', orderError);
          
          const querySnapshot = await getDocs(workSessionsRef);
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            sessions.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate(),
              completedAt: data.completedAt?.toDate(),
              startTime: data.startTime?.toDate(),
              lastUpdated: data.lastUpdated?.toDate(),
              statusUpdatedAt: data.statusUpdatedAt?.toDate()
            });
          });
          
          sessions.sort((a, b) => {
            const dateA = a.completedAt || a.createdAt || a.startTime || new Date(0);
            const dateB = b.completedAt || b.createdAt || b.startTime || new Date(0);
            return dateB - dateA;
          });
        }

        // Collect unique users and MO numbers for filter
        const uniqueUsers = new Set();
        const uniqueMOs = new Set();

        // Enhanced data transformation dengan TaskPage compatibility
        const transformedData = await Promise.all(
          sessions
            .filter(session => session.completedAt || session.status === 'completed')
            .map(async (session) => {
              console.log(`🔍 Processing session ${session.id}:`, {
                operatorId: session.operatorId,
                operatorName: session.operatorName,
                userId: session.userId,
                userName: session.userName,
                createdBy: session.createdBy
              });

              const instructionId = session.taskId || session.workInstructionId;
              const workInstruction = instructions[instructionId];
              
              console.log(`🔍 Looking for instruction ${instructionId}:`, workInstruction ? 'Found' : 'Not found');
              
              let targetTime = 0;
              
              if (session.totalTargetTime) {
                targetTime = session.totalTargetTime;
              } else if (session.stepTargetTimes && Array.isArray(session.stepTargetTimes)) {
                targetTime = session.stepTargetTimes.reduce((sum, time) => sum + (time || 0), 0);
              } else if (workInstruction) {
                targetTime = workInstruction.totalStepTargetTime || workInstruction.targetTime || 0;
              } else {
                targetTime = session.targetTime || 0;
              }

              const stepTimes = [];
              
              if (session.stepStatuses && session.stepCompletionTimes) {
                session.stepStatuses.forEach((status, index) => {
                  const duration = session.stepCompletionTimes[index] || 0;
                  let stepTitle = `Langkah ${index + 1}`;
                  let stepTargetTime = 0;
                  
                  if (workInstruction?.steps && workInstruction.steps[index]) {
                    stepTitle = workInstruction.steps[index].title || stepTitle;
                    stepTargetTime = workInstruction.steps[index].maxTime || 0;
                  } else if (session.stepTargetTimes && session.stepTargetTimes[index]) {
                    stepTargetTime = session.stepTargetTimes[index];
                  }
                  
                  if (typeof stepTargetTime === 'string') {
                    stepTargetTime = parseInt(stepTargetTime, 10) || 0;
                  }
                  
                  const stepEfficiency = calculateEfficiency(duration, stepTargetTime, status);
                  
                  stepTimes.push({
                    step: stepTitle,
                    duration: duration,
                    targetTime: stepTargetTime,
                    status: status,
                    efficiency: stepEfficiency
                  });
                });
              }

              const userName = await getUserData(session);
              uniqueUsers.add(userName);
              
              const moNumber = session.moNumber || session.mo || session.manufacturingOrder || 'N/A';
              if (moNumber !== 'N/A') {
                uniqueMOs.add(moNumber);
              }

              console.log(`✅ Processed session ${session.id}:`, {
                userName,
                moNumber,
                instructionId,
                workInstruction: workInstruction ? 'Found' : 'Not found',
                calculatedTargetTime: targetTime,
                stepTimesCount: stepTimes.length,
                stepsWithTargets: stepTimes.filter(s => s.targetTime > 0).length,
                totalTime: session.totalTime
              });

              const actualTime = session.totalTime || 0;
              const efficiency = calculateSessionEfficiency(stepTimes, true);
              const isEfficient = efficiency >= 80;

              const tanggalForDisplay = session.completedAt || session.createdAt || session.startTime || new Date();

              return {
                id: session.id,
                nama: userName,
                userId: session.operatorId || session.userId || session.createdBy,
                mo: moNumber, 
                moNumber: moNumber,
                tanggal: tanggalForDisplay,
                totalTime: actualTime,
                targetTime: targetTime,
                stepTimes: stepTimes,
                workInstructionTitle: session.workInstructionTitle || workInstruction?.title || 'Unknown Task',
                workInstructionId: instructionId,
                startTime: session.startTime,
                currentStep: session.currentStep,
                totalSteps: session.totalSteps || stepTimes.length,
                isActive: session.isActive,
                efficiency: efficiency,
                isEfficient: isEfficient,
                hasTargetTime: targetTime > 0,
                status: session.status || 'pending',
                statusUpdatedAt: session.statusUpdatedAt,
                statusUpdatedBy: session.statusUpdatedBy,
                // 🔥 ENHANCED: Store more detailed original session data for activity tracking
                originalSession: {
                  operatorId: session.operatorId,
                  operatorName: session.operatorName,
                  userId: session.userId,
                  userName: session.userName,
                  createdBy: session.createdBy,
                  totalTargetTime: session.totalTargetTime,
                  stepTargetTimes: session.stepTargetTimes,
                  // 🔥 NEW: Team and activity data
                  participants: session.participants || [],
                  stepStartedBy: session.stepStartedBy || {},
                  stepCompletedBy: session.stepCompletedBy || {},
                  stepSkippedBy: session.stepSkippedBy || {},
                  stepStoppedBy: session.stepStoppedBy || {},
                  stepOperators: session.stepOperators || {},
                  createdAt: session.createdAt,
                  completedAt: session.completedAt,
                  startTime: session.startTime,
                  lastUpdated: session.lastUpdated
                },
                // Store troubleshoot history for activity modal
                troubleshootHistory: session.troubleshootHistory || [],
                rawCreatedAt: session.rawCreatedAt,
                rawCompletedAt: session.rawCompletedAt,
                rawStartTime: session.rawStartTime
              };
            })
        );

        transformedData.sort((a, b) => {
          const dateA = a.rawCompletedAt || a.rawCreatedAt || a.rawStartTime || new Date(0);
          const dateB = b.rawCompletedAt || b.rawCreatedAt || b.rawStartTime || new Date(0);
          return dateB - dateA;
        });

        console.log('🔍 Sample transformed data:', transformedData.slice(0, 2).map(entry => ({
          id: entry.id,
          nama: entry.nama,
          userId: entry.userId,
          moNumber: entry.moNumber,
          tanggal: entry.tanggal,
          targetTime: entry.targetTime,
          hasTargetTime: entry.hasTargetTime,
          efficiency: entry.efficiency,
          stepTimesWithTargets: entry.stepTimes.filter(s => s.targetTime > 0).length,
          originalData: entry.originalSession,
          // 🔥 NEW: Team info preview
          isTeamWork: (entry.originalSession?.participants || []).length > 1,
          teamSize: (entry.originalSession?.participants || []).length
        })));

        setUsersList(Array.from(uniqueUsers).sort());
        setMoList(Array.from(uniqueMOs).sort());
        
        setData(transformedData);
        setError('');
        
      } catch (error) {
        console.error('Gagal mengambil data work sessions:', error);
        setError(`Gagal mengambil data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkSessions();
  }, []);

  // Enhanced filter with user selection, status filter, and MO filter - UNCHANGED
  const filteredData = data.filter(entry => {
    const date = entry.tanggal;
    const bulanMatch = bulan ? date.getMonth() + 1 === parseInt(bulan) : true;
    const tahunMatch = tahun ? date.getFullYear() === parseInt(tahun) : true;
    const userMatch = selectedUser ? entry.nama === selectedUser : true;
    const statusMatch = selectedStatus ? entry.status === selectedStatus : true;
    const moMatch = selectedMO ? entry.moNumber === selectedMO : true;
    return bulanMatch && tahunMatch && userMatch && statusMatch && moMatch;
  }).sort((a, b) => {
    const dateA = a.rawCompletedAt || a.rawCreatedAt || a.rawStartTime || new Date(0);
    const dateB = b.rawCompletedAt || b.rawCreatedAt || b.rawStartTime || new Date(0);
    return dateB - dateA;
  });

  // Calculate completion stats for filtered data using enhanced function - UNCHANGED
  const completionStats = getCompletionStats(filteredData);

  // Loading state - UNCHANGED
  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-header-left">
            <img 
              src={logoLRS} 
              alt="LRS Logo" 
              className="admin-logo"
              onClick={handleLogoClick}
            />
          </div>
        </div>
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header - UNCHANGED */}
      <div className="admin-header">
        <div className="admin-header-left">
          <button 
            className="admin-sidebar-toggle"
            onClick={toggleSidebar}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <img 
            src={logoLRS} 
            alt="LRS Logo" 
            className="admin-logo"
            onClick={handleLogoClick}
          />
        </div>
        <div className="admin-header-center">
          <h1 className="admin-title">Dashboard Work Sessions</h1>
        </div>
        <div className="admin-header-right">
          <button onClick={handleBackClick} className="admin-back-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Sidebar - UNCHANGED */}
      <div className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar-open' : ''}`}>
        <div className="admin-sidebar-header">
          <h3>Menu</h3>
          <button 
            className="admin-sidebar-close"
            onClick={toggleSidebar}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <nav className="admin-sidebar-nav">
          <button 
            onClick={() => {
              setSidebarOpen(false);
            }} 
            className="admin-sidebar-item active"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4m6-6h4a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4m-6 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/>
            </svg>
            <span>Work Sessions</span>
          </button>

          <button 
            onClick={() => {
              handleApproval();
              setSidebarOpen(false);
            }} 
            className="admin-sidebar-item"
          >
            <CheckCircle size={20} />
            <span>User Management</span>
          </button>

          <button 
            onClick={() => handleMenuClick('MO Management')} 
            className="add-task-sidebar-item"
          >
            <Briefcase size={20} />
            <span>MO Management</span>
          </button>

          <button 
            onClick={() => {
              handleAddTask();
              setSidebarOpen(false);
            }} 
            className="admin-sidebar-item"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <span>Add Task</span>
          </button>
        </nav>
      </div>

      {/* Sidebar Overlay - UNCHANGED */}
      {sidebarOpen && (
        <div 
          className="admin-sidebar-overlay"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Main Content */}
      <div className={`admin-main-content ${sidebarOpen ? 'admin-main-content-shifted' : ''}`}>
        {/* Error Message - UNCHANGED */}
        {error && (
          <div className="admin-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        )}

        {/* 🔥 ENHANCED: Filters Section dengan tambahan filter team mode */}
        <div className="admin-filters">
          <div className="admin-filter-group">
            <label>Bulan:</label>
            <select
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              className="admin-filter-select"
            >
              <option value="">Semua Bulan</option>
              <option value="1">Januari</option>
              <option value="2">Februari</option>
              <option value="3">Maret</option>
              <option value="4">April</option>
              <option value="5">Mei</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">Agustus</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
          </div>

          <div className="admin-filter-group">
            <label>Tahun:</label>
            <select
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="admin-filter-select"
            >
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="admin-filter-group">
            <label>User:</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="admin-filter-select"
            >
              <option value="">Semua User</option>
              {usersList.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          <div className="admin-filter-group">
            <label>Nomor MO:</label>
            <select
              value={selectedMO}
              onChange={(e) => setSelectedMO(e.target.value)}
              className="admin-filter-select"
            >
              <option value="">Semua MO</option>
              {moList.map(mo => (
                <option key={mo} value={mo}>{mo}</option>
              ))}
            </select>
          </div>

          <div className="admin-filter-group">
            <label>Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="admin-filter-select"
            >
              <option value="">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
            </select>
          </div>
          
          <button 
            onClick={handleExport} 
            disabled={exporting || filteredData.length === 0}
            className="admin-action-button export"
          >
            {exporting ? (
              <div className="mini-spinner"></div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            )}
            Export Excel
          </button>
        </div>

        {/* Enhanced Summary Cards with Team/Individual stats */}
        <div className="admin-summary-cards">
          <div className="admin-summary-card total">
            <div className="admin-summary-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4m6-6h4a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4m-6 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/>
              </svg>
            </div>
            <div className="admin-summary-info">
              <h3 style={{color: '#2563eb'}}>{filteredData.length}</h3>
              <p style={{color: '#1d4ed8'}}>Total Sessions</p>
            </div>
          </div>

          <div className="admin-summary-card completed">
            <div className="admin-summary-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </div>
            <div className="admin-summary-info">
              <h3 style={{color: '#059669'}}>{completionStats.completed}</h3>
              <p style={{color: '#047857'}}>Steps Completed</p>
            </div>
          </div>

          <div className="admin-summary-card efficiency-enhanced">
            <div className="admin-summary-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div className="admin-summary-info">
              <h3 style={{color: '#dc2626'}}>{completionStats.overallStepEfficiency}%</h3>
              <p style={{color: '#b91c1c'}}>Efisiensi Keseluruhan</p>
            </div>
          </div>

          <div className="admin-summary-card efficiency">
            <div className="admin-summary-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div className="admin-summary-info">
              <h3 style={{color: '#d97706'}}>{completionStats.avgEfficiency}%</h3>
              <p style={{color: '#c05300ff'}}>Rata-rata Per Session</p>
            </div>
          </div>

          <div className="admin-summary-card approved">
            <div className="admin-summary-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="16,12 12,8 8,12"/>
                <line x1="12" y1="16" x2="12" y2="8"/>
              </svg>
            </div>
            <div className="admin-summary-info">
              <h3 style={{color: '#059669'}}>{completionStats.approvedSessions}</h3>
              <p style={{color: '#047857'}}>Sessions Approved</p>
            </div>
          </div>

          {/* 🔥 NEW: Team work summary card */}
          <div className="admin-summary-card team-work">
            <div className="admin-summary-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="admin-summary-info">
              <h3 style={{color: '#7c3aed'}}>
                {filteredData.filter(entry => 
                  (entry.originalSession?.participants || []).length > 1
                ).length}
              </h3>
              <p style={{color: '#6d28d9'}}>Sessions Tim</p>
            </div>
          </div>
        </div>

        {/* Data Table */}
        {filteredData.length === 0 ? (
          <div className="admin-no-data">
            <div className="admin-no-data-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="12" r="10"/>
                <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </div>
            <h3>Tidak ada data</h3>
            <p>Tidak ada work session yang sesuai dengan filter yang dipilih.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Nomor MO</th>
                    <th>Tanggal</th>
                    <th>Tugas</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th>Waktu Aktual</th>
                    <th>Waktu Target</th>
                    <th>Efisiensi Session</th>
                    <th>Detail Langkah</th>
                    <th>Riwayat Aktivitas</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr className={`admin-table-row ${entry.isEfficient ? 'efficient-row' : 'inefficient-row'}`}>
                        <td className="admin-cell-name">
                          <div className="admin-user-info">
                            <div className="admin-user-avatar">
                              {entry.nama.charAt(0).toUpperCase()}
                            </div>
                            <span className="admin-user-name">{entry.nama}</span>
                          </div>
                        </td>
                        
                        <td className="admin-cell-mo">
                          {renderMOBadge(entry.moNumber)}
                        </td>
                        
                        <td className="admin-cell-date">
                          {entry.tanggal.toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                          <br />
                          <small>
                            {entry.tanggal.toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </small>
                        </td>
                        
                        <td className="admin-cell-task">
                          <div className="admin-task-info">
                            <span className="admin-task-title">{entry.workInstructionTitle}</span>
                          </div>
                        </td>
                        
                        {/* 🔥 NEW: Mode column */}
                        <td className="admin-cell-mode">
                          {renderTeamModeIndicator(entry)}
                        </td>
                        
                        <td className="admin-cell-status">
                          {renderStatusBadge(entry.status)}
                        </td>
                        
                        <td className="admin-cell-time actual">
                          <span className="admin-time-value">
                            {formatTime(entry.totalTime)}
                          </span>
                        </td>
                        
                        <td className="admin-cell-time target">
                          <span className="admin-time-value">
                            {entry.targetTime > 0 ? formatTime(entry.targetTime) : 'N/A'}
                          </span>
                          {!entry.hasTargetTime && (
                            <small className="admin-no-target">Tidak ada target</small>
                          )}
                        </td>
                        
                        <td className="admin-cell-efficiency">
                          {entry.hasTargetTime ? (
                            <div className={`admin-efficiency-badge ${entry.isEfficient ? 'efficient' : 'inefficient'}`}>
                              <span className="admin-efficiency-value">
                                {entry.efficiency.toFixed(1)}%
                              </span>
                              <div 
                                className="admin-efficiency-bar"
                                style={{
                                  '--efficiency': Math.min(entry.efficiency, 100)
                                }}
                              >
                                <div className="admin-efficiency-fill"></div>
                              </div>
                            </div>
                          ) : (
                            <span className="admin-no-efficiency">N/A</span>
                          )}
                        </td>
                        
                        <td className="admin-cell-steps">
                          {renderStepsDetailButton(entry)}
                        </td>
                        
                        {/* 🔥 NEW: Activity History column */}
                        <td className="admin-cell-activity">
                          {renderActivityHistoryButton(entry)}
                        </td>
                        
                        <td className="admin-cell-actions">
                          {renderActionButtons(entry.id, entry.status)}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Enhanced Table Footer with Team/Individual statistics */}
        {filteredData.length > 0 && (
          <div className="admin-table-footer">
            <div className="admin-table-info">
              <span className="admin-table-count">
                Menampilkan {filteredData.length} dari {data.length} total work sessions
              </span>
              
              {selectedMO && (
                <span className="admin-filter-info">
                  {" • "}Filtered by MO: <strong>{selectedMO}</strong>
                </span>
              )}
              {selectedUser && (
                <span className="admin-filter-info">
                  {" • "}User: <strong>{selectedUser}</strong>
                </span>
              )}
              {selectedStatus && (
                <span className="admin-filter-info">
                  {" • "}Status: <strong>{selectedStatus}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Step Details Modal - UNCHANGED */}
      <StepDetailsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        sessionData={modalData}
      />

      {/* 🔥 NEW: Activity History Modal */}
      <ActivityHistoryModal
        isOpen={isActivityModalOpen}
        onClose={closeActivityModal}
        sessionData={activityModalData}
      />
    </div>
  );
};

export default AdminPage;