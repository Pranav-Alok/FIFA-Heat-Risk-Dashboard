export interface ConstructionPeriod {
  stadiumKey: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export const CONSTRUCTION_DATASET: ConstructionPeriod[] = [
  { stadiumKey: "MercedesBenz_Atlanta", startDate: "2026-02-01", endDate: "2026-05-27" },
  { stadiumKey: "BCPlace_Vancouver", startDate: "2024-05-15", endDate: "2026-05-14" },
  { stadiumKey: "Gillette_Boston", startDate: "2026-02-01", endDate: "2026-03-13" },
  { stadiumKey: "ATT_Dallas", startDate: "2024-01-02", endDate: "2026-05-15" },
  { stadiumKey: "NRG_Houston", startDate: "2026-04-30", endDate: "2026-05-28" },
  { stadiumKey: "SoFi_LA", startDate: "2026-04-15", endDate: "2026-05-27" },
  { stadiumKey: "MetLife_NYNJ", startDate: "2024-01-01", endDate: "2026-05-08" },
  { stadiumKey: "Lumen_Seattle", startDate: "2026-02-01", endDate: "2026-05-28" },
  { stadiumKey: "Mansfield_TX", startDate: "2024-12-18", endDate: "2026-05-31" },
  { stadiumKey: "Azteca_MexicoCity", startDate: "2024-06-01", endDate: "2026-03-29" },
  { stadiumKey: "Akron_Guadalajara", startDate: "2025-05-12", endDate: "2026-03-23" },
  { stadiumKey: "BBVA_Monterrey", startDate: "2025-05-01", endDate: "2025-12-01" },
  { stadiumKey: "Arrowhead_KC", startDate: "2026-05-01", endDate: "2026-05-17" },
  { stadiumKey: "HardRock_Miami", startDate: "2026-05-01", endDate: "2026-05-28" },
  { stadiumKey: "LincolnFin_Philly", startDate: "2025-06-03", endDate: "2026-05-18" },
  { stadiumKey: "Levis_SF", startDate: "2024-07-24", endDate: "2025-08-31" },
  { stadiumKey: "BMOField_Toronto", startDate: "2024-12-01", endDate: "2026-03-24" }
];

export const STUDY_START_DATE = "2024-01-01";
export const STUDY_END_DATE = "2026-05-28";
export const STUDY_TOTAL_DAYS = 879; // January 1 2024 to May 28 2026 inclusive

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function formatDateLong(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
  }
  return dateStr;
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${day} ${MONTH_NAMES_SHORT[monthIdx]} ${year}`;
  }
  return dateStr;
}

export function formatDateShortMonthYear(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${MONTH_NAMES_SHORT[monthIdx]} ${year}`;
  }
  return dateStr;
}

export function getConstructionInfo(stadiumKey: string) {
  const match = CONSTRUCTION_DATASET.find(c => c.stadiumKey === stadiumKey);
  if (!match) {
    return {
      startDate: "",
      endDate: "",
      durationDays: 0,
      sharePercentage: 0,
      formattedRange: "N/A"
    };
  }

  const start = new Date(match.startDate);
  const end = new Date(match.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
  const sharePercentage = (durationDays / STUDY_TOTAL_DAYS) * 100;

  return {
    startDate: match.startDate,
    endDate: match.endDate,
    durationDays,
    sharePercentage: parseFloat(sharePercentage.toFixed(1)),
    formattedRange: `${formatDateLong(match.startDate)} – ${formatDateLong(match.endDate)}`,
    formattedRangeShort: `${formatDateShort(match.startDate)} – ${formatDateShort(match.endDate)}`
  };
}

export function getTimelinePosition(stadiumKey: string) {
  const match = CONSTRUCTION_DATASET.find(c => c.stadiumKey === stadiumKey);
  if (!match) return { left: 0, width: 0 };
  const studyStart = new Date(STUDY_START_DATE).getTime();
  const constStart = new Date(match.startDate).getTime();
  const constEnd = new Date(match.endDate).getTime();
  const diffStart = Math.max(0, constStart - studyStart);
  const startDays = Math.floor(diffStart / (1000 * 60 * 60 * 24));
  const diffTime = Math.abs(constEnd - constStart);
  const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const left = (startDays / STUDY_TOTAL_DAYS) * 100;
  const width = (durationDays / STUDY_TOTAL_DAYS) * 100;
  return {
    left: Math.min(100, parseFloat(left.toFixed(2))),
    width: Math.min(100 - left, parseFloat(width.toFixed(2)))
  };
}
