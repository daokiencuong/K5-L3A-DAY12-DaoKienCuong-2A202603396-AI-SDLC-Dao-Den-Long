import React,{useEffect,useRef,useState} from 'react';
import { startGame } from '../game.js';
import { TUNING } from '../src/sim.js';

const initial={score:0,timeLeft:300,flames:3,carried:0,lit:0,cooldown:0,shades:[],lanterns:[],player:[0,0,0],toast:'',result:null};
function MiniMap({state}){
  const ref=useRef(null);
  useEffect(()=>{const canvas=ref.current;if(!canvas)return;const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,cx=w/2,cy=h/2,R=91;c.clearRect(0,0,w,h);c.save();c.beginPath();c.arc(cx,cy,R,0,Math.PI*2);c.clip();const g=c.createRadialGradient(cx,cy,3,cx,cy,R);g.addColorStop(0,'#34483e');g.addColorStop(.78,'#293d38');g.addColorStop(1,'#172630');c.fillStyle=g;c.fillRect(0,0,w,h);for(let i=0;i<30;i++){const a=i*2.4,r=(i*37)%80;c.fillStyle=i%2?'#68704c66':'#81705166';c.beginPath();c.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,2+i%3,0,7);c.fill()}c.strokeStyle='#b2a16b55';c.lineWidth=1;c.beginPath();c.arc(cx,cy,R*.72,0,7);c.stroke();const xy=p=>[cx+p[0]/30*R,cy+p[2]/30*R];for(const l of state.lanterns||[]){const [x,y]=xy(l.pos);c.fillStyle=l.lit?'#ffdf92':'#d7a654';c.shadowColor=c.fillStyle;c.shadowBlur=l.lit?12:4;c.beginPath();c.arc(x,y,l.lit?5:4,0,7);c.fill()}c.shadowBlur=0;for(const s of state.shades||[]){const [x,y]=xy(s.pos);c.fillStyle=s.state==='stunned'?'#8bdde0':'#bd8ce1';c.beginPath();c.arc(x,y,4,0,7);c.fill()}const [px,py]=xy(state.player||[0,0,0]);c.fillStyle='#fff0c3';c.shadowColor='#ffe6a5';c.shadowBlur=12;c.beginPath();c.arc(px,py,4.5,0,7);c.fill();c.restore();c.strokeStyle='#d8bc75';c.lineWidth=2;c.beginPath();c.arc(cx,cy,R,0,7);c.stroke()},[state]);
  return <div className="map-frame"><canvas ref={ref} width="220" height="220"/><span className="map-compass">N</span></div>
}
function Ability({k,glyph,label,onClick,extra='',cooldown=0,disabled=false}){return <button className={`ability ${extra}`} title={`${label} · ${k}`} onClick={onClick} disabled={disabled}><span className="keycap">{k}</span><span className={`ability-glyph ${label==='NHẢY'?'jump-glyph':label==='THẮP ĐÈN'?'lantern-glyph':'pulse-glyph'}`}>{glyph}</span><small>{label}</small>{label==='TỎA SÁNG'&&<span className="cooldown-mask" style={{transform:`scaleY(${Math.max(0,cooldown/TUNING.pulse_cooldown_s)})`}}/>}</button>}
export default function App(){
  const [state,setState]=useState(initial);
  useEffect(()=>startGame(setState),[]);
  const action=k=>window.dispatchEvent(new CustomEvent('game-action',{detail:k}));
  const sec=Math.ceil(state.timeLeft),goodEnd=state.result?.state==='won';
  return <main id="game-shell">
    <canvas id="world" aria-label="Thế giới game 3D"/><div className="world-vignette"/>
    <header className="topbar">
      <div className="game-brand panel"><div className="brand-mark">✦</div><div><div className="eyebrow">CHƯƠNG I · ĐẢO BẾN</div><h1>Đảo Đèn Lồng</h1></div></div>
      <section className="objective panel"><div className="objective-icon">☼</div><div className="objective-copy"><span className="eyebrow">MỤC TIÊU ĐÊM NAY</span><strong>Thắp sáng 5 ngọn đèn</strong><div className="objective-track"><span style={{width:`${state.lit/5*100}%`}}/></div></div><strong className="objective-count">{state.lit} <i>/ 5</i></strong></section>
      <div className="night-clock panel"><span className="eyebrow">BÌNH MINH</span><strong>{String(Math.floor(sec/60)).padStart(2,'0')}:{String(sec%60).padStart(2,'0')}</strong><span className="moon">☾</span></div>
    </header>
    <section className="left-card panel"><div className="card-heading"><span className="eyebrow">NGƯỜI GIỮ ĐÈN</span><span className="level">LV <b>01</b></span></div><div className="hero-row"><div className="hero-portrait"><span>M</span><i>✦</i></div><div className="hero-info"><strong>Mây</strong><span>Đom đóm mang theo</span><div className="resource-track"><span style={{width:`${state.carried/TUNING.carry_capacity*100}%`}}/></div><small>{state.carried} / {TUNING.carry_capacity}</small></div></div><div className="life-row"><span>ĐÈN SINH MỆNH</span><strong>{Array.from({length:TUNING.flames},(_,i)=>i<state.flames?'●':'○').join(' ')}</strong></div></section>
    <section className="right-card panel"><div className="card-heading"><span className="eyebrow">ĐẢO BẾN</span><span className="signal"><i/> ĐANG THÁM HIỂM</span></div><MiniMap state={state}/><div className="map-legend"><span><i className="legend-you"/>Mây</span><span><i className="legend-lantern"/>Đèn</span><span><i className="legend-shade"/>Bóng Mực</span></div></section>
    <div className={`toast ${state.toast?'show':''}`} aria-live="polite">{state.toast}</div>
    <footer className="bottom-hud">
      <div className="score-box panel"><span className="eyebrow">ĐIỂM ĐÊM NAY</span><strong>{String(state.score).padStart(4,'0')}</strong><span className="score-gem">✧</span></div>
      <div className="ability-bar panel"><div className="portrait-small"><span>M</span><b>1</b></div><div className="vitals"><div className="healthbar"><span style={{width:`${state.flames/TUNING.flames*100}%`}}/></div><div className="lightbar"><span style={{width:`${state.carried/TUNING.carry_capacity*100}%`}}/></div><div className="vitals-label"><span>{state.flames} / {TUNING.flames} ĐÈN</span><span>{state.carried} / {TUNING.carry_capacity} ÁNH SÁNG</span></div></div><div className="abilities"><Ability k="SPACE" glyph="↟" label="NHẢY" onClick={()=>action(' ')}/><Ability k="E" glyph="♜" label="THẮP ĐÈN" onClick={()=>action('e')}/><Ability k="F" glyph="✦" label="TỎA SÁNG" onClick={()=>action('f')} extra="pulse-ability" cooldown={state.cooldown} disabled={state.cooldown>0||state.carried<TUNING.pulse_cost}/></div><div className="gold-separator"/><div className="inventory"><span className="eyebrow">TÚI ĐÈN</span><div><b>{state.carried}</b><span> ✦</span></div></div></div>
      <div className="hint-box panel"><span className="hint-dot"/><span>{state.carried===0?'Tìm đom đóm phát sáng quanh đảo.':state.carried>=3?'Đến gần đèn lớn và nhấn E để thắp.':'Nhấn F để xua Bóng Mực khi chúng tới gần.'}</span></div>
    </footer>
    <div className="controls-hint"><b>W A S D</b> <span>DI CHUYỂN</span><i>·</i> KÉO CHUỘT <span>XOAY CAMERA</span><i>·</i> <em>F</em> <span>TỎA SÁNG</span></div>
    {state.result&&<div className="end-screen"><div className="end-card panel"><div className="end-flare">✦</div><span className="eyebrow">ĐÊM 1 · ĐẢO BẾN</span><h2>{goodEnd?'Đảo đã bừng sáng':'Sương đen phủ đảo'}</h2><p>{goodEnd?'Năm ngọn đèn đã được thắp. Mây đã đưa bình minh trở lại.':'Mây đã cạn đèn sinh mệnh.'} · Điểm đêm nay {state.score}</p><button onClick={()=>location.reload()}>CHƠI LẠI <span>↻</span></button></div></div>}
  </main>
}
