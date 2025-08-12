import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

/**
 * Estoque
 * - Lista saldo atual (view v_stock_summary)
 * - Formulário de entrada de estoque (stock_movements type='in')
 * - (Opcional) lista últimas movimentações
 */

export default function Estoque() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState([]); // [{product_id, name, quantity}]
  const [movs, setMovs] = useState([]); // últimas movimentações
  const [errorMsg, setErrorMsg] = useState("");

  // form de entrada
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState([]); // para popular o select
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const carregar = async () => {
    setLoading(true);
    setErrorMsg("");

    // busca saldo (view)
    const { data: sData, error: sErr } = await supabase
      .from("v_stock_summary")
      .select("*")
      .order("name", { ascending: true });

    // busca produtos (para o select)
    const { data: pData, error: pErr } = await supabase
      .from("products")
      .select("id, name")
      .order("name", { ascending: true });

    // últimas movimentações (opcional, só para dar visibilidade)
    const { data: mData, error: mErr } = await supabase
      .from("stock_movements")
      .select("id, type, quantity, unit_cost, created_at, product_id, products(name)")
      .order("created_at", { ascending: false })
      .limit(10);

    if (sErr || pErr || mErr) {
      setErrorMsg(sErr?.message || pErr?.message || mErr?.message);
    }
    setSummary(sData || []);
    setProducts(pData || []);
    setMovs(mData || []);
    setLoading(false);

    // selecionar produto padrão (gas) se existir
    if (!productId && (pData?.length || 0) > 0) {
      const gas = pData.find((p) => p.name === "gas");
      setProductId((gas || pData[0]).id);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registrarEntrada = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const q = parseInt(quantity, 10);
    const cost = unitCost === "" ? null : Number(unitCost);

    if (!productId) return setErrorMsg("Selecione um produto.");
    if (!q || q <= 0) return setErrorMsg("Informe uma quantidade válida (> 0).");

    const { error } = await supabase.from("stock_movements").insert([
      {
        product_id: productId,
        type: "in",
        quantity: q,
        unit_cost: cost,
      },
    ]);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // reset form
    setQuantity("");
    setUnitCost("");
    await carregar();
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold mb-4">Estoque</h1>

      {errorMsg && <div className="text-red-600 mb-3">{errorMsg}</div>}

      {/* Saldo atual */}
      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Saldo atual</h2>
        {loading ? (
          <div>Carregando…</div>
        ) : summary.length === 0 ? (
          <div className="text-gray-600">Sem dados de estoque.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.map((row) => (
              <div key={row.product_id} className="bg-white border rounded p-4">
                <div className="text-sm text-gray-500 capitalize">{row.name}</div>
                <div className="text-2xl font-semibold">{row.quantity || 0} un.</div>
                {/* barra de nível simples (verde/amar/verm) */}
                <div className="mt-2 h-2 bg-gray-100 rounded">
                  <div
                    className={`h-2 rounded ${
                      (row.quantity || 0) <= 5
                        ? "bg-red-500"
                        : (row.quantity || 0) <= 15
                        ? "bg-yellow-400"
                        : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min(100, ((row.quantity || 0) / 30) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Nível estimado (base 30 un.)
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Formulário de entrada */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-2">+ Entrada de estoque</h2>
        <form
          onSubmit={registrarEntrada}
          className="bg-white border rounded p-4 grid gap-3 md:grid-cols-4"
        >
          <select
            className="border rounded px-3 py-2 md:col-span-1"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">Selecione o produto</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            className="border rounded px-3 py-2 md:col-span-1"
            placeholder="Quantidade"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />

          <input
            type="number"
            step="0.01"
            min="0"
            className="border rounded px-3 py-2 md:col-span-1"
            placeholder="Custo unitário (opcional)"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
          />

          <button className="px-3 py-2 rounded bg-blue-600 text-white md:col-span-1">
            Registrar entrada
          </button>
        </form>
      </section>

      {/* Últimas movimentações (opcional) */}
      <section>
        <h2 className="text-lg font-medium mb-2">Últimas movimentações</h2>
        {movs.length === 0 ? (
          <div className="text-gray-600">Nenhuma movimentação ainda.</div>
        ) : (
          <ul className="space-y-2">
            {movs.map((m) => (
              <li key={m.id} className="bg-white border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 capitalize">
                    {m.products?.name} — {m.type === "in" ? "entrada" : "saída"}
                  </div>
                  <div className="text-sm text-gray-700">
                    Qtd: <b>{m.quantity}</b>{" "}
                    {m.unit_cost != null && (
                      <>
                        • Custo: <b>R$ {Number(m.unit_cost).toFixed(2)}</b>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
