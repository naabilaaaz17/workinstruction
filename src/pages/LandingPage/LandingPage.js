import React, { useState, useEffect } from 'react';
import { Menu, X, Play, ArrowRight, Users, FileText, Clock, Settings, MessageSquare, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import images
import LogoLen from '../assets/images/logo-defend-len.png';
import Product1 from '../assets/images/product1.jpg';
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
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

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

  // Auto-slide effect untuk carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % 3);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Navigation handlers dengan loading state
  const handleSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      navigate('/login');
      setIsLoading(false);
    }, 300);
  };

  const handleRegister = () => {
    setIsLoading(true);
    setTimeout(() => {
      navigate('/register');
      setIsLoading(false);
    }, 300);
  };

  const handleGetStarted = () => {
    setIsLoading(true);
    setTimeout(() => {
      navigate('/register');
      setIsLoading(false);
    }, 300);
  };

  const handleViewDemo = () => {
    setIsLoading(true);
    setTimeout(() => {
      navigate('/login');
      setIsLoading(false);
    }, 300);
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

  // Enhanced FAQ data
  const faqs = [
    {
      question: 'Saya belum punya akun, bagaimana cara daftar?',
      answer: 'Silakan hubungi admin HRD untuk pendaftaran awal. Admin akan membuatkan akun dan memberikan kredensial login kepada Anda. Proses pendaftaran biasanya memakan waktu 1-2 hari kerja.',
    },
    {
      question: 'Saya lupa password, bagaimana cara reset?',
      answer: 'Gunakan tombol "Lupa Password" pada halaman login. Masukkan email yang terdaftar dan ikuti instruksi reset password yang dikirim ke email Anda. Link reset berlaku selama 24 jam.',
    },
    {
      question: 'Apakah sistem ini bisa diakses dari mobile?',
      answer: 'Ya, sistem ini responsive dan dapat diakses dari berbagai perangkat termasuk smartphone, tablet, dan desktop untuk kemudahan akses di lapangan. Aplikasi mobile native juga tersedia di App Store dan Play Store.',
    },
    {
      question: 'Bagaimana cara melaporkan masalah teknis?',
      answer: 'Anda dapat melaporkan masalah teknis melalui menu "Help" di dalam sistem, atau hubungi tim IT support melalui email support@lenrailway.com atau telepon ekstensi 1234.',
    },
    {
      question: 'Apakah data saya aman di sistem ini?',
      answer: 'Ya, sistem ini menggunakan enkripsi tingkat enterprise dan backup otomatis. Semua data disimpan di server yang aman dengan sertifikasi ISO 27001 dan audit keamanan berkala.',
    }
  ];

  // Data untuk carousel
  const carouselImages = [Product1, Product2, Product3];

  return (
    <div className="landing-page">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="landing-loading-overlay">
          <div className="landing-loading-spinner">
            <div className="landing-spinner"></div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className={`landing-navbar ${scrolled ? 'landing-navbar-scrolled' : ''}`}>
        <div className="landing-navbar-inner">
          <div className="landing-nav-title">
            <span className="landing-text-blue-600">Len</span> Railway Systems
          </div>
          
          <div className="landing-nav-links">
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
          
          <div className="landing-nav-buttons">
            <button onClick={handleSignIn} className="landing-btn-primary" disabled={isLoading}>
              Sign In
            </button>
            <button onClick={handleRegister} className="landing-btn-secondary" disabled={isLoading}>
              Register
            </button>
          </div>
          
          <button className="landing-mobile-menu-btn" onClick={toggleMenu} aria-label="Toggle menu">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        <div className={`landing-mobile-menu ${isMenuOpen ? 'landing-open' : ''}`}>
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
          <div className="landing-nav-buttons">
            <button onClick={handleSignIn} className="landing-btn-primary" disabled={isLoading}>
              Sign In
            </button>
            <button onClick={handleRegister} className="landing-btn-secondary" disabled={isLoading}>
              Register
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="home"
        className="landing-hero-section landing-modern-hero"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh',
          color: 'white'
        }}
      >
        <div className="landing-hero-container">
          <h1 className="landing-modern-title">Stay on Track</h1>
          <h2 className="landing-modern-subtitle">With Len Railways System</h2>
          <p className="landing-hero-description landing-centered-text">
            Kelola instruksi kerja, pantau tim secara real-time, dan capai efisiensi maksimal di setiap langkah kerja.
          </p>
          <div className="landing-hero-cta-buttons landing-centered-buttons">
            <button onClick={handleGetStarted} className="landing-cta-primary landing-modern-button" disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Mulai Sekarang'}
            </button>
            <button onClick={handleViewDemo} className="landing-cta-secondary landing-modern-button" disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Lihat Demo'}
            </button>
          </div>
          
          {/* Enhanced Carousel */}
          <div className="landing-carousel-wrapper">
            <div className="landing-custom-carousel">
              <div
                className="landing-carousel-track"
                style={{
                  transform: `translateX(-${currentSlide * 33.333}%)`,
                  transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {carouselImages.map((image, index) => (
                  <div key={index} className="landing-carousel-slide">
                    <div className="landing-carousel-image-container">
                      <img 
                        src={image} 
                        className="landing-carousel-img" 
                        alt={`Product ${index + 1}`}
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="landing-image-fallback" style={{ display: 'none' }}>
                        <div className="landing-fallback-placeholder">
                          <FileText size={48} />
                          <span>Product {index + 1}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="landing-carousel-dots">
                {[0, 1, 2].map((dot) => (
                  <button
                    key={dot}
                    className={`landing-carousel-dot ${currentSlide === dot ? 'landing-active' : ''}`}
                    onClick={() => setCurrentSlide(dot)}
                    aria-label={`Go to slide ${dot + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="landing-about-section">
        <div className="landing-section-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Sistem yang Mengubah Cara Kerja Tim</h2>
            <p className="landing-section-subtitle">
              Solusi digital yang memastikan setiap instruksi kerja tersampaikan dengan jelas dan efisien
            </p>
          </div>

          <div className="landing-about-grid">
            {/* Left Side - Enhanced Cards */}
            <div className="landing-about-cards-container">
              <div className="landing-about-card">
                <div className="landing-about-card-content">
                  <div className="landing-about-icon"><Settings size={32} /></div>
                  <div className="landing-about-card-text">
                    <h3 className="landing-about-card-title">Menghindari Miskomunikasi Pekerjaan</h3>
                    <p className="landing-about-card-description">
                      Sistem ini memastikan setiap instruksi kerja jelas dan terstandarisasi,
                      mengurangi kesalahan akibat miskomunikasi antar tim hingga 85%.
                    </p>
                  </div>
                </div>
              </div>

              <div className="landing-about-card">
                <div className="landing-about-card-content">
                  <div className="landing-about-icon"><FileText size={32} /></div>
                  <div className="landing-about-card-text">
                    <h3 className="landing-about-card-title">Instruksi Terdokumentasi Digital</h3>
                    <p className="landing-about-card-description">
                      Semua prosedur kerja tersimpan dalam format digital yang mudah diakses,
                      diperbarui secara real-time, dan dibagikan kepada seluruh tim.
                    </p>
                  </div>
                </div>
              </div>

              <div className="landing-about-card">
                <div className="landing-about-card-content">
                  <div className="landing-about-icon"><Clock size={32} /></div>
                  <div className="landing-about-card-text">
                    <h3 className="landing-about-card-title">Akses Instruksi Kapan Saja</h3>
                    <p className="landing-about-card-description">
                      Pekerja dapat mengakses instruksi kerja 24/7 melalui perangkat mobile
                      atau desktop, memastikan produktivitas maksimal bahkan saat offline.
                    </p>
                  </div>
                </div>
              </div>

              <div className="landing-about-card">
                <div className="landing-about-card-content">
                  <div className="landing-about-icon"><Users size={32} /></div>
                  <div className="landing-about-card-text">
                    <h3 className="landing-about-card-title">Dukung Kolaborasi Tim</h3>
                    <p className="landing-about-card-description">
                      Dirancang untuk teknisi, supervisor, dan staff operasional
                      dengan interface intuitif yang mendukung kerja tim yang efektif.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Enhanced Video */}
            <div className="landing-about-animation">
              {!videoError ? (
                <video 
                  className="landing-about-video" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  onError={handleVideoError}
                  poster="/assets/images/video-poster.jpg"
                >
                  <source src={workIllustration} type="video/mp4" />
                  <source src="./assets/videos/work-illustration.mp4" type="video/mp4" />
                  <source src="/assets/videos/work-illustration.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="landing-video-placeholder">
                  <div className="landing-placeholder-content">
                    <div className="landing-placeholder-icon">
                      <Play size={64} />
                    </div>
                    <div className="landing-placeholder-text">
                      <h3>Work Illustration Video</h3>
                      <p>Video menunjukkan cara kerja sistem dalam aksi</p>
                      <button className="landing-placeholder-button" onClick={() => setVideoError(false)}>
                        Coba Lagi
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Enhanced floating decorative elements */}
              <div className="landing-floating-elements">
                <div className="landing-floating-dot landing-dot-1"></div>
                <div className="landing-floating-dot landing-dot-2"></div>
                <div className="landing-floating-dot landing-dot-3"></div>
                <div className="landing-floating-dot landing-dot-4"></div>
                <div className="landing-floating-dot landing-dot-5"></div>
                <div className="landing-floating-dot landing-dot-6"></div>
                <div className="landing-floating-shape landing-shape-1"></div>
                <div className="landing-floating-shape landing-shape-2"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced How to Use Section */}
      <section id="how-to-use" className="landing-how-to-use-section">
        <div className="landing-section-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Cara Menggunakan Sistem Ini</h2>
            <p className="landing-section-subtitle">
              Langkah singkat untuk memulai - mudah digunakan bahkan untuk pengguna awam
            </p>
          </div>
          
          <div className="landing-steps-container">
            <div className="landing-step-item">
              <div className="landing-step-number">1</div>
              <div className="landing-step-content">
                <h3 className="landing-step-title">Login dengan Akun Karyawan</h3>
                <p className="landing-step-description">
                  Masuk menggunakan akun yang telah didaftarkan oleh admin HRD.
                  Gunakan email dan password yang diberikan.
                </p>
              </div>
            </div>
            
            <div className="landing-step-arrow">
              <ArrowRight size={24} />
            </div>
            
            <div className="landing-step-item">
              <div className="landing-step-number">2</div>
              <div className="landing-step-content">
                <h3 className="landing-step-title">Lihat Instruksi Kerja Hari Ini</h3>
                <p className="landing-step-description">
                  Dashboard akan menampilkan semua tugas dan instruksi yang harus diselesaikan
                  dengan prioritas dan deadline yang jelas.
                </p>
              </div>
            </div>
            
            <div className="landing-step-arrow">
              <ArrowRight size={24} />
            </div>
            
            <div className="landing-step-item">
              <div className="landing-step-number">3</div>
              <div className="landing-step-content">
                <h3 className="landing-step-title">Ikuti Langkah yang Tertera</h3>
                <p className="landing-step-description">
                  Instruksi detail dengan gambar dan video akan memandu setiap langkah
                  pekerjaan yang harus dilakukan dengan aman.
                </p>
              </div>
            </div>
            
            <div className="landing-step-arrow">
              <ArrowRight size={24} />
            </div>
            
            <div className="landing-step-item">
              <div className="landing-step-number">4</div>
              <div className="landing-step-content">
                <h3 className="landing-step-title">Tandai Selesai dan Unggah Bukti</h3>
                <p className="landing-step-description">
                  Setelah selesai, tandai sebagai complete dan upload foto/dokumen
                  sebagai bukti penyelesaian untuk audit trail.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced FAQ Section */}
      <section id="faq" className="landing-faq-section">
        <div className="landing-section-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Pertanyaan yang Sering Diajukan</h2>
            <p className="landing-section-subtitle">
              Jawaban untuk pertanyaan umum tentang sistem Work Instruction
            </p>
          </div>

          <div className="landing-faq-grid">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`landing-faq-card ${openFAQIndex === index ? 'landing-active' : ''}`}
                onClick={() => toggleFAQ(index)}
              >
                <div className="landing-faq-question">
                  <HelpCircle size={20} className="landing-faq-icon" />
                  <span>{faq.question}</span>
                  <span className="landing-faq-toggle-icon">
                    {openFAQIndex === index ? '−' : '+'}
                  </span>
                </div>
                <div className="landing-faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Support */}
          <div className="landing-support-contact">
            <div className="landing-support-card">
              <MessageSquare size={32} />
              <h3>Butuh Bantuan Lebih Lanjut?</h3>
              <p>Tim support kami siap membantu Anda 24/7</p>
              <div className="landing-support-buttons">
                <button className="landing-support-btn landing-primary">
                  Chat dengan Support
                </button>
                <button className="landing-support-btn landing-secondary">
                  Email Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="landing-footer-main">
            <div className="landing-footer-logo-section">
              <img 
                src={LogoLen} 
                alt="Logo Len Railway Systems" 
                className="landing-footer-logo-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="landing-logo-fallback" style={{ display: 'none' }}>
                <span>LEN</span>
              </div>
              <div className="landing-footer-description">
                <p>Solusi teknologi kereta api terdepan untuk masa depan transportasi Indonesia yang lebih baik.</p>
              </div>
            </div>
          </div>
          
          <div className="landing-footer-bottom">
            <div className="landing-footer-info">
              <p className="landing-footer-text">
                © 2025 Len Railways System. Seluruh Hak Cipta Dilindungi.
              </p>
              <p className="landing-footer-subtext">
                PT Len Railway Systems - Solusi Teknologi Kereta Api Terdepan
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;