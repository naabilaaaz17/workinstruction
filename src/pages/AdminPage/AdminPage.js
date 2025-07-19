import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import logoLRS from '../assets/images/logoLRS.png';
import './AdminPage.css';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const AdminPage = () => {
  const [data, setData] = useState([]);
  const [bulan, setBulan] = useState('');
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRekap = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, 'rekapPengerjaan'));
        const result = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(result);
        setError('');
      } catch (error) {
        console.error('Gagal mengambil data:', error);
        setError('Gagal mengambil data. Silakan coba lagi.');
      } finally {
        setLoading(false);
      }
    };

    fetchRekap();
  }, []);

  // Filter berdasarkan bulan & tahun
const filteredData = data.filter(entry => {
  const rawTanggal = entry.tanggal;

  // Jika tanggal adalah timestamp (memiliki .seconds), gunakan itu
  const date = rawTanggal?.seconds
    ? new Date(rawTanggal.seconds * 1000)
    : new Date(rawTanggal); // jika tanggal berupa string ISO

  const bulanMatch = bulan ? date.getMonth() + 1 === parseInt(bulan) : true;
  const tahunMatch = tahun ? date.getFullYear() === parseInt(tahun) : true;

  return bulanMatch && tahunMatch;
});


  const handleExport = () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }

    const exportData = filteredData.map((entry, index) => ({
      No: index + 1,
      Nama: entry.nama,
      Tanggal: new Date(entry.tanggal?.seconds ? entry.tanggal.seconds * 1000 : entry.tanggal).toLocaleDateString('id-ID'),
      'Total Waktu': formatTime(entry.totalTime),
      Langkah: entry.stepTimes.map(s => `${s.step} (${formatStepTime(s.duration)})`).join(', ')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap');

    const xlsxBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([xlsxBuffer], { type: 'application/octet-stream' });

    const fileName = `Rekap-${bulan ? new Date(0, bulan - 1).toLocaleString('id-ID', { month: 'long' }) : 'Semua'}-${tahun}.xlsx`;
    saveAs(blob, fileName);
  };

  const handleViewReport = () => {
    // Navigasi ke halaman report atau buka modal report
    // Anda bisa menambahkan logika sesuai kebutuhan
    navigate('/report', { 
      state: { 
        filteredData, 
        bulan, 
        tahun 
      } 
    });
  };

  const handleAddTask = () => {
    navigate('/addtask');
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleBackClick = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-header-left">
            <img 
              src="/logoLRS.png" 
              alt="LRS Logo" 
              className="admin-logo"
              onClick={handleLogoClick}
            />
          </div>
        </div>
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
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
          <h1 className="admin-title">Dashboard Rekap Pengerjaan</h1>
        </div>
        <div className="admin-header-right">
          <button onClick={handleBackClick} className="admin-back-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="admin-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {error}
        </div>
      )}

      {/* Filter Section */}
      <div className="admin-filter-section">
        <div className="admin-filter-title">
          <h2>Filter Data</h2>
          <p>Pilih periode untuk melihat data rekap pengerjaan</p>
        </div>
        <div className="admin-filter-bar">
          <div className="admin-filter-group">
            <label>Bulan:</label>
            <select value={bulan} onChange={e => setBulan(e.target.value)}>
              <option value="">Semua Bulan</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-filter-group">
            <label>Tahun:</label>
            <input
              type="number"
              min="2020"
              max="2100"
              value={tahun}
              onChange={e => setTahun(e.target.value)}
            />
          </div>

          <div className="admin-filter-actions">
            <button onClick={handleExport} className="admin-export-button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Ekspor Excel
            </button>

            <button onClick={handleViewReport} className="admin-report-button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              Lihat Report
            </button>

            <button onClick={handleAddTask} className="admin-add-task-button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4m6-6h4a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4m-6 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/>
            </svg>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-number">{filteredData.length}</div>
            <div className="admin-stat-label">Total Rekap</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-number">
              {bulan ? new Date(0, bulan - 1).toLocaleString('id-ID', { month: 'long' }) : 'Semua'}
            </div>
            <div className="admin-stat-label">Bulan Dipilih</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-number">
              {filteredData.length > 0 ? 
                formatTime(filteredData.reduce((acc, curr) => acc + curr.totalTime, 0) / filteredData.length) : 
                '00:00:00'
              }
            </div>
            <div className="admin-stat-label">Rata-rata Waktu</div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="admin-table-section">
        <div className="admin-table-header">
          <h2>Data Rekap Pengerjaan</h2>
          <div className="admin-table-info">
            Menampilkan {filteredData.length} dari {data.length} total rekap
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Tanggal</th>
                <th>Total Waktu</th>
                <th>Detail Langkah</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="admin-empty-state">
                    <div className="admin-empty-content">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                      </svg>
                      <h3>Tidak ada data ditemukan</h3>
                      <p>Tidak ada data untuk bulan dan tahun yang dipilih</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="admin-name-cell">
                        <div className="admin-name-avatar">
                          {entry.nama.charAt(0).toUpperCase()}
                        </div>
                        <span>{entry.nama}</span>
                      </div>
                    </td>
                    <td>{new Date(entry.tanggal?.seconds ? entry.tanggal.seconds * 1000 : entry.tanggal).toLocaleDateString('id-ID')}</td>
                    <td>
                      <span className="admin-time-badge">
                        {formatTime(entry.totalTime)}
                      </span>
                    </td>
                    <td>
                      <div className="admin-steps-container">
                        {entry.stepTimes.map((step, i) => (
                          <div key={i} className="admin-step-item">
                            <span className="admin-step-name">{step.step}</span>
                            <span className="admin-step-time">{formatStepTime(step.duration)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Utils
const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const formatStepTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default AdminPage;