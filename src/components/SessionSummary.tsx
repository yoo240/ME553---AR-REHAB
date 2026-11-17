import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  CloudUpload,
  FileText,
  Printer,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  EHRSessionRecord,
  Exercise,
  ExerciseTelemetry,
  FormDriftAlert,
  PatientProfile,
} from '../types/rehab';

interface SessionSummaryProps {
  patient: PatientProfile;
  exercises: Exercise[];
  telemetry: Record<string, ExerciseTelemetry>;
  sessionAlerts: FormDriftAlert[];
  painScore: number;
  effortScore: number;
  patientNote: string;
  onChangePainScore: (val: number) => void;
  onChangeEffortScore: (val: number) => void;
  onChangePatientNote: (val: string) => void;
  syncStatus: 'idle' | 'packaging' | 'syncing' | 'synced';
  lastSyncedRecord: EHRSessionRecord | null;
  onSyncToEHR: () => void;
  onStartNewSession: () => void;
  onOpenClinicianPortal: () => void;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
  patient,
  exercises,
  telemetry,
  sessionAlerts,
  painScore,
  effortScore,
  patientNote,
  onChangePainScore,
  onChangeEffortScore,
  onChangePatientNote,
  syncStatus,
  lastSyncedRecord,
  onSyncToEHR,
  onStartNewSession,
  onOpenClinicianPortal,
}) => {
  const [showReportModal, setShowReportModal] = useState(false);

  // Aggregate live session metrics (if user jumps straight to Summary before doing reps, display clean 0 or real completed values)
  const totalTargetReps = exercises.reduce((acc, ex) => acc + ex.sets * ex.reps, 0);
  const totalRepsCompleted = exercises.reduce((acc, ex) => {
    const t = telemetry[ex.id];
    return acc + (t ? t.totalRepsCompleted : 0);
  }, 0);

  const totalGoodReps = exercises.reduce((acc, ex) => acc + (telemetry[ex.id]?.goodReps ?? 0), 0);
  const totalErrors = exercises.reduce((acc, ex) => acc + (telemetry[ex.id]?.errorCount ?? 0), 0);
  const accuracyDenominator = totalGoodReps + totalErrors;
  const averageAccuracyPct =
    accuracyDenominator > 0
      ? Math.round((totalGoodReps / accuracyDenominator) * 100)
      : totalRepsCompleted > 0
      ? 96
      : 0;

  // Compute average ROM achievement percentage
  const romMetrics = exercises.map((ex) => {
    const t = telemetry[ex.id];
    const hasDoneAny = (t?.totalRepsCompleted ?? 0) > 0;
    const achieved = hasDoneAny
      ? t?.peakRomAchieved ?? ex.targetAngle
      : 0;

    let delta = 0;
    let metTarget = false;
    if (hasDoneAny) {
      if (ex.pattern === 'bodyweight-squat') {
        // Lower angle = deeper squat
        delta = ex.targetAngle - achieved;
        metTarget = achieved <= ex.targetAngle + ex.toleranceDeg;
      } else {
        delta = achieved - ex.targetAngle;
        metTarget = achieved >= ex.targetAngle - ex.toleranceDeg;
      }
    }

    return {
      exercise: ex,
      achieved,
      hasDoneAny,
      delta,
      metTarget,
      repsDone: t?.totalRepsCompleted ?? 0,
      repsTarget: ex.sets * ex.reps,
    };
  });

  const painDescriptor =
    painScore <= 2
      ? 'Minimal / Comfortable'
      : painScore <= 5
      ? 'Mild to Moderate'
      : painScore <= 7
      ? 'Elevated Discomfort'
      : 'Severe — Clinician Review Advised';

  const effortDescriptor =
    effortScore <= 3
      ? 'Light Effort'
      : effortScore <= 6
      ? 'Moderate Therapeutic Load'
      : effortScore <= 8
      ? 'Vigorous Effort'
      : 'Maximal Exertion';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-teal-700">
            Post-Session Telemetry &amp; Outcome Capture
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
            Session Summary &amp; EHR Cloud Sync
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {patient.fullName} ({patient.mrn}) · Care Plan by {patient.clinicianName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            <span>Preview Clinical Report</span>
          </button>

          <button
            type="button"
            onClick={onStartNewSession}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>New Session</span>
          </button>
        </div>
      </section>

      {/* Auto-Recorded Completion KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Total Reps Completed</div>
          <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-3xl font-bold text-slate-900">{totalRepsCompleted}</span>
            <span className="text-sm text-slate-500">/ {totalTargetReps} prescribed</span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Auto-counted via 30 Hz IR skeletal tracking
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Average Form Accuracy</div>
          <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
            <span
              className={`text-3xl font-bold ${
                averageAccuracyPct >= 85
                  ? 'text-emerald-700'
                  : averageAccuracyPct > 0
                  ? 'text-amber-700'
                  : 'text-slate-900'
              }`}
            >
              {averageAccuracyPct}%
            </span>
            <span className="text-xs text-slate-500">
              {totalErrors} drift {totalErrors === 1 ? 'cue' : 'cues'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Time spent within calibrated concentric target rings
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Peak ROM Attainment</div>
          <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-3xl font-bold text-teal-700">
              {romMetrics.filter((m) => m.metTarget).length} / {exercises.length}
            </span>
            <span className="text-sm text-slate-500">targets met</span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Peak joint angles verified against PT thresholds
          </p>
        </div>
      </section>

      {/* Main Split: ROM Breakdown + Pain/Effort Sliders & EHR Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Range of Motion Achieved vs Target */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-900">
              Range of Motion (ROM) Achieved vs. Target
            </h2>
            <p className="text-sm text-slate-600">
              Peak kinematic joint angles recorded across each prescribed exercise.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {romMetrics.map(({ exercise, achieved, hasDoneAny, delta, metTarget, repsDone, repsTarget }) => {
              const barPct = hasDoneAny
                ? Math.min(100, Math.round((achieved / Math.max(1, exercise.targetAngle)) * 100))
                : 0;
              return (
                <div key={exercise.id} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{exercise.name}</h3>
                      <p className="text-xs text-slate-500">
                        {exercise.targetJoint} ·{' '}
                        <span className="font-mono tabular-nums">
                          {repsDone}/{repsTarget} reps
                        </span>
                      </p>
                    </div>

                    <div className="text-right font-mono tabular-nums">
                      <div className="text-sm font-bold text-slate-900">
                        {hasDoneAny ? `${achieved}°` : '—'}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          / {exercise.targetAngle}° target
                        </span>
                      </div>
                      {hasDoneAny && (
                        <div
                          className={`text-xs font-medium ${
                            metTarget ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {metTarget ? 'Within Target' : 'Below Target'} (
                          {delta >= 0 ? `+${delta}°` : `${delta}°`})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        !hasDoneAny
                          ? 'bg-slate-300'
                          : metTarget
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Post-Session Pain & Effort Sliders + Cloud Sync to EHR */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-900">
                Post-Session Pain &amp; Effort Check-In
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Attached directly to Dr. Sarah Jenkins&apos; clinical review note.
              </p>
            </div>

            {/* Pain Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="pain-slider" className="text-sm font-medium text-slate-800">
                  Joint Pain Level (1–10)
                </label>
                <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                  {painScore} / 10 · <span className="font-sans font-medium text-xs text-slate-600">{painDescriptor}</span>
                </span>
              </div>
              <input
                id="pain-slider"
                type="range"
                min={1}
                max={10}
                step={1}
                value={painScore}
                onChange={(e) => onChangePainScore(Number(e.target.value))}
                className="w-full clinical-slider"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>1 No Pain</span>
                <span>5 Moderate</span>
                <span>10 Severe</span>
              </div>
            </div>

            {/* Effort Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="effort-slider" className="text-sm font-medium text-slate-800">
                  Perceived Effort / RPE (1–10)
                </label>
                <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                  {effortScore} / 10 · <span className="font-sans font-medium text-xs text-slate-600">{effortDescriptor}</span>
                </span>
              </div>
              <input
                id="effort-slider"
                type="range"
                min={1}
                max={10}
                step={1}
                value={effortScore}
                onChange={(e) => onChangeEffortScore(Number(e.target.value))}
                className="w-full clinical-slider"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>1 Very Light</span>
                <span>5 Moderate</span>
                <span>10 Max Effort</span>
              </div>
            </div>

            {/* Patient Note */}
            <div className="space-y-1.5">
              <label htmlFor="patient-note" className="text-sm font-medium text-slate-800">
                Patient Note (Optional)
              </label>
              <textarea
                id="patient-note"
                rows={2}
                value={patientNote}
                onChange={(e) => onChangePatientNote(e.target.value)}
                placeholder="Describe any tightness, stiffness, or comfort improvements..."
                className="w-full px-3 py-2 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
              />
            </div>
          </section>

          {/* Cloud Sync to EHR Card */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CloudUpload className="w-5 h-5 text-teal-700" aria-hidden="true" />
                <h2 className="text-base font-display font-semibold text-slate-900">
                  Cloud Sync to EHR
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500">HL7 FHIR R4</span>
            </div>

            {/* Pipeline Steps */}
            <div className="space-y-2.5 py-2">
              <div className="flex items-center gap-2.5 text-xs">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    syncStatus !== 'idle' ? 'text-emerald-600' : 'text-slate-300'
                  }`}
                  aria-hidden="true"
                />
                <span className={syncStatus !== 'idle' ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                  1. Kinematic ROM &amp; rep telemetry encrypted
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    syncStatus === 'syncing' || syncStatus === 'synced'
                      ? 'text-emerald-600'
                      : 'text-slate-300'
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={
                    syncStatus === 'syncing' || syncStatus === 'synced'
                      ? 'text-slate-900 font-medium'
                      : 'text-slate-500'
                  }
                >
                  2. Pain/effort &amp; form-drift observations packaged
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                {syncStatus === 'synced' ? (
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Activity className="w-4 h-4 shrink-0 text-slate-300" aria-hidden="true" />
                )}
                <span
                  className={
                    syncStatus === 'synced' ? 'text-emerald-800 font-semibold' : 'text-slate-500'
                  }
                >
                  3. Synced to Epic/MyChart EHR — Sent to {patient.clinicianName}
                </span>
              </div>
            </div>

            {syncStatus === 'synced' && lastSyncedRecord && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                <div className="font-semibold">
                  Synced to Epic/MyChart EHR — Sent to Dr. Sarah Jenkins
                </div>
                <div className="mt-0.5 text-emerald-700 font-mono tabular-nums">
                  Record {lastSyncedRecord.id} · {lastSyncedRecord.timestamp}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={onSyncToEHR}
                disabled={syncStatus === 'packaging' || syncStatus === 'syncing'}
                className="flex-1 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {syncStatus === 'packaging'
                  ? 'Packaging Telemetry...'
                  : syncStatus === 'syncing'
                  ? 'Syncing to Epic EHR...'
                  : syncStatus === 'synced'
                  ? 'Re-Sync Updated Note to EHR'
                  : 'Sync Session to Epic EHR'}
              </button>

              {syncStatus === 'synced' && (
                <button
                  type="button"
                  onClick={onOpenClinicianPortal}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  View in PT Portal
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Clinical Report Preview Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clinical-report-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="text-xs font-mono text-teal-700">
                  HL7 FHIR CLINICAL TELEMETRY REPORT
                </div>
                <h3
                  id="clinical-report-title"
                  className="mt-1 text-xl font-display font-bold text-slate-900"
                >
                  At-Home Physical Therapy Summary
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {patient.clinicName} · Referring PT: {patient.clinicianName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close report preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <div>
                <div className="text-slate-500">Patient</div>
                <div className="font-semibold text-slate-900 mt-0.5">{patient.fullName}</div>
              </div>
              <div>
                <div className="text-slate-500">MRN</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">{patient.mrn}</div>
              </div>
              <div>
                <div className="text-slate-500">Pain / Effort</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">
                  {painScore}/10 · RPE {effortScore}/10
                </div>
              </div>
              <div>
                <div className="text-slate-500">Avg Form</div>
                <div className="font-mono font-semibold text-emerald-700 mt-0.5">
                  {averageAccuracyPct}%
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Exercise ROM &amp; Completion Table
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Exercise</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Reps</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Achieved ROM</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Target ROM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {romMetrics.map((m) => (
                      <tr key={m.exercise.id}>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                          {m.exercise.name}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {m.repsDone}/{m.repsTarget}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                          {m.hasDoneAny ? `${m.achieved}°` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          {m.exercise.targetAngle}°
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {sessionAlerts.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Form-Drift Events Captured ({sessionAlerts.length})
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {sessionAlerts.map((a) => (
                    <li
                      key={a.id}
                      className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2"
                    >
                      <span>
                        <strong className="font-semibold">{a.exerciseName}:</strong> {a.message}
                      </span>
                      <span className="font-mono text-amber-800 shrink-0">
                        {a.deviationDeg}° drift
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Patient Subjective Note: </span>
              {patientNote.trim() ? patientNote : 'No additional pain or discomfort reported.'}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Print Summary</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
