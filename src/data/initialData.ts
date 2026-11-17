import {
  EHRSessionRecord,
  Exercise,
  ExerciseTelemetry,
  FormDriftAlert,
  PatientProfile,
} from '../types/rehab';

export const PATIENT_PROFILE: PatientProfile = {
  firstName: 'Alex',
  fullName: 'Alex Mercer',
  mrn: 'MRN-48291',
  clinicianName: 'Dr. Sarah Jenkins, DPT',
  clinicName: 'Pacific Orthopedic & Spine Rehab',
  protocolName: 'Post-Op Rotator Cuff & Patellar Stabilization',
  protocolWeek: 4,
  totalWeeks: 8,
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
      'Stand upright facing the IR depth sensor with feet shoulder-width apart.',
      'Keep your right elbow extended and thumb pointing upward.',
      'Raise your arm smoothly forward to the glowing AR target zone and hold 2 seconds.',
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
      'Sit upright in a firm chair with both thighs fully supported.',
      'Slowly straighten your left knee until your heel reaches the AR bounding box.',
      'Hold terminal extension for 3 seconds, then lower with a controlled 3-second tempo.',
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
      'Position feet slightly wider than hip-width, toes turned out 10°.',
      'Hinge hips backward and descend steadily until knee flexion hits 95°.',
      'Keep torso aligned with the AR centerline and drive evenly through heels.',
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
      'Stand tall with light fingertip support and pelvis level.',
      'Lift right leg smoothly out to the side without leaning trunk.',
      'Hold at peak abduction for 2 seconds before returning.',
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
      'Keep shoulder blades depressed and relaxed away from ears.',
      'Elevate right arm in the scapular plane (30° forward of coronal).',
      'Pause inside the green tolerance rings for 2 seconds.',
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
      peakRomAchieved: ex.pattern === 'bodyweight-squat' ? ex.restAngle : ex.restAngle,
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
