import { Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Estoque from "./pages/Estoque";
import Vendas from "./pages/Vendas";
import Relatorios from "./pages/Relatorios";
import WhatsApp from "./pages/WhatsApp";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/vendas" element={<Vendas />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/whatsapp" element={<WhatsApp />} />
      </Route>
    </Routes>
  );
}
