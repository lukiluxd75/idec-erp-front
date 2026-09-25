import { useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt, type TeamDay, type TypeStaffMatrix, type StaffMember, type ByType, type ProcedureReport } from "../api/procedureReports.api";

const PURPLE = "#341a67";
const CYAN = "#009ed0";

function TooltipBox({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; payload?: { type?: string; name?: string } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => Number(p.value) > 0);
  return (
    <div className="chart-tip">
      <div className="chart-tip-title">{label}</div>
      {(rows.length ? rows : payload).map((p) => (
        <div key={p.name} className="chart-tip-row">
          <span className="swatch" style={{ background: p.color || PURPLE }} />
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  );
}

export function RankingChart({ ranking }: { ranking: StaffMember[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(360, ranking.length * 22)}>
      <BarChart layout="vertical" data={ranking} margin={{ top: 8, right: 36, left: 8, bottom: 8 }}>
        <CartesianGrid stroke="#eef2f7" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 10 }} reversed />
        <Tooltip content={<TooltipBox />} />
        <Bar dataKey="dispatches" name="Despachos" radius={[0, 2, 2, 0]}>
          {ranking.map((r) => (
            <Cell key={r.name} fill={r.color || PURPLE} />
          ))}
          <LabelList dataKey="dispatches" position="right" fontSize={11} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyChart({
  days,
  ranking,
  staffDaily,
  average,
}: {
  days: TeamDay[];
  ranking: StaffMember[];
  staffDaily: ProcedureReport["staffDaily"];
  average: number;
}) {
  const activeStaff = useMemo(() => ranking.filter((r) => r.dispatches > 0), [ranking]);
  const data = useMemo(() => {
    const lookup = new Map(staffDaily.map((x) => [`${x.name}|${x.date}`, x.dispatches]));
    return days.map((d) => {
      const row: Record<string, string | number> = { ...d };
      for (const p of activeStaff) {
        row[p.name] = lookup.get(`${p.name}|${d.date}`) || 0;
      }
      return row;
    });
  }, [days, staffDaily, activeStaff]);

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 28 }}>
        <CartesianGrid stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-40} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip content={<TooltipBox />} />
        <ReferenceLine y={average} stroke={CYAN} strokeDasharray="4 4" label={{ value: "prom. hábil", fill: CYAN, fontSize: 11 }} />
        {activeStaff.map((p) => (
          <Bar key={p.name} dataKey={p.name} name={p.name} stackId="team" fill={p.color || PURPLE} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieTip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill?: string; color?: string; typeColor?: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="chart-tip">
      <div className="chart-tip-row">
        <span className="swatch" style={{ background: p.payload.color || p.payload.fill || p.payload.typeColor || PURPLE }} />
        {p.name}: {fmt(p.value)}
      </div>
    </div>
  );
}

export function ProcedureTypeChart({ data }: { data: ByType[] }) {
  const slices = data.filter((d) => d.dispatches > 0);
  if (!slices.length) return <p className="caption">Sin despachos en el filtro.</p>;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="dispatches"
          nameKey="description"
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={110}
          paddingAngle={1}
          label={({ percent }) => (percent && percent >= 0.06 ? `${Math.round(percent * 100)}%` : "")}
        >
          {slices.map((d) => (
            <Cell key={d.procedureTypeId} fill={d.color || PURPLE} />
          ))}
        </Pie>
        <Tooltip content={<PieTip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProcedureTypeStaffMatrix({ matrix }: { matrix: TypeStaffMatrix }) {
  if (!matrix.columns.length) return <p className="caption">Sin despachos en el filtro.</p>;
  return (
    <div className="table-wrap">
      <table className="matrix">
        <thead>
          <tr>
            <th>Funcionario</th>
            {matrix.columns.map((c) => (
              <th key={c.procedureTypeId} className="num procedure-type">{c.description}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((f) => (
            <tr key={f.name}>
              <td>{f.name}</td>
              {f.values.map((v, i) => (
                <td key={matrix.columns[i].procedureTypeId} className="num">{v ? fmt(v) : ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function getRowClass(r: StaffMember, threshold: number) {
  if (r.pending >= 100) return "warn";
  if (r.dispatches === 0) return "zero";
  if (threshold && r.dispatches >= threshold) return "ok";
  return "";
}

export function Collapse({
  title,
  caption,
  defaultOpen = false,
  children,
}: {
  title: string;
  caption?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className="collapse"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>
        <span>{title}</span>
        {caption ? <small>{caption}</small> : null}
        <em>{open ? "Ocultar" : "Ver tabla"}</em>
      </summary>
      {open ? <div className="collapse-body">{children}</div> : null}
    </details>
  );
}
