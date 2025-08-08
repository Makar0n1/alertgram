import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';

function Register({ setIsAuthenticated, setUserId }) {
  const [form, setForm] = useState({ nickname: '', email: '', password: '', confirmPassword: '', telegramId: '' });
  const [verifyCode, setVerifyCode] = useState('');
  const [tempUserId, setTempUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!form.nickname) newErrors.nickname = 'Ник обязателен';
    if (!form.email) newErrors.email = 'Email обязателен';
    if (!form.password) newErrors.password = 'Пароль обязателен';
    if (form.confirmPassword !== form.password) newErrors.confirmPassword = 'Пароли не совпадают';
    if (!form.telegramId || !/^\d+$/.test(form.telegramId)) newErrors.telegramId = 'Telegram ID должен быть числом';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const register = async () => {
    if (!validateForm()) {
      toast.error('Заполните все обязательные поля', { id: 'error' });
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_AUTH_API_URL}/register`, form);
      setTempUserId(response.data.userId);
      toast.success('Код отправлен в Telegram!', { id: 'telegram-code' });
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
      toast.success('Успешная регистрация!', { id: 'register-success' });
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
        <h1 className="text-3xl font-bold text-center text-primary mb-6">Регистрация</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ник *</label>
            <input
              type="text"
              name="nickname"
              value={form.nickname}
              onChange={handleChange}
              className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.nickname ? 'border-red-500' : ''}`}
              placeholder="Ваш ник"
            />
            {errors.nickname && <p className="text-red-500 text-sm mt-1">{errors.nickname}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.email ? 'border-red-500' : ''}`}
              placeholder="your_email@gmail.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Подтверждение пароля *</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.confirmPassword ? 'border-red-500' : ''}`}
              placeholder="Подтвердите пароль"
            />
            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telegram ID *</label>
            <input
              type="text"
              name="telegramId"
              value={form.telegramId}
              onChange={handleChange}
              className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.telegramId ? 'border-red-500' : ''}`}
              placeholder="Числовой ID"
            />
            {errors.telegramId && <p className="text-red-500 text-sm mt-1">{errors.telegramId}</p>}
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
            onClick={register}
            disabled={loading}
            className={`bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Зарегистрироваться
          </button>
        </div>
        <p className="text-center mt-4">
          Уже есть аккаунт? <Link to="/login" className="text-primary hover:underline">Войти</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;