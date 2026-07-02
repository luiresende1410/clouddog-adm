import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { FileText, Download, Users, Laptop, CreditCard, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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

export default function Relatorios() {
  const [colaboradores, setColaboradores] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [beneficios, setBeneficios] = useState([]);
  const [ferias, setFerias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesBeneficio, setMesBeneficio] = useState(new Date().getMonth() + 1);
  const [anoBeneficio, setAnoBeneficio] = useState(new Date().getFullYear());

  useEffect(() => {
    async function fetchAll() {
      try {
        const [colabSnap, equipSnap, benSnap, ferSnap] = await Promise.all([
          getDocs(collection(db, 'colaboradores')),
          getDocs(collection(db, 'equipamentos')),
          getDocs(collection(db, 'beneficios')),
          getDocs(collection(db, 'ferias')),
        ]);
        setColaboradores(colabSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setEquipamentos(equipSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setBeneficios(benSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setFerias(ferSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        toast.error('Erro ao carregar dados');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // --- Exportar Colaboradores ---
  function exportColaboradoresPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Colaboradores', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    const rows = colaboradores
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((c) => [c.nome, c.cargo, c.setor, c.tipoContrato, c.status]);

    autoTable(doc, {
      startY: 35,
      head: [['Nome', 'Cargo', 'Setor', 'Contrato', 'Status']],
      body: rows,
      styles: { fontSize: 8 },
    });

    doc.save('colaboradores.pdf');
    toast.success('PDF gerado!');
  }

  function exportColaboradoresExcel() {
    const data = colaboradores
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((c) => ({
        Nome: c.nome,
        Cargo: c.cargo,
        Setor: c.setor,
        'Tipo Contrato': c.tipoContrato,
        Status: c.status,
        'Data Admissão': c.dataAdmissao || '',
        Email: c.email || '',
        Telefone: c.telefone || '',
      }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');
    XLSX.writeFile(wb, 'colaboradores.xlsx');
    toast.success('Excel gerado!');
  }

  // --- Exportar Equipamentos ---
  function exportEquipamentosPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Equipamentos', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    const rows = equipamentos
      .sort((a, b) => a.tipo.localeCompare(b.tipo))
      .map((e) => [
        e.tipo,
        `${e.marca} ${e.modelo}`,
        e.patrimonio || '-',
        e.colaboradorNome || 'Sem vínculo',
        e.dataRetirada ? new Date(e.dataRetirada).toLocaleDateString('pt-BR') : '-',
        e.estado,
      ]);

    autoTable(doc, {
      startY: 35,
      head: [['Tipo', 'Marca/Modelo', 'Patrimônio', 'Colaborador', 'Retirada', 'Estado']],
      body: rows,
      styles: { fontSize: 8 },
    });

    doc.save('equipamentos.pdf');
    toast.success('PDF gerado!');
  }

  function exportEquipamentosExcel() {
    const data = equipamentos
      .sort((a, b) => a.tipo.localeCompare(b.tipo))
      .map((e) => ({
        Tipo: e.tipo,
        Marca: e.marca,
        Modelo: e.modelo,
        'Nº Série': e.numeroSerie || '',
        Patrimônio: e.patrimonio || '',
        Colaborador: e.colaboradorNome || 'Sem vínculo',
        'Data Retirada': e.dataRetirada || '',
        'Data Devolução': e.dataDevolucao || '',
        Estado: e.estado,
      }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipamentos');
    XLSX.writeFile(wb, 'equipamentos.xlsx');
    toast.success('Excel gerado!');
  }

  // --- Exportar Benefícios ---
  function exportBeneficiosPDF() {
    const diasUteis = getDiasUteisNoMes(anoBeneficio, mesBeneficio);
    const ativos = beneficios.filter((b) => b.ativo);

    const grouped = {};
    for (const ben of ativos) {
      if (!grouped[ben.colaboradorNome]) {
        grouped[ben.colaboradorNome] = { vt: 0, vr: 0, outros: 0 };
      }
      const valor = (ben.valorDiario || 0) * diasUteis;
      if (ben.tipo === 'VT') grouped[ben.colaboradorNome].vt += valor;
      else if (ben.tipo === 'VR' || ben.tipo === 'VA') grouped[ben.colaboradorNome].vr += valor;
      else grouped[ben.colaboradorNome].outros += valor;
    }

    const rows = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([nome, v]) => [
        nome,
        `R$ ${v.vt.toFixed(2)}`,
        `R$ ${v.vr.toFixed(2)}`,
        `R$ ${v.outros.toFixed(2)}`,
        `R$ ${(v.vt + v.vr + v.outros).toFixed(2)}`,
      ]);

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Relatório de Benefícios — ${String(mesBeneficio).padStart(2, '0')}/${anoBeneficio}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Dias úteis: ${diasUteis} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Colaborador', 'VT', 'VR/VA', 'Outros', 'Total']],
      body: rows,
      styles: { fontSize: 8 },
    });

    doc.save(`beneficios-${String(mesBeneficio).padStart(2, '0')}-${anoBeneficio}.pdf`);
    toast.success('PDF gerado!');
  }

  function exportBeneficiosExcel() {
    const diasUteis = getDiasUteisNoMes(anoBeneficio, mesBeneficio);
    const ativos = beneficios.filter((b) => b.ativo);

    const grouped = {};
    for (const ben of ativos) {
      if (!grouped[ben.colaboradorNome]) {
        grouped[ben.colaboradorNome] = { vt: 0, vr: 0, outros: 0 };
      }
      const valor = (ben.valorDiario || 0) * diasUteis;
      if (ben.tipo === 'VT') grouped[ben.colaboradorNome].vt += valor;
      else if (ben.tipo === 'VR' || ben.tipo === 'VA') grouped[ben.colaboradorNome].vr += valor;
      else grouped[ben.colaboradorNome].outros += valor;
    }

    const data = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([nome, v]) => ({
        Colaborador: nome,
        VT: v.vt.toFixed(2),
        'VR/VA': v.vr.toFixed(2),
        Outros: v.outros.toFixed(2),
        Total: (v.vt + v.vr + v.outros).toFixed(2),
      }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Benefícios');
    XLSX.writeFile(wb, `beneficios-${String(mesBeneficio).padStart(2, '0')}-${anoBeneficio}.xlsx`);
    toast.success('Excel gerado!');
  }

  // --- Exportar Férias ---
  function exportFeriasPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Férias', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    const rows = ferias
      .sort((a, b) => a.colaboradorNome.localeCompare(b.colaboradorNome))
      .map((f) => [
        f.colaboradorNome,
        f.dataInicio ? new Date(f.dataInicio).toLocaleDateString('pt-BR') : '-',
        f.dataFim ? new Date(f.dataFim).toLocaleDateString('pt-BR') : '-',
        f.diasGozados || '-',
        f.diasVendidos || '0',
        f.status,
      ]);

    autoTable(doc, {
      startY: 35,
      head: [['Colaborador', 'Início', 'Fim', 'Dias', 'Vendidos', 'Status']],
      body: rows,
      styles: { fontSize: 8 },
    });

    doc.save('ferias.pdf');
    toast.success('PDF gerado!');
  }

  function exportFeriasExcel() {
    const data = ferias
      .sort((a, b) => a.colaboradorNome.localeCompare(b.colaboradorNome))
      .map((f) => ({
        Colaborador: f.colaboradorNome,
        'Data Início': f.dataInicio || '',
        'Data Fim': f.dataFim || '',
        'Dias Gozados': f.diasGozados || '',
        'Dias Vendidos': f.diasVendidos || '0',
        Status: f.status,
        Observações: f.observacoes || '',
      }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Férias');
    XLSX.writeFile(wb, 'ferias.xlsx');
    toast.success('Excel gerado!');
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Relatórios</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colaboradores */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Users size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Colaboradores</h3>
              <p className="text-sm text-gray-500">{colaboradores.length} registros</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportColaboradoresPDF}
              className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm"
            >
              <Download size={16} />
              PDF
            </button>
            <button
              onClick={exportColaboradoresExcel}
              className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm"
            >
              <Download size={16} />
              Excel
            </button>
          </div>
        </div>

        {/* Equipamentos */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Laptop size={24} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Equipamentos</h3>
              <p className="text-sm text-gray-500">{equipamentos.length} registros</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportEquipamentosPDF}
              className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm"
            >
              <Download size={16} />
              PDF
            </button>
            <button
              onClick={exportEquipamentosExcel}
              className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm"
            >
              <Download size={16} />
              Excel
            </button>
          </div>
        </div>

        {/* Benefícios */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-100 p-2 rounded-lg">
              <CreditCard size={24} className="text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Benefícios Mensal</h3>
              <p className="text-sm text-gray-500">{beneficios.filter((b) => b.ativo).length} ativos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <select
              value={mesBeneficio}
              onChange={(e) => setMesBeneficio(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <input
              type="number"
              value={anoBeneficio}
              onChange={(e) => setAnoBeneficio(Number(e.target.value))}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportBeneficiosPDF}
              className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm"
            >
              <Download size={16} />
              PDF
            </button>
            <button
              onClick={exportBeneficiosExcel}
              className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm"
            >
              <Download size={16} />
              Excel
            </button>
          </div>
        </div>

        {/* Férias */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-teal-100 p-2 rounded-lg">
              <Calendar size={24} className="text-teal-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Férias</h3>
              <p className="text-sm text-gray-500">{ferias.length} registros</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportFeriasPDF}
              className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm"
            >
              <Download size={16} />
              PDF
            </button>
            <button
              onClick={exportFeriasExcel}
              className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm"
            >
              <Download size={16} />
              Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
