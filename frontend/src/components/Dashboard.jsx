import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';

function Dashboard({ userId }) {
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('alerts');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    email: '',
    password: '',
    host: 'imap.gmail.com',
    port: '993',
  });
  const [editProject, setEditProject] = useState(null);
  const [ruleForm, setRuleForm] = useState({ projectId: '', condition: '' });
  const [profileForm, setProfileForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    newNickname: '',
    newEmail: '',
    newTelegramId: '',
  });
  const [userProfile, setUserProfile] = useState({ nickname: '', email: '', telegramId: '' });
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [useOAuth, setUseOAuth] = useState(false);
  const navigate = useNavigate();

  const validateProjectForm = () => {
    const newErrors = {};
    if (!useOAuth) {
      if (!projectForm.email) newErrors.email = 'Email обязателен';
      if (!projectForm.password) newErrors.password = 'Пароль обязателен';
      if (!projectForm.host) newErrors.host = 'IMAP хост обязателен';
      if (!projectForm.port) newErrors.port = 'IMAP порт обязателен';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateProfileForm = () => {
    const newErrors = {};
    if (!profileForm.currentPassword) newErrors.currentPassword = 'Текущий пароль обязателен';
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }
    if (profileForm.newTelegramId && !/^\d+$/.test(profileForm.newTelegramId)) {
      newErrors.newTelegramId = 'Telegram ID должен быть числом';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProjectChange = (e) => {
    const { name, value } = e.target;
    setProjectForm({ ...projectForm, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const handleRuleChange = (e) => {
    const { name, value } = e.target;
    setRuleForm({ ...ruleForm, [name]: value });
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm({ ...profileForm, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/projects`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setProjects(response.data);
      toast.success('Проекты загружены!', { id: 'projects-loaded' });
    } catch (err) {
      toast.error(`Ошибка: ${err.response?.data?.error || err.message}`, { id: 'error' });
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_AUTH_API_URL}/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUserProfile(response.data);
    } catch (err) {
      toast.error(`Ошибка: ${err.response?.data?.error || err.message}`, { id: 'error' });
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const addProject = async () => {
    if (!validateProjectForm()) {
      toast.error('Заполните все обязательные поля', { id: 'error' });
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/projects`,
        projectForm,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setProjects([...projects, response.data]);
      toast.success('Проект добавлен!', { id: 'project-added' });
      setIsModalOpen(false);
      setProjectForm({ email: '', password: '', host: 'imap.gmail.com', port: '993' });
    } catch (err) {
      toast.error(`Ошибка: ${err.response?.data?.error || err.message}`, { id: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const addGmailProject = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Токен отсутствует, пожалуйста, войдите снова', { id: 'error' });
        navigate('/login');
        return;
      }
      console.log('Отправка OAuth-запроса с токеном:', token);
      const response = await axios.get(`${import.meta.env.VITE_AUTH_API_URL}/oauth/google`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Получен OAuth URL:', response.data.url);
      window.location.href = response.data.url;
    } catch (err) {
      console.error('Ошибка OAuth:', err.response?.data || err.message);
      toast.error(`Ошибка: ${err.response?.data?.error || err.message}`, { id: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const editProjectSubmit = async () => {
    if (!validateProjectForm()) {
      toast.error('Заполните все обязательные поля', { id: 'error' });
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/projects`,
        { ...projectForm, id: editProject.id },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setProjects(projects.map(p => p.id === editProject.id ? response.data : p));
      toast.success('Проект обновлён!', { id: 'project-updated' });
      setIsModalOpen(false);
      setEditProject(null);
      setProjectForm({ email: '', password: '', host: 'imap.gmail.com', port: '993' });
    } catch (err) {
      toast.error(`Ошибка: ${err.response?.data?.error || err.message}`, { id: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId) => {
    setLoading(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setProjects(projects.filter(p => p.id !== projectId));
      toast.success('Проект удалён!', { id: 'project-deleted' });
    } catch (err) {
      toast.error(`Ошибка: ${err.response?.data?.error || err.message}`, { id: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const addRule = async () => {
    if (!ruleForm.projectId || !ruleForm.condition) {
      toast.error('Выберите проект и укажите правило', { id: 'error' });
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/rules`,
        ruleForm,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setProjects(projects.map(p => p.id === ruleForm.projectId ? { ...p, rules: [...p.rules, response.data] } : p));
      toast.success('Правило добавлено!', { id: 'rule-added' });
      setRuleForm({ projectId: '', condition: '' });
    } catch (err) {
      toast.error(`Ошибка: ${err.response?.data?.error || err.message}`, { id: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const testEmail = async () => {
    if (!validateProjectForm()) {
      toast.error('Заполните все обязательные поля', { id: 'error' });
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/test-email`, projectForm);
      if (response.data.success) {
        toast.success('Подключение к почте успешно!', { id: 'email-tested' });
      } else {
        toast.error(`Ошибка: ${response.data.error}`, { id: 'error' });
      }
    } catch (err) {
      toast.error(`Ошибка: ${err.message}`, { id: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!validateProfileForm()) {
      toast.error('Заполните все обязательные поля', { id: 'error' });
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_AUTH_API_URL}/profile`,
        profileForm,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Профиль обновлён!', { id: 'profile-updated' });
      setProfileForm({ currentPassword: '', newPassword: '', confirmPassword: '', newNickname: '', newEmail: '', newTelegramId: '' });
      fetchProfile();
    } catch (err) {
      toast.error(`Ошибка: ${err.response?.data?.error || err.message}`, { id: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchProfile();
  }, []); // Пустой массив зависимостей

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex">
      <div className="w-64 bg-gray-800 text-white p-4">
        <h2 className="text-2xl font-bold mb-4">Меню</h2>
        <ul>
          <li
            className={`p-2 cursor-pointer ${activeTab === 'alerts' ? 'bg-gray-600' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            Telegram Alert
          </li>
          <li
            className={`p-2 cursor-pointer ${activeTab === 'profile' ? 'bg-gray-600' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Профиль
          </li>
          <li className="p-2 cursor-pointer" onClick={() => {
            localStorage.removeItem('token');
            navigate('/login');
            toast.success('Выход выполнен', { id: 'logout' });
          }}>
            Выйти
          </li>
        </ul>
      </div>
      <div className="flex-1 p-6">
        {activeTab === 'alerts' && (
          <>
            <h1 className="text-4xl font-bold text-primary mb-8">Telegram Alert</h1>
            {projects.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-lg text-gray-700 mb-4">Добавьте свои почты для отслеживания</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary text-white w-12 h-12 rounded-full hover:bg-secondary transition flex items-center justify-center text-2xl absolute top-4 left-4"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-primary text-white w-12 h-12 rounded-full hover:bg-secondary transition flex items-center justify-center text-2xl absolute top-4 left-4"
                >
                  +
                </button>
                <div className="space-y-4">
                  {projects.map(project => (
                    <div key={project.id} className="p-4 border rounded-lg">
                      <h3 className="text-lg font-medium">{project.email}</h3>
                      <p>IMAP: {project.host}:{project.port}</p>
                      <p>Всего писем: {project.totalEmails || 0}</p>
                      <p>Писем по фильтрам: {project.filteredEmails || 0}</p>
                      {project.rules.length > 0 && (
                        <ul className="list-disc pl-6 mt-2">
                          {project.rules.map(rule => (
                            <li key={rule.id} className="text-gray-700">Фильтр: <span className="font-medium">{rule.condition}</span></li>
                          ))}
                        </ul>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            setEditProject(project);
                            setProjectForm({
                              email: project.email,
                              password: project.password || '',
                              host: project.host || 'imap.gmail.com',
                              port: project.port || '993',
                            });
                            setIsModalOpen(true);
                          }}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                        >
                          Изменить
                        </button>
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <h2 className="text-2xl font-semibold text-primary mb-4">Добавить правило</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Проект *</label>
                      <select
                        name="projectId"
                        value={ruleForm.projectId}
                        onChange={handleRuleChange}
                        className="p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="">Выберите проект</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.id}>{project.email}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Правило *</label>
                      <input
                        type="text"
                        name="condition"
                        value={ruleForm.condition}
                        onChange={handleRuleChange}
                        className="p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder="Например, invoice"
                      />
                    </div>
                  </div>
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={addRule}
                      disabled={loading}
                      className={`bg-accent text-white px-6 py-3 rounded-lg hover:bg-green-600 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Добавить правило
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
        {activeTab === 'profile' && (
          <>
            <h1 className="text-4xl font-bold text-primary mb-8">Профиль</h1>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ник</label>
                <p className="p-3 w-full border rounded-lg bg-gray-100">{userProfile.nickname}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="p-3 w-full border rounded-lg bg-gray-100">{userProfile.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telegram ID</label>
                <p className="p-3 w-full border rounded-lg bg-gray-100">{userProfile.telegramId}</p>
              </div>
              <div>
                <button
                  onClick={() => setIsChangePasswordModalOpen(true)}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
                >
                  Изменить пароль
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Текущий пароль *</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={profileForm.currentPassword}
                  onChange={handleProfileChange}
                  className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.currentPassword ? 'border-red-500' : ''}`}
                  placeholder="Текущий пароль"
                />
                {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Новый ник</label>
                <input
                  type="text"
                  name="newNickname"
                  value={profileForm.newNickname}
                  onChange={handleProfileChange}
                  className="p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Новый ник"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Новый email</label>
                <input
                  type="email"
                  name="newEmail"
                  value={profileForm.newEmail}
                  onChange={handleProfileChange}
                  className="p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Новый email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Новый Telegram ID</label>
                <input
                  type="text"
                  name="newTelegramId"
                  value={profileForm.newTelegramId}
                  onChange={handleProfileChange}
                  className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.newTelegramId ? 'border-red-500' : ''}`}
                  placeholder="Числовой ID"
                />
                {errors.newTelegramId && <p className="text-red-500 text-sm mt-1">{errors.newTelegramId}</p>}
              </div>
              <div className="flex justify-center mt-6">
                <button
                  onClick={updateProfile}
                  disabled={loading}
                  className={`bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Обновить профиль
                </button>
              </div>
            </div>
          </>
        )}
        <Transition show={isModalOpen}>
          <Dialog onClose={() => setIsModalOpen(false)} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="bg-white p-6 rounded-lg max-w-lg w-full">
                <Dialog.Title className="text-xl font-bold text-primary mb-4">
                  {editProject ? 'Изменить проект' : 'Добавить проект'}
                </Dialog.Title>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={useOAuth}
                      onChange={() => setUseOAuth(!useOAuth)}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">Использовать Gmail OAuth</label>
                  </div>
                  {useOAuth ? (
                    <button
                      onClick={addGmailProject}
                      disabled={loading}
                      className={`bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Добавить Gmail через OAuth
                    </button>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          type="email"
                          name="email"
                          value={projectForm.email}
                          onChange={handleProjectChange}
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
                          value={projectForm.password}
                          onChange={handleProjectChange}
                          className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.password ? 'border-red-500' : ''}`}
                          placeholder="Пароль или пароль приложения"
                        />
                        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Хост *</label>
                        <input
                          type="text"
                          name="host"
                          value={projectForm.host}
                          onChange={handleProjectChange}
                          className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.host ? 'border-red-500' : ''}`}
                          placeholder="imap.gmail.com"
                        />
                        {errors.host && <p className="text-red-500 text-sm mt-1">{errors.host}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Порт *</label>
                        <input
                          type="number"
                          name="port"
                          value={projectForm.port}
                          onChange={handleProjectChange}
                          className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.port ? 'border-red-500' : ''}`}
                          placeholder="993"
                        />
                        {errors.port && <p className="text-red-500 text-sm mt-1">{errors.port}</p>}
                      </div>
                      <div className="flex gap-4 mt-4">
                        <button
                          onClick={testEmail}
                          disabled={loading}
                          className={`bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Тестировать Email
                        </button>
                        <button
                          onClick={editProject ? editProjectSubmit : addProject}
                          disabled={loading}
                          className={`bg-accent text-white px-6 py-3 rounded-lg hover:bg-green-600 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {editProject ? 'Сохранить' : 'Добавить'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        </Transition>
        <Transition show={isChangePasswordModalOpen}>
          <Dialog onClose={() => setIsChangePasswordModalOpen(false)} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="bg-white p-6 rounded-lg max-w-lg w-full">
                <Dialog.Title className="text-xl font-bold text-primary mb-4">Изменить пароль</Dialog.Title>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Текущий пароль *</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={profileForm.currentPassword}
                      onChange={handleProfileChange}
                      className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.currentPassword ? 'border-red-500' : ''}`}
                      placeholder="Текущий пароль"
                    />
                    {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Новый пароль *</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={profileForm.newPassword}
                      onChange={handleProfileChange}
                      className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.newPassword ? 'border-red-500' : ''}`}
                      placeholder="Новый пароль"
                    />
                    {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Подтверждение нового пароля *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={profileForm.confirmPassword}
                      onChange={handleProfileChange}
                      className={`p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      placeholder="Подтвердите новый пароль"
                    />
                    {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                  </div>
                  <div className="flex gap-4 mt-4">
                    <button
                      onClick={updateProfile}
                      disabled={loading}
                      className={`bg-accent text-white px-6 py-3 rounded-lg hover:bg-green-600 transition w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        </Transition>
      </div>
    </div>
  );
}

export default Dashboard;