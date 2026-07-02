import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, ShieldOff, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GerenciarUsuarios() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredUsers(users);
    } else {
      const term = search.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.email.toLowerCase().includes(term) ||
            (u.nome || '').toLowerCase().includes(term)
        )
      );
    }
  }, [search, users]);

  async function fetchUsers() {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      setUsers(list);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleRole(user) {
    const newRole = user.role === 'admin' ? 'colaborador' : 'admin';
    const action = newRole === 'admin' ? 'promover a Admin' : 'rebaixar a Colaborador';

    if (!window.confirm(`Deseja ${action} o usuário ${user.email}?`)) return;

    try {
      await updateDoc(doc(db, 'users', user.id), { role: newRole });
      toast.success(`${user.email} agora é ${newRole}!`);
      fetchUsers();
    } catch (error) {
      toast.error('Erro ao alterar permissão');
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
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-medium text-blue-800 mb-2">Como funciona:</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Qualquer pessoa com e-mail <strong>@clouddog.com.br</strong> pode fazer login com Google</li>
          <li>No primeiro login, o usuário é registrado automaticamente como <strong>Colaborador</strong></li>
          <li>Para promover a <strong>Admin</strong>, clique no ícone de escudo ao lado do nome</li>
          <li>Admins podem acessar todos os módulos. Colaboradores veem apenas o próprio perfil.</li>
        </ul>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-4">
        <span className="text-sm text-gray-500">
          {users.length} usuários registrados
        </span>
        <span className="text-sm text-purple-600 font-medium">
          {users.filter((u) => u.role === 'admin').length} admins
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Nome</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">E-mail</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Role</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Desde</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Nenhum usuário encontrado. Os usuários aparecem aqui após o primeiro login.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {user.nome || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleRole(user)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        user.role === 'admin'
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                      }`}
                      title={user.role === 'admin' ? 'Rebaixar a Colaborador' : 'Promover a Admin'}
                    >
                      {user.role === 'admin' ? (
                        <>
                          <ShieldOff size={16} />
                          Rebaixar
                        </>
                      ) : (
                        <>
                          <Shield size={16} />
                          Promover
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
