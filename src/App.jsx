import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./services/supabaseClient";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Estoque from "./pages/Estoque";
import Vendas from "./pages/Vendas";
import Relatorios from "./pages/Relatorios";
import AppLayout from "./layouts/AppLayout";

function Protected({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
      setBooting(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => subscription?.unsubscribe();
  }, []);

  if (booting) {
    return <div className="min-h-screen grid place-items-center text-gray-600">Carregando…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* pública */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

        {/* protegidas com layout de sidebar */}
        <Route
          element={
            <Protected user={user}>
              <AppLayout user={user} />
            </Protected>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/relatorios" element={<Relatorios />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
