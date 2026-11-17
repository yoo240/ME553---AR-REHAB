import React, { useMemo } from 'react';
import { Exercise, MovementPattern } from '../types/rehab';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
}

export type CameraAngle = 'front' | 'three-quarter' | 'side';

interface Skeleton3DProps {
  exercise: Exercise;
  /** 0 = rest pose, 1 = peak target pose */
  progress: number;
  /** Current measured joint angle in degrees */
  currentAngle: number;
  mode: 'preview' | 'ar-feed';
  cameraAngle?: CameraAngle;
  hasFormError?: boolean;
  errorIntensity?: number;
  showGhostBox?: boolean;
  showToleranceRings?: boolean;
  width?: number;
  height?: number;
}

interface PoseJoints {
  head: Vec3;
  neck: Vec3;
  pelvis: Vec3;
  lShoulder: Vec3;
  rShoulder: Vec3;
  lElbow: Vec3;
  rElbow: Vec3;
  lWrist: Vec3;
  rWrist: Vec3;
  lHip: Vec3;
  rHip: Vec3;
  lKnee: Vec3;
  rKnee: Vec3;
  lAnkle: Vec3;
  rAnkle: Vec3;
  activeJointKey: keyof Omit<PoseJoints, 'activeJointKey' | 'targetAnchorKey' | 'isSeated'>;
  targetAnchorKey: keyof Omit<PoseJoints, 'activeJointKey' | 'targetAnchorKey' | 'isSeated'>;
  isSeated?: boolean;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function computePose(
  pattern: MovementPattern,
  angleDeg: number,
  targetAngle: number,
  restAngle: number,
  hasError: boolean
): PoseJoints {
  const errShift = hasError ? 1 : 0;

  if (pattern === 'shoulder-flexion') {
    const effectiveAngle = hasError ? Math.max(restAngle, angleDeg - 16) : angleDeg;
    const rad = degToRad(effectiveAngle);
    const upperLen = 0.28;
    const lowerLen = 0.26;
    const dirY = -Math.cos(rad);
    const dirZ = Math.sin(rad);

    const rShoulder: Vec3 = { x: -0.2, y: 1.38 + errShift * 0.03, z: 0 };
    const rElbow: Vec3 = {
      x: rShoulder.x - errShift * 0.04,
      y: rShoulder.y + dirY * upperLen - errShift * 0.04,
      z: rShoulder.z + dirZ * upperLen,
    };
    const rWrist: Vec3 = {
      x: rElbow.x - errShift * 0.03,
      y: rElbow.y + dirY * lowerLen - errShift * 0.05,
      z: rElbow.z + dirZ * lowerLen * (hasError ? 0.92 : 1),
    };

    return {
      head: { x: 0, y: 1.64, z: 0.02 },
      neck: { x: 0, y: 1.44, z: 0 },
      pelvis: { x: 0, y: 0.92, z: 0 },
      lShoulder: { x: 0.2, y: 1.38, z: 0 },
      rShoulder,
      lElbow: { x: 0.24, y: 1.11, z: 0.02 },
      rElbow,
      lWrist: { x: 0.25, y: 0.85, z: 0.06 },
      rWrist,
      lHip: { x: 0.12, y: 0.9, z: 0 },
      rHip: { x: -0.12, y: 0.9, z: 0 },
      lKnee: { x: 0.13, y: 0.48, z: 0.02 },
      rKnee: { x: -0.13, y: 0.48, z: 0.02 },
      lAnkle: { x: 0.13, y: 0.05, z: 0 },
      rAnkle: { x: -0.13, y: 0.05, z: 0 },
      activeJointKey: 'rShoulder',
      targetAnchorKey: 'rWrist',
    };
  }

  if (pattern === 'lateral-raise') {
    const effectiveAngle = hasError ? Math.max(restAngle, angleDeg - 15) : angleDeg;
    const rad = degToRad(effectiveAngle);
    const upperLen = 0.28;
    const lowerLen = 0.26;
    const dirX = -Math.sin(rad) * 0.92;
    const dirZ = Math.sin(rad) * 0.36;
    const dirY = -Math.cos(rad);

    const rShoulder: Vec3 = { x: -0.2, y: 1.38 + errShift * 0.04, z: 0 };
    const rElbow: Vec3 = {
      x: rShoulder.x + dirX * upperLen,
      y: rShoulder.y + dirY * upperLen - errShift * 0.05,
      z: rShoulder.z + dirZ * upperLen,
    };
    const rWrist: Vec3 = {
      x: rElbow.x + dirX * lowerLen,
      y: rElbow.y + dirY * lowerLen - errShift * 0.04,
      z: rElbow.z + dirZ * lowerLen,
    };

    return {
      head: { x: 0, y: 1.64, z: 0.02 },
      neck: { x: 0, y: 1.44, z: 0 },
      pelvis: { x: 0, y: 0.92, z: 0 },
      lShoulder: { x: 0.2, y: 1.38, z: 0 },
      rShoulder,
      lElbow: { x: 0.24, y: 1.11, z: 0.02 },
      rElbow,
      lWrist: { x: 0.25, y: 0.85, z: 0.06 },
      rWrist,
      lHip: { x: 0.12, y: 0.9, z: 0 },
      rHip: { x: -0.12, y: 0.9, z: 0 },
      lKnee: { x: 0.13, y: 0.48, z: 0.02 },
      rKnee: { x: -0.13, y: 0.48, z: 0.02 },
      lAnkle: { x: 0.13, y: 0.05, z: 0 },
      rAnkle: { x: -0.13, y: 0.05, z: 0 },
      activeJointKey: 'rShoulder',
      targetAnchorKey: 'rWrist',
    };
  }

  if (pattern === 'knee-extension') {
    const effectiveAngle = hasError ? Math.max(90, angleDeg - 14) : angleDeg;
    const flexRad = degToRad(effectiveAngle - 90);
    const shinLen = 0.42;
    const dirY = -Math.cos(flexRad);
    const dirZ = Math.sin(flexRad);

    const lKnee: Vec3 = { x: 0.14, y: 0.54, z: 0.32 };
    const lAnkle: Vec3 = {
      x: 0.14,
      y: lKnee.y + dirY * shinLen - errShift * 0.03,
      z: lKnee.z + dirZ * shinLen,
    };

    return {
      head: { x: 0, y: 1.26, z: -0.1 - errShift * 0.08 },
      neck: { x: 0, y: 1.07, z: -0.09 - errShift * 0.06 },
      pelvis: { x: 0, y: 0.56, z: -0.06 },
      lShoulder: { x: 0.19, y: 1.02, z: -0.08 - errShift * 0.05 },
      rShoulder: { x: -0.19, y: 1.02, z: -0.08 - errShift * 0.05 },
      lElbow: { x: 0.22, y: 0.77, z: 0.02 },
      rElbow: { x: -0.22, y: 0.77, z: 0.02 },
      lWrist: { x: 0.2, y: 0.59, z: 0.18 },
      rWrist: { x: -0.2, y: 0.59, z: 0.18 },
      lHip: { x: 0.13, y: 0.55, z: -0.04 },
      rHip: { x: -0.13, y: 0.55, z: -0.04 },
      lKnee,
      rKnee: { x: -0.14, y: 0.54, z: 0.32 },
      lAnkle,
      rAnkle: { x: -0.14, y: 0.12, z: 0.32 },
      activeJointKey: 'lKnee',
      targetAnchorKey: 'lAnkle',
      isSeated: true,
    };
  }

  if (pattern === 'hip-abduction') {
    const effectiveAngle = hasError ? Math.max(restAngle, angleDeg - 11) : angleDeg;
    const rad = degToRad(effectiveAngle);
    const thighLen = 0.42;
    const shinLen = 0.43;
    const dirX = -Math.sin(rad);
    const dirY = -Math.cos(rad);
    const rHip: Vec3 = { x: -0.12, y: 0.9, z: 0 };
    const rKnee: Vec3 = {
      x: rHip.x + dirX * thighLen,
      y: rHip.y + dirY * thighLen,
      z: 0.02,
    };
    const rAnkle: Vec3 = {
      x: rKnee.x + dirX * shinLen,
      y: rKnee.y + dirY * shinLen,
      z: 0.02,
    };

    return {
      head: { x: errShift * 0.08, y: 1.64, z: 0.02 },
      neck: { x: errShift * 0.06, y: 1.44, z: 0 },
      pelvis: { x: 0, y: 0.92, z: 0 },
      lShoulder: { x: 0.2 + errShift * 0.06, y: 1.38, z: 0 },
      rShoulder: { x: -0.2 + errShift * 0.06, y: 1.38 - errShift * 0.03, z: 0 },
      lElbow: { x: 0.25 + errShift * 0.04, y: 1.12, z: 0.04 },
      rElbow: { x: -0.24 + errShift * 0.04, y: 1.12, z: 0.04 },
      lWrist: { x: 0.28, y: 0.94, z: 0.12 },
      rWrist: { x: -0.22, y: 0.92, z: 0.08 },
      lHip: { x: 0.12, y: 0.9, z: 0 },
      rHip,
      lKnee: { x: 0.13, y: 0.48, z: 0.02 },
      rKnee,
      lAnkle: { x: 0.13, y: 0.05, z: 0 },
      rAnkle,
      activeJointKey: 'rHip',
      targetAnchorKey: 'rAnkle',
    };
  }

  // Default: bodyweight-squat
  const span = Math.max(20, restAngle - targetAngle);
  const rawDepth = Math.max(0, Math.min(1.1, (restAngle - angleDeg) / span));
  const depth = hasError ? Math.max(0.25, rawDepth - 0.22) : rawDepth;

  const hipY = lerp(0.9, 0.54, depth);
  const hipZ = lerp(0, -0.26, depth) + errShift * 0.11;
  const kneeY = lerp(0.47, 0.44, depth);
  const kneeZ = lerp(0.02, 0.22, depth) + errShift * 0.11;
  const kneeValgus = errShift * 0.05;
  const torsoForward = lerp(0, 0.18, depth) + errShift * 0.09;

  return {
    head: { x: 0, y: hipY + lerp(0.74, 0.63, depth), z: hipZ + torsoForward + 0.04 },
    neck: { x: 0, y: hipY + lerp(0.54, 0.46, depth), z: hipZ + torsoForward },
    pelvis: { x: 0, y: hipY, z: hipZ },
    lShoulder: { x: 0.2, y: hipY + lerp(0.48, 0.41, depth), z: hipZ + torsoForward },
    rShoulder: { x: -0.2, y: hipY + lerp(0.48, 0.41, depth), z: hipZ + torsoForward },
    lElbow: { x: 0.21, y: hipY + lerp(0.22, 0.38, depth), z: hipZ + torsoForward + lerp(0.04, 0.26, depth) },
    rElbow: { x: -0.21, y: hipY + lerp(0.22, 0.38, depth), z: hipZ + torsoForward + lerp(0.04, 0.26, depth) },
    lWrist: { x: 0.18, y: hipY + lerp(0.02, 0.41, depth), z: hipZ + torsoForward + lerp(0.08, 0.5, depth) },
    rWrist: { x: -0.18, y: hipY + lerp(0.02, 0.41, depth), z: hipZ + torsoForward + lerp(0.08, 0.5, depth) },
    lHip: { x: 0.13, y: hipY, z: hipZ },
    rHip: { x: -0.13, y: hipY, z: hipZ },
    lKnee: { x: 0.16 - kneeValgus, y: kneeY, z: kneeZ },
    rKnee: { x: -0.16 + kneeValgus, y: kneeY, z: kneeZ },
    lAnkle: { x: 0.16, y: 0.05, z: 0.02 },
    rAnkle: { x: -0.16, y: 0.05, z: 0.02 },
    activeJointKey: 'lKnee',
    targetAnchorKey: 'pelvis',
  };
}

function projectPoint(
  p: Vec3,
  yawDeg: number,
  pitchDeg: number,
  cx: number,
  cy: number,
  scale: number
): ProjectedPoint {
  const yaw = degToRad(yawDeg);
  const pitch = degToRad(pitchDeg);

  // Rotate around Y (yaw)
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = p.x * cosY + p.z * sinY;
  const z1 = -p.x * sinY + p.z * cosY;
  const y1 = p.y - 0.85; // center vertically around pelvis/mid-torso

  // Rotate around X (pitch)
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const y2 = y1 * cosP - z1 * sinP;
  const z2 = y1 * sinP + z1 * cosP;

  // Perspective camera at z = 3.6
  const camDist = 3.6;
  const perspective = camDist / Math.max(1.2, camDist - z2);

  return {
    x: cx + x1 * scale * perspective,
    y: cy - y2 * scale * perspective,
    depth: z2,
  };
}

const BONE_CONNECTIONS: Array<[keyof Omit<PoseJoints, 'activeJointKey' | 'targetAnchorKey' | 'isSeated'>, keyof Omit<PoseJoints, 'activeJointKey' | 'targetAnchorKey' | 'isSeated'>]> = [
  ['head', 'neck'],
  ['neck', 'pelvis'],
  ['neck', 'lShoulder'],
  ['neck', 'rShoulder'],
  ['lShoulder', 'lElbow'],
  ['lElbow', 'lWrist'],
  ['rShoulder', 'rElbow'],
  ['rElbow', 'rWrist'],
  ['pelvis', 'lHip'],
  ['pelvis', 'rHip'],
  ['lHip', 'rHip'],
  ['lHip', 'lKnee'],
  ['lKnee', 'lAnkle'],
  ['rHip', 'rKnee'],
  ['rKnee', 'rAnkle'],
];

export const Skeleton3D: React.FC<Skeleton3DProps> = ({
  exercise,
  progress,
  currentAngle,
  mode,
  cameraAngle = 'three-quarter',
  hasFormError = false,
  showGhostBox = true,
  showToleranceRings = true,
  width = 560,
  height = 420,
}) => {
  const isAR = mode === 'ar-feed';

  const yawDeg = useMemo(() => {
    if (cameraAngle === 'front') return 6;
    if (cameraAngle === 'side') return -68;
    // three-quarter optimal for sagittal/coronal readability
    return exercise.pattern === 'hip-abduction' || exercise.pattern === 'lateral-raise'
      ? -18
      : -40;
  }, [cameraAngle, exercise.pattern]);

  const pitchDeg = 10;
  const cx = width * 0.5;
  const cy = height * 0.54;
  const scale = Math.min(width, height) * 0.46;

  // Current live skeleton pose
  const livePose = useMemo(
    () =>
      computePose(
        exercise.pattern,
        currentAngle,
        exercise.targetAngle,
        exercise.restAngle,
        hasFormError
      ),
    [exercise.pattern, currentAngle, exercise.targetAngle, exercise.restAngle, hasFormError]
  );

  // Peak target ghost pose
  const targetPose = useMemo(
    () =>
      computePose(
        exercise.pattern,
        exercise.targetAngle,
        exercise.targetAngle,
        exercise.restAngle,
        false
      ),
    [exercise.pattern, exercise.targetAngle, exercise.restAngle]
  );

  const proj = (v: Vec3) => projectPoint(v, yawDeg, pitchDeg, cx, cy, scale);

  // Project live joints
  const liveProjected = useMemo(() => {
    const out: Record<string, ProjectedPoint> = {};
    (Object.keys(livePose) as Array<keyof PoseJoints>).forEach((k) => {
      if (k !== 'activeJointKey' && k !== 'targetAnchorKey' && k !== 'isSeated') {
        out[k] = proj(livePose[k]);
      }
    });
    return out;
  }, [livePose, yawDeg, cx, cy, scale]);

  // Project target ghost joints
  const targetProjected = useMemo(() => {
    const out: Record<string, ProjectedPoint> = {};
    (Object.keys(targetPose) as Array<keyof PoseJoints>).forEach((k) => {
      if (k !== 'activeJointKey' && k !== 'targetAnchorKey' && k !== 'isSeated') {
        out[k] = proj(targetPose[k]);
      }
    });
    return out;
  }, [targetPose, yawDeg, cx, cy, scale]);

  // Trajectory arc from rest to peak for the target anchor
  const trajectoryPoints = useMemo(() => {
    const pts: string[] = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = lerp(exercise.restAngle, exercise.targetAngle, t);
      const p = computePose(exercise.pattern, a, exercise.targetAngle, exercise.restAngle, false);
      const anchor = p[p.targetAnchorKey];
      const pt = proj(anchor);
      pts.push(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [exercise, yawDeg, cx, cy, scale]);

  // Floor grid lines
  const floorGrid = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const range = [-0.8, -0.4, 0, 0.4, 0.8];
    range.forEach((v) => {
      const a = proj({ x: v, y: 0, z: -0.8 });
      const b = proj({ x: v, y: 0, z: 0.8 });
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      const c = proj({ x: -0.8, y: 0, z: v });
      const d = proj({ x: 0.8, y: 0, z: v });
      lines.push({ x1: c.x, y1: c.y, x2: d.x, y2: d.y });
    });
    return lines;
  }, [yawDeg, cx, cy, scale]);

  // 3D Ghost Bounding Box around the active target endpoint
  const ghostBox = useMemo(() => {
    const center = targetPose[targetPose.targetAnchorKey];
    const half = exercise.pattern === 'bodyweight-squat' ? 0.18 : 0.12;
    const corners: Vec3[] = [
      { x: center.x - half, y: center.y - half, z: center.z - half },
      { x: center.x + half, y: center.y - half, z: center.z - half },
      { x: center.x + half, y: center.y + half, z: center.z - half },
      { x: center.x - half, y: center.y + half, z: center.z - half },
      { x: center.x - half, y: center.y - half, z: center.z + half },
      { x: center.x + half, y: center.y - half, z: center.z + half },
      { x: center.x + half, y: center.y + half, z: center.z + half },
      { x: center.x - half, y: center.y + half, z: center.z + half },
    ];
    const p = corners.map(proj);
    const edges: Array<[number, number]> = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    return { p, edges, center: proj(center) };
  }, [targetPose, exercise.pattern, yawDeg, cx, cy, scale]);

  const activeAnchorLive = liveProjected[livePose.targetAnchorKey];
  const activeAnchorTarget = targetProjected[targetPose.targetAnchorKey];
  const activeJointLive = liveProjected[livePose.activeJointKey];

  // Determine which bones belong to the active limb for highlight
  const activeBones = useMemo(() => {
    if (exercise.pattern === 'shoulder-flexion' || exercise.pattern === 'lateral-raise') {
      return new Set(['rShoulder-rElbow', 'rElbow-rWrist']);
    }
    if (exercise.pattern === 'knee-extension') {
      return new Set(['lHip-lKnee', 'lKnee-lAnkle']);
    }
    if (exercise.pattern === 'hip-abduction') {
      return new Set(['rHip-rKnee', 'rKnee-rAnkle']);
    }
    return new Set(['lHip-lKnee', 'lKnee-lAnkle', 'rHip-rKnee', 'rKnee-rAnkle', 'neck-pelvis']);
  }, [exercise.pattern]);

  const toleranceColor = hasFormError ? '#f59e0b' : '#10b981';
  const toleranceSecondary = hasFormError ? '#ef4444' : '#14b8a6';

  // Chair geometry for seated knee extension
  const chairEdges = useMemo(() => {
    if (!livePose.isSeated) return [];
    const seatPts: Vec3[] = [
      { x: -0.24, y: 0.48, z: -0.18 },
      { x: 0.24, y: 0.48, z: -0.18 },
      { x: 0.24, y: 0.48, z: 0.26 },
      { x: -0.24, y: 0.48, z: 0.26 },
    ];
    const backPts: Vec3[] = [
      { x: -0.24, y: 0.96, z: -0.18 },
      { x: 0.24, y: 0.96, z: -0.18 },
    ];
    const legBases: Vec3[] = [
      { x: -0.24, y: 0, z: -0.18 },
      { x: 0.24, y: 0, z: -0.18 },
      { x: 0.24, y: 0, z: 0.26 },
      { x: -0.24, y: 0, z: 0.26 },
    ];
    const s = seatPts.map(proj);
    const b = backPts.map(proj);
    const l = legBases.map(proj);
    return [
      [s[0], s[1]], [s[1], s[2]], [s[2], s[3]], [s[3], s[0]],
      [s[0], l[0]], [s[1], l[1]], [s[2], l[2]], [s[3], l[3]],
      [s[0], b[0]], [s[1], b[1]], [b[0], b[1]],
    ];
  }, [livePose.isSeated, yawDeg, cx, cy, scale]);

  // Directional correction arrow from live anchor toward target anchor
  const errorVector = useMemo(() => {
    if (!hasFormError) return null;
    const dx = activeAnchorTarget.x - activeAnchorLive.x;
    const dy = activeAnchorTarget.y - activeAnchorLive.y;
    const len = Math.hypot(dx, dy);
    if (len < 6) {
      // fallback vector based on exercise correctionDirection
      return {
        x1: activeAnchorLive.x,
        y1: activeAnchorLive.y,
        x2: activeAnchorLive.x + (exercise.correctionDirection === 'back' ? -44 : 0),
        y2: activeAnchorLive.y + (exercise.correctionDirection === 'up' ? -48 : 0),
      };
    }
    return {
      x1: activeAnchorLive.x,
      y1: activeAnchorLive.y,
      x2: activeAnchorLive.x + dx * 0.85,
      y2: activeAnchorLive.y + dy * 0.85,
    };
  }, [hasFormError, activeAnchorLive, activeAnchorTarget, exercise.correctionDirection]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full select-none"
      role="img"
      aria-label={`3D kinematic wireframe for ${exercise.name}`}
    >
      <defs>
        <radialGradient id={`tol-glow-${mode}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={toleranceColor} stopOpacity={isAR ? 0.32 : 0.18} />
          <stop offset="70%" stopColor={toleranceColor} stopOpacity={isAR ? 0.08 : 0.04} />
          <stop offset="100%" stopColor={toleranceColor} stopOpacity="0" />
        </radialGradient>
        <marker
          id={`arrow-${mode}`}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f59e0b" />
        </marker>
      </defs>

      {/* Subtle IR Scan Grid in AR mode */}
      {isAR && (
        <g opacity="0.14">
          {Array.from({ length: 14 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={(height / 14) * i}
              x2={width}
              y2={(height / 14) * i}
              stroke="#38bdf8"
              strokeWidth="0.6"
            />
          ))}
        </g>
      )}

      {/* 3D Perspective Floor Grid */}
      <g>
        {floorGrid.map((line, i) => (
          <line
            key={`fg-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={isAR ? 'rgba(56, 189, 248, 0.22)' : 'rgba(148, 163, 184, 0.35)'}
            strokeWidth="1"
          />
        ))}
      </g>

      {/* Seated Chair Wireframe */}
      {chairEdges.length > 0 && (
        <g>
          {chairEdges.map(([a, b], idx) => (
            <line
              key={`chair-${idx}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={isAR ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.45)'}
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          ))}
        </g>
      )}

      {/* Kinematic Movement Trajectory Arc */}
      <polyline
        points={trajectoryPoints}
        fill="none"
        stroke={isAR ? '#2dd4bf' : '#0d9488'}
        strokeWidth={isAR ? '2' : '2.5'}
        strokeDasharray="5 5"
        opacity={isAR ? 0.65 : 0.85}
      />

      {/* Ghost Target Limb Silhouette (in AR mode) */}
      {isAR && showGhostBox && (
        <g opacity="0.38">
          {BONE_CONNECTIONS.filter(([a, b]) => activeBones.has(`${a}-${b}`)).map(([a, b]) => (
            <line
              key={`ghost-${a}-${b}`}
              x1={targetProjected[a].x}
              y1={targetProjected[a].y}
              x2={targetProjected[b].x}
              y2={targetProjected[b].y}
              stroke="#2dd4bf"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="2 6"
            />
          ))}
        </g>
      )}

      {/* AR Virtual Ghost Bounding Box */}
      {isAR && showGhostBox && (
        <g>
          <polygon
            points={`${ghostBox.p[0].x},${ghostBox.p[0].y} ${ghostBox.p[1].x},${ghostBox.p[1].y} ${ghostBox.p[5].x},${ghostBox.p[5].y} ${ghostBox.p[4].x},${ghostBox.p[4].y}`}
            fill="rgba(20, 184, 166, 0.08)"
          />
          {ghostBox.edges.map(([i, j], idx) => (
            <line
              key={`gb-${idx}`}
              x1={ghostBox.p[i].x}
              y1={ghostBox.p[i].y}
              x2={ghostBox.p[j].x}
              y2={ghostBox.p[j].y}
              stroke={hasFormError ? '#2dd4bf' : '#34d399'}
              strokeWidth="1.4"
              strokeDasharray="4 3"
              opacity="0.85"
            />
          ))}
          <text
            x={ghostBox.center.x + 28}
            y={ghostBox.center.y - 24}
            fill="#5eead4"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="600"
          >
            TARGET ZONE ({exercise.targetAngle}°)
          </text>
        </g>
      )}

      {/* Concentric Form Tolerance Zone Rings */}
      {showToleranceRings && (
        <g>
          <circle
            cx={isAR ? activeAnchorTarget.x : activeAnchorLive.x}
            cy={isAR ? activeAnchorTarget.y : activeAnchorLive.y}
            r={44}
            fill={`url(#tol-glow-${mode})`}
          />
          <circle
            cx={isAR ? activeAnchorTarget.x : activeAnchorLive.x}
            cy={isAR ? activeAnchorTarget.y : activeAnchorLive.y}
            r={38}
            fill="none"
            stroke={toleranceColor}
            strokeWidth="1.4"
            strokeDasharray="4 4"
            opacity="0.7"
          />
          <circle
            cx={isAR ? activeAnchorTarget.x : activeAnchorLive.x}
            cy={isAR ? activeAnchorTarget.y : activeAnchorLive.y}
            r={24}
            fill="none"
            stroke={toleranceSecondary}
            strokeWidth="1.8"
            opacity="0.9"
          />
          <circle
            cx={isAR ? activeAnchorTarget.x : activeAnchorLive.x}
            cy={isAR ? activeAnchorTarget.y : activeAnchorLive.y}
            r={10}
            fill={toleranceColor}
            fillOpacity="0.22"
            stroke={toleranceColor}
            strokeWidth="2"
          />
        </g>
      )}

      {/* Live Articulated 3D Skeleton Bones */}
      <g>
        {BONE_CONNECTIONS.map(([a, b]) => {
          const p1 = liveProjected[a];
          const p2 = liveProjected[b];
          const isActive = activeBones.has(`${a}-${b}`);
          const boneStroke = isActive
            ? hasFormError
              ? '#fbbf24'
              : isAR
              ? '#34d399'
              : '#0d9488'
            : isAR
            ? '#cbd5e1'
            : '#475569';

          return (
            <g key={`bone-${a}-${b}`}>
              {/* Subtle outer depth casing */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={isAR ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.7)'}
                strokeWidth={isActive ? 9 : 7}
                strokeLinecap="round"
              />
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={boneStroke}
                strokeWidth={isActive ? 5.2 : 3.6}
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </g>

      {/* Head Wireframe Circle */}
      <circle
        cx={liveProjected.head.x}
        cy={liveProjected.head.y}
        r={16}
        fill={isAR ? 'rgba(15, 23, 42, 0.85)' : '#ffffff'}
        stroke={isAR ? '#cbd5e1' : '#334155'}
        strokeWidth="2.5"
      />

      {/* Joint Spheres */}
      <g>
        {Object.entries(liveProjected).map(([key, pt]) => {
          if (key === 'head') return null;
          const isPrimaryJoint = key === livePose.activeJointKey;
          const isTargetTip = key === livePose.targetAnchorKey;
          const radius = isPrimaryJoint ? 7 : isTargetTip ? 6 : 4.2;
          const fill = isPrimaryJoint || isTargetTip
            ? hasFormError
              ? '#f59e0b'
              : '#10b981'
            : isAR
            ? '#38bdf8'
            : '#0f766e';

          return (
            <g key={`joint-${key}`}>
              {(isPrimaryJoint || isTargetTip) && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={radius + 5}
                  fill="none"
                  stroke={fill}
                  strokeWidth="1.4"
                  opacity="0.65"
                />
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={radius}
                fill={fill}
                stroke={isAR ? '#0f172a' : '#ffffff'}
                strokeWidth="2"
              />
            </g>
          );
        })}
      </g>

      {/* Active Joint Angle Callout Pill */}
      <g transform={`translate(${activeJointLive.x + 14}, ${activeJointLive.y - 16})`}>
        <rect
          x="0"
          y="-14"
          width="54"
          height="22"
          rx="5"
          fill={isAR ? 'rgba(15, 23, 42, 0.9)' : '#0f172a'}
          stroke={hasFormError ? '#f59e0b' : '#14b8a6'}
          strokeWidth="1.2"
        />
        <text
          x="27"
          y="1"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="11.5"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="600"
        >
          {Math.round(currentAngle)}°
        </text>
      </g>

      {/* Directional Error Arrow & Cue when drifting outside tolerance */}
      {isAR && hasFormError && errorVector && (
        <g>
          <line
            x1={errorVector.x1}
            y1={errorVector.y1}
            x2={errorVector.x2}
            y2={errorVector.y2}
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
            markerEnd={`url(#arrow-${mode})`}
          />
          <g transform={`translate(${Math.min(width - 235, Math.max(16, activeAnchorLive.x - 90))}, ${Math.max(28, activeAnchorLive.y - 54)})`}>
            <rect
              x="0"
              y="0"
              width="225"
              height="28"
              rx="6"
              fill="rgba(120, 53, 15, 0.92)"
              stroke="#fbbf24"
              strokeWidth="1.2"
            />
            <text
              x="12"
              y="18"
              fill="#fef3c7"
              fontSize="11"
              fontFamily="DM Sans, sans-serif"
              fontWeight="600"
            >
              ▲ {exercise.correctionCue.slice(0, 34)}
            </text>
          </g>
        </g>
      )}

      {/* Subtle Progress Indicator Bar inside preview mode */}
      {!isAR && (
        <g transform={`translate(18, ${height - 26})`}>
          <text
            x="0"
            y="0"
            fill="#64748b"
            fontSize="11"
            fontFamily="JetBrains Mono, monospace"
          >
            ROM CYCLE {Math.round(progress * 100)}% · TARGET {exercise.targetAngle}°
          </text>
        </g>
      )}
    </svg>
  );
};
