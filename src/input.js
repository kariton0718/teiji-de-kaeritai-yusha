import {CONFIG as C} from './config.js';

export function createInput(active,onPause,onCommand=()=>false){
  const held=new Set(),pressed=new Set(),physical=new Set(),quarantined=new Set(),pointers=new Map(),consumed=new Set();
  const joystick={pointerId:null,x:0,y:0,centerX:0,centerY:0};
  const zone=document.getElementById('joystick-zone'),base=document.getElementById('joystick-base'),knob=document.getElementById('joystick-knob');
  const mapping={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyJ:'attack',Space:'attack',KeyK:'ultimate',KeyI:'ultimate'};
  const commands=new Set(['Digit1','Digit2','Digit3','Digit4','Digit5','Numpad1','Numpad2','Numpad3','Numpad4','Numpad5','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','Enter','NumpadEnter','Escape','Space']);
  const clear=()=>{
    for(const code of physical)quarantined.add(code);
    held.clear();pressed.clear();pointers.clear();joystick.pointerId=null;joystick.x=0;joystick.y=0;if(base)base.hidden=true;document.querySelectorAll('[data-input]').forEach(b=>b.classList.remove('held'));
  };
  window.addEventListener('keydown',e=>{
    const repeated=e.repeat||physical.has(e.code);physical.add(e.code);
    if(quarantined.has(e.code)||repeated){if(mapping[e.code]||commands.has(e.code))e.preventDefault();return;}
    if(e.code==='Escape'){e.preventDefault();consumed.add(e.code);onPause();return;}
    if(active()&&mapping[e.code]){const action=mapping[e.code];e.preventDefault();held.add(action);pressed.add(action);consumed.add(e.code);return;}
    if(onCommand(e.code)){e.preventDefault();consumed.add(e.code);}
  });
  window.addEventListener('keyup',e=>{
    physical.delete(e.code);quarantined.delete(e.code);const action=mapping[e.code];if(action)held.delete(action);
    if(consumed.delete(e.code))e.preventDefault();
  });
  const release=e=>{const p=pointers.get(e.pointerId);if(!p)return;pointers.delete(e.pointerId);if(p.kind==='joystick'){joystick.pointerId=null;joystick.x=0;joystick.y=0;base.hidden=true;return;}if(![...pointers.values()].some(x=>x.kind==='button'&&x.action===p.action))held.delete(p.action);p.element.classList.remove('held');};
  document.querySelectorAll('[data-input]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{if(!active())return;e.preventDefault();b.setPointerCapture?.(e.pointerId);const action=b.dataset.input;pointers.set(e.pointerId,{kind:'button',action,element:b});held.add(action);pressed.add(action);b.classList.add('held');});
    b.addEventListener('lostpointercapture',release);
  });
  const moveJoystick=e=>{if(e.pointerId!==joystick.pointerId)return;e.preventDefault();const dx=e.clientX-joystick.centerX,dy=e.clientY-joystick.centerY,d=Math.hypot(dx,dy),radius=C.mobileJoystick.radius,clamped=Math.min(d,radius),nx=d?dx/d:0,ny=d?dy/d:0;joystick.x=d>C.mobileJoystick.deadzone?nx:0;joystick.y=d>C.mobileJoystick.deadzone?ny:0;knob.style.transform=`translate(${nx*clamped}px,${ny*clamped}px)`;};
  if(zone){
    zone.addEventListener('pointerdown',e=>{if(!active()||joystick.pointerId!==null)return;e.preventDefault();joystick.pointerId=e.pointerId;joystick.centerX=e.clientX;joystick.centerY=e.clientY;pointers.set(e.pointerId,{kind:'joystick',element:zone});const r=zone.getBoundingClientRect();base.style.left=`${e.clientX-r.left}px`;base.style.top=`${e.clientY-r.top}px`;knob.style.transform='translate(0px,0px)';base.hidden=false;zone.setPointerCapture?.(e.pointerId);});
    zone.addEventListener('pointermove',moveJoystick);zone.addEventListener('lostpointercapture',release);
  }
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  const loseFocus=()=>{clear();physical.clear();quarantined.clear();consumed.clear();onPause();};
  window.addEventListener('blur',loseFocus);document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus();});
  return {clear,read(){
    const keyboardX=Number(held.has('right'))-Number(held.has('left')),keyboardY=Number(held.has('down'))-Number(held.has('up'));
    const result={x:keyboardX||joystick.x,y:keyboardY||joystick.y,attack:held.has('attack'),ultimate:pressed.has('ultimate')};
    pressed.delete('ultimate');return result;
  },debug(){return {held:new Set(held),pressed:new Set(pressed),quarantined:new Set(quarantined),pointers:new Map(pointers),joystick:{...joystick}};}};
}
