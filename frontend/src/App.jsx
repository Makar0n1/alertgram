import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import OAuthCallback from './components/OAuthCallback';

// Настройка axios-интерсептора для централизованной обработки ошибок
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    toast.error(error.response?.data?.error || 'Ошибка сервера', { id: 'error' });
    return Promise.reject(error);
  }
);

function AuthWrapper({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const ran = useRef(false);

  const verifyToken = async (token) => {
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    try {
      console.log('Проверка токена:', token);
      const response = await axios.get(`${import.meta.env.VITE_AUTH_API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsAuthenticated(true);
      setUserId(response.data.id);
      localStorage.setItem('token', token);
    } catch (err) {
      console.error('Ошибка проверки токена:', err);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      toast.error('Сессия истекла, войдите снова', { id: 'session-expired' });
    }
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = localStorage.getItem('token');
    verifyToken(token);
  }, []);

  return children(isAuthenticated, userId, setIsAuthenticated, setUserId);
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <AuthWrapper>
        {(isAuthenticated, userId, setIsAuthenticated, setUserId) => (
          <Routes>
            <Route
              path="/login"
              element={<Login setIsAuthenticated={setIsAuthenticated} setUserId={setUserId} />}
            />
            <Route
              path="/register"
              element={<Register setIsAuthenticated={setIsAuthenticated} setUserId={setUserId} />}
            />
            <Route
              path="/dashboard"
              element={isAuthenticated ? <Dashboard userId={userId} /> : <Navigate to="/login" />}
            />
            <Route
              path="/oauth/callback"
              element={<OAuthCallback setIsAuthenticated={setIsAuthenticated} setUserId={setUserId} />}
            />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </AuthWrapper>
    </Router>
  );
}

export default App;