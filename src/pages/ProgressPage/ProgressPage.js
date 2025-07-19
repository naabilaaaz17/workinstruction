import React, { useState } from 'react';
import { CheckCircle, TrendingUp, FileText, Settings } from 'lucide-react';
import logoLRS from '../assets/images/logoLRS.png';
import './ProgressPage.css';

const ProgressPage = () => {
  const [tasks] = useState([
    {
      id: 1,
      title: "Task 1 : Pemasangan Trafo Module Ke Rear",
      date: "07/06/2025",
      status: "Selesai"
    },
    {
      id: 2,
      title: "Task 2 : Pemasangan Trafo Module Ke Rear",
      date: "07/06/2025",
      status: "Selesai"
    },
    {
      id: 3,
      title: "Task 3 : Pemasangan Trafo Module Ke Rear",
      date: "07/06/2025",
      status: "Selesai"
    }
  ]);

  const [activeMenuItem, setActiveMenuItem] = useState('Log Progress');

  const menuItems = [
    { id: 'Task', label: 'Task', icon: CheckCircle },
    { id: 'Log Progress', label: 'Log Progress', icon: TrendingUp },
    { id: 'Report', label: 'Report', icon: FileText }
  ];

  const handleMenuClick = (menuId) => {
    setActiveMenuItem(menuId);
    if (menuId === 'Task') {
      window.location.href = '/home';
    } else if (menuId === 'Report') {
      window.location.href = '/report';
    }
  };

  return (
    <div className="progress-container">
      {/* Sidebar */}
      <aside className="progress-sidebar">
        <div className="progress-logo-section">
          <div className="progress-logo-wrapper">
            <div className="progress-logo-icon">
              <img src={logoLRS} alt="LRS Logo" className="progress-logo-image" />
            </div>
          </div>
        </div>

        <div className="progress-menu-section">
          <div className="progress-menu-header">MENU</div>
          <nav className="progress-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenuItem === item.id;
              return (
                <button
                  key={item.id}
                  className={`progress-nav-item ${isActive ? 'progress-nav-active' : ''}`}
                  onClick={() => handleMenuClick(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="progress-menu-section">
          <div className="progress-menu-header">LAINNYA</div>
          <nav className="progress-nav">
            <button className="progress-nav-item">
              <Settings size={18} />
              <span>Pengaturan</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main */}
      <main className="progress-main">
        {/* Header */}
        <header className="progress-header">
          <h1 className="progress-title">Progress</h1>
          <div className="progress-header-right">
            <button className="progress-notification">🔔</button>
            <div className="progress-user-profile">
              <div className="progress-avatar">K</div>
              <span className="progress-username">Karyawan</span>
              <span className="progress-dropdown">▼</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <section className="progress-content">
          <div className="progress-task-container">
            {tasks.map((task) => (
              <div key={task.id} className="progress-task-card">
                <div className="progress-task-info">
                  <h4 className="progress-task-title">{task.title}</h4>
                  <span className="progress-task-date">{task.date}</span>
                </div>
                <div className="progress-task-status">
                  <span className="progress-status-badge">{task.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProgressPage;