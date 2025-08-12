import { NavLink, Outlet } from "react-router-dom";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/clientes", label: "Clientes" },
  { to: "/estoque", label: "Estoque" },
  { to: "/vendas", label: "Vendas" },
  { to: "/relatorios", label: "Relatórios" },
  { to: "/whatsapp", label: "WhatsApp" },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-white">
        <div className="p-4 font-semibold">CRM</div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded hover:bg-gray-100 ${
                  isActive ? "bg-blue-50 text-blue-700 font-medium" : ""
                }`
              }
              end={item.to === "/"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b flex items-center justify-between px-4">
          <div className="font-medium">Olá, João</div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 rounded bg-blue-600 text-white">
              Registrar venda
            </button>
            <button title="Configurações">⚙️</button>
            <button title="Sair">⎋</button>
          </div>
        </header>
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
