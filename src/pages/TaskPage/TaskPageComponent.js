import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import logoLRS from '../assets/images/logoLRS.png';

// Constants
export const STEP_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped'
};

// Helper Functions
export const formatTime = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export const formatStepTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const getStepStatusColor = (status) => {
  switch (status) {
    case STEP_STATUS.COMPLETED: return '#22c55e';
    case STEP_STATUS.IN_PROGRESS: return '#3b82f6';
    case STEP_STATUS.SKIPPED: return '#f59e0b';
    default: return '#6b7280';
  }
};

export const getStepStatusText = (status) => {
  switch (status) {
    case STEP_STATUS.COMPLETED: return '✓ Selesai';
    case STEP_STATUS.IN_PROGRESS: return '▶ Berlangsung';
    case STEP_STATUS.SKIPPED: return '⏭ Dilewati';
    default: return '○ Belum';
  }
};

// Work Instruction Selector Component
export const WorkInstructionSelector = ({ workInstructions, selectedInstruction, onSelectInstruction }) => {
  if (workInstructions.length <= 1) return null;

  return (
    <div className="work-instruction-selector">
      <label htmlFor="instruction-select">Pilih Instruksi Kerja:</label>
      <select 
        id="instruction-select"
        value={selectedInstruction?.id || ''}
        onChange={(e) => {
          const selected = workInstructions.find(wi => wi.id === e.target.value);
          onSelectInstruction(selected);
        }}
        className="instruction-dropdown"
      >
        <option value="">-- Pilih Instruksi Kerja --</option>
        {workInstructions.map((instruction) => (
          <option key={instruction.id} value={instruction.id}>
            {instruction.title}
          </option>
        ))}
      </select>
    </div>
  );
};

// Header Component
export const TaskHeader = ({ workInstructionTitle }) => {
  return (
    <div className="task-header">
      <div className="task-header-left">
        <Link to="/home">
          <img src={logoLRS} alt="Logo LRS" className="header-logo" />
        </Link>
      </div>
      <div className="header-title-group">
        <h1 className="task-title">
          {workInstructionTitle || 'Pilih Instruksi Kerja'}
        </h1>
      </div>
      <Link to="/home" className="back-button">
        <span>Kembali</span>
      </Link>
    </div>
  );
};

// Progress Bar Component
export const TaskProgressBar = ({ completedSteps, totalSteps }) => {
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  
  return (
    <div className="task-progress">
      <div className="task-progress-bar">
        <div 
          className="task-progress-fill" 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <div className="task-progress-text">
        Progress: {completedSteps} dari {totalSteps} langkah selesai
      </div>
    </div>
  );
};

// Step Navigator Component
export const StepNavigator = ({ stepStatuses, currentStep, steps, onGoToStep }) => {
  const getSkippedSteps = () => {
    return stepStatuses
      .map((status, index) => ({ status, index }))
      .filter(item => item.status === STEP_STATUS.SKIPPED);
  };

  const skippedSteps = getSkippedSteps();

  return (
    <div className="step-navigator">
      <h3>Navigasi Langkah:</h3>
      <div className="step-buttons">
        {stepStatuses.map((status, index) => (
          <button
            key={index}
            onClick={() => onGoToStep(index)}
            className={`step-button ${currentStep === index ? 'active' : ''}`}
            style={{ color: getStepStatusColor(status) }}
            title={steps[index]?.title}
          >
            {index + 1}. {getStepStatusText(status)}
          </button>
        ))}
      </div>
      
      {skippedSteps.length > 0 && (
        <div className="skipped-steps-warning">
          <strong>⚠ Langkah yang dilewati:</strong>
          <ul>
            {skippedSteps.map(({ index }) => (
              <li key={index}>
                <button
                  onClick={() => onGoToStep(index)}
                  className="skipped-step-link"
                >
                  {steps[index]?.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Timer Display Component with Target Time Warning
export const TimerDisplay = ({ totalTime, stepTime, targetTime, showWarning, isOverTarget }) => (
  <div className={`task-timer-display ${isOverTarget ? 'over-target' : ''}`}>
    <div className="task-total-time">
      Total Waktu: <span>{formatTime(totalTime)}</span>
    </div>
    <div className={`task-step-time ${showWarning ? 'time-warning' : ''}`}>
      Waktu Langkah: <span>{formatStepTime(stepTime)}</span>
      {isOverTarget && (
        <span className="over-target-indicator">
          ⚠️ MELEBIHI TARGET
        </span>
      )}
    </div>
  </div>
);

// Image Preloader Component untuk multiple images
export const ImagePreloader = ({ images, onImagesLoaded }) => {
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    console.log('🖼️ ImagePreloader received images:', images);
    
    if (!images || images.length === 0) {
      console.log('🖼️ No images to preload');
      onImagesLoaded({});
      return;
    }

    // Flatten all images from all steps
    const allImageUrls = [];
    images.forEach((stepImages, stepIndex) => {
      console.log(`🖼️ Processing step ${stepIndex}:`, stepImages);
      
      if (Array.isArray(stepImages)) {
        stepImages.forEach((imageUrl, imageIndex) => {
          if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
            allImageUrls.push({ stepIndex, imageIndex, url: imageUrl.trim() });
          }
        });
      } else if (stepImages && typeof stepImages === 'string' && stepImages.trim() !== '') {
        allImageUrls.push({ stepIndex, imageIndex: 0, url: stepImages.trim() });
      }
    });

    console.log(`🖼️ Flattened ${allImageUrls.length} image URLs:`, allImageUrls);

    if (allImageUrls.length === 0) {
      console.log('🖼️ No valid image URLs found');
      onImagesLoaded({});
      return;
    }

    const imagePromises = allImageUrls.map((imageInfo) => {
      return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = () => {
          console.log(`✅ Image loaded: ${imageInfo.url}`);
          resolve({ ...imageInfo, loaded: true, image: img });
        };
        
        img.onerror = (error) => {
          console.warn(`❌ Failed to load image: ${imageInfo.url}`, error);
          resolve({ ...imageInfo, loaded: false, error: true });
        };
        
        // Set crossOrigin if needed for external images
        if (imageInfo.url.startsWith('http')) {
          img.crossOrigin = 'anonymous';
        }
        
        img.src = imageInfo.url;
      });
    });

    // Track loading progress
    let loadedCount = 0;
    imagePromises.forEach((promise) => {
      promise.then(() => {
        loadedCount++;
        const progress = (loadedCount / allImageUrls.length) * 100;
        setLoadingProgress(progress);
        console.log(`📊 Loading progress: ${Math.round(progress)}% (${loadedCount}/${allImageUrls.length})`);
      });
    });

    Promise.all(imagePromises).then((results) => {
      const loadedImagesMap = {};
      
      results.forEach((result) => {
        if (!loadedImagesMap[result.stepIndex]) {
          loadedImagesMap[result.stepIndex] = {};
        }
        loadedImagesMap[result.stepIndex][result.imageIndex] = result;
      });
      
      console.log('✅ All images processed:', loadedImagesMap);
      setLoadingProgress(100);
      onImagesLoaded(loadedImagesMap);
    });

  }, [images, onImagesLoaded]);

  if (images && images.length > 0 && loadingProgress < 100) {
    return (
      <div className="image-preloader">
        <div className="preloader-info">
          <span>Memuat gambar... {Math.round(loadingProgress)}%</span>
          <div className="preloader-bar">
            <div 
              className="preloader-progress" 
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Step Content Component untuk multiple images
export const StepContent = ({ activeStep, stepStatus, stepImages, currentStep }) => {
  console.log('🔍 StepContent render:', {
    activeStep: activeStep?.title,
    stepStatus,
    currentStep,
    stepImages: Object.keys(stepImages || {}),
    activeStepImageUrls: activeStep?.imageUrls
  });

  // Safety checks
  if (!activeStep || typeof activeStep !== 'object' || !activeStep.title) {
    return (
      <div className="task-details-wrapper">
        <div className="no-step-selected">
          <h2>Pilih instruksi kerja untuk memulai</h2>
        </div>
      </div>
    );
  }

  const maxTimeValue = typeof activeStep.maxTime === 'string' 
    ? parseInt(activeStep.maxTime, 10) 
    : activeStep.maxTime || 0;

  // Get current step images dengan validasi yang lebih baik
  const currentStepImages = stepImages && currentStep !== undefined 
    ? stepImages[currentStep] 
    : null;

  console.log('🖼️ Current step images:', currentStepImages);

  // Check if we have loaded images for current step
  const hasLoadedImages = currentStepImages && 
    Object.keys(currentStepImages).length > 0 &&
    Object.values(currentStepImages).some(img => img && img.loaded);

  // Fallback ke activeStep.imageUrls
  const fallbackImages = activeStep.imageUrls && Array.isArray(activeStep.imageUrls) 
    ? activeStep.imageUrls 
    : activeStep.imageUrl && typeof activeStep.imageUrl === 'string' 
      ? [activeStep.imageUrl] 
      : [];

  const hasImages = hasLoadedImages || fallbackImages.length > 0;

  console.log('🖼️ Image status:', {
    hasLoadedImages,
    fallbackImagesCount: fallbackImages.length,
    hasImages
  });

  return (
    <div className="task-details-wrapper">
      <div className="task-step-info">
        <h2 className="task-step-title">
          {activeStep.title}
          <span 
            className="step-status-badge"
            style={{ color: getStepStatusColor(stepStatus) }}
          >
            ({getStepStatusText(stepStatus)})
          </span>
        </h2>
        
        {activeStep.description && (
          <div className="task-step-description">
            <h3>LANGKAH KERJA:</h3>
            <p>{activeStep.description}</p>
          </div>
        )}

        {activeStep.keyPoints && Array.isArray(activeStep.keyPoints) && activeStep.keyPoints.length > 0 && (
          <div className="task-key-points">
            <h3>TITIK KUNCI KERJA:</h3>
            <ul>
              {activeStep.keyPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {activeStep.safetyPoints && Array.isArray(activeStep.safetyPoints) && activeStep.safetyPoints.length > 0 && (
          <div className="task-safety-points">
            <h3>TITIK KUNCI KESELAMATAN KERJA:</h3>
            <ul>
              {activeStep.safetyPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {maxTimeValue > 0 && (
          <div className="task-max-time">
            <h3>WAKTU TARGET:</h3>
            <ul>
              <li>{formatStepTime(maxTimeValue)} (Target waktu penyelesaian)</li>
            </ul>
          </div>
        )}
        
        <div className="task-safety-reminder">
          <h3>KESELAMATAN KERJA UMUM</h3>
          <ul>
            <li>Selalu gunakan APD & Alat Pendukung yang sesuai.</li>
            <li>Jaga selalu kebersihan tempat kerja.</li>
          </ul>
        </div>
      </div>

      {/* Image section untuk multiple images */}
      {hasImages && (
        <div className="task-step-images">
          <h3>Gambar Referensi:</h3>
          
          {/* Render loaded images terlebih dahulu */}
          {hasLoadedImages && Object.values(currentStepImages)
            .filter(imageInfo => imageInfo && imageInfo.loaded)
            .map((imageInfo, index) => (
              <div key={`loaded-${index}`} className="image-container">
                <img 
                  src={imageInfo.url} 
                  alt={`Ilustrasi ${activeStep.title} - ${index + 1}`}
                  className="step-image loaded"
                  onError={(e) => {
                    console.warn(`Error displaying loaded image: ${imageInfo.url}`);
                    e.target.style.display = 'none';
                  }}
                />
                <div className="image-caption">
                  Gambar {index + 1}
                </div>
              </div>
            ))
          }
          
          {/* Fallback untuk gambar yang belum loaded */}
          {!hasLoadedImages && fallbackImages.length > 0 && 
            fallbackImages.map((imageUrl, index) => {
              if (imageUrl && imageUrl.trim() !== '') {
                return (
                  <div key={`fallback-${index}`} className="image-container">
                    <img 
                      src={imageUrl.trim()} 
                      alt={`Ilustrasi ${activeStep.title} - ${index + 1}`}
                      className="step-image"
                      onError={(e) => {
                        console.warn(`Failed to load fallback image: ${imageUrl}`);
                        e.target.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log(`✅ Fallback image loaded: ${imageUrl}`);
                      }}
                    />
                    <div className="image-caption">
                      Gambar {index + 1}
                    </div>
                  </div>
                );
              }
              return null;
            })
          }
        </div>
      )}
    </div>
  );
};

// Control Buttons Component
export const ControlButtons = ({
  isRunning,
  showStopNotification,
  stepStatus,
  isLastStep,
  onStartStep,
  onStopStep,
  onCompleteStep,
  onShowSkipModal,
  onReset,
  hasSelectedInstruction,
  onShowTroubleshoot,
  autoStopEnabled,  
  onToggleAutoStop
}) => {
  if (!hasSelectedInstruction) return null;

  return (
    <div className="task-controls">
      <button 
        onClick={onStartStep} 
        disabled={isRunning || showStopNotification || stepStatus === STEP_STATUS.COMPLETED} 
        className="task-btn task-btn-primary"
      >
        {stepStatus === STEP_STATUS.COMPLETED 
          ? 'Sudah Selesai' 
          : isRunning 
            ? 'Sedang Berjalan' 
            : stepStatus === STEP_STATUS.SKIPPED
              ? 'Mulai Langkah (Dilewati)'
              : 'Mulai Langkah'
        }
      </button>
      
      <button 
        onClick={onStopStep} 
        disabled={!isRunning} 
        className="task-btn task-btn-warning"
      >
        Stop
      </button>
      
      <button 
        onClick={onCompleteStep} 
        disabled={!isRunning} 
        className="task-btn task-btn-success"
      >
        {isLastStep ? 'Selesaikan' : 'Selesai Langkah'}
      </button>
      
      <button 
        onClick={onShowSkipModal} 
        disabled={isRunning || stepStatus === STEP_STATUS.COMPLETED} 
        className="task-btn task-btn-secondary"
      >
        Lewati Dulu
      </button>
      
      <button 
        onClick={onReset} 
        className="task-btn task-btn-secondary"
      >
        Reset Semua
      </button>

      <button 
        onClick={onShowTroubleshoot} 
        className="task-btn task-btn-info"
        title="Troubleshooting - Lupa klik tombol?"
      >
        ⚠ Troubleshoot
      </button>

      <button 
        onClick={onToggleAutoStop}
        className={`task-btn ${autoStopEnabled ? 'task-btn-success' : 'task-btn-secondary'}`}
        title={`Auto-stop timer: ${autoStopEnabled ? 'Aktif' : 'Nonaktif'}`}
      >
        ⏰ Auto-Stop: {autoStopEnabled ? 'ON' : 'OFF'}
      </button>
    </div>
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