import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';

function Login({ setIsAuthenticated, setUserId }) {
  const [form, setForm] = useState({ login: '', password: '' });
  const [verifyCode, setVerifyCode] = useState('');
  const [tempUserId, setTempUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!form.login) newErrors.login = 'Логин обязателен';
    if (!form.password) newErrors.password = 'Пароль обязателен';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const login = async () => {
    if (!validateForm()) {
      toast.error('Заполните все обязательные поля', { id: 'error' });
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_AUTH_API_URL}/login`, form);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setIsAuthenticated(true);
        setUserId(response.data.userId);
        toast.success('Успешный вход!', { id: 'login-success' });
        navigate('/dashboard');
      } else {
        setTempUserId(response.data.userId);
        toast.success('Код отправлен в Telegram!', { id: 'telegram-code' });
      }
    } catch (err) {
      // Ошибки обрабатываются в интерсепторе
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!verifyCode) {
      toast.error('Введите код верификации', { id: 'error' });
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_AUTH_API_URL}/verify`, {
        userId: tempUserId,
        code: verifyCode,
      });
      localStorage.setItem('token', response.data.token);
      setIsAuthenticated(true);
      setUserId(tempUserId);
      toast.success('Успешный вход!', { id: 'verify-success' });
      navigate('/dashboard');
    } catch (err) {
      // Ошибки обрабатываются в интерсепторе
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-primary mb-6">Вход</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Логин (email или ник) *</label>
            <input
              type="text"
              name="login"
              value={form.login}
              onChange={handleChange}
              className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.login ? 'border-red-500' : ''}`}
              placeholder="email или ник"
            />
            {errors.login && <p className="text-red-500 text-sm mt-1">{errors.login}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль *</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.password ? 'border-red-500' : ''}`}
              placeholder="Пароль"
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>
        </div>
        {tempUserId && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Код верификации</label>
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              className="p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="Введите код из Telegram"
            />
            <button
              onClick={verify}
              disabled={loading}
              className={`bg-accent text-white px-6 py-3 rounded-lg hover:bg-green-600 transition mt-4 w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Подтвердить
            </button>
          </div>
        )}
        <div className="flex justify-center mt-6">
          <button
            onClick={login}
            disabled={loading}
            className={`bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Войти
          </button>
        </div>
        <p className="text-center mt-4">
          Нет аккаунта? <Link to="/register" className="text-primary hover:underline">Создать</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;