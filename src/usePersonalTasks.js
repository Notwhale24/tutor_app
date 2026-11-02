import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { applyTaskOperation, normalizeTasks, reconcileTasks, taskFromRow, taskToRow } from './personalTasks.js';

export default function usePersonalTasks(userId, client = supabase) {
  const key = `tm_personal_tasks_${userId}`;
  const [state, setState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      return { items: normalizeTasks(saved?.items), pending: Array.isArray(saved?.pending) ? saved.pending : [] };
    } catch { return { items: [], pending: [] }; }
  });
  const latest = useRef(state), running = useRef(false), loading = useRef(false), ready = useRef(false), active = useRef(true);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const commit = useCallback(update => {
    const next = update(latest.current);
    // Persist the mutation queue before updating the UI: a quick refresh cannot lose an edit.
    localStorage.setItem(key, JSON.stringify(next));
    latest.current = next;
    if (active.current) setState(next);
  }, [key]);
  const reportError = useCallback(err => {
    if (!active.current) return;
    const missing = err?.code === '42P01' || err?.code === 'PGRST205';
    setStatus(missing ? 'setup' : 'offline');
    setError(missing ? 'Облачное сохранение дел ещё не подключено. Сейчас дела сохраняются только в этом браузере.' : 'Не удалось сохранить дела в облаке. Изменения остаются в этом браузере и отправятся после восстановления связи.');
  }, []);

  const flush = useCallback(async () => {
    if (running.current || loading.current || !ready.current || !client) return;
    running.current = true;
    try {
      while (active.current && latest.current.pending.length) {
        setStatus('saving');
        const op = latest.current.pending[0];
        const request = op.type === 'delete'
          ? client.from('personal_tasks').delete().eq('user_id', userId).in('id', op.ids)
          : client.from('personal_tasks').upsert(op.tasks.map(t => taskToRow(t, userId)), { onConflict: 'id' });
        const result = await request.abortSignal(AbortSignal.timeout(15000));
        if (result.error) throw result.error;
        if (!active.current) return;
        commit(current => ({ ...current, pending: current.pending.filter(item => item.id !== op.id) }));
      }
      if (active.current) { setStatus('saved'); setError(''); }
    } catch (err) { reportError(err); }
    finally { running.current = false; }
  }, [userId, client, commit, reportError]);

  const refresh = useCallback(async () => {
    if (!client || userId === 'local') { setStatus('offline'); return; }
    // A refresh must not reconcile an older server read after an in-flight edit was acknowledged.
    if (loading.current || running.current) return;
    loading.current = true;
    ready.current = false;
    setStatus('loading');
    try {
      const result = await client.from('personal_tasks').select('*').eq('user_id', userId).abortSignal(AbortSignal.timeout(15000));
      if (result.error) throw result.error;
      if (!active.current) return;
      commit(current => ({ ...current, items: reconcileTasks(result.data.map(taskFromRow), current.pending) }));
      ready.current = true;
    } catch (err) { reportError(err); }
    finally { loading.current = false; }
    if (active.current && ready.current) await flush();
  }, [userId, client, commit, flush, reportError]);

  useEffect(() => {
    active.current = true;
    void refresh();
    const online = () => { void refresh(); };
    window.addEventListener('online', online);
    return () => { active.current = false; window.removeEventListener('online', online); };
  }, [refresh]);

  const mutate = useCallback(operation => {
    try {
      const op = { ...operation, id: crypto.randomUUID() };
      commit(current => ({ items: applyTaskOperation(current.items, op), pending: [...current.pending, op] }));
      setStatus(ready.current ? 'saving' : 'offline');
      void flush();
      return { ok: true };
    } catch { return { error: 'Браузер не смог сохранить дело. Освободи место в хранилище и попробуй ещё раз.' }; }
  }, [commit, flush]);

  return {
    tasks: state.items, status, error, retry: refresh,
    save: tasks => mutate({ type: 'upsert', tasks }),
    remove: ids => mutate({ type: 'delete', ids }),
    restore: items => {
      const tasks = normalizeTasks(items);
      if (!Array.isArray(items) || tasks.length !== items.length) return { error: 'В копии есть некорректные личные дела' };
      // Merge restored IDs rather than deleting unrelated tasks from another device.
      return tasks.length ? mutate({ type: 'upsert', tasks }) : { ok: true };
    },
  };
}
