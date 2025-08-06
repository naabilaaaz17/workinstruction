import React, { useState, useEffect } from 'react';
import './TroubleshootModal.css';
import { formatTime, formatStepTime, STEP_STATUS } from './TaskPageComponent';

export const TroubleshootModal = ({ 
  isOpen, 
  onClose, 
  stepTime, 
  totalTime,
  currentStep, 
  activeStep, 
  stepStatus,
  isRunning,
  onApplyFix,
  onResetStep,
  onForceComplete,
  onAdjustTime,
  workSessionId,
  autoSaveInterval = 5000,
  troubleshootHistory = [] // New prop for tracking history
}) => {
  const [selectedFix, setSelectedFix] = useState(null);
  const [customTime, setCustomTime] = useState(stepTime);
  const [useTargetTime, setUseTargetTime] = useState(false);
  const [troubleshootReason, setTroubleshootReason] = useState('');
  const [lastAutoSave, setLastAutoSave] = useState(Date.now());
  
  // NEW: Confirmation states
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  
  // NEW: Time adjustment states
  const [showTimeAdjustment, setShowTimeAdjustment] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationSlider, setDurationSlider] = useState(stepTime);
  const [timeAdjustmentMode, setTimeAdjustmentMode] = useState('slider'); // 'slider', 'datetime'
  
  // NEW: Tooltip states
  const [showTooltip, setShowTooltip] = useState({});
  
  // NEW: Undo state
  const [lastAction, setLastAction] = useState(null);
  const [canUndo, setCanUndo] = useState(false);

  // Computed values
  const targetTime = typeof activeStep?.maxTime === 'string' 
    ? parseInt(activeStep.maxTime, 10) 
    : activeStep?.maxTime || 0;
  
  const timeToUse = useTargetTime ? targetTime : customTime;
  const isOverTarget = targetTime > 0 && stepTime > targetTime;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFix(null);
      setCustomTime(stepTime);
      setDurationSlider(stepTime);
      setUseTargetTime(false);
      setTroubleshootReason('');
      setShowConfirmation(false);
      setShowTimeAdjustment(false);
      
      // Set default datetime values
      const now = new Date();
      const stepStart = new Date(now.getTime() - (stepTime * 1000));
      setStartTime(stepStart.toISOString().slice(0, 16));
      setEndTime(now.toISOString().slice(0, 16));
    }
  }, [isOpen, stepTime]);

  // Auto-save progress periodically
  useEffect(() => {
    if (!isOpen || !workSessionId) return;

    const autoSaveTimer = setInterval(() => {
      const currentTime = Date.now();
      if (currentTime - lastAutoSave >= autoSaveInterval) {
        handleAutoSave();
        setLastAutoSave(currentTime);
      }
    }, 1000);

    return () => clearInterval(autoSaveTimer);
  }, [isOpen, workSessionId, lastAutoSave, autoSaveInterval]);

  const handleAutoSave = async () => {
    try {
      const progressData = {
        stepTime,
        totalTime,
        currentStep,
        stepStatus,
        lastAutoSave: new Date().toISOString(),
        troubleshootActive: true
      };
      
      console.log('🔄 Auto-saving troubleshoot progress:', progressData);
      
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  };

  // NEW: Tooltip handlers
  const showTooltipFor = (key, message) => {
    setShowTooltip(prev => ({ ...prev, [key]: message }));
  };

  const hideTooltip = (key) => {
    setShowTooltip(prev => ({ ...prev, [key]: false }));
  };

  // NEW: Confirmation handlers
  const requestConfirmation = (action, message) => {
    setPendingAction(action);
    setConfirmationMessage(message);
    setShowConfirmation(true);
  };

  const handleConfirmAction = () => {
    if (pendingAction) {
      executeAction(pendingAction);
      setLastAction(pendingAction);
      setCanUndo(true);
    }
    setShowConfirmation(false);
    setPendingAction(null);
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setPendingAction(null);
    setConfirmationMessage('');
  };

  // NEW: Time adjustment handlers
  const handleTimeAdjustmentRequest = () => {
    setShowTimeAdjustment(true);
  };

  const calculateDurationFromDateTime = () => {
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const duration = Math.max(0, Math.floor((end - start) / 1000));
      setDurationSlider(duration);
      setCustomTime(duration);
    }
  };

  const handleSliderChange = (value) => {
    setDurationSlider(value);
    setCustomTime(value);
  };

  // NEW: Undo functionality
  const handleUndo = () => {
    if (lastAction && canUndo) {
      onApplyFix({
        type: 'UNDO_ACTION',
        previousAction: lastAction,
        timestamp: new Date().toISOString()
      });
      setLastAction(null);
      setCanUndo(false);
    }
  };

  const troubleshootOptions = [
    {
      id: 'forgot_stop',
      title: 'Lupa klik STOP',
      description: 'Timer masih berjalan padahal sudah selesai bekerja',
      icon: '⏸️',
      severity: 'warning',
      tooltip: 'Menghentikan timer dan menyesuaikan waktu sesuai durasi kerja sebenarnya',
      fixes: [
        {
          action: 'stop_and_adjust',
          label: 'Stop timer dan sesuaikan waktu',
          description: 'Hentikan timer dan ubah waktu sesuai durasi kerja sebenarnya',
          tooltip: 'Timer akan dihentikan dan waktu dapat disesuaikan manual',
          requiresConfirmation: false
        },
        {
          action: 'use_target_time',
          label: 'Gunakan waktu target',
          description: `Gunakan waktu target (${formatStepTime(targetTime)}) sebagai waktu langkah`,
          tooltip: 'Menggunakan waktu target yang telah ditetapkan untuk langkah ini',
          requiresConfirmation: false
        }
      ]
    },
    {
      id: 'forgot_complete',
      title: 'Sudah selesai tapi belum tandai selesai',
      description: 'Langkah sudah selesai tapi lupa klik tombol "Selesai Langkah"',
      icon: '✅',
      severity: 'info',
      tooltip: 'Menandai langkah sebagai selesai tanpa mencatat waktu aktual yang tepat',
      fixes: [
        {
          action: 'force_complete_current',
          label: 'Tandai selesai dengan waktu saat ini',
          description: `Selesaikan langkah dengan waktu ${formatStepTime(stepTime)}`,
          tooltip: 'Langkah akan ditandai selesai dengan waktu yang tertera saat ini',
          requiresConfirmation: true,
          confirmMessage: 'Langkah akan ditandai selesai dengan waktu saat ini. Tindakan ini akan mempengaruhi statistik waktu. Lanjutkan?'
        },
        {
          action: 'force_complete_target',
          label: 'Tandai selesai dengan waktu target',
          description: `Selesaikan langkah dengan waktu target (${formatStepTime(targetTime)})`,
          tooltip: 'Menggunakan waktu target sebagai waktu penyelesaian langkah',
          requiresConfirmation: true,
          confirmMessage: 'Langkah akan ditandai selesai dengan waktu target. Waktu aktual tidak akan tercatat. Lanjutkan?'
        }
      ]
    },
    {
      id: 'time_too_long',
      title: 'Waktu terlalu panjang',
      description: 'Timer berjalan lebih lama dari yang seharusnya',
      icon: '⏰',
      severity: 'error',
      tooltip: 'Mengatasi masalah waktu yang tidak sesuai dengan durasi kerja sebenarnya',
      fixes: [
        {
          action: 'reset_step',
          label: 'Reset dan mulai ulang langkah',
          description: 'Kembalikan langkah ke status awal dan mulai dari 0',
          tooltip: 'Semua progres langkah ini akan hilang dan dimulai dari awal',
          requiresConfirmation: true,
          confirmMessage: 'Yakin ingin menghapus seluruh progres langkah ini? Tindakan ini tidak bisa dibatalkan dan langkah akan kembali ke status belum dimulai.'
        },
        {
          action: 'adjust_to_target',
          label: 'Sesuaikan ke waktu target',
          description: `Ubah waktu langkah menjadi ${formatStepTime(targetTime)}`,
          tooltip: 'Waktu langkah akan diubah menjadi waktu target yang ditetapkan',
          requiresConfirmation: false
        }
      ]
    },
    {
      id: 'manual_time',
      title: 'Perbaiki waktu manual',
      description: 'Sesuaikan waktu secara manual sesuai kebutuhan',
      icon: '🔧',
      severity: 'neutral',
      tooltip: 'Memberikan kontrol penuh untuk menyesuaikan waktu langkah',
      fixes: [
        {
          action: 'custom_time',
          label: 'Masukkan waktu custom',
          description: 'Tentukan waktu yang tepat secara manual',
          tooltip: 'Anda dapat menentukan waktu dengan slider atau input datetime',
          requiresConfirmation: false,
          customHandler: handleTimeAdjustmentRequest
        },
        {
          action: 'revert_to_target',
          label: 'Kembalikan ke waktu target',
          description: 'Gunakan waktu target sebagai waktu langkah',
          tooltip: 'Mengembalikan waktu ke nilai target default',
          requiresConfirmation: false
        }
      ]
    }
  ];

  const executeAction = (actionData) => {
    const fixData = {
      troubleshootType: actionData.optionId,
      fixAction: actionData.action,
      originalTime: stepTime,
      adjustedTime: timeToUse,
      reason: troubleshootReason,
      timestamp: new Date().toISOString()
    };

    switch (actionData.action) {
      case 'stop_and_adjust':
        onApplyFix({
          type: 'STOP_AND_ADJUST',
          newStepTime: timeToUse,
          ...fixData
        });
        break;
        
      case 'use_target_time':
        onApplyFix({
          type: 'USE_TARGET_TIME',
          newStepTime: targetTime,
          ...fixData
        });
        break;
        
      case 'force_complete_current':
        onForceComplete({
          useCurrentTime: true,
          ...fixData
        });
        break;
        
      case 'force_complete_target':
        onForceComplete({
          useTargetTime: true,
          newStepTime: targetTime,
          ...fixData
        });
        break;
        
      case 'reset_step':
        onResetStep(fixData);
        break;
        
      case 'adjust_to_target':
        onAdjustTime({
          newStepTime: targetTime,
          ...fixData
        });
        break;
        
      case 'custom_time':
        onAdjustTime({
          newStepTime: timeToUse,
          ...fixData
        });
        break;
        
      case 'revert_to_target':
        onAdjustTime({
          newStepTime: targetTime,
          ...fixData
        });
        break;
        
      default:
        console.warn('Unknown fix action:', actionData.action);
    }

    onClose();
  };

  const handleApplyFix = () => {
    if (!selectedFix) return;

    const actionData = {
      optionId: selectedFix.optionId,
      action: selectedFix.action,
      label: selectedFix.label,
      description: selectedFix.description
    };

    // Check if action requires confirmation
    const fixOption = troubleshootOptions
      .find(opt => opt.id === selectedFix.optionId)
      ?.fixes.find(fix => fix.action === selectedFix.action);

    if (fixOption?.requiresConfirmation) {
      requestConfirmation(actionData, fixOption.confirmMessage);
    } else if (fixOption?.customHandler) {
      fixOption.customHandler();
    } else {
      executeAction(actionData);
      setLastAction(actionData);
      setCanUndo(true);
      onClose();
    }
  };

  const handleFixSelect = (optionId, action, label, description) => {
    setSelectedFix({ optionId, action, label, description });
  };

  const handleTimeAdjustmentApply = () => {
    const finalTime = timeAdjustmentMode === 'datetime' 
      ? Math.floor((new Date(endTime) - new Date(startTime)) / 1000)
      : durationSlider;

    const actionData = {
      optionId: 'manual_time',
      action: 'custom_time',
      label: 'Waktu disesuaikan manual',
      description: `Waktu diubah menjadi ${formatStepTime(finalTime)}`
    };

    onAdjustTime({
      newStepTime: finalTime,
      troubleshootType: 'manual_time',
      fixAction: 'custom_time',
      originalTime: stepTime,
      adjustedTime: finalTime,
      reason: troubleshootReason,
      adjustmentMode: timeAdjustmentMode,
      timestamp: new Date().toISOString()
    });

    setLastAction(actionData);
    setCanUndo(true);
    setShowTimeAdjustment(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="troubleshoot-modal-overlay">
      <div className="troubleshoot-modal-content">
        {/* Header */}
        <div className="troubleshoot-modal-header">
          <h3>⚠️ Troubleshoot Timer</h3>
          <div className="header-actions">
            {canUndo && (
              <button 
                onClick={handleUndo}
                className="undo-btn"
                title="Batalkan tindakan terakhir"
              >
                ⏪ Undo
              </button>
            )}
            <button 
              onClick={onClose} 
              className="troubleshoot-close-btn"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Troubleshoot History */}
        {troubleshootHistory.length > 0 && (
          <div className="troubleshoot-history">
            <h4>Riwayat Perubahan:</h4>
            <div className="history-list">
              {troubleshootHistory.slice(-3).map((entry, index) => (
                <div key={index} className="history-item">
                  <span className="history-badge">⚠️ Diubah Manual</span>
                  <span className="history-description">{entry.description}</span>
                  <span className="history-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Status */}
        <div className="troubleshoot-status">
          <div className="status-item">
            <span className="status-label">Langkah Saat Ini:</span>
            <span className="status-value">{activeStep?.title || 'N/A'}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Waktu Langkah:</span>
            <span className={`status-value ${isOverTarget ? 'over-target' : ''}`}>
              {formatStepTime(stepTime)}
              {isOverTarget && <span className="warning-badge">MELEBIHI TARGET</span>}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Waktu Target:</span>
            <span className="status-value">
              {targetTime > 0 ? formatStepTime(targetTime) : 'Tidak ada target'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Status:</span>
            <span className={`status-badge status-${stepStatus}`}>
              {stepStatus === STEP_STATUS.IN_PROGRESS ? 'Sedang Berjalan' :
               stepStatus === STEP_STATUS.COMPLETED ? 'Selesai' :
               stepStatus === STEP_STATUS.SKIPPED ? 'Dilewati' : 'Belum Dimulai'}
            </span>
          </div>
        </div>

        {/* Troubleshoot Options */}
        <div className="troubleshoot-options">
          <h4>Pilih masalah yang terjadi:</h4>
          
          {troubleshootOptions.map((option) => (
            <div key={option.id} className={`troubleshoot-option ${option.severity}`}>
              <div className="option-header">
                <span className="option-icon">{option.icon}</span>
                <h5>{option.title}</h5>
                <button
                  className="info-tooltip-btn"
                  onMouseEnter={() => showTooltipFor(option.id, option.tooltip)}
                  onMouseLeave={() => hideTooltip(option.id)}
                >
                  ℹ️
                </button>
                {showTooltip[option.id] && (
                  <div className="tooltip">{showTooltip[option.id]}</div>
                )}
              </div>
              <p className="option-description">{option.description}</p>
              
              <div className="option-fixes">
                {option.fixes.map((fix, index) => (
                  <div key={index} className="fix-wrapper">
                    <button
                      onClick={() => handleFixSelect(option.id, fix.action, fix.label, fix.description)}
                      className={`fix-button ${selectedFix?.action === fix.action ? 'selected' : ''}`}
                    >
                      <span className="fix-label">{fix.label}</span>
                      <small className="fix-description">{fix.description}</small>
                      {fix.requiresConfirmation && (
                        <span className="confirmation-indicator">🔒 Butuh konfirmasi</span>
                      )}
                    </button>
                    <button
                      className="fix-tooltip-btn"
                      onMouseEnter={() => showTooltipFor(`${option.id}-${index}`, fix.tooltip)}
                      onMouseLeave={() => hideTooltip(`${option.id}-${index}`)}
                    >
                      ℹ️
                    </button>
                    {showTooltip[`${option.id}-${index}`] && (
                      <div className="tooltip">{showTooltip[`${option.id}-${index}`]}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Custom Time Input - Enhanced */}
        {selectedFix?.action === 'custom_time' && !showTimeAdjustment && (
          <div className="custom-time-section">
            <h4>Sesuaikan Waktu:</h4>
            <div className="time-input-group">
              <div className="time-option">
                <label>
                  <input
                    type="radio"
                    checked={!useTargetTime}
                    onChange={() => setUseTargetTime(false)}
                  />
                  Waktu Custom (detik):
                </label>
                <input
                  type="number"
                  value={customTime}
                  onChange={(e) => setCustomTime(parseInt(e.target.value, 10) || 0)}
                  disabled={useTargetTime}
                  min="0"
                  className="time-input"
                />
                <span className="time-preview">
                  = {formatStepTime(customTime)}
                </span>
              </div>
              
              {targetTime > 0 && (
                <div className="time-option">
                  <label>
                    <input
                      type="radio"
                      checked={useTargetTime}
                      onChange={() => setUseTargetTime(true)}
                    />
                    Gunakan Waktu Target: {formatStepTime(targetTime)}
                  </label>
                </div>
              )}
              
              <button 
                onClick={handleTimeAdjustmentRequest}
                className="advanced-time-btn"
              >
                🔧 Penyesuaian Waktu Lanjutan
              </button>
            </div>
          </div>
        )}

        {/* Advanced Time Adjustment Modal */}
        {showTimeAdjustment && (
          <div className="time-adjustment-modal">
            <div className="time-adjustment-header">
              <h4>Penyesuaian Waktu Lanjutan</h4>
              <button onClick={() => setShowTimeAdjustment(false)}>×</button>
            </div>
            
            <div className="time-adjustment-modes">
              <label>
                <input
                  type="radio"
                  checked={timeAdjustmentMode === 'slider'}
                  onChange={() => setTimeAdjustmentMode('slider')}
                />
                Slider Durasi
              </label>
              <label>
                <input
                  type="radio"
                  checked={timeAdjustmentMode === 'datetime'}
                  onChange={() => setTimeAdjustmentMode('datetime')}
                />
                Waktu Mulai & Selesai
              </label>
            </div>

            {timeAdjustmentMode === 'slider' && (
              <div className="slider-mode">
                <label>Durasi: {formatStepTime(durationSlider)}</label>
                <input
                  type="range"
                  min="0"
                  max={Math.max(3600, stepTime * 2)}
                  value={durationSlider}
                  onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                  className="duration-slider"
                />
                <div className="slider-markers">
                  <span>0:00</span>
                  <span>Target: {formatStepTime(targetTime)}</span>
                  <span>Saat ini: {formatStepTime(stepTime)}</span>
                </div>
              </div>
            )}

            {timeAdjustmentMode === 'datetime' && (
              <div className="datetime-mode">
                <div className="datetime-input">
                  <label>Waktu Mulai:</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      calculateDurationFromDateTime();
                    }}
                  />
                </div>
                <div className="datetime-input">
                  <label>Waktu Selesai:</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      calculateDurationFromDateTime();
                    }}
                  />
                </div>
                <div className="duration-preview">
                  Durasi: {formatStepTime(Math.max(0, Math.floor((new Date(endTime) - new Date(startTime)) / 1000)))}
                </div>
              </div>
            )}

            <div className="time-adjustment-actions">
              <button onClick={handleTimeAdjustmentApply} className="apply-time-btn">
                Terapkan Waktu
              </button>
              <button onClick={() => setShowTimeAdjustment(false)} className="cancel-time-btn">
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Selected Fix Preview */}
        {selectedFix && !showTimeAdjustment && (
          <div className="fix-preview">
            <h4>Tindakan yang akan dilakukan:</h4>
            <div className="preview-content">
              <strong>{selectedFix.label}</strong>
              <p>{selectedFix.description}</p>
              {(selectedFix.action === 'stop_and_adjust' || 
                selectedFix.action === 'custom_time' ||
                selectedFix.action === 'force_complete_target') && (
                <p className="time-change">
                  Waktu akan diubah menjadi: <strong>{formatStepTime(timeToUse)}</strong>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="confirmation-overlay">
            <div className="confirmation-modal">
              <h4>⚠️ Konfirmasi Tindakan</h4>
              <p>{confirmationMessage}</p>
              <div className="confirmation-actions">
                <button onClick={handleConfirmAction} className="confirm-btn">
                  Ya, Lanjutkan
                </button>
                <button onClick={handleCancelConfirmation} className="cancel-btn">
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showTimeAdjustment && (
          <div className="troubleshoot-actions">
            <button
              onClick={handleApplyFix}
              disabled={!selectedFix}
              className="apply-fix-btn"
            >
              Terapkan Perbaikan
            </button>
            <button
              onClick={onClose}
              className="cancel-btn"
            >
              Batal
            </button>
          </div>
        )}

        {/* Auto-save Indicator */}
        <div className="auto-save-indicator">
          <small>💾 Progress disimpan otomatis setiap {autoSaveInterval / 1000} detik</small>
        </div>
      </div>
    </div>
  );
};