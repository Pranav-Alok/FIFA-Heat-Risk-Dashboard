import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Stadium, getACGIHRiskCategory, getACGIHRiskColorHex } from '../data';
import { TRAINING_CAMPS_DATA, TrainingCamp } from '../trainingCampsData';
import { TempUnit, formatTemp } from '../tempUnit';
import { Globe, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface MiniHotspotMapProps {
  stadiums: Stadium[];
  activeThreshold: number;
  tempUnit: TempUnit;
  analysisView: string;
  selectedStadium: Stadium | null;
  onSelectStadium: (stadium: Stadium) => void;
  setActiveTab: (tab: 'overview' | 'explorer' | 'seasonal' | 'extremes' | 'methodology' | 'guidance' | 'downloads') => void;
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

export default function MiniHotspotMap({
  stadiums,
  activeThreshold,
  tempUnit,
  analysisView,
  selectedStadium,
  onSelectStadium,
  setActiveTab,
}: MiniHotspotMapProps) {
  // Center of North America (Lat: 38.0, Lon: -97.0) to capture USA, Canada, Mexico together
  const [center, setCenter] = useState({ lat: 38.0, lon: -97.0 });
  const [zoom, setZoom] = useState(3.5);
  const mapRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 230 });
  
  // Drag to pan state
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Tooltip tracking
  const [hoveredStadium, setHoveredStadium] = useState<Stadium | null>(null);
  const [hoveredCamp, setHoveredCamp] = useState<TrainingCamp | null>(null);

  // ResizeObserver to ensure the mini-map matches its container beautifully
  useEffect(() => {
    if (!mapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width || 400,
          height: entry.contentRect.height || 230,
        });
      }
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  // Sync with selected stadium if the user clicks on overview stadium list or card focus
  useEffect(() => {
    if (selectedStadium) {
      setCenter({ lat: selectedStadium.lat, lon: selectedStadium.lon });
      setZoom(5);
    }
  }, [selectedStadium]);

  // Drag-to-Pan Event Handlers
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

    const scale = 256 * Math.pow(2, zoom);
    const dLon = -(dx / scale) * 360;
    const dLat = (dy / scale) * 180;

    setCenter((prev) => ({
      lat: Math.max(-75, Math.min(75, prev.lat + dLat)),
      lon: Math.max(-180, Math.min(180, prev.lon + dLon)),
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Convert viewport center into mercator pixels
  const centerMercator = useMemo(() => {
    return projectMercator(center.lat, center.lon, zoom);
  }, [center, zoom]);

  // Generate real OSM map tiles list
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

  // Project Host/Case Study venues
  const projectedStadiums = useMemo(() => {
    const leftPixel = centerMercator.x - dimensions.width / 2;
    const topPixel = centerMercator.y - dimensions.height / 2;

    return stadiums.map((st) => {
      const pos = projectMercator(st.lat, st.lon, zoom);
      const val = analysisView === 'Extreme Events' ? st.maxWBGT : st.avgWBGT;
      const risk = getACGIHRiskCategory(val, activeThreshold);
      const color = getACGIHRiskColorHex(risk);
      return {
        stadium: st,
        left: pos.x - leftPixel,
        top: pos.y - topPixel,
        val,
        risk,
        color,
      };
    });
  }, [stadiums, centerMercator, zoom, dimensions, activeThreshold, analysisView]);

  // Project Training/Base camp locations for spatial context
  const projectedCamps = useMemo(() => {
    const leftPixel = centerMercator.x - dimensions.width / 2;
    const topPixel = centerMercator.y - dimensions.height / 2;

    // Filter to show training camps nicely, reducing excessive visual noise at low zoom
    const step = zoom < 4 ? 4 : zoom < 5 ? 2 : 1;
    const filteredCamps = TRAINING_CAMPS_DATA.filter((_, idx) => idx % step === 0);

    return filteredCamps.map((camp) => {
      const pos = projectMercator(camp.lat, camp.lon, zoom);
      return {
        camp,
        left: pos.x - leftPixel,
        top: pos.y - topPixel,
      };
    });
  }, [centerMercator, zoom, dimensions]);

  const handleMarkerClick = (st: Stadium) => {
    onSelectStadium(st);
    setActiveTab('explorer');
  };

  return (
    <div id="mini-hotspot-map-panel" className="relative mt-4 bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-3xs overflow-hidden select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-blue-900" /> Observatory Mini-Map
        </span>
        <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
          OSM Live Layers
        </span>
      </div>

      <div
        ref={mapRef}
        className="relative w-full h-[230px] overflow-hidden border border-slate-200 bg-sky-50 rounded-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* OpenStreetMap Basemap Tiles */}
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            className="absolute pointer-events-none select-none"
            style={{
              left: tile.left,
              top: tile.top,
              width: 256,
              height: 256,
            }}
            onError={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#edf4f9';
            }}
          />
        ))}

        {/* Training Camps Markers (Smaller Orange Dots) */}
        {projectedCamps.map(({ camp, left, top }) => {
          if (left < -15 || left > dimensions.width + 15 || top < -15 || top > dimensions.height + 15) {
            return null;
          }
          return (
            <button
              key={`camp-${camp.team}`}
              type="button"
              className="absolute rounded-full bg-orange-500 hover:bg-orange-600 transition-all border border-white shadow-3xs hover:scale-130 z-10"
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: '8px',
                height: '8px',
                marginLeft: '-4px',
                marginTop: '-4px',
              }}
              onMouseEnter={() => setHoveredCamp(camp)}
              onMouseLeave={() => setHoveredCamp(null)}
            />
          );
        })}

        {/* Stadium/Case Study Markers (Large Risk-Colored Dots) */}
        {projectedStadiums.map(({ stadium, left, top, val, risk, color }) => {
          if (left < -20 || left > dimensions.width + 20 || top < -20 || top > dimensions.height + 20) {
            return null;
          }

          const isSelected = selectedStadium?.key === stadium.key;
          const isMatch = stadium.type === 'Match';

          let size = isSelected ? 18 : 13;
          let marginOffset = isSelected ? -9 : -6.5;

          return (
            <button
              key={`stadium-${stadium.key}`}
              type="button"
              className={`absolute rounded-full transition-all border-2 border-white shadow-xs z-25 flex items-center justify-center text-[7px] text-white font-bold leading-none ${
                isSelected ? 'scale-125 ring-2 ring-yellow-400 z-30' : 'hover:scale-115'
              }`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                backgroundColor: color,
                width: `${size}px`,
                height: `${size}px`,
                marginLeft: `${marginOffset}px`,
                marginTop: `${marginOffset}px`,
              }}
              onClick={() => handleMarkerClick(stadium)}
              onMouseEnter={() => setHoveredStadium(stadium)}
              onMouseLeave={() => setHoveredStadium(null)}
            >
              {isMatch ? 'S' : 'C'}
            </button>
          );
        })}

        {/* Mini Controls & Instructions Overlay over Map */}
        <div className="absolute bottom-2 left-2 z-40 bg-white/95 backdrop-blur-xs border border-slate-200 rounded px-2 py-0.5 text-[9px] text-slate-500 shadow-3xs flex items-center gap-1 font-medium pointer-events-none">
          <Move className="w-3 h-3 text-slate-400 animate-pulse" /> Drag to pan / Click marker to explore
        </div>

        {/* Map Action Floating zoom Controls */}
        <div className="absolute top-2 right-2 z-40 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-0.5 flex flex-col gap-0.5 shadow-2xs">
          <button
            onClick={() => setZoom((z) => Math.min(8, z + 0.5))}
            className="p-1 hover:bg-slate-50 text-slate-700 rounded-md transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(2.5, z - 0.5))}
            className="p-1 hover:bg-slate-50 text-slate-700 rounded-md border-t border-slate-100 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* STADIUM HOVER TOOLTIP POPUP */}
        {hoveredStadium && (() => {
          const projected = projectedStadiums.find(p => p.stadium.key === hoveredStadium.key);
          if (!projected) return null;
          return (
            <div
              className="absolute z-50 bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-[10px] w-56 shadow-lg pointer-events-none flex flex-col gap-1 transition-all leading-relaxed"
              style={{
                left: Math.max(8, Math.min(dimensions.width - 232, projected.left + 14)),
                top: Math.max(8, Math.min(dimensions.height - 105, projected.top - 45)),
              }}
            >
              <div className="font-bold border-b border-slate-850 pb-1 mb-0.5 flex items-center justify-between">
                <span className="truncate pr-1 text-slate-50">{hoveredStadium.name}</span>
                <span className="px-1 py-0.1 select-none rounded text-[7px] font-black uppercase tracking-wider bg-blue-900/60 text-blue-200 shrink-0">
                  {hoveredStadium.type === 'Match' ? 'Site' : 'Case'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-350">
                <span>Value:</span>
                <span className="font-mono font-bold text-white">{formatTemp(projected.val, tempUnit)} WBGT</span>
              </div>
              <div className="flex justify-between items-center text-slate-350">
                <span>Safety Classification:</span>
                <span className="font-extrabold uppercase text-[9px] tracking-wider" style={{ color: projected.color }}>
                  {projected.risk}
                </span>
              </div>
              <div className="text-[8.5px] italic text-blue-300 font-semibold mt-1 border-t border-slate-900/50 pt-1 text-center">
                Click to explore logs &rarr;
              </div>
            </div>
          );
        })()}

        {/* TRAINING CAMP HOVER TOOLTIP POPUP */}
        {hoveredCamp && (() => {
          const projected = projectedCamps.find(p => p.camp.team === hoveredCamp.team);
          if (!projected) return null;
          return (
            <div
              className="absolute z-50 bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-[10px] w-52 shadow-lg pointer-events-none flex flex-col gap-0.5 transition-all leading-tight"
              style={{
                left: Math.max(8, Math.min(dimensions.width - 216, projected.left + 10)),
                top: Math.max(8, Math.min(dimensions.height - 75, projected.top - 30)),
              }}
            >
              <span className="font-bold text-slate-100 truncate">{hoveredCamp.trainingStadium}</span>
              <div className="flex justify-between items-center mt-1 text-slate-300">
                <span>Assigned Team:</span>
                <span className="font-bold text-white">{hoveredCamp.team}</span>
              </div>
              <span className="text-[8px] text-orange-400 font-bold uppercase tracking-wider mt-1 text-right">
                Training Base Camp Context
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
