export function createInput(active,onPause){
  const keys=new Set(),pointers=new Map();
  const mapping={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
  const clear=()=>{keys.clear();pointers.clear();document.querySelectorAll('[data-dir]').forEach(b=>b.classList.remove('held'));};
  window.addEventListener('keydown',e=>{if(active()&&mapping[e.code]){e.preventDefault();keys.add(e.code);}if(e.code==='Escape')onPause();});
  window.addEventListener('keyup',e=>keys.delete(e.code));
  const release=e=>{const b=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(b&&![...pointers.values()].includes(b))b.classList.remove('held');};
  document.querySelectorAll('[data-dir]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{if(!active())return;e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b);b.classList.add('held');});
    b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)release(e);});
    b.addEventListener('lostpointercapture',release);
  });
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  window.addEventListener('blur',()=>{clear();onPause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();onPause();}});
  return {clear,read(){const dirs=new Set([...keys].map(k=>mapping[k]));for(const b of pointers.values())dirs.add(b.dataset.dir);return {x:Number(dirs.has('right'))-Number(dirs.has('left')),y:Number(dirs.has('down'))-Number(dirs.has('up'))};}};
}
