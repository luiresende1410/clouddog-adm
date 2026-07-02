import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ArrowLeft,
  Plus,
  Trash2,
  TrendingUp,
  ArrowRightLeft,
  DollarSign,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TIPO_HISTORICO = [
  { value: 'promocao', label: 'Promoção', icon: TrendingUp, color: 'bg-green-100 text-green-800' },
  { value: 'movimentacao', label: 'Movimentação', icon: ArrowRightLeft, color: 'bg-blue-100 text-blue-800' },
  { value: 'reajuste', label: 'Reajuste', icon: DollarSign, color: 'bg-yellow-100 text-yellow-800' },
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyHistorico);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchColaborador();
    fetchHistorico();
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.tipo || !form.data) {
      toast.error('Tipo e data são obrigatórios');
      return;
    }

    try {
      await addDoc(collection(db, 'colaboradores', id, 'historico'), {
        ...form,
        createdAt: new Date().toISOString(),
      });
      toast.success('Registro adicionado!');
      setShowForm(false);
      setForm(emptyHistorico);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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

      {/* Histórico */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Clock size={20} />
            Linha do Tempo
          </h3>
          <button
            onClick={() => setShowForm(true)}
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
                        <button
                          onClick={() => handleDeleteHistorico(h.id)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {(h.de || h.para) && (
                        <p className="text-sm text-gray-700 mt-2">
                          <span className="text-gray-500">De:</span> {h.de || '-'}{' '}
                          <span className="text-gray-500">→ Para:</span> {h.para || '-'}
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
            <h3 className="text-xl font-bold text-gray-800 mb-4">Novo Registro</h3>
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
                  <label htmlFor="de" className="block text-sm font-medium text-gray-700 mb-1">De</label>
                  <input
                    id="de"
                    name="de"
                    value={form.de}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Cargo/setor anterior"
                  />
                </div>
                <div>
                  <label htmlFor="para" className="block text-sm font-medium text-gray-700 mb-1">Para</label>
                  <input
                    id="para"
                    name="para"
                    value={form.para}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Cargo/setor novo"
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

function InfoCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-800 capitalize">{value || '-'}</p>
    </div>
  );
}
