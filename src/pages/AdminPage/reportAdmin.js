import React, { useState, useEffect } from 'react';
import { CheckCircle, TrendingUp, FileText, Settings, Search, Filter, Eye, Download, Calendar, Clock, User, Mail, Edit, Trash2, RefreshCw } from 'lucide-react';
import { collection, getDocs, query, orderBy, onSnapshot, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import logoLRS from '../assets/images/logoLRS.png';
import './reportAdmin.css';

const ReportAdmin = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUser, setFilterUser] = useState('');
  const [activeMenuItem, setActiveMenuItem] = useState('Report');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userEmails, setUserEmails] = useState({});
  const [uniqueUsers, setUniqueUsers] = useState([]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 0
  });

  const menuItems = [
    { id: 'Rekap Pengerjaan', label: 'Rekap Pengerjaan', icon: CheckCircle },
    { id: 'Report', label: 'Report Admin', icon: FileText },
    { id: 'Add Task', label: 'Add Task', icon: TrendingUp }
  ];

  // Fixed function untuk mengambil email dari collection users
  const fetchUserEmail = async (userId) => {
    try {
      // Check if userId is valid
      if (!userId) {
        console.warn('fetchUserEmail called with invalid userId:', userId);
        return {
          email: 'Unknown User',
          displayName: 'Anonymous',
          photoURL: null
        };
      }

      // Check if we already have this user's info cached
      if (userEmails[userId]) {
        return userEmails[userId];
      }

      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const userInfo = {
          email: userData.email || userId,
          displayName: userData.displayName || userData.email?.split('@')[0] || 'Anonymous',
          photoURL: userData.photoURL || null
        };
        
        setUserEmails(prev => ({
          ...prev,
          [userId]: userInfo
        }));
        
        return userInfo;
      } else {
        // Safe fallback when userId exists but user doc doesn't exist
        const fallbackInfo = {
          email: userId,
          displayName: userId && userId.length > 8 ? userId.substring(0, 8) : (userId || 'Anonymous'),
          photoURL: null
        };
        
        setUserEmails(prev => ({
          ...prev,
          [userId]: fallbackInfo
        }));
        
        return fallbackInfo;
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
      // Safe error fallback
      const errorFallback = {
        email: userId || 'Unknown User',
        displayName: userId && userId.length > 8 ? userId.substring(0, 8) : (userId || 'Anonymous'),
        photoURL: null
      };
      return errorFallback;
    }
  };

  // Enhanced fetch reports dengan real-time updates
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);

        const reportsRef = collection(db, 'reports');
        
        // Try to use ordered query first, fallback if composite index not available
        let q;
        try {
          q = query(reportsRef, orderBy('createdAt', 'desc'));
        } catch (indexError) {
          console.warn('Composite index not available, using unordered query');
          q = reportsRef;
        }

        const unsubscribe = onSnapshot(q, 
          async (querySnapshot) => {
            const reportsData = [];
            const userSet = new Set();
            
            // Process setiap dokumen report
            for (const docSnap of querySnapshot.docs) {
              const data = docSnap.data();
              
              // Check if userId exists and is valid before fetching user info
              let userInfo = {
                email: 'Unknown User',
                displayName: 'Anonymous',
                photoURL: null
              };

              if (data.userId) {
                userInfo = await fetchUserEmail(data.userId);
                userSet.add(JSON.stringify(userInfo));
              } else {
                console.warn('Report found without userId:', docSnap.id);
              }
              
              reportsData.push({
                id: docSnap.id,
                ...data,
                userInfo: userInfo,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                dateObject: data.dateObject?.toDate ? data.dateObject.toDate() : new Date(data.dateObject || Date.now())
              });
            }
            
            // Sort jika query tidak menggunakan orderBy
            if (!q._query?.orderBy?.length) {
              reportsData.sort((a, b) => b.createdAt - a.createdAt);
            }
            
            // Update unique users untuk filter
            const uniqueUsersArray = Array.from(userSet).map(user => JSON.parse(user));
            setUniqueUsers(uniqueUsersArray);
            
            setReports(reportsData);
            setFilteredReports(reportsData);
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching reports:', error);
            setError('Failed to fetch reports. Please check your connection.');
            setLoading(false);
          }
        );

        return unsubscribe;

      } catch (error) {
        console.error('Error setting up reports listener:', error);
        setError('Failed to connect to database.');
        setLoading(false);
      }
    };

    const unsubscribe = fetchReports();

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Enhanced filter dan search functionality
  useEffect(() => {
    let filtered = reports;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(report => 
        report.userInfo?.email?.toLowerCase().includes(searchLower) ||
        report.userInfo?.displayName?.toLowerCase().includes(searchLower) ||
        report.userId?.toLowerCase().includes(searchLower) ||
        report.description?.toLowerCase().includes(searchLower) ||
        report.date?.toLowerCase().includes(searchLower)
      );
    }

    // Date filter
    if (filterDate) {
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.dateObject);
        const filterDateObj = new Date(filterDate);
        return reportDate.toDateString() === filterDateObj.toDateString();
      });
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(report => report.status === filterStatus);
    }

    // User filter
    if (filterUser) {
      filtered = filtered.filter(report => 
        report.userInfo?.email === filterUser || report.userId === filterUser
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'userEmail':
          aValue = a.userInfo?.email || '';
          bValue = b.userInfo?.email || '';
          break;
        case 'date':
          aValue = new Date(a.dateObject);
          bValue = new Date(b.dateObject);
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Update pagination
    const totalPages = Math.ceil(filtered.length / pagination.itemsPerPage);
    setPagination(prev => ({
      ...prev,
      totalPages: totalPages,
      currentPage: Math.min(prev.currentPage, totalPages || 1)
    }));

    setFilteredReports(filtered);
  }, [searchTerm, filterDate, filterStatus, filterUser, reports, sortBy, sortOrder, pagination.itemsPerPage]);

  // Pagination
  const paginatedReports = filteredReports.slice(
    (pagination.currentPage - 1) * pagination.itemsPerPage,
    pagination.currentPage * pagination.itemsPerPage
  );

  const handleMenuClick = (menuId) => {
    setActiveMenuItem(menuId);
    
    if (menuId === 'Rekap Pengerjaan') {
      window.location.href = '/admin';
    } else if (menuId === 'Add Task') {
      window.location.href = '/addtask';
    }
    setSidebarOpen(false);
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const handleEditReport = (report) => {
    setSelectedReport({...report});
    setShowEditModal(true);
  };

  const handleUpdateReport = async (updatedData) => {
    try {
      const reportRef = doc(db, 'reports', selectedReport.id);
      await updateDoc(reportRef, {
        ...updatedData,
        updatedAt: new Date()
      });
      
      setShowEditModal(false);
      setSelectedReport(null);
      
      // Success message bisa ditambahkan di sini
      console.log('Report updated successfully');
    } catch (error) {
      console.error('Error updating report:', error);
      setError('Failed to update report');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus report ini?')) {
      try {
        await deleteDoc(doc(db, 'reports', reportId));
        console.log('Report deleted successfully');
      } catch (error) {
        console.error('Error deleting report:', error);
        setError('Failed to delete report');
      }
    }
  };

  const handleExportReports = () => {
    const csvContent = [
      ['Email', 'Display Name', 'User ID', 'Date', 'Duration', 'Description', 'Status', 'Created At', 'Updated At'],
      ...filteredReports.map(report => [
        report.userInfo?.email || '',
        report.userInfo?.displayName || '',
        report.userId || '',
        report.date || '',
        report.duration || '',
        (report.description || '').replace(/,/g, ';').replace(/\n/g, ' '),
        report.status || '',
        report.createdAt ? report.createdAt.toLocaleString('id-ID') : '',
        report.updatedAt ? new Date(report.updatedAt.seconds * 1000).toLocaleString('id-ID') : ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleLogoClick = () => {
    window.location.href = '/admin';
  };

  const handleBackClick = () => {
    window.location.href = '/';
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return '';
    
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
  };

  // Loading state
  if (loading) {
    return (
      <div className="report-admin-container">
        <div className="report-admin-loading">
          <div className="loading-spinner"></div>
          <p>Memuat data reports...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="report-admin-container">
        <div className="report-admin-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-admin-container">
      {/* Header */}
      <div className="report-admin-header-bar">
        <div className="report-admin-header-left">
          <button 
            className="report-admin-sidebar-toggle"
            onClick={toggleSidebar}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <img 
            src={logoLRS} 
            alt="LRS Logo" 
            className="report-admin-logo"
            onClick={handleLogoClick}
          />
        </div>
        <div className="report-admin-header-center">
          <h1 className="report-admin-title-header">Rekap Report</h1>
        </div>
        <div className="report-admin-header-right">
          <button onClick={handleBackClick} className="report-admin-back-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`report-admin-sidebar ${sidebarOpen ? 'report-admin-sidebar-open' : ''}`}>
        <div className="report-admin-sidebar-header">
          <h3>Menu</h3>
          <button 
            className="report-admin-sidebar-close"
            onClick={toggleSidebar}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <nav className="report-admin-sidebar-nav">
          <button 
            onClick={() => handleMenuClick('Rekap Pengerjaan')} 
            className="report-admin-sidebar-item"
          >
            <CheckCircle size={20} />
            <span>Rekap Pengerjaan</span>
          </button>

          <button 
            onClick={() => {
              setSidebarOpen(false);
            }} 
            className="report-admin-sidebar-item active"
          >
            <FileText size={20} />
            <span>Rekap Report</span>
          </button>

          <button 
            onClick={() => handleMenuClick('Add Task')} 
            className="report-admin-sidebar-item"
          >
            <TrendingUp size={20} />
            <span>Add Task</span>
          </button>
        </nav>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="report-admin-sidebar-overlay"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Main Content */}
      <main className={`report-admin-main ${sidebarOpen ? 'report-admin-main-shifted' : ''}`}>

        {/* Filters */}
        <div className="report-admin-filters">
          <div className="report-admin-search-wrapper">
            <Search size={20} className="report-admin-search-icon" />
            <input
              type="text"
              className="report-admin-search-input"
              placeholder="Cari berdasarkan email, User ID, tanggal, atau deskripsi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="report-admin-filter-group">
            <div className="report-admin-filter-item">
              <Calendar size={16} />
              <input
                type="text"
                className="report-admin-filter-input"
                placeholder="Filter tanggal (DD/MM/YYYY)"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>

            <div className="report-admin-filter-item">
              <Filter size={16} />
              <select
                className="report-admin-filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="submitted">Submitted</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          <div className="report-admin-header">
          <div className="report-admin-actions">
            <button className="report-admin-export-btn" onClick={handleExportReports}>
              <Download size={16} />
              Export Data
            </button>
          </div>
        </div>
        </div>
        
        {/* Reports Stats */}
        <div className="report-admin-stats">
          <div className="report-admin-stat-card">
            <div className="report-admin-stat-number">{reports.length}</div>
            <div className="report-admin-stat-label">Total Reports</div>
          </div>
          <div className="report-admin-stat-card">
            <div className="report-admin-stat-number">{reports.filter(r => r.status === 'completed').length}</div>
            <div className="report-admin-stat-label">Completed</div>
          </div>
          <div className="report-admin-stat-card">
            <div className="report-admin-stat-number">{reports.filter(r => r.status === 'submitted').length}</div>
            <div className="report-admin-stat-label">Submitted</div>
          </div>
          <div className="report-admin-stat-card">
            <div className="report-admin-stat-number">{filteredReports.length}</div>
            <div className="report-admin-stat-label">Ditampilkan</div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="report-admin-table-container">
          <div className="report-admin-table-wrapper">
            <table className="report-admin-table">
              <thead>
                <tr>
                  <th>Email User</th>
                  <th>Tanggal</th>
                  <th>Durasi</th>
                  <th>Deskripsi</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length > 0 ? (
                  filteredReports.map((report) => (
                    <tr key={report.id} className="report-admin-table-row">
                      <td className="report-admin-employee-cell">
                        <div className="report-admin-employee-info">
                          <div className="report-admin-employee-avatar">
                            <Mail size={16} />
                          </div>
                          <div>
                            <div className="report-admin-employee-name">
                              {report.userInfo?.email || report.userId || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="report-admin-date-cell">
                        <div className="report-admin-date">{report.date || 'N/A'}</div>
                      </td>
                      <td className="report-admin-duration-cell">
                        <div className="report-admin-duration">
                          <Clock size={14} />
                          {report.duration || 'N/A'}
                        </div>
                      </td>
                      <td className="report-admin-description-cell">
                        <div className="report-admin-description">
                          {report.description ? 
                            (report.description.substring(0, 60) + (report.description.length > 60 ? '...' : ''))
                            : 'No description'
                          }
                        </div>
                      </td>
                      <td className="report-admin-status-cell">
                        <span className={`report-admin-status report-admin-status-${report.status || 'pending'}`}>
                          {report.status || 'N/A'}
                        </span>
                      </td>
                      <td className="report-admin-submitted-cell">
                        <div className="report-admin-submitted">{formatDate(report.createdAt)}</div>
                      </td>
                      <td className="report-admin-actions-cell">
                        <button 
                          className="report-admin-action-btn"
                          onClick={() => handleViewReport(report)}
                          title="Lihat Detail"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="report-admin-no-data">
                      Tidak ada data report yang ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="report-admin-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="report-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="report-admin-modal-header">
              <h3>Detail Report</h3>
              <button 
                className="report-admin-modal-close"
                onClick={() => setShowDetailModal(false)}
              >
                ×
              </button>
            </div>
            <div className="report-admin-modal-content">
              <div className="report-admin-modal-field">
                <label>Email User:</label>
                <span>{selectedReport.userInfo?.email || selectedReport.userId || 'N/A'}</span>
              </div>
              <div className="report-admin-modal-field">
                <label>User ID:</label>
                <span>{selectedReport.userId || 'N/A'}</span>
              </div>
              <div className="report-admin-modal-field">
                <label>Tanggal:</label>
                <span>{selectedReport.date || 'N/A'}</span>
              </div>
              <div className="report-admin-modal-field">
                <label>Durasi:</label>
                <span>{selectedReport.duration || 'N/A'}</span>
              </div>
              <div className="report-admin-modal-field">
                <label>Status:</label>
                <span className={`report-admin-status report-admin-status-${selectedReport.status || 'pending'}`}>
                  {selectedReport.status || 'N/A'}
                </span>
              </div>
              <div className="report-admin-modal-field">
                <label>Created At:</label>
                <span>{selectedReport.createdAt ? selectedReport.createdAt.toLocaleString('id-ID') : 'N/A'}</span>
              </div>
              <div className="report-admin-modal-field report-admin-modal-description">
                <label>Deskripsi Pekerjaan:</label>
                <p>{selectedReport.description || 'No description available'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportAdmin;