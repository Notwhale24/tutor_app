import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGarden, rewardLessons, gardenBalance, buyDecoration, gardenStage, completesDay, lessonCoins } from '../src/gardenProgress.js';

const lesson = (id, status = 'completed', date = '2026-10-22') => ({ id, status, date });
test('completed lessons earn once, including after undo, deletion, reload and restoring a lesson', () => {
  let garden = rewardLessons(normalizeGarden(), [lesson(1), lesson(2, 'planned')]);
  assert.equal(gardenBalance(garden), 20);
  assert.equal(rewardLessons(garden, [lesson(1)]), garden);
  garden = rewardLessons(garden, [lesson(1, 'planned')]);
  garden = rewardLessons(garden, []);
  garden = rewardLessons(normalizeGarden(JSON.parse(JSON.stringify(garden))), [lesson('1'), lesson(2)]);
  assert.equal(gardenBalance(garden), 40);
});
test('shop checks funds, charges each decoration once and preserves purchases after reload', () => {
  let garden = rewardLessons(normalizeGarden(), Array.from({length: 3}, (_,i)=>lesson(i)));
  assert.equal(buyDecoration(garden, 'picnic'), garden);
  assert.equal(buyDecoration(garden, 'unknown'), garden);
  garden = buyDecoration(garden, 'fence');
  assert.equal(gardenBalance(garden), 30);
  assert.equal(buyDecoration(garden, 'fence'), garden);
  assert.equal(buyDecoration(garden, 'pond'), garden);
  assert.deepEqual(normalizeGarden(JSON.parse(JSON.stringify(garden))).owned, ['fence']);
});
test('garden grows at 5, 10 and 20 lessons and buying decorations never reduces growth', () => {
  assert.deepEqual([0,4,5,9,10,19,20,100].map(n=>gardenStage(n).level), [0,0,1,1,2,2,3,3]);
  let garden = rewardLessons(normalizeGarden(), Array.from({length:20},(_,i)=>lesson(i)));
  garden = buyDecoration(buyDecoration(garden, 'picnic'), 'bench');
  assert.equal(gardenBalance(garden), 200);
  assert.equal(gardenStage(garden.rewarded.length).level, 3);
});
test('coins follow duration: 60 minutes earns 20, 45 earns 15, 90 earns 30; edits cannot mint more', () => {
  assert.deepEqual([60,45,90,30].map(lessonCoins), [20,15,30,10]);
  let garden = rewardLessons(normalizeGarden(), [{...lesson(1),duration:45},{...lesson(2),duration:60},{...lesson(3),duration:90}]);
  assert.equal(gardenBalance(garden),65);
  garden = rewardLessons(garden,[{...lesson(1),duration:90}]);
  assert.equal(gardenBalance(garden),65);
  const fallback = rewardLessons(normalizeGarden(),[lesson(5)],()=>45);
  assert.equal(gardenBalance(fallback),15);
});
test('corgi visits only for a transition to all today lessons completed, once per local day', () => {
  const day = '2026-10-22';
  const before = [lesson(1), lesson(2,'planned'), lesson(3,'planned','2026-10-23')];
  const after = [lesson(1), lesson(2), lesson(3,'planned','2026-10-23')];
  assert.equal(completesDay(before,after,day,[]), true);
  assert.equal(completesDay(before,after,day,[day]), false);
  assert.equal(completesDay(after,after,day,[]), false);
  assert.equal(completesDay([],[],day,[]), false);
  assert.equal(completesDay(before,[lesson(1),lesson(2,'cancelled')],day,[]), false);
  assert.equal(completesDay(before,after,'2026-10-23',[]), false);
  assert.equal(completesDay([lesson(4,'planned','2027-01-01')],[lesson(4,'completed','2027-01-01')],'2027-01-01',[day]), true);
});
