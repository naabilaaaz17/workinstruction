import React, { useState, useEffect } from 'react';
import { CheckCircle, TrendingUp, FileText, Settings, LogOut, Calendar, Menu, X, User, Activity, Eye, Save, AlertCircle, MessageSquare, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { db, auth } from '../../firebase';
import { collection, addDoc, getDocs, query, orderBy, where, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import logoLRS from '../assets/images/logoLRS.png';
import './ReportPage.css';

const ReportPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportDescription, setReportDescription] = useState('');
  const [activeMenuItem, setActiveMenuItem] = useState('Report');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [reports, setReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // New states for enhanced features
  const [showPreview, setShowPreview] = useState(false);
  const [dailyRating, setDailyRating] = useState('');
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  
  // New states for admin integration
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportDetail, setShowReportDetail] = useState(false);

  const menuItems = [
    { id: 'Task', label: 'Task', icon: CheckCircle },
    { id: 'Log Progress', label: 'Log Progress', icon: Activity },
    { id: 'Report', label: 'Report', icon: FileText }
  ];

  const ratingOptions = [
    { value: 'productive', label: '👍 Produktif', emoji: '👍' },
    { value: 'normal', label: '😐 Biasa', emoji: '😐' },
    { value: 'unproductive', label: '👎 Kurang Produktif', emoji: '👎' }
  ];

  // Listen untuk auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      
      if (user) {
        await saveUserToFirestore(user);
        fetchReports(user.uid);
        loadDraft(user.uid);
        // Setup real-time listener untuk reports
        setupReportsListener(user.uid);
      } else {
        setReports([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-save draft setiap 30 detik jika ada perubahan
  useEffect(() => {
    if (currentUser && (reportDescription.trim() || dailyRating)) {
      const autoSaveTimer = setTimeout(() => {
        saveDraft();
      }, 30000); // 30 seconds

      return () => clearTimeout(autoSaveTimer);
    }
  }, [reportDescription, dailyRating, selectedDate, currentUser]);

  // Setup real-time listener untuk reports
  const setupReportsListener = (userId) => {
    try {
      const reportsQuery = query(
        collection(db, 'reports'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
        const reportsData = [];
        snapshot.forEach((doc) => {
          reportsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setReports(reportsData);
      }, (error) => {
        console.error('Error in reports listener:', error);
        // Fallback to regular fetch if listener fails
        fetchReports(userId);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up reports listener:', error);
      fetchReports(userId);
    }
  };

  // Function untuk menyimpan user data ke Firestore
  const saveUserToFirestore = async (user) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        photoURL: user.photoURL || null,
        lastLogin: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(userRef, userData, { merge: true });
      console.log('User data saved to Firestore');
    } catch (error) {
      console.error('Error saving user to Firestore:', error);
    }
  };

  // Function untuk menyimpan draft
  const saveDraft = async () => {
    if (!currentUser || (!reportDescription.trim() && !dailyRating)) return;

    setIsDraftSaving(true);
    try {
      const draftRef = doc(db, 'reportDrafts', `${currentUser.uid}_${selectedDate}`);
      const draftData = {
        userId: currentUser.uid,
        date: selectedDate,
        description: reportDescription,
        rating: dailyRating,
        updatedAt: new Date(),
        isDraft: true
      };

      await setDoc(draftRef, draftData, { merge: true });
      setDraftSaved(true);
      setHasDraft(true);
      
      setTimeout(() => setDraftSaved(false), 2000);
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsDraftSaving(false);
    }
  };

  // Function untuk memuat draft
  const loadDraft = async (userId) => {
    try {
      const draftRef = doc(db, 'reportDrafts', `${userId}_${selectedDate}`);
      const draftDoc = await getDocs(query(collection(db, 'reportDrafts'), where('userId', '==', userId), where('date', '==', selectedDate)));
      
      if (!draftDoc.empty) {
        const draftData = draftDoc.docs[0].data();
        setReportDescription(draftData.description || '');
        setDailyRating(draftData.rating || '');
        setHasDraft(true);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  // Function untuk menghapus draft
  const deleteDraft = async () => {
    if (!currentUser) return;

    try {
      const draftRef = doc(db, 'reportDrafts', `${currentUser.uid}_${selectedDate}`);
      await deleteDoc(draftRef);
      setHasDraft(false);
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  const fetchReports = async (userId = null) => {
    setIsLoadingReports(true);
    try {
      const userIdToUse = userId || currentUser?.uid;
      
      if (!userIdToUse) {
        console.log('No user ID available');
        setIsLoadingReports(false);
        return;
      }

      let reportsData = [];
      
      try {
        const reportsQuery = query(
          collection(db, 'reports'),
          where('userId', '==', userIdToUse),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(reportsQuery);
        querySnapshot.forEach((doc) => {
          reportsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
      } catch (indexError) {
        console.log('Composite index not available, using fallback method');
        
        const fallbackQuery = query(
          collection(db, 'reports'),
          where('userId', '==', userIdToUse)
        );
        
        const querySnapshot = await getDocs(fallbackQuery);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          reportsData.push({
            id: doc.id,
            ...data
          });
        });
        
        reportsData.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });
      }
      
      setReports(reportsData);
      
    } catch (error) {
      console.error('Error fetching reports:', error);
      setSubmitMessage('Error loading reports: ' + error.message);
      setTimeout(() => setSubmitMessage(''), 5000);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handlePreviewReport = () => {
    if (!reportDescription.trim()) {
      setSubmitMessage('Deskripsi pekerjaan tidak boleh kosong');
      return;
    }
    setShowPreview(true);
  };

  const handleSubmit = async (fromPreview = false) => {
    if (!fromPreview && !showPreview) {
      handlePreviewReport();
      return;
    }

    if (!currentUser) {
      setSubmitMessage('Anda harus login terlebih dahulu');
      return;
    }

    if (!reportDescription.trim()) {
      setSubmitMessage('Deskripsi pekerjaan tidak boleh kosong');
      return;
    }

    if (!selectedDate) {
      setSubmitMessage('Tanggal tidak boleh kosong');
      return;
    }

    if (!dailyRating) {
      setSubmitMessage('Penilaian harian tidak boleh kosong');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const dateObject = new Date(selectedDate);
      const formattedDate = dateObject.toLocaleDateString('en-GB');

      const reportData = {
        date: formattedDate,
        dateObject: dateObject,
        description: reportDescription.trim(),
        dailyRating: dailyRating,
        createdAt: new Date(),
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
        userPhotoURL: currentUser.photoURL || null,
        status: 'pending', // Changed from 'submitted' to 'pending'
        adminStatus: 'pending',
        adminComment: '',
        adminId: null,
        adminName: null,
        reviewedAt: null,
        lastUpdated: new Date()
      };

      const docRef = await addDoc(collection(db, 'reports'), reportData);
      console.log('Report submitted with ID:', docRef.id);
      
      // Hapus draft setelah submit berhasil
      await deleteDraft();
      
      // Clear form
      setReportDescription('');
      setDailyRating('');
      setShowPreview(false);
      
      setSubmitMessage('Report berhasil dikirim dan menunggu review admin!');
      fetchReports();
      
      setTimeout(() => setSubmitMessage(''), 3000);

    } catch (error) {
      console.error('Error submitting report:', error);
      setSubmitMessage('Error mengirim report: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMenuClick = (menuId) => {
    setActiveMenuItem(menuId);
    setSidebarOpen(false);
    
    if (menuId === 'Task') {
      window.location.href = '/home';
    } else if (menuId === 'Log Progress') {
      window.location.href = '/progress';
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) {
      try {
        await signOut(auth);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userToken');
        localStorage.removeItem('previousStats');
        window.location.href = '/login';
      } catch (error) {
        console.error('Error signing out:', error);
        alert('Terjadi kesalahan saat logout: ' + error.message);
      }
    }
  };

  const handleProfileClick = () => {
    window.location.href = '/profil';
    setShowDropdown(false);
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const formatDate = (dateInput) => {
    if (!dateInput) return 'Invalid Date';
    
    let date;
    
    if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
      date = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      date = new Date();
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545'; 
      case 'pending': return '#ffc107';
      case 'submitted': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle2 size={16} />;
      case 'rejected': return <XCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'pending': return 'Menunggu Review';
      case 'submitted': return 'Terkirim';
      default: return 'Status Tidak Diketahui';
    }
  };

  const getRatingDisplay = (rating) => {
    const option = ratingOptions.find(opt => opt.value === rating);
    return option ? option.label : rating;
  };

  const handleReportClick = (report) => {
    setSelectedReport(report);
    setShowReportDetail(true);
  };

  // Loading state untuk auth
  if (isAuthLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // State ketika user belum login
  if (!currentUser) {
    return (
      <div className="report-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            Anda harus login terlebih dahulu
          </div>
          <div style={{ color: '#666', marginBottom: '30px' }}>
            Silakan login untuk mengakses halaman report
          </div>
          <button 
            onClick={() => window.location.href = '/login'}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            Login Sekarang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-container">
      {/* Header Bar */}
      <div className="report-header-bar">
        <div className="report-header-left">
          <button className="report-sidebar-toggle" onClick={toggleSidebar}>
            <Menu size={20} />
          </button>
          <img 
            src={logoLRS} 
            alt="Len Railway Systems" 
            className="report-logo"
            onClick={() => window.location.href = '/home'}
          />
        </div>
        
        <div className="report-header-center">
          <h1 className="report-title-header">Daily Report</h1>
        </div>
        
        <div className="report-header-right">
          <div className="report-profile-container">
            <button
              className="report-profile-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="report-profile-avatar">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" className="report-avatar-image" />
                ) : (
                  <span className="report-avatar-text">
                    {(currentUser.displayName || currentUser.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="report-profile-info">
                <div className="report-profile-name">
                  {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                </div>
                <div className="report-profile-id">ID: {currentUser.uid?.substring(0, 8) || 'N/A'}</div>
              </div>
            </button>

            {showDropdown && (
              <div className="report-dropdown-menu">
                <div className="report-dropdown-header">
                  <div className="report-profile-avatar">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="report-avatar-image" />
                    ) : (
                      <span className="report-avatar-text">
                        {(currentUser.displayName || currentUser.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="report-dropdown-name">
                      {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                    </div>
                    <div className="report-dropdown-email">{currentUser.email}</div>
                    <div className="report-dropdown-id">ID: {currentUser.uid?.substring(0, 8) || 'N/A'}</div>
                  </div>
                </div>
                <button className="report-dropdown-item" onClick={handleProfileClick}>
                  <User className="report-dropdown-icon" />
                  <span>Profile</span>
                </button>
                <hr className="report-dropdown-divider" />
                <button className="report-dropdown-item report-dropdown-logout" onClick={handleLogout}>
                  <LogOut className="report-dropdown-icon" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`report-sidebar ${sidebarOpen ? 'report-sidebar-open' : ''}`}>
        <div className="report-sidebar-header">
          <h3>Menu</h3>
          <button className="report-sidebar-close" onClick={closeSidebar}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="report-sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`report-sidebar-item ${activeMenuItem === item.id ? 'active' : ''}`}
                onClick={() => handleMenuClick(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="report-sidebar-overlay" onClick={closeSidebar}></div>
      )}

      {/* Main Content */}
      <div className={`report-main-content ${sidebarOpen ? 'report-main-content-shifted' : ''}`}>
        <div className="report-content-area">
          <div className="report-content-header"></div>

          {/* Report Form */}
          <div className="report-form-container">
            <h2 className="report-form-title">Report Pekerjaan Hari Ini</h2>
            <p className="report-form-subtitle">Apa Yang Telah Dikerjakan Hari Ini?</p>

            {/* Draft Status */}
            {hasDraft && (
              <div className="report-draft-status">
                <AlertCircle size={16} />
                <span>Draft tersimpan untuk tanggal ini</span>
              </div>
            )}

            {/* Auto-save Status */}
            {(isDraftSaving || draftSaved) && (
              <div className="report-autosave-status">
                {isDraftSaving ? (
                  <>
                    <Save size={16} className="spinning" />
                    <span>Menyimpan draft...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span>Draft tersimpan</span>
                  </>
                )}
              </div>
            )}

            {/* Submit Message */}
            {submitMessage && (
              <div className={`report-message ${
                submitMessage.includes('Error') || 
                submitMessage.includes('kosong') || 
                submitMessage.includes('login') ? 'error' : 'success'
              }`}>
                {submitMessage}
              </div>
            )}

            <div className="report-form-group">
              <label className="report-form-label">Tanggal</label>
              <input
                type="date"
                className="report-form-input"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  loadDraft(currentUser.uid);
                }}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="report-form-group">
              <label className="report-form-label">Apa yang dikerjakan hari ini</label>
              <textarea
                className="report-form-textarea"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Masukkan deskripsi pekerjaan hari ini..."
                rows={4}
                maxLength={1000}
              />
              <div style={{ fontSize: '12px', color: '#666', textAlign: 'right', marginTop: '4px' }}>
                {reportDescription.length}/1000
              </div>
            </div>

            {/* Daily Rating */}
            <div className="report-form-group">
              <label className="report-form-label">Penilaian Harian</label>
              <div className="report-rating-options">
                {ratingOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`report-rating-btn ${dailyRating === option.value ? 'active' : ''}`}
                    onClick={() => setDailyRating(option.value)}
                  >
                    <span className="rating-emoji">{option.emoji}</span>
                    <span className="rating-text">{option.label.split(' ').slice(1).join(' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="report-form-actions">
              <button 
                className="report-draft-btn" 
                onClick={saveDraft}
                disabled={isDraftSaving || (!reportDescription.trim() && !dailyRating)}
              >
                <Save size={16} />
                {isDraftSaving ? 'Menyimpan...' : 'Simpan Draft'}
              </button>
              
              <button 
                className="report-preview-btn" 
                onClick={handlePreviewReport}
                disabled={!reportDescription.trim()}
              >
                <Eye size={16} />
                Preview
              </button>
              
              <button 
                className="report-submit-btn" 
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Mengirim...' : 'Kirim Report'}
              </button>
            </div>
          </div>

          {/* Preview Modal */}
          {showPreview && (
            <div className="report-preview-overlay">
              <div className="report-preview-modal">
                <div className="report-preview-header">
                  <h3>Preview Report</h3>
                  <button 
                    className="report-preview-close"
                    onClick={() => setShowPreview(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="report-preview-content">
                  <div className="report-preview-item">
                    <strong>Tanggal:</strong>
                    <span>{new Date(selectedDate).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                  
                  <div className="report-preview-item">
                    <strong>Penilaian Harian:</strong>
                    <span>{getRatingDisplay(dailyRating)}</span>
                  </div>
                  
                  <div className="report-preview-item">
                    <strong>Deskripsi Pekerjaan:</strong>
                    <p>{reportDescription}</p>
                  </div>
                </div>
                
                <div className="report-preview-actions">
                  <button 
                    className="report-preview-cancel"
                    onClick={() => setShowPreview(false)}
                  >
                    Kembali Edit
                  </button>
                  <button 
                    className="report-preview-submit"
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Mengirim...' : 'Kirim Report'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Report Detail Modal */}
          {showReportDetail && selectedReport && (
            <div className="report-preview-overlay">
              <div className="report-preview-modal" style={{ maxWidth: '700px' }}>
                <div className="report-preview-header">
                  <h3>Detail Report</h3>
                  <button 
                    className="report-preview-close"
                    onClick={() => setShowReportDetail(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="report-preview-content">
                  <div className="report-preview-item">
                    <strong>Tanggal:</strong>
                    <span>{formatDate(selectedReport.createdAt)}</span>
                  </div>
                  
                  <div className="report-preview-item">
                    <strong>Status:</strong>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      color: getStatusBadgeColor(selectedReport.adminStatus || selectedReport.status)
                    }}>
                      {getStatusIcon(selectedReport.adminStatus || selectedReport.status)}
                      <span style={{ fontWeight: 'bold' }}>
                        {getStatusText(selectedReport.adminStatus || selectedReport.status)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="report-preview-item">
                    <strong>Penilaian Harian:</strong>
                    <span>{getRatingDisplay(selectedReport.dailyRating)}</span>
                  </div>
                  
                  <div className="report-preview-item">
                    <strong>Deskripsi Pekerjaan:</strong>
                    <p>{selectedReport.description}</p>
                  </div>

                  {/* Admin Feedback Section */}
                  {selectedReport.adminComment && (
                    <div className="report-preview-item">
                      <strong>Komentar Admin:</strong>
                      <div style={{
                        background: '#f8f9fa',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e9ecef',
                        marginTop: '8px'
                      }}>
                        <p style={{ margin: '0 0 8px 0' }}>{selectedReport.adminComment}</p>
                        {selectedReport.adminName && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#6c757d',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span>Oleh: {selectedReport.adminName}</span>
                            {selectedReport.reviewedAt && (
                              <span>
                                {formatDate(selectedReport.reviewedAt)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedReport.reviewedAt && (
                    <div className="report-preview-item">
                      <strong>Direview pada:</strong>
                      <span>{formatDate(selectedReport.reviewedAt)}</span>
                    </div>
                  )}
                </div>
                
                <div className="report-preview-actions">
                  <button 
                    className="report-preview-cancel"
                    onClick={() => setShowReportDetail(false)}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recent Reports Section */}
          <div className="report-history-container">
            <h3 className="report-history-title">Report Terbaru</h3>
            
            {isLoadingReports ? (
              <div className="report-loading">
                <div className="loading-spinner"></div>
                Memuat report...
              </div>
            ) : reports.length === 0 ? (
              <div className="report-empty">
                Belum ada report yang dikirim. Kirim report pertama Anda!
              </div>
            ) : (
              <div className="report-history-list">
                {reports.slice(0, 10).map((report) => (
                  <div 
                    key={report.id} 
                    className="report-history-item"
                    onClick={() => handleReportClick(report)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="report-history-date">
                      {formatDate(report.createdAt)}
                    </div>
                    <div className="report-history-content">
                      {report.dailyRating && (
                        <div className="report-history-rating">
                          {getRatingDisplay(report.dailyRating)}
                        </div>
                      )}
                      <p className="report-history-description">
                        {report.description.length > 100 
                          ? report.description.substring(0, 100) + '...' 
                          : report.description
                        }
                      </p>
                      <div className="report-history-meta">
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          color: getStatusBadgeColor(report.adminStatus || report.status)
                        }}>
                          {getStatusIcon(report.adminStatus || report.status)}
                          <span 
                            className="report-history-status"
                            style={{ 
                              color: getStatusBadgeColor(report.adminStatus || report.status),
                              fontWeight: 'bold',
                              background: `${getStatusBadgeColor(report.adminStatus || report.status)}20`,
                              border: `1px solid ${getStatusBadgeColor(report.adminStatus || report.status)}40`
                            }}
                          >
                            {getStatusText(report.adminStatus || report.status)}
                          </span>
                        </div>
                        
                        {/* Admin Comment Indicator */}
                        {report.adminComment && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            color: '#667eea',
                            fontSize: '12px'
                          }}>
                            <MessageSquare size={14} />
                            <span>Ada komentar admin</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;