"use client";

// 8 pixel art dogs — 12 wide × 10 tall grid
// Each dog is defined as [body color, ear color, eye color, nose color, tail color]
const DOG_PALETTES = [
  { body: "#c8a87a", ear: "#a07850", eye: "#3a2010", nose: "#e06060", tail: "#c8a87a" },  // golden
  { body: "#e0e0e0", ear: "#b0b0b0", eye: "#222244", nose: "#e060a0", tail: "#e0e0e0" }, // white
  { body: "#5a3a20", ear: "#3a2010", eye: "#e0c080", nose: "#c05050", tail: "#5a3a20" }, // dark brown
  { body: "#f0d080", ear: "#c8a050", eye: "#303010", nose: "#d06060", tail: "#f0d080" }, // yellow lab
  { body: "#888888", ear: "#555555", eye: "#1a1a2a", nose: "#404040", tail: "#888888" }, // grey
  { body: "#c05020", ear: "#803010", eye: "#201010", nose: "#c04040", tail: "#c05020" }, // red setter
  { body: "#f0f0f0", ear: "#d0a0a0", eye: "#1a1a1a", nose: "#e07090", tail: "#f0f0f0" }, // dalmatian-ish
  { body: "#704820", ear: "#4a3010", eye: "#f0e0a0", nose: "#b04040", tail: "#704820" }, // choc lab
];

// pixel grid [row][col] — 10 rows × 12 cols
// 0=bg, 1=body, 2=ear, 3=eye, 4=nose, 5=tail
const PIXEL_GRID = [
  [0,0,2,0,0,0,0,0,0,2,0,0],
  [0,2,2,2,0,0,0,0,2,2,2,0],
  [0,1,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,3,1,1,1,1,3,1,1,1],
  [1,1,1,1,1,4,4,1,1,1,1,5],
  [1,1,1,1,1,1,1,1,1,1,1,5],
  [0,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,1,0,0,0,0,1,0,1,0],
  [0,1,0,1,0,0,0,0,1,0,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0],
];

const COLOR_KEYS = ["", "body", "ear", "eye", "nose", "tail"] as const;

interface PixelDogProps {
  dogId: number;
  size?: number; // pixel size per cell, default 6
}

export default function PixelDog({ dogId, size = 6 }: PixelDogProps) {
  const palette = DOG_PALETTES[((dogId ?? 0) % DOG_PALETTES.length)];
  const cols = PIXEL_GRID[0].length;
  const rows = PIXEL_GRID.length;
  const w = cols * size;
  const h = rows * size;

  return (
    <svg
      width={w} height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ imageRendering: "pixelated", display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {PIXEL_GRID.map((row, ri) =>
        row.map((cell, ci) => {
          if (cell === 0) return null;
          const key = COLOR_KEYS[cell];
          const fill = palette[key as keyof typeof palette] ?? "#888";
          return (
            <rect
              key={`${ri}-${ci}`}
              x={ci * size} y={ri * size}
              width={size} height={size}
              fill={fill}
            />
          );
        })
      )}
    </svg>
  );
}
