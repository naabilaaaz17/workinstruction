import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './TaskPage.css';
import { db } from '../../firebase';
import { collection, addDoc, doc, getDoc, setDoc, updateDoc, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Import all components from TaskPageComponent.js
import {
  STEP_STATUS,
  formatTime,
  formatStepTime,
  getStepStatusColor,
  getStepStatusText,
  WorkInstructionSelector,
  TaskHeader,
  TaskProgressBar,
  StepNavigator,
  TimerDisplay,
  StepContent,
  ControlButtons,
  LoadingOverlay
} from './TaskPageComponent';

// Import komponen gambar dari file terpisah
import { ImagePreloader } from './ImageComponents';

// Import TroubleshootModal
import { TroubleshootModal } from './TroubleshootModal';

// Main TaskPage Component
const TaskPage = () => {
  // State declarations
  const [workInstructions, setWorkInstructions] = useState([]);
  const [selectedInstruction, setSelectedInstruction] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [stepTime, setStepTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [showReminder, setShowReminder] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [stepCompletionTimes, setStepCompletionTimes] = useState([]);
  const [manualName, setManualName] = useState('');
  const [showStopNotification, setShowStopNotification] = useState(false);
  const [stepStatuses, setStepStatuses] = useState([]);
  const [workSessionId, setWorkSessionId] = useState(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [existingProgress, setExistingProgress] = useState(null);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stepImages, setStepImages] = useState({});
  const [imagesLoading, setImagesLoading] = useState(false);
  const [autoStopEnabled, setAutoStopEnabled] = useState(true);
  const [showAutoStopWarning, setShowAutoStopWarning] = useState(false);
  const [autoStopTriggered, setAutoStopTriggered] = useState(false);

  // Timer-related states
  const [showTargetTimeWarning, setShowTargetTimeWarning] = useState(false);
  const [showTroubleshootModal, setShowTroubleshootModal] = useState(false);
  const [targetTimeWarningShown, setTargetTimeWarningShown] = useState(false);
  const [pendingReminders, setPendingReminders] = useState([]);

  // Auto-troubleshoot states
  const [autoTroubleshootActive, setAutoTroubleshootActive] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  // Troubleshoot history state
  const [troubleshootHistory, setTroubleshootHistory] = useState([]);

  // Computed values
  const activeStep = steps[currentStep] || {};
  const isLastStep = currentStep === steps.length - 1;
  const completedStepsCount = stepStatuses.filter(status => status === STEP_STATUS.COMPLETED).length;
  
  // Target time for current step
  const currentStepTargetTime = typeof activeStep.maxTime === 'string' 
    ? parseInt(activeStep.maxTime, 10) 
    : activeStep.maxTime || 0;

  // Check if current step time exceeds target
  const isOverTargetTime = currentStepTargetTime > 0 && stepTime > currentStepTargetTime;

  // Utility functions
  const generateSessionId = (instructionId) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const userId = user?.uid || 'anonymous';
    return `task_session_${userId}_${instructionId}`;
  };

  const getSkippedSteps = () => {
    return stepStatuses
      .map((status, index) => ({ status, index }))
      .filter(item => item.status === STEP_STATUS.SKIPPED);
  };

  // Update activity time
  const updateActivity = useCallback(() => {
    setLastActivityTime(Date.now());
  }, []);

  // Add troubleshoot entry to history
  const addTroubleshootHistory = useCallback((entry) => {
    setTroubleshootHistory(prev => [...prev, {
      ...entry,
      id: Date.now(),
      stepIndex: currentStep,
      stepTitle: activeStep?.title
    }]);
  }, [currentStep, activeStep?.title]);

  // Extract semua URL gambar dari steps dengan validasi yang lebih baik
  const extractImageUrls = (stepsArray) => {
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

  // Handle ketika semua gambar selesai dimuat
  const handleImagesLoaded = useCallback((loadedImagesMap) => {
    console.log('✅ Images loaded callback triggered:', loadedImagesMap);
    setStepImages(loadedImagesMap);
    setImagesLoading(false);
  }, []);

  // Data fetching functions dengan perbaikan untuk multiple images
  const fetchWorkInstructions = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      setLoading(true);
      setError(null);
      console.log(`🔄 Fetching work instructions (attempt ${retryCount + 1})...`);
      
      if (!db) {
        throw new Error('Firebase database not initialized');
      }
      
      const tasksRef = collection(db, 'tasks');
      const querySnapshot = await getDocs(tasksRef);
      
      console.log(`📊 Found ${querySnapshot.size} documents`);
      
      if (querySnapshot.empty) {
        console.warn('⚠️ No documents found in tasks collection');
        setWorkInstructions([]);
        return;
      }
      
      const instructionsList = [];
      
      querySnapshot.forEach((docSnapshot) => {
        try {
          const docData = docSnapshot.data();
          console.log(`📄 Processing document: ${docSnapshot.id}`, docData);
          
          if (!docData) {
            console.warn(`⚠️ Document ${docSnapshot.id} has no data`);
            return;
          }
          
          const title = docData.title || docData.name || `Instruksi ${docSnapshot.id}`;
          const rawSteps = docData.steps || docData.workSteps || [];
          
          const normalizedSteps = Array.isArray(rawSteps) ? rawSteps.map((step, index) => {
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

              // Improved image URL extraction
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
          }) : [];
          
          const instruction = {
            id: docSnapshot.id,
            title: title,
            steps: normalizedSteps,
            originalData: docData
          };
          
          instructionsList.push(instruction);
          
          // Log total images found
          const totalImages = normalizedSteps.reduce((acc, step) => acc + (step.imageUrls?.length || 0), 0);
          console.log(`📊 Instruction "${title}": ${normalizedSteps.length} steps, ${totalImages} total images`);
          
        } catch (stepError) {
          console.error(`❌ Error processing document ${docSnapshot.id}:`, stepError);
        }
      });
      
      console.log(`✅ Successfully processed ${instructionsList.length} work instructions`);
      setWorkInstructions(instructionsList);
      
    } catch (error) {
      console.error('❌ Error fetching work instructions:', error);
      
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying... (${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          fetchWorkInstructions(retryCount + 1);
        }, 1000 * (retryCount + 1));
        return;
      }
      
      setError(`Gagal memuat instruksi kerja: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load existing progress from localStorage
  const loadExistingProgress = useCallback((instructionId) => {
    try {
      const sessionId = generateSessionId(instructionId);
      const progressData = localStorage.getItem(sessionId);
      
      if (progressData) {
        const parsed = JSON.parse(progressData);
        console.log('📊 Found existing progress:', parsed);
        return parsed;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error loading existing progress:', error);
      return null;
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((instructionId, progressData) => {
    try {
      const sessionId = generateSessionId(instructionId);
      localStorage.setItem(sessionId, JSON.stringify({
        ...progressData,
        lastUpdated: new Date().toISOString()
      }));
      console.log('💾 Progress saved:', progressData);
    } catch (error) {
      console.error('❌ Error saving progress:', error);
    }
  }, []);

  // Clear progress from localStorage
  const clearProgress = useCallback((instructionId) => {
    try {
      const sessionId = generateSessionId(instructionId);
      localStorage.removeItem(sessionId);
      console.log('🗑️ Progress cleared for:', instructionId);
    } catch (error) {
      console.error('❌ Error clearing progress:', error);
    }
  }, []);

  // Handle instruction selection
  const handleSelectInstruction = useCallback((instruction) => {
    console.log('🎯 Selecting instruction:', instruction?.title);
    
    if (!instruction) {
      setSelectedInstruction(null);
      setSteps([]);
      setCurrentStep(0);
      setStepStatuses([]);
      setStepImages({});
      return;
    }

    setSelectedInstruction(instruction);
    setSteps(instruction.steps || []);
    setCurrentStep(0);
    
    // Initialize step statuses
    const initialStatuses = (instruction.steps || []).map(() => STEP_STATUS.PENDING);
    setStepStatuses(initialStatuses);
    
    // Check for existing progress
    const existingProgress = loadExistingProgress(instruction.id);
    if (existingProgress && existingProgress.stepStatuses) {
      setExistingProgress(existingProgress);
      setShowResumeModal(true);
    }

    // Extract dan preload images untuk semua steps
    const allImageUrls = extractImageUrls(instruction.steps || []);
    console.log('🖼️ Starting image preload for all steps:', allImageUrls);
    
    if (allImageUrls.some(stepImages => stepImages.length > 0)) {
      setImagesLoading(true);
      // ImagePreloader akan handle preloading
    } else {
      console.log('🖼️ No images to preload');
      setStepImages({});
      setImagesLoading(false);
    }
  }, [loadExistingProgress]);

  // Resume from existing progress
  const handleResumeProgress = useCallback(() => {
    if (existingProgress) {
      setCurrentStep(existingProgress.currentStep || 0);
      setStepStatuses(existingProgress.stepStatuses || []);
      setTotalTime(existingProgress.totalTime || 0);
      setStepCompletionTimes(existingProgress.stepCompletionTimes || []);
      setWorkSessionId(existingProgress.workSessionId);
      console.log('🔄 Resumed from existing progress');
    }
    setShowResumeModal(false);
    setExistingProgress(null);
  }, [existingProgress]);

  // Start fresh (ignore existing progress)
  const handleStartFresh = useCallback(() => {
    if (selectedInstruction) {
      clearProgress(selectedInstruction.id);
      const initialStatuses = steps.map(() => STEP_STATUS.PENDING);
      setStepStatuses(initialStatuses);
      setCurrentStep(0);
      setTotalTime(0);
      setStepCompletionTimes([]);
      setWorkSessionId(null);
      console.log('🆕 Starting fresh');
    }
    setShowResumeModal(false);
    setExistingProgress(null);
  }, [selectedInstruction, steps, clearProgress]);

  // Timer effects
  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setStepTime(prevTime => prevTime + 1);
        setTotalTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Auto-stop timer effect
  useEffect(() => {
    if (isRunning && autoStopEnabled && currentStepTargetTime > 0) {
      if (stepTime >= currentStepTargetTime && !autoStopTriggered) {
        console.log(`⏰ Auto-stop triggered: Step time ${stepTime}s exceeded target ${currentStepTargetTime}s`);
        
        // Set auto-stop triggered flag
        setAutoStopTriggered(true);
        
        // Show warning modal
        setShowAutoStopWarning(true);
        
        // Auto-stop the timer
        setIsRunning(false);
        
        // Update step status back to pending
        const newStepStatuses = [...stepStatuses];
        if (newStepStatuses[currentStep] === STEP_STATUS.IN_PROGRESS) {
          newStepStatuses[currentStep] = STEP_STATUS.PENDING;
          setStepStatuses(newStepStatuses);
        }
        
        console.log('⏰ Timer auto-stopped due to exceeding target time');
      }
    }
  }, [isRunning, stepTime, currentStepTargetTime, autoStopEnabled, autoStopTriggered, currentStep, stepStatuses]);

  // Reset auto-stop flag when starting new step
  useEffect(() => {
    if (isRunning) {
      setAutoStopTriggered(false);
    }
  }, [isRunning, currentStep]);

  // Save progress periodically and on state changes
  useEffect(() => {
    if (selectedInstruction && (stepStatuses.length > 0 || totalTime > 0)) {
      const progressData = {
        currentStep,
        stepStatuses,
        totalTime,
        stepCompletionTimes,
        workSessionId,
        instructionId: selectedInstruction.id,
        instructionTitle: selectedInstruction.title
      };
      
      saveProgress(selectedInstruction.id, progressData);
    }
  }, [selectedInstruction, currentStep, stepStatuses, totalTime, stepCompletionTimes, workSessionId, saveProgress]);

  // Load work instructions on component mount
  useEffect(() => {
    fetchWorkInstructions();
  }, [fetchWorkInstructions]);

  // Task control functions
  const startStep = useCallback(async () => {
    if (!selectedInstruction) return;

    try {
      setIsRunning(true);
      setStepTime(0);
      setShowStopNotification(false);
      setAutoStopTriggered(false);

      // Update step status to in progress
      const newStepStatuses = [...stepStatuses];
      newStepStatuses[currentStep] = STEP_STATUS.IN_PROGRESS;
      setStepStatuses(newStepStatuses);

      // Create or update work session in Firestore
      if (!workSessionId) {
        const auth = getAuth();
        const user = auth.currentUser;
        
        const sessionData = {
          userId: user?.uid || 'anonymous',
          workInstructionId: selectedInstruction.id,
          workInstructionTitle: selectedInstruction.title,
          startTime: Timestamp.now(),
          currentStep: currentStep,
          stepStatuses: newStepStatuses,
          totalSteps: steps.length,
          isActive: true,
          createdAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, 'workSessions'), sessionData);
        setWorkSessionId(docRef.id);
        console.log('📝 Created new work session:', docRef.id);
      } else {
        // Update existing session
        const sessionRef = doc(db, 'workSessions', workSessionId);
        await updateDoc(sessionRef, {
          currentStep: currentStep,
          stepStatuses: newStepStatuses,
          lastUpdated: Timestamp.now()
        });
        console.log('📝 Updated work session:', workSessionId);
      }

    } catch (error) {
      console.error('❌ Error starting step:', error);
      setIsRunning(false);
    }
  }, [selectedInstruction, currentStep, stepStatuses, steps.length, workSessionId]);

  const stopStep = useCallback(() => {
    setIsRunning(false);
    setShowStopNotification(true);
    
    // Update step status back to pending if it was in progress
    const newStepStatuses = [...stepStatuses];
    if (newStepStatuses[currentStep] === STEP_STATUS.IN_PROGRESS) {
      newStepStatuses[currentStep] = STEP_STATUS.PENDING;
      setStepStatuses(newStepStatuses);
    }
    
    setTimeout(() => {
      setShowStopNotification(false);
    }, 2000);
    
    console.log('⏸️ Step stopped');
  }, [currentStep, stepStatuses]);

  const completeStep = useCallback(async () => {
    if (!selectedInstruction) return;

    try {
      setIsRunning(false);
      
      // Update step status to completed
      const newStepStatuses = [...stepStatuses];
      newStepStatuses[currentStep] = STEP_STATUS.COMPLETED;
      setStepStatuses(newStepStatuses);
      
      // Record completion time
      const newCompletionTimes = [...stepCompletionTimes];
      newCompletionTimes[currentStep] = stepTime;
      setStepCompletionTimes(newCompletionTimes);

      // Update Firestore session
      if (workSessionId) {
        const sessionRef = doc(db, 'workSessions', workSessionId);
        await updateDoc(sessionRef, {
          currentStep: currentStep,
          stepStatuses: newStepStatuses,
          stepCompletionTimes: newCompletionTimes,
          lastUpdated: Timestamp.now()
        });
      }

      // Check if this is the last step
      if (isLastStep) {
        setShowCompletion(true);
        
        // Mark session as completed in Firestore
        if (workSessionId) {
          const sessionRef = doc(db, 'workSessions', workSessionId);
          await updateDoc(sessionRef, {
            isActive: false,
            completedAt: Timestamp.now(),
            totalTime: totalTime,
            finalStepStatuses: newStepStatuses
          });
        }
        
        console.log('🎉 All steps completed!');
      } else {
        // Move to next step
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        setStepTime(0);
        console.log(`✅ Step ${currentStep + 1} completed, moving to step ${nextStep + 1}`);
      }
      
    } catch (error) {
      console.error('❌ Error completing step:', error);
    }
  }, [selectedInstruction, currentStep, stepStatuses, stepCompletionTimes, stepTime, isLastStep, totalTime, workSessionId]);

  const skipStep = useCallback(async (reason = '') => {
    if (!selectedInstruction) return;

    try {
      // Update step status to skipped
      const newStepStatuses = [...stepStatuses];
      newStepStatuses[currentStep] = STEP_STATUS.SKIPPED;
      setStepStatuses(newStepStatuses);
      
      // Record skip time as 0
      const newCompletionTimes = [...stepCompletionTimes];
      newCompletionTimes[currentStep] = 0;
      setStepCompletionTimes(newCompletionTimes);

      // Update Firestore session
      if (workSessionId) {
        const sessionRef = doc(db, 'workSessions', workSessionId);
        await updateDoc(sessionRef, {
          currentStep: currentStep,
          stepStatuses: newStepStatuses,
          stepCompletionTimes: newCompletionTimes,
          lastUpdated: Timestamp.now()
        });
      }

      setIsRunning(false);
      setStepTime(0);
      
      // Move to next step if not the last step
      if (!isLastStep) {
        setCurrentStep(currentStep + 1);
      }
      
      console.log(`⏭️ Step ${currentStep + 1} skipped: ${reason}`);
      
    } catch (error) {
      console.error('❌ Error skipping step:', error);
    }
  }, [selectedInstruction, currentStep, stepStatuses, stepCompletionTimes, isLastStep, workSessionId]);

  const resetTask = useCallback(() => {
    setIsRunning(false);
    setCurrentStep(0);
    setStepTime(0);
    setTotalTime(0);
    setShowCompletion(false);
    setStepCompletionTimes([]);
    setShowStopNotification(false);
    setWorkSessionId(null);
    
    if (selectedInstruction) {
      const initialStatuses = steps.map(() => STEP_STATUS.PENDING);
      setStepStatuses(initialStatuses);
      clearProgress(selectedInstruction.id);
    }
    
    console.log('🔄 Task reset');
  }, [selectedInstruction, steps, clearProgress]);

  const goToStep = useCallback((stepIndex) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
      setStepTime(0);
      setIsRunning(false);
      console.log(`🎯 Moved to step ${stepIndex + 1}`);
    }
  }, [steps.length]);

  // Handle skip modal
  const handleShowSkipModal = useCallback(() => {
    setShowSkipModal(true);
  }, []);

  const handleConfirmSkip = useCallback((reason) => {
    skipStep(reason);
    setShowSkipModal(false);
  }, [skipStep]);

  const handleCancelSkip = useCallback(() => {
    setShowSkipModal(false);
  }, []);

  // Handle auto-stop warning
  const handleCloseAutoStopWarning = useCallback(() => {
    setShowAutoStopWarning(false);
  }, []);

  const handleContinueManual = useCallback(() => {
    // Lanjutkan timer tanpa menghentikan
    setIsRunning(true);
    setShowAutoStopWarning(false);
    
    // Set step status kembali ke in-progress
    const newStepStatuses = [...stepStatuses];
    newStepStatuses[currentStep] = STEP_STATUS.IN_PROGRESS;
    setStepStatuses(newStepStatuses);
    
    console.log('⏱️ Timer continued manually despite exceeding target time');
  }, [stepStatuses, currentStep]);

  const handleDisableAutoStop = useCallback(() => {
    setAutoStopEnabled(false);
    setShowAutoStopWarning(false);
    console.log('⚙️ Auto-stop disabled by user');
  }, []);

  const handleEnableAutoStop = useCallback(() => {
    setAutoStopEnabled(true);
    console.log('⚙️ Auto-stop enabled by user');
    }, []);

  const handleToggleAutoStop = useCallback(() => {
    setAutoStopEnabled(prev => !prev);
  }, []);

  const handleShowTroubleshoot = useCallback(() => {
    setShowTroubleshootModal(true);
  }, []);

  const handleCloseTroubleshoot = useCallback(() => {
    setShowTroubleshootModal(false);
  }, []);

  // Handler untuk TroubleshootModal actions
  const handleTroubleshootApplyFix = useCallback(async (fixData) => {
    try {
      console.log('🔧 Applying troubleshoot fix:', fixData);
      
      // Add to troubleshoot history
      addTroubleshootHistory({
        type: fixData.type,
        troubleshootType: fixData.troubleshootType,
        fixAction: fixData.fixAction,
        originalTime: fixData.originalTime,
        adjustedTime: fixData.adjustedTime,
        reason: fixData.reason,
        timestamp: fixData.timestamp,
        description: getTroubleshootDescription(fixData)
      });

      // Handle different fix types
      switch (fixData.type) {
        case 'STOP_AND_ADJUST':
          setIsRunning(false);
          setStepTime(fixData.newStepTime);
          
          // Update step status back to pending
          const newStepStatuses = [...stepStatuses];
          if (newStepStatuses[currentStep] === STEP_STATUS.IN_PROGRESS) {
            newStepStatuses[currentStep] = STEP_STATUS.PENDING;
            setStepStatuses(newStepStatuses);
          }
          
          // Update total time accordingly
          const timeDifference = fixData.newStepTime - fixData.originalTime;
          setTotalTime(prev => prev + timeDifference);
          break;

        case 'USE_TARGET_TIME':
          setStepTime(fixData.newStepTime);
          const targetTimeDifference = fixData.newStepTime - fixData.originalTime;
          setTotalTime(prev => prev + targetTimeDifference);
          break;

        case 'ADJUST_TIME':
          setStepTime(fixData.newStepTime);
          const adjustTimeDifference = fixData.newStepTime - fixData.originalTime;
          setTotalTime(prev => prev + adjustTimeDifference);
          break;

        case 'FORCE_COMPLETE':
          await handleTroubleshootForceComplete(fixData);
          break;

        case 'RESET_STEP':
          await handleTroubleshootResetStep(fixData);
          break;

        case 'UNDO_ACTION':
          await handleTroubleshootUndo(fixData);
          break;

        default:
          console.warn('Unknown troubleshoot fix type:', fixData.type);
      }

      // Update Firestore session if exists
      if (workSessionId) {
        const sessionRef = doc(db, 'workSessions', workSessionId);
        await updateDoc(sessionRef, {
          troubleshootHistory: troubleshootHistory,
          lastTroubleshootAction: fixData,
          lastUpdated: Timestamp.now()
        });
      }

      console.log('✅ Troubleshoot fix applied successfully');
      
    } catch (error) {
      console.error('❌ Error applying troubleshoot fix:', error);
    }
  }, [stepStatuses, currentStep, troubleshootHistory, workSessionId, addTroubleshootHistory]);

  const handleTroubleshootForceComplete = useCallback(async (fixData) => {
    try {
      setIsRunning(false);
      
      // Update step status to completed
      const newStepStatuses = [...stepStatuses];
      newStepStatuses[currentStep] = STEP_STATUS.COMPLETED;
      setStepStatuses(newStepStatuses);
      
      // Set appropriate completion time
      const completionTime = fixData.useCurrentTime ? stepTime : fixData.newStepTime;
      const newCompletionTimes = [...stepCompletionTimes];
      newCompletionTimes[currentStep] = completionTime;
      setStepCompletionTimes(newCompletionTimes);

      // Update step time if using target time
      if (fixData.useTargetTime && fixData.newStepTime) {
        setStepTime(fixData.newStepTime);
        const timeDifference = fixData.newStepTime - fixData.originalTime;
        setTotalTime(prev => prev + timeDifference);
      }

      // Update Firestore session
      if (workSessionId) {
        const sessionRef = doc(db, 'workSessions', workSessionId);
        await updateDoc(sessionRef, {
          currentStep: currentStep,
          stepStatuses: newStepStatuses,
          stepCompletionTimes: newCompletionTimes,
          lastUpdated: Timestamp.now()
        });
      }

      // Check if this is the last step
      if (isLastStep) {
        setShowCompletion(true);
        
        // Mark session as completed in Firestore
        if (workSessionId) {
          const sessionRef = doc(db, 'workSessions', workSessionId);
          await updateDoc(sessionRef, {
            isActive: false,
            completedAt: Timestamp.now(),
            totalTime: totalTime,
            finalStepStatuses: newStepStatuses
          });
        }
        
        console.log('🎉 Task completed via troubleshoot!');
      } else {
        // Move to next step
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        setStepTime(0);
        console.log(`✅ Step ${currentStep + 1} force completed via troubleshoot, moving to step ${nextStep + 1}`);
      }
      
    } catch (error) {
      console.error('❌ Error in troubleshoot force complete:', error);
    }
  }, [stepStatuses, currentStep, stepCompletionTimes, stepTime, isLastStep, totalTime, workSessionId]);

  const handleTroubleshootResetStep = useCallback(async (fixData) => {
    try {
      setIsRunning(false);
      setStepTime(0);
      
      // Reset step status to pending
      const newStepStatuses = [...stepStatuses];
      newStepStatuses[currentStep] = STEP_STATUS.PENDING;
      setStepStatuses(newStepStatuses);
      
      // Clear completion time for this step
      const newCompletionTimes = [...stepCompletionTimes];
      newCompletionTimes[currentStep] = 0;
      setStepCompletionTimes(newCompletionTimes);

      // Update total time by subtracting the original step time
      setTotalTime(prev => prev - fixData.originalTime);

      // Update Firestore session
      if (workSessionId) {
        const sessionRef = doc(db, 'workSessions', workSessionId);
        await updateDoc(sessionRef, {
          currentStep: currentStep,
          stepStatuses: newStepStatuses,
          stepCompletionTimes: newCompletionTimes,
          lastUpdated: Timestamp.now()
        });
      }

      console.log(`🔄 Step ${currentStep + 1} reset via troubleshoot`);
      
    } catch (error) {
      console.error('❌ Error in troubleshoot reset step:', error);
    }
  }, [stepStatuses, currentStep, stepCompletionTimes, workSessionId]);

  const handleTroubleshootUndo = useCallback(async (fixData) => {
    try {
      // Implementation for undo functionality
      // This would depend on what the previous action was
      console.log('🔄 Undoing troubleshoot action:', fixData.previousAction);
      
      // Remove last entry from troubleshoot history
      setTroubleshootHistory(prev => prev.slice(0, -1));
      
    } catch (error) {
      console.error('❌ Error in troubleshoot undo:', error);
    }
  }, []);

  const getTroubleshootDescription = useCallback((fixData) => {
    switch (fixData.type) {
      case 'STOP_AND_ADJUST':
        return `Timer dihentikan dan waktu disesuaikan dari ${formatStepTime(fixData.originalTime)} ke ${formatStepTime(fixData.adjustedTime)}`;
      case 'USE_TARGET_TIME':
        return `Waktu diubah menggunakan waktu target: ${formatStepTime(fixData.adjustedTime)}`;
      case 'ADJUST_TIME':
        return `Waktu disesuaikan manual dari ${formatStepTime(fixData.originalTime)} ke ${formatStepTime(fixData.adjustedTime)}`;
      case 'FORCE_COMPLETE':
        return `Langkah dipaksa selesai dengan waktu ${formatStepTime(fixData.adjustedTime || fixData.originalTime)}`;
      case 'RESET_STEP':
        return `Langkah direset ke status awal`;
      default:
        return `Troubleshoot action: ${fixData.fixAction}`;
    }
  }, []);

  // Render loading state
  if (loading) {
    return <LoadingOverlay message="Memuat instruksi kerja..." />;
  }

  // Render error state
  if (error) {
    return (
      <div className="error-container">
        <h2>Terjadi Kesalahan</h2>
        <p>{error}</p>
        <button onClick={() => fetchWorkInstructions()} className="retry-button">
          Coba Lagi
        </button>
      </div>
    );
  }

  // Extract image URLs for preloading
  const allStepImages = selectedInstruction ? extractImageUrls(steps) : [];

  return (
    <div className="task-page">
      <TaskHeader workInstructionTitle={selectedInstruction?.title} />
      
      <div className="task-container">
        <WorkInstructionSelector 
          workInstructions={workInstructions}
          selectedInstruction={selectedInstruction}
          onSelectInstruction={handleSelectInstruction}
        />

        {selectedInstruction && (
          <>
            <TaskProgressBar 
              completedSteps={completedStepsCount}
              totalSteps={steps.length}
            />

            <TimerDisplay 
              totalTime={totalTime}
              stepTime={stepTime}
              targetTime={currentStepTargetTime}
              showWarning={showTargetTimeWarning}
              isOverTarget={isOverTargetTime}
            />

            <StepNavigator 
              stepStatuses={stepStatuses}
              currentStep={currentStep}
              steps={steps}
              onGoToStep={goToStep}
            />

            {/* Image Preloader */}
            {allStepImages && allStepImages.length > 0 && (
              <ImagePreloader 
                images={allStepImages}
                onImagesLoaded={handleImagesLoaded}
              />
            )}

            <StepContent 
              activeStep={activeStep}
              stepStatus={stepStatuses[currentStep]}
              stepImages={stepImages}
              currentStep={currentStep}
            />

            <ControlButtons 
              isRunning={isRunning}
              showStopNotification={showStopNotification}
              stepStatus={stepStatuses[currentStep]}
              isLastStep={isLastStep}
              onStartStep={startStep}
              onStopStep={stopStep}
              onCompleteStep={completeStep}
              onShowSkipModal={handleShowSkipModal}
              onReset={resetTask}
              hasSelectedInstruction={!!selectedInstruction}
              onShowTroubleshoot={handleShowTroubleshoot}
              autoStopEnabled={autoStopEnabled}
              onToggleAutoStop={handleToggleAutoStop}
            />
          </>
        )}
      </div>

      {/* Modals */}
      {showResumeModal && existingProgress && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Progress Sebelumnya Ditemukan</h3>
            <p>
              Anda memiliki progress yang belum selesai pada instruksi kerja ini.
              Terakhir Anda berada di <strong>Langkah {(existingProgress.currentStep || 0) + 1}</strong>.
            </p>
            <p>Apakah Anda ingin <strong>melanjutkan dari langkah tersebut</strong> atau <strong>memulai ulang dari awal?</strong></p>
            
            <div className="modal-actions">
              <button onClick={handleResumeProgress} className="task-btn task-btn-primary">
                Lanjutkan dari Langkah {(existingProgress.currentStep || 0) + 1}
              </button>
              <button onClick={handleStartFresh} className="task-btn task-btn-secondary">
                Mulai dari Awal
              </button>
            </div>
          </div>
        </div>
      )}

      {showSkipModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Lewati Langkah</h3>
            <p>Apakah Anda yakin ingin melewati langkah ini?</p>
            <textarea 
              placeholder="Alasan melewati langkah (opsional)..."
              rows="3"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
            <div className="modal-actions">
              <button 
                onClick={() => handleConfirmSkip(manualName)} 
                className="task-btn task-btn-warning"
              >
                Ya, Lewati
              </button>
              <button onClick={handleCancelSkip} className="task-btn task-btn-secondary">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompletion && (
        <div className="modal-overlay">
          <div className="modal-content completion-modal">
            <h3>🎉 Selamat!</h3>
            <p>Anda telah menyelesaikan semua langkah dalam instruksi kerja "{selectedInstruction?.title}"</p>
            
            <div className="completion-summary">
              <h4>Ringkasan:</h4>
              <p><strong>Total Waktu:</strong> {formatTime(totalTime)}</p>
              <p><strong>Langkah Selesai:</strong> {completedStepsCount} dari {steps.length}</p>
              
              {getSkippedSteps().length > 0 && (
                <div className="skipped-summary">
                  <p><strong>Langkah yang Dilewati:</strong> {getSkippedSteps().length}</p>
                  <ul>
                    {getSkippedSteps().map(({ index }) => (
                      <li key={index}>{steps[index]?.title}</li>
                    ))}
                  </ul>
                </div>
              )}

              {troubleshootHistory.length > 0 && (
                <div className="troubleshoot-summary">
                  <p><strong>Troubleshoot Dilakukan:</strong> {troubleshootHistory.length} kali</p>
                  <details>
                    <summary>Lihat Detail</summary>
                    <ul>
                      {troubleshootHistory.map((entry, index) => (
                        <li key={index}>
                          <strong>Langkah {entry.stepIndex + 1}:</strong> {entry.description}
                          <br />
                          <small>{new Date(entry.timestamp).toLocaleString()}</small>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button 
                onClick={() => {
                  setShowCompletion(false);
                  resetTask();
                }} 
                className="task-btn task-btn-primary"
              >
                Mulai Lagi
              </button>
              <Link to="/home" className="task-btn task-btn-secondary">
                Kembali ke Home
              </Link>
            </div>
          </div>
        </div>
      )}

      {showAutoStopWarning && (
        <div className="modal-overlay">
          <div className="modal-content auto-stop-modal">
            <h3>⏰ Timer Dihentikan Otomatis</h3>
            <p>
              Waktu langkah telah melebihi target yang ditetapkan 
              ({formatStepTime(currentStepTargetTime)}).
            </p>
            <p>
              Waktu saat ini: <strong>{formatStepTime(stepTime)}</strong>
            </p>
            <p>
              Timer telah dihentikan secara otomatis untuk membantu Anda 
              mengelola waktu dengan lebih baik.
            </p>
            
            <div className="auto-stop-options">
              <p><strong>Apa yang ingin Anda lakukan?</strong></p>
              
              <div className="modal-actions">
                <button 
                  onClick={handleContinueManual} 
                  className="task-btn task-btn-primary"
                >
                  Lanjutkan Manual
                </button>
                <button 
                  onClick={() => {
                    handleCloseAutoStopWarning();
                    if (currentStep + 1 < steps.length) {
                      goToStep(currentStep + 1);
                    }
                  }} 
                  className="task-btn task-btn-success"
                  disabled={isLastStep}
                >
                  Lanjut ke Langkah Berikutnya
                </button>
                <button 
                  onClick={() => {
                    handleCloseAutoStopWarning();
                    handleShowTroubleshoot();
                  }} 
                  className="task-btn task-btn-info"
                >
                  🔧 Troubleshoot
                </button>
              </div>
              
              <div className="auto-stop-settings">
                <label className="auto-stop-toggle">
                  <input
                    type="checkbox"
                    checked={autoStopEnabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleEnableAutoStop();
                      } else {
                        handleDisableAutoStop();
                      }
                    }}
                  />
                  <span>Aktifkan auto-stop untuk langkah selanjutnya</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TroubleshootModal component */}
      <TroubleshootModal
        isOpen={showTroubleshootModal}
        onClose={handleCloseTroubleshoot}
        stepTime={stepTime}
        totalTime={totalTime}
        currentStep={currentStep}
        activeStep={activeStep}
        stepStatus={stepStatuses[currentStep]}
        isRunning={isRunning}
        onApplyFix={handleTroubleshootApplyFix}
        onResetStep={(fixData) => handleTroubleshootApplyFix({ ...fixData, type: 'RESET_STEP' })}
        onForceComplete={(fixData) => handleTroubleshootApplyFix({ ...fixData, type: 'FORCE_COMPLETE' })}
        onAdjustTime={(fixData) => handleTroubleshootApplyFix({ ...fixData, type: 'ADJUST_TIME' })}
        workSessionId={workSessionId}
        troubleshootHistory={troubleshootHistory}
      />

      {showStopNotification && (
        <div className="notification">
          <p>⏸️ Langkah dihentikan</p>
        </div>
      )}

      {imagesLoading && (
        <div className="notification">
          <p>🖼️ Memuat gambar...</p>
        </div>
      )}
    </div>
  );
};

export default TaskPage;