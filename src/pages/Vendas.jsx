import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

/**
 * Vendas (MVP):
 * - Registrar 1 item por venda (produto = gas/agua)
 * - Cria sales, sale_items e stock_movements (out)
 * - Lista vendas recentes (com itens e cliente)
 */

export default function Vendas() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Form
  const [customerId, setCustomerId] = useState(""); // opcional
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    setLoading(true);
    setErr("");

    const [{ data: cData, error: cErr }, { data: pData, error: pErr }] =
      await Promise.all([
        supabase.from("customers").select("id, name").order("name", { ascending: true }),
        supabase.from("products").select("id, name, unit_price").order("name", { ascending: true }),
      ]);

    if (cErr || pErr) setErr(cErr?.message || pErr?.message);

    setCustomers(cData || []);
    setProducts(pData || []);

    // seleciona produto padrão
    if (!productId && (pData?.length || 0) > 0) {
      const gas = pData.find((p) => p.name === "gas");
      setProductId((gas || pData[0]).id);
      if (!unitPrice) setUnitPrice(String((gas || pData[0]).unit_price || 0));
    }

    // lista vendas recentes com itens e cliente
    const { data: sData, error: sErr } = await supabase
      .from("sales")
      .select("id, total_amount, payment_method, created_at, customers(name), sale_items(quantity, unit_price, products(name))")
      .order("created_at", { ascending: false })
      .limit(15);

    if (sErr) setErr((prev) => prev || sErr.message);
    setSales(sData || []);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // total calculado em tela para 1 item
  const totalCalc = (() => {
    const q = Number(quantity) || 0;
    const up = Number(unitPrice) || 0;
    return (q * up).toFixed(2);
  })();

  const registrarVenda = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");

    const q = Number(quantity);
    const up = Number(unitPrice);

    if (!productId) { setErr("Selecione um produto."); setSaving(false); return; }
    if (!q || q <= 0) { setErr("Quantidade deve ser > 0."); setSaving(false); return; }
    if (isNaN(up) || up < 0) { setErr("Preço unitário inválido."); setSaving(false); return; }

    try {
      // 1) cria sale
      const { data: saleIns, error: saleErr } = await supabase
        .from("sales")
        .insert([{
          customer_id: customerId || null,
          total_amount: q * up,
          payment_method: paymentMethod
        }])
        .select("id")
        .single();

      if (saleErr) throw saleErr;
      const saleId = saleIns.id;

      // 2) cria sale_item (1 item)
      const { error: itemErr } = await supabase
        .from("sale_items")
        .insert([{
          sale_id: saleId,
          product_id: productId,
          quantity: q,
          unit_price: up
        }]);
      if (itemErr) throw itemErr;

      // 3) baixa de estoque
      const { error: movErr } = await supabase
        .from("stock_movements")
        .insert([{
          product_id: productId,
          type: "out",
          quantity: q,
          unit_cost: null
        }]);
      if (movErr) throw movErr;

      // reset do form
      setCustomerId("");
      setQuantity(1);
      setSaving(false);

      await carregar();
    } catch (e2) {
      setErr(e2.message || "Erro ao registrar venda.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Vendas</h1>

      {/* Formulário de venda (1 item) */}
      <form onSubmit={registrarVenda} className="bg-white border rounded p-4 grid gap-3 md:grid-cols-4 mb-6">
        <select
          className="border rounded px-3 py-2 md:col-span-2"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">Venda avulsa (sem cliente)</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          className="border rounded px-3 py-2 md:col-span-1"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            const p = products.find((pp) => pp.id === e.target.value);
            if (p) setUnitPrice(String(p.unit_price || 0));
          }}
        >
          <option value="">Produto</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <input
          type="number"
          min="1"
          className="border rounded px-3 py-2 md:col-span-1"
          placeholder="Qtd"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />

        <input
          type="number"
          step="0.01"
          min="0"
          className="border rounded px-3 py-2 md:col-span-1"
          placeholder="Preço unit."
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          required
        />

        <select
          className="border rounded px-3 py-2 md:col-span-1"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="dinheiro">Dinheiro</option>
          <option value="pix">PIX</option>
          <option value="cartao">Cartão</option>
        </select>

        <div className="md:col-span-2 flex items-center text-sm text-gray-600">
          Total: <span className="ml-2 font-semibold">R$ {totalCalc}</span>
        </div>

        <button disabled={saving} className="px-3 py-2 rounded bg-blue-600 text-white md:col-span-1">
          {saving ? "Salvando..." : "Registrar venda"}
        </button>
      </form>

      {err && <div className="text-red-600 mb-3">{err}</div>}

      {/* Lista de vendas recentes */}
      <h2 className="text-lg font-medium mb-2">Vendas recentes</h2>
      {loading ? (
        <div>Carregando…</div>
      ) : sales.length === 0 ? (
        <div className="text-gray-600">Nenhuma venda ainda.</div>
      ) : (
        <ul className="space-y-2">
          {sales.map((s) => (
            <li key={s.id} className="bg-white border rounded p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {s.customers?.name || "Avulsa"} — R$ {Number(s.total_amount).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(s.created_at).toLocaleString()} • {s.payment_method || "—"}
                </div>
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {s.sale_items?.map((it, idx) => (
                  <span key={idx} className="mr-3">
                    {it.products?.name} × {it.quantity} @ R$ {Number(it.unit_price).toFixed(2)}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
