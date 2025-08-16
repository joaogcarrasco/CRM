import { useState } from "react";
import { login } from "../services/authService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      // após logar com sucesso, vai para o dashboard
      window.location.href = "/";
    } catch (e) {
      // mensagens amigáveis
      const msg = e?.message?.toLowerCase?.() || "";
      if (msg.includes("invalid login")) setErr("E-mail ou senha inválidos.");
      else setErr(e.message || "Falha no login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-100">
      <form onSubmit={handleSubmit} className="w-96 bg-white p-6 rounded-lg border grid gap-3">
        <h1 className="text-xl font-semibold">Entrar</h1>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        <input
          type="email"
          className="border rounded px-3 py-2"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <input
          type="password"
          className="border rounded px-3 py-2"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
