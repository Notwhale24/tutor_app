import React from 'react';
import { DECORATIONS, decorationVisible } from './gardenProgress.js';
import { plantArtwork } from './gardenArtwork.js';

const assets = import.meta.glob('./assets/garden/*.webp', { eager: true, query: '?url', import: 'default' });
export const gardenAsset = name => assets[`./assets/garden/${name}.webp`];

function Artwork({ name, x, y, width, height, ...props }) {
  return <image href={gardenAsset(name)} x={x} y={y} width={width} height={height}
    preserveAspectRatio="xMidYMax meet" {...props}/>;
}

function Plant({ garden, id, x, y, width, height }) {
  if (!decorationVisible(garden, id)) return null;
  const { asset, scale, level } = plantArtwork(garden, id);
  return <g data-decoration={id} data-growth-stage={level}>
    <Artwork name={asset} x={x + width * (1 - scale) / 2} y={y + height * (1 - scale)}
      width={width * scale} height={height * scale}/>
  </g>;
}

export default function GardenLandscape({ garden, stageName }) {
  const visible = id => decorationVisible(garden, id);
  const names = DECORATIONS.filter(d => visible(d.id)).map(d => d.name);
  const item = (id, x, y, width, height) => visible(id) && <g data-decoration={id}>
    <Artwork name={id} x={x} y={y} width={width} height={height}/>
  </g>;
  return <div className="garden-landscape garden-painted">
    <svg viewBox="0 0 1000 465" role="img" aria-label={`${stageName}. ${names.length ? names.join(', ') : 'Украшений пока нет'}`}>
      <image href={gardenAsset('background')} width="1000" height="465" preserveAspectRatio="xMidYMid slice"/>
      {visible('river') && <g data-decoration="river"><Artwork name="river" x={445} y={100} width={325} height={405} preserveAspectRatio="none"/></g>}
      {visible('lights') && <g data-decoration="lights"><Artwork name="lights" x={-12} y={-110} width={1024} height={250} preserveAspectRatio="none"/></g>}
      <Plant garden={garden} id="apple" x={65} y={32} width={230} height={235}/>
      <Plant garden={garden} id="cherry" x={285} y={18} width={235} height={235}/>
      <Plant garden={garden} id="pear" x={760} y={40} width={195} height={225}/>
      {item('birdhouse', 930, 160, 55, 125)}
      {visible('lanterns') && <g data-decoration="lanterns">
        <Artwork name="lanterns" x={12} y={122} width={70} height={175}/>
        <Artwork name="lanterns" x={738} y={205} width={67} height={150}/>
      </g>}
      {item('fence', 420, 198, 88, 100)}
      {item('mushrooms', 328, 292, 65, 60)}
      <Plant garden={garden} id="flowers" x={38} y={260} width={158} height={100}/>
      {item('gnome', 208, 253, 68, 104)}
      {item('bridge', 543, 275, 184, 95)}
      {item('bench', 805, 286, 126, 83)}
      {item('pond', 798, 365, 180, 95)}
      {item('picnic', 65, 365, 178, 92)}
      <Plant garden={garden} id="tulips" x={270} y={365} width={170} height={95}/>
      {visible('gnome-fisher') && <g data-decoration="gnome-fisher">
        <g transform="translate(1462 0) scale(-1 1)"><Artwork name="gnome-fisher" x={693} y={353} width={76} height={97}/></g>
        <path d="M713 412Q689 372 657 365" stroke="#795132" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M657 365Q613 386 575 428" stroke="#e8e1c2" strokeWidth="0.8" fill="none"/>
        <ellipse cx="575" cy="432" rx="10" ry="3" fill="none" stroke="#fff9e6" opacity=".75"/>
        <ellipse cx="575" cy="429" rx="4" ry="4.5" fill="#fff8dc"/>
        <path d="M571 428a4 4 0 0 1 8 0Z" fill="#d64c33"/>
        <path d="M575 422v3" stroke="#ca523c" strokeWidth="1.5"/>
      </g>}
      {item('butterflies', 260, 208, 80, 72)}
    </svg>
    <span className="garden-stage">{stageName}</span>
  </div>;
}
