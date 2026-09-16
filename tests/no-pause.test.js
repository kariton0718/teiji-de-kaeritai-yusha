import test from 'node:test';
import assert from 'node:assert/strict';
import {createInput} from '../src/input.js';
import {Game} from '../src/game.js';
test('focus loss, hidden tab and Escape release inputs without pausing gameplay',()=>{
 const win=new EventTarget(),doc=new EventTarget();doc.hidden=false;doc.getElementById=()=>null;doc.querySelectorAll=()=>[];
 globalThis.window=win;globalThis.document=doc;
 const g=new Game(()=>.5);g.state='playing';g.phase='test';const input=createInput(()=>g.state==='playing',()=>false);
 const key=(type,code)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{code,repeat:false});win.dispatchEvent(e);};
 for(const type of ['blur','visibilitychange']){key('keydown','ArrowRight');assert.equal(input.read().x,1);if(type==='blur')win.dispatchEvent(new Event(type));else{doc.hidden=true;doc.dispatchEvent(new Event(type));}assert.equal(input.read().x,0);assert.equal(g.state,'playing');const time=g.remaining;g.update(.02,input.read());assert.ok(g.remaining<time);}
 key('keydown','Escape');assert.equal(g.state,'playing');key('keyup','Escape');key('keydown','ArrowRight');assert.equal(input.read().x,1);assert.equal(typeof g.pause,'undefined');
 delete globalThis.window;delete globalThis.document;
});
