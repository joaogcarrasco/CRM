import { NavLink } from "react-router-dom";

const base = "block px-3 py-2 rounded text-sm transition";
const active = "bg-blue-600 text-white";
const idle = "text-gray-700 hover:bg-gray-100";

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r">
      <div className="h-14 flex items-center px-4 border-b font-semibold">
        CRM Gás & Água
      </div>
      <nav className="p-3 space-y-1">
        <NavLink to="/" end className={({isActive})=>`${base} ${isActive?active:idle}`}>Dashboard</NavLink>
        <NavLink to="/clientes" className={({isActive})=>`${base} ${isActive?active:idle}`}>Clientes</NavLink>
        <NavLink to="/estoque" className={({isActive})=>`${base} ${isActive?active:idle}`}>Estoque</NavLink>
        <NavLink to="/vendas" className={({isActive})=>`${base} ${isActive?active:idle}`}>Vendas</NavLink>
        <NavLink to="/relatorios" className={({isActive})=>`${base} ${isActive?active:idle}`}>Relatórios</NavLink>
      </nav>
    </aside>
  );
}
