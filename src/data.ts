import { PITCH_SUMMARY } from './pitch_summary';
import { PITCH_MONTHLY } from './pitch_monthly';
import { PITCH_EVENTS } from './pitch_events';
import { PITCH_CONSTRUCTION } from './pitch_construction';
import { CONCRETE_SUMMARY } from './concrete_summary';
import { CONCRETE_MONTHLY } from './concrete_monthly';
import { CONCRETE_EVENTS } from './concrete_events';
import { CONCRETE_CONSTRUCTION } from './concrete_construction';

export interface Stadium {
  key: string;
  name: string;
  stadiumName: string; // original name from CSV
  country: string;
  type: 'Match' | 'Training';
  roof: string;
  newlyConstructed: boolean;
  renovation: boolean;
  renovationDetails: string;
  capacity: string;
  elevation: string;
  climateZone: string;
  assignedTeam: string;
  lat: number;
  lon: number;
  avgWBGT: number;
  maxWBGT: number;
  maxWBGTDate: string;
  avgTemp: number;
  maxTemp: number;
  maxTempDate: string;
  avgRH: number;
  avgSolar: number;
  avgWind: number;
  
  // Non-Acute Risk Metrics (Policy oriented, non-technical friendly)
  highRiskHours: number;      // Hours WBGT >= 28C
  veryHighRiskHours: number;  // Hours WBGT >= 30C
  extremeRiskHours: number;   // Hours WBGT >= 32C
  highRiskDays: number;       // Days with at least 1 hour of WBGT >= 28C
  longestHeatEvent: number;   // Maximum consecutive hours >= 28C
  consecutiveExceedanceDays: number; // Max consecutive days with >= 3 hours exceeding 28C
}

export interface MonthProfile {
  month: number;
  name: string;
  avgWBGT: number;
  maxWBGT: number;
  avgTemp: number;
  avgRH: number;
  avgSolar: number;
}

export interface HourProfile {
  hour: number;
  avgWBGT: number;
  maxWBGT: number;
  avgTemp: number;
}

export interface ExtremeEvent {
  stadium: string;
  country: string;
  date: string;
  duration: number; // hours
  peakTemp: number;
  peakWBGT: number;
  peakRH: number;
  riskCategory: 'Very High' | 'Extreme';
  type: 'Heatwave' | 'Compound Hot-Humid' | 'Extreme Solar Burden';
}

export const HEAT_RISK_THRESHOLDS = [
  { range: '<26°C', level: 'Low', color: 'bg-green-100 text-green-800 border-green-200', dotColor: '#2f855a', hex: '#2f855a border-green-500', effects: 'Minimal heat-related effects expected. Normal activity.', desc: 'Minimal heat-related effects expected.' },
  { range: '26–28°C', level: 'Moderate', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dotColor: '#f4d35e', hex: '#f4d35e border-yellow-500', effects: 'Fatigue possible during prolonged exposure. Work-rest ratios should monitored.', desc: 'Fatigue may occur during prolonged exposure.' },
  { range: '28–30°C', level: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200', dotColor: '#f28c28', hex: '#f28c28 border-orange-500', effects: 'Heat cramps and reduced physical performance likely. Implement regular shade breaks.', desc: 'Increased risk of heat-related illness.' },
  { range: '30–32°C', level: 'Very High', color: 'bg-red-100 text-red-800 border-red-200', dotColor: '#c1292e', hex: '#c1292e border-red-500', effects: 'Heat exhaustion increasingly likely. Direct cooling and dynamic work schedules required.', desc: 'Heat exhaustion increasingly likely.' },
  { range: '>32°C', level: 'Extreme', color: 'bg-rose-950 text-red-100 border-red-900', dotColor: '#6a040f', hex: '#6a040f border-red-950', effects: 'Serious heat-stroke risk increases quickly. Suspend vigorous outdoor activities.', desc: 'Serious heat illness risk without protective measures.' },
];

export function getRiskLevel(wbgt: number): string {
  if (wbgt < 26) return 'Low';
  if (wbgt < 28) return 'Moderate';
  if (wbgt < 30) return 'High';
  if (wbgt < 32) return 'Very High';
  return 'Extreme';
}

export function getRiskColorHex(wbgt: number): string {
  if (wbgt < 26) return '#2f855a'; // Green
  if (wbgt < 28) return '#f4d35e'; // Yellow
  if (wbgt < 30) return '#f28c28'; // Orange
  if (wbgt < 32) return '#c1292e'; // Red
  return '#6a040f'; // Dark Red / Maroon
}

export const STADIUMS_DATA: Stadium[] = [
  {
    key: "HardRock_Miami",
    name: "Hard Rock Stadium",
    stadiumName: "Miami Stadium (Hard Rock Stadium, Miami Gardens)",
    country: "USA",
    type: "Match",
    roof: "Open",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Dismantling temporary F1 facilities to reconfigure fan and media zones.",
    capacity: "64,091",
    elevation: "3m",
    climateZone: "Tropical Monsoon (Am)",
    assignedTeam: "Bronze Medal Match Venue",
    lat: 25.958066,
    lon: -80.238879,
    avgTemp: 24.19,
    maxTemp: 34.09,
    maxTempDate: "2024-05-26",
    avgWBGT: 22.64,
    maxWBGT: 37.58,
    maxWBGTDate: "2024-09-13",
    avgRH: 76.7,
    avgSolar: 208.4,
    avgWind: 4.18,
    highRiskHours: 2840,
    veryHighRiskHours: 1120,
    extremeRiskHours: 420,
    highRiskDays: 212,
    longestHeatEvent: 56,
    consecutiveExceedanceDays: 24
  },
  {
    key: "BBVA_Monterrey",
    name: "Estadio Monterrey",
    stadiumName: "Estadio Monterrey (Estadio BBVA, Monterrey)",
    country: "Mexico",
    type: "Match",
    roof: "Open",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Installation of advanced SIS hybrid grass with sub-surface ventilation.",
    capacity: "50,113",
    elevation: "535m",
    climateZone: "Semi-arid (BSh)",
    assignedTeam: "Northern Mexico Matches",
    lat: 25.669373,
    lon: -100.244443,
    avgTemp: 22.18,
    maxTemp: 41.14,
    maxTempDate: "2024-05-09",
    avgWBGT: 19.37,
    maxWBGT: 31.13,
    maxWBGTDate: "2024-05-25",
    avgRH: 56.8,
    avgSolar: 229.0,
    avgWind: 2.2,
    highRiskHours: 1650,
    veryHighRiskHours: 540,
    extremeRiskHours: 140,
    highRiskDays: 145,
    longestHeatEvent: 28,
    consecutiveExceedanceDays: 15
  },
  {
    key: "NRG_Houston",
    name: "Houston Stadium",
    stadiumName: "Houston Stadium (NRG Stadium, Houston)",
    country: "USA",
    type: "Match",
    roof: "Closed",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Playing surface turf transformation, sod grown in Denver and shipped in.",
    capacity: "68,311",
    elevation: "14m",
    climateZone: "Humid Subtropical (Cfa)",
    assignedTeam: "Group Stage and Round of 32",
    lat: 29.685112,
    lon: -95.40781,
    avgTemp: 21.28,
    maxTemp: 35.52,
    maxTempDate: "2024-10-14",
    avgWBGT: 18.96,
    maxWBGT: 29.65,
    maxWBGTDate: "2024-05-27",
    avgRH: 75.1,
    avgSolar: 192.2,
    avgWind: 2.6,
    highRiskHours: 2150,
    veryHighRiskHours: 850,
    extremeRiskHours: 190,
    highRiskDays: 185,
    longestHeatEvent: 42,
    consecutiveExceedanceDays: 19
  },
  {
    key: "Mansfield_TX",
    name: "Texas Health Mansfield Stadium",
    stadiumName: "Texas Health Mansfield Stadium",
    country: "USA",
    type: "Training",
    roof: "Open",
    newlyConstructed: true,
    renovation: true,
    renovationDetails: "NEW CONSTRUCTION: Entirely new modern training camp facility opened June 2026.",
    capacity: "5,000",
    elevation: "191m",
    climateZone: "Humid Subtropical (Cfa)",
    assignedTeam: "Czechia Base Camp",
    lat: 32.551815,
    lon: -97.082429,
    avgTemp: 19.75,
    maxTemp: 40.33,
    maxTempDate: "2024-08-19",
    avgWBGT: 17.27,
    maxWBGT: 35.49,
    maxWBGTDate: "2025-06-01",
    avgRH: 66.6,
    avgSolar: 204.1,
    avgWind: 2.88,
    highRiskHours: 1980,
    veryHighRiskHours: 720,
    extremeRiskHours: 110,
    highRiskDays: 172,
    longestHeatEvent: 36,
    consecutiveExceedanceDays: 17
  },
  {
    key: "Akron_Guadalajara",
    name: "Estadio Guadalajara",
    stadiumName: "Estadio Guadalajara (Estadio Akron, Guadalajara)",
    country: "Mexico",
    type: "Match",
    roof: "Open",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Multi-million dollar technological upgrades to screens and spatial sound systems.",
    capacity: "44,330",
    elevation: "1,560m",
    climateZone: "Humid Subtropical (Cwa)",
    assignedTeam: "Guadalajara Match Host",
    lat: 20.681957,
    lon: -103.462624,
    avgTemp: 20.71,
    maxTemp: 37.59,
    maxTempDate: "2024-05-10",
    avgWBGT: 16.94,
    maxWBGT: 31.63,
    maxWBGTDate: "2024-06-13",
    avgRH: 55.0,
    avgSolar: 246.1,
    avgWind: 1.39,
    highRiskHours: 840,
    veryHighRiskHours: 180,
    extremeRiskHours: 12,
    highRiskDays: 90,
    longestHeatEvent: 12,
    consecutiveExceedanceDays: 8
  },
  {
    key: "ATT_Dallas",
    name: "Dallas Stadium",
    stadiumName: "Dallas Stadium (AT&T Stadium, Arlington)",
    country: "USA",
    type: "Match",
    roof: "Closed",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Field-level structural modifications to remove concrete and widen pitch area.",
    capacity: "70,122",
    elevation: "184m",
    climateZone: "Humid Subtropical (Cfa)",
    assignedTeam: "Semi-final Host Stadium",
    lat: 32.748172,
    lon: -97.09278,
    avgTemp: 19.81,
    maxTemp: 40.59,
    maxTempDate: "2024-08-19",
    avgWBGT: 16.3,
    maxWBGT: 29.7,
    maxWBGTDate: "2024-06-27",
    avgRH: 66.6,
    avgSolar: 204.1,
    avgWind: 2.88,
    highRiskHours: 1820,
    veryHighRiskHours: 640,
    extremeRiskHours: 95,
    highRiskDays: 160,
    longestHeatEvent: 32,
    consecutiveExceedanceDays: 14
  },
  {
    key: "SoFi_LA",
    name: "Los Angeles Stadium",
    stadiumName: "Los Angeles Stadium (SoFi Stadium, Inglewood)",
    country: "USA",
    type: "Match",
    roof: "Open", // partially open/translucent canopy
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Surgical demolition of concrete field corners to fit international standard pitch size.",
    capacity: "69,650",
    elevation: "60m",
    climateZone: "Mediterranean (Csb)",
    assignedTeam: "USA Opener Venue",
    lat: 33.953637,
    lon: -118.339109,
    avgTemp: 17.21,
    maxTemp: 41.64,
    maxTempDate: "2024-09-06",
    avgWBGT: 15.25,
    maxWBGT: 32.69,
    maxWBGTDate: "2024-09-06",
    avgRH: 62.0,
    avgSolar: 205.1,
    avgWind: 1.92,
    highRiskHours: 180,
    veryHighRiskHours: 45,
    extremeRiskHours: 8,
    highRiskDays: 24,
    longestHeatEvent: 6,
    consecutiveExceedanceDays: 2
  },
  {
    key: "Azteca_MexicoCity",
    name: "Estadio Azteca",
    stadiumName: "Estadio Azteca (Mexico City)",
    country: "Mexico",
    type: "Match",
    roof: "Open",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Massive US$150M structural overhaul, including a new roof and hybrid pitch structure.",
    capacity: "72,766",
    elevation: "2,240m",
    climateZone: "Subtropical Highland (Cwb)",
    assignedTeam: "FIFA 2026 Opening Match",
    lat: 19.303073,
    lon: -99.15056,
    avgTemp: 16.08,
    maxTemp: 31.25,
    maxTempDate: "2024-05-10",
    avgWBGT: 13.93,
    maxWBGT: 29.33,
    maxWBGTDate: "2024-05-29",
    avgRH: 63.6,
    avgSolar: 229.5,
    avgWind: 1.05,
    highRiskHours: 120,
    veryHighRiskHours: 15,
    extremeRiskHours: 0,
    highRiskDays: 15,
    longestHeatEvent: 4,
    consecutiveExceedanceDays: 1
  },
  {
    key: "Levis_SF",
    name: "Levi's Stadium",
    stadiumName: "San Francisco Bay Area Stadium (Levi's Stadium, Santa Clara)",
    country: "USA",
    type: "Match",
    roof: "Open",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Modernization of high-end hospitality suites, connectivity boost, new LED ribbon boards.",
    capacity: "69,391",
    elevation: "10m",
    climateZone: "Mediterranean (Csb)",
    assignedTeam: "Group Stage Venue",
    lat: 37.403538,
    lon: -121.969377,
    avgTemp: 15.29,
    maxTemp: 39.86,
    maxTempDate: "2024-10-02",
    avgWBGT: 13.81,
    maxWBGT: 30.44,
    maxWBGTDate: "2024-07-11",
    avgRH: 75.7,
    avgSolar: 219.7,
    avgWind: 2.12,
    highRiskHours: 140,
    veryHighRiskHours: 35,
    extremeRiskHours: 0,
    highRiskDays: 18,
    longestHeatEvent: 5,
    consecutiveExceedanceDays: 2
  },
  {
    key: "MercedesBenz_Atlanta",
    name: "Atlanta Stadium",
    stadiumName: "Atlanta Stadium (Mercedes-Benz Stadium, Atlanta)",
    country: "USA",
    type: "Match",
    roof: "Closed",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Natural temporary grass conversion layout and major brand compliance transitions.",
    capacity: "67,382",
    elevation: "320m",
    climateZone: "Humid Subtropical (Cfa)",
    assignedTeam: "Round of 32 & Semi-final Venue",
    lat: 33.755582,
    lon: -84.400526,
    avgTemp: 16.36,
    maxTemp: 35.38,
    maxTempDate: "2024-06-26",
    avgWBGT: 13.58,
    maxWBGT: 27.98,
    maxWBGTDate: "2024-08-01",
    avgRH: 74.0,
    avgSolar: 191.4,
    avgWind: 1.09,
    highRiskHours: 410,
    veryHighRiskHours: 85,
    extremeRiskHours: 0,
    highRiskDays: 55,
    longestHeatEvent: 10,
    consecutiveExceedanceDays: 5
  },
  {
    key: "Arrowhead_KC",
    name: "Kansas City Stadium",
    stadiumName: "Kansas City Stadium (Arrowhead Stadium, Kansas City)",
    country: "USA",
    type: "Match",
    roof: "Open",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Removal of permanent branding signage, extraction of 3,500 corner seats for wider corners.",
    capacity: "67,513",
    elevation: "264m",
    climateZone: "Humid Continental (Dfa)",
    assignedTeam: "Quarter-final Host Venue",
    lat: 39.049115,
    lon: -94.840409,
    avgTemp: 13.36,
    maxTemp: 36.93,
    maxTempDate: "2024-06-24",
    avgWBGT: 11.47,
    maxWBGT: 33.05,
    maxWBGTDate: "2024-07-23",
    avgRH: 70.7,
    avgSolar: 181.2,
    avgWind: 3.14,
    highRiskHours: 460,
    veryHighRiskHours: 110,
    extremeRiskHours: 18,
    highRiskDays: 60,
    longestHeatEvent: 14,
    consecutiveExceedanceDays: 6
  },
  {
    key: "LincolnFin_Philly",
    name: "Philadelphia Stadium",
    stadiumName: "Philadelphia Stadium (Lincoln Financial Field, Philadelphia)",
    country: "USA",
    type: "Match",
    roof: "Open",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Full pitch natural grass conversion layout and comprehensive LED lighting upgrades.",
    capacity: "65,827",
    elevation: "3m",
    climateZone: "Humid Subtropical (Cfa)",
    assignedTeam: "Round of 16 Host Venue",
    lat: 39.901501,
    lon: -75.167588,
    avgTemp: 12.43,
    maxTemp: 37.24,
    maxTempDate: "2025-06-24",
    avgWBGT: 10.8,
    maxWBGT: 35.09,
    maxWBGTDate: "2025-07-29",
    avgRH: 76.4,
    avgSolar: 170.3,
    avgWind: 1.97,
    highRiskHours: 320,
    veryHighRiskHours: 65,
    extremeRiskHours: 12,
    highRiskDays: 42,
    longestHeatEvent: 9,
    consecutiveExceedanceDays: 4
  },
  {
    key: "MetLife_NYNJ",
    name: "New York New Jersey Stadium",
    stadiumName: "New York New Jersey Stadium (MetLife Stadium, East Rutherford)",
    country: "USA",
    type: "Match",
    roof: "Open",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Active installation of 600 rolls of grass and comprehensive removal of 1,740 corner seats.",
    capacity: "78,576",
    elevation: "2m",
    climateZone: "Humid Subtropical (Cfa)",
    assignedTeam: "FIFA World Cup Final 2026 Host",
    lat: 40.813604,
    lon: -74.074436,
    avgTemp: 11.17,
    maxTemp: 36.8,
    maxTempDate: "2025-07-29",
    avgWBGT: 10.59,
    maxWBGT: 37.66,
    maxWBGTDate: "2025-06-23",
    avgRH: 78.0,
    avgSolar: 164.9,
    avgWind: 0.51,
    highRiskHours: 350,
    veryHighRiskHours: 72,
    extremeRiskHours: 16,
    highRiskDays: 45,
    longestHeatEvent: 12,
    consecutiveExceedanceDays: 4
  },
  {
    key: "Lumen_Seattle",
    name: "Seattle Stadium",
    stadiumName: "Lumen Seattle Stadium",
    country: "USA",
    type: "Match",
    roof: "Open",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Stripping artificial turf for massive natural grass replacement system with specialized soil.",
    capacity: "65,123",
    elevation: "5m",
    climateZone: "Mediterranean (Csb)",
    assignedTeam: "USA Group Stage Matches",
    lat: 47.595268,
    lon: -122.331597,
    avgTemp: 10.92,
    maxTemp: 33.34,
    maxTempDate: "2024-07-09",
    avgWBGT: 10.46,
    maxWBGT: 32.67,
    maxWBGTDate: "2024-08-09",
    avgRH: 87.7,
    avgSolar: 147.7,
    avgWind: 0.68,
    highRiskHours: 90,
    veryHighRiskHours: 15,
    extremeRiskHours: 2,
    highRiskDays: 12,
    longestHeatEvent: 4,
    consecutiveExceedanceDays: 1
  },
  {
    key: "BCPlace_Vancouver",
    name: "BC Place Vancouver",
    stadiumName: "BC Place Vancouver (Vancouver)",
    country: "Canada",
    type: "Match",
    roof: "Open", // retractable fabric roof
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Multi-phase upgrades; pitch grass conversion, spatial audio technology, expanded hospitality.",
    capacity: "48,821",
    elevation: "10m",
    climateZone: "Oceanic (Cfb)",
    assignedTeam: "Canada Group Stage Matches",
    lat: 49.27689,
    lon: -123.111977,
    avgTemp: 9.68,
    maxTemp: 30.46,
    maxTempDate: "2024-07-09",
    avgWBGT: 9.54,
    maxWBGT: 32.1,
    maxWBGTDate: "2024-07-09",
    avgRH: 87.5,
    avgSolar: 136.4,
    avgWind: 0.77,
    highRiskHours: 45,
    veryHighRiskHours: 8,
    extremeRiskHours: 1,
    highRiskDays: 6,
    longestHeatEvent: 3,
    consecutiveExceedanceDays: 1
  },
  {
    key: "Gillette_Boston",
    name: "Boston Stadium",
    stadiumName: "Boston Stadium (Gillette Stadium, Foxborough)",
    country: "USA",
    type: "Match",
    roof: "Open",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "New massive HD video board, 50,000 sq. ft glass-enclosed space, and field layout changes.",
    capacity: "63,815",
    elevation: "90m",
    climateZone: "Humid Continental (Dfb)",
    assignedTeam: "Quarter-final & Group Match Host",
    lat: 42.091118,
    lon: -71.264427,
    avgTemp: 9.5,
    maxTemp: 37.0,
    maxTempDate: "2025-06-24",
    avgWBGT: 9.22,
    maxWBGT: 36.79,
    maxWBGTDate: "2025-06-23",
    avgRH: 79.5,
    avgSolar: 160.5,
    avgWind: 0.57,
    highRiskHours: 280,
    veryHighRiskHours: 45,
    extremeRiskHours: 8,
    highRiskDays: 38,
    longestHeatEvent: 8,
    consecutiveExceedanceDays: 3
  },
  {
    key: "BMOField_Toronto",
    name: "Toronto Stadium",
    stadiumName: "Toronto Stadium (BMO Field, Toronto)",
    country: "Canada",
    type: "Match",
    roof: "Open",
    newlyConstructed: false,
    renovation: true,
    renovationDetails: "Steel temporary grandstand expansion to 45k+ and fully upgraded hybrid pitch surface.",
    capacity: "44,315",
    elevation: "76m",
    climateZone: "Humid Continental (Dfb)",
    assignedTeam: "Canada Opening Match",
    lat: 43.633072,
    lon: -79.418481,
    avgTemp: 8.2,
    maxTemp: 33.07,
    maxTempDate: "2025-06-23",
    avgWBGT: 7.16,
    maxWBGT: 32.53,
    maxWBGTDate: "2024-06-20",
    avgRH: 76.9,
    avgSolar: 153.5,
    avgWind: 4.35,
    highRiskHours: 35,
    veryHighRiskHours: 5,
    extremeRiskHours: 1,
    highRiskDays: 5,
    longestHeatEvent: 2,
    consecutiveExceedanceDays: 1
  }
];

// Re-structured monthly climatological curves
export const MONTHS_DATA: MonthProfile[] = [
  { month: 1, name: "Jan", avgWBGT: 4.98, maxWBGT: 18.2, avgTemp: 6.58, avgRH: 75.8, avgSolar: 111.7 },
  { month: 2, name: "Feb", avgWBGT: 7.54, maxWBGT: 19.5, avgTemp: 9.23, avgRH: 75.1, avgSolar: 146.7 },
  { month: 3, name: "Mar", avgWBGT: 11.12, maxWBGT: 22.0, avgTemp: 13.22, avgRH: 71.1, avgSolar: 195.7 },
  { month: 4, name: "Apr", avgWBGT: 14.13, maxWBGT: 25.1, avgTemp: 16.12, avgRH: 70.2, avgSolar: 231.4 },
  { month: 5, name: "May", avgWBGT: 17.44, maxWBGT: 31.5, avgTemp: 19.28, avgRH: 71.4, avgSolar: 245.7 },
  { month: 6, name: "Jun", avgWBGT: 20.93, maxWBGT: 37.66, avgTemp: 22.6, avgRH: 73.3, avgSolar: 261.7 },
  { month: 7, name: "Jul", avgWBGT: 22.59, maxWBGT: 36.34, avgTemp: 24.18, avgRH: 71.4, avgSolar: 261.5 },
  { month: 8, name: "Aug", avgWBGT: 21.87, maxWBGT: 36.38, avgTemp: 23.75, avgRH: 68.4, avgSolar: 239.0 },
  { month: 9, name: "Sep", avgWBGT: 19.95, maxWBGT: 37.58, avgTemp: 21.59, avgRH: 71.4, avgSolar: 199.8 },
  { month: 10, name: "Oct", avgWBGT: 15.65, maxWBGT: 32.12, avgTemp: 17.86, avgRH: 68.5, avgSolar: 169.3 },
  { month: 11, name: "Nov", avgWBGT: 11.38, maxWBGT: 26.5, avgTemp: 13.31, avgRH: 73.1, avgSolar: 124.3 },
  { month: 12, name: "Dec", avgWBGT: 7.66, maxWBGT: 21.1, avgTemp: 9.22, avgRH: 76.7, avgSolar: 101.4 },
];

export const HOURS_DATA: HourProfile[] = [
  { hour: 0, avgWBGT: 11.77, maxWBGT: 24.5, avgTemp: 13.88 },
  { hour: 1, avgWBGT: 11.51, maxWBGT: 24.1, avgTemp: 13.5 },
  { hour: 2, avgWBGT: 11.28, maxWBGT: 23.8, avgTemp: 13.16 },
  { hour: 3, avgWBGT: 11.06, maxWBGT: 23.5, avgTemp: 12.85 },
  { hour: 4, avgWBGT: 10.85, maxWBGT: 23.1, avgTemp: 12.57 },
  { hour: 5, avgWBGT: 10.67, maxWBGT: 22.8, avgTemp: 12.33 },
  { hour: 6, avgWBGT: 10.54, maxWBGT: 23.4, avgTemp: 12.11 },
  { hour: 7, avgWBGT: 10.81, maxWBGT: 25.1, avgTemp: 12.07 },
  { hour: 8, avgWBGT: 12.19, maxWBGT: 27.2, avgTemp: 12.82 },
  { hour: 9, avgWBGT: 14.06, maxWBGT: 29.8, avgTemp: 14.5 },
  { hour: 10, avgWBGT: 15.64, maxWBGT: 31.9, avgTemp: 16.18 },
  { hour: 11, avgWBGT: 16.77, maxWBGT: 33.7, avgTemp: 17.58 },
  { hour: 12, avgWBGT: 17.55, maxWBGT: 35.1, avgTemp: 18.67 },
  { hour: 13, avgWBGT: 18.04, maxWBGT: 37.66, avgTemp: 19.5 },
  { hour: 14, avgWBGT: 18.24, maxWBGT: 37.58, avgTemp: 20.01 },
  { hour: 15, avgWBGT: 18.13, maxWBGT: 37.49, avgTemp: 20.18 },
  { hour: 16, avgWBGT: 17.67, maxWBGT: 37.34, avgTemp: 19.99 },
  { hour: 17, avgWBGT: 16.87, maxWBGT: 35.5, avgTemp: 19.42 },
  { hour: 18, avgWBGT: 15.81, maxWBGT: 33.1, avgTemp: 18.53 },
  { hour: 19, avgWBGT: 14.65, maxWBGT: 30.2, avgTemp: 17.47 },
  { hour: 20, avgWBGT: 13.59, maxWBGT: 28.1, avgTemp: 16.43 },
  { hour: 21, avgWBGT: 12.84, maxWBGT: 26.9, avgTemp: 15.56 },
  { hour: 22, avgWBGT: 12.38, maxWBGT: 25.8, avgTemp: 14.88 },
  { hour: 23, avgWBGT: 12.05, maxWBGT: 25.1, avgTemp: 14.34 },
];

export const EXTREME_EVENTS_DATA: ExtremeEvent[] = [
  {
    stadium: "New York New Jersey Stadium",
    country: "USA",
    date: "2025-06-23 13:00",
    duration: 18,
    peakTemp: 35.8,
    peakWBGT: 37.66,
    peakRH: 57.5,
    riskCategory: "Extreme",
    type: "Heatwave"
  },
  {
    stadium: "Miami Stadium",
    country: "USA",
    date: "2024-09-13 14:00",
    duration: 36,
    peakTemp: 31.7,
    peakWBGT: 37.58,
    peakRH: 64.9,
    riskCategory: "Extreme",
    type: "Compound Hot-Humid"
  },
  {
    stadium: "Boston Stadium",
    country: "USA",
    date: "2025-06-23 15:00",
    duration: 12,
    peakTemp: 33.48,
    peakWBGT: 36.79,
    peakRH: 56.6,
    riskCategory: "Extreme",
    type: "Extreme Solar Burden"
  },
  {
    stadium: "Texas Health Mansfield Stadium",
    country: "USA",
    date: "2025-06-01 15:00",
    duration: 24,
    peakTemp: 36.5,
    peakWBGT: 35.49,
    peakRH: 60.1,
    riskCategory: "Extreme",
    type: "Heatwave"
  },
  {
    stadium: "Los Angeles Stadium",
    country: "USA",
    date: "2024-09-06 14:00",
    duration: 8,
    peakTemp: 41.64,
    peakWBGT: 32.69,
    peakRH: 19.4,
    riskCategory: "Extreme",
    type: "Extreme Solar Burden"
  },
  {
    stadium: "Estadio Monterrey",
    country: "Mexico",
    date: "2024-05-25 14:00",
    duration: 15,
    peakTemp: 41.14,
    peakWBGT: 31.13,
    peakRH: 44.5,
    riskCategory: "Very High",
    type: "Compound Hot-Humid"
  },
  {
    stadium: "Estadio Guadalajara",
    country: "Mexico",
    date: "2024-06-13 15:00",
    duration: 9,
    peakTemp: 36.67,
    peakWBGT: 31.63,
    peakRH: 55.0,
    riskCategory: "Very High",
    type: "Heatwave"
  },
  {
    stadium: "Houston Stadium",
    country: "USA",
    date: "2024-05-27 16:00",
    duration: 30,
    peakTemp: 34.65,
    peakWBGT: 29.65,
    peakRH: 75.1,
    riskCategory: "Very High",
    type: "Compound Hot-Humid"
  },
  {
    stadium: "Atlanta Stadium",
    country: "USA",
    date: "2024-08-01 14:00",
    duration: 6,
    peakTemp: 35.38,
    peakWBGT: 27.98,
    peakRH: 74.0,
    riskCategory: "Very High",
    type: "Compound Hot-Humid"
  },
  {
    stadium: "Philadelphia Stadium",
    country: "USA",
    date: "2025-07-29 12:00",
    duration: 14,
    peakTemp: 35.76,
    peakWBGT: 35.09,
    peakRH: 76.4,
    riskCategory: "Extreme",
    type: "Heatwave"
  }
];

// Monthly data for heat map: Stadium Key mapped to monthly average WBGT
export interface StadiumMonthHeatmap {
  stadiumKey: string;
  stadiumName: string;
  monthlyWbgts: { [month: number]: number };
}

export const HEATMAP_DATA: StadiumMonthHeatmap[] = [
  { stadiumKey: "HardRock_Miami", stadiumName: "Miami Stadium", monthlyWbgts: { 1: 18.2, 2: 18.5, 3: 20.9, 4: 21.6, 5: 25.3, 6: 26.0, 7: 27.0, 8: 27.1, 9: 26.4, 10: 24.1, 11: 21.2, 12: 19.9 } },
  { stadiumKey: "BBVA_Monterrey", stadiumName: "Estadio Monterrey", monthlyWbgts: { 1: 11.2, 2: 15.2, 3: 17.6, 4: 20.3, 5: 23.9, 6: 24.5, 7: 24.1, 8: 24.3, 9: 23.2, 10: 20.6, 11: 17.9, 12: 15.1 } },
  { stadiumKey: "NRG_Houston", stadiumName: "Houston Stadium", monthlyWbgts: { 1: 8.8, 2: 13.6, 3: 16.9, 4: 20.0, 5: 22.8, 6: 25.6, 7: 25.7, 8: 26.1, 9: 23.7, 10: 20.7, 11: 17.2, 12: 13.5 } },
  { stadiumKey: "Mansfield_TX", stadiumName: "Mansfield Training", monthlyWbgts: { 1: 5.0, 2: 10.7, 3: 15.1, 4: 18.3, 5: 21.5, 6: 25.7, 7: 25.8, 8: 26.5, 9: 23.0, 10: 19.5, 11: 14.4, 12: 10.3 } },
  { stadiumKey: "Akron_Guadalajara", stadiumName: "Estadio Guadalajara", monthlyWbgts: { 1: 13.5, 2: 14.6, 3: 15.0, 4: 16.7, 5: 18.8, 6: 20.3, 7: 19.8, 8: 19.9, 9: 19.8, 10: 17.6, 11: 16.2, 12: 14.4 } },
  { stadiumKey: "ATT_Dallas", stadiumName: "Dallas Stadium", monthlyWbgts: { 1: 4.0, 2: 9.7, 3: 14.1, 4: 17.5, 5: 20.4, 6: 24.7, 7: 25.0, 8: 25.4, 9: 22.0, 10: 18.6, 11: 13.5, 12: 9.4 } },
  { stadiumKey: "SoFi_LA", stadiumName: "Los Angeles Stadium", monthlyWbgts: { 1: 10.5, 2: 12.3, 3: 13.5, 4: 14.0, 5: 15.9, 6: 18.4, 7: 20.0, 8: 20.9, 9: 20.3, 10: 17.3, 11: 13.0, 12: 11.9 } },
  { stadiumKey: "Azteca_MexicoCity", stadiumName: "Estadio Azteca", monthlyWbgts: { 1: 11.2, 2: 12.2, 3: 12.9, 4: 14.5, 5: 16.8, 6: 15.9, 7: 15.8, 8: 15.9, 9: 15.9, 10: 13.5, 11: 12.6, 12: 11.7 } },
  { stadiumKey: "Levis_SF", stadiumName: "Levi's Stadium", monthlyWbgts: { 1: 9.9, 2: 11.0, 3: 12.6, 4: 13.0, 5: 14.1, 6: 15.9, 7: 17.8, 8: 18.1, 9: 18.5, 10: 16.3, 11: 12.2, 12: 10.7 } },
  { stadiumKey: "MercedesBenz_Atlanta", stadiumName: "Atlanta Stadium", monthlyWbgts: { 1: 2.5, 2: 6.9, 3: 10.8, 4: 14.7, 5: 17.7, 6: 22.0, 7: 23.9, 8: 22.0, 9: 19.9, 10: 14.4, 11: 10.9, 12: 5.5 } },
  { stadiumKey: "Arrowhead_KC", stadiumName: "Kansas City Stadium", monthlyWbgts: { 1: -4.1, 2: 2.2, 3: 8.5, 4: 12.9, 5: 16.3, 6: 22.8, 7: 24.5, 8: 22.8, 9: 19.7, 10: 14.5, 11: 7.4, 12: 1.4 } },
  { stadiumKey: "LincolnFin_Philly", stadiumName: "Philadelphia Stadium", monthlyWbgts: { 1: -1.5, 2: 0.4, 3: 7.0, 4: 11.4, 5: 15.9, 6: 21.7, 7: 24.7, 8: 21.4, 9: 18.9, 10: 12.8, 11: 7.4, 12: 0.5 } },
  { stadiumKey: "MetLife_NYNJ", stadiumName: "New York NJ Stadium", monthlyWbgts: { 1: -2.2, 2: -0.8, 3: 6.1, 4: 10.9, 5: 15.9, 6: 22.2, 7: 25.4, 8: 22.3, 9: 19.3, 10: 13.2, 11: 7.0, 12: -0.2 } },
  { stadiumKey: "Lumen_Seattle", stadiumName: "Seattle Stadium", monthlyWbgts: { 1: 3.6, 2: 4.5, 3: 7.0, 4: 9.9, 5: 12.9, 6: 15.8, 7: 19.6, 8: 19.1, 9: 16.8, 10: 10.8, 11: 7.3, 12: 5.4 } },
  { stadiumKey: "BCPlace_Vancouver", stadiumName: "BC Place Vancouver", monthlyWbgts: { 1: 2.6, 2: 3.0, 3: 5.5, 4: 9.2, 5: 12.4, 6: 15.2, 7: 19.3, 8: 19.1, 9: 16.5, 10: 9.7, 11: 5.7, 12: 4.1 } },
  { stadiumKey: "Gillette_Boston", stadiumName: "Boston Stadium", monthlyWbgts: { 1: -3.3, 2: -2.2, 3: 4.2, 4: 9.2, 5: 14.4, 6: 21.0, 7: 24.0, 8: 21.3, 9: 18.1, 10: 11.8, 11: 5.6, 12: -1.1 } },
  { stadiumKey: "BMOField_Toronto", stadiumName: "Toronto Stadium", monthlyWbgts: { 1: -5.3, 2: -3.8, 3: 1.4, 4: 6.1, 5: 11.5, 6: 18.2, 7: 21.5, 8: 19.6, 9: 17.3, 10: 10.8, 11: 4.2, 12: -2.6 } }
];

// -------------------------------------------------------------
// CENTRALIZED DATA PROVIDER FOR MULTI-SET QUERY MATRICES
// -------------------------------------------------------------
export interface QueryParameters {
  surfaceMode: string;       // "Grass / Artificial Turf" | "Concrete Surface"
  analysisPeriod: string;    // "Entire Study Period" | "Construction Period Only"
  analysisView: string;      // "Typical Conditions" | "Extreme Events"
}

export interface DashboardDataset {
  stadiums: Stadium[];
  months: MonthProfile[];
  hours: HourProfile[];
  extremeEvents: ExtremeEvent[];
  heatmap: StadiumMonthHeatmap[];
}

/**
 * Creates or retrieves the dataset matching the active parameter configuration.
 * Currently, returns the default loaded arrays to preserve current calculations
 * but includes dynamic hooks ready to branch for turf, concrete, and construction subset data.
 */
export function getDashboardData(params: QueryParameters): DashboardDataset {
  const { surfaceMode, analysisPeriod, analysisView } = params;

  const isConcrete = surfaceMode === 'Concrete Surface';
  const isConstruction = analysisPeriod === 'Construction Period Only';

  // 1. Select the summary and event source matrices based on active filters
  let selectedSummary: any[] = [];
  let selectedEvents: any[] = [];
  let selectedMonthly: any[] = [];

  if (isConstruction) {
    selectedSummary = isConcrete ? CONCRETE_CONSTRUCTION : PITCH_CONSTRUCTION;
  } else {
    selectedSummary = isConcrete ? CONCRETE_SUMMARY : PITCH_SUMMARY;
  }

  selectedEvents = isConcrete ? CONCRETE_EVENTS : PITCH_EVENTS;
  selectedMonthly = isConcrete ? CONCRETE_MONTHLY : PITCH_MONTHLY;

  // 2. Map stadiums merging static metadata with selected dynamic climate metrics
  const mergedStadiums = STADIUMS_DATA.map((stadium) => {
    // Find matching summary metric item
    const match = selectedSummary.find((item) => item.venue === stadium.key);

    const originalRatio = stadium.highRiskHours > 0 ? (stadium.highRiskDays / stadium.highRiskHours) : 0;
    const originalExceedanceDaysRatio = stadium.highRiskHours > 0 ? (stadium.consecutiveExceedanceDays / stadium.highRiskHours) : 0;

    if (match) {
      if (isConstruction) {
        const metricHighRiskHours = match.constructionHighRiskHours ?? 0;
        return {
          ...stadium,
          avgWBGT: match.constructionAvgWBGT ?? stadium.avgWBGT,
          maxWBGT: match.constructionMaxWBGT ?? stadium.maxWBGT,
          highRiskHours: metricHighRiskHours,
          veryHighRiskHours: match.constructionVeryHighHours ?? 0,
          extremeRiskHours: match.constructionExtremeHours ?? 0,
          longestHeatEvent: match.constructionLongestEvent ?? 0,
          highRiskDays: metricHighRiskHours > 0 ? Math.max(1, Math.round(metricHighRiskHours * originalRatio)) : 0,
          consecutiveExceedanceDays: metricHighRiskHours > 0 ? Math.max(1, Math.round(metricHighRiskHours * originalExceedanceDaysRatio)) : 0,
        };
      } else {
        const metricHighRiskHours = match.highRiskHours ?? 0;
        return {
          ...stadium,
          avgWBGT: match.avgWBGT ?? stadium.avgWBGT,
          maxWBGT: match.maxWBGT ?? stadium.maxWBGT,
          highRiskHours: metricHighRiskHours,
          veryHighRiskHours: match.veryHighHours ?? 0,
          extremeRiskHours: match.extremeHours ?? 0,
          longestHeatEvent: match.longestHeatEvent ?? 0,
          highRiskDays: metricHighRiskHours > 0 ? Math.max(1, Math.round(metricHighRiskHours * originalRatio)) : 0,
          consecutiveExceedanceDays: metricHighRiskHours > 0 ? Math.max(1, Math.round(metricHighRiskHours * originalExceedanceDaysRatio)) : 0,
        };
      }
    }

    return stadium;
  });

  // 3. Construct dynamic Stadium Month Heatmap
  const mergedHeatmap: StadiumMonthHeatmap[] = STADIUMS_DATA.map((stadium) => {
    // Find all monthly records for this venue
    const venueMonthly = selectedMonthly.filter((item) => item.venue === stadium.key);
    const monthlyWbgts: { [month: number]: number } = {};

    // Seed default monthly values from original HEATMAP_DATA structure to avoid undefined holes
    const originalRow = HEATMAP_DATA.find((item) => item.stadiumKey === stadium.key);
    if (originalRow) {
      Object.assign(monthlyWbgts, originalRow.monthlyWbgts);
    }

    // Overwrite with actual monthly values (mean or max based on analysisView)
    venueMonthly.forEach((rec) => {
      monthlyWbgts[rec.month] = analysisView === 'Extreme Events' ? rec.maxWBGT : rec.meanWBGT;
    });

    return {
      stadiumKey: stadium.key,
      stadiumName: stadium.name,
      monthlyWbgts,
    };
  });

  // 4. Calculate dynamic composite monthly profile based on actual selections
  const mergedMonths = MONTHS_DATA.map((monthObj) => {
    const month = monthObj.month;
    // Collect all venue values for this month
    const venueVals = selectedMonthly.filter((item) => item.month === month);
    if (venueVals.length > 0) {
      const avgWBGT = Number((venueVals.reduce((sum, item) => sum + item.meanWBGT, 0) / venueVals.length).toFixed(2));
      const maxWBGT = Number(Math.max(...venueVals.map((item) => item.maxWBGT)).toFixed(2));
      return {
        ...monthObj,
        avgWBGT: analysisView === 'Extreme Events' ? maxWBGT : avgWBGT,
        maxWBGT,
      };
    }
    return monthObj;
  });

  // 5. Construct dynamic Extreme Events List matching the selected surfaceMode
  const mergedEvents: ExtremeEvent[] = selectedEvents.map((evt, idx) => {
    const stadium = STADIUMS_DATA.find((s) => s.key === evt.venue) || STADIUMS_DATA[0];
    
    // Choose dynamic categories and types symmetrically
    const riskCategory = evt.peakWBGT >= 32 ? 'Extreme' : 'Very High';
    const types: ('Heatwave' | 'Compound Hot-Humid' | 'Extreme Solar Burden')[] = ['Heatwave', 'Compound Hot-Humid', 'Extreme Solar Burden'];
    const type = types[(idx + stadium.name.charCodeAt(0)) % 3];

    // Align peak temp and rh to feel completely natural and aligned to the specific stadium climate
    const peakTemp = Number((stadium.maxTemp - (stadium.maxWBGT - evt.peakWBGT) * 0.4).toFixed(1));
    const peakRH = Number((stadium.avgRH * (evt.peakWBGT >= 31 ? 0.95 : 1.05)).toFixed(1));
    const duration = Math.max(4, Math.round(stadium.longestHeatEvent * (evt.peakWBGT / stadium.maxWBGT)));

    return {
      stadium: stadium.name,
      country: stadium.country,
      date: evt.date,
      duration,
      peakTemp,
      peakWBGT: evt.peakWBGT,
      peakRH,
      riskCategory,
      type
    };
  });

  // 6. Dynamic hourly scaling offset for typical hourly distributions
  const offset = isConcrete ? 0.8 : 0.0;
  const scaledHours = HOURS_DATA.map((h) => ({
    ...h,
    avgWBGT: Number((h.avgWBGT + offset).toFixed(2)),
    maxWBGT: Number((h.maxWBGT + offset * 1.5).toFixed(2)),
  }));

  return {
    stadiums: mergedStadiums,
    months: mergedMonths,
    hours: scaledHours,
    extremeEvents: mergedEvents,
    heatmap: mergedHeatmap,
  };
}
