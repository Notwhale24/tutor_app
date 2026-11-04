import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTaskOperation, createTaskOccurrences, normalizeTasks, reconcileTasks, taskDeletionIds, taskFromRow, taskRecurrenceLabel, taskToRow, tasksOverlap, validateTask } from '../src/personalTasks.js';

const task = (patch = {}) => ({ id: 'one', title: 'Йога', date: '2026-11-02', time: '18:30', endTime: '19:30', notes: '', completed: false, recurrenceId: null, ...patch });

test('validates title, actual calendar dates, same-day time range and recurrence bounds', () => {
  assert.equal(validateTask(task()), '');
  for (const patch of [{ title: '  ' }, { date: '2026-02-30' }, { time: '25:00' }, { endTime: '18:00' }, { endTime: '18:30' }, { repeat: 'weekly', repeatUntil: '2026-11-01' }, { repeat: 'weekly', repeatUntil: '2028-01-01' }]) assert.ok(validateTask(task(patch)));
  assert.equal(validateTask(task({ date: '2028-02-29' })), '');
});

test('weekly occurrences preserve local calendar time across year boundary and complete only the first', () => {
  let id = 0;
  const rows = createTaskOccurrences(task({ date: '2026-12-28', repeat: 'weekly', repeatUntil: '2027-01-11', completed: true }), () => String(++id));
  assert.deepEqual(rows.map(t => t.date), ['2026-12-28', '2027-01-04', '2027-01-11']);
  assert.deepEqual(rows.map(t => t.time), ['18:30', '18:30', '18:30']);
  assert.deepEqual(rows.map(t => t.completed), [true, false, false]);
  assert.equal(new Set(rows.map(t => t.id)).size, 3);
  assert.equal(new Set(rows.map(t => t.recurrenceId)).size, 1);
});

test('fortnightly repeats skip alternate weeks and retain their label after cloud reload', () => {
  const input = task({ date: '2026-12-28', repeat: 'biweekly', repeatUntil: '2027-01-25' });
  assert.ok(validateTask({ ...input, repeatUntil: '2026-12-27' }));
  const rows = createTaskOccurrences(input);
  assert.deepEqual(rows.map(t => t.date), ['2026-12-28', '2027-01-11', '2027-01-25']);
  assert.equal(taskRecurrenceLabel(taskFromRow(taskToRow(rows[0], 'owner')).recurrenceId), 'Раз в две недели');
  assert.deepEqual(taskDeletionIds(rows, rows[1], true), rows.slice(1).map(t => t.id));
  assert.equal(taskRecurrenceLabel(createTaskOccurrences({ ...input, repeat: 'weekly' })[0].recurrenceId), 'Каждую неделю');
});

test('moving and completing one occurrence do not change the rest of its series', () => {
  const first = task({ recurrenceId: 'series' }), second = task({ id: 'two', date: '2026-11-09', recurrenceId: 'series' });
  const result = applyTaskOperation([first, second], { type: 'upsert', tasks: [{ ...first, date: '2026-11-03', completed: true }] });
  assert.deepEqual(result.find(t => t.id === 'two'), second);
  assert.equal(result.find(t => t.id === 'one').date, '2026-11-03');
  assert.equal(first.completed, false);
});

test('deleting future repeats keeps past repeats and other series', () => {
  const items = [task({ id: 'past', date: '2026-10-26', recurrenceId: 'series' }), task({ recurrenceId: 'series' }), task({ id: 'future', date: '2026-11-09', recurrenceId: 'series' }), task({ id: 'other', recurrenceId: 'other-series' })];
  assert.deepEqual(taskDeletionIds(items, items[1], false), ['one']);
  assert.deepEqual(taskDeletionIds(items, items[1], true), ['one', 'future']);
  assert.deepEqual(applyTaskOperation(items, { type: 'delete', ids: ['one', 'future'] }).map(t => t.id), ['past', 'other']);
});

test('offline create/edit/delete survive reload and merge with unrelated changes from another device', () => {
  const remote = [task(), task({ id: 'other-device' })];
  const operations = [{ id: 'a', type: 'upsert', tasks: [task({ id: 'new', title: 'Покупки' })] }, { id: 'b', type: 'upsert', tasks: [task({ id: 'new', completed: true })] }, { id: 'c', type: 'delete', ids: ['one'] }];
  const restored = JSON.parse(JSON.stringify(operations));
  const merged = reconcileTasks(remote, restored);
  assert.deepEqual(merged.map(t => t.id), ['new', 'other-device']);
  assert.equal(merged[0].completed, true);
  assert.equal(remote.length, 2);
});

test('cloud row mapping round-trips independently from lessons, finance or garden fields', () => {
  const original = task({ notes: 'Коврик', recurrenceId: 'series' });
  const row = taskToRow(original, 'owner');
  assert.equal(row.user_id, 'owner');
  assert.deepEqual(taskFromRow({ ...row, start_time: '18:30:00', end_time: '19:30:00' }), original);
  assert.equal('student_id' in row, false);
  assert.equal('amount' in row, false);
  assert.equal('rewards' in row, false);
});

test('touching intervals do not overlap; cancelled lessons and other dates are ignored', () => {
  assert.equal(tasksOverlap(task(), { id: 'lesson', date: '2026-11-02', time: '19:30', duration: 60 }), false);
  assert.equal(tasksOverlap(task(), { id: 'lesson', date: '2026-11-02', time: '19:00', duration: 60 }), true);
  assert.equal(tasksOverlap(task(), { id: 'lesson', date: '2026-11-02', time: '19:00', duration: 60, status: 'cancelled' }), false);
  assert.equal(tasksOverlap(task(), task({ id: 'other', date: '2026-11-03' })), false);
});

test('invalid backup rows are rejected by normalization without corrupting valid tasks', () => {
  assert.deepEqual(normalizeTasks([null, {}, task(), task({ title: ' ' })]), [task()]);
});
