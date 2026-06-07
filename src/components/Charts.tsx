import { useState } from 'react';
import { Stadium, MonthProfile, HourProfile } from '../data';
import { HelpCircle, Waves } from 'lucide-react';

// Custom Tooltip component for hover states
interface TooltipData {
  x: number;
  y: number;
  title: string;
  items: { label: string; value: string; color?: string }[];
}

// -------------------------------------------------------------
// 1. STADIUM RANKING BAR CHART (Horizontal)
// -------------------------------------------------------------
interface RankingBarChartProps {
  stadiums: Stadium[];
  metric: 'avgWBGT' | 'maxWBGT' | 'avgTemp' | 'maxTemp';
  metricTitle: string;
  onSelectStadium?: (stadium: Stadium) => void;
}

export function RankingBarChart({ stadiums, metric, metricTitle, onSelectStadium }: RankingBarChartProps) {
  const [hoveredIndex, setHoveredStadiumIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const sortedData = [...stadiums].sort((a, b) => b[metric] - a[metric]);
  const maxVal = Math.max(...sortedData.map(d => d[metric]), 1);

  // High-Risk thresholds: WBGT is 28.0C, Air Temp is 35.0C
  const thresholdVal = metric.toLowerCase().includes('wbgt') ? 28.0 : 35.0;
  const showThreshold = maxVal >= thresholdVal;

  const chartWidth = 720;
  const rowHeight = 34;
  const paddingLeft = 180;
  const paddingRight = 75;
  const chartHeight = sortedData.length * rowHeight + 30;

  const thresholdX = paddingLeft + ((thresholdVal / maxVal) * (chartWidth - paddingLeft - paddingRight));

  return (
    <div className="relative bg-white p-4 border border-slate-200 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
            Ranked Stadium Temperature Profile <Waves className="w-3.5 h-3.5 text-blue-700" />
          </h4>
          <p className="text-[11px] text-slate-500 font-medium">Comparing matches and training camps based on {metricTitle}</p>
        </div>
        
        {/* KPI Legend in Chart Header */}
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600"></span> <span>Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#f4d35e]"></span> <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-orange-500"></span> <span>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-red-600"></span> <span>Very High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-950"></span> <span>Extreme</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="min-w-[600px] overflow-visible">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1.0].map((ratio, index) => {
            const gridVal = maxVal * ratio;
            const x = paddingLeft + ratio * (chartWidth - paddingLeft - paddingRight);
            return (
              <g key={index}>
                <line x1={x} y1={5} x2={x} y2={chartHeight - 25} stroke="#f1f5f9" strokeWidth={1} />
                <text x={x} y={chartHeight - 8} fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">
                  {gridVal.toFixed(1)}°C
                </text>
              </g>
            );
          })}

          {/* Core Bars Rendering */}
          {sortedData.map((d, index) => {
            const val = d[metric];
            const barW = (val / maxVal) * (chartWidth - paddingLeft - paddingRight);
            const y = index * rowHeight + 10;
            const isHovered = hoveredIndex === index;

            // Pick color dynamically based on its WBGT values
            let color = "fill-emerald-600";
            if (metric.toLowerCase().includes('wbgt')) {
              if (val >= 32) color = "fill-rose-950";
              else if (val >= 30) color = "fill-red-600";
              else if (val >= 28) color = "fill-orange-500";
              else if (val >= 26) color = "fill-[#f4d35e]";
            } else {
              // Temp coloring threshold equivalent
              if (val >= 38) color = "fill-rose-950";
              else if (val >= 35) color = "fill-red-600";
              else if (val >= 30) color = "fill-orange-500";
              else if (val >= 25) color = "fill-[#f4d35e]";
            }

            return (
              <g
                key={d.key}
                className="cursor-pointer"
                onClick={() => onSelectStadium?.(d)}
                onMouseEnter={(e) => {
                  setHoveredStadiumIndex(index);
                  const bounds = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    title: d.name,
                    items: [
                      { label: metricTitle, value: `${val.toFixed(1)}°C` },
                      { label: "Assigned Team", value: d.assignedTeam },
                      { label: "Location", value: `${d.stadiumName.split('(')[1]?.split(',')[0] || d.name}, ${d.country}` },
                      { label: "Type", value: `${d.type === 'Match' ? 'Match Stadium' : 'Training Facility'}` }
                    ]
                  });
                }}
                onMouseMove={(e) => {
                  if (tooltip) {
                    setTooltip({ ...tooltip, x: e.clientX, y: e.clientY });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredStadiumIndex(null);
                  setTooltip(null);
                }}
              >
                {/* Stadium Name Label */}
                <text
                  x={paddingLeft - 12}
                  y={y + 16}
                  fill={isHovered ? "#1e40af" : "#334155"}
                  fontSize="11"
                  textAnchor="end"
                  fontWeight={isHovered ? "bold" : "600"}
                  className="transition-all"
                >
                  {d.name} {d.type === 'Training' ? '⛺' : ''}
                </text>

                {/* Background Row hover mask */}
                <rect
                  x={0}
                  y={y - 2}
                  width={chartWidth}
                  height={rowHeight - 4}
                  fill={isHovered ? "fill-slate-50" : "transparent"}
                  opacity={0.06}
                  rx={4}
                />

                {/* Primary Data Bar */}
                <rect
                  x={paddingLeft}
                  y={y + 4}
                  width={Math.max(barW, 2)}
                  height={15}
                  rx={3.5}
                  className={`${color} transition-all duration-300 ${isHovered ? 'brightness-90 ring-1 ring-blue-300' : ''}`}
                />

                {/* Numeric Value Label on Bar right */}
                <text
                  x={paddingLeft + barW + 8}
                  y={y + 15}
                  fill="#1e293b"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {val.toFixed(1)}°
                </text>
              </g>
            );
          })}

          {/* Dash threshold line (POLICY COMPLIANCE MANDATE) */}
          {showThreshold && (
            <g className="pointer-events-none">
              <line
                x1={thresholdX}
                y1={5}
                x2={thresholdX}
                y2={chartHeight - 25}
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              <rect
                x={thresholdX - 44}
                y={6}
                width={88}
                height={16}
                rx={3}
                fill="#fef2f2"
                stroke="#fee2e2"
                strokeWidth={1}
              />
              <text
                x={thresholdX}
                y={17}
                fill="#b91c1c"
                fontSize="9"
                fontWeight="extrabold"
                textAnchor="middle"
              >
                RISK THRESHOLD ({thresholdVal}°C)
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Red dashed line explanation required in tooltip format */}
      {showThreshold && (
        <div className="mt-3.5 p-3.5 bg-rose-50 border-l-4 border-red-500 rounded-r-lg text-xs leading-relaxed text-rose-950 flex items-start gap-2.5">
          <HelpCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-1">Standardized Threshold Alert:</span>
            Conditions above the <strong className="text-red-700 underline decoration-dashed">Red Dashed Line ({thresholdVal}°C)</strong> are associated with increased risk of physical heat exhaustion, heat cramps, and cognitive/cardiovascular performance dropouts on personnel.
          </div>
        </div>
      )}

      {/* Real-time Rendered floating tooltip overlay */}
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-950/98 backdrop-blur-xs text-white p-3 rounded-lg text-xs shadow-xl pointer-events-none border border-slate-800"
          style={{ left: `${tooltip.x + 15}px`, top: `${tooltip.y - 15}px` }}
        >
          <div className="font-bold border-b border-slate-800 pb-1.5 mb-2 text-yellow-400">{tooltip.title}</div>
          <div className="space-y-1.5 text-[11px]">
            {tooltip.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-6">
                <span className="text-slate-400">{it.label}:</span>
                <span className="font-semibold text-right max-w-40 truncate">{it.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 2. SEASONAL MONTHLY GRAPH (Combo Lines/Bars)
// -------------------------------------------------------------
interface MonthlyComboChartProps {
  months: MonthProfile[];
  title: string;
}

export function MonthlyComboChart({ months, title }: MonthlyComboChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const chartW = 750;
  const chartH = 280;
  const padding = { top: 25, right: 40, bottom: 35, left: 45 };

  const plotW = chartW - padding.left - padding.right;
  const plotH = chartH - padding.top - padding.bottom;

  // Max scale calculation
  const maxTemp = Math.max(...months.map(m => m.maxWBGT || 0), 1);
  const maxScaled = maxTemp * 1.15;

  const thresholdY = padding.top + plotH - ((28.0 / maxScaled) * plotH);

  return (
    <div className="relative bg-white p-4 border border-slate-200 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1 uppercase tracking-wide">
            Annual Climatology Profile
          </h4>
          <p className="text-[11px] text-slate-500 font-medium">{title}</p>
        </div>
        <div className="flex gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-3 h-1.5 bg-emerald-500 inline-block rounded-xs"></span>
            <span>Avg WBGT</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-3 h-0.5 border-t-2 border-red-500 inline-block"></span>
            <span>Peak Monthly WBGT</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-600 font-bold">
            <span className="w-4 border-t-2 border-dashed border-red-600 inline-block"></span>
            <span>Heat Threshold (28°C)</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="min-w-[620px] overflow-visible">
          {/* Temperature Y-Axis markings */}
          {[10, 20, 30, 40].map((val) => {
            if (val > maxScaled) return null;
            const y = padding.top + plotH - ((val / maxScaled) * plotH);
            return (
              <g key={val}>
                <line x1={padding.left} y1={y} x2={chartW - padding.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
                <text x={padding.left - 8} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end" fontWeight="bold">
                  {val}°C
                </text>
              </g>
            );
          })}

          {/* Dotted mandate Red line */}
          {maxScaled >= 28.0 && (
            <g className="pointer-events-none">
              <line
                x1={padding.left}
                y1={thresholdY}
                x2={chartW - padding.right}
                y2={thresholdY}
                stroke="#dc2626"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <text
                x={chartW - padding.right - 10}
                y={thresholdY - 5}
                fill="#b91c1c"
                fontSize="8"
                fontWeight="extrabold"
                textAnchor="end"
              >
                HIGH RISK THRESHOLD (28°C WBGT)
              </text>
            </g>
          )}

          {/* Draw Average monthly bars */}
          {months.map((m, i) => {
            const x = padding.left + i * (plotW / months.length) + 6;
            const bWidth = Math.max(12, plotW / months.length - 12);
            const bHeight = ((m.avgWBGT || 0) / maxScaled) * plotH;
            const isHovered = hoveredIdx === i;

            return (
              <rect
                key={m.month}
                x={x}
                y={padding.top + plotH - bHeight}
                width={bWidth}
                height={Math.max(bHeight, 1)}
                fill={m.avgWBGT >= 28 ? "#f28c28" : m.avgWBGT >= 26 ? "#eab308" : "#10b981"}
                className="transition-all duration-300 opacity-85 hover:opacity-100 hover:brightness-95 cursor-pointer"
                rx={1.5}
                onMouseEnter={(e) => {
                  setHoveredIdx(i);
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    title: `${m.name} Profile`,
                    items: [
                      { label: "Avg WBGT", value: `${m.avgWBGT.toFixed(1)}°C` },
                      { label: "Max WBGT Limit", value: `${m.maxWBGT.toFixed(1)}°C` },
                      { label: "Avg Climate Temp", value: `${m.avgTemp.toFixed(1)}°C` },
                      { label: "Avg Humidity", value: `${m.avgRH.toFixed(0)}%` },
                    ]
                  });
                }}
                onMouseMove={(e) => {
                  if (tooltip) {
                    setTooltip({ ...tooltip, x: e.clientX, y: e.clientY });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredIdx(null);
                  setTooltip(null);
                }}
              />
            );
          })}

          {/* Line for peak maximum monthly WBGT limits */}
          {(() => {
            const pts = months.map((m, i) => {
              const x = padding.left + i * (plotW / months.length) + (plotW / months.length) / 2;
              const y = padding.top + plotH - ((m.maxWBGT || 0) / maxScaled) * plotH;
              return { x, y };
            });

            return (
              <g className="pointer-events-none">
                <path
                  d={pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                {pts.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill="#b91c1c"
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                ))}
              </g>
            );
          })()}

          {/* Month horizontal x-axis labels */}
          {months.map((m, i) => {
            const x = padding.left + i * (plotW / months.length) + (plotW / months.length) / 2;
            return (
              <text
                key={m.month}
                x={x}
                y={chartH - 8}
                fill="#64748b"
                fontSize="11"
                fontWeight="semibold"
                textAnchor="middle"
              >
                {m.name}
              </text>
            );
          })}

          {/* Bottom baseline */}
          <line
            x1={padding.left}
            y1={chartH - padding.bottom}
            x2={chartW - padding.right}
            y2={chartH - padding.bottom}
            stroke="#cbd5e1"
            strokeWidth={1.5}
          />
        </svg>
      </div>

      {/* Floating tooltip markup */}
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-900 border border-slate-800 text-white p-3 rounded-lg text-xs shadow-lg pointer-events-none"
          style={{ left: `${tooltip.x + 15}px`, top: `${tooltip.y - 15}px` }}
        >
          <div className="font-bold border-b border-slate-800 pb-1 mb-1.5 text-yellow-400">{tooltip.title}</div>
          <div className="space-y-1 text-[11px]">
            {tooltip.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-6">
                <span>{it.label}:</span>
                <span className="font-bold text-white text-right">{it.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 3. HOURLY TEMPERATURE & WBGT TREND CHART
// -------------------------------------------------------------
interface HourlyTrendChartProps {
  hours: HourProfile[];
  title: string;
  analysisView?: string;
}

export function HourlyTrendChart({ hours, title, analysisView }: HourlyTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const chartW = 750;
  const chartH = 260;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };

  const plotW = chartW - padding.left - padding.right;
  const plotH = chartH - padding.top - padding.bottom;

  const isExtreme = analysisView === 'Extreme Events';
  const displayWBGT = isExtreme ? hours.map(h => h.maxWBGT) : hours.map(h => h.avgWBGT);
  const maxVal = Math.max(...hours.map(h => h.avgTemp), ...displayWBGT, 1);
  const maxScaled = maxVal * 1.15;

  const thresholdY = padding.top + plotH - ((28.0 / maxScaled) * plotH);

  // Generate path points
  const pointsWBGT = hours.map((h, i) => {
    const x = padding.left + (i * (plotW / (hours.length - 1)));
    const val = isExtreme ? h.maxWBGT : h.avgWBGT;
    const y = padding.top + plotH - ((val / maxScaled) * plotH);
    return { x, y, hour: h.hour, value: val };
  });

  const pointsTemp = hours.map((h, i) => {
    const x = padding.left + (i * (plotW / (hours.length - 1)));
    const y = padding.top + plotH - ((h.avgTemp / maxScaled) * plotH);
    return { x, y, hour: h.hour, value: h.avgTemp };
  });

  return (
    <div className="relative bg-white p-4 border border-slate-200 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Daily Hour Profile Curve
          </h4>
          <p className="text-[11px] text-slate-500 font-medium">{title}</p>
        </div>
        <div className="flex gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-0.5 border-t-2 border-emerald-500 inline-block"></span>
            <span>{isExtreme ? 'Peak WBGT' : 'Avg WBGT'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-0.5 border-t-2 border-blue-500 inline-block"></span>
            <span>{isExtreme ? 'Peak Air Temp' : 'Avg Air Temp'}</span>
          </div>
          <div className="flex items-center gap-1 text-red-600 font-bold">
            <span className="w-3 px-1 border-t border-dashed border-red-600 inline-block"></span>
            <span>Risk Limit (28°C)</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="min-w-[620px] overflow-visible">
          {/* Y Axis Grid */}
          {[5, 15, 25, 35].map((val) => {
            const y = padding.top + plotH - ((val / maxScaled) * plotH);
            return (
              <g key={val}>
                <line x1={padding.left} y1={y} x2={chartW - padding.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
                <text x={padding.left - 8} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end" fontWeight="bold">
                  {val}°C
                </text>
              </g>
            );
          })}

          {/* Red line */}
          {maxScaled >= 28.0 && (
            <line
              x1={padding.left}
              y1={thresholdY}
              x2={chartW - padding.right}
              y2={thresholdY}
              stroke="#dc2626"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              className="pointer-events-none"
            />
          )}

          {/* Draw Air Temp Line */}
          <path
            d={pointsTemp.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeLinecap="round"
            className="opacity-70 pointer-events-none"
          />

          {/* Draw WBGT Line */}
          <path
            d={pointsWBGT.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth={2.5}
            strokeLinecap="round"
            className="pointer-events-none"
          />

          {/* Interactive Invisible hover columns to activate tooltips */}
          {hours.map((h, i) => {
            const x = padding.left + (i * (plotW / (hours.length - 1)));
            const colW = plotW / hours.length;
            const currentWBGT = isExtreme ? h.maxWBGT : h.avgWBGT;

            return (
              <g key={h.hour}>
                {/* Visual guideline */}
                {hoveredIdx === i && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={chartH - padding.bottom}
                    stroke="#cbd5e1"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    className="pointer-events-none"
                  />
                )}

                {/* Vertical slider point */}
                {hoveredIdx === i && (
                  <g className="pointer-events-none">
                    <circle cx={x} cy={pointsWBGT[i].y} r={4.5} fill="#10b981" stroke="#ffffff" strokeWidth={1} />
                    <circle cx={x} cy={pointsTemp[i].y} r={4} fill="#3b82f6" stroke="#ffffff" strokeWidth={1} />
                  </g>
                )}

                {/* Invisible hover sensory rectangle */}
                <rect
                  x={x - colW / 2}
                  y={padding.top}
                  width={colW}
                  height={plotH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={(e) => {
                    setHoveredIdx(i);
                    setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      title: `Hour ${h.hour}:00 Local`,
                      items: [
                        { label: isExtreme ? "Peak WBGT Stress" : "Avg WBGT Stress", value: `${currentWBGT.toFixed(1)}°C` },
                        { label: isExtreme ? "Peak Air Temp" : "Avg Air Temp", value: `${h.avgTemp.toFixed(1)}°C` },
                        { label: "Risk Category", value: currentWBGT >= 28 ? 'High Risk' : currentWBGT >= 26 ? 'Moderate' : 'Low Risk' }
                      ]
                    });
                  }}
                  onMouseMove={(e) => {
                    if (tooltip) {
                      setTooltip({ ...tooltip, x: e.clientX, y: e.clientY });
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredIdx(null);
                    setTooltip(null);
                  }}
                />
              </g>
            );
          })}

          {/* X Axis hourly Labels */}
          {hours.filter(h => h.hour % 2 === 0).map((h) => {
            const x = padding.left + (h.hour * (plotW / (hours.length - 1)));
            return (
              <text
                key={h.hour}
                x={x}
                y={chartH - 8}
                fill="#64748b"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                {h.hour}:00
              </text>
            );
          })}

          {/* Base bottom line */}
          <line
            x1={padding.left}
            y1={chartH - padding.bottom}
            x2={chartW - padding.right}
            y2={chartH - padding.bottom}
            stroke="#cbd5e1"
            strokeWidth={1.5}
          />
        </svg>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 bg-slate-900 border border-slate-800 text-white p-3 rounded-lg text-xs shadow-md pointer-events-none"
          style={{ left: `${tooltip.x + 15}px`, top: `${tooltip.y - 15}px` }}
        >
          <div className="font-bold border-b border-slate-800 pb-1 mb-1 text-green-400">{tooltip.title}</div>
          <div className="space-y-1 text-[11px]">
            {tooltip.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-6">
                <span>{it.label}:</span>
                <span className="font-bold text-white text-right">{it.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
