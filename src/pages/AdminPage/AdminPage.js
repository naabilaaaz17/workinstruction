import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import logoLRS from '../assets/images/logoLRS.png';
import './AdminPage.css';
import excelExport from './ExcelExport';

const AdminPage = () => {
  const [data, setData] = useState([]);
  const [bulan, setBulan] = useState('');
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); // Filter status baru
  const [usersList, setUsersList] = useState([]);
  const [workInstructions, setWorkInstructions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState({}); // Track updating status per session
  const navigate = useNavigate();

  // Fungsi untuk mengambil data user berdasarkan userId
  const getUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.displayName || userData.name || userData.email || userId;
      }
      return userId;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return userId;
    }
  };

  // Function untuk update status work session
  const updateSessionStatus = async (sessionId, newStatus) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [sessionId]: true }));
      
      const sessionRef = doc(db, 'workSessions', sessionId);
      await updateDoc(sessionRef, {
        status: newStatus,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: 'admin' // Bisa diganti dengan user ID admin yang login
      });

      // Update local data
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
      console.error('❌ Error updating status:', error);
      alert(`Gagal mengupdate status: ${error.message}`);
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  // Tambahkan function debugging ini di AdminPage.js
  const debugDataStructure = async () => {
    try {
      console.log('🔍 DEBUGGING DATA STRUCTURE...');
      
      // Debug 1: Cek collection 'tasks'
      console.log('📂 Checking tasks collection...');
      const tasksRef = collection(db, 'tasks');
      const tasksSnapshot = await getDocs(tasksRef);
      
      tasksSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📄 Task Document ${doc.id}:`, {
          title: data.title,
          steps: data.steps?.length || 0,
          stepsSample: data.steps?.slice(0, 2).map(step => ({
            title: step.title,
            maxTime: step.maxTime,
            max_time: step.max_time,
            duration: step.duration,
            targetTime: step.targetTime
          })),
          targetTime: data.targetTime,
          standardTime: data.standardTime
        });
      });
      
      // Debug 2: Cek collection 'workSessions'
      console.log('📂 Checking workSessions collection...');
      const sessionsRef = collection(db, 'workSessions');
      const sessionsSnapshot = await getDocs(query(sessionsRef, orderBy('createdAt', 'desc')));
      
      let sessionCount = 0;
      sessionsSnapshot.forEach((doc) => {
        if (sessionCount < 3) { // Hanya ambil 3 sample
          const data = doc.data();
          console.log(`📄 Session Document ${doc.id}:`, {
            workInstructionId: data.workInstructionId,
            workInstructionTitle: data.workInstructionTitle,
            stepTargetTimes: data.stepTargetTimes,
            stepCompletionTimes: data.stepCompletionTimes,
            stepStatuses: data.stepStatuses,
            totalSteps: data.totalSteps,
            completedAt: data.completedAt?.toDate(),
            status: data.status // Check existing status
          });
          sessionCount++;
        }
      });
      
    } catch (error) {
      console.error('❌ Debug error:', error);
    }
  };

  // Enhanced function to fetch work instructions with target time - FIXED VERSION
  const fetchWorkInstructions = async () => {
    try {
      // PERBAIKAN: Gunakan collection 'tasks' bukan 'workInstructions'
      const tasksRef = collection(db, 'tasks');
      const querySnapshot = await getDocs(tasksRef);
      const instructions = {};
      
      console.log(`📊 Found ${querySnapshot.size} task documents`);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📄 Processing task document: ${doc.id}`, data);
        
        // Parse steps dan hitung total target time
        const rawSteps = data.steps || data.workSteps || [];
        let totalStepTargetTime = 0;
        let stepsWithTarget = 0;
        
        const normalizedSteps = Array.isArray(rawSteps) ? rawSteps.map((step, index) => {
          let maxTime = 0;
          
          // Cari maxTime dari berbagai kemungkinan field name
          if (step.maxTime !== undefined) {
            maxTime = typeof step.maxTime === 'string' 
              ? parseInt(step.maxTime, 10) || 0
              : (typeof step.maxTime === 'number' ? step.maxTime : 0);
          } else if (step.max_time !== undefined) {
            maxTime = typeof step.max_time === 'string' 
              ? parseInt(step.max_time, 10) || 0
              : (typeof step.max_time === 'number' ? step.max_time : 0);
          } else if (step.duration !== undefined) {
            maxTime = typeof step.duration === 'string' 
              ? parseInt(step.duration, 10) || 0
              : (typeof step.duration === 'number' ? step.duration : 0);
          } else if (step.targetTime !== undefined) {
            maxTime = typeof step.targetTime === 'string' 
              ? parseInt(step.targetTime, 10) || 0
              : (typeof step.targetTime === 'number' ? step.targetTime : 0);
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
          // Handle different formats of target time
          targetTime: data.targetTime || 0,
          standardTime: data.standardTime || data.targetTime || 0,
          steps: normalizedSteps,
          // Calculate total target time from steps
          totalStepTargetTime: totalStepTargetTime,
          stepsWithTarget: stepsWithTarget,
          totalSteps: normalizedSteps.length
        };
      });
      
      console.log('✅ Work Instructions loaded with target times:', Object.keys(instructions).map(id => ({
        id,
        title: instructions[id].title,
        totalStepTargetTime: instructions[id].totalStepTargetTime,
        stepsWithTarget: instructions[id].stepsWithTarget
      })));
      
      setWorkInstructions(instructions);
      return instructions;
    } catch (error) {
      console.error('❌ Error fetching work instructions:', error);
      return {};
    }
  };

  // Enhanced function to calculate target time from multiple sources - FIXED VERSION
  const calculateTargetTime = (session, workInstruction) => {
    console.log(`🎯 Calculating target time for session ${session.id}:`, {
      workInstructionId: session.workInstructionId,
      sessionStepTargetTimes: session.stepTargetTimes,
      workInstructionData: workInstruction
    });
    
    // Priority order for target time:
    // 1. stepTargetTimes array from session (paling akurat)
    // 2. totalStepTargetTime from work instruction (dari steps)
    // 3. standardTime/targetTime from work instruction (fallback)
    
    // Method 1: Dari session stepTargetTimes
    if (session.stepTargetTimes && Array.isArray(session.stepTargetTimes)) {
      const totalFromSession = session.stepTargetTimes.reduce((total, time) => {
        const timeValue = typeof time === 'string' ? parseInt(time, 10) : time;
        return total + (timeValue || 0);
      }, 0);
      
      if (totalFromSession > 0) {
        console.log(`✅ Using session stepTargetTimes: ${totalFromSession}s`);
        return totalFromSession;
      }
    }
    
    // Method 2: Dari work instruction steps
    if (workInstruction?.totalStepTargetTime > 0) {
      console.log(`✅ Using work instruction totalStepTargetTime: ${workInstruction.totalStepTargetTime}s`);
      return workInstruction.totalStepTargetTime;
    }
    
    // Method 3: Dari work instruction standardTime/targetTime
    if (workInstruction?.standardTime > 0) {
      console.log(`✅ Using work instruction standardTime: ${workInstruction.standardTime}s`);
      return workInstruction.standardTime;
    }
    
    if (workInstruction?.targetTime > 0) {
      console.log(`✅ Using work instruction targetTime: ${workInstruction.targetTime}s`);
      return workInstruction.targetTime;
    }
    
    // Method 4: Hitung manual dari steps jika ada
    if (workInstruction?.steps && Array.isArray(workInstruction.steps)) {
      const calculatedTotal = workInstruction.steps.reduce((total, step) => {
        const maxTime = step.maxTime || step.max_time || step.duration || step.targetTime || 0;
        const timeValue = typeof maxTime === 'string' ? parseInt(maxTime, 10) : maxTime;
        return total + (timeValue || 0);
      }, 0);
      
      if (calculatedTotal > 0) {
        console.log(`✅ Calculated from steps: ${calculatedTotal}s`);
        return calculatedTotal;
      }
    }
    
    console.log(`⚠️ No target time found for session ${session.id}`);
    return 0;
  };

  // Enhanced completion stats with better target time handling and status stats
  const getCompletionStats = (data) => {
    const totalSteps = data.reduce((acc, entry) => acc + entry.stepTimes.length, 0);
    const completedSteps = data.reduce((acc, entry) => 
      acc + entry.stepTimes.filter(step => step.status === 'completed').length, 0
    );
    const skippedSteps = data.reduce((acc, entry) => 
      acc + entry.stepTimes.filter(step => step.status === 'skipped').length, 0
    );
    const pendingSteps = totalSteps - completedSteps - skippedSteps;

    // Status statistics
    const approvedSessions = data.filter(entry => entry.status === 'approved').length;
    const rejectedSessions = data.filter(entry => entry.status === 'rejected').length;
    const pendingSessions = data.filter(entry => entry.status === 'pending' || !entry.status).length;

    // Enhanced efficiency calculation
    let totalActualTime = 0;
    let totalTargetTime = 0;
    let sessionsWithTarget = 0;
    let efficientSessions = 0;

    data.forEach(entry => {
      totalActualTime += entry.totalTime;
      if (entry.targetTime > 0) {
        totalTargetTime += entry.targetTime;
        sessionsWithTarget++;
        
        if (entry.totalTime <= entry.targetTime) {
          efficientSessions++;
        }
      }
    });

    const avgEfficiency = totalTargetTime > 0 ? 
      ((totalTargetTime / totalActualTime) * 100).toFixed(1) : 0;

    return {
      total: totalSteps,
      completed: completedSteps,
      skipped: skippedSteps,
      pending: pendingSteps,
      completedPercentage: totalSteps > 0 ? ((completedSteps / totalSteps) * 100).toFixed(1) : 0,
      skippedPercentage: totalSteps > 0 ? ((skippedSteps / totalSteps) * 100).toFixed(1) : 0,
      pendingPercentage: totalSteps > 0 ? ((pendingSteps / totalSteps) * 100).toFixed(1) : 0,
      avgEfficiency: avgEfficiency,
      efficientSessions: efficientSessions,
      totalSessions: data.length,
      sessionsWithTarget: sessionsWithTarget,
      efficiencyPercentage: sessionsWithTarget > 0 ? ((efficientSessions / sessionsWithTarget) * 100).toFixed(1) : 0,
      // Status stats
      approvedSessions,
      rejectedSessions,
      pendingSessions,
      approvalRate: data.length > 0 ? ((approvedSessions / data.length) * 100).toFixed(1) : 0
    };
  };

  useEffect(() => {
    const fetchWorkSessions = async () => {
      try {
        setLoading(true);
        setError('');
        
        // TAMBAHKAN INI UNTUK DEBUGGING
        await debugDataStructure();
        
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
            const dateA = a.createdAt || new Date(0);
            const dateB = b.createdAt || new Date(0);
            return dateB - dateA;
          });
        }

        // Collect unique users for filter
        const uniqueUsers = new Set();

        const transformedData = await Promise.all(
          sessions
            .filter(session => session.completedAt)
            .map(async (session) => {
              const stepTimes = [];
              
              if (session.stepStatuses && session.stepCompletionTimes) {
                session.stepStatuses.forEach((status, index) => {
                  const duration = session.stepCompletionTimes[index] || 0;
                  const stepTitle = `Langkah ${index + 1}`;
                  const stepTargetTime = session.stepTargetTimes ? session.stepTargetTimes[index] || 0 : 0;
                  
                  stepTimes.push({
                    step: stepTitle,
                    duration: duration,
                    targetTime: stepTargetTime,
                    status: status,
                    efficiency: stepTargetTime > 0 ? ((stepTargetTime / duration) * 100).toFixed(1) : 0
                  });
                });
              }

              const userName = await getUserData(session.userId || 'Unknown User');
              uniqueUsers.add(userName);

              // Get work instruction data
              const workInstruction = instructions[session.workInstructionId];
              
              // Calculate target time using enhanced method
              const targetTime = calculateTargetTime(session, workInstruction);

              console.log(`Processing session ${session.id}:`, {
                workInstructionId: session.workInstructionId,
                stepTargetTimes: session.stepTargetTimes,
                calculatedTargetTime: targetTime,
                workInstruction: workInstruction,
                status: session.status || 'pending' // Default status jika belum ada
              });

              const actualTime = session.totalTime || 0;
              const efficiency = targetTime > 0 ? ((targetTime / actualTime) * 100).toFixed(1) : 0;
              const isEfficient = targetTime > 0 && actualTime <= targetTime;

              return {
                id: session.id,
                nama: userName,
                userId: session.userId,
                tanggal: session.completedAt || session.createdAt,
                totalTime: actualTime,
                targetTime: targetTime,
                stepTimes: stepTimes,
                workInstructionTitle: session.workInstructionTitle || workInstruction?.title || 'Unknown Task',
                workInstructionId: session.workInstructionId,
                startTime: session.startTime,
                currentStep: session.currentStep,
                totalSteps: session.totalSteps,
                isActive: session.isActive,
                efficiency: efficiency,
                isEfficient: isEfficient,
                hasTargetTime: targetTime > 0,
                // Status fields
                status: session.status || 'pending',
                statusUpdatedAt: session.statusUpdatedAt,
                statusUpdatedBy: session.statusUpdatedBy
              };
            })
        );

        console.log('Transformed data sample:', transformedData.slice(0, 2));

        // Set users list for filter
        setUsersList(Array.from(uniqueUsers).sort());
        
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

  // Enhanced filter with user selection and status filter
  const filteredData = data.filter(entry => {
    const date = entry.tanggal;
    const bulanMatch = bulan ? date.getMonth() + 1 === parseInt(bulan) : true;
    const tahunMatch = tahun ? date.getFullYear() === parseInt(tahun) : true;
    const userMatch = selectedUser ? entry.nama === selectedUser : true;
    const statusMatch = selectedStatus ? entry.status === selectedStatus : true;
    return bulanMatch && tahunMatch && userMatch && statusMatch;
  });

  // Calculate completion stats for filtered data
  const completionStats = getCompletionStats(filteredData);

  // Enhanced handleExport function
  const handleExport = async () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }

    try {
      setExporting(true);
      
      const result = await excelExport.exportWorkSessions(filteredData, bulan, tahun, selectedUser, selectedStatus);
      
      alert(`✅ Export berhasil!\nFile: ${result.fileName}\nJumlah data: ${result.recordCount} sessions`);
      
    } catch (error) {
      console.error('Export error:', error);
      alert(`❌ Export gagal: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleViewReport = () => {
    navigate('/reportadmin', { 
      state: { 
        filteredData, 
        bulan, 
        tahun,
        selectedUser,
        selectedStatus
      } 
    });
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

  // Function untuk render status badge
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

  // Function untuk render action buttons
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

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-header-left">
            <img 
              src="/logoLRS.png" 
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
      {/* Header */}
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

      {/* Sidebar */}
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
              handleViewReport();
              setSidebarOpen(false);
            }} 
            className="admin-sidebar-item"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            <span>Work Sessions Report</span>
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

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="admin-sidebar-overlay"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Main Content */}
      <div className={`admin-main-content ${sidebarOpen ? 'admin-main-content-shifted' : ''}`}>
        {/* Error Message */}
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

        {/* Enhanced Filter Section */}
        <div className="admin-filter-section">
          <div className="admin-filter-title">
            <h2>Filter Data Work Sessions</h2>
            <p>Pilih periode, user, dan status untuk melihat data work sessions karyawan</p>
          </div>
          <div className="admin-filter-bar">
            <div className="admin-filter-group">
              <label>User:</label>
              <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                <option value="">Semua User</option>
                {usersList.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-filter-group">
              <label>Status:</label>
              <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                <option value="">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>

            <div className="admin-filter-group">
              <label>Bulan:</label>
              <select value={bulan} onChange={e => setBulan(e.target.value)}>
                <option value="">Semua Bulan</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-filter-group">
              <label>Tahun:</label>
              <input
                type="number"
                min="2020"
                max="2100"
                value={tahun}
                onChange={e => setTahun(e.target.value)}
              />
            </div>

            <div className="admin-filter-actions">
              <button 
                onClick={handleExport} 
                className="admin-export-button"
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <div className="loading-spinner" style={{width: '16px', height: '16px'}}></div>
                    Mengekspor...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Ekspor Excel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards with Status Info */}
        <div className="admin-stats">
          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
            </div>
            <div className="admin-stat-content">
              <div className="admin-stat-number">{completionStats.completedPercentage}%</div>
              <div className="admin-stat-label">Tingkat Selesai</div>
              <div className="admin-stat-detail">{completionStats.completed} dari {completionStats.total} langkah</div>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div className="admin-stat-content">
              <div className="admin-stat-number">{completionStats.avgEfficiency}%</div>
              <div className="admin-stat-label">Efisiensi Rata-rata</div>
              <div className="admin-stat-detail">
                {completionStats.efficientSessions} dari {completionStats.sessionsWithTarget} session efisien
              </div>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon approval">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <div className="admin-stat-content">
              <div className="admin-stat-number">{completionStats.approvalRate}%</div>
              <div className="admin-stat-label">Tingkat Persetujuan</div>
              <div className="admin-stat-detail">
                {completionStats.approvedSessions} dari {completionStats.totalSessions} session disetujui
              </div>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <div className="admin-stat-content">
              <div className="admin-stat-number">
                {filteredData.length > 0 ? 
                  formatTime(filteredData.reduce((acc, curr) => acc + curr.totalTime, 0) / filteredData.length) : 
                  '00:00:00'
                }
              </div>
              <div className="admin-stat-label">Rata-rata Waktu Aktual</div>
              <div className="admin-stat-detail">
                Target: {filteredData.filter(d => d.hasTargetTime).length > 0 ? 
                  formatTime(filteredData.filter(d => d.hasTargetTime).reduce((acc, curr) => acc + curr.targetTime, 0) / filteredData.filter(d => d.hasTargetTime).length) : 
                  'N/A'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Status Summary Cards */}
        <div className="admin-status-summary">
          <div className="admin-status-card pending">
            <div className="admin-status-number">{completionStats.pendingSessions}</div>
            <div className="admin-status-label">Menunggu Review</div>
          </div>
          <div className="admin-status-card approved">
            <div className="admin-status-number">{completionStats.approvedSessions}</div>
            <div className="admin-status-label">Disetujui</div>
          </div>
          <div className="admin-status-card rejected">
            <div className="admin-status-number">{completionStats.rejectedSessions}</div>
            <div className="admin-status-label">Ditolak</div>
          </div>
        </div>

        {/* Enhanced Table Section with Status and Action Columns */}
        <div className="admin-table-section">
          <div className="admin-table-header">
            <h2>Data Work Sessions</h2>
            <div className="admin-table-info">
              Menampilkan {filteredData.length} dari {data.length} total work sessions
              {selectedUser && ` untuk user: ${selectedUser}`}
              {selectedStatus && ` dengan status: ${selectedStatus}`}
            </div>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama User</th>
                  <th>Instruksi Kerja</th>
                  <th>Tanggal Selesai</th>
                  <th>Waktu Aktual</th>
                  <th>Waktu Target</th>
                  <th>Efisiensi</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Aksi</th>
                  <th>Detail Langkah</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="admin-empty-state">
                      <div className="admin-empty-content">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <circle cx="11" cy="11" r="8"/>
                          <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <h3>Tidak ada data ditemukan</h3>
                        <p>Tidak ada work sessions untuk filter yang dipilih</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((entry, index) => (
                    <tr key={entry.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="admin-name-cell">
                          <div className="admin-name-avatar">
                            {entry.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span>{entry.nama}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin-task-cell">
                          <strong>{entry.workInstructionTitle}</strong>
                        </div>
                      </td>
                      <td>{entry.tanggal.toLocaleDateString('id-ID')}</td>
                      <td>
                        <span className="admin-time-badge">
                          {formatTime(entry.totalTime)}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-target-time-badge ${entry.hasTargetTime ? 'has-target' : 'no-target'}`}>
                          {entry.hasTargetTime ? formatTime(entry.targetTime) : 'Tidak ada'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-efficiency-cell">
                          <span className={`admin-efficiency-badge ${entry.isEfficient ? 'efficient' : 'inefficient'}`}>
                            {entry.hasTargetTime ? `${entry.efficiency}%` : 'N/A'}
                          </span>
                          {entry.isEfficient && entry.hasTargetTime && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="admin-efficiency-icon">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22,4 12,14.01 9,11.01"/>
                            </svg>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="admin-progress-cell">
                          <span>{entry.stepTimes.filter(s => s.status === 'completed').length}/{entry.stepTimes.length}</span>
                          <div className="progress-bar-mini">
                            <div 
                              className="progress-fill-mini" 
                              style={{ 
                                width: `${(entry.stepTimes.filter(s => s.status === 'completed').length / entry.stepTimes.length) * 100}%` 
                              }}
                            />
                          </div>
                          <small className="admin-progress-percentage">
                            {((entry.stepTimes.filter(s => s.status === 'completed').length / entry.stepTimes.length) * 100).toFixed(1)}%
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="admin-status-cell">
                          {renderStatusBadge(entry.status)}
                          {entry.statusUpdatedAt && (
                            <small className="admin-status-date">
                              {entry.statusUpdatedAt.toLocaleDateString('id-ID')}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        {renderActionButtons(entry.id, entry.status)}
                      </td>
                      <td>
                        <div className="admin-steps-container">
                          {entry.stepTimes.slice(0, 3).map((step, i) => (
                            <div key={i} className={`admin-step-item ${step.status}`}>
                              <span className="admin-step-name">{step.step}</span>
                              <div className="admin-step-times">
                                <span className="admin-step-time">{formatStepTime(step.duration)}</span>
                                {step.targetTime > 0 && (
                                  <span className="admin-step-target">/{formatStepTime(step.targetTime)}</span>
                                )}
                              </div>
                              <span className={`admin-step-status ${step.status}`}>
                                {step.status === 'completed' ? '✓' : step.status === 'skipped' ? '⏭' : '○'}
                              </span>
                              {step.targetTime > 0 && step.efficiency > 0 && (
                                <span className={`admin-step-efficiency ${step.duration <= step.targetTime ? 'efficient' : 'inefficient'}`}>
                                  {step.efficiency}%
                                </span>
                              )}
                            </div>
                          ))}
                          {entry.stepTimes.length > 3 && (
                            <div className="admin-step-item more">
                              +{entry.stepTimes.length - 3} langkah lainnya
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Utils with better time formatting
const formatTime = (seconds) => {
  if (seconds === 0) return '00:00:00';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const formatStepTime = (seconds) => {
  if (seconds === 0) return '00:00';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default AdminPage