import React, { useState, useEffect } from 'react';
import { 
  STEP_STATUS, 
  formatStepTime, 
  getStepStatusColor, 
  getStepStatusText 
} from './TaskPageComponent';
import { 
  getCurrentStepImages, 
  hasLoadedImages, 
  getFallbackImages, 
  stepHasImages 
} from './ImageUtils';

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

// Step Images Component untuk menampilkan gambar
export const StepImages = ({ activeStep, stepImages, currentStep }) => {
  console.log('🖼️ StepImages render:', {
    activeStep: activeStep?.title,
    currentStep,
    stepImages: Object.keys(stepImages || {}),
    activeStepImageUrls: activeStep?.imageUrls
  });

  // Get current step images dengan validasi yang lebih baik
  const currentStepImages = getCurrentStepImages(stepImages, currentStep);
  
  console.log('🖼️ Current step images:', currentStepImages);

  // Check if we have loaded images for current step
  const hasLoaded = hasLoadedImages(stepImages, currentStep);

  // Fallback ke activeStep.imageUrls
  const fallbackImages = getFallbackImages(activeStep);

  const hasImages = stepHasImages(stepImages, currentStep, activeStep);

  console.log('🖼️ Image status:', {
    hasLoaded,
    fallbackImagesCount: fallbackImages.length,
    hasImages
  });

  if (!hasImages) {
    return null;
  }

  return (
    <div className="task-step-images">
      <h3>Gambar Referensi:</h3>
      
      {/* Render loaded images terlebih dahulu */}
      {hasLoaded && Object.values(currentStepImages)
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
      {!hasLoaded && fallbackImages.length > 0 && 
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
  );
};

// Step Content Component untuk multiple images (Updated)
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

  const hasImages = stepHasImages(stepImages, currentStep, activeStep);

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
        <StepImages 
          activeStep={activeStep}
          stepImages={stepImages}
          currentStep={currentStep}
        />
      )}
    </div>
  );
};