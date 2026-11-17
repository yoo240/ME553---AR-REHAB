import {
  EHRSessionRecord,
  Exercise,
  ExerciseTelemetry,
  FormDriftAlert,
  FormTier,
  PatientProfile,
} from '../types/rehab';

export function computeFormTier(accuracyPct: number): FormTier {
  if (accuracyPct >= 95) return 'Platinum Form';
  if (accuracyPct >= 88) return 'Gold Form';
  if (accuracyPct >= 75) return 'Silver Form';
  return 'In Training';
}

export const PATIENT_PROFILE: PatientProfile = {
  firstName: 'Alex',
  fullName: 'Alex Mercer',
  mrn: 'MRN-48291',
  clinicianName: 'Dr. Sarah Jenkins, DPT',
  clinicName: 'Pacific Orthopedic & Spine Rehab',
  protocolName: 'Post-Op Rotator Cuff & Patellar Stabilization',
  protocolWeek: 4,
  totalWeeks: 8,
  dailyStreakDays: 6,
};

export const INITIAL_EXERCISES: Exercise[] = [
  {
    id: 'ex-shoulder-flexion',
    name: 'Shoulder Flexion',
    targetJoint: 'Right Glenohumeral Joint',
    pattern: 'shoulder-flexion',
    sets: 3,
    reps: 10,
    targetAngle: 160,
    restAngle: 15,
    toleranceDeg: 8,
    holdSeconds: 2,
    instructions: [
      'Keep your right elbow straight with thumb pointing upward.',
      'Raise arm smoothly forward into the glowing green target ring.',
      'Hold steady at 160° for 2 seconds, then lower with control.',
    ],
    correctionCue: 'Raise elbow 12° higher — align within target zone',
    correctionDirection: 'up',
    clinicalNotes: 'Monitor for scapular hiking above 135°.',
  },
  {
    id: 'ex-knee-extension',
    name: 'Seated Knee Extension',
    targetJoint: 'Left Quadriceps & Patella',
    pattern: 'knee-extension',
    sets: 3,
    reps: 12,
    targetAngle: 175,
    restAngle: 90,
    toleranceDeg: 7,
    holdSeconds: 3,
    instructions: [
      'Sit upright with both thighs resting evenly on the chair.',
      'Extend your left heel forward until inside the AR target box.',
      'Pause 3 seconds at full extension before lowering smoothly.',
    ],
    correctionCue: 'Extend heel 10° higher — avoid hip leaning',
    correctionDirection: 'up',
    clinicalNotes: 'Prioritize terminal 15° VMO engagement without trunk lean.',
  },
  {
    id: 'ex-bodyweight-squat',
    name: 'Bodyweight Squat',
    targetJoint: 'Bilateral Hip & Knee Complex',
    pattern: 'bodyweight-squat',
    sets: 3,
    reps: 8,
    targetAngle: 95,
    restAngle: 175,
    toleranceDeg: 8,
    holdSeconds: 2,
    instructions: [
      'Keep chest lifted and weight balanced evenly across your heels.',
      'Hinge hips back smoothly until knees reach the 95° target depth.',
      'Hold 2 seconds in the green zone, then drive upward cleanly.',
    ],
    correctionCue: 'Slow down descent — shift weight back into heels',
    correctionDirection: 'back',
    clinicalNotes: 'Watch for medial knee valgus during eccentric phase.',
  },
];

export const PRESET_CLINICIAN_EXERCISES: Array<Omit<Exercise, 'id'>> = [
  {
    name: 'Standing Hip Abduction',
    targetJoint: 'Right Gluteus Medius & Hip',
    pattern: 'hip-abduction',
    sets: 3,
    reps: 12,
    targetAngle: 40,
    restAngle: 5,
    toleranceDeg: 6,
    holdSeconds: 2,
    instructions: [
      'Stand tall with pelvis level and light fingertip support.',
      'Lift right leg smoothly to the side into the AR target ring.',
      'Hold 2 seconds at peak height before returning slowly.',
    ],
    correctionCue: 'Reduce torso tilt — keep pelvis level',
    correctionDirection: 'out',
    clinicalNotes: 'Keep toes pointing straight ahead to isolate glute med.',
  },
  {
    name: 'Lateral Arm Elevation',
    targetJoint: 'Right Supraspinatus & Deltoid',
    pattern: 'lateral-raise',
    sets: 2,
    reps: 10,
    targetAngle: 120,
    restAngle: 12,
    toleranceDeg: 8,
    holdSeconds: 2,
    instructions: [
      'Keep shoulder blades relaxed downward away from your ears.',
      'Raise right arm smoothly in the scapular plane toward 120°.',
      'Pause inside the green rings for 2 seconds before lowering.',
    ],
    correctionCue: 'Lower shoulder trap — raise wrist 8° higher',
    correctionDirection: 'up',
    clinicalNotes: 'Cap elevation at 120° during week 4 subacromial clearance.',
  },
];

export function createInitialTelemetry(exercises: Exercise[]): Record<string, ExerciseTelemetry> {
  const map: Record<string, ExerciseTelemetry> = {};
  exercises.forEach((ex, index) => {
    map[ex.id] = {
      exerciseId: ex.id,
      completedSets: 0,
      completedRepsInCurrentSet: 0,
      totalRepsCompleted: 0,
      goodReps: 0,
      errorCount: 0,
      peakRomAchieved: ex.restAngle,
      status: index === 0 ? 'in-progress' : 'pending',
    };
  });
  return map;
}

export const INITIAL_ALERTS: FormDriftAlert[] = [
  {
    id: 'alert-101',
    timestamp: 'Nov 14 · 6:18 PM',
    exerciseName: 'Shoulder Flexion',
    severity: 'moderate',
    message: 'Elbow dropped 14° below sagittal target on Rep 8 (Set 3 fatigue drift)',
    deviationDeg: 14,
    reviewed: false,
  },
  {
    id: 'alert-102',
    timestamp: 'Nov 12 · 5:42 PM',
    exerciseName: 'Bodyweight Squat',
    severity: 'moderate',
    message: 'Eccentric descent speed exceeded 1.2s threshold — forward knee shift detected',
    deviationDeg: 11,
    reviewed: true,
  },
];

export const INITIAL_EHR_LOGS: EHRSessionRecord[] = [
  {
    id: 'ehr-2026-11-14',
    dateLabel: 'Nov 14, 2026',
    timestamp: '6:24 PM PST',
    totalRepsCompleted: 88,
    totalRepsTarget: 90,
    averageAccuracyPct: 92,
    pointsEarned: 2140,
    bestStreak: 9,
    formTier: 'Gold Form',
    painScore: 3,
    effortScore: 6,
    patientNote: 'Mild tightness at top of shoulder flexion on final set, no sharp pain.',
    syncStatus: 'synced',
    ehrDestination: 'Epic/MyChart EHR — Dr. Sarah Jenkins, DPT',
    breakdowns: [
      {
        exerciseName: 'Shoulder Flexion',
        targetAngle: 160,
        achievedAngle: 156,
        repsCompleted: 30,
        repsTarget: 30,
        accuracyPct: 89,
      },
      {
        exerciseName: 'Seated Knee Extension',
        targetAngle: 175,
        achievedAngle: 174,
        repsCompleted: 34,
        repsTarget: 36,
        accuracyPct: 95,
      },
      {
        exerciseName: 'Bodyweight Squat',
        targetAngle: 95,
        achievedAngle: 98,
        repsCompleted: 24,
        repsTarget: 24,
        accuracyPct: 92,
      },
    ],
  },
  {
    id: 'ehr-2026-11-12',
    dateLabel: 'Nov 12, 2026',
    timestamp: '5:51 PM PST',
    totalRepsCompleted: 90,
    totalRepsTarget: 90,
    averageAccuracyPct: 89,
    pointsEarned: 1890,
    bestStreak: 7,
    formTier: 'Gold Form',
    painScore: 4,
    effortScore: 7,
    patientNote: 'Felt more stable during knee extension holds.',
    syncStatus: 'synced',
    ehrDestination: 'Epic/MyChart EHR — Dr. Sarah Jenkins, DPT',
    breakdowns: [
      {
        exerciseName: 'Shoulder Flexion',
        targetAngle: 160,
        achievedAngle: 151,
        repsCompleted: 30,
        repsTarget: 30,
        accuracyPct: 87,
      },
      {
        exerciseName: 'Seated Knee Extension',
        targetAngle: 175,
        achievedAngle: 171,
        repsCompleted: 36,
        repsTarget: 36,
        accuracyPct: 91,
      },
      {
        exerciseName: 'Bodyweight Squat',
        targetAngle: 95,
        achievedAngle: 101,
        repsCompleted: 24,
        repsTarget: 24,
        accuracyPct: 89,
      },
    ],
  },
];
