import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { authService } from './services/authService';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Download from './pages/Download';
import SignIn from './pages/SignIn';
import Register from './pages/Register';
import WelcomeModal from './components/WelcomeModal';
import './styles/globals.css';

function AppContent() {
  const { type } = useAuth();
  const location = useLocation();
  const isAuthRoute = location.pathname === '/signin' || location.pathname === '/register';
  const shouldShowWelcomeModal = type === 'new' && !authService.isWelcomeSeen() && !isAuthRoute;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Show welcome modal only for first-time visitors on non-auth routes */}
      {shouldShowWelcomeModal && <WelcomeModal />}

      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/download" element={<Download />} />
        <Route path="/download/:token" element={<Download />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
