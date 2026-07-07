import { useState, useRef } from 'react';
import { Upload, X, AlertTriangle, CheckCircle, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Componente reutilizável de importação CSV.
 *
 * Props:
 * - campos: array de { key, label, required? } descrevendo as colunas esperadas
 * - onImport: async (rows) => { inserted, updated } — função que recebe os dados parseados e grava no Firestore
 * - titulo: string exibido no modal (ex: "Importar Colaboradores")
 * - templateFileName: nome do arquivo template (ex: "colaboradores_template.csv")
 */
export default function ImportCSV({ campos, onImport, titulo, templateFileName }) {
  const [showModal, setShowModal] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  function downloadTemplate() {
    const header = campos.map((c) => c.key).join(';');
    const example = campos.map((c) => c.example || '').join(';');
    const content = `${header}\n${example}`;
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateFileName || 'template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseCSV(text) {
    // Suporta ; e , como delimitador
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length < 2) {
      setErrors(['Arquivo deve ter pelo menos cabeçalho + 1 linha de dados']);
      return;
    }

    // Detectar delimitador
    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));

    // Validar cabeçalho
    const camposKeys = campos.map((c) => c.key);
    const missingHeaders = camposKeys.filter((k) => {
      const campo = campos.find((c) => c.key === k);
      return campo.required && !headers.includes(k);
    });

    if (missingHeaders.length > 0) {
      setErrors([`Colunas obrigatórias não encontradas: ${missingHeaders.join(', ')}`, `Colunas encontradas: ${headers.join(', ')}`]);
      return;
    }

    const rows = [];
    const parseErrors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ''));
      const row = {};

      headers.forEach((header, idx) => {
        if (camposKeys.includes(header)) {
          row[header] = values[idx] || '';
        }
      });

      // Validar campos obrigatórios
      const missingRequired = campos
        .filter((c) => c.required && !row[c.key]?.trim())
        .map((c) => c.label);

      if (missingRequired.length > 0) {
        parseErrors.push(`Linha ${i + 1}: campos obrigatórios vazios (${missingRequired.join(', ')})`);
      } else {
        rows.push(row);
      }
    }

    setErrors(parseErrors);
    setParsedData(rows);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Selecione um arquivo .csv');
      return;
    }

    setResult(null);
    setErrors([]);
    setParsedData([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      parseCSV(evt.target.result);
    };
    reader.readAsText(file, 'UTF-8');

    // Limpar input para permitir reimportar mesmo arquivo
    e.target.value = '';
  }

  async function handleConfirmImport() {
    if (parsedData.length === 0) return;

    setImporting(true);
    try {
      const res = await onImport(parsedData);
      setResult(res);
      toast.success(`Importação concluída! ${res.inserted} novos, ${res.updated} atualizados`);
    } catch (error) {
      toast.error('Erro durante a importação');
      console.error(error);
      setErrors([`Erro: ${error.message}`]);
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setShowModal(false);
    setParsedData([]);
    setErrors([]);
    setResult(null);
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Upload size={20} />
        Importar CSV
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">{titulo || 'Importar CSV'}</h3>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {/* Instruções */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Instruções:</h4>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>O arquivo deve ser <strong>.csv</strong> com separador <strong>;</strong> (ponto e vírgula) ou <strong>,</strong> (vírgula)</li>
                <li>A primeira linha deve conter os nomes das colunas</li>
                <li>Campos obrigatórios: {campos.filter((c) => c.required).map((c) => <strong key={c.key}>{c.key}</strong>).reduce((prev, curr) => [prev, ', ', curr])}</li>
                <li>Para <strong>atualizar</strong> registros existentes, inclua uma coluna identificadora (ex: email, nome)</li>
                <li>Baixe o template para ver o formato esperado</li>
              </ul>
            </div>

            {/* Ações */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                <Download size={16} />
                Baixar Template
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                <FileText size={16} />
                Selecionar Arquivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Erros */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-red-600" />
                  <span className="text-sm font-medium text-red-800">Erros encontrados:</span>
                </div>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside max-h-32 overflow-y-auto">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview dos dados */}
            {parsedData.length > 0 && !result && (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>{parsedData.length}</strong> registros prontos para importação:
                  </p>
                  <div className="max-h-64 overflow-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">#</th>
                          {campos.slice(0, 5).map((c) => (
                            <th key={c.key} className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                              {c.label}
                            </th>
                          ))}
                          {campos.length > 5 && (
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">...</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedData.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                            {campos.slice(0, 5).map((c) => (
                              <td key={c.key} className="px-3 py-2 text-gray-700 truncate max-w-[150px]">
                                {row[c.key] || '-'}
                              </td>
                            ))}
                            {campos.length > 5 && (
                              <td className="px-3 py-2 text-gray-400">...</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.length > 10 && (
                      <p className="text-xs text-gray-400 text-center py-2">
                        ...e mais {parsedData.length - 10} registros
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? 'Importando...' : `Importar ${parsedData.length} registros`}
                  </button>
                </div>
              </>
            )}

            {/* Resultado */}
            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-800">Importação concluída!</span>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>✅ {result.inserted} registros inseridos</li>
                  <li>✏️ {result.updated} registros atualizados</li>
                  {result.skipped > 0 && <li>⏭️ {result.skipped} registros ignorados</li>}
                </ul>
                <button
                  onClick={handleClose}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
