import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserCircle, Briefcase, Calendar, Building } from 'lucide-react';

export default function MeuPerfil() {
  const { currentUser } = useAuth();
  const [dados, setDados] = useState(null);
  const [ferias, setFerias] = useState([]);
  const [beneficios, setBeneficios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMeusDados() {
      try {
        const q = query(
          collection(db, 'colaboradores'),
          where('email', '==', currentUser.email)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const colabData = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setDados(colabData);

          // Buscar férias
          const ferSnap = await getDocs(collection(db, 'ferias'));
          const allFerias = ferSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setFerias(allFerias.filter((f) => f.colaboradorId === colabData.id));

          // Buscar benefícios ativos
          const benSnap = await getDocs(collection(db, 'beneficios'));
          const allBen = benSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setBeneficios(allBen.filter((b) => b.colaboradorId === colabData.id && !b.dataFim));
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    }

    if (currentUser?.email) {
      fetchMeusDados();
    }
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="text-center py-12">
        <UserCircle size={64} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">
          Seu cadastro ainda não foi encontrado. Entre em contato com o
          administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Perfil</h2>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <UserCircle size={40} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">{dados.nome}</h3>
            <p className="text-gray-500">{dados.cargo}</p>
          </div>
        </div>

        {/* Cards de Férias e Benefícios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-100">
          {/* Férias */}
          {(() => {
            const hoje = new Date().toISOString().split('T')[0];
            const feriasAtiva = ferias.find((f) => f.status === 'Em andamento' || (f.dataInicio <= hoje && f.dataFim >= hoje));
            const feriasAgendada = ferias.find((f) => f.status === 'Agendada' && f.dataInicio > hoje);

            if (feriasAtiva) {
              return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-xs font-medium text-yellow-600 uppercase">Férias em andamento</p>
                  <p className="text-sm font-bold text-yellow-800 mt-1">
                    {new Date(feriasAtiva.dataInicio).toLocaleDateString('pt-BR')} → {new Date(feriasAtiva.dataFim).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">{feriasAtiva.diasGozados} dias</p>
                </div>
              );
            }
            if (feriasAgendada) {
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-medium text-blue-600 uppercase">Férias agendada</p>
                  <p className="text-sm font-bold text-blue-800 mt-1">
                    {new Date(feriasAgendada.dataInicio).toLocaleDateString('pt-BR')} → {new Date(feriasAgendada.dataFim).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">{feriasAgendada.diasGozados} dias</p>
                </div>
              );
            }
            return (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 uppercase">Férias</p>
                <p className="text-xs text-gray-400 mt-1">Sem férias agendadas</p>
              </div>
            );
          })()}

          {/* VT */}
          {(() => {
            const vt = beneficios.find((b) => b.tipo === 'VT');
            if (vt) {
              return (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase">Vale Transporte</p>
                  <div className="flex items-baseline gap-3 mt-1">
                    <div>
                      <span className="text-lg font-bold text-gray-800">R$ {Number(vt.valorDiario).toFixed(2)}</span>
                      <span className="text-xs text-gray-500 ml-1">/dia</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      R$ {Number(vt.valorMensal || vt.valorDiario * 22).toFixed(2)}<span className="text-xs">/mês</span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* VR */}
          {(() => {
            const vr = beneficios.find((b) => b.tipo === 'VR' || b.tipo === 'VA');
            if (vr) {
              return (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase">Vale Refeição</p>
                  <div className="flex items-baseline gap-3 mt-1">
                    <div>
                      <span className="text-lg font-bold text-gray-800">R$ {Number(vr.valorDiario).toFixed(2)}</span>
                      <span className="text-xs text-gray-500 ml-1">/dia</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      R$ {Number(vr.valorMensal || vr.valorDiario * 22).toFixed(2)}<span className="text-xs">/mês</span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoItem icon={Briefcase} label="Cargo" value={dados.cargo} />
          <InfoItem icon={Building} label="Setor" value={dados.setor} />
          <InfoItem label="Gestor" value={dados.gestor} />
          <InfoItem label="Tipo Contrato" value={dados.tipoContrato} />
          <InfoItem
            icon={Calendar}
            label="Data Admissão"
            value={
              dados.dataAdmissao
                ? new Date(dados.dataAdmissao).toLocaleDateString('pt-BR')
                : '-'
            }
          />
          <InfoItem
            label="Data Efetivação"
            value={
              dados.dataEfetivacao
                ? new Date(dados.dataEfetivacao).toLocaleDateString('pt-BR')
                : '-'
            }
          />
          <InfoItem label="Status" value={dados.status} />
          <InfoItem label="Telefone" value={dados.telefone || '-'} />
        </div>
      </div>

      {/* Links e informações */}
      {(dados.linkedin || dados.github || dados.credly || dados.googleDriveLink || dados.curriculoUrl || dados.jobConvoResultado) && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Links e Informações</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dados.linkedin && (
              <a href={dados.linkedin} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">in</span>
                </div>
                <span className="text-sm font-medium text-gray-800">LinkedIn</span>
              </a>
            )}
            {dados.github && (
              <a href={dados.github} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">GH</span>
                </div>
                <span className="text-sm font-medium text-gray-800">GitHub</span>
              </a>
            )}
            {dados.credly && (
              <a href={dados.credly} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">C</span>
                </div>
                <span className="text-sm font-medium text-gray-800">Certificações (Credly)</span>
              </a>
            )}
            {dados.googleDriveLink && (
              <a href={dados.googleDriveLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">D</span>
                </div>
                <span className="text-sm font-medium text-gray-800">Google Drive</span>
              </a>
            )}
            {dados.curriculoUrl && (
              <a href={dados.curriculoUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">CV</span>
                </div>
                <span className="text-sm font-medium text-gray-800">Currículo (PDF)</span>
              </a>
            )}
          </div>

          {dados.jobConvoResultado && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Resultado Job Convo</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                {dados.jobConvoResultado}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon size={18} className="text-gray-400 mt-0.5" />}
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-gray-800 font-medium">{value || '-'}</p>
      </div>
    </div>
  );
}
