import React, { useEffect, useRef, useState } from 'react';
import { PawPrint, X } from 'lucide-react';
import { createPlayground, constrainBall, releaseVelocity, throwBall, stepPlayground } from './corgiPhysics';
import './corgi-playground.css';

export default function CorgiPlayground({ paused = false }) {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem('tm_corgi_hidden') === 'true'; } catch { return false; }
  });
  const model = useRef(null), dogElement = useRef(null), ballElement = useRef(null), animate = useRef(() => {});
  const changeHidden = value => {
    setHidden(value);
    try { localStorage.setItem('tm_corgi_hidden', String(value)); } catch { /* Optional preference. */ }
  };
  useEffect(() => {
    if (hidden || paused) return;
    let frame = 0, previous = 0, disposed = false;
    const paint = time => {
      const current = model.current;
      if (!current || !dogElement.current || !ballElement.current) return;
      const { dog, ball } = current, phase = Math.floor(time / 115) % 2;
      const sprite = current.dragging ? 5 : dog.mode === 'return' ? 3 + phase : dog.mode === 'chase' ? 1 + phase : 0;
      dogElement.current.style.transform = `translate3d(${dog.x}px,${dog.y}px,0) translate(-50%,-50%) scaleX(${dog.facing})`;
      dogElement.current.style.backgroundPosition = `${sprite % 3 * 50}% ${sprite < 3 ? 0 : 100}%`;
      dogElement.current.dataset.mode = dog.mode;
      ballElement.current.style.transform = `translate3d(${ball.x}px,${ball.y}px,0) translate(-50%,-50%) rotate(${ball.angle}rad)`;
      ballElement.current.style.visibility = dog.mode === 'return' ? 'hidden' : 'visible';
      ballElement.current.dataset.dragging = String(current.dragging);
    };
    const reset = () => { model.current = createPlayground(window.innerWidth, window.innerHeight); paint(0); };
    const tick = time => {
      frame = 0;
      if (disposed || document.hidden) return;
      let remaining = previous ? Math.min((time - previous) / 1000, 0.1) : 0;
      previous = time;
      while (remaining > 0) { const dt = Math.min(remaining, 1 / 120); stepPlayground(model.current, dt); remaining -= dt; }
      paint(time);
      if (model.current.dragging || model.current.dog.mode !== 'rest') frame = requestAnimationFrame(tick);
      else previous = 0;
    };
    const wake = () => { if (!disposed && !frame && !document.hidden) { previous = 0; frame = requestAnimationFrame(tick); } };
    animate.current = wake;
    const cancelDrag = () => { if (model.current?.dragging) { throwBall(model.current, { vx: 0, vy: 0 }); wake(); } };
    const visibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previous = 0; cancelDrag(); }
      else if (model.current.dog.mode !== 'rest') wake();
    };
    const resize = () => { cancelAnimationFrame(frame); frame = 0; previous = 0; reset(); };
    reset();
    window.addEventListener('resize', resize);
    window.addEventListener('blur', cancelDrag);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      disposed = true; cancelAnimationFrame(frame); animate.current = () => {}; model.current = null;
      window.removeEventListener('resize', resize); window.removeEventListener('blur', cancelDrag); document.removeEventListener('visibilitychange', visibility);
    };
  }, [hidden, paused]);
  const recordPointer = event => {
    const current = model.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const position = constrainBall(current, event.clientX, event.clientY);
    Object.assign(current.ball, position, { vx: 0, vy: 0 });
    const now = performance.now();
    current.samples = [...current.samples.filter(s => now - s.t < 120), { ...position, t: now }];
    animate.current();
  };
  const release = (event, cancelled = false) => {
    const current = model.current;
    if (!current?.dragging || current.pointerId !== event.pointerId) return;
    if (!cancelled) recordPointer(event);
    const velocity = cancelled ? { vx: 0, vy: 0 } : releaseVelocity(current.samples, performance.now());
    throwBall(current, velocity);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    animate.current();
  };
  if (paused) return null;
  if (hidden) return <button type="button" className="corgi-restore" aria-label="Показать корги" title="Показать корги" onClick={() => changeHidden(false)}><PawPrint size={17}/></button>;
  return <div className="corgi-playground" aria-label="Корги с мячиком">
    <div ref={dogElement} className="corgi-sprite" aria-hidden="true" />
    <button ref={ballElement} type="button" className="corgi-ball" aria-label="Мячик корги: перетащите и бросьте или нажмите Enter" title="Бросить мячик" onPointerDown={event => {
      if (event.button !== 0 || !event.isPrimary || !model.current) return;
      const current = model.current;
      current.dragging = true; current.pointerId = event.pointerId; current.samples = []; current.dog.mode = 'rest';
      event.currentTarget.setPointerCapture(event.pointerId); recordPointer(event);
    }} onPointerMove={event => { if (model.current?.dragging) recordPointer(event); }} onPointerUp={event => release(event)} onPointerCancel={event => release(event, true)} onLostPointerCapture={event => release(event, true)} onClick={event => {
      // Keyboard activation offers a throw without pointer dragging.
      if (event.detail !== 0 || !model.current || model.current.dragging) return;
      throwBall(model.current, { vx: -650, vy: -250 }); animate.current();
    }}><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 3C15 9 0 18 10 26M23 2C13 9 29 19 19 26"/></svg></button>
    <button type="button" className="corgi-hide" aria-label="Спрятать корги" title="Спрятать корги" onClick={() => changeHidden(true)}><X size={13}/></button>
  </div>;
}
