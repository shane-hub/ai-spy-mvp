import { useEffect, useState } from 'react';

export type MascotState =
    | 'idle' | 'hoverUpload' | 'uploading' | 'selected'
    | 'analyzing' | 'scanning' | 'fake' | 'real'
    | 'error' | 'paywall' | 'historyOpen' | 'langSwitch';

// ── Pupil tracking ────────────────────────────────────────────────
function usePupilTracking(enabled: boolean) {
    const [off, setOff] = useState({ x: 0, y: 0 });
    useEffect(() => {
        if (!enabled) { setOff({ x: 0, y: 0 }); return; }
        const handle = (e: MouseEvent) => {
            const el = document.getElementById('mascot-svg');
            if (!el) return;
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width * 0.5;
            const cy = r.top + r.height * 0.38;
            const dx = e.clientX - cx, dy = e.clientY - cy;
            const dist = Math.hypot(dx, dy);
            const s = dist > 1 ? Math.min(8 / dist, 1) : 0;
            setOff({ x: +(dx * s).toFixed(1), y: +(dy * s).toFixed(1) });
        };
        window.addEventListener('mousemove', handle, { passive: true });
        return () => window.removeEventListener('mousemove', handle);
    }, [enabled]);
    return off;
}

const TRACKING_STATES: MascotState[] = [
    'idle', 'hoverUpload', 'selected', 'analyzing', 'historyOpen', 'langSwitch', 'paywall', 'error'
];

// ── Cubic-bezier arm paths (Worly thin-wire style) ─────────────────
// Shoulders: Left=(20,122)  Right=(180,122)
const ARMS: Record<MascotState, { l: string; r: string }> = {
    // Each: C cp1x,cp1y cp2x,cp2y endx,endy
    idle: { l: 'C 0,138 -5,162 6,190', r: 'C 200,138 205,162 194,190' },
    hoverUpload: { l: 'C 0,138 -5,162 6,190', r: 'C 202,128 210,148 205,162' },
    uploading: { l: 'C -5,102 -12,78 0,58', r: 'C 205,102 212,78 200,58' },
    selected: { l: 'C -8,98 -15,72 -2,55', r: 'C 200,138 205,162 194,190' },
    analyzing: { l: 'C 0,138 -5,162 6,190', r: 'C 206,108 218,95 215,82' },
    scanning: { l: 'C 0,138 -5,162 6,190', r: 'C 200,138 205,162 194,190' },
    fake: { l: 'C 30,105 42,90 52,82', r: 'C 170,105 158,90 148,82' },
    real: { l: 'C 0,138 -5,162 6,190', r: 'C 206,100 212,80 208,62' },
    error: { l: 'C -8,122 -20,128 -28,138', r: 'C 208,122 220,128 228,138' },
    paywall: { l: 'C 0,138 -5,162 6,190', r: 'C 208,108 228,112 235,115' },
    historyOpen: { l: 'C 0,138 -5,162 6,190', r: 'C 200,138 205,162 194,190' },
    langSwitch: { l: 'C 0,138 -5,162 6,190', r: 'C 206,98 212,76 208,58' },
};

function armEnd(cubic: string): { x: number; y: number } {
    const parts = cubic.trim().split(/\s+/);
    const last = parts[parts.length - 1].split(',');
    return { x: parseFloat(last[0]), y: parseFloat(last[1]) };
}

// ── Body animation class ───────────────────────────────────────────
function bodyClass(s: MascotState) {
    switch (s) {
        case 'scanning': return 'mascot-shake';
        case 'uploading': return 'mascot-jump';
        case 'real': return 'mascot-happy-bob';
        case 'fake': return 'mascot-lean-back';
        case 'historyOpen': return 'mascot-tilt-left';
        case 'langSwitch': return 'mascot-wave';
        default: return 'animate-float';
    }
}

// ── Eye ───────────────────────────────────────────────────────────
function Eye({ cx, cy, state, pupil, side }: {
    cx: number; cy: number; state: MascotState; pupil: { x: number; y: number }; side: 'l' | 'r';
}) {
    const squint = state === 'selected' || state === 'analyzing';
    const wink = state === 'langSwitch' && side === 'l';
    const special = ['scanning', 'fake', 'real', 'error', 'paywall'].includes(state);
    const ry = wink ? 4 : squint ? 16 : 30;
    const px = cx + pupil.x, py = cy + pupil.y;

    return (
        <g>
            {/* Sclera – Worly white */}
            <ellipse cx={cx} cy={cy} rx={30} ry={ry} fill="#FFFFFF" />

            {wink && <rect x={cx - 23} y={cy - 5} width={46} height={10} rx={5} fill="#3730a3" />}

            {!special && !wink && (
                <>
                    {/* Iris */}
                    <circle cx={px} cy={py} r={14} fill="#1a1a5e" />
                    {/* Pupil */}
                    <circle cx={px} cy={py} r={8.5} fill="#0a0a1e" />
                    {/* Main shine */}
                    <circle cx={px + 5} cy={py - 5} r={5} fill="white" />
                    {/* Secondary shine */}
                    <circle cx={px - 3} cy={py + 4} r={2.5} fill="rgba(255,255,255,0.4)" />
                </>
            )}

            {state === 'scanning' && (
                <>
                    <circle cx={cx} cy={cy} r={16} fill="#0f1642" />
                    <rect x={cx - 20} y={cy - 4} width={40} height={8} rx={4}
                        fill="#60A5FA" className="animate-scan-line" />
                </>
            )}

            {state === 'fake' && (
                <>
                    <circle cx={cx} cy={cy} r={16} fill="#300808" />
                    <g stroke="#F87171" strokeWidth={5} strokeLinecap="round">
                        <line x1={cx - 11} y1={cy - 11} x2={cx + 11} y2={cy + 11} />
                        <line x1={cx + 11} y1={cy - 11} x2={cx - 11} y2={cy + 11} />
                    </g>
                </>
            )}

            {state === 'real' && (
                <>
                    <circle cx={cx} cy={cy} r={16} fill="#082818" />
                    <polyline points={`${cx - 13},${cy + 2} ${cx - 3},${cy + 14} ${cx + 14},${cy - 10}`}
                        stroke="#4ADE80" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </>
            )}

            {state === 'error' && (
                <>
                    <circle cx={cx} cy={cy} r={16} fill="#281808" />
                    <text x={cx} y={cy + 8} textAnchor="middle" fontSize={24} fontWeight="900"
                        fill="#FBBF24" fontFamily="system-ui,sans-serif">?</text>
                </>
            )}

            {state === 'paywall' && (
                <>
                    <circle cx={cx} cy={cy} r={16} fill="#082808" />
                    <text x={cx} y={cy + 8} textAnchor="middle" fontSize={22} fontWeight="900"
                        fill="#86EFAC" fontFamily="system-ui,sans-serif">$</text>
                </>
            )}
        </g>
    );
}

// ── Mouth ─────────────────────────────────────────────────────────
function Mouth({ state }: { state: MascotState }) {
    const base = { stroke: '#7c6ab0', strokeWidth: 4, strokeLinecap: 'round' as const, fill: 'none' };
    switch (state) {
        case 'uploading': case 'real': case 'langSwitch':
            return <path d="M 68,146 Q 100,168 132,146" {...base} />;
        case 'hoverUpload':
            return <path d="M 72,144 Q 100,162 128,144" {...base} />;
        case 'selected': case 'analyzing': case 'scanning':
            return <path d="M 74,146 L 126,146" {...base} />;
        case 'fake':
            return <ellipse cx={100} cy={152} rx={18} ry={15} {...base} />;
        case 'error':
            return <path d="M 74,144 Q 87,156 100,144 Q 113,132 126,144" {...base} />;
        case 'paywall':
            return <path d="M 76,143 Q 100,154 124,143" {...base} />;
        default:
            return <path d="M 72,144 Q 100,160 128,144" {...base} />;
    }
}

// ── Main ──────────────────────────────────────────────────────────
interface MascotProps { state: MascotState; className?: string }

export function MascotCharacter({ state, className = '' }: MascotProps) {
    const pupil = usePupilTracking(TRACKING_STATES.includes(state));
    const la = ARMS[state].l, ra = ARMS[state].r;
    const lEnd = armEnd(la), rEnd = armEnd(ra);

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <svg id="mascot-svg" viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg"
                className={`w-full h-full transition-all duration-500 ${bodyClass(state)}`}
                style={{ filter: 'drop-shadow(0 16px 48px rgba(79,70,229,0.45))' }}>

                <defs>
                    {/* Worly-style: lighter at the top-center, darker at edges */}
                    <radialGradient id="worlyBody" cx="45%" cy="32%" r="68%">
                        <stop offset="0%" stopColor="#7C6FF7" />
                        <stop offset="40%" stopColor="#4F46E5" />
                        <stop offset="100%" stopColor="#1e1b6b" />
                    </radialGradient>
                    <radialGradient id="worlyLimb" cx="50%" cy="0%" r="100%">
                        <stop offset="0%" stopColor="#3730a3" />
                        <stop offset="100%" stopColor="#1e1b6b" />
                    </radialGradient>
                    <radialGradient id="gndShadow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(30,27,107,0.55)" />
                        <stop offset="100%" stopColor="rgba(30,27,107,0)" />
                    </radialGradient>
                </defs>

                {/* Ground shadow */}
                <ellipse cx={100} cy={272} rx={60} ry={11} fill="url(#gndShadow)" />

                {/* ── Arms (behind body) ── */}
                <path d={`M 20,122 ${la}`}
                    stroke="url(#worlyLimb)" strokeWidth={10} strokeLinecap="round" fill="none" />
                {/* Left hand */}
                <circle cx={lEnd.x} cy={lEnd.y} r={10} fill="#27239e" />

                <path d={`M 180,122 ${ra}`}
                    stroke="url(#worlyLimb)" strokeWidth={10} strokeLinecap="round" fill="none" />
                {/* Right hand - thumbs up for 'real' */}
                {state === 'real'
                    ? <g transform={`translate(${rEnd.x},${rEnd.y})`}>
                        <rect x={-8} y={2} width={16} height={20} rx={8} fill="#27239e" />
                        <rect x={-6} y={-18} width={12} height={22} rx={6} fill="#2d29b0" />
                    </g>
                    : <circle cx={rEnd.x} cy={rEnd.y} r={10} fill="#27239e" />
                }

                {/* ── Legs ── */}
                <rect x={74} y={196} width={22} height={50} rx={11} fill="#1a186a" />
                <rect x={104} y={196} width={22} height={50} rx={11} fill="#1a186a" />

                {/* ── Feet (wide, Worly-style) ── */}
                <ellipse cx={82} cy={248} rx={30} ry={13} fill="#131260" />
                <ellipse cx={118} cy={248} rx={30} ry={13} fill="#131260" />

                {/* ── Main body blob (Worly: big circle IS the head+body) ── */}
                <circle cx={100} cy={112} r={84} fill="url(#worlyBody)" />

                {/* ── Gloss highlight top-left ── */}
                <ellipse cx={72} cy={64} rx={40} ry={26}
                    fill="rgba(255,255,255,0.07)" transform="rotate(-12,72,64)" />

                {/* ── Eyes ── */}
                <Eye cx={67} cy={100} state={state} pupil={pupil} side="l" />
                <Eye cx={133} cy={100} state={state} pupil={pupil} side="r" />

                {/* ── Mouth ── */}
                <Mouth state={state} />

                {/* ── Blush marks (Worly doesn't have these but adds cuteness) ── */}
                {['idle', 'real', 'langSwitch', 'hoverUpload', 'uploading'].includes(state) && <>
                    <ellipse cx={42} cy={130} rx={15} ry={8} fill="rgba(255,150,200,0.18)" />
                    <ellipse cx={158} cy={130} rx={15} ry={8} fill="rgba(255,150,200,0.18)" />
                </>}
            </svg>
        </div>
    );
}
