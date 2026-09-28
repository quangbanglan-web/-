import React, { useState, useRef } from 'react';
import { X, RotateCw } from 'lucide-react';

interface RulerProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const VirtualRuler: React.FC<RulerProps> = ({ isOpen, onClose, isDark }) => {
  const [pos, setPos] = useState({ x: 260, y: 320 });
  const [rotation, setRotation] = useState(0); // in degrees
  const isDraggingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const rotateStartRef = useRef({ angle: 0, initialRot: 0 });

  if (!isOpen) return null;

  const lengthCm = 20; // 20 cm ruler
  const pxPerCm = 36; // 36px per cm
  const widthPx = lengthCm * pxPerCm;
  const heightPx = 68;

  const handlePointerDownDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

    const handlePointerMove = (ev: PointerEvent) => {
      if (isDraggingRef.current) {
        setPos({
          x: ev.clientX - dragStartRef.current.x,
          y: ev.clientY - dragStartRef.current.y,
        });
      }
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerDownRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    isRotatingRef.current = true;
    const centerX = pos.x + widthPx / 2;
    const centerY = pos.y + heightPx / 2;
    const initialAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    rotateStartRef.current = { angle: initialAngle, initialRot: rotation };

    const handlePointerMove = (ev: PointerEvent) => {
      if (isRotatingRef.current) {
        const curAngle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI);
        const diff = curAngle - rotateStartRef.current.angle;
        let newRot = Math.round(rotateStartRef.current.initialRot + diff);
        // Snap to 15 degrees if near
        const snap = Math.round(newRot / 15) * 15;
        if (Math.abs(newRot - snap) < 4) newRot = snap;
        setRotation(newRot);
      }
    };

    const handlePointerUp = () => {
      isRotatingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
      }}
      className={`fixed z-30 select-none shadow-2xl rounded-xl border-2 flex flex-col justify-between cursor-move backdrop-blur-md transition-shadow ${
        isDark
          ? 'bg-amber-950/85 border-amber-600/70 text-amber-200'
          : 'bg-amber-100/95 border-amber-500/80 text-amber-950'
      }`}
      onPointerDown={handlePointerDownDrag}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Millimeter & Centimeter Marks along Top Edge */}
      <div className="w-full flex items-start justify-between px-2 pt-1 border-b border-amber-500/30">
        {Array.from({ length: lengthCm * 10 + 1 }).map((_, mm) => {
          const isCm = mm % 10 === 0;
          const isHalfCm = mm % 5 === 0 && !isCm;
          const cmNum = mm / 10;

          return (
            <div key={mm} className="flex flex-col items-center flex-1">
              <div
                style={{
                  height: isCm ? '18px' : isHalfCm ? '11px' : '6px',
                  width: '1px',
                }}
                className={isCm ? 'bg-amber-900 dark:bg-amber-100' : 'bg-amber-700/60 dark:bg-amber-300/50'}
              />
              {isCm && (
                <span className="text-[10px] font-black mt-0.5 leading-none select-none">
                  {cmNum}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Center Controls & Rotation Indicator */}
      <div className="flex items-center justify-between px-4 pb-1.5">
        <div className="text-[11px] font-bold tracking-wider opacity-85">
          Линейка 20 см ({rotation}°)
        </div>

        {/* Rotate Handle */}
        <div
          onPointerDown={handlePointerDownRotate}
          title="Потяните для вращения линейки"
          className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 active:scale-95 cursor-grab active:cursor-grabbing transition"
        >
          <RotateCw className="w-4 h-4" />
        </div>

        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="Закрыть линейку"
          className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-500 active:scale-95 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface ProtractorProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const VirtualProtractor: React.FC<ProtractorProps> = ({ isOpen, onClose, isDark }) => {
  const [pos, setPos] = useState({ x: 400, y: 220 });
  const [rotation, setRotation] = useState(0);
  const isDraggingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const rotateStartRef = useRef({ angle: 0, initialRot: 0 });

  if (!isOpen) return null;

  const radius = 135;
  const width = radius * 2;
  const height = radius + 28;

  const handlePointerDownDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

    const handlePointerMove = (ev: PointerEvent) => {
      if (isDraggingRef.current) {
        setPos({
          x: ev.clientX - dragStartRef.current.x,
          y: ev.clientY - dragStartRef.current.y,
        });
      }
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerDownRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    isRotatingRef.current = true;
    const centerX = pos.x + radius;
    const centerY = pos.y + radius;
    const initialAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    rotateStartRef.current = { angle: initialAngle, initialRot: rotation };

    const handlePointerMove = (ev: PointerEvent) => {
      if (isRotatingRef.current) {
        const curAngle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI);
        const diff = curAngle - rotateStartRef.current.angle;
        let newRot = Math.round(rotateStartRef.current.initialRot + diff);
        const snap = Math.round(newRot / 15) * 15;
        if (Math.abs(newRot - snap) < 4) newRot = snap;
        setRotation(newRot);
      }
    };

    const handlePointerUp = () => {
      isRotatingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: `${radius}px ${radius}px`,
      }}
      className={`fixed z-30 select-none shadow-2xl rounded-t-full border-2 border-b-4 flex flex-col items-center justify-between cursor-move backdrop-blur-md ${
        isDark
          ? 'bg-cyan-950/85 border-cyan-500/70 text-cyan-200'
          : 'bg-cyan-50/95 border-cyan-500/80 text-cyan-950'
      }`}
      onPointerDown={handlePointerDownDrag}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Semi-circular degree ticks (0 to 180 degrees) */}
      <svg
        width={width}
        height={radius}
        className="overflow-visible pointer-events-none absolute top-0 left-0"
      >
        {Array.from({ length: 19 }).map((_, i) => {
          const deg = i * 10;
          const rad = (deg * Math.PI) / 180;
          const x1 = radius + (radius - 2) * -Math.cos(rad);
          const y1 = radius - (radius - 2) * Math.sin(rad);
          const x2 = radius + (radius - 14) * -Math.cos(rad);
          const y2 = radius - (radius - 14) * Math.sin(rad);

          const tx = radius + (radius - 26) * -Math.cos(rad);
          const ty = radius - (radius - 26) * Math.sin(rad);

          return (
            <g key={deg}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={deg % 30 === 0 ? 2 : 1}
                opacity={0.8}
              />
              {deg % 30 === 0 && (
                <text
                  x={tx}
                  y={ty}
                  fontSize="9.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="currentColor"
                >
                  {deg}°
                </text>
              )}
            </g>
          );
        })}
        {/* Origin Center Point Crosshair */}
        <circle cx={radius} cy={radius} r={3} fill="currentColor" />
        <line x1={radius - 14} y1={radius} x2={radius + 14} y2={radius} stroke="currentColor" strokeWidth={1.5} />
        <line x1={radius} y1={radius - 14} x2={radius} y2={radius} stroke="currentColor" strokeWidth={1.5} />
      </svg>

      {/* Controls & Rotation */}
      <div className="absolute top-14 flex items-center gap-3">
        <span className="text-xs font-bold">{rotation}°</span>
        <div
          onPointerDown={handlePointerDownRotate}
          title="Потяните для вращения транспортира"
          className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 active:scale-95 cursor-grab active:cursor-grabbing transition pointer-events-auto"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="Закрыть транспортир"
          className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-500 active:scale-95 transition pointer-events-auto"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
