namespace Juggler {
  export type Vec3 = [number, number, number];
  export type SurfaceType = 0 | 1 | 2;
  export type OutputMode = "source-ham" | "modern-rgb";
  export type ReflectionMode = "standard" | "source-quirk";
  export type RenderProfileId = "reference" | "wright-rgb" | "source-quirk";
  export type PreviewMode = "raytrace" | "wireframe" | "solid";
  export type DisplayConstraintId = "rgb" | "ocs-12bit" | "ehb-64" | "ham6-approx";
  export type MouseTool = "none" | "orbit-camera" | "move-group";
  export type GroupTransformState = Record<number, Vec3>;
  export type CameraPathId = "static" | "orbit-360" | "orbit-arc" | "dolly" | "custom-keyframes";
  export type CameraPresetId = "custom" | "source-camera" | "source-orbit" | "left-catch-arc" | "right-catch-arc" | "overhead-clearance" | "source-dolly";
  export type MotionCyclePresetId = "custom" | "full-cycle" | "apex-to-left" | "left-to-right" | "right-to-apex";
  export type SceneMotionId = "static" | "juggler-reconstructed";

  export const DULL: SurfaceType = 0;
  export const BRIGHT: SurfaceType = 1;
  export const MIRROR: SurfaceType = 2;
  export const BIG = 1.0e10;
  export const SOURCE_EPSILON = 1.0e-3;
  export const REFERENCE_EPSILON = 1.0e-5;

  export interface RenderProfile {
    id: RenderProfileId;
    label: string;
    outputMode: OutputMode;
    reflectionMode: ReflectionMode;
    epsilon: number;
  }

  export interface RenderProfileTag {
    label: string;
    kind: "source" | "modern" | "quirk" | "neutral";
  }

  export interface ProjectedSphere {
    sphere: Sphere;
    x: number;
    y: number;
    rx: number;
    ry: number;
    depth: number;
  }

  export interface SceneSource {
    id: string;
    name: string;
    datText: string;
    sourcePath: string;
  }

  export interface SphereControl {
    center: Vec3;
    radius: number;
    interpolationFromPrevious: number | null;
  }

  export interface SphereGroup {
    color: Vec3;
    type: SurfaceType;
    sourceType: number;
    controls: SphereControl[];
  }

  export interface LampInput {
    position: Vec3;
    radius: number;
    color: Vec3;
  }

  export interface ParsedScene {
    sourceName: string;
    observerPosition: Vec3;
    altitudeDeg: number;
    azimuthDeg: number;
    focalLength: number;
    groups: SphereGroup[];
    lamps: LampInput[];
    horizon: [Vec3, Vec3];
    illum: Vec3;
    skyZenith: Vec3;
    skyHorizon: Vec3;
  }

  export interface Sphere {
    position: Vec3;
    radius: number;
    color: Vec3;
    type: SurfaceType;
    groupIndex: number;
  }

  export interface Lamp {
    position: Vec3;
    radius: number;
    color: Vec3;
  }

  export interface Patch {
    position: Vec3;
    normal: Vec3;
    color: Vec3;
  }

  export interface World {
    spheres: Sphere[];
    lamps: Lamp[];
    horizon: [Patch, Patch];
    illum: Vec3;
    skyZenith: Vec3;
    skyHorizon: Vec3;
    lampExposure: number;
  }

  export interface Observer {
    position: Vec3;
    viewDir: Vec3;
    uhat: Vec3;
    vhat: Vec3;
    focalLength: number;
    px: number;
    py: number;
    nx: number;
    ny: number;
    altitudeRad: number;
    azimuthRad: number;
  }

  export interface OrbitSettings {
    enabled: boolean;
    angleDeg: number;
    radius: number;
    heightOffset?: number;
  }

  export interface CameraPose {
    position: Vec3;
    target: Vec3;
    focalLength: number;
  }

  export interface CameraKeyframe extends CameraPose {
    t: number;
  }

  export interface CameraPathSettings {
    pathId: CameraPathId;
    frameCount: number;
    rangeStartFrame: number;
    rangeEndFrame: number;
    fps: number;
    startAngleDeg: number;
    endAngleDeg: number;
    orbitRadius: number;
    orbitHeight: number;
    dollyStartRadius: number;
    dollyEndRadius: number;
    customKeyframes: CameraKeyframe[];
  }

  export interface SceneMotionSettings {
    motionId: SceneMotionId;
    sourceFrame: number;
  }

  export interface MotionObjectSample {
    label: string;
    groupIndex: number;
    position: Vec3;
    radius: number;
  }

  export interface RenderedFrame {
    index: number;
    width: number;
    height: number;
    data: Uint8ClampedArray;
    stats: RenderStats;
    renderMs: number;
    pose: CameraPose;
    sceneFrame: number;
    motionId: SceneMotionId;
    motionClearance: number | null;
    motionBallClearance: number | null;
    motionBalls: MotionObjectSample[];
    motionHands: MotionObjectSample[];
    profileId: RenderProfileId;
    displayConstraintId: DisplayConstraintId;
  }

  export interface AnimationManifestDiagnostics {
    minBodyClearance: number;
    minBodyClearanceFrame: number;
    minBodyClearanceBallGroup: number;
    minBallClearance: number;
    minBallClearanceFrame: number;
    maxHandContactError: number;
  }

  export interface AnimationManifestFrame {
    bufferIndex: number;
    outputFrame: number;
    outputFrameNumber: number;
    sourceFrame: number;
    sourceFrameLabel: string;
    renderMs: number;
    camera: CameraPose;
    stats: RenderStats;
    motion: {
      id: SceneMotionId;
      bodyClearance: number | null;
      ballClearance: number | null;
      balls: MotionObjectSample[];
      hands: MotionObjectSample[];
    };
  }

  export interface AnimationManifest {
    format: "amiga-juggler-animation-manifest";
    version: 1;
    exportedAt: string;
    scene: {
      id: string;
      name: string;
      sourcePath: string;
      sphereCount: number;
    };
    render: {
      width: number;
      height: number;
      profileId: RenderProfileId;
      displayConstraintId: DisplayConstraintId;
    };
    animation: CameraPathSettings;
    motion: SceneMotionSettings;
    diagnostics: AnimationManifestDiagnostics | null;
    frames: AnimationManifestFrame[];
  }

  export interface AnimationProgress {
    frameIndex: number;
    frameCount: number;
    rowProgress: number;
    overallProgress: number;
    done: boolean;
    completedFrame: RenderedFrame | null;
    currentData: Uint8ClampedArray | null;
  }

  export interface RenderOptions {
    profileId: RenderProfileId;
    outputMode: OutputMode;
    reflectionMode: ReflectionMode;
    epsilon: number;
    maxDepth: number;
    displayConstraintId?: DisplayConstraintId;
  }

  export interface RenderStats {
    rays: number;
    mirrorFallbacks: number;
  }
}
