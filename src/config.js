export const AUTO_RESPAWN_MS = 12000;

export const SUPER_VISUAL = {
  dimTarget: 0.60,
  vignette: 0.38
};

export const FLIGHT = {
  airFrictionFlying: 0.0032,
  maxSpeed: 52,
  maxAngular: 0.18,
  settleFrictionAir: 0.012
};

export const DMG = {
  dmgK: 0.08,
  minHitEnergy: 1.8,
  hpStage0: 1.25,
  hpStage1: 1.10,
  hpStage2: 0.90,
  shakeEnergyThreshold: 9.0,
  shakeMax: 22,
  superMultiplier: 2.8,
  superAuraRadius: 240,
  superAuraEnergyPerTick: 12.0,
  superAuraTickEvery: 6
};

export const DEBRIS = {
  ttlMs: 6500,
  minSpeedToCountStill: 0.18,
  stillFramesToVanish: 55,
  airFriction: 0.020,
};

export const SPR = {
  pillarH: 330,
  beamW: 440,

  birdRadius: 56,
  birdWIdle: 165,
  birdWFly: 135,
  birdWSuper: 190,

  managerW: 86,
  chairW: 120
};

export const LEVEL = {
  floorHeight: 95,
  birdStartX: 210,
  birdStartYOffset: 190,
  houses: [
    { x: 0.56, w: 470, managers: 4 },
    { x: 0.72, w: 470, managers: 4 },
    { x: 0.88, w: 470, managers: 3 },
  ]
};

export const GROUND_VIS = {
  hWorld: 220,
  overlap: 2,
  shadeAlpha: 0.10,
  autoCrop: true,
  cropThreshold: 18,
  cropPadding: 6
};

export const ZOOM = {
  min: 0.55,
  max: 1.85,
  step: 1.10
};

export const SLING = { pullMax: 420, launchK: 0.165 };

export const AIM = {
  enabled: true,
  steps: 26,
  stepTicks: 6,
  dotEvery: 1,
  dotRadius: 3.2,
  alphaStart: 0.85,
  alphaEnd: 0.10
};
