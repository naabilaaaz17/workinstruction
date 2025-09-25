import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import LoginPage from './pages/LoginPage/LoginPage';
import HomePage from './pages/HomePage/HomePage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import TaskPage from './pages/TaskPage/TaskPage';
import MOSelectionPage from './pages/TaskPage/MOSelectionPage';
import AdminPage from './pages/AdminPage/AdminPage'; 
import ProgressPage from './pages/ProgressPage/ProgressPage';
import ProtectedRoute from './components/ProtectedRoute';
import AddTaskPage from './pages/AdminPage/AddTaskPage';
import AdminApprovalPage from './pages/AdminPage/AdminApprovalPage';
import MOManagementPage from './pages/AdminPage/MOManagementPage';
import TaskWithoutMO from './pages/TaskPage/TaskWithoutMO';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Employee Routes */}
        <Route
          path="/home"
          element={
            <ProtectedRoute requiredRole="employee">
              <HomePage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/task"
          element={
            <ProtectedRoute requiredRole="employee">
              <TaskPage />
            </ProtectedRoute>
          }
        />
                <Route
                  path="/task-execution/:taskId"
                  element={
                    <ProtectedRoute akses="employee">
                      <TaskPage />
                    </ProtectedRoute>
                  }
                />
                
        
        <Route
          path="/profil"
          element={
            <ProtectedRoute requiredRole="employee">
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/progress"
          element={
            <ProtectedRoute requiredRole="employee">
              <ProgressPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/mo-selection"
          element={
            <ProtectedRoute requiredRole="employee">
              <MOSelectionPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/approvals"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminApprovalPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/addTask"
          element={
            <ProtectedRoute requiredRole="admin">
              <AddTaskPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-mo"
          element={
            <ProtectedRoute requiredRole="admin">
              <MOManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasklist"
          element={
            <ProtectedRoute requiredRole="employee">
              <TaskWithoutMO />
            </ProtectedRoute>
          }
        />

      </Routes>
      
    </Router>
  );
}

export default App;