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
import AddTaskPage from './pages/AdminPage/AddTaskPage';
import ReportAdmin from './pages/AdminPage/reportAdmin';
import SettingPage from './pages/SettingPage/SettingPage';

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
        <Route
          path="/settings"
          element={
            <ProtectedRoute akses="karyawan">
              <SettingPage />
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
        <Route
  path="/progress"
  element={
    <ProtectedRoute akses="karyawan">
      <ProgressPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/report"
  element={
    <ProtectedRoute akses="karyawan">
      <ReportPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/addTask"
  element={
    <ProtectedRoute akses="admin">
      <AddTaskPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/reportadmin"
  element={
    <ProtectedRoute akses="admin">
      <ReportAdmin />
    </ProtectedRoute>
  }
/>

      </Routes>
    </Router>
  );
}

export default App;
