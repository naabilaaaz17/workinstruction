// TaskWithoutMO.js - Enhanced version with better MO integration
import React, { useState, useCallback, useEffect } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  doc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  X,
  LogOut,
  Home,
  CheckCircle,
  Briefcase,
  FileText,
  Clock,
  AlertCircle,
  Eye,
  Play,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import logoLRS from '../assets/images/logoLRS.png';
import './TaskWithoutMO.css';

// Enhanced loadIndependentTasks function with better error handling and logging
const loadIndependentTasksEnhanced = async (setTasks, setIndependentTasks, setLoading) => {
  setLoading(true);
  console.log('🔄 Loading independent tasks...');
  
  try {
    // Load all tasks with real-time listener for better sync
    const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const tasksSnapshot = await getDocs(tasksQuery);
    const allTasks = tasksSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure required fields exist
        title: data.title || 'Untitled Task',
        description: data.description || '',
        steps: data.steps || [],
      };
    });

    console.log(`📝 Total tasks found: ${allTasks.length}`);

    // Load all MOs to check task associations
    const mosQuery = query(collection(db, 'mos'), orderBy('createdAt', 'desc'));
    const mosSnapshot = await getDocs(mosQuery);
    const allMOs = mosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📋 Total MOs found: ${allMOs.length}`);

    // Enhanced task ID tracking with detailed logging
    const taskIdsInMOs = new Set();
    const moTaskAssociations = {}; // Track which MO each task belongs to

    allMOs.forEach(mo => {
      if (mo.selectedTasks && Array.isArray(mo.selectedTasks)) {
        console.log(`🔗 MO "${mo.moNumber}" has ${mo.selectedTasks.length} associated tasks`);
        
        mo.selectedTasks.forEach(task => {
          if (task.id) {
            taskIdsInMOs.add(task.id);
            moTaskAssociations[task.id] = {
              moId: mo.id,
              moNumber: mo.moNumber,
              moTitle: mo.title
            };
          }
        });
      }
    });

    console.log(`🔗 Tasks associated with MOs: ${taskIdsInMOs.size}`);
    console.log('Associated task IDs:', Array.from(taskIdsInMOs));

    // Filter independent tasks with detailed logging
    const independentTasksList = allTasks.filter(task => {
      const isIndependent = !taskIdsInMOs.has(task.id);
      if (!isIndependent) {
        const association = moTaskAssociations[task.id];
        console.log(`🔗 Task "${task.title}" is associated with MO: ${association?.moNumber}`);
      }
      return isIndependent;
    });
    
    console.log(`🆓 Independent tasks found: ${independentTasksList.length}`);
    independentTasksList.forEach(task => {
      console.log(`   - ${task.title}`);
    });

    setTasks(allTasks);
    setIndependentTasks(independentTasksList);
    
  } catch (error) {
    console.error('❌ Error loading independent tasks:', error);
  } finally {
    setLoading(false);
  }
};

// Header Component with refresh functionality
const TaskWithoutMOHeader = ({ onLogout, onBack, onRefresh }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.TWM-profile-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogoClick = () => {
    navigate('/home');
  };

  return (
    <div className="TWM-header-bar">
      <div className="TWM-header-left">
        <button 
          className="TWM-back-btn"
          onClick={onBack}
          title="Kembali"
        >
          <ArrowLeft size={20} />
        </button>
        <img 
          src={logoLRS} 
          alt="LRS Logo" 
          className="TWM-logo"
          onClick={handleLogoClick}
          style={{ cursor: 'pointer' }}
        />
      </div>
      <div className="TWM-header-center">
        <h1 className="TWM-title-header">Work Instructions</h1>
      </div>
      <div className="TWM-header-right">
        <div className="TWM-profile-container">
          <button
            className="TWM-profile-btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="TWM-profile-avatar">
              <span className="TWM-avatar-text">A</span>
            </div>
            <div className="TWM-profile-info">
              <div className="TWM-profile-name">Admin</div>
              <div className="TWM-profile-id">Administrator</div>
            </div>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className={`TWM-dropdown-arrow ${showDropdown ? 'rotated' : ''}`}
            >
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </button>

          {showDropdown && (
            <div className="TWM-dropdown-menu">
              <div className="TWM-dropdown-header">
                <div className="TWM-profile-avatar">
                  <span className="TWM-avatar-text">A</span>
                </div>
                <div>
                  <div className="TWM-dropdown-name">Admin</div>
                  <div className="TWM-dropdown-role">Administrator</div>
                </div>
              </div>
              <hr className="TWM-dropdown-divider" />
              <button 
                className="TWM-dropdown-item TWM-dropdown-logout" 
                onClick={() => {
                  setShowDropdown(false);
                  onLogout();
                }}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Task List Component with better empty states
const TaskList = ({ tasks, onView, onEdit, onDelete, onStartWork, loading, searchTerm, onSearchChange, onRefresh }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };


  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.category && task.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="TWM-loading-overlay">
        <div className="TWM-loading-content">
          <div className="TWM-loading-spinner"></div>
          <p>Memuat data task...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="TWM-task-list-container">
      <div className="TWM-list-header">
        <div className="TWM-list-info">
          <h2>Work Instructions ({filteredTasks.length})</h2>
        </div>
        
        <div className="TWM-list-actions">
          <div className="TWM-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Cari task..."
              value={searchTerm}
              onChange={onSearchChange}
              className="TWM-search-input"
            />
          </div>
          <button
            onClick={onRefresh}
            className="TWM-btn TWM-btn-secondary"
            title="Refresh data"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="TWM-empty-state">
          <div className="TWM-empty-icon">📝</div>
          <h3>
            {searchTerm 
              ? 'Tidak ada task yang sesuai' 
              : tasks.length === 0 
              ? 'Semua task sudah terkait dengan MO' 
              : 'Tidak ada task'
            }
          </h3>
          <p>
            {searchTerm 
              ? 'Coba ubah kata kunci pencarian Anda' 
              : tasks.length === 0
              ? 'Semua task yang ada sudah dikaitkan dengan MO. Task baru yang dibuat akan muncul di sini.'
              : 'Semua task sudah memiliki asosiasi MO'
            }
          </p>
        </div>
      ) : (
        <div className="TWM-task-grid">
          {filteredTasks.map((task) => {
            
            return (
              <div key={task.id} className="TWM-task-card">
            
                
                <div className="TWM-card-body">
                  <h3 className="TWM-card-title">{task.title}</h3>
                  <p className="TWM-card-description">{task.description}</p>
                  
                  <div className="TWM-card-meta">
                    <div className="TWM-meta-row">
                      <span className="TWM-meta-item">
                        📝 {task.steps?.length || 0} langkah
                      </span>
                    </div>
                    <div className="TWM-meta-row">
                      {task.estimatedDuration && (
                        <span className="TWM-meta-item">
                          ⏱️ {task.estimatedDuration} menit
                        </span>
                      )}
                      <span className="TWM-meta-item">
                        📅 {formatDate(task.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="TWM-card-actions">
                  <button 
                    onClick={() => onStartWork(task)} 
                    className="TWM-btn"
                    title="Mulai mengerjakan task"
                  >
                    <Play size={14} />
                    Mulai Kerja
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Task Detail View Component (keeping existing implementation)
const TaskDetailView = ({ task, onEdit, onDelete, onBack, onStartWork }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const calculateTotalTime = (steps) => {
    return steps.reduce((total, step) => {
      const stepTime = parseInt(step.maxTime) || 0;
      return total + Math.round(stepTime / 60);
    }, 0);
  };


  return (
    <div className="TWM-task-detail">
      <div className="TWM-task-detail-header">
        <button onClick={onBack} className="TWM-back-btn">
          ← Kembali
        </button>
        <div className="TWM-task-actions">
          <button 
            onClick={() => onStartWork(task)} 
            className="TWM-btn TWM-btn-primary TWM-btn-sm"
            title="Mulai mengerjakan task"
          >
            <Play size={16} />
            Mulai Kerja
          </button>
          <button onClick={() => onEdit(task)} className="TWM-btn TWM-btn-warning TWM-btn-sm">
            <Edit3 size={16} />
            Edit
          </button>
          <button onClick={() => onDelete(task)} className="TWM-btn TWM-btn-danger TWM-btn-sm">
            <Trash2 size={16} />
            Hapus
          </button>
        </div>
      </div>

      <div className="TWM-task-overview">
        <div className="TWM-task-header-info">
          <h1 className="TWM-task-title">{task.title}</h1>
        </div>

        <div className="TWM-task-meta-grid">
          <div className="TWM-meta-item">
            <Clock size={16} />
            <div>
              <span className="TWM-meta-label">Estimasi Durasi</span>
              <span className="TWM-meta-value">
                {task.estimatedDuration ? `${task.estimatedDuration} menit` : 'Tidak ditentukan'}
              </span>
            </div>
          </div>
          <div className="TWM-meta-item">
            <FileText size={16} />
            <div>
              <span className="TWM-meta-label">Total Langkah</span>
              <span className="TWM-meta-value">{task.steps?.length || 0} langkah</span>
            </div>
          </div>
          <div className="TWM-meta-item">
            <AlertCircle size={16} />
            <div>
              <span className="TWM-meta-label">Total Waktu Langkah</span>
              <span className="TWM-meta-value">
                {calculateTotalTime(task.steps || [])} menit
              </span>
            </div>
          </div>
        </div>

        <div className="TWM-task-description">
          <h3>📝 Deskripsi</h3>
          <p>{task.description}</p>
        </div>

        <div className="TWM-task-metadata">
          <div className="TWM-metadata-item">
            <span className="TWM-metadata-label">Dibuat oleh:</span>
            <span className="TWM-metadata-value">{task.createdByEmail || 'Unknown'}</span>
          </div>
          <div className="TWM-metadata-item">
            <span className="TWM-metadata-label">Tanggal dibuat:</span>
            <span className="TWM-metadata-value">{formatDate(task.createdAt)}</span>
          </div>
          {task.updatedAt && (
            <div className="TWM-metadata-item">
              <span className="TWM-metadata-label">Terakhir diupdate:</span>
              <span className="TWM-metadata-value">{formatDate(task.updatedAt)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="TWM-steps-section">
        <h2 className="TWM-steps-header">
          📋 Langkah-langkah Kerja ({task.steps?.length || 0})
        </h2>
        
        <div className="TWM-steps-list">
          {task.steps?.map((step, index) => (
            <div key={index} className="TWM-step-card">
              <div className="TWM-step-header">
                <div className="TWM-step-number">{index + 1}</div>
                <div className="TWM-step-title-section">
                  <h3 className="TWM-step-title">{step.title}</h3>
                  {step.maxTime && (
                    <span className="TWM-step-time">
                      ⏱️ {Math.round(parseInt(step.maxTime) / 60)} menit
                    </span>
                  )}
                </div>
              </div>
              
              <div className="TWM-step-content">
                <div className="TWM-step-description">
                  <p>{step.description}</p>
                </div>

                {step.keyPoints?.length > 0 && step.keyPoints.some(point => point.trim()) && (
                  <div className="TWM-step-points">
                    <h4 className="TWM-points-title">🎯 Poin Penting:</h4>
                    <ul className="TWM-points-list">
                      {step.keyPoints
                        .filter(point => point.trim())
                        .map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))
                      }
                    </ul>
                  </div>
                )}

                {step.safetyPoints?.length > 0 && step.safetyPoints.some(point => point.trim()) && (
                  <div className="TWM-step-safety">
                    <h4 className="TWM-safety-title">⚠️ Keselamatan:</h4>
                    <ul className="TWM-safety-list">
                      {step.safetyPoints
                        .filter(point => point.trim())
                        .map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))
                      }
                    </ul>
                  </div>
                )}

                {step.imageUrls?.length > 0 && step.imageUrls.some(url => url.trim()) && (
                  <div className="TWM-step-images">
                    <h4 className="TWM-images-title">🖼️ Gambar Panduan:</h4>
                    <div className="TWM-images-grid">
                      {step.imageUrls
                        .filter(url => url.trim())
                        .map((url, idx) => (
                          <div key={idx} className="TWM-image-container">
                            <img 
                              src={url} 
                              alt={`Panduan langkah ${index + 1} - ${idx + 1}`}
                              className="TWM-step-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal (keeping existing implementation)
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false }) => {
  if (!isOpen) return null;

  return (
    <div className="TWM-modal-overlay">
      <div className="TWM-modal-content">
        <div className="TWM-modal-header">
          <h3>{title}</h3>
        </div>
        <div className="TWM-modal-body">
          <p>{message}</p>
        </div>
        <div className="TWM-modal-actions">
          <button onClick={onCancel} className="TWM-btn TWM-btn-secondary">
            Batal
          </button>
          <button 
            onClick={onConfirm} 
            className={`TWM-btn ${isDestructive ? 'TWM-btn-danger' : 'TWM-btn-primary'}`}
          >
            {isDestructive ? 'Hapus' : 'Konfirmasi'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Main TaskWithoutMO Component with real-time updates
const TaskWithoutMO = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('list');
  const [tasks, setTasks] = useState([]);
  const [independentTasks, setIndependentTasks] = useState([]);
  const [viewingTask, setViewingTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false
  });

  // Enhanced load function with better integration
  const loadIndependentTasks = useCallback(async () => {
    await loadIndependentTasksEnhanced(setTasks, setIndependentTasks, setLoading);
  }, []);

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    await loadIndependentTasks();
  }, [loadIndependentTasks]);

  useEffect(() => {
    loadIndependentTasks();

    // Set up real-time listeners for better synchronization
    const tasksUnsubscribe = onSnapshot(
      query(collection(db, 'tasks'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        console.log('🔄 Tasks collection changed, refreshing...');
        loadIndependentTasks();
      },
      (error) => {
        console.error('❌ Tasks listener error:', error);
      }
    );

    const mosUnsubscribe = onSnapshot(
      query(collection(db, 'mos')),
      (snapshot) => {
        console.log('🔄 MOs collection changed, refreshing independent tasks...');
        loadIndependentTasks();
      },
      (error) => {
        console.error('❌ MOs listener error:', error);
      }
    );

    // Cleanup listeners
    return () => {
      tasksUnsubscribe();
      mosUnsubscribe();
    };
  }, [loadIndependentTasks]);

  const handleLogout = useCallback(async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, [navigate]);

  const handleBack = useCallback(() => {
    if (currentView === 'view') {
      setCurrentView('list');
      setViewingTask(null);
    } else {
      navigate('/admin');
    }
  }, [currentView, navigate]);

  const handleView = (task) => {
    setViewingTask(task);
    setCurrentView('view');
  };

  const handleEdit = (task) => {
    navigate('/addTask', { state: { editTask: task } });
  };

  const handleDelete = (task) => {
    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Hapus',
      message: `Apakah Anda yakin ingin menghapus task "${task.title}"? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          await deleteDoc(doc(db, 'tasks', task.id));
          await loadIndependentTasks();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Error deleting task:', error);
        } finally {
          setLoading(false);
        }
      },
      isDestructive: true
    });
  };

  const handleStartWork = useCallback((task) => {
    console.log('🎯 Starting independent task execution:', task);
    
    if (!task || !task.steps || task.steps.length === 0) {
      console.warn('⚠️ Task has no steps');
      alert('Task tidak memiliki langkah kerja yang valid. Silakan edit task untuk menambahkan Work Instruction.');
      return;
    }

    navigate(`/task-execution/${task.id}`, { 
      state: { 
        selectedTask: {
          ...task,
          workType: 'without-mo',
          moNumber: null,
          moDisplay: `Independent - ${task.title}`,
          title: task.title,
          description: task.description || '',
          steps: task.steps || [],
          category: task.category || 'General',
          difficulty: task.difficulty || 'medium',
          estimatedDuration: task.estimatedDuration,
          isIndependent: true
        },
        fromIndependentTasks: true,
        timestamp: new Date().toISOString()
      }
    });
  }, [navigate]);

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const renderContent = () => {
    switch (currentView) {
      case 'view':
        return (
          <TaskDetailView
            task={viewingTask}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBack={handleBack}
            onStartWork={handleStartWork}
          />
        );
      default:
        return (
          <TaskList
            tasks={independentTasks}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStartWork={handleStartWork}
            loading={loading}
            searchTerm={searchTerm}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
            onRefresh={handleRefresh}
          />
        );
    }
  };

  return (
    <div className="TWM-page">
      <TaskWithoutMOHeader 
        onLogout={handleLogout}
        onBack={handleBack}
        onRefresh={handleRefresh}
      />
      
      <main className="TWM-main">
        {renderContent()}
      </main>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  );
};

export default TaskWithoutMO;