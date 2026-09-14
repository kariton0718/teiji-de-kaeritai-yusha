export function createInput(active,onPause){
  const keys=new Set(),pointers=new Map(),consumed=new Set();
  const mapping={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'action',KeyE:'action'};
  const clear=()=>{keys.clear();pointers.clear();document.querySelectorAll('[data-dir]').forEach(b=>b.classList.remove('held'));};
  window.addEventListener('keydown',e=>{
    if(mapping[e.code]){
      if(active()){e.preventDefault();keys.add(e.code);consumed.add(e.code);}
      else if(e.repeat||consumed.has(e.code))e.preventDefault();
    }
    if(e.code==='Escape')onPause();
  });
  // Releasing a held work key after a dialog opens must not select its focused answer.
  window.addEventListener('keyup',e=>{keys.delete(e.code);if(consumed.delete(e.code))e.preventDefault();});
  const release=e=>{const b=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(b&&![...pointers.values()].includes(b))b.classList.remove('held');};
  document.querySelectorAll('[data-dir]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{if(!active())return;e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b);b.classList.add('held');});
    b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)release(e);});
    b.addEventListener('lostpointercapture',release);
  });
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  window.addEventListener('blur',()=>{clear();consumed.clear();onPause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();consumed.clear();onPause();}});
  return {clear,read(){const dirs=new Set([...keys].map(k=>mapping[k]));for(const b of pointers.values())dirs.add(b.dataset.dir);return {x:Number(dirs.has('right'))-Number(dirs.has('left')),y:Number(dirs.has('down'))-Number(dirs.has('up')),action:dirs.has('action')};}};
}
