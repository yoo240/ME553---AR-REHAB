import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Plus,
  Sliders,
  Trash2,
  Trophy,
} from 'lucide-react';
import { PRESET_CLINICIAN_EXERCISES } from '../data/initialData';
import {
  EHRSessionRecord,
  Exercise,
  FormDriftAlert,
  MovementPattern,
  PatientProfile,
} from '../types/rehab';

interface ClinicianPortalProps {
  patient: PatientProfile;
  exercises: Exercise[];
  ehrLogs: EHRSessionRecord[];
  alerts: FormDriftAlert[];
  onToggleAlertReviewed: (alertId: string) => void;
  onUpdateExercise: (exerciseId: string, updates: Partial<Exercise>) => void;
  onAddExercise: (newExercise: Omit<Exercise, 'id'>) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onGoToARSession: () => void;
}

export const ClinicianPortal: React.FC<ClinicianPortalProps> = ({
  patient,
  exercises,
  ehrLogs,
  alerts,
  onToggleAlertReviewed,
  onUpdateExercise,
  onAddExercise,
  onRemoveExercise,
  onGoToARSession,
}) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(ehrLogs[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSets, setEditSets] = useState<number>(3);
  const [editReps, setEditReps] = useState<number>(10);
  const [editAngle, setEditAngle] = useState<number>(160);

  const [newName, setNewName] = useState('Standing Hip Abduction');
  const [newJoint, setNewJoint] = useState('Right Gluteus Medius & Hip');
  const [newPattern, setNewPattern] = useState<MovementPattern>('hip-abduction');
  const [newSets, setNewSets] = useState(3);
  const [newReps, setNewReps] = useState(12);
  const [newAngle, setNewAngle] = useState(40);
  const [newHold, setNewHold] = useState(2);
  const [planBannerMsg, setPlanBannerMsg] = useState<string | null>(null);

  const openEditor = (ex: Exercise) => {
    setEditingId(ex.id);
    setEditSets(ex.sets);
    setEditReps(ex.reps);
    setEditAngle(ex.targetAngle);
  };

  const handleSaveEdit = (ex: Exercise) => {
    onUpdateExercise(ex.id, {
      sets: Math.max(1, Math.min(8, editSets)),
      reps: Math.max(1, Math.min(30, editReps)),
      targetAngle: Math.max(15, Math.min(180, editAngle)),
    });
    setEditingId(null);
    setPlanBannerMsg(
      `Updated "${ex.name}" — synced immediately to ${patient.firstName}'s Active AR queue.`
    );
  };

  const handleApplyPreset = (presetIndex: number) => {
    const preset = PRESET_CLINICIAN_EXERCISES[presetIndex];
    if (!preset) return;
    setNewName(preset.name);
    setNewJoint(preset.targetJoint);
    setNewPattern(preset.pattern);
    setNewSets(preset.sets);
    setNewReps(preset.reps);
    setNewAngle(preset.targetAngle);
    setNewHold(preset.holdSeconds);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const restAngle =
      newPattern === 'bodyweight-squat'
        ? 175
        : newPattern === 'knee-extension'
        ? 90
        : 10;

    onAddExercise({
      name: trimmedName,
      targetJoint: newJoint.trim() || 'Targeted Joint Complex',
      pattern: newPattern,
      sets: Math.max(1, Math.min(8, newSets)),
      reps: Math.max(1, Math.min(30, newReps)),
      targetAngle: Math.max(15, Math.min(180, newAngle)),
      restAngle,
      toleranceDeg: 8,
      holdSeconds: Math.max(1, Math.min(10, newHold)),
      instructions: [
        'Center yourself 1.8m from the IR depth sensor.',
        `Move smoothly until the joint reaches ${newAngle}° inside the green ring.`,
        `Hold peak posture for ${newHold} seconds before controlled return.`,
      ],
      correctionCue:
        newPattern === 'bodyweight-squat'
          ? 'Slow down descent — shift weight back into heels'
          : 'Align limb inside the green tolerance rings',
      correctionDirection: newPattern === 'bodyweight-squat' ? 'back' : 'up',
      clinicalNotes: `Prescribed by ${patient.clinicianName} via Clinician Portal.`,
    });

    setPlanBannerMsg(
      `Added "${trimmedName}" (${newSets}×${newReps} @ ${newAngle}°) to ${patient.firstName}'s AR Session queue.`
    );
  };

  const unreviewedCount = alerts.filter((a) => !a.reviewed).length;
  const latestLog = ehrLogs[0];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Clinician Header + Gamified Adherence Strip */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="text-xs font-semibold text-teal-700">
            Clinician Oversight · {patient.clinicianName}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
            PT Portal — {patient.fullName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-mono">{patient.mrn}</span> · {patient.protocolName} (Week{' '}
            {patient.protocolWeek}/{patient.totalWeeks})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900">
            <Flame className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span>{patient.dailyStreakDays}-Day Rehab Streak</span>
          </div>

          {latestLog && (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-teal-50 border border-teal-200 rounded-xl text-xs font-semibold text-teal-900">
              <Trophy className="w-4 h-4 text-teal-600" aria-hidden="true" />
              <span>
                Latest: {latestLog.formTier} ({latestLog.pointsEarned.toLocaleString()} pts)
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onGoToARSession}
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Launch AR Session View
          </button>
        </div>
      </section>

      {planBannerMsg && (
        <div
          role="status"
          className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{planBannerMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setPlanBannerMsg(null)}
            className="text-xs font-medium text-emerald-800 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Grid: Synced EHR Completion Log + Form-Drift Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Synced EHR Completion Log */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-900">
                Synced EHR Completion Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Telemetry, adherence points, and form tiers synced from home AR unit.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {ehrLogs.length} Sessions
            </span>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {ehrLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div key={log.id} className="bg-white">
                  <button
                    type="button"
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="w-full px-4 py-3.5 text-left flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                        <span>{log.dateLabel}</span>
                        <span className="text-xs font-mono font-normal text-slate-500">
                          · {log.timestamp}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums flex flex-wrap items-center gap-2">
                        <span>
                          {log.totalRepsCompleted}/{log.totalRepsTarget} reps
                        </span>
                        <span>·</span>
                        <span>Pain {log.painScore}/10</span>
                        <span>·</span>
                        <span className="text-teal-700 font-semibold">{log.formTier}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono tabular-nums">
                        <div
                          className={`text-sm font-bold ${
                            log.averageAccuracyPct >= 90
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {log.averageAccuracyPct}% form
                        </div>
                        <div className="text-[11px] text-amber-700 flex items-center justify-end gap-1">
                          <Award className="w-3 h-3" aria-hidden="true" />
                          <span>{log.pointsEarned.toLocaleString()} pts</span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-slate-50/70 border-t border-slate-100 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {log.breakdowns.map((b, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            <div className="font-semibold text-slate-900 truncate">
                              {b.exerciseName}
                            </div>
                            <div className="mt-1 font-mono text-slate-600 tabular-nums">
                              ROM {b.achievedAngle}° / {b.targetAngle}°
                            </div>
                            <div className="font-mono text-slate-500 tabular-nums">
                              {b.repsCompleted}/{b.repsTarget} reps · {b.accuracyPct}%
                            </div>
                          </div>
                        ))}
                      </div>
                      {log.patientNote && (
                        <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className="font-semibold text-slate-900">Patient Note: </span>
                          {log.patientNote}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Form-Drift Alerts */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-900">
                Form-Drift Alerts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Flagged when patient drifts outside calibrated tolerance rings.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-amber-800 tabular-nums">
              {unreviewedCount} Unreviewed
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-600">
              No form-drift alerts recorded for this protocol cycle.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border ${
                    alert.reviewed
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-amber-50/70 border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 ${
                          alert.reviewed ? 'text-slate-400' : 'text-amber-600'
                        }`}
                        aria-hidden="true"
                      />
                      <span>{alert.exerciseName}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                      {alert.timestamp}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold text-amber-800">
                      Deviation: {alert.deviationDeg}°
                    </span>

                    <button
                      type="button"
                      onClick={() => onToggleAlertReviewed(alert.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                        alert.reviewed
                          ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          : 'bg-white border-amber-300 text-amber-900 hover:bg-amber-100'
                      }`}
                    >
                      <Check className="w-3 h-3" aria-hidden="true" />
                      <span>{alert.reviewed ? 'Reviewed' : 'Mark Reviewed'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Adjust or Add Prescribed Exercises */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-900">
              Active Prescribed Plan ({exercises.length} Exercises)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Adjust sets, reps, or target angles — updates sync live to the Active AR Session stack.
            </p>
          </div>

          <div className="space-y-3">
            {exercises.map((ex, idx) => {
              const isEditing = editingId === ex.id;
              return (
                <div
                  key={ex.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono text-teal-700 font-semibold">
                        0{idx + 1} · {ex.targetJoint}
                      </span>
                      <h3 className="text-base font-semibold text-slate-900">{ex.name}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => openEditor(ex)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Adjust Parameters</span>
                        </button>
                      )}
                      {exercises.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveExercise(ex.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                          aria-label={`Remove ${ex.name}`}
                          title="Remove exercise from plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Sets
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={editSets}
                          onChange={(e) => setEditSets(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Reps / Set
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={editReps}
                          onChange={(e) => setEditReps(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Target Angle (°)
                        </label>
                        <input
                          type="number"
                          min={15}
                          max={180}
                          value={editAngle}
                          onChange={(e) => setEditAngle(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(ex)}
                          className="flex-1 py-1.5 px-3 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="py-1.5 px-2.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-slate-700 tabular-nums">
                      <span>Sets: {ex.sets}</span>
                      <span>Reps: {ex.reps}</span>
                      <span>Target ROM: {ex.targetAngle}°</span>
                      <span>Hold: {ex.holdSeconds}s</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Prescribed Exercise Form */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-900">
              Add Prescribed Exercise
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Immediately syncs to the Active AR Session exercise stack &amp; 3D pre-check gate.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Quick fill:</span>
            {PRESET_CLINICIAN_EXERCISES.map((preset, i) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(i)}
                className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="ex-name" className="block text-xs font-medium text-slate-700 mb-1">
                Exercise Name
              </label>
              <input
                id="ex-name"
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="ex-joint" className="block text-xs font-medium text-slate-700 mb-1">
                  Target Joint / Muscle
                </label>
                <input
                  id="ex-joint"
                  type="text"
                  value={newJoint}
                  onChange={(e) => setNewJoint(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="ex-pattern" className="block text-xs font-medium text-slate-700 mb-1">
                  3D Avatar Kinematics
                </label>
                <select
                  id="ex-pattern"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value as MovementPattern)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                >
                  <option value="hip-abduction">Standing Hip Abduction</option>
                  <option value="lateral-raise">Lateral Arm Elevation</option>
                  <option value="shoulder-flexion">Shoulder Flexion</option>
                  <option value="knee-extension">Seated Knee Extension</option>
                  <option value="bodyweight-squat">Bodyweight Squat</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="ex-sets" className="block text-xs font-medium text-slate-700 mb-1">
                  Sets
                </label>
                <input
                  id="ex-sets"
                  type="number"
                  min={1}
                  max={8}
                  value={newSets}
                  onChange={(e) => setNewSets(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>
              <div>
                <label htmlFor="ex-reps" className="block text-xs font-medium text-slate-700 mb-1">
                  Reps
                </label>
                <input
                  id="ex-reps"
                  type="number"
                  min={1}
                  max={30}
                  value={newReps}
                  onChange={(e) => setNewReps(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>
              <div>
                <label htmlFor="ex-angle" className="block text-xs font-medium text-slate-700 mb-1">
                  Angle (°)
                </label>
                <input
                  id="ex-angle"
                  type="number"
                  min={15}
                  max={180}
                  value={newAngle}
                  onChange={(e) => setNewAngle(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>
              <div>
                <label htmlFor="ex-hold" className="block text-xs font-medium text-slate-700 mb-1">
                  Hold (s)
                </label>
                <input
                  id="ex-hold"
                  type="number"
                  min={1}
                  max={10}
                  value={newHold}
                  onChange={(e) => setNewHold(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add Exercise to Synced Plan</span>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};
