"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyPoint } from "@/lib/services/types";
import { formatMoney, formatMoneyCompact } from "@/lib/utils/currency";

/**
 * Billed vs collected by month. Two series only — the point is the gap
 * between what was invoiced and what actually came in.
 */
export function TrendChart({
  data,
  currency,
}: {
  data: MonthlyPoint[];
  currency: string;
}) {
  const chartData = data.map((point) => ({
    label: point.label,
    Billed: Number(point.billed),
    Collected: Number(point.collected),
  }));

  return (
    <div className="h-[240px] w-full px-1 pb-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="billedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="collectedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f0" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11.5, fill: "#4a6785" }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fontSize: 11.5, fill: "#4a6785" }}
            tickFormatter={(value: number) => formatMoneyCompact(value)}
          />
          <Tooltip
            cursor={{ stroke: "#c7d3e0", strokeWidth: 1 }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e3e9f0",
              boxShadow: "0 8px 20px rgb(15 31 48 / 0.12)",
              fontSize: 12.5,
              padding: "8px 10px",
            }}
            formatter={(value: number, name: string) => [
              formatMoney(value, currency),
              name,
            ]}
          />
          <Area
            type="monotone"
            dataKey="Billed"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#billedGradient)"
            dot={false}
            activeDot={{ r: 3.5 }}
          />
          <Area
            type="monotone"
            dataKey="Collected"
            stroke="#059669"
            strokeWidth={2}
            fill="url(#collectedGradient)"
            dot={false}
            activeDot={{ r: 3.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
