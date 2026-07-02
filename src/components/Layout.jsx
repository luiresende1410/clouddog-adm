import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  Home,
  LogOut,
  UserCircle,
  Calendar,
  Laptop,
  CreditCard,
  FileText,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Layout() {
  const { currentUser, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch {
      toast.error('Erro ao sair');
    }
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">CloudDog ADM</h1>
          <p className="text-sm text-gray-400 mt-1">Gestão de Colaboradores</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {isAdmin ? (
            <>
              <NavLink to="/dashboard" className={linkClass}>
                <Home size={20} />
                Dashboard
              </NavLink>
              <NavLink to="/colaboradores" className={linkClass}>
                <Users size={20} />
                Colaboradores
              </NavLink>
              <NavLink to="/ferias" className={linkClass}>
                <Calendar size={20} />
                Férias
              </NavLink>
              <NavLink to="/equipamentos" className={linkClass}>
                <Laptop size={20} />
                Equipamentos
              </NavLink>
              <NavLink to="/beneficios" className={linkClass}>
                <CreditCard size={20} />
                Benefícios
              </NavLink>
              <NavLink to="/relatorios" className={linkClass}>
                <FileText size={20} />
                Relatórios
              </NavLink>
              <NavLink to="/usuarios" className={linkClass}>
                <Shield size={20} />
                Usuários
              </NavLink>
            </>
          ) : (
            <NavLink to="/meu-perfil" className={linkClass}>
              <UserCircle size={20} />
              Meu Perfil
            </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 truncate mb-2">
            {currentUser?.email}
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors w-full"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
