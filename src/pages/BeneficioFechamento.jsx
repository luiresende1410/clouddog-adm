import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Lock, Unlock, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function BeneficioFechamento() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [beneficios, setBeneficios] = useState([]);
  const [fechamento, setFechamento] = useState(null);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);

  const chave = `${ano}-${String(mes).padStart(2, '0')}`;
  const diasUteisMes = getDiasUteisNoMes(ano, mes);

  useEffect(() => {
    fetchData();
  }, [mes, ano]);

  async function fetchData() {
    setLoading(true);
    try {
      // Buscar benefícios ativos
      const benSnap = await getDocs(collection(db, 'beneficios'));
      const bens = benSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBeneficios(bens.filter((b) => b.ativo));

      // Buscar fechamento existente
      const fechDoc = await getDoc(doc(db, 'fechamentos', chave));
      if (fechDoc.exists()) {
        const data = fechDoc.data();
        setFechamento(data);
        setItens(data.itens || []);
      } else {
        setFechamento(null);
        setItens([]);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function gerarFechamento() {
    const diasUteis = getDiasUteisNoMes(ano, mes);
    const fimDoMes = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;
    const inicioDoMes = `${ano}-${String(mes).padStart(2, '0')}-01`;

    // Filtrar benefícios vigentes no mês
    const vigentes = beneficios.filter((b) => {
      if (b.dataFim && b.dataFim < inicioDoMes) return false;
      if (b.dataInicio && b.dataInicio > fimDoMes) return false;
      return true;
    });

    // Agrupar por colaborador
    const grouped = {};
    for (const ben of vigentes) {
      if (!grouped[ben.colaboradorId]) {
        grouped[ben.colaboradorId] = {
          colaboradorId: ben.colaboradorId,
          colaboradorNome: ben.colaboradorNome,
          vt: 0,
          vr: 0,
          vtDiario: 0,
          vrDiario: 0,
          diasUteis,
          diasDescontar: 0,
          motivo: '',
        };
      }
      if (ben.tipo === 'VT') {
        grouped[ben.colaboradorId].vtDiario = ben.valorDiario || 0;
        grouped[ben.colaboradorId].vt = (ben.valorDiario || 0) * diasUteis;
      } else if (ben.tipo === 'VR' || ben.tipo === 'VA') {
        grouped[ben.colaboradorId].vrDiario = ben.valorDiario || 0;
        grouped[ben.colaboradorId].vr = (ben.valorDiario || 0) * diasUteis;
      }
    }

    const lista = Object.values(grouped).sort((a, b) => a.colaboradorNome.localeCompare(b.colaboradorNome));
    setItens(lista);
    toast.success('Fechamento gerado! Ajuste os dias se necessário.');
  }

  function handleDiasDescontar(index, value) {
    const updated = [...itens];
    const dias = parseInt(value) || 0;
    updated[index].diasDescontar = dias;
    const diasEfetivos = updated[index].diasUteis - dias;
    updated[index].vt = updated[index].vtDiario * diasEfetivos;
    updated[index].vr = updated[index].vrDiario * diasEfetivos;
    setItens(updated);
  }

  function handleMotivo(index, value) {
    const updated = [...itens];
    updated[index].motivo = value;
    setItens(updated);
  }

  async function salvarFechamento(confirmado = false) {
    try {
      const data = {
        mes,
        ano,
        chave,
        diasUteisMes,
        confirmado,
        itens,
        totalVT: itens.reduce((s, i) => s + i.vt, 0),
        totalVR: itens.reduce((s, i) => s + i.vr, 0),
        totalGeral: itens.reduce((s, i) => s + i.vt + i.vr, 0),
        updatedAt: new Date().toISOString(),
        confirmedAt: confirmado ? new Date().toISOString() : null,
      };

      await setDoc(doc(db, 'fechamentos', chave), data);
      setFechamento(data);

      if (confirmado) {
        toast.success('Fechamento confirmado e travado!');
      } else {
        toast.success('Rascunho salvo!');
      }
    } catch (error) {
      toast.error('Erro ao salvar');
      console.error(error);
    }
  }

  function exportarPDF() {
    const pdfDoc = new jsPDF();
    pdfDoc.setFontSize(16);
    pdfDoc.text(`Fechamento de Benefícios — ${MESES[mes - 1]}/${ano}`, 14, 20);
    pdfDoc.setFontSize(10);
    pdfDoc.text(`Dias úteis: ${diasUteisMes} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    const rows = itens.map((i) => [
      i.colaboradorNome,
      i.diasUteis - i.diasDescontar,
      i.diasDescontar > 0 ? `-${i.diasDescontar} (${i.motivo || ''})` : '-',
      `R$ ${i.vt.toFixed(2)}`,
      `R$ ${i.vr.toFixed(2)}`,
      `R$ ${(i.vt + i.vr).toFixed(2)}`,
    ]);

    const totalVT = itens.reduce((s, i) => s + i.vt, 0);
    const totalVR = itens.reduce((s, i) => s + i.vr, 0);
    rows.push(['TOTAL', '', '', `R$ ${totalVT.toFixed(2)}`, `R$ ${totalVR.toFixed(2)}`, `R$ ${(totalVT + totalVR).toFixed(2)}`]);

    autoTable(pdfDoc, {
      startY: 35,
      head: [['Colaborador', 'Dias', 'Descontos', 'VT', 'VR', 'Total']],
      body: rows,
      styles: { fontSize: 8 },
    });

    pdfDoc.save(`fechamento-${chave}.pdf`);
    toast.success('PDF gerado!');
  }

  function navMes(dir) {
    let m = mes + dir;
    let a = ano;
    if (m > 12) { m = 1; a++; }
    if (m < 1) { m = 12; a--; }
    setMes(m);
    setAno(a);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  const isConfirmado = fechamento?.confirmado === true;
  const totalVT = itens.reduce((s, i) => s + i.vt, 0);
  const totalVR = itens.reduce((s, i) => s + i.vr, 0);

  return (
    <div>
      {/* Navegação de mês */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navMes(-1)} className="p-2 hover:bg-gray-200 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-bold text-gray-800">
            {MESES[mes - 1]} {ano}
          </span>
          <button onClick={() => navMes(1)} className="p-2 hover:bg-gray-200 rounded-lg">
            <ChevronRight size={20} />
          </button>
          <span className="text-sm text-gray-500 ml-2">({diasUteisMes} dias úteis)</span>
          {isConfirmado && (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              <Lock size={12} />
              Confirmado
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {itens.length > 0 && (
            <button
              onClick={exportarPDF}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
            >
              <Download size={16} />
              PDF
            </button>
          )}
          {!isConfirmado && itens.length === 0 && (
            <button
              onClick={gerarFechamento}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              Gerar Fechamento
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {itens.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Unlock size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Nenhum fechamento para este mês</p>
          <p className="text-gray-400 mt-2">
            Clique em "Gerar Fechamento" para criar o consolidado baseado nos benefícios ativos.
          </p>
        </div>
      ) : (
        <>
          {/* Tabela */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Colaborador</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Dias Úteis</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Descontar</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Motivo</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">VT</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">VR</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itens.map((item, idx) => (
                  <tr key={item.colaboradorId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.colaboradorNome}</td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {item.diasUteis - item.diasDescontar}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max={item.diasUteis}
                        value={item.diasDescontar}
                        onChange={(e) => handleDiasDescontar(idx, e.target.value)}
                        disabled={isConfirmado}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.motivo}
                        onChange={(e) => handleMotivo(idx, e.target.value)}
                        disabled={isConfirmado}
                        placeholder="Férias, falta..."
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">R$ {item.vt.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">R$ {item.vr.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">R$ {(item.vt + item.vr).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="font-bold">
                  <td className="px-4 py-3 text-gray-800">TOTAL</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right text-gray-800">R$ {totalVT.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-800">R$ {totalVR.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-800">R$ {(totalVT + totalVR).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Ações */}
          {!isConfirmado && (
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => salvarFechamento(false)}
                className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                <Unlock size={18} />
                Salvar Rascunho
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Confirmar fechamento? Após confirmado, os valores não poderão ser alterados.')) {
                    salvarFechamento(true);
                  }
                }}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Lock size={18} />
                Confirmar Fechamento
              </button>
            </div>
          )}

          {isConfirmado && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              <strong>Fechamento confirmado</strong> em {new Date(fechamento.confirmedAt).toLocaleDateString('pt-BR')}.
              Os valores estão travados para auditoria.
            </div>
          )}
        </>
      )}
    </div>
  );
}
