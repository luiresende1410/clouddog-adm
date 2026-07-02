import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bus, UtensilsCrossed, CalendarCheck } from 'lucide-react';

export default function Beneficios() {
  const location = useLocation();

  const tabClass = (path) => {
    const active = location.pathname.startsWith(path);
    return `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-600 text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Benefícios</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl shadow-sm p-2">
        <NavLink to="/beneficios/vt" className={() => tabClass('/beneficios/vt')}>
          <Bus size={18} />
          Vale Transporte
        </NavLink>
        <NavLink to="/beneficios/vr" className={() => tabClass('/beneficios/vr')}>
          <UtensilsCrossed size={18} />
          Vale Refeição
        </NavLink>
        <NavLink to="/beneficios/fechamento" className={() => tabClass('/beneficios/fechamento')}>
          <CalendarCheck size={18} />
          Fechamento Mensal
        </NavLink>
      </div>

      <Outlet />
    </div>
  );
}
