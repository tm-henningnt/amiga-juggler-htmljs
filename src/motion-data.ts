namespace Juggler.MotionData {
  export const BALL_PLANE_X = -2.0;
  // Tuned with scripts/classic-calibration.mjs against the archival 320 x 200
  // juggler.avi. The constrained fit lowers the cascade while preserving
  // positive ball/body and ball/ball clearance.
  export const LEFT_HAND_BALL_CENTER: Vec3 = [BALL_PLANE_X, 1.45, 3.75];
  export const RIGHT_HAND_BALL_CENTER: Vec3 = [BALL_PLANE_X, -1.45, 3.75];
  export const HIGH_ARC_APEX_Z = 6.475;
  export const LOW_ARC_APEX_Z = 4.325;

  // These points came from the 24 manually labeled historical movie frames.
  // They are kept as source-screen evidence. The rendered motion now uses the
  // ballistic cascade constants above because the fixed-depth screen fit caused
  // physical ball/body and ball/ball intersections.
  export const RAW_BALL_PATH: Vec3[] = [
    [-0.076, 0.641, 7.191],
    [-0.148, 0.757, 7.033],
    [-0.228, 0.834, 6.757],
    [-0.308, 0.911, 6.482],
    [-0.420, 0.977, 6.009],
    [-0.539, 1.040, 5.497],
    [-0.707, 1.156, 4.827],
    [-0.820, 1.080, 4.079],
    [-1.001, 1.191, 3.330],
    [-0.880, 1.022, 3.645],
    [-0.777, 0.882, 3.921],
    [-0.688, 0.737, 4.118],
    [-0.567, 0.426, 4.158],
    [-0.494, 0.205, 4.118],
    [-0.429, -0.055, 3.961],
    [-0.413, -0.262, 3.645],
    [-0.382, -0.570, 3.212],
    [-0.258, -0.383, 4.236],
    [-0.171, -0.174, 5.103],
    [-0.101, -0.042, 5.733],
    [-0.062, 0.114, 6.245],
    [-0.022, 0.270, 6.757],
    [-0.029, 0.410, 6.994],
    [-0.043, 0.511, 7.112]
  ];
}
