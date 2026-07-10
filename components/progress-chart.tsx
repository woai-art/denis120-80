"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ProgressChart({
  weights,
}: {
  weights: { date: string; weight: number }[];
}) {
  if (weights.length === 0) {
    return (
      <p className="text-sm text-zinc-500">Пока нет данных для графика веса.</p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={weights}>
          <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
          <YAxis stroke="#71717a" fontSize={12} domain={["auto", "auto"]} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#34d399"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
