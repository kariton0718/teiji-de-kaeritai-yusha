export function createInput(active,onPause,onCommand=()=>false){
  const held=new Set(),pressed=new Set(),physical=new Set(),quarantined=new Set(),pointers=new Map(),consumed=new Set();
  const mapping={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyJ:'attack',Space:'attack',KeyK:'ultimate',KeyI:'ultimate'};
  const commands=new Set(['Digit1','Digit2','Digit3','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','Enter','NumpadEnter','Escape','Space']);
  const clear=()=>{
    for(const code of physical)quarantined.add(code);
    held.clear();pressed.clear();pointers.clear();document.querySelectorAll('[data-input]').forEach(b=>b.classList.remove('held'));
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
  const release=e=>{const b=pointers.get(e.pointerId);if(!b)return;pointers.delete(e.pointerId);const action=b.dataset.input;if(![...pointers.values()].some(x=>x.dataset.input===action))held.delete(action);b.classList.remove('held');};
  document.querySelectorAll('[data-input]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{if(!active())return;e.preventDefault();b.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,b);held.add(b.dataset.input);pressed.add(b.dataset.input);b.classList.add('held');});
    b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)release(e);});
    b.addEventListener('lostpointercapture',release);
  });
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  const loseFocus=()=>{clear();physical.clear();quarantined.clear();consumed.clear();onPause();};
  window.addEventListener('blur',loseFocus);document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus();});
  return {clear,read(){
    const result={x:Number(held.has('right'))-Number(held.has('left')),y:Number(held.has('down'))-Number(held.has('up')),attack:held.has('attack'),ultimate:pressed.has('ultimate')};
    pressed.delete('ultimate');return result;
  },debug(){return {held:new Set(held),pressed:new Set(pressed),quarantined:new Set(quarantined)};}};
}
