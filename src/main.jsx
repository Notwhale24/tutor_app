import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen, CalendarDays, CheckCircle2, CircleDollarSign, Clock3,
  GraduationCap, LayoutDashboard, Menu, Plus, Search,
  Users, X, Trash2, ChevronLeft, ChevronRight, ClipboardList, Download, Upload, ArrowRightLeft
} from 'lucide-react';
import './styles.css';
import { supabase } from './supabaseClient';

const today = new Date();
const localDateKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
const localMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const isoToday = localDateKey(today);
const SUBJECTS = ['Математика', 'Русский язык', 'Физика'];
const RUB = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

const seed = {
  students: [
    { id: 1, name: 'Иван Петров', subject: 'Математика', secondSubject: '', grade: '8', price: 1500, priceSecond: 0, duration: 60, durationSecond: 60, parentPhone: '', phone: '', telemostLink: '', notes: 'Нужна дополнительная практика по алгебре.', active: true },
    { id: 2, name: 'Анна Смирнова', subject: 'Русский язык', secondSubject: '', grade: '7', price: 1400, priceSecond: 0, duration: 60, durationSecond: 60, parentPhone: '', phone: '', telemostLink: '', notes: 'Работаем над грамотностью и сочинениями.', active: true },
    { id: 3, name: 'Сергей Иванов', subject: 'Физика', secondSubject: '', grade: '10', price: 2000, priceSecond: 0, duration: 90, durationSecond: 90, parentPhone: '', phone: '', telemostLink: '', notes: 'Подготовка к контрольным и экзамену.', active: true }
  ],
  lessons: [
    { id: 101, studentId: 1, subject: 'Математика', date: isoToday, time: '16:00', status: 'completed', topic: 'Квадратные уравнения', homework: '№ 234–240', comment: 'Нужно повторить формулу дискриминанта.' },
    { id: 102, studentId: 2, subject: 'Русский язык', date: isoToday, time: '17:30', status: 'planned', topic: 'Причастия', homework: '', comment: '' },
    { id: 103, studentId: 3, subject: 'Физика', date: isoToday, time: '19:00', status: 'planned', topic: 'Механика', homework: '', comment: '' }
  ],
  homework: [
    { id: 201, studentId: 1, subject: 'Математика', text: '№ 234–240', due: isoToday, status: 'pending' },
    { id: 202, studentId: 2, subject: 'Русский язык', text: 'Упражнения 5–8', due: isoToday, status: 'done' }
  ],
  payments: [
    { id: 301, studentId: 1, lessonId: 101, amount: 1500, date: isoToday, status: 'paid' },
    { id: 302, studentId: 1, amount: 1500, date: isoToday, status: 'unpaid' },
    { id: 303, studentId: 2, lessonId: 102, amount: 1400, date: isoToday, status: 'paid' }
  ]
};

function stripBinaryAttachmentData(value) {
  if (!Array.isArray(value)) return value;
  return value.map(item => {
    if (!item || typeof item !== 'object') return item;
    const { data, ...rest } = item;
    return rest;
  });
}

function serializableForLocalStorage(key, value) {
  // Photo/file contents are kept in React state long enough for the Supabase
  // sync to upload them, but are never copied into localStorage. This avoids
  // the browser's small localStorage quota breaking the save on larger photos.
  if (key === 'tm_homework' && Array.isArray(value)) {
    return value.map(h => ({ ...h, attachments: stripBinaryAttachmentData(h.attachments || []) }));
  }
  if (key === 'tm_lessons' && Array.isArray(value)) {
    return value.map(l => ({ ...l, homeworkAttachments: stripBinaryAttachmentData(l.homeworkAttachments || []) }));
  }
  return value;
}

function usePersistentState(key, initial, syncCloud = true) {
  const [value, setValueState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });

  const setValue = useCallback((next) => {
    setValueState(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      try {
        // Write to localStorage immediately so F5/refresh cannot happen
        // before the newest React state reaches the local cache.
        localStorage.setItem(key, JSON.stringify(serializableForLocalStorage(key, resolved)));
      } catch (e) {
        console.warn('Не удалось записать локальный кэш:', e);
      }
      if (key === 'tm_tax_rate' && typeof window !== 'undefined' && window.__tmRequestCloudSync) {
        window.__tmRequestCloudSync({ taxRate: resolved });
      }
      return resolved;
    });
  }, [key]);

  useEffect(() => {
    // Keep localStorage in sync after hydration/reconciliation as well.
    try {
      localStorage.setItem(key, JSON.stringify(serializableForLocalStorage(key, value)));
    } catch (e) {
      console.warn('Не удалось записать локальный кэш:', e);
    }
    if (syncCloud && typeof window !== 'undefined' && window.__tmRequestCloudSync) {
      window.__tmRequestCloudSync();
    }
  }, [key, value, syncCloud]);

  return [value, setValue];
}

const nav = [
  ['dashboard', 'Главная', LayoutDashboard],
  ['students', 'Ученики', Users],
  ['schedule', 'Расписание', CalendarDays],
  ['homework', 'Домашние задания', ClipboardList],
  ['finance', 'Финансы', CircleDollarSign],
];

function LocalApp() {
  const [students, setStudents] = usePersistentState('tm_students', seed.students, false);
  const [lessons, setLessons] = usePersistentState('tm_lessons', seed.lessons, false);
  const [homework, setHomework] = usePersistentState('tm_homework', seed.homework, false);
  const [payments, setPayments] = usePersistentState('tm_payments', seed.payments, false);
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentModal, setStudentModal] = useState(false);
  const [lessonModal, setLessonModal] = useState(false);
  const [homeworkModal, setHomeworkModal] = useState(false);
  const [editHomework, setEditHomework] = useState(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [editLesson, setEditLesson] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [importInputKey, setImportInputKey] = useState(0);
  const [importConfirmData, setImportConfirmData] = useState(null);
  const [importMessage, setImportMessage] = useState('');

  useEffect(() => {
    const todayKey = localDateKey(new Date());
    setHomework(prev => {
      let changed = false;
      const next = prev.map(h => {
        if (h.due && h.due < todayKey && h.status !== 'done' && h.status !== 'not_done' && h.status !== 'archived') {
          changed = true;
          return { ...h, status: 'not_done' };
        }
        return h;
      });
      return changed ? next : prev;
    });
  }, []);

  const studentMap = useMemo(() => Object.fromEntries(students.map(s => [String(s.id), s])), [students]);
  const unpaid = payments.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + Number(p.amount), 0);
  const monthIncome = payments.filter(p => p.status === 'paid' && p.category !== 'Налог').reduce((sum, p) => sum + Number(p.amount), 0);

  // Sync the complete current React snapshot instead of letting individual state effects
  // race through localStorage. This prevents status changes/deletions from being overwritten.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__tmRequestCloudSync) {
      window.__tmRequestCloudSync({ students, lessons, homework, payments });
    }
  }, [students, lessons, homework, payments]);

  function addStudent(data) {
    setStudents(prev => [...prev, { ...data, id: crypto.randomUUID() }]);
    setStudentModal(false);
  }

  function updateStudent(id, patch) {
    setStudents(prev => prev.map(s => String(s.id) === String(id) ? { ...s, ...patch } : s));
    setEditStudent(null);
  }

  function addLesson(data) {
    const student=studentMap[String(data.studentId)]; if (!student) return {error:'Сначала добавьте ученика'};
    const duration=Number(data.duration||getStudentDuration(student,data.subject)||60); const idBase=crypto.randomUUID();
    const baseDate=new Date((data.date||isoToday)+'T00:00:00'); const repeatWeekly=!!data.repeatWeekly;
    if(repeatWeekly && !(data.repeatDays?.length)) return {error:'Выберите хотя бы один день недели'};
    const repeatUntil=repeatWeekly?new Date((data.repeatUntil||localDateKey(addMonths(baseDate,1)))+'T00:00:00'):baseDate;
    const days=repeatWeekly?(data.repeatDays?.length?data.repeatDays.map(Number):[baseDate.getDay()]):[baseDate.getDay()]; const occurrences=[];
    const checkConflict=(date,time,dur)=>lessons.some(l=>{
      const d=Number(l.duration||studentMap[String(l.studentId)]?.duration||60);
      return l.date===date&&l.status!=='cancelled'&&intervalsOverlap(toMinutes(time),toMinutes(time)+dur,toMinutes(l.time),toMinutes(l.time)+d);
    });
    if(!repeatWeekly){
      if(checkConflict(data.date,data.time,duration)) return {error:'Это время занято, выберите другое'};
      occurrences.push({...data,id:idBase,date:data.date,duration,repeatWeekly:undefined,repeatDays:undefined,repeatUntil:undefined,dayTimes:undefined,dayDurations:undefined,recurrenceId:null});
    } else {
      // Each selected weekday gets its own series, so Tuesday and Friday can be deleted independently.
      const seriesByDay=new Map(days.map(day=>[day,crypto.randomUUID()]));
      for(let cursor=new Date(baseDate);cursor<=repeatUntil;cursor=addDays(cursor,1)){
        const day=cursor.getDay(); if(!days.includes(day))continue;
        const date=localDateKey(cursor); const dayTime=(data.dayTimes&&data.dayTimes[String(day)])||data.time||'16:00';
        const dayDuration=Number(data.dayDurations?.[String(day)]||duration);
        if(checkConflict(date,dayTime,dayDuration)) return {error:'Это время занято, выберите другое'};
        occurrences.push({...data,id:crypto.randomUUID(),date,time:dayTime,duration:dayDuration,repeatWeekly:undefined,repeatDays:undefined,repeatUntil:undefined,dayTimes:undefined,dayDurations:undefined,recurrenceId:seriesByDay.get(day),topic:'',homework:'',comment:'',nextPlan:''});
      }
    }
    const newPayments=occurrences.map(l=>({id:crypto.randomUUID(),lessonId:l.id,studentId:l.studentId,subject:l.subject,amount:getStudentPrice(student,l.subject),date:l.date,status:'unpaid',category:'Урок'}));
    setLessons(prev=>[...prev,...occurrences]); setPayments(prev=>[...prev,...newPayments]); setLessonModal(false); return {ok:true};
  }

  function updateLesson(id, patch) {
    setLessons(prev => prev.map(l => String(l.id) === String(id) ? { ...l, ...patch } : l));
    setPayments(prev => prev.map(p => {
      if (String(p.lessonId) !== String(id)) return p;
      const next = { ...p };
      const updatedStudentId = patch.studentId ?? next.studentId;
      next.studentId = updatedStudentId;
      next.subject = patch.subject ?? next.subject;
      next.amount = getStudentPrice(studentMap[String(updatedStudentId)], next.subject) || next.amount;
      next.date = patch.date ?? next.date;
      return next;
    }));
    if (Object.prototype.hasOwnProperty.call(patch, 'homework')) {
      const text = String(patch.homework || '').trim();
      const due = String(patch.homeworkDue || '').trim();
      const attachments = Array.isArray(patch.homeworkAttachments) ? patch.homeworkAttachments : [];
      setHomework(prev => {
        const linked = prev.find(h => h.lessonId === id);
        if (!text && !attachments.length) return linked ? prev.filter(h => String(h.id) !== String(linked.id)) : prev;
        const base = {
          studentId: patch.studentId ?? linked?.studentId ?? lessonStudentId(id),
          subject: patch.subject ?? linked?.subject ?? lessonSubject(id),
          text,
          due: due || linked?.due || '',
          attachments,
        };
        if (linked) return prev.map(h => String(h.id) === String(linked.id) ? { ...h, ...base, status: linked.status === 'done' ? 'done' : (base.due && base.due < localDateKey(new Date()) ? 'not_done' : (linked.status || 'pending')) } : h);
        return [...prev, { id: crypto.randomUUID(), lessonId: id, ...base, status: base.due && base.due < localDateKey(new Date()) ? 'not_done' : 'pending' }];
      });
    }
  }

  function deleteLesson(id, deleteFollowing=false) {
    const target = lessons.find(l => l.id === id);
    if (!target) return;
    const idsToDelete = deleteFollowing && target.recurrenceId
      ? lessons.filter(l => l.recurrenceId === target.recurrenceId && l.date >= target.date).map(l => l.id)
      : [id];
    setLessons(prev => prev.filter(l => !idsToDelete.includes(l.id)));
    setPayments(prev => prev.filter(p => !idsToDelete.includes(p.lessonId)));
    setHomework(prev => prev.filter(h => !idsToDelete.includes(h.lessonId)));
    setEditLesson(null);
  }

  function lessonStudentId(id) { return lessons.find(l => String(l.id) === String(id))?.studentId ?? null; }
  function lessonSubject(id) { return lessons.find(l => String(l.id) === String(id))?.subject ?? ''; }

  function addHomework(data) {
    const id = crypto.randomUUID();
    setHomework(prev => [...prev, { ...data, id, attachments: data.attachments || [] }]);
    if (data.lessonId) setLessons(prev => prev.map(l => String(l.id) === String(data.lessonId) ? { ...l, homework: data.text } : l));
    setHomeworkModal(false);
  }

  function updateHomework(id, patch) {
    const existing = homework.find(h => String(h.id) === String(id));
    const lessonId = existing?.lessonId || (String(id).startsWith('lesson-') ? String(id).slice(7) : null);
    if (existing) {
      setHomework(prev => prev.map(h => String(h.id) === String(id) ? { ...h, ...patch } : h));
    } else if (lessonId) {
      const lesson = lessons.find(l => String(l.id) === String(lessonId));
      if (lesson) {
        setHomework(prev => [...prev, { id: crypto.randomUUID(), lessonId: lesson.id, studentId: patch.studentId ?? lesson.studentId, subject: patch.subject ?? lesson.subject, text: patch.text ?? lesson.homework ?? '', due: patch.due ?? lesson.homeworkDue ?? '', status: patch.status ?? 'pending', attachments: patch.attachments ?? lesson.homeworkAttachments ?? [] }]);
      }
    }
    if (lessonId) {
      setLessons(prev => prev.map(l => String(l.id) === String(lessonId) ? { ...l, homework: patch.text ?? l.homework, homeworkDue: patch.due ?? l.homeworkDue, homeworkAttachments: patch.attachments ?? l.homeworkAttachments } : l));
    }
    setEditHomework(null);
  }

  function deleteStudent(id) {
    setStudents(prev => prev.filter(s => String(s.id) !== String(id)));
    setLessons(prev => prev.filter(l => String(l.studentId) !== String(id)));
    setHomework(prev => prev.filter(h => String(h.studentId) !== String(id)));
    setPayments(prev => prev.filter(p => String(p.studentId) !== String(id)));
    setSelectedStudent(null);
  }

  function exportBackup() {
    const payload = {
      app: 'Tutor Manager',
      version: '2.1.1',
      exportedAt: new Date().toISOString(),
      students,
      lessons,
      homework,
      payments
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tutor-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportByType(type) {
    const payloadMap = {
      students: { type: 'Ученики', exportedAt: new Date().toISOString(), students },
      homework: { type: 'Домашние задания', exportedAt: new Date().toISOString(), homework },
      finance: { type: 'Финансы', exportedAt: new Date().toISOString(), payments },
      all: { app: 'Tutor Manager', version: '2.1.0', exportedAt: new Date().toISOString(), students, lessons, homework, payments }
    };
    const payload = payloadMap[type] || payloadMap.all;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = type === 'all' ? 'backup' : type;
    a.download = `tutor-manager-${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.students) || !Array.isArray(data.lessons) || !Array.isArray(data.homework) || !Array.isArray(data.payments)) throw new Error('Некорректный файл резервной копии');
        setImportConfirmData(data);
      } catch {
        setImportMessage('Не удалось восстановить данные из файла. Проверьте резервную копию.');
      } finally {
        setImportInputKey(x => x + 1);
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function confirmImport() {
    if (!importConfirmData) return;
    const data=importConfirmData;
    setStudents(data.students); setLessons(data.lessons); setHomework(data.homework); setPayments(data.payments);
    setSelectedStudent(null); setPage('dashboard'); setImportConfirmData(null); setImportMessage('Данные успешно восстановлены.');
  }

  const go = (p) => { setPage(p); setSidebarOpen(false); };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"><GraduationCap size={22} /></div>
          <div><b>Tutor Manager</b><span>личный кабинет</span></div>
        </div>
        <nav>{nav.map(([id, label, Icon]) => (
          <button key={id} className={page === id ? 'active' : ''} onClick={() => go(id)}>
            <Icon size={19} /><span>{label}</span>
          </button>
        ))}</nav>
        <div className="sidebar-footer"><div>Версия 2.0.6 • облачные данные</div><div className="backup-tools"><button type="button" className="backup-btn" onClick={exportBackup}><Download size={14} /> Экспорт</button><select className="backup-select" defaultValue="all" onChange={e=>exportByType(e.target.value)}><option value="all">Экспортировать…</option><option value="students">Только ученики</option><option value="homework">Только ДЗ</option><option value="finance">Только финансы</option></select><label className="backup-btn"><Upload size={14} /> Импорт<input key={importInputKey} type="file" accept="application/json,.json" onChange={importBackup} /></label><button type="button" className="backup-btn" onClick={() => window.__tmLogout?.()}>Выйти</button></div></div>
      </aside>

      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
          <div>
            <h1>{nav.find(x => x[0] === page)?.[1] || 'Главная'}</h1>
            <span className="date">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </header>

        <div className="content">
          {page === 'dashboard' && <Dashboard
            students={students}
            lessons={lessons}
            homework={homework}
            payments={payments}
            studentMap={studentMap}
            onLessonUpdate={updateLesson}
            onAddLesson={() => setLessonModal(true)}
            onHomework={() => setHomeworkModal(true)}
            onStudent={(id) => { setSelectedStudent(id); setPage('students'); }}
          />}
          {page === 'students' && <StudentsPage
            students={students}
            lessons={lessons}
            homework={homework}
            payments={payments}
            studentMap={studentMap}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
            onAdd={() => setStudentModal(true)}
            onDelete={deleteStudent}
            onEditStudent={setEditStudent}
          />}
          {page === 'schedule' && <SchedulePage
            students={students}
            lessons={lessons}
            studentMap={studentMap}
            onAdd={() => setLessonModal(true)}
            onUpdate={updateLesson}
            onEdit={setEditLesson}
          />}
          {page === 'homework' && <HomeworkPage
            homework={homework}
            setHomework={setHomework}
            students={students}
            lessons={lessons}
            setLessons={setLessons}
            onAdd={() => setHomeworkModal(true)}
            onEdit={setEditHomework}
          />}
          {page === 'finance' && <FinancePage
            payments={payments}
            setPayments={setPayments}
            students={students}
            lessons={lessons}
            monthIncome={monthIncome}
            unpaid={unpaid}
            onAdd={() => setPaymentModal(true)}
          />}
        </div>
      </main>

      {studentModal && <StudentModal onClose={() => setStudentModal(false)} onSave={addStudent} />}
      {editStudent && <StudentModal initial={editStudent} title="Редактировать ученика" onClose={() => setEditStudent(null)} onSave={(patch) => updateStudent(editStudent.id, patch)} isEdit />}
      {lessonModal && <LessonModal students={students} onClose={() => setLessonModal(false)} onSave={addLesson} />}
      {importConfirmData&&<div className="delete-confirm global-confirm"><strong>Восстановить данные из файла?</strong><span>Текущие данные в приложении будут заменены данными из резервной копии.</span><div className="modal-actions"><button type="button" className="ghost" onClick={()=>setImportConfirmData(null)}>Отмена</button><button type="button" className="primary" onClick={confirmImport}>Восстановить</button></div></div>}
      {importMessage&&<div className="inline-message"><span>{importMessage}</span><button type="button" onClick={()=>setImportMessage('')}><X size={15}/></button></div>}
      {editLesson && <LessonEditModal lesson={editLesson} students={students} lessons={lessons} onClose={() => setEditLesson(null)} onSave={(patch) => { updateLesson(editLesson.id, patch); setEditLesson(null); }} onDelete={deleteLesson} />}
      {homeworkModal && <HomeworkModal students={students} onClose={() => setHomeworkModal(false)} onSave={addHomework} />}
      {editHomework && <HomeworkModal students={students} initial={editHomework} title="Редактировать домашнее задание" isEdit onClose={() => setEditHomework(null)} onSave={(patch) => updateHomework(editHomework.id, patch)} />}
      {paymentModal && <PaymentModal students={students} onClose={() => setPaymentModal(false)} onSave={(data) => { setPayments(prev => [...prev, { ...data, id: crypto.randomUUID() }]); setPaymentModal(false); }} />}
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }) {
  return <div className="stat card"><div className="stat-icon"><Icon size={20} /></div><div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div></div>;
}

function Dashboard({ students, lessons, homework, payments, studentMap, onLessonUpdate, onAddLesson, onHomework, onStudent }) {
  const todayLessons = lessons.filter(l => l.date === isoToday).sort((a, b) => a.time.localeCompare(b.time));
  const pending = homework.filter(h => h.status !== 'done' && h.status !== 'archived');
  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 7);
  const weekUnpaid = payments.filter(p => { const d = new Date(p.date + 'T00:00:00'); return p.status === 'unpaid' && d >= weekStart && d < weekEnd; }).reduce((sum, p) => sum + Number(p.amount), 0);

  return <div className="page-grid">
    <div className="stats-grid">
      <Stat icon={Users} label="Активные ученики" value={students.length} hint="в базе сейчас" />
      <Stat icon={CalendarDays} label="Уроков проведено" value={lessons.filter(l => l.status === 'completed').length} hint="за всё время" />
      <Stat icon={ClipboardList} label="Домашек ждут" value={pending.length} hint="нужно проверить" />
      <Stat icon={CircleDollarSign} label="Не оплачено" value={formatMoney(weekUnpaid)} hint="за текущую неделю" />
      <Stat icon={CircleDollarSign} label="Доход за всё время" value={formatMoney(payments.filter(p => p.status === 'paid' && p.category !== 'Налог').reduce((sum, p) => sum + Number(p.amount), 0))} hint="по отмеченным оплатам" />
    </div>
    <div className="two-col">
      <section className="card section-card">
        <div className="section-head"><div><h2>Сегодня</h2><span>{todayLessons.length} занятия</span></div><button className="ghost" onClick={onAddLesson}><Plus size={16} /> Добавить</button></div>
        <div className="lesson-list">{todayLessons.map(l => <LessonRow key={l.id} lesson={l} student={studentMap[String(l.studentId)]} onStudent={onStudent} onUpdate={onLessonUpdate} />)}{!todayLessons.length && <Empty text="На сегодня уроков нет" />}</div>
      </section>
      <section className="card section-card">
        <div className="section-head"><div><h2>Домашние задания</h2><span>что нужно проверить</span></div><button className="ghost" onClick={onHomework}><Plus size={16} /> Добавить</button></div>
        {pending.slice(0, 5).map(h => <div className="homework-mini" key={h.id}><div className="checkbox-dot" /><div><b>{studentMap[String(h.studentId)]?.name}</b><span>{h.subject} • {h.text || 'Задание во вложении'}</span></div><small>{h.due ? `до ${formatDate(h.due)}` : 'без срока'}</small></div>)}{!pending.length && <Empty text="Все домашки выполнены 🎉" />}
      </section>
    </div>
  </div>;
}

function LessonRow({ lesson, student, onStudent, onUpdate }) {
  return <div className="lesson-row">
    <div className="lesson-time">{lesson.time} – {formatEndTime(lesson.time, lesson.duration || student?.duration || 60)}<small>{lesson.duration || student?.duration || 60} мин</small></div>
    <button className="lesson-person" onClick={() => onStudent(student?.id)}><div className="avatar">{initials(student?.name)}</div><div><b>{student?.name || 'Удалённый ученик'}</b><span>{lesson.subject || student?.subject}</span></div></button>
    <div className="lesson-topic">{lesson.topic || <span className="muted">Тема не указана</span>}</div>
    <select value={lesson.status} onChange={e => onUpdate(lesson.id, { status: e.target.value })} className={`status status-${lesson.status}`}>
      <option value="planned">Запланирован</option><option value="completed">Проведён</option><option value="cancelled">Отменён</option>
    </select>
  </div>;
}

function StudentsPage({ students, lessons, homework, payments, studentMap, selectedStudent, setSelectedStudent, onAdd, onDelete, onEditStudent }) {
  const [q, setQ] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const filtered = students.filter(s => `${s.name} ${s.subject} ${s.secondSubject || ''}`.toLowerCase().includes(q.toLowerCase()));
  const s = students.find(x => String(x.id) === String(selectedStudent));

  if (s) {
    const ls = lessons.filter(l => String(l.studentId) === String(s.id)).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    const hs = homework.filter(h => String(h.studentId) === String(s.id));
    const paid = payments.filter(p => String(p.studentId) === String(s.id) && p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
    const debt = payments.filter(p => String(p.studentId) === String(s.id) && p.status === 'unpaid').reduce((sum, p) => sum + Number(p.amount), 0);

    return <div className="page-grid">
      <button className="back-link" onClick={() => setSelectedStudent(null)}><ChevronLeft size={17} /> Все ученики</button>
      <section className="card student-hero">
        <div className="avatar big">{initials(s.name)}</div>
        <div className="student-main"><h2>{s.name}</h2><div className="pills"><span>{s.subject}</span>{s.secondSubject && <span>{s.secondSubject}</span>}<span>{s.grade} класс</span><span>{formatMoney(s.price)} / {s.subject}</span>{s.secondSubject&&<span>{formatMoney(s.priceSecond||0)} / {s.secondSubject}</span>}<span>{s.duration} мин</span></div>{s.notes && <p>{s.notes}</p>}</div>
        <div className="student-actions"><button className="ghost" onClick={() => onEditStudent(s)}><GraduationCap size={16} /> Редактировать</button><button className="danger" onClick={() => setDeleteOpen(true)}><Trash2 size={16} /> Удалить</button></div>{deleteOpen&&<div className="delete-confirm"><strong>Удалить ученика?</strong><span>Все связанные занятия, ДЗ и финансовые записи тоже будут удалены.</span><div className="modal-actions"><button type="button" className="ghost" onClick={()=>setDeleteOpen(false)}>Отмена</button><button type="button" className="danger" onClick={()=>{setDeleteOpen(false);onDelete(s.id);}}><Trash2 size={16}/> Подтвердить удаление</button></div></div>}
      </section>
      <div className="two-col">
        <section className="card section-card"><div className="section-head"><div><h2>История занятий</h2><span>{ls.length} записей</span></div></div>{ls.map(l => <div className="history-row" key={l.id}><div className="history-date"><b>{formatDate(l.date)}</b><small>{l.time} • {l.duration || s.duration || 60} мин</small></div><div><b>{l.topic || 'Без темы'}</b><small>{l.homework ? `Д/з: ${l.homework}` : 'Без домашнего задания'}</small></div><Badge status={l.status} /></div>)}{!ls.length && <Empty text="Занятий пока нет" />}</section>
        <section className="card section-card"><div className="section-head"><div><h2>Сводка</h2><span>по ученику</span></div></div><div className="detail-list"><div><span>Выполнено домашних заданий</span><b>{hs.filter(h => h.status === 'done').length} / {hs.length}</b></div><div><span>Получено</span><b>{formatMoney(paid)}</b></div><div><span>Долг</span><b className={debt ? 'danger-text' : ''}>{formatMoney(debt)}</b></div><div><span>Номер ученика</span><b>{s.phone || '—'}</b></div><div><span>Номер родителя</span><b>{s.parentPhone || '—'}</b></div><div><span>Ссылка на Яндекс Телемост</span>{s.telemostLink ? <a className="telemost-link" href={s.telemostLink} target="_blank" rel="noreferrer">{s.telemostLink}</a> : <b>—</b>}</div></div></section>
      </div>
    </div>;
  }

  return <div className="page-grid">
    <div className="toolbar"><div className="search"><Search size={18} /><input placeholder="Поиск ученика..." value={q} onChange={e => setQ(e.target.value)} /></div><button className="primary" onClick={onAdd}><Plus size={18} /> Добавить ученика</button></div>
    <section className="card table-card"><div className="table-head students-head"><span>Ученик</span><span>Класс</span><span>Стоимость</span></div>{filtered.map(s => { return <button className="table-row students-row" key={s.id} onClick={() => setSelectedStudent(s.id)}><div className="user-cell"><div className="avatar">{initials(s.name)}</div><div><b>{s.name}</b><small className="student-subjects">{s.secondSubject ? `${s.subject} • ${s.secondSubject}` : s.subject}</small></div></div><span>{s.grade}</span><span>{formatMoney(s.price)}</span></button>; })}{!filtered.length && <Empty text="Ничего не найдено" />}</section>
  </div>;
}

function SchedulePage({ students, lessons, studentMap, onAdd, onUpdate, onEdit }) {
  const [week,setWeek]=useState(startOfWeek(new Date())); const [monthValue,setMonthValue]=useState(localMonthKey(new Date()));
  const days=Array.from({length:7},(_,i)=>addDays(week,i));
  const shift=n=>{const w=addDays(week,n);setWeek(w);setMonthValue(localMonthKey(w));};
  const changeMonth=v=>{setMonthValue(v);const [y,m]=v.split('-').map(Number);setWeek(startOfWeek(new Date(y,m-1,1)));};
  return <div className="page-grid"><div className="schedule-toolbar"><div className="month-picker"><label>Месяц</label><input type="month" value={monthValue} onChange={e=>changeMonth(e.target.value)}/></div><div className="week-controls"><button className="ghost week-arrow" onClick={()=>shift(-7)}><ChevronLeft size={17}/></button><button className="ghost current-week" onClick={()=>{const w=startOfWeek(new Date());setWeek(w);setMonthValue(localMonthKey(new Date()));}}>Текущая неделя</button><button className="ghost week-arrow" onClick={()=>shift(7)}><ChevronRight size={17}/></button></div><button className="primary" onClick={onAdd} disabled={!students.length}><Plus size={18}/> Новый урок</button></div>{!students.length?<section className="card section-card"><Empty text="Сначала добавьте ученика"/></section>:<div className="week-grid">{days.map(day=>{const date=localDateKey(day),items=lessons.filter(l=>l.date===date).sort((a,b)=>a.time.localeCompare(b.time)),weekend=day.getDay()===0||day.getDay()===6;return <div className={`day-column ${weekend?'weekend':''}`} key={date}><div className={`day-head ${date===isoToday?'today':''}`}><b>{day.toLocaleDateString('ru-RU',{weekday:'short'})}</b><strong>{day.getDate()}</strong><small>{day.toLocaleDateString('ru-RU',{month:'long'})}</small></div>{items.map(l=>{const d=l.duration||studentMap[String(l.studentId)]?.duration||60;return <div className="schedule-card" key={l.id} onClick={()=>onEdit(l)}><div className="schedule-time">{l.time} – {formatEndTime(l.time,d)}</div><b>{studentMap[String(l.studentId)]?.name||'Удалённый ученик'}</b><small className="schedule-subject">{l.subject||studentMap[String(l.studentId)]?.subject||'—'}</small><span>{l.topic||'Тема не указана'}</span><select className={`schedule-status status-${l.status}`} value={l.status} onClick={e=>e.stopPropagation()} onChange={e=>onUpdate(l.id,{status:e.target.value})}><option value="planned">Запланирован</option><option value="completed">Проведён</option><option value="cancelled">Отменён</option></select></div>})}</div>})}</div>}</div>;
}

function HomeworkPage({ homework, setHomework, students, lessons, setLessons, onAdd, onEdit }) {
  const map=Object.fromEntries(students.map(s=>[String(s.id),s]));
  const [attachmentViewer, setAttachmentViewer] = useState(null);
  const linkedFromLessons=lessons.filter(l=>String(l.homework||'').trim() || (Array.isArray(l.homeworkAttachments) && l.homeworkAttachments.length>0)).map(l=>({
    id:`lesson-${l.id}`, lessonId:l.id, studentId:l.studentId, subject:l.subject, text:l.homework || '',
    due:l.homeworkDue||'', status:l.homeworkDue && l.homeworkDue < localDateKey(new Date()) ? 'not_done' : 'pending',
    attachments:l.homeworkAttachments||[]
  }));
  const rows=[...homework];
  linkedFromLessons.forEach(h=>{ if(!rows.some(x=>String(x.lessonId||'')===String(h.lessonId))) rows.push(h); });
  const [tab,setTab]=useState('current');
  const [studentFilter,setStudentFilter]=useState('all');
  const [subjectFilter,setSubjectFilter]=useState('all');
  const [deleteTarget,setDeleteTarget]=useState(null);
  const filteredRows=rows.filter(h=>{
    const byStudent=studentFilter==='all'||String(h.studentId)===String(studentFilter);
    const bySubject=subjectFilter==='all'||h.subject===subjectFilter;
    return byStudent&&bySubject;
  });
  const archived=filteredRows.filter(h=>h.status==='archived');
  const current=filteredRows.filter(h=>h.status!=='archived');
  const visible=tab==='current'?current:archived;

  function nextStatus(status){
    return status==='pending'?'not_done':status==='not_done'?'done':'pending';
  }

  function toggle(h){
    const next=nextStatus(h.status);
    const real=homework.find(x=>String(x.id)===String(h.id));
    if(real){
      setHomework(prev=>prev.map(x=>String(x.id)===String(h.id)?{...x,status:next}:x));
      return;
    }
    // Legacy/synthetic lesson homework: materialize it as a normal homework row so the status persists in the cloud.
    if(h.lessonId){
      setHomework(prev=>[...prev,{ id:crypto.randomUUID(), lessonId:h.lessonId, studentId:h.studentId, subject:h.subject, text:h.text, due:h.due||'', status:next, attachments:h.attachments||[] }]);
    }
  }

  function archiveDone(){
    setHomework(prev=>prev.map(h=>h.status==='done'?{...h,status:'archived'}:h));
  }

  function requestDelete(h){ setDeleteTarget(h); }

  function confirmDelete(){
    const h=deleteTarget;
    if(!h) return;
    setHomework(prev=>prev.filter(x=>String(x.id)!==String(h.id)));
    if(h.lessonId){
      setLessons(prev=>prev.map(l=>String(l.id)===String(h.lessonId)?{...l,homework:'',homeworkDue:'',homeworkAttachments:[]}:l));
    }
    setDeleteTarget(null);
  }

  const statusText=h=>h.status==='done'?'Выполнено':h.status==='not_done'?'Не выполнено':h.status==='archived'?'В архиве':'Ожидает';
  const subjects=[...new Set(rows.map(h=>h.subject).filter(Boolean))];
  return <div className="page-grid">
    <section className="card section-card homework-action-card"><div className="section-head"><div><h2>Добавить домашнее задание</h2><span>можно добавить отдельно от урока</span></div><button className="primary" onClick={onAdd} disabled={!students.length}><Plus size={18}/> Добавить домашнее задание</button></div></section>
    <div className="stats-grid compact"><Stat icon={ClipboardList} label="Всего заданий" value={rows.length} hint="в базе"/><Stat icon={CheckCircle2} label="Выполнено" value={rows.filter(h=>h.status==='done').length} hint="закрытых задач"/><Stat icon={Clock3} label="Ожидают" value={rows.filter(h=>h.status==='pending').length} hint="нужно проверить"/></div>
    <section className="card section-card"><div className="section-head homework-list-head"><div><h2>Домашние задания</h2><span>{tab==='current'?'актуальные задания':'архив заданий'}</span></div><div className="homework-tools"><div className="segmented"><button className={tab==='current'?'active':''} onClick={()=>setTab('current')}>Текущие</button><button className={tab==='archive'?'active':''} onClick={()=>setTab('archive')}>Архив</button></div><button className="ghost" onClick={archiveDone} disabled={!rows.some(h=>h.status==='done')}>Архивировать выполненные</button></div></div>
      <div className="filters-row"><select value={studentFilter} onChange={e=>setStudentFilter(e.target.value)}><option value="all">Все ученики</option>{students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><select value={subjectFilter} onChange={e=>setSubjectFilter(e.target.value)}><option value="all">Все предметы</option>{subjects.map(s=><option key={s}>{s}</option>)}</select></div>
      {visible.map(h=><div className={`hw-row ${h.status==='done'||h.status==='archived'?'done':''}`} key={h.id}>
        <div onClick={()=>toggle(h)}><b>{map[String(h.studentId)]?.name||'Удалённый ученик'}</b><span>{h.subject} • {h.text || 'Задание во вложении'}</span>{(h.attachments?.length>0)&&<div className="hw-attachments-mini">{h.attachments.slice(0,3).map((a,i)=>a.type?.startsWith('image/')?<button type="button" className="attachment-thumb" key={i} onClick={e=>{e.stopPropagation();setAttachmentViewer(a);}}><img src={a.data || a.url} alt={a.name||'Вложение'}/></button>:<button type="button" className="file-chip file-chip-button" key={i} onClick={e=>{e.stopPropagation();setAttachmentViewer(a);}}>{a.name}</button>)}</div>}</div>
        <small onClick={()=>toggle(h)} className={h.due && h.due < localDateKey(new Date()) && h.status!=='done' ? 'overdue' : ''}>{h.due?`до ${formatDate(h.due)}`:'без срока'}</small>
        <span onClick={()=>toggle(h)} className={`hw-status ${h.status==='done'||h.status==='archived'?'success-text':h.status==='not_done'?'danger-text':'pending-text'}`}>{statusText(h)}</span>
        <div className="hw-quick-actions"><button type="button" className="icon-action" title="Редактировать" onClick={()=>onEdit(h)}>✎</button><button type="button" className="icon-action danger-icon" title="Удалить" onClick={()=>requestDelete(h)}><Trash2 size={15}/></button></div>
      </div>)}
      {!visible.length&&<Empty text={tab==='current'?'Нет заданий по выбранным фильтрам':'Архив пуст'}/>}</section>
      {deleteTarget&&<div className="delete-confirm homework-delete-confirm"><strong>Удалить домашнее задание?</strong><span>Действие нельзя отменить.</span><div className="modal-actions"><button type="button" className="ghost" onClick={()=>setDeleteTarget(null)}>Отмена</button><button type="button" className="danger" onClick={confirmDelete}><Trash2 size={16}/> Подтвердить удаление</button></div></div>}
      {attachmentViewer&&<AttachmentViewer attachment={attachmentViewer} onClose={()=>setAttachmentViewer(null)} />}
  </div>;
}
function FinancePage({ payments, setPayments, students, lessons, onAdd }) {
  const map = Object.fromEntries(students.map(s => [String(s.id), s]));
  const [periodOpen, setPeriodOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [from, setFrom] = useState(isoToday);
  const [to, setTo] = useState(isoToday);
  const [taxRate, setTaxRate] = usePersistentState('tm_tax_rate', '0');

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 7);
  const weekPayments = payments
    .filter(p => {
      const d = new Date(p.date + 'T00:00:00');
      return d >= weekStart && d < weekEnd && p.category !== 'Налог';
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const weekLessonPayments = weekPayments.filter(p => p.category !== 'Другое');
  const weekGross = weekLessonPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const weekUnpaid = weekLessonPayments.filter(p => p.status === 'unpaid').reduce((s, p) => s + Number(p.amount), 0);
  const weekRemaining = lessons.filter(l => {
    const d = new Date(l.date + 'T00:00:00');
    return d >= weekStart && d < weekEnd && l.status === 'planned';
  }).length;

  const currentMonth = isoToday.slice(0, 7);
  const monthGross = payments
    .filter(p => String(p.date).startsWith(currentMonth) && p.category !== 'Налог' && p.category !== 'Другое' && p.status === 'paid')
    .reduce((s, p) => s + Number(p.amount), 0);

  const rate = Math.max(0, Math.min(100, Number(taxRate) || 0));
  const weekTax = weekGross * rate / 100;
  const monthTax = monthGross * rate / 100;
  const weekNet = weekGross - weekTax;
  const monthNet = monthGross - monthTax;

  const periodLessons = lessons.filter(l => l.date >= from && l.date <= to && l.status !== 'cancelled');
  const periodTotal = periodLessons.reduce((s, l) => s + getStudentPrice(map[l.studentId], l.subject), 0);

  const toggle = id => setPayments(prev => prev.map(p => String(p.id) === String(id) ? { ...p, status: p.status === 'paid' ? 'unpaid' : 'paid' } : p));
  const requestDelete = (payment) => setDeleteTarget(payment);
  const confirmDelete = () => {
    if (!deleteTarget) return;
    setPayments(prev => prev.filter(p => String(p.id) !== String(deleteTarget.id)));
    setDeleteTarget(null);
  };

  return <div className="page-grid">
    <section className="card section-card finance-action-card">
      <div className="section-head">
        <div><h2>Добавить оплату</h2><span>можно добавить финансовую запись вручную</span></div>
        <button className="primary" onClick={onAdd} disabled={!students.length}><Plus size={18}/> Добавить оплату</button>
      </div>
    </section>

    <div className="stats-grid finance-stats">
      <Stat icon={CircleDollarSign} label="Доход за неделю" value={formatMoney(weekNet)} hint={`после налога ${rate}%`} />
      <Stat icon={Clock3} label="Не оплачено" value={formatMoney(weekUnpaid)} hint="за текущую неделю" />
      <Stat icon={CalendarDays} label="Занятий запланировано" value={weekRemaining} hint="на неделю" />
      <Stat icon={CircleDollarSign} label="Доход за месяц" value={formatMoney(monthNet)} hint={`после налога ${rate}%`} />
    </div>

    <section className="card section-card tax-card">
      <div className="section-head">
        <div><h2>Налог</h2><span>укажите процент, который нужно вычесть из дохода</span></div>
        <div className="tax-settings">
          <label className="tax-rate-label">Ставка налога, % <input className="tax-input" type="number" min="0" max="100" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && String(taxRate).trim() === '') { e.preventDefault(); setTaxRate('0'); } }}/></label>
          <div className="tax-calculated">За месяц: <b>{formatMoney(monthTax)}</b></div>
        </div>
      </div>
    </section>

    <section className="card section-card period-card">
      <div className="section-head"><div><h2>Расчёт за период</h2><span>сумма занятий за выбранные даты</span></div><button className="ghost" onClick={()=>setPeriodOpen(v=>!v)}><CalendarDays size={16}/> {periodOpen?'Скрыть расчёт':'Рассчитать за период'}</button></div>
      {periodOpen&&<div className="period-panel"><label>С <input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>По <input type="date" value={to} min={from} onChange={e=>setTo(e.target.value)}/></label><div className="period-result"><span>{periodLessons.length} занятий за выбранный период</span><strong>{formatMoney(periodTotal)}</strong></div></div>}
    </section>

    <section className="card table-card">
      <div className="table-head finance-head"><span>Ученик</span><span>Дата</span><span>Сумма</span><span>Статус</span><span></span></div>
      {weekPayments.map(p=><div className="table-row finance-row" key={p.id} onClick={()=>toggle(p.id)}>
        <div className="user-cell"><div className="avatar">{initials(map[String(p.studentId)]?.name)}</div><b>{map[String(p.studentId)]?.name||'Удалённый ученик'}</b></div>
        <span>{formatDate(p.date)}</span>
        <span>{formatMoney(p.amount)}</span>
        <span className={p.status==='paid'?'success-text':'danger-text'}>{p.status==='paid'?'Оплачено':'Не оплачено'}</span>
        <button type="button" className="icon-action danger-icon finance-delete-btn" title="Удалить оплату" onClick={e=>{e.stopPropagation();requestDelete(p);}}><Trash2 size={15}/></button>
      </div>)}
      {!weekPayments.length&&<Empty text="В текущей неделе финансовых записей пока нет"/>}
      {deleteTarget&&<div className="delete-confirm finance-delete-confirm">
        <strong>Удалить финансовую запись?</strong>
        <span>Запись на {formatDate(deleteTarget.date)} на сумму {formatMoney(deleteTarget.amount)} будет удалена.</span>
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={()=>setDeleteTarget(null)}>Отмена</button>
          <button type="button" className="danger" onClick={confirmDelete}><Trash2 size={16}/> Подтвердить удаление</button>
        </div>
      </div>}
    </section>
  </div>;
}

function PaymentModal({ students, onClose, onSave }) {
  const [f,setF]=useState({studentId:students[0]?.id||'',subject:students[0]?.subject||SUBJECTS[0],date:isoToday,amount:students[0]?.price||0,status:'unpaid',category:'Урок'}); const bind=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const st=students.find(s=>String(s.id)===String(f.studentId)); const allowed=[st?.subject,st?.secondSubject].filter(Boolean);
  useEffect(()=>{if(st&&f.category==='Урок')setF(p=>({...p,amount:getStudentPrice(st,p.subject),subject:allowed.includes(p.subject)?p.subject:(allowed[0]||SUBJECTS[0])}));},[f.studentId,f.category,f.subject,students]);
  return <Modal title="Новая финансовая запись" onClose={onClose}><form onSubmit={e=>{e.preventDefault();if(Number(f.amount)<0)return;onSave({...f,studentId:f.category==='Урок'?f.studentId:null,amount:Number(f.amount)});}}><div className="form-grid"><label>Категория<select value={f.category} onChange={bind('category')}><option>Урок</option><option>Другое</option></select></label>{f.category==='Урок'&&<><label>Ученик<select value={f.studentId} onChange={bind('studentId')}>{students.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Предмет<select value={f.subject} onChange={e=>setF(p=>({...p,subject:e.target.value,amount:getStudentPrice(st,e.target.value)}))}>{(allowed.length?allowed:SUBJECTS).map(s=><option key={s}>{s}</option>)}</select></label></>}<label>Дата<input type="date" value={f.date} onChange={bind('date')}/></label><label>Сумма, ₽<input type="number" min="0" value={f.amount} onChange={bind('amount')}/></label><label>Статус<select value={f.status} onChange={bind('status')}><option value="unpaid">Не оплачено</option><option value="paid">Оплачено</option></select></label></div><div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>Отмена</button><button className="primary" type="submit">Добавить запись</button></div></form></Modal>;
}

function StudentModal({ onClose, onSave, initial, title = 'Новый ученик', isEdit = false }) {
  const [f,setF]=useState(() => initial ? {
    name: initial.name || '', subject: initial.subject || SUBJECTS[0], secondSubject: initial.secondSubject || '',
    grade: initial.grade || '', price: initial.price ?? '', priceSecond: initial.priceSecond ?? '',
    duration: initial.duration ?? '', durationSecond: initial.durationSecond ?? '',
    phone: initial.phone || '', parentPhone: initial.parentPhone || '', telemostLink: initial.telemostLink || '', notes: initial.notes || ''
  } : {name:'',subject:SUBJECTS[0],secondSubject:'',grade:'',price:'',priceSecond:'',duration:'',durationSecond:'',phone:'',parentPhone:'',telemostLink:'',notes:''});
  const bind=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const submit=e=>{
    e.preventDefault();
    if(!f.name.trim()||!f.grade.trim()||f.price===''||f.duration===''||(f.secondSubject&&(f.priceSecond===''||f.durationSecond===''))) return;
    onSave({...f,price:Number(f.price),priceSecond:f.secondSubject?Number(f.priceSecond):0,duration:Number(f.duration),durationSecond:f.secondSubject?Number(f.durationSecond):0});
  };
  return <Modal title={title} onClose={onClose}><form onSubmit={submit}><div className="form-grid">
    <label>Имя и фамилия*<input value={f.name} onChange={bind('name')} required/></label>
    <label>Предмет*<select value={f.subject} onChange={e=>setF(p=>({...p,subject:e.target.value,secondSubject:p.secondSubject===e.target.value?'':p.secondSubject}))} required>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select></label>
    <label>Второй предмет (необязательно)<select value={f.secondSubject} onChange={bind('secondSubject')}><option value="">Не выбран</option>{SUBJECTS.filter(s=>s!==f.subject).map(s=><option key={s}>{s}</option>)}</select></label>
    <label>Класс*<input value={f.grade} onChange={bind('grade')} required/></label>
    <label>Цена за урок, ₽*<input type="number" min="0" value={f.price} onChange={bind('price')} required/></label>
    {f.secondSubject&&<label>Цена 2-го предмета, ₽*<input type="number" min="0" value={f.priceSecond} onChange={bind('priceSecond')} required/></label>}
    <label>Длительность, мин*<input type="number" min="15" value={f.duration} onChange={bind('duration')} required/></label>
    {f.secondSubject&&<label>Длительность 2-го предмета, мин*<input type="number" min="15" value={f.durationSecond} onChange={bind('durationSecond')} required/></label>}
    <label>Номер ученика<input value={f.phone} onChange={bind('phone')}/></label>
    <label>Номер родителя<input value={f.parentPhone} onChange={bind('parentPhone')}/></label>
    <label className="wide">Ссылка на Яндекс Телемост<input type="url" value={f.telemostLink} onChange={bind('telemostLink')} placeholder="Вставьте ссылку на Телемост" /></label>
    <label className="wide">Заметки<textarea value={f.notes} onChange={bind('notes')} rows="3"/></label>
  </div><div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>Отмена</button><button className="primary" type="submit">{isEdit ? 'Сохранить изменения' : 'Добавить ученика'}</button></div></form></Modal>;
}

function LessonModal({ students, onClose, onSave }) {
  const [error,setError]=useState('');
  const ds=students[0];
  const [f,setF]=useState({studentId:ds?.id||'',subject:ds?.subject||SUBJECTS[0],date:isoToday,time:'16:00',duration:getStudentDuration(ds,ds?.subject)||60,repeatWeekly:false,repeatDays:[],repeatUntil:localDateKey(addMonths(new Date(),1)),dayTimes:{},dayDurations:{},topic:'',status:'planned'});
  useEffect(()=>{
    const st=students.find(s=>String(s.id)===String(f.studentId));
    if(st){
      const allowed=[st.subject,st.secondSubject].filter(Boolean);
      setF(p=>{const subject=allowed.includes(p.subject)?p.subject:(allowed[0]||SUBJECTS[0]);return {...p,subject,duration:getStudentDuration(st,subject)||60};});
    }
  },[f.studentId,students]);
  const bind=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const toggleDay=d=>setF(p=>{
    const key=String(d); const next=p.repeatDays.includes(d)?p.repeatDays.filter(x=>x!==d):[...p.repeatDays,d].sort((a,b)=>a-b);
    const dayTimes={...p.dayTimes}; const dayDurations={...p.dayDurations};
    if(next.includes(d)){ if(!dayTimes[key]) dayTimes[key]=p.time||'16:00'; if(!dayDurations[key]) dayDurations[key]=p.duration||60; }
    else { delete dayTimes[key]; delete dayDurations[key]; }
    return {...p,repeatDays:next,dayTimes,dayDurations};
  });
  const setDayTime=(d,time)=>setF(p=>({...p,dayTimes:{...p.dayTimes,[String(d)]:time}}));
  return <Modal title="Новое занятие" onClose={onClose}>
    <form onSubmit={e=>{e.preventDefault();const r=onSave({...f,studentId:f.studentId,duration:Number(f.duration),dayTimes:f.dayTimes,dayDurations:f.dayDurations});if(r?.error)setError(r.error);}}>
      <div className="form-grid">
        {error&&<div className="form-error wide">{error}</div>}
        <label>Ученик<select value={f.studentId} onChange={bind('studentId')}>{students.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
        <label className="wide">Ссылка на Яндекс Телемост<input value={students.find(s=>String(s.id)===String(f.studentId))?.telemostLink || ''} readOnly placeholder="Ссылка пока не указана" onClick={e=>{if(e.currentTarget.value) e.currentTarget.select();}} /></label>
        <label>Предмет<select value={f.subject} onChange={bind('subject')}>{(()=>{const st=students.find(s=>String(s.id)===String(f.studentId));const allowed=[st?.subject,st?.secondSubject].filter(Boolean);return (allowed.length?allowed:SUBJECTS).map(s=><option key={s}>{s}</option>);})()}</select></label>
        {!f.repeatWeekly&&<><label>Дата<input type="date" value={f.date} onChange={bind('date')}/></label><label>Время<input type="time" value={f.time} onChange={bind('time')}/></label></>}
        <label>Длительность, мин<input type="number" min="15" value={f.duration} onChange={bind('duration')}/></label>
        <div className="check-label wide"><span>Повторение</span><label className="inline-check"><input type="checkbox" checked={f.repeatWeekly} onChange={e=>setF(p=>({...p,repeatWeekly:e.target.checked}))}/> Повторять</label></div>
        {f.repeatWeekly&&<>
          <div className="weekday-picker wide"><span>Дни недели</span><div>{[[1,'Пн'],[2,'Вт'],[3,'Ср'],[4,'Чт'],[5,'Пт'],[6,'Сб'],[0,'Вс']].map(([d,l])=><button type="button" key={d} className={f.repeatDays.includes(d)?'day-chip active':'day-chip'} onClick={()=>toggleDay(d)}>{l}</button>)}</div></div>
          {f.repeatDays.map(d=>{const label={1:'Понедельник',2:'Вторник',3:'Среда',4:'Четверг',5:'Пятница',6:'Суббота',0:'Воскресенье'}[d];return <label className="day-time-field wide" key={d}>{label}<input type="time" value={f.dayTimes[String(d)]||'16:00'} onChange={e=>setDayTime(d,e.target.value)}/></label>;})}
        </>}
        <label>Повторять до<input type="date" min={isoToday} value={f.repeatUntil} onChange={bind('repeatUntil')}/></label>
        <label>Статус<select value={f.status} onChange={bind('status')}><option value="planned">Запланирован</option><option value="completed">Проведён</option><option value="cancelled">Отменён</option></select></label>
        {!f.repeatWeekly&&<label className="wide">Тема урока<input value={f.topic} onChange={bind('topic')} /></label>}
      </div>
      <div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>Отмена</button><button className="primary" type="submit">Добавить урок</button></div>
    </form>
  </Modal>;
}

function LessonEditModal({ lesson, students, lessons, onClose, onSave, onDelete }) {
  const student = students.find(s => String(s.id) === String(lesson.studentId));
  const [error, setError] = useState('');
  const [moving, setMoving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFollowing, setDeleteFollowing] = useState(false);
  const [f, setF] = useState({ ...lesson, duration: lesson.duration || getStudentDuration(student, lesson.subject) || 60 });
  const [attachmentViewer, setAttachmentViewer] = useState(null);
  const allowedSubjects = [student?.subject, student?.secondSubject].filter(Boolean);
  const bind = k => e => setF(prev => ({ ...prev, [k]: e.target.value }));
  const addHomeworkFiles = files => Promise.all([...files].map(file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res({name:file.name,type:file.type,data:r.result}); r.onerror = rej; r.readAsDataURL(file); }))).then(items => setF(prev => ({ ...prev, homeworkAttachments: [...(prev.homeworkAttachments || []), ...items] })));
  function submit(e) {
    e.preventDefault();
    const start = toMinutes(f.time);
    const end = start + Number(f.duration || 60);
    const conflict = lessons.some(l => l.id !== lesson.id && l.date === f.date && l.status !== 'cancelled' && intervalsOverlap(start, end, toMinutes(l.time), toMinutes(l.time) + Number(l.duration || students.find(s => String(s.id) === String(l.studentId))?.duration || 60)));
    if (conflict) { setError('Это время занято, выберите другое'); return; }
    onSave({ ...f, studentId: f.studentId, duration: Number(f.duration || 60) });
  }
  return <Modal title={moving ? 'Перенести занятие' : 'Редактировать занятие'} onClose={onClose}>
    <form onSubmit={submit}>
      {moving && <div className="move-note"><ArrowRightLeft size={16} /> Выберите новую дату и время. Связанная финансовая запись тоже будет перенесена.</div>}
      <div className="form-grid">
        {error && <div className="form-error wide">{error}</div>}
        <label>Ученик<select value={f.studentId} disabled>{students.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
        <label className="wide">Ссылка на Яндекс Телемост<input value={student?.telemostLink || ''} readOnly placeholder="Ссылка пока не указана" onClick={e=>{if(e.currentTarget.value) e.currentTarget.select();}} /></label>
        <label>Предмет<select value={f.subject} onChange={e=>setF(prev=>({...prev,subject:e.target.value,duration:getStudentDuration(student,e.target.value)||prev.duration||60}))}>{(allowedSubjects.length ? allowedSubjects : SUBJECTS).map(s => <option value={s} key={s}>{s}</option>)}</select></label>
        <label>Дата<input type="date" value={f.date} onChange={bind('date')} autoFocus={moving} /></label>
        <label>Время<input type="time" value={f.time} onChange={bind('time')} /></label>
        <label>Длительность, мин<input type="number" min="15" value={f.duration} onChange={bind('duration')} /></label>
        <label>Статус<select value={f.status} onChange={bind('status')}><option value="planned">Запланирован</option><option value="completed">Проведён</option><option value="cancelled">Отменён</option></select></label>
        <label className="wide">Тема урока<input value={f.topic || ''} onChange={bind('topic')} /></label>
        <label className="wide">Домашнее задание<input value={f.homework || ''} onChange={bind('homework')} />{String(f.homework||'').trim() && <div className="homework-due-inline"><span>Срок сдачи ДЗ</span><input type="date" value={f.homeworkDue || ''} onChange={bind('homeworkDue')} /></div>}</label>
        <label className="wide">Картинки и файлы к ДЗ<input type="file" accept="image/*,.pdf,.doc,.docx,.txt" multiple onChange={e=>addHomeworkFiles(e.target.files||[])} /></label>
        {f.homeworkAttachments?.length>0&&<div className="image-preview-grid wide">{f.homeworkAttachments.map((a,i)=>a.type?.startsWith('image/')?<button type="button" className="attachment-preview-button" key={i} onClick={()=>setAttachmentViewer(a)}><img src={a.data || a.url} alt={a.name||'Вложение'}/></button>:<button type="button" className="file-preview file-preview-button" key={i} onClick={()=>setAttachmentViewer(a)}>{a.name}</button>)}</div>}
        <label className="wide">Как прошёл урок<textarea value={f.comment || ''} onChange={bind('comment')} rows="3" /></label>
        <label className="wide">План на следующее занятие<textarea value={f.nextPlan || ''} onChange={bind('nextPlan')} rows="3" /></label>
      </div>
      {attachmentViewer&&<AttachmentViewer attachment={attachmentViewer} onClose={()=>setAttachmentViewer(null)} />}
      {deleteOpen && <div className="delete-confirm"><strong>Удалить занятие?</strong><span>Действие нельзя отменить.</span><label className="inline-check"><input type="checkbox" checked={deleteFollowing} onChange={e=>setDeleteFollowing(e.target.checked)} /> Удалить все последующие</label></div>}
      <div className="modal-actions">
        <button type="button" className="danger" onClick={() => { if(deleteOpen) { onDelete(lesson.id, deleteFollowing); } else setDeleteOpen(true); }}><Trash2 size={16} /> {deleteOpen ? 'Подтвердить удаление' : 'Удалить занятие'}</button>
        <button type="button" className="ghost" onClick={() => setMoving(v => !v)}><ArrowRightLeft size={16} /> {moving ? 'Отменить перенос' : 'Перенести занятие'}</button>
        <button type="button" className="ghost" onClick={onClose}>Закрыть</button>
        <button className="primary" type="submit">{moving ? 'Перенести занятие' : 'Сохранить изменения'}</button>
      </div>
    </form>
  </Modal>;
}

function HomeworkModal({ students, onClose, onSave, initial, title='Новое домашнее задание', isEdit=false }) {
  const [f,setF]=useState(() => initial ? { ...initial, studentId:initial.studentId, attachments:initial.attachments||[] } : {studentId:students[0]?.id||'',subject:students[0]?.subject||SUBJECTS[0],text:'',due:'',status:'pending',attachments:[]});
  const [attachmentViewer, setAttachmentViewer] = useState(null);
  const [attachmentDeleteTarget, setAttachmentDeleteTarget] = useState(null);
  useEffect(()=>{const st=students.find(s=>String(s.id)===String(f.studentId));if(st){const allowed=[st.subject,st.secondSubject].filter(Boolean);setF(p=>({...p,subject:allowed.includes(p.subject)?p.subject:(allowed[0]||SUBJECTS[0])}));}},[f.studentId,students]);
  const bind=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const addFiles=files=>Promise.all([...files].map(file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({name:file.name,type:file.type,data:r.result});r.onerror=rej;r.readAsDataURL(file)}))).then(items=>setF(p=>({...p,attachments:[...(p.attachments||[]),...items]})));
  const requestAttachmentDelete = attachment => { setAttachmentDeleteTarget(attachment); };
  const confirmAttachmentDelete = () => {
    const target = attachmentDeleteTarget;
    if (!target) return;
    setF(p => ({ ...p, attachments: (p.attachments || []).filter(a => a !== target && !(a.path && target.path && a.path === target.path)) }));
    setAttachmentDeleteTarget(null);
    setAttachmentViewer(null);
  };
  const hasContent = Boolean(String(f.text || '').trim() || (f.attachments || []).length);
  return <Modal title={title} onClose={onClose}>
    <form onSubmit={e=>{e.preventDefault();if(!hasContent||!f.studentId)return;onSave({...f,studentId:f.studentId});}}>
      <div className="form-grid">
        <label>Ученик (ФИО)*<select value={f.studentId} onChange={bind('studentId')}>{students.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
        <label>Предмет<select value={f.subject} onChange={bind('subject')}>{(()=>{const st=students.find(s=>String(s.id)===String(f.studentId));const a=[st?.subject,st?.secondSubject].filter(Boolean);return (a.length?a:SUBJECTS).map(s=><option key={s}>{s}</option>);})()}</select></label>
        <label className="wide">Домашнее задание<textarea value={f.text} onChange={bind('text')} rows="4" placeholder="Можно оставить пустым, если задание — только фотография или файл"/></label>
        <label>Срок сдачи<input type="date" value={f.due} onChange={bind('due')}/></label>
        <label>Статус<select value={f.status} onChange={bind('status')}><option value="pending">Ожидает</option><option value="not_done">Не выполнено</option><option value="done">Выполнено</option></select></label>
        <label className="wide">Картинки и файлы к заданию<input type="file" accept="image/*,.pdf,.doc,.docx,.txt" multiple onChange={e=>addFiles(e.target.files||[])}/></label>
        {f.attachments?.length>0&&<div className="image-preview-grid wide">{f.attachments.map((a,i)=>a.type?.startsWith('image/')?<button type="button" className="attachment-preview-button" key={i} onClick={()=>setAttachmentViewer(a)}><img src={a.data || a.url} alt={a.name||'Вложение'}/></button>:<button type="button" className="file-preview file-preview-button" key={i} onClick={()=>setAttachmentViewer(a)}>{a.name}</button>)}</div>}
        {!hasContent&&<div className="form-error wide">Добавьте текст или хотя бы одно вложение</div>}
      </div>
      <div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>Отмена</button><button className="primary" type="submit">{isEdit ? 'Сохранить изменения' : 'Добавить ДЗ'}</button></div>
    </form>
    {attachmentViewer&&<AttachmentViewer attachment={attachmentViewer} onClose={()=>setAttachmentViewer(null)} canDelete={isEdit} onDelete={requestAttachmentDelete} />}
    {attachmentDeleteTarget&&<div className="attachment-delete-confirm" role="dialog" aria-modal="true">
      <div className="attachment-delete-confirm-card">
        <strong>Удалить вложение?</strong>
        <span>{String(attachmentDeleteTarget?.type || '').startsWith('image/') ? 'Фотография' : 'Файл'} будет удалён из этого домашнего задания.</span>
        <div className="modal-actions"><button type="button" className="ghost" onClick={()=>setAttachmentDeleteTarget(null)}>Отмена</button><button type="button" className="danger" onClick={confirmAttachmentDelete}><Trash2 size={16}/> Удалить вложение</button></div>
      </div>
    </div>}
  </Modal>;
}

function AttachmentViewer({ attachment, onClose, canDelete=false, onDelete }) {
  const isImage = String(attachment?.type || '').startsWith('image/');
  const [resolvedUrl, setResolvedUrl] = useState(attachment?.data || attachment?.url || '');
  const [loading, setLoading] = useState(false);
  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      if (!resolvedUrl && attachment?.path) {
        setLoading(true);
        const { data, error } = await supabase.storage.from('homework-files').createSignedUrl(attachment.path, 3600);
        if (!cancelled && !error) setResolvedUrl(data?.signedUrl || '');
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return ()=>{cancelled=true;};
  },[attachment]);
  const url = resolvedUrl;
  return <div className="attachment-viewer-backdrop" onClick={onClose}>
    <div className="attachment-viewer" onClick={e=>e.stopPropagation()}>
      <div className="attachment-viewer-head"><b>{attachment?.name || 'Вложение'}</b><button type="button" className="icon-button" onClick={onClose}><X size={20}/></button></div>
      {isImage && url ? <div className="attachment-image-wrap"><img src={url} alt={attachment?.name || 'Вложение'}/></div> : <div className="attachment-file-body"><div className="file-viewer-icon">📄</div><strong>{attachment?.name || 'Файл'}</strong>{loading ? <span>Загрузка файла…</span> : <span>Файл нельзя просмотреть прямо в окне</span>}{url ? <a className="primary attachment-download" href={url} download={attachment?.name || 'file'} target="_blank" rel="noreferrer">Скачать файл</a> : <span className="muted">Файл ещё не загрузился в облако</span>}</div>}
      {isImage && !loading && !url && <div className="attachment-empty-state">Не удалось загрузить изображение</div>}
      {canDelete && <div className="attachment-viewer-bottom"><button type="button" className="danger" onClick={()=>onDelete?.(attachment)}><Trash2 size={16}/> Удалить {isImage ? 'фото' : 'файл'}</button></div>}
    </div>
  </div>;
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X size={20} /></button></div>{children}</div></div>;
}

function Badge({ status }) { return <span className={`badge badge-${status}`}>{status === 'completed' ? 'Проведён' : status === 'cancelled' ? 'Отменён' : 'Запланирован'}</span>; }
function Empty({ text }) { return <div className="empty">{text}</div>; }
function initials(name = '') { return name.split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase(); }
function getStudentPrice(student, subject) {
  if (!student) return 0;
  return subject && subject === student.secondSubject ? Number(student.priceSecond || 0) : Number(student.price || 0);
}
function getStudentDuration(student, subject) {
  if (!student) return 60;
  return subject && subject === student.secondSubject ? Number(student.durationSecond || student.duration || 60) : Number(student.duration || 60);
}
function formatMoney(value) { return RUB.format(Number(value) || 0); }
function toMinutes(t = '00:00') { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function formatEndTime(t, duration) { const total = (toMinutes(t) + Number(duration || 60)) % (24 * 60); return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; }
function intervalsOverlap(aStart, aEnd, bStart, bEnd) { return aStart < bEnd && bStart < aEnd; }
function formatDate(v) { return v ? new Date(v + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '—'; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
function startOfWeek(d) { const x = new Date(d); const day = x.getDay(); const diff = day === 0 ? -6 : 1 - day; x.setDate(x.getDate() + diff); x.setHours(0, 0, 0, 0); return x; }


function normalizeLocalDataForCloud() {
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const students = read('tm_students', seed.students);
  const lessons = read('tm_lessons', seed.lessons);
  const homework = read('tm_homework', seed.homework);
  const payments = read('tm_payments', seed.payments);
  const uuid = () => crypto.randomUUID();
  const studentMap = new Map();
  const studentsOut = students.map(s => { const id = uuid(); studentMap.set(String(s.id), id); return { ...s, id }; });
  const lessonMap = new Map();
  const recurrenceMap = new Map();
  const lessonsOut = lessons.map(l => {
    const id = uuid();
    lessonMap.set(String(l.id), id);
    let recurrenceId = null;
    if (l.recurrenceId) {
      const key = String(l.recurrenceId);
      recurrenceId = recurrenceMap.get(key) || uuid();
      recurrenceMap.set(key, recurrenceId);
    }
    return { ...l, id, recurrenceId, studentId: studentMap.get(String(l.studentId)) || l.studentId };
  });
  const homeworkOut = homework.map(h => ({ ...h, id: uuid(), studentId: studentMap.get(String(h.studentId)) || h.studentId, lessonId: h.lessonId ? (lessonMap.get(String(h.lessonId)) || h.lessonId) : null }));
  const paymentsOut = payments.map(pay => ({ ...pay, id: uuid(), studentId: pay.studentId != null ? (studentMap.get(String(pay.studentId)) || pay.studentId) : null, lessonId: pay.lessonId ? (lessonMap.get(String(pay.lessonId)) || pay.lessonId) : null }));
  return { students: studentsOut, lessons: lessonsOut, homework: homeworkOut, payments: paymentsOut, studentMap };
}

function toDbStudent(s, uid) { return { id: s.id, user_id: uid, name: s.name, student_phone: s.phone || null, parent_phone: s.parentPhone || null, telemost_link: s.telemostLink || null, subject: s.subject, second_subject: s.secondSubject || null, grade: s.grade || '', price_1: Number(s.price || 0), price_2: Number(s.priceSecond || 0), duration_1: Number(s.duration || 60), duration_2: Number(s.durationSecond || 60), notes: s.notes || null }; }
function toDbLesson(l, uid) { return { id: l.id, user_id: uid, student_id: l.studentId, series_id: l.recurrenceId || null, lesson_date: l.date, start_time: l.time, duration: Number(l.duration || 60), subject: l.subject, topic: l.topic || null, lesson_result: l.comment || null, next_plan: l.nextPlan || null, status: l.status === 'completed' ? 'Проведено' : l.status === 'cancelled' ? 'Отменено' : l.status === 'planned' ? 'Запланировано' : l.status === 'rescheduled' ? 'Перенесено' : l.status, repeat_enabled: false, repeat_until: null, repeat_day_of_week: null }; }
function toDbHomework(h, uid) { return { id: h.id, user_id: uid, student_id: h.studentId, lesson_id: h.lessonId || null, subject: h.subject, text: String(h.text || ''), deadline: h.due || null, status: h.status === 'done' ? 'Выполнено' : h.status === 'not_done' ? 'Не выполнено' : h.status === 'archived' ? 'Выполнено' : 'Ожидает', archived: h.status === 'archived' }; }
function toDbPayment(pay, uid) { return { id: pay.id, user_id: uid, student_id: pay.studentId || null, lesson_id: pay.lessonId || null, payment_date: pay.date, amount: Number(pay.amount || 0), category: pay.category || 'Урок', status: pay.status === 'paid' ? 'Оплачено' : 'Не оплачено', comment: pay.comment || null }; }
function fromDbStudent(s) { return { id: s.id, name: s.name, phone: s.student_phone || '', parentPhone: s.parent_phone || '', telemostLink: s.telemost_link || '', subject: s.subject, secondSubject: s.second_subject || '', grade: s.grade || '', price: Number(s.price_1 || 0), priceSecond: Number(s.price_2 || 0), duration: Number(s.duration_1 || 60), durationSecond: Number(s.duration_2 || 60), notes: s.notes || '' }; }
function fromDbLesson(l) { return { id: l.id, studentId: l.student_id, recurrenceId: l.series_id || null, date: l.lesson_date, time: String(l.start_time).slice(0,5), duration: Number(l.duration || 60), subject: l.subject, topic: l.topic || '', comment: l.lesson_result || '', nextPlan: l.next_plan || '', status: l.status === 'Проведено' ? 'completed' : l.status === 'Отменено' ? 'cancelled' : l.status === 'Перенесено' ? 'rescheduled' : 'planned' }; }
function fromDbHomework(h) { return { id: h.id, studentId: h.student_id, lessonId: h.lesson_id || null, subject: h.subject, text: h.text || '', due: h.deadline || '', status: h.archived ? 'archived' : h.status === 'Выполнено' ? 'done' : h.status === 'Не выполнено' ? 'not_done' : 'pending', attachments: [] }; }
function fromDbPayment(p) { return { id: p.id, studentId: p.student_id, lessonId: p.lesson_id, amount: Number(p.amount || 0), date: p.payment_date, status: p.status === 'Оплачено' ? 'paid' : 'unpaid', category: p.category || 'Урок', comment: p.comment || '' }; }

async function fetchCloudData(uid) {
  const tables = ['students','lessons','homework','payments','settings','homework_files'];
  const results = await Promise.all(tables.map(t => supabase.from(t).select('*').eq('user_id', uid)));
  const err = results.find(r => r.error)?.error;
  if (err) throw err;
  const fileRows = results[5].data || [];
  const homeworkRows = results[2].data.map(fromDbHomework);
  for (const f of fileRows) {
    const h = homeworkRows.find(x => String(x.id) === String(f.homework_id));
    if (!h) continue;
    const signed = await supabase.storage.from('homework-files').createSignedUrl(f.file_path, 3600);
    if (signed.error) continue;
    h.attachments = [...(h.attachments || []), { name: f.file_name, type: f.mime_type || '', url: signed.data.signedUrl, path: f.file_path, size: f.file_size || 0 }];
  }
  const lessonRows = results[1].data.map(fromDbLesson).map(l => { const h=homeworkRows.find(x=>String(x.lessonId||'')===String(l.id)); return h ? {...l, homework:h.text, homeworkDue:h.due, homeworkAttachments:h.attachments||[]} : l; });
  return { students: results[0].data.map(fromDbStudent), lessons: lessonRows, homework: homeworkRows, payments: results[3].data.map(fromDbPayment), taxRate: results[4].data[0]?.tax_percent ?? null };
}

async function dataUrlToBlob(dataUrl) {
  const [meta, data] = String(dataUrl).split(',');
  const mime = (meta.match(/data:([^;]+)/) || [,'application/octet-stream'])[1];
  const binary = atob(data || '');
  const bytes = new Uint8Array(binary.length);
  for (let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function pushAllCloud(uid, snapshot = null) {
  const read = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  let students = snapshot?.students ?? read('tm_students');
  let lessons = snapshot?.lessons ?? read('tm_lessons');
  let homework = snapshot?.homework ?? read('tm_homework');
  let payments = snapshot?.payments ?? read('tm_payments');
  if (snapshot?.students) localStorage.setItem('tm_students', JSON.stringify(students));
  if (snapshot?.lessons) localStorage.setItem('tm_lessons', JSON.stringify(lessons));
  if (snapshot?.homework) localStorage.setItem('tm_homework', JSON.stringify(homework));
  if (snapshot?.payments) localStorage.setItem('tm_payments', JSON.stringify(payments));
  const taxRaw = snapshot?.taxRate !== undefined && snapshot?.taxRate !== null
    ? snapshot.taxRate
    : localStorage.getItem('tm_tax_rate');
  const taxPercent = taxRaw === null || String(taxRaw).trim() === '' ? 0 : Number(taxRaw) || 0;
  const isUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  if (students.some(s=>!isUuid(s.id))) throw new Error('Некорректный ID ученика. Обновите страницу и попробуйте снова.');
  const studentIds=new Set(students.map(s=>String(s.id)));
  // Remove only structurally broken dependent records. They must not block saving all other data.
  lessons=lessons.filter(l=>isUuid(l.id)&&isUuid(l.studentId)&&studentIds.has(String(l.studentId)));
  const lessonIds=new Set(lessons.map(l=>String(l.id)));
  homework=homework.filter(h=>isUuid(h.id)&&isUuid(h.studentId)&&studentIds.has(String(h.studentId))).map(h=>h.lessonId&&lessonIds.has(String(h.lessonId))?h:{...h,lessonId:null});
  payments=payments.filter(p=>isUuid(p.id)&&(!p.studentId||(isUuid(p.studentId)&&studentIds.has(String(p.studentId))))&&(!p.lessonId||(isUuid(p.lessonId)&&lessonIds.has(String(p.lessonId)))));
  localStorage.setItem('tm_students',JSON.stringify(students)); localStorage.setItem('tm_lessons',JSON.stringify(lessons)); localStorage.setItem('tm_homework',JSON.stringify(homework)); localStorage.setItem('tm_payments',JSON.stringify(payments));
  const currentBy={ students:new Set(students.map(x=>String(x.id))), lessons:new Set(lessons.map(x=>String(x.id))), homework:new Set(homework.map(x=>String(x.id))), payments:new Set(payments.map(x=>String(x.id))) };
  const existing = {};
  for (const t of ['students','lessons','homework','payments']) {
    const {data,error}=await supabase.from(t).select('id').eq('user_id',uid);
    if(error) throw error;
    existing[t]=new Set((data||[]).map(x=>String(x.id)));
  }
  // Delete only rows that were actually removed locally, in dependency-safe order.
  for (const id of existing.homework) if (!currentBy.homework.has(id)) { const {error}=await supabase.from('homework').delete().eq('user_id',uid).eq('id',id); if(error) throw error; }
  for (const id of existing.payments) if (!currentBy.payments.has(id)) { const {error}=await supabase.from('payments').delete().eq('user_id',uid).eq('id',id); if(error) throw error; }
  for (const id of existing.lessons) if (!currentBy.lessons.has(id)) { const {error}=await supabase.from('lessons').delete().eq('user_id',uid).eq('id',id); if(error) throw error; }
  for (const id of existing.students) if (!currentBy.students.has(id)) { const {error}=await supabase.from('students').delete().eq('user_id',uid).eq('id',id); if(error) throw error; }

  if (students.length) { const {error}=await supabase.from('students').upsert(students.map(s=>toDbStudent(s,uid)),{onConflict:'id'}); if(error) throw error; }
  if (lessons.length) { const {error}=await supabase.from('lessons').upsert(lessons.map(l=>toDbLesson(l,uid)),{onConflict:'id'}); if(error) throw error; }
  if (homework.length) { const {error}=await supabase.from('homework').upsert(homework.map(h=>toDbHomework(h,uid)),{onConflict:'id'}); if(error) throw error; }

  // Rebuild file metadata and remove Storage objects that are no longer referenced.
  const {data:oldFileRows,error:oldFileError}=await supabase.from('homework_files').select('homework_id,file_name,file_path,mime_type,file_size').eq('user_id',uid); if(oldFileError) throw oldFileError;
  const referencedPaths = new Set();
  const oldFilesByHomeworkAndName = new Map();
  for (const row of (oldFileRows || [])) {
    const key = `${row.homework_id}::${row.file_name || ''}`;
    const list = oldFilesByHomeworkAndName.get(key) || [];
    list.push(row);
    oldFilesByHomeworkAndName.set(key, list);
  }
  const {error:fd}=await supabase.from('homework_files').delete().eq('user_id',uid); if(fd) throw fd;
  for (const h of homework) {
    for (const a of (h.attachments || [])) {
      if (a?.path && !a?.data) {
        referencedPaths.add(a.path);
        const fr={user_id:uid,homework_id:h.id,file_name:a.name||'file',file_path:a.path,mime_type:a.type||null,file_size:a.size||0};
        const {error}=await supabase.from('homework_files').insert(fr); if(error) throw error;
        continue;
      }

      // Attachments loaded from localStorage intentionally have no binary data.
      // Reuse their existing Storage path by matching the homework + filename,
      // otherwise a later sync would treat the file as stale and delete it.
      if (!a?.data) {
        const key = `${h.id}::${a?.name || ''}`;
        const candidates = oldFilesByHomeworkAndName.get(key) || [];
        const old = candidates.shift();
        if (old?.file_path) {
          referencedPaths.add(old.file_path);
          const fr={user_id:uid,homework_id:h.id,file_name:a.name||old.file_name||'file',file_path:old.file_path,mime_type:a.type||old.mime_type||null,file_size:a.size||old.file_size||0};
          const {error}=await supabase.from('homework_files').insert(fr); if(error) throw error;
        }
        continue;
      }
      if (!String(a.data).startsWith('data:')) continue;
      const safeName=String(a.name||'file').replace(/[^a-zA-Z0-9._-]/g,'_');
      const path=`${uid}/${h.id}/${safeName}`; referencedPaths.add(path);
      const blob=await dataUrlToBlob(a.data);
      const up=await supabase.storage.from('homework-files').upload(path,blob,{upsert:true,contentType:a.type||blob.type||'application/octet-stream'}); if(up.error) throw up.error;
      const fr={user_id:uid,homework_id:h.id,file_name:a.name||safeName,file_path:path,mime_type:a.type||blob.type||null,file_size:blob.size};
      const {error}=await supabase.from('homework_files').insert(fr); if(error) throw error;
    }
  }
  const stalePaths = (oldFileRows || []).map(r=>r.file_path).filter(Boolean).filter(path=>!referencedPaths.has(path));
  if (stalePaths.length) {
    const {error:removeError}=await supabase.storage.from('homework-files').remove(stalePaths);
    if (removeError) throw removeError;
  }
  if (payments.length) { const {error}=await supabase.from('payments').upsert(payments.map(p=>toDbPayment(p,uid)),{onConflict:'id'}); if(error) throw error; }
  const {error:se}=await supabase.from('settings').upsert({user_id:uid,tax_percent:Math.max(0,Math.min(100,taxPercent))},{onConflict:'user_id'}); if(se) throw se;
}
async function seedCloudFromLocal(uid) {
  const normalized = normalizeLocalDataForCloud();
  localStorage.setItem('tm_students', JSON.stringify(normalized.students));
  localStorage.setItem('tm_lessons', JSON.stringify(normalized.lessons));
  localStorage.setItem('tm_homework', JSON.stringify(normalized.homework));
  localStorage.setItem('tm_payments', JSON.stringify(normalized.payments));
  await pushAllCloud(uid);
}

function AuthScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const email = import.meta.env.VITE_APP_LOGIN_EMAIL || '';
  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError('Неверный пароль.'); else onLogin();
    setLoading(false);
  };
  return <div className="auth-page"><div className="auth-card card"><div className="brand-icon"><GraduationCap size={26}/></div><h1>Tutor Manager</h1><p>Личный кабинет</p><form onSubmit={submit}><label>Пароль<input autoFocus type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Введите пароль" required /></label>{error&&<div className="form-error">{error}</div>}<button className="primary" type="submit" disabled={loading}>{loading?'Проверка…':'Войти'}</button></form></div></div>;
}

function CloudApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!supabase) { setError('Не настроено подключение к Supabase. Создайте .env.local и укажите VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY.'); setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data, error: err }) => {
      if (err) { setError(err.message); setLoading(false); return; }
      if (!active) return;
      if (data.session) { setSession(data.session); await prepareUserData(data.session.user.id); }
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return;
      setSession(next);
      if (next) { setLoading(true); try { await prepareUserData(next.user.id); } catch (e) { setError('Не удалось загрузить облачные данные: ' + e.message); } finally { setLoading(false); } } else { setReady(false); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function prepareUserData(uid) {
    // Important: getSession() and onAuthStateChange() can fire almost together.
    // Use one shared preparation promise so the app never hydrates localStorage
    // twice or creates two independent cloud-sync queues.
    if (window.__tmCloudPrepareUid === uid && window.__tmCloudPreparePromise) {
      await window.__tmCloudPreparePromise;
      setReady(true);
      return;
    }

    window.__tmCloudPrepareUid = uid;
    window.__tmCloudPreparePromise = (async () => {
      const data = await fetchCloudData(uid);
      const empty = !data.students.length && !data.lessons.length && !data.homework.length && !data.payments.length;

      if (empty) {
        await seedCloudFromLocal(uid);
      } else {
        // Cloud is the source of truth once any cloud data exists.
        localStorage.setItem('tm_students', JSON.stringify(data.students));
        localStorage.setItem('tm_lessons', JSON.stringify(data.lessons));
        localStorage.setItem('tm_homework', JSON.stringify(data.homework));
        localStorage.setItem('tm_payments', JSON.stringify(data.payments));
        if (data.taxRate !== null && data.taxRate !== undefined) {
          localStorage.setItem('tm_tax_rate', String(data.taxRate));
        }
      }

      window.__tmCloudUserId = uid;
      window.__tmCloudPreparedFor = uid;

      // Only one sync function may exist for the current user.
      let queuedSnapshot = null;
      let running = false;
      let pending = false;
      let generation = 0;

      const flush = async () => {
        if (!queuedSnapshot) return;
        if (running) { pending = true; return; }

        running = true;
        pending = false;
        const snapshot = queuedSnapshot;
        const snapshotGeneration = generation;

        try {
          // Sync starts immediately. There is intentionally no debounce now.
          await pushAllCloud(uid, snapshot);
          if (queuedSnapshot === snapshot) queuedSnapshot = null;
        } catch (e) {
          console.error('Cloud sync:', e);
        } finally {
          running = false;
          // A newer snapshot arrived while the previous request was running.
          if (pending || generation !== snapshotGeneration) {
            pending = false;
            void flush();
          }
        }
      };

      window.__tmRequestCloudSync = (snapshot = null) => {
        if (window.__tmCloudUserId !== uid) return;

        // Some persistent values (for example the tax rate) live in child
        // components and do not belong to the LocalApp snapshot. When such a
        // value changes, build a fresh complete snapshot directly from the
        // synchronously-updated localStorage cache instead of doing nothing.
        if (!snapshot || typeof snapshot !== 'object') {
          const read = (key, fallback=[]) => {
            try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
            catch { return fallback; }
          };
          snapshot = {
            students: read('tm_students'),
            lessons: read('tm_lessons'),
            homework: read('tm_homework'),
            payments: read('tm_payments'),
          };
        }

        queuedSnapshot = {
          students: Array.isArray(snapshot.students) ? snapshot.students : [],
          lessons: Array.isArray(snapshot.lessons) ? snapshot.lessons : [],
          homework: Array.isArray(snapshot.homework) ? snapshot.homework : [],
          payments: Array.isArray(snapshot.payments) ? snapshot.payments : [],
          taxRate: snapshot.taxRate !== undefined ? snapshot.taxRate : localStorage.getItem('tm_tax_rate'),
        };
        generation += 1;
        pending = true;
        void flush();
      };

      // When a refresh/navigation hides the page, start the latest queued
      // sync immediately instead of leaving it behind a debounce timer.
      const handlePageHide = () => { void flush(); };
      window.addEventListener('pagehide', handlePageHide);
      window.addEventListener('beforeunload', handlePageHide);

      window.__tmLogout = () => supabase.auth.signOut();
    })();

    try {
      await window.__tmCloudPreparePromise;
      setReady(true);
    } catch (e) {
      // Let the caller display the concrete cloud error.
      throw e;
    }
  }

  if (loading) return <div className="auth-page"><div className="auth-card card"><h1>Tutor Manager</h1><p>Подключение к облаку…</p></div></div>;
  if (error) return <div className="auth-page"><div className="auth-card card"><h1>Tutor Manager</h1><div className="form-error">{error}</div></div></div>;
  if (!session) return <AuthScreen onLogin={() => {}} />;
  if (!ready) return <div className="auth-page"><div className="auth-card card"><h1>Tutor Manager</h1><p>Загрузка данных…</p></div></div>;
  return <LocalApp />;
}

createRoot(document.getElementById('root')).render(<CloudApp />);
