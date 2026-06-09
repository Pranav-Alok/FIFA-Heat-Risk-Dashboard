import { useState, useMemo, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { TempUnit, formatTemp, formatTempNumber } from './tempUnit';
import { motion, AnimatePresence } from 'motion/react';
import {
  STADIUMS_DATA,
  MONTHS_DATA,
  HOURS_DATA,
  EXTREME_EVENTS_DATA,
  HEATMAP_DATA,
  HEAT_RISK_THRESHOLDS,
  Stadium,
  ExtremeEvent,
  getDashboardData,
  WorkloadType,
  WorkRestRegimenType,
  getACGIHThreshold,
  getACGIHRiskCategory,
  getACGIHRiskColorHex,
  getACGIHRiskTailwindClass,
} from './data';
import InteractiveMap from './components/InteractiveMap';
import MiniHotspotMap from './components/MiniHotspotMap';
import {
  getConstructionInfo,
  getTimelinePosition,
  STUDY_START_DATE,
  STUDY_END_DATE,
  formatDateShort,
} from './constructionData';
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
  ChevronUp,
  ChevronDown,
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

function StadiumTimeline({ stadiumKey }: { stadiumKey: string }) {
  const position = getTimelinePosition(stadiumKey);
  const info = getConstructionInfo(stadiumKey);

  return (
    <div className="space-y-1.5 mt-1 font-sans text-xs">
      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold tracking-tight uppercase">
        <span>Jan 2024</span>
        <span className="text-slate-500">Full Study Period ({info.durationDays} Days Active)</span>
        <span>May 2026</span>
      </div>
      
      {/* ProgressBar/Timeline track container */}
      <div className="relative w-full h-8 bg-slate-100 border border-slate-200 rounded overflow-hidden shadow-inner flex items-center">
        {/* Subtle division increments */}
        <div className="absolute inset-y-0 left-1/4 border-l border-slate-200/50 border-dashed"></div>
        <div className="absolute inset-y-0 left-2/4 border-l border-slate-200/50 border-dashed"></div>
        <div className="absolute inset-y-0 left-3/4 border-l border-slate-200/50 border-dashed"></div>
        
        {/* Full Study overlay label line background (the dashed connectors) */}
        <div className="absolute left-[5%] right-[5%] border-b border-slate-350 border-dotted h-0 pointer-events-none"></div>

        {/* Highlighted construction period segment bar */}
        <div
          className="absolute h-full bg-blue-900 hover:bg-blue-800 transition-all cursor-help flex flex-col items-center justify-center text-[9px] font-black text-white shadow-md rounded-sm px-1"
          style={{ left: `${position.left}%`, width: `${position.width}%` }}
          title={`Construction Window: ${info.formattedRangeShort} (${info.durationDays} days)`}
        >
          {position.width >= 12 && (
            <span className="truncate max-w-full">Construction</span>
          )}
          {position.width >= 18 && (
            <span className="text-[8px] opacity-90 truncate max-w-full font-bold">{info.durationDays}d</span>
          )}
        </div>
      </div>
      
      <div className="flex justify-between items-center text-[9px] text-slate-500 font-medium font-sans">
        <span>Start: 1 Jan 2024</span>
        <span className="font-extrabold text-[#1e3a8a] bg-blue-50/60 px-1.5 py-0.5 rounded border border-blue-100/50">
          Share: {info.sharePercentage}%
        </span>
        <span>End: 28 May 2026</span>
      </div>
    </div>
  );
}

const WBGT_FACTOR_INFO: Record<string, {
  name: string;
  role: string;
  influence: string;
  influenceLevel: string;
  badgeColor: string;
  dotColor: string;
}> = {
  temp: {
    name: 'Air Temperature',
    role: "Air temperature represents the ambient heat of the surrounding environment and contributes directly to thermal stress. Higher air temperatures reduce the body's ability to dissipate heat and increase overall heat exposure.",
    influence: 'Moderate contribution to WBGT, particularly during hot daytime conditions.',
    influenceLevel: 'Moderate influence',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  humid: {
    name: 'Humidity (Wet Bulb)',
    role: "Humidity affects the body's ability to cool itself through sweat evaporation. High humidity reduces evaporative cooling efficiency and is often one of the most important contributors to heat stress.",
    influence: 'Typically the strongest contributor to elevated WBGT values.',
    influenceLevel: 'High influence',
    badgeColor: 'bg-red-50 text-red-800 border-red-200',
    dotColor: 'bg-red-500',
  },
  sun: {
    name: 'Solar Radiation',
    role: "Solar radiation increases heat exposure through direct sunlight and radiant heat absorbed by surfaces and the human body.",
    influence: 'Can significantly increase WBGT during clear-sky daytime conditions.',
    influenceLevel: 'Moderate influence',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  wind: {
    name: 'Wind Speed',
    role: "Wind enhances convective and evaporative cooling by moving heat and moisture away from the body.",
    influence: 'Higher wind speeds generally reduce heat stress and lower WBGT.',
    influenceLevel: 'Cooling modifier',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
};

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
  const [tempUnit, setTempUnit] = useState<TempUnit>('C');

  // ACGIH occupational exposure parameters
  const [workload, setWorkload] = useState<WorkloadType>('Moderate Work');
  const [workRestRegimen, setWorkRestRegimen] = useState<WorkRestRegimenType>('Continuous Work');

  // Sticky panel collapse/expand state & auto-collapse scroll feedback
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);
  const lastScrollY = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 300 && lastScrollY.current <= 300) {
        setIsPanelCollapsed(true);
      } else if (currentScrollY <= 100 && lastScrollY.current > 100) {
        setIsPanelCollapsed(false);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeThreshold = getACGIHThreshold(workload, workRestRegimen);

  // Central data-provider query interface
  const dashboardData = useMemo(() => {
    return getDashboardData({ surfaceMode, analysisPeriod, analysisView, workload, workRestRegimen });
  }, [surfaceMode, analysisPeriod, analysisView, workload, workRestRegimen]);

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
    const isConstruction = analysisPeriod === 'Construction Period Only';

    // Calculate maximum possible dynamic ceilings across all active venues for strict diagnostic verification
    const maxPossibleVenueDays = list.reduce((sum, st) => {
      const dur = isConstruction ? (getConstructionInfo(st.key).durationDays || 879) : 879;
      return sum + dur;
    }, 0);
    const maxPossibleHours = maxPossibleVenueDays * 24;

    if (list.length === 0) return {
      highestRiskVenue: 'None',
      highestRiskSubText: '0 hrs',
      hottestCampName: 'n/a',
      hottestCampSubText: formatTemp(0, tempUnit),
      card3Value: '0',
      card3Label: isExtreme ? 'Total Risk Hours' : 'Mean Summer WBGT',
      card3SubText: '',
      card4Value: '0',
      card4Label: isExtreme ? 'Venue-Days Above Threshold' : 'Avg Days Above Threshold',
      card4SubText: '',
      card5Value: '0',
      card5Label: isExtreme ? 'Longest Heat Event' : 'Avg Heatwave Length',
      card5SubText: '',
      card6Value: isExtreme ? '13:00 - 16:00 Loc' : '14:00 - 15:00 Loc',
      card6Label: isExtreme ? 'Hottest Window' : 'Peak Hourly Window',
      card6SubText: '',
      overallAvg: 0,
      maxPossibleVenueDays: 0,
      maxPossibleHours: 0,
      diagnosticCheckPassed: true,
      activeThreshold
    };

    // Highest risk venue (by high risk hours under extreme mode, or by average WBGT under typical mode)
    const riskSorted = [...list].sort((a, b) => isExtreme ? b.highRiskHours - a.highRiskHours : b.avgWBGT - a.avgWBGT);
    const highestRiskVenue = riskSorted[0]?.name || 'n/a';
    const highestRiskSubText = isExtreme 
      ? `${riskSorted[0]?.highRiskHours.toLocaleString()} risk hrs` 
      : `${formatTemp(riskSorted[0]?.avgWBGT, tempUnit)} Avg WBGT`;

    // Training sites only
    const trainings = list.filter(st => st.type === 'Training');
    const hottestCamp = isExtreme 
      ? [...trainings].sort((a, b) => b.maxTemp - a.maxTemp)[0] || list[0]
      : [...trainings].sort((a, b) => b.avgTemp - a.avgTemp)[0] || list[0];
    const hottestCampName = hottestCamp ? hottestCamp.name : 'n/a';
    const hottestCampSubText = isExtreme 
      ? `${formatTemp(hottestCamp?.maxTemp, tempUnit)} Peak Temp` 
      : `${formatTemp(hottestCamp?.avgTemp, tempUnit)} Avg Temp`;

    // Summing high-risk hours or calculating standard baseline average
    const totalHighRiskHours = list.reduce((sum, item) => sum + item.highRiskHours, 0);
    const overallAvgWBGT = list.reduce((sum, item) => sum + item.avgWBGT, 0) / list.length;
    const card3Value = isExtreme ? `${totalHighRiskHours.toLocaleString()} hrs` : formatTemp(overallAvgWBGT, tempUnit);
    const card3Label = isExtreme ? 'Total Risk Hours' : 'Mean Summer WBGT';
    const card3SubText = isExtreme ? 'Across filtered venues' : 'Composite baseline average';

    // Venue-Days & Cumulative Exceedance Days (Preferred occupational communication metric)
    const totalHighRiskDays = list.reduce((sum, item) => sum + item.highRiskDays, 0);
    const avgRiskDays = list.reduce((sum, item) => sum + item.highRiskDays, 0) / list.length;
    
    // Explicitly defining whether counting sum or average of days above threshold per venue
    const card4Value = isExtreme ? `${totalHighRiskDays.toLocaleString()} venue-days` : `${avgRiskDays.toFixed(1)} days/venue`;
    const card4Label = isExtreme ? 'Venue-Days Above Threshold' : 'Avg Days Above Threshold';
    const card4SubText = isExtreme ? 'Cumulative exposure sum' : 'Average exposure per venue';

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

    // Diagnostic validation checks (ensuring calculations are strictly mathematically bounded by periods and venues)
    const diagnosticCheckPassed = (totalHighRiskDays <= maxPossibleVenueDays) && (totalHighRiskHours <= maxPossibleHours);

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
      overallAvg: overallAvgWBGT,
      maxPossibleVenueDays,
      maxPossibleHours,
      diagnosticCheckPassed,
      activeThreshold
    };
  }, [filteredStadiums, dashboardData.stadiums, analysisView, analysisPeriod, activeThreshold]);

  // Handle active stadium click from Map or Selector list
  const handleSelectStadium = (st: Stadium) => {
    setSelectedStadium(st);
  };

  // -------------------------------------------------------------
  // SOLID PDF & CSV EXPORT INFRASTRUCTURE
  // -------------------------------------------------------------
  const addPdfHeader = (doc: jsPDF, title: string) => {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('EQUIDEM HUMAN RIGHTS CLIMATE OBSERVATORY', 14, 15);
    doc.setFont('Helvetica', 'normal');
    doc.text('FIFA WORLD CUP 2026 RESEARCH & SAFETY INITIATIVE', 14, 20);
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.line(14, 23, 196, 23);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title, 14, 32);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Generated: ${new Date().toUTCString()} | Standard: ACGIH TLVs & Liljegren WBGT`, 14, 37);
  };

  const drawSectionHeader = (doc: jsPDF, title: string, y: number): number => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(title, 14, y);
    
    doc.setLineWidth(0.3);
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(14, y + 2, 196, y + 2);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // Slate-700
    return y + 8;
  };

  const printWrappedText = (doc: jsPDF, text: string, x: number, startY: number, maxWidth: number, lineHeight: number = 5.5): number => {
    const lines = doc.splitTextToSize(text, maxWidth);
    let y = startY;
    lines.forEach((line: string) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, x, y);
      y += lineHeight;
    });
    return y;
  };

  const triggerCsvDownload = (fileName: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCurrentAnalysisPDF = () => {
    const doc = new jsPDF();
    addPdfHeader(doc, "DYNAMIC CURRENT ANALYSIS SNAPSHOT REPORT");
    
    let y = 46;
    
    // Section 1: ACTIVE OBSERVATORY PARAMETERS
    y = drawSectionHeader(doc, "1. DASHBOARD OBSERVATION SETTINGS", y);
    
    const parameters = [
      ["Active Location Focus", activeSelectedStadium ? `${activeSelectedStadium.stadiumName} (${activeSelectedStadium.name}, ${activeSelectedStadium.country})` : "All Host Venues (Aggregate Overview)"],
      ["Surface Environment", surfaceMode],
      ["Analysis Period", analysisPeriod],
      ["Analysis Scenario View", analysisView],
      ["Worker Physical Exertion Grade", workload],
      ["Work-Rest Duty Ratio Regimen", workRestRegimen],
      ["Active Physiological Threshold", `${formatTemp(activeThreshold, tempUnit)} WBGT`],
      ["Temperature Unit Profile", tempUnit === 'C' ? "Celsius (°C)" : "Fahrenheit (°F)"]
    ];
    
    doc.setFont('Helvetica', 'normal');
    parameters.forEach(([label, val]) => {
      doc.setFont('Helvetica', 'bold');
      doc.text(`${label}:`, 18, y);
      doc.setFont('Helvetica', 'normal');
      doc.text(val, 80, y);
      y += 5.5;
    });
    
    y += 4;
    
    // Section 2: COMPREHENSIVE CLIMATOLOGICAL RECONSTRUCTION (SUMMARY DATA)
    y = drawSectionHeader(doc, "2. ACTIVE CLIMATE OBSERVATIONS & KPI INDICATORS", y);
    
    const kpis = [
      ["Highest Exposure Risk Focal Point", `${summaryKpis.highestRiskVenue} (${summaryKpis.highestRiskSubText})`],
      ["Hottest Training Camp Base", `${summaryKpis.hottestCampName} (${summaryKpis.hottestCampSubText})`],
      [summaryKpis.card3Label || "Total Heat Stress Burden", `${summaryKpis.card3Value} (${summaryKpis.card3SubText || "N/A"})`],
      [summaryKpis.card4Label || "Days Exceeding Bounds", `${summaryKpis.card4Value} (${summaryKpis.card4SubText || "N/A"})`],
      [summaryKpis.card5Label || "Longest Heat Wave Spell", `${summaryKpis.card5Value} (${summaryKpis.card5SubText || "N/A"})`],
      ["Peak Hourly Window", summaryKpis.card6Value || "N/A"]
    ];
    
    kpis.forEach(([label, val]) => {
      doc.setFont('Helvetica', 'bold');
      doc.text(`${label}:`, 18, y);
      doc.setFont('Helvetica', 'normal');
      doc.text(val, 92, y);
      y += 5.5;
    });
    
    y += 6;
    
    // Section 3: KEY ENVIRONMENTAL RISKS SUMMARY (CONTEXT)
    y = drawSectionHeader(doc, "3. POLICY PROTECTIONS & RECOMMENDATIONS SUMMARY", y);
    
    const adviceText = `This observatory models physiological heat hazards using highly accurate historical climatology cycles (reconstructed via the Liljegren Wet Bulb Globe Temperature model using ERA5 atmospheric reanalysis and NASA POWER solar data). 

Under the active occupational safety parameters (ACGIH threshold of ${formatTemp(activeThreshold, tempUnit)} WBGT), several host venues exhibit sustained periods of intense heat strain. Worksite, operations, tournament coordination, and municipal building operations should implement structured work-rest cycles with immediate shade shelter accessibility, dynamic warning systems, and mandatory hydration schedules.`;
    
    y = printWrappedText(doc, adviceText, 14, y, 180, 5);
    
    // Save document
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    doc.save(`FIFA2026_HeatRisk_Report_${yyyy}${mm}${dd}.pdf`);
  };

  const downloadVenueBriefPDF = () => {
    if (!activeSelectedStadium) return;
    const venue = activeSelectedStadium;
    const doc = new jsPDF();
    addPdfHeader(doc, `FOCAL SITE SURVEY: ${venue.stadiumName.toUpperCase()}`);
    
    let y = 46;
    
    // Section 1: GEOGRAPHIC & PHYSICAL CONTEXT
    y = drawSectionHeader(doc, "1. GEOGRAPHIC & STRUCTURAL PROFILE", y);
    
    const info = getConstructionInfo(venue.key);
    const totalHours = analysisPeriod === 'Construction Period Only' ? (info.durationDays * 24) : 21096;
    const percentHours = ((venue.highRiskHours / totalHours) * 100).toFixed(2);
    
    const geoProps = [
      ["Location Name", `${venue.name}, ${venue.country}`],
      ["Observer Coordinates", `Latitude: ${venue.lat.toFixed(5)}N, Longitude: ${venue.lon.toFixed(5)}W`],
      ["Altitude Class", `${venue.elevation} above mean sea level`],
      ["Köppen-Geiger Zone", venue.climateZone],
      ["Structural Configuration", `${venue.roof} Roof Design`],
      ["Static Seat Capacity", `${venue.capacity.toLocaleString()} spectators`],
      ["Observed Surface Material", surfaceMode]
    ];
    
    geoProps.forEach(([label, val]) => {
      doc.setFont('Helvetica', 'bold');
      doc.text(`${label}:`, 18, y);
      doc.setFont('Helvetica', 'normal');
      doc.text(val, 78, y);
      y += 5.5;
    });
    
    y += 5;
    
    // Section 2: HISTORICAL WEATHER MATRIX (BASELINE)
    y = drawSectionHeader(doc, "2. REGISTERED BASELINE CLIMATOLOGY", y);
    
    const weatherProps = [
      ["Average Multi-Year Ambient Temp", formatTemp(venue.avgTemp, tempUnit)],
      ["Peak Single-Hour Temperature", `${formatTemp(venue.maxTemp, tempUnit)} (Recorded ${venue.maxTempDate})`],
      ["Average Climatological WBGT", formatTemp(venue.avgWBGT, tempUnit)],
      ["Peak Observed Single-Hour WBGT", `${formatTemp(venue.maxWBGT, tempUnit)} (Recorded ${venue.maxWBGTDate})`],
      ["Mean Relative Moisture Saturation", `${venue.avgRH.toFixed(1)}%`],
      ["Average Ground Solar Flux Intensity", `${venue.avgSolar.toFixed(1)} W/m²`]
    ];
    
    weatherProps.forEach(([label, val]) => {
      doc.setFont('Helvetica', 'bold');
      doc.text(`${label}:`, 18, y);
      doc.setFont('Helvetica', 'normal');
      doc.text(val, 84, y);
      y += 5.5;
    });
    
    y += 5;
    
    // Section 3: OCCUPATIONAL STRESS EXPOSURE METRICS (ACTIVE SETTINGS)
    y = drawSectionHeader(doc, `3. OCCUPATIONAL STRESS BURDENS (Threshold: ${formatTemp(activeThreshold, tempUnit)} WBGT)`, y);
    
    const exposureProps = [
      ["Active Exposure Segment", analysisPeriod],
      ["Accumulated Risk Exposure Hours", `${venue.highRiskHours.toLocaleString()} hours`],
      ["Normalized Direct Exposure Portion", `${percentHours}% of analyzed period`],
      ["Total Exceedance Safety Days", `${venue.highRiskDays} individual days`],
      ["Longest Contiguous Heat Block", `${venue.longestHeatEvent} consecutive hours`],
      ["Maximum Sustained Extreme Spell", `${venue.consecutiveExceedanceDays} consecutive high-risk days`]
    ];
    
    exposureProps.forEach(([label, val]) => {
      doc.setFont('Helvetica', 'bold');
      doc.text(`${label}:`, 18, y);
      doc.setFont('Helvetica', 'normal');
      doc.text(val, 84, y);
      y += 5.5;
    });
    
    y += 5;
    
    // Section 4: MODERNIZATION & PREPARATION TIMELINES
    if (info.startDate) {
      y = drawSectionHeader(doc, "4. TOURNAMENT PREPARATION & CONSTRUCTION SEGMENTS", y);
      const constProps = [
        ["Preparation Project Tenure", info.formattedRange],
        ["Temporal Span Duration", `${info.durationDays} Active Calendar Days`],
        ["Share of Aggregate Series Span", `${info.sharePercentage}% duration`],
        ["Renovation Scope Focus", venue.renovationDetails]
      ];
      
      constProps.forEach(([label, val]) => {
        doc.setFont('Helvetica', 'bold');
        doc.text(`${label}:`, 18, y);
        doc.setFont('Helvetica', 'normal');
        if (label === "Renovation Scope Focus") {
          y = printWrappedText(doc, val, 78, y, 118, 5);
        } else {
          doc.text(val, 78, y);
          y += 5.5;
        }
      });
    }
    
    const sanitizedName = venue.stadiumName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`${sanitizedName}_VenueBrief.pdf`);
  };

  const downloadSummaryCSV = () => {
    const headers = [
      "Venue Key",
      "City_Region",
      "Stadium Name",
      "Country",
      "Type",
      "Climate Zone",
      "Elevation (m)",
      "Avg Air Temp (C)",
      "Max Air Temp (C)",
      "Avg WBGT (C)",
      "Max WBGT (C)",
      "High Risk Hours (>=28C)",
      "High Risk Days",
      "Longest Heat Event (hrs)"
    ];
    
    const csvRows = [headers.join(",")];
    
    dashboardData.stadiums.forEach(st => {
      const row = [
        st.key,
        `"${st.name}"`,
        `"${st.stadiumName}"`,
        st.country,
        st.type,
        st.climateZone,
        st.elevation,
        st.avgTemp.toFixed(2),
        st.maxTemp.toFixed(1),
        st.avgWBGT.toFixed(2),
        st.maxWBGT.toFixed(1),
        st.highRiskHours,
        st.highRiskDays,
        st.longestHeatEvent
      ];
      csvRows.push(row.join(","));
    });
    
    triggerCsvDownload("EQUIDEM_FIFA2026_HeatSummary_Database.csv", csvRows.join("\n"));
  };

  const downloadConstructionCSV = () => {
    const headers = [
      "Venue Key",
      "City_Region",
      "Stadium Name",
      "Country",
      "Construction Start",
      "Construction End",
      "Duration Days",
      "Avg Air Temp (C)",
      "Max Air Temp (C)",
      "Avg WBGT (C)",
      "Max WBGT (C)",
      "High Risk Hours",
      "High Risk Days"
    ];
    
    const csvRows = [headers.join(",")];
    
    dashboardData.stadiums.forEach(st => {
      const info = getConstructionInfo(st.key);
      if (info.startDate) {
        const row = [
          st.key,
          `"${st.name}"`,
          `"${st.stadiumName}"`,
          st.country,
          info.startDate,
          info.endDate,
          info.durationDays,
          st.avgTemp.toFixed(2),
          st.maxTemp.toFixed(1),
          st.avgWBGT.toFixed(2),
          st.maxWBGT.toFixed(1),
          st.highRiskHours,
          st.highRiskDays
        ];
        csvRows.push(row.join(","));
      }
    });
    
    triggerCsvDownload("EQUIDEM_FIFA2026_StadiumConstruction_Database.csv", csvRows.join("\n"));
  };

  const downloadMethodologyPDF = () => {
    const doc = new jsPDF();
    addPdfHeader(doc, "OBSERVATORY METHODOLOGY & ANALYTICAL FRAMEWORK");
    
    let y = 46;
    
    const sections = [
      {
        title: "1. DATA OVERVIEW & CLIMATOLOGY DATASETS",
        text: "The FIFA 2026 Heat Risk Observatory relies on long-term historical environmental reconstructions sourced directly from ECMWF ERA5 reanalysis and NASA POWER meteorology repositories. Parameters processed on an hourly cycle span air temperature, water vapor moisture limits (dew point, relative humidity), boundary wind velocity index, and downwelling solar rays fluxes. Raw climatological observations are mapped inside standard grids spanning 1 January 2024 to 28 May 2026 (879 full days, 21,096 complete hourly slices)."
      },
      {
        title: "2. WET BULB GLOBE TEMPERATURE (WBGT) PHYSICAL MODEL",
        text: "Wet Bulb Globe Temperature represents the premier global occupational and sporting health indicator. By combining dry-bulb shaded air heating, evaporate moisture dissipation (wet-bulb), and radiant solar beam absorption, WBGT maps the absolute direct physiological limit of human heat strain. The observatory relies on the Liljegren physical model to convert standard public observation variables into detailed hourly WBGT surface estimations over varying micro-climates."
      },
      {
        title: "3. CLIMATIC SCENARIOS & SURFACE ALBEDO",
        text: "Users may contrast two primary scenarios:\n\n• Grass / Artificial Turf: Simulates typical stadium playing field microclimates. Reflective albedo and moisture transpiration are modeled with standard sport field indicators.\n\n• Concrete Surface: Simulates exposed urban concrete plazas surrounding transport nodes and venues. Higher heat retention, solar trapping coefficients, and complete absence of evaporating vegetative cooling are represented here."
      },
      {
        title: "4. OCCUPATIONAL HEAT REGIMENS & ACGIH STANDARDS",
        text: "To represent actual physiological risk thresholds on host cities, the observatory anchors observations of extreme events relative to the formal guidance guidelines of the American Conference of Governmental Industrial Hygienists (ACGIH). Physical workloads are rated across Light, Moderate, and Heavy grades. Continuous operations are compared directly to regulated work-rest ratio regimens (75/25, 50/50, 25/75 duty cycles)."
      },
      {
        title: "5. STADIUM TOURNAMENT WORK PREPARATION TIMES",
        text: "For host venues undergoing major prep phases, modernization, or expansion (e.g. Azteca, Dallas, Miami), the platform isolates environmental stress occurring exclusively during identified construction windows. Hours of risk exceedance, consecution statistics, and extreme episodes are mapped specifically during these historical calendar segments to analyze workers' heat exposures."
      },
      {
        title: "6. RESEARCH INTERPRETATION & USE POLICY",
        text: "This observatory acts as an evidence-based human safety and public policy information system. It is designed to support academic inquiry, policy framing, safe shift organization, and spectator defense planning by municipal and athletic organizers. It does not constitute commercial regulatory warnings or acute weather forecasting products. Users are urged to integrate these climate baseline statistics directly into structural risk analyses."
      }
    ];
    
    sections.forEach((section) => {
      y = drawSectionHeader(doc, section.title, y);
      y = printWrappedText(doc, section.text, 14, y, 180, 5);
      y += 4;
    });
    
    doc.save("FIFA2026_HeatRisk_Methodology.pdf");
  };

  const downloadVenueReport = (venue: Stadium) => {
    // Legacy support redirecting to the venue brief PDF to maintain perfect styling consistency
    downloadVenueBriefPDF();
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
      
      let matchPeriod = true;
      if (analysisPeriod === 'Construction Period Only') {
        const sKey = ev.stadiumKey || STADIUMS_DATA.find(s => s.name === ev.stadium)?.key;
        if (sKey) {
          const info = getConstructionInfo(sKey);
          if (info && info.startDate && info.endDate) {
            const eventDateOnly = ev.date.split(' ')[0];
            matchPeriod = eventDateOnly >= info.startDate && eventDateOnly <= info.endDate;
          } else {
            matchPeriod = false;
          }
        } else {
          matchPeriod = false;
        }
      }

      return matchSearch && matchCat && matchPeriod;
    });
  }, [dashboardData.extremeEvents, searchEventQuery, eventCategoryFilter, analysisPeriod]);

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
                      <span className="font-extrabold text-red-650 text-sm">{formatTemp(37.6, tempUnit)} WBGT</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Participating Teams</span>
                      <span className="font-extrabold text-orange-655 text-sm">48</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* ABOUT THE OBSERVATORY (5 Priority Pillars) */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-10 shadow-sm space-y-8">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded uppercase tracking-wider">
                    <Compass className="w-3.5 h-3.5 text-blue-900" /> Platform Overview
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 leading-snug font-sans">
                      About the Heat Risk Observatory
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed max-w-3xl">
                      This public-interest research tool maps and evaluates environmental heat stress across the host venues of the 2026 World Cup. By translating raw meteorological records into clear public indicators.
                    </p>
                  </div>
                </div>

                {/* 5 columns detailing what, why, explore, data, filters */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                  <div className="bg-slate-50/50 border border-slate-150 rounded-lg p-5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-blue-50 text-blue-900 flex items-center justify-center shrink-0 border border-blue-100">
                        <Compass className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">1. What It Is</h4>
                    </div>
                    <p className="text-xs text-slate-605 leading-relaxed font-normal font-sans">
                      Research-based climate monitoring dashboard tracking dangerous heat stress levels for official match venues and base camps.
                    </p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-150 rounded-lg p-5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100">
                        <HeartPulse className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-909 uppercase tracking-tight">2. Why Created</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal font-sans">
                      To safeguard stadium construction and retrofit workforces, as well as athletes and spectators, from intense peak-summer temperatures.
                    </p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-150 rounded-lg p-5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                        <Sliders className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">3. What to Explore</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal font-sans">
                      Search and navigate our interactive map, hourly heat trajectories, venue risk rankings, and statistical hazard comparisons.
                    </p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-150 rounded-lg p-5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
                        <Database className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight font-sans">4. Data Used</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal font-sans font-sans">
                      Hourly climate estimates covering 29 months (January 2024 to May 2026), incorporating air temperature, humidity, solar radiation, and wind.
                    </p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-150 rounded-lg p-5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">5. User Filters</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal font-sans">
                      Simulate heat risks across grass vs. concrete, different outdoor workloads, and occupational work-rest schedules.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-150 pt-6">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                      Renovation Focus and Worker Health Hazards
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal font-sans">
                      While the tournament relies on pre-existing stadiums rather than building new ones, extensive upgrades and retrofits are occurring across many host cities. Labor forces carrying out strenuous manual actions outdoors during hot summer months face significant heat-stress risks, which require clear, structured work-break regimens to mitigate.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                      Evidence-Based Risk Management
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal font-sans">
                      By documenting environmental heat exposures objectively, this platform functions as a tool for public accountability. Civil groups, labor associations, and sports federations can rely on standard indicators to design proactive mitigation measures for match venues and team training locations.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                  <Info className="w-4 h-4 text-blue-900 shrink-0" />
                  <span>Climate records and heat indices are intended for policy assessments and public information.</span>
                </div>
              </section>

              {/* STUDY COVERAGE PERIOD METHODOLOGY CARD */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-[#1e3a8a] border border-blue-100 text-[10px] font-bold uppercase tracking-wider rounded font-mono">
                    Temporal Parameters
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
                    Study Coverage Period
                  </h3>
                  <div className="text-2xl font-black text-slate-900 tracking-tight font-sans">
                    January 2024 – 28 May 2026
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium">
                    This observatory analyzes environmental heat conditions across FIFA 2026 host venues using hourly WBGT estimates covering the period from January 2024 through 28 May 2026.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-150 rounded-lg p-5 flex flex-col justify-center text-center md:text-left h-full">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    Total Study Duration
                  </span>
                  <span className="text-xl font-extrabold text-[#1e3a8a] block mt-1 tracking-tight">
                    approximately 29 months
                  </span>
                  <span className="text-[10px] text-slate-500 mt-2 block font-sans font-medium">
                    Comprehensive hourly climate reanalyses
                  </span>
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
                       Summary metrics compiled directly from hourly WBGT reconstructions across FIFA 2026 host venues between January 2024 and 28 May 2026.
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
                        <span>Accumulated over <strong className="text-red-700">2,840 hours</strong> exceeding the critical high-risk safety threshold (&ge; {formatTemp(28, tempUnit)} WBGT).</span>
                      ) : (
                        <span>Maintains a typical baseline average heat stress of <strong className="text-emerald-700">{formatTemp(27.1, tempUnit)} WBGT</strong> during representative seasonal peaks.</span>
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
                        {analysisView === 'Extreme Events' ? formatTemp(37.6, tempUnit) : formatTemp(27.1, tempUnit)}
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
                  selectedStadium={activeSelectedStadium}
                  onSelectStadium={handleSelectStadium}
                  filterCountry={filterCountry}
                  setFilterCountry={setFilterCountry}
                  filterType={filterType}
                  setFilterType={setFilterType}
                  analysisView={analysisView}
                  tempUnit={tempUnit}
                />
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
                      Meteorological inputs from ERA5 reanalysis and NASA POWER datasets are integrated to estimate hourly wet-bulb globe temperature (WBGT), humidity, solar radiation, and wind conditions across FIFA World Cup 2026 host venues.
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
                          <li><strong>Field Turf (Well-Irrigated Grass)</strong>: Elevated 0.21 albedo with active soil latent cooling, introducing cooling reductions of 1.25°C to 2.4°C over model environments.</li>
                          <li><strong>Concrete Plaza Surfaces</strong>: Absorptive 0.35 albedo with negligible latent cooling capacity, driving strong thermal storage blocks that amplify local WBGT results by up to 4.2°C under full sunshine.</li>
                        </ol>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[10px]">
                          <strong>Screening Verification Note</strong>: Simulations reconstruct regional hourly values. Dynamic shadow angles across specific stadium structures necessitate local validation on match-days.
                        </div>
                      </div>

                      <div className="p-4 border-t border-slate-150 bg-slate-50 shrink-0 flex justify-end">
                        <button 
                          onClick={() => setIsMethodologyModalOpen(false)}
                          type="button"
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded font-sans"
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

              {/* NEW SECTION: ABOUT HEAT STRESS (REPLACED AND REORDERED) */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-10 shadow-sm space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#1e3a8a] uppercase bg-blue-50 px-2 py-0.5 rounded">Risk Analysis</span>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">A Human Guide to Heat Stress</h3>
                  <div className="h-1 w-20 bg-blue-900 rounded"></div>
                  <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
                    Workplace heat stress describes circumstances under which a worker's body accumulates heat due to the combined effects of metabolic heat, environmental factors and clothing worn. Workplace heat stress causes physiological heat strain in the body that can lead to exhaustion, pathological conditions and death.(WHO, 2025)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Card 1 */}
                  <div className="border border-slate-100 bg-slate-50/45 p-5 rounded-lg space-y-3">
                    <div className="w-9 h-9 rounded bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100 shadow-3xs">
                      <HeartPulse className="w-5 h-5 animate-pulse" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">Thermoregulation Limits</h4>
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
                      High air temperatures represent only part of the risk. Combined factors like moisture humidity and direct solar radiation multiply strain.
                    </p>
                  </div>

                  {/* Card 3 */}
                  <div className="border border-slate-100 bg-slate-50/45 p-5 rounded-lg space-y-3">
                    <div className="w-9 h-9 rounded bg-blue-50 text-blue-750 flex items-center justify-center border border-blue-100 shadow-3xs">
                      <Scale className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">Exertion Standards</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      High physical workload elevate internal metabolic heat production, raising danger levels.
                    </p>
                  </div>

                  {/* Card 4 */}
                  <div className="border border-slate-100 bg-slate-50/45 p-5 rounded-lg space-y-3">
                    <div className="w-9 h-9 rounded bg-red-50 text-red-700 flex items-center justify-center border border-red-100 shadow-3xs">
                      <Flame className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">Clinical Risks</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      Severe unmitigated exposure causes rapid dehydration, acute exhaustion, and dangerous medical emergencies like heat stroke.
                    </p>
                  </div>
                </div>
              </section>

              {/* NEW SECTION: UNDERSTANDING WBGT (REPLACED AND REORDERED) */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-6 lg:p-10 shadow-xs space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Explanatory */}
                  <div className="lg:col-span-12 xl:col-span-5 space-y-4">
                    <span className="text-[10px] font-bold tracking-widest text-[#1e3a8a] uppercase bg-blue-50 px-2 py-1 rounded font-sans">Thermodynamic Standards</span>
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">How WBGT Measures Heat Load</h3>
                    <div className="h-1 w-20 bg-blue-900 rounded"></div>
                    <p className="text-sm font-semibold text-slate-800 leading-relaxed font-sans">
                      Wet Bulb Globe Temperature (WBGT) is a specialized composite index that reflects the actual physical stress of environmental heat on active individuals.
                    </p>
                    <p className="text-xs text-slate-655 leading-relaxed font-normal">
                      Simple dry-bulb air temperature represents a critical safety blindspot for workers and athletes because it completely ignores the cooling effects of wind and the severe warming impacts of humidity and direct solar radiation.
                    </p>
                    <p className="text-xs text-[#334155] leading-relaxed font-normal">
                      By synthesizing air temperature, humidity, wind speed, and solar radiation into a single value, WBGT provides the global gold standard used by safety organizations to manage outdoor activity risks.
                    </p>

                    <div className="bg-blue-900 text-blue-50 border border-blue-800 p-4 rounded-xl flex gap-3 shadow-xs items-start mt-2">
                      <Info className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Composite vs. Air Temp</span>
                        <p className="text-xs text-blue-100 leading-relaxed">
                          Two days with identical air temperatures can feel entirely different. WBGT captures the critical differences.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Visual Component Diagram */}
                  <div className="lg:col-span-12 xl:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 font-sans">
                       Visual Matrix: Component Drivers of WBGT
                    </h4>
                    
                    <p className="text-xs text-slate-505 font-medium font-sans">
                      Click each element to explore how it registers the thermal burden:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 col-span-2">
                      {/* Factor 1 */}
                      <button 
                        onClick={() => setSelectedWbgtFactor('temp')}
                        type="button"
                        className={`text-left p-3.5 rounded-lg border transition-all focus:outline-none ${
                          selectedWbgtFactor === 'temp' 
                            ? 'bg-blue-50 border-blue-400 shadow-xs ring-1 ring-blue-400' 
                            : 'bg-white border-slate-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-blue-900" />
                          <span className="text-xs font-bold text-slate-900">Air Temperature</span>
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
                            ? 'bg-blue-50 border-blue-400 shadow-xs ring-1 ring-blue-400' 
                            : 'bg-white border-slate-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-slate-900">Humidity (Wet Bulb)</span>
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
                            ? 'bg-blue-50 border-blue-400 shadow-xs ring-1 ring-blue-400' 
                            : 'bg-white border-slate-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-bold text-slate-900">Solar Radiation</span>
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
                            ? 'bg-blue-50 border-blue-400 shadow-xs ring-1 ring-blue-400' 
                            : 'bg-white border-slate-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Wind className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-slate-900">Wind Speed</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal font-normal">
                          Governs air motion and convective drying. Faster air currents help dispel skin-boundary humidity pools.
                        </p>
                      </button>
                    </div>

                    {/* Explanatory Details Box */}
                    <AnimatePresence mode="wait">
                      {selectedWbgtFactor && (() => {
                        const info = WBGT_FACTOR_INFO[selectedWbgtFactor];
                        if (!info) return null;
                        return (
                          <motion.div
                            key={selectedWbgtFactor}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-blue-50/40 border border-blue-200 rounded-xl p-5 space-y-4 shadow-sm"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${info.dotColor} animate-pulse`} />
                                <h5 className="font-bold text-xs text-blue-950 tracking-tight uppercase">Selected Factor: {info.name}</h5>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded text-[9px] font-extrabold tracking-wide uppercase border bg-white ${info.badgeColor}`}>
                                {info.influenceLevel}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                              <div className="space-y-1.5">
                                <span className="font-bold text-blue-900 uppercase text-[9px] tracking-wider block font-sans">Role in WBGT Calculation</span>
                                <p className="text-[#334155] leading-relaxed font-sans">{info.role}</p>
                              </div>
                              <div className="space-y-1.5">
                                <span className="font-bold text-blue-900 uppercase text-[9px] tracking-wider block font-sans">Influence on Output</span>
                                <p className="text-[#334155] leading-relaxed font-sans">{info.influence}</p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>

                    {/* Thermodynamic Synthesis Diagram */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
                        <Sliders className="w-4 h-4 text-slate-700" />
                        <h5 className="font-bold text-xs text-slate-900 font-sans uppercase tracking-tight">Thermodynamic Synthesis Flow Diagram</h5>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center relative">
                        {/* Column 1: Inputs Block (4 cols) */}
                        <div className="lg:col-span-4 flex flex-col gap-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 font-sans animate-pulse">Environmental Inputs</span>
                          
                          {/* Air Temperature */}
                          <div className={`p-2 rounded border flex items-center justify-between transition-all duration-300 ${
                            selectedWbgtFactor === 'temp'
                              ? 'bg-amber-50 border-amber-305 text-amber-900 scale-[1.02] shadow-2xs font-extrabold'
                              : 'bg-white border-slate-150 text-slate-400 opacity-50'
                          }`}>
                            <div className="flex items-center gap-2">
                              <Thermometer className="w-3.5 h-3.5 animate-pulse" />
                              <span className="text-[11px]">Air Temperature</span>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider">10% Weight</span>
                          </div>

                          {/* Humidity */}
                          <div className={`p-2 rounded border flex items-center justify-between transition-all duration-300 ${
                            selectedWbgtFactor === 'humid'
                              ? 'bg-red-550 border-red-400 text-red-900 scale-[1.02] shadow-2xs font-extrabold'
                              : 'bg-white border-slate-150 text-slate-400 opacity-50'
                          }`}>
                            <div className="flex items-center gap-2">
                              <Droplets className="w-3.5 h-3.5 animate-pulse" />
                              <span className="text-[11px]">Humidity (Wet Bulb)</span>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider">70% Weight</span>
                          </div>

                          {/* Solar Radiation */}
                          <div className={`p-2 rounded border flex items-center justify-between transition-all duration-300 ${
                            selectedWbgtFactor === 'sun'
                              ? 'bg-amber-50 border-amber-405 text-amber-900 scale-[1.02] shadow-2xs font-extrabold'
                              : 'bg-white border-slate-150 text-slate-400 opacity-50'
                          }`}>
                            <div className="flex items-center gap-2">
                              <Sun className="w-3.5 h-3.5 animate-pulse" />
                              <span className="text-[11px]">Solar Radiation</span>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider">20% Weight</span>
                          </div>

                          {/* Wind Speed */}
                          <div className={`p-2 rounded border flex items-center justify-between transition-all duration-300 ${
                            selectedWbgtFactor === 'wind'
                              ? 'bg-emerald-50 border-emerald-405 text-emerald-900 scale-[1.02] shadow-2xs font-extrabold'
                              : 'bg-white border-slate-150 text-slate-400 opacity-50'
                          }`}>
                            <div className="flex items-center gap-2">
                              <Wind className="w-3.5 h-3.5 animate-pulse" />
                              <span className="text-[11px]">Wind Speed</span>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider font-extrabold">Cooling Modifier</span>
                          </div>
                        </div>

                        {/* Column 2: Connector path (4 cols) */}
                        <div className="lg:col-span-4 flex flex-col items-center justify-center py-2 lg:py-0">
                          <div className="hidden lg:flex w-full items-center justify-between px-2 text-slate-300">
                            <span className={`h-0.5 flex-1 transition-all duration-300 ${
                              selectedWbgtFactor ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-slate-200'
                            }`} />
                            <div className="p-1 px-3.5 rounded bg-blue-900 text-white font-mono text-[9px] font-black tracking-widest animate-sine uppercase">
                              Liljegren Model
                            </div>
                            <span className={`h-0.5 flex-1 transition-all duration-300 ${
                              selectedWbgtFactor ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-slate-200'
                            }`} />
                          </div>
                          
                          <div className="lg:hidden flex flex-col items-center gap-1 my-1">
                            <div className="px-3.5 py-1 rounded bg-blue-900 text-white font-mono text-[9px] font-black tracking-widest uppercase">
                              Liljegren Integration Engine
                            </div>
                          </div>
                        </div>

                        {/* Column 3: Output Destination (4 cols) */}
                        <div className="lg:col-span-4 bg-slate-900 p-4 rounded-xl border border-slate-800 text-center space-y-1.5 shadow-md">
                          <span className="text-[8px] text-slate-300 block font-bold uppercase tracking-widest">Physiological Burden</span>
                          <span className="text-sm font-black text-sky-400 font-mono block">Calculated WBGT</span>
                          <p className="text-[9px] text-slate-300 font-normal leading-normal font-sans pt-1">
                            Integrates humidity, radiant solar heat, Wind convection speed, and shade temperature into a single dynamic standard.
                          </p>
                        </div>
                      </div>
                    </div>
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
                    <div className="p-2.5 bg-slate-100 text-slate-800 rounded w-10 h-10 flex items-center justify-center shrink-0">
                      <Scale className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-slate-950 uppercase font-sans">ACGIH Guidance</h4>
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
                      <h4 className="font-bold text-slate-900 text-sm">Generate Analysis Report</h4>
                      <p className="text-xs text-slate-505 leading-normal">
                        Detailed dynamic policy assessment based on active configurations, environmental heat stress indexes, and human safety metrics.
                      </p>
                    </div>
                    <button
                      onClick={downloadCurrentAnalysisPDF}
                      className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 rounded text-xs font-semibold transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Generate PDF Report
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
                        Complete details of our downscaling reanalysis framework, Wet Bulb globe calculations, and peer-validated formulations.
                      </p>
                    </div>
                    <button
                      onClick={downloadMethodologyPDF}
                      className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 rounded text-xs font-semibold transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Download Methodology PDF
                    </button>
                  </div>

                  {/* Download Report Box 3 */}
                  <div className="border border-slate-200 hover:border-slate-350 p-5 rounded-lg transition space-y-4 bg-slate-50/20 shadow-xs flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="p-2 bg-emerald-50 border border-emerald-100 rounded w-10 h-10 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-900" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">Download Observatory Data</h4>
                      <p className="text-xs text-slate-505 leading-normal">
                        Technical database containing comprehensive host venue climate historical averages and maximum heat indexes (CSV).
                      </p>
                    </div>
                    <button
                      onClick={downloadSummaryCSV}
                      className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 rounded text-xs font-semibold transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Download Summary CSV
                    </button>
                  </div>

                </div>
              </section>

              {/* OBSERVATORY HEALTH POLICIES STANDARDS FOOTER CITATIONS */}
              <section className="text-center py-4 text-xs text-slate-500 max-w-4xl mx-auto space-y-2 italic border-t border-slate-200/60 pt-6">
                <p>This observatory is intended for public assistance of human safety. Historical data metrics and risk zones are sourced directly from climatology records.</p>
                <div className="text-slate-400 font-semibold font-sans not-italic text-sm">
                  Cited Standards & Data Sources:
                </div>
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 pt-1 not-italic font-medium text-xs text-slate-500 max-w-2xl mx-auto">
                  <span className="flex items-center gap-1">
                    <span className="text-blue-900">•</span>
                    ACGIH Heat Stress Threshold Values (TLV® Framework)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-blue-900">•</span>
                    Liljegren WBGT Heat Stress Model
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-blue-900">•</span>
                    ERA5 Reanalysis Dataset
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-blue-900">•</span>
                    NASA POWER Environmental Data
                  </span>
                </div>
              </section>

            </motion.div>
          ) : (
            
            // ========================================================
            // INTERACTIVE DASHBOARD VIEW (Multi-tab system)
            // ========================================================
            <div className="max-w-7xl mx-auto px-6 py-8">
              
              {/* NEW GLOBAL ANALYSIS PANEL */}
              <div className={`sticky top-[116px] md:top-[73px] z-40 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl mb-6 shadow-md transition-all duration-300 ${
                isPanelCollapsed ? 'p-3 px-5' : 'p-5 space-y-4'
              }`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                      className="p-1 px-1.5 md:p-1.5 md:px-2.5 hover:bg-slate-100 rounded text-slate-600 hover:text-[#1e3a8a] transition shrink-0 flex items-center gap-1 border border-slate-200 bg-white shadow-3xs text-xs font-semibold font-sans outline-none focus:ring-1 focus:ring-blue-500"
                      title={isPanelCollapsed ? "Expand Parameters Panel" : "Collapse Parameters Panel"}
                    >
                      {isPanelCollapsed ? (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 text-[#1e3a8a]" />
                          <span className="text-[10px] text-slate-700 font-bold uppercase tracking-wider block">Expand</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Collapse</span>
                        </>
                      )}
                    </button>
                    <div>
                      <span className="text-[10px] font-bold text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded tracking-wide uppercase">Observatory Controls</span>
                      <h2 className="text-sm font-black text-slate-900 tracking-tight mt-0.5">Global Re-Analysis Parameters (ACGIH Threshold Target)</h2>
                    </div>
                  </div>
                  
                  {/* Active Matrix Pill Summary */}
                  <div className="text-[10px] text-slate-500 font-medium flex flex-wrap gap-1 items-center bg-slate-50/50 p-1 rounded-lg border border-slate-100">
                    <span className="text-slate-400 font-bold px-1.5 uppercase tracking-wider text-[8px]">Matrix Status</span>
                    <span className="font-mono text-[#1e3a8a] bg-white border border-slate-200/60 shadow-3xs px-2 py-0.5 rounded font-bold">{surfaceMode === 'Grass / Artificial Turf' ? 'grass_turf' : 'concrete'}</span>
                    <span className="font-mono text-[#1e3a8a] bg-white border border-slate-200/60 shadow-3xs px-2 py-0.5 rounded font-bold">{analysisPeriod === 'Entire Study Period' ? 'entire_duration' : 'construction_window'}</span>
                    <span className="font-mono text-[#1e3a8a] bg-white border border-slate-200/60 shadow-3xs px-2 py-0.5 rounded font-bold">{analysisView === 'Typical Conditions' ? 'typical_trends' : 'extreme_events'}</span>
                    <span className="font-mono text-[#1e3a8a] bg-white border border-slate-200/60 shadow-3xs px-2 py-0.5 rounded font-bold">{workload.replace(' ', '_').toLowerCase()}</span>
                    <span className="font-mono text-emerald-800 bg-emerald-50 border border-emerald-200/60 shadow-3xs px-2 py-0.5 rounded font-bold font-sans">threshold_{formatTemp(getACGIHThreshold(workload, workRestRegimen), tempUnit)}</span>
                  </div>
                </div>

                {!isPanelCollapsed && (
                  <>
                    {/* Compact Global Analysis Banner */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span className="font-semibold text-slate-700">Current Study Window:</span>
                    <strong className="text-slate-900 font-mono bg-white border border-slate-150 px-2 py-0.5 rounded shadow-3xs">January 2024 – 28 May 2026</strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-650 font-semibold font-sans">
                    {analysisPeriod === 'Entire Study Period' ? (
                      <span className="bg-blue-50/50 border border-blue-100/60 text-[#1e3a8a] px-2.5 py-0.5 rounded-md flex items-center gap-1 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a]"></span>
                        Using the complete study period.
                      </span>
                    ) : (
                      <span className="bg-amber-50 border border-amber-100 text-amber-800 px-2.5 py-0.5 rounded-md flex items-center gap-1 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Using only the venue-specific construction/preparation period.
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
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
                        className={`flex-1 text-center py-1.5 px-3 rounded text-[11px] font-bold font-sans transition-all outline-none ${
                          surfaceMode === 'Grass / Artificial Turf'
                            ? 'bg-white text-[#1e3a8a] shadow-xs border border-slate-150'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Grass/Turf
                      </button>
                      <button
                        type="button"
                        onClick={() => setSurfaceMode('Concrete Surface')}
                        className={`flex-1 text-center py-1.5 px-3 rounded text-[11px] font-bold font-sans transition-all outline-none ${
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
                        className={`flex-1 text-center py-1.5 px-2 rounded text-[11px] font-bold font-sans transition-all outline-none ${
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
                        className={`flex-1 text-center py-1.5 px-2 rounded text-[11px] font-bold font-sans transition-all outline-none ${
                          analysisPeriod === 'Construction Period Only'
                            ? 'bg-white text-[#1e3a8a] shadow-xs border border-slate-150'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Construction
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
                        className={`flex-1 text-center py-1.5 px-3 rounded text-[11px] font-bold font-sans transition-all outline-none ${
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
                        className={`flex-1 text-center py-1.5 px-3 rounded text-[11px] font-bold font-sans transition-all outline-none ${
                          analysisView === 'Extreme Events'
                            ? 'bg-white text-[#1e3a8a] shadow-xs border border-slate-150'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Extreme
                      </button>
                    </div>
                  </div>

                  {/* Control 4: Workload Assessment */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-700 font-sans">Workload Category</label>
                      <div className="relative group inline-block">
                        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-[#1e3a8a] cursor-help" />
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 leading-normal font-normal">
                          <p className="font-bold border-b border-rose-300 pb-1 mb-1 text-slate-300">ACGIH Workload Definitions</p>
                          <p className="mb-1"><strong>Light:</strong> Sitting/standing, light work, typing or light assembly (Threshold: 30.0°C–32.2°C WBGT).</p>
                          <p className="mb-1"><strong>Moderate:</strong> Active walking, moderate hauling/lifting, standard sports practice (Threshold: 26.7°C–31.1°C WBGT).</p>
                          <p><strong>Heavy:</strong> Intensive running, rapid heavy materials handling, high-exertion elite matches (Threshold: 25.0°C–30.0°C WBGT).</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-1 rounded-lg flex gap-1">
                      {(['Light Work', 'Moderate Work', 'Heavy Work'] as WorkloadType[]).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setWorkload(w)}
                          className={`flex-1 text-center py-1.5 px-1.5 rounded text-[10px] font-bold font-sans transition-all outline-none truncate ${
                            workload === w
                              ? 'bg-white text-[#1e3a8a] shadow-xs border border-slate-150'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {w.replace(' Work', '')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Control 5: Work-Rest Regimen Ratio */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-700 font-sans">Work-Rest Regimen</label>
                      <div className="relative group inline-block">
                        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-[#1e3a8a] cursor-help" />
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 leading-normal font-normal">
                          <p className="font-bold border-b border-rose-300 pb-1 mb-1 text-slate-300">ACGIH Regimen Adjustment</p>
                          <p className="mb-1">Thresholds are scaled according to work allocation ratios per hour to prevent dangerous core body temperature elevations.</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                        </div>
                      </div>
                    </div>

                    <select
                      value={workRestRegimen}
                      onChange={(e) => setWorkRestRegimen(e.target.value as WorkRestRegimenType)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2 rounded-lg text-xs font-semibold font-sans focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer h-[32px] transition-all"
                    >
                      <option value="Continuous Work">Continuous Work</option>
                      <option value="75% Work / 25% Rest">75% Work / 25% Rest</option>
                      <option value="50% Work / 50% Rest">50% Work / 50% Rest</option>
                      <option value="25% Work / 75% Rest">25% Work / 75% Rest</option>
                    </select>
                  </div>

                  {/* Control 6: Temperature Unit Toggle */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-700 font-sans">Temperature Unit</label>
                      
                      {/* CSS hover tooltip */}
                      <div className="relative group inline-block">
                        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-[#1e3a8a] cursor-help" />
                        <div className="absolute z-50 bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 leading-normal font-normal text-left">
                          <p className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300 text-left">Unit Settings</p>
                          <p className="mb-1 text-left"><strong>°C:</strong> Displays all temperature metrics in degrees Celsius.</p>
                          <p className="text-left"><strong>°F:</strong> Displays all temperature metrics converted to degrees Fahrenheit using exact formula: <em>°F = (°C × 9/5) + 32</em>.</p>
                          <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-1 rounded-lg flex gap-1">
                      <button
                        type="button"
                        onClick={() => setTempUnit('C')}
                        className={`flex-1 text-center py-1.5 px-3 rounded text-[11px] font-bold font-sans transition-all outline-none ${
                          tempUnit === 'C'
                            ? 'bg-white text-[#1e3a8a] shadow-xs border border-slate-150'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        °C
                      </button>
                      <button
                        type="button"
                        onClick={() => setTempUnit('F')}
                        className={`flex-1 text-center py-1.5 px-3 rounded text-[11px] font-bold font-sans transition-all outline-none ${
                          tempUnit === 'F'
                            ? 'bg-white text-[#1e3a8a] shadow-xs border border-slate-150'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        °F
                      </button>
                    </div>
                  </div>
                </div>
                  </>
                )}
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

                {/* Tab: Heat Risk Guidance */}
                <button
                  onClick={() => setActiveTab('guidance')}
                  className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 select-none focus:outline-none ${
                    activeTab === 'guidance'
                      ? 'border-blue-900 text-blue-900'
                      : 'border-transparent text-slate-500 hover:text-blue-900 hover:border-slate-200'
                  }`}
                >
                  <Scale className="w-4 h-4 shrink-0" /> Understanding Heat Risk
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
                      
                      {/* KPI 1: Highest Risk Venue */}
                      <div
                        onMouseEnter={() => setHoveredKpi('highest')}
                        onMouseLeave={() => setHoveredKpi(null)}
                        className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-blue-900 transition-colors duration-200 relative cursor-help"
                      >
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1.5">Highest Risk Venue</span>
                        <span className="text-sm font-bold text-slate-900 block leading-tight truncate" title={summaryKpis.highestRiskVenue}>
                          {summaryKpis.highestRiskVenue}
                        </span>
                        <span className="text-xs font-semibold text-red-655 block mt-1">{summaryKpis.highestRiskSubText}</span>
                        {hoveredKpi === 'highest' && (
                          <div className="absolute top-full left-0 right-0 z-40 mt-1.5 bg-slate-900 text-white text-[10px] p-2.5 rounded shadow-lg leading-relaxed font-medium">
                            {analysisView === 'Extreme Events' 
                              ? `The match venue exhibiting the highest cumulative exposure hours above the active occupational safety threshold (${formatTemp(activeThreshold, tempUnit)} WBGT).`
                              : `The match venue exhibiting the highest baseline summer Wet Bulb Globe Temperature (WBGT) average.`}
                          </div>
                        )}
                      </div>

                      {/* KPI 2: Hottest Training Camp */}
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
                            {analysisView === 'Extreme Events'
                              ? "The assigned training camp or team base facility registering the highest peak ambient Dry-Bulb air temperature."
                              : "The assigned training camp or team base facility registering the highest overall average Dry-Bulb air temperature."}
                          </div>
                        )}
                      </div>

                      {/* KPI 3: Total Risk Hours / Mean WBGT */}
                      <div
                        onMouseEnter={() => setHoveredKpi('hrs')}
                        onMouseLeave={() => setHoveredKpi(null)}
                        className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-blue-900 transition-colors duration-200 relative cursor-help"
                      >
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1.5">{summaryKpis.card3Label}</span>
                        <span className="text-sm font-bold text-slate-900 block leading-tight">{summaryKpis.card3Value}</span>
                        <span className="text-xs text-slate-550 font-medium block mt-1 truncate" title={summaryKpis.card3SubText}>{summaryKpis.card3SubText}</span>
                        {hoveredKpi === 'hrs' && (
                          <div className="absolute top-full left-0 right-0 z-40 mt-1.5 bg-slate-900 text-white text-[10px] p-2.5 rounded shadow-lg leading-relaxed font-semibold font-medium">
                            {analysisView === 'Extreme Events'
                              ? `Cumulative hourly observations summed across all active filtered venues where WBGT met or exceeded the ACGIH exposure threshold of ${formatTemp(activeThreshold, tempUnit)}.`
                              : "The representative arithmetic mean of Wet Bulb Globe Temperature (WBGT) across all filtered stadiums and timeframes."}
                          </div>
                        )}
                      </div>

                      {/* KPI 4: Venue-Days Above Threshold / Avg Days Above Threshold */}
                      <div
                        onMouseEnter={() => setHoveredKpi('days')}
                        onMouseLeave={() => setHoveredKpi(null)}
                        className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-blue-900 transition-colors duration-200 relative cursor-help"
                      >
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1.5">{summaryKpis.card4Label}</span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-sm font-bold text-slate-900 block leading-tight">{summaryKpis.card4Value}</span>
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200/50 flex items-center gap-0.5 select-none" title="Strict temporal assertion verified: Calculated values do not violate physical boundaries of selected epochs.">
                            ✓ Verified
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium block mt-1 truncate" title={summaryKpis.card4SubText}>{summaryKpis.card4SubText}</span>
                        {hoveredKpi === 'days' && (
                          <div className="absolute top-full left-0 right-0 z-40 mt-1.5 bg-slate-900 text-white text-[10px] p-2.5 rounded shadow-lg leading-relaxed font-semibold font-medium">
                            {analysisView === 'Extreme Events'
                              ? `Cumulative sum of unique days on which a venue experienced at least 1 hour of WBGT above the active ACGIH threshold (${formatTemp(activeThreshold, tempUnit)}). Matched bounds checking limit: ${summaryKpis.maxPossibleVenueDays} venue-days max.`
                              : `Average number of days per venue containing one or more hourly WBGT observations exceeding the ACGIH threshold of ${formatTemp(activeThreshold, tempUnit)}.`}
                          </div>
                        )}
                      </div>

                      {/* KPI 5: Longest Heat Event / Avg Heatwave Length */}
                      <div
                        onMouseEnter={() => setHoveredKpi('longest')}
                        onMouseLeave={() => setHoveredKpi(null)}
                        className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-blue-900 transition-colors duration-200 relative cursor-help"
                      >
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1.5">{summaryKpis.card5Label}</span>
                        <span className="text-sm font-bold text-slate-900 block leading-tight">{summaryKpis.card5Value}</span>
                        <span className="text-xs text-red-655 font-bold block mt-1 truncate" title={summaryKpis.card5SubText}>{summaryKpis.card5SubText}</span>
                        {hoveredKpi === 'longest' && (
                          <div className="absolute top-full left-0 right-0 z-40 mt-1.5 bg-slate-900 text-white text-[10px] p-2.5 rounded shadow-lg leading-relaxed font-semibold font-medium">
                            {analysisView === 'Extreme Events'
                              ? `The longest peak continuous single sequence of hours in which WBGT stayed above the active ${formatTemp(activeThreshold, tempUnit)} occupational safety threshold.`
                              : `Average maximum consecutive hours above the ${formatTemp(activeThreshold, tempUnit)} safety threshold across all filtered venues.`}
                          </div>
                        )}
                      </div>

                      {/* KPI 6: Hottest Window / Peak Hourly Window */}
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
                            {analysisView === 'Extreme Events'
                              ? "The 3-hour period during typical days where solar radiation and diurnal thermal lagging produce peak Wet Bulb Globe Temperature (WBGT) exceedance risks."
                              : "The single hour of the standard daily diurnal cycle displaying the highest mean Wet Bulb Globe Temperature (WBGT)."}
                          </div>
                        )}
                      </div>

                    </div>

                    {analysisPeriod === 'Construction Period Only' && (
                      <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-5 space-y-3.5 shadow-sm mt-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                          <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-widest font-sans">
                            Construction Period Analysis Active
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                          <p className="text-xs text-amber-800 leading-relaxed font-sans md:col-span-2 font-medium">
                            The metrics shown below are calculated only from observations occurring during the estimated construction, renovation, modernization, expansion, or FIFA preparation period for each host venue.
                          </p>
                          <div className="bg-white border border-amber-100 p-3 shadow-3xs rounded-lg text-[10px] leading-relaxed font-sans space-y-1 my-0.5">
                            <div>
                              <span className="text-slate-400 uppercase font-extrabold text-[8px] block">Construction Window</span>
                              <span className="font-mono font-bold text-amber-900">Venue-specific (ranges 16 to 831 days)</span>
                            </div>
                            <div className="pt-1 border-t border-slate-100">
                              <span className="text-slate-400 uppercase font-extrabold text-[8px] block">Study Window</span>
                              <span className="font-mono font-semibold text-slate-800">1 Jan 2024 – 28 May 2026</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Left Rank Bars vs Right Overview map */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Bar chart - 7 cols */}
                      <div className="lg:col-span-7">
                        <RankingBarChart
                          stadiums={filteredStadiums}
                          metric={analysisView === 'Extreme Events' ? 'maxWBGT' : 'avgWBGT'}
                          metricTitle={analysisView === 'Extreme Events' ? 'Peak Wet Bulb Globe Temperature (WBGT) Max' : 'Average Wet Bulb Globe Temperature (WBGT) Mean'}
                          activeThreshold={activeThreshold}
                          tempUnit={tempUnit}
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
                              <span className="text-blue-800">{formatTemp(13.6, tempUnit)} WBGT</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>Base Camp (Training) average heat:</span>
                              <span className="text-orange-600">{formatTemp(17.3, tempUnit)} WBGT</span>
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

                          <MiniHotspotMap
                            stadiums={filteredStadiums}
                            activeThreshold={activeThreshold}
                            tempUnit={tempUnit}
                            analysisView={analysisView}
                            selectedStadium={selectedStadium}
                            onSelectStadium={setSelectedStadium}
                            setActiveTab={setActiveTab}
                          />
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
                        activeThreshold={activeThreshold}
                        tempUnit={tempUnit}
                      />
                      <HourlyTrendChart
                        hours={dashboardData.hours}
                        title="Composite hourly Wet Bulb Globe Temperature (WBGT) vs Dry Air Temperature"
                        analysisView={analysisView}
                        activeThreshold={activeThreshold}
                        tempUnit={tempUnit}
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
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <div className="w-full">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Observatory Location Focus</label>
                        <p className="text-xs text-slate-500 font-medium mb-2.5">Focus the climatological observatory on any match stadium or training base camp</p>
                        <select
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-900"
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
                    </div>

                    {activeSelectedStadium && (() => {
                      const selectedStadium = activeSelectedStadium;
                      const MONTHS_DATA = dashboardData.months;
                      const HEATMAP_DATA = dashboardData.heatmap;
                      return (
                        <div className="space-y-6">
                          {analysisPeriod === 'Construction Period Only' && (
                            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-5 space-y-3.5 shadow-sm mt-1 animate-fade-in">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                                <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-widest font-sans">
                                  Construction Period Analysis Active
                                </h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                                <p className="text-xs text-amber-805 text-amber-800 leading-relaxed font-sans md:col-span-2 font-medium">
                                  The metrics shown below are calculated only from observations occurring during the estimated construction, renovation, modernization, expansion, or FIFA preparation period for this venue.
                                </p>
                                <div className="bg-white border border-amber-100 p-3 shadow-3xs rounded-lg text-[10px] leading-relaxed font-sans space-y-1.5 shadow-3xs my-0.5">
                                  <div>
                                    <span className="text-slate-400 uppercase font-extrabold text-[8px] block mt-0.5 font-sans">Construction Window</span>
                                    <span className="font-mono font-bold text-amber-900">
                                      {getConstructionInfo(selectedStadium.key).formattedRange}
                                    </span>
                                  </div>
                                  <div className="pt-1.5 border-t border-slate-100 font-medium">
                                    <span className="text-slate-400 uppercase font-extrabold text-[8px] block">Study Window</span>
                                    <span className="font-mono font-semibold text-slate-800">1 Jan 2024 – 28 May 2026</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

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
                                  selectedStadium.type === 'Match' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-950'
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
                                <span className="text-sm font-black text-slate-800 block mt-0.5">{formatTemp(selectedStadium.maxTemp, tempUnit)}</span>
                                <span className="text-[10px] text-slate-400 block font-medium">Observed: {selectedStadium.maxTempDate}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase font-bold">Highest WBGT Heat Stress Limit</span>
                                <span className="text-sm font-black text-red-600 block mt-0.5">{formatTemp(selectedStadium.maxWBGT, tempUnit)}</span>
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

                          {/* Construction & Preparation Timeline Card */}
                          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                            <h4 className="text-xs font-extrabold text-[#1e3a8a] uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center justify-between">
                              <span>Construction & Preparation Timeline</span>
                              <span className="font-mono text-[9px] bg-blue-50/50 text-[#1e3a8a] border border-blue-100/60 px-1.5 py-0.5 rounded font-bold uppercase">Estimated</span>
                            </h4>
                            {(() => {
                              const info = getConstructionInfo(selectedStadium.key);
                              return (
                                <div className="space-y-4 text-xs font-sans">
                                  <div>
                                    <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Construction Window</span>
                                    <span className="font-black text-slate-800 text-sm block">
                                      {info.formattedRange}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">
                                      Active modernization and preparation timeframe
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 pt-1">
                                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Duration</span>
                                      <span className="text-xs font-black text-slate-900 block mt-0.5">{info.durationDays} days</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Share of Study</span>
                                      <span className="text-xs font-black text-slate-900 block mt-0.5">{info.sharePercentage}%</span>
                                    </div>
                                  </div>
                                  
                                  {/* Simple Embedded Timeline */}
                                  <div className="pt-2 border-t border-slate-100">
                                    <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1.5">Study Timeline Progress</span>
                                    <StadiumTimeline stadiumKey={selectedStadium.key} />
                                  </div>
                                </div>
                              );
                            })()}
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
                                <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">WBGT ≥ {formatTemp(activeThreshold, tempUnit)} total</span>
                              </div>
                              <div 
                                className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl text-center relative group cursor-help"
                                title={`Threshold Exceedance Days: A calendar day is counted of exceedance if any single hourly Wet Bulb Globe Temperature (WBGT) observation is at or above the active ACGIH threshold of ${formatTemp(activeThreshold, tempUnit)}.`}
                              >
                                <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Threshold Exceedance Days</span>
                                <span className="text-lg font-black text-slate-800 block">{selectedStadium.highRiskDays} days</span>
                                <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Days with WBGT ≥ {formatTemp(activeThreshold, tempUnit)}</span>
                              </div>
                              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Longest Heat Event</span>
                                <span className="text-lg font-black text-red-650 block">{selectedStadium.longestHeatEvent} hrs</span>
                                <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Consecutive hours exceeding {formatTemp(activeThreshold, tempUnit)}</span>
                              </div>
                              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Streak Exceedance</span>
                                <span className="text-lg font-black text-slate-800 block">{selectedStadium.consecutiveExceedanceDays} days</span>
                                <span className="text-[9px] text-slate-400 block font-semibold mt-0.5 font-sans">Consecutive days exceeding {formatTemp(activeThreshold, tempUnit)}</span>
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
                                      backgroundColor: getACGIHRiskColorHex(getACGIHRiskCategory(monthlyWbgt, activeThreshold)),
                                      color: '#fff'
                                    }}
                                  >
                                    <span className="opacity-80 text-[10px]">{m.name}</span>
                                    <span className="text-sm font-black">{formatTemp(monthlyWbgt, tempUnit, false)}°</span>
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
                              const risk = getACGIHRiskCategory(val, activeThreshold);
                              
                              const fullMonthName = currentMonthObj ? (() => {
                                const fullNames: Record<number, string> = {
                                  1: "January",
                                  2: "February",
                                  3: "March",
                                  4: "April",
                                  5: "May",
                                  6: "June",
                                  7: "July",
                                  8: "August",
                                  9: "September",
                                  10: "October",
                                  11: "November",
                                  12: "December"
                                };
                                return fullNames[currentMonthObj.month] || currentMonthObj.name;
                              })() : "";

                              let adviceDesc = "Normal activity expected. Perfect athletic operational climate.";
                              if (risk === 'Extreme') adviceDesc = "Extreme risk relative to threshold. Heat illness can strike rapidly. Suspend prolonged outdoor activity and heavy labor.";
                              else if (risk === 'Very High') adviceDesc = "Very high risk relative to threshold. Heat exhaustion likely. Rotate shifts, provide direct air conditioning corridors and salt tab water.";
                              else if (risk === 'High') adviceDesc = "High risk of heat cramps and muscular failures. Regular mandatory cooling breaks inside the shaded areas.";
                              else if (risk === 'Caution') adviceDesc = "Caution risk. Under continuous exposure fatigue begins. Maintain diligent hydration systems.";

                              const isExtreme = analysisView === 'Extreme Events';

                              return (
                                <div className="mt-3 p-4 bg-slate-50 border border-slate-100 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs transition-all">
                                  <div>
                                    <div className="font-bold text-slate-800 uppercase text-[10px] tracking-widest mb-1">
                                      {fullMonthName.toUpperCase()} Heat Status for {selectedStadium.name}
                                    </div>
                                    <p className="text-slate-600">
                                      {isExtreme ? (
                                        <>The highest observed WBGT during {fullMonthName} reached <strong className="text-slate-900">{formatTemp(val, tempUnit)} WBGT</strong></>
                                      ) : (
                                        <>Average {fullMonthName} WBGT conditions reach <strong className="text-slate-900">{formatTemp(val, tempUnit)} WBGT</strong></>
                                      )} placing this month in the <strong className="text-slate-950 uppercase font-black" style={{ color: getACGIHRiskColorHex(risk) }}>{risk} Risk</strong> category (Relative to ACGIH safety threshold of {formatTemp(activeThreshold, tempUnit)}).
                                    </p>
                                    <p className="text-slate-500 mt-1 italic">
                                      Safety advice: {adviceDesc}
                                    </p>
                                  </div>
                                  <div className="px-3 py-2 rounded-lg font-black text-center text-xs shrink-0 w-32 border border-slate-800 text-white" style={{
                                    backgroundColor: getACGIHRiskColorHex(risk)
                                  }}>
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
                                <FileCode className="text-yellow-400 w-5 h-5" /> Generate Venue Technical Report
                              </h4>
                              <p className="text-slate-400 text-xs mt-1">
                                Assemble all historical metrics, coordinates, elevations, and risk warnings of {selectedStadium.name} into an technical assessment report.
                              </p>
                            </div>
                            <button
                              onClick={() => downloadVenueReport(selectedStadium)}
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold py-2.5 px-4 transition self-start md:self-auto flex items-center gap-1.5 shrink-0 shadow-sm"
                            >
                              <Download className="w-4 h-4" /> Download Technical Report
                            </button>
                          </div>

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
                        <div className="text-sm font-extrabold text-slate-800">{formatTemp(14.2, tempUnit)} Average WBGT</div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Spans high continental variance. Open air stadiums in eastern coastal clusters (MetLife NJ, Miami, Philadelphia) experience high hot-humid peaks in June.
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                        <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest">Mexico Venues</h4>
                        <div className="text-sm font-extrabold text-slate-800">{formatTemp(16.8, tempUnit)} Average WBGT</div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Guadalajara and Mexico City gain relative relief from their extreme high elevations (up to 2,240m) but suffer heavy afternoon solar load. Monterrey experiences arid air heat.
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                        <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest">Canada Venues</h4>
                        <div className="text-sm font-extrabold text-slate-850">{formatTemp(8.4, tempUnit)} Average WBGT</div>
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
                                  const isExtremeTooltip = analysisView === 'Extreme Events';
                                  const monthNames: Record<number, string> = {
                                    1: "January", 2: "February", 3: "March", 4: "April", 
                                    5: "May", 6: "June", 7: "July", 8: "August", 
                                    9: "September", 10: "October", 11: "November", 12: "December"
                                  };
                                  const mName = monthNames[m] || "";
                                  const typeLabel = isExtremeTooltip ? "peak" : "average";
                                  return (
                                    <div
                                      key={m}
                                      className="py-1.5 rounded text-center text-xs font-extrabold flex flex-col justify-center cursor-help transition-all shadow-3xs"
                                      style={{
                                        backgroundColor: getACGIHRiskColorHex(getACGIHRiskCategory(val, activeThreshold)),
                                        color: '#fff'
                                      }}
                                      title={`${name} · ${mName} ${typeLabel}: ${formatTemp(val, tempUnit)} WBGT (${getACGIHRiskCategory(val, activeThreshold)} Risk Category)`}
                                    >
                                      {formatTemp(val, tempUnit, false)}°
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
                              <th className="p-3 font-bold text-center">Construction Window</th>
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
                                <td className="p-3 text-center font-mono text-[10px] whitespace-nowrap text-slate-700">
                                  {(() => {
                                    const info = getConstructionInfo(st.key);
                                    return (
                                      <span title={`${info.formattedRange} (${info.durationDays} days)`} className="font-semibold">
                                        📅 {info.formattedRangeShort} <span className="text-amber-800 font-bold">({info.durationDays}d)</span>
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="p-3 text-center font-mono">{formatTemp(st.avgTemp, tempUnit)}</td>
                                <td className="p-3 text-center font-mono text-slate-700">{formatTemp(st.maxTemp, tempUnit)}</td>
                                <td className="p-3 text-center font-mono font-bold text-emerald-700">{formatTemp(st.avgWBGT, tempUnit)}</td>
                                <td className="p-3 text-center font-mono font-bold text-red-600">{formatTemp(st.maxWBGT, tempUnit)}</td>
                                <td className="p-3 text-center font-mono">{st.avgRH.toFixed(0)}%</td>
                                <td className="p-3 text-center font-mono text-[10px] text-purple-800 font-bold">{st.climateZone}</td>
                              </tr>
                            ))}
                            {sortedStadiumsForComparison.length === 0 && (
                              <tr>
                                <td colSpan={10} className="p-5 text-center italic text-slate-400">
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
                                 <span className="font-extrabold text-[#c1292e] text-sm mt-0.5">{formatTemp(ev.peakWBGT, tempUnit)}</span>
                               </div>
                               <div className="bg-slate-50 p-2 px-3 rounded-lg text-center min-w-24">
                                 <span className="text-[9px] text-slate-400 block uppercase">Peak Air Temp</span>
                                 <span className="font-extrabold text-slate-800 text-sm mt-0.5">{formatTemp(ev.peakTemp, tempUnit)}</span>
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
                          {analysisPeriod === 'Construction Period Only' ? (
                            "No extreme events were identified within the selected construction-period window."
                          ) : (
                            "No extreme heat records match the filter criteria"
                          )}
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
                        
                        {/* 1. Overview */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-800" />
                            1. Overview
                          </h3>
                          <div className="text-xs text-slate-600 space-y-3 leading-relaxed font-semibold">
                            <p>
                              The FIFA 2026 Heat Risk Observatory assesses environmental heat exposure conditions across selected FIFA 2026 host venues, training sites, and associated construction or renovation periods in the United States, Canada, and Mexico.
                            </p>
                            <p>
                              The observatory is designed to support exploration of potential heat-related risks affecting workers, athletes, spectators, and surrounding communities under a range of environmental and operational conditions.
                            </p>
                            <p>
                              The platform combines reanalysis climate data, satellite-derived environmental variables, microclimate modelling, and occupational heat-exposure thresholds to evaluate heat stress conditions across locations and time periods.
                            </p>
                          </div>
                        </section>

                        {/* 2. Data Sources */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Database className="w-5 h-5 text-emerald-800" />
                            2. Data Sources
                          </h3>
                          <div className="text-xs text-slate-600 space-y-3 leading-relaxed font-semibold">
                            <p>
                              The observatory uses publicly available environmental datasets, including:
                            </p>
                            <ul className="list-disc pl-5 space-y-1.5 text-slate-500 font-medium my-2">
                              <li>ERA5 reanalysis data</li>
                              <li>NASA POWER meteorological products</li>
                              <li>FIFA venue and training-site information</li>
                              <li>Publicly documented stadium construction, renovation, modernization, and preparation timelines</li>
                            </ul>
                            <p className="pt-2 font-semibold">
                              Environmental variables incorporated into the analysis include:
                            </p>
                            <ul className="list-disc pl-5 space-y-1.5 text-slate-500 font-medium my-1">
                              <li>Air temperature</li>
                              <li>Relative humidity</li>
                              <li>Wind speed</li>
                              <li>Solar radiation</li>
                              <li>Atmospheric pressure</li>
                            </ul>
                          </div>
                        </section>

                        {/* 3. Wet Bulb Globe Temperature (WBGT) */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-red-700" />
                            3. Wet Bulb Globe Temperature (WBGT)
                          </h3>
                          <div className="text-xs text-slate-600 space-y-3 leading-relaxed font-semibold">
                            <p>
                              Heat stress conditions are estimated using the Wet Bulb Globe Temperature (WBGT), a widely used heat-stress indicator that incorporates the combined effects of:
                            </p>
                            <ul className="list-disc pl-5 space-y-1.5 text-slate-500 font-medium my-2">
                              <li>Air temperature</li>
                              <li>Humidity</li>
                              <li>Solar radiation</li>
                              <li>Wind conditions</li>
                            </ul>
                            <p className="pt-2">
                              The observatory applies a physically based WBGT modelling framework derived from the Liljegren heat-stress methodology to estimate hourly WBGT conditions for each venue.
                            </p>
                          </div>
                        </section>

                        {/* 4. Surface Environment Scenarios */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Compass className="w-5 h-5 text-indigo-700" />
                            4. Surface Environment Scenarios
                          </h3>
                          <div className="text-xs text-slate-600 space-y-4 leading-relaxed font-semibold">
                            <p>
                              Users may explore two surface environments:
                            </p>
                            
                            <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                              <div>
                                <h4 className="font-bold text-slate-800 text-xs">Grass / Artificial Turf</h4>
                                <p className="text-slate-505 font-medium mt-0.5">Represents conditions associated with natural grass or artificial playing surfaces typically found within stadium environments.</p>
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-xs">Concrete Surface</h4>
                                <p className="text-slate-505 font-medium mt-0.5">Represents conditions associated with exposed concrete environments that may absorb, store, and re-radiate additional heat energy.</p>
                              </div>
                            </div>

                            <p className="pt-1">
                              Surface scenarios are intended to support comparative exploration of how environmental conditions may differ across venue surroundings and work environments.
                            </p>
                          </div>
                        </section>

                        {/* 5. Typical Conditions and Extreme Events */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Sun className="w-5 h-5 text-amber-700" />
                            5. Typical Conditions and Extreme Events
                          </h3>
                          <div className="text-xs text-slate-600 space-y-4 leading-relaxed font-semibold">
                            <p>
                              The observatory supports two analytical perspectives.
                            </p>

                            <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                              <div>
                                <h4 className="font-bold text-slate-800 text-xs">Typical Conditions</h4>
                                <p className="text-slate-505 font-medium mt-0.5">Displays monthly climatological averages representing typical environmental conditions observed during the study period.</p>
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-xs">Extreme Events</h4>
                                <p className="text-slate-505 font-medium mt-0.5">Displays peak observed monthly WBGT values representing the most severe heat exposure conditions recorded within the available dataset.</p>
                              </div>
                            </div>

                            <p className="pt-1">
                              These perspectives allow users to compare expected environmental conditions with potential worst-case heat exposure scenarios.
                            </p>
                          </div>
                        </section>

                        {/* 6. Occupational Heat Exposure Thresholds */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-red-800" />
                            6. Occupational Heat Exposure Thresholds
                          </h3>
                          <div className="text-xs text-slate-600 space-y-3 leading-relaxed font-semibold">
                            <p>
                              The observatory incorporates threshold values derived from guidance published by the American Conference of Governmental Industrial Hygienists (ACGIH).
                            </p>
                            <p className="font-semibold">
                              Users may explore multiple combinations of:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-slate-500 font-medium my-2">
                              <li>Workload intensity (Light, Moderate, Heavy)</li>
                              <li>Work-rest schedules</li>
                              <li>Exposure thresholds</li>
                            </ul>
                            <p className="pt-2">
                              Heat-risk categories displayed throughout the dashboard are evaluated relative to the selected ACGIH threshold.
                            </p>
                            <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3.5 text-amber-900 font-semibold italic">
                              The observatory is intended as an analytical and educational tool and does not constitute occupational safety guidance or regulatory determination.
                            </div>
                          </div>
                        </section>

                        {/* 7. Construction Period Analysis */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-700" />
                            7. Construction Period Analysis
                          </h3>
                          <div className="text-xs text-slate-605 space-y-3 leading-relaxed font-semibold">
                            <p>
                              For venues with documented construction, renovation, modernization, expansion, or tournament-preparation activities, users may examine environmental heat conditions occurring during the associated project period.
                            </p>
                            <p className="font-semibold">
                              Construction-period analysis evaluates:
                            </p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-500 font-medium my-2 pl-1">
                              <li className="flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-blue-500" /> Average WBGT conditions</li>
                              <li className="flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-blue-500" /> Maximum WBGT conditions</li>
                              <li className="flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-blue-500" /> Threshold exceedances</li>
                              <li className="flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-blue-500" /> Percentage of hours above selected thresholds</li>
                              <li className="flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-blue-500" /> Percentage of days experiencing exceedances</li>
                              <li className="flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-blue-500" /> Duration of consecutive heat events</li>
                            </ul>
                            <p className="pt-2">
                              This functionality is intended to provide contextual insight into potential environmental heat exposure conditions during periods of venue development and preparation.
                            </p>
                          </div>
                        </section>

                        {/* 8. Study Period */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-800" />
                            8. Study Period
                          </h3>
                          <div className="text-xs text-slate-605 space-y-3 leading-relaxed font-semibold">
                            <p>
                              The current observatory evaluates hourly conditions spanning:
                            </p>
                            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-sm font-black text-slate-800 inline-block font-sans">
                              1 January 2024 – 28 May 2026
                            </div>
                            <p>
                              covering FIFA 2026 host venues, training sites, and selected case-study locations.
                            </p>
                          </div>
                        </section>

                        {/* 9. Interpretation */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                          <h3 className="text-base font-bold text-slate-950 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                            <Scale className="w-5 h-5 text-slate-700" />
                            9. Interpretation
                          </h3>
                          <div className="text-xs text-slate-605 space-y-3 leading-relaxed font-semibold">
                            <p>
                              The observatory is designed to support transparent exploration of environmental heat conditions rather than prediction of future outcomes.
                            </p>
                            <p>
                              Results should be interpreted as estimates derived from available environmental datasets, modelling assumptions, and documented project timelines.
                            </p>
                            <p>
                              The platform is intended to encourage evidence-based discussion regarding heat exposure, worker safety, athlete welfare, and climate resilience in the context of major sporting events.
                            </p>
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
                              <span className="text-slate-800 font-bold block">ACGIH TLV® Framework</span>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-normal">Standardized evaluation of physical heat strain on active individuals under workload classifications.</p>
                            </div>

                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Study Period</span>
                              <span className="text-slate-800 font-bold block">1 January 2024 – 28 May 2026</span>
                              <p className="text-[10px] text-slate-500 mt-1.5 font-normal leading-normal">
                                Hourly WBGT estimates derived from ERA5 and NASA POWER data for FIFA 2026 host venues and training sites across the United States, Canada, and Mexico.
                              </p>
                              <div className="mt-2 pt-1.5 border-t border-slate-100 flex justify-between items-center text-[10px]">
                                <span className="text-[9px] text-slate-400 uppercase font-bold">Total Observation Window</span>
                                <span className="text-slate-800 font-bold">879 days</span>
                              </div>
                            </div>

                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Occupational Safe Limit</span>
                              <span className="text-blue-900 font-bold block">{formatTemp(activeThreshold, tempUnit)} WBGT Threshold</span>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-normal">The point where {workload.toLowerCase()} in a {workRestRegimen.toLowerCase()} scheme requires direct rest rotations and environmental shade barriers.</p>
                            </div>
                          </div>
                        </div>

                        {/* Research Organizations Credits */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm text-xs text-slate-600">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                            Research Partners
                          </h4>
                          <p className="leading-relaxed">
                            EQUIDEM's FIFA 2026 Heat Risk Observatory is an independent research and monitoring platform designed to examine heat exposure risks affecting workers, athletes, spectators, and surrounding communities across FIFA 2026 host locations. The observatory combines climate data, microclimate modelling, and construction-period analysis to support evidence-based discussion on occupational heat exposure and extreme heat risk.
                          </p>
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Data Sources:</span>
                            <p className="text-[10px] text-slate-500 font-medium leading-normal leading-relaxed">
                              ERA5 Reanalysis, NASA POWER, FIFA venue information, publicly documented construction and renovation records.
                            </p>
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
                              {(() => {
                                const T = getACGIHThreshold(workload, workRestRegimen);
                                const acgihCategories = [
                                  {
                                    level: 'Safe',
                                    range: `< ${formatTemp(T - 3.0, tempUnit, false)}°`,
                                    effects: 'Permissible environmental zone for prolonged occupational labor without mandatory physiological cooling intervals.',
                                    color: 'bg-emerald-50 text-emerald-800 border-emerald-250',
                                  },
                                  {
                                    level: 'Caution',
                                    range: `${formatTemp(T - 3.0, tempUnit, false)}–${formatTemp(T, tempUnit, false)}°`,
                                    effects: 'Increased thermal load. Worker core temperature should be monitored; standard hydration loops recommended.',
                                    color: 'bg-amber-50 text-amber-800 border-amber-250',
                                  },
                                  {
                                    level: 'High',
                                    range: `${formatTemp(T, tempUnit, false)}–${formatTemp(T + 2.0, tempUnit, false)}°`,
                                    effects: `ACGIH Occupational Exposure Limit threshold exceeded (${formatTemp(T, tempUnit)}). Enforced heat mitigation plans active.`,
                                    color: 'bg-orange-50 text-orange-950 border-orange-255',
                                  },
                                  {
                                    level: 'Very High',
                                    range: `${formatTemp(T + 2.0, tempUnit, false)}–${formatTemp(T + 4.0, tempUnit, false)}°`,
                                    effects: 'Severely elevated risk of heat cramps, exhaustion, and physical decompensation.',
                                    color: 'bg-red-50 text-red-800 border-red-250',
                                  },
                                  {
                                    level: 'Extreme',
                                    range: `> ${formatTemp(T + 4.0, tempUnit, false)}°`,
                                    effects: `Dangerous work environment. Stop all non-critical work.`,
                                    color: 'bg-rose-950 text-rose-100 border-rose-900',
                                  }
                                ];
                                return acgihCategories.map((tr) => (
                                  <tr key={tr.level} className="hover:bg-slate-50">
                                    <td className="p-3.5 font-bold font-mono text-sm text-slate-900">{tr.range}</td>
                                    <td className="p-3.5 text-[11px] font-bold">
                                      <span className={`px-2.5 py-1 rounded inline-block text-[10px] font-extrabold uppercase border ${tr.color}`}>
                                        {tr.level} Risk
                                      </span>
                                    </td>
                                    <td className="p-3.5 text-[11px] text-slate-650 leading-relaxed font-semibold italic">{tr.effects}</td>
                                  </tr>
                                ));
                              })()}
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
                          <p className="text-[10px] uppercase text-slate-400 font-bold mt-1">This observatory references the following verified publications:</p>
                        </div>

                        <div className="space-y-4 text-xs">
                          {/* Citation 1 */}
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-1.5">
                            <span className="font-extrabold text-blue-800 uppercase text-[9px] block">ACGIH Heat Stress Threshold Values</span>
                            <p className="text-slate-600 leading-relaxed font-semibold italic">
                              "Threshold Limit Values (TLVs) for Chemical Substances and Physical Agents & Biological Exposure Indices (BEIs), Workload and Work-Rest Regimens, 2024."
                            </p>
                          </div>

                          {/* Citation 2 */}
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-1.5">
                            <span className="font-extrabold text-blue-800 uppercase text-[9px] block">Liljegren Wet Bulb Globe Temperature (WBGT) Model</span>
                            <p className="text-slate-600 leading-relaxed font-semibold italic">
                              "Modeling the Wet Bulb Globe Temperature Using Standard Meteorological Measurements, Journal of Occupational and Environmental Hygiene, 2008."
                            </p>
                          </div>

                          {/* Citation 3 */}
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-1.5">
                            <span className="font-extrabold text-blue-800 uppercase text-[9px] block">ERA5 Atmospheric Reanalysis (ECMWF)</span>
                            <p className="text-slate-600 leading-relaxed font-semibold italic">
                              "The ERA5 global reanalysis of hourly atmospheric, surface and wave variables, European Centre for Medium-Range Weather Forecasts (ECMWF), 2020."
                            </p>
                          </div>

                          {/* Citation 4 */}
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-1.5">
                            <span className="font-extrabold text-blue-800 uppercase text-[9px] block">NASA POWER Meteorological and Solar Data</span>
                            <p className="text-slate-600 leading-relaxed font-semibold italic">
                              "Prediction Of Worldwide Energy Resources (POWER) project, solar radiation and ambient meteorological parameter records, NASA Langley Research Center."
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
                    
                    <div className="bg-white border border-[#d9e2ec] rounded-xl p-6 space-y-6 shadow-xs">
                      <div>
                        <h4 className="text-md font-extrabold text-slate-900 tracking-tight uppercase">Exports & Data Access</h4>
                        <p className="text-xs text-slate-500 mt-1">Generate reports and export observatory data based on the current analysis configuration.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* CARD 1: Export Current Analysis */}
                        <div className="bg-slate-50/50 p-6 rounded-lg border border-slate-100 flex flex-col justify-between space-y-4 hover:border-slate-200 transition">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-blue-50 text-blue-900 rounded-md">
                                <FileText className="w-4 h-4" />
                              </span>
                              <span className="font-extrabold text-xs text-slate-900 uppercase tracking-tight block">Export Current Analysis</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Generate a PDF snapshot of the current dashboard state. Includes selected configurations (surface, view, period), active ACGIH guidelines thresholds, and aggregate climatological KPI summaries.
                            </p>
                            
                            {/* Live Parameters preview inside the card to make it feel rich and real-time */}
                            <div className="bg-white border border-slate-150 p-3 rounded-lg text-[9px] text-slate-500 space-y-1 font-mono">
                              <div className="flex justify-between"><span className="font-semibold">Surface Mode:</span> <span className="text-slate-700 truncate max-w-[120px]">{surfaceMode}</span></div>
                              <div className="flex justify-between"><span className="font-semibold">Scenario View:</span> <span className="text-slate-700">{analysisView}</span></div>
                              <div className="flex justify-between"><span className="font-semibold">Threshold:</span> <span className="text-slate-700">{formatTemp(activeThreshold, tempUnit)} WBGT</span></div>
                            </div>
                          </div>
                          
                          <button
                            onClick={downloadCurrentAnalysisPDF}
                            className="w-full bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-xs font-bold py-2.5 transition flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Generate PDF Report
                          </button>
                        </div>

                        {/* CARD 2: Venue Brief */}
                        <div className="bg-slate-50/50 p-6 rounded-lg border border-slate-100 flex flex-col justify-between space-y-4 hover:border-slate-200 transition">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-sky-50 text-sky-800 rounded-md">
                                <MapPin className="w-4 h-4" />
                              </span>
                              <span className="font-extrabold text-xs text-slate-900 uppercase tracking-tight block">Venue Brief</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Generate a concise venue-specific PDF summary. Isolates geographic configurations, baseline reanalysis historical WBGT models, exceedance ratios, and any active construction segments for our currently focused venue.
                            </p>
                            
                            {activeSelectedStadium ? (
                              <div className="bg-white border border-slate-150 p-3 rounded-lg text-[9px] text-slate-500 space-y-1 font-mono">
                                <div className="flex justify-between"><span className="font-semibold">Active Venue:</span> <span className="text-blue-900 font-bold truncate max-w-[124px]">{activeSelectedStadium.stadiumName}</span></div>
                                <div className="flex justify-between"><span className="font-semibold">Capacity:</span> <span className="text-slate-700">{activeSelectedStadium.capacity.toLocaleString()} seats</span></div>
                                <div className="flex justify-between"><span className="font-semibold">Base Country:</span> <span className="text-slate-700">{activeSelectedStadium.country}</span></div>
                              </div>
                            ) : (
                              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[10px] text-amber-800">
                                Select a venue in the dashboard to generate a brief.
                              </div>
                            )}
                          </div>

                          {activeSelectedStadium ? (
                            <button
                              onClick={downloadVenueBriefPDF}
                              className="w-full bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-xs font-bold py-2.5 transition flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" /> Download Venue Brief
                            </button>
                          ) : (
                            <button
                              disabled
                              className="w-full bg-slate-200 text-slate-400 rounded-lg text-xs font-bold py-2.5 flex items-center justify-center gap-1.5 cursor-not-allowed"
                            >
                              <Download className="w-3.5 h-3.5" /> Select a venue to generate a venue brief
                            </button>
                          )}
                        </div>

                        {/* CARD 3: Data Exports */}
                        <div className="bg-slate-50/50 p-6 rounded-lg border border-slate-100 flex flex-col justify-between space-y-4 hover:border-slate-200 transition">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-emerald-50 text-emerald-800 rounded-md">
                                <FileSpreadsheet className="w-4 h-4" />
                              </span>
                              <span className="font-extrabold text-xs text-slate-900 uppercase tracking-tight block">Download Datasets</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Export the underlying meteorological reanalysis records compiled from NASA and ERA5. Select from our aggregate summary baseline or localized stadium construction/modernization period logs.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <button
                              onClick={downloadSummaryCSV}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10.5px] font-bold py-2.5 transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" /> Summary CSV
                            </button>
                            <button
                              onClick={downloadConstructionCSV}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10.5px] font-bold py-2.5 transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" /> Construction CSV
                            </button>
                          </div>
                        </div>

                        {/* CARD 4: Methodology */}
                        <div className="bg-slate-50/50 p-6 rounded-lg border border-slate-100 flex flex-col justify-between space-y-4 hover:border-slate-200 transition">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-amber-50 text-amber-800 rounded-md">
                                <BookOpen className="w-4 h-4" />
                              </span>
                              <span className="font-extrabold text-xs text-slate-900 uppercase tracking-tight block">Methodology & Documentation</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Download the official research methodology report. Explains Liljegren heat-mass balances calculations, ERA5/NASA power downscaling, Köppen zones, of ACGIH safety thresholds, and construction guidelines.
                            </p>
                          </div>
                          
                          <button
                            onClick={downloadMethodologyPDF}
                            className="w-full bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-xs font-bold py-2.5 transition flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Download Methodology PDF
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
            <h4 className="font-extrabold text-slate-800">EQUIDEM FIFA 2026 Heat Risk Observatory</h4>
            <p>© 2026 EQUIDEM. This observatory was developed to assess heat exposure risks associated with FIFA 2026 host venues, training sites, and related construction activities using publicly available climate and environmental data sources.</p>
            <p className="text-slate-600">
              For inquiries, feedback, or collaboration opportunities:
              <a
                href="mailto:info@equidem.org"
                className="ml-1 text-blue-600 hover:underline font-medium"
                >
                info@equidem.org
              </a></p>
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
