import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Stadium, HEAT_RISK_THRESHOLDS, getACGIHRiskCategory, getACGIHRiskColorHex } from '../data';
import { getConstructionInfo } from '../constructionData';
import { TRAINING_CAMPS_DATA, TrainingCamp } from '../trainingCampsData';
import { ZoomIn, ZoomOut, MapPin, CheckCircle, Flame, Waves, HelpCircle } from 'lucide-react';
import { TempUnit, formatTemp } from '../tempUnit';

interface InteractiveMapProps {
  stadiums: Stadium[];
  selectedStadium: Stadium | null;
  onSelectStadium: (stadium: Stadium) => void;
  filterCountry: string;
  setFilterCountry: (country: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  analysisView: string;
  tempUnit: TempUnit;
}

// Projection math for OpenStreetMap tiles (Web Mercator)
function projectMercator(lat: number, lon: number, zoom: number) {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const scale = 256 * Math.pow(2, zoom);
  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

export default function InteractiveMap({
  stadiums,
  selectedStadium,
  onSelectStadium,
  filterCountry,
  setFilterCountry,
  filterType,
  setFilterType,
  analysisView,
  tempUnit,
}: InteractiveMapProps) {
  // Center of North America (Lat: 34.0, Lon: -97.0)
  const [center, setCenter] = useState({ lat: 34.0, lon: -97.0 });
  const [zoom, setZoom] = useState(4);
  const mapRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [hoveredStadium, setHoveredStadium] = useState<Stadium | null>(null);
  const [hoveredCamp, setHoveredCamp] = useState<TrainingCamp | null>(null);

  // Resize observer to keep the custom map responsive 
  useEffect(() => {
    if (!mapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width || 800,
          height: entry.contentRect.height || 450,
        });
      }
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  // When selected stadium changes, center on it and increase zoom
  useEffect(() => {
    if (selectedStadium) {
      setCenter({ lat: selectedStadium.lat, lon: selectedStadium.lon });
      setZoom(6);
    }
  }, [selectedStadium]);

  // Handle Drag-to-Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // ignore clicks on marker/buttons
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = { x: e.clientX, y: e.clientY };

    // Conversion factor for lat/lon depending on zoom level
    const scale = 256 * Math.pow(2, zoom);
    const dLon = -(dx / scale) * 360;
    // Approximation for latitude delta
    const dLat = (dy / scale) * 180;

    setCenter((prev) => ({
      lat: Math.max(-75, Math.min(75, prev.lat + dLat)),
      lon: Math.max(-180, Math.min(180, prev.lon + dLon)),
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Convert the viewport center coordinates into mercator pixel center
  const centerMercator = useMemo(() => {
    return projectMercator(center.lat, center.lon, zoom);
  }, [center, zoom]);

  // Generate map tiles dynamically based on bounding box
  const tiles = useMemo(() => {
    const leftPixel = centerMercator.x - dimensions.width / 2;
    const topPixel = centerMercator.y - dimensions.height / 2;

    const tileMinX = Math.floor(leftPixel / 256);
    const tileMaxX = Math.floor((leftPixel + dimensions.width) / 256);
    const tileMinY = Math.floor(topPixel / 256);
    const tileMaxY = Math.floor((topPixel + dimensions.height) / 256);

    const maxTilesCount = Math.pow(2, zoom);
    const tileList: { key: string; x: number; y: number; src: string; left: number; top: number }[] = [];

    for (let tx = tileMinX; tx <= tileMaxX; tx++) {
      for (let ty = tileMinY; ty <= tileMaxY; ty++) {
        if (ty < 0 || ty >= maxTilesCount) continue;
        const wrappedX = ((tx % maxTilesCount) + maxTilesCount) % maxTilesCount;
        tileList.push({
          key: `${zoom}-${tx}-${ty}`,
          x: tx,
          y: ty,
          src: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`,
          left: tx * 256 - leftPixel,
          top: ty * 256 - topPixel,
        });
      }
    }
    return tileList;
  }, [centerMercator, zoom, dimensions]);

  // Project individual stadium GPS coordinate onto coordinates relative to the div
  const projectedStadiums = useMemo(() => {
    const leftPixel = centerMercator.x - dimensions.width / 2;
    const topPixel = centerMercator.y - dimensions.height / 2;

    return stadiums.map((st) => {
      const pos = projectMercator(st.lat, st.lon, zoom);
      return {
        stadium: st,
        left: pos.x - leftPixel,
        top: pos.y - topPixel,
      };
    });
  }, [stadiums, centerMercator, zoom, dimensions]);

  const activeCamps = useMemo(() => {
    // Only show camps if 'All' filterType is selected
    if (filterType !== 'All') return [];
    
    // Filter training camps by country
    return TRAINING_CAMPS_DATA.filter((camp) => {
      return filterCountry === 'All' || camp.country === filterCountry;
    });
  }, [filterType, filterCountry]);

  const projectedCamps = useMemo(() => {
    const leftPixel = centerMercator.x - dimensions.width / 2;
    const topPixel = centerMercator.y - dimensions.height / 2;

    return activeCamps.map((camp) => {
      const pos = projectMercator(camp.lat, camp.lon, zoom);
      return {
        camp,
        left: pos.x - leftPixel,
        top: pos.y - topPixel,
      };
    });
  }, [activeCamps, centerMercator, zoom, dimensions]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-6 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      
      {/* Sidebar for Map Controls and Quick Filtering */}
      <div className="w-full lg:w-72 p-5 border-r border-slate-200 bg-slate-50/50 flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-900" /> Map Navigation
          </h3>
          
          <div className="space-y-4">
            {/* Country filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">Country Filter</label>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'USA', 'Mexico', 'Canada'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setFilterCountry(c)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold border transition focus:outline-none ${
                      filterCountry === c
                        ? 'bg-blue-900 border-blue-950 text-white'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-105'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Type filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">Location Category</label>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Match', 'Training'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold border transition focus:outline-none ${
                      filterType === t
                        ? 'bg-blue-900 border-blue-950 text-white'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-105'
                    }`}
                  >
                    {t === 'All' ? 'All Sites' : t === 'Match' ? 'Match Venues (16)' : 'Case Study (1)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick list of venues */}
          <div className="mt-6">
            <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Venues List</label>
            <div className="max-h-52 overflow-y-auto border border-slate-200 rounded bg-white divide-y divide-slate-100 divide-solid scrollbar-thin">
              {stadiums.map((st) => (
                <button
                  key={st.key}
                  onClick={() => onSelectStadium(st)}
                  className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between hover:bg-slate-50 focus:outline-none ${
                    selectedStadium?.key === st.key ? 'bg-blue-50/50 text-blue-950 font-bold' : 'text-slate-600'
                  }`}
                >
                  <span className="truncate pr-2">{st.name}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      st.type === 'Match' ? 'bg-blue-900' : 'bg-rose-600'
                    }`}
                  ></span>
                </button>
              ))}
              {stadiums.length === 0 && (
                <div className="p-3 text-xs text-slate-400 text-center italic">No venues match filters</div>
              )}
            </div>
          </div>
        </div>

        {/* Legend Explanatory */}
        <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Classification Legend</div>
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="w-4 h-4 rounded-full border-2 border-white shadow-sm bg-blue-800 shrink-0 mt-0.5"></span>
              <div>
                <div className="text-xs font-bold text-slate-700">FIFA Match Venues (16)</div>
                <div className="text-[10px] text-slate-500 leading-tight">Large blue markers representing official FIFA match venues included in the heat-risk analysis.</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm bg-orange-500 shrink-0 mt-1"></span>
              <div>
                <div className="text-xs font-bold text-slate-700">Training / Base Camps (48)</div>
                <div className="text-[10px] text-slate-500 leading-tight">Smaller orange markers representing assigned team training locations. These locations are shown for geographical context only and are not included in climatology calculations.</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm bg-rose-600 shrink-0 mt-0.5"></span>
              <div>
                <div className="text-xs font-bold text-slate-700">Case Study: Texas Health Mansfield Stadium (1)</div>
                <div className="text-[10px] text-slate-500 leading-tight">Dedicated case-study location retained for detailed analysis.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="flex-1 relative">
        <div
          ref={mapRef}
          className="w-full h-[400px] lg:h-[480px] bg-sky-50 relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Map Tiles Layer */}
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.src}
              alt=""
              className="absolute pointer-events-none"
              style={{
                left: tile.left,
                top: tile.top,
                width: 256,
                height: 256,
              }}
              onError={(e) => {
                // Failback background design if offline/cors tile loading fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ))}

          {/* Training Camps Markers Layer (Smaller orange markers) */}
          {projectedCamps.map(({ camp, left, top }) => {
            if (left < -30 || left > dimensions.width + 30 || top < -30 || top > dimensions.height + 30) {
              return null;
            }

            return (
              <button
                key={`camp-${camp.team}-${camp.trainingStadium}`}
                type="button"
                className="absolute rounded-full transition-all bg-orange-500 hover:bg-orange-600 shadow-xs border border-white hover:scale-130 focus:outline-hidden z-10"
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: '12px',
                  height: '12px',
                  marginLeft: '-6px',
                  marginTop: '-6px',
                }}
                onMouseEnter={() => setHoveredCamp(camp)}
                onMouseLeave={() => setHoveredCamp(null)}
              />
            );
          })}

          {/* Stadium Markers Layer */}
          {projectedStadiums.map(({ stadium: st, left, top }) => {
            // Check if marker is within the visible boundaries of the map canvas
            if (left < -30 || left > dimensions.width + 30 || top < -30 || top > dimensions.height + 30) {
              return null;
            }

            const isMatch = st.type === 'Match';
            const isMansfield = st.key === 'Mansfield_TX';
            
            // Highlight Mansfield as Case Study uniquely
            let sizeStyle = { width: '13px', height: '13px', marginLeft: '-6.5px', marginTop: '-6.5px' };
            if (isMatch) {
              sizeStyle = { width: '22px', height: '22px', marginLeft: '-11px', marginTop: '-11px' };
            } else if (isMansfield) {
              sizeStyle = { width: '18px', height: '18px', marginLeft: '-9px', marginTop: '-9px' };
            }

            // Determine Wet Bulb Globe Temp content and corresponding color hex
            const activeWBGT = analysisView === 'Extreme Events' ? st.maxWBGT : st.avgWBGT;
            const markerCategory = getACGIHRiskCategory(activeWBGT, st.acgihThreshold || 26.7);
            const markerColorHex = getACGIHRiskColorHex(markerCategory);

            let ringClass = 'ring-1 ring-white shadow';
            if (isMatch) {
              ringClass = 'ring-2 ring-white/80 shadow-md';
            } else if (isMansfield) {
              ringClass = 'ring-2 ring-rose-300 shadow-md';
            }
            
            const isSelected = selectedStadium?.key === st.key;

            return (
              <button
                key={st.key}
                type="button"
                className={`absolute rounded-full transition-all focus:outline-hidden z-20 ${ringClass} ${
                  isSelected ? 'scale-130 ring-3 ring-yellow-400 z-30' : 'hover:scale-120'
                }`}
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  backgroundColor: markerColorHex,
                  ...sizeStyle,
                }}
                onClick={() => onSelectStadium(st)}
                onMouseEnter={() => setHoveredStadium(st)}
                onMouseLeave={() => setHoveredStadium(null)}
              >
                {isMatch && (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-black">
                    S
                  </span>
                )}
              </button>
            );
          })}

          {/* Map Action Floating Buttons */}
          <div className="absolute top-4 right-4 z-40 bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-lg p-1 flex flex-col gap-1 shadow-sm">
            <button
              onClick={() => setZoom((z) => Math.min(12, z + 1))}
              className="p-1 px-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(3, z - 1))}
              className="p-1 px-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md border-t border-slate-100 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Floating Instructions/Fallback Label */}
          <div className="absolute bottom-3 left-3 z-30 bg-white/90 backdrop-blur-xs border border-slate-200 rounded px-2.5 py-1 text-[10px] text-slate-600 shadow-xs pointer-events-none max-w-sm">
            Drag to pan map. Scroll/buttons to zoom. Click marker to focus venue.
          </div>

          {/* Map Hover Tooltip popup */}
          {/* Map Hover Tooltip popup for Training Camps */}
          {hoveredCamp && (
            <div
              className="absolute z-50 bg-slate-900 border border-slate-800 text-white rounded p-3 text-xs w-64 shadow-lg pointer-events-none"
              style={{
                left: `${projectedCamps.find(p => p.camp.trainingStadium === hoveredCamp.trainingStadium)!.left + 15}px`,
                top: `${projectedCamps.find(p => p.camp.trainingStadium === hoveredCamp.trainingStadium)!.top - 15}px`,
              }}
            >
              <div className="font-bold border-b border-slate-815 pb-1 mb-1 text-white">
                <div>{hoveredCamp.trainingStadium}</div>
              </div>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <div>
                  Assigned Team: <span className="font-semibold text-white">{hoveredCamp.team}</span>
                </div>
                <div className="text-orange-400 font-bold text-[10px] pt-1 mt-1 border-t border-slate-800/40">
                  Training / Base Camp
                </div>
              </div>
            </div>
          )}

          {/* Map Hover Tooltip popup */}
          {hoveredStadium && (
            <div
              className="absolute z-50 bg-slate-900 border border-slate-800 text-white rounded p-3 text-xs w-64 shadow-lg pointer-events-none"
              style={{
                left: `${projectedStadiums.find(p => p.stadium.key === hoveredStadium.key)!.left + 15}px`,
                top: `${projectedStadiums.find(p => p.stadium.key === hoveredStadium.key)!.top - 15}px`,
              }}
            >
              <div className="font-bold border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between">
                <span className="truncate pr-1">{hoveredStadium.name}</span>
                <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                  hoveredStadium.type === 'Match' ? 'bg-[#1e3a8a] text-blue-100' : 'bg-rose-950 text-rose-200'
                }`}>
                  {hoveredStadium.type === 'Match' ? 'FIFA Match Venue' : 'Case Study Site'}
                </span>
              </div>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <div className="flex justify-between">
                  <span>Country:</span>
                  <span className="font-semibold text-white">{hoveredStadium.country}</span>
                </div>
                
                {hoveredStadium.type === 'Match' ? (
                  <div className="text-blue-400 font-bold text-[10px] pb-1 border-b border-slate-800/40 mb-1">
                    FIFA Match Venue
                  </div>
                ) : (
                  <div className="text-rose-400 font-bold text-[10px] pb-1 border-b border-slate-800/40 mb-1">
                    Case Study Location
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Capacity:</span>
                  <span className="text-white">{hoveredStadium.capacity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Elevation:</span>
                  <span className="text-white">{hoveredStadium.elevation}</span>
                </div>
                <div className="flex justify-between">
                  <span>Climate Zone:</span>
                  <span className="text-white font-mono truncate max-w-28" title={hoveredStadium.climateZone}>{hoveredStadium.climateZone}</span>
                </div>
                
                <div className="pt-1 border-t border-slate-800/60 mt-1 space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Study Period:</span>
                    <span className="text-[#a5b4fc] font-mono font-bold">1 Jan 2024 – 28 May 2026</span>
                  </div>
                  {(() => {
                    const info = getConstructionInfo(hoveredStadium.key);
                    return (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Construction Window:</span>
                        <span className="text-amber-300 font-mono font-semibold text-right max-w-[130px] truncate" title={info.formattedRangeShort}>{info.formattedRangeShort}</span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex justify-between pt-1 border-t border-slate-800/60 mt-1">
                  <span className={analysisView === 'Typical Conditions' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}>Avg WBGT:</span>
                  <span className={`font-bold ${analysisView === 'Typical Conditions' ? 'text-emerald-300 font-black' : 'text-slate-300'}`}>{formatTemp(hoveredStadium.avgWBGT, tempUnit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={analysisView === 'Extreme Events' ? 'text-red-400 font-extrabold' : 'text-slate-400'}>Max WBGT:</span>
                  <span className={`font-bold ${analysisView === 'Extreme Events' ? 'text-red-300 font-black' : 'text-slate-300'}`}>{formatTemp(hoveredStadium.maxWBGT, tempUnit)}</span>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 bg-slate-950/50 p-1 rounded-sm text-[9px] flex justify-between items-center">
                  <span className="text-slate-400 font-black uppercase tracking-wide">In-Focus Map:</span>
                  <span className="font-extrabold" style={{ color: getACGIHRiskColorHex(getACGIHRiskCategory(analysisView === 'Extreme Events' ? hoveredStadium.maxWBGT : hoveredStadium.avgWBGT, hoveredStadium.acgihThreshold || 26.7)) }}>
                    {analysisView === 'Extreme Events' ? 'Extreme Peaks' : 'Avg Baseline'}
                  </span>
                </div>
                {hoveredStadium.assignedTeam && (
                  <div className="pt-1 text-[10px] text-yellow-400 font-medium leading-relaxed italic border-t border-slate-800/40">
                    Host: {hoveredStadium.assignedTeam}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected Stadium Quick Panel Card (appears overlay at bottom of map) */}
        {selectedStadium && (
          <div className="absolute bottom-4 right-4 left-4 lg:left-auto lg:w-96 bg-white/95 backdrop-blur-sm border border-slate-200 rounded p-4 shadow-md z-30 transition-all">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-blue-900" /> Active Selection Overview
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">{selectedStadium.name}</h4>
                <p className="text-xs text-slate-500 font-medium">{selectedStadium.country} · {selectedStadium.key === 'Mansfield_TX' ? 'Case Study' : 'FIFA Match'} Site</p>
              </div>
              <button
                onClick={() => onSelectStadium(stadiums[0])} // default fallback or select None
                className="text-xs text-slate-400 hover:text-slate-600 focus:outline-none font-semibold"
              >
                Clear
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
              <div className="text-xs">
                <span className="text-slate-550 block text-[10px] uppercase font-semibold">
                  {analysisView === 'Extreme Events' ? 'Peak Air Temp' : 'Average Air Temp'}
                </span>
                <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1 mt-0.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />{' '}
                  {formatTemp(analysisView === 'Extreme Events' ? selectedStadium.maxTemp : selectedStadium.avgTemp, tempUnit)}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-slate-550 block text-[10px] uppercase font-semibold">
                  {analysisView === 'Extreme Events' ? 'Peak Heat Stress' : 'Average Heat Stress'}
                </span>
                <span className={`${analysisView === 'Extreme Events' ? 'text-red-700' : 'text-emerald-700'} font-extrabold text-sm flex items-center gap-1 mt-0.5`}>
                  <Waves className={`w-3.5 h-3.5 ${analysisView === 'Extreme Events' ? 'text-red-650' : 'text-emerald-600'}`} />{' '}
                  {formatTemp(analysisView === 'Extreme Events' ? selectedStadium.maxWBGT : selectedStadium.avgWBGT, tempUnit)}
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] grid grid-cols-2 gap-2 text-slate-500 font-medium">
              <div>
                <span className="text-slate-400 block font-bold uppercase text-[8px] mb-0.5">Study Period</span>
                <strong className="text-slate-800 font-mono">1 Jan 2024 – 28 May 2026</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase text-[8px] mb-0.5">Construction Window</span>
                <strong className="text-amber-800 font-mono">{getConstructionInfo(selectedStadium.key).formattedRangeShort}</strong>
              </div>
            </div>

            <div className="mt-2.5 text-[10px] text-slate-650 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100 font-medium font-sans">
              <span className="font-bold block uppercase text-slate-400 text-[8px] mb-0.5">Assigned National Context</span>
              {selectedStadium.assignedTeam}
            </div>
          </div>
        )}
      </div>

    </div>

    {/* Landing Page Map Explanatory Text */}
    <div className="w-full text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4 leading-relaxed font-medium">
      Training and base camp locations are displayed for geographical context and team assignment purposes. Heat-risk analyses and climatology statistics are currently available only for FIFA match venues and the Mansfield case-study site.
    </div>
  </div>
  );
}
