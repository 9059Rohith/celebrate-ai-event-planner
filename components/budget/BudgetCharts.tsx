"use client";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import type { Budget } from "@/lib/schemas";
const colors = [
  "#a95238",
  "#c27d59",
  "#c1a455",
  "#6d7b60",
  "#998298",
  "#628087",
  "#b49c6a",
  "#819c7b",
];
export default function BudgetCharts({ budget }: { budget: Budget }) {
  const money = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: budget.currency,
      maximumFractionDigits: 0,
    }).format(value);
  const data = [
    ...budget.lines.map((l) => ({ name: l.label, value: l.allocatedAmount })),
    { name: "Contingency", value: budget.contingencyAmount },
  ];
  return (
    <div
      className="budget-charts"
      role="img"
      aria-label={`Budget allocation chart. ${data.map((d) => `${d.name}: ${money(d.value)}`).join(". ")}`}
    >
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={65}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => money(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
      <ResponsiveContainer
        width="100%"
        height={Math.max(180, data.length * 23)}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 9, fill: "var(--muted)" }}
          />
          <Tooltip formatter={(v) => money(Number(v))} />
          <Bar dataKey="value" fill="#a95238" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
