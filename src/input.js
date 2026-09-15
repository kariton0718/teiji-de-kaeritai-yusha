export function createInput(active,onPause,onCommand=()=>false){
  const keys=new Set(),pointers=new Map(),physical=new Set(),quarantined=new Set(),consumed=new Set();
  const mapping={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'action',KeyE:'action'};
  const commandCodes=new Set(['Digit1','Digit2','Digit3','Digit4','Numpad1','Numpad2','Numpad3','Numpad4','Enter','NumpadEnter','Space','ArrowUp','ArrowDown','KeyW','KeyS','Escape']);
  const clear=()=>{
    for(const code of physical)quarantined.add(code);
    keys.clear();pointers.clear();document.querySelectorAll('[data-dir]').forEach(b=>b.classList.remove('held'));
  };
  window.addEventListener('keydown',e=>{
    const repeat=e.repeat||physical.has(e.code);physical.add(e.code);
    if(repeat||quarantined.has(e.code)){
      if(mapping[e.code]||commandCodes.has(e.code))e.preventDefault();
      return;
    }
    if(e.code==='Escape'){e.preventDefault();consumed.add(e.code);onPause();return;}
    if(active()&&mapping[e.code]){e.preventDefault();keys.add(e.code);consumed.add(e.code);}
    else if(onCommand(e.code)){e.preventDefault();consumed.add(e.code);}
  });
  window.addEventListener('keyup',e=>{
    physical.delete(e.code);quarantined.delete(e.code);keys.delete(e.code);
    if(consumed.delete(e.code))e.preventDefault();
  });
  const release=e=>{const b=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(b&&![...pointers.values()].includes(b))b.classList.remove('held');};
  document.querySelectorAll('[data-dir]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{if(!active())return;e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b);b.classList.add('held');});
    b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)release(e);});
    b.addEventListener('lostpointercapture',release);
  });
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  const loseFocus=()=>{clear();physical.clear();quarantined.clear();consumed.clear();onPause();};
  window.addEventListener('blur',loseFocus);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus();});
  return {clear,read(){
    const dirs=new Set([...keys].map(k=>mapping[k]));for(const b of pointers.values())dirs.add(b.dataset.dir);
    return {x:Number(dirs.has('right'))-Number(dirs.has('left')),y:Number(dirs.has('down'))-Number(dirs.has('up')),action:dirs.has('action')};
  }};
}
