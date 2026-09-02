import { useMemo, useRef, useState } from 'react';
import { TAG_EMOJI_FALLBACK } from '../../utils/tagMeta';

interface WaffleItem {
  name: string;
  value: number;
}

interface WaffleChartProps {
  data: WaffleItem[];
  onSelectTag?: (tag: string) => void;
  getColor?: (tag: string) => string;
  getEmoji?: (tag: string) => string;
}

export function WaffleChart({ data, onSelectTag, getColor, getEmoji }: WaffleChartProps) {
  const [hovered, setHovered] = useState<{
    name: string;
    value: number;
    pct: number;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [allAnimated, setAllAnimated] = useState(false);
  const animatedCount = useRef(0);

  // Build 100 cells using largest-remainder rounding so the waffle is always full
  // while staying as close as possible to each item's true share.
  const cells = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return [];
    const rawShares = data.map((item) => ({
      name: item.name,
      floor: Math.floor((item.value / total) * 100),
      remainder: ((item.value / total) * 100) - Math.floor((item.value / total) * 100),
    }));
    const baseCells = rawShares.reduce((sum, s) => sum + s.floor, 0);
    const cellsToDistribute = 100 - baseCells;

    const sortedByRemainder = rawShares
      .map((s, index) => ({ ...s, index }))
      .sort((a, b) => b.remainder - a.remainder);
    const extraCells = new Map<string, number>();
    for (let i = 0; i < cellsToDistribute; i++) {
      const item = sortedByRemainder[i % sortedByRemainder.length];
      extraCells.set(item.name, (extraCells.get(item.name) ?? 0) + 1);
    }

    const result: { name: string; color: string }[] = [];
    data.forEach((item) => {
      const count = rawShares.find((s) => s.name === item.name)!.floor + (extraCells.get(item.name) ?? 0);
      const color = getColor?.(item.name) ?? '#6366f1';
      for (let j = 0; j < count; j++) {
        result.push({ name: item.name, color });
      }
    });
    return result;
  }, [data, getColor]);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  if (total === 0) return null;

  // `animationend` bubbles up from every cell; commit the animation-complete
  // state once instead of firing up to 100 ready-state updates.
  const handleAnimationEnd = () => {
    animatedCount.current += 1;
    if (animatedCount.current >= cells.length) {
      setAllAnimated(true);
    }
  };

  const handleMouseEnter = (
    name: string,
    value: number,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    setHovered({ name, value, pct: (value / total) * 100 });
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleFocus = (
    name: string,
    value: number,
    e: React.FocusEvent<HTMLDivElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHovered({ name, value, pct: (value / total) * 100 });
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => setHovered(null);

  const handleBlur = () => setHovered(null);

  const focusedName = hovered?.name ?? null;

  return (
    <div className="relative select-none">
      <style>
        {`
          @keyframes waffleScaleIn {
            from {
              opacity: 0;
              transform: scale(0);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>

      {/* Grid of 100 cells */}
      <div className="grid grid-cols-10 gap-1" onAnimationEnd={handleAnimationEnd}>
        {cells.map((cell, idx) => {
          const isMatch =
            focusedName !== null && cell.name === focusedName;
          const isDimmed =
            focusedName !== null && !isMatch;
          const emoji = getEmoji?.(cell.name) ?? TAG_EMOJI_FALLBACK;

          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              className="flex aspect-square cursor-pointer items-center justify-center rounded-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              style={{
                backgroundColor: cell.color,
                opacity: allAnimated ? (isDimmed ? 0.5 : 1) : 0,
                transform: allAnimated
                  ? isMatch
                    ? 'scale(1.1)'
                    : 'scale(1)'
                  : 'scale(0)',
                animation: allAnimated
                  ? undefined
                  : `waffleScaleIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) ${(9 - Math.floor(idx / 10)) * 35 + (idx % 10) * 3}ms forwards`,
              }}
              onClick={() => onSelectTag?.(cell.name)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectTag?.(cell.name);
                }
              }}
              onMouseEnter={(e) => {
                const item = data.find((d) => d.name === cell.name);
                if (item) handleMouseEnter(cell.name, item.value, e);
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onFocus={(e) => {
                const item = data.find((d) => d.name === cell.name);
                if (item) handleFocus(cell.name, item.value, e);
              }}
              onBlur={handleBlur}
            >
              {/* Emoji badge — rendered unconditionally so it scales in with the parent cell */}
              <span className="pointer-events-none text-sm leading-none">{emoji}</span>
            </div>
          );
        })}
      </div>

      {/* Custom tooltip */}
      {hovered && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 12,
          }}
        >
          <div className="font-semibold">{hovered.name}</div>
          <div className="text-slate-500 dark:text-slate-300">
            {hovered.value} ({hovered.pct.toFixed(1)}%)
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {data.map((item) => (
          <span
            key={item.name}
            role="button"
            tabIndex={0}
            aria-label={`Filter by ${item.name}`}
            className="flex cursor-pointer items-center gap-1.5 rounded-sm text-xs text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:text-slate-300"
            onClick={() => onSelectTag?.(item.name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectTag?.(item.name);
              }
            }}
          >
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: getColor?.(item.name) ?? '#6366f1' }}
            />
            <span className="leading-none">{getEmoji?.(item.name) ?? TAG_EMOJI_FALLBACK}</span>
            <span className="max-w-[120px] truncate">{item.name}</span>
            <span className="text-slate-500 dark:text-slate-400">({item.value})</span>
          </span>
        ))}
      </div>
    </div>
  );
}
