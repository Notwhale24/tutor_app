import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, GraduationCap, Plus } from 'lucide-react';
import './schedule.css';

const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (value, amount) => { const next = new Date(value); next.setDate(next.getDate() + amount); return next; };
const startOfWeek = value => { const day = new Date(value); day.setHours(0, 0, 0, 0); return addDays(day, day.getDay() === 0 ? -6 : 1 - day.getDay()); };
const monthKey = day => dateKey(day).slice(0, 7);
const endTime = (time, duration) => { const minutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + Number(duration); return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; };

export default function SchedulePage({ students, lessons, studentMap, onAdd, onUpdate, onEdit }) {
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [monthValue, setMonthValue] = useState(() => monthKey(new Date()));
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i)), today = dateKey(new Date());
  const shift = amount => { const next = addDays(week, amount); setWeek(next); setMonthValue(monthKey(next)); };
  const durationFor = lesson => lesson.duration || studentMap[String(lesson.studentId)]?.duration || 60;
  const weekLabel = `${week.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} — ${days[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
  return <div className="page-grid lesson-schedule">
    <div className="schedule-toolbar">
      <div className="month-picker"><label htmlFor="schedule-month">Месяц</label><input id="schedule-month" type="month" value={monthValue} onChange={e => { const value = e.target.value; if (value) { setMonthValue(value); setWeek(startOfWeek(new Date(`${value}-01T12:00:00`))); } }}/></div>
      <div className="week-controls"><button type="button" className="ghost week-arrow" aria-label="Предыдущая неделя" onClick={() => shift(-7)}><ChevronLeft size={17}/></button><button type="button" className="ghost current-week" onClick={() => { const next = startOfWeek(new Date()); setWeek(next); setMonthValue(monthKey(new Date())); }}>Текущая неделя</button><button type="button" className="ghost week-arrow" aria-label="Следующая неделя" onClick={() => shift(7)}><ChevronRight size={17}/></button></div>
      <div className="schedule-add-actions"><button type="button" className="primary" onClick={onAdd} disabled={!students.length}><Plus size={17}/> Новый урок</button></div>
    </div>
    <p className="schedule-week-label">{weekLabel}</p>
    {!students.length && <p className="schedule-week-label">Чтобы добавлять уроки, сначала добавь ученика.</p>}
    <div className="week-grid">{days.map(day => {
      const date = dateKey(day), weekend = day.getDay() === 0 || day.getDay() === 6;
      const items = lessons.filter(lesson => lesson.date === date).sort((a, b) => a.time.localeCompare(b.time) || String(a.id).localeCompare(String(b.id)));
      return <div className={`day-column ${weekend ? 'weekend' : ''}`} key={date}>
        <div className={`day-head ${date === today ? 'today' : ''}`}><b>{day.toLocaleDateString('ru-RU', { weekday: 'short' })}</b><strong>{day.getDate()}</strong><small>{day.toLocaleDateString('ru-RU', { month: 'long' })}</small></div>
          {items.map(value => <article className="schedule-card" key={`lesson-${value.id}`}><button type="button" className="lesson-card-open" onClick={() => onEdit(value)} aria-label={`Изменить урок: ${studentMap[String(value.studentId)]?.name || 'Удалённый ученик'}`}><GraduationCap size={17}/><div className="schedule-time">{value.time} – {endTime(value.time, durationFor(value))}</div><b>{studentMap[String(value.studentId)]?.name || 'Удалённый ученик'}</b><small className="schedule-subject">{value.subject || studentMap[String(value.studentId)]?.subject || '—'}</small><span>{value.topic || 'Тема не указана'}</span></button><select aria-label={`Статус урока ${value.time}`} className={`schedule-status status-${value.status}`} value={value.status} onChange={e => onUpdate(value.id, { status: e.target.value })}><option value="planned">Запланирован</option><option value="completed">Проведён</option><option value="cancelled">Отменён</option></select></article>)}
        {!items.length && <span className="day-empty-note">Нет уроков</span>}
      </div>;
    })}</div>
  </div>;
}
