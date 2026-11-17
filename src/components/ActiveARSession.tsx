import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  Eye,
  Flame,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  Video,
} from 'lucide-react';
import { Exercise, ExerciseTelemetry, PatientProfile } from '../types/rehab';
import { CameraAngle, Skeleton3D } from './Skeleton3D';

interface ActiveARSessionProps {
  patient: PatientProfile;
  exercises: Exercise[];
  activeExerciseIndex: number;
  onSelectExerciseIndex: (index: number) => void;
  telemetry: Record<string, ExerciseTelemetry>;
  showReferenceGate: boolean;
  onAcceptReferenceGate: () => void;
  onReopenReferenceGate: () => void;
  rehabScore: number;
  streakCount: number;
  comboMultiplier: number;
  lastPointsDelta: { id: number; amount: number } | null;
  onRecordGoodRep: (exerciseId: string, achievedAngle: number) => void;
  onRecordFormError: (exercise: Exercise, deviationDeg: number) => void;
  onCompleteExercise: (exerciseId: string) => void;
  onResetExercise: (exerciseId: string) => void;
}

type RepPhase = 'idle' | 'concentric' | 'hold' | 'eccentric';

export const ActiveARSession: React.FC<ActiveARSessionProps> = ({
  patient,
  exercises,
  activeExerciseIndex,
  onSelectExerciseIndex,
  telemetry,
  showReferenceGate,
  onAcceptReferenceGate,
  onReopenReferenceGate,
  rehabScore,
  streakCount,
  comboMultiplier,
  lastPointsDelta,
  onRecordGoodRep,
  onRecordFormError,
  onCompleteExercise,
  onResetExercise,
}) => {
  const exercise = exercises[activeExerciseIndex] ?? exercises[0];
  const exTelemetry = exercise ? telemetry[exercise.id] : undefined;

  const [repPhase, setRepPhase] = useState<RepPhase>('idle');
  const [motionProgress, setMotionProgress] = useState(0.18);
  const [holdRemaining, setHoldRemaining] = useState<number>(exercise?.holdSeconds ?? 2);
  const [hasFormError, setHasFormError] = useState(false);
  const [showGhostBox, setShowGhostBox] = useState(true);
  const [gateCameraAngle, setGateCameraAngle] = useState<CameraAngle>('three-quarter');
  const [gatePreviewPhase, setGatePreviewPhase] = useState(0);
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const [repPulseKey, setRepPulseKey] = useState(0);

  const animRef = useRef<number | null>(null);
  const isAnimatingRepRef = useRef(false);

  // Reset phase timers when switching exercises
  useEffect(() => {
    if (!exercise) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    isAnimatingRepRef.current = false;
    setRepPhase('idle');
    setHasFormError(false);
    setMotionProgress(0.18);
    setHoldRemaining(exercise.holdSeconds);
  }, [exercise?.id]);

  // Smooth looping animation for Step A: 3D Reference Pre-Check Gate
  useEffect(() => {
    if (!showReferenceGate || !exercise) return;
    let raf = 0;
    let startTime: number | null = null;
    const cycleMs = 3600;

    const tick = (ts: number) => {
      if (startTime === null) startTime = ts;
      const norm = ((ts - startTime) % cycleMs) / cycleMs;
      const wave = 0.5 - 0.5 * Math.cos(norm * Math.PI * 2);
      setGatePreviewPhase(wave);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showReferenceGate, exercise?.id]);

  // Smooth idle tracking motion in Step B: Active AR Viewport
  useEffect(() => {
    if (showReferenceGate || !exercise || repPhase !== 'idle') return;
    let raf = 0;
    const start = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      if (hasFormError) {
        setMotionProgress(0.68 + 0.035 * Math.sin(elapsed * 2.4));
      } else {
        setMotionProgress(0.22 + 0.12 * (0.5 - 0.5 * Math.cos(elapsed * 1.4)));
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [showReferenceGate, exercise?.id, repPhase, hasFormError]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  if (!exercise || !exTelemetry) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            No exercises in current rehab plan
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Add exercises from the Clinician Portal to begin an Active AR Session.
          </p>
        </div>
      </main>
    );
  }

  const currentSet = Math.min(exercise.sets, exTelemetry.completedSets + 1);
  const currentRepDisplay =
    exTelemetry.status === 'completed'
      ? exercise.reps
      : exTelemetry.completedRepsInCurrentSet;

  const liveJointAngle =
    exercise.restAngle + (exercise.targetAngle - exercise.restAngle) * motionProgress;
  const effectiveDisplayAngle = hasFormError
    ? exercise.pattern === 'bodyweight-squat'
      ? Math.round(liveJointAngle + 14)
      : Math.round(liveJointAngle - 14)
    : Math.round(liveJointAngle);

  const gatePreviewAngle =
    exercise.restAngle + (exercise.targetAngle - exercise.restAngle) * gatePreviewPhase;

  const handleSimulateGoodRep = () => {
    if (showReferenceGate || isAnimatingRepRef.current) return;
    setHasFormError(false);
    isAnimatingRepRef.current = true;
    setRepPhase('concentric');

    const riseDuration = 600;
    const holdDuration = Math.min(1100, exercise.holdSeconds * 480);
    const lowerDuration = 500;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed < riseDuration) {
        const t = elapsed / riseDuration;
        const eased = 1 - Math.pow(1 - t, 3);
        setRepPhase('concentric');
        setMotionProgress(eased);
        setHoldRemaining(exercise.holdSeconds);
        animRef.current = requestAnimationFrame(step);
      } else if (elapsed < riseDuration + holdDuration) {
        const holdFrac = 1 - (elapsed - riseDuration) / holdDuration;
        setRepPhase('hold');
        setMotionProgress(1);
        setHoldRemaining(Math.max(0, Number((exercise.holdSeconds * holdFrac).toFixed(1))));
        animRef.current = requestAnimationFrame(step);
      } else if (elapsed < riseDuration + holdDuration + lowerDuration) {
        const t = (elapsed - riseDuration - holdDuration) / lowerDuration;
        setRepPhase('eccentric');
        setMotionProgress(1 - t * t);
        setHoldRemaining(0);
        animRef.current = requestAnimationFrame(step);
      } else {
        isAnimatingRepRef.current = false;
        setRepPhase('idle');
        setMotionProgress(0.16);
        setHoldRemaining(exercise.holdSeconds);
        setRepPulseKey((k) => k + 1);
        onRecordGoodRep(exercise.id, exercise.targetAngle);
      }
    };

    animRef.current = requestAnimationFrame(step);
  };

  const handleTriggerOrClearError = () => {
    if (showReferenceGate) return;
    if (isAnimatingRepRef.current && animRef.current) {
      cancelAnimationFrame(animRef.current);
      isAnimatingRepRef.current = false;
      setRepPhase('idle');
    }

    if (!hasFormError) {
      setHasFormError(true);
      setMotionProgress(0.68);
      onRecordFormError(exercise, 14);
    } else {
      setHasFormError(false);
      setMotionProgress(0.22);
    }
  };

  const handleCompleteExerciseClick = () => {
    if (isAnimatingRepRef.current && animRef.current) {
      cancelAnimationFrame(animRef.current);
      isAnimatingRepRef.current = false;
      setRepPhase('idle');
    }
    setHasFormError(false);
    setJustCompletedId(exercise.id);
    window.setTimeout(() => {
      setJustCompletedId(null);
      onCompleteExercise(exercise.id);
    }, 520);
  };

  // Top-left compact stack: current + upcoming exercises (plus brief finishing item)
  const visibleStack = exercises
    .map((ex, idx) => ({ ex, idx, tel: telemetry[ex.id] }))
    .filter(
      ({ ex, idx, tel }) =>
        ex.id === justCompletedId ||
        (idx >= activeExerciseIndex && tel?.status !== 'completed')
    )
    .slice(0, 3);

  // Circular Rep Ring math
  const ringRadius = 30;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const repProgressFraction = Math.min(1, currentRepDisplay / Math.max(1, exercise.reps));
  const ringDashOffset = ringCircumference * (1 - repProgressFraction);

  // Semicircular Joint Angle Arc Gauge math (0° to 180° arc)
  const gaugeRadius = 38;
  const gaugeArcLength = Math.PI * gaugeRadius;
  const normalizedAngle = Math.max(0, Math.min(180, effectiveDisplayAngle)) / 180;
  const gaugeDashOffset = gaugeArcLength * (1 - normalizedAngle);
  const targetMarkerNorm = Math.max(0, Math.min(180, exercise.targetAngle)) / 180;
  const targetMarkerAngleRad = Math.PI * (1 - targetMarkerNorm);
  const markerX = 50 + gaugeRadius * Math.cos(targetMarkerAngleRad);
  const markerY = 50 - gaugeRadius * Math.sin(targetMarkerAngleRad);

  const holdBarPct =
    repPhase === 'hold'
      ? Math.max(0, Math.min(100, Math.round((holdRemaining / Math.max(0.5, exercise.holdSeconds)) * 100)))
      : repPhase === 'concentric'
      ? 100
      : 0;

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5">
      {/* Full-Viewport Centerpiece Stage */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[radial-gradient(circle_at_50%_40%,#11263c_0%,#070d18_78%)] shadow-xl min-h-[600px] sm:min-h-[650px] lg:h-[calc(100vh-132px)] flex flex-col justify-between">
        {/* Live AR & IR Depth Skeleton Canvas (Centerpiece) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-full max-w-[920px] max-h-[640px] flex items-center justify-center">
            <Skeleton3D
              exercise={exercise}
              progress={motionProgress}
              currentAngle={effectiveDisplayAngle}
              mode="ar-feed"
              cameraAngle="three-quarter"
              hasFormError={hasFormError}
              showGhostBox={showGhostBox && !showReferenceGate}
              showToleranceRings={!showReferenceGate}
              width={680}
              height={480}
            />
          </div>
        </div>

        {/* TOP HUD ROW: Left Compact Exercise Stack + Right Gamified Score & Streak Pill */}
        {!showReferenceGate && (
          <div className="relative z-10 p-4 sm:p-5 flex items-start justify-between gap-4 pointer-events-none">
            {/* Top-Left Compact Exercise Stack */}
            <div className="w-60 sm:w-64 space-y-2 pointer-events-auto">
              <AnimatePresence initial={false} mode="popLayout">
                {visibleStack.map(({ ex, idx }) => {
                  const isCurrent = idx === activeExerciseIndex;
                  const isFinishing = ex.id === justCompletedId;

                  return (
                    <motion.button
                      key={ex.id}
                      layout
                      type="button"
                      onClick={() => {
                        if (!isFinishing) {
                          onSelectExerciseIndex(idx);
                        }
                      }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{
                        opacity: isCurrent || isFinishing ? 1 : 0.72,
                        y: 0,
                        scale: isFinishing ? 0.97 : 1,
                      }}
                      exit={{ opacity: 0, y: -22, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl backdrop-blur-md border transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${
                        isFinishing
                          ? 'bg-emerald-500/25 border-emerald-400/70 text-emerald-100'
                          : isCurrent
                          ? 'bg-slate-900/78 border-teal-400/70 text-white shadow-lg shadow-teal-950/40'
                          : 'bg-slate-900/55 border-white/15 text-slate-300 hover:bg-slate-900/75'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                            isFinishing
                              ? 'bg-emerald-400 text-slate-950'
                              : isCurrent
                              ? 'bg-teal-400 text-slate-950'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {isFinishing ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{ex.name}</div>
                          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                            {ex.sets}×{ex.reps} · {ex.targetAngle}°
                          </div>
                        </div>
                      </div>

                      {isCurrent && !isFinishing && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-300 shrink-0">
                          Active
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Center-Top Live Feedback Pill (Error Cue or Rep Score Pop) */}
            <div className="hidden md:flex flex-col items-center gap-2">
              <AnimatePresence mode="wait">
                {hasFormError ? (
                  <motion.div
                    key="err-banner"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="px-4 py-2 rounded-full bg-amber-950/85 backdrop-blur-md border border-amber-400/70 text-amber-100 text-xs font-semibold flex items-center gap-2 shadow-lg"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                    <span>{exercise.correctionCue}</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ok-banner"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="px-3.5 py-1.5 rounded-full bg-slate-900/65 backdrop-blur-md border border-emerald-400/35 text-emerald-200 text-xs font-medium flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>
                      {repPhase === 'hold'
                        ? 'Hold Steady in Target Zone'
                        : 'Form Aligned · Inside Tolerance Rings'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Top-Right Gamified Score & Streak Pill + Quick Toggles */}
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <div className="relative px-4 py-2.5 rounded-2xl bg-slate-900/75 backdrop-blur-md border border-white/15 flex items-center gap-4 text-white shadow-lg">
                {/* Rehab Score */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
                    <Award className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                      Rehab Score
                    </div>
                    <div className="text-base font-mono font-bold tabular-nums leading-tight">
                      {rehabScore.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-teal-300">pts</span>
                    </div>
                  </div>
                </div>

                <div className="h-7 w-px bg-white/15" aria-hidden="true" />

                {/* Live Combo Multiplier */}
                <div className="flex items-center gap-2">
                  <div
                    className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1 transition-colors ${
                      comboMultiplier >= 2
                        ? 'bg-amber-400/20 border border-amber-400/60 text-amber-300'
                        : 'bg-white/10 border border-white/15 text-slate-200'
                    }`}
                  >
                    <Flame
                      className={`w-3.5 h-3.5 ${
                        comboMultiplier >= 2 ? 'text-amber-400' : 'text-slate-400'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{comboMultiplier}x Streak</span>
                  </div>
                </div>

                <div className="h-7 w-px bg-white/15 hidden sm:block" aria-hidden="true" />

                {/* Subtle IR Sensor Connection Dot */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300">
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[11px]">IR Live</span>
                </div>

                {/* Floating +XP Pop Animation */}
                <AnimatePresence>
                  {lastPointsDelta && (
                    <motion.div
                      key={lastPointsDelta.id}
                      initial={{ opacity: 0, y: 8, scale: 0.85 }}
                      animate={{ opacity: 1, y: -18, scale: 1 }}
                      exit={{ opacity: 0, y: -32 }}
                      transition={{ duration: 0.65 }}
                      className="absolute -bottom-5 right-6 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-mono font-bold shadow-md pointer-events-none flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      <span>+{lastPointsDelta.amount} pts</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Subtle AR Utility Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onReopenReferenceGate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/65 backdrop-blur-md border border-white/15 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-teal-300" aria-hidden="true" />
                  <span>3D Guide</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGhostBox((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-medium transition-colors cursor-pointer ${
                    showGhostBox
                      ? 'bg-teal-950/75 border-teal-400/50 text-teal-200'
                      : 'bg-slate-900/65 border-white/15 text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ghost Target</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM CORNER HUD OVERLAYS + DOCKED DEMO CONTROLS */}
        {!showReferenceGate && (
          <div className="relative z-10 mt-auto">
            {/* Corner Minimalist Telemetry HUDs */}
            <div className="px-4 sm:px-5 pb-3 flex items-end justify-between gap-4 pointer-events-none">
              {/* Bottom-Left: Circular Progress Ring for Reps & Sets */}
              <motion.div
                key={repPulseKey}
                initial={repPulseKey > 0 ? { scale: 1.06 } : false}
                animate={{ scale: 1 }}
                transition={{ duration: 0.25 }}
                className="px-4 py-3 rounded-2xl bg-slate-900/75 backdrop-blur-md border border-white/15 flex items-center gap-3.5 text-white pointer-events-auto shadow-lg"
              >
                <div className="relative w-[72px] h-[72px] flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
                    <circle
                      cx="36"
                      cy="36"
                      r={ringRadius}
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="36"
                      cy="36"
                      r={ringRadius}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringDashOffset}
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center font-mono tabular-nums">
                    <span className="text-base font-bold leading-none">
                      {currentRepDisplay}/{exercise.reps}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">
                      Reps
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-teal-300">
                    Set {currentSet} of {exercise.sets}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    {Array.from({ length: exercise.sets }).map((_, i) => {
                      const done = i < exTelemetry.completedSets;
                      const active =
                        i === exTelemetry.completedSets && exTelemetry.status !== 'completed';
                      return (
                        <span
                          key={i}
                          className={`h-1.5 w-5 rounded-full transition-colors ${
                            done
                              ? 'bg-emerald-400'
                              : active
                              ? 'bg-teal-400'
                              : 'bg-white/15'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-1.5 text-[11px] font-mono text-slate-300 tabular-nums">
                    {streakCount > 0 ? `${streakCount} clean reps in a row` : 'Ready for rep'}
                  </div>
                </div>
              </motion.div>

              {/* Bottom-Right: Joint Angle Arc Gauge + Hold / Tempo Bar */}
              <div className="px-4 py-3 rounded-2xl bg-slate-900/75 backdrop-blur-md border border-white/15 text-white pointer-events-auto shadow-lg min-w-[196px]">
                <div className="flex items-center justify-between gap-3">
                  {/* Visual Arc Gauge */}
                  <div className="relative w-24 h-14 flex items-end justify-center">
                    <svg viewBox="0 0 100 58" className="w-full h-full overflow-visible">
                      {/* Background semicircular track */}
                      <path
                        d={`M ${50 - gaugeRadius} 50 A ${gaugeRadius} ${gaugeRadius} 0 0 1 ${
                          50 + gaugeRadius
                        } 50`}
                        fill="none"
                        stroke="rgba(255,255,255,0.14)"
                        strokeWidth="7"
                        strokeLinecap="round"
                      />
                      {/* Active Joint Angle Arc */}
                      <path
                        d={`M ${50 - gaugeRadius} 50 A ${gaugeRadius} ${gaugeRadius} 0 0 1 ${
                          50 + gaugeRadius
                        } 50`}
                        fill="none"
                        stroke={hasFormError ? '#fbbf24' : '#34d399'}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={gaugeArcLength}
                        strokeDashoffset={gaugeDashOffset}
                        className="transition-all duration-150"
                      />
                      {/* Target Angle Tick Marker */}
                      <circle
                        cx={markerX}
                        cy={markerY}
                        r="3.5"
                        fill="#2dd4bf"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <div className="absolute bottom-0 font-mono text-xl font-bold tabular-nums leading-none">
                      {effectiveDisplayAngle}°
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      Target ROM
                    </div>
                    <div className="text-sm font-mono font-bold text-teal-300 tabular-nums">
                      {exercise.targetAngle}°
                    </div>
                    <div
                      className={`text-[10px] font-medium mt-0.5 ${
                        hasFormError ? 'text-amber-300' : 'text-emerald-300'
                      }`}
                    >
                      {hasFormError ? 'Drift Detected' : `±${exercise.toleranceDeg}° Zone`}
                    </div>
                  </div>
                </div>

                {/* Clean Hold / Tempo Bar */}
                <div className="mt-2.5 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 tabular-nums mb-1">
                    <span>{repPhase === 'hold' ? 'HOLD PEAK' : 'HOLD / TEMPO'}</span>
                    <span className={repPhase === 'hold' ? 'text-emerald-300 font-bold' : ''}>
                      {holdRemaining.toFixed(1)}s
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-100 ${
                        repPhase === 'hold' ? 'bg-emerald-400' : 'bg-teal-400'
                      }`}
                      style={{ width: `${holdBarPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom-Edge Docked Demo Simulation Controls */}
            <div className="bg-slate-950/90 backdrop-blur-md border-t border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Demo Controls</span>
                <span className="hidden sm:inline">
                  {' '}
                  · {exercise.name} ({patient.clinicianName})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSimulateGoodRep}
                  disabled={repPhase !== 'idle' || justCompletedId !== null}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>{repPhase !== 'idle' ? 'Tracking Rep...' : 'Simulate Good Rep'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerOrClearError}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    hasFormError
                      ? 'bg-amber-400 text-slate-950 border-amber-300 hover:bg-amber-300'
                      : 'bg-amber-500/15 text-amber-200 border-amber-400/40 hover:bg-amber-500/25'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{hasFormError ? 'Clear Form Error' : 'Trigger Form Error'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCompleteExerciseClick}
                  disabled={justCompletedId !== null}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Complete Exercise</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasFormError(false);
                    onResetExercise(exercise.id);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Reset current exercise counters"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP A: 3D REFERENCE PRE-CHECK MODAL / GATE */}
        <AnimatePresence>
          {showReferenceGate && (
            <motion.div
              key={`gate-${exercise.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 z-20 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-labelledby="gate-exercise-title"
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.97 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12"
              >
                {/* Left: Animated 3D Wireframe Avatar */}
                <div className="md:col-span-7 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-4 sm:p-5 flex flex-col">
                  <div className="flex items-center justify-between gap-2 pb-3">
                    <span className="text-xs font-mono font-semibold text-teal-700">
                      3D FORM PRE-CHECK · STEP {activeExerciseIndex + 1} OF {exercises.length}
                    </span>

                    <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg">
                      {(
                        [
                          { id: 'front', label: 'Front' },
                          { id: 'three-quarter', label: '3/4' },
                          { id: 'side', label: 'Side' },
                        ] as const
                      ).map((cam) => (
                        <button
                          key={cam.id}
                          type="button"
                          onClick={() => setGateCameraAngle(cam.id)}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                            gateCameraAngle === cam.id
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {cam.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 min-h-[260px] sm:min-h-[300px] bg-white border border-slate-200/80 rounded-xl flex items-center justify-center overflow-hidden">
                    <Skeleton3D
                      exercise={exercise}
                      progress={gatePreviewPhase}
                      currentAngle={gatePreviewAngle}
                      mode="preview"
                      cameraAngle={gateCameraAngle}
                      showGhostBox={false}
                      showToleranceRings={true}
                      width={460}
                      height={340}
                    />
                  </div>
                </div>

                {/* Right: Concise Form Cues & Accept CTA */}
                <div className="md:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-teal-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                        <span>IR Sensor Calibrated · {patient.firstName}&apos;s Plan</span>
                      </div>
                      <h1
                        id="gate-exercise-title"
                        className="mt-1.5 text-2xl font-display font-bold text-slate-900 tracking-tight"
                      >
                        {exercise.name}
                      </h1>
                      <p className="mt-0.5 text-xs font-mono text-slate-500 tabular-nums">
                        {exercise.sets} sets × {exercise.reps} reps · {exercise.targetAngle}° target
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-700">
                        Quick Form Cues
                      </div>
                      <ul className="space-y-2.5">
                        {exercise.instructions.slice(0, 3).map((cue, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-sm text-slate-700 leading-snug"
                          >
                            <span className="mt-0.5 w-5 h-5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span>{cue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={onAcceptReferenceGate}
                      className="w-full py-3.5 px-5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-display font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-600"
                    >
                      <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                      <span>Accept &amp; Start Exercise</span>
                    </button>
                    <p className="text-[11px] text-center text-slate-500">
                      Prescribed by {patient.clinicianName}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};
