import { useEffect, useState } from 'react';
import { getDailyMessages, localDayNumber } from './dailyMessages';

export default function useDailyMessages() {
  const [day, setDay] = useState(() => localDayNumber());
  useEffect(() => {
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      const now = new Date();
      setDay(localDayNumber(now));
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 50);
      timer = setTimeout(refresh, Math.max(50, midnight.getTime() - now.getTime()));
    };
    const onVisible = () => { if (!document.hidden) refresh(); };
    refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  // Reconstruct a local date without allowing UTC conversion to shift the day.
  const utc = new Date(day * 86400000);
  return getDailyMessages(new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()));
}
