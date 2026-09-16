// Web Audio only: all music and effects are original procedural synthesis.
export const SONGS={
  trueEnding:{tempo:86,root:55,progression:[0,5,7,0,3,5,7,0],melody:[0,4,7,12,11,9,7,4,5,9,12,14,12,11,7,0],wave:'triangle',warm:1,epic:.45},
  opening:{tempo:104,root:50,progression:[0,5,3,7,0,8,5,7],melody:[0,4,7,12,11,7,9,14,12,9,7,4,5,7,11,12],wave:'sawtooth',epic:1},
  title:{tempo:112,root:50,progression:[0,5,3,7,0,8,5,7],melody:[0,7,12,11,9,7,4,5,7,12,14,12,11,9,7,12],wave:'triangle',epic:.85},
  battle:{tempo:142,root:55,progression:[0,3,5,4],melody:[0,7,5,7,10,7,5,3],wave:'square'},late:{tempo:158,root:57,progression:[0,5,7,3],melody:[0,7,12,10,7,5,9,12],wave:'sawtooth'},boss:{tempo:152,root:45,progression:[0,0,8,7,0,5,8,7],melody:[0,7,12,10,7,3,2,7,0,7,12,15,14,12,10,7],wave:'sawtooth',battleScore:1},
  final:{tempo:144,root:38,progression:[0,8,3,7,0,5,8,7],melody:[0,7,12,15,14,12,10,7,8,12,15,19,17,15,14,11,12,7,3,7,10,12,14,15,17,15,14,11,12,7,3,0],wave:'sawtooth',battleScore:2},
  auditor:{tempo:174,root:40,progression:[0,1,0,7,8,5,1,7],melody:[0,7,12,13,12,7,3,7,1,8,13,16,15,13,12,8,0,7,12,15,19,15,14,12,13,12,11,7,8,7,3,0],wave:'sawtooth',battleScore:3},
  ending:{tempo:92,root:53,progression:[0,5,3,4,0,3,5,0],melody:[0,4,7,9,7,5,4,2,0,7,9,12,11,9,7,12],wave:'triangle',warm:1}
};
export function resolveMusicScene(game,storyMode=null){
 if(storyMode)return storyMode==='ending'?(game.secretBossDefeated?'trueEnding':'ending'):'opening';
 if(game.state==='title')return 'title';
 if(game.state==='ending'||game.state==='result'&&game.outcome==='success')return game.secretBossDefeated?'trueEnding':'ending';
 if(game.state!=='playing')return 'pause';
 if(game.boss&&!game.boss.dead)return game.boss.rankIndex===6?'auditor':game.boss.rankIndex===5?'final':'boss';
 return game.stage>=4?'late':'battle';
}
const hz=m=>440*Math.pow(2,(m-69)/12);
export class AudioCues{
  constructor(){this.context=null;this.muted=false;this.bgmVolume=.34;this.sfxVolume=.62;this.master=null;this.bgmGain=null;this.sfxGain=null;this.scene='pause';this.step=0;this.nextNote=0;this.timer=0;this.tension=0;this.lastWarning=0;}
  async unlock(){if(this.muted)return;try{this.context??=new (window.AudioContext||window.webkitAudioContext)();if(!this.master){this.master=this.context.createGain();this.bgmGain=this.context.createGain();this.sfxGain=this.context.createGain();this.bgmGain.gain.value=this.bgmVolume;this.sfxGain.gain.value=this.sfxVolume;this.bgmGain.connect(this.master);this.sfxGain.connect(this.master);this.master.connect(this.context.destination);}await this.context.resume();this.startClock();this.fadeBgm();}catch{this.muted=true;}}
  startClock(){if(this.timer)return;this.timer=setInterval(()=>this.schedule(),35);}
  setMuted(value){this.muted=value;if(value)this.context?.suspend();else this.unlock();}
  setBgmVolume(value){this.bgmVolume=Math.max(0,Math.min(1,value));if(this.bgmGain&&this.context)this.bgmGain.gain.setTargetAtTime(this.bgmVolume,this.context.currentTime,.04);}
  setSfxVolume(value){this.sfxVolume=Math.max(0,Math.min(1,value));if(this.sfxGain&&this.context)this.sfxGain.gain.setTargetAtTime(this.sfxVolume,this.context.currentTime,.04);}
  setTension(level){this.tension=level;}
  setScene(scene){if(scene===this.scene)return;this.scene=scene;this.step=0;this.nextNote=this.context?.currentTime||0;this.fadeBgm();}
  fadeBgm(){if(!this.bgmGain||!this.context)return;const t=this.context.currentTime,g=this.scene==='pause'?0:this.bgmVolume;this.bgmGain.gain.cancelScheduledValues(t);this.bgmGain.gain.setTargetAtTime(g,t,.28);}
  schedule(){if(this.muted||!this.context||this.context.state!=='running'||!SONGS[this.scene])return;const song=SONGS[this.scene],unit=60/song.tempo/2;if(this.nextNote<this.context.currentTime)this.nextNote=this.context.currentTime+.03;while(this.nextNote<this.context.currentTime+.16){this.songStep(song,this.step,this.nextNote,unit);this.step++;this.nextNote+=unit;}}
  tone(freq,time,duration,volume,type='triangle',bus=this.bgmGain,detune=0){if(!this.context||!bus)return;const o=this.context.createOscillator(),g=this.context.createGain(),filter=this.context.createBiquadFilter();o.type=type;o.frequency.setValueAtTime(freq,time);o.detune.value=detune;filter.type='lowpass';filter.frequency.value=type==='sawtooth'?1700:2600;g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(.001,volume),time+.018);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(filter);filter.connect(g);g.connect(bus);o.start(time);o.stop(time+duration+.04);o.onended=()=>{o.disconnect();filter.disconnect();g.disconnect();};}
  songStep(song,step,time,unit){if(song.battleScore){this.battleStep(song,step,time,unit);return;}const s=step%16,bar=Math.floor(step/8),chord=song.progression[bar%song.progression.length],rise=song.epic?(.55+(step%64)/128):1;if(s%2===0){this.tone(hz(song.root-24+chord),time,unit*1.7,.045*rise,'triangle');if(song.epic)this.tone(hz(song.root-12+chord),time,unit*1.8,.025*rise,'sawtooth');}if(s%4===0)[0,4,7].forEach((n,i)=>{this.tone(hz(song.root+chord+n),time,unit*3.7,.013*rise,'sine',this.bgmGain,i?5:-5);if(song.epic)this.tone(hz(song.root+12+chord+n),time+.03*i,unit*2.8,.009*rise,'triangle');});const note=song.melody[s%song.melody.length]+chord;this.tone(hz(song.root+12+note),time,unit*.82,.024*rise,song.wave);if(song.epic&&s%4===2)this.tone(hz(song.root+19+note),time,unit*.7,.012*rise,'square');if(song.warm&&s%2===0)this.tone(hz(song.root+12+note),time+.06,unit*1.4,.012,'sine');this.tone(s%4===0?82:132,time,.05,s%4===0?.032:.009,'square');if(this.tension===2&&s%2===1)this.tone(176,time,.08,.012,'sawtooth');}
  percussion(time,volume,low=false){
    if(!this.context||!this.bgmGain)return;
    if(low){this.tone(66,time,.23,volume,'sine');this.tone(43,time,.3,volume*.65,'triangle');return;}
    if(!this.noiseBuffer){this.noiseBuffer=this.context.createBuffer(1,Math.ceil(this.context.sampleRate*.22),this.context.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);}
    const source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),gain=this.context.createGain();source.buffer=this.noiseBuffer;filter.type='highpass';filter.frequency.value=1800;gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.2);source.connect(filter);filter.connect(gain);gain.connect(this.bgmGain);source.start(time);source.stop(time+.22);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  battleStep(song,step,time,unit){
    const tier=song.battleScore,s=step%16,bar=Math.floor(step/8),chord=song.progression[bar%song.progression.length],root=song.root+chord;
    // Minor ostinato, low drums and a separate melodic line; later bosses add brass/choir registers.
    const arp=[0,7,12,3,0,7,10,7][step%8];
    this.tone(hz(root+12+arp),time,unit*.68,.014,'sawtooth',this.bgmGain,-5);
    if(tier===3)this.tone(hz(root+19+[0,3,7,3][step%4]),time+unit*.5,unit*.38,.009,'triangle');
    if(s%2===0){this.tone(hz(root-12),time,unit*1.7,.052,'triangle');this.percussion(time,.04,true);}
    if(s%4===2)this.percussion(time,.019);
    if(s%8===0){for(const n of [0,3,7]){this.tone(hz(root+n),time,unit*6,.012,'sawtooth',this.bgmGain,n===3?-6:6);if(tier>=2)this.tone(hz(root+12+n),time,unit*7,.012,'sine');}if(tier>=2)this.percussion(time,.024);}
    const melody=song.melody[step%song.melody.length];
    if(tier===1||s%2===0){this.tone(hz(song.root+24+melody),time,unit*(tier>=2?1.7:.8),.022,tier>=2?'triangle':'sawtooth');if(tier>=2)this.tone(hz(song.root+12+melody),time+.02,unit*1.8,.019,'sawtooth');}
    if(tier===3&&s>=12)this.percussion(time,.012);
  }
  play(event){if(this.muted||!this.context||this.context.state!=='running'||!this.sfxGain)return;const notes={attack:[420],hit:[720,560],defeat:[620,830],wave:[392,523],upgrade:[523,659,784],ultimate:[330,523,784,1047],heal:[659,784,988],warn:[260,220],warning:[247,196],critical:[220,165,220],shoot:[440],hurt:[180,145],danger:[294,220],stun:[190,260],boss:[196,247,294],bossPhase:[220,277,330,440],summon:[247,196,247],thunder:[988,659],meteor:[330,440],impact:[165,220],burst:[523,784,1047],bossDown:[294,392,523,784],success:[523,659,784,1047,1319],failure:[330,294,196],reorg:[196,262,330],storyTurn:[392,523,659],endingResolve:[392,523,659,784,1047]}[event];if(!notes)return;if((event==='warning'||event==='critical')&&this.context.currentTime-this.lastWarning<1.2)return;if(event==='warning'||event==='critical')this.lastWarning=this.context.currentTime;const story=event==='storyTurn'||event==='endingResolve';notes.forEach((f,i)=>this.tone(f,this.context.currentTime+i*(story ? .14 : .1),story ? .34 : .18,story ? .055 : .07,story?'sine':'triangle',this.sfxGain));}
}
