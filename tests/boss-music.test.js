import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioCues,SONGS,resolveMusicScene} from '../src/audio.js';
test('boss music distinguishes president and auditor and exits on defeat without a state change',()=>{
 const g={state:'playing',stage:6,boss:{rankIndex:5,dead:false}};assert.equal(resolveMusicScene(g),'final');g.boss.rankIndex=6;assert.equal(resolveMusicScene(g),'auditor');g.boss.dead=true;assert.equal(resolveMusicScene(g),'late');g.stage=4;g.boss={rankIndex:3,dead:false};assert.equal(resolveMusicScene(g),'boss');g.state='upgrade';assert.equal(resolveMusicScene(g),'pause');g.secretBossDefeated=true;assert.equal(resolveMusicScene(g,'ending'),'trueEnding');assert.equal(resolveMusicScene(g,'opening'),'opening');
});
test('three full boss arrangements schedule finite bounded notes and distinct scores',()=>{
 assert.equal(new Set(['boss','final','auditor'].map(id=>JSON.stringify(SONGS[id]))).size,3);
 for(const id of ['boss','final','auditor']){const audio=new AudioCues(),song=SONGS[id],calls=[];audio.tone=(...args)=>calls.push(args);audio.percussion=(time,volume)=>{assert.ok(Number.isFinite(time)&&volume>0&&volume<.1);};for(let step=0;step<128;step++){const before=calls.length;audio.songStep(song,step,step*.2,60/song.tempo/2);assert.ok(calls.length-before<=12);}for(const [hz,time,duration,volume] of calls){assert.ok(hz>20&&hz<20000);assert.ok(Number.isFinite(time)&&duration>0&&duration<3);assert.ok(volume>0&&volume<.1);}}
});
test('unchanged scene does not restart the music clock and mute prevents scheduling',()=>{const audio=new AudioCues();audio.setScene('auditor');audio.step=19;audio.setScene('auditor');assert.equal(audio.step,19);audio.setScene('final');assert.equal(audio.step,0);audio.muted=true;audio.context={state:'running',currentTime:1};audio.songStep=()=>assert.fail('muted');audio.schedule();});
