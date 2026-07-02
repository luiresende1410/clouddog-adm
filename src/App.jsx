import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Colaboradores from './pages/Colaboradores';
import ColaboradorDetalhe from './pages/ColaboradorDetalhe';
import MeuPerfil from './pages/MeuPerfil';
import Ferias from './pages/Ferias';
import Equipamentos from './pages/Equipamentos';
import Beneficios from './pages/Beneficios';
import BeneficioVT from './pages/BeneficioVT';
import BeneficioVR from './pages/BeneficioVR';
import BeneficioFechamento from './pages/BeneficioFechamento';
import Relatorios from './pages/Relatorios';
import GerenciarUsuarios from './pages/GerenciarUsuarios';

export default function App() {
  return (
    <BrowserRouter basename="/clouddog-adm">
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Rotas protegidas com layout */}
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            {/* Admin routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute adminOnly>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/colaboradores"
              element={
                <PrivateRoute adminOnly>
                  <Colaboradores />
                </PrivateRoute>
              }
            />
            <Route
              path="/colaboradores/:id"
              element={
                <PrivateRoute adminOnly>
                  <ColaboradorDetalhe />
                </PrivateRoute>
              }
            />
            <Route
              path="/ferias"
              element={
                <PrivateRoute adminOnly>
                  <Ferias />
                </PrivateRoute>
              }
            />
            <Route
              path="/equipamentos"
              element={
                <PrivateRoute adminOnly>
                  <Equipamentos />
                </PrivateRoute>
              }
            />
            <Route
              path="/beneficios"
              element={
                <PrivateRoute adminOnly>
                  <Beneficios />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/beneficios/vt" replace />} />
              <Route path="vt" element={<BeneficioVT />} />
              <Route path="vr" element={<BeneficioVR />} />
              <Route path="fechamento" element={<BeneficioFechamento />} />
            </Route>
            <Route
              path="/relatorios"
              element={
                <PrivateRoute adminOnly>
                  <Relatorios />
                </PrivateRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <PrivateRoute adminOnly>
                  <GerenciarUsuarios />
                </PrivateRoute>
              }
            />

            {/* Colaborador route */}
            <Route path="/meu-perfil" element={<MeuPerfil />} />
          </Route>

          {/* Redirect */}
          <Route path="*" element={<Navigate to="/meu-perfil" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
