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
export function VisibilityChart({
  data,
  compact = false,
}: {
  data: { date: string; impressions: number; clicks: number }[];
  compact?: boolean;
}) {
  if (!data.length)
    return (
      <div className={compact ? "chart compact-chart empty" : "chart empty"}>
        No visibility data for this period.
      </div>
    );
  return (
    <div className={compact ? "chart compact-chart" : "chart"}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 12, left: compact ? -45 : 0, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id={compact ? "miniFill" : "chartFill"}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0" stopColor="#2588ff" stopOpacity={0.5} />
              <stop offset="1" stopColor="#2588ff" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          {!compact && (
            <CartesianGrid
              stroke="#26364b"
              strokeDasharray="3 5"
              vertical={false}
            />
          )}
          <XAxis
            dataKey="date"
            hide={compact}
            minTickGap={50}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
              })
            }
            stroke="#8294b2"
            tickLine={false}
            axisLine={false}
            fontSize={10}
          />
          <YAxis
            hide={compact}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            stroke="#8294b2"
            tickLine={false}
            axisLine={false}
            width={42}
            fontSize={10}
          />
          <Tooltip
            contentStyle={{
              background: "#0d1d33",
              border: "1px solid #36506f",
              borderRadius: 10,
              color: "#fff",
            }}
            labelStyle={{ color: "#a9b9d1" }}
          />
          <Area
            type="monotone"
            name="Impressions"
            dataKey="impressions"
            stroke="#43adff"
            fill={`url(#${compact ? "miniFill" : "chartFill"})`}
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            name="Clicks"
            dataKey="clicks"
            stroke="#9c82ff"
            fill="transparent"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
