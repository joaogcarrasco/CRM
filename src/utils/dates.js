// src/utils/dates.js

/** Retorna uma cópia do Date no início do dia (00:00) no fuso local */
export function startOfDayLocal(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Soma dias a um Date (mantém fuso local) */
export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Converte "YYYY-MM-DD" (input date) para Date às 00:00 no fuso local */
export function dayStartLocalFromInput(str) {
  // aceita "2025-08-12"
  return new Date(`${str}T00:00:00`);
}

/** Formata Date -> "YYYY-MM-DD" para inputs date */
export function toInputDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Constrói intervalo FECHADO–ABERTO a partir de strings "YYYY-MM-DD".
 * Retorna ISO pronto para usar no Supabase (.gte / .lt),
 * e também os Date locais caso precise.
 */
export function buildClosedOpenRange(fromStr, toStr) {
  if (!fromStr || !toStr) throw new Error("Datas inválidas");
  const fromStart = dayStartLocalFromInput(fromStr);
  const toNextStart = addDays(dayStartLocalFromInput(toStr), 1);
  return {
    fromISO: fromStart.toISOString(),
    toISO: toNextStart.toISOString(),
    fromStart,
    toNextStart,
  };
}
