import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeGarden, gardenBalance, gardenGrowth, plantGrowth, rewardLessons, buyDecoration, decorationVisible } from '../src/gardenProgress.js';
import { plantArtwork } from '../src/gardenArtwork.js';

// Same visible state as the user's existing garden: 90 earned, 30 spent,
// five lessons, daisies bought after the second lesson. Never seed production.
const savedGarden = () => ({ version: 2,
  rewarded: ['a','b','c','d','e'], rewards: {a:20,b:20,c:20,d:15,e:15},
  owned: ['flowers'], hidden: [], celebrated: ['2026-10-24'], plantedAt: {flowers:2} });

test('artwork update and reload retain the existing 60 coins, daisies and planting age', () => {
  const saved = savedGarden();
  const garden = initializeGarden(JSON.parse(JSON.stringify(saved)), []);
  assert.equal(gardenBalance(garden), 60);
  assert.equal(gardenGrowth(garden), 5);
  assert.equal(plantGrowth(garden, 'flowers'), 3);
  assert.equal(decorationVisible(garden, 'flowers'), true);
  assert.deepEqual(garden.rewarded, saved.rewarded);
  assert.deepEqual(garden.celebrated, saved.celebrated);
  const before = JSON.stringify(garden);
  assert.equal(plantArtwork(garden,'flowers').asset, 'flower-buds');
  assert.equal(JSON.stringify(garden), before);
  assert.deepEqual(initializeGarden(JSON.parse(before), []), garden);
  assert.equal(buyDecoration(garden, 'flowers'), garden);
  assert.equal(rewardLessons(garden,[{id:'a',status:'completed',duration:60}]), garden);
});

test('new lesson grows existing plants and buying another item does not reduce their age', () => {
  let garden = initializeGarden(savedGarden(), []);
  garden = rewardLessons(garden,[{id:'f',status:'completed',duration:60}]);
  assert.equal(gardenBalance(garden),80);
  assert.equal(plantGrowth(garden,'flowers'),4);
  garden = buyDecoration(garden,'apple');
  assert.equal(gardenBalance(garden),0);
  assert.equal(plantGrowth(garden,'flowers'),4);
  assert.deepEqual(plantArtwork(garden,'apple'),{asset:'sprout',scale:0.22,level:0});
  const reloaded = initializeGarden(JSON.parse(JSON.stringify(garden)),[]);
  assert.deepEqual(reloaded,garden);
});

test('plant art follows growth thresholds and fruits never appear before 20 new lessons', () => {
  for (const [age,level] of [[0,0],[4,0],[5,1],[9,1],[10,2],[19,2],[20,3]]) {
    const ids = Array.from({length:age},(_,i)=>String(i));
    const garden = {rewarded:ids,rewards:Object.fromEntries(ids.map(id=>[id,20])),plantedAt:{}};
    assert.equal(plantArtwork(garden,'apple').level,level);
    assert.equal(plantArtwork(garden,'apple').asset,['sprout','young-tree','blossom-tree','apple'][level]);
    assert.equal(plantArtwork(garden,'pear').asset,['sprout','young-tree','blossom-tree','pear'][level]);
    assert.equal(plantArtwork(garden,'cherry').asset,['sprout','young-tree','cherry','cherry'][level]);
    assert.equal(plantArtwork(garden,'flowers').asset,level===0?'flower-buds':'flowers');
    assert.equal(plantArtwork(garden,'tulips').asset,level===0?'tulip-buds':'tulips');
  }
});
