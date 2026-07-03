import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';

const AuthContext = createContext();
const googleProvider = new GoogleAuthProvider();

// Restringe ao domínio da empresa
googleProvider.setCustomParameters({
  hd: 'clouddog.com.br',
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Verificar domínio
    if (!user.email.endsWith('@clouddog.com.br')) {
      await signOut(auth);
      throw new Error('Apenas e-mails @clouddog.com.br são permitidos.');
    }

    return result;
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Verificar domínio
        if (!user.email.endsWith('@clouddog.com.br')) {
          await signOut(auth);
          setCurrentUser(null);
          setUserRole(null);
          setLoading(false);
          return;
        }

        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          } else {
            // Primeiro login — auto-registrar como colaborador
            await setDoc(doc(db, 'users', user.uid), {
              email: user.email,
              nome: user.displayName || '',
              fotoUrl: user.photoURL || '',
              role: 'colaborador',
              createdAt: new Date().toISOString(),
            });
            setUserRole('colaborador');
          }

          // Atualizar foto do Google no cadastro do colaborador
          if (user.photoURL) {
            try {
              const colabQuery = await getDocs(
                query(collection(db, 'colaboradores'), where('email', '==', user.email))
              );
              if (!colabQuery.empty) {
                const colabDoc = colabQuery.docs[0];
                if (!colabDoc.data().fotoUrl || colabDoc.data().fotoUrl !== user.photoURL) {
                  await updateDoc(doc(db, 'colaboradores', colabDoc.id), {
                    fotoUrl: user.photoURL,
                  });
                }
              }
            } catch (e) {
              // Silencioso - não bloquear login se falhar
            }
          }
        } catch (error) {
          console.error('Erro ao buscar role do usuário:', error);
          setUserRole('colaborador');
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    isAdmin: userRole === 'admin',
    login,
    loginWithGoogle,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
