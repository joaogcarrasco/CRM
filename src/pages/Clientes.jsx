import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

/** -------- Helpers simples -------- */
function Confirm({ message = "Tem certeza?", onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4">
      <div className="bg-white rounded-lg border w-full max-w-sm p-4">
        <div className="text-sm text-gray-700 mb-4">{message}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded border">Cancelar</button>
          <button onClick={onConfirm} className="px-3 py-1.5 rounded bg-red-600 text-white">Excluir</button>
        </div>
      </div>
    </div>
  );
}

function ClienteForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ id: initial?.id, name, phone, address });
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-2">
      <input className="border rounded px-3 py-2" placeholder="Nome *" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="border rounded px-3 py-2" placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input className="border rounded px-3 py-2" placeholder="Endereço" value={address} onChange={(e) => setAddress(e.target.value)} />
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-3 py-2 rounded border">Cancelar</button>
        )}
        <button disabled={saving} className="px-3 py-2 rounded bg-blue-600 text-white">
          {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar cliente"}
        </button>
      </div>
    </form>
  );
}

/** -------- Página -------- */
export default function Clientes() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // objeto do cliente em edição
  const [confirmDelete, setConfirmDelete] = useState(null); // id do cliente

  const carregar = async () => {
    setLoading(true);
    setErrorMsg("");
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .ilike("name", `%${query}%`)
      .order("created_at", { ascending: false });

    if (error) setErrorMsg(error.message);
    setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const criarOuEditar = async ({ id, name, phone, address }) => {
    setErrorMsg("");
    if (id) {
      const { error } = await supabase.from("customers").update({ name, phone, address }).eq("id", id);
      if (error) setErrorMsg(error.message);
      setEditing(null);
    } else {
      const { error } = await supabase.from("customers").insert([{ name, phone, address }]);
      if (error) setErrorMsg(error.message);
    }
    await carregar();
  };

  const excluir = async (id) => {
    setErrorMsg("");
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) setErrorMsg(error.message);
    setConfirmDelete(null);
    await carregar();
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold mb-4">Clientes</h1>

      {/* Busca + novo */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Buscar por nome…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={() => setEditing({})}
          className="px-3 py-2 rounded bg-blue-600 text-white"
        >
          + Novo cliente
        </button>
      </div>

      {errorMsg && <div className="text-red-600 mb-3">{errorMsg}</div>}

      {/* Lista */}
      {loading ? (
        <div>Carregando…</div>
      ) : customers.length === 0 ? (
        <div className="text-gray-600">Nenhum cliente encontrado.</div>
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => (
            <li key={c.id} className="bg-white border rounded p-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-gray-600">{c.phone || "—"}</div>
                <div className="text-sm text-gray-600">{c.address || "—"}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(c)} className="px-3 py-1.5 rounded border">Editar</button>
                <button onClick={() => setConfirmDelete(c.id)} className="px-3 py-1.5 rounded bg-red-600 text-white">Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal de edição/criação */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center p-4">
          <div className="bg-white rounded-lg border w-full max-w-md p-4">
            <div className="text-lg font-semibold mb-3">
              {editing?.id ? "Editar cliente" : "Novo cliente"}
            </div>
            <ClienteForm
              initial={editing?.id ? editing : null}
              onSave={criarOuEditar}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}

      {/* Confirmação de exclusão */}
      {confirmDelete && (
        <Confirm
          message="Tem certeza que deseja excluir este cliente?"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => excluir(confirmDelete)}
        />
      )}
    </div>
  );
}
