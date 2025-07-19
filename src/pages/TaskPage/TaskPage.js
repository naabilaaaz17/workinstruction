import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './TaskPage.css';
import logoLRS from '../assets/images/logoLRS.png';
import { db } from '../../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import gambar1 from '../assets/images/gambar1.jpg';
import gambar2 from '../assets/images/gambar2.jpg';
import gambar3 from '../assets/images/gambar3.jpg';
import gambar4 from '../assets/images/gambar4.jpg';
import gambar5 from '../assets/images/gambar5.jpg';
import gambar6 from '../assets/images/gambar6.jpg';
import gambar7 from '../assets/images/gambar7.jpg';
import gambar8 from '../assets/images/gambar8.jpg';
import gambar9 from '../assets/images/gambar9.jpg';
import gambar10 from '../assets/images/gambar10.jpg';
import gambarSepatu from '../assets/images/gambarSepatu.jpg';
import gambarSarungTangan from '../assets/images/gambarSarungTangan.avif';

const steps = [
  {
    title: "Langkah 1a: Persiapan - APD",
    description: "Siapkan dan gunakan APD & Alat Pendukung yang dibutuhkan seperti yang tertera di daftar APD dan Alat Pendukung dan pastikan dalam kondisi baik.",
    keyPoints: ["Sepatu ESD", "Sarung tangan ESD"],
    maxTime: 5,
    images: [gambarSepatu, gambarSarungTangan]
  },
  {
    title: "Langkah 1b: Persiapan - Peralatan & Storage",
    description: "Siapkan peralatan dan storage yang dibutuhkan dan pastikan siap digunakan.",
    keyPoints: ["Obeng (-)", "Storage kabel & cable tie", "Tie Gun", "Kunci Shock M3", "Kunci Hexagonal (L) 4mm", "Obeng (+)"],
    maxTime: 5,
    images: [gambar1]
  },
  {
    title: "Langkah 1c: Persiapan - Material",
    description: "Siapkan material yang dibutuhkan dan pastikan siap digunakan sesuai daftar.",
    keyPoints: [
      "Main 3 Aspect Module V3 (1 unit)", "Main Aspect Wiring Harness type 1 (3 set)", "Main Aspect Wiring Harness type 2 (3 set)",
      "Main 3 Aspect Wiring Harness module V3 (1 set)", "Label Kabel WML 3 untuk Main Aspect Wiring Harness Type 2 (0.5 set)",
      "Main Aspect Trafo Module V3 (3 unit)", "Cable tie (Tie wrap) panjang 10cm (50 pcs)",
      "Baut M3x10mm, ring plat M3, ring per M3, mur M3 (1 set)", "Twist Tie 7cm (4 pcs)"
    ],
    maxTime: 5,
    images: [gambar2]
  },
  {
    title: "Langkah 2: Assembling - Persiapan Modul",
    description: "Siapkan Main 3 Aspect Module V3 dan pastikan urutan Main Aspect yang terpasang dari atas ke bawah.",
    keyPoints: ["Green (atas)", "Yellow (tengah)", "Red (bawah)"],
    maxTime: 5,
    images: [gambar3]
  },
  {
    title: "Langkah 2: Assembling - Pemasangan Main Trafo Module",
    description: "Pasang semua Main Trafo Module di rear cover seperti gambar referensi.",
    keyPoints: ["Pasang 3 unit Trafo Module", "Pastikan posisi sesuai GAMBAR 2"],
    maxTime: 5,
    images: [gambar4]
  },
  {
    title: "Langkah 2: Assembling - Wiring & Terminasi Trafo Module",
    description: "Siapkan Wiring Harness type 2 kemudian lakukan Wiring & Terminasi untuk 3 unit Trafo Module.",
    keyPoints: ["Gunakan Wiring Harness type 2", "Untuk terminasi Resistor Burning, gunakan Baut M3x10mm, ring plat M3, ring per M3 dan mur M3"],
    maxTime: 5,
    images: [gambar5]
  },
  {
    title: "Langkah 2: Assembling - Wiring & Terminasi PSU & Led Module",
    description: "Siapkan Wiring Harness type 1 kemudian lakukan Wiring & Terminasi untuk 3 unit PSU & Led Module.",
    keyPoints: ["NOTE: Perhatikan Wiring PSU & LA Module/CON2 dengan Power Line Protection Module/JP2 ada yang menyilang."],
    maxTime: 5,
    images: [gambar6]
  },
  {
    title: "Langkah 2: Assembling - Pemasangan Label Kabel",
    description: "Pasang Label Kabel WML 3 untuk Emergency Aspect Wiring Harness type 2 yang belum terpasang label.",
    keyPoints: ["Untuk pemasangan label, berilah jarak ± 5mm antara label dengan ferrule."],
    maxTime: 5,
    images: [gambar7]
  },
  {
    title: "Langkah 2: Assembling - Wiring Aspect 1 ke 2",
    description: "Siapkan Main 3 Aspect Wiring Harness module V3 (K2) kemudian lakukan Wiring & Terminasi untuk Aspect 1 (Green) dengan Aspect 2 (Yellow).",
    keyPoints: ["Gunakan kabel K2", "Wiring Warna Merah"],
    maxTime: 5,
    images: [gambar8]
  },
  {
    title: "Langkah 2: Assembling - Wiring Aspect 2 ke 3",
    description: "Siapkan Main 3 Aspect Wiring Harness module V3 (K1) kemudian lakukan Wiring & Terminasi untuk Aspect 2 (Yellow) dengan Aspect 3 (Red).",
    keyPoints: ["Gunakan kabel K1", "Wiring Warna Biru"],
    maxTime: 5,
    images: [gambar8]
  },
  {
    title: "Langkah 3: Finishing - Rapikan Wiring",
    description: "Rapikan Wiring dengan cable tie ukuran 10 cm.",
    keyPoints: ["Gunakan cable tie 10cm", "Rapikan semua kabel"],
    maxTime: 5,
    images: [gambar9]
  },
  {
    title: "Langkah 3: Finishing - Pemasangan Modul Trafo",
    description: "Lepas Connector JP3 di Power Line Protection, lalu masukkan semua Modul Trafo ke Main Casing. Kencangkan baut Inbus Modul Trafo.",
    keyPoints: ["Gunakan kunci hexagonal (L) 4mm untuk mengencangkan baut."],
    maxTime: 5,
    images: [gambar9]
  },
  {
    title: "Langkah 3: Finishing - Pemasangan Kembali JP3",
    description: "Pasang kembali Conn JP3 ke Power Line Protection Module melalui lubang kabel di Main Casing.",
    keyPoints: ["Pasang JP3 melalui lubang kabel yang tersedia."],
    maxTime: 5,
    images: [gambar10]
  },
  {
    title: "Langkah 3: Finishing - Perapihan Wiring Harness",
    description: "Rapikan Main 3 Aspect Wiring Harness module V3 menggunakan twist tie.",
    keyPoints: ["Gunakan twist tie untuk merapikan."],
    maxTime: 5,
    images: [gambar10]
  },
  {
    title: "Langkah 3: Finishing - Pemeriksaan Akhir",
    description: "Periksa kembali hasil wiring dan terminasi dan pastikan semua kabel sudah terpasang dengan baik.",
    keyPoints: ["Gunakan Gambar Skema Wiring Main 3 Aspect V3 sebagai acuan."],
    maxTime: 5,
    images: [gambar10]
  },
  {
    title: "Langkah 3: Finishing - Penyelesaian",
    description: "Simpan peralatan, APD & alat pendukung. Isi kartu proses. Letakkan produk di storage.",
    keyPoints: ["Simpan semua peralatan ke tempatnya", "Isi kartu proses sesuai lot/proses", "Letakkan produk di storage yang telah disediakan"],
    maxTime: 5,
    images: []
  }
];

// Komponen Header yang dipisahkan
const TaskHeader = () => {
  return (
    <div className="task-header">
      <div className="task-header-left">
        <Link to="/home">
          <img src={logoLRS} alt="Logo LRS" className="header-logo" />
        </Link>
      </div>
      <div className="header-title-group">
        <h1 className="task-title">Instruksi Kerja Pembuatan Lampu Sinyal Main 3 Aspect V3</h1>
      </div>
      <Link to="/home" className="back-button">
        <span>Kembali</span>
      </Link>
    </div>
  );
};

// Helper format waktu
const formatTime = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const formatStepTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const TaskPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [stepTime, setStepTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [showReminder, setShowReminder] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [stepCompletionTimes, setStepCompletionTimes] = useState([]);
  const [manualName, setManualName] = useState('');
  const [showStopNotification, setShowStopNotification] = useState(false);

  const activeStep = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    let stepTimer, totalTimer;
    if (isRunning) {
      stepTimer = setInterval(() => setStepTime(prev => prev + 1), 1000);
      totalTimer = setInterval(() => setTotalTime(prev => prev + 1), 1000);
    }
    return () => {
      clearInterval(stepTimer);
      clearInterval(totalTimer);
    };
  }, [isRunning]);

  useEffect(() => {
    let reminderTimer;
    if (isRunning && activeStep.maxTime > 0) {
      reminderTimer = setTimeout(() => setShowReminder(true), activeStep.maxTime * 1000);
    }
    return () => clearTimeout(reminderTimer);
  }, [isRunning, currentStep, activeStep.maxTime]);

  const handleStartStep = () => setIsRunning(true);

  const handleStopStep = () => {
    setIsRunning(false);
    setShowReminder(false);
    setShowStopNotification(true);
  };

  const handleResumeStep = () => {
    setShowStopNotification(false);
    setIsRunning(true);
  };

  const handleCompleteStep = useCallback(async () => {
    const currentStepTime = stepTime;
    setStepCompletionTimes(prev => [...prev, currentStepTime]);
    setIsRunning(false);
    setStepTime(0);
    setShowReminder(false);

    if (!isLastStep) {
      setCurrentStep(prev => prev + 1);
    } else {
      setShowCompletion(true);

      // Simpan data ke Firestore
      const auth = getAuth();
      const user = auth.currentUser;
      const userName = manualName || user?.displayName || user?.email || 'Tanpa Nama';
      const todayDate = new Date().toISOString().split('T')[0];

      const allStepTimes = [...stepCompletionTimes, currentStepTime];
      const stepDetails = allStepTimes.map((duration, index) => ({
        step: steps[index]?.title || `Langkah ${index + 1}`,
        duration
      }));

      const taskData = {
        nama: userName,
        tanggal: todayDate,
        stepTimes: stepDetails,
        totalTime: totalTime
      };

      try {
        await addDoc(collection(db, 'rekapPengerjaan'), {
          ...taskData,
          timestamp: Timestamp.now()
        });
        console.log('✅ Data disimpan ke Firestore');
      } catch (error) {
        console.error('❌ Firestore error:', error);
      }
    }
  }, [stepTime, stepCompletionTimes, isLastStep, manualName, totalTime]);

  const handleReset = () => {
    setIsRunning(false);
    setCurrentStep(0);
    setStepTime(0);
    setTotalTime(0);
    setShowReminder(false);
    setShowCompletion(false);
    setStepCompletionTimes([]);
    setShowStopNotification(false);
  };

  const handleShowHelp = () => {
    setShowReminder(false);
    alert('Silakan hubungi supervisor untuk bantuan.');
  };

  return (
    <div className="task-container">
      <TaskHeader />

      <div className="task-progress">
        <div className="task-progress-bar">
          <div className="task-progress-fill" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}></div>
        </div>
        <div className="task-progress-text">{`Langkah ${currentStep + 1} dari ${steps.length}`}</div>
      </div>

      <div className="task-timer-display">
        <div className="task-total-time">Total Waktu: <span>{formatTime(totalTime)}</span></div>
        <div className="task-step-time">Waktu Langkah: <span>{formatStepTime(stepTime)}</span></div>
      </div>

      <div className="task-content">
        <div className="task-details-wrapper">
          <div className="task-step-info">
            <h2 className="task-step-title">{activeStep.title}</h2>
            <p className="task-step-description">{activeStep.description}</p>
            <div className="task-key-points">
              <h3>Titik Kunci:</h3>
              <ul>
                {activeStep.keyPoints.map((point, index) => <li key={index}>{point}</li>)}
              </ul>
            </div>
            <div className="task-safety-reminder">
              <h3>Keselamatan Kerja:</h3>
              <ul>
                <li>Selalu gunakan APD & Alat Pendukung yang sesuai.</li>
                <li>Jaga selalu kebersihan tempat kerja.</li>
              </ul>
            </div>
          </div>
          {activeStep.images?.length > 0 && (
            <div className="task-step-images">
              <h3>Gambar Referensi:</h3>
              {activeStep.images.map((imgSrc, index) => (
                <img key={index} src={imgSrc} alt={`Referensi ${index + 1}`} />
              ))}
            </div>
          )}
        </div>

        <div className="task-controls">
          <button 
            onClick={handleStartStep} 
            disabled={isRunning || showStopNotification} 
            className="task-btn task-btn-primary"
          >
            {isRunning ? 'Sedang Berjalan' : 'Mulai Langkah'}
          </button>
          
          <button 
            onClick={handleStopStep} 
            disabled={!isRunning} 
            className="task-btn task-btn-warning"
          >
            Stop
          </button>
          
          <button 
            onClick={handleCompleteStep} 
            disabled={!isRunning} 
            className="task-btn task-btn-success"
          >
            {isLastStep ? 'Selesaikan' : 'Selesai Langkah'}
          </button>
          
          <button 
            onClick={handleReset} 
            className="task-btn task-btn-secondary"
          >
            Reset
          </button>
        </div>
      </div>

      {showStopNotification && (
        <div className="task-modal task-modal-visible">
          <div className="task-modal-content">
            <h3>Timer Dihentikan</h3>
            <p>Timer untuk langkah ini telah dihentikan sementara.</p>
            <p>Waktu yang sudah berjalan: <span>{formatStepTime(stepTime)}</span></p>
            <div className="task-modal-actions">
              <button className="task-btn task-btn-primary" onClick={handleResumeStep}>Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {showReminder && (
        <div className="task-modal task-modal-visible">
          <div className="task-modal-content">
            <h3>Pengingat Waktu</h3>
            <p>Waktu Anda telah melewati {activeStep.maxTime / 60} menit.</p>
            <div className="task-modal-actions">
              <button className="task-btn task-btn-primary" onClick={() => setShowReminder(false)}>Lanjutkan</button>
              <button className="task-btn task-btn-secondary" onClick={handleShowHelp}>Butuh Bantuan</button>
            </div>
          </div>
        </div>
      )}

      {showCompletion && (
        <div className="task-modal task-modal-visible">
          <div className="task-modal-content">
            <h3>Selamat! Tugas Selesai</h3>
            <p>Anda telah menyelesaikan seluruh langkah kerja.</p>
            <p>Total waktu pengerjaan: <span>{formatTime(totalTime)}</span></p>
            <div className="task-recap-container">
              <h4>Rekap Waktu per Langkah:</h4>
              <ul className="task-recap-list">
                {stepCompletionTimes.map((time, index) => (
                  <li key={index}>
                    <span className="task-recap-title">{steps[index].title}</span>
                    <span className="task-recap-time">{formatStepTime(time)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="task-modal-actions">
              <button className="task-btn task-btn-primary" onClick={handleReset}>Tugas Baru</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskPage;