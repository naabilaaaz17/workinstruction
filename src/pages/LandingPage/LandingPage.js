import React, { useState, useEffect } from 'react';
import { ChevronRight, Menu, X, Play, ArrowRight, CheckCircle, Users, FileText, Clock, Settings, MessageSquare, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Tambahkan ini

// Import images
import LogoLen from '../assets/images/logo-defend-len.png';
import Product1 from '../assets/images/product1.png';
import Product2 from '../assets/images/product2.png';
import Product3 from '../assets/images/product3.png';
import heroBackground from '../assets/images/hero-background.jpg';
// Import video 
import workIllustration from '../assets/videos/work-illustration.mp4';
import './LandingPage.css';

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFAQIndex, setOpenFAQIndex] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [videoError, setVideoError] = useState(false);
  
  const navigate = useNavigate(); // Tambahkan ini

  const toggleFAQ = (index) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-slide effect untuk carousel custom
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % 3); // 3 total slides untuk dots
    }, 4000); // 4 detik per slide

    return () => clearInterval(interval);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Ubah handler functions ini
  const handleSignIn = () => {
    navigate('/login'); // Navigasi ke halaman login
  };

  const handleRegister = () => {
    navigate('/register'); // Navigasi ke halaman register
  };

  const handleGetStarted = () => {
    navigate('/register'); // Atau ke login, sesuai preferensi
  };

  const handleViewDemo = () => {
    console.log('View demo clicked');
    // Bisa scroll ke section demo atau buka modal
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  const handleVideoError = () => {
    console.log('Video failed to load');
    setVideoError(true);
  };

  const faqs = [
    {
      question: 'Saya belum punya akun, bagaimana cara daftar?',
      answer: 'Silakan hubungi admin HRD untuk pendaftaran awal. Admin akan membuatkan akun dan memberikan kredensial login kepada Anda.',
    },
    {
      question: 'Saya lupa password, bagaimana cara reset?',
      answer: 'Gunakan tombol "Lupa Password" pada halaman login. Masukkan email yang terdaftar dan ikuti instruksi reset password yang dikirim ke email Anda.',
    },
    {
      question: 'Apakah sistem ini bisa diakses dari mobile?',
      answer: 'Ya, sistem ini responsive dan dapat diakses dari berbagai perangkat termasuk smartphone, tablet, dan desktop untuk kemudahan akses di lapangan.',
    },
  ];

  // Data untuk carousel
  const carouselImages = [Product1, Product2, Product3];

  // Sisa kode komponen tetap sama...
  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner">
          <div className="nav-title">
            <span className="text-blue-600">Len</span> Railway Systems
          </div>
          
          <div className="nav-links">
            <a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>
              Home
            </a>
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>
              Tentang Sistem
            </a>
            <a href="#how-to-use" onClick={(e) => { e.preventDefault(); scrollToSection('how-to-use'); }}>
              Cara Menggunakan
            </a>
            <a href="#faq" onClick={(e) => { e.preventDefault(); scrollToSection('faq'); }}>
              FAQ
            </a>
          </div>
          
          <div className="nav-buttons">
            <button onClick={handleSignIn} className="btn-primary">
              Sign In
            </button>
            <button onClick={handleRegister} className="btn-secondary">
              Register
            </button>
          </div>
          
          <button className="mobile-menu-btn" onClick={toggleMenu}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
          <a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>
            Home
          </a>
          <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>
            Tentang Sistem
          </a>
          <a href="#how-to-use" onClick={(e) => { e.preventDefault(); scrollToSection('how-to-use'); }}>
            Cara Menggunakan
          </a>
          <a href="#faq" onClick={(e) => { e.preventDefault(); scrollToSection('faq'); }}>
            FAQ
          </a>
          <div className="nav-buttons">
            <button onClick={handleSignIn} className="btn-primary">
              Sign In
            </button>
            <button onClick={handleRegister} className="btn-secondary">
              Register
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="home"
        className="hero-section modern-hero"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh',
          color: 'white'
        }}
      >
        <div className="hero-container">
          <h1 className="modern-title">Stay on Track</h1>
          <h2 className="modern-subtitle">With Len Railways System</h2>
          <p className="hero-description centered-text">
            Kelola instruksi kerja, pantau tim secara real-time, dan capai efisiensi maksimal di setiap langkah kerja.
          </p>
          <div className="hero-cta-buttons centered-buttons">
            <button onClick={handleGetStarted} className="cta-primary modern-button">
              Mulai Sekarang
            </button>
            <button onClick={handleViewDemo} className="cta-secondary modern-button">
              Lihat Demo
            </button>
          </div>
          
          {/* Carousel */}
          <div className="carousel-wrapper">
            <div className="custom-carousel">
              <div
                className="carousel-track"
                style={{
                  transform: `translateX(-${currentSlide * 33.333}%)`,
                  transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {carouselImages.map((image, index) => (
                  <div key={index} className="carousel-slide">
                    <div className="carousel-image-container">
                      <img 
                        src={image} 
                        className="carousel-img" 
                        alt={`Product ${index + 1}`}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="image-fallback" style={{ display: 'none' }}>
                        <div className="fallback-placeholder">
                          <FileText size={48} />
                          <span>Product {index + 1}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="carousel-dots">
                {[0, 1, 2].map((dot) => (
                  <button
                    key={dot}
                    className={`carousel-dot ${currentSlide === dot ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(dot)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT SECTION ===== */}
      <section id="about" className="about-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Sistem yang Mengubah Cara Kerja Tim</h2>
            <p className="section-subtitle">
              Solusi digital yang memastikan setiap instruksi kerja tersampaikan dengan jelas dan efisien
            </p>
          </div>

          <div className="about-grid">
            {/* Left Side - Cards */}
            <div className="about-cards-container">
              <div className="about-card">
                <div className="about-card-content">
                  <div className="about-icon"><Settings size={32} /></div>
                  <div className="about-card-text">
                    <h3 className="about-card-title">Menghindari Miskomunikasi Pekerjaan</h3>
                    <p className="about-card-description">
                      Sistem ini memastikan setiap instruksi kerja jelas dan terstandarisasi,
                      mengurangi kesalahan akibat miskomunikasi antar tim.
                    </p>
                  </div>
                </div>
              </div>

              <div className="about-card">
                <div className="about-card-content">
                  <div className="about-icon"><FileText size={32} /></div>
                  <div className="about-card-text">
                    <h3 className="about-card-title">Instruksi Terdokumentasi Digital</h3>
                    <p className="about-card-description">
                      Semua prosedur kerja tersimpan dalam format digital yang mudah diakses,
                      diperbarui, dan dibagikan kepada seluruh tim.
                    </p>
                  </div>
                </div>
              </div>

              <div className="about-card">
                <div className="about-card-content">
                  <div className="about-icon"><Clock size={32} /></div>
                  <div className="about-card-text">
                    <h3 className="about-card-title">Akses Instruksi Kapan Saja</h3>
                    <p className="about-card-description">
                      Pekerja dapat mengakses instruksi kerja 24/7 melalui perangkat mobile
                      atau desktop, memastikan produktivitas maksimal.
                    </p>
                  </div>
                </div>
              </div>

              <div className="about-card">
                <div className="about-card-content">
                  <div className="about-icon"><Users size={32} /></div>
                  <div className="about-card-text">
                    <h3 className="about-card-title">Dukung Kolaborasi Tim</h3>
                    <p className="about-card-description">
                      Dirancang untuk teknisi, supervisor, dan staff operasional
                      dengan interface yang mudah dipahami dan digunakan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Video */}
            <div className="about-animation">
              {!videoError ? (
                <video 
                  className="about-video" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  onError={handleVideoError}
                >
                  <source src={workIllustration} type="video/mp4" />
                  <source src="./assets/videos/work-illustration.mp4" type="video/mp4" />
                  <source src="/assets/videos/work-illustration.mp4" type="video/mp4" />
                  <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="video-placeholder">
                  <div className="placeholder-content">
                    <div className="placeholder-icon">
                      <Play size={64} />
                    </div>
                    <div className="placeholder-text">
                      <h3>Work Illustration Video</h3>
                      <p>Video menunjukkan cara kerja sistem</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Floating decorative elements */}
              <div className="floating-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Use Section */}
      <section id="how-to-use" className="how-to-use-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Cara Menggunakan Sistem Ini</h2>
            <p className="section-subtitle">
              Langkah singkat untuk memulai - mudah digunakan bahkan untuk pengguna awam
            </p>
          </div>
          
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3 className="step-title">Login dengan Akun Karyawan</h3>
                <p className="step-description">Masuk menggunakan akun yang telah didaftarkan oleh admin HRD</p>
              </div>
            </div>
            
            <div className="step-arrow">
              <ArrowRight size={24} />
            </div>
            
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3 className="step-title">Lihat Instruksi Kerja Hari Ini</h3>
                <p className="step-description">Dashboard akan menampilkan semua tugas dan instruksi yang harus diselesaikan</p>
              </div>
            </div>
            
            <div className="step-arrow">
              <ArrowRight size={24} />
            </div>
            
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3 className="step-title">Ikuti Langkah yang Tertera</h3>
                <p className="step-description">Instruksi detail akan memandu setiap langkah pekerjaan yang harus dilakukan</p>
              </div>
            </div>
            
            <div className="step-arrow">
              <ArrowRight size={24} />
            </div>
            
            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3 className="step-title">Tandai Selesai dan Unggah Bukti</h3>
                <p className="step-description">Setelah selesai, tandai sebagai complete dan upload foto/dokumen jika diperlukan</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Pertanyaan yang Sering Diajukan</h2>
            <p className="section-subtitle">
              Jawaban untuk pertanyaan umum tentang sistem Work Instruction
            </p>
          </div>

          <div className="faq-grid">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`faq-card ${openFAQIndex === index ? 'active' : ''}`}
                onClick={() => toggleFAQ(index)}
              >
                <div className="faq-question">
                  <span>{faq.question}</span>
                  <span className="faq-toggle-icon">
                    {openFAQIndex === index ? '−' : '+'}
                  </span>
                </div>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img 
              src={LogoLen} 
              alt="Logo Len Railway Systems" 
              className="footer-logo-img"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="logo-fallback" style={{ display: 'none' }}>
              <span>LEN</span>
            </div>
          </div>
          <div className="footer-info">
            <p className="footer-text">
              © 2025 Len Railways System. Seluruh Hak Cipta Dilindungi.
            </p>
            <p className="footer-subtext">
              PT Len Railway Systems - Solusi Teknologi Kereta Api Terdepan
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;