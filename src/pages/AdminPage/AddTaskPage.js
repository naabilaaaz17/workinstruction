// Enhanced AddTaskPage.js with File Upload functionality
import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './AddTaskPage.css';
import { db, storage } from '../../firebase'; // Make sure storage is imported
import { 
  collection, 
  addDoc, 
  Timestamp, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  where 
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { getAuth, signOut } from 'firebase/auth';
import { Upload, File, Download, Eye, Trash2 } from 'lucide-react';

// Import utilities and components
import { 
  DEFAULT_STEP, 
  DEFAULT_TASK, 
  convertTimeToMinutes,
  convertMinutesToSeconds,
  calculateTotalStepTime,
  validateTask,
  distributeTimeEvenly,
  suggestStepTime
} from './AddTaskUtils';

import {
  TimeSummaryPanel,
  EnhancedStepForm,
  AddTaskHeader,
  Sidebar,
  LoadingOverlay,
  ConfirmationModal,
  TaskList,
  TaskDetailView
} from './AddTaskComponents';

// File Upload Component for AddTaskPage
const TaskFileUploadPanel = ({ task, onUpdateFiles, loading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = React.useRef(null);

  // Handle file selection
  const handleFileSelect = (files) => {
    const fileList = Array.from(files);
    const validFiles = fileList.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain'
      ];
      
      if (file.size > maxSize) {
        alert(`File ${file.name} terlalu besar. Maksimal 10MB.`);
        return false;
      }
      
      if (!allowedTypes.includes(file.type)) {
        alert(`File ${file.name} tidak didukung. Hanya PDF, Word, Excel, gambar, dan text yang diizinkan.`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      uploadFiles(validFiles);
    }
  };

  // Upload files to Firebase Storage
  const uploadFiles = async (files) => {
    const uploadPromises = files.map(async (file) => {
      const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const fileName = `${fileId}_${file.name}`;
      const storageRef = ref(storage, `task-attachments/${fileName}`);
      
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      try {
        // Upload file
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        // Create file metadata
        const fileData = {
          id: fileId,
          originalName: file.name,
          fileName: fileName,
          url: downloadURL,
          type: file.type,
          size: file.size,
          uploadedAt: Timestamp.now(),
          uploadedBy: getAuth().currentUser?.email || 'anonymous'
        };

        // Update progress to 100%
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        
        // Remove progress after a delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
        }, 2000);

        return fileData;
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
        alert(`Gagal mengupload ${file.name}`);
        return null;
      }
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    const successfulUploads = uploadedFiles.filter(file => file !== null);
    
    if (successfulUploads.length > 0) {
      const currentAttachments = task.attachments || [];
      onUpdateFiles([...currentAttachments, ...successfulUploads]);
    }
  };

  // Delete file
  const handleDeleteFile = async (file) => {
    try {
      // Delete from Firebase Storage
      const storageRef = ref(storage, `task-attachments/${file.fileName}`);
      await deleteObject(storageRef);
      
      // Update local state
      const currentAttachments = task.attachments || [];
      const updatedAttachments = currentAttachments.filter(f => f.id !== file.id);
      onUpdateFiles(updatedAttachments);
      
      console.log('File deleted:', file.originalName);
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Gagal menghapus file');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on type
  const getFileIcon = (type) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('image')) return '🖼️';
    if (type.includes('text')) return '📃';
    return '📁';
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <div className="task-file-upload-panel">
      <div className="task-file-upload-header">
        <h3>📎 File Attachments</h3>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-primary btn-sm"
          disabled={loading}
        >
          <Upload size={16} />
          Upload File
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: 'none' }}
      />

      {/* Drop zone */}
      <div
        className={`task-file-drop-zone ${dragActive ? 'task-drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="task-drop-zone-content">
          <Upload size={32} />
          <p>Drag & drop files here or click to select</p>
          <small>PDF, Word, Excel, Images, Text files (max 10MB each)</small>
        </div>
      </div>

      {/* Upload progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="task-upload-progress-section">
          <h4>Uploading files...</h4>
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="task-upload-progress-item">
              <div className="task-progress-bar">
                <div 
                  className="task-progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="task-progress-text">{progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* File list */}
      <div className="task-file-list">
        {(!task.attachments || task.attachments.length === 0) ? (
          <div className="task-no-files">
            <File size={24} />
            <p>Belum ada file yang diupload</p>
            <small>File akan membantu memberikan informasi tambahan untuk task ini</small>
          </div>
        ) : (
          <div className="task-uploaded-files">
            <h4>Files ({task.attachments.length})</h4>
            {task.attachments.map((file) => (
              <div key={file.id} className="task-file-item">
                <div className="task-file-info">
                  <div className="task-file-icon">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="task-file-details">
                    <div className="task-file-name">{file.originalName}</div>
                    <div className="task-file-meta">
                      <span className="task-file-size">{formatFileSize(file.size)}</span>
                      <span className="task-file-date">
                        {file.uploadedAt?.toDate ? 
                          file.uploadedAt.toDate().toLocaleDateString('id-ID') : 
                          'Unknown date'
                        }
                      </span>
                      <span className="task-file-uploader">by {file.uploadedBy}</span>
                    </div>
                  </div>
                </div>
                <div className="task-file-actions">
                  <button
                    type="button"
                    onClick={() => window.open(file.url, '_blank')}
                    className="task-file-action-btn task-btn-view"
                    title="View file"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = file.url;
                      a.download = file.originalName;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="task-file-action-btn task-btn-download"
                    title="Download file"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${file.originalName}?`)) {
                        handleDeleteFile(file);
                      }
                    }}
                    className="task-file-action-btn task-btn-delete"
                    title="Delete file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced DEFAULT_TASK with attachments field
const ENHANCED_DEFAULT_TASK = {
  ...DEFAULT_TASK,
  attachments: [] // Add attachments field
};

// Main AddTaskPage Component with File Upload
const AddTaskPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState('list');
  const [tasks, setTasks] = useState([]);
  const [task, setTask] = useState(ENHANCED_DEFAULT_TASK);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false
  });

  // LOGOUT FUNCTION
  const handleLogout = useCallback(async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      
      // Redirect ke LandingPage (root path)
      navigate('/');
      
      console.log('✅ User logged out successfully from AddTaskPage');
    } catch (error) {
      console.error('❌ Error during logout from AddTaskPage:', error);
      setErrors(prev => [...prev, `Gagal logout: ${error.message}`]);
    }
  }, [navigate]);

  // Load tasks from Firestore
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const tasksData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(tasksData);
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      setErrors([`Gagal memuat data: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('🚀 Component mounted, loading data...');
    loadTasks();
  }, [loadTasks]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleTaskChange = useCallback((field, value) => {
    setTask(prev => ({ ...prev, [field]: value }));
  }, []);

  // New function to handle file updates
  const handleFileUpdate = useCallback((attachments) => {
    setTask(prev => ({ ...prev, attachments }));
  }, []);

  const handleUpdateStep = useCallback((stepIndex, updatedStep) => {
    setTask(prev => {
      const newSteps = [...prev.steps];
      newSteps[stepIndex] = updatedStep;
      return { ...prev, steps: newSteps };
    });
  }, []);

  const handleAddStep = useCallback(() => {
    setTask(prev => ({
      ...prev,
      steps: [...prev.steps, { ...DEFAULT_STEP }]
    }));
  }, []);

  const handleRemoveStep = useCallback((stepIndex) => {
    if (task.steps.length > 1) {
      setTask(prev => ({
        ...prev,
        steps: prev.steps.filter((_, index) => index !== stepIndex)
      }));
    }
  }, [task.steps.length]);

  // Enhanced time management functions
  const handleDistributeTime = useCallback(() => {
    const estimatedDuration = parseInt(task.estimatedDuration) || 0;
    if (estimatedDuration > 0 && task.steps.length > 0) {
      const distribution = distributeTimeEvenly(estimatedDuration, task.steps.length);
      setTask(prev => ({
        ...prev,
        steps: prev.steps.map((step, index) => ({
          ...step,
          maxTime: distribution[index]?.toString() || ''
        }))
      }));
    }
  }, [task.estimatedDuration, task.steps.length]);

  const handleClearAllTimes = useCallback(() => {
    setTask(prev => ({
      ...prev,
      steps: prev.steps.map(step => ({
        ...step,
        maxTime: ''
      }))
    }));
  }, []);

  const handleAddNew = useCallback(() => {
    setTask(ENHANCED_DEFAULT_TASK);
    setEditingTask(null);
    setCurrentView('form');
    setShowPreview(false);
    setErrors([]);
  }, []);

  const handleView = useCallback((taskToView) => {
    setEditingTask(taskToView);
    setCurrentView('view');
  }, []);

  const handleEdit = useCallback((taskToEdit) => {
    setTask({
      ...taskToEdit,
      attachments: taskToEdit.attachments || [] // Ensure attachments field exists
    });
    setEditingTask(taskToEdit);
    setCurrentView('edit');
    setShowPreview(false);
    setErrors([]);
  }, []);

  const handleDelete = useCallback((taskToDelete) => {
    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Hapus',
      message: `Apakah Anda yakin ingin menghapus instruksi kerja "${taskToDelete.title}"? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua file terkait.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          // Delete associated files from storage if any
          if (taskToDelete.attachments && taskToDelete.attachments.length > 0) {
            for (const file of taskToDelete.attachments) {
              try {
                const storageRef = ref(storage, `task-attachments/${file.fileName}`);
                await deleteObject(storageRef);
              } catch (fileError) {
                console.error('Error deleting file:', file.fileName, fileError);
              }
            }
          }

          await deleteDoc(doc(db, 'tasks', taskToDelete.id));
          await loadTasks();
          setConfirmModal({ ...confirmModal, isOpen: false });
          setErrors([]);
        } catch (error) {
          console.error('❌ Error deleting task:', error);
          setErrors([`Gagal menghapus: ${error.message}`]);
        } finally {
          setLoading(false);
        }
      },
      isDestructive: true
    });
  }, [confirmModal, loadTasks]);

  const handleBack = useCallback(() => {
    if (currentView === 'form' || currentView === 'edit' || currentView === 'view') {
      setCurrentView('list');
      setTask(ENHANCED_DEFAULT_TASK);
      setEditingTask(null);
      setShowPreview(false);
      setErrors([]);
    }
  }, [currentView]);

  const handleSaveTask = useCallback(async () => {
    setErrors([]);
    setLoading(true);

    try {
      // Validate task
      const validationErrors = validateTask(task);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setLoading(false);
        return;
      }

      const auth = getAuth();
      const user = auth.currentUser;
      
      const taskData = {
        // Task Information
        title: task.title.trim(),
        description: task.description.trim(),
        category: task.category || 'General',
        difficulty: task.difficulty,
        estimatedDuration: task.estimatedDuration ? parseInt(task.estimatedDuration) : null,
        
        steps: task.steps.map(step => ({
          title: step.title.trim(),
          description: step.description.trim(),
          keyPoints: step.keyPoints.filter(point => point.trim() !== ''),
          safetyPoints: step.safetyPoints.filter(point => point.trim() !== ''),
          maxTime: step.maxTime ? parseInt(step.maxTime) : 0,
          imageUrls: step.imageUrls.filter(url => url.trim() !== '')
        })),
        
        // File attachments
        attachments: task.attachments || [],
        
        updatedAt: Timestamp.now(),
        isActive: true
      };

      console.log('💾 Saving task data:', taskData);

      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), taskData);
        console.log('✅ Task updated successfully');
      } else {
        taskData.createdBy = user?.uid || 'anonymous';
        taskData.createdByEmail = user?.email || 'anonymous';
        taskData.createdAt = Timestamp.now();
        taskData.version = 1;

        const docRef = await addDoc(collection(db, 'tasks'), taskData);
        console.log('✅ Task created successfully with ID:', docRef.id);
      }

      await loadTasks();
      setCurrentView('list');
      setTask(ENHANCED_DEFAULT_TASK);
      setEditingTask(null);
      setShowPreview(false);

    } catch (error) {
      console.error('❌ Error saving task:', error);
      setErrors([`Gagal menyimpan: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  }, [task, editingTask, loadTasks]);

  const handleTogglePreview = useCallback(() => {
    if (!showPreview) {
      // Validate task
      const validationErrors = validateTask(task);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }
      setErrors([]);
    }
    setShowPreview(prev => !prev);
  }, [task, showPreview]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    handleSaveTask();
  }, [handleSaveTask]);

  const closeConfirmModal = useCallback(() => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Calculate suggested times for steps
  const getSuggestedStepTimes = useCallback(() => {
    const estimatedDuration = parseInt(task.estimatedDuration) || 0;
    if (estimatedDuration <= 0 || task.steps.length === 0) {
      return task.steps.map(() => 0);
    }

    const averageTimePerStep = convertMinutesToSeconds(estimatedDuration / task.steps.length);
    return task.steps.map(step => suggestStepTime(step, averageTimePerStep));
  }, [task.estimatedDuration, task.steps]);

  const renderContent = () => {
    if (currentView === 'list') {
      return (
        <TaskList 
          tasks={tasks}
          onAddNew={handleAddNew}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      );
    }

    if (currentView === 'view' && editingTask) {
      return (
        <TaskDetailView 
          task={editingTask}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBack={handleBack}
        />
      );
    }

    if (currentView === 'form' || currentView === 'edit') {
      const suggestedTimes = getSuggestedStepTimes();

      return (
        <div className="add-task-container">
          {errors.length > 0 && (
            <div className="error-messages">
              <div className="error-header">
                <span className="error-icon">⚠️</span>
                <span>Terdapat kesalahan yang perlu diperbaiki:</span>
              </div>
              <ul className="error-list">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {showPreview ? (
            <div className="task-preview">
              <div className="preview-header">
                <h2>👁️ Preview Instruksi Kerja</h2>
                <div className="preview-actions">
                  <button 
                    onClick={handleTogglePreview}
                    className="btn btn-secondary"
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={handleSaveTask}
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? '💾 Menyimpan...' : '💾 Simpan'}
                  </button>
                </div>
              </div>
              <TaskDetailView 
                task={task}
                onEdit={() => setShowPreview(false)}
                onDelete={() => {}}
                onBack={() => setShowPreview(false)}
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="task-form">
              <div className="form-section">
                <h2>📋 Informasi Instruksi Kerja</h2>
                
                {/* Task Title */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="task-title">
                      Judul Instruksi Kerja <span className="required">*</span>
                    </label>
                    <input
                      id="task-title"
                      type="text"
                      value={task.title}
                      onChange={(e) => handleTaskChange('title', e.target.value)}
                      placeholder="Masukkan judul instruksi kerja..."
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="task-description">
                      Deskripsi Detail Instruksi Kerja <span className="required">*</span>
                    </label>
                    <textarea
                      id="task-description"
                      value={task.description}
                      onChange={(e) => handleTaskChange('description', e.target.value)}
                      placeholder="Jelaskan detail instruksi kerja yang akan dibuat..."
                      className="form-textarea"
                      rows="4"
                      required
                    />
                    <small className="form-hint">
                      Jelaskan secara detail apa yang harus dilakukan dalam instruksi kerja ini
                    </small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="task-duration">
                      Estimasi Durasi (menit)
                    </label>
                    <input
                      id="task-duration"
                      type="number"
                      value={task.estimatedDuration}
                      onChange={(e) => handleTaskChange('estimatedDuration', e.target.value)}
                      placeholder="30"
                      className="form-input"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* File Upload Panel */}
              <div className="form-section">
                <TaskFileUploadPanel
                  task={task}
                  onUpdateFiles={handleFileUpdate}
                  loading={loading}
                />
              </div>

              {/* Time Summary Panel */}
              <TimeSummaryPanel 
                task={task}
                onDistributeTime={handleDistributeTime}
                onClearAllTimes={handleClearAllTimes}
              />

              <div className="form-section">
                <div className="section-header">
                  <h2>📝 Langkah-langkah Kerja ({task.steps.length})</h2>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="btn btn-secondary"
                  >
                    ➕ Tambah Langkah
                  </button>
                </div>

                <div className="steps-container">
                  {task.steps.map((step, index) => (
                    <EnhancedStepForm
                      key={index}
                      step={step}
                      stepIndex={index}
                      onUpdateStep={handleUpdateStep}
                      onRemoveStep={handleRemoveStep}
                      canRemove={task.steps.length > 1}
                      totalEstimatedDuration={parseInt(task.estimatedDuration) || 0}
                      totalSteps={task.steps.length}
                      suggestedTime={getSuggestedStepTimes()[index] || 0}
                    />
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn btn-secondary"
                >
                  ❌ Batal
                </button>
                <button
                  type="button"
                  onClick={handleTogglePreview}
                  className="btn btn-info"
                >
                  👁️ Preview
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? '💾 Menyimpan...' : '💾 Simpan'}
                </button>
              </div>
            </form>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="add-task-page">
      {loading && <LoadingOverlay />}
      
      <AddTaskHeader 
        currentView={currentView}
        onBackClick={handleBack}
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        onLogout={handleLogout}
      />
      
      <Sidebar 
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        onLogout={handleLogout}
      />
      
      <main className={`add-task-main ${sidebarOpen ? 'add-task-main-shifted' : ''}`}>
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

export default AddTaskPage;