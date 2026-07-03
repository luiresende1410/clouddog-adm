import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  UserCircle,
  Briefcase,
  Calendar,
  Building,
  Clock,
  TrendingUp,
  ArrowRightLeft,
  DollarSign,
  Award,
  Pencil,
  X,
  Camera,
} from 'lucide-react';

const TIPO_HISTORICO = {
  promocao: { label: 'Promoção', icon: TrendingUp, color: 'bg-green-100 text-green-800' },
  movimentacao: { label: 'Movimentação', icon: ArrowRightLeft, color: 'bg-blue-100 text-blue-800' },
  reajuste: { label: 'Reajuste', icon: DollarSign, color: 'bg-yellow-100 text-yellow-800' },
  certificacao: { label: 'Certificação', icon: Award, color: 'bg-purple-100 text-purple-800' },
};

export default function MeuPerfil() {
  const { currentUser } = useAuth();
  const [dados, setDados] = useState(null);
  const [ferias, setFerias] = useState([]);
  const [beneficios, setBeneficios] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({
    telefone: '',
    gestor: '',
    linkedin: '',
    github: '',
    credly: '',
  });

  useEffect(() => {
    async function fetchMeusDados() {
      try {
        const q = query(
          collection(db, 'colaboradores'),
          where('email', '==', currentUser.email)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const colabData = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setDados(colabData);

          // Buscar férias
          const ferSnap = await getDocs(collection(db, 'ferias'));
          const allFerias = ferSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setFerias(allFerias.filter((f) => f.colaboradorId === colabData.id));

          // Buscar benefícios ativos
          const benSnap = await getDocs(collection(db, 'beneficios'));
          const allBen = benSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setBeneficios(allBen.filter((b) => b.colaboradorId === colabData.id && !b.dataFim));

          // Buscar histórico
          const histSnap = await getDocs(collection(db, 'colaboradores', colabData.id, 'historico'));
          const histList = histSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          histList.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
          setHistorico(histList);
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    }

    if (currentUser?.email) {
      fetchMeusDados();
    }
  }, [currentUser]);

  function openEditForm() {
    setEditForm({
      telefone: dados.telefone || '',
      gestor: dados.gestor || '',
      linkedin: dados.linkedin || '',
      github: dados.github || '',
      credly: dados.credly || '',
    });
    setShowEditForm(true);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'colaboradores', dados.id), {
        telefone: editForm.telefone,
        gestor: editForm.gestor,
        linkedin: editForm.linkedin,
        github: editForm.github,
        credly: editForm.credly,
        updatedAt: new Date().toISOString(),
      });
      setDados({ ...dados, ...editForm });
      setShowEditForm(false);
      toast.success('Perfil atualizado!');
    } catch (error) {
      toast.error('Erro ao salvar');
      console.error(error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="text-center py-12">
        <UserCircle size={64} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">
          Seu cadastro ainda não foi encontrado. Entre em contato com o
          administrador.
        </p>
      </div>
    );
  }

  const hoje = new Date().toISOString().split('T')[0];
  const feriasAtiva = ferias.find((f) => f.status === 'Em andamento' || (f.dataInicio <= hoje && f.dataFim >= hoje && f.status !== 'Cancelada' && f.status !== 'Concluída'));
  const feriasAgendada = ferias.find((f) => f.status === 'Agendada' && f.dataInicio > hoje);
  const vt = beneficios.find((b) => b.tipo === 'VT');
  const vr = beneficios.find((b) => b.tipo === 'VR' || b.tipo === 'VA');

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Perfil</h2>

      {/* Header do perfil */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {dados.fotoUrl ? (
              <img
                src={dados.fotoUrl}
                alt={dados.nome}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <UserCircle size={40} className="text-blue-600" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-gray-800">{dados.nome}</h3>
              <p className="text-gray-500">{dados.cargo} — {dados.setor}</p>
            </div>
          </div>
          <button
            onClick={openEditForm}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
          >
            <Pencil size={16} />
            Editar
          </button>
        </div>

        {/* Dados pessoais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoItem icon={Building} label="Setor" value={dados.setor} />
          <InfoItem label="Gestor" value={dados.gestor} />
          <InfoItem label="Contrato" value={dados.tipoContrato} />
          <InfoItem icon={Calendar} label="Admissão" value={dados.dataAdmissao ? new Date(dados.dataAdmissao).toLocaleDateString('pt-BR') : '-'} />
          <InfoItem label="Efetivação" value={dados.dataEfetivacao ? new Date(dados.dataEfetivacao).toLocaleDateString('pt-BR') : '-'} />
          <InfoItem label="Telefone" value={dados.telefone || '-'} />
        </div>
      </div>

      {/* Cards de Férias e Benefícios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {feriasAtiva ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-xs font-medium text-yellow-600 uppercase">Férias em andamento</p>
            <p className="text-sm font-bold text-yellow-800 mt-1">
              {new Date(feriasAtiva.dataInicio).toLocaleDateString('pt-BR')} → {new Date(feriasAtiva.dataFim).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-xs text-yellow-600 mt-1">{feriasAtiva.diasGozados} dias</p>
          </div>
        ) : feriasAgendada ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-600 uppercase">Férias agendada</p>
            <p className="text-sm font-bold text-blue-800 mt-1">
              {new Date(feriasAgendada.dataInicio).toLocaleDateString('pt-BR')} → {new Date(feriasAgendada.dataFim).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-xs text-blue-600 mt-1">{feriasAgendada.diasGozados} dias</p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Férias</p>
            <p className="text-xs text-gray-400 mt-1">Sem férias agendadas</p>
          </div>
        )}

        {vt ? (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Vale Transporte</p>
            <div className="flex items-baseline gap-3 mt-1">
              <div>
                <span className="text-lg font-bold text-gray-800">R$ {Number(vt.valorDiario).toFixed(2)}</span>
                <span className="text-xs text-gray-500 ml-1">/dia</span>
              </div>
              <div className="text-sm text-gray-400">
                R$ {Number(vt.valorMensal || vt.valorDiario * 22).toFixed(2)}<span className="text-xs">/mês</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Vale Transporte</p>
            <p className="text-xs text-gray-400 mt-1">Não cadastrado</p>
          </div>
        )}

        {vr ? (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Vale Refeição</p>
            <div className="flex items-baseline gap-3 mt-1">
              <div>
                <span className="text-lg font-bold text-gray-800">R$ {Number(vr.valorDiario).toFixed(2)}</span>
                <span className="text-xs text-gray-500 ml-1">/dia</span>
              </div>
              <div className="text-sm text-gray-400">
                R$ {Number(vr.valorMensal || vr.valorDiario * 22).toFixed(2)}<span className="text-xs">/mês</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Vale Refeição</p>
            <p className="text-xs text-gray-400 mt-1">Não cadastrado</p>
          </div>
        )}
      </div>

      {/* Links e informações */}
      {(dados.linkedin || dados.github || dados.credly || dados.googleDriveLink || dados.curriculoUrl) && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Links e Informações</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dados.linkedin && (
              <a href={dados.linkedin} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">in</span>
                </div>
                <span className="text-sm font-medium text-gray-800">LinkedIn</span>
              </a>
            )}
            {dados.github && (
              <a href={dados.github} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">GH</span>
                </div>
                <span className="text-sm font-medium text-gray-800">GitHub</span>
              </a>
            )}
            {dados.credly && (
              <a href={dados.credly} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">C</span>
                </div>
                <span className="text-sm font-medium text-gray-800">Certificações (Credly)</span>
              </a>
            )}
            {dados.googleDriveLink && (
              <a href={dados.googleDriveLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">D</span>
                </div>
                <span className="text-sm font-medium text-gray-800">Google Drive</span>
              </a>
            )}
            {dados.curriculoUrl && (
              <a href={dados.curriculoUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">CV</span>
                </div>
                <span className="text-sm font-medium text-gray-800">Currículo (PDF)</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Linha do Tempo */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Clock size={20} />
          Minha Linha do Tempo
        </h3>

        {historico.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Nenhum registro na linha do tempo</p>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {historico.map((h) => {
                const tipoInfo = TIPO_HISTORICO[h.tipo] || TIPO_HISTORICO.promocao;
                const Icon = tipoInfo.icon;
                return (
                  <div key={h.id} className="relative flex items-start gap-4 pl-12">
                    <div className={`absolute left-4 w-5 h-5 rounded-full flex items-center justify-center ${tipoInfo.color}`}>
                      <Icon size={12} />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${tipoInfo.color}`}>
                          {tipoInfo.label}
                        </span>
                        <span className="text-sm text-gray-500">
                          {h.data ? new Date(h.data).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                      {(h.de || h.para) && (
                        <p className="text-sm text-gray-700 mt-2">
                          {h.tipo === 'certificacao' ? (
                            <>
                              <span className="font-medium">{h.de}</span>
                              {h.para && <span className="text-gray-500"> — {h.para}</span>}
                            </>
                          ) : (
                            <>
                              <span className="text-gray-500">De:</span> {h.de || '-'}{' '}
                              <span className="text-gray-500">→ Para:</span> {h.para || '-'}
                            </>
                          )}
                        </p>
                      )}
                      {h.descricao && (
                        <p className="text-sm text-gray-600 mt-1">{h.descricao}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal de edição */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Editar Meu Perfil</h3>
              <button onClick={() => setShowEditForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {dados.fotoUrl ? (
                  <img src={dados.fotoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <Camera size={20} className="text-gray-400" />
                  </div>
                )}
                <p className="text-sm text-gray-500">A foto é sincronizada automaticamente com sua conta Google.</p>
              </div>

              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  id="telefone"
                  type="tel"
                  value={editForm.telefone}
                  onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label htmlFor="gestor" className="block text-sm font-medium text-gray-700 mb-1">
                  Gestor
                </label>
                <input
                  id="gestor"
                  type="text"
                  value={editForm.gestor}
                  onChange={(e) => setEditForm({ ...editForm, gestor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Nome do seu gestor"
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Links profissionais</p>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="linkedin" className="block text-xs text-gray-500 mb-1">LinkedIn</label>
                    <input
                      id="linkedin"
                      type="url"
                      value={editForm.linkedin}
                      onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="https://linkedin.com/in/seu-perfil"
                    />
                  </div>
                  <div>
                    <label htmlFor="github" className="block text-xs text-gray-500 mb-1">GitHub</label>
                    <input
                      id="github"
                      type="url"
                      value={editForm.github}
                      onChange={(e) => setEditForm({ ...editForm, github: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="https://github.com/seu-usuario"
                    />
                  </div>
                  <div>
                    <label htmlFor="credly" className="block text-xs text-gray-500 mb-1">Credly (Certificações)</label>
                    <input
                      id="credly"
                      type="url"
                      value={editForm.credly}
                      onChange={(e) => setEditForm({ ...editForm, credly: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="https://www.credly.com/users/seu-perfil"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon size={18} className="text-gray-400 mt-0.5" />}
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-gray-800 font-medium capitalize">{value || '-'}</p>
      </div>
    </div>
  );
}
