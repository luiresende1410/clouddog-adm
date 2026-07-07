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
import { Plus, Pencil, Trash2, Search, X, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import ImportCSV from '../components/ImportCSV';

const emptyForm = {
  cargo: '',
  nivel: '',
  ano: new Date().getFullYear(),
  salarioBase: '',
};

export default function TabelaSalarial() {
  const [registros, setRegistros] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [filterCargo, setFilterCargo] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [filterAno, setFilterAno] = useState('');
  const [sortBy, setSortBy] = useState('nivel');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const csvCampos = [
    { key: 'cargo', label: 'Cargo', required: true, example: 'Engenheiro de Software' },
    { key: 'nivel', label: 'Nível', required: true, example: 'L5' },
    { key: 'ano', label: 'Ano', required: true, example: '2025' },
    { key: 'salarioBase', label: 'Salário Base', required: true, example: '12000.00' },
  ];

  async function handleCSVImport(rows) {
    let inserted = 0;
    let updated = 0;

    for (const row of rows) {
      // Verificar se já existe registro com mesmo cargo + nível + ano
      const existing = registros.find(
        (r) =>
          r.cargo?.toLowerCase() === row.cargo?.toLowerCase() &&
          r.nivel?.toLowerCase() === row.nivel?.toLowerCase() &&
          String(r.ano) === String(row.ano)
      );

      const data = {
        cargo: row.cargo?.trim() || '',
        nivel: row.nivel?.trim() || '',
        ano: Number(row.ano) || new Date().getFullYear(),
        salarioBase: Number(row.salarioBase) || 0,
      };

      if (existing) {
        await updateDoc(doc(db, 'tabelaSalarial', existing.id), {
          ...data,
          updatedAt: new Date().toISOString(),
        });
        updated++;
      } else {
        await addDoc(collection(db, 'tabelaSalarial'), {
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        inserted++;
      }
    }

    fetchRegistros();
    return { inserted, updated, skipped: 0 };
  }

  useEffect(() => {
    fetchRegistros();
  }, []);

  useEffect(() => {
    let list = registros;

    if (filterCargo) {
      list = list.filter((r) => r.cargo === filterCargo);
    }

    if (filterNivel) {
      list = list.filter((r) => r.nivel === filterNivel);
    }

    if (filterAno) {
      list = list.filter((r) => String(r.ano) === String(filterAno));
    }

    // Ordenação
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'nivel':
          if (a.nivel !== b.nivel) return a.nivel.localeCompare(b.nivel);
          if (a.cargo !== b.cargo) return a.cargo.localeCompare(b.cargo);
          return b.ano - a.ano;
        case 'cargo':
          if (a.cargo !== b.cargo) return a.cargo.localeCompare(b.cargo);
          if (a.nivel !== b.nivel) return a.nivel.localeCompare(b.nivel);
          return b.ano - a.ano;
        case 'ano':
          if (a.ano !== b.ano) return b.ano - a.ano;
          if (a.cargo !== b.cargo) return a.cargo.localeCompare(b.cargo);
          return a.nivel.localeCompare(b.nivel);
        case 'salario-asc':
          return (a.salarioBase || 0) - (b.salarioBase || 0);
        case 'salario-desc':
          return (b.salarioBase || 0) - (a.salarioBase || 0);
        default:
          return 0;
      }
    });

    setFilteredList(list);
  }, [filterCargo, filterNivel, filterAno, sortBy, registros]);

  async function fetchRegistros() {
    try {
      const snap = await getDocs(collection(db, 'tabelaSalarial'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        if (a.cargo !== b.cargo) return a.cargo.localeCompare(b.cargo);
        if (a.nivel !== b.nivel) return a.nivel.localeCompare(b.nivel);
        return b.ano - a.ano;
      });
      setRegistros(list);
    } catch (error) {
      toast.error('Erro ao carregar tabela salarial');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  function openNewForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(registro) {
    setForm({
      cargo: registro.cargo || '',
      nivel: registro.nivel || '',
      ano: registro.ano || new Date().getFullYear(),
      salarioBase: registro.salarioBase || '',
    });
    setEditingId(registro.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.cargo.trim() || !form.nivel.trim() || !form.salarioBase) {
      toast.error('Cargo, nível e salário base são obrigatórios');
      return;
    }

    const data = {
      cargo: form.cargo.trim(),
      nivel: form.nivel.trim(),
      ano: Number(form.ano),
      salarioBase: Number(form.salarioBase),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'tabelaSalarial', editingId), {
          ...data,
          updatedAt: new Date().toISOString(),
        });
        toast.success('Registro atualizado!');
      } else {
        await addDoc(collection(db, 'tabelaSalarial'), {
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success('Registro cadastrado!');
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchRegistros();
    } catch (error) {
      toast.error('Erro ao salvar registro');
      console.error(error);
    }
  }

  async function handleDelete(id, desc) {
    if (!window.confirm(`Tem certeza que deseja excluir "${desc}"?`)) return;

    try {
      await deleteDoc(doc(db, 'tabelaSalarial', id));
      toast.success('Registro excluído');
      fetchRegistros();
    } catch (error) {
      toast.error('Erro ao excluir');
      console.error(error);
    }
  }

  function formatCurrency(value) {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  // Unique values for filters
  const cargosUnicos = [...new Set(registros.map((r) => r.cargo))].sort();
  const niveisUnicos = [...new Set(registros.map((r) => r.nivel))].sort();
  const anosUnicos = [...new Set(registros.map((r) => r.ano))].sort((a, b) => b - a);

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
        <h2 className="text-2xl font-bold text-gray-800">Tabela Salarial</h2>
        <div className="flex gap-3">
          <ImportCSV
            campos={csvCampos}
            onImport={handleCSVImport}
            titulo="Importar Tabela Salarial"
            templateFileName="tabela_salarial_template.csv"
          />
          <button
            onClick={openNewForm}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Novo Registro
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
          <select
            value={filterCargo}
            onChange={(e) => setFilterCargo(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
          >
            <option value="">Todos os cargos</option>
            {cargosUnicos.map((cargo) => (
              <option key={cargo} value={cargo}>{cargo}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
          <select
            value={filterNivel}
            onChange={(e) => setFilterNivel(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
          >
            <option value="">Todos os níveis</option>
            {niveisUnicos.map((nivel) => (
              <option key={nivel} value={nivel}>{nivel}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={filterAno}
            onChange={(e) => setFilterAno(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
          >
            <option value="">Todos os anos</option>
            {anosUnicos.map((ano) => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
          >
            <option value="nivel">Ordenar por Nível</option>
            <option value="cargo">Ordenar por Cargo</option>
            <option value="ano">Ordenar por Ano</option>
            <option value="salario-asc">Salário (menor → maior)</option>
            <option value="salario-desc">Salário (maior → menor)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Cargo</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Nível</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Ano</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Salário Base</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  <DollarSign size={32} className="mx-auto mb-2" />
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              filteredList.map((registro) => (
                <tr key={registro.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{registro.cargo}</td>
                  <td className="px-6 py-4 text-gray-600">{registro.nivel}</td>
                  <td className="px-6 py-4 text-gray-600">{registro.ano}</td>
                  <td className="px-6 py-4 text-gray-800 font-medium">{formatCurrency(registro.salarioBase)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditForm(registro)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(registro.id, `${registro.cargo} ${registro.nivel} (${registro.ano})`)}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? 'Editar Registro' : 'Novo Registro'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 mb-1">Cargo *</label>
                  <input
                    id="cargo"
                    name="cargo"
                    value={form.cargo}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Ex: Engenheiro de Software"
                  />
                </div>
                <div>
                  <label htmlFor="nivel" className="block text-sm font-medium text-gray-700 mb-1">Nível *</label>
                  <input
                    id="nivel"
                    name="nivel"
                    value={form.nivel}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Ex: L5"
                  />
                </div>
                <div>
                  <label htmlFor="ano" className="block text-sm font-medium text-gray-700 mb-1">Ano *</label>
                  <input
                    id="ano"
                    name="ano"
                    type="number"
                    value={form.ano}
                    onChange={handleChange}
                    required
                    min={2020}
                    max={2099}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="salarioBase" className="block text-sm font-medium text-gray-700 mb-1">Salário Base (R$) *</label>
                  <input
                    id="salarioBase"
                    name="salarioBase"
                    type="number"
                    value={form.salarioBase}
                    onChange={handleChange}
                    required
                    min={0}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Ex: 12000.00"
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
    </div>
  );
}
