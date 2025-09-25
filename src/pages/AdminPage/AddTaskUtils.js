// AddTaskUtils.js - Updated utility functions with optional MO support

// Constants
export const DEFAULT_STEP = {
  title: '',
  description: '',
  keyPoints: [''],
  safetyPoints: [''],
  maxTime: '',
  imageUrls: ['']
};

export const DEFAULT_TASK = {
  // Basic task fields (always required)
  title: '',
  description: '',
  category: 'General',
  estimatedDuration: '',
  difficulty: 'medium',
  steps: [{ ...DEFAULT_STEP }],
  
  // MO fields (optional)
  moNumber: '',
  moDisplay: ''
  // Note: Assignment fields removed - will be handled through MO Management or independently
};

// Enhanced Time Management Functions
export const convertTimeToMinutes = (seconds) => {
  return Math.round(seconds / 60);
};

export const convertMinutesToSeconds = (minutes) => {
  return minutes * 60;
};

export const calculateTotalStepTime = (steps) => {
  const totalSeconds = steps.reduce((total, step) => {
    const stepTime = parseInt(step.maxTime) || 0;
    return total + stepTime;
  }, 0);
  return convertTimeToMinutes(totalSeconds);
};

export const validateTimeConsistency = (task) => {
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

export const distributeTimeEvenly = (totalMinutes, numberOfSteps) => {
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

export const suggestStepTime = (step, averageTimePerStep) => {
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
export const validateImageUrl = (url) => {
  if (!url || url.trim() === '') return true;
  
  try {
    new URL(url.trim());
    return true;
  } catch (error) {
    return false;
  }
};

export const validateStep = (step) => {
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

// Updated validation function - MO is now optional
export const validateTask = (task) => {
  const errors = [];
  
  // Basic task validation (always required)
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
  
  // Validate each step
  task.steps.forEach((step, index) => {
    const stepErrors = validateStep(step);
    stepErrors.forEach(error => {
      errors.push(`Langkah ${index + 1}: ${error}`);
    });
  });
  
  // Add time consistency validation
  const timeErrors = validateTimeConsistency(task);
  errors.push(...timeErrors);
  
  // MO validation is no longer required - it's optional
  // If MO fields are present, we can add specific MO validations here if needed
  if (task.moNumber && !task.moNumber.trim()) {
    // If moNumber is set but empty, that might be an issue
    errors.push('Nomor MO tidak boleh kosong jika MO dipilih');
  }
  
  return errors;
};

// New helper function to check if task has MO
export const hasAssociatedMO = (task) => {
  return !!(task.moNumber && task.moNumber.trim());
};

// New helper function to get task type
export const getTaskType = (task) => {
  return hasAssociatedMO(task) ? 'mo-based' : 'independent';
};

// New helper function to format task display
export const formatTaskDisplay = (task) => {
  if (hasAssociatedMO(task)) {
    return {
      type: 'MO-Based Task',
      subtitle: `MO: ${task.moDisplay || task.moNumber}`,
      icon: '📋'
    };
  }
  
  return {
    type: 'Independent Task', 
    subtitle: task.category || 'General',
    icon: '📝'
  };
};