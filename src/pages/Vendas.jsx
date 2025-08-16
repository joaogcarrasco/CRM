import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

// Nome bonito no frontend
const prettyName = (n) => {
  const v = (n || "").toLowerCase();
  if (v === "gas") return "Gás";
  if (v === "agua") return "Água";
  return v.charAt(0).toUpperCase() + v.slice(1);
};

export default function Vendas() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // selects
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  // form
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState(""); // começa vazio
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  // listagem recente
  const [recent, setRecent] = useState([]);

  async function carregar() {
    setLoading(true);
    setErr("");
    setOk("");

    const [{ data: cData, error: cErr }, { data: pData, error: pErr }] = await Promise.all([
      supabase.from("customers").select("id, name").order("name"),
      supabase.from("products").select("id, name").order("name"),
    ]);

    if (cErr || pErr) setErr(cErr?.message || pErr?.message || "Falha ao carregar dados.");

    setCustomers(cData || []);
    setProducts(pData || []);

    await carregarRecentes();
    setLoading(false);
  }

  async function carregarRecentes() {
    const { data, error } = await supabase
      .from("sales")
      .select("id, created_at, total_amount, payment_method, sale_items(quantity, unit_price, products(name))")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) setErr(error.message);
    setRecent(data || []);
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  async function registrarVenda(e) {
    e.preventDefault();
    setErr("");
    setOk("");

    const q = parseInt(quantity, 10);
    const up = Number(unitPrice);

    if (!productId) return setErr("Selecione um produto.");
    if (!q || q <= 0) return setErr("Informe uma quantidade válida (> 0).");
    if (Number.isNaN(up) || up < 0) return setErr("Informe um preço unitário válido (>= 0).");

    // 1) Checagem de estoque (UX ágil)
    const { data: stockRow, error: stockErr } = await supabase
      .from("v_stock_summary")
      .select("quantity")
      .eq("product_id", productId)
      .single();

    if (stockErr) {
      setErr(stockErr.message);
      return;
    }
    const available = Number(stockRow?.quantity || 0);
    if (available < q) {
      setErr(`Estoque insuficiente. Disponível: ${available}, solicitado: ${q}.`);
      return;
    }

    // 2) Tenta via RPC (servidor também valida)
    const productName = products.find((p) => p.id === productId)?.name || "gas";
    const { error: rpcErr } = await supabase.rpc("rpc_register_sale", {
      p_customer_id: customerId || null,
      p_product_name: productName,
      p_quantity: q,
      p_unit_price: up,
      p_payment_method: paymentMethod || null,
    });

    if (rpcErr) {
      setErr(rpcErr.message);
      return;
    }

    setOk("Venda registrada com sucesso.");
    limpar();
    await carregarRecentes();
  }

  function limpar() {
    setProductId("");
    setQuantity("");
    setUnitPrice("");
    setPaymentMethod("");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Registrar venda</h1>
      {err && <div className="text-red-600 mb-3">{err}</div>}
      {ok && <div className="text-green-600 mb-3">{ok}</div>}

      {loading ? (
        <div>Carregando…</div>
      ) : (
        <>
          <form onSubmit={registrarVenda} className="bg-white border rounded p-4 grid gap-3 md:grid-cols-2 mb-6">
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">Cliente (opcional)</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Sem cliente</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">Produto</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
              >
                <option value="">Selecione o produto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{prettyName(p.name)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">Quantidade</label>
              <input
                type="number"
                min="1"
                className="border rounded px-3 py-2 w-full"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Preço unitário</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="border rounded px-3 py-2 w-full"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Pagamento (opcional)</label>
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="Dinheiro / Pix / Cartão"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <button className="bg-blue-600 text-white rounded px-3 py-2">Registrar venda</button>
            </div>
          </form>

          {/* Vendas recentes */}
          <section>
            <h2 className="text-lg font-medium mb-2">Últimas vendas</h2>
            {recent.length === 0 ? (
              <div className="text-gray-600">Nenhuma venda ainda.</div>
            ) : (
              <ul className="space-y-2">
                {recent.map((s) => (
                  <li key={s.id} className="bg-white border rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {new Date(s.created_at).toLocaleString()}
                        {s.payment_method ? ` • ${s.payment_method}` : ""}
                      </div>
                      <div className="font-semibold">R$ {Number(s.total_amount).toFixed(2)}</div>
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      {s.sale_items?.map((it, idx) => (
                        <span key={idx}>
                          {it.products?.name ? prettyName(it.products.name) : "Produto"} — {it.quantity} un. × R$ {Number(it.unit_price).toFixed(2)}
                          {idx < s.sale_items.length - 1 ? " • " : ""}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
