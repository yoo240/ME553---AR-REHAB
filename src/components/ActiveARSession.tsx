import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Flag,
  Play,
  RotateCcw,
  SkipForward,
  Timer,
} from 'lucide-react';
import { Exercise, ExerciseTelemetry } from '../types/rehab';
import { CameraAngle, Skeleton3D } from './Skeleton3D';

interface ActiveARSessionProps {
  exercises: Exercise[];
  activeExerciseIndex: number;
  onSelectExerciseIndex: (index: number) => void;
  telemetry: Record<string, ExerciseTelemetry>;
  onRecordGoodRep: (exerciseId: string, achievedAngle: number) => void;
  onRecordFormError: (exercise: Exercise, deviationDeg: number) => void;
  onCompleteSet: (exerciseId: string) => void;
  onResetExercise: (exerciseId: string) => void;
  onFinishSession: () => void;
  onBackToDashboard: () => void;
}

type RepPhase = 'idle' | 'concentric' | 'hold' | 'eccentric';

export const ActiveARSession: React.FC<ActiveARSessionProps> = ({
  exercises,
  activeExerciseIndex,
  onSelectExerciseIndex,
  telemetry,
  onRecordGoodRep,
  onRecordFormError,
  onCompleteSet,
  onResetExercise,
  onFinishSession,
  onBackToDashboard,
}) => {
  const exercise = exercises[activeExerciseIndex] ?? exercises[0];
  const exTelemetry = exercise ? telemetry[exercise.id] : undefined;

  const [repPhase, setRepPhase] = useState<RepPhase>('idle');
  const [motionProgress, setMotionProgress] = useState(0); // 0 = rest, 1 = peak target
  const [holdRemaining, setHoldRemaining] = useState<number>(exercise?.holdSeconds ?? 2);
  const [hasFormError, setHasFormError] = useState(false);
  const [showGhostBox, setShowGhostBox] = useState(true);
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('three-quarter');
  const [autoIdleWave, setAutoIdleWave] = useState(true);

  const animRef = useRef<number | null>(null);
  const isAnimatingRepRef = useRef(false);

  // Reset phase timers when switching exercises
  useEffect(() => {
    if (!exercise) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    isAnimatingRepRef.current = false;
    setRepPhase('idle');
    setMotionProgress(hasFormError ? 0.65 : 0.15);
    setHoldRemaining(exercise.holdSeconds);
  }, [exercise?.id]);

  // Subtle idle breathing / tracking motion when not executing a simulated rep
  useEffect(() => {
    if (!exercise || repPhase !== 'idle' || !autoIdleWave) return;
    let raf = 0;
    const start = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      if (hasFormError) {
        // Hover partway up outside target box so form error cue is super clear
        const driftWave = 0.68 + 0.04 * Math.sin(elapsed * 2.2);
        setMotionProgress(driftWave);
      } else {
        // Gentle tracking micro-oscillation near rest/ready posture
        const readyWave = 0.22 + 0.14 * (0.5 - 0.5 * Math.cos(elapsed * 1.4));
        setMotionProgress(readyWave);
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [exercise?.id, repPhase, hasFormError, autoIdleWave]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  if (!exercise || !exTelemetry) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No active exercise found</h2>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="mt-4 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium"
          >
            Return to Dashboard
          </button>
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

  const angleDelta = effectiveDisplayAngle - exercise.targetAngle;

  // Simulate a smooth, complete repetition: concentric -> peak hold countdown -> eccentric -> record rep
  const handleSimulateGoodRep = () => {
    if (isAnimatingRepRef.current) return;
    setHasFormError(false);
    isAnimatingRepRef.current = true;
    setRepPhase('concentric');

    const riseDuration = 650;
    const holdDuration = Math.min(1200, exercise.holdSeconds * 500); // crisp demo pacing while displaying real hold timer
    const lowerDuration = 550;
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
        const holdElapsed = elapsed - riseDuration;
        const holdFrac = 1 - holdElapsed / holdDuration;
        setRepPhase('hold');
        setMotionProgress(1);
        setHoldRemaining(Math.max(0, Number((exercise.holdSeconds * holdFrac).toFixed(1))));
        animRef.current = requestAnimationFrame(step);
      } else if (elapsed < riseDuration + holdDuration + lowerDuration) {
        const t = (elapsed - riseDuration - holdDuration) / lowerDuration;
        const eased = 1 - t * t;
        setRepPhase('eccentric');
        setMotionProgress(eased);
        setHoldRemaining(0);
        animRef.current = requestAnimationFrame(step);
      } else {
        isAnimatingRepRef.current = false;
        setRepPhase('idle');
        setMotionProgress(0.12);
        setHoldRemaining(exercise.holdSeconds);
        onRecordGoodRep(exercise.id, exercise.targetAngle);
      }
    };

    animRef.current = requestAnimationFrame(step);
  };

  const handleTriggerOrClearError = () => {
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
      setMotionProgress(0.2);
    }
  };

  const handleCompleteSetClick = () => {
    if (isAnimatingRepRef.current && animRef.current) {
      cancelAnimationFrame(animRef.current);
      isAnimatingRepRef.current = false;
      setRepPhase('idle');
    }
    setHasFormError(false);
    onCompleteSet(exercise.id);
  };

  const phaseLabel =
    hasFormError
      ? 'Form Drift Detected'
      : repPhase === 'concentric'
      ? 'Ascending to Target Zone'
      : repPhase === 'hold'
      ? 'Peak Hold Active'
      : repPhase === 'eccentric'
      ? 'Controlled Return'
      : 'Ready — Tracked in Tolerance';

  const repPct = Math.round((currentRepDisplay / exercise.reps) * 100);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      {/* Top Exercise Bar & Quick Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Dashboard</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {exercises.map((ex, idx) => {
              const exTel = telemetry[ex.id];
              const isCurrent = idx === activeExerciseIndex;
              const isDone = exTel?.status === 'completed';
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    setHasFormError(false);
                    onSelectExerciseIndex(idx);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-teal-700 text-white'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
                  <span>
                    {idx + 1}. {ex.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onFinishSession}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Flag className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Finish Session</span>
        </button>
      </div>

      {/* Main Split: Simulated IR Depth & AR Viewport + Live Telemetry Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Center Stage: IR Depth & AR Viewport */}
        <section className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          {/* Viewport Optical Bar */}
          <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3 text-slate-300 font-mono">
              <span className="font-semibold text-teal-400">IR DEPTH FEED · 30 FPS</span>
              <span className="text-slate-600">|</span>
              <span>{exercise.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGhostBox((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  showGhostBox
                    ? 'bg-teal-950 text-teal-300 border border-teal-700/60'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>AR Ghost Box</span>
              </button>

              <div className="flex items-center bg-slate-800 p-0.5 rounded border border-slate-700">
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
                    onClick={() => setCameraAngle(cam.id)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                      cameraAngle === cam.id
                        ? 'bg-slate-700 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optical AR Skeleton Viewport Canvas */}
          <div className="relative flex-1 min-h-[420px] sm:min-h-[470px] flex items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#132238_0%,#090f1c_75%)]">
            <Skeleton3D
              exercise={exercise}
              progress={motionProgress}
              currentAngle={effectiveDisplayAngle}
              mode="ar-feed"
              cameraAngle={cameraAngle}
              hasFormError={hasFormError}
              showGhostBox={showGhostBox}
              showToleranceRings={true}
              width={640}
              height={460}
            />

            {/* Top-left Status Overlay */}
            <div
              className={`absolute top-4 left-4 px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-2 backdrop-blur-xs ${
                hasFormError
                  ? 'bg-amber-950/90 border-amber-500/70 text-amber-100'
                  : 'bg-emerald-950/85 border-emerald-500/60 text-emerald-100'
              }`}
            >
              {hasFormError ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              )}
              <span>{phaseLabel}</span>
            </div>

            {/* Bottom-left IR depth legend */}
            <div className="absolute bottom-3 left-4 flex items-center gap-4 text-[11px] font-mono text-slate-400">
              <span>DEPTH PLANE: 1.82 m</span>
              <span>TOLERANCE: ±{exercise.toleranceDeg}°</span>
            </div>

            {/* Bottom-right quick idle toggle */}
            <button
              type="button"
              onClick={() => setAutoIdleWave((v) => !v)}
              className="absolute bottom-3 right-4 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700 text-[11px] font-mono text-slate-300 hover:text-white cursor-pointer"
            >
              {autoIdleWave ? 'Live Tracking: Active' : 'Live Tracking: Paused'}
            </button>
          </div>
        </section>

        {/* Right Column: Live Telemetry & Counters */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-5">
            {/* Form Cue Banner (explicit text + icon, never hue alone) */}
            <div
              className={`p-4 rounded-xl border ${
                hasFormError
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2.5">
                {hasFormError ? (
                  <AlertTriangle
                    className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2
                    className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                )}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider">
                    {hasFormError ? 'Form Correction Cue' : 'Form Aligned'}
                  </div>
                  <p className="mt-1 text-sm font-medium leading-snug">
                    {hasFormError
                      ? exercise.correctionCue
                      : `Limb trajectory within calibrated ±${exercise.toleranceDeg}° tolerance zone.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Rep & Set Counters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs font-medium text-slate-500">Rep Counter</div>
                <div className="mt-1 flex items-baseline gap-1 font-mono tabular-nums">
                  <span className="text-3xl font-bold text-slate-900">
                    {currentRepDisplay}
                  </span>
                  <span className="text-base text-slate-500">/ {exercise.reps}</span>
                </div>
                <div className="mt-2.5 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 transition-all duration-200"
                    style={{ width: `${Math.min(100, repPct)}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs font-medium text-slate-500">Set Tracker</div>
                <div className="mt-1 flex items-baseline gap-1 font-mono tabular-nums">
                  <span className="text-3xl font-bold text-slate-900">{currentSet}</span>
                  <span className="text-base text-slate-500">/ {exercise.sets}</span>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5">
                  {Array.from({ length: exercise.sets }).map((_, i) => {
                    const isSetDone = i < exTelemetry.completedSets;
                    const isSetActive =
                      i === exTelemetry.completedSets && exTelemetry.status !== 'completed';
                    return (
                      <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          isSetDone
                            ? 'bg-emerald-500'
                            : isSetActive
                            ? 'bg-teal-600'
                            : 'bg-slate-200'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Hold / Tempo Countdown Timer */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Timer className="w-4 h-4 text-teal-700" aria-hidden="true" />
                  <span>Hold / Tempo Countdown</span>
                </div>
                <span className="text-xs font-mono text-slate-500">3-1-3 TEMPO</span>
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {holdRemaining.toFixed(1)}s
                </div>
                <span
                  className={`text-xs font-medium ${
                    repPhase === 'hold' ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                  }`}
                >
                  {repPhase === 'hold'
                    ? 'Holding peak target'
                    : `Target peak hold: ${exercise.holdSeconds.toFixed(1)}s`}
                </span>
              </div>

              <div className="mt-2.5 w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    repPhase === 'hold' ? 'bg-emerald-500' : 'bg-teal-600'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((holdRemaining / Math.max(0.5, exercise.holdSeconds)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Live Joint Angle Readout */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  Joint Angle ({exercise.targetJoint})
                </span>
                <span
                  className={`text-xs font-mono font-semibold tabular-nums ${
                    hasFormError ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {angleDelta >= 0 ? `+${angleDelta}°` : `${angleDelta}°`} vs target
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
                <span className="text-3xl font-bold text-slate-900">
                  {effectiveDisplayAngle}°
                </span>
                <span className="text-xs text-slate-500">
                  Target {exercise.targetAngle}° (±{exercise.toleranceDeg}°)
                </span>
              </div>

              <div className="mt-2.5 text-xs text-slate-600 flex items-center justify-between font-mono tabular-nums">
                <span>Session Peak ROM</span>
                <span className="font-semibold text-slate-900">
                  {exTelemetry.peakRomAchieved}°
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
            <span>Good Reps: {exTelemetry.goodReps}</span>
            <span>Form Drift Events: {exTelemetry.errorCount}</span>
          </div>
        </aside>
      </div>

      {/* Subtle Bottom Demo Controls Bar (for class presentation) */}
      <section
        aria-label="Demo Simulation Controls"
        className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Demo Controls:</span>{' '}
          Simulate IR depth-camera rep tracking, drift cues, or advance sets during presentation.
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSimulateGoodRep}
            disabled={repPhase !== 'idle'}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>{repPhase !== 'idle' ? 'Tracking Rep...' : 'Simulate Good Rep'}</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerOrClearError}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              hasFormError
                ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{hasFormError ? 'Clear Form Error' : 'Trigger Form Error'}</span>
          </button>

          <button
            type="button"
            onClick={handleCompleteSetClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <SkipForward className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Complete Set</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setHasFormError(false);
              onResetExercise(exercise.id);
            }}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Reset current exercise counters"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </section>
    </main>
  );
};
