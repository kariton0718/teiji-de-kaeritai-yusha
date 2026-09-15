// Original Web Audio cues: no files, no network, user-controlled.
export class AudioCues {
  constructor(){this.context=null;this.muted=true;}
  async unlock(){
    if(this.muted)return;
    try{this.context??=new (window.AudioContext||window.webkitAudioContext)();await this.context.resume();}catch{this.muted=true;}
  }
  play(event){
    if(this.muted||!this.context||this.context.state!=='running')return;
    const notes={
      attack:[420],hit:[720,560],defeat:[620,830],wave:[392,523],upgrade:[523,659,784],
      dash:[640,880],shield:[659,988],ultimate:[330,523,784,1047],heal:[659,784],
      warn:[260,220],shoot:[440],hurt:[180,145],danger:[294,220],stun:[190,260],
      boss:[196,247,294],bossDown:[294,392,523,784],success:[523,659,784,1047,1319],failure:[330,294,196]
    }[event];
    if(!notes)return;
    notes.forEach((f,i)=>{
      const osc=this.context.createOscillator(),gain=this.context.createGain();
      const t=this.context.currentTime+i*.12;
      osc.type='triangle';osc.frequency.value=f;
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.065,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.18);
      osc.connect(gain);gain.connect(this.context.destination);osc.start(t);osc.stop(t+.2);
      osc.onended=()=>{osc.disconnect();gain.disconnect();};
    });
  }
}
