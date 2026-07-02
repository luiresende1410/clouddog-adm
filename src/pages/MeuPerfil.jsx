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
