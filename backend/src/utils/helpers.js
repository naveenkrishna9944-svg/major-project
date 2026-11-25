const crypto = require('crypto');

const pad = (n, len = 2) => String(n).padStart(len, '0');

/** 'YYYY-MM-DD' for a Date in server local time (what MySQL CURDATE() gave the PHP app). */
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ymdCompact = (d = new Date()) => ymd(d).replace(/-/g, '');

const today = () => ymd(new Date());
const addDays = (n, from = new Date()) => {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + n);
  return ymd(d);
};

/** Start (local midnight) of a 'YYYY-MM-DD' string. */
const startOfDay = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
};

const startOfToday = () => startOfDay(today());

/** 6 random upper-case hex chars, e.g. "A3F09C" (PHP: strtoupper(substr(uniqid(), -6))). */
const randomCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

const toInt = (v, fallback = 0) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
};
const toFloat = (v, fallback = 0) => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? fallback : n;
};
const str = (v, fallback = '') => (v === undefined || v === null ? fallback : String(v).trim());

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Index an array of docs by their numeric `id`. */
const byId = (arr) => new Map(arr.map((x) => [x.id, x]));

module.exports = {
  ymd, ymdCompact, today, addDays, startOfDay, startOfToday, randomCode,
  toInt, toFloat, str, round2, escapeRegex, isEmail, byId,
};
