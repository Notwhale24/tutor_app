import { gardenStage, plantGrowth } from './gardenProgress.js';

// Presentation only: saved purchase ids, rewards and planting dates stay unchanged.
export function plantArtwork(garden, id) {
  const age = plantGrowth(garden, id);
  const level = gardenStage(age).level;
  if (id === 'flowers' || id === 'tulips') {
    return { asset: level === 0 ? (id === 'flowers' ? 'flower-buds' : 'tulip-buds') : id,
      scale: [0.72, 0.85, 1, 1][level], level };
  }
  const asset = level === 0 ? 'sprout' : level === 1 ? 'young-tree'
    : level === 2 && id !== 'cherry' ? 'blossom-tree' : id;
  return { asset, scale: [0.22, 0.6, 0.9, 1][level], level };
}
