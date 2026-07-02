import { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Shield, UserCircle, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GerenciarUsuarios() {
  const [users, setUsers] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formUid, setFormUid] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('colaborador');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [usersSnap, colabSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'colaboradores')),
      ]);
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setColaboradores(colabSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e) {
    e.preventDefault();
    if (!formUid.trim() || !formEmail.trim()) {
      toast.error('UID e e-mail são obrigatórios');
      return;
    }

    try {
      await setDoc(doc(db, 'users', formUid.trim()), {
        email: formEmail.trim(),
        role: formRole,
      });
      toast.success('Usuário vinculado!');
      setShowForm(false);
      setFormUid('');
      setFormEmail('');
      setFormRole('colaborador');
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar');
      console.error(error);
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm('Remover vínculo deste usuário?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('Usuário removido');
      fetchData();
    } catch (error) {
      toast.error('Erro ao remover');
      console.error(error);
    }
  }

  async function handleToggleRole(user) {
    const newRole = user.role === 'admin' ? 'colaborador' : 'admin';
    if (!window.confirm(`Alterar role de ${user.email} para "${newRole}"?`)) return;
    try {
      await setDoc(doc(db, 'users', user.id), {
        email: user.email,
        role: newRole,
      });
      toast.success(`Role alterada para ${newRole}`);
      fetchData();
    } catch (error) {
      toast.error('Erro ao alterar role');
      console.error(error);
    }
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
        <h2 className="text-2xl font-bold text-gray-800">Gerenciar Usuários</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Users size={20} />
          Vincular Usuário
        </button>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-medium text-blue-800 mb-2">Como criar acesso para um colaborador:</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>No Firebase Console → Authentication → Adicionar usuário (com e-mail do colaborador)</li>
          <li>Copie o UID gerado</li>
          <li>Clique em "Vincular Usuário" acima e preencha o UID, e-mail e role</li>
          <li>O colaborador poderá fazer login e ver seu perfil</li>
        </ol>
      </div>

      {/* Lista de usuários */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">E-mail</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">UID</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Role</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  Nenhum usuário vinculado
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-800">{user.email}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm font-mono">{user.id.substring(0, 12)}...</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleRole(user)}
                      className="text-purple-600 hover:text-purple-800 mr-3"
                      title="Alternar role"
                    >
                      <Shield size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Remover"
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Vincular Usuário</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label htmlFor="uid" className="block text-sm font-medium text-gray-700 mb-1">
                  UID (do Firebase Authentication) *
                </label>
                <input
                  id="uid"
                  value={formUid}
                  onChange={(e) => setFormUid(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Cole o UID do Firebase Auth"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="email@empresa.com"
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="colaborador">Colaborador</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
