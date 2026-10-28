import React, { useId } from 'react';
import { DECORATIONS, decorationVisible } from './gardenProgress.js';
import { isCompleteGarden, plantArtwork } from './gardenArtwork.js';
import lightsIcon from './assets/garden/lights.webp';

const assets = import.meta.glob('./assets/garden/integrated/*.webp', { eager: true, query: '?url', import: 'default' });
const plants = new Set(['apple', 'pear', 'cherry', 'flowers', 'tulips']);
export const gardenAsset = name => name === 'lights' ? lightsIcon : assets[`./assets/garden/integrated/${name === 'river' ? 'meadow-river' : plants.has(name) ? `${name}-3` : name}.webp`];

function Artwork({ name, x = 0, y = 0, width = 1760, height = 896, ...props }) {
  return <image href={gardenAsset(name)} x={x} y={y} width={width} height={height} preserveAspectRatio="xMidYMax meet" {...props}/>;
}

function Plant({ garden, id, x, y, width, height }) {
  if (!decorationVisible(garden, id)) return null;
  const { asset, scale, level } = plantArtwork(garden, id);
  return <g data-decoration={id} data-growth-stage={level}>
    <Artwork name={asset} x={x + width * (1 - scale) / 2} y={y + height * (1 - scale)} width={width * scale} height={height * scale}/>
  </g>;
}

const anchors = [
  { id: 'apple', x: 244, y: 200, ground: 450 },
  { id: 'cherry', x: 727, y: 198, ground: 480 },
  { id: 'pear', x: 1372, y: 230, ground: 500 },
];

function Garland({ garden, glowId }) {
  if (!decorationVisible(garden, 'lights')) return null;
  const spans = [[anchors[0], { x: 480, y: 340 }, anchors[1], 11], [anchors[1], { x: 1050, y: 380 }, anchors[2], 15]];
  return <g data-decoration="lights">
    {anchors.map(a => (!decorationVisible(garden, a.id) || plantArtwork(garden, a.id).level < 3) &&
      <g key={a.id} data-garland-support={a.id}>
        <path d={`M${a.x} ${a.ground}V${a.y - 10}`} stroke="#6e4b2d" strokeWidth="9" strokeLinecap="round"/>
        <path d={`M${a.x - 2} ${a.ground - 5}V${a.y - 10}`} stroke="#b48a51" strokeWidth="3"/>
        <ellipse cx={a.x} cy={a.ground + 2} rx="13" ry="3" fill="#38502b" opacity=".2"/>
      </g>)}
    {spans.map(([a, c, b, count], span) => <g key={span}>
      <path d={`M${a.x} ${a.y}Q${c.x} ${c.y} ${b.x} ${b.y}`} fill="none" stroke="#58462c" strokeWidth="3"/>
      {Array.from({ length: count }, (_, i) => {
        const t = (i + 0.4) / count, u = 1 - t;
        const x = u * u * a.x + 2 * u * t * c.x + t * t * b.x;
        const y = u * u * a.y + 2 * u * t * c.y + t * t * b.y;
        return <g key={i} transform={`translate(${x} ${y})`}>
          <circle cy="13" r="17" fill={`url(#${glowId})`}/>
          <path d="M0 0V8" stroke="#4c3b28" strokeWidth="2"/>
          <rect x="-3.5" y="7" width="7" height="5" rx="1" fill="#7c6133"/>
          <ellipse cy="16" rx="5" ry="7" fill="#ffdb62"/>
          <ellipse cx="-1" cy="15" rx="2.8" ry="4.8" fill="#fff9bd"/>
        </g>;
      })}
    </g>)}
  </g>;
}

export default function IntegratedGarden({ garden, stageName }) {
  const glowId = `garden-glow-${useId().replace(/:/g, '')}`;
  const visible = id => decorationVisible(garden, id);
  const names = DECORATIONS.filter(d => visible(d.id)).map(d => d.name);
  const item = (id, x, y, width, height, fit = 'xMidYMax meet') => visible(id) && <g data-decoration={id}><Artwork name={id} x={x} y={y} width={width} height={height} preserveAspectRatio={fit}/></g>;
  return <div className="garden-landscape garden-painted">
    <svg viewBox="0 0 1760 896" role="img" aria-label={`${stageName}. ${names.length ? names.join(', ') : 'Украшений пока нет'}`}>
      <defs><radialGradient id={glowId}><stop stopColor="#ffd44b" stopOpacity=".5"/><stop offset="1" stopColor="#ffcb3c" stopOpacity="0"/></radialGradient></defs>
      {isCompleteGarden(garden) ? <Artwork name="complete" preserveAspectRatio="none"/> : <>
      <Artwork name={visible('river') ? 'meadow-river-quiet' : 'meadow-quiet'} preserveAspectRatio="none"/>
      <Plant garden={garden} id="apple" x={-10} y={15} width={470} height={450}/>
      <Plant garden={garden} id="cherry" x={445} y={95} width={440} height={395}/>
      <Plant garden={garden} id="pear" x={1320} y={70} width={440} height={450}/>
      {item('birdhouse', 390, 320, 110, 180)}
      {item('fence', 650, 380, 180, 130)}
      {item('mushrooms', 530, 435, 90, 60)}
      {item('bench', 1510, 420, 180, 115)}
      {visible('lanterns') && <g data-decoration="lanterns">
        <Artwork name="lanterns" x={-30} y={255} width={210} height={320}/>
        <Artwork name="lanterns" x={1590} y={280} width={210} height={340}/>
      </g>}
      <Garland garden={garden} glowId={glowId}/>
      <Plant garden={garden} id="flowers" x={-5} y={535} width={385} height={205}/>
      {item('gnome', 392, 552, 115, 165)}
      <Plant garden={garden} id="tulips" x={455} y={610} width={285} height={190}/>
      {item('gnome-fisher', 1250, 413, 245, 165)}
      {item('bridge', 1115, 545, 580, 210, 'none')}
      {item('picnic', 15, 665, 440, 220)}
      {item('pond', 1390, 745, 370, 160)}
      {item('butterflies', 265, 490, 210, 70)}
      </>}
    </svg>
    <span className="garden-stage">{stageName}</span>
  </div>;
}
