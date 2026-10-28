import { DECORATIONS, decorationVisible, gardenStage, plantGrowth } from './gardenProgress.js';

// The complete composition is a precomposited rendering of the approved art.
// All partial gardens still render only the purchased, visible objects.
export function isCompleteGarden(garden) {
  return DECORATIONS.every(item => decorationVisible(garden, item.id)
    && (!item.plant || plantGrowth(garden, item.id) >= 20));
}

// Presentation only: saved purchase ids, rewards and planting dates stay unchanged.
export function plantArtwork(garden, id) {
  const age = plantGrowth(garden, id);
  const level = gardenStage(age).level;
  const flowers = id === 'flowers' || id === 'tulips';
  return { asset: `${id}-${level}`, scale: flowers ? [0.5, 0.72, 0.9, 1][level] : [0.15, 0.4, 0.72, 1][level], level };
}
