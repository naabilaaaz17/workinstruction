import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, LogOut, Edit } from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
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
    case STEP_STATUS.COMPLETED: return '✅ Selesai';
    case STEP_STATUS.IN_PROGRESS: return '▶ Berlangsung';
    case STEP_STATUS.SKIPPED: return '⭐ Dilewati';
    default: return '◯ Belum';
  }
};

// 🔥 FIXED: Notification function with better UI feedback
const showNotification = (message, type = 'info') => {
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Create a better notification system
  const notification = document.createElement('div');
  notification.className = `task-notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
      </span>
      <span class="notification-message">${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
};

// Enhanced TaskHeader with MO support and back to MO selection
export const TaskHeader = ({ 
  workInstructionTitle, 
  moNumber, 
  moDisplay, 
  onEditMONumber
}) => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({
    displayName: '',
    email: '',
    uid: '',
    photoURL: ''
  });
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData();
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserInfo({
            displayName: userData.displayName || 'Nama tidak tersedia',
            email: userData.email || user.email,
            uid: userData.uid || user.uid,
            photoURL: userData.photoURL || user.photoURL || ''
          });
        } else {
          setUserInfo({
            displayName: user.displayName || 'Nama tidak tersedia',
            email: user.email,
            uid: user.uid,
            photoURL: user.photoURL || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const generateUserId = (uid) => {
    if (!uid) return 'ID tidak tersedia';
    return uid.substring(0, 8).toUpperCase();
  };

  const handleBackClick = () => {
    navigate('/home');
  };

  const handleProfileClick = () => {
    navigate('/profil');
  };

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) {
      try {
        await signOut(auth);
        
        // Clear localStorage data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userToken');
        localStorage.removeItem('previousStats');
        
        alert('Logout berhasil!');
        navigate('/login');
      } catch (error) {
        console.error('Error during logout:', error);
        alert('Terjadi kesalahan saat logout: ' + error.message);
      }
    }
  };

  return (
    <div className="task-header">
      {/* Left side - Back button and Logo */}
      <div className="task-header-left">
        <button 
          className="task-back-button" 
          onClick={handleBackClick}
          title="Kembali ke Home"
        >
          <ArrowLeft size={20} color="currentColor"/>
        </button>
        <img 
          src={logoLRS} 
          alt="Logo LRS" 
          className="task-header-logo" 
          onClick={handleBackClick}
          style={{ cursor: 'pointer' }}
        />
      </div>
      
      {/* Center - Title and MO Info */}
      <div className="task-header-center">
        <h1 className="title-header">
          {workInstructionTitle || 'Pilih Manufacturing Order'}
        </h1>
        
        {/* MO Display in Header */}
        {(moNumber || moDisplay) && (
          <div className="task-header-mo-info">
            <span className="mo-info-text">
              📋 {moDisplay || moNumber}
            </span>
            {onEditMONumber && (
              <button 
                className="edit-mo-header-btn"
                onClick={onEditMONumber}
                title="Edit MO"
              >
                <Edit size={16} />
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Right side - Profile */}
      <div className="task-header-right">
        <div className="task-header-profile-container">
          <button
            className="task-header-profile-btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="task-header-profile-avatar">
              {userInfo.photoURL ? (
                <img src={userInfo.photoURL} alt="Avatar" className="task-header-avatar-image" />
              ) : (
                <span className="task-header-avatar-text">
                  {userInfo.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="task-header-profile-info">
              <div className="task-header-profile-name">{userInfo.displayName}</div>
              <div className="task-header-profile-id">ID: {generateUserId(userInfo.uid)}</div>
            </div>
          </button>

          {showDropdown && (
            <div className="task-header-dropdown-menu">
              <div className="task-header-dropdown-header">
                <div className="task-header-profile-avatar">
                  {userInfo.photoURL ? (
                    <img src={userInfo.photoURL} alt="Avatar" className="task-header-avatar-image" />
                  ) : (
                    <span className="task-header-avatar-text">
                      {userInfo.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="task-header-dropdown-info">
                  <div className="task-header-dropdown-name">{userInfo.displayName}</div>
                  <div className="task-header-dropdown-email">{userInfo.email}</div>
                  <div className="task-header-dropdown-id">ID: {generateUserId(userInfo.uid)}</div>
                </div>
              </div>
              <button className="task-header-dropdown-item" onClick={handleProfileClick}>
                <User className="task-header-dropdown-icon" />
                <span>Profile</span>
              </button>
              <hr className="task-header-dropdown-divider" />
              <button className="task-header-dropdown-item logout" onClick={handleLogout}>
                <LogOut className="task-header-dropdown-icon" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
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
        Progress: {completedSteps} dari {totalSteps} langkah selesai ({Math.round(progressPercentage)}%)
      </div>
    </div>
  );
};

// 🔥 UPDATED: Step Navigator Component with concurrent multi-user support
export const StepNavigator = ({ 
  stepStatuses, 
  currentStep, 
  steps, 
  onGoToStep, 
  stepOperators = {}, 
  sessionParticipants = [],
  isTeamMode = false  // 🔥 NEW: Add explicit team mode flag
}) => {
  const getSkippedSteps = () => {
    return stepStatuses
      .map((status, index) => ({ status, index }))
      .filter(item => item.status === STEP_STATUS.SKIPPED);
  };

  // 🔥 FIXED: Safe operator handling
  const getStepOperators = (stepIndex) => {
    const operatorIds = stepOperators[stepIndex] || [];
    return Array.isArray(operatorIds) ? operatorIds : [operatorIds].filter(Boolean);
  };

  // 🔥 FIXED: Get operator names for a step
  const getOperatorNames = (stepIndex) => {
    const operatorIds = getStepOperators(stepIndex);
    return operatorIds.map(userId => {
      const participant = sessionParticipants.find(p => p.userId === userId);
      return participant ? participant.userName : `User-${userId?.substring(0, 6) || 'Unknown'}`;
    });
  };

  // 🔥 FIXED: Get current user ID safely
  const getCurrentUserId = () => {
    return auth.currentUser?.uid || null;
  };

  const skippedSteps = getSkippedSteps();
  const currentUserId = getCurrentUserId();

  return (
    <div className="step-navigator">
      <div className="step-navigator-header">
        <h3>Navigasi Langkah:</h3>
        {isTeamMode && (
          <div className="multi-user-indicator">
            <span className="team-mode-badge">Mode Tim (Concurrent)</span>
            <div className="concurrent-help">
            <small>
              💡 <strong>Mode Concurrent:</strong> Multiple operator dapat mengerjakan step yang sama secara bersamaan. 
              Klik "Mulai Langkah" untuk bergabung dengan step yang sedang dikerjakan atau pilih step baru!
            </small>
          </div>
          </div>
        )}
      </div>
      
      <div className="step-buttons">
        {stepStatuses.map((status, index) => {
          const stepOperatorIds = getStepOperators(index);
          const operatorNames = getOperatorNames(index);
          const isCurrentUserWorking = currentUserId ? stepOperatorIds.includes(currentUserId) : false;
          const hasOtherOperators = stepOperatorIds.filter(id => id !== currentUserId).length > 0;
          const totalOperators = stepOperatorIds.length;
          
          // Build tooltip text for concurrent working
          let tooltipText = `Step ${index + 1}: ${steps[index]?.title || 'Unknown Step'}`;
          if (isTeamMode && totalOperators > 0) {
            if (isCurrentUserWorking && hasOtherOperators) {
              tooltipText += `\n🎯 Anda dan ${totalOperators - 1} operator lain sedang mengerjakan step ini`;
              tooltipText += `\n👥 Operator: ${operatorNames.join(', ')}`;
            } else if (isCurrentUserWorking && !hasOtherOperators) {
              tooltipText += `\n🎯 Anda sedang mengerjakan step ini`;
            } else if (!isCurrentUserWorking && hasOtherOperators) {
              tooltipText += `\n👥 ${totalOperators} operator sedang mengerjakan step ini`;
              tooltipText += `\n🔍 Operator: ${operatorNames.join(', ')}`;
              tooltipText += `\n✅ Anda juga bisa bergabung mengerjakan step ini`;
            }
          } else if (isTeamMode) {
            tooltipText += `\n🟢 Step tersedia untuk dikerjakan`;
          }
          
          return (
            <button
              key={index}
              onClick={() => onGoToStep(index)}
              className={`step-button ${currentStep === index ? 'active' : ''} ${
                isCurrentUserWorking ? 'occupied-self' : hasOtherOperators ? 'occupied-shared' : ''
              }`}
              style={{ 
                color: getStepStatusColor(status),
                borderColor: isCurrentUserWorking ? '#3b82f6' : hasOtherOperators ? '#22c55e' : getStepStatusColor(status)
              }}
              title={tooltipText}
              disabled={false} // Always allow navigation
            >
              <div className="step-button-content">
                <span className="step-number">{index + 1}</span>
                <span className="step-status">{getStepStatusText(status)}</span>
                
                {/* 🔥 ENHANCED: Multi-user concurrent indicators */}
                {isTeamMode && totalOperators > 0 && (
                  <div className="step-operator-info">
                    {isCurrentUserWorking && hasOtherOperators ? (
                      <span className="operator-indicator shared" title={`Anda + ${totalOperators - 1} operator lain`}>
                        🎯👥{totalOperators > 2 ? `+${totalOperators - 2}` : ''}
                      </span>
                    ) : isCurrentUserWorking ? (
                      <span className="operator-indicator self" title="Anda mengerjakan">🎯</span>
                    ) : (
                      <span className="operator-indicator others" title={`${totalOperators} operator sedang mengerjakan`}>
                        👥{totalOperators > 1 ? totalOperators : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Enhanced skipped steps display */}
      {skippedSteps.length > 0 && (
        <div className="skipped-steps-warning">
          <div className="skipped-header">
            <strong>⚠️ Langkah yang dilewati ({skippedSteps.length}):</strong>
          </div>
          <div className="skipped-list">
            {skippedSteps.map(({ index }) => (
              <button
                key={index}
                onClick={() => onGoToStep(index)}
                className="skipped-step-link"
                title={`Klik untuk kembali ke step ${index + 1}`}
              >
                Step {index + 1}: {steps[index]?.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 🔥 ENHANCED: Active operators summary with concurrent support */}
      {isTeamMode && Object.keys(stepOperators).length > 0 && (
        <div className="active-operators-summary">
          <h4>👥 Aktivitas Tim (Concurrent):</h4>
          <div className="operators-list">
            {Object.entries(stepOperators).map(([stepIndex, operatorIds]) => {
              const operators = Array.isArray(operatorIds) ? operatorIds : [operatorIds].filter(Boolean);
              const stepNum = parseInt(stepIndex) + 1;
              const hasCurrentUser = currentUserId ? operators.includes(currentUserId) : false;
              
              if (operators.length > 0) {
                const operatorNames = operators.map(id => {
                  const participant = sessionParticipants.find(p => p.userId === id);
                  return participant ? participant.userName : `User-${id?.substring(0, 6) || 'Unknown'}`;
                });

                return (
                  <div key={stepIndex} className={`operator-activity ${hasCurrentUser ? 'includes-self' : 'others-only'}`}>
                    <span className="operator-names">
                      {hasCurrentUser && operators.length === 1 ? (
                        '🎯 Anda'
                      ) : hasCurrentUser && operators.length > 1 ? (
                        `🎯 Anda + ${operators.length - 1} operator lain`
                      ) : (
                        `👥 ${operatorNames.join(', ')}`
                      )}
                    </span>
                    <span className="operator-step">Step {stepNum}</span>
                    <button 
                      onClick={() => onGoToStep(parseInt(stepIndex))}
                      className="goto-step-btn"
                      title={`Lihat step ${stepNum} - ${hasCurrentUser ? 'Bergabung' : 'Join kolaborasi'}`}
                    >
                      {hasCurrentUser ? '🎯' : '👁️'}
                    </button>
                  </div>
                );
              }
              return null;
            })}
          </div>
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
    {targetTime > 0 && (
      <div className="task-target-time">
        Target: <span>{formatStepTime(targetTime)}</span>
        <div className="time-progress-bar">
          <div 
            className="time-progress-fill" 
            style={{ 
              width: `${Math.min((stepTime / targetTime) * 100, 100)}%`,
              backgroundColor: isOverTarget ? '#ef4444' : stepTime / targetTime > 0.8 ? '#f59e0b' : '#22c55e'
            }}
          />
        </div>
      </div>
    )}
  </div>
);

// Enhanced Image Preloader Component
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
          <span>Memuat gambar langkah kerja... {Math.round(loadingProgress)}%</span>
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

// Enhanced Step Content Component
export const StepContent = ({ activeStep, stepStatus, stepImages, currentStep }) => {
  console.log('📝 StepContent render:', {
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
          <div className="loading-step-content">
            <div className="loading-spinner"></div>
            <h2>Memuat langkah kerja...</h2>
          </div>
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
        <div className="step-header">
          <h2 className="task-step-title">
            {activeStep.title}
            <span 
              className="step-status-badge"
              style={{ 
                color: getStepStatusColor(stepStatus),
                backgroundColor: getStepStatusColor(stepStatus) + '20'
              }}
            >
              {getStepStatusText(stepStatus)}
            </span>
          </h2>
        </div>
        
        {maxTimeValue > 0 && (
          <div className="task-max-time">
            <h3>⏱️ WAKTU TARGET:</h3>
            <div className="target-time-info">
              <span className="target-time-value">{formatStepTime(maxTimeValue)}</span>
              <span className="target-time-label">(Target waktu penyelesaian)</span>
            </div>
          </div>
        )}
        
        {activeStep.description && (
          <div className="task-step-description">
            <h3>📋 LANGKAH KERJA:</h3>
            <div className="description-content">
              <p>{activeStep.description}</p>
            </div>
          </div>
        )}

        {activeStep.keyPoints && Array.isArray(activeStep.keyPoints) && activeStep.keyPoints.length > 0 && (
          <div className="task-key-points">
            <h3>🎯 TITIK KUNCI KERJA:</h3>
            <ul className="key-points-list">
              {activeStep.keyPoints.map((point, index) => (
                <li key={index} className="key-point-item">
                  <span className="key-point-bullet">•</span>
                  <span className="key-point-text">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeStep.safetyPoints && Array.isArray(activeStep.safetyPoints) && activeStep.safetyPoints.length > 0 && (
          <div className="task-safety-points">
            <h3>⚠️ TITIK KUNCI KESELAMATAN KERJA:</h3>
            <ul className="safety-points-list">
              {activeStep.safetyPoints.map((point, index) => (
                <li key={index} className="safety-point-item">
                  <span className="safety-point-bullet">⚠️</span>
                  <span className="safety-point-text">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="task-safety-reminder">
          <h3>🦺 KESELAMATAN KERJA UMUM</h3>
          <ul className="safety-reminder-list">
            <li>Selalu gunakan APD & Alat Pendukung yang sesuai.</li>
            <li>Jaga selalu kebersihan tempat kerja.</li>
          </ul>
        </div>
      </div>

      {/* Enhanced Image section untuk multiple images */}
      {hasImages && (
        <div className="task-step-images">
          <h3>🖼️ Gambar Referensi:</h3>
          
          <div className="images-gallery">
            {/* Render loaded images terlebih dahulu */}
            {hasLoadedImages && Object.values(currentStepImages)
              .filter(imageInfo => imageInfo && imageInfo.loaded)
              .map((imageInfo, index) => (
                <div key={`loaded-${index}`} className="image-container loaded">
                  <img 
                    src={imageInfo.url} 
                    alt={`Ilustrasi ${activeStep.title} - ${index + 1}`}
                    className="step-image"
                    onError={(e) => {
                      console.warn(`Error displaying loaded image: ${imageInfo.url}`);
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="image-caption">
                    <span className="image-number">Gambar {index + 1}</span>
                    <span className="image-status loaded">✅ Loaded</span>
                  </div>
                </div>
              ))
            }
            
            {/* Fallback untuk gambar yang belum loaded */}
            {!hasLoadedImages && fallbackImages.length > 0 && 
              fallbackImages.map((imageUrl, index) => {
                if (imageUrl && imageUrl.trim() !== '') {
                  return (
                    <div key={`fallback-${index}`} className="image-container fallback">
                      <img 
                        src={imageUrl.trim()} 
                        alt={`Ilustrasi ${activeStep.title} - ${index + 1}`}
                        className="step-image"
                        onError={(e) => {
                          console.warn(`Failed to load fallback image: ${imageUrl}`);
                          e.target.style.display = 'none';
                          e.target.parentElement.classList.add('error');
                        }}
                        onLoad={(e) => {
                          console.log(`✅ Fallback image loaded: ${imageUrl}`);
                          e.target.parentElement.classList.add('loaded');
                        }}
                      />
                      <div className="image-caption">
                        <span className="image-number">Gambar {index + 1}</span>
                        <span className="image-status loading">🔄 Loading...</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })
            }
          </div>

          {/* Show image loading status */}
          {!hasLoadedImages && fallbackImages.length > 0 && (
            <div className="images-loading-status">
              <span className="loading-text">Sedang memuat {fallbackImages.length} gambar referensi...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 🔥 ENHANCED: Control Buttons Component with concurrent multi-user support - FIXED TIMER INTEGRATION
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
  onToggleAutoStop,
  canControlStep = true, // 🔥 FIXED: Always true for concurrent mode
  stepOperators = {},
  sessionParticipants = [],
  currentStep = 0,
  isTeamMode = false, // 🔥 NEW: Add explicit team mode flag
  // 🔥 CRITICAL: Add timer state management props
  onSetStepStatus,
  onSetIsStepActive,
  onStartTimer,
  onStopTimer
}) => {
  if (!hasSelectedInstruction) return null;

  // 🔥 FIXED: Get current step operators safely
  const currentStepOperators = stepOperators[currentStep] || [];
  const operatorIds = Array.isArray(currentStepOperators) ? currentStepOperators : [currentStepOperators].filter(Boolean);
  const operatorInfos = operatorIds.map(id => sessionParticipants.find(p => p.userId === id)).filter(Boolean);
  const currentUserId = auth.currentUser?.uid;

  // 🔥 FIXED: Safe operator checks
  const isCurrentUserWorking = currentUserId ? operatorIds.includes(currentUserId) : false;
  const hasOtherOperators = operatorIds.filter(id => id !== currentUserId).length > 0;
  const totalOperators = operatorIds.length;

  // 🔥 FIXED: Button permissions - always allow actions in concurrent mode
  const canStartStep = true; // Always allow starting
  const canStopStep = true;  // Always allow stopping
  const canCompleteStep = true; // Always allow completing
  const canSkipStep = !isRunning; // Only restriction is if user's own timer is running

  // 🔥 CRITICAL: Enhanced onStartStep with proper timer integration
  const handleStartStep = async () => {
    console.log('🔥 handleStartStep called:', {
      isRunning,
      stepStatus,
      currentStep,
      isTeamMode,
      isCurrentUserWorking
    });

    try {
      // 1. Join the step first (for concurrent mode)
      if (isTeamMode) {
        const joinResult = joinStep(currentStep);
        console.log('🔥 Join step result:', joinResult);
      }

      // 2. Set step status to IN_PROGRESS
      if (onSetStepStatus) {
        onSetStepStatus(currentStep, STEP_STATUS.IN_PROGRESS);
        console.log('🔥 Step status set to IN_PROGRESS');
      }

      // 3. Mark step as active
      if (onSetIsStepActive) {
        onSetIsStepActive(true);
        console.log('🔥 Step marked as active');
      }

      // 4. Start the timer
      if (onStartTimer) {
        onStartTimer();
        console.log('🔥 Timer started');
      }

      // 5. Call the original onStartStep
      if (onStartStep && typeof onStartStep === 'function') {
        await onStartStep();
        console.log('🔥 Original onStartStep called');
      }

      // 6. Show notification
      showNotification(
        isTeamMode && hasOtherOperators 
          ? `Bergabung mengerjakan step ${currentStep + 1} dengan ${totalOperators - 1} operator lain`
          : `Memulai step ${currentStep + 1}`,
        'success'
      );

    } catch (error) {
      console.error('🔥 Error in handleStartStep:', error);
      showNotification('Gagal memulai step: ' + error.message, 'error');
    }
  };

  // 🔥 CRITICAL: Enhanced onStopStep with proper timer integration
  const handleStopStep = async () => {
    console.log('🔥 handleStopStep called:', {
      isRunning,
      currentStep,
      isTeamMode
    });

    try {
      // 1. Stop the timer first
      if (onStopTimer) {
        onStopTimer();
        console.log('🔥 Timer stopped');
      }

      // 2. Mark step as inactive
      if (onSetIsStepActive) {
        onSetIsStepActive(false);
        console.log('🔥 Step marked as inactive');
      }

      // 3. Call the original onStopStep
      if (onStopStep && typeof onStopStep === 'function') {
        await onStopStep();
        console.log('🔥 Original onStopStep called');
      }

      // 4. Show notification
      showNotification(
        isTeamMode 
          ? `Timer Anda untuk step ${currentStep + 1} dihentikan`
          : `Timer step ${currentStep + 1} dihentikan`,
        'info'
      );

    } catch (error) {
      console.error('🔥 Error in handleStopStep:', error);
      showNotification('Gagal menghentikan timer: ' + error.message, 'error');
    }
  };

  // 🔥 CRITICAL: Enhanced onCompleteStep with proper timer integration
  const handleCompleteStep = async () => {
    console.log('🔥 handleCompleteStep called:', {
      isRunning,
      currentStep,
      isLastStep,
      isTeamMode
    });

    try {
      // 1. Stop the timer
      if (onStopTimer) {
        onStopTimer();
        console.log('🔥 Timer stopped for completion');
      }

      // 2. Set step status to COMPLETED
      if (onSetStepStatus) {
        onSetStepStatus(currentStep, STEP_STATUS.COMPLETED);
        console.log('🔥 Step status set to COMPLETED');
      }

      // 3. Mark step as inactive
      if (onSetIsStepActive) {
        onSetIsStepActive(false);
        console.log('🔥 Step marked as inactive');
      }

      // 4. Leave the step (for concurrent mode)
      if (isTeamMode) {
        const leaveResult = leaveStep(currentStep);
        console.log('🔥 Leave step result:', leaveResult);
      }

      // 5. Call the original onCompleteStep
      if (onCompleteStep && typeof onCompleteStep === 'function') {
        await onCompleteStep();
        console.log('🔥 Original onCompleteStep called');
      }

      // 6. Show completion notification
      showNotification(
        isLastStep 
          ? isTeamMode 
            ? 'Anda telah menyelesaikan semua langkah! 🎉'
            : 'Tugas selesai! 🎉'
          : isTeamMode
            ? `Step ${currentStep + 1} Anda selesai, lanjut ke step berikutnya`
            : `Step ${currentStep + 1} selesai, lanjut ke step berikutnya`,
        'success'
      );

    } catch (error) {
      console.error('🔥 Error in handleCompleteStep:', error);
      showNotification('Gagal menyelesaikan step: ' + error.message, 'error');
    }
  };

  // 🔥 FIXED: Get button states and labels for concurrent mode
  const getButtonState = () => {
    if (stepStatus === STEP_STATUS.COMPLETED) {
      return {
        startDisabled: true,
        startLabel: '✅ Sudah Selesai',
        startClass: 'completed'
      };
    }
    
    if (isRunning && isCurrentUserWorking) {
      return {
        startDisabled: true,
        startLabel: '▶️ Anda Sedang Mengerjakan',
        startClass: 'running-self'
      };
    }
    
    if (showStopNotification) {
      return {
        startDisabled: false, // 🔥 FIXED: Allow restart after stop
        startLabel: '🔄 Mulai Lagi',
        startClass: 'restart'
      };
    }
    
    if (stepStatus === STEP_STATUS.SKIPPED) {
      return {
        startDisabled: false,
        startLabel: hasOtherOperators 
          ? `🔄 Mulai Langkah (${totalOperators} operator aktif)` 
          : '🔄 Mulai Langkah (Dilewati)',
        startClass: 'skipped'
      };
    }
    
    // 🔥 FIXED: Show concurrent work status
    if (isTeamMode && hasOtherOperators && !isCurrentUserWorking) {
      return {
        startDisabled: false,
        startLabel: `👥 Bergabung (${totalOperators} operator aktif)`,
        startClass: 'join-concurrent'
      };
    }
    
    return {
      startDisabled: false,
      startLabel: '▶️ Mulai Langkah',
      startClass: 'ready'
    };
  };

  const buttonState = getButtonState();

  return (
    <div className="task-controls">
      {/* 🔥 ENHANCED: Team mode indicator with concurrent status */}
      {isTeamMode && (
        <div className="team-mode-indicator">
          <div className="team-status">
           
            
            {totalOperators > 0 && (
              <div className="step-concurrent-info">
                {isCurrentUserWorking && hasOtherOperators ? (
                  <span className="concurrent-status working-with-others">
                    🎯 Anda + {totalOperators - 1} operator lain mengerjakan step ini
                  </span>
                ) : isCurrentUserWorking && !hasOtherOperators ? (
                  <span className="concurrent-status working-alone">
                    🎯 Anda mengerjakan step ini
                  </span>
                ) : !isCurrentUserWorking && hasOtherOperators ? (
                  <span className="concurrent-status others-working">
                  </span>
                ) : null}
              </div>
            )}
            
            {totalOperators === 0 && (
              <span className="step-available">
              </span>
            )}
          </div>
        </div>
      )}

      <div className="control-buttons-row">
        {/* 🔥 FIXED: Start/Join Button for concurrent mode with proper timer integration */}
        <button 
          onClick={handleStartStep}
          disabled={buttonState.startDisabled && stepStatus === STEP_STATUS.COMPLETED} // 🔥 FIXED: Only disable if truly completed
          className={`task-btn mulai-lagi ${buttonState.startClass}`}
          title={hasOtherOperators && !isCurrentUserWorking && isTeamMode
            ? `Bergabung dengan ${totalOperators} operator yang sedang mengerjakan step ini dan mulai timer Anda` 
            : buttonState.startLabel + ' - Timer akan dimulai otomatis'}
        >
          {buttonState.startLabel}
        </button>
        
        {/* 🔥 FIXED: Stop Button - only affects current user with proper timer integration */}
        <button 
          onClick={handleStopStep} 
          disabled={!canStopStep || !isRunning} 
          className={`task-btn task-btn-warning`}
          title={isRunning 
            ? isTeamMode 
              ? 'Hentikan timer Anda (tidak mempengaruhi operator lain)' 
              : 'Hentikan timer'
            : 'Timer Anda tidak sedang berjalan'}
        >
          ⏸️ {isTeamMode ? 'Stop Timer Saya' : 'Stop Timer'}
        </button>
        
        {/* 🔥 FIXED: Complete Button - individual completion with proper timer integration */}
        <button 
          onClick={handleCompleteStep} 
          disabled={!canCompleteStep || !isRunning} 
          className={`task-btn task-btn-success`}
          title={!isRunning 
            ? 'Mulai timer terlebih dahulu untuk menyelesaikan step' 
            : isLastStep 
              ? isTeamMode 
                ? 'Selesaikan step terakhir Anda dan hentikan timer' 
                : 'Selesaikan tugas dan hentikan timer'
              : isTeamMode
                ? 'Selesaikan step ini, hentikan timer, dan lanjut ke berikutnya'
                : 'Selesai, hentikan timer, dan lanjut'}
        >
          {isLastStep ? '🎉 Selesaikan Tugas' + (isTeamMode ? ' Saya' : '') : '✅ Selesai Langkah' + (isTeamMode ? ' Saya' : '')}
        </button>
        
        {/* 🔥 FIXED: Skip Button - individual skip */}
        <button 
          onClick={onShowSkipModal} 
          disabled={!canSkipStep || stepStatus === STEP_STATUS.COMPLETED} 
          className={`task-btn lewati-dulu`}
          title={!canSkipStep 
            ? 'Tidak dapat melewati step saat timer Anda sedang berjalan'
            : isTeamMode
              ? 'Lewati langkah ini dengan alasan (hanya untuk Anda)'
              : 'Lewati langkah ini dengan alasan'}
        >
          ⭐️ Lewati Dulu
        </button>
      </div>

      <div className="control-buttons-row secondary">
        {/* 🔥 ENHANCED: Reset Button - individual reset in team mode */}
        <button 
          onClick={() => {
            if (isTeamMode) {
              const confirmReset = window.confirm(
                `🔄 Reset Progress Individu\n\n` +
                `Hanya progress Anda yang akan di-reset.\n` +
                `Operator lain akan tetap melanjutkan pekerjaan mereka.\n\n` +
                `Apakah Anda yakin ingin melanjutkan?`
              );
              if (confirmReset) {
                onReset();
              }
            } else {
              if (window.confirm('Apakah Anda yakin ingin reset semua progress?')) {
                onReset();
              }
            }
          }}
          className="task-btn reset-semua"
          title={isTeamMode 
            ? "Reset progress Anda (tidak mempengaruhi operator lain)" 
            : "Reset seluruh progres tugas"}
        >
          🔄 {isTeamMode ? 'Reset Progress Saya' : 'Reset Semua'}
        </button>

        {/* Troubleshoot Button */}
        <button 
          onClick={onShowTroubleshoot} 
          className="task-btn task-btn-info"
          title="Troubleshooting - Lupa klik tombol? Ada masalah dengan step?"
        >
          🔧 Troubleshoot
        </button>

        {/* Auto-Stop Toggle */}
        <button 
          onClick={onToggleAutoStop}
          className={`task-btn ${autoStopEnabled ? 'task-btn-success' : 'task-btn-secondary'}`}
          title={`Auto-stop timer: ${autoStopEnabled ? 'Aktif - Timer akan berhenti otomatis saat melebihi target' : 'Nonaktif - Timer akan terus berjalan'}`}
        >
          ⏰ Auto-Stop: {autoStopEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
};

// Enhanced Loading Overlay Component
export const LoadingOverlay = ({ message = "Memuat data...", progress = null }) => (
  <div className="loading-overlay">
    <div className="loading-content">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>
      {progress !== null && (
        <div className="loading-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  </div>
);

// 🔥 SIMPLIFIED: Collaborative functions without Socket.IO dependency
// These functions now work with local state management and can be extended later

// 🔥 NEW: Simple collaborative state management
let globalStepOperators = {};
let globalSessionParticipants = [];
let globalCollaborativeCallbacks = {
  setStepOperators: null,
  setCollaborativeMode: null,
  setIsStepActive: null
};

export const initializeCollaborativeFeatures = (taskId, token, callbacks = {}) => {
  console.log('🔥 Initializing collaborative features:', { taskId, token });
  
  // Store callbacks for state updates
  globalCollaborativeCallbacks = {
    setStepOperators: callbacks.setStepOperators || (() => {}),
    setCollaborativeMode: callbacks.setCollaborativeMode || (() => {}),
    setIsStepActive: callbacks.setIsStepActive || (() => {}),
    ...callbacks
  };
  
  // Initialize with mock data for testing
  globalSessionParticipants = [
    {
      userId: auth.currentUser?.uid || 'current-user',
      userName: auth.currentUser?.displayName || 'Current User',
      isActive: true
    },
    // Add mock participants for testing
    ...(callbacks.mockParticipants || [])
  ];
  
  showNotification('Sistem kolaborasi diinisialisasi', 'success');
  return true;
};

// 🔥 CRITICAL: Enhanced joinStep with timer integration callback
export const joinStep = (stepIndex, callbacks = {}) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) {
    showNotification('Tidak dapat mengidentifikasi user', 'error');
    return false;
  }
  
  console.log('🔥 Joining step:', stepIndex, 'by user:', currentUserId);
  
  // Update global step operators
  const currentOperators = globalStepOperators[stepIndex] || [];
  const operatorIds = Array.isArray(currentOperators) ? currentOperators : [currentOperators].filter(Boolean);
  
  if (!operatorIds.includes(currentUserId)) {
    globalStepOperators[stepIndex] = [...operatorIds, currentUserId];
    
    // Notify callback
    if (globalCollaborativeCallbacks.setStepOperators) {
      globalCollaborativeCallbacks.setStepOperators({ ...globalStepOperators });
    }
    
    // 🔥 NEW: Execute additional callbacks
    if (callbacks.onJoin) {
      callbacks.onJoin(stepIndex, currentUserId);
    }
    
    const operatorCount = globalStepOperators[stepIndex].length;
    console.log(`🔥 Successfully joined step ${stepIndex + 1}, total operators: ${operatorCount}`);
    
    return true;
  }
  
  console.log(`🔥 User already in step ${stepIndex + 1}`);
  return false;
};

// 🔥 CRITICAL: Enhanced leaveStep with timer integration callback
export const leaveStep = (stepIndex, callbacks = {}) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) return false;
  
  console.log('🔥 Leaving step:', stepIndex, 'by user:', currentUserId);
  
  // Update global step operators
  const currentOperators = globalStepOperators[stepIndex] || [];
  const operatorIds = Array.isArray(currentOperators) ? currentOperators : [currentOperators].filter(Boolean);
  const updatedOperators = operatorIds.filter(id => id !== currentUserId);
  
  if (updatedOperators.length > 0) {
    globalStepOperators[stepIndex] = updatedOperators;
  } else {
    delete globalStepOperators[stepIndex];
  }
  
  // Notify callback
  if (globalCollaborativeCallbacks.setStepOperators) {
    globalCollaborativeCallbacks.setStepOperators({ ...globalStepOperators });
  }
  
  // 🔥 NEW: Execute additional callbacks
  if (callbacks.onLeave) {
    callbacks.onLeave(stepIndex, currentUserId);
  }
  
  const remainingOperators = globalStepOperators[stepIndex] || [];
  console.log(`🔥 Successfully left step ${stepIndex + 1}, remaining operators: ${remainingOperators.length}`);
  
  return true;
};

// 🔥 FIXED: Compatibility aliases
export const lockStep = joinStep;   // Backward compatibility
export const unlockStep = leaveStep; // Backward compatibility

// Cleanup function
export const cleanupCollaborativeFeatures = () => {
  showNotification('Menutup sesi kolaborasi', 'info');
  globalStepOperators = {};
  globalSessionParticipants = [];
  globalCollaborativeCallbacks = {
    setStepOperators: null,
    setCollaborativeMode: null,
    setIsStepActive: null
  };
};

// 🔥 NEW: Helper function to get current collaborative state
export const getCollaborativeState = () => ({
  stepOperators: globalStepOperators,
  sessionParticipants: globalSessionParticipants
});

// Export all components for TaskPage compatibility
export default {
  STEP_STATUS,
  formatTime,
  formatStepTime,
  getStepStatusColor,
  getStepStatusText,
  TaskHeader,
  TaskProgressBar,
  StepNavigator,
  TimerDisplay,
  ImagePreloader,
  StepContent,
  ControlButtons,
  LoadingOverlay,
  initializeCollaborativeFeatures,
  joinStep,
  leaveStep,
  lockStep,    // Backward compatibility
  unlockStep,  // Backward compatibility
  getCollaborativeState,
  cleanupCollaborativeFeatures
};