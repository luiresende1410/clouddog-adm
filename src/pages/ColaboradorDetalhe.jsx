import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  TrendingUp,
  ArrowRightLeft,
  DollarSign,
  Clock,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TIPO_HISTORICO = [
  { value: 'promocao', label: 'Promoção', icon: TrendingUp, color: 'bg-green-100 text-green-800' },
  { value: 'movimentacao', label: 'Movimentação', icon: ArrowRightLeft, color: 'bg-blue-100 text-blue-800' },
  { value: 'reajuste', label: 'Reajuste', icon: DollarSign, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'certificacao', label: 'Certificação', icon: Award, color: 'bg-purple-100 text-purple-800' },
];

const emptyHistorico = {
  tipo: 'promocao',
  data: '',
  de: '',
  para: '',
  descricao: '',
};

export default function ColaboradorDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [colaborador, setColaborador] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [ferias, setFerias] = useState([]);
  const [beneficios, setBeneficios] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingHistId, setEditingHistId] = useState(null);
  const [form, setForm] = useState(emptyHistorico);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchColaborador();
    fetchHistorico();
    fetchFerias();
    fetchBeneficios();
  }, [id]);

  async function fetchColaborador() {
    try {
      const snap = await getDoc(doc(db, 'colaboradores', id));
      if (snap.exists()) {
        setColaborador({ id: snap.id, ...snap.data() });
      }
    } catch (error) {
      toast.error('Erro ao carregar colaborador');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFerias() {
    try {
      const snap = await getDocs(collection(db, 'ferias'));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFerias(all.filter((f) => f.colaboradorId === id));
    } catch (error) {
      console.error('Erro ao buscar férias:', error);
    }
  }

  async function fetchBeneficios() {
    try {
      const snap = await getDocs(collection(db, 'beneficios'));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBeneficios(all.filter((b) => b.colaboradorId === id && !b.dataFim));
    } catch (error) {
      console.error('Erro ao buscar benefícios:', error);
    }
  }

  async function fetchHistorico() {
    try {
      const snap = await getDocs(collection(db, 'colaboradores', id, 'historico'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
      setHistorico(list);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function openEditHistorico(h) {
    setForm({
      tipo: h.tipo || 'promocao',
      data: h.data || '',
      de: h.de || '',
      para: h.para || '',
      descricao: h.descricao || '',
    });
    setEditingHistId(h.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.tipo || !form.data) {
      toast.error('Tipo e data são obrigatórios');
      return;
    }

    try {
      if (editingHistId) {
        await updateDoc(doc(db, 'colaboradores', id, 'historico', editingHistId), {
          ...form,
          updatedAt: new Date().toISOString(),
        });
        toast.success('Registro atualizado!');
      } else {
        await addDoc(collection(db, 'colaboradores', id, 'historico'), {
          ...form,
          createdAt: new Date().toISOString(),
        });
        toast.success('Registro adicionado!');
      }
      setShowForm(false);
      setForm(emptyHistorico);
      setEditingHistId(null);
      fetchHistorico();
    } catch (error) {
      toast.error('Erro ao salvar');
      console.error(error);
    }
  }

  async function handleDeleteHistorico(histId) {
    if (!window.confirm('Excluir este registro do histórico?')) return;
    try {
      await deleteDoc(doc(db, 'colaboradores', id, 'historico', histId));
      toast.success('Registro excluído');
      fetchHistorico();
    } catch (error) {
      toast.error('Erro ao excluir');
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

  if (!colaborador) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Colaborador não encontrado</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/colaboradores')}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{colaborador.nome}</h2>
          <p className="text-gray-500">{colaborador.cargo} — {colaborador.setor}</p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <InfoCard label="Status" value={colaborador.status} />
        <InfoCard label="Contrato" value={colaborador.tipoContrato} />
        <InfoCard
          label="Admissão"
          value={colaborador.dataAdmissao ? new Date(colaborador.dataAdmissao).toLocaleDateString('pt-BR') : '-'}
        />
        <InfoCard
          label="Efetivação"
          value={colaborador.dataEfetivacao ? new Date(colaborador.dataEfetivacao).toLocaleDateString('pt-BR') : '-'}
        />
      </div>

      {/* Férias e Benefícios cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Férias */}
        {(() => {
          const hoje = new Date().toISOString().split('T')[0];
          const feriasAtiva = ferias.find((f) => f.status === 'Em andamento' || (f.dataInicio <= hoje && f.dataFim >= hoje));
          const feriasAgendada = ferias.find((f) => f.status === 'Agendada' && f.dataInicio > hoje);

          if (feriasAtiva) {
            return (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-xs font-medium text-yellow-600 uppercase">Férias em andamento</p>
                <p className="text-lg font-bold text-yellow-800 mt-1">
                  {new Date(feriasAtiva.dataInicio).toLocaleDateString('pt-BR')} → {new Date(feriasAtiva.dataFim).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-sm text-yellow-600 mt-1">{feriasAtiva.diasGozados} dias</p>
              </div>
            );
          }
          if (feriasAgendada) {
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-medium text-blue-600 uppercase">Férias agendada</p>
                <p className="text-lg font-bold text-blue-800 mt-1">
                  {new Date(feriasAgendada.dataInicio).toLocaleDateString('pt-BR')} → {new Date(feriasAgendada.dataFim).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-sm text-blue-600 mt-1">{feriasAgendada.diasGozados} dias</p>
              </div>
            );
          }
          return (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Férias</p>
              <p className="text-sm text-gray-600 mt-1">Sem férias agendadas</p>
            </div>
          );
        })()}

        {/* VT */}
        {(() => {
          const vt = beneficios.find((b) => b.tipo === 'VT');
          if (vt) {
            return (
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
            );
          }
          return (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Vale Transporte</p>
              <p className="text-sm text-gray-400 mt-1">Não cadastrado</p>
            </div>
          );
        })()}

        {/* VR */}
        {(() => {
          const vr = beneficios.find((b) => b.tipo === 'VR' || b.tipo === 'VA');
          if (vr) {
            return (
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
            );
          }
          return (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Vale Refeição</p>
              <p className="text-sm text-gray-400 mt-1">Não cadastrado</p>
            </div>
          );
        })()}
      </div>

      {/* Links e informações adicionais */}
      {(colaborador.linkedin || colaborador.github || colaborador.credly || colaborador.googleDriveLink || colaborador.curriculoUrl || colaborador.jobConvoResultado) && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Links e Informações</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {colaborador.linkedin && (
              <a
                href={colaborador.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">in</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">LinkedIn</p>
                  <p className="text-xs text-gray-500">Ver perfil</p>
                </div>
              </a>
            )}
            {colaborador.github && (
              <a
                href={colaborador.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">GH</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">GitHub</p>
                  <p className="text-xs text-gray-500">Ver repositórios</p>
                </div>
              </a>
            )}
            {colaborador.credly && (
              <a
                href={colaborador.credly}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">C</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Credly</p>
                  <p className="text-xs text-gray-500">Ver certificações</p>
                </div>
              </a>
            )}
            {colaborador.googleDriveLink && (
              <a
                href={colaborador.googleDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">D</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Google Drive</p>
                  <p className="text-xs text-gray-500">Fotos e documentos</p>
                </div>
              </a>
            )}
            {colaborador.curriculoUrl && (
              <a
                href={colaborador.curriculoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">CV</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Currículo</p>
                  <p className="text-xs text-gray-500">Abrir PDF</p>
                </div>
              </a>
            )}
          </div>

          {colaborador.jobConvoResultado && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Resultado Job Convo</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                {colaborador.jobConvoResultado}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Histórico */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Clock size={20} />
            Linha do Tempo
          </h3>
          <button
            onClick={() => { setForm(emptyHistorico); setEditingHistId(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        {historico.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Nenhum registro no histórico</p>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {historico.map((h) => {
                const tipoInfo = TIPO_HISTORICO.find((t) => t.value === h.tipo) || TIPO_HISTORICO[0];
                const Icon = tipoInfo.icon;
                return (
                  <div key={h.id} className="relative flex items-start gap-4 pl-12">
                    <div className={`absolute left-4 w-5 h-5 rounded-full flex items-center justify-center ${tipoInfo.color}`}>
                      <Icon size={12} />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${tipoInfo.color}`}>
                            {tipoInfo.label}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            {h.data ? new Date(h.data).toLocaleDateString('pt-BR') : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditHistorico(h)}
                            className="text-blue-400 hover:text-blue-600"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteHistorico(h.id)}
                            className="text-red-400 hover:text-red-600"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{editingHistId ? 'Editar Registro' : 'Novo Registro'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select
                    id="tipo"
                    name="tipo"
                    value={form.tipo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {TIPO_HISTORICO.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="data" className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                  <input
                    id="data"
                    name="data"
                    type="date"
                    value={form.data}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="de" className="block text-sm font-medium text-gray-700 mb-1">
                    {form.tipo === 'certificacao' ? 'Certificação' : 'De'}
                  </label>
                  <input
                    id="de"
                    name="de"
                    value={form.de}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder={form.tipo === 'certificacao' ? 'Nome da certificação' : 'Cargo/setor anterior'}
                  />
                </div>
                <div>
                  <label htmlFor="para" className="block text-sm font-medium text-gray-700 mb-1">
                    {form.tipo === 'certificacao' ? 'Emissor' : 'Para'}
                  </label>
                  <input
                    id="para"
                    name="para"
                    value={form.para}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder={form.tipo === 'certificacao' ? 'AWS, Azure, Google...' : 'Cargo/setor novo'}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  id="descricao"
                  name="descricao"
                  value={form.descricao}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingHistId ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-800 capitalize">{value || '-'}</p>
    </div>
  );
}
