import React, { useState } from 'react';
import { CheckCircle, TrendingUp, FileText, Settings } from 'lucide-react';
import logoLRS from '../assets/images/logoLRS.png';
import './ReportPage.css';

const ReportPage = () => {
  const [selectedDate, setSelectedDate] = useState('08/05/2025');
  const [reportDescription, setReportDescription] = useState('Hari ini telah menyelesaikan task 1 untuk pemesanan tiket modul');
  const [duration, setDuration] = useState('');
  const [activeMenuItem, setActiveMenuItem] = useState('Report');

  const menuItems = [
    { id: 'Task', label: 'Task', icon: CheckCircle },
    { id: 'Log Progress', label: 'Log Progress', icon: TrendingUp },
    { id: 'Report', label: 'Report', icon: FileText }
  ];

  const handleSubmit = () => {
    console.log('Report submitted:', {
      date: selectedDate,
      description: reportDescription,
      duration: duration
    });
    // Add your submit logic here
  };

  const handleMenuClick = (menuId) => {
    setActiveMenuItem(menuId);
    
    if (menuId === 'Task') {
      window.location.href = '/home';
    } else if (menuId === 'Log Progress') {
      window.location.href = '/progress';
    }
  };

  return (
    <div className="report-container">
      {/* Sidebar */}
      <aside className="report-sidebar">
        <div className="report-logo-section">
          <div className="report-logo-wrapper">
            <div className="report-logo-icon">
              <img src={logoLRS} alt="LRS Logo" className="report-logo-image" />
            </div>
          </div>
        </div>
        
        {/* Menu Section */}
        <div className="report-menu-section">
          <div className="report-menu-header">MENU</div>
          
          <nav className="report-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenuItem === item.id;
              
              return (
                <button
                  key={item.id}
                  className={`report-nav-item ${isActive ? 'report-nav-active' : ''}`}
                  onClick={() => handleMenuClick(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Lainnya Section */}
        <div className="report-menu-section">
          <div className="report-menu-header">LAINNYA</div>
          
          <nav className="report-nav">
            <button className="report-nav-item">
              <Settings size={18} />
              <span>Pengaturan</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="report-main">
        <div className="report-content-header">
          <button className="report-today-btn">
            Report Harian
          </button>
        </div>

        <div className="report-form-container">
          <h2 className="report-form-title">Report Pekerjaan Hari Ini</h2>
          <p className="report-form-subtitle">Apa Yang Telah Dikerjakan Hari Ini?</p>

          <div className="report-form-group">
            <label className="report-form-label">Tanggal</label>
            <input
              type="text"
              className="report-form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              placeholder="DD/MM/YYYY"
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
            />
          </div>

          <div className="report-form-group">
            <label className="report-form-label">Durasi pengerjaan</label>
            <input
              type="text"
              className="report-form-input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Masukkan durasi pengerjaan..."
            />
          </div>

          <button className="report-submit-btn" onClick={handleSubmit}>
            Kirim Report
          </button>
        </div>
      </main>
    </div>
  );
};

export default ReportPage;