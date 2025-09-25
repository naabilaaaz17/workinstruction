// AddTaskComponents.js - Updated components without MOAssignmentPanel

import React, { useState, useEffect } from 'react';
import logoLRS from '../assets/images/logoLRS.png';
import { CheckCircle, Briefcase, FileText, Users, User, Menu, X, LogOut, Home, Plus } from 'lucide-react';
import { 
  convertTimeToMinutes, 
  convertMinutesToSeconds, 
  calculateTotalStepTime,
  validateTimeConsistency,
  suggestStepTime,
  DEFAULT_STEP
} from './AddTaskUtils';

// Time Summary Component
export const TimeSummaryPanel = ({ task, onDistributeTime, onClearAllTimes }) => {
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
        <h3>⏰ Ringkasan Waktu</h3>
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
export const EnhancedStepForm = ({ 
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

// Updated Header Component with profile dropdown like ApprovalAdmin
export const AddTaskHeader = ({ currentView, onBackClick, onLogout, sidebarOpen, toggleSidebar }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.add-task-profile-container')) {
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
    // Navigate to admin page without using window.location.href
    if (onBackClick) {
      onBackClick();
    }
  };

  const handleLogoutClick = () => {
    // Use the proper logout function passed from parent
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="add-task-header-bar">
      <div className="add-task-header-left">
        <button 
          className="add-task-sidebar-toggle"
          onClick={toggleSidebar}
        >
          <Menu size={20} />
        </button>
        <img 
          src={logoLRS} 
          alt="LRS Logo" 
          className="add-task-logo"
          onClick={handleLogoClick}
          style={{ cursor: 'pointer' }}
        />
      </div>
      <div className="add-task-header-center">
        <h1 className="add-task-title-header">{getTitle()}</h1>
      </div>
      <div className="add-task-header-right">
        <div className="add-task-profile-container">
          <button
            className="add-task-profile-btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="add-task-profile-avatar">
              <span className="add-task-avatar-text">A</span>
            </div>
            <div className="add-task-profile-info">
              <div className="add-task-profile-name">Admin</div>
              <div className="add-task-profile-id">Administrator</div>
            </div>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className={`add-task-dropdown-arrow ${showDropdown ? 'rotated' : ''}`}
            >
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </button>

          {showDropdown && (
            <div className="add-task-dropdown-menu">
              <div className="add-task-dropdown-header">
                <div className="add-task-profile-avatar">
                  <span className="add-task-avatar-text">A</span>
                </div>
                <div>
                  <div className="add-task-dropdown-name">Admin</div>
                  <div className="add-task-dropdown-role">Administrator</div>
                </div>
              </div>
              <hr className="add-task-dropdown-divider" />
              <button 
                className="add-task-dropdown-item add-task-dropdown-logout" 
                onClick={() => {
                  setShowDropdown(false);
                  handleLogoutClick();
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

// Updated Sidebar Component with MO Management menu
export const Sidebar = ({ sidebarOpen, toggleSidebar }) => {
  const handleMenuClick = (menuId) => {
    if (menuId === 'Rekap Pengerjaan') {
      window.location.href = '/admin';
    } else if (menuId === 'User Management') {
      window.location.href = '/approvals';
    } else if (menuId === 'MO Management') {
      window.location.href = '/add-mo';
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
            <X size={20} />
          </button>
        </div>
        
        <nav className="add-task-sidebar-nav">
          <button 
            onClick={() => handleMenuClick('Rekap Pengerjaan')} 
            className="add-task-sidebar-item"
          >
            <Home size={20} />
            <span>Work Sessions</span>
          </button>

          <button 
            onClick={() => handleMenuClick('User Management')} 
            className="add-task-sidebar-item"
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
              toggleSidebar();
            }} 
            className="add-task-sidebar-item active"
          >
            <Plus size={20} />
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
export const LoadingOverlay = ({ message = "Memuat data..." }) => (
  <div className="loading-overlay">
    <div className="loading-content">
      <div className="loading-spinner"></div>
      <p>{message}</p>
    </div>
  </div>
);

// Confirmation Modal Component
export const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false }) => {
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

// Enhanced Task List Component (No assignment info since moved to MO Management)
export const TaskList = ({ tasks, onAddNew, onView, onEdit, onDelete, loading }) => {
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
                {task.moNumber && (
                  <div className="mo-info">
                    <span className="mo-badge">MO: {task.moNumber}</span>
                  </div>
                )}
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

                {/* Show MO link if available */}
                {task.moDisplay && (
                  <div className="mo-reference">
                    <div className="mo-reference-header">
                      <Briefcase size={16} />
                      <span>Dari MO: {task.moDisplay}</span>
                    </div>
                    <small className="mo-note">
                      Assignment operator dikelola melalui MO Management
                    </small>
                  </div>
                )}
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

// Enhanced Task Detail View Component (No assignment info since moved to MO Management)
export const TaskDetailView = ({ task, onEdit, onDelete, onBack }) => {
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
          {task.moNumber && (
            <div className="mo-display">
              <span className="mo-number">MO: {task.moDisplay || `${task.moNumber} - ${task.title}`}</span>
              <small className="mo-assignment-note">
                📝 Assignment operator dikelola melalui MO Management
              </small>
            </div>
          )}
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
            {task.moNumber && (
              <div className="info-item">
                <span className="info-label">Nomor MO:</span>
                <span className="info-value">{task.moNumber}</span>
              </div>
            )}
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