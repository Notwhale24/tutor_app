import React, { useState } from 'react';
import { Coins, Flower2, ShoppingBag, X, Check, Eye, EyeOff } from 'lucide-react';
import { DECORATIONS, gardenBalance, gardenStage, gardenGrowth, plantGrowth, decorationVisible, decorationUnlocked } from './gardenProgress';
import './success-garden.css';

function Flower({ x, y, color = '#ec9fb1', scale = 1 }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><path d="M0 0v20m0-6q-12-12-13-3m13 5q10-13 13-6" fill="none" stroke="#74955d" strokeWidth="3" strokeLinecap="round"/>{[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="0" cy="-6" rx="4.7" ry="7" fill={color} transform={`rotate(${a})`}/>)}<circle r="4" fill="#f9d975"/></g>;
}

function Gnome({ x, y, blue = false }) {
  return <g transform={`translate(${x} ${y})`}><ellipse cy="7" rx="17" ry="4" fill="#63774c20"/><path d="M-12 4q-6-32 12-32T12 4Z" fill={blue?'#7faaa8':'#b3b67b'}/><path d="M-14-20L1-58l14 38Z" fill={blue?'#87a6c0':'#d79888'}/><path d="M-13-17Q0 17 13-17Z" fill="#fff4dc"/><circle cy="-19" r="6" fill="#efc3a0"/><ellipse cx="-9" cy="6" rx="7" ry="3" fill="#92785d"/><ellipse cx="9" cy="6" rx="7" ry="3" fill="#92785d"/></g>;
}

function Tree({ x, y, level, count, variant = 0 }) {
  if (level === 0) return <g transform={`translate(${x} ${y})`}><ellipse cy="5" rx="24" ry="6" fill="#64764c18"/><path d="M0 4v-24" stroke="#7f9c59" strokeWidth="4" strokeLinecap="round"/><path d="M0-12Q-29-38-26-16Q-19-4 0-12M0-20Q24-46 25-24Q20-10 0-20" fill="#9dbb70"/></g>;
  const scale = [.28, .65, .92, 1][level];
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <ellipse cy="5" rx="61" ry="10" fill="#64764c18"/>
    <path d="M-8 2l5-92h9l7 92z" fill="#b58962"/><path d="M0-57l-25-27m27 16l23-31" stroke="#b58962" strokeWidth="7" strokeLinecap="round"/>
    <path d="M-55-64C-87-91-55-126-34-125c-7-40 57-55 73-15 36-7 63 46 28 64 3 35-43 51-66 29-28 18-57 3-56-17" fill={variant ? '#a0bd74' : '#8eaf68'}/>
    <ellipse cx="-20" cy="-119" rx="25" ry="17" fill="#c7da93" opacity=".55"/>
    {level >= 2 && [[-38,-102],[5,-128],[40,-104],[-12,-75],[32,-65],[-45,-66]].map(([fx,fy],i) => level === 3 && i % 2 === 0 && i / 2 < Math.min(3, 1 + Math.floor((count - 20) / 5))
      ? <g key={i} transform={`translate(${fx} ${fy})`}><path d="M0-6q-4-10 4-13" fill="none" stroke="#697d43" strokeWidth="2"/><path d="M0-5C-14-14-17 5-8 11c7 4 8 1 11 1 10 0 15-23-3-17" fill={variant ? '#e9bf5c' : '#df8473'}/><ellipse cx="-5" cy="-1" rx="2" ry="4" fill="#fff7d0" opacity=".6"/></g>
      : <Flower key={i} x={fx} y={fy} scale={.65} color={variant ? '#fff6d7' : '#f7c2cd'}/>)}
  </g>;
}

export default function SuccessGarden({ garden, onBuy, onToggle, cloudEnabled, saveError }) {
  const [shop, setShop] = useState(false);
  const [notice, setNotice] = useState('');
  const count = gardenGrowth(garden), balance = gardenBalance(garden);
  const plants = DECORATIONS.filter(d => d.plant && garden.owned.includes(d.id));
  const oldest = Math.max(0, ...plants.map(d => plantGrowth(garden, d.id)));
  const stage = plants.length ? gardenStage(oldest) : { level: 0, name: 'Пустая полянка', next: null, target: 5, start: 0 };
  const visible = id => decorationVisible(garden, id);
  return <section className="card success-garden" aria-label="Сад успехов">
    <div className="garden-heading"><div><span className="garden-eyebrow"><Flower2 size={15}/> ВЫРАЩЕНО С ЗАБОТОЙ</span><h2>Твой маленький сад</h2><p>Каждый проведённый урок помогает ему расти</p></div><div className="garden-actions"><span className="garden-coins" aria-label={`Баланс: ${balance} монет`}><Coins size={18}/>{balance}</span><button type="button" className="ghost" onClick={() => setShop(!shop)} aria-expanded={shop}><ShoppingBag size={16}/> Украшения</button></div></div>
    <div className="garden-landscape"><svg viewBox="0 0 900 400" role="img" aria-label={`${stage.name}${garden.owned.length ? ', украшений: ' + garden.owned.length : ''}`}>
      <rect width="900" height="400" rx="20" fill="#eef3e2"/><circle cx="760" cy="53" r="27" fill="#f8e9a6"/>
      <path d="M0 125Q140 70 285 133T580 114T900 128V400H0Z" fill="#dae8c5"/><path d="M0 186Q150 130 310 181T635 164T900 180V400H0Z" fill="#c3d8a5"/>
      <path d="M455 400Q430 340 480 300T495 200" fill="none" stroke="#eee5c6" strokeWidth="34"/>
      <g fill="#fffdf1" opacity=".7"><ellipse cx="155" cy="47" rx="38" ry="10"/><ellipse cx="174" cy="40" rx="22" ry="15"/><ellipse cx="578" cy="50" rx="46" ry="10"/><ellipse cx="554" cy="43" rx="23" ry="14"/></g>
      {visible('river') && <g><path d="M555 130C460 170 480 215 540 245S580 310 530 340S500 380 515 400" fill="none" stroke="#e6e3bf" strokeWidth="54"/><path d="M555 130C460 170 480 215 540 245S580 310 530 340S500 380 515 400" fill="none" stroke="#9ac9cb" strokeWidth="40"/><path d="M537 145q-70 22-25 68m43 64q14 27-25 50m-12 38q-12 16-3 32" fill="none" stroke="#d7eeee" strokeWidth="3" strokeLinecap="round"/></g>}
      {visible('apple') && <Tree x={180} y={240} level={gardenStage(plantGrowth(garden,'apple')).level} count={plantGrowth(garden,'apple')}/>}
      {visible('pear') && <Tree x={710} y={235} level={gardenStage(plantGrowth(garden,'pear')).level} count={plantGrowth(garden,'pear')} variant={1}/>}
      {visible('cherry') && <Tree x={350} y={210} level={Math.min(2,gardenStage(plantGrowth(garden,'cherry')).level)} count={plantGrowth(garden,'cherry')}/>}
      {visible('flowers') && Array.from({length:9}, (_,i) => <Flower key={i} x={i < 5 ? 55+i*30 : 70+(i-5)*30} y={i < 5 ? 265 : 288} scale={Math.min(.9,.3+plantGrowth(garden,'flowers')*.1)} color={i%2 ? '#fff5cf' : '#eda4b9'}/>)}
      {visible('tulips') && <g>{[0,1,2,3,4].map(i=><g key={i} transform={`translate(${320+i*24} 355) scale(${Math.min(1,.4+plantGrowth(garden,'tulips')*.1)})`}><path d="M0 0v-26m0 15q-16-7-13-18m13 23q14-4 12-17" stroke="#76975f" strokeWidth="3" fill="none"/><path d="M0-25q-15-2-12-20l7 6 5-10 5 10 7-6q3 18-12 20" fill="#df9fb8"/></g>)}</g>}
      {visible('bridge') && <g transform="translate(20 95)" stroke="#aa835d" strokeLinecap="round"><path d="M475 206q47-30 94-3" fill="none" strokeWidth="19"/>{[482,500,520,540,560].map(x=><path key={x} d={`M${x} 180v27`} strokeWidth="4"/>)}<path d="M480 182q40-28 82-3" fill="none" strokeWidth="5"/></g>}
      {visible('gnome') && <Gnome x={245} y={330}/>}
      {visible('gnome-fisher') && <g transform="translate(60 121)"><Gnome x={570} y={244} blue/><path d="M582 226l-25-40q-38-7-36 34" stroke="#8a7957" strokeWidth="2" fill="none"/><circle cx="521" cy="221" r="3" fill="#e29875"/></g>}
      {visible('lanterns') && <g>{[[60,135],[600,230]].map(([x,y])=><g key={x} transform={`translate(${x} ${y})`}><path d="M0 42v-85q0-12 14-12" stroke="#777e60" strokeWidth="4" fill="none"/><circle cx="17" cy="-35" r="23" fill="#ffe9a4" opacity=".35"/><rect x="7" y="-48" width="20" height="27" rx="5" fill="#e8bd70" stroke="#9b8a5d" strokeWidth="2"/><path d="M17-45v20m-7-10h14" stroke="#fff3b9" strokeWidth="3"/></g>)}</g>}
      {visible('birdhouse') && <g transform="translate(842 170)"><path d="M0 58V0" stroke="#9c825c" strokeWidth="5"/><rect x="-15" y="-15" width="30" height="33" rx="3" fill="#e3b98a"/><path d="M-23-13L0-33l23 20" fill="#d59888"/><circle cy="0" r="6" fill="#8b7958"/><path d="M-7 13H7" stroke="#8b7958" strokeWidth="3"/></g>}
      {visible('butterflies') && <g>{[[90,80],[470,135],[830,90]].map(([x,y],i)=><g key={x} transform={`translate(${x} ${y}) rotate(${i*20-20})`}><path d="M0 0C-28-28-28 15 0 4c28 11 28-32 0-4" fill={i%2?'#d0b1d7':'#e8b978'}/><path d="M0-3v15" stroke="#8c805e" strokeWidth="2"/></g>)}</g>}
      {visible('fence') && <g transform="translate(-5 130) scale(.6)" fill="#fff9e9" stroke="#d5d3b8" strokeWidth="1"><rect x="40" y="168" width="145" height="7" rx="3"/><rect x="40" y="186" width="145" height="7" rx="3"/>{[45,76,107,138,169].map(x=><path key={x} d={`M${x} 205v-47l6-8 6 8v47z`}/>)}</g>}
      {visible('pond') && <g transform="translate(0 126)"><ellipse cx="750" cy="229" rx="86" ry="24" fill="#a3cbca" stroke="#dbe7bf" strokeWidth="9"/><ellipse cx="756" cy="229" rx="24" ry="7" fill="#d5e6da"/><ellipse cx="751" cy="222" rx="13" ry="8" fill="#ffedab"/><circle cx="760" cy="212" r="8" fill="#ffedab"/><path d="M768 212l10 4-11 3" fill="#e9a359"/><circle cx="763" cy="210" r="1.5" fill="#53563d"/></g>}
      {visible('bench') && <g transform="translate(185 95)" stroke="#987854" strokeWidth="5" strokeLinecap="round"><path d="M520 202v24m66-24v24m-77-27h88m-82-12h77m-77-10h77"/></g>}
      {visible('mushrooms') && <g transform="translate(15 50)">{[0,22,39].map((x,i)=><g key={x} transform={`translate(${315+x} ${224-i%2*9})`}><path d="M-3 0v14h7V0" fill="#fff2d5"/><path d="M-13 1Q0-24 14 1Z" fill="#db9478"/><circle cy="-5" r="2" fill="#fff2d5"/></g>)}</g>}
      {visible('picnic') && <g transform="translate(10 120)"><path d="M92 233h82l18 24H75Z" fill="#ecb2a4"/>{[95,115,135,155,175].map(x=><path key={x} d={`M${x} 235l-5 20`} stroke="#fff0d7" strokeWidth="5"/>)}<path d="M113 233l3-19h28l4 19Z" fill="#bf9864"/><path d="M120 214q10-20 20 0" fill="none" stroke="#a58359" strokeWidth="4"/></g>}
      {visible('lights') && <g><path d="M25 10Q450 50 875 10" fill="none" stroke="#9aa483" strokeWidth="2"/>{[80,170,260,350,440,530,620,710,800].map((x,i)=><g key={x}><circle cx={x} cy={8+Math.sin((i+1)*Math.PI/10)*20} r="8" fill="#fff0ac" opacity=".35"/><circle cx={x} cy={8+Math.sin((i+1)*Math.PI/10)*20} r="5" fill="#fff6c0"/></g>)}</g>}
    </svg><span className="garden-stage">{stage.name}</span></div>
    <div className="garden-growth"><div><strong>{stage.next ? `До этапа «${stage.next}»: ещё ${stage.target-oldest}` : plants.length ? 'Растения выросли — сад становится уютнее' : 'Начни с первой клумбы или деревца в лавке'}{stage.next ? ' ур.' : ''}</strong><span>{count} проведено · 60 мин = 20 монет, 45 мин = 15</span></div></div>
    {shop && <div className="garden-shop"><div className="garden-shop-heading"><h3>Лавка уютных мелочей</h3><button type="button" className="icon-btn" aria-label="Закрыть лавку" onClick={()=>setShop(false)}><X size={18}/></button></div><p>Украшения остаются навсегда. Их можно спрятать и вернуть в сад.</p><div className="garden-shop-grid">{DECORATIONS.map(item=>{
      const owned=garden.owned.includes(item.id), shown=visible(item.id), unlocked=decorationUnlocked(garden,item.id);
      return <div className="garden-shop-item" key={item.id}><span aria-hidden="true" className="garden-item-icon">{item.icon}</span><strong>{item.name}</strong>{owned ? <button type="button" className="ghost" onClick={()=>onToggle(item.id)}>{shown ? <EyeOff size={14}/> : <Eye size={14}/>} {shown ? 'Спрятать' : 'В сад'}</button> : <button type="button" className="ghost" disabled={!unlocked || balance<item.cost} onClick={()=>{onBuy(item.id);setNotice(`В саду теперь есть ${item.name.toLowerCase()}!`);}}><Coins size={14}/>{item.cost}</button>}{!unlocked && <span className="garden-locked">Сначала купи: {DECORATIONS.find(d=>d.id===item.requires)?.name}</span>}{owned && <span className="garden-owned"><Check size={12}/> Куплено</span>}</div>;
    })}</div><span className="garden-shop-notice" role="status">{notice}</span></div>}
    {(!cloudEnabled || saveError) && <p className="garden-save-note" role="status">{saveError ? 'Сад сохранён в этом браузере. Облачное сохранение пока недоступно.' : 'Сад и украшения сохраняются в этом браузере.'}</p>}
  </section>;
}
