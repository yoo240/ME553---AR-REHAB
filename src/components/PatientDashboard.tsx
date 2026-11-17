import React, { useEffect, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
} from 'lucide-react';
import { Exercise, ExerciseTelemetry, PatientProfile } from '../types/rehab';
import { CameraAngle, Skeleton3D } from './Skeleton3D';

interface PatientDashboardProps {
  patient: PatientProfile;
  exercises: Exercise[];
  telemetry: Record<string, ExerciseTelemetry>;
  selectedExerciseIndex: number;
  onSelectExercise: (index: number) => void;
  onStartSession: (exerciseIndex?: number) => void;
  irConnected: boolean;
  onCalibrateSensor: () => void;
  isCalibrating: boolean;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  patient,
  exercises,
  telemetry,
  selectedExerciseIndex,
  onSelectExercise,
  onStartSession,
  irConnected,
  onCalibrateSensor,
  isCalibrating,
}) => {
  const [isPlayingPreview, setIsPlayingPreview] = useState(true);
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('three-quarter');
  const [previewPhase, setPreviewPhase] = useState(0);

  const selectedExercise = exercises[selectedExerciseIndex] ?? exercises[0];

  // Smooth looping animation for 3D Avatar Reference Preview
  useEffect(() => {
    if (!isPlayingPreview) return;
    let rafId = 0;
    let startTime: number | null = null;
    const cycleMs = 3800;

    const tick = (ts: number) => {
      if (startTime === null) startTime = ts;
      const elapsed = (ts - startTime) % cycleMs;
      // Smooth ease-in-out rise and return
      const norm = elapsed / cycleMs;
      const wave = 0.5 - 0.5 * Math.cos(norm * Math.PI * 2);
      setPreviewPhase(wave);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlayingPreview, selectedExercise?.id]);

  // Overall progress computation
  const totalTargetReps = exercises.reduce((sum, ex) => sum + ex.sets * ex.reps, 0);
  const totalCompletedReps = exercises.reduce((sum, ex) => {
    const t = telemetry[ex.id];
    return sum + (t ? t.totalRepsCompleted : 0);
  }, 0);
  const overallProgressPct =
    totalTargetReps > 0 ? Math.min(100, Math.round((totalCompletedReps / totalTargetReps) * 100)) : 0;

  if (!selectedExercise) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-900">No exercises prescribed yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Open the Clinician Portal to add exercises to Alex&apos;s rehabilitation plan.
          </p>
        </div>
      </main>
    );
  }

  const currentPreviewAngle =
    selectedExercise.restAngle +
    (selectedExercise.targetAngle - selectedExercise.restAngle) * previewPhase;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Patient Clinical Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-teal-700 tracking-wide">
              {patient.clinicName} · Week {patient.protocolWeek} of {patient.totalWeeks}
            </p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight text-balance">
              Welcome back, {patient.firstName}
            </h1>
            <p className="text-sm text-slate-600">
              {patient.protocolName} · Patient ID{' '}
              <span className="font-mono text-slate-700">{patient.mrn}</span>
            </p>
          </div>

          {/* Hardware & Plan Sync Status Strip */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2.5">
                <Camera
                  className={`w-4 h-4 shrink-0 ${
                    irConnected ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                  aria-hidden="true"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>
                      {isCalibrating
                        ? 'IR Sensor: Recalibrating Depth Mesh...'
                        : irConnected
                        ? 'IR Sensor: Calibrated & Connected'
                        : 'IR Sensor: Standby'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono tabular-nums">
                    30 Hz Optical Depth · 1.8m Range
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onCalibrateSensor}
                disabled={isCalibrating}
                className="ml-2 p-1.5 text-slate-500 hover:text-teal-700 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                title="Run IR Sensor Calibration Check"
                aria-label="Run IR Sensor Calibration Check"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin text-teal-600' : ''}`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-teal-50/70 border border-teal-200/80 rounded-lg">
              <ClipboardCheck className="w-4 h-4 text-teal-700 shrink-0" aria-hidden="true" />
              <div>
                <div className="text-xs font-semibold text-teal-900">PT Plan Synced</div>
                <div className="text-xs text-teal-700">
                  Prescribed by {patient.clinicianName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Session Timeline & Overall Progress Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-900">
              Today&apos;s Guided Exercise Sequence
            </h2>
            <p className="text-sm text-slate-600">
              Select any movement below to inspect its 3D reference form before starting.
            </p>
          </div>
          <div className="sm:text-right">
            <div className="text-xs font-medium text-slate-500">Overall Session Completion</div>
            <div className="mt-0.5 flex items-baseline sm:justify-end gap-2">
              <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
                {overallProgressPct}%
              </span>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                ({totalCompletedReps} / {totalTargetReps} reps)
              </span>
            </div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div
          className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-6"
          role="progressbar"
          aria-valuenow={overallProgressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall session completion progress"
        >
          <div
            className="h-full bg-teal-600 transition-all duration-300 rounded-full"
            style={{ width: `${overallProgressPct}%` }}
          />
        </div>

        {/* Horizontal Step-by-Step Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exercises.map((ex, idx) => {
            const exTel = telemetry[ex.id];
            const exTotal = ex.sets * ex.reps;
            const exDone = exTel ? exTel.totalRepsCompleted : 0;
            const exPct = exTotal > 0 ? Math.round((exDone / exTotal) * 100) : 0;
            const isSelected = idx === selectedExerciseIndex;
            const isCompleted = exTel?.status === 'completed';

            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => onSelectExercise(idx)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  isSelected
                    ? 'bg-teal-50/50 border-teal-600 ring-1 ring-teal-600/20'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-mono font-semibold text-teal-700">
                    STEP {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-xs font-medium flex items-center gap-1 ${
                      isCompleted
                        ? 'text-emerald-700'
                        : exDone > 0
                        ? 'text-teal-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
                    {isCompleted ? 'Completed' : exDone > 0 ? `${exPct}% Done` : 'Scheduled'}
                  </span>
                </div>

                <h3 className="mt-1.5 text-base font-display font-semibold text-slate-900">
                  {ex.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{ex.targetJoint}</p>

                <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-mono text-slate-700 tabular-nums">
                  <span>
                    {ex.sets} sets × {ex.reps} reps
                  </span>
                  <span>Target {ex.targetAngle}°</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Split: 3D Avatar Reference Preview + Form Guidance & Start CTA */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 3D Avatar Reference Viewport */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900">
                3D Anatomical Reference — {selectedExercise.name}
              </h2>
              <p className="text-xs text-slate-500">
                Looping kinematic path · {selectedExercise.restAngle}° rest to{' '}
                {selectedExercise.targetAngle}° target
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Camera angle segmented selector */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg">
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
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      cameraAngle === cam.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsPlayingPreview((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                aria-label={isPlayingPreview ? 'Pause 3D preview' : 'Play 3D preview'}
              >
                {isPlayingPreview ? (
                  <>
                    <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Play</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3D Skeleton Canvas */}
          <div className="relative mt-4 flex-1 min-h-[340px] bg-slate-50 border border-slate-200/80 rounded-xl overflow-hidden flex items-center justify-center">
            <Skeleton3D
              exercise={selectedExercise}
              progress={previewPhase}
              currentAngle={currentPreviewAngle}
              mode="preview"
              cameraAngle={cameraAngle}
              showGhostBox={false}
              showToleranceRings={true}
            />

            <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 border border-slate-200 rounded-md text-xs font-mono text-slate-700 tabular-nums">
              {selectedExercise.targetJoint}
            </div>
            <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 border border-slate-200 rounded-md text-xs font-mono text-teal-800 font-semibold tabular-nums flex items-center gap-1.5">
              <RotateCw className="w-3 h-3 text-teal-600" aria-hidden="true" />
              <span>Hold {selectedExercise.holdSeconds}s at peak</span>
            </div>
          </div>
        </div>

        {/* Form Instructions & Prominent Start Session CTA */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <div className="text-xs font-medium text-teal-700">Form Protocol &amp; Calibration</div>
              <h2 className="mt-1 text-xl font-display font-bold text-slate-900">
                {selectedExercise.name}
              </h2>
            </div>

            {/* Key prescription parameters */}
            <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-200">
              <div>
                <div className="text-xs text-slate-500">Volume</div>
                <div className="mt-0.5 text-base font-mono font-semibold text-slate-900 tabular-nums">
                  {selectedExercise.sets} × {selectedExercise.reps}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Target ROM</div>
                <div className="mt-0.5 text-base font-mono font-semibold text-teal-700 tabular-nums">
                  {selectedExercise.targetAngle}°
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Tolerance</div>
                <div className="mt-0.5 text-base font-mono font-semibold text-slate-900 tabular-nums">
                  ±{selectedExercise.toleranceDeg}°
                </div>
              </div>
            </div>

            {/* Numbered clinical instructions */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Key Form Instructions
              </h3>
              <ol className="space-y-3">
                {selectedExercise.instructions.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono font-semibold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Clinician note */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-xs font-semibold text-slate-700">
                Clinician Focus ({patient.clinicianName})
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                {selectedExercise.clinicalNotes}
              </p>
            </div>
          </div>

          {/* Primary Action: Prominent Start Session Button */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
            <button
              type="button"
              onClick={() => onStartSession(selectedExerciseIndex)}
              className="w-full py-3.5 px-6 bg-teal-700 hover:bg-teal-800 text-white text-base font-display font-semibold rounded-xl transition-colors flex items-center justify-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-600"
            >
              <Play className="w-5 h-5 fill-current" aria-hidden="true" />
              <span>Start Session</span>
            </button>
            <p className="text-center text-xs text-slate-500">
              Launches live IR depth tracking &amp; AR form tolerance rings for{' '}
              <span className="font-medium text-slate-700">{selectedExercise.name}</span>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};
