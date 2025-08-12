import { useEffect, useState, useMemo } from "react";
import { supabase } from "../services/supabaseClient";
import { startOfDayLocal, addDays } from "../utils/dates";

const sum = (arr) => arr.reduce((acc, n) => acc + (Number(n) || 0), 0);

/** Constrói intervalos fechado–aberto para os filtros do topo */
function buildPresetRange(preset) {
  const todayStart = startOfDayLocal(new Date());
  if (preset === "today") {
    const from = todayStart;
    const to = addDays(todayStart, 1);
    return { label: "Hoje", fromISO: from.toISOString(), toISO: to.toISOString() };
  }
  if (preset === "yesterday") {
    const from = addDays(todayStart, -1);
    const to = todayStart;
    return { label: "Ontem", fromISO: from.toISOString(), toISO: to.toISOString() };
  }
  // "7d" = últimos 7 dias (hoje + 6 anteriores)
  const from = addDays(todayStart, -6);
  const to = addDays(todayStart, 1);
  return { label: "Últimos 7 dias", fromISO: from.toISOString(), toISO: to.toISOString() };
}

export default function Dashboard() {
  const [filter, setFilter] = useState("today"); // 'today' | 'yesterday' | '7d'
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // KPIs do período
  const [period, setPeriod] = useState({ total: 0, count: 0, label: "" });

  // Resumo por produto no período
  const [byProduct, setByProduct] = useState({
    gas: { qty: 0, total: 0 },
    agua: { qty: 0, total: 0 },
  });

  // Estoque atual
  const [gasQty, setGasQty] = useState(0);
  const [aguaQty, setAguaQty] = useState(0);

  // WhatsApp
  const [unread, setUnread] = useState(0);

  const range = useMemo(() => buildPresetRange(filter), [filter]);

  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      // ---- VENDAS: total e contagem no período (fechado–aberto) ----
      const { data: salesData, error: salesErr } = await supabase
        .from("sales")
        .select("total_amount, created_at")
        .gte("created_at", range.fromISO)
        .lt("created_at", range.toISO);

      if (salesErr) throw salesErr;

      setPeriod({
        total: sum((salesData || []).map((r) => r.total_amount)),
        count: (salesData || []).length,
        label: range.label,
      });

      // ---- ITENS DE VENDA por produto no período ----
      const { data: itemsData, error: itemsErr } = await supabase
        .from("sale_items")
        .select("quantity, unit_price, products(name), sales!inner(created_at)")
        .gte("sales.created_at", range.fromISO)
        .lt("sales.created_at", range.toISO);

      if (itemsErr) throw itemsErr;

      const agg = { gas: { qty: 0, total: 0 }, agua: { qty: 0, total: 0 } };
      (itemsData || []).forEach((it) => {
        const name = it?.products?.name;
        if (!name || !(name in agg)) return;
        const q = Number(it.quantity) || 0;
        const up = Number(it.unit_price) || 0;
        agg[name].qty += q;
        agg[name].total += q * up;
      });
      setByProduct(agg);

      // ---- ESTOQUE: view v_stock_summary ----
      const v = await supabase.from("v_stock_summary").select("*");
      if (v.error) throw v.error;
      const gas = (v.data || []).find((r) => r.name === "gas");
      const agua = (v.data || []).find((r) => r.name === "agua");
      setGasQty(gas?.quantity ?? 0);
      setAguaQty(agua?.quantity ?? 0);

      // ---- WhatsApp: conversas não lidas (se existir) ----
      try {
        const conv = await supabase.from("conversations").select("unread_count");
        if (!conv.error && conv.data) {
          setUnread(sum(conv.data.map((c) => c.unread_count)));
        } else {
          setUnread(0);
        }
      } catch {
        setUnread(0);
      }
    } catch (e) {
      setErr(e.message || "Erro ao carregar Dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div>
      {/* Topo com filtro */}
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-lg font-semibold">Dashboard</div>
        <div className="flex items-center gap-2">
          <FilterButton active={filter === "today"} onClick={() => setFilter("today")}>
            Hoje
          </FilterButton>
          <FilterButton active={filter === "yesterday"} onClick={() => setFilter("yesterday")}>
            Ontem
          </FilterButton>
          <FilterButton active={filter === "7d"} onClick={() => setFilter("7d")}>
            7 dias
          </FilterButton>
          <button
            onClick={load}
            className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
            title="Atualizar"
          >
            Atualizar
          </button>
        </div>
      </div>

      {err && <div className="mb-3 text-red-600">{err}</div>}

      {loading ? (
        <div>Carregando…</div>
      ) : (
        <>
          {/* KPIs do período */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              title={`Total de vendas — ${period.label}`}
              value={`R$ ${period.total.toFixed(2)}`}
              hint={`${period.count} vendas`}
            />
            <Card
              title="Gás (itens vendidos)"
              value={`${byProduct.gas.qty} un.`}
              hint={`R$ ${byProduct.gas.total.toFixed(2)}`}
            />
            <Card
              title="Água (itens vendidos)"
              value={`${byProduct.agua.qty} un.`}
              hint={`R$ ${byProduct.agua.total.toFixed(2)}`}
            />
          </div>

          {/* Estoque + WhatsApp */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <StockCard name="Estoque — Gás" qty={gasQty} base={30} />
            <StockCard name="Estoque — Água" qty={aguaQty} base={30} />
            <Card title="WhatsApp — Não lidas" value={String(unread)} />
          </div>
        </>
      )}
    </div>
  );
}

/** UI helpers */
function FilterButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded border ${
        active ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function Card({ title, value, hint }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  );
}

function StockCard({ name, qty = 0, base = 30 }) {
  const pct = Math.max(0, Math.min(100, (qty / base) * 100));
  const color = qty <= 5 ? "bg-red-500" : qty <= 15 ? "bg-yellow-400" : "bg-green-500";
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-sm text-gray-500">{name}</div>
      <div className="text-2xl font-semibold">{qty} un.</div>
      <div className="mt-2 h-2 bg-gray-100 rounded">
        <div className={`h-2 rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-400 mt-1">Nível estimado (base {base} un.)</div>
    </div>
  );
}
