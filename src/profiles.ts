namespace Juggler.Profiles {
  export const ALL: RenderProfile[] = [
    {
      id: "reference",
      label: "Reference image",
      outputMode: "source-ham",
      reflectionMode: "standard",
      epsilon: REFERENCE_EPSILON
    },
    {
      id: "wright-rgb",
      label: "Wright RGB article",
      outputMode: "modern-rgb",
      reflectionMode: "standard",
      epsilon: REFERENCE_EPSILON
    },
    {
      id: "source-quirk",
      label: "Source quirk study",
      outputMode: "source-ham",
      reflectionMode: "source-quirk",
      epsilon: SOURCE_EPSILON
    }
  ];

  export function byId(id: string): RenderProfile {
    return ALL.find((profile) => profile.id === id) ?? ALL[0];
  }

  export function modeTags(profile: RenderProfile): RenderProfileTag[] {
    return [
      profile.outputMode === "source-ham"
        ? { label: "HAM source output", kind: "source" }
        : { label: "RGB modern output", kind: "modern" },
      profile.reflectionMode === "source-quirk"
        ? { label: "Source reflection quirk", kind: "quirk" }
        : { label: "Standard reflections", kind: "neutral" },
      { label: `epsilon ${profile.epsilon}`, kind: "neutral" }
    ];
  }
}
