import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Laptop, Calendar, CreditCard } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalColaboradores: 0,
    ativos: 0,
    equipamentos: 0,
    feriasProximas: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const colabSnap = await getDocs(collection(db, 'colaboradores'));
        const colaboradores = colabSnap.docs.map((d) => d.data());
        const ativos = colaboradores.filter((c) => c.status === 'ativo').length;

        setStats({
          totalColaboradores: colaboradores.length,
          ativos,
          equipamentos: 0,
          feriasProximas: 0,
        });
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
      }
    }

    fetchStats();
  }, []);

  const cards = [
    {
      title: 'Total Colaboradores',
      value: stats.totalColaboradores,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Ativos',
      value: stats.ativos,
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'Equipamentos',
      value: stats.equipamentos,
      icon: Laptop,
      color: 'bg-purple-500',
    },
    {
      title: 'Férias Próximas',
      value: stats.feriasProximas,
      icon: Calendar,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4"
          >
            <div className={`${card.color} p-3 rounded-lg`}>
              <card.icon size={24} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.title}</p>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
