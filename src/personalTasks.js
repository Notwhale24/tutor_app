export const taskDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const taskMinutes = time => Number(time?.slice(0, 2)) * 60 + Number(time?.slice(3, 5));
export const compareTasks = (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id);

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && taskDate(date) === value;
}

export function validateTask(task) {
  if (!String(task.title || '').trim()) return 'Напиши название дела';
  if (String(task.title).trim().length > 160) return 'Название должно быть короче 160 символов';
  if (!validDate(task.date)) return 'Выбери дату';
  if (![task.time, task.endTime].every(time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time || ''))) return 'Укажи время начала и окончания';
  if (taskMinutes(task.endTime) <= taskMinutes(task.time)) return 'Окончание должно быть позже начала в тот же день';
  if (String(task.notes || '').length > 4000) return 'Заметка должна быть короче 4000 символов';
  if (task.repeat === 'weekly' || task.repeat === 'biweekly') {
    if (!validDate(task.repeatUntil) || task.repeatUntil < task.date) return 'Укажи дату окончания повторений не раньше первого дела';
    if ((new Date(`${task.repeatUntil}T12:00:00`) - new Date(`${task.date}T12:00:00`)) / 86400000 > 366) return 'Можно запланировать повторения максимум на год';
  }
  return '';
}

export function normalizeTask(task) {
  task = task && typeof task === 'object' ? task : {};
  return {
    id: String(task.id || ''), title: String(task.title || '').trim(), date: String(task.date || ''),
    time: String(task.time || '').slice(0, 5), endTime: String(task.endTime || '').slice(0, 5),
    notes: String(task.notes || ''), completed: task.completed === true,
    recurrenceId: task.recurrenceId || null,
  };
}

export function normalizeTasks(items) {
  if (!Array.isArray(items)) return [];
  return [...new Map(items.map(normalizeTask).filter(t => t.id && !validateTask(t)).map(t => [t.id, t])).values()].sort(compareTasks);
}

export function createTaskOccurrences(input, uuid = () => crypto.randomUUID()) {
  const error = validateTask(input);
  if (error) throw new Error(error);
  const base = normalizeTask(input);
  if (input.repeat !== 'weekly' && input.repeat !== 'biweekly') return [{ ...base, id: uuid(), recurrenceId: null }];
  const interval = input.repeat === 'biweekly' ? 14 : 7;
  // A custom UUID v8 marks a fortnightly series in the existing series_id column.
  // Previously saved weekly series use UUID v4.
  const seriesId = uuid();
  const recurrenceId = interval === 14 ? seriesId.slice(0, 14) + '8' + seriesId.slice(15) : seriesId;
  const tasks = [];
  // Calendar arithmetic keeps local time stable across clock/DST changes.
  for (let day = new Date(`${base.date}T12:00:00`); taskDate(day) <= input.repeatUntil; day.setDate(day.getDate() + interval)) {
    tasks.push({ ...base, id: uuid(), date: taskDate(day), recurrenceId, completed: tasks.length === 0 && base.completed });
  }
  return tasks;
}

export function taskRecurrenceLabel(seriesId) {
  return seriesId?.[14] === '8' ? 'Раз в две недели' : 'Каждую неделю';
}

export function taskDeletionIds(items, task, following = false) {
  return following && task.recurrenceId
    ? items.filter(t => t.recurrenceId === task.recurrenceId && t.date >= task.date).map(t => t.id)
    : [task.id];
}

export function applyTaskOperation(items, operation) {
  if (operation.type === 'delete') return items.filter(t => !operation.ids.includes(t.id));
  const map = new Map(items.map(t => [t.id, t]));
  for (const task of normalizeTasks(operation.tasks)) map.set(task.id, task);
  return [...map.values()].sort(compareTasks);
}

export function reconcileTasks(remote, pending) {
  return pending.reduce(applyTaskOperation, normalizeTasks(remote));
}

export function tasksOverlap(task, other) {
  const end = other.endTime ? taskMinutes(other.endTime) : taskMinutes(other.time) + Number(other.duration || 60);
  return task.id !== other.id && task.date === other.date && other.status !== 'cancelled'
    && taskMinutes(task.time) < end && taskMinutes(other.time) < taskMinutes(task.endTime);
}

export const taskToRow = (task, userId) => ({
  id: task.id, user_id: userId, title: task.title, task_date: task.date, start_time: task.time,
  end_time: task.endTime, notes: task.notes, completed: task.completed, series_id: task.recurrenceId,
});
export const taskFromRow = row => normalizeTask({ ...row, date: row.task_date, time: row.start_time, endTime: row.end_time, recurrenceId: row.series_id });
