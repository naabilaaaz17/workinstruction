import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import './TaskPage.css';
import StepNotesModal from './StepNotesModal';
import { db } from '../../firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Import components
import {
  STEP_STATUS,
  formatTime,
  formatStepTime,
  getStepStatusColor,
  getStepStatusText,
  TaskHeader,
  TaskProgressBar,
  StepNavigator,
  TimerDisplay,
  StepContent,
  ControlButtons,
  LoadingOverlay
} from './TaskPageComponent';
import { ImagePreloader } from './ImageComponents';
import { TroubleshootModal } from './TroubleshootModal';

// ========================================================================================
// MAIN COMPONENT
// ========================================================================================
const TaskPage = () => {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const location = useLocation();
  
  // ========================================================================================
  // REFS
  // ========================================================================================
  const sessionUnsubRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const lastSyncRef = useRef(0);

  // ========================================================================================
  // AUTH STATE
  // ========================================================================================
  const [authState, setAuthState] = useState({
    currentUser: null,
    currentUserId: null,
    currentUserName: null,
    userRole: null,
    isLoading: true
  });

  // ========================================================================================
  // TASK DATA STATE
  // ========================================================================================
  const [selectedTask, setSelectedTask] = useState(() => {
    if (location.state?.selectedTask) {
      return location.state.selectedTask;
    }
    
    try {
      const savedTask = localStorage.getItem('currentTask');
      if (savedTask) {
        return JSON.parse(savedTask);
      }
    } catch (error) {
      console.error('Error loading saved task:', error);
    }
    
    return null;
  });

  const [selectedInstruction, setSelectedInstruction] = useState(null);
  const [steps, setSteps] = useState([]);

  // ========================================================================================
  // TASK EXECUTION STATE
  // ========================================================================================
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [stepTime, setStepTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [stepCompletionTimes, setStepCompletionTimes] = useState([]);
  const [stepStatuses, setStepStatuses] = useState([]);

  // ========================================================================================
  // SESSION STATE (Multi-user & Real-time)
  // ========================================================================================
  const [workSessionId, setWorkSessionId] = useState(null);
  const [activeWorkSession, setActiveWorkSession] = useState(null);
  const [sessionParticipants, setSessionParticipants] = useState([]);
  const [stepOperators, setStepOperators] = useState({}); // { stepIndex: [userId1, userId2] }
  
  // ========================================================================================
  // MODAL STATES
  // ========================================================================================
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showAutoStopWarning, setShowAutoStopWarning] = useState(false);
  const [showTroubleshootModal, setShowTroubleshootModal] = useState(false);
  const [showJoinSessionModal, setShowJoinSessionModal] = useState(false);
  const [showStepNotesModal, setShowStepNotesModal] = useState(false);

  // ========================================================================================
  // NOTIFICATION STATES
  // ========================================================================================
  const [showStopNotification, setShowStopNotification] = useState(false);
  const [showTargetTimeWarning, setShowTargetTimeWarning] = useState(false);
  const [showSyncNotification, setShowSyncNotification] = useState(false);

  // ========================================================================================
  // UTILITY STATES
  // ========================================================================================
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [existingProgress, setExistingProgress] = useState(null);
  const [manualName, setManualName] = useState('');
  const [stepImages, setStepImages] = useState({});
  const [autoStopEnabled, setAutoStopEnabled] = useState(true);
  const [autoStopTriggered, setAutoStopTriggered] = useState(false);
  const [targetTimeWarningShown, setTargetTimeWarningShown] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [troubleshootHistory, setTroubleshootHistory] = useState([]);
  const [isJoiningSession, setIsJoiningSession] = useState(false);
  const [popupShownForStep, setPopupShownForStep] = useState(new Set());
  const [currentStepNotes, setCurrentStepNotes] = useState('');

  // ========================================================================================
  // COMPUTED VALUES
  // ========================================================================================
  const { currentUser, currentUserId, currentUserName, userRole, isLoading: authLoading } = authState;
  
  const activeStep = useMemo(() => steps[currentStep] || {}, [steps, currentStep]);
  const isLastStep = useMemo(() => currentStep === steps.length - 1, [currentStep, steps.length]);
  const completedStepsCount = useMemo(() => 
    stepStatuses.filter(status => status === STEP_STATUS.COMPLETED).length,
    [stepStatuses]
  );

  const currentStepTargetTime = useMemo(() => {
    const maxTime = activeStep.maxTime;
    if (typeof maxTime === 'string') {
      const parsed = parseInt(maxTime, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return maxTime || 0;
  }, [activeStep.maxTime]);

  const totalTargetTime = useMemo(() => {
    return steps.reduce((sum, step) => {
      const maxTime = step.maxTime;
      if (typeof maxTime === 'string') {
        const parsed = parseInt(maxTime, 10);
        return sum + (isNaN(parsed) ? 0 : parsed);
      }
      return sum + (maxTime || 0);
    }, 0);
  }, [steps]);

  const isOverTargetTime = useMemo(() => 
    currentStepTargetTime > 0 && stepTime > currentStepTargetTime,
    [currentStepTargetTime, stepTime]
  );

  const allSessionParticipants = useMemo(() => {
    if (!activeWorkSession?.data) return [];
    
    const sessionData = activeWorkSession.data;
    const participants = sessionData.participants || [];
    
    const allUserIds = new Set();
    
    // Collect all user IDs from various sources
    participants.forEach(p => allUserIds.add(p.userId));
    Object.values(stepOperators || {}).forEach(operatorArray => {
      if (Array.isArray(operatorArray)) {
        operatorArray.forEach(userId => allUserIds.add(userId));
      } else {
        allUserIds.add(operatorArray);
      }
    });
    Object.values(sessionData.stepCompletedBy || {}).forEach(completion => 
      allUserIds.add(completion.userId)
    );
    if (sessionData.createdBy) allUserIds.add(sessionData.createdBy);
    if (sessionData.operatorId) allUserIds.add(sessionData.operatorId);

    // Build comprehensive participant list
    const comprehensiveParticipants = Array.from(allUserIds).map(userId => {
      let participant = participants.find(p => p.userId === userId);
      
      if (!participant) {
        let userName = 'Unknown User';
        
        // Try to get name from completion data
        const completedSteps = Object.values(sessionData.stepCompletedBy || {});
        const completedByUser = completedSteps.find(c => c.userId === userId);
        if (completedByUser?.userName) userName = completedByUser.userName;
        
        if (userId === sessionData.operatorId && sessionData.operatorName) {
          userName = sessionData.operatorName;
        }
        
        participant = {
          userId: userId,
          userName: userName,
          joinedAt: sessionData.createdAt || Timestamp.now(),
          isActive: true,
          role: userId === sessionData.createdBy ? 'creator' : 'participant'
        };
      }

      // Calculate contributions
      const stepsCompleted = Object.values(sessionData.stepCompletedBy || {})
        .filter(completion => completion.userId === userId).length;
        
      return {
        ...participant,
        contributions: {
          completed: stepsCompleted,
          total: stepsCompleted
        },
        isCurrentUser: userId === currentUserId,
        isCreator: userId === sessionData.createdBy
      };
    });
    
    return comprehensiveParticipants.sort((a, b) => {
      if (a.isCreator && !b.isCreator) return -1;
      if (!a.isCreator && b.isCreator) return 1;
      if (a.isCurrentUser && !b.isCurrentUser) return -1;
      if (!a.isCurrentUser && b.isCurrentUser) return 1;
      return b.contributions.total - a.contributions.total;
    });
  }, [activeWorkSession, stepOperators, currentUserId]);

  const otherParticipants = useMemo(() => 
    allSessionParticipants.filter(p => p.userId !== currentUserId),
    [allSessionParticipants, currentUserId]
  );

  // ========================================================================================
  // UTILITY FUNCTIONS
  // ========================================================================================
  const showNotification = (message, type = "info") => {
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  const calculateEfficiency = useCallback((actualTime, targetTime) => {
    if (targetTime <= 0 || actualTime <= 0) return 0;
    return Math.round((targetTime / actualTime) * 100);
  }, []);

  const generateSessionId = useCallback((taskId) => {
    return `task_session_${taskId}`;
  }, []);

  const extractImageUrls = useCallback((stepsArray) => {
    console.log('🖼️ Extracting image URLs from steps:', stepsArray);
    
    return stepsArray.map((step, stepIndex) => {
      let imageUrls = [];
      
      if (step.imageUrls && Array.isArray(step.imageUrls)) {
        imageUrls = step.imageUrls.filter(url => url && typeof url === 'string' && url.trim() !== '');
      } else if (step.imageUrls && typeof step.imageUrls === 'string') {
        const trimmed = step.imageUrls.trim();
        if (trimmed.includes(',')) {
          imageUrls = trimmed.split(',').map(url => url.trim()).filter(url => url !== '');
        } else if (trimmed !== '') {
          imageUrls = [trimmed];
        }
      }
      
      console.log(`🖼️ Step ${stepIndex} (${step.title}): Found ${imageUrls.length} images`, imageUrls);
      return imageUrls;
    });
  }, []);

  const handleImagesLoaded = useCallback((loadedImagesMap) => {
    console.log('✅ Images loaded callback triggered:', loadedImagesMap);
    setStepImages(loadedImagesMap);
    setImagesLoading(false);
  }, []);

  const allStepImages = useMemo(() => 
    selectedInstruction ? extractImageUrls(steps) : [], 
    [selectedInstruction, steps, extractImageUrls]
  );

  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up TaskPage...');
    
    if (sessionUnsubRef.current) {
      sessionUnsubRef.current();
      sessionUnsubRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const normalizeOperatorArray = useCallback((operators) => {
    if (Array.isArray(operators)) {
      return operators;
    } else if (operators) {
      return [operators];
    } else {
      return [];
    }
  }, []);

  // ========================================================================================
  // ENHANCED CONCURRENT MODE FUNCTIONS
  // ========================================================================================
  
  // FIXED: getStepNotes function to match the data structure
  const getStepNotes = useCallback((stepIndex) => {
    if (!activeWorkSession?.data?.stepNotes?.[stepIndex]) return [];
    
    const stepNotes = activeWorkSession.data.stepNotes[stepIndex];
    
    // Handle both array and object structures for backward compatibility
    const notesArray = Array.isArray(stepNotes) 
      ? stepNotes 
      : Object.values(stepNotes).filter(note => note && typeof note === 'object');
    
    return notesArray.sort((a, b) => {
      const timeA = a?.timestamp?.toMillis?.() || a?.createdAt?.toMillis?.() || 0;
      const timeB = b?.timestamp?.toMillis?.() || b?.createdAt?.toMillis?.() || 0;
      return timeB - timeA; // newest first
    });
  }, [activeWorkSession]);

  // NEW: Check if current user can complete the step
  const canCompleteStep = useCallback(() => {
    const currentStepOperators = normalizeOperatorArray(stepOperators[currentStep] || []);
    
    // If no one is working on this step, anyone can complete it
    if (currentStepOperators.length === 0) {
      return true;
    }
    
    // If user is working on this step, they can complete it
    if (currentStepOperators.includes(currentUserId)) {
      return true;
    }
    
    // In concurrent mode, check if all operators have indicated they're done
    const recentNotes = getStepNotes(currentStep);
    const doneNotes = recentNotes.filter(note => 
      note.note && (
        note.note.toLowerCase().includes('selesai') || 
        note.note.toLowerCase().includes('done') ||
        note.note.toLowerCase().includes('lanjut') ||
        note.note.toLowerCase().includes('complete')
      )
    );
    
    // If at least one operator says they're done, allow completion
    return doneNotes.length > 0;
  }, [stepOperators, currentStep, currentUserId, getStepNotes, normalizeOperatorArray]);

  // NEW: Smart step completion check
  const shouldPromptForCompletion = useCallback(() => {
    const currentStepOperators = normalizeOperatorArray(stepOperators[currentStep] || []);
    
    // If only current user is working, they can complete freely
    if (currentStepOperators.length <= 1) {
      return false;
    }
    
    // If multiple operators, check recent coordination
    const recentNotes = getStepNotes(currentStep);
    const myRecentNotes = recentNotes.filter(note => note.userId === currentUserId);
    
    // If user hasn't coordinated recently, prompt them
    if (myRecentNotes.length === 0) {
      return true;
    }
    
    // Check if last note was about completion
    const lastNote = myRecentNotes[0];
    const isCompletionNote = lastNote.note && (
      lastNote.note.toLowerCase().includes('selesai') || 
      lastNote.note.toLowerCase().includes('done') ||
      lastNote.note.toLowerCase().includes('complete')
    );
    
    return !isCompletionNote;
  }, [stepOperators, currentStep, currentUserId, getStepNotes, normalizeOperatorArray]);

  // ========================================================================================
  // SESSION MANAGEMENT FUNCTIONS
  // ========================================================================================
  const findExistingActiveSessions = useCallback(async (taskData) => {
    try {
      const sessionsQuery = query(
        collection(db, 'workSessions'),
        where('taskId', '==', taskData.id),
        where('isActive', '==', true)
      );
      
      const sessionSnapshot = await getDocs(sessionsQuery);
      
      if (!sessionSnapshot.empty) {
        const existingSessions = sessionSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }));
        
        console.log('🔍 Found existing active sessions:', existingSessions.length);
        return existingSessions;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error finding existing sessions:', error);
      return [];
    }
  }, []);

  const createNewWorkSession = useCallback(async (taskData) => {
    if (!currentUserId || !currentUserName) {
      throw new Error('User not authenticated or name missing');
    }

    try {
      console.log('🆕 Creating new work session for task:', taskData.id);
      
      const stepTargetTimes = taskData.steps.map(step => {
        const maxTime = step.maxTime;
        if (typeof maxTime === 'string') {
          const parsed = parseInt(maxTime, 10);
          return isNaN(parsed) ? 0 : parsed;
        }
        return maxTime || 0;
      });
      
      const calculatedTotalTargetTime = stepTargetTimes.reduce((sum, time) => sum + time, 0);
      
      const newSessionData = {
        type: 'work_session',
        taskId: taskData.id,
        moNumber: taskData.moNumber,
        moDisplay: taskData.moDisplay,
        workInstructionTitle: taskData.title,
        taskName: taskData.title,
        startTime: Timestamp.now(),
        currentStep: 0,
        stepStatuses: taskData.steps.map(() => STEP_STATUS.PENDING),
        stepCompletionTimes: new Array(taskData.steps.length).fill(0),
        stepTimes: new Array(taskData.steps.length).fill(0),
        stepTargetTimes: stepTargetTimes,
        totalTargetTime: calculatedTotalTargetTime,
        targetTime: calculatedTotalTargetTime,
        totalSteps: taskData.steps.length,
        totalTime: 0,
        stepOperators: {},
        stepCompletedBy: {},
        stepStartedBy: {},
        stepSkippedBy: {},
        stepStoppedBy: {},
        stepNotes: {}, // Initialize step notes structure
        isActive: true,
        status: 'in_progress',
        createdBy: currentUserId,
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        troubleshootHistory: [],
        operatorId: currentUserId,
        operatorName: currentUserName || 'Unknown User',
        participants: [{
          userId: currentUserId,
          userName: currentUserName || 'Unknown User',
          joinedAt: Timestamp.now(),
          isActive: true,
          role: 'creator'
        }],
        workInstructionData: {
          id: taskData.id,
          title: taskData.title,
          steps: taskData.steps,
          category: taskData.category || 'Unknown'
        },
        finalEfficiency: 0,
        finalTotalTime: 0,
        finalStepStatuses: {},
        finalData: null
      };

      const docRef = await addDoc(collection(db, 'workSessions'), newSessionData);
      
      console.log('✅ Created session with operator name:', currentUserName);
      
      return {
        id: docRef.id,
        data: newSessionData
      };
      
    } catch (error) {
      console.error('❌ Error creating work session:', error);
      throw error;
    }
  }, [currentUserId, currentUserName]);

  const addParticipantToSession = useCallback(async (sessionId, participantData) => {
    try {
      const sessionRef = doc(db, 'workSessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (sessionDoc.exists()) {
        const sessionData = sessionDoc.data();
        const participants = sessionData.participants || [];
        
        const existingParticipantIndex = participants.findIndex(p => p.userId === participantData.userId);
        
        if (existingParticipantIndex === -1) {
          const updatedParticipants = [...participants, participantData];
          
          await updateDoc(sessionRef, {
            participants: updatedParticipants,
            lastUpdated: serverTimestamp()
          });
          
          console.log('➕ Added participant to session:', participantData.userName);
        } else {
          const updatedParticipants = [...participants];
          updatedParticipants[existingParticipantIndex] = {
            ...updatedParticipants[existingParticipantIndex],
            isActive: true,
            rejoinedAt: Timestamp.now()
          };
          
          await updateDoc(sessionRef, {
            participants: updatedParticipants,
            lastUpdated: serverTimestamp()
          });
          
          console.log('🔄 Reactivated participant:', participantData.userName);
        }
      }
    } catch (error) {
      console.error('❌ Error adding participant to session:', error);
    }
  }, []);

  const removeParticipantFromSession = useCallback(async (sessionId) => {
    if (!currentUserId) return;
    
    try {
      const sessionRef = doc(db, 'workSessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (sessionDoc.exists()) {
        const sessionData = sessionDoc.data();
        const participants = sessionData.participants || [];
        
        const updatedParticipants = participants.map(p => 
          p.userId === currentUserId 
            ? { ...p, isActive: false, leftAt: Timestamp.now() }
            : p
        );
        
        await updateDoc(sessionRef, {
          participants: updatedParticipants,
          lastUpdated: serverTimestamp()
        });
        
        console.log('➖ Removed participant from session');
      }
    } catch (error) {
      console.error('❌ Error removing participant from session:', error);
    }
  }, [currentUserId]);

  const claimStepOwnership = useCallback(async (stepIndex) => {
    if (!workSessionId || !currentUserId) return false;
    
    try {
      const sessionRef = doc(db, 'workSessions', workSessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (sessionDoc.exists()) {
        const sessionData = sessionDoc.data();
        const currentStepOperators = sessionData.stepOperators || {};
        
        const currentOperators = currentStepOperators[stepIndex] || [];
        const operatorsArray = normalizeOperatorArray(currentOperators);
        
        if (operatorsArray.includes(currentUserId)) {
          console.log(`✅ User ${currentUserId} already has access to step ${stepIndex}`);
          return true;
        }
        
        const updatedOperators = [...operatorsArray, currentUserId];
        
        const updatedStepOperators = {
          ...currentStepOperators,
          [stepIndex]: updatedOperators
        };
        
        await updateDoc(sessionRef, {
          stepOperators: updatedStepOperators,
          lastUpdated: serverTimestamp()
        });
        
        console.log(`🏆 Added ${currentUserId} to step ${stepIndex} operators:`, updatedOperators);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error claiming step ownership:', error);
      return false;
    }
  }, [workSessionId, currentUserId, normalizeOperatorArray]);

  const releaseStepOwnership = useCallback(async (stepIndex) => {
    if (!workSessionId || !currentUserId) return;
    
    try {
      const sessionRef = doc(db, 'workSessions', workSessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (sessionDoc.exists()) {
        const sessionData = sessionDoc.data();
        const currentStepOperators = sessionData.stepOperators || {};
        
        const currentOperators = currentStepOperators[stepIndex] || [];
        const operatorsArray = normalizeOperatorArray(currentOperators);
        const updatedOperators = operatorsArray.filter(userId => userId !== currentUserId);
        
        const updatedStepOperators = { ...currentStepOperators };
        
        if (updatedOperators.length === 0) {
          delete updatedStepOperators[stepIndex];
        } else {
          updatedStepOperators[stepIndex] = updatedOperators;
        }
        
        await updateDoc(sessionRef, {
          stepOperators: updatedStepOperators,
          lastUpdated: serverTimestamp()
        });
        
        console.log(`🔓 Released step ${stepIndex} ownership for user ${currentUserId}`);
      }
    } catch (error) {
      console.error('❌ Error releasing step ownership:', error);
    }
  }, [workSessionId, currentUserId, normalizeOperatorArray]);

  const setupRealtimeListeners = useCallback((sessionId) => {
    console.log('🔗 Setting up real-time listeners for session:', sessionId);
    
    if (sessionUnsubRef.current) {
      sessionUnsubRef.current();
      sessionUnsubRef.current = null;
    }
    
    const sessionRef = doc(db, 'workSessions', sessionId);
    const unsubscribe = onSnapshot(sessionRef, (doc) => {
      if (doc.exists()) {
        const sessionData = doc.data();
        const now = Date.now();
        
        if (now - lastSyncRef.current < 500) {
          console.log('⏭ Skipping rapid sync update');
          return;
        }
        lastSyncRef.current = now;
        
        console.log('📡 Real-time session update received:', sessionData.currentStep);
        
        setActiveWorkSession({ id: doc.id, data: sessionData });
        setSessionParticipants(sessionData.participants || []);
        
        const normalizedStepOperators = {};
        Object.entries(sessionData.stepOperators || {}).forEach(([stepIndex, operators]) => {
          normalizedStepOperators[stepIndex] = normalizeOperatorArray(operators);
        });
        setStepOperators(normalizedStepOperators);

        const currentStepOperators = normalizedStepOperators[currentStep] || [];
        const isCurrentUserWorking = currentStepOperators.includes(currentUserId) && isRunning;
        
        if (!isCurrentUserWorking) {
          setCurrentStep(prev => {
            const newStep = sessionData.currentStep || 0;
            if (prev !== newStep) {
              console.log(`🔄 Step synced from ${prev} to ${newStep}`);
              setShowSyncNotification(true);
              setTimeout(() => setShowSyncNotification(false), 3000);
              return newStep;
            }
            return prev;
          });
        }
        
        setStepStatuses(sessionData.stepStatuses || []);
        setStepCompletionTimes(sessionData.stepCompletionTimes || []);
        
        if (!isRunning || !isCurrentUserWorking) {
          setTotalTime(sessionData.totalTime || 0);
        }
        
        setTroubleshootHistory(sessionData.troubleshootHistory || []);
        
        if (!sessionData.isActive && sessionData.status === 'completed') {
          console.log('🎉 Session completed, showing completion modal');
          setIsRunning(false);
          setShowCompletion(true);
        }
        
      } else {
        console.log('📡 Session document no longer exists');
        setActiveWorkSession(null);
      }
    }, (error) => {
      console.error('❌ Real-time session listener error:', error);
    });
    
    sessionUnsubRef.current = unsubscribe;
    return unsubscribe;
  }, [isRunning, currentStep, currentUserId, normalizeOperatorArray]);

  // ========================================================================================
  // ENHANCED TASK EXECUTION FUNCTIONS (CONCURRENT MODE)
  // ========================================================================================
  
  // ENHANCED: Start step for concurrent mode
  const startStepConcurrent = useCallback(async () => {
    if (!selectedTask || !workSessionId || !currentUserId) return;

    console.log('🚀 Starting step in concurrent mode with coordination');
    try {
      const claimed = await claimStepOwnership(currentStep);
      if (!claimed) {
        console.error('❌ Failed to claim step ownership');
        return;
      }

      setIsRunning(true);
      setStepTime(0);
      setShowStopNotification(false);
      setAutoStopTriggered(false);
      setTargetTimeWarningShown(false);

      const newStepStatuses = [...stepStatuses];
      if (newStepStatuses[currentStep] !== STEP_STATUS.IN_PROGRESS) {
        newStepStatuses[currentStep] = STEP_STATUS.IN_PROGRESS;
        setStepStatuses(newStepStatuses);
      }

      const sessionRef = doc(db, 'workSessions', workSessionId);
      await updateDoc(sessionRef, {
        currentStep: currentStep,
        stepStatuses: newStepStatuses,
        [`stepStartedBy.${currentStep}.${currentUserId}`]: {
          userId: currentUserId,
          userName: currentUserName,
          startedAt: Timestamp.now(),
          individualStepTime: 0
        },
        operatorId: currentUserId,
        operatorName: currentUserName,
        lastUpdated: serverTimestamp()
      });

      // Add auto-note for starting work
      const startNote = {
        id: `start_${currentUserId}_${Date.now()}`,
        userId: currentUserId,
        userName: currentUserName,
        note: `🚀 Saya mulai mengerjakan step ini`,
        timestamp: Timestamp.now(),
        stepIndex: currentStep,
        stepTitle: activeStep?.title || `Step ${currentStep + 1}`,
        isSystemNote: true
      };
      
      // Add start note to coordination
      const currentStepNotes = activeWorkSession?.data.stepNotes?.[currentStep] || [];
      const notesArray = Array.isArray(currentStepNotes) ? currentStepNotes : [];
      const updatedNotes = [...notesArray, startNote];
      
      await updateDoc(sessionRef, {
        [`stepNotes.${currentStep}`]: updatedNotes
      });

      console.log(`▶️ ${currentUserName} joined step ${currentStep + 1} with coordination note`);

    } catch (error) {
      console.error('❌ Error starting step in concurrent mode:', error);
      setIsRunning(false);
    }
  }, [selectedTask, workSessionId, currentStep, stepStatuses, claimStepOwnership, currentUserId, currentUserName, activeStep, activeWorkSession]);

  // ENHANCED: Complete step function for concurrent mode
  const completeStepConcurrent = useCallback(async () => {
    if (!selectedTask || !workSessionId || !currentUserId) return;
    
    // Check if user can complete the step
    if (!canCompleteStep()) {
      // Show notification to coordinate with team first
      showNotification('Koordinasi dengan tim terlebih dahulu sebelum menyelesaikan step ini', 'warning');
      setShowStepNotesModal(true);
      return;
    }

    try {
      setIsRunning(false);
      
      const newStepStatuses = [...stepStatuses];
      newStepStatuses[currentStep] = STEP_STATUS.COMPLETED;
      setStepStatuses(newStepStatuses);
      
      const newCompletionTimes = [...stepCompletionTimes];
      newCompletionTimes[currentStep] = stepTime;
      setStepCompletionTimes(newCompletionTimes);

      const newTotalTime = totalTime + stepTime;
      setTotalTime(newTotalTime);

      const newStepTimes = [...(activeWorkSession?.data.stepTimes || new Array(steps.length).fill(0))];
      newStepTimes[currentStep] = stepTime;

      const nextStep = currentStep + 1;
      const isTaskCompleted = nextStep >= steps.length;

      const sessionRef = doc(db, 'workSessions', workSessionId);
      const updateData = {
        currentStep: isTaskCompleted ? currentStep : nextStep,
        stepStatuses: newStepStatuses,
        stepCompletionTimes: newCompletionTimes,
        stepTimes: newStepTimes,
        totalTime: newTotalTime,
        [`stepCompletedBy.${currentStep}`]: {
          userId: currentUserId,
          userName: currentUserName,
          completedAt: Timestamp.now(),
          completionTime: stepTime,
          // CONCURRENT MODE: Track who was working when completed
          activeOperators: normalizeOperatorArray(stepOperators[currentStep] || []),
          teamSize: normalizeOperatorArray(stepOperators[currentStep] || []).length
        },
        operatorId: currentUserId,
        operatorName: currentUserName || 'Unknown User',
        status: isTaskCompleted ? 'completed' : 'in_progress',
        lastUpdated: serverTimestamp()
      };

      // CONCURRENT MODE: Clear operators for this step since it's completed
      const updatedStepOperators = { ...stepOperators };
      delete updatedStepOperators[currentStep];
      updateData.stepOperators = updatedStepOperators;

      if (isTaskCompleted) {
        const finalEfficiency = calculateEfficiency(newTotalTime, totalTargetTime);
        
        updateData.isActive = false;
        updateData.completedAt = Timestamp.now();
        updateData.endTime = Timestamp.now();
        updateData.finalStepStatuses = newStepStatuses;
        updateData.finalTotalTime = newTotalTime;
        updateData.finalEfficiency = finalEfficiency;
        
        updateData.finalData = {
          targetTime: totalTargetTime,
          totalTargetTime: totalTargetTime,
          actualTime: newTotalTime,
          efficiency: finalEfficiency,
          stepStatuses: newStepStatuses,
          stepTimes: newStepTimes,
          stepCompletionTimes: newCompletionTimes,
          stepTargetTimes: activeWorkSession?.data.stepTargetTimes || [],
          totalTime: newTotalTime,
          troubleshootHistory: troubleshootHistory || [],
          completedAt: Timestamp.now(),
          operatorId: currentUserId,
          operatorName: currentUserName || 'Unknown User',
          sessionParticipants: allSessionParticipants.length,
          teamWork: allSessionParticipants.length > 1,
          completedBy: currentUserName || 'Unknown User',
          taskId: selectedTask.id,
          moNumber: selectedTask.moNumber,
          moDisplay: selectedTask.moDisplay,
          workInstructionTitle: selectedTask.title,
          // CONCURRENT MODE: Enhanced analytics
          concurrentModeStats: {
            totalOperators: allSessionParticipants.length,
            stepsWithMultipleOperators: Object.values(stepOperators).filter(ops => 
              normalizeOperatorArray(ops).length > 1
            ).length,
            averageOperatorsPerStep: Object.values(stepOperators).reduce((sum, ops) => 
              sum + normalizeOperatorArray(ops).length, 0
            ) / Math.max(Object.keys(stepOperators).length, 1)
          }
        };
        
        setShowCompletion(true);
        console.log('🎉 Task completed in concurrent mode with enhanced analytics!');
      } else {
        setCurrentStep(nextStep);
        setStepTime(0);
        await releaseStepOwnership(currentStep);
        setPopupShownForStep(prev => {
          const newSet = new Set(prev);
          newSet.delete(nextStep);
          return newSet;
        });
      }

      await updateDoc(sessionRef, updateData);
      
      // Add auto-note for completion
      const completionNote = {
        id: `completion_${currentUserId}_${Date.now()}`,
        userId: currentUserId,
        userName: currentUserName,
        note: `✅ Step ${currentStep + 1} telah saya selesaikan`,
        timestamp: Timestamp.now(),
        stepIndex: currentStep,
        stepTitle: activeStep?.title || `Step ${currentStep + 1}`,
        isSystemNote: true
      };
      
      // Add completion note to the step
      const currentStepNotes = activeWorkSession?.data.stepNotes?.[currentStep] || [];
      const notesArray = Array.isArray(currentStepNotes) ? currentStepNotes : [];
      const updatedNotes = [...notesArray, completionNote];
      
      await updateDoc(sessionRef, {
        [`stepNotes.${currentStep}`]: updatedNotes
      });
      
    } catch (error) {
      console.error('❌ Error completing step in concurrent mode:', error);
    }
  }, [
    selectedTask, 
    workSessionId, 
    currentStep, 
    stepStatuses, 
    stepCompletionTimes, 
    stepTime, 
    totalTime, 
    currentUserId, 
    currentUserName,
    releaseStepOwnership, 
    calculateEfficiency, 
    totalTargetTime, 
    activeWorkSession?.data, 
    troubleshootHistory, 
    allSessionParticipants, 
    steps.length,
    stepOperators,
    canCompleteStep,
    showNotification,
    activeStep,
    normalizeOperatorArray
  ]);

  const stopStep = useCallback(async () => {
    setIsRunning(false);
    setShowStopNotification(true);
    
    const newStepStatuses = [...stepStatuses];
    if (newStepStatuses[currentStep] === STEP_STATUS.IN_PROGRESS) {
      newStepStatuses[currentStep] = STEP_STATUS.PENDING;
      setStepStatuses(newStepStatuses);
    }

    if (workSessionId && currentUserId) {
      try {
        await releaseStepOwnership(currentStep);
        
        const sessionRef = doc(db, 'workSessions', workSessionId);
        await updateDoc(sessionRef, {
          stepStatuses: newStepStatuses,
          totalTime: totalTime,
          [`stepStoppedBy.${currentStep}`]: {
            userId: currentUserId,
            userName: currentUserName,
            stoppedAt: Timestamp.now(),
            stoppedAtTime: stepTime
          },
          lastUpdated: serverTimestamp()
        });
      } catch (error) {
        console.error('❌ Error updating stop in session:', error);
      }
    }
    
    setTimeout(() => {
      setShowStopNotification(false);
    }, 2000);
    
    console.log('⏸️ Step stopped with real-time sync');
  }, [currentStep, stepStatuses, totalTime, stepTime, workSessionId, releaseStepOwnership, currentUserId, currentUserName]);

  const skipStep = useCallback(async (reason = '') => {
    if (!selectedTask || !workSessionId || !currentUserId) return;

    try {
      const newStepStatuses = [...stepStatuses];
      newStepStatuses[currentStep] = STEP_STATUS.SKIPPED;
      setStepStatuses(newStepStatuses);
      
      const newCompletionTimes = [...stepCompletionTimes];
      newCompletionTimes[currentStep] = 0;
      setStepCompletionTimes(newCompletionTimes);

      const newStepTimes = [...(activeWorkSession?.data.stepTimes || new Array(steps.length).fill(0))];
      newStepTimes[currentStep] = 0;

      const nextStep = currentStep + 1;
      const isTaskCompleted = nextStep >= steps.length;

      const sessionRef = doc(db, 'workSessions', workSessionId);
      const updateData = {
        currentStep: isTaskCompleted ? currentStep : nextStep,
        stepStatuses: newStepStatuses,
        stepCompletionTimes: newCompletionTimes,
        stepTimes: newStepTimes,
        totalTime: totalTime,
        [`stepSkippedBy.${currentStep}`]: {
          userId: currentUserId,
          userName: currentUserName || 'Unknown User',
          skippedAt: Timestamp.now(),
          reason: reason,
          skippedAtTime: stepTime
        },
        operatorId: currentUserId,
        operatorName: currentUserName || 'Unknown User',
        lastUpdated: serverTimestamp()
      };

      setIsRunning(false);
      setStepTime(0);
      await releaseStepOwnership(currentStep);
      
      if (isTaskCompleted) {
        const finalEfficiency = calculateEfficiency(totalTime, totalTargetTime);
        updateData.isActive = false;
        updateData.status = 'completed';
        updateData.completedAt = Timestamp.now();
        updateData.endTime = Timestamp.now();
        updateData.finalEfficiency = finalEfficiency;
        updateData.finalTotalTime = totalTime;
        updateData.finalStepStatuses = newStepStatuses;
        updateData.finalData = {
          targetTime: totalTargetTime,
          efficiency: finalEfficiency,
          stepStatuses: newStepStatuses,
          stepTimes: newStepTimes,
          totalTime: totalTime,
          troubleshootHistory: troubleshootHistory || [],
          operatorName: currentUserName || 'Unknown User',
          completedBy: currentUserName || 'Unknown User'
        };
        setShowCompletion(true);
      } else {
        setCurrentStep(nextStep);
        setPopupShownForStep(prev => {
          const newSet = new Set(prev);
          newSet.delete(nextStep);
          return newSet;
        });
      }

      await updateDoc(sessionRef, updateData);
      
      console.log(`⭐ Step ${currentStep + 1} skipped by: ${currentUserName}`);
      
    } catch (error) {
      console.error('❌ Error skipping step:', error);
    }
  }, [
    selectedTask, 
    workSessionId, 
    currentStep, 
    stepStatuses, 
    stepCompletionTimes, 
    stepTime, 
    totalTime, 
    currentUserId, 
    currentUserName,
    releaseStepOwnership, 
    activeWorkSession?.data, 
    steps.length, 
    calculateEfficiency, 
    totalTargetTime, 
    troubleshootHistory
  ]);

  const resetTask = useCallback(async () => {
    setIsRunning(false);
    setCurrentStep(0);
    setStepTime(0);
    setTotalTime(0);
    setShowCompletion(false);
    setStepCompletionTimes([]);
    setShowStopNotification(false);
    setTroubleshootHistory([]);
    setPopupShownForStep(new Set());
    
    if (selectedTask && workSessionId && currentUserId) {
      const initialStatuses = steps.map(() => STEP_STATUS.PENDING);
      setStepStatuses(initialStatuses);
      
      try {
        const sessionRef = doc(db, 'workSessions', workSessionId);
        await updateDoc(sessionRef, {
          currentStep: 0,
          stepStatuses: initialStatuses,
          stepCompletionTimes: new Array(steps.length).fill(0),
          stepTimes: new Array(steps.length).fill(0),
          totalTime: 0,
          stepOperators: {},
          troubleshootHistory: [],
          stepCompletedBy: {},
          stepStartedBy: {},
          stepSkippedBy: {},
          stepStoppedBy: {},
          stepNotes: {},
          resetBy: {
            userId: currentUserId,
            userName: currentUserName,
            resetAt: Timestamp.now()
          },
          operatorId: currentUserId,
          operatorName: currentUserName,
          status: 'in_progress',
          isActive: true,
          finalData: null,
          finalEfficiency: 0,
          lastUpdated: serverTimestamp()
        });
        
        console.log('🔄 Task reset with clean slate and AdminPage compatibility');
      } catch (error) {
        console.error('❌ Error resetting task in session:', error);
      }
    }
  }, [selectedTask, workSessionId, steps, currentUserId, currentUserName]);

  const goToStep = useCallback(async (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
      setStepTime(0);
      setIsRunning(false);
      setAutoStopTriggered(false);
      setTargetTimeWarningShown(false);
      
      setPopupShownForStep(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepIndex);
        return newSet;
      });
      
      if (workSessionId) {
        try {
          const sessionRef = doc(db, 'workSessions', workSessionId);
          await updateDoc(sessionRef, {
            currentStep: stepIndex,
            [`stepNavigatedBy.${stepIndex}`]: {
              userId: currentUserId,
              userName: currentUserName,
              navigatedAt: Timestamp.now(),
              fromStep: currentStep
            },
            operatorId: currentUserId,
            operatorName: currentUserName,
            lastUpdated: serverTimestamp()
          });
        } catch (error) {
          console.error('❌ Error updating step navigation:', error);
        }
      }
      
      console.log(`🎯 Moved to step ${stepIndex + 1}`);
    }
  }, [steps.length, currentStep, workSessionId, currentUserId, currentUserName]);

  // ========================================================================================
  // SESSION HANDLERS
  // ========================================================================================
  const handleJoinSession = useCallback(async (session) => {
    if (!currentUserId || !currentUserName) {
      console.error('❌ Cannot join session: missing user info');
      return;
    }
    
    try {
      setIsJoiningSession(true);
      
      await addParticipantToSession(session.id, {
        userId: currentUserId,
        userName: currentUserName,
        joinedAt: Timestamp.now(),
        isActive: true,
        role: 'participant'
      });
      
      setWorkSessionId(session.id);
      setActiveWorkSession(session);
      
      const sessionData = session.data;
      setCurrentStep(sessionData.currentStep || 0);
      setStepStatuses(sessionData.stepStatuses || []);
      setStepCompletionTimes(sessionData.stepCompletionTimes || []);
      setTotalTime(sessionData.totalTime || 0);
      setTroubleshootHistory(sessionData.troubleshootHistory || []);
      setStepOperators(sessionData.stepOperators || {});
      setSessionParticipants(sessionData.participants || []);
      
      setIsRunning(false);
      setStepTime(0);
      setShowJoinSessionModal(false);
      
      setupRealtimeListeners(session.id);
      setIsJoiningSession(false);
      
      console.log('🤝 Successfully joined session with name:', currentUserName);
      
    } catch (error) {
      console.error('❌ Error joining session:', error);
      setIsJoiningSession(false);
      setShowJoinSessionModal(false);
    }
  }, [currentUserId, currentUserName, addParticipantToSession, setupRealtimeListeners]);

  const handleCreateNewSession = useCallback(async () => {
    if (!selectedTask || !currentUserId) return;

    try {
      setIsJoiningSession(true);
      
      const session = await createNewWorkSession(selectedTask);
      setWorkSessionId(session.id);
      setActiveWorkSession(session);
      
      const initialStatuses = steps.map(() => STEP_STATUS.PENDING);
      setStepStatuses(initialStatuses);
      setCurrentStep(0);
      setTotalTime(0);
      setStepCompletionTimes([]);
      setTroubleshootHistory([]);
      setStepOperators({});
      setSessionParticipants(session.data.participants || []);
      setPopupShownForStep(new Set());
      
      setupRealtimeListeners(session.id);
      
      setShowJoinSessionModal(false);
      setIsJoiningSession(false);
      
      console.log('🆕 Created and joined new session with AdminPage compatibility');
    } catch (error) {
      console.error('❌ Error creating new session:', error);
      setIsJoiningSession(false);
    }
  }, [selectedTask, steps, createNewWorkSession, setupRealtimeListeners, currentUserId]);

  const handleBackToMOSelection = useCallback(() => {
    cleanup();
    if (workSessionId && currentUserId) {
      removeParticipantFromSession(workSessionId);
    }
    navigate('/mo-selection');
  }, [navigate, workSessionId, currentUserId, removeParticipantFromSession, cleanup]);

  // ========================================================================================
  // MODAL HANDLERS
  // ========================================================================================
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

  const handleShowSkipModal = useCallback(() => {
    setShowSkipModal(true);
  }, []);

  const handleConfirmSkip = useCallback((reason) => {
    skipStep(reason);
    setShowSkipModal(false);
    setManualName('');
  }, [skipStep]);

  const handleCancelSkip = useCallback(() => {
    setShowSkipModal(false);
    setManualName('');
  }, []);

  const handleCloseAutoStopWarning = useCallback(() => {
    setShowAutoStopWarning(false);
  }, []);

  const handleContinueManual = useCallback(() => {
    setIsRunning(true);
    setShowAutoStopWarning(false);
    setAutoStopTriggered(false);
    
    const newStepStatuses = [...stepStatuses];
    newStepStatuses[currentStep] = STEP_STATUS.IN_PROGRESS;
    setStepStatuses(newStepStatuses);
    
    console.log('⏱️ Timer continued manually despite exceeding target time');
  }, [stepStatuses, currentStep]);

  const handleToggleAutoStop = useCallback(() => {
    setAutoStopEnabled(prev => !prev);
  }, []);

  const handleShowTroubleshoot = useCallback(() => {
    setShowTroubleshootModal(true);
  }, []);

  const handleCloseTroubleshoot = useCallback(() => {
    setShowTroubleshootModal(false);
  }, []);

  const handleShowStepNotes = useCallback(() => {
    setShowStepNotesModal(true);
  }, []);

  const handleSaveStepNotes = useCallback(async (noteText) => {
    if (!workSessionId || !currentUserId || !noteText.trim()) return;

    try {
      const newNote = {
        id: `note_${currentUserId}_${Date.now()}`,
        userId: currentUserId,
        userName: currentUserName,
        note: noteText.trim(),
        timestamp: Timestamp.now(),
        stepIndex: currentStep,
        stepTitle: activeStep?.title || `Step ${currentStep + 1}`,
        isSystemNote: false
      };

      const sessionRef = doc(db, 'workSessions', workSessionId);
      const currentStepNotes = activeWorkSession?.data.stepNotes?.[currentStep] || [];
      const notesArray = Array.isArray(currentStepNotes) ? currentStepNotes : [];
      const updatedNotes = [...notesArray, newNote];

      await updateDoc(sessionRef, {
        [`stepNotes.${currentStep}`]: updatedNotes,
        lastUpdated: serverTimestamp()
      });

      setCurrentStepNotes('');
      setShowStepNotesModal(false);
      
      console.log(`📝 Step note saved by ${currentUserName}: ${noteText.slice(0, 50)}...`);
      showNotification('Catatan langkah disimpan', 'success');
      
    } catch (error) {
      console.error('❌ Error saving step notes:', error);
      showNotification('Gagal menyimpan catatan', 'error');
    }
  }, [workSessionId, currentUserId, currentUserName, currentStep, activeStep, activeWorkSession]);

  const addTroubleshootHistory = useCallback(async (entry) => {
    const newEntry = {
      ...entry,
      id: Date.now(),
      stepIndex: currentStep,
      stepTitle: activeStep?.title,
      userId: currentUserId,
      userName: currentUserName,
      timestamp: Date.now()
    };
    
    setTroubleshootHistory(prev => [...prev, newEntry]);
    
    if (workSessionId) {
      try {
        const sessionRef = doc(db, 'workSessions', workSessionId);
        const sessionDoc = await getDoc(sessionRef);
        if (sessionDoc.exists()) {
          const currentHistory = sessionDoc.data().troubleshootHistory || [];
          await updateDoc(sessionRef, {
            troubleshootHistory: [...currentHistory, newEntry],
            lastUpdated: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('❌ Error syncing troubleshoot history:', error);
      }
    }
  }, [currentStep, activeStep?.title, currentUserId, currentUserName, workSessionId]);

  const getSkippedSteps = useCallback(() => {
    return stepStatuses
      .map((status, index) => ({ status, index }))
      .filter(item => item.status === STEP_STATUS.SKIPPED);
  }, [stepStatuses]);

  // ========================================================================================
  // CONCURRENT MODE UI COMPONENTS
  // ========================================================================================
  
  // NEW: Coordination status component
  const CoordinationStatus = ({ stepIndex }) => {
    const operators = normalizeOperatorArray(stepOperators[stepIndex] || []);
    const notes = getStepNotes(stepIndex);
    const recentActivity = notes.slice(0, 3); // Last 3 notes
    
    if (operators.length === 0 && stepStatuses[stepIndex] === STEP_STATUS.PENDING) {
      return (
        <div className="coordination-status idle">
          <span className="status-icon">⏸️</span>
          <span className="status-text">Belum ada yang mengerjakan</span>
        </div>
      );
    }
    
    if (operators.length === 1) {
      const operator = allSessionParticipants.find(p => p.userId === operators[0]);
      return (
        <div className="coordination-status single">
          <span className="status-icon">👤</span>
          <span className="status-text">
            {operator?.userName || 'Unknown'} sedang bekerja
            {operators[0] === currentUserId && ' (Anda)'}
          </span>
        </div>
      );
    }
    
    if (operators.length > 1) {
      return (
        <div className="coordination-status multiple">
          <span className="status-icon">👥</span>
          <span className="status-text">
            {operators.length} operator berkolaborasi
          </span>
          <div className="recent-activity">
            {recentActivity.length > 0 && (
              <small className="last-activity">
                Terakhir: {recentActivity[0].userName} - {recentActivity[0].note?.slice(0, 30)}...
              </small>
            )}
          </div>
        </div>
      );
    }
    
    return null;
  };

  // ENHANCED: Control buttons logic for concurrent mode
  const renderControlButtons = () => {
    const currentStepOperators = normalizeOperatorArray(stepOperators[currentStep] || []);
    const isCurrentUserWorking = currentStepOperators.includes(currentUserId);
    const multipleOperators = currentStepOperators.length > 1;
    const canComplete = canCompleteStep();
    
    return (
      <ControlButtons 
        isRunning={isRunning}
        showStopNotification={showStopNotification}
        stepStatus={stepStatuses[currentStep]}
        isLastStep={isLastStep}
        onStartStep={startStepConcurrent} // Use concurrent version
        onStopStep={stopStep}
        onCompleteStep={() => {
          // CONCURRENT MODE: Smart completion logic
          if (multipleOperators && shouldPromptForCompletion()) {
            // Prompt user to coordinate first
            const confirmComplete = window.confirm(
              `Ada ${currentStepOperators.length} operator bekerja di step ini. ` +
              `Apakah Anda yakin step ini sudah selesai? ` +
              `Sebaiknya koordinasi dengan tim terlebih dahulu melalui catatan kolaborasi.`
            );
            if (!confirmComplete) {
              setShowStepNotesModal(true);
              return;
            }
          }
          completeStepConcurrent(); // Use concurrent version
        }}
        onShowSkipModal={handleShowSkipModal}
        onReset={resetTask}
        hasSelectedInstruction={!!selectedInstruction}
        onShowTroubleshoot={handleShowTroubleshoot}
        onShowStepNotes={handleShowStepNotes}
        autoStopEnabled={autoStopEnabled}
        onToggleAutoStop={handleToggleAutoStop}
        canControlStep={true}
        isTeamMode={true}
        stepOperators={stepOperators}
        sessionParticipants={allSessionParticipants}
        currentStep={currentStep}
        currentUserId={currentUserId}
        // CONCURRENT MODE: Additional props
        multipleOperators={multipleOperators}
        isCurrentUserWorking={isCurrentUserWorking}
        canComplete={canComplete}
        totalOperators={currentStepOperators.length}
      />
    );
  };

  // NEW: Enhanced step navigator for concurrent mode
  const renderStepNavigator = () => {
    return (
      <StepNavigator 
        stepStatuses={stepStatuses}
        currentStep={currentStep}
        steps={steps}
        onGoToStep={goToStep}
        isTeamMode={true}
        stepOperators={stepOperators}
        sessionParticipants={allSessionParticipants}
        currentUserId={currentUserId}
        // CONCURRENT MODE: Enhanced display
        showOperatorCount={true}
        showCoordinationStatus={true}
        getStepNotes={getStepNotes}
      />
    );
  };

  // ========================================================================================
  // EFFECTS
  // ========================================================================================
  
  // Auth state management
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.exists() ? userDoc.data() : {};
          
          const displayName = userData.displayName || 
                            user.displayName || 
                            user.email?.split('@')[0] || 
                            'Anonymous User';
          
          setAuthState({
            currentUser: user,
            currentUserId: user.uid,
            currentUserName: displayName,
            userRole: userData.role || 'user',
            isLoading: false
          });
          
          console.log('🔐 Auth state updated:', { uid: user.uid, name: displayName });
          
        } catch (error) {
          console.error('Error fetching user data:', error);
          setAuthState({
            currentUser: user,
            currentUserId: user.uid,
            currentUserName: user.displayName || user.email?.split('@')[0] || 'Anonymous User',
            userRole: 'user',
            isLoading: false
          });
        }
      } else {
        setAuthState({
          currentUser: null,
          currentUserId: null,
          currentUserName: null,
          userRole: null,
          isLoading: false
        });
        navigate('/login');
      }
    });
    
    return unsubscribe;
  }, [navigate]);

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setStepTime(prevTime => {
          const newStepTime = prevTime + 1;
          
          if (newStepTime % 30 === 0 && workSessionId) {
            const sessionRef = doc(db, 'workSessions', workSessionId);
            updateDoc(sessionRef, {
              [`currentStepTime.${currentStep}`]: newStepTime,
              totalTime: totalTime + newStepTime,
              lastUpdated: serverTimestamp()
            }).catch(error => {
              console.error('❌ Error syncing step time:', error);
            });
          }
          
          return newStepTime;
        });
        
        setTotalTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isRunning, workSessionId, currentStep, totalTime]);

  // Auto-stop timer effect
  useEffect(() => {
    if (isRunning && autoStopEnabled && currentStepTargetTime > 0) {
      if (stepTime >= currentStepTargetTime && !autoStopTriggered) {
        console.log(`⏰ Auto-stop triggered: Step time ${stepTime}s exceeded target ${currentStepTargetTime}s`);
        
        setAutoStopTriggered(true);
        setShowAutoStopWarning(true);
        setIsRunning(false);
        
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

  // Initialize task
  useEffect(() => {
    if (authLoading || !currentUserId) {
      return;
    }

    if (selectedTask && selectedTask.steps) {
      console.log('🎯 Initializing task execution:', selectedTask);
      
      const instruction = {
        id: selectedTask.id,
        title: selectedTask.title,
        steps: selectedTask.steps
      };
      
      setSelectedInstruction(instruction);
      setSteps(selectedTask.steps);
      
      if (!workSessionId) {
        findExistingActiveSessions(selectedTask)
          .then(existingSessions => {
            console.log('🔍 Session check result:', existingSessions.length, 'active sessions found');
            
            if (existingSessions.length > 0) {
              const mostRecentSession = existingSessions.reduce((latest, current) => {
                const latestTime = latest.data.lastUpdated?.toMillis() || 0;
                const currentTime = current.data.lastUpdated?.toMillis() || 0;
                return currentTime > latestTime ? current : latest;
              });

              const isAlreadyParticipant = mostRecentSession.data.participants?.some(
                p => p.userId === currentUserId && p.isActive
              );

              if (isAlreadyParticipant) {
                console.log('🤝 User is already participant, auto-joining...');
                handleJoinSession(mostRecentSession);
              } else {
                setActiveWorkSession(mostRecentSession);
                setShowJoinSessionModal(true);
              }
            } else {
              handleCreateNewSession();
            }
          })
          .catch(error => {
            console.error('❌ Error checking existing sessions:', error);
            setError('Failed to check existing work sessions');
          });
      }
    }
  }, [selectedTask, authLoading, currentUserId, workSessionId, findExistingActiveSessions, handleCreateNewSession, handleJoinSession]);

  // Handle case where no task is provided
  useEffect(() => {
    if (!selectedTask && !authLoading) {
      console.warn('⚠️ No task data found');
      
      const referrer = document.referrer;
      const fromMOSelection = referrer.includes('/mo-selection') || 
                             location.state?.fromMOSelection;
      
      if (!fromMOSelection) {
        console.log('🔄 Direct access detected, redirecting to MO selection');
        navigate('/mo-selection', { 
          state: { 
            message: 'Silakan pilih tugas terlebih dahulu' 
          } 
        });
      }
    }
  }, [selectedTask, navigate, location.state, authLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // ========================================================================================
  // RENDER CONDITIONS
  // ========================================================================================
  if (authLoading || !currentUserId) {
    return <LoadingOverlay message="Memuat data autentikasi..." />;
  }

  if (!selectedTask) {
    return <LoadingOverlay message="Memuat data tugas..." />;
  }

  if (!selectedInstruction || steps.length === 0) {
    return <LoadingOverlay message="Memuat instruksi kerja..." />;
  }

  // ========================================================================================
  // MAIN RENDER
  // ========================================================================================
  return (
    <div className="task-page">
      {/* HEADER */}
      <TaskHeader 
        workInstructionTitle={selectedInstruction.title} 
        moNumber={selectedTask.moNumber}
        moDisplay={selectedTask.moDisplay}
        onEditMONumber={handleBackToMOSelection}
      />
      
      {/* MULTI-USER STATUS BAR */}
      {activeWorkSession && sessionParticipants.length > 1 && (
        <div className="multi-user-status">
          <div className="participants-info">
            <span className="participants-label">
              👥 Tim Aktif ({sessionParticipants.filter(p => p.isActive).length}):
            </span>
            {sessionParticipants
              .filter(p => p.isActive)
              .map(participant => (
                <span 
                  key={participant.userId} 
                  className={`participant ${participant.userId === currentUserId ? 'current-user' : ''}`}
                >
                  {participant.userName}
                  {normalizeOperatorArray(stepOperators[currentStep]).includes(participant.userId) && ' 🎯'}
                  {participant.userId === activeWorkSession?.data.createdBy && ' 👑'}
                </span>
              ))
            }
          </div>
          
          {normalizeOperatorArray(stepOperators[currentStep]).length > 0 && (
            <div className="step-ownership-info">
              ⚡ Step {currentStep + 1} sedang dikerjakan oleh{" "}
              <strong>
                {normalizeOperatorArray(stepOperators[currentStep])
                  .map(userId => sessionParticipants.find(p => p.userId === userId)?.userName || "operator lain")
                  .join(", ")}
              </strong>
            </div>
          )}
          
          {totalTargetTime > 0 && (
            <div className="efficiency-info">
              🎯 Target waktu total: {formatTime(totalTargetTime)} | 
              Saat ini: {formatTime(totalTime)}
            </div>
          )}
          
          <div className="sync-status">
            🔄 Sinkronisasi real-time aktif | 
            Terakhir update: {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* PROGRESS BAR */}
      <TaskProgressBar 
        completedSteps={completedStepsCount}
        totalSteps={steps.length}
      />

      {/* TIMER DISPLAY */}
      <TimerDisplay 
        totalTime={totalTime}
        stepTime={stepTime}
        targetTime={currentStepTargetTime}
        showWarning={showTargetTimeWarning}
        isOverTarget={isOverTargetTime}
      />

      {/* ENHANCED STEP NAVIGATOR WITH CONCURRENT MODE */}
      {renderStepNavigator()}

      {/* CONCURRENT MODE: COORDINATION STATUS FOR CURRENT STEP */}
      {sessionParticipants.length > 1 && (
        <div className="concurrent-mode-status">
          <h4>STATUS KOLABORASI STEP {currentStep + 1}</h4>
          <CoordinationStatus stepIndex={currentStep} />
          
          {/* Show recent notes for coordination */}
          {getStepNotes(currentStep).length > 0 && (
            <div className="step-coordination-preview">
              <h5>💬 Komunikasi Tim Terbaru:</h5>
              <div className="recent-notes">
                {getStepNotes(currentStep).slice(0, 3).map((note, index) => (
                  <div key={note.id || index} className="coordination-note">
                    <span className="note-author">{note.userName}:</span>
                    <span className="note-text">{note.note}</span>
                    <span className="note-time">
                      {note.timestamp?.toDate?.()?.toLocaleTimeString() || 'Unknown time'}
                    </span>
                  </div>
                ))}
              </div>
              {getStepNotes(currentStep).length > 3 && (
                <button 
                  onClick={handleShowStepNotes}
                  className="view-all-notes-btn"
                >
                  Lihat semua catatan ({getStepNotes(currentStep).length})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* IMAGE PRELOADER */}
      {allStepImages && allStepImages.length > 0 && (
        <ImagePreloader 
          images={allStepImages}
          onImagesLoaded={handleImagesLoaded}
        />
      )}

      {/* STEP CONTENT */}
      <StepContent 
        activeStep={activeStep}
        stepStatus={stepStatuses[currentStep]}
        stepImages={stepImages}
        currentStep={currentStep}
        isCollaborativeMode={normalizeOperatorArray(stepOperators[currentStep]).length > 1}
        stepNotes={getStepNotes(currentStep)}
        activeOperators={normalizeOperatorArray(stepOperators[currentStep])}
        sessionParticipants={allSessionParticipants}
        currentUserId={currentUserId}
      />

      {/* ENHANCED CONTROL BUTTONS WITH CONCURRENT MODE */}
      {renderControlButtons()}

      {/* ======================================================================================== */}
      {/* MODALS */}
      {/* ======================================================================================== */}

      {/* JOIN SESSION MODAL */}
      {showJoinSessionModal && activeWorkSession && (
        <div className="modal-overlay">
          <div className="modal-content join-session-modal">
            <h3>Sesi Kerja Aktif Ditemukan</h3>
            <p>Ada sesi kerja aktif untuk tugas ini dengan data lengkap:</p>
            
            <div className="session-info">
              <div className="session-basic-info">
                <p><strong>- MO:</strong> {selectedTask.moDisplay}</p>
                <p><strong>- Instruksi:</strong> {selectedTask.title}</p>
                <p><strong>- Step saat ini:</strong> {(activeWorkSession.data.currentStep || 0) + 1} dari {steps.length}</p>
                <p><strong>- Progress:</strong> {
                  activeWorkSession.data.stepStatuses?.filter(s => s === STEP_STATUS.COMPLETED).length || 0
                } / {steps.length} step selesai</p>
                <p><strong>- Total waktu:</strong> {formatTime(activeWorkSession.data.totalTime || 0)}</p>               
              </div>
              
              <div className="current-participants">
                <h4>👥 Operator aktif ({sessionParticipants.filter(p => p.isActive).length}):</h4>
                <ul>
                  {sessionParticipants
                    .filter(p => p.isActive)
                    .map(participant => (
                      <li key={participant.userId}>
                        👤 <strong>{participant.userName}</strong>
                        {participant.userId === activeWorkSession.data.createdBy && ' 👑 (Koordinator)'}
                        {normalizeOperatorArray(stepOperators[activeWorkSession.data.currentStep || 0]).includes(participant.userId) && ' 🎯 (Sedang bekerja)'}
                        <br />
                        <small>Bergabung: {participant.joinedAt?.toDate().toLocaleString()}</small>
                      </li>
                    ))
                  }
                </ul>
              </div>
              
              {normalizeOperatorArray(stepOperators[activeWorkSession.data.currentStep || 0]).length > 0 && (
                <div className="current-work-info">
                  <h4>🔧 Sedang dikerjakan:</h4>
                  <p><strong>Step {(activeWorkSession.data.currentStep || 0) + 1}:</strong> {
                    steps[activeWorkSession.data.currentStep || 0]?.title || 'Unknown Step'
                  }</p>
                  {steps[activeWorkSession.data.currentStep || 0]?.maxTime && (
                    <p><strong>Target waktu step:</strong> {formatTime(steps[activeWorkSession.data.currentStep || 0].maxTime)}</p>
                  )}
                </div>
              )}
              
              {activeWorkSession.data.troubleshootHistory?.length > 0 && (
                <div className="troubleshoot-info">
                  <p><strong>🔧 Troubleshoot:</strong> {activeWorkSession.data.troubleshootHistory.length} masalah telah ditangani</p>
                </div>
              )}
            </div>
            
            <div className="session-choices">
              <p><strong>Pilihan Anda:</strong></p>
              
              <div className="modal-actions">
                <button 
                  onClick={() => handleJoinSession(activeWorkSession)} 
                  className="task-btn task-btn-primary"
                  disabled={isJoiningSession}
                >
                  {isJoiningSession ? '⏳ Bergabung...' : '🤝 Bergabung dengan Tim'}
                </button>
                <button 
                  onClick={handleCreateNewSession} 
                  className="task-btn task-btn-secondary"
                  disabled={isJoiningSession}
                >
                  {isJoiningSession ? '⏳ Membuat...' : '🆕 Buat Sesi Terpisah'}
                </button>
              </div>
              
              <div className="session-choice-info">
                <small>
                  💡 <strong>Bergabung:</strong> Anda akan berkolaborasi dalam satu tim, sharing progress dan bisa mengerjakan step yang tersedia<br/>
                  💡 <strong>Sesi Terpisah:</strong> Anda akan memulai session baru terpisah untuk MO yang sama
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESUME PROGRESS MODAL */}
      {showResumeModal && existingProgress && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>📋 Progress Sebelumnya Ditemukan</h3>
            <p>
              Anda memiliki progress yang belum selesai pada tugas ini:
            </p>
            <div className="progress-info">
              <p><strong>MO:</strong> {selectedTask.moDisplay}</p>
              <p><strong>Instruksi:</strong> {selectedTask.title}</p>
              <p><strong>Langkah terakhir:</strong> {(existingProgress.currentStep || 0) + 1}</p>
              <p><strong>Total waktu:</strong> {formatTime(existingProgress.totalTime || 0)}</p>
            </div>
            <p>Apakah Anda ingin <strong>melanjutkan dari langkah tersebut</strong> atau <strong>memulai ulang dari awal?</strong></p>
            
            <div className="modal-actions">
              <button onClick={handleResumeProgress} className="task-btn task-btn-primary">
                ▶️ Lanjutkan dari Langkah {(existingProgress.currentStep || 0) + 1}
              </button>
              <button onClick={handleCreateNewSession} className="task-btn task-btn-secondary">
                🔄 Mulai dari Awal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SKIP STEP MODAL */}
      {showSkipModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>⭐ Lewati Langkah</h3>
            <p>Apakah Anda yakin ingin melewati langkah <strong>{currentStep + 1}</strong>?</p>
            <p className="step-info"><strong>Langkah:</strong> {activeStep?.title}</p>
            {currentStepTargetTime > 0 && (
              <p className="target-time-info">
                <strong>Target waktu:</strong> {formatTime(currentStepTargetTime)} | 
                <strong>Waktu saat ini:</strong> {formatTime(stepTime)}
              </p>
            )}
            
            {/* CONCURRENT MODE: Show team coordination warning */}
            {normalizeOperatorArray(stepOperators[currentStep]).length > 1 && (
              <div className="team-warning">
                <p><strong>⚠️ Peringatan Tim:</strong></p>
                <p>Ada {normalizeOperatorArray(stepOperators[currentStep]).length} operator yang sedang bekerja di step ini. 
                Pastikan Anda sudah berkoordinasi dengan tim sebelum melewati step ini.</p>
              </div>
            )}
            
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
                ✅ Ya, Lewati Langkah
              </button>
              <button onClick={handleCancelSkip} className="task-btn task-btn-secondary">
                ❌ Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENHANCED COMPLETION MODAL WITH CONCURRENT MODE STATS */}
      {showCompletion && (
        <div className="modal-overlay">
          <div className="modal-content completion-modal">
            <h3>🎉 Selamat! {sessionParticipants.length > 1 ? 'Tim' : 'Anda'} Berhasil Menyelesaikan Tugas!</h3>
            <p>
              {sessionParticipants.length > 1 
                ? `Tim ${sessionParticipants.length} operator telah menyelesaikan semua langkah dalam tugas ini!` 
                : 'Anda telah menyelesaikan semua langkah dalam tugas ini!'
              }
            </p>
            
            <div className="completion-summary">
              <h4>📊 Ringkasan Penyelesaian Lengkap (AdminPage Compatible):</h4>
              
              <div className="summary-basic">
                <p><strong>- MO:</strong> {selectedTask.moDisplay}</p>
                <p><strong>- Instruksi Kerja:</strong> {selectedTask.title}</p>
                <p><strong>- Total Waktu Kerja:</strong> {formatTime(totalTime)}</p>
                <p><strong>- Langkah Selesai:</strong> {completedStepsCount} dari {steps.length}</p>
                
                {totalTargetTime > 0 && (
                  <div className="efficiency-summary">
                    <p><strong>- Target Waktu Total:</strong> {formatTime(totalTargetTime)}</p>
                    <p><strong>- Selisih Waktu:</strong> {
                      totalTime <= totalTargetTime 
                        ? `${formatTime(totalTargetTime - totalTime)} lebih cepat`
                        : `${formatTime(totalTime - totalTargetTime)} melebihi target ⚠️`
                    }</p>
                  </div>
                )}
              </div>

              {/* CONCURRENT MODE: Enhanced team summary */}
              {sessionParticipants.length > 1 && (
                <div className="team-summary">
                  <h4>👥 Tim yang Berpartisipasi ({sessionParticipants.length} operator):</h4>
                  <ul>
                    {sessionParticipants.map(participant => {
                      const stepsCompleted = Object.values(activeWorkSession?.data.stepCompletedBy || {})
                        .filter(completion => completion.userId === participant.userId).length;
                      
                      const stepsStarted = Object.values(activeWorkSession?.data.stepStartedBy || {})
                        .filter(startData => Object.keys(startData).includes(participant.userId)).length;
                      
                      return (
                        <li key={participant.userId}>
                          👤 <strong>{participant.userName}</strong>
                          {participant.userId === activeWorkSession?.data.createdBy && ' 👑 (Koordinator)'}
                          {participant.userId === currentUserId && ' (Anda)'}
                          <br />
                          <small>
                            Menyelesaikan {stepsCompleted} step, bekerja di {stepsStarted} step | 
                            Bergabung: {participant.joinedAt?.toDate().toLocaleString()}
                          </small>
                        </li>
                      );
                    })}
                  </ul>
                  
                  {/* CONCURRENT MODE: Collaboration stats */}
                  <div className="collaboration-stats">
                    <h5>STATISTIK KOLABORASI:</h5>
                    <p><strong>- Step dengan multiple operator:</strong> {
                      Object.values(activeWorkSession?.data.stepOperators || {})
                        .filter(ops => normalizeOperatorArray(ops).length > 1).length
                    } dari {steps.length}</p>
                    <p><strong>- Rata-rata operator per step:</strong> {
                      (Object.values(activeWorkSession?.data.stepOperators || {})
                        .reduce((sum, ops) => sum + normalizeOperatorArray(ops).length, 0) / 
                       Math.max(Object.keys(activeWorkSession?.data.stepOperators || {}).length, 1)).toFixed(1)
                    }</p>
                    <p><strong>- Total catatan koordinasi:</strong> {
                      Object.values(activeWorkSession?.data.stepNotes || {})
                        .reduce((sum, notes) => sum + (Array.isArray(notes) ? notes.length : Object.keys(notes).length), 0)
                    }</p>
                  </div>
                </div>
              )}
              
              {getSkippedSteps().length > 0 && (
                <div className="skipped-summary">
                  <h4>⭐ Langkah yang Dilewati ({getSkippedSteps().length}):</h4>
                  <details>
                    <summary>Lihat detail langkah yang dilewati</summary>
                    <ul>
                      {getSkippedSteps().map(({ index }) => {
                        const skipInfo = activeWorkSession?.data.stepSkippedBy?.[index];
                        return (
                          <li key={index}>
                            <strong>Step {index + 1}:</strong> {steps[index]?.title}
                            {skipInfo && (
                              <div>
                                <small>
                                  Dilewati oleh: {skipInfo.userName} | 
                                  Alasan: {skipInfo.reason || 'Tidak disebutkan'}
                                </small>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                </div>
              )}

              {troubleshootHistory.length > 0 && (
                <div className="troubleshoot-summary">
                  <h4>🔧 Troubleshoot yang Dilakukan ({troubleshootHistory.length} kali):</h4>
                  <details>
                    <summary>Lihat Detail Troubleshoot</summary>
                    <ul>
                      {troubleshootHistory.map((entry, index) => (
                        <li key={entry.id || index}>
                          <strong>Step {entry.stepIndex + 1}:</strong> {entry.description}
                          <br />
                          <small>
                            Oleh: {entry.userName} | 
                            Waktu: {new Date(entry.timestamp).toLocaleString()}
                            {entry.solution && ` | Solusi: ${entry.solution}`}
                          </small>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}

              <div className="performance-summary">
                <h4>📈 Analisis Performa (AdminPage Metrics):</h4>
                <div className="perf-stats">
                  <p><strong>- Rata-rata waktu per step:</strong> {
                    formatTime(Math.round(totalTime / Math.max(completedStepsCount, 1)))
                  }</p>
                  <p><strong>- Step tercepat:</strong> {
                    stepCompletionTimes.length > 0 
                      ? `Step ${stepCompletionTimes.indexOf(Math.min(...stepCompletionTimes.filter(t => t > 0))) + 1} (${formatTime(Math.min(...stepCompletionTimes.filter(t => t > 0)))})`
                      : 'N/A'
                  }</p>
                  <p><strong>- Step terlama:</strong> {
                    stepCompletionTimes.length > 0 
                      ? `Step ${stepCompletionTimes.indexOf(Math.max(...stepCompletionTimes)) + 1} (${formatTime(Math.max(...stepCompletionTimes))})`
                      : 'N/A'
                  }</p>
                  <p><strong>- Tingkat penyelesaian:</strong> {Math.round((completedStepsCount / steps.length) * 100)}%</p>
                  {totalTargetTime > 0 && (
                    <>
                      <p><strong>- Target vs Aktual:</strong> {formatTime(totalTargetTime)} vs {formatTime(totalTime)}</p>
                      <p><strong>- Status Efisiensi:</strong> {
                        calculateEfficiency(totalTime, totalTargetTime) >= 100 ? 'EFISIEN ✅' : 
                        calculateEfficiency(totalTime, totalTargetTime) >= 80 ? 'CUKUP BAIK ⚠️' : 'PERLU PERBAIKAN ❌'
                      }</p>
                    </>
                  )}
                  
                  {/* CONCURRENT MODE: Team efficiency metrics */}
                  {sessionParticipants.length > 1 && (
                    <div className="team-efficiency">
                      <h5>🏃‍♂️ Efisiensi Tim:</h5>
                      <p><strong>- Waktu kerja per operator:</strong> {
                        formatTime(Math.round(totalTime / sessionParticipants.length))
                      }</p>
                      <p><strong>- Kolaborasi efektif:</strong> {
                        Object.values(activeWorkSession?.data.stepOperators || {})
                          .filter(ops => normalizeOperatorArray(ops).length > 1).length > 0
                          ? 'YA (Multi-operator pada beberapa step)'
                          : 'TIDAK (Single operator per step)'
                      }</p>
                      <p><strong>- Koordinasi tim:</strong> {
                        Object.values(activeWorkSession?.data.stepNotes || {})
                          .reduce((sum, notes) => sum + (Array.isArray(notes) ? notes.length : Object.keys(notes).length), 0) > 5
                          ? 'AKTIF (Komunikasi teratur)'
                          : 'MINIMAL (Komunikasi terbatas)'
                      }</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="completion-actions">
                <p><strong>Data telah disimpan dan siap untuk AdminPage.</strong></p>
                <small>
                  ℹ️ Semua data performa, kolaborasi, dan troubleshooting telah disimpan ke database 
                  dan dapat dianalisis melalui AdminPage untuk pelaporan dan optimasi proses.
                </small>
              </div>
            </div>
            
            <div className="modal-actions">
              <button onClick={resetTask} className="task-btn task-btn-primary">
                🔄 Kerjakan Tugas Lain
              </button>
              <button onClick={handleBackToMOSelection} className="task-btn task-btn-secondary">
                📋 Kembali ke Daftar MO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO STOP WARNING MODAL */}
      {showAutoStopWarning && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>⏰ Timer Otomatis Berhenti</h3>
            <p>
              Timer telah dihentikan secara otomatis karena waktu langkah ({formatStepTime(stepTime)}) 
              telah melebihi target waktu ({formatTime(currentStepTargetTime)}).
            </p>
            {normalizeOperatorArray(stepOperators[currentStep]).length > 1 && (
              <div className="team-warning">
                <p><strong>⚠️ Informasi Tim:</strong></p>
                <p>Ada {normalizeOperatorArray(stepOperators[currentStep]).length} operator yang bekerja di step ini. 
                Pertimbangkan untuk berkoordinasi dengan tim sebelum melanjutkan.</p>
              </div>
            )}
            <p>
              <strong>Anda dapat:</strong>
            </p>
            <ul>
              <li>✅ <strong>Selesaikan langkah</strong> jika sudah selesai</li>
              <li>▶️ <strong>Lanjutkan manual</strong> jika butuh waktu lebih</li>
              <li>⭐ <strong>Lewati langkah</strong> jika ada masalah</li>
              <li>⚙️ <strong>Matikan auto-stop</strong> untuk langkah berikutnya</li>
            </ul>
            <div className="modal-actions">
              <button onClick={completeStepConcurrent} className="task-btn task-btn-success">
                ✅ Selesaikan Langkah
              </button>
              <button onClick={handleContinueManual} className="task-btn task-btn-primary">
                ▶️ Lanjutkan Manual
              </button>
              <button onClick={handleShowSkipModal} className="task-btn task-btn-warning">
                ⭐ Lewati Langkah
              </button>
              <button onClick={handleToggleAutoStop} className="task-btn task-btn-secondary">
                ⚙️ {autoStopEnabled ? 'Matikan' : 'Aktifkan'} Auto-Stop
              </button>
            </div>
            <div className="auto-stop-info">
              <small>
                💡 Auto-stop: {autoStopEnabled ? 'AKTIF' : 'NONAKTIF'} | 
                Dapat diubah melalui pengaturan kontrol
              </small>
            </div>
          </div>
        </div>
      )}

      {/* ENHANCED TROUBLESHOOT MODAL WITH CONCURRENT MODE */}
      {showTroubleshootModal && (
        <TroubleshootModal 
          isOpen={showTroubleshootModal}
          onClose={handleCloseTroubleshoot}
          onSave={addTroubleshootHistory}
          currentStep={currentStep}
          activeStep={activeStep}
          troubleshootHistory={troubleshootHistory}
          isTeamMode={sessionParticipants.length > 1}
          teamMembers={sessionParticipants}
          currentUserId={currentUserId}
        />
      )}

      {/* ENHANCED STEP NOTES MODAL WITH CONCURRENT MODE */}
      {showStepNotesModal && (
        <StepNotesModal
          isOpen={showStepNotesModal}
          onClose={() => setShowStepNotesModal(false)}
          onSave={handleSaveStepNotes}
          currentStep={currentStep}
          activeStep={activeStep}
          stepNotes={getStepNotes(currentStep)}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          isTeamMode={sessionParticipants.length > 1}
          teamMembers={sessionParticipants}
          stepOperators={normalizeOperatorArray(stepOperators[currentStep] || [])}
          canCompleteStep={canCompleteStep()}
          shouldPromptForCompletion={shouldPromptForCompletion()}
        />
      )}

      {/* ======================================================================================== */}
      {/* NOTIFICATION TOASTS */}
      {/* ======================================================================================== */}

      {/* STOP NOTIFICATION */}
      {showStopNotification && (
        <div className="notification-toast stop-notification">
          <span className="notification-icon">⏸️</span>
          <span className="notification-text">Timer dihentikan</span>
        </div>
      )}

      {/* TARGET TIME WARNING */}
      {showTargetTimeWarning && (
        <div className="notification-toast warning-notification">
          <span className="notification-icon">⚠️</span>
          <span className="notification-text">
            Mendekati target waktu! ({formatStepTime(stepTime)} / {formatTime(currentStepTargetTime)})
          </span>
        </div>
      )}

      {/* SYNC NOTIFICATION */}
      {showSyncNotification && (
        <div className="notification-toast sync-notification">
          <span className="notification-icon">🔄</span>
          <span className="notification-text">
            Step disinkronkan dengan tim
          </span>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {loading && (
        <LoadingOverlay message="Memproses data..." />
      )}

      {/* IMAGES LOADING OVERLAY */}
      {imagesLoading && (
        <LoadingOverlay message="Memuat gambar langkah..." />
      )}

      {/* ERROR DISPLAY */}
      {error && (
        <div className="error-notification">
          <span className="error-icon">❌</span>
          <span className="error-text">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="error-close"
          >
            ×
          </button>
        </div>
      )}

      {/* ======================================================================================== */}
      {/* FOOTER INFO */}
      {/* ======================================================================================== */}
      <div className="task-page-footer">
        <div className="footer-info">
          <div className="session-info">
            {workSessionId && (
              <small>
                🔗 Session: {workSessionId.slice(-8)} | 
                Real-time: {sessionUnsubRef.current ? 'Connected' : 'Disconnected'} | 
                {sessionParticipants.length > 1 ? 'Team Mode' : 'Solo Mode'}
              </small>
            )}
          </div>
          
          <div className="version-info">
            <small>
              TaskPage v2.0 | Concurrent Mode | AdminPage Compatible | 
              User: {currentUserName} ({userRole})
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskPage;