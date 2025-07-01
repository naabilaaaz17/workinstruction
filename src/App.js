import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage.js';
import RegisterPage from './pages/RegisterPage/RegisterPage.js';
import LoginPage from './pages/LoginPage/LoginPage.js';
import HomePage from './pages/HomePage/HomePage.js';
import ProfilePage from './pages/ProfilePage/ProfilePage.js';
import ProtectedRoute from './components/ProtectedRoute.js'; // ✅ tambahkan ini

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* ✅ proteksi route home */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route path="/profil" element={<ProfilePage />} />
      </Routes>
    </Router>
  );
}

export default App;
