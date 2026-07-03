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
import { Plus, Pencil, Trash2, Search, X, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const STATUS_OPTIONS = ['ativo', 'inativo', 'afastado', 'ferias'];
const CONTRATO_OPTIONS = ['CLT', 'PJ', 'Estágio', 'Temporário'];

const emptyForm = {
  nome: '',
  email: '',
  cargo: '',
  setor: '',
  gestor: '',
  dataAdmissao: '',
  dataEfetivacao: '',
  tipoContrato: 'CLT',
  status: 'ativo',
  telefone: '',
  linkedin: '',
  github: '',
  credly: '',
  jobConvoResultado: '',
  googleDriveLink: '',
  curriculoUrl: '',
};

export default function Colaboradores() {
  const navigate = useNavigate();
  const [colaboradores, setColaboradores] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSetor, setFilterSetor] = useState('');
  const [filterContrato, setFilterContrato] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchColaboradores();
  }, []);

  useEffect(() => {
    let list = colaboradores;

    // Filtro de busca por texto
    if (search.trim() !== '') {
      const term = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.nome.toLowerCase().includes(term) ||
          c.cargo.toLowerCase().includes(term) ||
          c.setor.toLowerCase().includes(term)
      );
    }

    // Filtro por status
    if (filterStatus) {
      list = list.filter((c) => c.status === filterStatus);
    }

    // Filtro por setor
    if (filterSetor) {
      list = list.filter((c) => c.setor === filterSetor);
    }

    // Filtro por contrato
    if (filterContrato) {
      list = list.filter((c) => c.tipoContrato === filterContrato);
    }

    setFilteredList(list);
  }, [search, filterStatus, filterSetor, filterContrato, colaboradores]);

  // Extrair setores únicos pra o filtro
  const setoresUnicos = [...new Set(colaboradores.map((c) => c.setor).filter(Boolean))].sort();
  const contratosUnicos = [...new Set(colaboradores.map((c) => c.tipoContrato).filter(Boolean))].sort();

  async function fetchColaboradores() {
    try {
      const snap = await getDocs(collection(db, 'colaboradores'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.nome.localeCompare(b.nome));
      setColaboradores(list);
    } catch (error) {
      toast.error('Erro ao carregar colaboradores');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function openNewForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(colab) {
    setForm({
      nome: colab.nome || '',
      email: colab.email || '',
      cargo: colab.cargo || '',
      setor: colab.setor || '',
      gestor: colab.gestor || '',
      dataAdmissao: colab.dataAdmissao || '',
      dataEfetivacao: colab.dataEfetivacao || '',
      tipoContrato: colab.tipoContrato || 'CLT',
      status: colab.status || 'ativo',
      telefone: colab.telefone || '',
      linkedin: colab.linkedin || '',
      github: colab.github || '',
      credly: colab.credly || '',
      jobConvoResultado: colab.jobConvoResultado || '',
      googleDriveLink: colab.googleDriveLink || '',
      curriculoUrl: colab.curriculoUrl || '',
    });
    setEditingId(colab.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.nome.trim() || !form.cargo.trim()) {
      toast.error('Nome e cargo são obrigatórios');
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'colaboradores', editingId), {
          ...form,
          updatedAt: new Date().toISOString(),
        });
        toast.success('Colaborador atualizado!');
      } else {
        await addDoc(collection(db, 'colaboradores'), {
          ...form,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success('Colaborador cadastrado!');
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchColaboradores();
    } catch (error) {
      toast.error('Erro ao salvar colaborador');
      console.error(error);
    }
  }

  async function handleDelete(id, nome) {
    if (!window.confirm(`Tem certeza que deseja excluir ${nome}?`)) return;

    try {
      await deleteDoc(doc(db, 'colaboradores', id));
      toast.success('Colaborador excluído');
      fetchColaboradores();
    } catch (error) {
      toast.error('Erro ao excluir');
      console.error(error);
    }
  }

  function statusBadge(status) {
    const colors = {
      ativo: 'bg-green-100 text-green-800',
      inativo: 'bg-red-100 text-red-800',
      afastado: 'bg-yellow-100 text-yellow-800',
      ferias: 'bg-blue-100 text-blue-800',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}
      >
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
        <h2 className="text-2xl font-bold text-gray-800">Colaboradores</h2>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Novo Colaborador
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome, cargo ou setor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
          ))}
        </select>

        <select
          value={filterSetor}
          onChange={(e) => setFilterSetor(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">Todos os setores</option>
          {setoresUnicos.map((setor) => (
            <option key={setor} value={setor}>{setor}</option>
          ))}
        </select>

        <select
          value={filterContrato}
          onChange={(e) => setFilterContrato(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">Todos os contratos</option>
          {contratosUnicos.map((ct) => (
            <option key={ct} value={ct}>{ct}</option>
          ))}
        </select>

        {(filterStatus || filterSetor || filterContrato) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterSetor(''); setFilterContrato(''); }}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Limpar filtros
          </button>
        )}

        <span className="flex items-center text-sm text-gray-500 ml-auto">
          {filteredList.length} de {colaboradores.length} colaboradores
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Nome
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Cargo
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Setor
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Contrato
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Status
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Admissão
              </th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Nenhum colaborador encontrado
                </td>
              </tr>
            ) : (
              filteredList.map((colab) => (
                <tr key={colab.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {colab.nome}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{colab.cargo}</td>
                  <td className="px-6 py-4 text-gray-600">{colab.setor}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {colab.tipoContrato}
                  </td>
                  <td className="px-6 py-4">{statusBadge(colab.status)}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {colab.dataAdmissao
                      ? new Date(colab.dataAdmissao).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/colaboradores/${colab.id}`)}
                      className="text-gray-600 hover:text-gray-800 mr-3"
                      title="Ver detalhes"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => openEditForm(colab)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(colab.id, colab.nome)}
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
                {editingId ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    id="nome"
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo *
                  </label>
                  <input
                    id="cargo"
                    name="cargo"
                    value={form.cargo}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="setor" className="block text-sm font-medium text-gray-700 mb-1">
                    Setor
                  </label>
                  <input
                    id="setor"
                    name="setor"
                    value={form.setor}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="gestor" className="block text-sm font-medium text-gray-700 mb-1">
                    Gestor
                  </label>
                  <input
                    id="gestor"
                    name="gestor"
                    value={form.gestor}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    id="telefone"
                    name="telefone"
                    value={form.telefone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="dataAdmissao" className="block text-sm font-medium text-gray-700 mb-1">
                    Data Admissão
                  </label>
                  <input
                    id="dataAdmissao"
                    name="dataAdmissao"
                    type="date"
                    value={form.dataAdmissao}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="dataEfetivacao" className="block text-sm font-medium text-gray-700 mb-1">
                    Data Efetivação
                  </label>
                  <input
                    id="dataEfetivacao"
                    name="dataEfetivacao"
                    type="date"
                    value={form.dataEfetivacao}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="tipoContrato" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo Contrato
                  </label>
                  <select
                    id="tipoContrato"
                    name="tipoContrato"
                    value={form.tipoContrato}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {CONTRATO_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Links e informações adicionais */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Links e Informações Adicionais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1">
                      LinkedIn
                    </label>
                    <input
                      id="linkedin"
                      name="linkedin"
                      type="url"
                      value={form.linkedin}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div>
                    <label htmlFor="github" className="block text-sm font-medium text-gray-700 mb-1">
                      GitHub
                    </label>
                    <input
                      id="github"
                      name="github"
                      type="url"
                      value={form.github}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div>
                    <label htmlFor="credly" className="block text-sm font-medium text-gray-700 mb-1">
                      Credly (Certificações)
                    </label>
                    <input
                      id="credly"
                      name="credly"
                      type="url"
                      value={form.credly}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="https://www.credly.com/users/..."
                    />
                  </div>
                  <div>
                    <label htmlFor="googleDriveLink" className="block text-sm font-medium text-gray-700 mb-1">
                      Google Drive (Fotos/Docs)
                    </label>
                    <input
                      id="googleDriveLink"
                      name="googleDriveLink"
                      type="url"
                      value={form.googleDriveLink}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                  <div>
                    <label htmlFor="curriculoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      Currículo (PDF - link)
                    </label>
                    <input
                      id="curriculoUrl"
                      name="curriculoUrl"
                      type="url"
                      value={form.curriculoUrl}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="https://drive.google.com/...curriculo.pdf"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="jobConvoResultado" className="block text-sm font-medium text-gray-700 mb-1">
                      Resultado Job Convo
                    </label>
                    <textarea
                      id="jobConvoResultado"
                      name="jobConvoResultado"
                      value={form.jobConvoResultado}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Resultado dos testes do Job Convo..."
                    />
                  </div>
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
