namespace Juggler.Experience {
  export interface ExperiencePreset {
    id: ExperiencePresetId;
    label: string;
    previewMode: PreviewMode;
    profileId: RenderProfileId;
    displayConstraintId: DisplayConstraintId;
    qualityId: RenderQualityId;
    antiAliasMode: AntiAliasModeId;
    maxDepth: number;
    rowsPerTick: number;
    useSourceCamera: boolean;
    orbit: OrbitSettings;
    crtMode: "off" | "scanlines" | "slot-mask" | "soft-glow";
    modernEffects: ModernEffectsSettings;
  }

  export const PRESETS: ExperiencePreset[] = [
    {
      id: "classic-source",
      label: "Classic Source",
      previewMode: "raytrace",
      profileId: "reference",
      displayConstraintId: "ham6-approx",
      qualityId: "legacy",
      antiAliasMode: "off",
      maxDepth: 4,
      rowsPerTick: 4,
      useSourceCamera: true,
      orbit: { enabled: false, angleDeg: 20, radius: 10, heightOffset: 0 },
      crtMode: "scanlines",
      modernEffects: disabledModernEffects()
    },
    {
      id: "modern-studio",
      label: "Modern Studio",
      previewMode: "live-raytrace",
      profileId: "wright-rgb",
      displayConstraintId: "rgb",
      qualityId: "modern-quality",
      antiAliasMode: "adaptive-2x",
      maxDepth: 4,
      rowsPerTick: 8,
      useSourceCamera: false,
      orbit: { enabled: true, angleDeg: 20, radius: 10, heightOffset: 0.5 },
      crtMode: "soft-glow",
      modernEffects: modernStudioEffects()
    }
  ];

  export function byId(id: ExperiencePresetId): ExperiencePreset {
    return copyPreset(PRESETS.find((preset) => preset.id === id) ?? PRESETS[0]);
  }

  export function disabledModernEffects(): ModernEffectsSettings {
    return {
      softShadows: { enabled: false, samples: 1, radius: 0 },
      ambientOcclusion: { enabled: false, strength: 0, radius: 1 },
      depthOfField: { enabled: false, samples: 1, aperture: 0, focusDistance: 10 },
      motionBlur: { enabled: false, strength: 0, samples: 1 }
    };
  }

  export function modernStudioEffects(): ModernEffectsSettings {
    return {
      softShadows: { enabled: true, samples: 4, radius: 0.3 },
      ambientOcclusion: { enabled: true, strength: 0.22, radius: 1.35 },
      depthOfField: { enabled: false, samples: 4, aperture: 0.035, focusDistance: 10 },
      motionBlur: { enabled: false, strength: 0.35, samples: 2 }
    };
  }

  export function copyModernEffects(settings: ModernEffectsSettings | undefined): ModernEffectsSettings {
    const source = settings ?? disabledModernEffects();
    return {
      softShadows: { ...source.softShadows },
      ambientOcclusion: { ...source.ambientOcclusion },
      depthOfField: { ...source.depthOfField },
      motionBlur: { ...source.motionBlur }
    };
  }

  export function effectsSummary(settings: ModernEffectsSettings): string {
    const enabled = [
      settings.softShadows.enabled ? "soft shadows" : "",
      settings.ambientOcclusion.enabled ? "AO" : "",
      settings.depthOfField.enabled ? "DOF" : "",
      settings.motionBlur.enabled ? "motion blur" : ""
    ].filter(Boolean);
    return enabled.length ? enabled.join(", ") : "source-clean";
  }

  function copyPreset(preset: ExperiencePreset): ExperiencePreset {
    return {
      ...preset,
      orbit: { ...preset.orbit },
      modernEffects: copyModernEffects(preset.modernEffects)
    };
  }
}
