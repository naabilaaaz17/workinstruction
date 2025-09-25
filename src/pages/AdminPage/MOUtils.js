// MOUtils.js - Utilities for MO Management

// Default MO structure
export const DEFAULT_MO = {
  moNumber: '',
  moDisplay: '',
  title: '',
  description: '',
  priority: 'medium', // low, medium, high, urgent
  dueDate: '',
  status: 'draft', // draft, assigned, in_progress, completed, cancelled
  assignments: [], // Array of operator assignments
  workInstructionAssignments: [], // Array of WI assignments
  createdAt: null,
  updatedAt: null,
  createdBy: '',
  createdByEmail: '',
  isActive: true
};

// Validate MO data
export const validateMO = (mo) => {
  const errors = [];
  
  // Basic validation
  if (!mo.moNumber?.trim()) {
    errors.push('Nomor MO harus diisi');
  } else {
    const moFormat = formatMONumber(mo.moNumber);
    if (!moFormat.isValid) {
      errors.push('Format nomor MO tidak valid. Gunakan format: XX/MO/DIVISI/MM/YYYY');
    }
  }
  
  if (!mo.title?.trim()) {
    errors.push('Judul/WI Terkait harus diisi');
  }
  
  if (!mo.description?.trim()) {
    errors.push('Deskripsi harus diisi');
  }
  
  if (!mo.priority?.trim()) {
    errors.push('Prioritas harus dipilih');
  }
  
  // Due date validation
  if (mo.dueDate) {
    const dueDate = new Date(mo.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      errors.push('Tanggal deadline tidak boleh di masa lampau');
    }
  }
  
  // Assignment validation
  if (!mo.assignments || mo.assignments.length === 0) {
    errors.push('Minimal harus ada 1 operator yang ditugaskan');
  }
  
  if (!mo.workInstructionAssignments || mo.workInstructionAssignments.length === 0) {
    errors.push('Minimal harus ada 1 work instruction yang ditugaskan');
  }
  
  return errors;
};

// Format and validate MO number
export const formatMONumber = (moNumber) => {
  if (!moNumber) return { formatted: '', isValid: false };
  
  // Remove extra spaces and convert to uppercase
  const formatted = moNumber.trim().toUpperCase();
  
  // MO format validation (XX/MO/DIVISI/MM/YYYY)
  const moPattern = /^\d{2}\/MO\/[A-Z]{2,4}\/\d{2}\/\d{4}$/;
  
  return {
    formatted,
    isValid: moPattern.test(formatted)
  };
};

// Generate MO display name
export const generateMODisplay = (moNumber, title) => {
  if (!moNumber || !title) return '';
  return `${moNumber} - ${title}`;
};

// Get MO status info
export const getMOStatus = (status) => {
  const statuses = {
    draft: {
      label: 'Draft',
      description: 'MO masih dalam tahap penyusunan',
      color: 'secondary',
      icon: '📝'
    },
    assigned: {
      label: 'Assigned',
      description: 'MO sudah ditugaskan ke operator',
      color: 'info',
      icon: '👥'
    },
    in_progress: {
      label: 'In Progress',
      description: 'MO sedang dikerjakan',
      color: 'warning',
      icon: '⚙️'
    },
    completed: {
      label: 'Completed',
      description: 'MO sudah selesai dikerjakan',
      color: 'success',
      icon: '✅'
    },
    cancelled: {
      label: 'Cancelled',
      description: 'MO dibatalkan',
      color: 'danger',
      icon: '❌'
    }
  };
  
  return statuses[status] || {
    label: status,
    description: 'Status tidak dikenal',
    color: 'secondary',
    icon: '❓'
  };
};

// Get priority info
export const getPriorityInfo = (priority) => {
  const priorities = {
    low: {
      label: 'Low',
      description: 'Prioritas rendah',
      color: 'info',
      icon: '🔵',
      level: 1
    },
    medium: {
      label: 'Medium',
      description: 'Prioritas sedang',
      color: 'warning',
      icon: '🟡',
      level: 2
    },
    high: {
      label: 'High',
      description: 'Prioritas tinggi',
      color: 'danger',
      icon: '🔴',
      level: 3
    },
    urgent: {
      label: 'Urgent',
      description: 'Prioritas mendesak',
      color: 'danger',
      icon: '🚨',
      level: 4
    }
  };
  
  return priorities[priority] || {
    label: priority,
    description: 'Prioritas tidak dikenal',
    color: 'secondary',
    icon: '⚪',
    level: 0
  };
};

// Calculate MO progress
export const calculateMOProgress = (mo) => {
  if (!mo.assignments || mo.assignments.length === 0) {
    return { progress: 0, completed: 0, total: 0 };
  }
  
  const total = mo.assignments.length;
  const completed = mo.assignments.filter(assignment => 
    assignment.status === 'completed'
  ).length;
  
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { progress, completed, total };
};

// Get days until due date
export const getDaysUntilDue = (dueDate) => {
  if (!dueDate) return null;
  
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Check if MO is overdue
export const isMOOverdue = (mo) => {
  if (!mo.dueDate || mo.status === 'completed' || mo.status === 'cancelled') {
    return false;
  }
  
  const daysUntilDue = getDaysUntilDue(mo.dueDate);
  return daysUntilDue !== null && daysUntilDue < 0;
};

// Get MO urgency level
export const getMOUrgency = (mo) => {
  if (mo.status === 'completed' || mo.status === 'cancelled') {
    return 'completed';
  }
  
  if (isMOOverdue(mo)) {
    return 'overdue';
  }
  
  const daysUntilDue = getDaysUntilDue(mo.dueDate);
  const priorityInfo = getPriorityInfo(mo.priority);
  
  if (priorityInfo.level >= 4) { // urgent
    return 'urgent';
  } else if (priorityInfo.level >= 3) { // high
    return 'high';
  } else if (daysUntilDue !== null && daysUntilDue <= 1) {
    return 'due_soon';
  } else if (priorityInfo.level >= 2) { // medium
    return 'medium';
  }
  
  return 'low';
};

// Sort MOs by urgency and priority
export const sortMOsByUrgency = (mos) => {
  return [...mos].sort((a, b) => {
    const urgencyA = getMOUrgency(a);
    const urgencyB = getMOUrgency(b);
    
    const urgencyOrder = {
      'overdue': 6,
      'urgent': 5,
      'due_soon': 4,
      'high': 3,
      'medium': 2,
      'low': 1,
      'completed': 0
    };
    
    const orderA = urgencyOrder[urgencyA] || 0;
    const orderB = urgencyOrder[urgencyB] || 0;
    
    if (orderA !== orderB) {
      return orderB - orderA; // Higher urgency first
    }
    
    // If same urgency, sort by due date
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    
    // If same urgency and no due dates, sort by created date
    if (a.createdAt && b.createdAt) {
      return b.createdAt.toDate() - a.createdAt.toDate();
    }
    
    return 0;
  });
};

// Generate MO summary stats
export const generateMOSummary = (mos) => {
  const summary = {
    total: mos.length,
    byStatus: {},
    byPriority: {},
    overdue: 0,
    dueSoon: 0,
    completed: 0
  };
  
  mos.forEach(mo => {
    // Count by status
    summary.byStatus[mo.status] = (summary.byStatus[mo.status] || 0) + 1;
    
    // Count by priority
    summary.byPriority[mo.priority] = (summary.byPriority[mo.priority] || 0) + 1;
    
    // Count special categories
    if (mo.status === 'completed') {
      summary.completed++;
    } else if (isMOOverdue(mo)) {
      summary.overdue++;
    } else {
      const daysUntilDue = getDaysUntilDue(mo.dueDate);
      if (daysUntilDue !== null && daysUntilDue <= 3) {
        summary.dueSoon++;
      }
    }
  });
  
  return summary;
};

// Format date for display
export const formatDate = (timestamp, includeTime = false) => {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('id-ID', options);
};

// Generate MO report
export const generateMOReport = (mo) => {
  const statusInfo = getMOStatus(mo.status);
  const priorityInfo = getPriorityInfo(mo.priority);
  const progress = calculateMOProgress(mo);
  const urgency = getMOUrgency(mo);
  const daysUntilDue = getDaysUntilDue(mo.dueDate);
  
  return {
    basic: {
      moNumber: mo.moNumber,
      moDisplay: mo.moDisplay,
      title: mo.title,
      description: mo.description,
      createdAt: mo.createdAt,
      updatedAt: mo.updatedAt,
      dueDate: mo.dueDate
    },
    status: {
      current: statusInfo,
      priority: priorityInfo,
      urgency,
      isOverdue: isMOOverdue(mo),
      daysUntilDue
    },
    progress: {
      ...progress,
      assignments: mo.assignments?.length || 0,
      workInstructions: mo.workInstructionAssignments?.length || 0
    },
    assignments: {
      operators: mo.assignments || [],
      workInstructions: mo.workInstructionAssignments || []
    }
  };
};

// Helper function to create operator assignment
export const createOperatorAssignment = (operator) => {
  return {
    operatorId: operator.id,
    operatorEmail: operator.email,
    operatorName: operator.displayName || operator.name || operator.email.split('@')[0],
    assignedAt: new Date(),
    status: 'assigned', // assigned, in_progress, completed
    startedAt: null,
    completedAt: null,
    notes: ''
  };
};

// Helper function to create WI assignment
export const createWIAssignment = (workInstruction) => {
  return {
    wiId: workInstruction.id,
    wiNumber: workInstruction.wiNumber,
    wiTitle: workInstruction.title,
    category: workInstruction.category,
    difficulty: workInstruction.difficulty,
    estimatedDuration: workInstruction.estimatedDuration,
    assignedAt: new Date(),
    status: 'assigned', // assigned, in_progress, completed
    completedSteps: 0,
    totalSteps: workInstruction.steps?.length || 0
  };
};

// Update assignment status
export const updateAssignmentStatus = (assignment, newStatus, additionalData = {}) => {
  const updated = { ...assignment, status: newStatus };
  
  switch (newStatus) {
    case 'in_progress':
      updated.startedAt = additionalData.startedAt || new Date();
      break;
    case 'completed':
      updated.completedAt = additionalData.completedAt || new Date();
      if (additionalData.notes) {
        updated.notes = additionalData.notes;
      }
      break;
    default:
      break;
  }
  
  return updated;
};

// Calculate estimated completion time for MO
export const calculateEstimatedCompletion = (mo) => {
  if (!mo.workInstructionAssignments || mo.workInstructionAssignments.length === 0) {
    return null;
  }
  
  // Sum up all WI estimated durations
  const totalMinutes = mo.workInstructionAssignments.reduce((total, wi) => {
    return total + (wi.estimatedDuration || 0);
  }, 0);
  
  // Factor in number of operators (parallel work assumption)
  const operatorCount = mo.assignments?.length || 1;
  const adjustedMinutes = Math.ceil(totalMinutes / Math.max(operatorCount, 1));
  
  return {
    totalMinutes,
    adjustedMinutes,
    hours: Math.ceil(adjustedMinutes / 60),
    formattedTime: formatDuration(adjustedMinutes)
  };
};

// Format duration in minutes to readable format
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} menit`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} jam`;
  }
  
  return `${hours} jam ${remainingMinutes} menit`;
};

// Check if user can edit MO
export const canEditMO = (mo, user) => {
  // Admin can always edit
  if (user?.role === 'admin') {
    return true;
  }
  
  // Creator can edit if status is draft or assigned
  if (mo.createdBy === user?.uid && ['draft', 'assigned'].includes(mo.status)) {
    return true;
  }
  
  return false;
};

// Check if user can delete MO
export const canDeleteMO = (mo, user) => {
  // Admin can always delete
  if (user?.role === 'admin') {
    return true;
  }
  
  // Creator can delete if status is draft
  if (mo.createdBy === user?.uid && mo.status === 'draft') {
    return true;
  }
  
  return false;
};

// Get available status transitions
export const getAvailableStatusTransitions = (currentStatus, userRole) => {
  const transitions = {
    draft: ['assigned', 'cancelled'],
    assigned: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [], // Final status
    cancelled: userRole === 'admin' ? ['draft'] : [] // Only admin can reopen
  };
  
  return transitions[currentStatus] || [];
};

// Validate status transition
export const validateStatusTransition = (currentStatus, newStatus, mo, user) => {
  const availableTransitions = getAvailableStatusTransitions(currentStatus, user?.role);
  
  if (!availableTransitions.includes(newStatus)) {
    return {
      isValid: false,
      error: `Tidak dapat mengubah status dari ${currentStatus} ke ${newStatus}`
    };
  }
  
  // Additional validation for specific transitions
  if (newStatus === 'assigned' && (!mo.assignments || mo.assignments.length === 0)) {
    return {
      isValid: false,
      error: 'Tidak dapat assign MO tanpa operator'
    };
  }
  
  if (newStatus === 'assigned' && (!mo.workInstructionAssignments || mo.workInstructionAssignments.length === 0)) {
    return {
      isValid: false,
      error: 'Tidak dapat assign MO tanpa work instruction'
    };
  }
  
  return { isValid: true };
};