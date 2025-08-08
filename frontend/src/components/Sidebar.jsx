import { useNavigate } from 'react-router-dom';

function Sidebar({ activeTab, setActiveTab }) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
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
        <li className="p-2 cursor-pointer" onClick={logout}>Выйти</li>
      </ul>
    </div>
  );
}

export default Sidebar;