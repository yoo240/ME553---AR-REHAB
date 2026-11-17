import { useCallback, useEffect, useRef, useState } from 'react';
import { ActiveARSession } from './components/ActiveARSession';
import { ClinicianPortal } from './components/ClinicianPortal';
import { PatientDashboard } from './components/PatientDashboard';
import { SessionSummary } from './components/SessionSummary';
import { TopNav } from './components/TopNav';
import {
  createInitialTelemetry,
  INITIAL_ALERTS,
  INITIAL_EHR_LOGS,
  INITIAL_EXERCISES,
  PATIENT_PROFILE,
} from './data/initialData';
import {
  AppView,
  EHRSessionRecord,
  Exercise,
  ExerciseTelemetry,
  FormDriftAlert,
} from './types/rehab';

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [exercises, setExercises] = useState<Exercise[]>(INITIAL_EXERCISES);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number>(0);
  const [telemetry, setTelemetry] = useState<Record<string, ExerciseTelemetry>>(() =>
    createInitialTelemetry(INITIAL_EXERCISES)
  );

  // IR sensor calibration state
  const [irConnected, setIrConnected] = useState(true);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Alerts & EHR Logs shared between Active AR, Session Summary, and Clinician Portal
  const [alerts, setAlerts] = useState<FormDriftAlert[]>(INITIAL_ALERTS);
  const [sessionAlerts, setSessionAlerts] = useState<FormDriftAlert[]>([]);
  const [ehrLogs, setEhrLogs] = useState<EHRSessionRecord[]>(INITIAL_EHR_LOGS);

  // Post-session summary state
  const [painScore, setPainScore] = useState<number>(3);
  const [effortScore, setEffortScore] = useState<number>(6);
  const [patientNote, setPatientNote] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'packaging' | 'syncing' | 'synced'>('idle');
  const [lastSyncedRecord, setLastSyncedRecord] = useState<EHRSessionRecord | null>(null);

  const syncTimersRef = useRef<number[]>([]);
  const lastSyncedIdRef = useRef<string | null>(null);

  const clearSyncTimers = () => {
    syncTimersRef.current.forEach((id) => window.clearTimeout(id));
    syncTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearSyncTimers();
  }, []);

  const handleCalibrateSensor = () => {
    if (isCalibrating) return;
    setIsCalibrating(true);
    window.setTimeout(() => {
      setIsCalibrating(false);
      setIrConnected(true);
    }, 900);
  };

  const triggerEHRCloudSync = useCallback(
    (
      snapshotTelemetry: Record<string, ExerciseTelemetry>,
      snapshotExercises: Exercise[],
      pain: number,
      effort: number,
      note: string
    ) => {
      clearSyncTimers();
      setSyncStatus('packaging');

      const t1 = window.setTimeout(() => {
        setSyncStatus('syncing');
      }, 450);

      const t2 = window.setTimeout(() => {
        const now = new Date();
        const dateLabel = now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const timeStr = now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });

        let totalCompleted = 0;
        let totalTarget = 0;
        let totalGood = 0;
        let totalErr = 0;

        const breakdowns = snapshotExercises.map((ex) => {
          const tel = snapshotTelemetry[ex.id];
          const repsTarget = ex.sets * ex.reps;
          const repsCompleted = tel?.totalRepsCompleted ?? 0;
          const good = tel?.goodReps ?? 0;
          const err = tel?.errorCount ?? 0;
          totalCompleted += repsCompleted;
          totalTarget += repsTarget;
          totalGood += good;
          totalErr += err;

          const denom = good + err;
          const accuracyPct =
            denom > 0 ? Math.round((good / denom) * 100) : repsCompleted > 0 ? 96 : 0;

          return {
            exerciseName: ex.name,
            targetAngle: ex.targetAngle,
            achievedAngle: repsCompleted > 0 ? tel?.peakRomAchieved ?? ex.targetAngle : 0,
            repsCompleted,
            repsTarget,
            accuracyPct,
          };
        });

        const overallDenom = totalGood + totalErr;
        const averageAccuracyPct =
          overallDenom > 0
            ? Math.round((totalGood / overallDenom) * 100)
            : totalCompleted > 0
            ? 96
            : 0;

        const prevSyncedId = lastSyncedIdRef.current;
        const recordId = prevSyncedId ?? `ehr-${Date.now().toString().slice(-6)}`;
        lastSyncedIdRef.current = recordId;

        const newRecord: EHRSessionRecord = {
          id: recordId,
          dateLabel,
          timestamp: `${timeStr} PST`,
          totalRepsCompleted: totalCompleted,
          totalRepsTarget: totalTarget,
          averageAccuracyPct,
          painScore: pain,
          effortScore: effort,
          patientNote: note.trim(),
          syncStatus: 'synced',
          ehrDestination: `Epic/MyChart EHR — ${PATIENT_PROFILE.clinicianName}`,
          breakdowns,
        };

        setLastSyncedRecord(newRecord);
        setEhrLogs((prev) => {
          if (prevSyncedId && prev.some((r) => r.id === prevSyncedId)) {
            return prev.map((r) => (r.id === prevSyncedId ? newRecord : r));
          }
          return [newRecord, ...prev];
        });
        setSyncStatus('synced');
      }, 1050);

      syncTimersRef.current = [t1, t2];
    },
    []
  );

  const handleFinishSession = useCallback(
    (overrideTelemetry?: Record<string, ExerciseTelemetry>) => {
      const activeTel = overrideTelemetry ?? telemetry;
      setCurrentView('summary');
      triggerEHRCloudSync(activeTel, exercises, painScore, effortScore, patientNote);
    },
    [telemetry, exercises, painScore, effortScore, patientNote, triggerEHRCloudSync]
  );

  const handleRecordGoodRep = (exerciseId: string, achievedAngle: number) => {
    const exIdx = exercises.findIndex((e) => e.id === exerciseId);
    const ex = exercises[exIdx];
    if (!ex) return;

    const current = telemetry[exerciseId];
    if (!current || current.status === 'completed') return;

    const nextRepsInSet = current.completedRepsInCurrentSet + 1;
    const reachedEndOfSet = nextRepsInSet >= ex.reps;
    const nextCompletedSets = reachedEndOfSet
      ? Math.min(ex.sets, current.completedSets + 1)
      : current.completedSets;
    const isExerciseDone = nextCompletedSets >= ex.sets;

    const updatedPeak =
      ex.pattern === 'bodyweight-squat'
        ? current.totalRepsCompleted === 0
          ? achievedAngle
          : Math.min(current.peakRomAchieved, achievedAngle)
        : Math.max(current.peakRomAchieved, achievedAngle);

    const updatedExTelemetry: ExerciseTelemetry = {
      ...current,
      completedSets: nextCompletedSets,
      completedRepsInCurrentSet: isExerciseDone
        ? ex.reps
        : reachedEndOfSet
        ? 0
        : nextRepsInSet,
      totalRepsCompleted: Math.min(ex.sets * ex.reps, current.totalRepsCompleted + 1),
      goodReps: current.goodReps + 1,
      peakRomAchieved: updatedPeak,
      status: isExerciseDone ? 'completed' : 'in-progress',
    };

    const nextTelemetry: Record<string, ExerciseTelemetry> = {
      ...telemetry,
      [exerciseId]: updatedExTelemetry,
    };

    if (isExerciseDone) {
      const nextPendingIdx = exercises.findIndex(
        (e, i) => i > exIdx && nextTelemetry[e.id]?.status !== 'completed'
      );
      if (nextPendingIdx !== -1) {
        nextTelemetry[exercises[nextPendingIdx].id] = {
          ...nextTelemetry[exercises[nextPendingIdx].id],
          status: 'in-progress',
        };
        setTelemetry(nextTelemetry);
        setSelectedExerciseIndex(nextPendingIdx);
        return;
      }

      // Check if ALL exercises are now completed -> auto-trigger Session Summary!
      const allCompleted = exercises.every((e) => nextTelemetry[e.id]?.status === 'completed');
      setTelemetry(nextTelemetry);
      if (allCompleted) {
        handleFinishSession(nextTelemetry);
      }
      return;
    }

    setTelemetry(nextTelemetry);
  };

  const handleRecordFormError = (exercise: Exercise, deviationDeg: number) => {
    setTelemetry((prev) => {
      const curr = prev[exercise.id];
      if (!curr) return prev;
      return {
        ...prev,
        [exercise.id]: {
          ...curr,
          errorCount: curr.errorCount + 1,
        },
      };
    });

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const newAlert: FormDriftAlert = {
      id: `alert-${Date.now()}`,
      timestamp: `Today · ${timeStr}`,
      exerciseName: exercise.name,
      severity: deviationDeg >= 12 ? 'high' : 'moderate',
      message: `${exercise.correctionCue} (${deviationDeg}° outside tolerance)`,
      deviationDeg,
      reviewed: false,
    };

    setSessionAlerts((prev) => [newAlert, ...prev]);
    setAlerts((prev) => [newAlert, ...prev]);
  };

  const handleCompleteSet = (exerciseId: string) => {
    const exIdx = exercises.findIndex((e) => e.id === exerciseId);
    const ex = exercises[exIdx];
    if (!ex) return;

    const current = telemetry[exerciseId];
    if (!current) return;

    const remainingInSet = Math.max(0, ex.reps - current.completedRepsInCurrentSet);
    const nextCompletedSets = Math.min(ex.sets, current.completedSets + 1);
    const isExerciseDone = nextCompletedSets >= ex.sets;

    const updatedEx: ExerciseTelemetry = {
      ...current,
      completedSets: nextCompletedSets,
      completedRepsInCurrentSet: isExerciseDone ? ex.reps : 0,
      totalRepsCompleted: Math.min(
        ex.sets * ex.reps,
        current.totalRepsCompleted + remainingInSet
      ),
      goodReps: current.goodReps + remainingInSet,
      peakRomAchieved: ex.targetAngle,
      status: isExerciseDone ? 'completed' : 'in-progress',
    };

    const nextTelemetry: Record<string, ExerciseTelemetry> = {
      ...telemetry,
      [exerciseId]: updatedEx,
    };

    if (isExerciseDone) {
      const nextIdx = exercises.findIndex(
        (e, i) => i > exIdx && nextTelemetry[e.id]?.status !== 'completed'
      );
      if (nextIdx !== -1) {
        nextTelemetry[exercises[nextIdx].id] = {
          ...nextTelemetry[exercises[nextIdx].id],
          status: 'in-progress',
        };
        setTelemetry(nextTelemetry);
        setSelectedExerciseIndex(nextIdx);
        return;
      }

      const allCompleted = exercises.every((e) => nextTelemetry[e.id]?.status === 'completed');
      setTelemetry(nextTelemetry);
      if (allCompleted) {
        handleFinishSession(nextTelemetry);
      }
      return;
    }

    setTelemetry(nextTelemetry);
  };

  const handleResetExercise = (exerciseId: string) => {
    const ex = exercises.find((e) => e.id === exerciseId);
    if (!ex) return;
    setTelemetry((prev) => ({
      ...prev,
      [exerciseId]: {
        exerciseId,
        completedSets: 0,
        completedRepsInCurrentSet: 0,
        totalRepsCompleted: 0,
        goodReps: 0,
        errorCount: 0,
        peakRomAchieved: ex.restAngle,
        status: 'in-progress',
      },
    }));
  };

  const handleStartSession = (exerciseIndex?: number) => {
    if (typeof exerciseIndex === 'number') {
      setSelectedExerciseIndex(exerciseIndex);
    }
    setCurrentView('active-ar');
  };

  const handleStartNewSession = () => {
    clearSyncTimers();
    lastSyncedIdRef.current = null;
    setTelemetry(createInitialTelemetry(exercises));
    setSessionAlerts([]);
    setSelectedExerciseIndex(0);
    setSyncStatus('idle');
    setLastSyncedRecord(null);
    setPatientNote('');
    setCurrentView('dashboard');
  };

  // Clinician Portal handlers
  const handleToggleAlertReviewed = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, reviewed: !a.reviewed } : a))
    );
  };

  const handleUpdateExercise = (exerciseId: string, updates: Partial<Exercise>) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === exerciseId ? { ...ex, ...updates } : ex))
    );
  };

  const handleAddExercise = (newEx: Omit<Exercise, 'id'>) => {
    const id = `ex-custom-${Date.now()}`;
    const created: Exercise = { ...newEx, id };
    setExercises((prev) => [...prev, created]);
    setTelemetry((prev) => ({
      ...prev,
      [id]: {
        exerciseId: id,
        completedSets: 0,
        completedRepsInCurrentSet: 0,
        totalRepsCompleted: 0,
        goodReps: 0,
        errorCount: 0,
        peakRomAchieved: created.restAngle,
        status: 'pending',
      },
    }));
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setExercises((prev) => {
      const filtered = prev.filter((ex) => ex.id !== exerciseId);
      setSelectedExerciseIndex((idx) => Math.min(idx, Math.max(0, filtered.length - 1)));
      return filtered;
    });
  };

  const hasActiveProgress = Object.values(telemetry).some((t) => t.totalRepsCompleted > 0);

  const handleTopPrimaryAction = () => {
    if (currentView === 'active-ar') {
      handleFinishSession();
    } else {
      handleStartSession();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <TopNav
        currentView={currentView}
        onNavigate={setCurrentView}
        onPrimaryAction={handleTopPrimaryAction}
        hasActiveProgress={hasActiveProgress}
      />

      <div className="flex-1">
        {currentView === 'dashboard' && (
          <PatientDashboard
            patient={PATIENT_PROFILE}
            exercises={exercises}
            telemetry={telemetry}
            selectedExerciseIndex={selectedExerciseIndex}
            onSelectExercise={setSelectedExerciseIndex}
            onStartSession={handleStartSession}
            irConnected={irConnected}
            onCalibrateSensor={handleCalibrateSensor}
            isCalibrating={isCalibrating}
          />
        )}

        {currentView === 'active-ar' && (
          <ActiveARSession
            exercises={exercises}
            activeExerciseIndex={selectedExerciseIndex}
            onSelectExerciseIndex={setSelectedExerciseIndex}
            telemetry={telemetry}
            onRecordGoodRep={handleRecordGoodRep}
            onRecordFormError={handleRecordFormError}
            onCompleteSet={handleCompleteSet}
            onResetExercise={handleResetExercise}
            onFinishSession={() => handleFinishSession()}
            onBackToDashboard={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'summary' && (
          <SessionSummary
            patient={PATIENT_PROFILE}
            exercises={exercises}
            telemetry={telemetry}
            sessionAlerts={sessionAlerts}
            painScore={painScore}
            effortScore={effortScore}
            patientNote={patientNote}
            onChangePainScore={setPainScore}
            onChangeEffortScore={setEffortScore}
            onChangePatientNote={setPatientNote}
            syncStatus={syncStatus}
            lastSyncedRecord={lastSyncedRecord}
            onSyncToEHR={() =>
              triggerEHRCloudSync(telemetry, exercises, painScore, effortScore, patientNote)
            }
            onStartNewSession={handleStartNewSession}
            onOpenClinicianPortal={() => setCurrentView('clinician')}
          />
        )}

        {currentView === 'clinician' && (
          <ClinicianPortal
            patient={PATIENT_PROFILE}
            exercises={exercises}
            ehrLogs={ehrLogs}
            alerts={alerts}
            onToggleAlertReviewed={handleToggleAlertReviewed}
            onUpdateExercise={handleUpdateExercise}
            onAddExercise={handleAddExercise}
            onRemoveExercise={handleRemoveExercise}
            onGoToPatientView={() => setCurrentView('dashboard')}
          />
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            AR Rehab Companion · {PATIENT_PROFILE.clinicName}
          </span>
          <span>
            HIPAA-Aligned Home Telemetry Prototype · Care Plan by {PATIENT_PROFILE.clinicianName}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
