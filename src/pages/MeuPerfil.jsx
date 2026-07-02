import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserCircle, Briefcase, Calendar, Building } from 'lucide-react';

export default function MeuPerfil() {
  const { currentUser } = useAuth();
  const [dados, setDados] = useState(null);
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
          setDados({ id: snap.docs[0].id, ...snap.docs[0].data() });
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
