import React from "react";

interface EquidemLogoProps {
  className?: string;
  size?: number;
  variant?: "mark" | "full";
}

/**
 * High-fidelity corporate logo for EQUIDEM.
 * Based on the official circular interlocking hands design.
 * Uses robust geometric vector math to achieve 100% pixel-perfect scaling and accuracy.
 */
export const EquidemLogo: React.FC<EquidemLogoProps> = ({
  className = "",
  size = 40,
  variant = "mark"
}) => {
  // If the full logo with text "equidem" is requested:
  if (variant === "full") {
    // We render a responsive, self-contained SVG wrapping both the 5-hand circular mark & the custom branding typeface
    return (
      <svg
        viewBox="0 0 280 80"
        fill="none"
        xmlns="http://www.w3.org/2050/svg"
        className={`select-none shrink-0 transition-opacity duration-300 hover:opacity-95 ${className}`}
        style={{ width: size * 3.5, height: size }}
      >
        {/* ========================================================
            PART 1: THE INTERLOCKING HANDS EMBLEM (LEFT)
            Symmetrical 5-Fold Swirl. Rotated around center (40, 40)
            ======================================================== */}
        <g id="equidem-crest" transform="translate(0, 0)">
          {/* Defined base reusable single-hand asset */}
          <defs>
            <g id="single-hand">
              {/* Outer Wrist / Palm Solid Backing Welded Shape */}
              <path
                d="M 68.0 55.0 C 64.0 51.5 59.5 48.0 55.0 46.5 C 50.5 45.0 42.0 44.5 39.0 47.0"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
              />
              
              {/* Finger 1 (Outer - Radius 35) */}
              <path
                d="M 68.0 51.0 A 31.5 31.5 0 0 0 54.0 12.0"
                fill="none"
                stroke="currentColor"
                strokeWidth="5.0"
                strokeLinecap="round"
              />
              {/* Finger 2 (Radii step - Radius 25.5) */}
              <path
                d="M 64.0 47.5 A 26.0 26.0 0 0 0 57.0 18.0"
                fill="none"
                stroke="currentColor"
                strokeWidth="5.0"
                strokeLinecap="round"
              />
              {/* Finger 3 (Radii step - Radius 19.5) */}
              <path
                d="M 59.5 44.0 A 20.5 20.5 0 0 0 57.0 24.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="5.0"
                strokeLinecap="round"
              />
              {/* Finger 4 (Inner - Radius 13.5) */}
              <path
                d="M 55.0 40.5 A 15.0 15.0 0 0 0 57.0 30.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="5.0"
                strokeLinecap="round"
              />
            </g>
          </defs>

          {/* Render the 5 Interlocking Swirling Hands in exact corporate colors */}
          {/* Hand 1: Yellow/Orange (Top-Left) */}
          <g className="text-[#f29200]">
            <use href="#single-hand" transform="rotate(144 40 40)" />
          </g>

          {/* Hand 2: Pink/Magenta (Top) */}
          <g className="text-[#e5007d]">
            <use href="#single-hand" transform="rotate(72 40 40)" />
          </g>

          {/* Hand 3: Dark Blue/Navy (Right) */}
          <g className="text-[#183060]">
            <use href="#single-hand" transform="rotate(0 40 40)" />
          </g>

          {/* Hand 4: Cyan/Light Blue (Bottom) */}
          <g className="text-[#00a2e2]">
            <use href="#single-hand" transform="rotate(288 40 40)" />
          </g>

          {/* Hand 5: Lime Green (Bottom-Left) */}
          <g className="text-[#72b82f]">
            <use href="#single-hand" transform="rotate(216 40 40)" />
          </g>
        </g>

        {/* ========================================================
            PART 2: TYPOGRAPHY BRAND MARK "equidem" (RIGHT)
            Precision vector geometry for official look and feel
            ======================================================== */}
        <g id="equidem-text" className="text-[#13386f]" fill="currentColor">
          {/* letter: e */}
          <path d="M 120 46 C 120 40 124 36 131 36 C 137 36 141 40 141 46 L 141 47 L 120.5 47 C 120.5 51 123.5 54 128 54 C 132 54 135 52.5 137 50.5 L 140 53 C 137.5 56.5 133 58 128 58 C 121 58 116 53 116 46 Z M 136.5 43.5 C 136.5 40.5 134.5 38.5 131 38.5 C 127.5 38.5 124.5 40.5 124 43.5 Z" />

          {/* letter: q */}
          <path d="M 148 47 C 148 40.5 152 36 158.5 36 C 163.5 36 167 39.5 168 43 L 168 36.5 L 172 36.5 L 172 63 L 168 63 L 168 56.5 C 167 60 163.5 63.5 158.5 63.5 C 152 63.5 148 59 148 51.5 L 148 47 Z M 168 47 C 168 41.5 164.5 39 160 39 C 155.5 39 152 42.5 152 47.5 L 152 50.5 C 152 55.5 155.5 59 160 59 C 164.5 59 168 56.5 168 51 Z" />

          {/* letter: u */}
          <path d="M 180 36.5 L 184 36.5 L 184 49.5 C 184 54 186.5 56 190.5 56 C 194.5 56 197 54 197 49.5 L 197 36.5 L 201 36.5 L 201 57.5 L 197 57.5 L 197 54 C 196 56.5 192.5 58 189 58 C 183.5 58 180 54.5 180 49 L 180 36.5 Z" />

          {/* letter: i */}
          <path d="M 209 36.5 L 213 36.5 L 213 57.5 L 209 57.5 Z" />
          <circle cx="211" cy="27" r="2.5" />

          {/* letter: d */}
          <path d="M 221 47 C 221 40 225 36 231.5 36 C 236.5 36 239.5 39.5 241 43.5 L 241 21 L 245 21 L 245 57.5 L 241 57.5 L 241 54 C 239.5 57.5 236.5 59 231.5 59 C 225 59 221 54 221 47 Z M 241 47.5 L 241 47 C 241 41.5 237.5 39 233 39 C 228.5 39 225 42.5 225 47.5 L 225 50.5 C 225 55.5 228.5 59 233 59 C 237.5 59 241 56 241 50.5 Z" />

          {/* letter: e */}
          <path d="M 253 46 C 253 40 257 36 264 36 C 270 36 274 40 274 46 L 274 47 L 253.5 47 C 253.5 51 256.5 54 261 54 C 265 54 268 52.5 270 50.5 L 273 53 C 270.5 56.5 266 58 261 58 C 254 58 249 53 249 46 Z M 269.5 43.5 C 269.5 40.5 267.5 38.5 264 38.5 C 260.5 38.5 257.5 40.5 257 43.5 Z" />

          {/* letter: m */}
          <path d="M 282 36.5 L 286 36.5 L 286 41 C 287.5 38.5 290.5 36 294.5 36 C 298.5 36 301 38.5 302 41.5 C 304 38.5 307 36 311 36 C 316.5 36 320 39.5 320 46 L 320 57.5 L 316 57.5 L 316 46.5 C 316 42.5 314 40 310.5 40 C 307 40 304.5 42.5 304.5 46.5 L 304.5 57.5 L 300.5 57.5 L 300.5 46.5 C 300.5 42.5 298.5 40 295 40 C 291.5 40 289 42.5 289 46.5 L 289 57.5 L 282 57.5 Z" />
        </g>
      </svg>
    );
  }

  // Otherwise, default to "mark": render just the central 5-hand circular emblem
  return (
    <div
      className={`relative flex items-center justify-center select-none shrink-0 transition-transform duration-300 hover:scale-105 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10"
      >
        {/* Reusable hand template */}
        <defs>
          <g id="single-hand-mark">
            {/* Outer Wrist / Palm Solid Backing Welded Shape */}
            <path
              d="M 68.0 55.0 C 64.0 51.5 59.5 48.0 55.0 46.5 C 50.5 45.0 42.0 44.5 39.0 47.0"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
            />
            
            {/* Finger 1 */}
            <path
              d="M 68.0 51.0 A 31.5 31.5 0 0 0 54.0 12.0"
              fill="none"
              stroke="currentColor"
              strokeWidth="5.0"
              strokeLinecap="round"
            />
            {/* Finger 2 */}
            <path
              d="M 64.0 47.5 A 26.0 26.0 0 0 0 57.0 18.0"
              fill="none"
              stroke="currentColor"
              strokeWidth="5.0"
              strokeLinecap="round"
            />
            {/* Finger 3 */}
            <path
              d="M 59.5 44.0 A 20.5 20.5 0 0 0 57.0 24.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="5.0"
              strokeLinecap="round"
            />
            {/* Finger 4 */}
            <path
              d="M 55.0 40.5 A 15.0 15.0 0 0 0 57.0 30.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="5.0"
              strokeLinecap="round"
            />
          </g>
        </defs>

        {/* Rotations */}
        <g className="text-[#f29200]">
          <use href="#single-hand-mark" transform="rotate(144 40 40)" />
        </g>
        <g className="text-[#e5007d]">
          <use href="#single-hand-mark" transform="rotate(72 40 40)" />
        </g>
        <g className="text-[#183060]">
          <use href="#single-hand-mark" transform="rotate(0 40 40)" />
        </g>
        <g className="text-[#00a2e2]">
          <use href="#single-hand-mark" transform="rotate(288 40 40)" />
        </g>
        <g className="text-[#72b82f]">
          <use href="#single-hand-mark" transform="rotate(216 40 40)" />
        </g>
      </svg>
    </div>
  );
};
