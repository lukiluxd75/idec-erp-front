export type StaffMember = {
  name: string;
  district?: string;
  dispatches: number;
  procedures: number;
  days: number;
  pending: number;
  color: string;
};

export type TeamDay = {
  date: string;
  label: string;
  dispatches: number;
  procedures: number;
  type: "weekday" | "weekend";
};

export type StaffDay = {
  name: string;
  date: string;
  dispatches: number;
  color?: string;
};

export type District = {
  districtId: number;
  description: string;
  count: number;
};

export type ProcedureType = {
  procedureTypeId: number;
  description: string;
  label: string;
  group: string;
  shortLabel: string;
  color: string;
};

export type ByType = {
  procedureTypeId: number;
  description: string;
  group: string;
  dispatches: number;
  procedures: number;
  color: string;
};

export type ByTypeAndStaff = {
  name: string;
  district: string;
  color: string;
  procedureTypeId: number;
  type: string;
  group: string;
  typeColor: string;
  dispatches: number;
  procedures: number;
};

export type TypeStaffMatrix = {
  columns: Array<{ procedureTypeId: number; description: string }>;
  rows: Array<{ name: string; values: Array<number | null> }>;
};

export type ReportFilters = {
  districts: District[];
  procedureTypes: ProcedureType[];
  defaultProcedureTypes: number[];
  centralDistrictId: number;
};

export type ProcedureReport = {
  meta: {
    startDate: string;
    endDate: string;
    unitId: number;
    unit: string;
    districtId: number | null;
    district: string;
    procedureTypes: number[];
    server: string;
    database: string;
    source: "sqlserver" | "snapshot";
    generatedAt: string;
    notice?: string;
  };
  kpis: {
    dispatches: number;
    procedures: number;
    workingDays: number;
    avgTeamPerDay: number;
    pendingCount: number;
    pendingWithoutOutliers: number;
    coreAvgPerDay: number;
    idleWorkdays: string[];
    weekdayDispatches: number;
    staffCount: number;
  };
  ranking: StaffMember[];
  teamDaily: TeamDay[];
  staffDaily: StaffDay[];
  byType: ByType[];
  byTypeAndStaff: ByTypeAndStaff[];
  typeStaffMatrix: TypeStaffMatrix;
  colors: Record<string, string>;
  analysis: {
    backlog: string;
    outliers: string[];
  };
};

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchFilters(): Promise<ReportFilters> {
  const res = await fetch(apiUrl("/api/procedurereports/filters"));
  if (!res.ok) throw new Error("No se pudieron cargar los filtros");
  return res.json();
}

function params(startDate: string, endDate: string, district: string, procedureTypes: number[]) {
  const q = new URLSearchParams({ start_date: startDate, end_date: endDate, district: district || "0" });
  q.set("procedure_types", procedureTypes.length ? procedureTypes.join(",") : "all");
  return q.toString();
}

export async function fetchReport(
  startDate: string,
  endDate: string,
  district: string,
  procedureTypes: number[],
  signal?: AbortSignal,
): Promise<ProcedureReport> {
  const res = await fetch(apiUrl(`/api/procedurereports/reports?${params(startDate, endDate, district, procedureTypes)}`), { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "No se pudo cargar el reporte");
  }
  return res.json();
}

export async function downloadExport(
  kind: "excel" | "pdf",
  startDate: string,
  endDate: string,
  district: string,
  procedureTypes: number[],
) {
  const res = await fetch(apiUrl(`/api/procedurereports/reports/export/${kind}?${params(startDate, endDate, district, procedureTypes)}`));
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "No se pudo descargar");
  }
  const blob = await res.blob();
  const ext = kind === "excel" ? "xlsx" : "pdf";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-cartografia-${startDate}-${endDate}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function fmt(n: number, digits = 0) {
  return n.toLocaleString("es-BO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function avg(n: number, d: number) {
  if (!d) return "—";
  return (n / d).toFixed(1);
}
