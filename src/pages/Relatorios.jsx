import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";
import {
  startOfDayLocal,
  addDays,
  toInputDate,
  buildClosedOpenRange,
} from "../utils/dates";

const sum = (arr) => arr.reduce((a, n) => a + (Number(n) || 0), 0);

function exportCSV(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h] ?? "";
          const s = typeof v === "string" ? v.replace(/"/g, '""') : String(v);
          return `"${s}"`;
        })
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Relatorios() {
  // intervalo padrão: últimos 7 dias (hoje + 6 anteriores)
  const today = startOfDayLocal(new Date());
  const sevenDaysAgo = addDays(today, -6);

  // filtros
  const [from, setFrom] = useState(toInputDate(sevenDaysAgo)); // "YYYY-MM-DD"
  const [to, setTo] = useState(toInputDate(today));            // "YYYY-MM-DD"
  const [product, setProduct] = useState(""); // gas | agua | ""
  const [customerId, setCustomerId] = useState("");
  const [payment, setPayment] = useState("");

  // auxiliares
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // resultados
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // KPIs
  const kpis = useMemo(() => {
    const total = sum(sales.map((s) => s.total_amount));
    return { total, count: sales.length };
  }, [sales]);

  const carregarAuxiliares = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("products").select("id, name").order("name"),
      supabase.from("customers").select("id, name").order("name"),
    ]);
    setProducts(p || []);
    setCustomers(c || []);
  };

  const buscar = async () => {
    setLoading(true);
    setErr("");
    try {
      // intervalo fechado–aberto (robusto para fuso horário)
      const { fromISO, toISO } = buildClosedOpenRange(from, to);

      // base query em sales por intervalo
      let query = supabase
        .from("sales")
        .select(
          "id, total_amount, payment_method, created_at, customers(id, name), sale_items(quantity, unit_price, products(name))"
        )
        .gte("created_at", fromISO)
        .lt("created_at", toISO)
        .order("created_at", { ascending: false });

      if (payment) query = query.eq("payment_method", payment);
      if (customerId) query = query.eq("customer_id", customerId);

      let { data, error } = await query;
      if (error) throw error;

      // filtro por produto (no front; itens vêm aninhados)
      if (product) {
        data = (data || [])
          .map((sale) => ({
            ...sale,
            sale_items: (sale.sale_items || []).filter(
              (it) => it.products?.name === product
            ),
          }))
          .filter((sale) => (sale.sale_items || []).length > 0);

        // recomputa total_amount só com os itens filtrados
        data = data.map((sale) => ({
          ...sale,
          total_amount: sum(
            (sale.sale_items || []).map(
              (it) => (Number(it.quantity) || 0) * (Number(it.unit_price) || 0)
            )
          ),
        }));
      }

      setSales(data || []);
    } catch (e) {
      setErr(e.message || "Erro ao buscar relatórios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarAuxiliares();
  }, []);

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold mb-4">Relatórios</h1>

      {/* Filtros */}
      <div className="bg-white border rounded p-4 grid gap-3 md:grid-cols-6 mb-4">
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">De</label>
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Até</label>
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Produto</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="gas">Gás</option>
            <option value="agua">Água</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Forma de pagamento
          </label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao">Cartão</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm text-gray-600 mb-1">Cliente</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Todos</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3 flex items-end gap-2">
          <button
            onClick={buscar}
            className="px-3 py-2 rounded bg-blue-600 text-white"
          >
            Aplicar filtros
          </button>
          <button
            onClick={() => {
              const rows = sales.flatMap((s) =>
                (s.sale_items || []).map((it, idx) => ({
                  venda_id: s.id,
                  data: new Date(s.created_at).toLocaleString(),
                  cliente: s.customers?.name || "Avulsa",
                  pagamento: s.payment_method || "",
                  item: it.products?.name || "",
                  quantidade: it.quantity,
                  preco_unit: Number(it.unit_price).toFixed(2),
                  subtotal: (
                    Number(it.quantity) * Number(it.unit_price)
                  ).toFixed(2),
                  total_venda: Number(s.total_amount).toFixed(2),
                  ordem_item: idx + 1,
                }))
              );
              const fname = `relatorio_${from}_a_${to}.csv`;
              exportCSV(
                fname,
                rows.length
                  ? rows
                  : [
                      {
                        venda_id: "",
                        data: "",
                        cliente: "",
                        pagamento: "",
                        item: "",
                        quantidade: "",
                        preco_unit: "",
                        subtotal: "",
                        total_venda: "",
                        ordem_item: "",
                      },
                    ]
              );
            }}
            className="px-3 py-2 rounded border bg-white hover:bg-gray-50"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Kpi title="Total no período" value={`R$ ${kpis.total.toFixed(2)}`} />
        <Kpi title="Número de vendas" value={`${kpis.count}`} />
      </div>

      {/* Resultados */}
      {err && <div className="text-red-600 mb-3">{err}</div>}
      {loading ? (
        <div>Carregando…</div>
      ) : sales.length === 0 ? (
        <div className="text-gray-600">
          Nenhuma venda no período com os filtros aplicados.
        </div>
      ) : (
        <ul className="space-y-3">
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
                {(s.sale_items || []).map((it, i) => (
                  <span key={i} className="mr-3">
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

function Kpi({ title, value }) {
  return (
    <div className="bg-white border rounded p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
