import test from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_MESSAGE_COUNT, getDailyMessages, localDayNumber } from '../src/dailyMessages.js';

test('the same local date keeps all four messages stable after a refresh', () => {
  assert.deepEqual(getDailyMessages(new Date(2026, 9, 22, 0, 0, 0)), getDailyMessages(new Date(2026, 9, 22, 23, 59, 59)));
});

test('all four texts change at midnight and across month/year boundaries', () => {
  for (const [year, month, day] of [[2026, 9, 22], [2026, 9, 31], [2026, 11, 31], [2028, 1, 28], [2028, 1, 29]]) {
    const before = getDailyMessages(new Date(year, month, day, 23, 59, 59));
    const after = getDailyMessages(new Date(year, month, day + 1, 0, 0, 0));
    for (const slot of Object.keys(before)) assert.notEqual(before[slot], after[slot]);
  }
});

test('each slot has 1,024 distinct days and the two blocks never match', () => {
  assert.equal(DAILY_MESSAGE_COUNT, 1024);
  const seen = Object.fromEntries(Object.keys(getDailyMessages()).map(key => [key, new Set()]));
  const bannerTitles = new Set(), noteTitles = new Set();
  for (let day = 0; day < DAILY_MESSAGE_COUNT; day++) {
    const messages = getDailyMessages(new Date(2026, 9, 22 + day, 12));
    assert.equal(new Set(Object.values(messages)).size, 4);
    for (const [slot, text] of Object.entries(messages)) {
      assert.ok(text.length > 10 && text.length < 125, `${slot}: ${text}`);
      assert.ok(!/undefined|\s{2}/.test(text));
      assert.ok(!seen[slot].has(text), `${slot} repeats on day ${day}`);
      seen[slot].add(text);
    }
    bannerTitles.add(messages.bannerTitle); noteTitles.add(messages.noteTitle);
  }
  assert.equal([...bannerTitles].filter(text => noteTitles.has(text)).length, 0);
});

test('calendar day counting ignores the hour and also works before the start date', () => {
  assert.equal(localDayNumber(new Date(2026, 9, 23, 0)) - localDayNumber(new Date(2026, 9, 22, 23)), 1);
  const earlier = getDailyMessages(new Date(2026, 9, 1));
  assert.ok(Object.values(earlier).every(text => text && !text.includes('undefined')));
});
