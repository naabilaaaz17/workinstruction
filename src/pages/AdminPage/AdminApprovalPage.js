import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  deleteDoc,
  onSnapshot,
  orderBy,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { 
  Menu, X, Users, Briefcase, CheckCircle, Plus, LogOut, Home, RefreshCw, 
  Trash2, UserCheck, UserX, Clock, Filter, AlertTriangle, Zap 
} from 'lucide-react';
import logoLRS from '../assets/images/logoLRS.png';
import "./AdminApprovalPage.css";

function AdminApprovalPage() {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [processingUsers, setProcessingUsers] = useState(new Set());
  const [showDropdown, setShowDropdown] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    duplicates: 0
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  // Admin credentials
  const ADMIN_EMAIL = 'admin@gmail.com';

  // Check if current user is admin
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
      navigate('/login');
      return;
    }
  }, [auth.currentUser, navigate]);

  // Handle success message from registration redirect
  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
      // Clear the state to prevent message from showing again on refresh
      window.history.replaceState({}, document.title);
      
      // Auto-hide success message after 8 seconds
      setTimeout(() => setSuccess(null), 8000);
    }
  }, [location.state]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.approval-profile-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Function to detect and track duplicates
  const detectDuplicates = (users) => {
    const emailGroups = {};
    const duplicateList = [];
    
    users.forEach(user => {
      if (user.email !== ADMIN_EMAIL) {
        const email = user.email.toLowerCase();
        if (!emailGroups[email]) {
          emailGroups[email] = [];
        }
        emailGroups[email].push(user);
      }
    });
    
    Object.keys(emailGroups).forEach(email => {
      if (emailGroups[email].length > 1) {
        // Sort by creation date (newest first)
        emailGroups[email].sort((a, b) => {
          const aDate = a.createdAt?.toDate() || new Date(0);
          const bDate = b.createdAt?.toDate() || new Date(0);
          return bDate - aDate;
        });
        
        duplicateList.push({
          email,
          users: emailGroups[email],
          count: emailGroups[email].length
        });
      }
    });
    
    setDuplicates(duplicateList);
    return duplicateList.length;
  };

  // Real-time listener for all users (excluding admin)
  useEffect(() => {
    if (!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL) {
      return;
    }

    setLoading(true);
    setError(null);

    // Query for all users (excluding admin)
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc')
    );

    // Real-time listener
    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        try {
          const users = [];
          const statusCounts = { pending: 0, approved: 0, rejected: 0, duplicates: 0 };
          
          snapshot.forEach((doc) => {
            const userData = doc.data();
            // Skip admin accounts
            if (userData.email !== ADMIN_EMAIL) {
              const user = {
                id: doc.id,
                ...userData
              };
              users.push(user);
              
              // Count by status
              if (statusCounts.hasOwnProperty(userData.status)) {
                statusCounts[userData.status]++;
              }
            }
          });
          
          // Detect duplicates
          const duplicateCount = detectDuplicates(users);
          statusCounts.duplicates = duplicateCount;
          
          setAllUsers(users);
          setStats(statusCounts);
          setLoading(false);
        } catch (err) {
          console.error('Error processing users:', err);
          setError('Failed to load users');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to users:', err);
        setError('Failed to connect to database');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Filter users based on active tab
  useEffect(() => {
    if (activeTab === 'all') {
      setFilteredUsers(allUsers);
    } else if (activeTab === 'duplicates') {
      // Show all duplicate users
      const duplicateUsers = [];
      duplicates.forEach(group => {
        duplicateUsers.push(...group.users);
      });
      setFilteredUsers(duplicateUsers);
    } else {
      setFilteredUsers(allUsers.filter(user => user.status === activeTab));
    }
  }, [allUsers, activeTab, duplicates]);

  // Navigation functions
  const handleBackClick = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login');
    }
  };

  const handleLogoClick = () => {
    navigate('/admin');
  };

  const handleWorkSessions = () => {
    navigate('/admin');
  };

  const handleAddTask = () => {
    navigate('/addtask');
  };
  const handleMenuClick = () => {
    navigate('/add-mo');
  };
  // Approval function with comprehensive error handling
const handleApproveWithNotification = async (userId, userEmail, username) => {
  if (processingUsers.has(userId)) return;

  setProcessingUsers(prev => new Set([...prev, userId]));
  setError(null);

  try {
    const userRef = doc(db, 'users', userId);
    
    // Update user status
    await updateDoc(userRef, {
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: auth.currentUser.uid
    });

    // Create in-app notification
    await setDoc(doc(collection(db, 'adminNotifications')), {
      userId: userId,
      type: 'approval',
      title: 'Account Approved',
      message: 'Your account has been approved! You can now log in to the system.',
      read: false,
      createdAt: serverTimestamp(),
      actionUrl: '/login'
    });

    setSuccess(`User ${userEmail} has been approved and notified`);
    setTimeout(() => setSuccess(null), 5000);

  } catch (err) {
    console.error('Approval error:', err);
    setError(`Failed to approve user: ${err.message}`);
    setTimeout(() => setError(null), 5000);
  } finally {
    setProcessingUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  }
};

  // Rejection function with comprehensive error handling
  const handleReject = async (userId, userEmail) => {
    if (processingUsers.has(userId)) return;

    if (!window.confirm(`Are you sure you want to reject user ${userEmail}? This action can be undone by approving them later.`)) {
      return;
    }

    setProcessingUsers(prev => new Set([...prev, userId]));
    setError(null);

    try {
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: auth.currentUser.uid
      });

      setSuccess(`User ${userEmail} has been rejected`);
      setTimeout(() => setSuccess(null), 5000);

    } catch (err) {
      console.error('Rejection error:', err);
      setError(`Failed to reject user: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Delete user permanently (optional feature)
  const handleDeleteUser = async (userId, userEmail) => {
    if (processingUsers.has(userId)) return;

    if (!window.confirm(`Are you sure you want to permanently delete user ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    setProcessingUsers(prev => new Set([...prev, userId]));
    setError(null);

    try {
      await deleteDoc(doc(db, 'users', userId));

      setSuccess(`User ${userEmail} has been deleted permanently`);
      setTimeout(() => setSuccess(null), 5000);

    } catch (err) {
      console.error('Delete error:', err);
      setError(`Failed to delete user: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Enhanced cleanup function for duplicates
  const cleanupDuplicateUsers = async () => {
    if (duplicates.length === 0) {
      setError('No duplicates found to clean up.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    const totalDuplicates = duplicates.reduce((sum, group) => sum + (group.count - 1), 0);
    
    if (!window.confirm(`Found ${duplicates.length} groups of duplicate emails with ${totalDuplicates} duplicate entries.\n\nThis will keep the newest registration for each email and remove the older duplicates.\n\nAre you sure you want to proceed?`)) {
      return;
    }

    setCleanupLoading(true);
    setError(null);

    try {
      const deletePromises = [];
      let deletedCount = 0;
      
      duplicates.forEach(group => {
        // Skip the first (newest) entry, delete the rest
        for (let i = 1; i < group.users.length; i++) {
          deletePromises.push(deleteDoc(doc(db, 'users', group.users[i].id)));
          deletedCount++;
        }
      });
      
      await Promise.all(deletePromises);
      
      setSuccess(`Successfully removed ${deletedCount} duplicate user entries from ${duplicates.length} email groups.`);
      setTimeout(() => setSuccess(null), 8000);
      
      // Clear duplicates state
      setDuplicates([]);
      
    } catch (err) {
      console.error('Cleanup error:', err);
      setError(`Failed to cleanup duplicates: ${err.message}`);
      setTimeout(() => setError(null), 8000);
    } finally {
      setCleanupLoading(false);
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(usersQuery);
      const users = [];
      const statusCounts = { pending: 0, approved: 0, rejected: 0, duplicates: 0 };
      
      snapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.email !== ADMIN_EMAIL) {
          const user = {
            id: doc.id,
            ...userData
          };
          users.push(user);
          
          if (statusCounts.hasOwnProperty(userData.status)) {
            statusCounts[userData.status]++;
          }
        }
      });
      
      // Detect duplicates
      const duplicateCount = detectDuplicates(users);
      statusCounts.duplicates = duplicateCount;
      
      setAllUsers(users);
      setStats(statusCounts);
      setSuccess('Data refreshed successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Refresh error:', err);
      setError('Failed to refresh data');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Format date helper
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      let date;
      if (timestamp?.toDate) {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="status-badge approved">Approved</span>;
      case 'rejected':
        return <span className="status-badge rejected">Rejected</span>;
      case 'pending':
      default:
        return <span className="status-badge pending">Pending</span>;
    }
  };

  // Get tab title
  const getTabTitle = (tab) => {
    switch (tab) {
      case 'pending':
        return 'Pending User Registrations';
      case 'approved':
        return 'Approved Users';
      case 'rejected':
        return 'Rejected Users';
      case 'duplicates':
        return 'Duplicate Users';
      case 'all':
        return 'All Users';
      default:
        return 'Users';
    }
  };

  // Check if user is duplicate
  const isDuplicateUser = (userId) => {
    return duplicates.some(group => 
      group.users.some(user => user.id === userId)
    );
  };

  // Get duplicate group info for a user
  const getDuplicateInfo = (userEmail) => {
    const group = duplicates.find(g => g.email === userEmail.toLowerCase());
    if (!group) return null;
    
    return {
      count: group.count,
      position: group.users.findIndex(u => u.email.toLowerCase() === userEmail.toLowerCase()) + 1
    };
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-header-left">
            <img 
              src={logoLRS} 
              alt="LRS Logo" 
              className="admin-logo"
              onClick={handleLogoClick}
            />
          </div>
          <div className="admin-header-center">
            <h1 className="admin-title">Dashboard User Management</h1>
          </div>
        </div>
        <div className="admin-approval-loading-container">
          <div className="admin-approval-spinner"></div>
          <p className="admin-approval-loading-text">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <button 
            className="admin-sidebar-toggle"
            onClick={toggleSidebar}
          >
            <Menu size={20} />
          </button>
          <img 
            src={logoLRS} 
            alt="LRS Logo" 
            className="admin-logo"
            onClick={handleLogoClick}
          />
        </div>
        <div className="admin-header-center">
          <h1 className="admin-title">Dashboard User Management</h1>
        </div>
        <div className="admin-header-right">
          <div className="approval-profile-container">
            <button
              className="approval-profile-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="approval-profile-avatar">
                <span className="approval-avatar-text">A</span>
              </div>
              <div className="approval-profile-info">
                <div className="approval-profile-name">Admin</div>
                <div className="approval-profile-id">Administrator</div>
              </div>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className={`approval-dropdown-arrow ${showDropdown ? 'rotated' : ''}`}
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {showDropdown && (
              <div className="approval-dropdown-menu">
                <div className="approval-dropdown-header">
                  <div className="approval-profile-avatar">
                    <span className="approval-avatar-text">A</span>
                  </div>
                  <div>
                    <div className="approval-dropdown-name">Admin</div>
                    <div className="approval-dropdown-role">Administrator</div>
                  </div>
                </div>
                <hr className="approval-dropdown-divider" />
                <button 
                  className="approval-dropdown-item approval-dropdown-logout" 
                  onClick={() => {
                    setShowDropdown(false);
                    handleBackClick();
                  }}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar-open' : ''}`}>
        <div className="admin-sidebar-header">
          <h3>Menu</h3>
          <button 
            className="admin-sidebar-close"
            onClick={toggleSidebar}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="admin-sidebar-nav">
          <button 
            onClick={() => {
              handleWorkSessions();
              setSidebarOpen(false);
            }} 
            className="admin-sidebar-item"
          >
            <Home size={20} />
            <span>Work Sessions</span>
          </button>

          <button 
            onClick={() => {
              setSidebarOpen(false);
            }} 
            className="admin-sidebar-item active"
          >
            <CheckCircle size={20} />
            <span>User Management</span>
          </button>

          <button 
            onClick={() => handleMenuClick('MO Management')} 
            className="add-task-sidebar-item"
          >
            <Briefcase size={20} />
            <span>MO Management</span>
          </button>

          <button 
            onClick={() => {
              handleAddTask();
              setSidebarOpen(false);
            }} 
            className="admin-sidebar-item"
          >
            <Plus size={20} />
            <span>Add Task</span>
          </button>

        </nav>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="admin-sidebar-overlay"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Main Content */}
      <div className={`admin-main-content ${sidebarOpen ? 'admin-main-content-shifted' : ''}`}>
        {/* Duplicate Alert Card */}
        {duplicates.length > 0 && (
          <div className="duplicate-alert-card">
            <div className="duplicate-alert-header">
              <div className="duplicate-alert-icon">
                <AlertTriangle size={20} />
              </div>
              <h3 className="duplicate-alert-title">Duplicate Users Detected</h3>
              <button 
                onClick={cleanupDuplicateUsers}
                disabled={cleanupLoading}
                className="cleanup-btn"
              >
                {cleanupLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Auto Cleanup
                  </>
                )}
              </button>
            </div>
            
            <div className="duplicate-alert-content">
              <p>
                Found <strong>{duplicates.length}</strong> groups with duplicate emails. 
                Total <strong>{duplicates.reduce((sum, group) => sum + (group.count - 1), 0)}</strong> duplicate entries.
              </p>
              <div className="duplicate-groups">
                {duplicates.slice(0, 3).map((group, idx) => (
                  <div key={idx} className="duplicate-group">
                    <strong>{group.email}</strong> ({group.count} entries)
                  </div>
                ))}
                {duplicates.length > 3 && (
                  <div className="duplicate-more">
                    +{duplicates.length - 3} more groups...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Action Card for Registration */}
        <div className="quick-action-card">
          <div className="quick-action-header">
            <div className="quick-action-icon">
              <Users size={20} />
            </div>
            <h3 className="quick-action-title">Quick Actions</h3>
          </div>
          
          <div className="quick-action-content">
            <button 
              onClick={() => navigate('/register')}
              className="quick-action-btn register-btn"
            >
              <Plus size={16} />
              Register New Employee
            </button>
            <p className="quick-action-description">
              Register a new employee account that will appear in the pending approval list
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card pending">
            <div className="stat-card-header">
              <div className="stat-card-content">
                <p style={{color: '#2563eb'}}>Pending</p>
                <p style={{color: '#1d4ed8'}}>{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8" style={{color: '#3b82f6'}} />
            </div>
          </div>
          <div className="stat-card approved">
            <div className="stat-card-header">
              <div className="stat-card-content">
                <p style={{color: '#059669'}}>Approved</p>
                <p style={{color: '#047857'}}>{stats.approved}</p>
              </div>
              <UserCheck className="h-8 w-8" style={{color: '#10b981'}} />
            </div>
          </div>
          <div className="stat-card rejected">
            <div className="stat-card-header">
              <div className="stat-card-content">
                <p style={{color: '#dc2626'}}>Rejected</p>
                <p style={{color: '#b91c1c'}}>{stats.rejected}</p>
              </div>
              <UserX className="h-8 w-8" style={{color: '#ef4444'}} />
            </div>
          </div>
          <div className="stat-card duplicates">
            <div className="stat-card-header">
              <div className="stat-card-content">
                <p style={{color: '#d97706'}}>Duplicates</p>
                <p style={{color: '#b45309'}}>{duplicates.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8" style={{color: '#f59e0b'}} />
            </div>
          </div>
        </div>

        {/* Admin Info Card */}
        <div className="admin-info-card">
          <div className="admin-info-header">
            <div className="admin-info-icon">
              <CheckCircle size={20} />
            </div>
            <h3 className="admin-info-title">Admin Account</h3>
          </div>
          
          <div className="admin-info-content">
            <div className="credential-item">
              <strong>Email:</strong> 
              <span className="credential-value">{ADMIN_EMAIL}</span>
            </div>
            <div className="credential-item">
              <strong>Password:</strong> 
              <span className="credential-value">admin123</span>
            </div>
            <div className="info-note">
              <CheckCircle size={16} />
              This account has automatic approval and does not appear in the user list.
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <Clock size={16} />
            Pending ({stats.pending})
          </button>
          <button 
            className={`tab-button ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            <UserCheck size={16} />
            Approved ({stats.approved})
          </button>
          <button 
            className={`tab-button ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            <UserX size={16} />
            Rejected ({stats.rejected})
          </button>
          {duplicates.length > 0 && (
            <button 
              className={`tab-button ${activeTab === 'duplicates' ? 'active' : ''} duplicates-tab`}
              onClick={() => setActiveTab('duplicates')}
            >
              <AlertTriangle size={16} />
              Duplicates ({duplicates.reduce((sum, group) => sum + group.count, 0)})
            </button>
          )}
          <button 
            className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <Filter size={16} />
            All ({allUsers.length})
          </button>
        </div>
        
        {/* Alert Messages */}
        {error && (
          <div className="alert error">
            <X size={20} />
            {error}
          </div>
        )}
        
        {success && (
          <div className="alert success">
            <CheckCircle size={20} />
            {success}
          </div>
        )}

        {/* Main Content Card */}
        <div className="content-card">
          <div className="content-header">
            <h2 className="content-title">{getTabTitle(activeTab)}</h2>
            <div className="header-actions">
              <button 
                onClick={handleRefresh} 
                className="admin-refresh-button"
                disabled={loading}
                title="Refresh data"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <div className="counter-badge">
                <span className="counter-number">{filteredUsers.length}</span>
                <span className="counter-label">{activeTab === 'all' ? 'users' : activeTab}</span>
              </div>
            </div>
          </div>
          
          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                {activeTab === 'pending' ? <Clock size={64} /> : 
                 activeTab === 'approved' ? <CheckCircle size={64} /> : 
                 activeTab === 'rejected' ? <UserX size={64} /> : 
                 activeTab === 'duplicates' ? <AlertTriangle size={64} /> : <Users size={64} />}
              </div>
              <h3 className="empty-state-title">
                {activeTab === 'pending' ? 'No Pending Users' : 
                 activeTab === 'approved' ? 'No Approved Users' : 
                 activeTab === 'rejected' ? 'No Rejected Users' : 
                 activeTab === 'duplicates' ? 'No Duplicate Users' : 'No Users Found'}
              </h3>
              <p className="empty-state-description">
                {activeTab === 'pending' ? 'No pending user approvals at the moment. New registrations will appear here automatically.' :
                 activeTab === 'approved' ? 'No users have been approved yet.' :
                 activeTab === 'rejected' ? 'No users have been rejected yet.' :
                 activeTab === 'duplicates' ? 'Great! No duplicate users found in the system.' :
                 'No users found in the database.'}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="user-table">
                <thead className="table-head">
                  <tr>
                    <th className="table-header">
                      <div className="table-header-content">
                        Email
                      </div>
                    </th>
                    <th className="table-header">
                      <div className="table-header-content">
                        <Users size={16} />
                        Username
                      </div>
                    </th>
                    <th className="table-header">
                      <div className="table-header-content">
                        <Clock size={16} />
                        Registered
                      </div>
                    </th>
                    <th className="table-header">
                      <div className="table-header-content">
                        Status
                      </div>
                    </th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => {
                    const isDuplicate = isDuplicateUser(user.id);
                    const duplicateInfo = isDuplicate ? getDuplicateInfo(user.email) : null;
                    
                    return (
                      <tr key={user.id} className={`table-row ${isDuplicate ? 'duplicate-row' : ''}`}>
                        <td className="table-cell">
                          <div className="user-info">
                            <div className={`user-avatar ${isDuplicate ? 'duplicate-avatar' : ''}`}>
                              {isDuplicate && <AlertTriangle size={12} className="duplicate-icon" />}
                              {user.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="user-email">{user.email}</span>
                              {duplicateInfo && (
                                <div className="duplicate-badge">
                                  Duplicate #{duplicateInfo.position} of {duplicateInfo.count}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="username">
                            {user.username || user.displayName || (
                              <span className="empty-value">Not provided</span>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="date-text">
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                        <td className="table-cell">
                          {getStatusBadge(user.status)}
                        </td>
                        <td className="table-cell">
                          <div className="actions">
                            {user.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleApproveWithNotification(user.id, user.email, user.username)}
                                  disabled={processingUsers.has(user.id)}
                                  className="btn btn-approve"
                                  title="Approve this user"
                                >
                                  {processingUsers.has(user.id) ? (
                                    <div className="loading-spinner"></div>
                                  ) : (
                                    <CheckCircle size={16} />
                                  )}
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleReject(user.id, user.email)}
                                  disabled={processingUsers.has(user.id)}
                                  className="btn btn-reject"
                                  title="Reject this user"
                                >
                                  {processingUsers.has(user.id) ? (
                                    <div className="loading-spinner"></div>
                                  ) : (
                                    <X size={16} />
                                  )}
                                  Reject
                                </button>
                              </>
                            )}
                            
                            {user.status === 'rejected' && (
                              <button 
                                onClick={() => handleApproveWithNotification(user.id, user.email, user.username)}
                                disabled={processingUsers.has(user.id)}
                                className="btn btn-approve"
                                title="Approve this user"
                              >
                                {processingUsers.has(user.id) ? (
                                  <div className="loading-spinner"></div>
                                ) : (
                                  <CheckCircle size={16} />
                                )}
                                Approve
                              </button>
                            )}
                            
                            {user.status === 'approved' && (
                              <button 
                                onClick={() => handleReject(user.id, user.email)}
                                disabled={processingUsers.has(user.id)}
                                className="btn btn-reject"
                                title="Reject this user"
                              >
                                {processingUsers.has(user.id) ? (
                                  <div className="loading-spinner"></div>
                                ) : (
                                  <X size={16} />
                                )}
                                Reject
                              </button>
                            )}
                            
                            <button 
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              disabled={processingUsers.has(user.id)}
                              className={`btn btn-delete ${isDuplicate ? 'duplicate-delete' : ''}`}
                              title={isDuplicate ? "Delete duplicate user" : "Delete user permanently"}
                            >
                              {processingUsers.has(user.id) ? (
                                <div className="loading-spinner"></div>
                              ) : (
                                <Trash2 size={16} />
                              )}
                              {isDuplicate ? 'Remove Duplicate' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminApprovalPage;