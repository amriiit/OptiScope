import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { ChartNoAxesCombined } from "lucide-react";
import { ms } from "./Hotspots";
export default function RuntimeChart({ result, onSelect }) {
  const measured = result?.profiling.status === "completed";
  const data = measured
    ? result.hotspots
        .filter((r) => r.measurement.status === "measured")
        .map((r) => ({
          name: r.id,
          exclusiveMs: r.measurement.exclusiveMs,
          lines: `${r.startLine}–${r.endLine}`,
        }))
    : [];
  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <div>
          <ChartNoAxesCombined size={17} />
          <h2>Runtime distribution</h2>
        </div>
        <span className="badge">EXCLUSIVE · ms</span>
      </div>
      {data.length ? (
        <div className="chart" style={{ overflowY: "auto" }}>
          <div style={{ height: Math.max(290, data.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 0, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid stroke="#343434" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#a6a6a6", fontSize: 11 }}
                  tickFormatter={(n) => n.toFixed(2)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={40}
                  tick={{ fill: "#dedede", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#ffffff06" }}
                  contentStyle={{
                    background: "#181818",
                    border: "1px solid #484848",
                    borderRadius: 8,
                  }}
                  formatter={(v) => [ms(v), "Exclusive time"]}
                />
                <Bar
                  dataKey="exclusiveMs"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={30}
                  onClick={(d) => onSelect(d.name)}
                  style={{ cursor: "pointer" }}
                >
                  {data.map((r, i) => (
                    <Cell key={r.name} fill={i === 0 ? "#95d5b2" : "#b5b5b5"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="empty tall">
          <ChartNoAxesCombined size={32} />
          <h3>
            {measured
              ? "No measured loop regions"
              : "Measure before optimizing"}
          </h3>
          <p>
            Run Profiling to compile and execute inside Docker. Only measured
            durations will appear here.
          </p>
        </div>
      )}
      <div className="panel-foot">
        {measured
          ? "Non-overlapping exclusive times. Inclusive parent time includes children."
          : "No profiling has completed. No runtime values are estimated."}
      </div>
    </section>
  );
}
