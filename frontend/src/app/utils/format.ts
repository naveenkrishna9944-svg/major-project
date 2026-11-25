/** Small formatting helpers shared by the page templates. */
export const fx = (v: any): string => Number(v ?? 0).toFixed(2);

export const money = (v: any): string =>
  `Rs ${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export const fmtDate = (v: any): string => new Date(v).toLocaleDateString();
export const fmtDateTime = (v: any): string => new Date(v).toLocaleString();

export const toIsoDay = (d: Date): string => d.toISOString().slice(0, 10);
