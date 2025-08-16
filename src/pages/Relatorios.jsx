import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";

/* ========== helpers de formatação ========== */
const UPPER_NAME = (n) => {
  const v = (n || "").toLowerCase();
  if (v === "gas") return "GÁS";
  if (v === "agua") return "ÁGUA";
  return v.toUpperCase();
};
const ICON = (n) => (String(n).toLowerCase() === "gas" ? "🔥" : "💧");
const money = (v) =>
  `R$ ${Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const fmtDateTime = (iso) => new Date(iso).toLocaleString();
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

/* Converte data yyyy-mm-dd para ISO [início do dia local] */
function startOfDayISO(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0); // local
  return dt.toISOString();
}
/* Converte data yyyy-mm-dd para ISO [início do dia + 1, exclusivo] */
function nextDayISO(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 1, 0, 0, 0, 0); // local (dia seguinte)
  return dt.toISOString();
}

/* ========== componente principal ========== */
export default function Relatorios() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filtros
  const [dateStart, setDateStart] = useState(() => {
    // padrão: hoje
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [dateEnd, setDateEnd] = useState(() => {
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [productFilter, setProductFilter] = useState(""); // "", "gas", "agua"
  const [customerId, setCustomerId] = useState(""); // "" = todos

  // dados
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]); // cada venda com sale_items + products

  async function carregarOpcoes() {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .order("name", { ascending: true });
    if (!error) setCustomers(data || []);
  }

  async function carregarRelatorio() {
    setLoading(true);
    setErr("");

    try {
      const startISO = startOfDayISO(dateStart);
      const endNextISO = nextDayISO(dateEnd); // exclusivo

      let query = supabase
        .from("sales")
        .select(
          "id, created_at, total_amount, payment_method, customers(name), sale_items(quantity, unit_price, products(name))"
        )
        .order("created_at", { ascending: false });

      if (startISO) query = query.gte("created_at", startISO);
      if (endNextISO) query = query.lt("created_at", endNextISO);
      if (customerId) query = query.eq("customer_id", customerId);

      const { data, error } = await query;
      if (error) throw error;

      // Aplica filtro de produto no CLIENTE (mais flexível para renderização)
      const filtered = (data || []).map((sale) => {
        if (!productFilter) return sale;
        const items = (sale.sale_items || []).filter(
          (it) => it.products?.name?.toLowerCase() === productFilter
        );
        return { ...sale, sale_items: items };
      }).filter((s) => (s.sale_items || []).length > 0); // remove vendas sem itens após filtro

      setSales(filtered);
    } catch (e) {
      setErr(e.message || "Falha ao carregar relatório.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarOpcoes();
  }, []);

  useEffect(() => {
    carregarRelatorio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStart, dateEnd, productFilter, customerId]);

  // totais
  const { totalAmount, totalItems } = useMemo(() => {
    let amount = 0;
    let items = 0;
    for (const s of sales) {
      for (const it of s.sale_items || []) {
        amount += Number(it.unit_price) * Number(it.quantity);
        items += 1;
      }
    }
    return { totalAmount: amount, totalItems: items };
  }, [sales]);

  // agrupa por dia (yyyy-mm-dd)
  const groupedByDay = useMemo(() => {
    const map = new Map();
    for (const s of sales) {
      const key = s.created_at?.slice(0, 10); // yyyy-mm-dd
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    // ordena por data desc
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([day, arr]) => ({ day, sales: arr }));
  }, [sales]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold mb-4">Relatórios</h1>

      {/* Filtros */}
      <div className="bg-white border rounded p-4 grid gap-3 md:grid-cols-4 mb-4">
        <div className="md:col-span-1">
          <label className="text-sm text-gray-600">Início</label>
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
          />
        </div>
        <div className="md:col-span-1">
          <label className="text-sm text-gray-600">Fim</label>
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
          />
        </div>
        <div className="md:col-span-1">
          <label className="text-sm text-gray-600">Produto</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="gas">GÁS</option>
            <option value="agua">ÁGUA</option>
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="text-sm text-gray-600">Cliente</label>
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
      </div>

      {/* Totais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600">Total no período</div>
          <div className="text-2xl font-semibold">{money(totalAmount)}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600">Nº de itens vendidos</div>
          <div className="text-2xl font-semibold">{totalItems}</div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600">Período</div>
          <div className="text-sm">
            {fmtDate(dateStart)} — {fmtDate(dateEnd)}
          </div>
        </div>
      </div>

      {err && <div className="text-red-600 mb-3">{err}</div>}

      {/* Lista agrupada por dia */}
      {loading ? (
        <div>Carregando…</div>
      ) : groupedByDay.length === 0 ? (
        <div className="text-gray-600">Sem vendas no período.</div>
      ) : (
        <div className="space-y-6">
          {groupedByDay.map(({ day, sales }) => (
            <section key={day}>
              <h2 className="text-base font-semibold text-gray-700 mb-2">
                {fmtDate(day)}
              </h2>

              <ul className="space-y-2">
                {sales.flatMap((s) =>
                  (s.sale_items || []).map((it, idx) => {
                    const pname = it.products?.name || "";
                    const totalItem =
                      Number(it.quantity) * Number(it.unit_price);
                    return (
                      <li key={`${s.id}-${idx}`} className="bg-white border rounded p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">
                            {ICON(pname)} {UPPER_NAME(pname)} × {it.quantity} — {money(totalItem)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {fmtDateTime(s.created_at)}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {s.customers?.name ? `Cliente: ${s.customers.name} • ` : ""}
                          {s.payment_method ? s.payment_method : "—"}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
