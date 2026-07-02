import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Laptop,
  Calendar,
  CreditCard,
  UserX,
  Award,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalColaboradores: 0,
    ativos: 0,
    inativos: 0,
    estagiarios: 0,
    clt: 0,
    pj: 0,
    equipamentos: 0,
    equipamentosSemVinculo: 0,
    feriasEmAndamento: [],
    feriasAgendadas: [],
    beneficiosAtivos: 0,
    totalVTMensal: 0,
    totalVRMensal: 0,
    promocoesRecentes: [],
    certificacoesRecentes: [],
    setores: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [colabSnap, equipSnap, ferSnap, benSnap] = await Promise.all([
        getDocs(collection(db, 'colaboradores')),
        getDocs(collection(db, 'equipamentos')),
        getDocs(collection(db, 'ferias')),
        getDocs(collection(db, 'beneficios')),
      ]);

      const colaboradores = colabSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const equipamentos = equipSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const ferias = ferSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const beneficios = benSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const hoje = new Date().toISOString().split('T')[0];

      // Colaboradores
      const ativos = colaboradores.filter((c) => c.status === 'ativo');
      const inativos = colaboradores.filter((c) => c.status === 'inativo');
      const estagiarios = colaboradores.filter((c) => c.tipoContrato === 'Estágio');
      const clt = colaboradores.filter((c) => c.tipoContrato === 'CLT');
      const pj = colaboradores.filter((c) => c.tipoContrato === 'PJ');

      // Setores
      const setores = {};
      colaboradores.forEach((c) => {
        if (c.setor) setores[c.setor] = (setores[c.setor] || 0) + 1;
      });

      // Equipamentos
      const equipSemVinculo = equipamentos.filter((e) => !e.colaboradorId);

      // Férias
      const feriasEmAndamento = ferias.filter(
        (f) => f.status === 'Em andamento' || (f.dataInicio <= hoje && f.dataFim >= hoje && f.status !== 'Cancelada' && f.status !== 'Concluída')
      );
      const feriasAgendadas = ferias.filter(
        (f) => f.status === 'Agendada' && f.dataInicio > hoje
      ).sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)).slice(0, 5);

      // Benefícios
      const benAtivos = beneficios.filter((b) => !b.dataFim);
      const totalVTMensal = benAtivos
        .filter((b) => b.tipo === 'VT')
        .reduce((s, b) => s + (b.valorMensal || (b.valorDiario || 0) * 22), 0);
      const totalVRMensal = benAtivos
        .filter((b) => b.tipo === 'VR' || b.tipo === 'VA')
        .reduce((s, b) => s + (b.valorMensal || (b.valorDiario || 0) * 22), 0);

      // Buscar histórico recente (promoções e certificações)
      let promocoesRecentes = [];
      let certificacoesRecentes = [];
      for (const colab of colaboradores.slice(0, 50)) {
        try {
          const histSnap = await getDocs(collection(db, 'colaboradores', colab.id, 'historico'));
          const hist = histSnap.docs.map((d) => ({ ...d.data(), colaboradorNome: colab.nome, colaboradorId: colab.id }));
          promocoesRecentes.push(...hist.filter((h) => h.tipo === 'promocao'));
          certificacoesRecentes.push(...hist.filter((h) => h.tipo === 'certificacao'));
        } catch (e) { /* ignore */ }
      }
      promocoesRecentes = promocoesRecentes.sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 5);
      certificacoesRecentes = certificacoesRecentes.sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 5);

      setStats({
        totalColaboradores: colaboradores.length,
        ativos: ativos.length,
        inativos: inativos.length,
        estagiarios: estagiarios.length,
        clt: clt.length,
        pj: pj.length,
        equipamentos: equipamentos.length,
        equipamentosSemVinculo: equipSemVinculo.length,
        feriasEmAndamento,
        feriasAgendadas,
        beneficiosAtivos: benAtivos.length,
        totalVTMensal,
        totalVRMensal,
        promocoesRecentes,
        certificacoesRecentes,
        setores,
      });
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} color="bg-blue-500" title="Colaboradores" value={stats.totalColaboradores} subtitle={`${stats.ativos} ativos`} />
        <StatCard icon={Laptop} color="bg-purple-500" title="Equipamentos" value={stats.equipamentos} subtitle={stats.equipamentosSemVinculo > 0 ? `${stats.equipamentosSemVinculo} sem vínculo` : 'Todos vinculados'} />
        <StatCard icon={CreditCard} color="bg-green-500" title="VT + VR Mensal" value={`R$ ${(stats.totalVTMensal + stats.totalVRMensal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtitle={`VT: R$ ${stats.totalVTMensal.toFixed(0)} | VR: R$ ${stats.totalVRMensal.toFixed(0)}`} />
        <StatCard icon={Calendar} color="bg-orange-500" title="Férias" value={stats.feriasEmAndamento.length} subtitle={`${stats.feriasAgendadas.length} agendadas`} />
      </div>

      {/* Cards secundários */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        <MiniCard label="CLT" value={stats.clt} />
        <MiniCard label="Estágio" value={stats.estagiarios} />
        <MiniCard label="PJ" value={stats.pj} />
        <MiniCard label="Inativos" value={stats.inativos} alert={stats.inativos > 0} />
        {Object.entries(stats.setores).sort((a, b) => b[1] - a[1]).map(([setor, count]) => (
          <MiniCard key={setor} label={setor} value={count} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Férias em andamento e agendadas */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-orange-500" />
            Férias
          </h3>

          {stats.feriasEmAndamento.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-yellow-600 uppercase mb-2">Em andamento</p>
              <div className="space-y-2">
                {stats.feriasEmAndamento.map((f) => (
                  <div key={f.id} className="flex items-center justify-between bg-yellow-50 rounded-lg p-3">
                    <span className="font-medium text-gray-800 text-sm">{f.colaboradorNome}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(f.dataInicio).toLocaleDateString('pt-BR')} → {new Date(f.dataFim).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.feriasAgendadas.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase mb-2">Próximas agendadas</p>
              <div className="space-y-2">
                {stats.feriasAgendadas.map((f) => (
                  <div key={f.id} className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                    <span className="font-medium text-gray-800 text-sm">{f.colaboradorNome}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(f.dataInicio).toLocaleDateString('pt-BR')} → {new Date(f.dataFim).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nenhuma férias agendada</p>
          )}
        </div>

        {/* Promoções e Certificações recentes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-500" />
            Atividade Recente
          </h3>

          {stats.promocoesRecentes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-green-600 uppercase mb-2">Promoções</p>
              <div className="space-y-2">
                {stats.promocoesRecentes.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-green-50 rounded-lg p-3 cursor-pointer hover:bg-green-100"
                    onClick={() => navigate(`/colaboradores/${p.colaboradorId}`)}
                  >
                    <div>
                      <span className="font-medium text-gray-800 text-sm">{p.colaboradorNome}</span>
                      {p.de && p.para && (
                        <span className="text-xs text-gray-500 ml-2">{p.de} → {p.para}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {p.data ? new Date(p.data).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.certificacoesRecentes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-purple-600 uppercase mb-2">Certificações</p>
              <div className="space-y-2">
                {stats.certificacoesRecentes.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-purple-50 rounded-lg p-3 cursor-pointer hover:bg-purple-100"
                    onClick={() => navigate(`/colaboradores/${c.colaboradorId}`)}
                  >
                    <div>
                      <span className="font-medium text-gray-800 text-sm">{c.colaboradorNome}</span>
                      {c.de && <span className="text-xs text-gray-500 ml-2">— {c.de}</span>}
                    </div>
                    <span className="text-xs text-gray-400">
                      {c.data ? new Date(c.data).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.promocoesRecentes.length === 0 && stats.certificacoesRecentes.length === 0 && (
            <p className="text-sm text-gray-400">Nenhuma atividade recente</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, title, value, subtitle }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className={`${color} p-3 rounded-lg`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

function MiniCard({ label, value, alert }) {
  return (
    <div className={`rounded-xl p-3 text-center ${alert ? 'bg-red-50 border border-red-200' : 'bg-white shadow-sm'}`}>
      <p className={`text-lg font-bold ${alert ? 'text-red-700' : 'text-gray-800'}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
