import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

function OAuthCallback({ setIsAuthenticated, setUserId }) {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      toast.error('Отсутствует токен', { id: 'error' });
      navigate('/login', { replace: true });
      return;
    }

    const verifyToken = async () => {
      try {
        console.log('Проверка токена из OAuth:', token);
        const response = await axios.get(`${import.meta.env.VITE_AUTH_API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        localStorage.setItem('token', token);
        setIsAuthenticated(true);
        setUserId(response.data.id);
        toast.success('OAuth авторизация успешна!', { id: 'oauth-success' });
        navigate('/dashboard', { replace: true });
      } catch (err) {
        // Ошибки обрабатываются в интерсепторе
        navigate('/login', { replace: true });
      }
    };

    verifyToken();
  }, [navigate, setIsAuthenticated, setUserId]);

  return null;
}

export default OAuthCallback;