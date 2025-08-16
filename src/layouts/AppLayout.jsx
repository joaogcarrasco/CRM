import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { logout } from "../services/authService";

export default function AppLayout({ user }) {
  return (
    <div>
      <Sidebar />
      {/* Topo minimal com e-mail e sair */}
      <header className="fixed left-60 right-0 top-0 h-14 bg-white border-b flex items-center justify-end px-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600 hidden sm:inline">{user?.email}</span>
          <button
            onClick={async()=>{ await logout(); window.location.href="/login"; }}
            className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo deslocado pela sidebar/topbar */}
      <main className="pt-16 pl-60 pr-4 pb-6">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
