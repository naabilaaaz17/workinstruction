import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './MOSelectionPage.css';
import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { TaskHeader, LoadingOverlay } from './TaskPageComponent';
import { Play } from 'lucide-react';

// Work Type Selection Modal Component
const WorkTypeSelectionModal = ({ isOpen, onClose, onSelectWithMO, selectedTask }) => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState(null);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedType(null);
    }
  }, [isOpen]);

  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectType = (type) => {
    setSelectedType(type);
    
    // Small delay for visual feedback
    setTimeout(() => {
      if (type === 'with-mo') {
        // Call the callback to show MO selection
        console.log('🚀 User selected: Work with MO');
        onSelectWithMO(); // This should trigger showing MO selection
      } else if (type === 'without-mo') {
        // Navigate to Task Without MO Page
        console.log('🚀 Navigating to task without MO...');
        navigate('/tasklist');
      }
    }, 150);
  };

  const handleClose = () => {
    setSelectedType(null);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div className="mo-selection-modal-overlay" onClick={handleOverlayClick}>
      <div className="mo-selection-work-type-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="mo-selection-modal-header">
          <h3>🚀 Pilih Jenis Pekerjaan</h3>
          <button 
            className="mo-selection-modal-close-btn" 
            onClick={handleClose}
            aria-label="Tutup modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="mo-selection-modal-content">
          <p className="mo-selection-modal-description">
            Silakan pilih jenis pekerjaan yang akan Anda lakukan:
          </p>

          <div className="mo-selection-work-type-options">
            {/* Work with MO Option */}
            <button
              className={`mo-selection-work-type-card ${selectedType === 'with-mo' ? 'selected' : ''}`}
              onClick={() => handleSelectType('with-mo')}
              onMouseEnter={() => setSelectedType('with-mo')}
              onMouseLeave={() => setSelectedType(null)}
            >
              <div className="mo-selection-card-icon">📋</div>
              <div className="mo-selection-card-content">
                <h4>Kerja dengan MO</h4>
              </div>
              <div className="mo-selection-card-arrow">→</div>
            </button>

            {/* Work without MO Option */}
            <button
              className={`mo-selection-work-type-card ${selectedType === 'without-mo' ? 'selected' : ''}`}
              onClick={() => handleSelectType('without-mo')}
              onMouseEnter={() => setSelectedType('without-mo')}
              onMouseLeave={() => setSelectedType(null)}
            >
              <div className="mo-selection-card-icon">⚙️</div>
              <div className="mo-selection-card-content">
                <h4>Kerja tanpa MO</h4>
              </div>
              <div className="mo-selection-card-arrow">→</div>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mo-selection-modal-footer">
          <button 
            className="mo-selection-cancel-btn" 
            onClick={handleClose}
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};

// MO Selection Component - Enhanced to work with MOManagementPage assignments
const MOSelectionComponent = React.memo(({ assignedTasks, onSelectMO, loading, error, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Memoize filtered tasks to avoid unnecessary recalculations
  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return assignedTasks;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return assignedTasks.filter(task => 
      task.moDisplay?.toLowerCase().includes(lowerSearchTerm) ||
      task.moNumber?.toLowerCase().includes(lowerSearchTerm) ||
      task.title?.toLowerCase().includes(lowerSearchTerm) ||
      task.description?.toLowerCase().includes(lowerSearchTerm)
    );
  }, [assignedTasks, searchTerm]);

  if (loading) {
    return <LoadingOverlay message="Memuat daftar MO yang ditugaskan..." />;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Terjadi Kesalahan</h2>
        <p>{error}</p>
        <button onClick={onRefresh} className="retry-button">
          Coba Lagi
        </button>
      </div>
    );
  }

  if (assignedTasks.length === 0) {
    return (
      <div className="no-tasks-container">
        <div className="no-tasks-content">
          <h2>📋 Tidak Ada Tugas</h2>
          <p>Saat ini tidak ada Manufacturing Order yang ditugaskan kepada Anda.</p>
          <p>Silakan hubungi admin untuk mendapatkan tugas baru.</p>
          <button onClick={onRefresh} className="retry-button">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const badges = {
      'assigned': { class: 'badge-info', text: 'Ditugaskan', icon: '📋' },
      'in_progress': { class: 'badge-warning', text: 'Sedang Dikerjakan', icon: '⚠️' },
      'completed': { class: 'badge-success', text: 'Selesai', icon: '✅' }
    };
    return badges[status] || badges.assigned;
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      low: { class: 'badge-success', text: 'Rendah', icon: '🟢' },
      medium: { class: 'badge-warning', text: 'Sedang', icon: '🟡' },
      high: { class: 'badge-danger', text: 'Tinggi', icon: '🟠' },
      urgent: { class: 'badge-critical', text: 'Urgent', icon: '🔴' }
    };
    return badges[priority] || badges.medium;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="mo-selection-section">
      <div className="mo-selection-header">
        <div className="mo-stats">
          <div className="mo-stat-item">
            <span className="mo-stat-number">{assignedTasks.length}</span>
            <span className="mo-stat-label">Total MO</span>
          </div>
          <div className="mo-stat-item">
            <span className="mo-stat-number">{filteredTasks.length}</span>
            <span className="mo-stat-label">Hasil Filter</span>
          </div>
        </div>
      <div className="mo-search-container">
        <input
          type="text"
          placeholder="Cari MO, instruksi kerja, atau deskripsi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mo-search-input"
        />
      </div>
      </div>


      {/* MO Cards */}
      <div className="mo-cards-container">
        {filteredTasks.map((task) => (
          <div key={task.id} className="mo-card">
            <div className="mo-card-header">
              <div className="mo-header-top">
                <h3 className="mo-display">{task.moDisplay}</h3>
                <div className="mo-badges">
                  {task.priority && (
                    <span className={`badge ${getPriorityBadge(task.priority).class}`}>
                      {getPriorityBadge(task.priority).icon} {getPriorityBadge(task.priority).text}
                    </span>
                  )}
                  {task.category && (
                    <span className="badge badge-category">
                      {task.category}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Division and MO Number */}
              <div className="mo-meta-line">
                {task.division && (
                  <span className="mo-division">🏢 {task.division}</span>
                )}
                <span className="mo-number">📄 {task.moNumber}</span>
              </div>
            </div>
            
            <div className="mo-card-content">
              <div className="work-instruction-info">
                <h4>Instruksi Kerja:</h4>
                <p className="wi-title">{task.title}</p>
                {task.description && (
                  <p className="wi-description">{task.description}</p>
                )}
                <div className="wi-details">
                  <span className="wi-steps">📝 {task.steps?.length || 0} Langkah</span>
                  {task.estimatedDuration && (
                    <span className="wi-duration">⏱️ {task.estimatedDuration} menit</span>
                  )}
                </div>
              </div>
              
              {/* Assignment Information */}
              <div className="assignment-info">
                <div className="assignment-dates">
                  <small>
                    📅 Ditugaskan: {formatDate(task.createdAt)}
                  </small>
                </div>

                {/* Show assignment status from MOManagementPage */}
                {task.assignments && task.assignments.length > 0 && (
                  <div className="operator-assignments">
                    <h5>👥 Operator Assigned:</h5>
                    <div className="assignment-list">
                      {task.assignments.map((assignment, index) => (
                        <div key={index} className="assignment-item">
                          <span className="operator-name">{assignment.operatorName}</span>

                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mo-card-actions">
              <button 
                className="select-mo-btn"
                onClick={() => onSelectMO(task)}
                title={`Mulai mengerjakan ${task.moDisplay}`}
              >
                <Play size={14} />              
                Mulai Kerja
              </button>
              
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && searchTerm && (
        <div className="no-search-results">
          <p>🔍 Tidak ada hasil untuk pencarian "{searchTerm}"</p>
          <button 
            onClick={() => setSearchTerm('')}
            className="clear-search-btn"
          >
            ❌ Hapus Pencarian
          </button>
        </div>
      )}
    </div>
  );
});

MOSelectionComponent.displayName = 'MOSelectionComponent';

// Main MO Selection Page Component - Enhanced with Auto Work Type Modal
const MOSelectionPage = () => {
  const navigate = useNavigate();
  const { moId } = useParams();
  
  // MO Selection states
  const [assignedTasks, setAssignedTasks] = useState([]);
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal states - Auto show modal on load
  const [showWorkTypeModal, setShowWorkTypeModal] = useState(true);
  const [showMOSelection, setShowMOSelection] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Handle back to home
  const handleBackToHome = useCallback(() => {
    navigate('/home');
  }, [navigate]);

  // Enhanced fetchAssignedTasks to work with MOManagementPage assignments
  const fetchAssignedTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        console.error('❌ User not authenticated');
        navigate('/login');
        return;
      }

      console.log(`🔄 Fetching assigned tasks for user: ${user.uid}`);
      console.log(`📧 User email: ${user.email}`);
      
      // Step 1: Get MOs where user is assigned
      const mosRef = collection(db, 'mos');
      let assignedMOs = [];

      try {
        // Query MOs with assignments array containing our user
        const mosSnapshot = await getDocs(mosRef);
        
        mosSnapshot.forEach(doc => {
          const moData = doc.data();
          
          // Check if user is assigned in the assignments array from MOManagementPage
          const isAssignedInMO = moData.assignments && moData.assignments.some(assignment => 
            assignment.operatorId === user.uid || 
            assignment.operatorEmail === user.email
          );

          if (isAssignedInMO && moData.isActive !== false) {
            console.log(`✅ Found assigned MO: ${moData.moNumber}`, moData);
            assignedMOs.push({
              id: doc.id,
              ...moData
            });
          }
        });

        console.log(`📊 Found ${assignedMOs.length} assigned MOs`);

      } catch (error) {
        console.error('❌ Error querying MOs:', error);
      }

      // Step 2: Get corresponding tasks for these MOs
      const tasksRef = collection(db, 'tasks');
      const tasksList = [];

      if (assignedMOs.length > 0) {
        try {
          // Get all active tasks
          const tasksQuery = query(tasksRef, where('isActive', '==', true));
          const tasksSnapshot = await getDocs(tasksQuery);
          
          tasksSnapshot.forEach(taskDoc => {
            const taskData = taskDoc.data();
            
            // Check if this task corresponds to an assigned MO
            const correspondingMO = assignedMOs.find(mo => 
              mo.moNumber === taskData.moNumber ||
              mo.id === taskData.moId ||
              (mo.title === taskData.title && mo.moNumber)
            );

            // Also check direct task assignments (legacy support)
            const isDirectlyAssigned = 
              (taskData.assignedOperators && taskData.assignedOperators.includes(user.uid)) ||
              (taskData.assignments && taskData.assignments.some(a => 
                (a.operatorId === user.uid || a.operatorEmail === user.email) &&
                a.status === 'assigned'
              )) ||
              (taskData.operatorAssigned && taskData.operatorAssigned.some(a =>
                a.operatorId === user.uid || a.email === user.email
              ));

            if (correspondingMO || isDirectlyAssigned) {
              const enhancedTask = {
                id: taskDoc.id,
                ...taskData,
                // Merge MO data if available
                ...(correspondingMO && {
                  moNumber: correspondingMO.moNumber,
                  moDisplay: correspondingMO.moNumber ? 
                    `${correspondingMO.moNumber} - ${taskData.title || correspondingMO.title}` : 
                    taskData.moDisplay,
                  description: taskData.description || correspondingMO.description,
                  division: correspondingMO.division,
                  category: correspondingMO.category,
                  priority: correspondingMO.priority,
                  estimatedDuration: taskData.estimatedDuration || correspondingMO.estimatedDuration,
                  assignments: correspondingMO.assignments, // Include MO assignments
                  createdAt: taskData.createdAt || correspondingMO.createdAt,
                  updatedAt: taskData.updatedAt || correspondingMO.updatedAt
                }),
                // Fallback values
                moNumber: taskData.moNumber || correspondingMO?.moNumber || `MO-${taskDoc.id.substring(0, 4)}`,
                moDisplay: taskData.moDisplay || 
                  (correspondingMO ? `${correspondingMO.moNumber} - ${taskData.title}` : 
                  `${taskData.moNumber || 'MO'} - ${taskData.title || 'Untitled'}`),
                title: taskData.title || correspondingMO?.title || 'Untitled Task',
                steps: taskData.steps || [],
                isActive: taskData.isActive !== false
              };

              console.log(`✅ Added task: ${enhancedTask.moDisplay}`);
              tasksList.push(enhancedTask);
            }
          });

        } catch (error) {
          console.error('❌ Error querying tasks:', error);
        }
      }

      // Step 3: If no tasks found, try legacy approach
      if (tasksList.length === 0) {
        console.log('🔄 No MO-based assignments found, trying legacy task assignments...');
        
        try {
          const queries = [
            query(
              tasksRef,
              where('assignedOperators', 'array-contains', user.uid),
              where('isActive', '==', true)
            ),
            query(
              tasksRef,
              where('operatorAssigned', 'array-contains', { 
                operatorId: user.uid,
                status: 'assigned'
              }),
              where('isActive', '==', true)
            )
          ];

          const results = await Promise.allSettled(queries.map(q => getDocs(q)));
          
          results.forEach((result) => {
            if (result.status === 'fulfilled') {
              result.value.forEach((doc) => {
                const taskData = doc.data();
                const legacyTask = {
                  id: doc.id,
                  moNumber: taskData.moNumber || `MO-${doc.id.substring(0, 4)}`,
                  moDisplay: taskData.moDisplay || 
                    `${taskData.moNumber || 'MO'} - ${taskData.title || 'Untitled'}`,
                  title: taskData.title || 'Untitled Task',
                  description: taskData.description || '',
                  steps: taskData.steps || [],
                  assignments: taskData.assignments || [],
                  operatorAssigned: taskData.operatorAssigned || [],
                  assignedOperators: taskData.assignedOperators || [],
                  createdAt: taskData.createdAt,
                  updatedAt: taskData.updatedAt,
                  estimatedDuration: taskData.estimatedDuration,
                  category: taskData.category,
                  priority: taskData.priority,
                  difficulty: taskData.difficulty,
                  division: taskData.division,
                  isActive: taskData.isActive !== false
                };

                // Avoid duplicates
                if (!tasksList.some(t => t.id === legacyTask.id)) {
                  tasksList.push(legacyTask);
                }
              });
            }
          });

        } catch (error) {
          console.error('❌ Error in legacy query:', error);
        }
      }

      console.log(`✅ Final task list: ${tasksList.length} tasks`);
      setAssignedTasks(tasksList);
      
      // Auto-select if moId provided
      if (moId && tasksList.length > 0) {
        const autoSelectTask = tasksList.find(task => 
          task.id === moId || task.moNumber === moId
        );
        if (autoSelectTask) {
          console.log('🎯 Auto-selecting task:', autoSelectTask);
          handleSelectMO(autoSelectTask);
        }
      }
      
    } catch (error) {
      console.error('❌ Error fetching assigned tasks:', error);
      setError(`Gagal memuat daftar tugas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [navigate, moId]);

  // Handle MO Selection - Now navigates to task execution
  const handleSelectMO = useCallback((task) => {
    console.log('🎯 Task selected for execution:', task);
    
    if (!task || !task.steps || task.steps.length === 0) {
      console.warn('⚠️ Task has no steps, checking if we should create WI first');
      setError('Task tidak memiliki langkah kerja yang valid. Silakan hubungi admin untuk menambahkan Work Instruction.');
      return;
    }

    // Navigate directly to task execution with MO
    navigate(`/task-execution/${task.id}`, { 
      state: { 
        selectedTask: {
          ...task,
          workType: 'with-mo'
        },
        fromMOSelection: true,
        timestamp: new Date().toISOString()
      }
    });
  }, [navigate]);

  // Handle closing work type modal
  const handleCloseWorkTypeModal = useCallback(() => {
    setShowWorkTypeModal(false);
    setSelectedTask(null);
    // Navigate back to home when closing
    navigate('/home');
  }, [navigate]);

  // Handle showing MO selection (when user selects "with-mo")
  const handleShowMOSelection = useCallback(() => {
    console.log('🎯 Showing MO Selection...');
    setShowWorkTypeModal(false);
    setShowMOSelection(true);
    // Fetch tasks when showing MO selection
    fetchAssignedTasks();
  }, [fetchAssignedTasks]);

  // Auto-refresh every 5 minutes to catch new assignments
  useEffect(() => {
    if (!showMOSelection) return;
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing assigned tasks...');
      fetchAssignedTasks();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchAssignedTasks, showMOSelection]);

  return (
    <div className="task-page">
      <TaskHeader 
        workInstructionTitle="Pilih Manufacturing Order"
        onBack={handleBackToHome}
      />
      
      {/* Show MO Selection only when modal is closed and with-mo was selected */}
      {showMOSelection && (
        <MOSelectionComponent
          assignedTasks={assignedTasks}
          onSelectMO={handleSelectMO}
          loading={loading}
          error={error}
          onRefresh={fetchAssignedTasks}
        />
      )}

      {/* Work Type Selection Modal - Auto shows on page load */}
      <WorkTypeSelectionModal
        isOpen={showWorkTypeModal}
        onClose={handleCloseWorkTypeModal}
        onSelectWithMO={handleShowMOSelection}
        selectedTask={selectedTask}
      />
    </div>
  );
};

export default MOSelectionPage;