import React, { useState } from 'react';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, setDoc, enableNetwork, disableNetwork } from 'firebase/firestore';
import { auth, db } from '../../firebase'; // Sesuaikan path sesuai struktur folder Anda
import './RegisterPage.css';
import logoLRS from '../assets/images/logoLRS.png';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        namaLengkap: '',
        idPetugas: '',
        email: '',
        password: '',
        konfirmasiPassword: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    // Fungsi untuk mengecek apakah email sudah terdaftar
    const checkIfEmailExists = async (email) => {
        try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            return methods.length > 0;
        } catch (error) {
            console.error('Error checking email:', error);
            return false;
        }
    };

    // Fungsi retry untuk operasi Firestore
    const retryFirestoreOperation = async (operation, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                console.error(`Attempt ${i + 1} failed:`, error);
                
                if (i === maxRetries - 1) {
                    throw error;
                }
                
                // Wait before retry dengan exponential backoff
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
                
                // Try to reset network connection
                try {
                    await disableNetwork(db);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await enableNetwork(db);
                } catch (networkError) {
                    console.warn('Network reset failed:', networkError);
                }
            }
        }
    };

    // Validasi form yang lebih komprehensif
    const validateForm = () => {
        const errors = [];

        if (!formData.namaLengkap.trim()) {
            errors.push('Nama lengkap harus diisi');
        } else if (formData.namaLengkap.trim().length < 2) {
            errors.push('Nama lengkap minimal 2 karakter');
        }

        if (!formData.idPetugas.trim()) {
            errors.push('ID Petugas harus diisi');
        } else if (formData.idPetugas.trim().length < 3) {
            errors.push('ID Petugas minimal 3 karakter');
        }

        if (!formData.email.trim()) {
            errors.push('Email harus diisi');
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                errors.push('Format email tidak valid');
            }
        }

        if (!formData.password) {
            errors.push('Password harus diisi');
        } else if (formData.password.length < 6) {
            errors.push('Password minimal 6 karakter');
        }

        if (!formData.konfirmasiPassword) {
            errors.push('Konfirmasi password harus diisi');
        } else if (formData.password !== formData.konfirmasiPassword) {
            errors.push('Password dan konfirmasi password tidak cocok');
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validasi form
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            alert(validationErrors.join('\n'));
            return;
        }

        setIsLoading(true);

        try {
            // 1. Cek apakah email sudah terdaftar
            const emailExists = await checkIfEmailExists(formData.email);
            if (emailExists) {
                alert('Email sudah terdaftar. Silakan gunakan email lain atau login.');
                return;
            }

            // 2. Buat user di Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                formData.email, 
                formData.password
            );
            
            const user = userCredential.user;
            const timestamp = new Date().toISOString();

            // 3. Simpan data ke Firestore dengan retry mechanism
            await retryFirestoreOperation(async () => {
                // Simpan data user
                await setDoc(doc(db, 'users', user.uid), {
                    namaLengkap: formData.namaLengkap.trim(),
                    idPetugas: formData.idPetugas.trim(),
                    email: formData.email.toLowerCase(),
                    role: 'petugas',
                    createdAt: timestamp,
                    updatedAt: timestamp
                });
            });

            // 4. Simpan data petugas terpisah dengan retry
            await retryFirestoreOperation(async () => {
                await setDoc(doc(db, 'petugas', formData.idPetugas.trim()), {
                    uid: user.uid,
                    namaLengkap: formData.namaLengkap.trim(),
                    idPetugas: formData.idPetugas.trim(),
                    email: formData.email.toLowerCase(),
                    status: 'active',
                    createdAt: timestamp
                });
            });

            // Reset form
            setFormData({
                namaLengkap: '',
                idPetugas: '',
                email: '',
                password: '',
                konfirmasiPassword: ''
            });

            // Tampilkan modal success
            setShowSuccessModal(true);

        } catch (error) {
            console.error('Error saat registrasi:', error);
            
            // Handle berbagai jenis error Firebase
            let errorMessage = 'Terjadi kesalahan saat registrasi.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email sudah terdaftar. Silakan gunakan email lain.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Format email tidak valid.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password terlalu lemah. Gunakan minimal 6 karakter.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Koneksi internet bermasalah. Periksa koneksi Anda dan coba lagi.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Terlalu banyak percobaan. Coba lagi setelah beberapa menit.';
                    break;
                case 'permission-denied':
                    errorMessage = 'Akses ditolak. Periksa konfigurasi database.';
                    break;
                case 'unavailable':
                    errorMessage = 'Layanan sedang tidak tersedia. Coba lagi nanti.';
                    break;
                default:
                    if (error.message.includes('Failed to get document')) {
                        errorMessage = 'Masalah koneksi database. Coba lagi.';
                    } else if (error.message.includes('network')) {
                        errorMessage = 'Masalah jaringan. Periksa koneksi internet Anda.';
                    } else {
                        errorMessage = `Registrasi gagal: ${error.message}`;
                    }
            }
            
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuccessModalClose = () => {
        setShowSuccessModal(false);
        // Redirect ke halaman login
        window.location.href = '/login';
        // Atau jika menggunakan React Router:
        // navigate('/login');
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    return (
        <div className="register-container">
            <div className="register-left">
                <div className="logo">
                    <img src={logoLRS} alt="Len Railway Systems" className="register-header-logo" />
                </div>

                <div className="register-form-section">
                    <h1 className="register-title">REGISTER</h1>
                    <p className="register-subtitle">Lengkapi data berikut untuk mendaftar</p>

                    <form onSubmit={handleSubmit} className="register-form">
                        <div className="form-group">
                            <label htmlFor="namaLengkap">NAMA LENGKAP*</label>
                            <input
                                type="text"
                                id="namaLengkap"
                                name="namaLengkap"
                                placeholder="Masukkan nama lengkap"
                                value={formData.namaLengkap}
                                onChange={handleInputChange}
                                disabled={isLoading}
                                required
                                minLength="2"
                                maxLength="100"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="idPetugas">ID PETUGAS*</label>
                            <input
                                type="text"
                                id="idPetugas"
                                name="idPetugas"
                                placeholder="Masukkan ID petugas"
                                value={formData.idPetugas}
                                onChange={handleInputChange}
                                disabled={isLoading}
                                required
                                minLength="3"
                                maxLength="50"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">EMAIL*</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="contoh@email.com"
                                value={formData.email}
                                onChange={handleInputChange}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">PASSWORD*</label>
                            <div className="password-input-container">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    disabled={isLoading}
                                    required
                                    minLength="6"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={togglePasswordVisibility}
                                    disabled={isLoading}
                                    aria-label="Toggle password visibility"
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="konfirmasiPassword">KONFIRMASI PASSWORD*</label>
                            <div className="password-input-container">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="konfirmasiPassword"
                                    name="konfirmasiPassword"
                                    placeholder="••••••••"
                                    value={formData.konfirmasiPassword}
                                    onChange={handleInputChange}
                                    disabled={isLoading}
                                    required
                                    minLength="6"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={toggleConfirmPasswordVisibility}
                                    disabled={isLoading}
                                    aria-label="Toggle confirm password visibility"
                                >
                                    {showConfirmPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="register-button"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Mendaftar...' : 'Daftar'}
                        </button>
                    </form>

                    <div className="login-link">
                        <span>Sudah punya akun? </span>
                        <a href="/login">Masuk di Sini</a>
                    </div>
                </div>
            </div>

            <div className="register-right">
                <div className="features-section">
                    <h2 className="features-title">
                        Optimalkan<br />
                        <span className="highlight">Manajemen Proyek</span><br />
                        Anda dengan<br />
                        <span className="highlight-light">Work Instruction</span>
                    </h2>
                    
                    <p className="features-description">
                        Pantau kemajuan tim dan pekerja secara real-time untuk 
                        memaksimalkan efisiensi kerja. Pastikan setiap langkah 
                        tercatat dengan baik untuk hasil yang maksimal.
                    </p>

                    <div className="features-list">
                        <div className="feature-item">
                            <div className="feature-icon chart-icon">📊</div>
                            <div className="feature-content">
                                <h3>Real-time Monitoring</h3>
                                <p>Pantau progress secara langsung</p>
                            </div>
                        </div>

                        <div className="feature-item">
                            <div className="feature-icon task-icon">✅</div>
                            <div className="feature-content">
                                <h3>Task Management</h3>
                                <p>Kelola tugas dengan mudah</p>
                            </div>
                        </div>

                        <div className="feature-item">
                            <div className="feature-icon progress-icon">📈</div>
                            <div className="feature-content">
                                <h3>Progress Tracking</h3>
                                <p>Lacak kemajuan proyek</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="modal-overlay">
                    <div className="success-modal">
                        <div className="success-icon">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" fill="#4CAF50"/>
                                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h2 className="success-title">Registrasi Berhasil!</h2>
                        <p className="success-message">
                            Akun Anda telah berhasil dibuat. Sekarang Anda dapat masuk menggunakan email dan password yang telah didaftarkan.
                        </p>
                        <button 
                            className="success-button"
                            onClick={handleSuccessModalClose}
                        >
                            Lanjut ke Halaman Login
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegisterPage;