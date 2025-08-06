import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AddTaskPage.css';
import logoLRS from '../assets/images/logoLRS.png';
import { db } from '../../firebase';
import { collection, addDoc, Timestamp, getDocs, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { CheckCircle, TrendingUp, FileText } from 'lucide-react';

// Constants
const DEFAULT_STEP = {
  title: '',
  description: '',
  keyPoints: [''],
  safetyPoints: [''],
  maxTime: '',
  imageUrls: ['']
};

const DEFAULT_TASK = {
  title: '',
  description: '',
  category: '',
  estimatedDuration: '',
  difficulty: 'medium',
  steps: [{ ...DEFAULT_STEP }]
};

// Enhanced Time Management Functions
const convertTimeToMinutes = (seconds) => {
  return Math.round(seconds / 60);
};

const convertMinutesToSeconds = (minutes) => {
  return minutes * 60;
};

const calculateTotalStepTime = (steps) => {
  const totalSeconds = steps.reduce((total, step) => {
    const stepTime = parseInt(step.maxTime) || 0;
    return total + stepTime;
  }, 0);
  return convertTimeToMinutes(totalSeconds);
};

const validateTimeConsistency = (task) => {
  const errors = [];
  const estimatedDuration = parseInt(task.estimatedDuration) || 0;
  const totalStepTime = calculateTotalStepTime(task.steps);
  
  if (estimatedDuration > 0 && totalStepTime > 0) {
    const difference = Math.abs(estimatedDuration - totalStepTime);
    const percentageDiff = (difference / estimatedDuration) * 100;
    
    if (percentageDiff > 20) {
      if (totalStepTime > estimatedDuration) {
        errors.push(`⚠️ Total waktu langkah-langkah (${totalStepTime} menit) melebihi estimasi durasi keseluruhan (${estimatedDuration} menit). Pertimbangkan untuk menyesuaikan waktu target atau estimasi durasi.`);
      } else {
        errors.push(`⚠️ Total waktu langkah-langkah (${totalStepTime} menit) jauh lebih kecil dari estimasi durasi keseluruhan (${estimatedDuration} menit). Pertimbangkan untuk menambah waktu target atau mengurangi estimasi durasi.`);
      }
    }
  }
  
  return errors;
};

const distributeTimeEvenly = (totalMinutes, numberOfSteps) => {
  if (totalMinutes <= 0 || numberOfSteps <= 0) return [];
  
  const timePerStep = Math.floor(totalMinutes / numberOfSteps);
  const remainder = totalMinutes % numberOfSteps;
  
  const distribution = [];
  for (let i = 0; i < numberOfSteps; i++) {
    const extraTime = i < remainder ? 1 : 0;
    distribution.push(convertMinutesToSeconds(timePerStep + extraTime));
  }
  
  return distribution;
};

const suggestStepTime = (step, averageTimePerStep) => {
  let multiplier = 1;
  
  const keyPointsCount = step.keyPoints?.filter(p => p.trim()).length || 0;
  if (keyPointsCount > 3) multiplier += 0.3;
  
  const safetyPointsCount = step.safetyPoints?.filter(p => p.trim()).length || 0;
  if (safetyPointsCount > 2) multiplier += 0.2;
  
  const imageCount = step.imageUrls?.filter(url => url.trim()).length || 0;
  if (imageCount > 2) multiplier += 0.2;
  
  const descriptionLength = step.description?.length || 0;
  if (descriptionLength > 200) multiplier += 0.1;
  
  return Math.round(averageTimePerStep * multiplier);
};

// Helper Functions
const validateImageUrl = (url) => {
  if (!url || url.trim() === '') return true;
  
  try {
    new URL(url.trim());
    return true;
  } catch (error) {
    return false;
  }
};

const validateStep = (step) => {
  const errors = [];
  
  if (!step.title.trim()) {
    errors.push('Judul langkah harus diisi');
  }
  
  if (!step.description.trim()) {
    errors.push('Deskripsi langkah harus diisi');
  }
  
  if (step.maxTime && (isNaN(step.maxTime) || parseInt(step.maxTime) < 0)) {
    errors.push('Waktu target harus berupa angka positif');
  }
  
  step.imageUrls.forEach((url, index) => {
    if (url && !validateImageUrl(url)) {
      errors.push(`URL gambar ${index + 1} tidak valid`);
    }
  });
  
  return errors;
};

const validateTask = (task) => {
  const errors = [];
  
  if (!task.title.trim()) {
    errors.push('Judul instruksi kerja harus diisi');
  }
  
  if (!task.description.trim()) {
    errors.push('Deskripsi instruksi kerja harus diisi');
  }
  
  if (task.estimatedDuration && (isNaN(task.estimatedDuration) || parseInt(task.estimatedDuration) < 0)) {
    errors.push('Estimasi durasi harus berupa angka positif');
  }
  
  if (task.steps.length === 0) {
    errors.push('Minimal harus ada 1 langkah kerja');
  }
  
  task.steps.forEach((step, index) => {
    const stepErrors = validateStep(step);
    stepErrors.forEach(error => {
      errors.push(`Langkah ${index + 1}: ${error}`);
    });
  });
  
  // Add time consistency validation
  const timeErrors = validateTimeConsistency(task);
  errors.push(...timeErrors);
  
  return errors;
};

// Time Summary Component
const TimeSummaryPanel = ({ task, onDistributeTime, onClearAllTimes }) => {
  const estimatedDuration = parseInt(task.estimatedDuration) || 0;
  const totalStepTime = calculateTotalStepTime(task.steps);
  const timeConsistencyErrors = validateTimeConsistency(task);
  
  const stepsWithTime = task.steps.filter(step => parseInt(step.maxTime) > 0).length;
  const stepsWithoutTime = task.steps.length - stepsWithTime;
  
  const getStatusColor = () => {
    if (timeConsistencyErrors.length > 0) return 'warning';
    if (estimatedDuration > 0 && totalStepTime > 0) return 'success';
    return 'info';
  };

  return (
    <div className={`time-summary-panel ${getStatusColor()}`}>
      <div className="time-summary-header">
        <h3>📊 Ringkasan Waktu</h3>
      </div>
      
      <div className="time-summary-content">
        <div className="time-metrics">
          <div className="time-metric">
            <span className="metric-label">Estimasi Durasi Keseluruhan:</span>
            <span className="metric-value">
              {estimatedDuration > 0 ? `${estimatedDuration} menit` : 'Tidak ditentukan'}
            </span>
          </div>
          
          <div className="time-metric">
            <span className="metric-label">Total Waktu Target Langkah:</span>
            <span className="metric-value">
              {totalStepTime > 0 ? `${totalStepTime} menit` : 'Tidak ditentukan'}
            </span>
          </div>
          
          <div className="time-metric">
            <span className="metric-label">Langkah dengan Waktu Target:</span>
            <span className="metric-value">
              {stepsWithTime} dari {task.steps.length} langkah
            </span>
          </div>
          
          {estimatedDuration > 0 && totalStepTime > 0 && (
            <div className="time-metric">
              <span className="metric-label">Selisih:</span>
              <span className={`metric-value ${Math.abs(estimatedDuration - totalStepTime) > (estimatedDuration * 0.2) ? 'warning' : 'success'}`}>
                {estimatedDuration - totalStepTime > 0 ? '+' : ''}{estimatedDuration - totalStepTime} menit
              </span>
            </div>
          )}
        </div>
        
        {timeConsistencyErrors.length > 0 && (
          <div className="time-warnings">
            {timeConsistencyErrors.map((error, index) => (
              <div key={index} className="time-warning">
                {error}
              </div>
            ))}
          </div>
        )}
        
        <div className="time-actions">
          {estimatedDuration > 0 && (
            <button
              type="button"
              onClick={onDistributeTime}
              className="btn btn-secondary btn-sm"
              title="Bagikan waktu secara merata ke semua langkah"
            >
              📊 Distribusi Merata
            </button>
          )}
          
          {stepsWithTime > 0 && (
            <button
              type="button"
              onClick={onClearAllTimes}
              className="btn btn-outline btn-sm"
              title="Hapus semua waktu target dari langkah"
            >
              🗑️ Hapus Semua Waktu
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Step Form Component
const EnhancedStepForm = ({ 
  step, 
  stepIndex, 
  onUpdateStep, 
  onRemoveStep, 
  canRemove,
  totalEstimatedDuration,
  totalSteps,
  suggestedTime 
}) => {
  const handleInputChange = (field, value) => {
    onUpdateStep(stepIndex, { ...step, [field]: value });
  };

  const handleArrayChange = (field, index, value) => {
    const newArray = [...step[field]];
    newArray[index] = value;
    onUpdateStep(stepIndex, { ...step, [field]: newArray });
  };

  const handleAddArrayItem = (field) => {
    const newArray = [...step[field], ''];
    onUpdateStep(stepIndex, { ...step, [field]: newArray });
  };

  const handleRemoveArrayItem = (field, index) => {
    if (step[field].length > 1) {
      const newArray = step[field].filter((_, i) => i !== index);
      onUpdateStep(stepIndex, { ...step, [field]: newArray });
    }
  };

  const handleUseSuggestedTime = () => {
    handleInputChange('maxTime', suggestedTime.toString());
  };

  const currentTimeInMinutes = convertTimeToMinutes(parseInt(step.maxTime) || 0);

  return (
    <div className="step-form enhanced-step-form">
      <div className="step-form-header">
        <div className="step-header-info">
          <h3>Langkah {stepIndex + 1}</h3>
          {currentTimeInMinutes > 0 && (
            <span className="step-time-badge">
              ⏱️ {currentTimeInMinutes} menit
            </span>
          )}
        </div>
        {canRemove && (
          <button 
            type="button"
            onClick={() => onRemoveStep(stepIndex)}
            className="remove-step-btn"
            title="Hapus langkah ini"
          >
            ✕
          </button>
        )}
      </div>

      <div className="form-group">
        <label htmlFor={`step-title-${stepIndex}`}>
          Judul Langkah <span className="required">*</span>
        </label>
        <input
          id={`step-title-${stepIndex}`}
          type="text"
          value={step.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Contoh: Persiapan Alat dan Bahan"
          className="form-input"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor={`step-description-${stepIndex}`}>
          Deskripsi Langkah <span className="required">*</span>
        </label>
        <textarea
          id={`step-description-${stepIndex}`}
          value={step.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Jelaskan secara detail apa yang harus dilakukan pada langkah ini..."
          className="form-textarea"
          rows="4"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor={`step-maxtime-${stepIndex}`}>
          Waktu Target
        </label>
        <div className="time-input-container">
          <div className="time-input-row">
            <input
              id={`step-maxtime-${stepIndex}`}
              type="number"
              value={step.maxTime}
              onChange={(e) => handleInputChange('maxTime', e.target.value)}
              placeholder="0"
              className="form-input time-input"
              min="0"
            />
            <span className="time-unit">detik</span>
            {currentTimeInMinutes > 0 && (
              <span className="time-conversion">
                ≈ {currentTimeInMinutes} menit
              </span>
            )}
          </div>
          
          {suggestedTime > 0 && suggestedTime !== parseInt(step.maxTime || 0) && (
            <div className="time-suggestion">
              <span className="suggestion-text">
                💡 Disarankan: {convertTimeToMinutes(suggestedTime)} menit ({suggestedTime} detik)
              </span>
              <button
                type="button"
                onClick={handleUseSuggestedTime}
                className="btn-suggestion"
              >
                Gunakan
              </button>
            </div>
          )}
        </div>
        <small className="form-hint">
          Kosongkan jika tidak ada batasan waktu. Waktu dihitung dalam detik.
        </small>
      </div>

      <div className="form-group">
        <label>Titik Kunci Kerja</label>
        {step.keyPoints.map((point, index) => (
          <div key={index} className="array-input-group">
            <input
              type="text"
              value={point}
              onChange={(e) => handleArrayChange('keyPoints', index, e.target.value)}
              placeholder={`Titik kunci ${index + 1}`}
              className="form-input"
            />
            <button
              type="button"
              onClick={() => handleRemoveArrayItem('keyPoints', index)}
              className="remove-array-btn"
              disabled={step.keyPoints.length === 1}
              title="Hapus item ini"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => handleAddArrayItem('keyPoints')}
          className="add-array-btn"
        >
          + Tambah Titik Kunci
        </button>
      </div>

      <div className="form-group">
        <label>Titik Kunci Keselamatan</label>
        {step.safetyPoints.map((point, index) => (
          <div key={index} className="array-input-group">
            <input
              type="text"
              value={point}
              onChange={(e) => handleArrayChange('safetyPoints', index, e.target.value)}
              placeholder={`Keselamatan ${index + 1}`}
              className="form-input"
            />
            <button
              type="button"
              onClick={() => handleRemoveArrayItem('safetyPoints', index)}
              className="remove-array-btn"
              disabled={step.safetyPoints.length === 1}
              title="Hapus item ini"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => handleAddArrayItem('safetyPoints')}
          className="add-array-btn"
        >
          + Tambah Keselamatan
        </button>
      </div>

      <div className="form-group">
        <label>URL Gambar Referensi</label>
        {step.imageUrls.map((url, index) => (
          <div key={index} className="array-input-group">
            <input
              type="url"
              value={url}
              onChange={(e) => handleArrayChange('imageUrls', index, e.target.value)}
              placeholder={`https://example.com/image${index + 1}.jpg`}
              className="form-input"
            />
            {url && (
              <div className="image-preview">
                <img 
                  src={url} 
                  alt={`Preview ${index + 1}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                  onLoad={(e) => {
                    e.target.style.display = 'block';
                    e.target.nextSibling.style.display = 'none';
                  }}
                />
                <div className="image-error" style={{ display: 'none' }}>
                  ❌ Gambar tidak dapat dimuat
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => handleRemoveArrayItem('imageUrls', index)}
              className="remove-array-btn"
              disabled={step.imageUrls.length === 1}
              title="Hapus URL ini"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => handleAddArrayItem('imageUrls')}
          className="add-array-btn"
        >
          + Tambah URL Gambar
        </button>
        <small className="form-hint">
          Masukkan URL gambar yang dapat diakses secara publik
        </small>
      </div>
    </div>
  );
};

// Header Component
const AddTaskHeader = ({ currentView, onBackClick, sidebarOpen, toggleSidebar }) => {
  const getTitle = () => {
    switch (currentView) {
      case 'list':
        return 'Daftar Instruksi Kerja';
      case 'form':
        return 'Tambah Instruksi Kerja Baru';
      case 'edit':
        return 'Edit Instruksi Kerja';
      case 'view':
        return 'Detail Instruksi Kerja';
      default:
        return 'Instruksi Kerja';
    }
  };

  const handleLogoClick = () => {
    window.location.href = '/admin';
  };

  const handleBackClick = () => {
    window.location.href = '/';
  };

  return (
    <div className="add-task-header-bar">
      <div className="add-task-header-left">
        <button 
          className="add-task-sidebar-toggle"
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
          className="add-task-logo"
          onClick={handleLogoClick}
        />
      </div>
      <div className="add-task-header-center">
        <h1 className="add-task-title-header">{getTitle()}</h1>
      </div>
      <div className="add-task-header-right">
        <button onClick={handleBackClick} className="add-task-back-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
};

// Sidebar Component
const Sidebar = ({ sidebarOpen, toggleSidebar }) => {
  const handleMenuClick = (menuId) => {
    if (menuId === 'Rekap Pengerjaan') {
      window.location.href = '/admin';
    } else if (menuId === 'Report') {
      window.location.href = '/reportadmin';
    }
    toggleSidebar();
  };

  return (
    <>
      <div className={`add-task-sidebar ${sidebarOpen ? 'add-task-sidebar-open' : ''}`}>
        <div className="add-task-sidebar-header">
          <h3>Menu</h3>
          <button 
            className="add-task-sidebar-close"
            onClick={toggleSidebar}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <nav className="add-task-sidebar-nav">
          <button 
            onClick={() => handleMenuClick('Rekap Pengerjaan')} 
            className="add-task-sidebar-item"
          >
            <CheckCircle size={20} />
            <span>Rekap Pengerjaan</span>
          </button>

          <button 
            onClick={() => handleMenuClick('Report')} 
            className="add-task-sidebar-item"
          >
            <FileText size={20} />
            <span>Rekap Report</span>
          </button>

          <button 
            onClick={() => {
              toggleSidebar();
            }} 
            className="add-task-sidebar-item active"
          >
            <TrendingUp size={20} />
            <span>Add Task</span>
          </button>
        </nav>
      </div>

      {sidebarOpen && (
        <div 
          className="add-task-sidebar-overlay"
          onClick={toggleSidebar}
        ></div>
      )}
    </>
  );
};

// Loading Overlay Component
const LoadingOverlay = ({ message = "Memuat data..." }) => (
  <div className="loading-overlay">
    <div className="loading-content">
      <div className="loading-spinner"></div>
      <p>{message}</p>
    </div>
  </div>
);

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="btn btn-secondary">
            Batal
          </button>
          <button 
            onClick={onConfirm} 
            className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
          >
            {isDestructive ? 'Hapus' : 'Konfirmasi'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Task List Component
const TaskList = ({ tasks, onAddNew, onView, onEdit, onDelete, loading }) => {
  const getDifficultyBadge = (difficulty) => {
    const badges = {
      easy: { class: 'badge-success', text: 'Mudah' },
      medium: { class: 'badge-warning', text: 'Sedang' },
      hard: { class: 'badge-danger', text: 'Sulit' }
    };
    return badges[difficulty] || badges.medium;
  };

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

  if (loading) {
    return <LoadingOverlay message="Memuat daftar instruksi kerja..." />;
  }

  return (
    <div className="task-list-container">
      <div className="task-list-header">
        <div className="task-list-info">
          <h2>Daftar Instruksi Kerja ({tasks.length})</h2>
          <p>Kelola semua instruksi kerja yang telah dibuat</p>
        </div>
        <button onClick={onAddNew} className="btn btn-primary">
          ➕ Tambah Instruksi Baru
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>Belum ada instruksi kerja</h3>
          <p>Mulai dengan menambahkan instruksi kerja pertama Anda</p>
          <button onClick={onAddNew} className="btn btn-primary">
            ➕ Tambah Instruksi Pertama
          </button>
        </div>
      ) : (
        <div className="task-grid">
          {tasks.map((task) => (
            <div key={task.id} className="task-card">
              <div className="task-card-header">
                <h3 className="task-title">{task.title}</h3>
              </div>
              
              <div className="task-card-body">
                <p className="task-description">{task.description}</p>
                
                <div className="task-meta">
                  <div className="task-meta-item">
                    <span className="meta-label">Langkah:</span>
                    <span className="meta-value">{task.steps?.length || 0}</span>
                  </div>
                  {task.estimatedDuration && (
                    <div className="task-meta-item">
                      <span className="meta-label">Durasi:</span>
                      <span className="meta-value">{task.estimatedDuration} menit</span>
                    </div>
                  )}
                  <div className="task-meta-item">
                    <span className="meta-label">Dibuat:</span>
                    <span className="meta-value">{formatDate(task.createdAt)}</span>
                  </div>
                </div>
              </div>
              
              <div className="task-card-actions">
                <button 
                  onClick={() => onView(task)} 
                  className="btn btn-sm btn-info"
                  title="Lihat detail"
                >
                  Lihat
                </button>
                <button 
                  onClick={() => onEdit(task)} 
                  className="btn btn-sm btn-warning"
                  title="Edit instruksi"
                >
                  Edit
                </button>
                <button 
                  onClick={() => onDelete(task)} 
                  className="btn btn-sm btn-danger"
                  title="Hapus instruksi"
                >
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

// Task Detail View Component
const TaskDetailView = ({ task, onEdit, onDelete, onBack }) => {
  const getDifficultyBadge = (difficulty) => {
    const badges = {
      easy: { class: 'badge-success', text: 'Mudah' },
      medium: { class: 'badge-warning', text: 'Sedang' },
      hard: { class: 'badge-danger', text: 'Sulit' }
    };
    return badges[difficulty] || badges.medium;
  };

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

  return (
    <div className="task-detail-container">
      <div className="task-detail-header">
        <div className="task-detail-info">
          <h2>{task.title}</h2>
          <div className="task-detail-badges">
            <span className={`badge ${getDifficultyBadge(task.difficulty).class}`}>
              {getDifficultyBadge(task.difficulty).text}
            </span>
            <span className="badge badge-info">
              {task.category}
            </span>
            {task.estimatedDuration && (
              <span className="badge badge-secondary">
                {task.estimatedDuration} menit
              </span>
            )}
          </div>
        </div>
        <div className="task-detail-actions">
          <button onClick={() => onEdit(task)} className="btn btn-warning">
            ✏️ Edit
          </button>
          <button onClick={() => onDelete(task)} className="btn btn-danger">
            🗑️ Hapus
          </button>
        </div>
      </div>

      <div className="task-detail-content">
        <div className="task-detail-section">
          <h3>Deskripsi</h3>
          <p>{task.description}</p>
        </div>

        <div className="task-detail-section">
          <h3>Informasi</h3>
          <div className="info-grid">
            {task.estimatedDuration && (
              <div className="info-item">
                <span className="info-label">Estimasi Durasi:</span>
                <span className="info-value">{task.estimatedDuration} menit</span>
              </div>
            )}
            <div className="info-item">
              <span className="info-label">Jumlah Langkah:</span>
              <span className="info-value">{task.steps?.length || 0}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Dibuat:</span>
              <span className="info-value">{formatDate(task.createdAt)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Terakhir Diubah:</span>
              <span className="info-value">{formatDate(task.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="task-detail-section">
          <h3>Langkah-langkah Kerja ({task.steps?.length || 0})</h3>
          <div className="steps-detail">
            {task.steps?.map((step, index) => (
              <div key={index} className="step-detail">
                <div className="step-detail-header">
                  <div className="step-number">{index + 1}</div>
                  <div className="step-title">{step.title}</div>
                  {step.maxTime && (
                    <div className="step-time">⏱️ {step.maxTime}s</div>
                  )}
                </div>
                
                <div className="step-detail-content">
                  <p className="step-description">{step.description}</p>
                  
                  {step.keyPoints?.filter(p => p.trim()).length > 0 && (
                    <div className="step-points">
                      <h5>🎯 Titik Kunci:</h5>
                      <ul>
                        {step.keyPoints.filter(p => p.trim()).map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {step.safetyPoints?.filter(p => p.trim()).length > 0 && (
                    <div className="step-safety">
                      <h5>⚠️ Keselamatan:</h5>
                      <ul>
                        {step.safetyPoints.filter(p => p.trim()).map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {step.imageUrls?.filter(url => url.trim()).length > 0 && (
                    <div className="step-images">
                      <h5>🖼️ Gambar Referensi:</h5>
                      <div className="images-grid">
                        {step.imageUrls.filter(url => url.trim()).map((url, i) => (
                          <img 
                            key={i} 
                            src={url} 
                            alt={`Gambar ${i + 1}`}
                            className="step-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )) || <p>Tidak ada langkah kerja.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main AddTaskPage Component
const AddTaskPage = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('list');
  const [tasks, setTasks] = useState([]);
  const [task, setTask] = useState(DEFAULT_TASK);
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
    loadTasks();
  }, [loadTasks]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleTaskChange = useCallback((field, value) => {
    setTask(prev => ({ ...prev, [field]: value }));
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
    setTask(DEFAULT_TASK);
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
    setTask(taskToEdit);
    setEditingTask(taskToEdit);
    setCurrentView('edit');
    setShowPreview(false);
    setErrors([]);
  }, []);

  const handleDelete = useCallback((taskToDelete) => {
    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Hapus',
      message: `Apakah Anda yakin ingin menghapus instruksi kerja "${taskToDelete.title}"? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        setLoading(true);
        try {
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
      setTask(DEFAULT_TASK);
      setEditingTask(null);
      setShowPreview(false);
      setErrors([]);
    }
  }, [currentView]);

  const handleSaveTask = useCallback(async () => {
    setErrors([]);
    setLoading(true);

    try {
      const validationErrors = validateTask(task);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setLoading(false);
        return;
      }

      const auth = getAuth();
      const user = auth.currentUser;
      
      const taskData = {
        title: task.title.trim(),
        description: task.description.trim(),
        category: task.category.trim(),
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
        updatedAt: Timestamp.now(),
        isActive: true
      };

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
      setTask(DEFAULT_TASK);
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
                <h2>📋 Informasi Dasar</h2>
                
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
                      placeholder="Contoh: Prosedur Pemeliharaan Mesin Produksi"
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="task-description">
                      Deskripsi Instruksi Kerja <span className="required">*</span>
                    </label>
                    <textarea
                      id="task-description"
                      value={task.description}
                      onChange={(e) => handleTaskChange('description', e.target.value)}
                      placeholder="Jelaskan secara singkat tentang instruksi kerja ini..."
                      className="form-textarea"
                      rows="3"
                      required
                    />
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
                      placeholder="Contoh: 30"
                      className="form-input"
                      min="0"
                    />
                    <small className="form-hint">
                      Kosongkan jika tidak ada estimasi waktu
                    </small>
                  </div>
                </div>
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
                      suggestedTime={suggestedTimes[index] || 0}
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
      />
      
      <Sidebar 
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
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