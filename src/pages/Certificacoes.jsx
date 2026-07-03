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
import { Plus, Pencil, Trash2, Search, X, Award, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const PROVEDOR_OPTIONS = ['AWS', 'Azure', 'Google Cloud', 'Terraform', 'Kubernetes', 'Datadog', 'Linux', 'Docker', 'Outro'];
const NIVEL_OPTIONS = ['Foundational', 'Associate', 'Professional', 'Specialty', 'Expert'];

const emptyForm = {
  colaboradorId: '',
  colaboradorNome: '',
  provedor: 'AWS',
  nome: '',
  nivel: 'Associate',
  dataObtencao: '',
  dataExpiracao: '',
};

function calcularStatus(dataExpiracao) {
  if (!dataExpiracao) return 'Permanente';
  const hoje = new Date();
  const expiracao = new Date(dataExpiracao);
  if (expiracao < hoje) return 'Expirada';
  const diffMs = expiracao - hoje;
  const diffDias = diffMs / (1000 * 60 * 60 * 24);
  if (diffDias <= 90) return 'Renovar em breve';
  return 'Válida';
}

export default function Certificacoes() {
  const [certificacoes, setCertificacoes] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [search, setSearch] = useState('');
  const [filterProvedor, setFilterProvedor] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificacoes();
    fetchColaboradores();
  }, []);

  useEffect(() => {
    let list = certificacoes;

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.colaboradorNome.toLowerCase().includes(term) ||
          c.nome.toLowerCase().includes(term)
      );
    }

    if (filterProvedor) {
      list = list.filter((c) => c.provedor === filterProvedor);
    }

    setFilteredList(list);
  }, [search, filterProvedor, certificacoes]);

  async function fetchCertificacoes() {
    try {
      const snap = await getDocs(collection(db, 'certificacoes'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.colaboradorNome.localeCompare(b.colaboradorNome));
      setCertificacoes(list);
    } catch (error) {
      toast.error('Erro ao carregar certificações');
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

  function openEditForm(cert) {
    setForm({
      colaboradorId: cert.colaboradorId || '',
      colaboradorNome: cert.colaboradorNome || '',
      provedor: cert.provedor || 'AWS',
      nome: cert.nome || '',
      nivel: cert.nivel || 'Associate',
      dataObtencao: cert.dataObtencao || '',
      dataExpiracao: cert.dataExpiracao || '',
    });
    setEditingId(cert.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.colaboradorId || !form.nome.trim()) {
      toast.error('Colaborador e nome da certificação são obrigatórios');
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'certificacoes', editingId), {
          ...form,
          updatedAt: new Date().toISOString(),
        });
        toast.success('Certificação atualizada!');
      } else {
        await addDoc(collection(db, 'certificacoes'), {
          ...form,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success('Certificação cadastrada!');
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchCertificacoes();
    } catch (error) {
      toast.error('Erro ao salvar certificação');
      console.error(error);
    }
  }

  async function handleDelete(id, desc) {
    if (!window.confirm(`Tem certeza que deseja excluir "${desc}"?`)) return;

    try {
      await deleteDoc(doc(db, 'certificacoes', id));
      toast.success('Certificação excluída');
      fetchCertificacoes();
    } catch (error) {
      toast.error('Erro ao excluir');
      console.error(error);
    }
  }

  function statusBadge(status) {
    const colors = {
      Permanente: 'bg-blue-100 text-blue-800',
      Válida: 'bg-green-100 text-green-800',
      'Renovar em breve': 'bg-yellow-100 text-yellow-800',
      Expirada: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  }

  function provedorBadge(provedor) {
    const colors = {
      AWS: 'bg-orange-100 text-orange-800',
      Azure: 'bg-blue-100 text-blue-800',
      'Google Cloud': 'bg-green-100 text-green-800',
      Terraform: 'bg-purple-100 text-purple-800',
      Kubernetes: 'bg-indigo-100 text-indigo-800',
      Datadog: 'bg-violet-100 text-violet-800',
      Linux: 'bg-yellow-100 text-yellow-800',
      Docker: 'bg-cyan-100 text-cyan-800',
      Outro: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[provedor] || 'bg-gray-100 text-gray-800'}`}>
        {provedor}
      </span>
    );
  }

  // Summary counts
  const totalCerts = certificacoes.length;
  const certsByProvedor = PROVEDOR_OPTIONS.reduce((acc, prov) => {
    const count = certificacoes.filter((c) => c.provedor === prov).length;
    if (count > 0) acc.push({ provedor: prov, count });
    return acc;
  }, []);

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
        <h2 className="text-2xl font-bold text-gray-800">Certificações</h2>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Nova Certificação
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Award size={20} className="text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Total: <strong>{totalCerts}</strong></span>
          </div>
          <div className="h-6 w-px bg-gray-200" />
          {certsByProvedor.map(({ provedor, count }) => (
            <div key={provedor} className="flex items-center gap-1">
              {provedorBadge(provedor)}
              <span className="text-xs text-gray-500 ml-1">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por colaborador ou certificação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="relative">
          <Filter size={20} className="absolute left-3 top-2.5 text-gray-400" />
          <select
            value={filterProvedor}
            onChange={(e) => setFilterProvedor(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
          >
            <option value="">Todos provedores</option>
            {PROVEDOR_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Colaborador</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Certificação</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Provedor</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Nível</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Obtida em</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Expira em</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  <Award size={32} className="mx-auto mb-2" />
                  Nenhuma certificação encontrada
                </td>
              </tr>
            ) : (
              filteredList.map((cert) => {
                const status = calcularStatus(cert.dataExpiracao);
                return (
                  <tr key={cert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{cert.colaboradorNome}</td>
                    <td className="px-6 py-4 text-gray-600">{cert.nome}</td>
                    <td className="px-6 py-4">{provedorBadge(cert.provedor)}</td>
                    <td className="px-6 py-4 text-gray-600">{cert.nivel}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {cert.dataObtencao
                        ? new Date(cert.dataObtencao).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {cert.dataExpiracao
                        ? new Date(cert.dataExpiracao).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4">{statusBadge(status)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditForm(cert)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(cert.id, cert.nome)}
                        className="text-red-600 hover:text-red-800"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
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
                {editingId ? 'Editar Certificação' : 'Nova Certificação'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="colaboradorId" className="block text-sm font-medium text-gray-700 mb-1">Colaborador *</label>
                  <select
                    id="colaboradorId"
                    name="colaboradorId"
                    value={form.colaboradorId}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Selecione um colaborador</option>
                    {colaboradores.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">Nome da Certificação *</label>
                  <input
                    id="nome"
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Ex: AWS Solutions Architect"
                  />
                </div>
                <div>
                  <label htmlFor="provedor" className="block text-sm font-medium text-gray-700 mb-1">Provedor *</label>
                  <select
                    id="provedor"
                    name="provedor"
                    value={form.provedor}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {PROVEDOR_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="nivel" className="block text-sm font-medium text-gray-700 mb-1">Nível *</label>
                  <select
                    id="nivel"
                    name="nivel"
                    value={form.nivel}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {NIVEL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dataObtencao" className="block text-sm font-medium text-gray-700 mb-1">Data de Obtenção *</label>
                  <input
                    id="dataObtencao"
                    name="dataObtencao"
                    type="date"
                    value={form.dataObtencao}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="dataExpiracao" className="block text-sm font-medium text-gray-700 mb-1">Data de Expiração</label>
                  <input
                    id="dataExpiracao"
                    name="dataExpiracao"
                    type="date"
                    value={form.dataExpiracao}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Deixe vazio para certificações permanentes</p>
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
    </div>
  );
}
