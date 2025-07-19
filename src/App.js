import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import LoginPage from './pages/LoginPage/LoginPage';
import HomePage from './pages/HomePage/HomePage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import TaskPage from './pages/TaskPage/TaskPage';
import AdminPage from './pages/AdminPage/AdminPage'; 
import ProgressPage from './pages/ProgressPage/ProgressPage';
import ProtectedRoute from './components/ProtectedRoute';
import ReportPage from './pages/ReportPage/ReportPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Karyawan routes */}
        <Route
          path="/home"
          element={
            <ProtectedRoute akses="karyawan">
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/task"
          element={
            <ProtectedRoute akses="karyawan">
              <TaskPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profil"
          element={
            <ProtectedRoute akses="karyawan">
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute akses="admin">
              <AdminPage /> {/* Ini halaman Statistik */}
            </ProtectedRoute>
          }
        />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/report" element={<ReportPage />} />

      </Routes>
    </Router>
  );
}

export default App;
