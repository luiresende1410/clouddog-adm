import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Pencil, Trash2, Search, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['Agendada', 'Em andamento', 'Concluída', 'Cancelada'];

const emptyForm = {
  colaboradorId: '',
  colaboradorNome: '',
  periodoAquisitivoInicio: '',
  periodoAquisitivoFim: '',
  dataInicio: '',
  dataFim: '',
  diasGozados: '',
  diasVendidos: '',
  status: 'Agendada',
  observacoes: '',
};

function calcDias(inicio, fim) {
  if (!inicio || !fim) return 0;
  const d1 = new Date(inicio);
  const d2 = new Date(fim);
  const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}

export default function Ferias() {
  const [ferias, setFerias] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFerias();
    fetchColaboradores();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredList(ferias);
    } else {
      const term = search.toLowerCase();
      setFilteredList(
        ferias.filter(
          (f) =>
            f.colaboradorNome.toLowerCase().includes(term) ||
            f.status.toLowerCase().includes(term)
        )
      );
    }
  }, [search, ferias]);

  async function fetchFerias() {
    try {
      const snap = await getDocs(collection(db, 'ferias'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        if (a.dataInicio && b.dataInicio) return b.dataInicio.localeCompare(a.dataInicio);
        return a.colaboradorNome.localeCompare(b.colaboradorNome);
      });
      setFerias(list);
    } catch (error) {
      toast.error('Erro ao carregar férias');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchColaboradores() {
    try {
      const snap = await getDocs(collection(db, 'colaboradores'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.nome.localeCompare(b.nome));
      setColaboradores(list);
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'colaboradorId') {
      const colab = colaboradores.find((c) => c.id === value);
      setForm({
        ...form,
        colaboradorId: value,
        colaboradorNome: colab ? colab.nome : '',
      });
    } else {
      const updated = { ...form, [name]: value };
      // Auto-calcular dias gozados
      if (name === 'dataInicio' || name === 'dataFim') {
        const dias = calcDias(
          name === 'dataInicio' ? value : form.dataInicio,
          name === 'dataFim' ? value : form.dataFim
        );
        if (dias > 0) updated.diasGozados = String(dias);
      }
      setForm(updated);
    }
  }

  function openNewForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(fer) {
    setForm({
      colaboradorId: fer.colaboradorId || '',
      colaboradorNome: fer.colaboradorNome || '',
      periodoAquisitivoInicio: fer.periodoAquisitivoInicio || '',
      periodoAquisitivoFim: fer.periodoAquisitivoFim || '',
      dataInicio: fer.dataInicio || '',
      dataFim: fer.dataFim || '',
      diasGozados: fer.diasGozados || '',
      diasVendidos: fer.diasVendidos || '',
      status: fer.status || 'Agendada',
      observacoes: fer.observacoes || '',
    });
    setEditingId(fer.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.colaboradorId || !form.dataInicio || !form.dataFim) {
      toast.error('Colaborador, data início e data fim são obrigatórios');
      return;
    }

    const data = {
      ...form,
      diasGozados: Number(form.diasGozados) || 0,
      diasVendidos: Number(form.diasVendidos) || 0,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'ferias', editingId), {
          ...data,
          updatedAt: new Date().toISOString(),
        });
        toast.success('Férias atualizadas!');
      } else {
        await addDoc(collection(db, 'ferias'), {
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success('Férias cadastradas!');
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchFerias();
    } catch (error) {
      toast.error('Erro ao salvar férias');
      console.error(error);
    }
  }

  async function handleDelete(id, nome) {
    if (!window.confirm(`Tem certeza que deseja excluir as férias de ${nome}?`)) return;

    try {
      await deleteDoc(doc(db, 'ferias', id));
      toast.success('Férias excluídas');
      fetchFerias();
    } catch (error) {
      toast.error('Erro ao excluir');
      console.error(error);
    }
  }

  function statusBadge(status) {
    const colors = {
      'Agendada': 'bg-blue-100 text-blue-800',
      'Em andamento': 'bg-yellow-100 text-yellow-800',
      'Concluída': 'bg-green-100 text-green-800',
      'Cancelada': 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Controle de Férias</h2>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Novo Registro
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por colaborador ou status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Colaborador</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Período</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Dias</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Vendidos</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  <Calendar size={32} className="mx-auto mb-2" />
                  Nenhum registro de férias encontrado
                </td>
              </tr>
            ) : (
              filteredList.map((fer) => (
                <tr key={fer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{fer.colaboradorNome}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {fer.dataInicio ? new Date(fer.dataInicio).toLocaleDateString('pt-BR') : '-'}
                    {' → '}
                    {fer.dataFim ? new Date(fer.dataFim).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{fer.diasGozados || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{fer.diasVendidos || '0'}</td>
                  <td className="px-6 py-4">{statusBadge(fer.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditForm(fer)} className="text-blue-600 hover:text-blue-800 mr-3" title="Editar">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(fer.id, fer.colaboradorNome)} className="text-red-600 hover:text-red-800" title="Excluir">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? 'Editar Férias' : 'Novo Registro de Férias'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="colaboradorId" className="block text-sm font-medium text-gray-700 mb-1">Colaborador *</label>
                <select
                  id="colaboradorId"
                  name="colaboradorId"
                  value={form.colaboradorId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecione...</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="periodoAquisitivoInicio" className="block text-sm font-medium text-gray-700 mb-1">
                    Período Aquisitivo - Início
                  </label>
                  <input
                    id="periodoAquisitivoInicio"
                    name="periodoAquisitivoInicio"
                    type="date"
                    value={form.periodoAquisitivoInicio}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="periodoAquisitivoFim" className="block text-sm font-medium text-gray-700 mb-1">
                    Período Aquisitivo - Fim
                  </label>
                  <input
                    id="periodoAquisitivoFim"
                    name="periodoAquisitivoFim"
                    type="date"
                    value={form.periodoAquisitivoFim}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-1">Data Início *</label>
                  <input
                    id="dataInicio"
                    name="dataInicio"
                    type="date"
                    value={form.dataInicio}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-1">Data Fim *</label>
                  <input
                    id="dataFim"
                    name="dataFim"
                    type="date"
                    value={form.dataFim}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="diasGozados" className="block text-sm font-medium text-gray-700 mb-1">Dias Gozados</label>
                  <input
                    id="diasGozados"
                    name="diasGozados"
                    type="number"
                    value={form.diasGozados}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="diasVendidos" className="block text-sm font-medium text-gray-700 mb-1">Dias Vendidos</label>
                  <input
                    id="diasVendidos"
                    name="diasVendidos"
                    type="number"
                    value={form.diasVendidos}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  value={form.observacoes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
