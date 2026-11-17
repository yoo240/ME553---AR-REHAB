export type AppView = 'active-ar' | 'summary' | 'clinician';

export type MovementPattern =
  | 'shoulder-flexion'
  | 'knee-extension'
  | 'bodyweight-squat'
  | 'hip-abduction'
  | 'lateral-raise';

export type FormTier = 'Platinum Form' | 'Gold Form' | 'Silver Form' | 'In Training';

export interface Exercise {
  id: string;
  name: string;
  targetJoint: string;
  pattern: MovementPattern;
  sets: number;
  reps: number;
  targetAngle: number;
  restAngle: number;
  toleranceDeg: number;
  holdSeconds: number;
  instructions: string[];
  correctionCue: string;
  correctionDirection: 'up' | 'down' | 'out' | 'back';
  clinicalNotes: string;
}

export interface ExerciseTelemetry {
  exerciseId: string;
  completedSets: number;
  completedRepsInCurrentSet: number;
  totalRepsCompleted: number;
  goodReps: number;
  errorCount: number;
  peakRomAchieved: number;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface FormDriftAlert {
  id: string;
  timestamp: string;
  exerciseName: string;
  severity: 'moderate' | 'high';
  message: string;
  deviationDeg: number;
  reviewed: boolean;
}

export interface EHRExerciseBreakdown {
  exerciseName: string;
  targetAngle: number;
  achievedAngle: number;
  repsCompleted: number;
  repsTarget: number;
  accuracyPct: number;
}

export interface EHRSessionRecord {
  id: string;
  dateLabel: string;
  timestamp: string;
  totalRepsCompleted: number;
  totalRepsTarget: number;
  averageAccuracyPct: number;
  pointsEarned: number;
  bestStreak: number;
  formTier: FormTier;
  painScore: number;
  effortScore: number;
  patientNote: string;
  syncStatus: 'synced' | 'syncing' | 'pending';
  ehrDestination: string;
  breakdowns: EHRExerciseBreakdown[];
}

export interface PatientProfile {
  firstName: string;
  fullName: string;
  mrn: string;
  clinicianName: string;
  clinicName: string;
  protocolName: string;
  protocolWeek: number;
  totalWeeks: number;
  dailyStreakDays: number;
}
