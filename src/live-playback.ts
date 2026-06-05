namespace Juggler.LivePlayback {
  export interface AdvanceResult {
    frame: number;
    skippedFrames: number;
    dueAtMs: number;
  }

  export interface LiveFrameCommitResult {
    committed: boolean;
    displayData: Uint8ClampedArray | null;
    previousData: Uint8ClampedArray | null;
  }

  export function nextFrame(frame: number, frameCount: number, steps = 1): number {
    const count = Math.max(1, Math.round(frameCount));
    return ((Math.round(frame) + Math.max(1, Math.round(steps))) % count + count) % count;
  }

  export function advance(
    currentFrame: number,
    frameCount: number,
    targetFps: number,
    dueAtMs: number,
    nowMs: number,
    renderInProgress: boolean
  ): AdvanceResult {
    const interval = 1000 / Math.max(1, Math.min(60, targetFps));
    const elapsedSteps = nowMs < dueAtMs ? 0 : Math.max(1, Math.floor((nowMs - dueAtMs) / interval) + 1);
    if (elapsedSteps === 0) {
      return { frame: currentFrame, skippedFrames: 0, dueAtMs };
    }

    const nextDue = dueAtMs + elapsedSteps * interval;
    if (renderInProgress) {
      return {
        frame: nextFrame(currentFrame, frameCount, elapsedSteps),
        skippedFrames: elapsedSteps,
        dueAtMs: nextDue
      };
    }

    return {
      frame: nextFrame(currentFrame, frameCount, elapsedSteps),
      skippedFrames: Math.max(0, elapsedSteps - 1),
      dueAtMs: nextDue
    };
  }

  export function commitCompletedFrame(
    currentData: Uint8ClampedArray,
    previousData: Uint8ClampedArray | null,
    motionBlur: MotionBlurSettings | undefined,
    done: boolean
  ): LiveFrameCommitResult {
    if (!done) {
      return {
        committed: false,
        displayData: null,
        previousData
      };
    }

    const displayData = Renderer.blendMotionSamples(currentData, previousData, motionBlur);
    return {
      committed: true,
      displayData,
      previousData: new Uint8ClampedArray(displayData)
    };
  }
}
