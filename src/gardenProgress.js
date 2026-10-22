export function lessonCoins(minutes = 60) {
  const duration = Number(minutes);
  return Math.round((Number.isFinite(duration) && duration > 0 ? duration : 60) / 3 * 100) / 100;
}
export const DECORATIONS = [
  { id: 'fence', name: 'Белый заборчик', cost: 30, icon: '🏡' },
  { id: 'mushrooms', name: 'Грибная полянка', cost: 40, icon: '🍄' },
  { id: 'pond', name: 'Пруд с уточкой', cost: 60, icon: '🦆' },
  { id: 'bench', name: 'Скамейка для отдыха', cost: 80, icon: '🪑' },
  { id: 'lights', name: 'Гирлянда огоньков', cost: 100, icon: '✨' },
  { id: 'picnic', name: 'Уютный пикник', cost: 120, icon: '🧺' },
];

export function normalizeGarden(value) {
  const source = value && typeof value === 'object' ? value : {};
  const ids = Array.isArray(source.rewarded) ? [...new Set(source.rewarded.filter(x => typeof x === 'string'))] : [];
  return {
    rewarded: ids,
    rewards: Object.fromEntries(ids.map(id => [id, Number.isFinite(source.rewards?.[id]) && source.rewards[id] >= 0 ? source.rewards[id] : 20])),
    owned: DECORATIONS.filter(d => Array.isArray(source.owned) && source.owned.includes(d.id)).map(d => d.id),
    hidden: DECORATIONS.filter(d => Array.isArray(source.hidden) && source.hidden.includes(d.id)).map(d => d.id),
    celebrated: Array.isArray(source.celebrated) ? [...new Set(source.celebrated.filter(x => typeof x === 'string'))] : [],
  };
}

export function rewardLessons(garden, lessons, durationForLesson = l => l.duration || 60) {
  const rewarded = new Set(garden.rewarded);
  const rewards = { ...garden.rewards };
  for (const lesson of lessons) if (lesson.status === 'completed' && !rewarded.has(String(lesson.id))) {
    const id = String(lesson.id);
    rewarded.add(id);
    rewards[id] = lessonCoins(durationForLesson(lesson));
  }
  return rewarded.size === garden.rewarded.length ? garden : { ...garden, rewarded: [...rewarded], rewards };
}

export function gardenBalance(garden) {
  return Math.round((garden.rewarded.reduce((sum, id) => sum + (garden.rewards[id] ?? 20), 0) - DECORATIONS.filter(d => garden.owned.includes(d.id)).reduce((sum, d) => sum + d.cost, 0)) * 100) / 100;
}

export function buyDecoration(garden, id) {
  const item = DECORATIONS.find(d => d.id === id);
  if (!item || garden.owned.includes(id) || gardenBalance(garden) < item.cost) return garden;
  return { ...garden, owned: [...garden.owned, id] };
}

export function gardenStage(count) {
  if (count >= 20) return { level: 3, name: 'Сад с плодами', next: null, target: 20, start: 20 };
  if (count >= 10) return { level: 2, name: 'Цветущий сад', next: 'Первые плоды', target: 20, start: 10 };
  if (count >= 5) return { level: 1, name: 'Молодой сад', next: 'Цветение деревьев', target: 10, start: 5 };
  return { level: 0, name: 'Первые росточки', next: 'Молодые деревья', target: 5, start: 0 };
}

export function completesDay(before, after, day, celebrated) {
  const today = after.filter(l => l.date === day);
  return !celebrated.includes(day) && today.length > 0 && today.every(l => l.status === 'completed')
    && before.some(l => l.date === day && l.status !== 'completed');
}
