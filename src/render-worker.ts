namespace Juggler.RenderWorker {
  interface WorkerScope {
    onmessage: ((event: MessageEvent<RenderWorkerRequest>) => void) | null;
    postMessage(message: RenderWorkerMessage, transfer?: Transferable[]): void;
    setTimeout(handler: () => void, timeout: number): number;
  }

  const scope = self as unknown as WorkerScope;

  scope.onmessage = (event: MessageEvent<RenderWorkerRequest>): void => {
    const request = event.data;
    try {
      render(request);
    } catch (error) {
      post({
        type: "error",
        id: request.id,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };

  function render(request: RenderWorkerRequest): void {
    const started = now();
    const renderWorld = Transforms.apply(
      Motion.resolveWorld(request.parsed, request.world, request.motionSettings, request.sourceFrame),
      request.groupTransforms
    );
    const observer = Scenes.createObserver(request.parsed, request.world, request.width, request.height, request.orbit);
    const renderer = new Renderer.FrameRenderer(renderWorld, observer, request.options);
    const budgetMs = Math.max(1, request.budgetMs);

    const tick = (): void => {
      renderer.renderBudget(budgetMs);
      if (!renderer.done()) {
        post({ type: "progress", id: request.id, progress: renderer.progress(), stats: { ...renderer.stats } });
        scope.setTimeout(tick, 0);
        return;
      }

      const message: RenderWorkerMessage = {
        type: "done",
        id: request.id,
        width: request.width,
        height: request.height,
        data: renderer.data,
        stats: { ...renderer.stats },
        renderMs: now() - started
      };
      scope.postMessage(message, [renderer.data.buffer]);
    };

    tick();
  }

  function post(message: RenderWorkerMessage): void {
    scope.postMessage(message);
  }

  function now(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }
}
