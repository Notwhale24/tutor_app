import React, { useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, Check, ChevronLeft, ChevronRight, GraduationCap, MoreHorizontal, NotebookPen, Pencil, Plus, Repeat2, Trash2, X } from 'lucide-react';
import { createTaskOccurrences, normalizeTask, taskDate, taskDeletionIds, tasksOverlap, validateTask } from './personalTasks.js';
import './personal-tasks.css';

const addDays = (value, amount) => { const next = new Date(value); next.setDate(next.getDate() + amount); return next; };
const startOfWeek = value => { const day = new Date(value); day.setHours(0, 0, 0, 0); return addDays(day, day.getDay() === 0 ? -6 : 1 - day.getDay()); };
const monthKey = day => taskDate(day).slice(0, 7);
const endTime = (time, duration) => { const minutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + Number(duration); return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; };

function TaskDialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.showModal(); ref.current.querySelector('input:not([readonly])')?.focus(); }, []);
  return <dialog ref={ref} className="personal-task-dialog" aria-label={title} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="task-dialog-content"><header className="task-dialog-heading"><div><NotebookPen size={24}/><h2>{title}</h2></div><button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose}><X size={21}/></button></header>{children}</div>
  </dialog>;
}

function TaskForm({ initial, mode, initialDate, lessons, tasks, onSave, onClose }) {
  const editing = Boolean(initial);
  const [form, setForm] = useState(() => initial ? { ...initial } : {
    title: '', date: initialDate || taskDate(new Date()), time: '10:00', endTime: '11:00', notes: '', completed: false,
    repeat: 'none', repeatUntil: taskDate(addDays(new Date(`${initialDate || taskDate(new Date())}T12:00:00`), 28)),
  });
  const [error, setError] = useState('');
  const bind = key => event => setForm(previous => ({ ...previous, [key]: event.target.value }));
  const conflict = [...lessons, ...tasks].some(item => tasksOverlap(form, item));
  const title = mode === 'move' ? 'Перенести дело' : editing ? 'Изменить дело' : 'Новое дело';
  function submit(event) {
    event.preventDefault();
    const invalid = validateTask(form);
    if (invalid) { setError(invalid); return; }
    const result = onSave(editing ? [normalizeTask({ ...form, id: initial.id })] : createTaskOccurrences(form));
    if (result?.error) setError(result.error); else onClose();
  }
  return <TaskDialog title={title} onClose={onClose}>
    <p className="task-dialog-intro">{mode === 'move' ? 'Выбери новую дату и время.' : 'Освободи время для важного.'}</p>
    <form onSubmit={submit}>
      <div className="form-grid task-form">
        {error && <p className="form-error wide" role="alert">{error}</p>}
        <label className="wide">Название дела<input autoFocus={mode !== 'move'} required maxLength={160} value={form.title} onChange={bind('title')} readOnly={mode === 'move'} placeholder="Например, йога или поход к врачу"/></label>
        <label className="wide">Дата<input autoFocus={mode === 'move'} type="date" required value={form.date} onChange={bind('date')}/></label>
        <label>Начало<input type="time" required value={form.time} onChange={bind('time')}/></label>
        <label>Окончание<input type="time" required value={form.endTime} onChange={bind('endTime')}/></label>
        {!editing && <><label className="wide">Повторение<select value={form.repeat} onChange={bind('repeat')}><option value="none">Не повторять</option><option value="weekly">Каждую неделю</option></select></label>
          {form.repeat === 'weekly' && <label className="wide">Повторять до<input type="date" min={form.date} required value={form.repeatUntil} onChange={bind('repeatUntil')}/></label>}</>}
        {mode !== 'move' && <><label className="wide">Заметка <span className="task-optional">необязательно</span><textarea rows={3} maxLength={4000} value={form.notes} onChange={bind('notes')} placeholder="Что взять или о чём не забыть"/></label>
          <label className="inline-check wide"><input type="checkbox" checked={form.completed} onChange={e => setForm(current => ({ ...current, completed: e.target.checked }))}/> Уже выполнено</label></>}
        {editing && form.recurrenceId && <p className="task-form-hint wide">Изменится только это дело. Остальные повторы останутся на своих датах.</p>}
        {conflict && <p className="task-overlap wide" role="status">В это время уже есть урок или другое дело. Сохранить всё равно можно.</p>}
      </div>
      <div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>Отмена</button><button type="submit" className="primary task-primary">{mode === 'move' ? 'Перенести дело' : 'Сохранить дело'}</button></div>
    </form>
  </TaskDialog>;
}

function DeleteTaskDialog({ task, tasks, onDelete, onClose }) {
  const [following, setFollowing] = useState(false), [error, setError] = useState('');
  const ids = taskDeletionIds(tasks, task, following);
  return <TaskDialog title="Удалить дело?" onClose={onClose}>
    <p className="task-dialog-intro">«{task.title}» будет удалено из расписания.</p>
    {task.recurrenceId && <label className="inline-check"><input type="checkbox" checked={following} onChange={e => setFollowing(e.target.checked)}/> Также удалить следующие повторы</label>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>Отмена</button><button type="button" className="danger" onClick={() => { const result = onDelete(ids); if (result?.error) setError(result.error); else onClose(); }}><Trash2 size={16}/> {following ? `Удалить (${ids.length})` : 'Удалить дело'}</button></div>
  </TaskDialog>;
}

function TaskCard({ task, menuOpen, setMenu, onEdit, onMove, onDelete, onToggle }) {
  const menu = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = e => { if (!menu.current?.contains(e.target)) setMenu(null); };
    const escape = e => { if (e.key === 'Escape') { setMenu(null); menu.current?.querySelector('button')?.focus(); } };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [menuOpen, setMenu]);
  return <article className={`personal-task-card ${task.completed ? 'is-complete' : ''}`} aria-label={`Личное дело: ${task.title}`}>
    <div className="task-card-head"><span><NotebookPen size={14}/> Личное дело</span><div className="task-menu-anchor" ref={menu}>
      <button type="button" className="task-menu-toggle" aria-label={`Действия: ${task.title}`} aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenu(menuOpen ? null : task.id)}><MoreHorizontal size={19}/></button>
      {menuOpen && <div role="menu" className="task-card-menu" aria-label={`Действия с делом ${task.title}`}>
        <button type="button" role="menuitem" onClick={() => { setMenu(null); onEdit(task); }}><Pencil size={15}/> Изменить</button>
        <button type="button" role="menuitem" onClick={() => { setMenu(null); onMove(task); }}><ArrowRightLeft size={15}/> Перенести</button>
        <button type="button" role="menuitem" className="task-menu-delete" onClick={() => { setMenu(null); onDelete(task); }}><Trash2 size={15}/> Удалить</button>
      </div>}
    </div></div>
    <div className="task-card-body"><input type="checkbox" className="task-complete" checked={task.completed} onChange={() => onToggle(task)} aria-label={`${task.completed ? 'Вернуть в планы' : 'Выполнить'}: ${task.title}`}/>
      <button type="button" className="task-card-open" onClick={() => onEdit(task)} aria-label={`Изменить дело: ${task.title}`}><time>{task.time} – {task.endTime}</time><strong>{task.title}</strong>{task.notes && <span className="task-card-note">{task.notes}</span>}</button>
    </div>
    {(task.completed || task.recurrenceId) && <div className="task-card-meta">{task.completed ? <><Check size={12}/> Выполнено</> : <><Repeat2 size={12}/> Каждую неделю</>}</div>}
  </article>;
}

export default function SchedulePage({ students, lessons, studentMap, onAdd, onUpdate, onEdit, taskStore, onDialogChange }) {
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [monthValue, setMonthValue] = useState(() => monthKey(new Date()));
  const [filter, setFilter] = useState('all'), [editor, setEditor] = useState(null), [deleting, setDeleting] = useState(null), [menuId, setMenu] = useState(null);
  const [actionError, setActionError] = useState('');
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i)), today = taskDate(new Date());
  const { tasks, save, remove, status, error, retry } = taskStore;
  useEffect(() => { onDialogChange?.(Boolean(editor || deleting)); return () => onDialogChange?.(false); }, [editor, deleting, onDialogChange]);
  const shift = amount => { const next = addDays(week, amount); setWeek(next); setMonthValue(monthKey(next)); setMenu(null); };
  const open = (mode, task = null, date = today) => { setEditor({ mode, task, date }); setMenu(null); };
  const durationFor = lesson => lesson.duration || studentMap[String(lesson.studentId)]?.duration || 60;
  const weekLabel = `${week.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} — ${days[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
  return <div className="page-grid personal-schedule">
    <div className="schedule-toolbar">
      <div className="month-picker"><label htmlFor="schedule-month">Месяц</label><input id="schedule-month" type="month" value={monthValue} onChange={e => { const value = e.target.value; if (value) { setMonthValue(value); setWeek(startOfWeek(new Date(`${value}-01T12:00:00`))); } }}/></div>
      <div className="week-controls"><button type="button" className="ghost week-arrow" aria-label="Предыдущая неделя" onClick={() => shift(-7)}><ChevronLeft size={17}/></button><button type="button" className="ghost current-week" onClick={() => { const next = startOfWeek(new Date()); setWeek(next); setMonthValue(monthKey(new Date())); }}>Текущая неделя</button><button type="button" className="ghost week-arrow" aria-label="Следующая неделя" onClick={() => shift(7)}><ChevronRight size={17}/></button></div>
      <div className="schedule-add-actions"><button type="button" className="ghost task-add" onClick={() => open('add')}><Plus size={17}/> Новое дело</button><button type="button" className="primary" onClick={onAdd} disabled={!students.length}><Plus size={17}/> Новый урок</button></div>
    </div>
    <div className="schedule-view-toolbar"><div className="schedule-filters" role="group" aria-label="Что показывать в расписании">{[['all', 'Всё'], ['lessons', 'Уроки'], ['tasks', 'Дела']].map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><span className="schedule-week-label">{weekLabel}</span><div className="schedule-legend"><span>Уроки</span><span>Личные дела</span></div></div>
    {!students.length && <p className="task-form-hint">Здесь можно планировать личные дела. Чтобы добавлять уроки, сначала добавь ученика.</p>}
    <div className="task-sync-note" role="status">{status === 'loading' ? 'Загружаем личные дела…' : status === 'saving' ? 'Сохраняем личные дела…' : status === 'saved' ? 'Личные дела сохранены в облаке' : error || 'Дела сохранены в этом браузере.'}{['offline', 'setup'].includes(status) && <button type="button" onClick={() => { void retry(); }}>Повторить подключение</button>}</div>
    {actionError && <p className="form-error" role="alert">{actionError}</p>}
    <div className="week-grid">{days.map(day => {
      const date = taskDate(day), weekend = day.getDay() === 0 || day.getDay() === 6;
      const items = [...(filter !== 'tasks' ? lessons.filter(l => l.date === date).map(l => ({ type: 'lesson', value: l })) : []), ...(filter !== 'lessons' ? tasks.filter(t => t.date === date).map(t => ({ type: 'task', value: t })) : [])].sort((a, b) => a.value.time.localeCompare(b.value.time) || String(a.value.id).localeCompare(String(b.value.id)));
      return <div className={`day-column ${weekend ? 'weekend' : ''}`} key={date}>
        <div className={`day-head ${date === today ? 'today' : ''}`}><b>{day.toLocaleDateString('ru-RU', { weekday: 'short' })}</b><strong>{day.getDate()}</strong><small>{day.toLocaleDateString('ru-RU', { month: 'long' })}</small></div>
        {items.map(({ type, value }) => type === 'task' ? <TaskCard key={`task-${value.id}`} task={value} menuOpen={menuId === value.id} setMenu={setMenu} onEdit={task => open('edit', task)} onMove={task => open('move', task)} onDelete={setDeleting} onToggle={task => { const result = save([{ ...task, completed: !task.completed }]); setActionError(result?.error || ''); }}/>
          : <article className="schedule-card" key={`lesson-${value.id}`}><button type="button" className="lesson-card-open" onClick={() => onEdit(value)} aria-label={`Изменить урок: ${studentMap[String(value.studentId)]?.name || 'Удалённый ученик'}`}><GraduationCap size={17}/><div className="schedule-time">{value.time} – {endTime(value.time, durationFor(value))}</div><b>{studentMap[String(value.studentId)]?.name || 'Удалённый ученик'}</b><small className="schedule-subject">{value.subject || studentMap[String(value.studentId)]?.subject || '—'}</small><span>{value.topic || 'Тема не указана'}</span></button><select aria-label={`Статус урока ${value.time}`} className={`schedule-status status-${value.status}`} value={value.status} onChange={e => onUpdate(value.id, { status: e.target.value })}><option value="planned">Запланирован</option><option value="completed">Проведён</option><option value="cancelled">Отменён</option></select></article>)}
        {filter !== 'lessons' && <button type="button" className="day-add-task" aria-label={`Добавить дело ${day.toLocaleDateString('ru-RU')}`} onClick={() => open('add', null, date)}><Plus size={13}/> Добавить дело</button>}
        {!items.length && <span className="day-empty-note">{filter === 'lessons' ? 'Нет уроков' : filter === 'tasks' ? 'Нет личных дел' : 'Свободный день'}</span>}
      </div>;
    })}</div>
    {editor && <TaskForm initial={editor.task} initialDate={editor.date} mode={editor.mode} lessons={lessons.map(l => ({ ...l, duration: durationFor(l) }))} tasks={tasks} onSave={save} onClose={() => setEditor(null)}/>}
    {deleting && <DeleteTaskDialog task={deleting} tasks={tasks} onDelete={remove} onClose={() => setDeleting(null)}/>}
  </div>;
}
