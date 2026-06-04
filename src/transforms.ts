namespace Juggler.Transforms {
  export function empty(): GroupTransformState {
    return {};
  }

  export function hasTransforms(transforms: GroupTransformState): boolean {
    return Object.keys(transforms).length > 0;
  }

  export function offsetFor(transforms: GroupTransformState, groupIndex: number): Vec3 {
    const offset = transforms[groupIndex];
    return offset ? [...offset] : [0, 0, 0];
  }

  export function setOffset(transforms: GroupTransformState, groupIndex: number, offset: Vec3): GroupTransformState {
    const next: GroupTransformState = { ...transforms };
    if (Math3.length(offset) < 1e-9) {
      delete next[groupIndex];
    } else {
      next[groupIndex] = [...offset];
    }
    return next;
  }

  export function clearGroup(transforms: GroupTransformState, groupIndex: number): GroupTransformState {
    const next: GroupTransformState = { ...transforms };
    delete next[groupIndex];
    return next;
  }

  export function apply(world: World, transforms: GroupTransformState): World {
    if (!hasTransforms(transforms)) {
      return world;
    }

    return {
      spheres: world.spheres.map((sphere) => {
        const offset = transforms[sphere.groupIndex];
        return {
          ...sphere,
          position: offset ? Math3.add(sphere.position, offset) : [...sphere.position],
          color: [...sphere.color]
        };
      }),
      lamps: world.lamps.map((lamp) => ({
        position: [...lamp.position],
        radius: lamp.radius,
        color: [...lamp.color]
      })),
      horizon: [
        { ...world.horizon[0], position: [...world.horizon[0].position], normal: [...world.horizon[0].normal], color: [...world.horizon[0].color] },
        { ...world.horizon[1], position: [...world.horizon[1].position], normal: [...world.horizon[1].normal], color: [...world.horizon[1].color] }
      ],
      illum: [...world.illum],
      skyZenith: [...world.skyZenith],
      skyHorizon: [...world.skyHorizon],
      lampExposure: world.lampExposure
    };
  }
}
