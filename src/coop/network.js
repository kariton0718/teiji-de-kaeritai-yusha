import {COOP_VERSION,COOP_ULTIMATES,safeInput,COOP_RULES} from './game.js';
export const PEERJS_URL=new URL('../../assets/coop/peerjs-1.5.5.min.js',import.meta.url).href;
export function loadPeer(){if(window.Peer)return Promise.resolve(window.Peer);return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=PEERJS_URL;script.crossOrigin='anonymous';let done=false;const finish=error=>{if(done)return;done=true;clearTimeout(timer);if(error){script.remove();reject(error);}else resolve(window.Peer);};const timer=setTimeout(()=>finish(new Error('通信ライブラリを読み込めませんでした。回線を確認して再度お試しください。')),15000);script.onload=()=>finish(window.Peer?null:new Error('通信の準備に失敗しました。'));script.onerror=()=>finish(new Error('通信の準備に失敗しました。'));document.head.append(script);});}
export function createInvite(base,room,key){const url=new URL('coop.html',base);url.search='';url.hash=new URLSearchParams({room,key}).toString();return url.href;}
export function readInvite(hash){const p=new URLSearchParams(hash.replace(/^#/,'')),room=p.get('room'),key=p.get('key');if(!room&&!key)return null;if(!/^teiji-[a-z0-9-]{20,60}$/.test(room||'')||!/^[a-f0-9]{32}$/.test(key||''))throw new Error('招待URLが正しくありません。新しいURLを送ってもらってください。');return {room,key};}
export function randomKey(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');}
export function validSnapshot(s){if(!s||s.v!==COOP_VERSION||!Number.isInteger(s.tick)||s.tick<0||!['playing','upgrade','success','failure'].includes(s.state)||!Array.isArray(s.players)||s.players.length!==2)return false;
 for(const [key,max] of [['enemies',COOP_RULES.maxEnemies],['shots',COOP_RULES.maxShots],['areas',16],['effects',65],['pickups',4]])if(!Array.isArray(s[key])||s[key].length>max)return false;
 const bounded=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
 if(!bounded(s.remaining,0,COOP_RULES.time)||!Number.isInteger(s.kills)||s.kills<0||!Array.isArray(s.choice)||s.choice.length!==2||!['wave','boss','escape'].includes(s.phase)||![1,2].includes(s.wave))return false;
 if(!s.choice.every(c=>c===null||['slash','reply','orbit'].includes(c)))return false;
 if(typeof s.reason!=='string'||s.reason.length>100||typeof s.banner!=='string'||s.banner.length>100)return false;
 if(!s.players.every((p,i)=>p.id===i&&bounded(p.x,0,480)&&bounded(p.y,0,640)&&bounded(p.hp,0,100)&&bounded(p.gauge,0,100)&&bounded(p.revive,0,3.1)&&bounded(p.effect,0,10)&&bounded(p.lock,0,12)&&p.facing&&Number.isFinite(p.facing.x)&&Number.isFinite(p.facing.y)&&p.skills&&['slash','reply','orbit'].every(k=>Number.isInteger(p.skills[k])&&p.skills[k]>=0&&p.skills[k]<=2)&&COOP_ULTIMATES.includes(p.ultimate)))return false;
 if(!s.enemies.every(e=>['slime','bat','ghost','brute','boss'].includes(e.type)&&bounded(e.radius,1,40)&&bounded(e.hp,0,1100)&&bounded(e.maxHp,1,1100)&&e.dir&&Number.isFinite(e.dir.x)&&Number.isFinite(e.dir.y)))return false;
 if(!s.shots.every(e=>bounded(e.radius,1,30)&&[-1,0,1].includes(e.owner)))return false;
 if(!s.effects.every(e=>bounded(e.radius,0,500)&&bounded(e.angle,-7,7)))return false;
 if(!s.areas.every(e=>bounded(e.radius,0,200)))return false;
 return ['enemies','shots','areas','effects','pickups'].every(key=>s[key].every(e=>e&&bounded(e.x,-100,600)&&bounded(e.y,-100,760)&&Object.values(e).every(v=>typeof v!=='number'||Number.isFinite(v))));
}
// One authenticated guest; the guest sends controls, never damage or game state.
export class CoopLink{
 constructor(Peer,{now=()=>performance.now(),onStatus=()=>{},onMessage=()=>{},onClosed=()=>{}}={}){this.Peer=Peer;this.now=now;this.onStatus=onStatus;this.onMessage=onMessage;this.onClosed=onClosed;this.peer=null;this.conn=null;this.role=null;this.closed=false;this.connected=false;this.lastSeen=0;this.lastPing=0;this.lastSeq=-1;this.seq=0;this.deadline=0;this.started=false;this.reconnectAt=0;this.reconnectAttempts=0;}
 open(invite=null){this.role=invite?'guest':'host';this.key=invite?.key||randomKey();this.room=invite?.room||`teiji-${randomKey()}`;this.deadline=this.now()+45000;this.peer=new this.Peer(this.role==='host'?this.room:undefined,{debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'}]}});
  this.peer.on('open',()=>{if(this.closed)return;this.reconnectAt=0;this.reconnectAttempts=0;if(this.role==='host'){this.deadline=0;this.onStatus('waiting');}else this.attach(this.peer.connect(this.room,{reliable:true,serialization:'json',metadata:{v:COOP_VERSION,key:this.key}}));});
  this.peer.on('connection',conn=>{if(this.closed||this.role!=='host'||this.conn||conn.metadata?.v!==COOP_VERSION||conn.metadata?.key!==this.key){conn.on('open',()=>{conn.send({v:COOP_VERSION,type:'reject'});conn.close();});return;}this.deadline=this.now()+30000;this.attach(conn);});
  this.peer.on('error',error=>{const code=String(error.type||'unknown').slice(0,50);if(code==='network'||code==='socket-error'||code==='socket-closed'){this.scheduleReconnect();return;}const hints={'peer-unavailable':'部屋が見つかりません。ホストがゲーム画面に戻ってから、もう一度参加してください。', 'webrtc':'端末間の通信を開始できませんでした。SafariまたはChromeで開き直してください。','browser-incompatible':'このブラウザーは協力通信に対応していません。SafariまたはChromeで開いてください。'};this.fail((hints[code]||'接続できませんでした。Wi-Fiや携帯回線を切り替えてお試しください。')+'（'+code+'）');});
  this.peer.on('disconnected',()=>this.scheduleReconnect());
  this.peer.on('close',()=>{if(!this.closed)this.fail('接続が終了しました。');});
 }
 scheduleReconnect(){if(this.closed||this.connected)return;if(!this.reconnectAt){this.reconnectAt=this.now()+1000;this.deadline=this.now()+45000;this.onStatus('reconnecting');}}
 resume(){if(this.closed)return;if(this.connected){this.lastSeen=this.now();this.send('ping');}else if(this.peer?.disconnected){this.scheduleReconnect();this.reconnectAt=this.now();}}
 attach(conn){this.conn=conn;conn.on('open',()=>{if(this.closed)return;this.connected=true;this.deadline=0;this.lastSeen=this.now();this.onStatus('connected');});conn.on('data',message=>this.receive(message));conn.on('close',()=>{if(!this.closed)this.fail('相手との接続が切れました。部屋を作り直してください。');});conn.on('error',()=>this.fail('通信エラーが発生しました。部屋を作り直してください。'));}
 receive(m){if(this.closed||!m||m.v!==COOP_VERSION||typeof m.type!=='string')return;if(m.type==='reject'){this.fail('部屋が満員か、招待URLが無効です。');return;}if(!this.connected)return;this.lastSeen=this.now();if(m.type==='ping')return;
  if(this.role==='host'){if(m.type==='ready'&&!this.started&&COOP_ULTIMATES.includes(m.ultimate))this.onMessage(m);else if(m.type==='input'&&this.started&&Number.isSafeInteger(m.seq)&&m.seq>this.lastSeq){this.lastSeq=m.seq;this.onMessage({type:'input',input:safeInput(m.input)});}else if(m.type==='choice'&&this.started&&['slash','reply','orbit'].includes(m.skill))this.onMessage(m);}
  else if(m.type==='start'&&!this.started&&Array.isArray(m.ultimates)&&m.ultimates.length===2&&m.ultimates.every(id=>COOP_ULTIMATES.includes(id))){this.started=true;this.lastSeq=-1;this.onMessage(m);}else if(m.type==='snapshot'&&this.started&&validSnapshot(m.data)&&Number.isSafeInteger(m.seq)&&m.seq>this.lastSeq){this.lastSeq=m.seq;this.onMessage(m);}else if(m.type==='welcome'&&!this.started)this.onMessage(m);
 }
 send(type,data={}){if(!this.connected||this.closed||!this.conn?.open)return false;const channel=this.conn.dataChannel;if(channel?.bufferedAmount>128000){this.fail('通信が追いつきませんでした。回線を確認して再接続してください。');return false;}try{this.conn.send({v:COOP_VERSION,...data,type});return true;}catch{this.fail('データを送信できませんでした。');return false;}}
 sendInput(input){return this.send('input',{seq:++this.seq,input:safeInput(input)});}
 sendSnapshot(data){return this.send('snapshot',{seq:++this.seq,data});}
 poll(){if(this.closed)return;const now=this.now();if(this.reconnectAt&&now>=this.reconnectAt){if(this.reconnectAttempts>=3){this.fail('接続サービスに復帰できませんでした。（signaling-reconnect）部屋を作り直してください。');return;}this.reconnectAttempts++;this.reconnectAt=now+5000;try{this.peer?.reconnect();}catch{}}if(this.deadline&&now>this.deadline){this.fail('接続がタイムアウトしました。（'+(this.conn?'peer-link':'signaling')+'）2人ともゲーム画面を開き、Wi-Fiや携帯回線を切り替えて再度お試しください。');return;}if(this.connected){if(now-this.lastSeen>6000){this.fail('相手の応答がなくなりました。部屋を作り直してください。');return;}if(now-this.lastPing>1000){this.lastPing=now;this.send('ping');}}}
 fail(message){if(this.closed)return;this.close();this.onClosed(message);}
 close(){if(this.closed)return;this.closed=true;this.connected=false;this.conn?.close();this.peer?.destroy();}
}

// Display-only interpolation. Collision, damage and results always use the host snapshot.
export function interpolateSnapshots(previous,current,amount){if(!previous||previous.state!==current.state)return current;const t=Math.max(0,Math.min(1,amount));const blend=(old,now)=>old?{...now,x:old.x+(now.x-old.x)*t,y:old.y+(now.y-old.y)*t}:now;return {...current,players:current.players.map(p=>blend(previous.players.find(o=>o.id===p.id),p)),enemies:current.enemies.map(e=>blend(previous.enemies.find(o=>o.id===e.id),e))};}
