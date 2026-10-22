import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function CorgiFlowerVisit({ onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 14000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className="corgi-flower-visit" role="status"><div className="corgi-flower-runner" aria-hidden="true"><div className="corgi-flower-dog"/><span className="corgi-gift">🌼</span></div><div className="corgi-flower-message"><button type="button" aria-label="Закрыть поздравление" onClick={onClose}><X size={16}/></button><strong>Цветочек за прекрасную работу!</strong><p>Все сегодняшние занятия проведены.<br/>На сегодня всё, можно отдыхать 💚</p></div></div>;
}
