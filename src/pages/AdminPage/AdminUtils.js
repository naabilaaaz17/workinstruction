// AdminUtils.js - Utility functions and calculations for AdminPage

// ===== ENHANCED EFFICIENCY CALCULATION FUNCTIONS =====

// 1. Utility: Parse time string to seconds
export const parseTimeToSeconds = (timeStr) => {
  if (!timeStr || timeStr === '00:00:00' || timeStr === '00:00') return 0;
  
  // Handle both "HH:MM:SS" and "MM:SS" formats
  const parts = timeStr.toString().split(':').map(Number).reverse();
  const [sec = 0, min = 0, hr = 0] = parts;
  return hr * 3600 + min * 60 + sec;
};

// 2. Enhanced calculateEfficiency function
export const calculateEfficiency = (actualTime, targetTime, status) => {
  // Handle skipped steps
  if (status === 'skipped') return 0;
  
  // Handle pending steps
  if (status === 'pending') return 0;
  
  // Handle missing target time
  if (!targetTime || targetTime <= 0) return null;
  
  // Parse time if it's a string, otherwise use as number
  const actualSec = typeof actualTime === 'string' 
    ? parseTimeToSeconds(actualTime) 
    : (actualTime || 0);
    
  const targetSec = typeof targetTime === 'string' 
    ? parseTimeToSeconds(targetTime) 
    : (targetTime || 0);
  
  // Validate parsed values
  if (targetSec <= 0 || actualSec <= 0) return 0;
  
  // Calculate efficiency: (target / actual) * 100, capped at 100%
  const rawEfficiency = (targetSec / actualSec) * 100;
  const cappedEfficiency = Math.min(rawEfficiency, 100);
  
  // Round to 1 decimal place
  return Math.round(cappedEfficiency * 10) / 10;
};

// 3. IMPROVED SESSION EFFICIENCY: Efisiensi = ∑Efisiensi Tiap Langkah / Jumlah Semua Langkah
export const calculateSessionEfficiency = (stepTimes, includeAllSteps = true) => {
  if (!stepTimes || stepTimes.length === 0) return 0;
  
  let totalEfficiency = 0;
  let totalStepsCount = 0;
  let stepsWithEfficiency = 0;
  let completedSteps = 0;
  let skippedSteps = 0;
  let pendingSteps = 0;
  
  console.log(`🧮 Calculating session efficiency for ${stepTimes.length} steps:`);
  
  stepTimes.forEach((step, index) => {
    const efficiency = calculateEfficiency(step.duration, step.targetTime, step.status);
    
    console.log(`  Step ${index + 1} (${step.step}):`, {
      status: step.status,
      duration: step.duration,
      targetTime: step.targetTime,
      efficiency: efficiency
    });
    
    // Count all steps according to formula: Jumlah Semua Langkah
    totalStepsCount++;
    
    // Count steps by status for detailed analytics
    switch (step.status) {
      case 'completed':
        completedSteps++;
        break;
      case 'skipped':
        skippedSteps++;
        break;
      case 'pending':
      default:
        pendingSteps++;
        break;
    }
    
    if (includeAllSteps) {
      // Include ALL steps in calculation as per formula
      if (efficiency !== null) {
        totalEfficiency += efficiency;
        stepsWithEfficiency++;
      } else if (step.targetTime <= 0) {
        // Steps without target time contribute 0 to sum but are counted
        totalEfficiency += 0;
        stepsWithEfficiency++;
      }
    } else {
      // Only include completed steps with target time
      if (step.status === 'completed' && efficiency !== null) {
        totalEfficiency += efficiency;
        stepsWithEfficiency++;
      }
    }
  });
  
  // Apply the formula: Efisiensi = ∑Efisiensi Tiap Langkah / Jumlah Semua Langkah
  const sessionEfficiency = totalStepsCount > 0 
    ? (totalEfficiency / totalStepsCount)
    : 0;
  
  console.log(`📊 Session efficiency calculation result:`, {
    totalEfficiency,
    totalStepsCount,
    stepsWithEfficiency,
    sessionEfficiency: sessionEfficiency.toFixed(1) + '%',
    completedSteps,
    skippedSteps,
    pendingSteps
  });
  
  // Cap at 100% and round to 1 decimal
  return Math.round(Math.min(sessionEfficiency, 100) * 10) / 10;
};

// 4. Calculate overall statistics for multiple sessions with enhanced formula
export const calculateOverallStats = (sessions) => {
  let totalSessions = sessions.length;
  let sessionsWithTargets = 0;
  let totalEfficiency = 0;
  let efficientSessions = 0; // Sessions with >= 80% efficiency
  let totalSteps = 0;
  let completedSteps = 0;
  let skippedSteps = 0;
  let pendingSteps = 0;
  let stepsWithTargets = 0;
  let totalStepEfficiencySum = 0; // Sum of all individual step efficiencies
  let stepsWithCalculatedEfficiency = 0; // Steps that contributed to efficiency calculation
  
  console.log(`🌟 Calculating overall stats for ${totalSessions} sessions`);
  
  sessions.forEach((session, sessionIndex) => {
    if (!session.stepTimes) {
      console.log(`⚠️ Session ${sessionIndex + 1} has no stepTimes`);
      return;
    }
    
    console.log(`📈 Processing session ${sessionIndex + 1}:`, {
      id: session.id,
      stepTimesLength: session.stepTimes.length,
      sessionEfficiency: session.efficiency
    });
    
    // Count steps by status and calculate individual step efficiencies
    session.stepTimes.forEach(step => {
      totalSteps++;
      if (step.targetTime > 0) stepsWithTargets++;
      
      const stepEfficiency = calculateEfficiency(step.duration, step.targetTime, step.status);
      
      // Add to total step efficiency sum for overall calculation
      if (stepEfficiency !== null) {
        totalStepEfficiencySum += stepEfficiency;
        stepsWithCalculatedEfficiency++;
      }
      
      switch (step.status) {
        case 'completed':
          completedSteps++;
          break;
        case 'skipped':
          skippedSteps++;
          break;
        case 'pending':
        default:
          pendingSteps++;
          break;
      }
    });
    
    // Calculate session efficiency using enhanced formula
    const sessionEff = calculateSessionEfficiency(session.stepTimes, true);
    if (sessionEff > 0) {
      totalEfficiency += sessionEff;
      sessionsWithTargets++;
      
      if (sessionEff >= 80) {
        efficientSessions++;
      }
    }
  });
  
  // Calculate overall efficiency using the enhanced formula
  // Overall Efficiency = ∑(All Step Efficiencies) / Total Steps Count
  const overallStepEfficiency = totalSteps > 0 
    ? (totalStepEfficiencySum / totalSteps)
    : 0;
  
  const avgSessionEfficiency = sessionsWithTargets > 0 
    ? (totalEfficiency / sessionsWithTargets)
    : 0;
  
  console.log(`🎯 Overall Statistics Summary:`, {
    totalSessions,
    totalSteps,
    stepsWithTargets,
    stepsWithCalculatedEfficiency,
    totalStepEfficiencySum: totalStepEfficiencySum.toFixed(1),
    overallStepEfficiency: overallStepEfficiency.toFixed(1) + '%',
    avgSessionEfficiency: avgSessionEfficiency.toFixed(1) + '%',
    efficientSessions,
    completedSteps,
    skippedSteps,
    pendingSteps
  });
  
  return {
    totalSessions,
    sessionsWithTargets,
    avgEfficiency: Math.round(avgSessionEfficiency * 10) / 10,
    overallStepEfficiency: Math.round(overallStepEfficiency * 10) / 10, // NEW: Overall step efficiency
    totalStepEfficiencySum, // NEW: Sum of all step efficiencies
    stepsWithCalculatedEfficiency, // NEW: Count of steps with calculated efficiency
    efficientSessions,
    efficiencyRate: sessionsWithTargets > 0 
      ? Math.round((efficientSessions / sessionsWithTargets) * 100 * 10) / 10 
      : 0,
    stepStats: {
      total: totalSteps,
      completed: completedSteps,
      skipped: skippedSteps,
      pending: pendingSteps,
      withTargets: stepsWithTargets,
      completionRate: totalSteps > 0 
        ? Math.round((completedSteps / totalSteps) * 100 * 10) / 10 
        : 0,
      targetCoverage: totalSteps > 0 
        ? Math.round((stepsWithTargets / totalSteps) * 100 * 10) / 10 
        : 0,
      // NEW: Enhanced step efficiency metrics
      withCalculatedEfficiency: stepsWithCalculatedEfficiency,
      efficiencyCalculationCoverage: totalSteps > 0 
        ? Math.round((stepsWithCalculatedEfficiency / totalSteps) * 100 * 10) / 10 
        : 0
    }
  };
};

// 5. Helper function to format efficiency display
export const formatEfficiencyDisplay = (efficiency) => {
  if (efficiency === null || efficiency === undefined) {
    return { value: 'N/A', className: 'no-target', color: '#999' };
  }
  
  if (efficiency === 0) {
    return { value: '0.0%', className: 'zero-efficiency', color: '#ff4444' };
  }
  
  const className = efficiency >= 80 ? 'efficient' : 'inefficient';
  const color = efficiency >= 80 ? '#28a745' : efficiency >= 60 ? '#ffc107' : '#dc3545';
  
  return {
    value: `${efficiency.toFixed(1)}%`,
    className,
    color
  };
};

// 6. Enhanced efficiency breakdown for detailed analysis
export const calculateEfficiencyBreakdown = (sessions) => {
  let excellentSteps = 0; // >= 90%
  let goodSteps = 0; // 80-89%
  let averageSteps = 0; // 60-79%
  let poorSteps = 0; // 40-59%
  let veryPoorSteps = 0; // < 40%
  let noTargetSteps = 0; // No target time
  
  sessions.forEach(session => {
    if (!session.stepTimes) return;
    
    session.stepTimes.forEach(step => {
      const efficiency = calculateEfficiency(step.duration, step.targetTime, step.status);
      
      if (efficiency === null) {
        noTargetSteps++;
      } else if (efficiency >= 90) {
        excellentSteps++;
      } else if (efficiency >= 80) {
        goodSteps++;
      } else if (efficiency >= 60) {
        averageSteps++;
      } else if (efficiency >= 40) {
        poorSteps++;
      } else {
        veryPoorSteps++;
      }
    });
  });
  
  const totalStepsWithEfficiency = excellentSteps + goodSteps + averageSteps + poorSteps + veryPoorSteps;
  
  return {
    excellent: { count: excellentSteps, percentage: totalStepsWithEfficiency > 0 ? (excellentSteps / totalStepsWithEfficiency * 100).toFixed(1) : 0 },
    good: { count: goodSteps, percentage: totalStepsWithEfficiency > 0 ? (goodSteps / totalStepsWithEfficiency * 100).toFixed(1) : 0 },
    average: { count: averageSteps, percentage: totalStepsWithEfficiency > 0 ? (averageSteps / totalStepsWithEfficiency * 100).toFixed(1) : 0 },
    poor: { count: poorSteps, percentage: totalStepsWithEfficiency > 0 ? (poorSteps / totalStepsWithEfficiency * 100).toFixed(1) : 0 },
    veryPoor: { count: veryPoorSteps, percentage: totalStepsWithEfficiency > 0 ? (veryPoorSteps / totalStepsWithEfficiency * 100).toFixed(1) : 0 },
    noTarget: { count: noTargetSteps, percentage: 0 },
    totalWithEfficiency: totalStepsWithEfficiency
  };
};

// Helper function untuk format waktu
export const formatTime = (seconds) => {
  if (!seconds || seconds === 0) return '00:00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Helper function untuk format waktu step
export const formatStepTime = (seconds) => {
  if (!seconds || seconds === 0) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Enhanced function to calculate target time - FIXED VERSION
export const calculateTargetTime = (session, workInstruction) => {
  console.log(`🎯 Calculating target time for session ${session.id}:`, {
    workInstructionId: session.workInstructionId,
    workInstructionData: workInstruction
  });
  
  // Priority 1: Dari session stepTargetTimes (paling akurat)  
  // Priority 2: Dari work instruction totalStepTargetTime
  if (workInstruction?.totalStepTargetTime > 0) {
    console.log(`✅ Using work instruction totalStepTargetTime: ${workInstruction.totalStepTargetTime}s`);
    return workInstruction.totalStepTargetTime;
  }
  
  // Priority 3: Hitung manual dari steps
  if (workInstruction?.steps && Array.isArray(workInstruction.steps)) {
    const calculatedTotal = workInstruction.steps.reduce((total, step) => {
      const maxTime = step.maxTime || 0;
      const timeValue = typeof maxTime === 'string' ? parseInt(maxTime, 10) : maxTime;
      return total + (timeValue || 0);
    }, 0);
    
    if (calculatedTotal > 0) {
      console.log(`✅ Calculated from steps: ${calculatedTotal}s`);
      return calculatedTotal;
    }
  }
  
  console.log(`⚠️ No target time found for session ${session.id}`);
  return 0;
};

// Enhanced completion stats with proper efficiency calculation using the enhanced functions
export const getCompletionStats = (data) => {
  console.log(`📊 Calculating completion stats for ${data.length} sessions`);
  
  // Use the enhanced calculateOverallStats function
  const overallStats = calculateOverallStats(data);
  
  // Calculate efficiency breakdown
  const efficiencyBreakdown = calculateEfficiencyBreakdown(data);
  
  // Status statistics
  const approvedSessions = data.filter(entry => entry.status === 'approved').length;
  const rejectedSessions = data.filter(entry => entry.status === 'rejected').length;
  const pendingSessions = data.filter(entry => entry.status === 'pending' || !entry.status).length;

  console.log(`✅ Completion stats calculated:`, {
    overallStats,
    efficiencyBreakdown,
    statusStats: { approvedSessions, rejectedSessions, pendingSessions }
  });

  return {
    // Step statistics from enhanced calculation
    total: overallStats.stepStats.total,
    completed: overallStats.stepStats.completed,
    skipped: overallStats.stepStats.skipped,
    pending: overallStats.stepStats.pending,
    completedPercentage: overallStats.stepStats.completionRate,
    skippedPercentage: overallStats.stepStats.total > 0 ? 
      Math.round((overallStats.stepStats.skipped / overallStats.stepStats.total) * 100 * 10) / 10 : 0,
    pendingPercentage: overallStats.stepStats.total > 0 ? 
      Math.round((overallStats.stepStats.pending / overallStats.stepStats.total) * 100 * 10) / 10 : 0,
    
    // Enhanced efficiency statistics
    avgEfficiency: overallStats.avgEfficiency,
    overallStepEfficiency: overallStats.overallStepEfficiency, // NEW: Overall step efficiency per formula
    totalStepEfficiencySum: overallStats.totalStepEfficiencySum, // NEW: Sum of all step efficiencies
    efficientSessions: overallStats.efficientSessions,
    totalSessions: overallStats.totalSessions,
    sessionsWithTarget: overallStats.sessionsWithTargets,
    efficiencyPercentage: overallStats.efficiencyRate,
    
    // Status stats
    approvedSessions,
    rejectedSessions,
    pendingSessions,
    approvalRate: data.length > 0 ? ((approvedSessions / data.length) * 100).toFixed(1) : 0,
    
    // Additional detailed stats
    stepStats: overallStats.stepStats,
    
    // NEW: Efficiency breakdown
    efficiencyBreakdown: efficiencyBreakdown
  };
};