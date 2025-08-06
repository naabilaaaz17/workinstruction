// ImageUtils.js - Utility functions for handling step images

/**
 * Extract all image URLs from steps array with comprehensive validation
 * @param {Array} stepsArray - Array of steps containing image data
 * @returns {Array} Array of arrays, each containing image URLs for a step
 */
export const extractImageUrls = (stepsArray) => {
  console.log('🔍 Extracting image URLs from steps:', stepsArray);
  
  return stepsArray.map((step, stepIndex) => {
    let imageUrls = [];
    
    // Priority 1: imageUrls array
    if (step.imageUrls && Array.isArray(step.imageUrls)) {
      imageUrls = step.imageUrls.filter(url => url && typeof url === 'string' && url.trim() !== '');
    }
    // Priority 2: imageUrls string (comma-separated)
    else if (step.imageUrls && typeof step.imageUrls === 'string') {
      const trimmed = step.imageUrls.trim();
      if (trimmed.includes(',')) {
        imageUrls = trimmed.split(',').map(url => url.trim()).filter(url => url !== '');
      } else if (trimmed !== '') {
        imageUrls = [trimmed];
      }
    }
    // Priority 3: image_urls array
    else if (step.image_urls && Array.isArray(step.image_urls)) {
      imageUrls = step.image_urls.filter(url => url && typeof url === 'string' && url.trim() !== '');
    }
    // Priority 4: images array
    else if (step.images && Array.isArray(step.images)) {
      imageUrls = step.images.filter(url => url && typeof url === 'string' && url.trim() !== '');
    }
    // Priority 5: imageUrl string (legacy)
    else if (step.imageUrl && typeof step.imageUrl === 'string') {
      const trimmed = step.imageUrl.trim();
      if (trimmed !== '') {
        imageUrls = [trimmed];
      }
    }
    // Priority 6: image string
    else if (step.image && typeof step.image === 'string') {
      const trimmed = step.image.trim();
      if (trimmed !== '') {
        imageUrls = [trimmed];
      }
    }
    // Priority 7: img string
    else if (step.img && typeof step.img === 'string') {
      const trimmed = step.img.trim();
      if (trimmed !== '') {
        imageUrls = [trimmed];
      }
    }
    
    console.log(`🖼️ Step ${stepIndex} (${step.title}): Found ${imageUrls.length} images`, imageUrls);
    return imageUrls;
  });
};

/**
 * Normalize step data with proper image URL extraction
 * @param {Object} step - Raw step data from Firestore
 * @param {number} index - Step index for fallback naming
 * @returns {Object} Normalized step object
 */
export const normalizeStepWithImages = (step, index) => {
  if (typeof step === 'string') {
    return {
      title: step,
      description: '',
      keyPoints: [],
      safetyPoints: [],
      maxTime: 0,
      imageUrls: []
    };
  }
  
  if (typeof step === 'object' && step !== null) {
    const stepTitle = step.title || step.name || step.stepName || `Langkah ${index + 1}`;
    const stepDescription = step.description || step.desc || step.detail || '';
    const keyPoints = Array.isArray(step.keyPoints) 
      ? step.keyPoints 
      : Array.isArray(step.key_points) 
        ? step.key_points
        : Array.isArray(step.points)
          ? step.points
          : [];
    const safetyPoints = Array.isArray(step.safetyPoints) 
      ? step.safetyPoints 
      : Array.isArray(step.safety_points)
        ? step.safety_points
        : Array.isArray(step.safety)
          ? step.safety
          : [];
    
    let maxTime = 0;
    if (step.maxTime !== undefined) {
      maxTime = typeof step.maxTime === 'string' 
        ? parseInt(step.maxTime, 10) || 0
        : (typeof step.maxTime === 'number' ? step.maxTime : 0);
    } else if (step.max_time !== undefined) {
      maxTime = typeof step.max_time === 'string' 
        ? parseInt(step.max_time, 10) || 0
        : (typeof step.max_time === 'number' ? step.max_time : 0);
    } else if (step.duration !== undefined) {
      maxTime = typeof step.duration === 'string' 
        ? parseInt(step.duration, 10) || 0
        : (typeof step.duration === 'number' ? step.duration : 0);
    }

    // FIXED: Improved image URL extraction
    let imageUrls = [];
    
    if (step.imageUrls) {
      if (Array.isArray(step.imageUrls)) {
        imageUrls = step.imageUrls.filter(url => url && typeof url === 'string' && url.trim() !== '');
      } else if (typeof step.imageUrls === 'string') {
        const trimmed = step.imageUrls.trim();
        if (trimmed.includes(',')) {
          imageUrls = trimmed.split(',').map(url => url.trim()).filter(url => url !== '');
        } else if (trimmed !== '') {
          imageUrls = [trimmed];
        }
      }
    } else if (step.image_urls && Array.isArray(step.image_urls)) {
      imageUrls = step.image_urls.filter(url => url && typeof url === 'string' && url.trim() !== '');
    } else if (step.images && Array.isArray(step.images)) {
      imageUrls = step.images.filter(url => url && typeof url === 'string' && url.trim() !== '');
    } else if (step.imageUrl && typeof step.imageUrl === 'string') {
      const trimmed = step.imageUrl.trim();
      if (trimmed !== '') {
        imageUrls = [trimmed];
      }
    } else if (step.image && typeof step.image === 'string') {
      const trimmed = step.image.trim();
      if (trimmed !== '') {
        imageUrls = [trimmed];
      }
    } else if (step.img && typeof step.img === 'string') {
      const trimmed = step.img.trim();
      if (trimmed !== '') {
        imageUrls = [trimmed];
      }
    }
    
    console.log(`🖼️ Step "${stepTitle}" images:`, imageUrls);
    
    return {
      title: stepTitle,
      description: stepDescription,
      keyPoints: keyPoints,
      safetyPoints: safetyPoints,
      maxTime: maxTime,
      imageUrls: imageUrls,
      // Legacy support
      imageUrl: imageUrls.length > 0 ? imageUrls[0] : ''
    };
  }
  
  return {
    title: `Langkah ${index + 1}`,
    description: '',
    keyPoints: [],
    safetyPoints: [],
    maxTime: 0,
    imageUrls: []
  };
};

/**
 * Process raw steps array and normalize each step with image handling
 * @param {Array} rawSteps - Raw steps data from Firestore
 * @returns {Array} Array of normalized steps
 */
export const processStepsWithImages = (rawSteps) => {
  if (!Array.isArray(rawSteps)) {
    return [];
  }

  return rawSteps.map((step, index) => normalizeStepWithImages(step, index));
};

/**
 * Get fallback images for a step when loaded images are not available
 * @param {Object} activeStep - Current active step
 * @returns {Array} Array of fallback image URLs
 */
export const getFallbackImages = (activeStep) => {
  if (!activeStep) return [];
  
  return activeStep.imageUrls && Array.isArray(activeStep.imageUrls) 
    ? activeStep.imageUrls 
    : activeStep.imageUrl && typeof activeStep.imageUrl === 'string' 
      ? [activeStep.imageUrl] 
      : [];
};

/**
 * Check if current step has loaded images
 * @param {Object} stepImages - Object containing loaded images by step index
 * @param {number} currentStep - Current step index
 * @returns {boolean} True if step has loaded images
 */
export const hasLoadedImages = (stepImages, currentStep) => {
  const currentStepImages = stepImages && currentStep !== undefined 
    ? stepImages[currentStep] 
    : null;

  return currentStepImages && 
    Object.keys(currentStepImages).length > 0 &&
    Object.values(currentStepImages).some(img => img && img.loaded);
};

/**
 * Get current step images with validation
 * @param {Object} stepImages - Object containing loaded images by step index
 * @param {number} currentStep - Current step index
 * @returns {Object|null} Current step images object or null
 */
export const getCurrentStepImages = (stepImages, currentStep) => {
  return stepImages && currentStep !== undefined 
    ? stepImages[currentStep] 
    : null;
};

/**
 * Check if step has any images (loaded or fallback)
 * @param {Object} stepImages - Object containing loaded images by step index
 * @param {number} currentStep - Current step index
 * @param {Object} activeStep - Current active step
 * @returns {boolean} True if step has any images
 */
export const stepHasImages = (stepImages, currentStep, activeStep) => {
  const hasLoaded = hasLoadedImages(stepImages, currentStep);
  const fallbackImages = getFallbackImages(activeStep);
  return hasLoaded || fallbackImages.length > 0;
};

/**
 * Calculate total images count for an instruction
 * @param {Array} steps - Array of normalized steps
 * @returns {number} Total number of images across all steps
 */
export const calculateTotalImagesCount = (steps) => {
  return steps.reduce((acc, step) => acc + (step.imageUrls?.length || 0), 0);
};