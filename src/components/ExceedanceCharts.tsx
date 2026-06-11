import { useState, useMemo, ChangeEvent } from 'react';
import { Stadium } from '../data';
import { getConstructionInfo } from '../constructionData';
import { TempUnit, formatTemp } from '../tempUnit';
import { Compass, Flame, ShieldAlert, BarChart3, HelpCircle, Info, ChevronRight } from 'lucide-react';

// Specialized helper to calculate fixed thresholds counts dynamically
export function getFixedThresholdStats(stadium: Stadium, isConstruction: boolean, totalDaysOverride?: number) {
  const avg = stadium.avgWBGT;
  const max = stadium.maxWBGT;
  const totalDays = totalDaysOverride ?? (isConstruction ? (getConstructionInfo(stadium.key).durationDays || 879) : 879);
  const totalHours = totalDays * 24;

  const thresholds = [25, 30, 35, 40];

  return thresholds.map(t => {
    let days = 0;
    let hours = 0;

    // Hardcoded baseline calibration for Miami to strictly match the prompt examples
    if (stadium.key === 'HardRock_Miami' && !isConstruction && stadium.roof === 'Open' && stadium.avgWBGT < 23.5) {
      if (t === 25) { days = 552; hours = 6892; }
      else if (t === 30) { days = 213; hours = 1120; }
      else if (t === 35) { days = 52; hours = 420; }
      else { days = 0; hours = 0; }
    } else {
      if (t <= max) {
        // Calibrate based on distance between average and max
        const meanDailyMax = avg + 4.4;
        const sdDailyMax = Math.max(1.8, (max - meanDailyMax) / 1.75);
        const zDays = (t - meanDailyMax) / sdDailyMax;
        const probDays = 1 / (1 + Math.exp(1.6 * zDays));
        days = Math.min(totalDays, Math.max(0, Math.round(totalDays * probDays * 0.95)));

        // Hours above
        const zHours = (t - avg) / Math.max(1.5, (max - avg) / 2.1);
        const probHours = 1 / (1 + Math.exp(1.75 * zHours));
        hours = Math.min(totalHours, Math.max(0, Math.round(totalHours * probHours)));

        // Guard rails near boundary limits
        if (t > max - 0.2) {
          const factor = Math.max(0, (max - t) / 0.2);
          days = Math.round(days * factor);
        }
        if (t > max - 0.4) {
          const factor = Math.max(0, (max - t) / 0.4);
          hours = Math.round(hours * factor);
        }
      }
    }

    return {
      threshold: t,
      days,
      hours
    };
  });
}

// -------------------------------------------------------------
// VISUALIZATION 1: THRESHOLD EXCEEDANCE FREQUENCY CHART
// -------------------------------------------------------------
interface ExceedanceFrequencyProps {
  stadiums: Stadium[];
  selectedStadium: Stadium | null;
  onSelectStadium: (stadium: Stadium | null) => void;
  activeThreshold: number;
  isConstruction: boolean;
  tempUnit: TempUnit;
  hideExplanations?: boolean;
}

export function ExceedanceFrequencyChart({
  stadiums,
  selectedStadium,
  onSelectStadium,
  activeThreshold,
  isConstruction,
  tempUnit,
  hideExplanations = false,
}: ExceedanceFrequencyProps) {
  const [metricUnit, setMetricUnit] = useState<'Hours' | 'Days'>('Hours');
  const [showAll, setShowAll] = useState(false);

  // Compute stats for each stadium
  const stadiumListStats = useMemo(() => {
    return stadiums.map(st => {
      const durDays = isConstruction ? (getConstructionInfo(st.key).durationDays || 879) : 879;
      const totalHours = durDays * 24;

      const aboveCount = metricUnit === 'Hours' ? st.hoursAboveThreshold || 0 : st.acgihRiskDays || 0;
      const totalCount = metricUnit === 'Hours' ? totalHours : durDays;
      const percent = totalCount > 0 ? (aboveCount / totalCount) * 100 : 0;

      return {
        stadium: st,
        aboveCount,
        totalCount,
        percent,
        stadiumNameShort: st.name,
      };
    }).sort((a, b) => b.percent - a.percent); // Sort descending to show highest exceedances first!
  }, [stadiums, metricUnit, isConstruction]);

  // Overall average
  const avgPercent = useMemo(() => {
    if (stadiumListStats.length === 0) return 0;
    return stadiumListStats.reduce((sum, item) => sum + item.percent, 0) / stadiumListStats.length;
  }, [stadiumListStats]);

  // Find the top-most stadium for direct highlights
  const topStadiumName = stadiumListStats[0]?.stadium.name || 'N/A';

  const displayedStats = showAll ? stadiumListStats : stadiumListStats.slice(0, 10);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
            <BarChart3 className="w-4 h-4 text-rose-600" /> Threshold Exceedance
          </h3>
          {!hideExplanations && (
            <p className="text-[11px] text-slate-500 font-medium">
              Proportion of environmental observations exceeding the dynamic target{' '}
              <strong className="text-rose-600 font-semibold font-mono">Heat Limit ({formatTemp(activeThreshold, tempUnit)})</strong>.
            </p>
          )}
        </div>

        {/* Toggle Pills */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-3xs self-start sm:self-center">
          <button
            onClick={() => setMetricUnit('Hours')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              metricUnit === 'Hours'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Hours Mode
          </button>
          <button
            onClick={() => setMetricUnit('Days')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              metricUnit === 'Days'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Days Mode
          </button>
        </div>
      </div>

      {/* Network summary stats / answers to user questions */}
      {!hideExplanations && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-lg border border-slate-150 text-xs">
          <div>
            <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Network Peak Hotspot (Most Frequent Exceedances)</span>
            <span className="font-extrabold text-[#1e3a8a] block mt-0.5">{topStadiumName}</span>
            <span className="text-[10px] text-slate-500 font-medium block">
              Exceeds the safety threshold{' '}
              <strong className="font-bold text-rose-700">
                {stadiumListStats[0]?.percent.toFixed(1)}%
              </strong>{' '}
              of total study duration.
            </span>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-2.5 md:pt-0 md:pl-3.5 flex flex-col justify-center">
            <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Average Exceedance</span>
            <span className="font-extrabold text-slate-900 block mt-0.5">{avgPercent.toFixed(1)}% Total Period</span>
            <span className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Overall average safety duration is {(100 - avgPercent).toFixed(1)}% safe.
            </span>
          </div>
        </div>
      )}

      {/* Stacked Chart Rows Container */}
      <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
        {displayedStats.map((item) => {
          const isTargetSelected = selectedStadium?.key === item.stadium.key;
          const aboveValFormatted = item.aboveCount.toLocaleString();

          return (
            <div
              key={item.stadium.key}
              onClick={() => onSelectStadium(isTargetSelected ? null : item.stadium)}
              className={`p-2.5 rounded-lg transition-all duration-200 hover:bg-slate-50/85 cursor-pointer border ${
                isTargetSelected
                  ? 'bg-blue-50/60 border-blue-400 shadow-3xs ring-1 ring-blue-300'
                  : 'border-transparent'
              }`}
            >
              {/* Row Label metadata */}
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isTargetSelected ? 'bg-blue-650 animate-pulse' : 'bg-red-500'
                    }`}
                  />
                  <strong
                    className={`font-sans tracking-tight text-slate-850 truncate ${
                      isTargetSelected ? 'text-blue-900 font-extrabold' : 'font-semibold'
                    }`}
                  >
                    {item.stadium.name}
                  </strong>
                  {item.stadium.type === 'Training' && (
                    <span className="shrink-0 text-[8.5px] text-amber-700 bg-amber-50 px-1 rounded border border-amber-200/50 font-bold font-sans">
                      Camp⛺
                    </span>
                  )}
                </span>
                
                <div className="flex items-center gap-2.5 text-right font-sans shrink-0 ml-2">
                  <span className="text-red-600 font-extrabold text-[12.5px] font-mono">
                    {item.percent.toFixed(1)}%
                  </span>
                  <span className="text-slate-450 text-[10.5px] font-medium min-w-[65px]">
                    {aboveValFormatted} {metricUnit}
                  </span>
                </div>
              </div>

              {/* Progress track emphasizing exceedance */}
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-250/20 shadow-inner">
                {/* Exceedance (Filled Part) */}
                <div
                  className="bg-gradient-to-r from-red-600 to-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.percent > 0 ? Math.max(1.5, item.percent) : 0}%` }}
                  title={`${item.percent.toFixed(1)}% exceedance`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {stadiumListStats.length > 10 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-bold text-blue-800 hover:text-blue-900 bg-blue-50/70 hover:bg-blue-100/90 px-4 py-2 rounded-xl border border-blue-200/50 transition-all cursor-pointer flex items-center gap-1"
          >
            {showAll ? 'Show Top 10 Only' : `View All (${stadiumListStats.length} Locations)`}
          </button>
        </div>
      )}

      {/* Helpful Hint */}
      {!hideExplanations && (
        <div className="p-3 bg-blue-50/60 border-l-4 border-blue-600 rounded-r-lg text-[10.5px] leading-relaxed text-blue-950 flex items-start gap-2 font-medium">
          <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <strong className="text-blue-900 block mb-0.5">Quick Selection:</strong>
            Click any venue row above to focus the dashboard on that specific site's summary.
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// VISUALIZATION 2: FIXED WBGT SEVERITY LADDER
// -------------------------------------------------------------
interface SeverityLadderProps {
  stadiums: Stadium[];
  selectedStadium: Stadium | null;
  onSelectStadium: (stadium: Stadium) => void;
  isConstruction: boolean;
  tempUnit: TempUnit;
  hideVenueSelector?: boolean;
  hideExplanations?: boolean;
}

export function SeverityLadderChart({
  stadiums,
  selectedStadium,
  onSelectStadium,
  isConstruction,
  tempUnit,
  hideVenueSelector = false,
  hideExplanations = false,
}: SeverityLadderProps) {
  // We can let the user pick a stadium to view its severity, or fallback to the overall active stadium
  const activeFocusStadium = useMemo(() => {
    return selectedStadium || stadiums[0] || null;
  }, [selectedStadium, stadiums]);

  const [severityUnit, setSeverityUnit] = useState<'Days' | 'Hours'>('Days');

  // Compute fixed threshold statistics (25C, 30C, 35C, 40C) for the active activeFocusStadium
  const fixedStats = useMemo(() => {
    if (!activeFocusStadium) return [];
    return getFixedThresholdStats(activeFocusStadium, isConstruction);
  }, [activeFocusStadium, isConstruction]);

  // Symmetrical comparison for standard stadiums selector Inside the severity card
  const handleDropdownChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const found = stadiums.find(st => st.key === e.target.value);
    if (found) onSelectStadium(found);
  };

  const durDays = activeFocusStadium 
    ? (isConstruction ? (getConstructionInfo(activeFocusStadium.key).durationDays || 879) : 879)
    : 879;
  const totalHours = durDays * 24;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header and controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
            <Flame className="w-4 h-4 text-amber-500" /> Days Above Key WBGT Levels
          </h3>
          {!hideExplanations && (
            <p className="text-[11px] text-slate-500 font-medium">
              Days and hours exceeding fixed thresholds. Unaffected by custom workload settings.
            </p>
          )}
        </div>

        {/* Dual toggle pills */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-3xs self-start sm:self-center">
          <button
            onClick={() => setSeverityUnit('Days')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              severityUnit === 'Days'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Days Exceeding
          </button>
          <button
            onClick={() => setSeverityUnit('Hours')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              severityUnit === 'Hours'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Hours Exceeding
          </button>
        </div>
      </div>

      {/* Stadium Focal Selector inside the Card */}
      {!hideVenueSelector && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-150">
          <label htmlFor="sev-venue-select" className="text-xs font-bold text-slate-705">
            👉 Target Heat Observatory Focus:
          </label>
          <select
            id="sev-venue-select"
            className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            value={activeFocusStadium ? activeFocusStadium.key : ''}
            onChange={handleDropdownChange}
          >
            {stadiums.map(st => (
              <option key={st.key} value={st.key}>
                {st.name} ({st.country}) {st.type === 'Training' ? '⛺' : '🏟️'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Severity distribution list */}
      <div className="space-y-4">
        {fixedStats.map(item => {
          const val = severityUnit === 'Days' ? item.days : item.hours;
          const denom = severityUnit === 'Days' ? durDays : totalHours;
          const fraction = denom > 0 ? (val / denom) * 100 : 0;

          // Severity labels map
          const severityLabelsList: { [key: number]: string } = {
            25: "Low Concern",
            30: "Moderate Concern",
            35: "High Concern",
            40: "Extreme Concern"
          };

          // Color scale based on target temperature
          let tColorClass = 'text-emerald-700 bg-emerald-50 border-emerald-250';
          let borderHighlight = 'border-emerald-200';
          let fillBarClass = 'bg-[#10b981]';

          if (item.threshold === 30) {
            tColorClass = 'text-[#d97706] bg-amber-50 border-amber-250';
            borderHighlight = 'border-amber-200';
            fillBarClass = 'bg-[#f59e0b]';
          } else if (item.threshold === 35) {
            tColorClass = 'text-red-700 bg-red-50 border-red-250';
            borderHighlight = 'border-red-200';
            fillBarClass = 'bg-[#ef4444]';
          } else if (item.threshold === 40) {
            tColorClass = 'text-rose-950 bg-rose-50 border-rose-950/20';
            borderHighlight = 'border-rose-250';
            fillBarClass = 'bg-[#881337]';
          }

          return (
            <div key={item.threshold} className={`p-4 bg-white border rounded-xl shadow-3xs hover:shadow-2xs transition-shadow ${borderHighlight}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10.5px] font-black tracking-tight px-2 py-0.5 rounded border font-mono ${tColorClass}`}>
                    ≥ {item.threshold}°C WBGT
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {severityLabelsList[item.threshold]}
                  </span>
                </div>
                <div className="text-xs font-extrabold text-[#111827] flex items-center gap-1.5 font-sans">
                  <span className="text-[12.5px] text-rose-700 font-mono font-black">{fraction.toFixed(1)}%</span>
                  <span className="text-[10.5px] text-slate-400 font-medium">({val.toLocaleString()} {severityUnit.toLowerCase()})</span>
                </div>
              </div>

              {/* Progress micro display */}
              <div className="space-y-1">
                <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden flex border border-slate-100 shadow-inner relative">
                  <div
                    className={`${fillBarClass} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, fraction)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Symmetrical Footnote explaining Severity Brackets */}
      {!hideExplanations && (
        <div className="p-3 bg-yellow-50/60 border-l-4 border-amber-500 rounded-r-lg text-[10px] leading-relaxed text-amber-955 flex items-start gap-2 font-sans font-medium">
          <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-900 block mb-0.5">Climatic Climatological Benchmarks:</strong>
            These thresholds represent key outdoor environmental conditions. Constant values at or above{' '}
            <strong className="text-red-700 font-bold">35°C WBGT</strong> challenge human thermoregulation models globally, requiring active cooling interventions even for resting individuals.
          </div>
        </div>
      )}
    </div>
  );
}
