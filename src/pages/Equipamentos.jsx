import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Pencil, Trash2, Search, X, Laptop, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

const TIPO_OPTIONS_DEFAULT = ['Notebook', 'Monitor', 'Headset', 'Teclado', 'Mouse', 'Webcam', 'Docking Station', 'Cadeira', 'Outro'];
const ESTADO_OPTIONS = ['Novo', 'Bom', 'Regular', 'Ruim', 'Manutenção'];

const emptyForm = {
  tipo: 'Notebook',
  marca: '',
  modelo: '',
  numeroSerie: '',
  patrimonio: '',
  colaboradorId: '',
  colaboradorNome: '',
  dataRetirada: '',
  dataDevolucao: '',
  estado: 'Novo',
  observacoes: '',
};

export default function Equipamentos() {
  const [equipamentos, setEquipamentos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [tipoOptions, setTipoOptions] = useState(TIPO_OPTIONS_DEFAULT);
  const [showTipoConfig, setShowTipoConfig] = useState(false);
  const [newTipo, setNewTipo] = useState('');

  useEffect(() => {
    fetchEquipamentos();
    fetchColaboradores();
    fetchTipoOptions();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredList(equipamentos);
    } else {
      const term = search.toLowerCase();
      setFilteredList(
        equipamentos.filter(
          (e) =>
            e.tipo.toLowerCase().includes(term) ||
            e.marca.toLowerCase().includes(term) ||
            e.modelo.toLowerCase().includes(term) ||
            e.patrimonio.toLowerCase().includes(term) ||
            e.colaboradorNome.toLowerCase().includes(term)
        )
      );
    }
  }, [search, equipamentos]);

  async function fetchTipoOptions() {
    try {
      const docSnap = await getDoc(doc(db, 'config', 'equipamentoTipos'));
      if (docSnap.exists() && docSnap.data().tipos) {
        setTipoOptions(docSnap.data().tipos);
      }
    } catch (error) {
      console.error('Erro ao carregar tipos:', error);
    }
  }

  async function saveTipoOptions(tipos) {
    try {
      await setDoc(doc(db, 'config', 'equipamentoTipos'), { tipos });
      setTipoOptions(tipos);
    } catch (error) {
      toast.error('Erro ao salvar tipos');
      console.error(error);
    }
  }

  function handleAddTipo() {
    const nome = newTipo.trim();
    if (!nome) return;
    if (tipoOptions.includes(nome)) {
      toast.error('Tipo já existe');
      return;
    }
    const updated = [...tipoOptions.filter((t) => t !== 'Outro'), nome, 'Outro'];
    saveTipoOptions(updated);
    setNewTipo('');
    toast.success(`"${nome}" adicionado!`);
  }

  function handleRemoveTipo(tipo) {
    if (tipo === 'Outro') return;
    if (!window.confirm(`Remover o tipo "${tipo}"?`)) return;
    const updated = tipoOptions.filter((t) => t !== tipo);
    saveTipoOptions(updated);
    toast.success(`"${tipo}" removido`);
  }

  async function fetchEquipamentos() {
    try {
      const snap = await getDocs(collection(db, 'equipamentos'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.tipo.localeCompare(b.tipo));
      setEquipamentos(list);
    } catch (error) {
      toast.error('Erro ao carregar equipamentos');
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
      setForm({ ...form, [name]: value });
    }
  }

  function openNewForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(equip) {
    setForm({
      tipo: equip.tipo || 'Notebook',
      marca: equip.marca || '',
      modelo: equip.modelo || '',
      numeroSerie: equip.numeroSerie || '',
      patrimonio: equip.patrimonio || '',
      colaboradorId: equip.colaboradorId || '',
      colaboradorNome: equip.colaboradorNome || '',
      dataRetirada: equip.dataRetirada || '',
      dataDevolucao: equip.dataDevolucao || '',
      estado: equip.estado || 'Novo',
      observacoes: equip.observacoes || '',
    });
    setEditingId(equip.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.tipo.trim() || !form.marca.trim()) {
      toast.error('Tipo e marca são obrigatórios');
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'equipamentos', editingId), {
          ...form,
          updatedAt: new Date().toISOString(),
        });
        toast.success('Equipamento atualizado!');
      } else {
        await addDoc(collection(db, 'equipamentos'), {
          ...form,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success('Equipamento cadastrado!');
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchEquipamentos();
    } catch (error) {
      toast.error('Erro ao salvar equipamento');
      console.error(error);
    }
  }

  async function handleDelete(id, desc) {
    if (!window.confirm(`Tem certeza que deseja excluir ${desc}?`)) return;

    try {
      await deleteDoc(doc(db, 'equipamentos', id));
      toast.success('Equipamento excluído');
      fetchEquipamentos();
    } catch (error) {
      toast.error('Erro ao excluir');
      console.error(error);
    }
  }

  function estadoBadge(estado) {
    const colors = {
      Novo: 'bg-green-100 text-green-800',
      Bom: 'bg-blue-100 text-blue-800',
      Regular: 'bg-yellow-100 text-yellow-800',
      Ruim: 'bg-red-100 text-red-800',
      Manutenção: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[estado] || 'bg-gray-100 text-gray-800'}`}>
        {estado}
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
        <h2 className="text-2xl font-bold text-gray-800">Equipamentos</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTipoConfig(true)}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings size={20} />
            Tipos
          </button>
          <button
            onClick={openNewForm}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Novo Equipamento
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por tipo, marca, patrimônio ou colaborador..."
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
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Tipo</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Marca/Modelo</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Patrimônio</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Colaborador</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Retirada</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Estado</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  <Laptop size={32} className="mx-auto mb-2" />
                  Nenhum equipamento encontrado
                </td>
              </tr>
            ) : (
              filteredList.map((equip) => (
                <tr key={equip.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{equip.tipo}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {equip.marca} {equip.modelo}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{equip.patrimonio || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{equip.colaboradorNome || 'Sem vínculo'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {equip.dataRetirada
                      ? new Date(equip.dataRetirada).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td className="px-6 py-4">{estadoBadge(equip.estado)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditForm(equip)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(equip.id, `${equip.tipo} ${equip.marca}`)}
                      className="text-red-600 hover:text-red-800"
                      title="Excluir"
                    >
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
                {editingId ? 'Editar Equipamento' : 'Novo Equipamento'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select
                    id="tipo"
                    name="tipo"
                    value={form.tipo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {tipoOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                  <input
                    id="marca"
                    name="marca"
                    value={form.marca}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Ex: Dell, Lenovo, Apple..."
                  />
                </div>
                <div>
                  <label htmlFor="modelo" className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input
                    id="modelo"
                    name="modelo"
                    value={form.modelo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Ex: Latitude 5520"
                  />
                </div>
                <div>
                  <label htmlFor="numeroSerie" className="block text-sm font-medium text-gray-700 mb-1">Nº Série</label>
                  <input
                    id="numeroSerie"
                    name="numeroSerie"
                    value={form.numeroSerie}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="patrimonio" className="block text-sm font-medium text-gray-700 mb-1">Patrimônio</label>
                  <input
                    id="patrimonio"
                    name="patrimonio"
                    value={form.patrimonio}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Código do patrimônio"
                  />
                </div>
                <div>
                  <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    id="estado"
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {ESTADO_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="colaboradorId" className="block text-sm font-medium text-gray-700 mb-1">Colaborador</label>
                  <select
                    id="colaboradorId"
                    name="colaboradorId"
                    value={form.colaboradorId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Sem vínculo</option>
                    {colaboradores.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dataRetirada" className="block text-sm font-medium text-gray-700 mb-1">Data Retirada</label>
                  <input
                    id="dataRetirada"
                    name="dataRetirada"
                    type="date"
                    value={form.dataRetirada}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="dataDevolucao" className="block text-sm font-medium text-gray-700 mb-1">Data Devolução</label>
                  <input
                    id="dataDevolucao"
                    name="dataDevolucao"
                    type="date"
                    value={form.dataDevolucao}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="md:col-span-2">
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

      {/* Modal Config Tipos */}
      {showTipoConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Gerenciar Tipos de Equipamento</h3>
              <button onClick={() => setShowTipoConfig(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTipo}
                onChange={(e) => setNewTipo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTipo())}
                placeholder="Novo tipo..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                onClick={handleAddTipo}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Adicionar
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tipoOptions.map((tipo) => (
                <div key={tipo} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-800">{tipo}</span>
                  {tipo !== 'Outro' && (
                    <button
                      onClick={() => handleRemoveTipo(tipo)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowTipoConfig(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
