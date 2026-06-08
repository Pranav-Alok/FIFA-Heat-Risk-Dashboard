import { useState } from 'react';
import { Stadium, MonthProfile, HourProfile, getACGIHRiskCategory } from '../data';
import { HelpCircle, Waves } from 'lucide-react';
import { TempUnit, formatTemp } from '../tempUnit';

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
  activeThreshold: number;
  tempUnit: TempUnit;
}

export function RankingBarChart({ stadiums, metric, metricTitle, onSelectStadium, activeThreshold, tempUnit }: RankingBarChartProps) {
  const [hoveredIndex, setHoveredStadiumIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const sortedData = [...stadiums].sort((a, b) => b[metric] - a[metric]);
  const maxVal = Math.max(...sortedData.map(d => d[metric]), 1);

  // High-Risk thresholds: WBGT is dynamic activeThreshold, Air Temp is 35.0C
  const thresholdVal = metric.toLowerCase().includes('wbgt') ? activeThreshold : 35.0;
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
                  {formatTemp(gridVal, tempUnit)}
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
              const cat = getACGIHRiskCategory(val, activeThreshold);
              if (cat === 'Extreme') color = "fill-rose-950";
              else if (cat === 'Very High') color = "fill-red-600";
              else if (cat === 'High') color = "fill-orange-500";
              else if (cat === 'Caution') color = "fill-[#f4d35e]";
              else color = "fill-emerald-600";
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
                      { label: metricTitle, value: formatTemp(val, tempUnit) },
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
                  {formatTemp(val, tempUnit, false)}°
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
                RISK THRESHOLD ({formatTemp(thresholdVal, tempUnit)})
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
            Conditions above the <strong className="text-red-700 underline decoration-dashed">Red Dashed Line ({formatTemp(thresholdVal, tempUnit)})</strong> are associated with increased risk of physical heat exhaustion, heat cramps, and cognitive/cardiovascular performance dropouts on personnel.
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
  activeThreshold: number;
  tempUnit: TempUnit;
}

export function MonthlyComboChart({ months, title, activeThreshold, tempUnit }: MonthlyComboChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const chartW = 750;
  const chartH = 280;
  const padding = { top: 25, right: 45, bottom: 35, left: 55 };

  const plotW = chartW - padding.left - padding.right;
  const plotH = chartH - padding.top - padding.bottom;

  // Max hours is 730
  const maxScaled = 730;
  // Peak temperature scale
  const maxTempScale = 40.0;

  const thresholdY = padding.top + plotH - ((activeThreshold / maxTempScale) * plotH);

  return (
    <div className="relative bg-white p-4 border border-slate-200 rounded-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1 uppercase tracking-wide font-sans">
            Annual Climatology Profile
          </h4>
          <p className="text-[11px] text-slate-500 font-medium">{title}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold font-sans animate-fade-in">
          <div className="flex items-center gap-1 text-slate-600">
            <span className="w-2.5 h-2.5 bg-emerald-500 inline-block rounded-xs"></span>
            <span>Safe (hrs)</span>
          </div>
          <div className="flex items-center gap-1 text-[#eab308]">
            <span className="w-2.5 h-2.5 bg-[#f4d35e] inline-block rounded-xs"></span>
            <span>Caution (hrs)</span>
          </div>
          <div className="flex items-center gap-1 text-orange-500">
            <span className="w-2.5 h-2.5 bg-[#f28c28] inline-block rounded-xs"></span>
            <span>High (hrs)</span>
          </div>
          <div className="flex items-center gap-1 text-red-600">
            <span className="w-2.5 h-2.5 bg-[#c1292e] inline-block rounded-xs"></span>
            <span>Very High (hrs)</span>
          </div>
          <div className="flex items-center gap-1 text-rose-955">
            <span className="w-2.5 h-2.5 bg-[#6a040f] inline-block rounded-xs"></span>
            <span>Extreme (hrs)</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <span className="w-3.5 border-t-2 border-red-500 inline-block"></span>
            <span>Peak WBGT Limit</span>
          </div>
          <div className="flex items-center gap-1 text-red-655 font-bold">
            <span className="w-3.5 border-t-1.5 border-dashed border-red-600 inline-block"></span>
            <span>Threshold ({formatTemp(activeThreshold, tempUnit)})</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="min-w-[620px] overflow-visible">
          {/* Temperature Y-Axis markings (Left - Hours) */}
          {[150, 300, 450, 600, 730].map((val) => {
            const y = padding.top + plotH - ((val / maxScaled) * plotH);
            return (
              <g key={`l-${val}`}>
                <line x1={padding.left} y1={y} x2={chartW - padding.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
                <text x={padding.left - 8} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end" fontWeight="bold" className="font-mono">
                  {val}h
                </text>
              </g>
            );
          })}

          {/* Temperature Y-Axis markings (Right - Temperature) */}
          {[10, 20, 30, 40].map((val) => {
            const y = padding.top + plotH - ((val / maxTempScale) * plotH);
            return (
              <g key={`r-${val}`}>
                <text x={chartW - padding.right + 8} y={y + 4} fill="#ef4444" fontSize="10" textAnchor="start" fontWeight="bold" className="font-mono">
                  {formatTemp(val, tempUnit)}
                </text>
              </g>
            );
          })}

          {/* Dotted mandate Red line using dynamic activeThreshold mapped to right scale */}
          {activeThreshold <= maxTempScale && (
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
                className="font-sans"
              >
                OCCUPATIONAL LIMIT ({formatTemp(activeThreshold, tempUnit)} WBGT)
              </text>
            </g>
          )}

          {/* Draw stacked monthly hours */}
          {months.map((m, i) => {
            const x = padding.left + i * (plotW / months.length) + 6;
            const bWidth = Math.max(12, plotW / months.length - 12);
            
            const sh = m.safeHours ?? 730;
            const ch = m.cautionHours ?? 0;
            const hh = m.acgihHighHours ?? 0;
            const vh = m.acgihVeryHighHours ?? 0;
            const eh = m.acgihExtremeHours ?? 0;

            const shH = (sh / maxScaled) * plotH;
            const chH = (ch / maxScaled) * plotH;
            const hhH = (hh / maxScaled) * plotH;
            const vhH = (vh / maxScaled) * plotH;
            const ehH = (eh / maxScaled) * plotH;

            const isHovered = hoveredIdx === i;

            return (
              <g key={m.month}>
                {/* Safe */}
                <rect
                  x={x}
                  y={padding.top + plotH - shH}
                  width={bWidth}
                  height={shH}
                  fill="#10b981"
                  opacity={isHovered ? 1.0 : 0.8}
                  className="transition-all duration-300"
                />
                {/* Caution */}
                <rect
                  x={x}
                  y={padding.top + plotH - shH - chH}
                  width={bWidth}
                  height={chH}
                  fill="#f4d35e"
                  opacity={isHovered ? 1.0 : 0.8}
                  className="transition-all duration-300"
                />
                {/* High */}
                <rect
                  x={x}
                  y={padding.top + plotH - shH - chH - hhH}
                  width={bWidth}
                  height={hhH}
                  fill="#f28c28"
                  opacity={isHovered ? 1.0 : 0.8}
                  className="transition-all duration-300"
                />
                {/* Very High */}
                <rect
                  x={x}
                  y={padding.top + plotH - shH - chH - hhH - vhH}
                  width={bWidth}
                  height={vhH}
                  fill="#c1292e"
                  opacity={isHovered ? 1.0 : 0.8}
                  className="transition-all duration-300"
                />
                {/* Extreme */}
                <rect
                  x={x}
                  y={padding.top + plotH - shH - chH - hhH - vhH - ehH}
                  width={bWidth}
                  height={ehH}
                  fill="#6a040f"
                  opacity={isHovered ? 1.0 : 0.8}
                  className="transition-all duration-300"
                />

                {/* Sensory Overlay */}
                <rect
                  x={x - 2}
                  y={padding.top}
                  width={bWidth + 4}
                  height={plotH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    setHoveredIdx(i);
                    setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      title: `${m.name} Monthly Distribution`,
                      items: [
                        { label: "Safe Zone", value: `${sh.toFixed(0)} hrs`, color: "#10b981" },
                        { label: "Caution Zone", value: `${ch.toFixed(0)} hrs`, color: "#f4d35e" },
                        { label: "High Risk Zone", value: `${hh.toFixed(0)} hrs`, color: "#f28c28" },
                        { label: "Very High Zone", value: `${vh.toFixed(0)} hrs`, color: "#c1292e" },
                        { label: "Extreme Zone", value: `${eh.toFixed(0)} hrs`, color: "#6a040f" },
                        { label: "Total Exceedance", value: `${(hh + vh + eh).toFixed(0)} hrs`, color: "#dc2626" },
                        { label: "Peak WBGT Limit", value: formatTemp(m.maxWBGT, tempUnit), color: "#ef4444" },
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

          {/* Line for peak maximum monthly WBGT limits using maxTempScale right-side Y axis */}
          {(() => {
            const pts = months.map((m, i) => {
              const x = padding.left + i * (plotW / months.length) + (plotW / months.length) / 2;
              const y = padding.top + plotH - ((m.maxWBGT || 0) / maxTempScale) * plotH;
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
                className="font-sans"
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
          className="fixed z-50 bg-slate-900 border border-slate-800 text-white p-3 rounded-lg text-xs shadow-lg pointer-events-none font-sans"
          style={{ left: `${tooltip.x + 15}px`, top: `${tooltip.y - 15}px` }}
        >
          <div className="font-bold border-b border-slate-800/60 pb-1 mb-1.5 text-yellow-400">{tooltip.title}</div>
          <div className="space-y-1 text-[11px]">
            {tooltip.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-6">
                <span className="flex items-center gap-1.5">
                  {it.color && <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: it.color }} />}
                  <span>{it.label}:</span>
                </span>
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
  activeThreshold: number;
  tempUnit: TempUnit;
}

export function HourlyTrendChart({ hours, title, analysisView, activeThreshold, tempUnit }: HourlyTrendChartProps) {
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

  const thresholdY = padding.top + plotH - ((activeThreshold / maxScaled) * plotH);

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
          <div className="flex items-center gap-1 text-red-656 font-bold">
            <span className="w-3 px-1 border-t border-dashed border-red-600 inline-block"></span>
            <span>Risk Limit ({formatTemp(activeThreshold, tempUnit)})</span>
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
                  {formatTemp(val, tempUnit)}
                </text>
              </g>
            );
          })}

          {/* Red line */}
          {maxScaled >= activeThreshold && (
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
                    const cat = getACGIHRiskCategory(currentWBGT, activeThreshold);
                    setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      title: `Hour ${h.hour}:00 Local`,
                      items: [
                        { label: isExtreme ? "Peak WBGT Stress" : "Avg WBGT Stress", value: formatTemp(currentWBGT, tempUnit) },
                        { label: isExtreme ? "Peak Air Temp" : "Avg Air Temp", value: formatTemp(h.avgTemp, tempUnit) },
                        { label: "Occupational OEL", value: formatTemp(activeThreshold, tempUnit) },
                        { label: "Risk Category", value: cat }
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
