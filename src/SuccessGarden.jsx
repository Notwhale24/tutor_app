import React, { useState } from 'react';
import { Coins, Flower2, ShoppingBag, X, Check, Eye, EyeOff } from 'lucide-react';
import { DECORATIONS, gardenBalance, gardenStage, gardenGrowth, plantGrowth, decorationVisible, decorationUnlocked } from './gardenProgress';
import './success-garden.css';
import GardenLandscape, { gardenAsset } from './IntegratedGarden';

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
    <GardenLandscape garden={garden} stageName={stage.name}/>
    <div className="garden-growth"><div><strong>{stage.next ? `До этапа «${stage.next}»: ещё ${stage.target-oldest}` : plants.length ? 'Растения выросли — сад становится уютнее' : 'Начни с первой клумбы или деревца в лавке'}{stage.next ? ' ур.' : ''}</strong><span>{count} проведено · 60 мин = 20 монет, 45 мин = 15</span></div></div>
    {shop && <div className="garden-shop"><div className="garden-shop-heading"><h3>Лавка уютных мелочей</h3><button type="button" className="icon-btn" aria-label="Закрыть лавку" onClick={()=>setShop(false)}><X size={18}/></button></div><p>Украшения остаются навсегда. Их можно спрятать и вернуть в сад.</p><div className="garden-shop-grid">{DECORATIONS.map(item=>{
      const owned=garden.owned.includes(item.id), shown=visible(item.id), unlocked=decorationUnlocked(garden,item.id);
      return <div className="garden-shop-item" key={item.id}><img className="garden-item-art" src={gardenAsset(item.id)} alt="" loading="lazy" width="100" height="80"/><strong>{item.name}</strong>{owned ? <button type="button" className="ghost" onClick={()=>onToggle(item.id)}>{shown ? <EyeOff size={14}/> : <Eye size={14}/>} {shown ? 'Спрятать' : 'В сад'}</button> : <button type="button" className="ghost" disabled={!unlocked || balance<item.cost} onClick={()=>{onBuy(item.id);setNotice(`В саду теперь есть ${item.name.toLowerCase()}!`);}}><Coins size={14}/>{item.cost}</button>}{!unlocked && <span className="garden-locked">Сначала купи: {DECORATIONS.find(d=>d.id===item.requires)?.name}</span>}{owned && <span className="garden-owned"><Check size={12}/> Куплено</span>}</div>;
    })}</div><span className="garden-shop-notice" role="status">{notice}</span></div>}
    {(!cloudEnabled || saveError) && <p className="garden-save-note" role="status">{saveError ? 'Сад сохранён в этом браузере. Облачное сохранение пока недоступно.' : 'Сад и украшения сохраняются в этом браузере.'}</p>}
  </section>;
}
