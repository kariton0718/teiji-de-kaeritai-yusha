// Original Web Audio cues: no files, no network, user-controlled.
export class AudioCues {
  constructor(){this.context=null;this.muted=true;}
  async unlock(){
    if(this.muted)return;
    try{this.context??=new (window.AudioContext||window.webkitAudioContext)();await this.context.resume();}catch{this.muted=true;}
  }
  play(event){
    if(this.muted||!this.context||this.context.state!=='running')return;
    const notes={complete:[523,659],dash:[523,659,784,1047],success:[523,659,784,1047,1319],failure:[330,294,196],encounter:[220,233],danger:[294,220],shield:[659,988]}[event];
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
