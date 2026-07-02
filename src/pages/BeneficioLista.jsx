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
import { Plus, Pencil, Trash2, Search, X, Calculator, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

function getDiasUteisNoMes(ano, mes) {
  let count = 0;
  const totalDias = new Date(ano, mes, 0).getDate();
  for (let dia = 1; dia <= totalDias; dia++) {
    const d = new Date(ano, mes - 1, dia);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export default function BeneficioLista({ tipoBeneficio, titulo }) {
  const [beneficios, setBeneficios] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    colaboradorId: '',
    colaboradorNome: '',
    valorDiario: '',
    valorMensal: '',
    dataInicio: '',
    dataFim: '',
    ativo: true,
  });
  const [loading, setLoading] = useState(true);

  const [calcMes, setCalcMes] = useState(new Date().getMonth() + 1);
  const [calcAno, setCalcAno] = useState(new Date().getFullYear());
  const [calcResult, setCalcResult] = useState([]);

  useEffect(() => {
    fetchBeneficios();
    fetchColaboradores();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredList(beneficios);
    } else {
      const term = search.toLowerCase();
      setFilteredList(
        beneficios.filter((b) => b.colaboradorNome.toLowerCase().includes(term))
      );
    }
  }, [search, beneficios]);

  async function fetchBeneficios() {
    try {
      const snap = await getDocs(collection(db, 'beneficios'));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const list = all.filter((b) => b.tipo === tipoBeneficio);
      list.sort((a, b) => a.colaboradorNome.localeCompare(b.colaboradorNome));
      setBeneficios(list);
    } catch (error) {
      toast.error('Erro ao carregar benefícios');
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
    const { name, value, type, checked } = e.target;
    if (name === 'colaboradorId') {
      const colab = colaboradores.find((c) => c.id === value);
      setForm({ ...form, colaboradorId: value, colaboradorNome: colab ? colab.nome : '' });
    } else if (type === 'checkbox') {
      setForm({ ...form, [name]: checked });
    } else if (name === 'valorMensal') {
      const mensal = parseFloat(value) || 0;
      setForm({ ...form, valorMensal: value, valorDiario: (mensal / 22).toFixed(2) });
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  function openNewForm() {
    setForm({
      colaboradorId: '',
      colaboradorNome: '',
      valorDiario: '',
      valorMensal: '',
      dataInicio: '',
      dataFim: '',
      ativo: true,
    });
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(ben) {
    setForm({
      colaboradorId: ben.colaboradorId || '',
      colaboradorNome: ben.colaboradorNome || '',
      valorDiario: ben.valorDiario || '',
      valorMensal: ben.valorMensal || '',
      dataInicio: ben.dataInicio || '',
      dataFim: ben.dataFim || '',
      ativo: ben.ativo !== false,
    });
    setEditingId(ben.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.colaboradorId || !form.valorDiario) {
      toast.error('Colaborador e valor são obrigatórios');
      return;
    }

    const data = {
      colaboradorId: form.colaboradorId,
      colaboradorNome: form.colaboradorNome,
      tipo: tipoBeneficio,
      valorDiario: parseFloat(form.valorDiario),
      valorMensal: parseFloat(form.valorMensal) || parseFloat(form.valorDiario) * 22,
      dataInicio: form.dataInicio,
      dataFim: form.dataFim,
      ativo: form.ativo,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'beneficios', editingId), { ...data, updatedAt: new Date().toISOString() });
        toast.success('Benefício atualizado!');
      } else {
        await addDoc(collection(db, 'beneficios'), { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        toast.success('Benefício cadastrado!');
      }
      setShowForm(false);
      setEditingId(null);
      fetchBeneficios();
    } catch (error) {
      toast.error('Erro ao salvar');
      console.error(error);
    }
  }

  async function handleDelete(id, nome) {
    if (!window.confirm(`Remover ${tipoBeneficio} de ${nome}?`)) return;
    try {
      await deleteDoc(doc(db, 'beneficios', id));
      toast.success('Removido!');
      fetchBeneficios();
    } catch (error) {
      toast.error('Erro ao remover');
      console.error(error);
    }
  }

  function calcularMes() {
    const diasUteis = getDiasUteisNoMes(calcAno, calcMes);
    // Último dia do mês selecionado pra comparação
    const fimDoMes = `${calcAno}-${String(calcMes).padStart(2, '0')}-${new Date(calcAno, calcMes, 0).getDate()}`;
    const inicioDoMes = `${calcAno}-${String(calcMes).padStart(2, '0')}-01`;

    // Filtrar benefícios vigentes no mês selecionado
    const vigentes = beneficios.filter((b) => {
      // Se tem dataFim e ela é anterior ao início do mês, não conta
      if (b.dataFim && b.dataFim < inicioDoMes) return false;
      // Se tem dataInicio e ela é posterior ao fim do mês, não conta
      if (b.dataInicio && b.dataInicio > fimDoMes) return false;
      return true;
    });

    const result = vigentes.map((b) => ({
      nome: b.colaboradorNome,
      valorDiario: b.valorDiario || 0,
      diasUteis,
      total: (b.valorDiario || 0) * diasUteis,
    }));

    result.sort((a, b) => a.nome.localeCompare(b.nome));
    setCalcResult(result);
    setShowCalc(true);
  }

  function getStatusBeneficio(ben) {
    if (ben.dataFim) {
      const hoje = new Date().toISOString().split('T')[0];
      if (ben.dataFim < hoje) return { label: 'Encerrado', color: 'bg-red-100 text-red-800' };
      return { label: 'Ativo (com fim)', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { label: 'Ativo', color: 'bg-green-100 text-green-800' };
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{beneficios.length} colaboradores</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={calcularMes}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Calculator size={18} />
            Calcular Mês
          </button>
          <button
            onClick={openNewForm}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus size={18} />
            Novo
          </button>
        </div>
      </div>

      {/* Calculadora */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-4 flex items-center gap-4">
        <span className="text-sm text-gray-600">Mês/Ano:</span>
        <select
          value={calcMes}
          onChange={(e) => setCalcMes(Number(e.target.value))}
          className="px-2 py-1 border border-gray-300 rounded text-sm"
        >
          {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <input
          type="number"
          value={calcAno}
          onChange={(e) => setCalcAno(Number(e.target.value))}
          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
        />
        <span className="text-sm text-gray-500">
          ({getDiasUteisNoMes(calcAno, calcMes)} dias úteis)
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar colaborador..."
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
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Valor/Dia</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Valor/Mês</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Vigência</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  <CreditCard size={32} className="mx-auto mb-2" />
                  Nenhum {titulo.toLowerCase()} cadastrado
                </td>
              </tr>
            ) : (
              filteredList.map((ben) => (
                <tr key={ben.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{ben.colaboradorNome}</td>
                  <td className="px-6 py-4 text-gray-600">R$ {Number(ben.valorDiario || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-600">R$ {Number(ben.valorMensal || (ben.valorDiario || 0) * 22).toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {ben.dataInicio ? new Date(ben.dataInicio).toLocaleDateString('pt-BR') : '-'}
                    {ben.dataFim ? ` → ${new Date(ben.dataFim).toLocaleDateString('pt-BR')}` : ''}
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const st = getStatusBeneficio(ben);
                      return (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditForm(ben)} className="text-blue-600 hover:text-blue-800 mr-3" title="Editar">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(ben.id, ben.colaboradorNome)} className="text-red-600 hover:text-red-800" title="Excluir">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredList.length > 0 && (
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-3 font-bold text-gray-800">Total</td>
                <td className="px-6 py-3 font-bold text-gray-800">
                  R$ {filteredList.reduce((s, b) => s + (Number(b.valorDiario) || 0), 0).toFixed(2)}
                </td>
                <td className="px-6 py-3 font-bold text-gray-800">
                  R$ {filteredList.reduce((s, b) => s + (Number(b.valorMensal) || (Number(b.valorDiario) || 0) * 22), 0).toFixed(2)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? `Editar ${titulo}` : `Novo ${titulo}`}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="valorMensal" className="block text-sm font-medium text-gray-700 mb-1">Valor Mensal (R$) *</label>
                  <input
                    id="valorMensal"
                    name="valorMensal"
                    type="number"
                    step="0.01"
                    value={form.valorMensal}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="valorDiario" className="block text-sm font-medium text-gray-700 mb-1">Valor/Dia (auto)</label>
                  <input
                    id="valorDiario"
                    name="valorDiario"
                    type="number"
                    step="0.01"
                    value={form.valorDiario}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50"
                    placeholder="Calculado automaticamente"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                  <input
                    id="dataInicio"
                    name="dataInicio"
                    type="date"
                    value={form.dataInicio}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                  <input
                    id="dataFim"
                    name="dataFim"
                    type="date"
                    value={form.dataFim}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>Como funciona:</strong> O benefício fica ativo enquanto "Data Fim" estiver vazia. 
                Para encerrar, preencha a data do último dia de vigência. O cálculo dos meses anteriores continuará incluindo este benefício.
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cálculo */}
      {showCalc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {titulo} — {String(calcMes).padStart(2, '0')}/{calcAno}
              </h3>
              <button onClick={() => setShowCalc(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Dias úteis: <strong>{getDiasUteisNoMes(calcAno, calcMes)}</strong>
            </p>

            {calcResult.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhum benefício ativo</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Colaborador</th>
                    <th className="text-right px-4 py-2 text-sm font-medium text-gray-500">Valor/Dia</th>
                    <th className="text-right px-4 py-2 text-sm font-medium text-gray-500">Dias</th>
                    <th className="text-right px-4 py-2 text-sm font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {calcResult.map((r) => (
                    <tr key={r.nome} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800">{r.nome}</td>
                      <td className="px-4 py-2 text-right text-gray-600">R$ {r.valorDiario.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{r.diasUteis}</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-800">R$ {r.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-4 py-2 text-gray-800">TOTAL</td>
                    <td className="px-4 py-2 text-right text-gray-800" />
                    <td className="px-4 py-2 text-right text-gray-800" />
                    <td className="px-4 py-2 text-right text-gray-800">
                      R$ {calcResult.reduce((s, r) => s + r.total, 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
