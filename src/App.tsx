import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  STADIUMS_DATA,
  MONTHS_DATA,
  HOURS_DATA,
  EXTREME_EVENTS_DATA,
  HEATMAP_DATA,
  HEAT_RISK_THRESHOLDS,
  getRiskLevel,
  getRiskColorHex,
  Stadium,
  ExtremeEvent,
  getDashboardData,
} from './data';
import InteractiveMap from './components/InteractiveMap';
import {
  RankingBarChart,
  MonthlyComboChart,
  HourlyTrendChart,
} from './components/Charts';
import {
  Download,
  BookOpen,
  FileText,
  LayoutDashboard,
  Globe,
  Sliders,
  Calendar,
  Flame,
  ShieldAlert,
  Scale,
  FileSpreadsheet,
  Search,
  ChevronRight,
  Info,
  ExternalLink,
  MapPin,
  Compass,
  AlertTriangle,
  FileCode,
  ArrowRight,
  RefreshCw,
  Sun,
  Droplets,
  Wind,
  Thermometer,
  Activity,
  HeartPulse,
  Database,
} from 'lucide-react';

export default function App() {
  // Navigation: 'landing' or 'dashboard'
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>('landing');
  
  // Active Tab inside Dashboard: 'overview' | 'explorer' | 'seasonal' | 'extremes' | 'methodology' | 'guidance' | 'downloads'
  const [activeTab, setActiveTab] = useState<'overview' | 'explorer' | 'seasonal' | 'extremes' | 'methodology' | 'guidance' | 'downloads'>('overview');

  // Filters for dynamic datasets
  const [filterCountry, setFilterCountry] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All'); // 'All' | 'Match' | 'Training'
  const [selectedStadium, setSelectedStadium] = useState<Stadium | null>(STADIUMS_DATA[0]);
  const [hoveredKpi, setHoveredKpi] = useState<string | null>(null);

  // Explorer - active venue month detail
  const [explorerMonth, setExplorerMonth] = useState<number>(6); // Default to June

  // Interactive educational elements states
  const [selectedWbgtFactor, setSelectedWbgtFactor] = useState<string>('temp');
  const [isMethodologyModalOpen, setIsMethodologyModalOpen] = useState<boolean>(false);

  // Extreme events filters
  const [searchEventQuery, setSearchEventQuery] = useState('');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('All');

  // Comparison Tab filters
  const [searchComparisonsQuery, setSearchComparisonsQuery] = useState('');

  // Future-proof global states
  const [surfaceMode, setSurfaceMode] = useState<string>('Grass / Artificial Turf');
  const [analysisPeriod, setAnalysisPeriod] = useState<string>('Entire Study Period');
  const [analysisView, setAnalysisView] = useState<string>('Extreme Events');

  // Central data-provider query interface
  const dashboardData = useMemo(() => {
    return getDashboardData({ surfaceMode, analysisPeriod, analysisView });
  }, [surfaceMode, analysisPeriod, analysisView]);

  // Synchronized selectedStadium that refers to the active dataset
  const activeSelectedStadium = useMemo(() => {
    if (!selectedStadium) return dashboardData.stadiums[0];
    const found = dashboardData.stadiums.find(s => s.key === selectedStadium.key);
    return found || dashboardData.stadiums[0];
  }, [selectedStadium, dashboardData.stadiums]);

  // -------------------------------------------------------------
  // DATA DYNAMIC COMPUTATIONS
  // -------------------------------------------------------------
  const filteredStadiums = useMemo(() => {
    return dashboardData.stadiums.filter(st => {
      const matchCountry = filterCountry === 'All' || st.country === filterCountry;
      const matchType = filterType === 'All' || st.type === filterType;
      return matchCountry && matchType;
    });
  }, [dashboardData.stadiums, filterCountry, filterType]);

  // Overall Global or Filtered KPI calculations for policy summary
  const summaryKpis = useMemo(() => {
    const list = filteredStadiums;
    const isExtreme = analysisView === 'Extreme Events';
    if (list.length === 0) return {
      highestRiskVenue: 'None',
      highestRiskSubText: '0 hrs',
      hottestCampName: 'n/a',
      hottestCampSubText: '0°C',
      card3Value: '0',
      card3Label: isExtreme ? 'Total Risk Hours' : 'Mean Summer WBGT',
      card3SubText: '',
      card4Value: '0',
      card4Label: isExtreme ? 'Total Risk Days' : 'Avg Annual Risk Days',
      card4SubText: '',
      card5Value: '0',
      card5Label: isExtreme ? 'Longest Heat Event' : 'Avg Heatwave Length',
      card5SubText: '',
      card6Value: isExtreme ? '13:00 - 16:00 Loc' : '14:00 - 15:00 Loc',
      card6Label: isExtreme ? 'Hottest Window' : 'Peak Hourly Window',
      card6SubText: '',
      overallAvg: 0
    };

    // Highest risk venue (by high risk hours under extreme mode, or by average WBGT under typical mode)
    const riskSorted = [...list].sort((a, b) => isExtreme ? b.highRiskHours - a.highRiskHours : b.avgWBGT - a.avgWBGT);
    const highestRiskVenue = riskSorted[0]?.name || 'n/a';
    const highestRiskSubText = isExtreme 
      ? `${riskSorted[0]?.highRiskHours.toLocaleString()} risk hrs` 
      : `${riskSorted[0]?.avgWBGT.toFixed(1)}°C Avg WBGT`;

    // Training sites only
    const trainings = list.filter(st => st.type === 'Training');
    const hottestCamp = isExtreme 
      ? [...trainings].sort((a, b) => b.maxTemp - a.maxTemp)[0] || list[0]
      : [...trainings].sort((a, b) => b.avgTemp - a.avgTemp)[0] || list[0];
    const hottestCampName = hottestCamp ? hottestCamp.name : 'n/a';
    const hottestCampSubText = isExtreme 
      ? `${hottestCamp?.maxTemp.toFixed(1)}°C Peak Temp` 
      : `${hottestCamp?.avgTemp.toFixed(1)}°C Avg Temp`;

    // Summing high-risk hours or calculating standard baseline average
    const totalHighRiskHours = list.reduce((sum, item) => sum + item.highRiskHours, 0);
    const overallAvgWBGT = list.reduce((sum, item) => sum + item.avgWBGT, 0) / list.length;
    const card3Value = isExtreme ? `${totalHighRiskHours.toLocaleString()} hrs` : `${overallAvgWBGT.toFixed(1)}°C`;
    const card3Label = isExtreme ? 'Total Risk Hours' : 'Mean Summer WBGT';
    const card3SubText = isExtreme ? 'Across filtered venues' : 'Composite baseline average';

    // Risk Days
    const totalHighRiskDays = list.reduce((sum, item) => sum + item.highRiskDays, 0);
    const avgRiskDays = list.reduce((sum, item) => sum + item.highRiskDays, 0) / list.length;
    const card4Value = isExtreme ? `${totalHighRiskDays.toLocaleString()} days` : `${avgRiskDays.toFixed(0)} days/venue`;
    const card4Label = isExtreme ? 'Total Risk Days' : 'Avg Annual Risk Days';
    const card4SubText = isExtreme ? 'Climatic exposure total' : 'Average annual exposure';

    // Consecutive and continuous durational metrics
    const longestHeatEvent = Math.max(...list.map(st => st.longestHeatEvent));
    const avgHeatEvent = list.reduce((sum, item) => sum + item.longestHeatEvent, 0) / list.length;
    const card5Value = isExtreme ? `${longestHeatEvent} continuous hrs` : `${avgHeatEvent.toFixed(1)} continuous hrs`;
    const card5Label = isExtreme ? 'Longest Heat Event' : 'Avg Heatwave Length';
    const card5SubText = isExtreme ? 'Absolute peak duration' : 'Average sequence limit';

    // Hourly Windows
    const card6Value = isExtreme ? '13:00 - 16:00 Loc' : '14:00 - 15:00 Loc';
    const card6Label = isExtreme ? 'Hottest Window' : 'Peak Hourly Window';
    const card6SubText = isExtreme ? 'Peak hourly exposure' : 'Typical baseline interval';

    return {
      highestRiskVenue,
      highestRiskSubText,
      hottestCampName,
      hottestCampSubText,
      card3Value,
      card3Label,
      card3SubText,
      card4Value,
      card4Label,
      card4SubText,
      card5Value,
      card5Label,
      card5SubText,
      card6Value,
      card6Label,
      card6SubText,
      overallAvg: overallAvgWBGT
    };
  }, [filteredStadiums, dashboardData.stadiums, analysisView]);

  // Handle active stadium click from Map or Selector list
  const handleSelectStadium = (st: Stadium) => {
    setSelectedStadium(st);
  };

  // -------------------------------------------------------------
  // FILE DOWNLOAD BUILDERS (Pragmatic fully-realized implementation)
  // -------------------------------------------------------------
  const triggerDownload = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTechnicalReport = () => {
    const reportText = `EQUIDEM RESEARCH FOUNDATION
===================================
FIFA 2026 HEAT RISK OBSERVATORY: TECHNICAL COMMISSION REPORT
Generated: June 2026 (Historical Baseline Analysis)

EXECUTIVE SUMMARY
-----------------
Using climatological simulations spanning 2023-2026, this observatory analyzes the extreme
environmental heat stress burdens facing operations, construction sites, match logistics, and 
training centers across the 17 FIFA World Cup 2026 host venues. 

By applying standard Wet Bulb Globe Temperature (WBGT) thresholds, our observations identify
concerning clusters of extreme heat exposure that threaten the health and safety of athletes, 
staff, and municipal preparation forces.

KEY HOTSPOT FINDINGS
--------------------
1. Hard Rock Stadium (Miami) registers the highest overall heat burden with 2,840 accumulated 
   hours of exposure exceeding the critical high-risk safety threshold (>= 28°C WBGT).
2. Texas Health Mansfield Stadium (Mansfield, TX), constructed specifically as the Base Camp training
   site, experiences up to 1,980 individual hours of extreme outdoor heat stress.
3. Compound hot-humid events are prevalent in the Gulf of Mexico regions (Houston, Miami, Monterrey) 
   where high air temperatures align with high water vapor loads to make traditional bodily heat dissipation 
   ineffective.

PROACTIVE POLICY RECOMMENDATIONS
-------------------------------
- Establish mandatory cooling pauses (Wet Bulb temperature monitoring in real-time).
- Mandate active shading of spectator queues, security pathways, and open staging grounds.
- Standardize high-performance hydration access coupled with physiological monitoring.

EQUIDEM Climate Observatory Research Group.`;
    triggerDownload("EQUIDEM_FIFA_2026_Heat_Technical_Report.txt", reportText);
  };

  const downloadMethodology = () => {
    const methodologyText = `EQUIDEM OBSERVATORY: SCIENTIFIC METHODOLOGY & METRIC EXPLANATIONS
==================================================================

1. WET BULB GLOBE TEMPERATURE (WBGT) CONCEPTION
-----------------------------------------------
Unlike standard dry-bulb air temperature, WBGT provides a comprehensive thermodynamic measure of 
heat stress as experienced by the human body in direct solar radiation. The formula integrates:
  - Air temperature (2m dry thermistor load)
  - Ambient water vapor pressure (Absolute & Relative Humidity)
  - Direct solar radiation burden (effective solar angles)
  - Boundary-layer wind velocity (thermal convection)

Our calculation models follow the standard ISO 7243 and NIOSH benchmarks to translate hourly observations
into standardized health risks.

2. STANDARDIZED HEAT RISK SCALE
-------------------------------
  - Low Risk (< 26°C WBGT): Minimal thermodynamic stress.
  - Moderate Risk (26°C - 28°C WBGT): Physical fatigue onset during sustained output.
  - High Risk (28°C - 30°C WBGT): Significant risk of heat cramps. Red threshold indicator line limit.
  - Very High Risk (30°C - 32°C WBGT): Rapid onset of heat exhaustion without active mitigation.
  - Extreme Risk (> 32°C WBGT): High risk of critical heat stroke. Outdoor physical exertion should be avoided.

3. CLIMATIC RE-ANALYSIS DATA SOURCE
-----------------------------------
This observatory integrates hourly climatological values spanning 1991 to 2026 sourced from ERA5 reanalysis combined with NASA micro-regional elevation models to capture exact micro-climatic patterns at each venue.`;
    triggerDownload("EQUIDEM_Observatory_Methodology.txt", methodologyText);
  };

  const downloadDataDictionary = () => {
    const dictText = `EQUIDEM DATA DICTIONARY - METRIC SPECS
========================================

1. avgWBGT
   - Description: Historical average Wet Bulb Globe Temperature mapped across all hourly data points.
   - Units: Celsius (°C)
   
2. maxWBGT
   - Description: Maximum single-hour heat stress value recorded at the venue centroid.
   - Units: Celsius (°C)

3. highRiskHours
   - Description: The total count of hours which exceeded the 28.0°C WBGT threshold.
   - Policy Relevance: Represents the baseline environmental heat exposure magnitude.

4. longestHeatEvent
   - Description: The longest contiguous string of consecutive hours keeping WBGT at or above 28°C.
   - Target Use: Indicates persistent heatwave duration threat.

5. climateZone
   - Description: Climate classification according to the Köppen-Geiger mapping system.
   
6. elevation
   - Description: Height of the playing surface centroid relative to Mean Sea Level (MSL).`;
    triggerDownload("EQUIDEM_Observatory_Data_Dictionary.txt", dictText);
  };

  const downloadVenueReport = (venue: Stadium) => {
    const venueReport = `EQUIDEM SPECIFIC VENUE PROFILE REPORT
stadiumName: ${venue.stadiumName}
--------------------------------------------------
Geography: ${venue.name}, ${venue.country} (Lat: ${venue.lat.toFixed(5)}, Lon: ${venue.lon.toFixed(5)})
Class Code: ${venue.climateZone}
Elevation: ${venue.elevation}
Physical Configuration: ${venue.roof} Roof

HISTORICAL WEATHER METRICS:
- Historical Average Air Temp: ${venue.avgTemp.toFixed(2)}°C
- Single Hour Peak Temperature: ${venue.maxTemp.toFixed(2)}°C (Observed on ${venue.maxTempDate})
- Historical Average WBGT: ${venue.avgWBGT.toFixed(2)}°C
- Single Hour Peak Heat Stress: ${venue.maxWBGT.toFixed(2)}°C (Observed on ${venue.maxWBGTDate})
- Mean Relative Humidity: ${venue.avgRH.toFixed(1)}%
- Avg Solar Load: ${venue.avgSolar.toFixed(1)} W/m²

POLICY COMPLIANCE RISKS (NON-ACUTE):
- High-Risk Environmental Exposure: ${venue.highRiskHours} total hours above 28.0°C WBGT
- Very High-Risk Environmental Exposure: ${venue.veryHighRiskHours} hours above 30.0°C WBGT
- Extreme Environmental Exposure: ${venue.extremeRiskHours} hours above 32.0°C WBGT
- Total Annual Active Danger Days: ${venue.highRiskDays} days
- Longest Contiguous Heatwave Block: ${venue.longestHeatEvent} consecutive hours exceeding threshold
- Max Peak Exceedance Block: ${venue.consecutiveExceedanceDays} consecutive high-risk days

STADIUM CONTEXT & RENOVATION DETAILS:
- Capacity Limit: ${venue.capacity} spectators
- Newly Constructed: ${venue.newlyConstructed ? 'Yes' : 'No'}
- Renovation Scope: ${venue.renovationDetails}

SAFETY RECOMMENDATIONS FOR THIS VENUE:
- Implement Wet Bulb temperature automated cooling signals on match days.
- Configure physical air-curtains or micro-misting corridors on active ingress walks.
- Setup mandatory shaded shift pauses for groundskeeping crews during June-September.

EQUIDEM Climate Observatory Policy Division.`;
    triggerDownload(`${venue.key}_Specific_Heat_Burdens.txt`, venueReport);
  };

  // -------------------------------------------------------------
  // TAB FILTER ARRAYS IN MEMO
  // -------------------------------------------------------------
  const filteredEvents = useMemo(() => {
    return dashboardData.extremeEvents.filter((ev) => {
      const matchSearch =
        ev.stadium.toLowerCase().includes(searchEventQuery.toLowerCase()) ||
        ev.type.toLowerCase().includes(searchEventQuery.toLowerCase()) ||
        ev.country.toLowerCase().includes(searchEventQuery.toLowerCase());
      
      const matchCat = eventCategoryFilter === 'All' || ev.riskCategory === eventCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [dashboardData.extremeEvents, searchEventQuery, eventCategoryFilter]);

  const sortedStadiumsForComparison = useMemo(() => {
    const list = dashboardData.stadiums.filter((st) => 
      st.name.toLowerCase().includes(searchComparisonsQuery.toLowerCase()) ||
      st.country.toLowerCase().includes(searchComparisonsQuery.toLowerCase()) ||
      st.climateZone.toLowerCase().includes(searchComparisonsQuery.toLowerCase())
    );
    const isExtreme = analysisView === 'Extreme Events';
    return [...list].sort((a, b) => isExtreme ? b.maxWBGT - a.maxWBGT : b.avgWBGT - a.avgWBGT);
  }, [dashboardData.stadiums, searchComparisonsQuery, analysisView]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col transition-all">
      
      {/* GLOBAL OBSERVATORY HEADER BAR */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-8 sticky top-0 z-50 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest text-[#1e3a8a] uppercase">EQUIDEM</span>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-tight">
                FIFA 2026 Heat Risk Observatory
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Main view toggle */}
            {currentView === 'landing' ? (
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-900 text-white rounded hover:bg-blue-800 transition-colors flex items-center gap-2"
              >
                Access Observatory Dashboard <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCurrentView('landing');
                    setSelectedStadium(STADIUMS_DATA[0]);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  ← Observatory Title Page
                </button>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Observatory Live
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* RENDER ACTIVE VIEW */}
      <main className="flex-1 w-full">
        <AnimatePresence mode="wait">
          {currentView === 'landing' ? (
            
            // ========================================================
            // LANDING PAGE SCREEN
            // ========================================================
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto px-6 py-8 space-y-8"
            >
              
              {/* LANDING TITLE HERO & OVERVIEW */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-10 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-8 items-center">
                
                {/* Decorative background visual overlay */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-60 pointer-events-none -mr-32 -mt-32"></div>
                
                <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-blue-900 border border-slate-200 text-xs font-semibold rounded uppercase tracking-wider">
                    <Compass className="w-3.5 h-3.5 text-blue-800" /> Policy-Oriented Public Resource
                  </div>
                  
                  <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
                    FIFA 2026 <span className="text-blue-900">Heat Risk</span> Observatory
                  </h2>
                  
                  <p className="text-sm text-slate-655 leading-relaxed max-w-3xl">
                    This platform evaluates potential heat exposure risks at FIFA 2026 match venues and training locations. 
                    Using weather, climate, and heat-stress indicators, it identifies periods where environmental conditions may affect health, safety, and performance. Recommended for researchers, journalists, football associations, and civil society observers.
                  </p>
                  
                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded text-xs font-semibold transition-colors shadow flex items-center gap-2"
                    >
                      Enter Interactive Dashboard <ArrowRight className="w-4 h-4" />
                    </button>
                    <a
                      href="#observatory-map"
                      className="bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 border border-slate-300 rounded text-xs font-semibold transition flex items-center gap-2"
                    >
                      Explore Interactive Map Below
                    </a>
                  </div>
                </div>

                {/* KPI Sidebar Highlights on Hero for immediate findings */}
                <div className="w-full md:w-80 bg-slate-50 rounded-lg p-5 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-2">
                    Climatology Indicators
                  </h3>
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Highest Risk Venue</span>
                      <span className="font-extrabold text-slate-900 text-sm">Hard Rock Stadium (Miami)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Max Heat Stress Observed</span>
                      <span className="font-extrabold text-red-650 text-sm">37.6°C WBGT</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Participating Teams Represented</span>
                      <span className="font-extrabold text-orange-655 text-sm">48 Base Camps</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* NEW SECTION: WHY THIS OBSERVATORY EXISTS */}
              <section className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-6 lg:p-10 shadow-xs space-y-8">
                {/* Header Info */}
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-slate-800 border border-slate-200 text-xs font-semibold rounded uppercase tracking-wider shadow-3xs">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#1e3a8a]" /> Institutional Background and Context
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-xl lg:text-2xl font-black tracking-tight text-slate-900 leading-snug">
                      Why This Observatory Exists
                    </h3>
                    <div className="h-[2px] w-12 bg-[#1e3a8a]"></div>
                    
                    <p className="text-[#152e6d] text-sm font-medium leading-relaxed max-w-3xl">
                      This observatory operates under a public interest mandate to systematically analyze, map, and document the extreme environmental heat risks associated with the FIFA World Cup 2026 venue preparations and operational infrastructures.
                    </p>
                  </div>
                </div>

                {/* Horizontal Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: Why This Matters */}
                  <div className="bg-white border border-slate-150 rounded-lg p-5 flex flex-col justify-between hover:shadow-xs hover:border-slate-300 transition shadow-3xs min-h-[140px]">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100">
                          <HeartPulse className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Why This Matters</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-normal">
                        Workforces involved in retrofitting and stadium-level construction preparations experienced high levels of environmental heat load, creating physical and clinical safety hazards.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Core Mandate */}
                  <div className="bg-white border border-slate-150 rounded-lg p-5 flex flex-col justify-between hover:shadow-xs hover:border-slate-300 transition shadow-3xs min-h-[140px]">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded bg-blue-50 text-[#1e3a8a] flex items-center justify-center shrink-0 border border-blue-100">
                          <Scale className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Core Mandate</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-normal">
                        To translate complex microclimatology and atmosphere physics models into clear, transparent human-rights indicators and localized heat stress warnings.
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Research Context */}
                  <div className="bg-white border border-slate-150 rounded-lg p-5 flex flex-col justify-between hover:shadow-xs hover:border-slate-300 transition shadow-3xs min-h-[140px]">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Research Context</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-normal">
                        Reconstructing climate models across three sovereign nations to isolate extreme thermal outliers, supporting evidence-based labor safety revisions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Key Statistic Highlight strip */}
                <div className="bg-white border border-slate-150 rounded-lg p-4 shadow-3xs">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-150">
                    <div className="text-center lg:text-left py-2 lg:py-0 lg:px-4 flex flex-col justify-center">
                      <div className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">16</div>
                      <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">FIFA Match Venues</div>
                    </div>
                    <div className="text-center lg:text-left pt-2 lg:pt-0 lg:px-4 flex flex-col justify-center">
                      <div className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">48</div>
                      <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Training & Base Camps</div>
                    </div>
                    <div className="text-center lg:text-left pt-2 lg:pt-0 lg:px-4 flex flex-col justify-center">
                      <div className="text-2xl font-extrabold text-[#1e3a8a] font-sans tracking-tight">3</div>
                      <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Sovereign Host Nations</div>
                    </div>
                    <div className="text-center lg:text-left pt-2 lg:pt-0 lg:px-4 flex flex-col justify-center">
                      <div className="text-2xl font-extrabold text-[#1db954] lg:text-[#1e3a8a] font-sans tracking-tight">Hourly</div>
                      <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Heat-Risk Screening</div>
                    </div>
                  </div>
                </div>

                {/* Detailed Explanation Paragraphs (Constrained for readability) */}
                <div className="space-y-4 max-w-3xl text-slate-700 text-sm leading-relaxed font-sans border-t border-slate-150 pt-6">
                  <p>
                    While the FIFA World Cup 2026 has been widely characterized as requiring no brand-new stadium construction—a milestone hailed for its apparent ecological and infrastructure-efficiency standards—multiple host venues in fact underwent significant renovation, modernization, physical expansion, and structural upgrades of baseline capacities. These extensive physical modifications triggered carbon-intensive, localized construction activities and stadium-level preparations across all host cities.
                  </p>
                  <p>
                    A critical hazard identified by this platform relates to the <strong className="text-slate-900 font-semibold">workforces involved in active construction, scaffolding, retrofitting, and physical stadium preparation activities, who may have experienced substantial environmental heat exposure</strong>. Carrying out strenuous manual labor outdoors during intense peak-summer conditions, these workers faced direct risks that this platform documents.
                  </p>
                </div>

                {/* Evidence Note Footer */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                  <Info className="w-4 h-4 text-[#1e3a8a] shrink-0" />
                  <span>Evidence-based hazard analysis and heat exposure reconstructions compiled by the Equidem Research Group.</span>
                </div>
              </section>

              {/* NEW SECTION: KEY INSIGHTS */}
              <section className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5 font-sans">
                      Key Climatological Insights
                    </h3>
                    <p className="text-xs text-slate-500 font-medium font-sans">
                      Summary metrics compiled directly from high-resolution meteorological models across Canada, Mexico, and the United States (1991–2026).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Insight 1: Highest Risk Venue */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded uppercase font-sans">Thermal Hotspot</span>
                        <Flame className="w-4 h-4 text-red-600" />
                      </div>
                      <h4 className="text-xs text-slate-400 font-bold uppercase mt-3 font-sans">Highest Risk Venue</h4>
                      <p className="text-base font-black text-slate-900 leading-snug mt-1 font-sans">{summaryKpis.highestRiskVenue || 'Hard Rock Stadium'}</p>
                      <p className="text-xs text-slate-500 font-medium font-sans">{summaryKpis.highestRiskVenue === 'Hard Rock Stadium' ? 'Miami, USA' : 'Southeastern US / Mexico Regions'}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 leading-tight">
                      {analysisView === 'Extreme Events' ? (
                        <span>Accumulated over <strong className="text-red-700">2,840 hours</strong> exceeding the critical high-risk safety threshold (&ge; 28°C WBGT).</span>
                      ) : (
                        <span>Maintains a typical baseline average heat stress of <strong className="text-emerald-700">27.1°C WBGT</strong> during representative seasonal peaks.</span>
                      )}
                    </div>
                  </div>

                  {/* Insight 2: Max Heat Stress Observed */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded uppercase font-sans">
                          {analysisView === 'Extreme Events' ? 'Extreme Peak' : 'Peak Season Mean'}
                        </span>
                        <Thermometer className="w-4 h-4 text-rose-700" />
                      </div>
                      <h4 className="text-xs text-slate-400 font-bold uppercase mt-3 font-sans">
                        {analysisView === 'Extreme Events' ? 'Max WBGT Observed' : 'Typical Max WBGT'}
                      </h4>
                      <p className="text-2xl font-black text-red-650 leading-none mt-1 font-sans">
                        {analysisView === 'Extreme Events' ? '37.6°C' : '27.1°C'}
                      </p>
                      <p className="text-xs text-slate-500 font-medium font-sans">
                        {analysisView === 'Extreme Events' ? 'Under Peak Reflected Radiation' : 'Representative Monthly Peak'}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 leading-tight">
                      {analysisView === 'Extreme Events' ? (
                        <span>A critical physiological limit where sweat evaporation fails, posing severe exertional stroke risks.</span>
                      ) : (
                        <span>Standard peak ambient indices typical of summer outdoor conditions for elite sporting activities.</span>
                      )}
                    </div>
                  </div>

                  {/* Insight 3: Number of Match Venues */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase font-sans font-semibold">FIFA Arenas</span>
                        <MapPin className="w-4 h-4 text-indigo-650" />
                      </div>
                      <h4 className="text-xs text-slate-400 font-bold uppercase mt-3 font-sans font-medium">Official Venues</h4>
                      <p className="text-3xl font-black text-slate-900 leading-none mt-1 font-sans">16</p>
                      <p className="text-xs text-slate-500 font-medium font-sans">Match Venues Monitored</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 leading-tight">
                      Subjected to full-scale climate reconstructions, tracking ambient and surface microclimates.
                    </div>
                  </div>

                  {/* Insight 4: Number of Training/Base Camps */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded uppercase font-sans font-semibold">Team Bases</span>
                        <Compass className="w-4 h-4 text-orange-600" />
                      </div>
                      <h4 className="text-xs text-slate-400 font-bold uppercase mt-3 font-sans">Base Camps Mapped</h4>
                      <p className="text-3xl font-black text-slate-900 leading-none mt-1 font-sans font-extrabold">48</p>
                      <p className="text-xs text-slate-500 font-medium font-sans">Assigned Team Facilities</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 leading-tight">
                      Mapped for geographical context, highlighting team accommodations in extreme heat regions.
                    </div>
                  </div>

                  {/* Insight 5: Sovereign Host Nations */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase font-sans font-semibold">Territories</span>
                        <Globe className="w-4 h-4 text-emerald-600" />
                      </div>
                      <h4 className="text-xs text-slate-400 font-bold uppercase mt-3 font-sans">Countries Represented</h4>
                      <p className="text-3xl font-black text-slate-900 leading-none mt-1 font-sans font-extrabold">3</p>
                      <p className="text-xs text-slate-500 font-medium font-sans">USA, Canada, Mexico</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 leading-tight">
                      Crossing diverse latitude bands, from high-latitude cool-temperate zones to equatorial highlands.
                    </div>
                  </div>
                </div>
              </section>

              {/* DEDICATED VENUE MAP SECTION */}
              <section id="observatory-map" className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                      Interactive Venue Observatory Map
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Hover on any stadium bubble or click to view geographical attributes and core heat strain values.
                    </p>
                  </div>
                </div>

                {/* Map Frame wrapper */}
                <InteractiveMap
                  stadiums={filteredStadiums}
                  selectedStadium={selectedStadium}
                  onSelectStadium={handleSelectStadium}
                  filterCountry={filterCountry}
                  setFilterCountry={setFilterCountry}
                  filterType={filterType}
                  setFilterType={setFilterType}
                  analysisView={analysisView}
                />
              </section>

              {/* NEW SECTION: WHAT IS HEAT STRESS? */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-10 shadow-sm space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#1e3a8a] uppercase bg-blue-50 px-2 py-0.5 rounded">Physiological Foundations</span>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">What Is Heat Stress?</h3>
                  <div className="h-1 w-20 bg-blue-900 rounded"></div>
                  <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
                    Heat stress represents the accumulation of environmental heat load on the human body, forcing metabolic and cardiorespiratory systems into critical strain. Under high environmental burdens, struggle for active thermal equilibrium compromises performance long before catastrophic illness occurs.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Card 1 */}
                  <div className="border border-slate-100 bg-slate-50/45 p-5 rounded-lg space-y-3">
                    <div className="w-9 h-9 rounded bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100 shadow-3xs">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">Target Thermoregulation</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      Heat stress occurs when the body struggles to maintain a safe internal temperature, exceeding metabolic sweat limits.
                    </p>
                  </div>

                  {/* Card 2 */}
                  <div className="border border-slate-100 bg-slate-50/45 p-5 rounded-lg space-y-3">
                    <div className="w-9 h-9 rounded bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 shadow-3xs">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">Combined Weather Stressors</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      High temperatures, humidity, sunlight, and low wind can combine to create dangerous environmental conditions.
                    </p>
                  </div>

                  {/* Card 3 */}
                  <div className="border border-slate-100 bg-slate-50/45 p-5 rounded-lg space-y-3">
                    <div className="w-9 h-9 rounded bg-blue-50 text-blue-750 flex items-center justify-center border border-blue-100 shadow-3xs">
                      <Scale className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm font-sans">Overall Human Impact</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      Heat stress can affect health, safety, productivity, and physical performance of workers and athletes alike.
                    </p>
                  </div>

                  {/* Card 4 */}
                  <div className="border border-slate-100 bg-slate-50/45 p-5 rounded-lg space-y-3">
                    <div className="w-9 h-9 rounded bg-red-50 text-red-700 flex items-center justify-center border border-red-100 shadow-3xs">
                      <Flame className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">Acute Clinical Emergencies</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal font-sans">
                      Severe heat stress can contribute directly to dangerous medical complications, including heat exhaustion and heat stroke.
                    </p>
                  </div>
                </div>
              </section>

              {/* NEW SECTION: UNDERSTANDING WBGT */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-6 lg:p-10 shadow-xs space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Explanatory */}
                  <div className="lg:col-span-12 xl:col-span-5 space-y-4">
                    <span className="text-[10px] font-bold tracking-widest text-[#1e3a8a] uppercase bg-blue-50 px-2 py-1 rounded font-sans">Thermodynamic Standards</span>
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">Understanding Wet Bulb Globe Temperature (WBGT)</h3>
                    <div className="h-1 w-20 bg-blue-900 rounded"></div>
                    <p className="text-sm font-semibold text-slate-800 leading-relaxed font-sans">
                      "WBGT is an internationally recognized measure of environmental heat stress."
                    </p>
                    <p className="text-xs text-slate-655 leading-relaxed font-normal">
                      Traditional dry-bulb thermometers capture simple air temperature but represent a critical security blindspot for physical work crews and outdoor staging forces. Because it ignores humidity, solar irradiance, and convective cooling, air temperature alone fails to indicate how quickly the human body can dissipate metabolic heat loads. 
                    </p>
                    <p className="text-xs text-slate-655 leading-relaxed font-normal">
                      By contrast, WBGT represents the true thermal impact on biological organisms by incorporating moisture vapor, air flows, and solar energy loads. It stands as the premier standard accepted by WHO, ISO, and leading safety agencies.
                    </p>

                    {/* Highly aesthetic local warning info card */}
                    <div className="bg-blue-900 text-blue-50 border border-blue-800 p-4 rounded-xl flex gap-3 shadow-xs items-start mt-2">
                      <Info className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Comparative Dynamics Note</span>
                        <p className="text-xs text-blue-100 leading-relaxed">
                          Two days with the same air temperature can feel very different if humidity, sunlight, or wind conditions differ. WBGT captures these combined effects.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Visual Component Diagram */}
                  <div className="lg:col-span-12 xl:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                      Visual Matrix: Component Drivers of WBGT
                    </h4>
                    
                    <p className="text-xs text-slate-505 font-medium">
                      Click each element to explore how it registers the thermal burden:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 col-span-2">
                      {/* Factor 1 */}
                      <button 
                        onClick={() => setSelectedWbgtFactor('temp')}
                        type="button"
                        className={`text-left p-3.5 rounded-lg border transition-all focus:outline-none ${
                          selectedWbgtFactor === 'temp' 
                            ? 'bg-blue-50/60 border-blue-400 shadow-2xs' 
                            : 'bg-white border-slate-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-blue-900" />
                          <span className="text-xs font-bold text-slate-905">Air Temperature</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal font-normal">
                          Baseline dry-bulb measurement of ambient heat in shaded conditions. Represents the atmospheric temperature.
                        </p>
                      </button>

                      {/* Factor 2 */}
                      <button 
                        onClick={() => setSelectedWbgtFactor('humid')}
                        type="button"
                        className={`text-left p-3.5 rounded-lg border transition-all focus:outline-none ${
                          selectedWbgtFactor === 'humid' 
                            ? 'bg-blue-50/60 border-blue-400 shadow-2xs' 
                            : 'bg-white border-slate-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-slate-905">Humidity (Wet Bulb)</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal font-normal">
                          Measures cooling via evaporation. Elevated humidity limits sweat evaporation efficacy, compounding physical strain.
                        </p>
                      </button>

                      {/* Factor 3 */}
                      <button 
                        onClick={() => setSelectedWbgtFactor('sun')}
                        type="button"
                        className={`text-left p-3.5 rounded-lg border transition-all focus:outline-none ${
                          selectedWbgtFactor === 'sun' 
                            ? 'bg-blue-50/60 border-blue-400 shadow-2xs' 
                            : 'bg-white border-slate-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-bold text-slate-905">Solar Radiation</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal font-normal">
                          Globe temperature calculating direct and reflected solar rays, particularly severe on urban concrete plazas.
                        </p>
                      </button>

                      {/* Factor 4 */}
                      <button 
                        onClick={() => setSelectedWbgtFactor('wind')}
                        type="button"
                        className={`text-left p-3.5 rounded-lg border transition-all focus:outline-none ${
                          selectedWbgtFactor === 'wind' 
                            ? 'bg-blue-50/60 border-blue-400 shadow-2xs' 
                            : 'bg-white border-slate-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Wind className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-slate-905">Wind Speed</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal font-normal">
                          Governs air motion and convective drying. Faster air currents help dispel skin-boundary humidity pools.
                        </p>
                      </button>
                    </div>

                    {/* Synthesis diagram box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-900/10 text-blue-900 flex items-center justify-center shrink-0">
                          <Sliders className="w-4 h-4 text-slate-800" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-slate-900">Thermodynamic Synthesis Diagram</h5>
                          <p className="text-[10px] text-slate-500 font-normal">
                            Our Liljegren algorithm combines all 4 vectors, weighing Wet Bulb humidity at 70%, radiant globe at 20%, and dry shade temp at 10%.
                          </p>
                        </div>
                      </div>
                      <div className="bg-slate-900 px-3.5 py-2 rounded border border-slate-850 text-center shrink-0 w-full sm:w-auto">
                        <span className="text-[8px] text-slate-400 block font-bold uppercase tracking-wider">Four Elements Combined</span>
                        <span className="text-xs font-black text-blue-400 font-mono">Calculated WBGT</span>
                      </div>
                    </div>
                  </div>

                </div>
              </section>

              {/* NEW SECTION: HEAT-RISK CLASSIFICATIONS */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-10 shadow-sm space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#1e3a8a] uppercase bg-blue-50 px-2 py-0.5 rounded">Risk Hierarchy</span>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Heat-Risk Classifications Explained</h3>
                  <div className="h-1 w-20 bg-blue-900 rounded"></div>
                  <p className="text-sm text-slate-500 max-w-3xl leading-relaxed font-sans">
                    The Observatory segments heat exposure records into five safety classifications. This index aligns explicitly with standard occupational hygiene parameters.
                  </p>
                </div>

                <div className="space-y-4">
                  {HEAT_RISK_THRESHOLDS.map((tr) => {
                    let badgeStyles = '';
                    let dotColorClass = '';
                    switch (tr.level) {
                      case 'Low':
                        badgeStyles = 'bg-emerald-50 text-emerald-800 border-emerald-250';
                        dotColorClass = 'bg-[#2f855a]';
                        break;
                      case 'Moderate':
                        badgeStyles = 'bg-amber-50 text-amber-800 border-amber-250';
                        dotColorClass = 'bg-[#f4d35e]';
                        break;
                      case 'High':
                        badgeStyles = 'bg-orange-50 text-orange-850 border-orange-250';
                        dotColorClass = 'bg-[#f28c28]';
                        break;
                      case 'Very High':
                        badgeStyles = 'bg-red-50 text-red-800 border-red-250';
                        dotColorClass = 'bg-[#c1292e]';
                        break;
                      case 'Extreme':
                        badgeStyles = 'bg-rose-950 text-rose-100 border-rose-900';
                        dotColorClass = 'bg-[#6a040f]';
                        break;
                    }
                    return (
                      <div key={tr.level} className="flex flex-col md:flex-row items-stretch md:items-center justify-between border border-slate-100 rounded-lg overflow-hidden shrink-0 shadow-2xs hover:border-slate-200 transition">
                        {/* Threshold Level badge info */}
                        <div className="w-full md:w-60 p-4 border-b md:border-b-0 md:border-r border-slate-100 flex items-center justify-between font-bold bg-slate-50/55 shadow-3xs shrink-0">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-3 h-3 rounded-full ${dotColorClass} shrink-0`}></span>
                            <span className="text-sm text-slate-905 font-sans">{tr.level} Risk</span>
                          </div>
                          <span className="text-xs text-slate-500 font-bold tracking-tight font-mono">{tr.range}</span>
                        </div>
                        {/* Plain language interpretation column */}
                        <div className="flex-1 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                          <p className="text-xs text-slate-655 leading-relaxed pr-4 font-normal font-sans">
                            {tr.effects}
                          </p>
                          <span className={`inline-flex self-start md:self-center px-2.5 py-1 text-[9px] font-extrabold uppercase border rounded tracking-widest whitespace-nowrap shrink-0 ${badgeStyles}`}>
                            {tr.level === 'Low' ? 'Sustained Work Safe' : tr.level === 'Moderate' ? 'Monitor Hydration' : tr.level === 'High' ? 'Shaded Pauses' : tr.level === 'Very High' ? 'Mandate Limit Shifts' : 'Halt Outdoor Physicals'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* NEW SECTION: HOW HEAT EXPOSURE WAS ASSESSED */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-10 shadow-sm space-y-6 relative overflow-hidden">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#1e3a8a] uppercase">Scientific Methodologies</span>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">How Heat Exposure Was Assessed</h3>
                  <div className="h-1 w-20 bg-blue-900 rounded"></div>
                  <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
                    This platform uses rigorous climatological models and spatial calibrations rather than local station snapshots to supply a consistent, standardized baseline analysis.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                  {/* Step 1 */}
                  <div className="space-y-2 border-l-2 border-blue-100 pl-4">
                    <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded font-mono">MODEL</span>
                    <h4 className="text-xs font-bold text-slate-955 uppercase tracking-tight font-sans">Liljegren WBGT Calculation</h4>
                    <p className="text-xs text-slate-505 leading-relaxed font-normal">
                      We derive heat stress estimates using the established Liljegren WBGT model. This model replicates real wet bulb sensors under ambient air and radiant pressures.
                    </p>
                  </div>
                  {/* Step 2 */}
                  <div className="space-y-2 border-l-2 border-blue-100 pl-4">
                    <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded font-mono">REANALYSIS</span>
                    <h4 className="text-xs font-bold text-slate-955 uppercase tracking-tight font-sans">ERA5 & NASA POWER Data</h4>
                    <p className="text-xs text-slate-505 leading-relaxed font-normal font-sans">
                      Meteorological inputs are obtained from ERA5 and NASA POWER datasets to reconstruct 35-year microclimate baselines.
                    </p>
                  </div>
                  {/* Step 3 */}
                  <div className="space-y-2 border-l-2 border-blue-100 pl-4">
                    <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded font-mono">RESOLUTION</span>
                    <h4 className="text-xs font-bold text-slate-955 uppercase tracking-tight font-sans">Hourly Venue Evaluation</h4>
                    <p className="text-xs text-slate-505 leading-relaxed font-normal font-sans font-sans">
                      Hourly conditions were evaluated across FIFA venues. Environmental metrics are analyzed specifically at the precise geographic coordinates of the official stadiums.
                    </p>
                  </div>
                  {/* Step 4 */}
                  <div className="space-y-2 border-l-2 border-blue-100 pl-4">
                    <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded font-mono font-sans font-extrabold">PLAZA MODES</span>
                    <h4 className="text-xs font-bold text-slate-955 uppercase tracking-tight font-sans">Multiple Surface Options</h4>
                    <p className="text-xs text-slate-505 leading-relaxed font-normal font-sans">
                      Multiple surface conditions were examined, including grass/artificial turf and concrete environments to evaluate albedo absorption variations.
                    </p>
                  </div>
                  {/* Step 5 */}
                  <div className="space-y-2 border-l-2 border-blue-100 pl-4">
                    <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded font-mono">HIERARCHY</span>
                    <h4 className="text-xs font-bold text-slate-955 uppercase tracking-tight font-sans">Standard Safety Grading</h4>
                    <p className="text-xs text-slate-505 leading-relaxed font-normal font-sans">
                      Results are displayed using internationally recognized heat-risk classifications, highlighting critical exposure timings.
                    </p>
                  </div>
                  {/* Explanatory CTA Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-855 font-sans">Verify Assessment Metrics</h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-normal font-sans">
                        Inspect the mathematical algorithms, solar constants, and elevation coefficients used in this observatory.
                      </p>
                    </div>
                    {/* View Full Methodology Modal Trigger */}
                    <button
                      onClick={() => setIsMethodologyModalOpen(true)}
                      type="button"
                      className="w-full mt-3 bg-blue-900 hover:bg-blue-800 text-white rounded py-2 text-[10px] font-bold tracking-wider transition uppercase focus:outline-none shadow-xs"
                    >
                      View Full Methodology
                    </button>
                  </div>
                </div>

                {/* THE METHODOLOGY MODAL OVERLAY */}
                {isMethodologyModalOpen && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-250 max-w-2xl w-full max-h-[85vh] overflow-y-auto flex flex-col text-left">
                      <div className="p-6 border-b border-slate-250 flex items-center justify-between bg-slate-950 text-white shrink-0">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-blue-400" />
                          <h4 className="font-extrabold text-sm tracking-tight font-sans">Full Methodology & Theoretical formulations</h4>
                        </div>
                        <button 
                          onClick={() => setIsMethodologyModalOpen(false)}
                          type="button"
                          className="text-slate-400 hover:text-white text-xs font-bold bg-slate-800 hover:bg-slate-755 px-2.5 py-1 rounded"
                        >
                          ✕ Close
                        </button>
                      </div>

                      <div className="p-6 space-y-4 text-xs text-slate-655 leading-relaxed overflow-y-auto">
                        <div className="p-3 bg-blue-50 border border-blue-150 rounded text-blue-950 font-semibold text-[10px] uppercase tracking-wider font-mono">
                          Full Academic Methodology (Simulation Parameters only)
                        </div>
                        
                        <h5 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1 font-sans">Liljegren Algorithmic Framework</h5>
                        <p className="font-sans">
                          Our Wet Bulb Globe Temperature calculations utilize the computationally sophisticated thermal solver created by Liljegren. This framework models direct solar irradiation, surface elevation pressure, boundary airflow vectors, and wet-bulb vapor profiles. Globe temperature equations solve:
                        </p>
                        <div className="bg-slate-50 border border-slate-150 p-3 rounded font-mono text-center text-slate-700 select-all">
                          Tg = f(DryTemp, DiffuseSolar, DirectSolar, WindVelocity, DewPoint, Pressure)
                        </div>
                        <p className="font-sans">
                          The physical calculation of Wet Bulb Globe Temperature for outdoor physical work under full sun exposures is aggregated:
                        </p>
                        <div className="bg-slate-50 border border-slate-150 p-3 rounded font-mono text-center text-slate-705 select-all">
                          WBGT = 0.7 &times; Tnwb + 0.2 &times; Tg + 0.1 &times; Tdb
                        </div>
                        <ul className="list-disc pl-4 space-y-1 font-sans">
                          <li><strong>Tnwb</strong>: Natural Wet Bulb temperature (evaporative drying capacity of the wet skin layer).</li>
                          <li><strong>Tg</strong>: Radiant Globe temperature (effective radiant load contribution of structural surroundings).</li>
                          <li><strong>Tdb</strong>: Standard Dry Bulb shade temperature (convective heat of air currents).</li>
                        </ul>

                        <h5 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1 font-sans">Surface Reflectance Adjustments</h5>
                        <p className="font-sans">
                          Ground albedos are calibrated differently based on the surface layer:
                        </p>
                        <ol className="list-decimal pl-4 space-y-2 font-sans">
                          <li><strong>Field Turf (Well-Irrigated Grass)</strong>: Elevated 0.23 albedo with active soil latent cooling, introducing cooling reductions of 1.25°C to 2.4°C over model environments.</li>
                          <li><strong>Concrete Plaza Surfaces</strong>: Absorptive 0.15 albedo with negligible latent cooling capacity, driving strong thermal storage blocks that amplify local WBGT results by up to 4.2°C under full sunshine.</li>
                        </ol>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[10px]">
                          <strong>Screening Verification Note</strong>: Simulations reconstruct regional hourly values. Dynamic shadow angles across specific stadium structures necessitate local validation on match-days.
                        </div>
                      </div>

                      <div className="p-4 border-t border-slate-150 bg-slate-50 shrink-0 flex justify-end">
                        <button 
                          onClick={() => setIsMethodologyModalOpen(false)}
                          type="button"
                          className="bg-slate-905 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded font-sans"
                        >
                          I Understand
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* NEW SECTION: USING THE OBSERVATORY (How To Read The Dashboard) */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-10 shadow-sm space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#1e3a8a] uppercase">Operation Guide</span>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">Using the Observatory</h3>
                  <div className="h-1 w-20 bg-blue-900 rounded"></div>
                  <p className="text-sm text-slate-545 max-w-3xl leading-relaxed">
                    Follow these logical pathways to extract and master the thermal insights built throughout this monitoring dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Step 1 */}
                  <div className="border border-slate-100 p-5 rounded-lg space-y-2 hover:border-slate-350 hover:bg-slate-50/20 transition-all shadow-3xs flex flex-col justify-between">
                    <div>
                      <span className="text-xl font-extrabold text-blue-950 block leading-none font-sans font-black">1.</span>
                      <h4 className="text-xs font-black text-slate-955 uppercase tracking-tight mt-1 font-sans">Explore Venue Map</h4>
                    </div>
                    <p className="text-[11px] text-slate-505 leading-normal font-normal mt-2 font-sans">
                      Explore venue locations on the map. Move across our custom map projection to quickly locate all match stadium coordinates.
                    </p>
                  </div>
                  {/* Step 2 */}
                  <div className="border border-slate-100 p-5 rounded-lg space-y-2 hover:border-slate-355 hover:bg-slate-50/20 transition-all shadow-3xs flex flex-col justify-between">
                    <div>
                      <span className="text-xl font-extrabold text-blue-950 block leading-none font-sans font-black">2.</span>
                      <h4 className="text-xs font-black text-slate-955 uppercase tracking-tight mt-1 font-sans">Compare Host Arenas</h4>
                    </div>
                    <p className="text-[11px] text-slate-505 leading-normal font-normal mt-2">
                      Compare FIFA match venues. Select host countries and specific stadium options from the list to analyze regional contrasts.
                    </p>
                  </div>
                  {/* Step 3 */}
                  <div className="border border-slate-100 p-5 rounded-lg space-y-2 hover:border-slate-355 hover:bg-slate-50/20 transition-all shadow-3xs flex flex-col justify-between">
                    <div>
                      <span className="text-xl font-extrabold text-blue-950 block leading-none font-sans font-black">3.</span>
                      <h4 className="text-xs font-black text-slate-955 uppercase tracking-tight mt-1 font-sans">Examine Risk Hours</h4>
                    </div>
                    <p className="text-[11px] text-slate-505 leading-normal font-normal mt-2">
                      Examine heat-risk conditions. Toggle the daily charts to pinpoint hours where ambient temperature crosses safety levels.
                    </p>
                  </div>
                  {/* Step 4 */}
                  <div className="border border-slate-100 p-5 rounded-lg space-y-2 hover:border-slate-355 hover:bg-slate-50/20 transition-all shadow-3xs flex flex-col justify-between">
                    <div>
                      <span className="text-xl font-extrabold text-blue-950 block leading-none font-sans font-black">4.</span>
                      <h4 className="text-xs font-black text-slate-955 uppercase tracking-tight mt-1 font-sans">Review Extreme Stress</h4>
                    </div>
                    <p className="text-[11px] text-slate-505 leading-normal font-normal mt-2">
                      Review extreme heat events. Examine multi-day heatwave strings and temperature anomalies recorded at each site.
                    </p>
                  </div>
                  {/* Step 5 */}
                  <div className="border border-slate-100 p-5 rounded-lg space-y-2 hover:border-slate-355 hover:bg-slate-50/20 transition-all shadow-3xs flex flex-col justify-between">
                    <div>
                      <span className="text-xl font-extrabold text-blue-950 block leading-none font-sans font-black">5.</span>
                      <h4 className="text-xs font-black text-slate-955 uppercase tracking-tight mt-1 font-sans font-extrabold">Understand Surfaces</h4>
                    </div>
                    <p className="text-[11px] text-slate-505 leading-normal font-normal mt-2">
                      Understand how different surfaces influence heat exposure. Toggle grassy field playing surfaces to concrete plaza settings.
                    </p>
                  </div>
                </div>
              </section>

              {/* NEW SECTION: DATA SOURCES & DISCLAIMER SUMMARY */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-10 shadow-sm space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#1e3a8a] uppercase bg-blue-50 px-2 py-0.5 rounded">Climatological Metadata</span>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">Data Sources</h3>
                  <div className="h-1 w-20 bg-blue-900 rounded"></div>
                  <p className="text-sm text-slate-500 max-w-3xl leading-relaxed font-sans">
                    Our platform relies entirely on open scientific meteorological archives to maintain complete diagnostic peer-review eligibility.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                  {/* Source 1 */}
                  <div className="p-4 border border-slate-100 rounded-lg bg-slate-50/30 flex gap-3 text-left">
                    <div className="p-2.5 bg-slate-100 text-slate-800 rounded w-10 h-10 flex items-center justify-center shrink-0">
                      <Database className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-slate-950 uppercase font-sans">ERA5 (ECMWF)</h4>
                      <p className="text-[10px] text-slate-500 leading-normal font-normal font-sans">
                        Copernicus climate reanalysis records delivering atmospheric wind vector, relative humidity, and dry dry-bulb shade variables.
                      </p>
                    </div>
                  </div>

                  {/* Source 2 */}
                  <div className="p-4 border border-slate-100 rounded-lg bg-slate-50/30 flex gap-3 text-left">
                    <div className="p-2.5 bg-slate-100 text-slate-850 rounded w-10 h-10 flex items-center justify-center shrink-0 font-extrabold">
                      <Database className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="space-y-1 font-sans">
                      <h4 className="font-bold text-xs text-slate-950 uppercase font-mono">NASA POWER</h4>
                      <p className="text-[10px] text-slate-500 leading-normal font-normal">
                        NASA Power platform satellite flux parameter records capturing precise surface diffuse and direct solar radiation inputs.
                      </p>
                    </div>
                  </div>

                  {/* Source 3 */}
                  <div className="p-4 border border-slate-100 rounded-lg bg-slate-50/30 flex gap-3 text-left">
                    <div className="p-2.5 bg-slate-100 text-slate-800 rounded w-10 h-10 flex items-center justify-center shrink-0">
                      <FileCode className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-slate-950 uppercase font-sans">Liljegren Model</h4>
                      <p className="text-[10px] text-slate-500 leading-normal font-normal font-sans">
                        Global peer-validated Liljegren WBGT algorithm model mapping the physical responses of wet bulb and globe indicators.
                      </p>
                    </div>
                  </div>

                  {/* Source 4 */}
                  <div className="p-4 border border-slate-100 rounded-lg bg-slate-50/30 flex gap-3 text-left">
                    <div className="p-2.5 bg-slate-100 text-slate-805 rounded w-10 h-10 flex items-center justify-center shrink-0">
                      <Scale className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-slate-955 uppercase font-sans">ACGIH Guidance</h4>
                      <p className="text-[10px] text-slate-505 leading-normal font-normal font-sans">
                        Recognized work-rest ratio ACGIH guidelines matching continuous labor limits under heat hazards.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual Disclaimer Box */}
                <div className="bg-amber-50/70 border border-amber-200 text-amber-900 p-5 rounded-lg flex flex-col md:flex-row gap-4 items-start shadow-3xs mt-4">
                  <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800">Scientific & Clinical Assessment Disclaimer</span>
                    <p className="text-xs leading-relaxed max-w-4xl text-amber-955 font-medium">
                      "This observatory is intended as a heat-risk screening and research tool. It should not be interpreted as a direct assessment of occupational compliance or athlete safety."
                    </p>
                    <p className="text-[10px] text-amber-700/90 leading-relaxed font-normal font-sans">
                      Climatology models map regional weather projections. Actual wind dynamics around concrete physical canopies, shaded spectator seats, cooling mechanics, or localized water provisioning networks can vary from modeled baselines.
                    </p>
                  </div>
                </div>
              </section>

              {/* TECHNICAL DOWNLOAD REPORTS PANEL */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
                    Download Repository <Download className="w-5 h-5 text-blue-900" />
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Access our research team's official policy reports, calculation spreadsheets, and data mappings. 
                    These text data payloads download directly to your local computer.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Download Report Box 1 */}
                  <div className="border border-slate-200 hover:border-slate-350 p-5 rounded-lg transition space-y-4 bg-slate-50/20 shadow-xs flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="p-2 bg-blue-50 border border-blue-100 rounded w-10 h-10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-900" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">Download Technical Report</h4>
                      <p className="text-xs text-slate-505 leading-normal">
                        Detailed policy assessment of June-September outdoor risks, heat mitigation criteria, and human protection guidelines.
                      </p>
                    </div>
                    <button
                      onClick={downloadTechnicalReport}
                      className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 rounded text-xs font-semibold transition flex items-center justify-center gap-2 mt-2"
                    >
                      <Download className="w-4 h-4" /> Download Report (.TXT)
                    </button>
                  </div>

                  {/* Download Report Box 2 */}
                  <div className="border border-slate-200 hover:border-slate-350 p-5 rounded-lg transition space-y-4 bg-slate-50/20 shadow-xs flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="p-2 bg-indigo-50 border border-indigo-100 rounded w-10 h-10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-indigo-900" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">Download Methodology</h4>
                      <p className="text-xs text-slate-505 leading-normal">
                        Complete details of the reanalysis framework, Wet Bulb calculation model, and meteorological formulations.
                      </p>
                    </div>
                    <button
                      onClick={downloadMethodology}
                      className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 rounded text-xs font-semibold transition flex items-center justify-center gap-2 mt-2"
                    >
                      <Download className="w-4 h-4" /> Download Methodology
                    </button>
                  </div>

                  {/* Download Report Box 3 */}
                  <div className="border border-slate-200 hover:border-slate-350 p-5 rounded-lg transition space-y-4 bg-slate-50/20 shadow-xs flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="p-2 bg-emerald-50 border border-emerald-100 rounded w-10 h-10 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-900" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">Download Data Dictionary</h4>
                      <p className="text-xs text-slate-505 leading-normal">
                        Technical mappings of the ERA5 fields (temperature, dewpoint, pressure, solar, wind vector metrics) and calculations.
                      </p>
                    </div>
                    <button
                      onClick={downloadDataDictionary}
                      className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 rounded text-xs font-semibold transition flex items-center justify-center gap-2 mt-2"
                    >
                      <Download className="w-4 h-4" /> Download Dictionary
                    </button>
                  </div>

                </div>
              </section>

              {/* OBSERVATORY HEALTH POLICIES STANDARDS FOOTER CITATIONS */}
              <section className="text-center py-4 text-xs text-slate-500 max-w-3xl mx-auto space-y-1 italic border-t border-slate-200/60 pt-6">
                <p>This observatory is intended for public assistance of human safety. Historical data metrics and risk zones are sourced directly from climatology records.</p>
                <div className="flex flex-wrap justify-center gap-4 pt-1 not-italic font-semibold text-slate-400">
                  <span>Cited standards: WHO Guidance</span>
                  <span>·</span>
                  <span>NIOSH Heat Stress recommendations</span>
                  <span>·</span>
                  <span>ISO 7243 standards</span>
                </div>
              </section>

            </motion.div>
          ) : (
            
            // ========================================================
            // INTERACTIVE DASHBOARD VIEW (Multi-tab system)
            // ========================================================
            <div className="max-w-7xl mx-auto px-6 py-8">
              
              {/* NEW GLOBAL ANALYSIS PANEL */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 mb-6 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded tracking-wide uppercase">Institutional Query Engine</span>
                    <h2 className="text-sm font-black text-slate-900 tracking-tight mt-1">Global Re-Analysis Parameters</h2>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Active State Matrix: <span className="font-mono text-[#1e3a8a] bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded font-bold">{surfaceMode === 'Grass / Artificial Turf' ? 'grass_turf' : 'concrete'}</span> | <span className="font-mono text-[#1e3a8a] bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded font-bold">{analysisPeriod === 'Entire Study Period' ? 'entire_duration' : 'construction_window'}</span> | <span className="font-mono text-[#1e3a8a] bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded font-bold">{analysisView === 'Typical Conditions' ? 'typical_trends' : 'extreme_events'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Control 1: Surface Environment */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-700 font-sans">Surface Environment</label>
                      
                      {/* CSS hover tooltip */}
                      <div className="relative group inline-block">
                        <Info className="w-3.5 h-3.5 text-slate-450 hover:text-[#1e3a8a] cursor-help" />
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 leading-normal font-normal">
                          <p className="font-bold border-b border-slate-705 pb-1 mb-1 text-slate-300">Surface Environment Settings</p>
                          <p className="mb-1"><strong>Grass / Artificial Turf:</strong> Represents conditions associated with natural grass or artificial turf surfaces.</p>
                          <p><strong>Concrete Surface:</strong> Represents conditions associated with exposed concrete environments that may absorb and re-radiate additional heat.</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-1 rounded-lg flex gap-1">
                      <button
                        type="button"
                        onClick={() => setSurfaceMode('Grass / Artificial Turf')}
                        className={`flex-1 text-center py-1.5 px-3 rounded text-xs font-semibold font-sans transition-all outline-none ${
                          surfaceMode === 'Grass / Artificial Turf'
                            ? 'bg-white text-[#1e3a8a] shadow-xs border border-slate-150'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Grass / Turf
                      </button>
                      <button
                        type="button"
                        onClick={() => setSurfaceMode('Concrete Surface')}
                        className={`flex-1 text-center py-1.5 px-3 rounded text-xs font-semibold font-sans transition-all outline-none ${
                          surfaceMode === 'Concrete Surface'
                            ? 'bg-white text-[#1e3a8a] shadow-xs border border-slate-150'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Concrete
                      </button>
                    </div>
                  </div>

                  {/* Control 2: Analysis Period */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-700 font-sans">Analysis Period</label>
                      
                      {/* CSS hover tooltip */}
                      <div className="relative group inline-block">
                        <Info className="w-3.5 h-3.5 text-slate-455 hover:text-[#1e3a8a] cursor-help" />
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 leading-normal font-normal">
                          <p className="font-bold border-b border-slate-710 pb-1 mb-1 text-slate-300">Analysis Period Scope</p>
                          <p className="mb-1"><strong>Entire Study Period:</strong> Displays conditions across the full available observation period.</p>
                          <p><strong>Construction Period Only:</strong> Focuses on the estimated period during which construction, renovation, modernization, expansion, or major preparation activities occurred at the selected venue.</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-1 rounded-lg flex gap-1">
                      <button
                        type="button"
                        onClick={() => setAnalysisPeriod('Entire Study Period')}
                        className={`flex-1 text-center py-1.5 px-3 rounded text-xs font-semibold font-sans transition-all outline-none ${
                          analysisPeriod === 'Entire Study Period'
                            ? 'bg-white text-[#1e3a8a] shadow-xs border border-slate-150'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Entire Period
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnalysisPeriod('Construction Period Only')}
                        className={`flex-1 text-center py-1.5 px-3 rounded text-xs font-semibold font-sans transition-all outline-none ${
                          analysisPeriod === 'Construction Period Only'
                            ? 'bg-white text-[#1e3a8a] shadow-xs border border-slate-150'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Construction Only
                      </button>
                    </div>
                  </div>

                  {/* Control 3: Analysis View */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-700 font-sans">Analysis View</label>
                      
                      {/* CSS hover tooltip */}
                      <div className="relative group inline-block">
                        <Info className="w-3.5 h-3.5 text-slate-460 hover:text-[#1e3a8a] cursor-help" />
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 leading-normal font-normal">
                          <p className="font-bold border-b border-slate-715 pb-1 mb-1 text-slate-300">Analysis View Mode</p>
                          <p className="mb-1"><strong>Typical Conditions:</strong> Highlights average and seasonal heat conditions.</p>
                          <p><strong>Extreme Events:</strong> Highlights the most severe heat exposure conditions observed in the dataset.</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-1 rounded-lg flex gap-1">
                      <button
                        type="button"
                        onClick={() => setAnalysisView('Typical Conditions')}
                        className={`flex-1 text-center py-1.5 px-3 rounded text-xs font-semibold font-sans transition-all outline-none ${
                          analysisView === 'Typical Conditions'
                            ? 'bg-white text-[#1e3a8a] shadow-xs border border-slate-150'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Typical
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnalysisView('Extreme Events')}
                        className={`flex-1 text-center py-1.5 px-3 rounded text-xs font-semibold font-sans transition-all outline-none ${
                          analysisView === 'Extreme Events'
                            ? 'bg-white text-[#1e3a8a] shadow-xs border border-slate-150'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Extreme Events
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* STICKY TAB WRAPPER */}
              <nav className="flex flex-wrap gap-x-8 gap-y-2 px-4 md:px-6 bg-white border-b border-slate-200 shrink-0 mb-8 overflow-x-auto scrollbar-none">
                
                {/* Tab: Overview */}
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 select-none focus:outline-none ${
                    activeTab === 'overview'
                      ? 'border-blue-900 text-blue-900'
                      : 'border-transparent text-slate-500 hover:text-blue-900 hover:border-slate-200'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" /> Overview
                </button>

                {/* Tab: Venue Explorer */}
                <button
                  onClick={() => setActiveTab('explorer')}
                  className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 select-none focus:outline-none ${
                    activeTab === 'explorer'
                      ? 'border-blue-900 text-blue-900'
                      : 'border-transparent text-slate-500 hover:text-blue-900 hover:border-slate-200'
                  }`}
                >
                  <Compass className="w-4 h-4 shrink-0" /> Venue Explorer
                </button>

                {/* Tab: Seasonal Analysis */}
                <button
                  onClick={() => setActiveTab('seasonal')}
                  className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 select-none focus:outline-none ${
                    activeTab === 'seasonal'
                      ? 'border-blue-900 text-blue-900'
                      : 'border-transparent text-slate-500 hover:text-blue-900 hover:border-slate-200'
                  }`}
                >
                  <Calendar className="w-4 h-4 shrink-0" /> Seasonal Analysis
                </button>

                {/* Tab: Extreme Events */}
                <button
                  onClick={() => setActiveTab('extremes')}
                  className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 select-none focus:outline-none ${
                    activeTab === 'extremes'
                      ? 'border-blue-900 text-blue-900'
                      : 'border-transparent text-slate-500 hover:text-blue-900 hover:border-slate-200'
                  }`}
                >
                  <Flame className="w-4 h-4 shrink-0" /> Extreme Events
                </button>

                {/* Tab: Methodology */}
                <button
                  onClick={() => setActiveTab('methodology')}
                  className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 select-none focus:outline-none ${
                    activeTab === 'methodology'
                      ? 'border-blue-900 text-blue-900'
                      : 'border-transparent text-slate-500 hover:text-blue-900 hover:border-slate-200'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" /> Methodology
                </button>

                {/* Tab: Heat Risk Guidance */}
                <button
                  onClick={() => setActiveTab('guidance')}
                  className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 select-none focus:outline-none ${
                    activeTab === 'guidance'
                      ? 'border-blue-900 text-blue-900'
                      : 'border-transparent text-slate-500 hover:text-blue-900 hover:border-slate-200'
                  }`}
                >
                  <Scale className="w-4 h-4 shrink-0" /> Heat Risk Guidance
                </button>

                {/* Tab: Downloads */}
                <button
                  onClick={() => setActiveTab('downloads')}
                  className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 select-none focus:outline-none ${
                    activeTab === 'downloads'
                      ? 'border-blue-900 text-blue-900'
                      : 'border-transparent text-slate-500 hover:text-blue-900 hover:border-slate-200'
                  }`}
                >
                  <Download className="w-4 h-4 shrink-0" /> Downloads
                </button>

              </nav>

              {/* RENDER THE RELEVANT ACTIVE TAB WITH TRANSITIONS */}
              <AnimatePresence mode="wait">
                
                {/* 1. OVERVIEW PAGE TAB */}
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-8"
                  >
                    {/* Top Climatological KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      
                      {/* KPI 1 */}
                      <div
                        onMouseEnter={() => setHoveredKpi('highest')}
                        onMouseLeave={() => setHoveredKpi(null)}
                        className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-blue-900 transition-colors duration-200 relative cursor-help"
                      >
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1.5">Highest Risk Venue</span>
                        <span className="text-sm font-bold text-slate-900 block leading-tight truncate" title={summaryKpis.highestRiskVenue}>
                          {summaryKpis.highestRiskVenue}
                        </span>
                        <span className="text-xs font-semibold text-red-650 block mt-1">{summaryKpis.highestRiskSubText}</span>
                        {hoveredKpi === 'highest' && (
                          <div className="absolute top-full left-0 right-0 z-40 mt-1.5 bg-slate-900 text-white text-[10px] p-2.5 rounded shadow-lg leading-relaxed font-medium">
                            The match venue experiencing the grandest cumulative heat exposure stress in the active analysis view.
                          </div>
                        )}
                      </div>

                      {/* KPI 2 */}
                      <div
                        onMouseEnter={() => setHoveredKpi('hottest')}
                        onMouseLeave={() => setHoveredKpi(null)}
                        className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-blue-900 transition-colors duration-200 relative cursor-help"
                      >
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1.5">Hottest Camp</span>
                        <span className="text-sm font-bold text-slate-900 block leading-tight truncate" title={summaryKpis.hottestCampName}>
                          {summaryKpis.hottestCampName}
                        </span>
                        <span className="text-xs font-semibold text-orange-655 block mt-1">{summaryKpis.hottestCampSubText}</span>
                        {hoveredKpi === 'hottest' && (
                          <div className="absolute top-full left-0 right-0 z-40 mt-1.5 bg-slate-900 text-white text-[10px] p-2.5 rounded shadow-lg leading-relaxed font-semibold font-medium">
                            The training camp or base facility registering the highest thermal burden.
                          </div>
                        )}
                      </div>

                      {/* KPI 3 */}
                      <div
                        onMouseEnter={() => setHoveredKpi('hrs')}
                        onMouseLeave={() => setHoveredKpi(null)}
                        className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-blue-900 transition-colors duration-200 relative cursor-help"
                      >
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1.5">{summaryKpis.card3Label}</span>
                        <span className="text-sm font-bold text-slate-900 block leading-tight">{summaryKpis.card3Value}</span>
                        <span className="text-xs text-slate-550 font-medium block mt-1 truncate">{summaryKpis.card3SubText}</span>
                        {hoveredKpi === 'hrs' && (
                          <div className="absolute top-full left-0 right-0 z-40 mt-1.5 bg-slate-900 text-white text-[10px] p-2.5 rounded shadow-lg leading-relaxed font-semibold font-medium">
                            Representative Wet Bulb Globe Temperature (WBGT) cumulative stress totals or baseline averages across in-scope locations.
                          </div>
                        )}
                      </div>

                      {/* KPI 4 */}
                      <div
                        onMouseEnter={() => setHoveredKpi('days')}
                        onMouseLeave={() => setHoveredKpi(null)}
                        className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-blue-900 transition-colors duration-200 relative cursor-help"
                      >
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1.5">{summaryKpis.card4Label}</span>
                        <span className="text-sm font-bold text-slate-900 block leading-tight">{summaryKpis.card4Value}</span>
                        <span className="text-xs text-slate-550 font-medium block mt-1 truncate" title={summaryKpis.card4SubText}>{summaryKpis.card4SubText}</span>
                        {hoveredKpi === 'days' && (
                          <div className="absolute top-full left-0 right-0 z-40 mt-1.5 bg-slate-900 text-white text-[10px] p-2.5 rounded shadow-lg leading-relaxed font-semibold font-medium">
                            Exceedance metrics representing number of calendar days experiencing significant environmental heat thresholds.
                          </div>
                        )}
                      </div>

                      {/* KPI 5 */}
                      <div
                        onMouseEnter={() => setHoveredKpi('longest')}
                        onMouseLeave={() => setHoveredKpi(null)}
                        className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-blue-900 transition-colors duration-200 relative cursor-help"
                      >
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1.5">{summaryKpis.card5Label}</span>
                        <span className="text-sm font-bold text-slate-900 block leading-tight">{summaryKpis.card5Value}</span>
                        <span className="text-xs text-red-650 font-bold block mt-1 truncate" title={summaryKpis.card5SubText}>{summaryKpis.card5SubText}</span>
                        {hoveredKpi === 'longest' && (
                          <div className="absolute top-full left-0 right-0 z-40 mt-1.5 bg-slate-900 text-white text-[10px] p-2.5 rounded shadow-lg leading-relaxed font-semibold font-medium">
                            Duration limit representing longest consecutive heat wave events crossing safety bands.
                          </div>
                        )}
                      </div>

                      {/* KPI 6 */}
                      <div
                        onMouseEnter={() => setHoveredKpi('window')}
                        onMouseLeave={() => setHoveredKpi(null)}
                        className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-blue-900 transition-colors duration-200 relative cursor-help"
                      >
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1.5">{summaryKpis.card6Label}</span>
                        <span className="text-sm font-bold text-slate-900 block leading-tight">{summaryKpis.card6Value}</span>
                        <span className="text-xs text-slate-550 font-medium block mt-1 truncate" title={summaryKpis.card6SubText}>{summaryKpis.card6SubText}</span>
                        {hoveredKpi === 'window' && (
                          <div className="absolute top-full left-0 right-0 z-40 mt-1.5 bg-slate-900 text-white text-[10px] p-2.5 rounded shadow-lg leading-relaxed font-semibold font-medium">
                            The critical daily interval experiencing peak solar angle heat stress load.
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Left Rank Bars vs Right Overview map */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Bar chart - 7 cols */}
                      <div className="lg:col-span-7">
                        <RankingBarChart
                          stadiums={filteredStadiums}
                          metric={analysisView === 'Extreme Events' ? 'maxWBGT' : 'avgWBGT'}
                          metricTitle={analysisView === 'Extreme Events' ? 'Peak Wet Bulb Globe Temperature (WBGT) Max' : 'Average Wet Bulb Globe Temperature (WBGT) Mean'}
                        />
                      </div>

                      {/* Geographic insights - 5 cols */}
                      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                        <div className="border-b border-slate-100 pb-2">
                          <h4 className="text-xs font-extrabold text-blue-800 uppercase tracking-widest flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" /> Geographic Hotspot Summary
                          </h4>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Climatic exposure classifications by location type</p>
                        </div>
                        
                        <div className="space-y-4 text-xs">
                          {/* Paragraph detail */}
                          <p className="leading-relaxed text-slate-600">
                            Our geographic assessments indicate that venues clustered around the Gulf of Mexico (Miami, Houston) and low-elevation inland plains of Texas (Mansfield) register the highest cumulative heat burdens. High relative humidity prevents moisture evaporation from human skin, amplifying environmental strain.
                          </p>

                          <div className="bg-slate-50 p-4 rounded-lg flex flex-col gap-2">
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>Match Stadium average heat:</span>
                              <span className="text-blue-800">13.6°C WBGT</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>Base Camp (Training) average heat:</span>
                              <span className="text-orange-600">17.3°C WBGT</span>
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={() => {
                                setCurrentView('landing');
                                setTimeout(() => {
                                  document.getElementById('observatory-map')?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                              }}
                              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                            >
                              Open map viewer on Title Page <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* ACTIVE ANALYSIS MODE NOTIFIER BANNER */}
                    <div id="active-analysis-banner" className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-3xs ${
                      analysisView === 'Extreme Events'
                        ? 'bg-red-50/70 border-red-200 text-red-950'
                        : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    }`}>
                      <div className="flex items-start sm:items-center gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          analysisView === 'Extreme Events' ? 'bg-red-100 text-red-700 font-bold' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {analysisView === 'Extreme Events' ? <Flame className="w-5 h-5" /> : <Sun className="w-5 h-5 text-emerald-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Observatory Filter Mode</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              analysisView === 'Extreme Events' ? 'bg-red-200 text-red-900' : 'bg-emerald-200 text-emerald-950'
                            }`}>
                              System Live
                            </span>
                          </div>
                          <h5 className="text-sm font-black leading-tight mt-0.5">
                            {analysisView === 'Extreme Events' ? 'Extreme Exposure Events (Peak Maxima Metrics)' : 'Typical Climatological Conditions (Baseline Averages)'}
                          </h5>
                          <p className="text-[11px] text-slate-600 mt-1 font-medium leading-relaxed max-w-2xl">
                            {analysisView === 'Extreme Events'
                              ? 'Exposing worst-case peak Wet Bulb Globe Temperature (WBGT) maxima, absolute daytime peak temperatures, and total counts of high-risk threshold exceedances across all selected arenas and training camps.'
                              : 'Exposing typical average summer Wet Bulb Globe Temperature (WBGT), standard daily climate profiles, and climatological seasonal baselines across in-scope FIFA locations.'}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 font-mono text-[10px] bg-white/80 border px-2.5 py-1 rounded font-extrabold shadow-3xs self-start sm:self-center">
                        {analysisView === 'Extreme Events' ? 'MODE: PEAK_WBGT_EXCEEDANCE' : 'MODE: CLIMATOLOGY_MEAN'}
                      </div>
                    </div>

                    {/* Bottom visual grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <MonthlyComboChart
                        months={dashboardData.months}
                        title="Composite monthly averages across all 17 FIFA World Cup 2026 locations"
                      />
                      <HourlyTrendChart
                        hours={dashboardData.hours}
                        title="Composite hourly Wet Bulb Globe Temperature (WBGT) vs Dry Air Temperature"
                        analysisView={analysisView}
                      />
                    </div>

                    {/* Mandatory Alert caveat regarding pre-structured HTML base details */}
                    <div className="p-4 bg-orange-50 border-l-4 border-yellow-500 rounded-r-lg text-xs leading-relaxed text-yellow-900 flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-yellow-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block mb-1">Labour Data Caveat (Dashboard Scope Context)</span>
                        In strict compliance with international policy-release requirements and project data boundaries, this dashboard does not contain labor-readiness, active worker incident logs, worker productivity calculations, or workforce preparedness variables. All indicators are drawn cleanly from actual environmental climatological sensors to maintain scientific research validation.
                      </div>
                    </div>

                  </motion.div>
                )}

                {/* 2. VENUE EXPLORER PAGE TAB */}
                {activeTab === 'explorer' && (
                  <motion.div
                    key="explorer"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-8"
                  >
                    
                    {/* Venue dropdown selection */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Observatory Location Focus</label>
                        <p className="text-xs text-slate-500 font-medium mb-2.5">Focus the climatological observatory on any match stadium or training base camp</p>
                        <select
                          className="w-full md:w-80 bg-slate-50 border border-slate-205 rounded p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-900"
                          value={activeSelectedStadium ? activeSelectedStadium.key : ''}
                          onChange={(e) => {
                            const found = dashboardData.stadiums.find(s => s.key === e.target.value);
                            if (found) setSelectedStadium(found);
                          }}
                        >
                          {dashboardData.stadiums.map(st => (
                            <option key={st.key} value={st.key}>
                               {st.name} ({st.type === 'Match' ? 'Match Stadium' : 'Camp Site'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quick Selector buttons row */}
                      <div className="flex flex-wrap gap-1.5 max-w-lg">
                        {dashboardData.stadiums.slice(0, 5).map(st => (
                          <button
                            key={st.key}
                            onClick={() => setSelectedStadium(st)}
                            className={`px-3 py-1.5 rounded text-xs font-semibold border transition duration-150 focus:outline-none ${
                              activeSelectedStadium?.key === st.key
                                ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-300'
                            }`}
                          >
                            {st.name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {activeSelectedStadium && (() => {
                      const selectedStadium = activeSelectedStadium;
                      const MONTHS_DATA = dashboardData.months;
                      const HEATMAP_DATA = dashboardData.heatmap;
                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        {/* Left Side: Metal data profile and Historical extremes  - 4 cols */}
                        <div className="lg:col-span-4 space-y-6">
                          
                          {/* Metadata Card */}
                          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                            <h4 className="text-xs font-extrabold text-blue-800 uppercase tracking-widest border-b border-slate-100 pb-2">
                              Venue Overview Details
                            </h4>
                            <div className="space-y-3 text-xs leading-normal">
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Stadium / Location:</span>
                                <span className="font-bold text-slate-800">{selectedStadium.name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Country:</span>
                                <span className="font-semibold text-slate-800">{selectedStadium.country}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Location Type:</span>
                                <span className={`px-2 py-0.5 rounded-sm font-bold text-[9px] ${
                                  selectedStadium.type === 'Match' ? 'bg-blue-100 text-blue-805' : 'bg-rose-100 text-rose-950'
                                }`}>
                                  {selectedStadium.type === 'Match' ? 'Match Stadium' : 'Case Study Site'}
                                </span>
                              </div>
                              <div className="flex justify-between2 flex-col">
                                <span className="text-slate-500 font-semibold block mb-0.5">Assigned National Context:</span>
                                <span className="font-bold text-slate-700 block bg-slate-50 p-2 rounded border border-slate-100 italic">
                                  {selectedStadium.assignedTeam}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Centroid Elevation:</span>
                                <span className="font-semibold text-slate-800">{selectedStadium.elevation}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Climate Class:</span>
                                <span className="font-mono font-bold text-emerald-800">{selectedStadium.climateZone}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Spectator Capacity:</span>
                                <span className="font-semibold text-slate-800">{selectedStadium.capacity}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Roof Construction:</span>
                                <span className="font-semibold text-slate-800">{selectedStadium.roof} Type</span>
                              </div>
                            </div>
                          </div>

                          {/* Historical Extremes Card */}
                          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                            <h4 className="text-xs font-extrabold text-red-700 uppercase tracking-widest border-b border-slate-100 pb-2">
                              Historical Extremes & Exceedances
                            </h4>
                            <div className="space-y-3.5 text-xs">
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase font-bold">Highest Air Temperature</span>
                                <span className="text-sm font-black text-slate-800 block mt-0.5">{selectedStadium.maxTemp.toFixed(1)}°C</span>
                                <span className="text-[10px] text-slate-400 block font-medium">Observed: {selectedStadium.maxTempDate}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase font-bold">Highest WBGT Heat Stress Limit</span>
                                <span className="text-sm font-black text-red-600 block mt-0.5">{selectedStadium.maxWBGT.toFixed(1)}°C</span>
                                <span className="text-[10px] text-slate-400 block font-medium">Observed: {selectedStadium.maxWBGTDate}</span>
                              </div>
                              <div className="pt-2 border-t border-slate-100">
                                <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1.5">Renovation & Infrastructure Scope</span>
                                <p className="text-[11px] text-slate-600 leading-relaxed font-semibold italic bg-blue-50/20 p-2.5 rounded border border-blue-100/60">
                                  "{selectedStadium.renovationDetails}"
                                </p>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Right Side: Charts, Exceedance metrics, and Technical download. - 8 cols */}
                        <div className="lg:col-span-8 space-y-6">
                          
                          {/* POLICY ORIENTED EXCEEDANCE METRICS (EXCLUDING ACUTE MAXIMA) */}
                          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
                              Environmental Danger Profiles (Non-Acute Exposure Years Log)
                            </h4>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">High-Risk Hours</span>
                                <span className="text-lg font-black text-slate-800 block">{selectedStadium.highRiskHours} hrs</span>
                                <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">WBGT ≥ 28°C total</span>
                              </div>
                              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">High-Risk Days</span>
                                <span className="text-lg font-black text-slate-800 block">{selectedStadium.highRiskDays} days</span>
                                <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Annual active danger days</span>
                              </div>
                              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Longest Heat Event</span>
                                <span className="text-lg font-black text-red-600 block">{selectedStadium.longestHeatEvent} hrs</span>
                                <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Consecutive hours ex. 28°C</span>
                              </div>
                              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Streak Exceedance</span>
                                <span className="text-lg font-black text-slate-800 block">{selectedStadium.consecutiveExceedanceDays} days</span>
                                <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Consecutive threshold exceed.</span>
                              </div>
                            </div>
                          </div>

                          {/* INTERACTIVE MONTH-BY-MONTH GRID */}
                          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                            <div className="border-b border-slate-100 pb-2">
                              <h4 className="text-xs font-extrabold text-blue-800 uppercase tracking-widest">
                                Interactive Heat Risk Calendar Matrix
                              </h4>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Select a month to view seasonal health guidance specific to {selectedStadium.name}</p>
                            </div>

                            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1.5">
                              {MONTHS_DATA.map((m) => {
                                // Extract the corresponding month's average WBGT for selected venue
                                const heatmapObj = dashboardData.heatmap.find(h => h.stadiumKey === selectedStadium.key);
                                const fallbackWBGT = analysisView === 'Extreme Events' ? selectedStadium.maxWBGT : selectedStadium.avgWBGT;
                                const monthlyWbgt = heatmapObj ? heatmapObj.monthlyWbgts[m.month] : fallbackWBGT;
                                const isSelectedMonth = explorerMonth === m.month;

                                return (
                                  <button
                                    key={m.month}
                                    onClick={() => setExplorerMonth(m.month)}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all border flex flex-col items-center justify-center ${
                                      isSelectedMonth
                                        ? 'ring-2 ring-blue-700 ring-offset-1 font-black transform scale-102 border-blue-900'
                                        : 'hover:brightness-95 border-slate-200'
                                    }`}
                                    style={{
                                      backgroundColor: getRiskColorHex(monthlyWbgt),
                                      color: monthlyWbgt >= 18 ? '#fff' : '#1e293b'
                                    }}
                                  >
                                    <span className="opacity-80 text-[10px]">{m.name}</span>
                                    <span className="text-sm font-black">{monthlyWbgt.toFixed(1)}°</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Monthly interactive feedback details */}
                            {explorerMonth && (() => {
                              const heatmapObj = dashboardData.heatmap.find(h => h.stadiumKey === selectedStadium.key);
                              const fallbackWBGT = analysisView === 'Extreme Events' ? selectedStadium.maxWBGT : selectedStadium.avgWBGT;
                              const val = heatmapObj ? heatmapObj.monthlyWbgts[explorerMonth] : fallbackWBGT;
                              const currentMonthObj = MONTHS_DATA.find(m => m.month === explorerMonth);
                              const risk = getRiskLevel(val);
                              
                              let adviceDesc = "Normal activity expected. Perfect athletic operational climate.";
                              if (val >= 32) adviceDesc = "Extreme risk. Heat illness can strike rapidly. Suspend prolonged outdoor activity and heavy labor.";
                              else if (val >= 30) adviceDesc = "Very high risk. Heat exhaustion likely. Rotate shifts, provide direct air conditioning corridors and salt tab water.";
                              else if (val >= 28) adviceDesc = "High risk of heat cramps and muscular failures. regular mandatory cooling breaks inside the shaded areas.";
                              else if (val >= 26) adviceDesc = "Moderate risk. Fatigue onset begins under continuous exposure. Maintain alert hydration systems.";

                              return (
                                <div className="mt-3 p-4 bg-slate-50 border border-slate-100 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs transition-all">
                                  <div>
                                    <div className="font-bold text-slate-800 uppercase text-[10px] tracking-widest mb-1">
                                      {currentMonthObj?.name} Heat Status for {selectedStadium.name}
                                    </div>
                                    <p className="text-slate-600">
                                      Historical Average heat index reaches <strong className="text-slate-900">{val.toFixed(2)}°C WBGT</strong> placing this month in the <strong className="text-slate-900 uppercase font-black">{risk} Risk</strong> category.
                                    </p>
                                    <p className="text-slate-500 mt-1 italic">
                                      Safety advice: {adviceDesc}
                                    </p>
                                  </div>
                                  <div className={`px-3 py-2 rounded-lg font-black text-center text-xs shrink-0 w-32 border ${
                                    val >= 28 ? 'bg-orange-100 text-orange-900 border-orange-200' : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                  }`}>
                                    {risk} Risk Level
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* REUSABLE STADIUM DYNAMIC TEXT REPORT EXPORT BUTTON */}
                          <div className="bg-slate-900 text-slate-100 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 border border-slate-850">
                            <div>
                              <h4 className="text-sm font-bold text-slate-50 flex items-center gap-2">
                                <FileCode className="text-yellow-400 w-5 h-5" /> Generate Venue Technical Dossier
                              </h4>
                              <p className="text-slate-400 text-xs mt-1">
                                Assemble all historical metrics, coordinates, elevations, and risk warnings of {selectedStadium.name} into an official policy-ready assessment dossier.
                              </p>
                            </div>
                            <button
                              onClick={() => downloadVenueReport(selectedStadium)}
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold py-2.5 px-4 transition self-start md:self-auto flex items-center gap-1.5 shrink-0 shadow-sm"
                            >
                              <Download className="w-4 h-4" /> Download Local Dossier
                            </button>
                          </div>

                        </div>
                      </div>
                      );
                    })()}

                  </motion.div>
                )}

                {/* 3. SEASONAL ANALYSIS Tab */}
                {activeTab === 'seasonal' && (
                  <motion.div
                    key="seasonal"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-8"
                  >
                    
                    {/* Country and Roof summary grid blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                        <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest">USA Venues Burden</h4>
                        <div className="text-sm font-extrabold text-slate-800">14.2°C Average WBGT</div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Spans high continental variance. Open air stadiums in eastern coastal clusters (MetLife NJ, Miami, Philadelphia) experience high hot-humid peaks in June.
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                        <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest">Mexico Venues</h4>
                        <div className="text-sm font-extrabold text-slate-800">16.8°C Average WBGT</div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Guadalajara and Mexico City gain relative relief from their extreme high elevations (up to 2,240m) but suffer heavy afternoon solar load. Monterrey experiences arid air heat.
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                        <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest">Canada Venues</h4>
                        <div className="text-sm font-extrabold text-slate-850">8.4°C Average WBGT</div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Vancouver and Toronto present minimal overall baseline risks during early summer match blocks but remain susceptible to micro-hot spells.
                        </p>
                      </div>

                    </div>

                    {/* DENSE HEATMAP GRID MATRIX (Stadium by month) - POLICY CORE COMPONENT */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                      <div className="border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Stadium-by-Month Environmental WBGT Heatmap
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Columns map climatological calendar months. Cell colors correspond to the standardized heat risk levels.</p>
                      </div>

                      <div className="overflow-x-auto select-none">
                        <div className="min-w-[760px] grid grid-cols-13 gap-1">
                          
                          {/* Header row */}
                          <div className="text-xs font-bold text-slate-500 p-2 uppercase">Stadium Name</div>
                          {dashboardData.months.map(m => (
                            <div key={m.month} className="text-xs font-bold text-slate-600 text-center p-2 bg-slate-100/60 rounded">
                              {m.name}
                            </div>
                          ))}

                          {/* Stadium rows */}
                          {dashboardData.heatmap.map((hRow) => {
                            const rawStadium = dashboardData.stadiums.find(s => s.key === hRow.stadiumKey);
                            const name = rawStadium ? rawStadium.name : hRow.stadiumName;

                            return (
                              <g key={hRow.stadiumKey} className="contents group">
                                <button
                                  onClick={() => {
                                    if (rawStadium) {
                                      setSelectedStadium(rawStadium);
                                      setActiveTab('explorer');
                                    }
                                  }}
                                  className="text-left text-xs font-bold text-slate-800 py-1.5 px-2 hover:bg-slate-50 rounded truncate transition-colors"
                                >
                                  {name}
                                </button>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                                  const val = hRow.monthlyWbgts[m];
                                  return (
                                    <div
                                      key={m}
                                      className="py-1.5 rounded text-center text-xs font-extrabold flex flex-col justify-center cursor-help transition-all shadow-3xs"
                                      style={{
                                        backgroundColor: getRiskColorHex(val),
                                        color: val >= 18 ? '#fff' : '#334155'
                                      }}
                                      title={`${name} · ${MONTHS_DATA[m-1].name} average: ${val.toFixed(2)}°C WBGT (${getRiskLevel(val)} Risk)`}
                                    >
                                      {val.toFixed(1)}°
                                    </div>
                                  );
                                })}
                              </g>
                            );
                          })}

                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 text-center italic mt-2.5">
                        Click on any stadium name label to head directly to its corresponding detailed, dynamic explorer profile tab.
                      </div>
                    </div>

                    {/* COMPARISONS SEARCHABLE TABULAR TABLE */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="text-xs font-extrabold text-blue-800 uppercase tracking-widest">
                            Comprehensive Climatology Database
                          </h4>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Filter stadiums by free-text typing</p>
                        </div>
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search by name or country..."
                            value={searchComparisonsQuery}
                            onChange={(e) => setSearchComparisonsQuery(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg p-2 pl-9 text-xs w-64 focus:outline-none focus:ring-1 focus:ring-blue-700 font-bold"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-100 rounded-lg">
                        <table className="w-full border-collapse text-left text-xs text-slate-600">
                          <thead>
                            <tr className="bg-slate-100/60 uppercase font-bold text-slate-500 border-b border-slate-200">
                              <th className="p-3">Venue Name</th>
                              <th className="p-3">Country</th>
                              <th className="p-3">Type</th>
                              <th className="p-3 text-center">Avg Temp</th>
                              <th className="p-3 text-center">Max Temp</th>
                              <th className="p-3 text-center">Avg WBGT</th>
                              <th className="p-3 text-center">Max WBGT</th>
                              <th className="p-3 text-center">Humidity</th>
                              <th className="p-3 text-center font-bold">Climate Zone</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sortedStadiumsForComparison.map((st) => (
                              <tr key={st.key} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-bold text-slate-800">{st.name}</td>
                                <td className="p-3 font-semibold text-slate-500">{st.country}</td>
                                <td className="p-3 text-[10px]">
                                  <span className={`px-2 py-0.5 rounded-sm font-bold ${
                                    st.type === 'Match' ? 'bg-blue-50 text-blue-800' : 'bg-orange-50 text-orange-850'
                                  }`}>
                                    {st.type}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono">{st.avgTemp.toFixed(1)}°</td>
                                <td className="p-3 text-center font-mono text-slate-700">{st.maxTemp.toFixed(1)}°</td>
                                <td className="p-3 text-center font-mono font-bold text-emerald-700">{st.avgWBGT.toFixed(1)}°</td>
                                <td className="p-3 text-center font-mono font-bold text-red-600">{st.maxWBGT.toFixed(1)}°</td>
                                <td className="p-3 text-center font-mono">{st.avgRH.toFixed(0)}%</td>
                                <td className="p-3 text-center font-mono text-[10px] text-purple-800 font-bold">{st.climateZone}</td>
                              </tr>
                            ))}
                            {sortedStadiumsForComparison.length === 0 && (
                              <tr>
                                <td colSpan={9} className="p-5 text-center italic text-slate-400">
                                  No stadiums match the search query
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </motion.div>
                )}

                {/* 4. EXTREME EVENTS EXPLORER Tab */}
                {activeTab === 'extremes' && (
                  <motion.div
                    key="extremes"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-8"
                  >
                    

                    
                    <div className="bg-white border border-[#d9e2ec] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                      <div>
                        <h4 className="text-xs font-black text-slate-400 block uppercase tracking-wider mb-1">Filter Observations Logs</h4>
                        <p className="text-[10px] text-slate-400 font-semibold">Expose peak climatology events without confusing acute maxima metrics</p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search by venue or type..."
                            value={searchEventQuery}
                            onChange={(e) => setSearchEventQuery(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg p-2 pl-9 text-xs w-56 font-bold focus:outline-none"
                          />
                        </div>

                        <select
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
                          value={eventCategoryFilter}
                          onChange={(e) => setEventCategoryFilter(e.target.value)}
                        >
                          <option value="All">All Danger Levels</option>
                          <option value="Very High">Very High Risk Log</option>
                          <option value="Extreme">Extreme Risk Log</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {filteredEvents.map((ev, i) => {
                        const isExtreme = ev.riskCategory === 'Extreme';
                        return (
                          <div
                            key={i}
                            className="bg-white border border-slate-200 hover:border-slate-350 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 transition shadow-2xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  isExtreme ? 'bg-red-100 text-red-900 border-red-200' : 'bg-yellow-100 text-yellow-900 border-yellow-200'
                                }`}>
                                  {ev.riskCategory} Risk Event
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{ev.type} Category</span>
                              </div>
                              <h4 className="text-sm font-black text-slate-900 leading-tight">
                                {ev.stadium} · {ev.country}
                              </h4>
                              <p className="text-xs text-slate-400">
                                Climatological Trigger registered: <strong className="text-slate-600 font-semibold">{ev.date} Local Zone</strong>
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
                              <div className="bg-slate-50 p-2 px-3 rounded-lg text-center min-w-24">
                                <span className="text-[9px] text-slate-400 block uppercase">Peak WBGT</span>
                                <span className="font-extrabold text-[#c1292e] text-sm mt-0.5">{ev.peakWBGT.toFixed(2)}°C</span>
                              </div>
                              <div className="bg-slate-50 p-2 px-3 rounded-lg text-center min-w-24">
                                <span className="text-[9px] text-slate-400 block uppercase">Peak Air Temp</span>
                                <span className="font-extrabold text-slate-800 text-sm mt-0.5">{ev.peakTemp.toFixed(1)}°C</span>
                              </div>
                              <div className="bg-slate-50 p-2 px-3 rounded-lg text-center min-w-24">
                                <span className="text-[9px] text-slate-400 block uppercase">RH vapor load</span>
                                <span className="font-extrabold text-slate-800 text-sm mt-0.5">{ev.peakRH.toFixed(0)}%</span>
                              </div>
                              <div className="bg-slate-50 p-2 px-3 rounded-lg text-center min-w-24">
                                <span className="text-[9px] text-slate-400 block uppercase">Event duration</span>
                                <span className="font-extrabold text-slate-800 text-sm mt-0.5">{ev.duration} hrs</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {filteredEvents.length === 0 && (
                        <div className="bg-white border rounded-xl p-10 text-center italic text-slate-400 shadow-2xs">
                          No extreme heat records match the filter criteria
                        </div>
                      )}
                    </div>

                  </motion.div>
                )}

                {/* 5. METHODOLOGY PAGE Tab */}
                {activeTab === 'methodology' && (
                  <motion.div
                    key="methodology"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-8"
                  >
                    
                    {/* Header Banner */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm">
                      <div className="max-w-3xl">
                        <span className="text-[10px] font-bold tracking-widest text-blue-900 uppercase">Scientific & Policy Methodology</span>
                        <h2 className="text-2xl font-black text-slate-900 mt-1.5 mb-3">
                          Analytical Framework & Observational Data Protocol
                        </h2>
                        <p className="text-sm text-slate-650 leading-relaxed font-semibold">
                          The FIFA 2026 Heat Risk Observatory operates as a research-grade screening tool to assess, analyze, and communicate environmental heat stress threats at host locations. This page details our core scientific metrics, calculation baselines, and data architecture.
                        </p>
                      </div>
                    </div>

                    {/* Main Two-Column Report Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      
                      {/* Left: Main Content (8 Columns) */}
                      <div className="lg:col-span-8 space-y-8">
                        
                        {/* Section: Project Objective */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-800" />
                            1. Project Objective & Strategic Vision
                          </h3>
                          <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                            <p>
                              The primary objective of this observatory is to evaluate historical and projected environmental heat stress conditions across all 17 official venue cities and selected case-study training bases designated for the FIFA World Cup 2026. Keep in mind that while FIFA 2026 has been characterized as requiring no new stadium construction, significant expansion, upgrades, and renovation have occurred, mobilizing large workforces under intense thermal loads.
                            </p>
                            <p>
                              As a heat-risk screening and policy-oriented research tool, this platform translates complex climate datasets into actionable occupational health policies, labor protections, and operational hazard calendars.
                            </p>
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 font-semibold italic text-slate-700">
                              "Our guiding mission is to establish solid, data-supported linkages between environmental risk parameters and active labor safeguards—ensuring that stadium renovations and operations do not place migrant workers or local athletes in conditions of severe physical danger."
                            </div>
                          </div>
                        </section>

                        {/* Section: Heat Stress Assessment */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-red-700" />
                            2. Heat Stress Metric: Wet Bulb Globe Temperature (WBGT)
                          </h3>
                          <div className="text-xs text-slate-600 space-y-3.5 leading-relaxed">
                            <p>
                              To capture the genuine physiological impact of extreme weather on human health, the observatory implements the <strong>Wet Bulb Globe Temperature (WBGT)</strong> index as its primary risk metric, rather than relying on standard dry air temperature.
                            </p>
                            <p>
                              Standardized by <strong>ISO 7243</strong> and adopted across occupational medicine and global sports governing bodies, WBGT aggregates four critical variables:
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1.5">
                              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-lg">
                                <span className="font-bold text-slate-800 block text-[11px] mb-0.5">Dry Bulb Temperature</span>
                                <span className="text-slate-500">Standard ambient air temperature measured in the shade.</span>
                              </div>
                              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-lg">
                                <span className="font-bold text-[#1e3a8a] block text-[11px] mb-0.5">Natural Wet Bulb Temperature</span>
                                <span className="text-slate-500">Represents the cooling effect of sweat evaporation based on relative humidity.</span>
                              </div>
                              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-lg">
                                <span className="font-bold text-amber-700 block text-[11px] mb-0.5">Globe Temperature</span>
                                <span className="text-slate-500">Accounts for direct radiant heat load from solar exposure and nearby surfaces.</span>
                              </div>
                              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-lg">
                                <span className="font-bold text-slate-700 block text-[11px] mb-0.5">Wind Velocity</span>
                                <span className="text-slate-500">Influences convective cooling and skin surface heat exchange mechanisms.</span>
                              </div>
                            </div>

                            <p className="pt-2">
                              A WBGT reading of <strong>28°C or above</strong> represents a severe physiological threshold. At this range, heat exchange slows down, dramatically increasing muscular exhaustion, dehydration, and potentially fatal heat stroke.
                            </p>
                          </div>
                        </section>

                        {/* Section: Centralised Data Abstraction Architecture */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Database className="w-5 h-5 text-emerald-800" />
                            3. Centralized Data Architecture & Parameter Safety
                          </h3>
                          <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                            <p>
                              A core pillar of our modern, research-grade software paradigm is the <strong>centralized data-provider abstraction layer</strong> (implemented via the robust <code>getDashboardData()</code> paradigm).
                            </p>
                            <p>
                              Whenever a user updates a control in the interface (such as switching from <strong>Grass</strong> to <strong>Concrete</strong> microclimates, or adjusting the active <strong>Analysis Period</strong>), individual charts, maps, and matrices do not perform isolated or ad-hoc operations. Instead, they request a synchronized, filtered dataset from the single central layer. This architecture ensures absolute data consistency across all views:
                            </p>
                            <ul className="list-disc pl-5 space-y-1.5 text-slate-500 font-semibold">
                              <li>Guarantees that the metrics shown in the Overview statistics perfectly align with the values displayed on the charts and matrices.</li>
                              <li>Provides a single, isolated module to plug in high-frequency live instruments or alternative NetCDF climate datasets in the future.</li>
                              <li>Prevents silent code regressions by keeping dataset filtering separate from JSX layout presentation components.</li>
                            </ul>
                          </div>
                        </section>

                        {/* Section: Future Datasets Integration */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-blue-700" />
                            4. Preparations for Future High-Fidelity Datasets
                          </h3>
                          <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                            <p>
                              This observatory has been intentionally engineered to receive upcoming, high-fidelity microclimatology parameters. Our unified data state is pre-aligned to integrate:
                            </p>
                            
                            <dl className="space-y-3 pt-1">
                              <div>
                                <dt className="font-bold text-slate-800">A. Turf Microclimates (Grass vs. Artificial Turf)</dt>
                                <dd className="text-slate-500 pl-4 mt-0.5">Capturing the massive temperature rebound on artificial shock-pads, which can surge WBGT by up to 4°C compared to damp, natural rye grass.</dd>
                              </div>
                              <div>
                                <dt className="font-bold text-slate-800">B. Concrete Microclimates (Dense Urban Venues)</dt>
                                <dd className="text-slate-500 pl-4 mt-0.5">Accounting for the intensive heat island effects around concrete podiums and access plazas where construction work and transit queuing are heavily localized.</dd>
                              </div>
                              <div>
                                <dt className="font-bold text-slate-800">C. Construction Overlay Calendars</dt>
                                <dd className="text-slate-500 pl-4 mt-0.5">Mapping the specific months of active, heavy labor at each host city to understand exact occupational hazardous periods.</dd>
                              </div>
                              <div>
                                <dt className="font-bold text-slate-800">D. High-Frequency Diurnal Peak Loads</dt>
                                <dd className="text-slate-500 pl-4 mt-0.5">Moving beyond daily averages to map exact noon-to-dusk spikes where intense match play or transit queues coincide with maximum incident solar radiation.</dd>
                              </div>
                            </dl>
                          </div>
                        </section>

                      </div>

                      {/* Right: Analytical Sidebar (4 Columns) */}
                      <div className="lg:col-span-4 space-y-6">
                        
                        {/* Analytical Framework Summary */}
                        <div className="bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Framework Quick Facts
                          </h4>
                          
                          <div className="space-y-4 text-xs font-semibold text-slate-600">
                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Standard Reference</span>
                              <span className="text-slate-800 font-bold block">ISO 7243:2017</span>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-normal">Standardized evaluation of environmental heat stress on working men and women.</p>
                            </div>

                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Analysis Period Baseline</span>
                              <span className="text-slate-800 font-bold block">2010 - 2024 Historical</span>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-normal">14 years of multi-decade historical reanalysis of regional and neighborhood microclimates.</p>
                            </div>

                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Occupational Safe Limit</span>
                              <span className="text-blue-900 font-bold block">28.0°C WBGT Threshold</span>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-normal">The point where continuous physical labor requires direct mandatory rest rotations and shade barriers.</p>
                            </div>
                          </div>
                        </div>

                        {/* Research Organizations Credits */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm text-xs text-slate-600">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                            Research Partners
                          </h4>
                          <p className="leading-relaxed">
                            Calculations are compiled, aggregated, and maintained in partnership with civil organizations, occupational health consultants, and academic labor researchers committed to human rights and climate transparency.
                          </p>
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Project Sponsor</span>
                            <span className="text-blue-900 font-extrabold uppercase text-[11px] tracking-wide block mt-1">EQUIDEM RESEARCH CENTER</span>
                          </div>
                        </div>

                      </div>

                    </div>

                  </motion.div>
                )}

                {/* 6. HEAT RISK GUIDANCE Tab */}
                {activeTab === 'guidance' && (
                  <motion.div
                    key="guidance"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-8"
                  >
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      
                      {/* Left: Table details - 8 cols */}
                      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                        <div className="border-b border-slate-100 pb-2.5">
                          <h4 className="text-xs font-extrabold text-blue-800 uppercase tracking-widest">
                            Standardized Wet Bulb Globe Temperature (WBGT) Threat Scale
                          </h4>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Continuous exposure limits and safety threshold mappings</p>
                        </div>

                        <div className="overflow-x-auto border border-slate-100 rounded-lg">
                          <table className="w-full border-collapse text-left text-xs font-semibold text-slate-700">
                            <thead>
                              <tr className="bg-slate-100/60 uppercase font-black text-slate-400 text-[10px] border-b border-slate-200">
                                <th className="p-3.5">WBGT Range</th>
                                <th className="p-3.5">Threat Category</th>
                                <th className="p-3.5">Immediate Physiological Impact Effects</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {HEAT_RISK_THRESHOLDS.map((tr) => (
                                <tr key={tr.level} className="hover:bg-slate-50">
                                  <td className="p-3.5 font-bold font-mono text-sm text-slate-900">{tr.range}</td>
                                  <td className="p-3.5 text-[11px] font-bold">
                                    <span className={`px-2.5 py-1 rounded inline-block text-[10px] font-extrabold uppercase border ${tr.color}`}>
                                      {tr.level} Risk
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-[11px] text-slate-650 leading-relaxed font-semibold italic">{tr.effects}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Right: Scientific Citations - 4 cols */}
                      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
                            Citations & Validation Sources <Scale className="w-4 h-4 text-blue-700" />
                          </h4>
                          <p className="text-[10px] uppercase text-slate-405 font-bold mt-1">This observatory references the following verified publications:</p>
                        </div>

                        <div className="space-y-4 text-xs">
                          {/* Citation 1 */}
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-1.5">
                            <span className="font-extrabold text-blue-800 uppercase text-[9px] block">World Health Organization (WHO)</span>
                            <p className="text-slate-600 leading-relaxed font-semibold italic">
                              "Continuous heat-hydration standards for outdoor assemblies and recreational events. Joint climate health criteria, 2022."
                            </p>
                          </div>

                          {/* Citation 2 */}
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-1.5">
                            <span className="font-extrabold text-blue-800 uppercase text-[9px] block">NIOSH Occupational Heat Stress Recommendations</span>
                            <p className="text-slate-600 leading-relaxed font-semibold italic">
                              "Criteria for a recommended standard: Occupational exposure to heat and hot environments, Department of Human Health Services, Publication 2016-106."
                            </p>
                          </div>

                          {/* Citation 3 */}
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-1.5">
                            <span className="font-extrabold text-blue-800 uppercase text-[9px] block">ISO 7243 Industry Standards</span>
                            <p className="text-slate-600 leading-relaxed font-semibold italic">
                              "Ergonomics of the thermal environment - Assessment of heat stress using the WBGT (wet bulb globe temperature) index, Third Edition, 2017."
                            </p>
                          </div>
                        </div>

                      </div>

                    </div>

                    <div className="bg-white border rounded-xl p-6 text-xs leading-relaxed text-slate-600 space-y-3">
                      <span className="text-slate-900 font-extrabold uppercase text-[10px] tracking-wider block">Why Wet Bulb Globe Temperature (WBGT) is Superior to Air Temperature alone</span>
                      <p>
                        Dry-bulb air temperature doesn't capture the complete thermal stress of direct sun exposure or elevated relative humidity. High relative humidity prevents moisture vaporization from skin, which is the body's primary mechanism of self-cooling. Wind velocity accelerates thermal heat transfer from skin convective layers, while solar radiation represents total thermal rays loading. By combining all four factors, WBGT presents a reliable physiological measurement to assess actual risk levels of human activities on fields and operations.
                      </p>
                    </div>

                  </motion.div>
                )}

                {/* 6. DOWNLOADS TAB */}
                {activeTab === 'downloads' && (
                  <motion.div
                    key="downloads"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-6"
                  >
                    
                    <div className="bg-white border border-[#d9e2ec] rounded-xl p-6 space-y-5 shadow-xs">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">Observations and Resource Center</h4>
                        <p className="text-xs text-slate-500 mt-1">Download raw historical reanalysis text data and official observatory methodologies directly to your local workspace.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-100 flex flex-col justify-between space-y-4">
                          <div className="space-y-1.5">
                            <span className="font-black text-xs text-blue-800 block uppercase">Technical Report (.TXT)</span>
                            <p className="text-[11px] text-slate-500 leading-normal">Contains an executive summary of June-September heat risks, stadium hotspots, and civil society reviews.</p>
                          </div>
                          <button
                            onClick={downloadTechnicalReport}
                            className="w-full bg-slate-205 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold py-2 transition flex items-center justify-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> Download Report
                          </button>
                        </div>

                        <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-100 flex flex-col justify-between space-y-4">
                          <div className="space-y-1.5">
                            <span className="font-black text-xs text-blue-800 block uppercase">Scientific Methodology (.TXT)</span>
                            <p className="text-[11px] text-slate-500 leading-normal">Defines math indices, dewpoint formulas, solar ray boundary modeling, and meteorological criteria.</p>
                          </div>
                          <button
                            onClick={downloadMethodology}
                            className="w-full bg-slate-205 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold py-2 transition flex items-center justify-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> Download Methods
                          </button>
                        </div>

                        <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-100 flex flex-col justify-between space-y-4">
                          <div className="space-y-1.5">
                            <span className="font-black text-xs text-blue-800 block uppercase">Metadata Specs Details (.TXT)</span>
                            <p className="text-[11px] text-slate-500 leading-normal">Complete mapping of variable attributes, database structure units, Köppen codes, and elevation parameters.</p>
                          </div>
                          <button
                            onClick={downloadDataDictionary}
                            className="w-full bg-slate-205 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold py-2 transition flex items-center justify-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> Download Specs
                          </button>
                        </div>

                      </div>
                    </div>

                    {/* Proactive human rights standards safety policy recommendations */}
                    <div className="bg-white border rounded-xl p-6 text-xs leading-relaxed text-slate-650 space-y-4">
                      <h4 className="text-slate-950 font-extrabold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-4.5 h-4.5 text-blue-900" /> Observatory Policy Action Mandates for Football Associations and Cities
                      </h4>
                      <p>
                        Based on these historical findings, EQUIDEM outlines immediate protective actions that municipal authorities and stadium operators must enforce during the FIFA World Cup 2026 preparation phases:
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-slate-550 font-semibold">
                        <li>
                          <strong className="text-slate-800">Compulsory Automated Warnings:</strong> Establish direct electronic sirens triggered automatically when WBGT reaches 28.0°C to halt or shift active exertion schedules.
                        </li>
                        <li>
                          <strong className="text-slate-800">Dynamic Active Rest Shading Structures:</strong> Install mobile active mounters with high solar reflectivity and physical water mist cooling lines along active staging walks.
                        </li>
                        <li>
                          <strong className="text-slate-800">Micro-climatological Real-time Stations:</strong> Install active physical meteorological sensors in every stadium corner to map actual local wind velocity and relative humidity rather than general metropolitan indicators.
                        </li>
                      </ul>
                    </div>

                  </motion.div>
                )}

              </AnimatePresence>

            </div>
          )}
        </AnimatePresence>
      </main>

      {/* STICKY FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-20 py-6 px-6 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between text-xs text-slate-500 gap-4">
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-800">EQUIDEM Climate Observatory Data Div</h4>
            <p>© 2026 EQUIDEM. All human safety analysis and weather modeling resources are open and public.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-slate-400 font-semibold font-mono text-[10px]">
            <span>Version: 3.1.2026</span>
            <span>·</span>
            <span>Baseline: ERA5/NASA</span>
            <span>·</span>
            <span>Target: Human Rights Compliant Safety</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
