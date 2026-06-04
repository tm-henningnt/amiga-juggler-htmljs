namespace Juggler.Tests {
  function assert(condition: unknown, message: string): void {
    if (!condition) {
      throw new Error(message);
    }
  }

  function close(actual: number, expected: number, tolerance: number, message: string): void {
    assert(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
  }

  function parse(id: string): ParsedScene {
    return Parser.parseDatScene(ORIGINAL_DAT[id], `${id}.dat`);
  }

  function testRobotParser(): void {
    const scene = parse("robot");
    const world = Scenes.buildWorld(scene);
    const summary = Scenes.summarizeControls(scene);

    close(scene.observerPosition[0], -10, 0, "robot observer x");
    close(scene.observerPosition[1], -4, 0, "robot observer y");
    close(scene.observerPosition[2], 5.5, 0, "robot observer z");
    close(scene.altitudeDeg, -10, 0, "robot altitude");
    close(scene.azimuthDeg, 20, 0, "robot azimuth");
    close(scene.focalLength, 35, 0, "robot focal length");

    assert(scene.groups.length === 13, "robot group count");
    assert(summary.controls === 22, "robot source control count");
    assert(summary.interpolatedSegments === 9, "robot interpolation segment count");
    assert(world.spheres.length === 70, `robot expanded sphere count was ${world.spheres.length}`);
    assert(world.spheres.filter((sphere) => sphere.type === MIRROR).length === 3, "robot mirror sphere count");
    assert(world.spheres.every((sphere) => sphere.type === DULL || sphere.type === BRIGHT || sphere.type === MIRROR), "normalized surface types");
    assert(world.lamps.length === 1, "robot lamp count");
    assert(world.lampExposure > 1000, "robot lamp exposure scaled");
  }

  function testRobotExpansionAgainstWright(): void {
    const scene = parse("robot");
    const world = Scenes.buildWorld(scene);
    const checks: Array<[number, Vec3, number, string]> = [
      [9, [0, 0, 4.34], 0.76, "torso interpolation"],
      [21, [-0.571429, 0.6, 1.37143], 0.185714, "left leg taper"],
      [49, [-0.328571, -1.31429, 4.18571], 0.185714, "right arm taper"],
      [69, [-1, 1.9, 4.8], 0.1, "left hand endpoint"]
    ];

    for (const [index, position, radius, label] of checks) {
      const sphere = world.spheres[index];
      close(sphere.position[0], position[0], 0.00001, `${label} x`);
      close(sphere.position[1], position[1], 0.00001, `${label} y`);
      close(sphere.position[2], position[2], 0.00001, `${label} z`);
      close(sphere.radius, radius, 0.00001, `${label} radius`);
    }
  }

  function testSceneParserCoverage(): void {
    for (const id of ["robot", "ele", "dragon"]) {
      const scene = parse(id);
      const world = Scenes.buildWorld(scene);
      assert(scene.groups.length > 0, `${id} groups`);
      assert(world.spheres.length > scene.groups.length, `${id} interpolation expansion`);
      assert(world.lamps.length === 1, `${id} lamp`);
      assert(Number.isFinite(world.lampExposure), `${id} lamp exposure`);
    }
  }

  function testMathAndIntersections(): void {
    assert(Renderer.gingham([0, 0, 0]) === 0, "gingham origin");
    assert(Renderer.gingham([3.1, 0, 0]) === 1, "gingham x tile");
    assert(Renderer.gingham([-0.1, 0, 0]) === 0, "gingham negative boundary");

    const sphere: Sphere = {
      position: [0, 0, 0],
      radius: 1,
      color: [1, 1, 1],
      type: DULL,
      groupIndex: 0
    };
    const t = Renderer.intersectSphere({ origin: [-3, 0, 0], direction: [1, 0, 0] }, sphere);
    close(t ?? 0, 2, 1e-9, "sphere intersection");
    const ground = Renderer.intersectGround({ origin: [0, 0, 5], direction: [0, 0, -2] });
    close(ground ?? 0, 2.5, 1e-9, "ground intersection");

    const closeRay = { origin: [0, 0, -1.0001] as Vec3, direction: [0, 0, 1] as Vec3 };
    close(Renderer.intersectSphere(closeRay, sphere, REFERENCE_EPSILON) ?? 0, 0.0001, 1e-9, "reference epsilon keeps near hit");
    close(Renderer.intersectSphere(closeRay, sphere, SOURCE_EPSILON) ?? 0, 2.0001, 1e-9, "source epsilon skips near hit");
  }

  function testProfilesAndReflection(): void {
    const reference = Profiles.byId("reference");
    assert(reference.outputMode === "source-ham", "reference profile uses HAM quantization");
    assert(reference.reflectionMode === "standard", "reference profile uses standard reflection");
    close(reference.epsilon, REFERENCE_EPSILON, 0, "reference epsilon");

    const wright = Profiles.byId("wright-rgb");
    assert(wright.outputMode === "modern-rgb", "wright profile uses RGB output");
    assert(wright.reflectionMode === "standard", "wright profile uses standard reflection");

    const source = Profiles.byId("source-quirk");
    assert(source.reflectionMode === "source-quirk", "source profile keeps source reflection path");
    close(source.epsilon, SOURCE_EPSILON, 0, "source epsilon");
    assert(Profiles.modeTags(reference).some((tag) => tag.label === "HAM source output" && tag.kind === "source"), "reference profile advertises source output");
    assert(Profiles.modeTags(wright).some((tag) => tag.label === "RGB modern output" && tag.kind === "modern"), "wright profile advertises modern output");
    assert(Profiles.modeTags(source).some((tag) => tag.kind === "quirk"), "source quirk profile advertises quirk mode");

    const standard = Renderer.reflectVector([1, -1, 0], [0, 1, 0], "standard");
    close(standard[0], 1, 1e-9, "standard reflection x");
    close(standard[1], 1, 1e-9, "standard reflection y");
    close(standard[2], 0, 1e-9, "standard reflection z");

    const stats: RenderStats = { rays: 0, mirrorFallbacks: 0 };
    const quirk = Renderer.reflectVector([1, -1, 0], [0, 1, 0], "source-quirk", SOURCE_EPSILON, stats);
    close(quirk[0], 1, 1e-9, "source quirk fallback x");
    close(quirk[1], 1, 1e-9, "source quirk fallback y");
    assert(stats.mirrorFallbacks === 1, "source quirk fallback counted");
  }

  function testAnimationPaths(): void {
    const scene = parse("robot");
    const world = Scenes.buildWorld(scene);
    assert(!Animation.sceneHasCameraPathData(scene), "original dat has no embedded camera path");

    const settings = Animation.defaultSettings();
    settings.pathId = "orbit-360";
    settings.frameCount = 5;
    settings.orbitRadius = 10;
    settings.orbitHeight = 0;
    const target = Scenes.sceneTarget(world);
    const first = Animation.evaluateCameraPath(scene, world, settings, 0);
    const middle = Animation.evaluateCameraPath(scene, world, settings, 2);
    const last = Animation.evaluateCameraPath(scene, world, settings, 4);
    close(first.position[0], target[0] - 10, 1e-9, "orbit first x");
    close(first.position[1], target[1], 1e-9, "orbit first y");
    close(middle.position[0], target[0] + 10, 1e-9, "orbit midpoint x");
    close(last.position[0], target[0] - 10, 1e-9, "orbit final x");
    close(last.position[1], target[1], 1e-9, "orbit final y");

    settings.pathId = "dolly";
    settings.frameCount = 3;
    settings.startAngleDeg = 0;
    settings.endAngleDeg = 0;
    settings.dollyStartRadius = 12;
    settings.dollyEndRadius = 6;
    const dollyMiddle = Animation.evaluateCameraPath(scene, world, settings, 1);
    close(dollyMiddle.position[0], target[0] - 9, 1e-9, "dolly middle radius");
  }

  function testAnimationPresets(): void {
    const settings = Animation.defaultSettings();
    const sourceCamera = Animation.applyCameraPreset(settings, "source-camera");
    assert(sourceCamera.pathId === "static", "source camera preset selects static path");
    assert(settings.pathId === "orbit-360", "camera preset does not mutate input settings");

    const overhead = Animation.applyCameraPreset(settings, "overhead-clearance");
    assert(overhead.pathId === "orbit-360", "overhead preset uses orbit");
    assert(overhead.orbitHeight > settings.orbitHeight, "overhead preset raises camera");

    const leftCatch = Animation.applyCyclePreset(settings, "apex-to-left");
    assert(leftCatch.frameCount === Motion.SOURCE_FRAME_COUNT, "cycle preset uses source frame count");
    assert(leftCatch.rangeStartFrame === 0, "apex to left range start");
    assert(leftCatch.rangeEndFrame === 8, "apex to left range end");
    assert(Motion.sourceFrameLabel(0).includes("apex"), "source frame label includes apex phase");
    assert(Motion.sourceFrameLabel(8).includes("left catch"), "source frame label includes left catch phase");
    assert(Motion.sourceRangeLabel({ motionId: "juggler-reconstructed", sourceFrame: 0 }, 0, 8, 24).includes("->"), "source range label spans frames");
  }

  function testSceneMotion(): void {
    const robot = parse("robot");
    const robotWorld = Scenes.buildWorld(robot);
    const motions = Motion.availableMotions(robot);
    assert(motions.some((motion) => motion.id === "juggler-reconstructed"), "robot exposes reconstructed juggling motion");
    assert(Motion.sourceFrameCount("juggler-reconstructed") === 24, "juggler source frame count");

    const frame0 = Motion.resolveWorld(robot, robotWorld, { motionId: "juggler-reconstructed", sourceFrame: 0 }, 0);
    assert(frame0 !== robotWorld, "juggler motion resolves a new world");
    assert(frame0.spheres.length === robotWorld.spheres.length, "juggler motion keeps robot sphere count");
    // Balls at source frame 0 follow a Meatfighter-style cascade: one apex ball,
    // one left-hand ball on the low arc, and one right-hand ball on the high arc.
    close(frame0.spheres[0].position[0], -2, 1e-9, "first ball cascade plane x");
    close(frame0.spheres[0].position[1], 0, 1e-9, "first ball apex y");
    close(frame0.spheres[0].position[2], 7, 1e-9, "first ball apex z");
    close(frame0.spheres[1].position[1], 1.45, 1e-9, "second ball left hand y");
    close(frame0.spheres[1].position[2], 4.05, 1e-9, "second ball left hand z");
    close(frame0.spheres[2].position[1], -1.45, 1e-9, "third ball right hand y");
    close(frame0.spheres[2].position[2], 4.05, 1e-9, "third ball right hand z");

    const frame20 = Motion.resolveWorld(robot, robotWorld, { motionId: "juggler-reconstructed", sourceFrame: 0 }, 20);
    assert(Math.abs(frame20.spheres[0].position[2] - frame0.spheres[0].position[2]) > 1.0, "first ball descends across ballistic arc");

    const rawPoint = Motion.rawSourcePathPoint(0);
    const renderedPoint = Motion.sourcePathPoint(0);
    assert(Math3.length(Math3.sub(rawPoint, renderedPoint)) > 1.0, "rendered physical path is distinct from raw screen anchor");

    const diagnostics = Motion.diagnostics(robot, robotWorld, { motionId: "juggler-reconstructed", sourceFrame: 0 });
    assert(diagnostics !== null, "juggler diagnostics available");
    const motionDiagnostics = diagnostics!;
    assert(motionDiagnostics.minBodyClearance > 0.45, `juggler balls clear body/head, min ${motionDiagnostics.minBodyClearance}`);
    assert(motionDiagnostics.minBallClearance > 0.2, `juggler balls clear each other, min ${motionDiagnostics.minBallClearance}`);
    assert(motionDiagnostics.maxHandContactError < 0.15, `juggler hands meet balls, max ${motionDiagnostics.maxHandContactError}`);

    const elephant = parse("ele");
    assert(!Motion.availableMotions(elephant).some((motion) => motion.id === "juggler-reconstructed"), "elephant stays static-only");
    const staticWorld = Motion.resolveWorld(elephant, Scenes.buildWorld(elephant), { motionId: "juggler-reconstructed", sourceFrame: 0 }, 0);
    assert(staticWorld.spheres.length === Scenes.buildWorld(elephant).spheres.length, "unsupported motion falls back to static world");
  }

  function testCustomKeyframes(): void {
    const keyframes = Animation.parseCustomKeyframes(JSON.stringify([
      { t: 0, position: [0, 0, 0], target: [0, 0, 1], focalLength: 20 },
      { t: 1, position: [10, 0, 0], target: [0, 2, 1], focalLength: 40 }
    ]));
    assert(keyframes.length === 2, "custom keyframes parse");

    const scene = parse("robot");
    const world = Scenes.buildWorld(scene);
    const settings = Animation.defaultSettings();
    settings.pathId = "custom-keyframes";
    settings.frameCount = 3;
    settings.customKeyframes = keyframes;
    const pose = Animation.evaluateCameraPath(scene, world, settings, 1);
    close(pose.position[0], 5, 1e-9, "custom position interpolation");
    close(pose.target[1], 1, 1e-9, "custom target interpolation");
    close(pose.focalLength, 30, 1e-9, "custom focal interpolation");
  }

  function testAnimationRendererQueue(): void {
    const scene = parse("robot");
    const world = Scenes.buildWorld(scene);
    const profile = Profiles.byId("reference");
    const settings = Animation.defaultSettings();
    settings.pathId = "orbit-arc";
    settings.frameCount = 3;
    settings.startAngleDeg = 0;
    settings.endAngleDeg = 90;
    const renderer = new Animation.AnimationRenderer(
      scene,
      world,
      24,
      15,
      {
        profileId: profile.id,
        outputMode: profile.outputMode,
        reflectionMode: profile.reflectionMode,
        epsilon: profile.epsilon,
        maxDepth: 4
      },
      settings,
      { motionId: "juggler-reconstructed", sourceFrame: 0 }
    );

    let guard = 0;
    let progress: AnimationProgress;
    do {
      progress = renderer.step(4);
      guard += 1;
      assert(guard < 100, "animation queue completed");
    } while (!progress.done);

    assert(renderer.frames.length === 3, "animation frame count");
    assert(renderer.frames.every((frame, index) => frame.index === index), "animation frame order");
    assert(renderer.frames.every((frame) => frame.data.length === 24 * 15 * 4), "animation frame data size");
    assert(renderer.frames.every((frame) => frame.motionId === "juggler-reconstructed"), "animation frames record motion mode");
    assert(renderer.frames.every((frame) => frame.profileId === "reference"), "animation frames record render profile");
    assert(renderer.frames.every((frame) => frame.motionClearance !== null), "animation frames record motion clearance");
    assert(renderer.frames.every((frame) => frame.motionBallClearance !== null), "animation frames record ball spacing");
    assert(renderer.frames[1].sceneFrame > renderer.frames[0].sceneFrame, "animation frames advance scene source frame");

    const rangeSettings = Animation.defaultSettings();
    rangeSettings.pathId = "static";
    rangeSettings.frameCount = 8;
    rangeSettings.rangeStartFrame = 2;
    rangeSettings.rangeEndFrame = 4;
    const rangeRenderer = new Animation.AnimationRenderer(
      scene,
      world,
      16,
      10,
      {
        profileId: profile.id,
        outputMode: profile.outputMode,
        reflectionMode: profile.reflectionMode,
        epsilon: profile.epsilon,
        maxDepth: 4
      },
      rangeSettings,
      { motionId: "juggler-reconstructed", sourceFrame: 0 }
    );

    guard = 0;
    do {
      progress = rangeRenderer.step(5);
      guard += 1;
      assert(guard < 100, "range animation queue completed");
    } while (!progress.done);

    assert(rangeRenderer.frames.length === 3, "range animation frame count");
    assert(rangeRenderer.frames[0].index === 2, "range first frame keeps absolute index");
    assert(rangeRenderer.frames[2].index === 4, "range final frame keeps absolute index");
    close(rangeRenderer.frames[0].sceneFrame, 6, 1e-9, "range first frame samples absolute source frame");
  }

  function testHamEncoder(): void {
    const encoder = new Ham.HamEncoder();
    encoder.beginLine();
    const black = encoder.encodePixel(0, [0, 0, 0]);
    assert(black[0] === 0 && black[1] === 0 && black[2] === 0, "first HAM pixel black");
    const red = encoder.encodePixel(1, [1, 0, 0]);
    assert(red[0] >= red[1] && red[0] >= red[2], "HAM red channel update");
  }

  function testRenderSmoke(): void {
    const scene = parse("robot");
    const world = Scenes.buildWorld(scene);
    const observer = Scenes.createObserver(scene, world, 48, 30, { enabled: false, angleDeg: 0, radius: 10 });
    const profile = Profiles.byId("reference");
    const renderer = new Renderer.FrameRenderer(world, observer, {
      profileId: profile.id,
      outputMode: profile.outputMode,
      reflectionMode: profile.reflectionMode,
      epsilon: profile.epsilon,
      maxDepth: 4
    });
    while (!renderer.done()) {
      renderer.renderRows(4);
    }
    let nonBlack = 0;
    for (let i = 0; i < renderer.data.length; i += 4) {
      if (renderer.data[i] || renderer.data[i + 1] || renderer.data[i + 2]) {
        nonBlack += 1;
      }
    }
    assert(nonBlack > 100, `render produced too few lit pixels: ${nonBlack}`);
    assert(renderer.stats.rays > 0, "render ray count");
  }

  export function run(): void {
    testRobotParser();
    testRobotExpansionAgainstWright();
    testSceneParserCoverage();
    testMathAndIntersections();
    testProfilesAndReflection();
    testAnimationPaths();
    testAnimationPresets();
    testSceneMotion();
    testCustomKeyframes();
    testAnimationRendererQueue();
    testHamEncoder();
    testRenderSmoke();
    console.log("All tests passed");
  }
}

Juggler.Tests.run();
