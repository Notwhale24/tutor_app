export function lessonCoins(minutes = 60) {
  const duration = Number(minutes);
  return Math.round((Number.isFinite(duration) && duration > 0 ? duration : 60) / 3 * 100) / 100;
}
export const DECORATIONS = [
  { id: 'flowers', name: 'Ромашковая клумба', cost: 30, icon: '🌼', plant: true },
  { id: 'tulips', name: 'Розовые тюльпаны', cost: 45, icon: '🌷', plant: true },
  { id: 'apple', name: 'Яблоня', cost: 80, icon: '🍎', plant: true },
  { id: 'pear', name: 'Груша', cost: 90, icon: '🍐', plant: true },
  { id: 'cherry', name: 'Сакура', cost: 100, icon: '🌸', plant: true },
  { id: 'river', name: 'Извилистая речка', cost: 140, icon: '🏞️' },
  { id: 'bridge', name: 'Деревянный мостик', cost: 70, icon: '🌉', requires: 'river' },
  { id: 'gnome', name: 'Гном-садовник', cost: 60, icon: '🧙' },
  { id: 'gnome-fisher', name: 'Гном-рыболов', cost: 75, icon: '🎣', requires: 'river' },
  { id: 'lanterns', name: 'Сказочные фонарики', cost: 85, icon: '🏮' },
  { id: 'butterflies', name: 'Бабочки', cost: 50, icon: '🦋' },
  { id: 'birdhouse', name: 'Домик для птиц', cost: 65, icon: '🐦' },
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
    version: source.version === 2 ? 2 : 1,
    rewarded: ids,
    rewards: Object.fromEntries(ids.map(id => [id, Number.isFinite(source.rewards?.[id]) && source.rewards[id] >= 0 ? source.rewards[id] : 20])),
    owned: DECORATIONS.filter(d => Array.isArray(source.owned) && source.owned.includes(d.id)).map(d => d.id),
    hidden: DECORATIONS.filter(d => Array.isArray(source.hidden) && source.hidden.includes(d.id)).map(d => d.id),
    celebrated: Array.isArray(source.celebrated) ? [...new Set(source.celebrated.filter(x => typeof x === 'string'))] : [],
    plantedAt: Object.fromEntries(DECORATIONS.filter(d => d.plant).map(d => [d.id, Number.isFinite(source.plantedAt?.[d.id]) ? Math.max(0, source.plantedAt[d.id]) : 0])),
  };
}

// A one-time fresh start. Old completed lessons remain in the ledger at zero
// coins so toggling their status cannot turn the old history into new rewards.
export function initializeGarden(value, lessons) {
  const garden = normalizeGarden(value);
  if (garden.version === 2) return garden;
  const ids = [...new Set([...garden.rewarded, ...lessons.filter(l => l.status === 'completed').map(l => String(l.id))])];
  return { ...garden, version: 2, rewarded: ids, rewards: Object.fromEntries(ids.map(id => [id, 0])), owned: [], hidden: [], plantedAt: {} };
}

export function gardenGrowth(garden) {
  return garden.rewarded.filter(id => garden.rewards[id] > 0).length;
}

export function plantGrowth(garden, id) {
  return Math.max(0, gardenGrowth(garden) - (garden.plantedAt?.[id] || 0));
}

export function decorationUnlocked(garden, id) {
  const item = DECORATIONS.find(d => d.id === id);
  return !!item && (!item.requires || garden.owned.includes(item.requires));
}

export function decorationVisible(garden, id) {
  const item = DECORATIONS.find(d => d.id === id);
  return !!item && garden.owned.includes(id) && !garden.hidden.includes(id) && (!item.requires || decorationVisible(garden, item.requires));
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
  if (!item || !decorationUnlocked(garden, id) || garden.owned.includes(id) || gardenBalance(garden) < item.cost) return garden;
  return { ...garden, owned: [...garden.owned, id], plantedAt: item.plant ? { ...garden.plantedAt, [id]: gardenGrowth(garden) } : garden.plantedAt };
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
