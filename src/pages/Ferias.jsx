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
import { Plus, Pencil, Trash2, Search, X, Calendar, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['Agendada', 'Em andamento', 'Concluída', 'Cancelada'];
const TIPO_FERIAS = ['Férias', 'Emenda de Feriado'];

const emptyForm = {
  colaboradorId: '',
  colaboradorNome: '',
  tipo: 'Férias',
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

// Calcula o período aquisitivo atual baseado na data de admissão/efetivação
function calcPeriodoAquisitivo(dataAdmissao) {
  if (!dataAdmissao) return null;
  const admissao = new Date(dataAdmissao);
  const hoje = new Date();

  let inicioAtual = new Date(admissao);
  while (true) {
    const proximo = new Date(inicioAtual);
    proximo.setFullYear(proximo.getFullYear() + 1);
    if (proximo > hoje) break;
    inicioAtual = proximo;
  }

  const fimAtual = new Date(inicioAtual);
  fimAtual.setFullYear(fimAtual.getFullYear() + 1);
  fimAtual.setDate(fimAtual.getDate() - 1);

  return {
    inicio: inicioAtual.toISOString().split('T')[0],
    fim: fimAtual.toISOString().split('T')[0],
  };
}

export default function Ferias() {
  const [ferias, setFerias] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showSaldo, setShowSaldo] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saldos, setSaldos] = useState([]);

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

  function calcularSaldos() {
    const hoje = new Date().toISOString().split('T')[0];
    const result = [];

    for (const colab of colaboradores) {
      if (colab.status !== 'ativo') continue;

      // Usar dataEfetivacao se existir (CLT), senão dataAdmissao
      const dataBase = colab.dataEfetivacao || colab.dataAdmissao;
      if (!dataBase) continue;

      const periodo = calcPeriodoAquisitivo(dataBase);
      if (!periodo) continue;

      // Buscar férias concluídas ou em andamento no período aquisitivo atual
      const feriasNoPeriodo = ferias.filter(
        (f) =>
          f.colaboradorId === colab.id &&
          f.status !== 'Cancelada' &&
          f.dataInicio >= periodo.inicio &&
          f.dataInicio <= periodo.fim
      );

      const feriasRegulares = feriasNoPeriodo.filter((f) => f.tipo !== 'Emenda de Feriado');
      const emendas = feriasNoPeriodo.filter((f) => f.tipo === 'Emenda de Feriado');

      const diasGozados = feriasRegulares.reduce((s, f) => s + (Number(f.diasGozados) || 0), 0);
      const diasEmendas = emendas.reduce((s, f) => s + (Number(f.diasGozados) || 0), 0);
      const diasVendidos = feriasNoPeriodo.reduce((s, f) => s + (Number(f.diasVendidos) || 0), 0);
      const saldo = 30 - diasGozados - diasEmendas - diasVendidos;

      // Verificar se férias estão vencendo (período concessivo = 12 meses após fim do aquisitivo)
      const fimAquisitivo = new Date(periodo.fim);
      const limiteConcessivo = new Date(fimAquisitivo);
      limiteConcessivo.setFullYear(limiteConcessivo.getFullYear() + 1);
      const diasParaVencer = Math.ceil((limiteConcessivo - new Date()) / (1000 * 60 * 60 * 24));

      result.push({
        colaboradorId: colab.id,
        nome: colab.nome,
        setor: colab.setor,
        dataBase,
        periodoInicio: periodo.inicio,
        periodoFim: periodo.fim,
        diasGozados,
        diasEmendas,
        diasVendidos,
        saldo,
        diasParaVencer,
        vencendo: diasParaVencer <= 90 && saldo > 0,
      });
    }

    result.sort((a, b) => a.nome.localeCompare(b.nome));
    setSaldos(result);
    setShowSaldo(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'colaboradorId') {
      const colab = colaboradores.find((c) => c.id === value);
      const updated = {
        ...form,
        colaboradorId: value,
        colaboradorNome: colab ? colab.nome : '',
      };

      // Auto-preencher período aquisitivo
      if (colab) {
        const dataBase = colab.dataEfetivacao || colab.dataAdmissao;
        if (dataBase) {
          const periodo = calcPeriodoAquisitivo(dataBase);
          if (periodo) {
            updated.periodoAquisitivoInicio = periodo.inicio;
            updated.periodoAquisitivoFim = periodo.fim;
          }
        }
      }

      setForm(updated);
    } else if (name === 'tipo') {
      const updated = { ...form, tipo: value };
      // Se emenda, auto-preencher 1 dia e status concluída
      if (value === 'Emenda de Feriado') {
        updated.diasGozados = '1';
        updated.diasVendidos = '0';
        updated.status = 'Concluída';
        if (updated.dataInicio && !updated.dataFim) {
          updated.dataFim = updated.dataInicio;
        }
      }
      setForm(updated);
    } else {
      const updated = { ...form, [name]: value };
      if (name === 'dataInicio' || name === 'dataFim') {
        if (form.tipo === 'Emenda de Feriado') {
          // Emenda: data fim = data inicio
          if (name === 'dataInicio') {
            updated.dataFim = value;
            updated.diasGozados = '1';
          }
        } else {
          const dias = calcDias(
            name === 'dataInicio' ? value : form.dataInicio,
            name === 'dataFim' ? value : form.dataFim
          );
          if (dias > 0) updated.diasGozados = String(dias);
        }
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
      tipo: fer.tipo || 'Férias',
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

    if (!form.colaboradorId || !form.dataInicio) {
      toast.error('Colaborador e data início são obrigatórios');
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
        <div className="flex gap-3">
          <button
            onClick={calcularSaldos}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Calculator size={20} />
            Saldo de Férias
          </button>
          <button
            onClick={openNewForm}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Novo Registro
          </button>
        </div>
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
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Tipo</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Período</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Dias</th>
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
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${fer.tipo === 'Emenda de Feriado' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                      {fer.tipo || 'Férias'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {fer.dataInicio ? new Date(fer.dataInicio).toLocaleDateString('pt-BR') : '-'}
                    {' → '}
                    {fer.dataFim ? new Date(fer.dataFim).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{fer.diasGozados || '-'}</td>
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

      {/* Modal Saldo */}
      {showSaldo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Saldo de Férias — Período Aquisitivo Atual</h3>
              <button onClick={() => setShowSaldo(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Baseado na data de efetivação (ou admissão). Cada período de 12 meses dá direito a 30 dias.
              O saldo reseta a cada novo período aquisitivo.
            </p>

            {saldos.filter((s) => s.vencendo).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-red-800">
                  ⚠️ {saldos.filter((s) => s.vencendo).length} colaborador(es) com férias próximas de vencer (menos de 90 dias para o fim do período concessivo)
                </p>
              </div>
            )}

            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Colaborador</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Período Aquisitivo</th>
                  <th className="text-center px-4 py-2 text-sm font-medium text-gray-500">Gozados</th>
                  <th className="text-center px-4 py-2 text-sm font-medium text-gray-500">Emendas</th>
                  <th className="text-center px-4 py-2 text-sm font-medium text-gray-500">Vendidos</th>
                  <th className="text-center px-4 py-2 text-sm font-medium text-gray-500">Saldo</th>
                  <th className="text-center px-4 py-2 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {saldos.map((s) => (
                  <tr key={s.colaboradorId} className={`hover:bg-gray-50 ${s.vencendo ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-sm">{s.nome}</p>
                      <p className="text-xs text-gray-400">{s.setor}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(s.periodoInicio).toLocaleDateString('pt-BR')} → {new Date(s.periodoFim).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{s.diasGozados}</td>
                    <td className="px-4 py-3 text-center text-sm text-orange-600">{s.diasEmendas}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{s.diasVendidos}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-sm font-bold ${
                        s.saldo === 0 ? 'bg-green-100 text-green-800' :
                        s.saldo <= 10 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {s.saldo} dias
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.saldo === 0 ? (
                        <span className="text-xs text-green-600 font-medium">Completo</span>
                      ) : s.vencendo ? (
                        <span className="text-xs text-red-600 font-medium">Vencendo!</span>
                      ) : (
                        <span className="text-xs text-gray-500">Pendente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {saldos.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                Nenhum colaborador ativo com data de admissão/efetivação cadastrada.
              </p>
            )}
          </div>
        </div>
      )}

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

              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  id="tipo"
                  name="tipo"
                  value={form.tipo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {TIPO_FERIAS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {form.tipo === 'Emenda de Feriado' && (
                  <p className="text-xs text-orange-600 mt-1">Emenda: debita 1 dia do saldo de férias do colaborador.</p>
                )}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50"
                  />
                </div>
              </div>

              {form.periodoAquisitivoInicio && (
                <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  Período aquisitivo preenchido automaticamente com base na data de efetivação/admissão.
                </p>
              )}

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
