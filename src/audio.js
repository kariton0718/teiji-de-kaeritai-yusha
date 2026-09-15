// Procedural original soundtrack and effects. No downloaded assets are used.
const SONGS={
  title:{tempo:118,root:57,progression:[0,5,3,4],melody:[0,4,7,12,9,7,4,2],wave:'triangle'},
  battle:{tempo:142,root:55,progression:[0,3,5,4],melody:[0,7,5,7,10,7,5,3],wave:'square'},
  late:{tempo:158,root:57,progression:[0,5,7,3],melody:[0,7,12,10,7,5,9,12],wave:'sawtooth'},
  boss:{tempo:166,root:43,progression:[0,1,5,4],melody:[0,3,7,6,3,10,7,6],wave:'sawtooth'},
  final:{tempo:180,root:41,progression:[0,6,1,5],melody:[0,7,12,13,12,10,7,6],wave:'square'}
};
const hz=m=>440*Math.pow(2,(m-69)/12);

export class AudioCues{
  constructor(){
    this.context=null;this.muted=true;this.bgmVolume=.34;this.sfxVolume=.62;
    this.master=null;this.bgmGain=null;this.sfxGain=null;this.scene='pause';this.step=0;this.nextNote=0;this.timer=0;
  }
  async unlock(){
    if(this.muted)return;
    try{
      this.context??=new (window.AudioContext||window.webkitAudioContext)();
      if(!this.master){
        this.master=this.context.createGain();this.bgmGain=this.context.createGain();this.sfxGain=this.context.createGain();
        this.bgmGain.gain.value=this.bgmVolume;this.sfxGain.gain.value=this.sfxVolume;
        this.bgmGain.connect(this.master);this.sfxGain.connect(this.master);this.master.connect(this.context.destination);
      }
      await this.context.resume();this.startClock();this.fadeBgm();
    }catch{this.muted=true;}
  }
  startClock(){if(this.timer)return;this.timer=setInterval(()=>this.schedule(),35);}
  setMuted(value){this.muted=value;if(value)this.context?.suspend();else this.unlock();}
  setBgmVolume(value){this.bgmVolume=Math.max(0,Math.min(1,value));if(this.bgmGain)this.bgmGain.gain.setTargetAtTime(this.bgmVolume,this.context.currentTime,.04);}
  setSfxVolume(value){this.sfxVolume=Math.max(0,Math.min(1,value));if(this.sfxGain)this.sfxGain.gain.setTargetAtTime(this.sfxVolume,this.context.currentTime,.04);}
  setScene(scene){
    if(scene===this.scene)return;this.scene=scene;this.step=0;this.nextNote=this.context?.currentTime||0;
    this.fadeBgm();if(scene==='victory')this.play('success');
  }
  fadeBgm(){if(!this.bgmGain||!this.context)return;const t=this.context.currentTime,g=this.scene==='pause'||this.scene==='victory'?0:this.bgmVolume;this.bgmGain.gain.cancelScheduledValues(t);this.bgmGain.gain.setTargetAtTime(g,t,.12);}
  schedule(){
    if(this.muted||!this.context||this.context.state!=='running'||!SONGS[this.scene])return;
    const song=SONGS[this.scene],unit=60/song.tempo/2;
    if(this.nextNote<this.context.currentTime)this.nextNote=this.context.currentTime+.03;
    while(this.nextNote<this.context.currentTime+.16){this.songStep(song,this.step,this.nextNote,unit);this.step++;this.nextNote+=unit;}
  }
  tone(freq,time,duration,volume,type='triangle',bus=this.bgmGain){
    if(!this.context||!bus)return;const o=this.context.createOscillator(),g=this.context.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(.001,volume),time+.012);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g);g.connect(bus);o.start(time);o.stop(time+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  songStep(song,step,time,unit){
    const s=step%16,bar=Math.floor(step/8),chord=song.progression[bar%song.progression.length];
    if(s%2===0)this.tone(hz(song.root-12+chord),time,unit*1.7,.045,'triangle');
    if(s%4===0)[0,4,7].forEach(n=>this.tone(hz(song.root+chord+n),time,unit*3.5,.012,'sine'));
    const note=song.melody[s%song.melody.length]+chord;this.tone(hz(song.root+12+note),time,unit*.78,.025,song.wave);
    this.tone(s%4===0?92:145,time,.045,s%4===0?.035:.012,'square');
  }
  play(event){
    if(this.muted||!this.context||this.context.state!=='running'||!this.sfxGain)return;
    const notes={attack:[420],hit:[720,560],defeat:[620,830],wave:[392,523],upgrade:[523,659,784],ultimate:[330,523,784,1047],heal:[659,784],warn:[260,220],shoot:[440],hurt:[180,145],danger:[294,220],stun:[190,260],boss:[196,247,294],bossPhase:[220,277,330,440],summon:[247,196,247],thunder:[988,659],meteor:[330,440],impact:[165,220],burst:[523,784,1047],bossDown:[294,392,523,784],success:[523,659,784,1047,1319],failure:[330,294,196]}[event];
    if(!notes)return;notes.forEach((f,i)=>this.tone(f,this.context.currentTime+i*.1,.17,.07,'triangle',this.sfxGain));
  }
}
