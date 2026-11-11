// Warm white keys, quiet ambient fill, and a separate roof edge light.
// Intensities are renderer units, not Blender watt values.
export const LIGHTING_PRESET = Object.freeze({
  name: 'cozy-retro-v5-balanced-highlights',
  exposure: 0.95,
  maxPixelRatio: 1.5,
  environment: 0.20,
  ambient: { sky: 0xffeddb, ground: 0x62533e, intensity: 0.18 },
  lane: { color: 0xffe0bd, intensity: 1.8, height: 3.74 },
  social: { color: 0xffdfbd, intensity: 0.85 },
  roof: { color: 0xffcf9b, intensity: 0.62 },
  laneKey: { color: 0xffe2c4, intensity: 165, distance: 16, angle: 0.9 },
  socialKey: { color: 0xffe4c8, intensity: 90, distance: 11, angle: 1.12 },
  roofKey: { color: 0xffddb8, intensity: 48, distance: 14, angle: 0.77 },
  wallKey: { color: 0xffe0be, intensity: 22, distance: 9, angle: 0.8 },
  wallAccent: { color: 0xffd1a1, intensity: 0.85 },
  fabricEdge: { color: 0xffebd5, intensity: 0.6 },
  shadow: { size: 1536, near: 0.1, bias: -0.00022, normalBias: 0.014 },
  bloom: { strength: 0.035, radius: 0.16, threshold: 2.4 },
  materials: {
    diffuserEmission: 1.15,
    laneRoughness: 0.43,
    fabricRoughness: 0.94,
    fabricGain: 0.84,
    fabricBumpScale: 0.0014,
    ballRoughness: 0.2,
    ao: 1.05,
  },
});
