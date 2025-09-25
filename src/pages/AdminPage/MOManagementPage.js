// MOManagementPage.js - Enhanced with File Upload and Updated Class Names
import React, { useState, useCallback, useEffect } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../../firebase'; // Make sure storage is imported
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  User,
  Menu,
  X,
  LogOut,
  Home,
  CheckCircle,
  Briefcase,
  Users,
  FileText,
  Upload,
  File,
  Download,
  Eye
} from 'lucide-react';
import logoLRS from '../assets/images/logoLRS.png';
import './MOManagementPage.css';

// Enhanced MO template with task selection and file attachments
const DEFAULT_MO = {
  moNumber: '',
  title: '',
  createdBy: '',
  createdByEmail: '',
  isActive: true,
  assignments: [],
  selectedTasks: [],
  attachments: [] // New field for file attachments
};

// File Upload Component
const FileUploadPanel = ({ mo, onUpdateFiles, loading }) => {
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
      const storageRef = ref(storage, `mo-attachments/${fileName}`);
      
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
      const currentAttachments = mo.attachments || [];
      onUpdateFiles([...currentAttachments, ...successfulUploads]);
    }
  };

  // Delete file
  const handleDeleteFile = async (file) => {
    try {
      // Delete from Firebase Storage
      const storageRef = ref(storage, `mo-attachments/${file.fileName}`);
      await deleteObject(storageRef);
      
      // Update local state
      const currentAttachments = mo.attachments || [];
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
    <div className="MO-file-upload-panel">
      <div className="MO-file-upload-header">
        <h3>📎 File Attachments</h3>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="MO-btn MO-btn-primary MO-btn-sm"
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
        className={`MO-file-drop-zone ${dragActive ? 'MO-drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="MO-drop-zone-content">
          <Upload size={32} />
          <p>Drag & drop files here or click to select</p>
          <small>PDF, Word, Excel, Images, Text files (max 10MB each)</small>
        </div>
      </div>

      {/* Upload progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="MO-upload-progress-section">
          <h4>Uploading files...</h4>
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="MO-upload-progress-item">
              <div className="MO-progress-bar">
                <div 
                  className="MO-progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="MO-progress-text">{progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* File list */}
      <div className="MO-file-list">
        {(!mo.attachments || mo.attachments.length === 0) ? (
          <div className="MO-no-files">
            <File size={24} />
            <p>Belum ada file yang diupload</p>
            <small>File akan membantu memberikan informasi tambahan untuk MO ini</small>
          </div>
        ) : (
          <div className="MO-uploaded-files">
            <h4>Files ({mo.attachments.length})</h4>
            {mo.attachments.map((file) => (
              <div key={file.id} className="MO-file-item">
                <div className="MO-file-info">
                  <div className="MO-file-icon">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="MO-file-details">
                    <div className="MO-file-name">{file.originalName}</div>
                    <div className="MO-file-meta">
                      <span className="MO-file-size">{formatFileSize(file.size)}</span>
                      <span className="MO-file-date">
                        {file.uploadedAt?.toDate ? 
                          file.uploadedAt.toDate().toLocaleDateString('id-ID') : 
                          'Unknown date'
                        }
                      </span>
                      <span className="MO-file-uploader">by {file.uploadedBy}</span>
                    </div>
                  </div>
                </div>
                <div className="MO-file-actions">
                  <button
                    type="button"
                    onClick={() => window.open(file.url, '_blank')}
                    className="MO-file-action-btn MO-btn-view"
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
                    className="MO-file-action-btn MO-btn-download"
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
                    className="MO-file-action-btn MO-btn-delete"
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

// Task Selection Component (unchanged from your original)
const TaskSelectionPanel = ({ mo, onUpdateTasks, availableTasks, loadingTasks }) => {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTasks = availableTasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.category && task.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddTask = (task) => {
    const currentTasks = mo.selectedTasks || [];
    const isAlreadySelected = currentTasks.some(t => t.id === task.id);
    
    if (!isAlreadySelected) {
      const taskSelection = {
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category || 'General',
        estimatedDuration: task.estimatedDuration,
        stepsCount: task.steps?.length || 0,
        difficulty: task.difficulty,
        addedAt: Timestamp.now()
      };
      
      onUpdateTasks([...currentTasks, taskSelection]);
      console.log('Task added to MO:', taskSelection);
    } else {
      alert('Task sudah dipilih untuk MO ini');
    }
  };

  const handleRemoveTask = (taskId) => {
    const currentTasks = mo.selectedTasks || [];
    const updatedTasks = currentTasks.filter(t => t.id !== taskId);
    onUpdateTasks(updatedTasks);
    console.log('Task removed from MO:', taskId);
  };

  const getDifficultyBadge = (difficulty) => {
    const badges = {
      easy: { class: 'MO-badge-success', text: 'Mudah' },
      medium: { class: 'MO-badge-warning', text: 'Sedang' },
      hard: { class: 'MO-badge-danger', text: 'Sulit' }
    };
    return badges[difficulty] || badges.medium;
  };

  // Filter available tasks (exclude already selected ones)
  const unselectedTasks = filteredTasks.filter(task => 
    !(mo.selectedTasks || []).some(selectedTask => selectedTask.id === task.id)
  );

  return (
    <div className="MO-task-selection-panel">
      <div className="MO-task-selection-header">
        <h3>📝 Work Instructions (Tasks)</h3>
        <button
          type="button"
          onClick={() => setShowTaskModal(true)}
          className="MO-btn MO-btn-primary MO-btn-sm"
          disabled={loadingTasks}
        >
          {loadingTasks ? 'Loading...' : '➕ Pilih Task'}
        </button>
      </div>

      <div className="MO-task-selection-content">
        {loadingTasks && (
          <div className="MO-loading-tasks">
            <p>Memuat daftar task...</p>
          </div>
        )}
        
        {!loadingTasks && (!mo.selectedTasks || mo.selectedTasks.length === 0) ? (
          <div className="MO-no-tasks-selected">
            <div className="MO-no-tasks-icon">📝</div>
            <p>Belum ada task yang dipilih</p>
            <small>Task bersifat opsional untuk MO. MO bisa berdiri sendiri atau dikaitkan dengan task tertentu.</small>
          </div>
        ) : !loadingTasks && (
          <div className="MO-selected-tasks-list">
            {mo.selectedTasks.map((task, index) => (
              <div key={task.id} className="MO-selected-task-item">
                <div className="MO-task-info">
                  <div className="MO-task-header">
                    <FileText size={16} />
                    <div className="MO-task-details">
                      <span className="MO-task-title">{task.title}</span>
                      <span className="MO-task-category">{task.category}</span>
                    </div>
                  </div>
                  <div className="MO-task-meta">
                    <span className={`MO-badge ${getDifficultyBadge(task.difficulty).class}`}>
                      {getDifficultyBadge(task.difficulty).text}
                    </span>
                    <span className="MO-task-steps">{task.stepsCount} langkah</span>
                    {task.estimatedDuration && (
                      <span className="MO-task-duration">{task.estimatedDuration} menit</span>
                    )}
                  </div>
                  <p className="MO-task-description">{task.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveTask(task.id)}
                  className="MO-remove-task-btn"
                  title="Hapus task dari MO"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Selection Modal */}
      {showTaskModal && (
        <div className="MO-modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="MO-modal-content MO-task-selection-modal MO-modal-selection" onClick={(e) => e.stopPropagation()}>
            <div className="MO-modal-header">
              <h3>Pilih Work Instructions</h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="MO-modal-close-btn"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="MO-modal-search">
              <div className="MO-search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Cari task berdasarkan judul, deskripsi, atau kategori..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="MO-search-input"
                />
              </div>
            </div>

            <div className="MO-modal-body MO-task-list-modal">
              {loadingTasks ? (
                <div className="MO-loading-tasks">
                  <p>Memuat daftar task...</p>
                </div>
              ) : unselectedTasks.length === 0 ? (
                <div className="MO-no-tasks-available">
                  {searchTerm ? (
                    <>
                      <p>Tidak ada task yang sesuai dengan pencarian "{searchTerm}"</p>
                      <button
                        onClick={() => setSearchTerm('')}
                        className="MO-btn MO-btn-secondary MO-btn-sm"
                      >
                        Reset Pencarian
                      </button>
                    </>
                  ) : availableTasks.length === 0 ? (
                    <>
                      <p>Belum ada task yang tersedia</p>
                      <p>Buat task terlebih dahulu di halaman Add Task</p>
                    </>
                  ) : (
                    <p>Semua task tersedia sudah dipilih</p>
                  )}
                </div>
              ) : (
                <div className="MO-task-grid-modal">
                  {unselectedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="MO-task-card-modal"
                    >
                      <div className="MO-task-card-header">
                        <h4 className="MO-task-title">{task.title}</h4>
                        <div className="MO-task-badges">
                          <span className={`MO-badge ${getDifficultyBadge(task.difficulty).class}`}>
                            {getDifficultyBadge(task.difficulty).text}
                          </span>
                          <span className="MO-badge MO-badge-info">
                            {task.category || 'General'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="MO-task-card-body">
                        <p className="MO-task-description">{task.description}</p>
                        <div className="MO-task-meta">
                          <span className="MO-meta-item">
                            📝 {task.steps?.length || 0} langkah
                          </span>
                          {task.estimatedDuration && (
                            <span className="MO-meta-item">
                              ⏱️ {task.estimatedDuration} menit
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="MO-task-card-actions">
                        <button
                          onClick={() => handleAddTask(task)}
                          className="MO-btn MO-btn-primary MO-btn-sm"
                        >
                          ✅ Pilih
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="MO-modal-actions">
              <button
                onClick={() => setShowTaskModal(false)}
                className="MO-btn MO-btn-secondary"
                type="button"
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

// Enhanced MO Assignment Panel (keeping the original operator assignment)
const MOAssignmentPanel = ({ mo, onUpdateAssignments, availableOperators, loadingOperators }) => {
  const [selectedOperator, setSelectedOperator] = useState('');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const handleAssignOperator = () => {
    if (!selectedOperator) return;

    const operatorData = availableOperators.find(op => op.id === selectedOperator);
    if (!operatorData) return;

    const assignment = {
      operatorId: operatorData.id,
      operatorEmail: operatorData.email,
      operatorName: operatorData.displayName || operatorData.name || operatorData.email.split('@')[0],
      assignedAt: Timestamp.now(),
      status: 'assigned'
    };

    const currentAssignments = mo.assignments || [];
    const isAlreadyAssigned = currentAssignments.some(a => a.operatorId === operatorData.id);
    
    if (!isAlreadyAssigned) {
      onUpdateAssignments([...currentAssignments, assignment]);
      setSelectedOperator('');
      setShowAssignmentModal(false);
    } else {
      alert('Operator sudah ditugaskan untuk MO ini');
    }
  };

  const handleRemoveAssignment = (operatorId) => {
    const currentAssignments = mo.assignments || [];
    const updatedAssignments = currentAssignments.filter(a => a.operatorId !== operatorId);
    onUpdateAssignments(updatedAssignments);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'assigned': { class: 'MO-badge-info', text: 'Ditugaskan' },
      'in_progress': { class: 'MO-badge-warning', text: 'Sedang Dikerjakan' },
      'completed': { class: 'MO-badge-success', text: 'Selesai' }
    };
    return badges[status] || badges.assigned;
  };

  const unassignedOperators = availableOperators.filter(op => 
    !(mo.assignments || []).some(a => a.operatorId === op.id)
  );

  return (
    <div className="MO-assignment-panel">
      <div className="MO-assignment-header">
        <h3>👥 Assignment Operator</h3>
        <button
          type="button"
          onClick={() => setShowAssignmentModal(true)}
          className="MO-btn MO-btn-primary MO-btn-sm"
          disabled={loadingOperators}
        >
          {loadingOperators ? 'Loading...' : '➕ Assign Operator'}
        </button>
      </div>

      <div className="MO-assignment-content">
        {loadingOperators && (
          <div className="MO-loading-operators">
            <p>Memuat daftar operator...</p>
          </div>
        )}
        
        {!loadingOperators && (!mo.assignments || mo.assignments.length === 0) ? (
          <div className="MO-no-assignments">
            <p>Belum ada operator yang ditugaskan</p>
          </div>
        ) : !loadingOperators && (
          <div className="MO-assignments-list">
            {mo.assignments.map((assignment, index) => (
              <div key={index} className="MO-assignment-item">
                <div className="MO-assignment-info">
                  <div className="MO-operator-info">
                    <User size={16} />
                    <div className="MO-operator-details">
                      <span className="MO-operator-name">{assignment.operatorName}</span>
                      <span className="MO-operator-email">{assignment.operatorEmail}</span>
                    </div>
                  </div>
                  <div className="MO-assignment-meta">
                    <span className={`MO-badge ${getStatusBadge(assignment.status).class}`}>
                      {getStatusBadge(assignment.status).text}
                    </span>
                    <span className="MO-assigned-date">
                      {assignment.assignedAt?.toDate ? 
                        assignment.assignedAt.toDate().toLocaleDateString('id-ID') : 
                        'Tanggal tidak tersedia'
                      }
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAssignment(assignment.operatorId)}
                  className="MO-remove-assignment-btn"
                  title="Hapus assignment"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="MO-modal-overlay" onClick={() => setShowAssignmentModal(false)}>
          <div className="MO-modal-content MO-assignment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="MO-modal-header">
              <h3>Assign MO ke Operator</h3>
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="MO-modal-close-btn"
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="MO-modal-body">
              <div className="MO-form-group">
                <label>Pilih Operator:</label>
                
                {loadingOperators ? (
                  <div className="MO-loading-select">
                    <p>Loading operators...</p>
                  </div>
                ) : (
                  <select
                    value={selectedOperator}
                    onChange={(e) => setSelectedOperator(e.target.value)}
                    className="MO-form-input"
                  >
                    <option value="">-- Pilih Operator --</option>
                    {unassignedOperators.length === 0 ? (
                      <option disabled>Tidak ada operator tersedia</option>
                    ) : (
                      unassignedOperators.map(operator => (
                        <option key={operator.id} value={operator.id}>
                          {operator.displayName || operator.name || operator.email.split('@')[0]} ({operator.email})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {mo.moNumber && mo.title && (
                <div className="MO-assignment-preview">
                  <h4>MO yang akan ditugaskan:</h4>
                  <div className="MO-mo-preview">
                    <strong>{mo.moDisplay || `${mo.moNumber} - ${mo.title}`}</strong>
                    {mo.selectedTasks && mo.selectedTasks.length > 0 && (
                      <div className="MO-mo-tasks-preview">
                        <p>Dengan {mo.selectedTasks.length} task terkait:</p>
                        <ul>
                          {mo.selectedTasks.slice(0, 3).map((task, index) => (
                            <li key={index}>{task.title}</li>
                          ))}
                          {mo.selectedTasks.length > 3 && (
                            <li>...dan {mo.selectedTasks.length - 3} task lainnya</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="MO-modal-actions">
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="MO-btn MO-btn-secondary"
                type="button"
              >
                Batal
              </button>
              <button
                onClick={handleAssignOperator}
                className="MO-btn MO-btn-primary"
                disabled={!selectedOperator || loadingOperators}
                type="button"
              >
                {loadingOperators ? 'Loading...' : '✅ Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced MO Form Component with File Upload
const MOForm = ({ mo, onSave, onCancel, isEditing, loading, availableOperators, loadingOperators, availableTasks, loadingTasks }) => {
  const [formData, setFormData] = useState(mo || DEFAULT_MO);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    setFormData(mo || DEFAULT_MO);
  }, [mo]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleAssignmentUpdate = (assignments) => {
    setFormData(prev => ({ ...prev, assignments }));
  };

  const handleTaskUpdate = (selectedTasks) => {
    setFormData(prev => ({ ...prev, selectedTasks }));
  };

  const handleFileUpdate = (attachments) => {
    setFormData(prev => ({ ...prev, attachments }));
  };

  const validateForm = () => {
    const validationErrors = [];
    
    if (!formData.moNumber.trim()) {
      validationErrors.push('Nomor MO harus diisi');
    }
    
    if (!formData.title.trim()) {
      validationErrors.push('Judul Surat Perintah harus diisi');
    }

    return validationErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    onSave(formData);
  };

  const getTotalEstimatedDuration = () => {
    if (!formData.selectedTasks || formData.selectedTasks.length === 0) return 0;
    return formData.selectedTasks.reduce((total, task) => total + (task.estimatedDuration || 0), 0);
  };

  return (
    <div className="MO-form-container">
      {errors.length > 0 && (
        <div className="MO-error-messages">
          <div className="MO-error-header">
            <span className="MO-error-icon">⚠️</span>
            <span>Terdapat kesalahan yang perlu diperbaiki:</span>
          </div>
          <ul className="MO-error-list">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="MO-form">
        <div className="MO-form-section">
          <h3>📋 Informasi MO</h3>
          
          <div className="MO-form-group">
            <label htmlFor="mo-number">
              Nomor MO <span className="MO-required">*</span>
            </label>
            <div className="MO-input-with-button">
              <input
                id="mo-number"
                type="text"
                value={formData.moNumber}
                onChange={(e) => handleChange('moNumber', e.target.value)}
                className="MO-form-input"
                required
              />
            </div>
          </div>

          <div className="MO-form-group">
            <label htmlFor="mo-title">
              Judul Surat Perintah <span className="MO-required">*</span>
            </label>
            <input
              id="mo-title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="MO-form-input"
              required
            />
          </div>
        </div>

        {/* File Upload Panel */}
        <div className="MO-form-section">
          <FileUploadPanel
            mo={formData}
            onUpdateFiles={handleFileUpdate}
            loading={loading}
          />
        </div>

        {/* Task Selection Panel */}
        <div className="MO-form-section">
          <TaskSelectionPanel
            mo={formData}
            onUpdateTasks={handleTaskUpdate}
            availableTasks={availableTasks}
            loadingTasks={loadingTasks}
          />
          
          {/* Task Summary */}
          {formData.selectedTasks && formData.selectedTasks.length > 0 && (
            <div className="MO-task-summary-section">
              <h4>📊 Ringkasan Task</h4>
              <div className="MO-task-summary-stats">
                <div className="MO-stat-item">
                  <span className="MO-stat-label">Total Task:</span>
                  <span className="MO-stat-value">{formData.selectedTasks.length}</span>
                </div>
                <div className="MO-stat-item">
                  <span className="MO-stat-label">Total Langkah:</span>
                  <span className="MO-stat-value">
                    {formData.selectedTasks.reduce((total, task) => total + task.stepsCount, 0)}
                  </span>
                </div>
                <div className="MO-stat-item">
                  <span className="MO-stat-label">Estimasi Total Durasi:</span>
                  <span className="MO-stat-value">{getTotalEstimatedDuration()} menit</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="MO-form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="MO-btn MO-btn-secondary"
            disabled={loading}
          >
            ❌ Batal
          </button>
          <button
            type="submit"
            className="MO-btn MO-btn-primary"
            disabled={loading}
          >
            {loading ? '💾 Menyimpan...' : (isEditing ? '💾 Update' : '💾 Simpan')}
          </button>
        </div>
      </form>

      {/* Assignment Panel - Show when editing existing MO */}
      {isEditing && formData.moNumber && (
        <MOAssignmentPanel 
          mo={formData}
          onUpdateAssignments={handleAssignmentUpdate}
          availableOperators={availableOperators}
          loadingOperators={loadingOperators}
        />
      )}
    </div>
  );
};

// Enhanced MO List Component showing task and file information
const MOList = ({ mos, onAdd, onEdit, onDelete, loading, searchTerm, onSearchChange }) => {
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

  const getFileIcon = (type) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('image')) return '🖼️';
    if (type.includes('text')) return '📃';
    return '📁';
  };

  const filteredMOs = mos.filter(mo => 
    mo.moNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mo.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="MO-loading-overlay">
        <div className="MO-loading-content">
          <div className="MO-loading-spinner"></div>
          <p>Memuat data MO...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="MO-list-container">
      <div className="MO-list-header">
        <div className="MO-list-info">
          <h2>📋 Daftar Manufacturing Orders ({filteredMOs.length})</h2>
          <p>Kelola semua MO, Work Instructions, dan File terkait</p>
        </div>
        
        <div className="MO-list-actions">
          <div className="MO-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Cari MO..."
              value={searchTerm}
              onChange={onSearchChange}
              className="MO-search-input"
            />
          </div>
          <button onClick={onAdd} className="MO-btn MO-btn-primary">
            <Plus size={16} />
            Tambah MO Baru
          </button>
        </div>
      </div>

      {filteredMOs.length === 0 ? (
        <div className="MO-empty-state">
          <div className="MO-empty-icon">📋</div>
          <h3>
            {searchTerm ? 'Tidak ada MO yang sesuai' : 'Belum ada MO'}
          </h3>
          <p>
            {searchTerm 
              ? 'Coba ubah kata kunci pencarian Anda' 
              : 'Mulai dengan menambahkan MO pertama Anda'
            }
          </p>
          {!searchTerm && (
            <button onClick={onAdd} className="MO-btn MO-btn-primary">
              <Plus size={16} />
              Tambah MO Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="MO-grid">
          {filteredMOs.map((mo) => (
            <div key={mo.id} className="MO-card">
              <div className="MO-card-header">
                <div className="MO-number-section">
                  <span className="MO-number">{mo.moNumber}</span>
                </div>
              </div>
              
              <div className="MO-card-body">
                <h3 className="MO-title">{mo.title}</h3>
                
                <div className="MO-meta">
                  <div className="MO-meta-item">
                    <span className="MO-meta-label">Dibuat:</span>
                    <span className="MO-meta-value">{formatDate(mo.createdAt)}</span>
                  </div>
                  <div className="MO-meta-item">
                    <span className="MO-meta-label">Oleh:</span>
                    <span className="MO-meta-value">{mo.createdByEmail}</span>
                  </div>
                </div>

                {/* File Attachments Status */}
                {mo.attachments && mo.attachments.length > 0 && (
                  <div className="MO-attachments-status">
                    <div className="MO-attachment-header">
                      <File size={16} />
                      <span>Files ({mo.attachments.length})</span>
                    </div>
                    <div className="MO-attachment-preview">
                      {mo.attachments.slice(0, 3).map((file, index) => (
                        <span key={index} className="MO-file-preview-badge">
                          {getFileIcon(file.type)} {file.originalName}
                        </span>
                      ))}
                      {mo.attachments.length > 3 && (
                        <span className="MO-more-files">
                          +{mo.attachments.length - 3} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Task Status */}
                {mo.selectedTasks && mo.selectedTasks.length > 0 && (
                  <div className="MO-task-status">
                    <div className="MO-task-header">
                      <FileText size={16} />
                      <span>Work Instructions ({mo.selectedTasks.length})</span>
                    </div>
                    <div className="MO-selected-tasks-preview">
                      {mo.selectedTasks.slice(0, 2).map((task, index) => (
                        <span key={index} className="MO-task-preview-badge">
                          {task.title}
                        </span>
                      ))}
                      {mo.selectedTasks.length > 2 && (
                        <span className="MO-more-tasks">
                          +{mo.selectedTasks.length - 2} lainnya
                        </span>
                      )}
                    </div>
                    <div className="MO-task-summary">
                      <small>
                        Total: {mo.selectedTasks.reduce((total, task) => total + task.stepsCount, 0)} langkah, 
                        {mo.selectedTasks.reduce((total, task) => total + (task.estimatedDuration || 0), 0)} menit
                      </small>
                    </div>
                  </div>
                )}

                {/* Assignment Status */}
                {mo.assignments && mo.assignments.length > 0 && (
                  <div className="MO-assignment-status">
                    <div className="MO-assignment-header">
                      <Users size={16} />
                      <span>Operator Assigned ({mo.assignments.length})</span>
                    </div>
                    <div className="MO-assigned-operators">
                      {mo.assignments.slice(0, 3).map((assignment, index) => (
                        <span key={index} className="MO-operator-badge">
                          {assignment.operatorName}
                        </span>
                      ))}
                      {mo.assignments.length > 3 && (
                        <span className="MO-more-operators">
                          +{mo.assignments.length - 3} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="MO-card-actions">
                <button 
                  onClick={() => onEdit(mo)} 
                  className="MO-btn MO-btn-sm MO-btn-warning"
                  title="Edit MO"
                >
                  <Edit3 size={14} />
                  Edit
                </button>
                <button 
                  onClick={() => onDelete(mo)} 
                  className="MO-btn MO-btn-sm MO-btn-danger"
                  title="Hapus MO"
                >
                  <Trash2 size={14} />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Header Component
const MOHeader = ({ onLogout, sidebarOpen, toggleSidebar, currentView }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.MO-profile-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const getTitle = () => {
    switch (currentView) {
      case 'list':
        return 'Manufacturing Orders';
      case 'form':
        return 'Tambah MO Baru';
      case 'edit':
        return 'Edit MO';
      default:
        return 'MO Management';
    }
  };

  const handleLogoClick = () => {
    navigate('/admin');
  };

  return (
    <div className="MO-header-bar">
      <div className="MO-header-left">
        <button 
          className="MO-sidebar-toggle"
          onClick={toggleSidebar}
        >
          <Menu size={20} />
        </button>
        <img 
          src={logoLRS} 
          alt="LRS Logo" 
          className="MO-logo"
          onClick={handleLogoClick}
          style={{ cursor: 'pointer' }}
        />
      </div>
      <div className="MO-header-center">
        <h1 className="MO-title-header">{getTitle()}</h1>
      </div>
      <div className="MO-header-right">
        <div className="MO-profile-container">
          <button
            className="MO-profile-btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="MO-profile-avatar">
              <span className="MO-avatar-text">A</span>
            </div>
            <div className="MO-profile-info">
              <div className="MO-profile-name">Admin</div>
              <div className="MO-profile-id">Administrator</div>
            </div>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className={`MO-dropdown-arrow ${showDropdown ? 'rotated' : ''}`}
            >
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </button>

          {showDropdown && (
            <div className="MO-dropdown-menu">
              <div className="MO-dropdown-header">
                <div className="MO-profile-avatar">
                  <span className="MO-avatar-text">A</span>
                </div>
                <div>
                  <div className="MO-dropdown-name">Admin</div>
                  <div className="MO-dropdown-role">Administrator</div>
                </div>
              </div>
              <hr className="MO-dropdown-divider" />
              <button 
                className="MO-dropdown-item MO-dropdown-logout" 
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

// Sidebar Component
const MOSidebar = ({ sidebarOpen, toggleSidebar }) => {
  const navigate = useNavigate();

  const handleMenuClick = (menuId) => {
    switch (menuId) {
      case 'work-sessions':
        navigate('/admin');
        break;
      case 'user-management':
        navigate('/approvals');
        break;
      case 'mo-management':
        break;
      case 'add-task':
        navigate('/addTask');
        break;
      default:
        break;
    }
    toggleSidebar();
  };

  return (
    <>
      <div className={`MO-sidebar ${sidebarOpen ? 'MO-sidebar-open' : ''}`}>
        <div className="MO-sidebar-header">
          <h3>Menu</h3>
          <button 
            className="MO-sidebar-close"
            onClick={toggleSidebar}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="MO-sidebar-nav">
          <button 
            onClick={() => handleMenuClick('work-sessions')} 
            className="MO-sidebar-item"
          >
            <Home size={20} />
            <span>Work Sessions</span>
          </button>

          <button 
            onClick={() => handleMenuClick('user-management')} 
            className="MO-sidebar-item"
          >
            <CheckCircle size={20} />
            <span>User Management</span>
          </button>

          <button 
            onClick={() => handleMenuClick('mo-management')} 
            className="MO-sidebar-item active"
          >
            <Briefcase size={20} />
            <span>MO Management</span>
          </button>

          <button 
            onClick={() => handleMenuClick('add-task')} 
            className="MO-sidebar-item"
          >
            <Plus size={20} />
            <span>Add Task</span>
          </button>
        </nav>
      </div>

      {sidebarOpen && (
        <div 
          className="MO-sidebar-overlay"
          onClick={toggleSidebar}
        ></div>
      )}
    </>
  );
};

// Confirmation Modal
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false }) => {
  if (!isOpen) return null;

  return (
    <div className="MO-modal-overlay">
      <div className="MO-modal-content">
        <div className="MO-modal-header">
          <h3>{title}</h3>
        </div>
        <div className="MO-modal-body">
          <p>{message}</p>
        </div>
        <div className="MO-modal-actions">
          <button onClick={onCancel} className="MO-btn MO-btn-secondary">
            Batal
          </button>
          <button 
            onClick={onConfirm} 
            className={`MO-btn ${isDestructive ? 'MO-btn-danger' : 'MO-btn-primary'}`}
          >
            {isDestructive ? 'Hapus' : 'Konfirmasi'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Main MOManagementPage Component
const MOManagementPage = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('list');
  const [mos, setMos] = useState([]);
  const [editingMO, setEditingMO] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // State for operators
  const [availableOperators, setAvailableOperators] = useState([]);
  const [loadingOperators, setLoadingOperators] = useState(false);
  
  // State for tasks
  const [availableTasks, setAvailableTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false
  });

  // Load available operators
  const loadAvailableOperators = useCallback(async () => {
    console.log('Loading available operators...');
    setLoadingOperators(true);
    
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);

      const allUsers = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        allUsers.push({
          id: doc.id,
          ...userData
        });
      });

      setAvailableOperators(allUsers);
    } catch (error) {
      console.error('Error loading operators:', error);
    } finally {
      setLoadingOperators(false);
    }
  }, []);

  // Load available tasks
  const loadAvailableTasks = useCallback(async () => {
    console.log('Loading available tasks...');
    setLoadingTasks(true);
    
    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const allTasks = [];
      querySnapshot.forEach((doc) => {
        const taskData = doc.data();
        allTasks.push({
          id: doc.id,
          ...taskData
        });
      });

      console.log(`Loaded ${allTasks.length} tasks`);
      setAvailableTasks(allTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  // Load MOs from Firestore
  const loadMOs = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'mos'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const mosData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMos(mosData);
    } catch (error) {
      console.error('Error loading MOs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMOs();
    loadAvailableOperators();
    loadAvailableTasks();
  }, [loadMOs, loadAvailableOperators, loadAvailableTasks]);

  const handleLogout = useCallback(async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, [navigate]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleAdd = () => {
    setEditingMO(null);
    setCurrentView('form');
  };

  const handleEdit = (mo) => {
    setEditingMO(mo);
    setCurrentView('edit');
  };

  const handleDelete = (mo) => {
    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Hapus',
      message: `Apakah Anda yakin ingin menghapus MO "${mo.moNumber} - ${mo.title}"? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua file terkait.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          // Delete associated files from storage if any
          if (mo.attachments && mo.attachments.length > 0) {
            for (const file of mo.attachments) {
              try {
                const storageRef = ref(storage, `mo-attachments/${file.fileName}`);
                await deleteObject(storageRef);
              } catch (fileError) {
                console.error('Error deleting file:', file.fileName, fileError);
              }
            }
          }

          // Delete MO document
          await deleteDoc(doc(db, 'mos', mo.id));
          await loadMOs();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Error deleting MO:', error);
        } finally {
          setLoading(false);
        }
      },
      isDestructive: true
    });
  };

  const handleSave = async (moData) => {
    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (editingMO) {
        // Update existing MO
        const updateData = {
          ...moData,
          updatedAt: Timestamp.now(),
          updatedBy: user?.uid || 'anonymous',
          updatedByEmail: user?.email || 'anonymous'
        };
        await updateDoc(doc(db, 'mos', editingMO.id), updateData);
      } else {
        // Create new MO
        const newMOData = {
          ...moData,
          createdAt: Timestamp.now(),
          createdBy: user?.uid || 'anonymous',
          createdByEmail: user?.email || 'anonymous',
          updatedAt: Timestamp.now(),
          assignments: [], // Initialize empty assignments array
          selectedTasks: moData.selectedTasks || [], // Initialize empty or with selected tasks
          attachments: moData.attachments || [] // Initialize empty or with uploaded files
        };
        await addDoc(collection(db, 'mos'), newMOData);
      }

      await loadMOs();
      setCurrentView('list');
      setEditingMO(null);
    } catch (error) {
      console.error('Error saving MO:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentView('list');
    setEditingMO(null);
  };

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const renderContent = () => {
    switch (currentView) {
      case 'form':
      case 'edit':
        return (
          <MOForm
            mo={editingMO}
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={currentView === 'edit'}
            loading={loading}
            availableOperators={availableOperators}
            loadingOperators={loadingOperators}
            availableTasks={availableTasks}
            loadingTasks={loadingTasks}
          />
        );
      default:
        return (
          <MOList
            mos={mos}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
            searchTerm={searchTerm}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
          />
        );
    }
  };

  return (
    <div className="MO-management-page">
      <MOHeader 
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        currentView={currentView}
      />
      
      <MOSidebar 
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
      />
      
      <main className={`MO-main ${sidebarOpen ? 'MO-main-shifted' : ''}`}>
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

export default MOManagementPage;