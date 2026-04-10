import { useEffect, useRef } from 'react';
import { ShieldAlert, ShieldCheck, Search } from 'lucide-react';

export type ScanState = 'idle' | 'selected' | 'scanning' | 'fake' | 'real' | 'error';

interface ScanOrbProps {
    state: ScanState;
    preview?: string | null;
    className?: string;
}

export function ScanOrb({ state, preview, className = '' }: ScanOrbProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Radar sweep animation for idle/selected states
    useEffect(() => {
        if (state !== 'idle' && state !== 'selected') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let angle = 0;
        let animId: number;

        const draw = () => {
            const w = canvas.width, h = canvas.height;
            const cx = w / 2, cy = h / 2;
            const r = w * 0.42;

            ctx.clearRect(0, 0, w, h);

            // Concentric rings
            const ringColor = state === 'selected' ? 'rgba(34,197,94,' : 'rgba(99,102,241,';
            [0.9, 0.65, 0.4].forEach((ratio, i) => {
                ctx.beginPath();
                ctx.arc(cx, cy, r * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = ringColor + (0.15 - i * 0.03) + ')';
                ctx.lineWidth = 1;
                ctx.stroke();
            });

            // Cross hairs
            ctx.strokeStyle = ringColor + '0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();

            // Sweep arc (approximate with arc fill)
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            const grad = ctx.createLinearGradient(0, -r, r * 0.7, 0);
            grad.addColorStop(0, state === 'selected' ? 'rgba(34,197,94,0)' : 'rgba(99,102,241,0)');
            grad.addColorStop(1, state === 'selected' ? 'rgba(34,197,94,0.35)' : 'rgba(99,102,241,0.35)');
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, r, -Math.PI / 8, Math.PI / 3);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();

            // Sweep tip dot
            ctx.beginPath();
            ctx.arc(Math.cos(0) * r * 0.9, Math.sin(0) * r * 0.9, 4, 0, Math.PI * 2);
            ctx.fillStyle = state === 'selected' ? 'rgba(34,197,94,0.9)' : 'rgba(129,140,248,0.9)';
            ctx.fill();
            ctx.restore();

            angle += 0.025;
            animId = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(animId);
    }, [state]);

    const size = 'w-44 h-44';

    if (state === 'real') {
        return (
            <div className={`${size} ${className} relative flex items-center justify-center`}>
                <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-2 rounded-full bg-emerald-500/10" />
                <div className="w-24 h-24 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                    <ShieldCheck className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-radar-1" />
                <div className="absolute inset-0 rounded-full border border-emerald-500/15 animate-radar-2" />
            </div>
        );
    }

    if (state === 'fake') {
        return (
            <div className={`${size} ${className} relative flex items-center justify-center`}>
                <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: '0.8s' }} />
                <div className="absolute inset-2 rounded-full bg-red-500/10" />
                <div className="w-24 h-24 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.3)]">
                    <ShieldAlert className="w-10 h-10 text-red-400" />
                </div>
            </div>
        );
    }

    if (state === 'scanning') {
        return (
            <div className={`${size} ${className} relative flex items-center justify-center`}>
                {[0, 1, 2].map(i => (
                    <div key={i}
                        className="absolute rounded-full border border-indigo-400/30"
                        style={{
                            inset: `${i * 12}px`,
                            animation: `radar-ring 2s ease-out ${i * 0.4}s infinite`
                        }}
                    />
                ))}
                <div className="w-20 h-20 rounded-full bg-indigo-500/15 border border-indigo-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                    <Search className="w-8 h-8 text-indigo-300 animate-spin" style={{ animationDuration: '2s' }} />
                </div>
                {preview && (
                    <div className="absolute inset-0 rounded-full overflow-hidden opacity-20">
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                    </div>
                )}
                {/* Scanning line sweeping over preview */}
                <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400/80 to-transparent animate-scan-vertical" />
                </div>
            </div>
        );
    }

    // idle / selected: canvas radar
    return (
        <div className={`${size} ${className} relative flex items-center justify-center`}>
            <canvas
                ref={canvasRef}
                width={176}
                height={176}
                className="absolute inset-0 w-full h-full rounded-full"
            />
            {/* Center icon */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-500 ${state === 'selected'
                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                : 'bg-indigo-500/10 border-indigo-400/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                }`}>
                {preview
                    ? <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                    : <Search className={`w-7 h-7 ${state === 'selected' ? 'text-emerald-400' : 'text-indigo-300'}`} />
                }
            </div>

            {/* Outer ring pulse */}
            <div className={`absolute inset-0 rounded-full border transition-colors duration-500 ${state === 'selected' ? 'border-emerald-500/25' : 'border-indigo-400/20'
                } animate-pulse-dot`} />
        </div>
    );
}
