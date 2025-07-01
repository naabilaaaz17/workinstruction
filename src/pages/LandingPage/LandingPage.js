import React, { useState, useEffect } from 'react';
import { ChevronRight, Menu, X, Play, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LogoLen from '../assets/images/logo-defend-len.png';
import HeroImg from '../assets/images/logo1.png';
import ProductImg1 from '../assets/images/product1.png';
import ProductImg2 from '../assets/images/product2.png';
import ProductImg3 from '../assets/images/product3.png';
import './LandingPage.css';

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <div>
      {/* Navbar */}
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner">
          <div className="nav-title">
            <span className="text-blue-400">Len</span> Railway Systems
          </div>
          
          <div className="nav-links">
            <a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>
              Home
            </a>
            <a href="#task" onClick={(e) => { e.preventDefault(); scrollToSection('task'); }}>
              Task
            </a>
            <a href="#progress" onClick={(e) => { e.preventDefault(); scrollToSection('progress'); }}>
              Progress
            </a>
            <a href="#statistics" onClick={(e) => { e.preventDefault(); scrollToSection('statistics'); }}>
              Statistics
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
          <a href="#task" onClick={(e) => { e.preventDefault(); scrollToSection('task'); }}>
            Task
          </a>
          <a href="#progress" onClick={(e) => { e.preventDefault(); scrollToSection('progress'); }}>
            Progress
          </a>
          <a href="#statistics" onClick={(e) => { e.preventDefault(); scrollToSection('statistics'); }}>
            Statistics
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
      <section id="home" className="hero-section">
        <div className="hero-background-blur"></div>
        
        <div className="hero-content-wrapper">
          <div className="hero-inner-content">
            <div className="hero-text-content">
              <h1 className="hero-title">
                Optimalkan <br /> 
                Manajemen Proyek <br /> 
                Anda dengan <span className="gradient-text">Work Instruction</span>
              </h1>
              
              <p className="hero-description">
                Pantau kemajuan tim dan pekerja secara real-time untuk pengelolaan yang lebih efisien. 
                Pastikan setiap langkah tercatat dengan baik untuk hasil yang maksimal.
              </p>
              
              <div className="hero-cta-buttons">
                <button className="cta-primary" onClick={() => scrollToSection('task')}>
                  <Play size={20} />
                  Mulai Sekarang
                </button>
                <button className="cta-secondary" onClick={() => scrollToSection('statistics')}>
                  Pelajari Lebih Lanjut
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
            
            <div className="hero-image-container">
              <div className="image-container">
                <img 
                  src={HeroImg} 
                  alt="Hero Logo - Len Railway Systems" 
                  className="image-main"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="logo-fallback" style={{ display: 'none' }}>
                  LEN
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="task" className="products-section">
        <h2 className="products-title">Produk yang dihasilkan</h2>
        <p className="products-subtitle">
          Dapatkan gambaran lengkap produk, fitur, kegunaan dan jenisnya pada daftar di bawah ini
        </p>
        
        <div className="products-grid">
          <div className="product-card">
            <img 
              src={ProductImg1} 
              alt="Sistem Persinyalan Kereta Api" 
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMUU0MEFGIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxOCIgZm9udC1mYW1pbHk9IkFyaWFsIj5TaXN0ZW0gUGVyc2lueWFsYW48L3RleHQ+Cjwvc3ZnPg==';
              }}
            />
            <h3>Sistem Persinyalan Kereta Api</h3>
            <p>
              Sistem ini digunakan untuk mengatur pergerakan kereta api agar tetap aman dan teratur 
              dengan otomatisasi tinggi dan teknologi modern yang terintegrasi.
            </p>
            <button className="card-button" onClick={() => console.log('Navigate to Sistem Persinyalan')}>
              Mulai Penggunaan <ChevronRight size={18} />
            </button>
          </div>
          
          <div className="product-card">
            <img 
              src={ProductImg2} 
              alt="Sistem Kontrol Pusat" 
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMUU0MEFGIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxOCIgZm9udC1mYW1pbHk9IkFyaWFsIj5TaXN0ZW0gS29udHJvbDwvdGV4dD4KPC9zdmc+';
              }}
            />
            <h3>Sistem Kontrol Pusat</h3>
            <p>
              Digunakan untuk memantau seluruh sistem rel dan memastikan semua komponen berjalan 
              selaras secara efisien dengan monitoring real-time 24/7.
            </p>
            <button className="card-button" onClick={() => console.log('Navigate to Sistem Kontrol')}>
              Mulai Penggunaan <ChevronRight size={18} />
            </button>
          </div>
          
          <div className="product-card">
            <img 
              src={ProductImg3} 
              alt="Manajemen Operasi Harian" 
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMUU0MEFGIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxOCIgZm9udC1mYW1pbHk9IkFyaWFsIj5NYW5hamVtZW4gT3BlcmFzaTwvdGV4dD4KPC9zdmc+';
              }}
            />
            <h3>Manajemen Operasi Harian</h3>
            <p>
              Solusi untuk penjadwalan, monitoring, dan pengelolaan harian aktivitas kereta 
              dengan akurasi tinggi dan sistem pelaporan yang komprehensif.
            </p>
            <button className="card-button" onClick={() => console.log('Navigate to Manajemen Operasi')}>
              Mulai Penggunaan <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Progress Section */}
      <section id="progress" className="products-section" style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
        <h2 className="products-title">Progress Monitoring</h2>
        <p className="products-subtitle">
          Pantau kemajuan proyek dan kinerja tim secara real-time dengan dashboard yang intuitif
        </p>
        
        <div className="products-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div className="product-card" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
            <h3>Dashboard Analytics</h3>
            <p>
              Visualisasi data yang komprehensif dengan grafik dan chart yang mudah dipahami 
              untuk memantau kinerja sistem secara keseluruhan.
            </p>
            <button className="card-button">
              Lihat Dashboard <ChevronRight size={18} />
            </button>
          </div>
          
          <div className="product-card" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
            <h3>Real-time Monitoring</h3>
            <p>
              Pemantauan status sistem secara langsung dengan notifikasi otomatis 
              untuk setiap perubahan atau anomali yang terdeteksi.
            </p>
            <button className="card-button">
              Akses Monitoring <ChevronRight size={18} />
            </button>
          </div>
          
          <div className="product-card" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
            <h3>Performance Reports</h3>
            <p>
              Laporan kinerja detail dengan analisis mendalam untuk membantu pengambilan 
              keputusan strategis dan optimasi operasional.
            </p>
            <button className="card-button">
              Generate Report <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="statistics" className="products-section" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', padding: '8rem 2rem' }}>
        <h2 className="products-title">Statistik & Pencapaian</h2>
        <p className="products-subtitle">
          Data kinerja dan pencapaian sistem Len Railway yang telah terbukti efektif
        </p>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '3rem',
          maxWidth: '1200px',
          margin: '4rem auto 0'
        }}>
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '1rem',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <div style={{ 
              fontSize: '3.5rem', 
              fontWeight: '900', 
              color: '#60a5fa',
              marginBottom: '0.5rem',
              background: 'linear-gradient(135deg, #60a5fa, #22d3ee)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent'
            }}>
              99.8%
            </div>
            <h3 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Uptime</h3>
            <p style={{ color: '#94a3b8' }}>Keandalan sistem yang tinggi</p>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            background: 'rgba(34, 211, 238, 0.1)',
            borderRadius: '1rem',
            border: '1px solid rgba(34, 211, 238, 0.2)'
          }}>
            <div style={{ 
              fontSize: '3.5rem', 
              fontWeight: '900', 
              color: '#22d3ee',
              marginBottom: '0.5rem'
            }}>
              50+
            </div>
            <h3 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Proyek</h3>
            <p style={{ color: '#94a3b8' }}>Proyek berhasil diselesaikan</p>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            background: 'rgba(168, 85, 247, 0.1)',
            borderRadius: '1rem',
            border: '1px solid rgba(168, 85, 247, 0.2)'
          }}>
            <div style={{ 
              fontSize: '3.5rem', 
              fontWeight: '900', 
              color: '#a855f7',
              marginBottom: '0.5rem'
            }}>
              1000+
            </div>
            <h3 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Pengguna</h3>
            <p style={{ color: '#94a3b8' }}>Pengguna aktif sistem</p>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '1rem',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            <div style={{ 
              fontSize: '3.5rem', 
              fontWeight: '900', 
              color: '#22c55e',
              marginBottom: '0.5rem'
            }}>
              24/7
            </div>
            <h3 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Support</h3>
            <p style={{ color: '#94a3b8' }}>Dukungan teknis non-stop</p>
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
              LEN
            </div>
          </div>
          <p className="footer-text">
            © 2025 Len Railways System. Seluruh Hak Cipta Dilindungi.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            PT Len Railway Systems - Solusi Teknologi Kereta Api Terdepan
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;