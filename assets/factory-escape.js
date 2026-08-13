/* TOY BOTTLE - STG.2 태엽 공장 탈출
   기존 밀림 탈출 엔진은 그대로 보존하고, 2스테이지 탈출에서만 이 모듈이 동작한다. */
(() => {
  'use strict';

  const VERSION='20260810-25';
  const MAP_PATH='assets/factory_escape/factory_combined.png';
  const CHAR_BY_NAME={기어:'windup_soldier',미유:'plush_cat',우디:'wooden_puppet',덕키:'rubber_duck',페이퍼:'paper_robot',피코:'clown_doll',랜슬롯:'toy_knight'};
  const FACTORY_TYPES=['greenbot','bluebot','redbot','mouse'];
  const isFactory=()=>selectedMode==='escape'&&selectedStage===2||!!(G&&G.mode==='escape'&&G.stage===2);
  const jungle={};
  for(const key of ['bake','resetRun','positionPartyAtStart','gatherPartyInZone','findSpawnNear','nearestWalkable','walkableSegmentsAtY','blocked','cellAt','drawMapLayer','pausedForStory','beginIntro','confirmWarning','update','draw']) jungle[key]=ESCAPE[key].bind(ESCAPE);

  const F={
    ready:null,scenes:new Map(),parts:[],bridges:[],doors:[],phase:'idle',raid:null,timer:null,device:null,portal:null,guidancePath:null,
    active:false,warningAction:null,midboss:null,boss:null,last5Played:false,sceneBusy:false,eventSerial:0,bulldozerDefeated:false,bulldozerTimerDone:false,routeState:'ROOM4_LOCKED_DOOR_DIALOGUE_3',routeHistory:[],doorHistory:[],
    eventState:Object.create(null),sequenceTimers:new Set(),combatDialogueToken:0,
    linkedDoorId:{DEVICE4:'door_room4_to_room5',ROOM5_UNLOCK:'door_room5_to_room6',BULLDOZER_UNLOCK:'door_room6_to_arena'},
    routeOrder:['ROOM4_LOCKED_DOOR_DIALOGUE_3','ROOM4_DEVICE_SEARCH','ROOM4_DEVICE_DIALOGUE_4','ROOM4_TO_ROOM5_OPEN','ROOM5_ENTER','ROOM5_INTRO_DIALOGUE','ROOM5_WARNING','ROOM5_DEFENSE_60','ROOM5_COUNTDOWN','ROOM5_TO_ROOM6_OPEN','ROOM6_APPROACH','ROOM6_DIALOGUE','BULLDOZER_SPAWN','ROOM6_DEFENSE_30','BULLDOZER_AND_TIMER_COMPLETE','ROOM6_TO_ARENA_OPEN'],
    points:{},
    parseDialogue(text){
      const scenes=new Map();let section=0,segment='main';
      const circled={'①':1,'②':2,'③':3,'④':4,'⑤':5,'⑥':6,'⑦':7,'⑧':8,'⑨':9,'⑩':10,'⑪':11,'⑫':12,'⑬':13,'⑭':14};
      const clean=s=>s.replace(/<[^>]+>/g,'').replace(/[*#_`]/g,'').replace(/^[\s>*-]+/,'').replace(/[“”]/g,'"').trim();
      const cleanStageDirection=s=>clean(s).replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim();
      const effectFor=s=>/쿠+우*웅|쾅|쿵|우우우|철컥철컥|무너지|흔들/.test(s)?'strong':/철컥|삐|끼이|딸깍|틱|금속음/.test(s)?'medium':null;
      const sfxOnly=s=>/^(?:🚨\s*)?(?:(?:철컥|드르르르르륵|쾅|쿠+우*웅|쿵|삐|우우우우우|끼이+익|위이잉|챙|탕|펑|딸깍|틱)[\s…—!?.-]*)+$/.test(cleanStageDirection(s));
      for(const raw of text.split(/\r?\n/)){
        const line=raw.trim();if(!line)continue;
        const marker=Object.keys(circled).find(x=>line.includes(x));
        // 문서의 "⑤ 마지막 5초"는 새 구역 제목이 아니라 5번 방어전의
        // 실제 남은 시간이 5초가 되었을 때만 재생할 하위 이벤트다.
        if(section===5&&marker==='⑤'&&/마지막 5초/.test(line)){segment='last5';continue;}
        if(marker&&(line.startsWith('##')||line.startsWith(marker))){
          section=circled[marker];
          segment=section===2?'sensor':section===5?'room5Arrival':section===6?'preBoss':section===7?'arenaLock':section===10?'finalDoor':section===13?'activation':section===14?'afterOpen':'main';
          if(!scenes.has(section))scenes.set(section,[]);continue;
        }
        if(!section||/^---+$/.test(line))continue;
        if(section===5&&/중앙의 거대한 톱니가 갑자기/.test(line)){segment='room5Lock';continue;}
        if(section===5&&/붉은 경고등이 한 번씩/.test(line)){segment='room5Pulse';continue;}
        if(section===5&&/붉은 경고등이 빠르게/.test(line)){segment='room5Briefing';continue;}
        if(section===6&&/비상문 개방 중/.test(line)){segment='preBoss';continue;}
        if(section===6&&/거대한 불도저가 등장/.test(line)){segment='bossReveal';continue;}
        if(section===6&&/문 개방 후/.test(line)){segment='afterBoss';continue;}
        if(section===2&&/붉은 경고등 점등/.test(line)){segment='detected';continue;}
        if(section===7&&/붉은 경고등 점등/.test(line)){segment='arenaBriefing';continue;}
        if(section===10&&/공장 전체 조명이 꺼짐/.test(line)){segment='blackoutReaction';continue;}
        if(section===13&&/최종 셔터 개방 시작/.test(line)){segment='finalBriefing';continue;}
        if(section===8&&/격파 후/.test(line)){segment='afterBoss';continue;}
        if(/^#{1,6}\s/.test(line))continue;
        let m=line.match(/^\*\*([^:*]{1,16}):\*\*\s*[“"]?(.+?)[”"]?\s*\*\*\(([^)]+)\)\*\*$/);
        if(!m)m=line.match(/^([^:*#→]{1,16}):\s*[“"]?(.+?)[”"]?\s*\(([^)]+)\)\s*$/);
        if(m){
          const name=clean(m[1]),text=cleanStageDirection(m[2]).replace(/^"|"$/g,''),expression=clean(m[3]).split(',')[0].trim();
          if(section===5&&segment==='last5'&&name==='기어'&&/열렸다/.test(text))segment='room5AfterOpen';
          // 5번 방 개방 직후의 기어 한 줄과, 실제로 6번 비상문에 도착한 뒤의
          // 덕키/페이퍼 대사를 분리한다. 이 경계가 없으면 5번 방에서 6번 대사가 선행된다.
          if(section===5&&segment==='room5AfterOpen'&&name==='덕키'&&/또\s*문/.test(text))segment='room6Arrival';
          const group=name==='전원';
          scenes.get(section).push({char:CHAR_BY_NAME[name]||null,name,text,expression,system:!group&&!CHAR_BY_NAME[name],group,effect:effectFor(text),segment});
          continue;
        }
        const textLine=cleanStageDirection(line);
        // 문서의 설명·목표·경고·전투 지시는 대사로 만들지 않는다. 의성어만 무인 대사창과 실제 효과음으로 허용한다.
        if(!textLine||!sfxOnly(textLine))continue;
        if(section===5&&(segment==='last5'||segment==='room5Lock'||segment==='room5Pulse'||segment==='room5Briefing'))continue;
        if(section===14)continue;
        scenes.get(section).push({char:null,name:'',text:textLine,expression:'기본 표정',system:true,effect:effectFor(textLine),factorySfx:true,segment});
      }
      this.scenes=scenes;return scenes;
    },
    loadDialogue(){
      if(this.ready)return this.ready;
      this.ready=fetch(`assets/dialog/factory-escape-dialogue.txt?v=${VERSION}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`factory dialogue ${r.status}`);return r.text();}).then(t=>this.parseDialogue(t)).catch(err=>{console.error('[TOY BOTTLE] factory dialogue load failed',err);return this.scenes;});
      return this.ready;
    },
    stripImage(im){
      const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,cv=document.createElement('canvas');cv.width=w;cv.height=h;
      const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(im,0,0,w,h);const id=c.getImageData(0,0,w,h),a=id.data,lum=new Uint8Array(w*h),alpha=new Uint8Array(w*h);
      for(let i=0,j=0;i<a.length;i+=4,j++){const l=(a[i]*3+a[i+1]*4+a[i+2])/8;lum[j]=l;const av=l<23?0:l<34?Math.round((l-23)/11*255):255;a[i+3]=av;alpha[j]=av;}
      c.putImageData(id,0,0);return{canvas:cv,lum,alpha,w,h};
    },
    bake(){
      if(this.active&&ESCAPE.baked&&ESCAPE.factory)return;
      const s=4.3,im=IMG[MAP_PATH];
      if(!im||!im.complete||!im.naturalWidth)throw new Error(`factory map not ready: ${MAP_PATH}`);
      const raw=this.stripImage(im);
      const m1={id:'m1',...raw,x:0,y:0,s};
      this.parts=[m1];
      // 새 맵은 방/보스방이 전부 하나로 이어진 단일 원화 이미지라 예전처럼
      // 세 조각을 잇는 연결판/브릿지가 필요 없다.
      this.bridges=[];
      const minX=0,minY=0,maxX=Math.min(WORLD,m1.w*s),maxY=m1.h*s;
      ESCAPE.factory=true;ESCAPE.baked=true;ESCAPE.mapCanvas=null;ESCAPE.sourceCanvas=null;ESCAPE.mapLeft=minX;ESCAPE.mapTop=minY;ESCAPE.mapW=maxX-minX;ESCAPE.mapH=maxY-minY;
      ESCAPE.map2TopY=minY;ESCAPE.map2W=ESCAPE.mapW;ESCAPE.map2H=ESCAPE.mapH;ESCAPE.map1W=0;ESCAPE.map1H=0;ESCAPE.map2BotY=maxY;ESCAPE.map1TopY=maxY;
      this.points={
        start:this.local(m1,1215,780),room2:this.local(m1,1035,775),room4:this.local(m1,785,695),room5:this.local(m1,545,865),bulldozerTrigger:this.local(m1,430,775),
        transferLow:this.local(m1,250,600),arena:this.local(m1,250,485),transferHigh:this.local(m1,250,180),room9:this.local(m1,600,190),
        finalLock:this.local(m1,1030,190),finalDevice:this.local(m1,1150,195),exit:this.local(m1,1235,195)
      };
      ESCAPE.cx=this.points.start.x;ESCAPE.startY=this.points.start.y;
      this.buildGrid();this.installDoors();this.loadDialogue();this.active=true;
    },
    local(part,x,y){return{x:part.x+x*part.s,y:part.y+y*part.s};},
    samplePart(part,x,y){
      // 실제로 눈에 보이는 불투명한 바닥일 때만 걸을 수 있게 한다. 렌더링에
      // 쓰는 alpha와 같은 기준을 써서, 화면엔 검은 배경인데 이동은 되는
      // 어긋남(보이지 않는 구멍)이 생기지 않게 막는다.
      const sx=(x-part.x)/part.s,sy=(y-part.y)/part.s;if(sx<0||sy<0||sx>=part.w||sy>=part.h)return 0;
      const ix=Math.max(0,Math.min(part.w-1,Math.round(sx))),iy=Math.max(0,Math.min(part.h-1,Math.round(sy))),r=3;
      let sum=0,n=0,min=255;for(let oy=-r;oy<=r;oy+=3)for(let ox=-r;ox<=r;ox+=3){const xx=Math.max(0,Math.min(part.w-1,ix+ox)),yy=Math.max(0,Math.min(part.h-1,iy+oy)),v=part.alpha[yy*part.w+xx];sum+=v;n++;if(v<min)min=v;}
      return sum/n>=200&&min>=120?1:0;
    },
    pointBridgeWalkable(){return false;},
    buildGrid(){
      const cell=24,ox=0,oy=Math.max(0,ESCAPE.mapTop-120),gw=Math.ceil(WORLD/cell),gh=Math.ceil((ESCAPE.mapTop+ESCAPE.mapH+120-oy)/cell),grid=new Uint8Array(gw*gh);
      ESCAPE.gridCell=cell;ESCAPE.gridOX=ox;ESCAPE.gridOY=oy;ESCAPE.gridW=gw;ESCAPE.gridH=gh;
      for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){const x=ox+(gx+.5)*cell,y=oy+(gy+.5)*cell;grid[gy*gw+gx]=this.parts.some(p=>this.samplePart(p,x,y))?1:0;}
      // 안티에일리어싱 잡음만 메우고, 그림에 실제로 없는 통로를 이어붙이지
      // 않도록 8칸 전부 걸을 수 있을 때만 구멍을 채운다(진짜 틈은 그대로 막힘).
      {
        const src=grid.slice();for(let gy=1;gy<gh-1;gy++)for(let gx=1;gx<gw-1;gx++){
          let n=0;for(let oy2=-1;oy2<=1;oy2++)for(let ox2=-1;ox2<=1;ox2++)if(ox2||oy2)n+=src[(gy+oy2)*gw+gx+ox2];
          const i=gy*gw+gx;if(!src[i]&&n>=8)grid[i]=1;else if(src[i]&&n<=1)grid[i]=0;
        }
      }
      ESCAPE.grid=grid;
    },
    installDoors(){
      const p=this.parts.find(x=>x.id==='m1');
      this.doors=[
        // 아래 길이는 안전한 초깃값이며, 생성 직후 실제 통로의 양쪽 벽까지 자동으로 맞춘다.
        this.door('firstFront',this.local(p,1130,778),Math.PI/2,180,false,'첫 습격 전방문'),
        this.door('firstBack',this.local(p,930,775),Math.PI/2,180,false,'첫 습격 후방문'),
        this.door('door_room4_to_room5',this.local(p,654.65,776.05),Math.PI/2,180,true,'4번→5번 입구'),
        this.door('door_room5_to_room6',this.local(p,476.05,776.16),Math.PI/2,180,true,'5번→6번 출구'),
        this.door('door_room6_to_arena',this.local(p,249.07,619.53),0,180,true,'6번→7·8번 출구'),
        this.door('arenaLow',this.local(p,239.77,592.93),0,180,false,'투기장 하부 태엽문'),
        this.door('arenaHigh',this.local(p,250,183),0,180,false,'투기장 상부 태엽문'),
        this.door('room9Back',this.local(p,348.8,181.4),Math.PI/2,180,false,'9번 구역 후방문'),
        this.door('room9Front',this.local(p,625.6,181.4),Math.PI/2,180,false,'9번 구역 전방문'),
        this.door('finalBack',this.local(p,950,192),Math.PI/2,180,false,'최종 구역 후방문'),
        this.door('final',this.local(p,1244.2,195),Math.PI/2,180,true,'최종 셔터 태엽문')
      ];
      for(const d of this.doors)this.fitDoorToPassage(d);
      ESCAPE.gateA=this.byDoor('door_room4_to_room5');ESCAPE.gateB=this.byDoor('door_room5_to_room6');ESCAPE.gateC=this.byDoor('door_room6_to_arena');ESCAPE.gateD=null;
    },
    door(id,c,a,len,locked,label,permanent=false,thickness=78){return{id,x:c.x,y:c.y,a,len,thickness,locked,state:locked?'LOCKED':'OPEN',label,openT:locked?0:1,permanent};},
    fitDoorToPassage(d){
      // 공장 PNG는 3배 확대되어 큰 입구가 720px보다 길다. 양쪽 벽까지 전부 탐색해
      // 보이는 톱니문 길이와 실제 충돌 길이를 같은 값으로 맞춘다.
      const ca=Math.cos(d.a),sa=Math.sin(d.a),step=12,max=1500;let neg=0,pos=0;
      if(this.cellAt(d.x,d.y)!==1)return d;
      while(neg<max&&this.cellAt(d.x-ca*(neg+step),d.y-sa*(neg+step))===1)neg+=step;
      while(pos<max&&this.cellAt(d.x+ca*(pos+step),d.y+sa*(pos+step))===1)pos+=step;
      if(neg+pos>=72)d.len=Math.min(max,neg+pos+step*2);
      return d;
    },
    byDoor(id){return this.doors.find(d=>d.id===id);},
    lockDoors(ids){for(const id of ids){const d=this.byDoor(id);if(d){d.locked=true;d.state='LOCKED';d.openT=0;this.doorHistory.push({id,action:'LOCK',routeState:this.routeState});}}},
    openDoors(ids){for(const id of ids){const d=this.byDoor(id);if(d&&!d.permanent){d.locked=false;d.state='OPEN';d.openT=1;this.doorHistory.push({id,action:'OPEN',routeState:this.routeState});}}},
    pointSegmentDistance(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy;if(!l)return Math.hypot(px-x1,py-y1);const t=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/l));return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));},
    doorBlocked(x,y,r){
      for(const d of this.doors){if(!d.locked)continue;const ca=Math.cos(d.a),sa=Math.sin(d.a),hx=ca*d.len*.5,hy=sa*d.len*.5;if(this.pointSegmentDistance(x,y,d.x-hx,d.y-hy,d.x+hx,d.y+hy)<r+d.thickness*.5)return true;}
      return false;
    },
    cellAt(x,y){const gx=Math.floor((x-ESCAPE.gridOX)/ESCAPE.gridCell),gy=Math.floor((y-ESCAPE.gridOY)/ESCAPE.gridCell);if(gx<0||gy<0||gx>=ESCAPE.gridW||gy>=ESCAPE.gridH)return 0;return ESCAPE.grid[gy*ESCAPE.gridW+gx];},
    blocked(x,y,r=0){
      if(x<r||x>WORLD-r||y<ESCAPE.gridOY+r||y>ESCAPE.gridOY+ESCAPE.gridH*ESCAPE.gridCell-r)return true;
      const samples=r>2?[[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,r*.7],[r*.7,-r*.7],[-r*.7,-r*.7]]:[[0,0]];
      if(samples.some(q=>this.cellAt(x+q[0],y+q[1])!==1))return true;
      return this.doorBlocked(x,y,r);
    },
    nearestWalkable(x,y){
      x=Math.max(12,Math.min(WORLD-12,x));y=Math.max(ESCAPE.gridOY+12,Math.min(ESCAPE.gridOY+ESCAPE.gridH*ESCAPE.gridCell-12,y));
      if(!this.blocked(x,y,14))return{x,y};const c=ESCAPE.gridCell,gx=Math.floor((x-ESCAPE.gridOX)/c),gy=Math.floor((y-ESCAPE.gridOY)/c);
      for(let rad=1;rad<90;rad++)for(let yy=-rad;yy<=rad;yy++)for(let xx=-rad;xx<=rad;xx++){if(Math.abs(xx)!==rad&&Math.abs(yy)!==rad)continue;const wx=ESCAPE.gridOX+(gx+xx+.5)*c,wy=ESCAPE.gridOY+(gy+yy+.5)*c;if(!this.blocked(wx,wy,14))return{x:wx,y:wy};}
      return{x:this.points.start.x,y:this.points.start.y};
    },
    gridPath(from,to){
      const start=this.nearestWalkable(from.x,from.y),goal=this.nearestWalkable(to.x,to.y),c=ESCAPE.gridCell,gw=ESCAPE.gridW,gh=ESCAPE.gridH,total=gw*gh;
      const toCell=p=>({gx:Math.max(0,Math.min(gw-1,Math.floor((p.x-ESCAPE.gridOX)/c))),gy:Math.max(0,Math.min(gh-1,Math.floor((p.y-ESCAPE.gridOY)/c)))}),s=toCell(start),g=toCell(goal),si=s.gy*gw+s.gx,gi=g.gy*gw+g.gx;
      const parent=new Int32Array(total);parent.fill(-2);parent[si]=-1;const queue=new Int32Array(total);let head=0,tail=0;queue[tail++]=si;
      const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
      while(head<tail&&parent[gi]===-2){
        const i=queue[head++],x=i%gw,y=(i/gw)|0;
        for(const [dx,dy] of dirs){
          const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=gw||ny>=gh)continue;const ni=ny*gw+nx;if(parent[ni]!==-2)continue;
          const wx=ESCAPE.gridOX+(nx+.5)*c,wy=ESCAPE.gridOY+(ny+.5)*c;if(this.blocked(wx,wy,8))continue;
          if(dx&&dy){const ax=ESCAPE.gridOX+(x+dx+.5)*c,ay=ESCAPE.gridOY+(y+.5)*c,bx=ESCAPE.gridOX+(x+.5)*c,by=ESCAPE.gridOY+(y+dy+.5)*c;if(this.blocked(ax,ay,8)||this.blocked(bx,by,8))continue;}
          parent[ni]=i;queue[tail++]=ni;
        }
      }
      if(parent[gi]===-2)return[];const raw=[];for(let i=gi;i>=0;i=parent[i])raw.push({x:ESCAPE.gridOX+(i%gw+.5)*c,y:ESCAPE.gridOY+(((i/gw)|0)+.5)*c});raw.reverse();
      const reduced=raw.filter((_,i)=>i===0||i===raw.length-1||i%4===0);reduced[0]=start;reduced[reduced.length-1]=goal;return reduced;
    },
    buildGuidancePath(from,to){this.guidancePath=this.gridPath(from,to);return this.guidancePath;},
    findSpawnNear(px,py,minD=280,maxD=760,zone=null){
      for(let i=0;i<90;i++){const a=Math.random()*Math.PI*2,d=minD+Math.random()*(maxD-minD),p=this.nearestWalkable(px+Math.cos(a)*d,py+Math.sin(a)*d);if(Math.hypot(p.x-px,p.y-py)<minD*.72)continue;if(zone&&!this.inZone(p,zone,-30))continue;return p;}return null;
    },
    inZone(p,z,pad=0){return p.x>=z.x-pad&&p.x<=z.x+z.w+pad&&p.y>=z.y-pad&&p.y<=z.y+z.h+pad;},
    walkableSegmentsAtY(y,minWidth=54){
      const c=ESCAPE.gridCell,gy=Math.floor((y-ESCAPE.gridOY)/c);if(gy<0||gy>=ESCAPE.gridH)return[];const out=[];let begin=-1;
      for(let gx=0;gx<=ESCAPE.gridW;gx++){const ok=gx<ESCAPE.gridW&&ESCAPE.grid[gy*ESCAPE.gridW+gx]===1;if(ok&&begin<0)begin=gx;if(!ok&&begin>=0){const left=ESCAPE.gridOX+begin*c,right=ESCAPE.gridOX+gx*c;if(right-left>=minWidth)out.push({left,right});begin=-1;}}
      return out;
    },
    placeParty(point=this.points.start){
      const units=[G.p,...G.allies.filter(a=>!a.dead)],slots=[[0,0],[-70,65],[70,65],[0,115]];let blocked=0;
      units.forEach((u,i)=>{const p=this.nearestWalkable(point.x+slots[i%slots.length][0],point.y+slots[i%slots.length][1]);u.x=p.x;u.y=p.y;u.vx=u.vy=0;if(this.blocked(u.x,u.y,u.r||18))blocked++;});
      this.syncPlayerPets();cam.x=G.p.x;cam.y=G.p.y;ESCAPE.lastPartyGather={units:units.length,spots:units.length,blocked};return ESCAPE.lastPartyGather;
    },
    gatherAlliesNearPlayer(){
      const slots=[[-72,58],[72,58],[-118,112],[118,112]];
      G.allies.filter(a=>!a.dead).forEach((a,i)=>{
        if(Math.hypot(a.x-G.p.x,a.y-G.p.y)<520)return;
        const slot=slots[i%slots.length],p=this.nearestWalkable(G.p.x+slot[0],G.p.y+slot[1]);
        a.x=p.x;a.y=p.y;a.vx=a.vy=0;
      });
    },
    syncPlayerPets(){
      const p=G&&G.p;if(!p)return;
      // 좌표를 따로 보관하는 꼬마 탱크도 파티와 함께 방 안으로 들어온다.
      if(p.flags?.tank){const q=this.nearestWalkable(p.x-52,p.y+28);p.tankX=q.x;p.tankY=q.y;p.tankTargetRef=null;p.tankAvoidT=0;}
      p.ufoRoam=0;p.ufoRoamTarget=0;p.lfRoam=0;
    },
    stagePartyForEncounter(zone,anchor=null,options={}){
      const includePlayer=options.includePlayer!==false;
      const units=[...(includePlayer?[G.p]:[]),...G.allies.filter(a=>!a.dead)],spots=[];
      if(!includePlayer&&this.inZone(G.p,zone,-(G.p.r||18)))spots.push({x:G.p.x,y:G.p.y});
      const cx=anchor?.x??(includePlayer?zone.x+zone.w/2:G.p.x),cy=anchor?.y??(includePlayer?zone.y+zone.h/2:G.p.y),margin=58;
      const candidates=[{x:cx,y:cy}];
      for(let ring=1;ring<=8;ring++)for(let step=0;step<16;step++){
        const a=step/16*Math.PI*2+(ring%2)*Math.PI/16,rx=Math.min(zone.w*.38,ring*48),ry=Math.min(zone.h*.38,ring*42);
        candidates.push({x:cx+Math.cos(a)*rx,y:cy+Math.sin(a)*ry});
      }
      for(const u of units){
        const r=Math.max(14,u.r||18);let chosen=candidates.find(p=>this.inZone(p,zone,-margin)&&!this.blocked(p.x,p.y,r)&&spots.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>=58));
        if(!chosen){
          for(let y=zone.y+margin;!chosen&&y<=zone.y+zone.h-margin;y+=36)for(let x=zone.x+margin;x<=zone.x+zone.w-margin;x+=36){
            const p={x,y};if(!this.blocked(x,y,r)&&spots.every(q=>Math.hypot(x-q.x,y-q.y)>=52)){chosen=p;break;}
          }
        }
        if(!chosen){
          const center={x:Math.max(zone.x+margin,Math.min(zone.x+zone.w-margin,cx)),y:Math.max(zone.y+margin,Math.min(zone.y+zone.h-margin,cy))};
          chosen=this.inZone(center,zone,-margin)&&!this.blocked(center.x,center.y,r)?center:null;
        }
        if(!chosen)throw new Error(`[factory] no party slot inside ${zone.name||'encounter'} boundary`);
        u.x=chosen.x;u.y=chosen.y;u.vx=u.vy=0;spots.push(chosen);
      }
      this.syncPlayerPets();if(includePlayer){cam.x=G.p.x;cam.y=G.p.y;}
      const outside=units.filter(u=>!this.inZone(u,zone,0)).length,blocked=units.filter(u=>this.blocked(u.x,u.y,u.r||18)).length;
      ESCAPE.lastPartyGather={units:units.length,spots:spots.length,outside,blocked,zone:{...zone}};
      return ESCAPE.lastPartyGather;
    },
    zone(cx,cy,w,h,axis='horizontal'){return{x:cx-w/2,y:cy-h/2,w,h,axis};},
    zoneBetweenX(backId,frontId,cy,name){
      const a=this.byDoor(backId),b=this.byDoor(frontId),inset=34;
      if(!a||!b)return null;
      const left=Math.min(a.x,b.x)+Math.max(a.thickness,b.thickness)*.5+inset,right=Math.max(a.x,b.x)-Math.max(a.thickness,b.thickness)*.5-inset;
      const h=Math.max(260,Math.max(a.len,b.len)-36);
      return{name,x:left,y:cy-h/2,w:Math.max(180,right-left),h,axis:'horizontal',backDoor:backId,frontDoor:frontId};
    },
    zoneBetweenY(lowId,highId,cx,name){
      const a=this.byDoor(lowId),b=this.byDoor(highId),inset=34;
      if(!a||!b)return null;
      const top=Math.min(a.y,b.y)+Math.max(a.thickness,b.thickness)*.5+inset,bottom=Math.max(a.y,b.y)-Math.max(a.thickness,b.thickness)*.5-inset;
      const w=Math.max(260,Math.max(a.len,b.len)-36);
      return{name,x:cx-w/2,y:top,w,h:Math.max(180,bottom-top),axis:'vertical',backDoor:lowId,frontDoor:highId};
    },
    bulldozerZone(){
      const west=this.byDoor('door_room6_to_arena'),east=this.byDoor('door_room5_to_room6'),inset=36,pad=190;
      if(!west||!east)return null;
      const left=Math.min(west.x,east.x)+Math.max(west.thickness,east.thickness)*.5+inset;
      const right=Math.max(west.x,east.x)-Math.max(west.thickness,east.thickness)*.5-inset;
      const top=Math.min(west.y,east.y)-pad,bottom=Math.max(west.y,east.y)+pad;
      return{name:'bulldozer',x:left,y:top,w:Math.max(260,right-left),h:Math.max(520,bottom-top),axis:'horizontal',backDoor:'door_room5_to_room6',frontDoor:'door_room6_to_arena'};
    },
    zoneFor(name){
      const p=this.points;
      return ({
        first:()=>this.zoneBetweenX('firstBack','firstFront',p.room2.y,'first'),
        room5:()=>this.zoneBetweenX('door_room5_to_room6','door_room4_to_room5',p.room5.y,'room5'),
        bulldozer:()=>this.bulldozerZone(),
        arena:()=>this.zoneBetweenY('arenaHigh','arenaLow',p.arena.x,'arena'),
        room9:()=>this.zoneBetweenX('room9Back','room9Front',p.room9.y,'room9'),
        final:()=>this.zoneBetweenX('finalBack','final',p.finalDevice.y,'final')
      })[name]?.()||null;
    },
    resetEventStates(){
      this.eventState=Object.create(null);
      this.routeState='ROOM4_LOCKED_DOOR_DIALOGUE_3';
      this.routeHistory=[this.routeState];this.doorHistory=[];
      for(const key of [
        'INTRO','FIRST_STORY','FIRST_RAID','DEVICE_STORY','DEVICE4',
        'ROOM5_STORY','ROOM5_DEFENSE','ROOM5_UNLOCK',
        'BULLDOZER_INTRO','BULLDOZER_DEFENSE','BULLDOZER_UNLOCK',
        'ARENA_STORY','ARENA_DEFENSE','ROBOT_INTRO','ROBOT_BOSS',
        'ROOM9_STORY','ROOM9_RAID','FINAL_STORY','GIANT_BOSS',
        'FINAL_DEVICE','FINAL_DEFENSE','FINAL_UNLOCK'
      ])this.eventState[key]='PENDING';
    },
    beginEvent(key){if(this.eventState[key]!=='PENDING')return false;this.eventState[key]='RUNNING';return true;},
    completeEvent(key){this.eventState[key]='COMPLETED';},
    eventDone(key){return this.eventState[key]==='COMPLETED';},
    setRouteState(next){
      if(next===this.routeState)return true;
      const currentIndex=this.routeOrder.indexOf(this.routeState),nextIndex=this.routeOrder.indexOf(next);
      if(currentIndex<0||nextIndex!==currentIndex+1){console.error('[factory] rejected route transition',{from:this.routeState,to:next});return false;}
      this.routeState=next;this.routeHistory.push(next);return true;
    },
    later(fn,ms){const id=setTimeout(()=>{this.sequenceTimers.delete(id);fn();},ms);this.sequenceTimers.add(id);return id;},
    clearSequences(){for(const id of this.sequenceTimers)clearTimeout(id);this.sequenceTimers.clear();this.combatDialogueToken++;this.hideSystem();this.hideCombatDialogue();this.endBlackout();},
    showSystem(text,ms=0,done=null){
      const box=document.getElementById('factorySystem'),label=document.getElementById('factorySystemText');if(!box||!label){if(done)done();return;}
      label.textContent=text;box.classList.add('show');if(ms>0)this.later(()=>{this.hideSystem();if(done)done();},ms);
    },
    hideSystem(){document.getElementById('factorySystem')?.classList.remove('show');},
    hideCombatDialogue(){document.getElementById('factoryCombatDialogue')?.classList.remove('show');},
    playCue(text,done=null,duration=620){
      const line={char:null,name:'',text,system:true,effect:/쿠웅|쾅|쿵/.test(text)?'strong':'medium',factorySfx:true};
      this.showCombatLine(line);this.later(()=>{this.hideCombatDialogue();if(done)done();},duration);
    },
    playFactorySound(text){
      AudioMgr.unlock();
      if(/사이렌|우우우/.test(text)){AudioMgr.bossWarnStart();return;}
      if(/드르르/.test(text)){AudioMgr.tone(88,.58,'sawtooth',.22,-18);AudioMgr.noise(.45,.18,480);return;}
      if(/쿠웅|쾅|쿵/.test(text)){AudioMgr.sfx('hammer',.88);AudioMgr.tone(64,.22,'square',.22,-28);shake=Math.max(shake,15);return;}
      if(/삐/.test(text)){AudioMgr.tone(760,.11,'square',.16,-30);return;}
      if(/철컥|딸깍/.test(text)){AudioMgr.sfx('click',.9);AudioMgr.tone(520,.06,'square',.11,130);}
    },
    showCombatLine(line){
      const box=document.getElementById('factoryCombatDialogue'),img=document.getElementById('factoryCombatPortrait'),speaker=document.getElementById('factoryCombatSpeaker'),text=document.getElementById('factoryCombatText');if(!box||!img||!speaker||!text)return;
      const hasPortrait=!!line.char;box.classList.toggle('no-portrait',!hasPortrait);img.style.display=hasPortrait?'block':'none';if(hasPortrait)img.src=`assets/portraits/${line.char}.webp?v=${VERSION}`;
      speaker.textContent=line.group?'전원':line.name||'';text.textContent=line.text;box.classList.add('show');if(line.factorySfx)this.playFactorySound(line.text);
    },
    playCombatLines(lines,done=null,interval=560){
      const token=++this.combatDialogueToken,queue=(lines||[]).slice();let i=0;
      const next=()=>{if(token!==this.combatDialogueToken)return;if(i>=queue.length){this.hideCombatDialogue();if(done)done();return;}const line=queue[i++];this.showCombatLine(line);this.later(next,interval);};next();
    },
    runRoom5Machinery(done){
      stopGameLoop();
      this.playCue('철컥—!!',()=>this.playCue('드르르르르륵—!!',()=>this.playCue('쾅!!',done,650),760),560);
    },
    runRoom5Pulses(done){
      stopGameLoop();let count=0;const pulse=()=>{count++;const flash=document.getElementById('escapeAlertFlash');flash?.classList.add('show');this.playFactorySound('삐—!');this.showCombatLine({char:null,name:'',text:'삐—!',system:true});this.later(()=>flash?.classList.remove('show'),170);if(count<3)this.later(pulse,420);else this.later(()=>{this.hideCombatDialogue();done();},520);};pulse();
    },
    runCountdown(done){
      stopGameLoop();const steps=['3...','2...','1...'];let i=0;const tick=()=>{if(i<steps.length){this.showSystem(steps[i++]);AudioMgr.tone(520,.10,'square',.14,-25);this.later(tick,700);return;}this.hideSystem();this.playCue('철컥—!!',()=>this.playCue('쿠웅— 철컥!!',done,760),620);};tick();
    },
    runBlackout(done){
      stopGameLoop();const flash=document.getElementById('escapeAlertFlash');document.body.classList.add('factory-blackout');flash?.classList.add('show');
      this.later(()=>{flash?.classList.remove('show');if(done)done();},900);
    },
    endBlackout(){document.body.classList.remove('factory-blackout');document.getElementById('escapeAlertFlash')?.classList.remove('show');},
    sceneLines(n,segment=null,part='all'){
      let lines=(this.scenes.get(n)||[]).filter(x=>!segment||x.segment===segment);
      if(!segment&&n===5)lines=lines.filter(x=>x.segment!=='last5');
      if(part==='beforeBoss')lines=lines.filter(x=>x.segment!=='afterBoss');
      if(part==='afterBoss')lines=lines.filter(x=>x.segment==='afterBoss');
      return lines;
    },
    playScene(n,done,opts={}){
      this.sceneBusy=true;const run=++this.eventSerial;stopGameLoop();
      this.loadDialogue().then(()=>{if(!isFactory()||run!==this.eventSerial)return;const lines=this.sceneLines(n,opts.segment||null,opts.part||'all');if(!lines.length){this.sceneBusy=false;if(done)done();startGameLoop();return;}ESCAPE.beginDialogue(lines,()=>{this.sceneBusy=false;if(done)done();},opts.skippable!==false);});
    },
    alert(title,text,done,boss=false){
      this.warningAction=done;ESCAPE.warning={factory:true,boss};document.getElementById('escapeWarningTitle').textContent=title;document.getElementById('escapeWarningText').textContent=text;document.getElementById('escapeWarning').classList.add('show');
      document.getElementById('escapeAlertFlash').classList.add('show');setTimeout(()=>document.getElementById('escapeAlertFlash').classList.remove('show'),1800);AudioMgr.bossWarnStart();stopGameLoop();
    },
    difficultyProfile(){
      const key=(G&&G.difficulty)||selectedDiff||'normal';
      return ({
        easy:{raidCount:.70,cap:.72,gap:1.22,burst:-1},
        normal:{raidCount:1,cap:1,gap:1,burst:0},
        hard:{raidCount:1.22,cap:1.18,gap:.86,burst:1}
      })[key]||{raidCount:1,cap:1,gap:1,burst:0};
    },
    timerProfile(kind){
      return ({
        room5:{cap:44,startGap:1.15,endGap:.62,bursts:[4,5,7],waves:3,opening:22},
        bulldozer:{cap:16,startGap:1.05,endGap:.72,bursts:[1,1,2],waves:1},
        arena:{cap:56,startGap:.58,endGap:.28,bursts:[2,2,3],waves:3},
        final:{cap:64,startGap:.52,endGap:.24,bursts:[2,3,4],waves:3,opening:20}
      })[kind]||{cap:32,startGap:.82,endGap:.46,bursts:[1,2,2],waves:3};
    },
    confirmWarning(){const cb=this.warningAction;this.warningAction=null;ESCAPE.warning=null;document.getElementById('escapeWarning').classList.remove('show');AudioMgr.bossWarnStop();if(cb)cb();startGameLoop();},
    factoryEnemyType(fast=false){
      const r=Math.random();return fast?(r<.38?'mouse':r<.64?'redbot':r<.82?'greenbot':Math.random()<.5?'bluebot':'redbot'):FACTORY_TYPES[(Math.random()*FACTORY_TYPES.length)|0];
    },
    spawnEnemyAt(candidate,zone,tag,fast=false,minPartyDistance=255,typeOverride=null,side=null,axis='horizontal'){
      const fighters=[G.p,...G.allies.filter(a=>!a.dead)],p={x:candidate.x,y:candidate.y};
      const onRequestedSide=q=>side==null||(axis==='vertical'?(side===0?q.y<=zone.y+zone.h*.5:q.y>=zone.y+zone.h*.5):(side===0?q.x<=zone.x+zone.w*.5:q.x>=zone.x+zone.w*.5));
      if(!this.inZone(p,zone,-22)||!onRequestedSide(p)||this.blocked(p.x,p.y,16))return null;
      if(fighters.some(f=>Math.hypot(p.x-f.x,p.y-f.y)<minPartyDistance))return null;
      if(G.enemies.some(e=>!e.dead&&Math.hypot(p.x-e.x,p.y-e.y)<24))return null;
      const e=spawnEnemy(typeOverride||this.factoryEnemyType(fast),0,p);e.factoryTag=tag;e.factorySafeX=p.x;e.factorySafeY=p.y;e.factoryZone={x:zone.x,y:zone.y,w:zone.w,h:zone.h};e.factorySide=side;e.factoryAxis=axis;return e;
    },
    spawnEnemyBatch(zone,tag,count,fast=false,axis='horizontal'){
      axis=zone.axis||axis;
      const perSide=[Math.ceil(count/2),Math.floor(count/2)],made=[],margin=28,fighters=[G.p,...G.allies.filter(a=>!a.dead)];
      for(let side=0;side<2;side++){
        const candidates=[],step=24,cx=zone.x+zone.w*.5,cy=zone.y+zone.h*.5;
        for(let y=zone.y+margin;y<=zone.y+zone.h-margin;y+=step)for(let x=zone.x+margin;x<=zone.x+zone.w-margin;x+=step){
          const correctSide=axis==='vertical'?(side===0?y<=cy:y>=cy):(side===0?x<=cx:x>=cx);
          if(!correctSide||this.blocked(x,y,16))continue;
          const partyDistance=Math.min(...fighters.map(f=>Math.hypot(x-f.x,y-f.y))),edgeDepth=axis==='vertical'?(side===0?y-zone.y:zone.y+zone.h-y):(side===0?x-zone.x:zone.x+zone.w-x);
          candidates.push({x,y,partyDistance,edgeDepth});
        }
        candidates.sort((a,b)=>(b.partyDistance-a.partyDistance)||(a.edgeDepth-b.edgeDepth));
        const minPartyDistance=Math.min(300,Math.max(190,(axis==='vertical'?zone.h:zone.w)*.36));
        let madeOnSide=0;
        for(const distanceLimit of [minPartyDistance,Math.max(155,minPartyDistance*.72),110]){
          for(const candidate of candidates){
            if(madeOnSide>=perSide[side])break;
            const type=FACTORY_TYPES[(madeOnSide+side*2)%FACTORY_TYPES.length],e=this.spawnEnemyAt(candidate,zone,tag,fast,distanceLimit,type,side,axis);
            if(e){made.push(e);madeOnSide++;}
          }
          if(madeOnSide>=perSide[side])break;
        }
      }
      return made;
    },
    spawnEnemyIn(zone,tag,fast=false){
      const fighters=[G.p,...G.allies.filter(a=>!a.dead)],pad=52,minPartyDistance=340;
      let p=null;
      const usable=candidate=>candidate&&this.inZone(candidate,zone,-20)&&!this.blocked(candidate.x,candidate.y,18)&&!fighters.some(f=>Math.hypot(candidate.x-f.x,candidate.y-f.y)<minPartyDistance)&&!G.enemies.some(e=>!e.dead&&Math.hypot(candidate.x-e.x,candidate.y-e.y)<46);
      for(let attempt=0;attempt<180&&!p;attempt++){
        const edge=(Math.random()*4)|0,t=.12+Math.random()*.76;
        let x,y;
        if(edge===0){x=zone.x+zone.w*t;y=zone.y+pad;}
        else if(edge===1){x=zone.x+zone.w-pad;y=zone.y+zone.h*t;}
        else if(edge===2){x=zone.x+zone.w*t;y=zone.y+zone.h-pad;}
        else{x=zone.x+pad;y=zone.y+zone.h*t;}
        const candidate=this.nearestWalkable(x,y);
        if(usable(candidate))p=candidate;
      }
      if(!p){
        const minD=Math.min(zone.w,zone.h)*.42,maxD=Math.max(zone.w,zone.h)*.58;
        for(let attempt=0;attempt<96&&!p;attempt++){
          const candidate=this.findSpawnNear(zone.x+zone.w/2,zone.y+zone.h/2,minD,maxD,zone);
          if(usable(candidate))p=candidate;
        }
      }
      if(!p){
        const candidates=[];
        for(let i=0;i<=20;i++){
          const t=.08+i*.84/20;
          candidates.push({x:zone.x+zone.w*t,y:zone.y+pad},{x:zone.x+zone.w-pad,y:zone.y+zone.h*t},{x:zone.x+zone.w*t,y:zone.y+zone.h-pad},{x:zone.x+pad,y:zone.y+zone.h*t});
        }
        const fitted=candidates.map(q=>this.nearestWalkable(q.x,q.y)).filter(usable).sort((a,b)=>Math.min(...fighters.map(f=>Math.hypot(b.x-f.x,b.y-f.y)))-Math.min(...fighters.map(f=>Math.hypot(a.x-f.x,a.y-f.y))));
        p=fitted[0]||null;
      }
      if(!p){
        const relaxed=candidate=>candidate&&this.inZone(candidate,zone,-16)&&!this.blocked(candidate.x,candidate.y,18)&&!fighters.some(f=>Math.hypot(candidate.x-f.x,candidate.y-f.y)<310)&&!G.enemies.some(e=>!e.dead&&Math.hypot(candidate.x-e.x,candidate.y-e.y)<36),candidates=[];
        for(let i=0;i<=28;i++){
          const t=.06+i*.88/28;
          candidates.push({x:zone.x+zone.w*t,y:zone.y+pad},{x:zone.x+zone.w-pad,y:zone.y+zone.h*t},{x:zone.x+zone.w*t,y:zone.y+zone.h-pad},{x:zone.x+pad,y:zone.y+zone.h*t});
        }
        p=candidates.map(q=>this.nearestWalkable(q.x,q.y)).filter(relaxed).sort((a,b)=>Math.min(...fighters.map(f=>Math.hypot(b.x-f.x,b.y-f.y)))-Math.min(...fighters.map(f=>Math.hypot(a.x-f.x,a.y-f.y))))[0]||null;
      }
      if(!p)return null;
      const e=spawnEnemy(this.factoryEnemyType(fast),0,p);e.factoryTag=tag;e.factorySafeX=p.x;e.factorySafeY=p.y;e.factoryZone={x:zone.x,y:zone.y,w:zone.w,h:zone.h};return e;
    },
    safeBossPoint(zone,minDistance=460,radius=64,preferred=null){
      const fighters=[G.p,...G.allies.filter(a=>!a.dead)],margin=radius+5,candidates=[],add=(x,y)=>{
        const p={x,y};if(!this.inZone(p,zone,-margin)||this.blocked(x,y,radius))return;const d=Math.min(...fighters.map(f=>Math.hypot(x-f.x,y-f.y)));candidates.push({x,y,d});
      };
      if(preferred){add(preferred.x,preferred.y);const chosen=candidates[0];if(chosen&&chosen.d>=minDistance)return chosen;}
      const x0=zone.x+margin,x1=zone.x+zone.w-margin,y0=zone.y+margin,y1=zone.y+zone.h-margin,step=Math.max(18,Math.min(34,radius*.24));
      if(x0<=x1&&y0<=y1){for(let y=y0;y<=y1+.01;y+=step)for(let x=x0;x<=x1+.01;x+=step)add(x,y);add(x1,y1);add(x1,(y0+y1)/2);add((x0+x1)/2,(y0+y1)/2);}
      candidates.sort((a,b)=>b.d-a.d);const found=candidates.find(p=>p.d>=minDistance)||candidates[0];if(!found)throw new Error(`[factory] no boss slot inside ${zone.name||'encounter'} boundary`);return found;
    },
    startRaid(kind,zone,packets,count,done){
      G.enemies.length=0;G.enemyBullets.length=0;
      // 플레이어는 직접 방 안으로 걸어 들어온 위치를 유지하고, 뒤처진 AI만 안전 진형으로 모은다.
      this.stagePartyForEncounter(zone,null,{includePlayer:false});
      this.raid={kind,zone,packets,count,packet:0,prep:1.1,wait:0,done};
    },
    updateRaid(dt){
      const r=this.raid;if(!r)return;r.prep-=dt;if(r.prep>0)return;r.wait-=dt;const alive=G.enemies.filter(e=>!e.dead&&e.factoryTag===r.kind).length;
      if(alive===0&&r.wait<=0){if(r.packet>=r.packets){const cb=r.done;this.raid=null;if(cb)cb();return;}r.packet++;r.wait=.9;const count=Math.max(8,Math.round((r.count+(r.packet-1)*3)*this.difficultyProfile().raidCount));const made=this.spawnEnemyBatch(r.zone,r.kind,count,r.packet>1,r.zone.axis||'horizontal');showToast(`몬스터 웨이브 ${r.packet}/${r.packets} · ${made.length}개체`,1200);}
    },
    startTimer(kind,dur,zone,done,options={}){
      for(let i=G.enemies.length-1;i>=0;i--)if(!G.enemies[i].boss&&!G.enemies[i].midboss&&G.enemies[i]!==this.midboss&&G.enemies[i]!==this.boss)G.enemies.splice(i,1);
      G.enemyBullets.length=0;if(options.stage!==false)this.stagePartyForEncounter(zone,null,{includePlayer:false});this.timer={kind,t:dur,dur,zone,spawn:0,opening:false,done,last5:false,last5Done:kind!=='room5',countShown:0,prep:options.prep==null?1.1:options.prep};
    },
    updateTimer(dt){
      const t=this.timer;if(!t)return;if(t.prep>0){t.prep=Math.max(0,t.prep-dt);return;}
      // 마지막 5초 대사는 실제 00:05에 한 번 시작하지만 타이머를 멈추지 않는다.
      // 따라서 전투 HUD의 3·2·1은 평소처럼 계속 흐른다. 단, 00:00이 되어도
      // 대사가 아직 끝나지 않았다면 문 개방만 기다려 순서가 앞질러 가지 않게 한다.
      t.t=Math.max(0,t.t-dt);
      t.spawn-=dt;const frac=1-t.t/t.dur,cfg=this.timerProfile(t.kind),difficulty=this.difficultyProfile(),cap=Math.max(8,Math.round(cfg.cap*difficulty.cap));
      if(!t.opening){
        t.opening=true;const initial=Math.max(0,Math.round((cfg.opening||0)*difficulty.raidCount));if(initial)this.spawnEnemyBatch(t.zone,t.kind,initial,false,t.zone.axis||'horizontal');t.spawn=Math.max(.8,cfg.startGap*difficulty.gap);
      }else if(t.spawn<=0&&G.enemies.filter(e=>!e.dead&&!e.boss&&!e.midboss).length<cap){
        const baseGap=cfg.startGap+(cfg.endGap-cfg.startGap)*frac,gap=Math.max(.22,baseGap*difficulty.gap),baseCount=frac>.82?cfg.bursts[2]:frac>.5?cfg.bursts[1]:cfg.bursts[0],count=Math.max(1,baseCount+difficulty.burst);
        t.spawn=gap;
        // 60~40초는 일반 위주, 40~20초는 빠른 적 증가, 20~5초는 강한 적과 일반 적 혼합 물량이다.
        this.spawnEnemyBatch(t.zone,t.kind,count,frac>.34,t.zone.axis||'horizontal');
      }
      if(t.kind==='room5'&&t.t<=5&&!t.last5){
        t.last5=true;if(!this.setRouteState('ROOM5_COUNTDOWN'))return;
        // 마지막 5초 대사는 실제 타이머가 00:05가 된 뒤에만 한 번 재생한다.
        // 전투를 멈추지 않는 짧은 전투 대사창으로 전체 순서를 보여 주며,
        // 00:00에 도달해도 대사가 끝나기 전에는 문 개방 단계로 넘어가지 않는다.
        const lines=this.sceneLines(5,'last5').filter(line=>!!line.char||line.group);
        this.playCombatLines(lines,()=>{if(this.timer===t)t.last5Done=true;},1400);
      }
      if(t.kind==='room5'&&t.t>0&&t.t<=3){const n=Math.max(1,Math.ceil(t.t));if(t.countShown!==n){t.countShown=n;this.showSystem(`${n}...`,620);}}
      if(t.t<=0){
        if(t.kind==='room5'&&!t.last5Done)return;
        for(let i=G.enemies.length-1;i>=0;i--)if(!G.enemies[i].boss&&!G.enemies[i].midboss&&G.enemies[i]!==this.midboss&&G.enemies[i]!==this.boss)G.enemies.splice(i,1);
        G.enemyBullets.length=0;const cb=t.done;this.timer=null;if(cb)cb();
      }
    },
    bindBossToZone(e,z){e.factoryZone={x:z.x,y:z.y,w:z.w,h:z.h};e.factorySafeX=e.x;e.factorySafeY=e.y;},
    spawnBulldozer(){spawnBulldozer();const e=G.rhino;if(!e)return;e.hp=e.maxHp*=1.5;e.damage*=1.5;const z=this.zoneFor('bulldozer'),p=this.safeBossPoint(z,250,Math.max(54,e.r||54),{x:z.x+z.w*.18,y:z.y+z.h*.42});e.x=p.x;e.y=p.y;e.vx=e.vy=0;this.bindBossToZone(e,z);this.midboss=e;},
    spawnRobot(){spawnRobotBoss();const e=G.boss;if(!e)return;e.hp=e.maxHp*=1.5;e.damage*=1.5;const z=this.zoneFor('arena'),p=this.safeBossPoint(z,520,Math.max(82,e.r||82),{x:z.x+z.w*.5,y:z.y+z.h*.76});e.x=p.x;e.y=p.y;e.vx=e.vy=0;this.bindBossToZone(e,z);this.boss=e;},
    spawnGiant(){spawnGiantRobotBoss();const e=G.boss;if(!e)return;e.hp=e.maxHp*=1.5;e.damage*=1.5;const z=this.zoneFor('final'),p=this.safeBossPoint(z,480,Math.max(118,e.r||118),{x:z.x+z.w*.64,y:z.y+z.h*.5});e.x=p.x;e.y=p.y;e.vx=e.vy=0;this.bindBossToZone(e,z);this.boss=e;},
    finishFirstRaid(){
      if(this.eventState.FIRST_RAID!=='RUNNING')return;this.completeEvent('FIRST_RAID');this.openDoors(['firstBack','firstFront']);this.phase='to_device';showToast('목표: 중앙 기어실의 태엽장치를 찾으세요.',2400);
    },
    startRoom5(){
      if(!this.eventDone('DEVICE4')||this.routeState!=='ROOM4_TO_ROOM5_OPEN')return;
      const zone=this.zoneFor('room5');if(!this.inZone(G.p,zone,-(G.p.r||18)))return;
      const gathered=this.stagePartyForEncounter(zone,null,{includePlayer:false}),units=[G.p,...G.allies.filter(a=>!a.dead)];
      if(gathered.outside||gathered.blocked||units.some(u=>!this.inZone(u,zone,-(u.r||16))))return;
      if(!this.beginEvent('ROOM5_STORY'))return;
      if(!this.setRouteState('ROOM5_ENTER'))return;this.guidancePath=null;this.phase='room5_story';this.lockDoors(['door_room4_to_room5','door_room5_to_room6']);if(!this.setRouteState('ROOM5_INTRO_DIALOGUE'))return;
      this.playScene(5,()=>this.runRoom5Machinery(()=>this.playScene(5,()=>this.runRoom5Pulses(()=>this.playScene(5,()=>{
        const flash=document.getElementById('escapeAlertFlash');flash?.classList.add('show');
        if(!this.setRouteState('ROOM5_WARNING'))return;this.alert('⚠ 비인가 동력실 접근 감지','철문 잠금 해제 절차를 방해합니다.',()=>{flash?.classList.remove('show');this.playScene(5,()=>{
          this.completeEvent('ROOM5_STORY');this.showSystem('방어 준비!\n60초 동안 버티세요!',1450,()=>{
            if(!this.beginEvent('ROOM5_DEFENSE')||!this.setRouteState('ROOM5_DEFENSE_60'))return;this.phase='room5_defense';this.startTimer('room5',60,zone,()=>this.finishRoom5());startGameLoop();
          });
        },{segment:'room5Briefing'});});
      },{segment:'room5Pulse'})),{segment:'room5Lock'})),{segment:'room5Arrival'});
    },
    finishRoom5(){
      if(!this.eventDone('ROOM5_STORY')||this.eventState.ROOM5_DEFENSE!=='RUNNING'||!['ROOM5_DEFENSE_60','ROOM5_COUNTDOWN'].includes(this.routeState)||!this.beginEvent('ROOM5_UNLOCK'))return;
      this.completeEvent('ROOM5_DEFENSE');if(!this.setRouteState('ROOM5_TO_ROOM6_OPEN'))return;this.phase='room5_unlock';
      this.playCue('철컥—!!',()=>this.playCue('쿠웅— 철컥!!',()=>{this.lockDoors(['door_room4_to_room5']);this.openDoors(['door_room5_to_room6']);this.playScene(5,()=>{this.completeEvent('ROOM5_UNLOCK');if(!this.setRouteState('ROOM6_APPROACH'))return;this.phase='to_bulldozer';showToast('목표: 열린 철문을 지나 6번 비상문 구역으로 이동하세요.',2500);},{segment:'room5AfterOpen'});},820),700);
    },
    startBulldozerEncounter(){
      if(!this.eventDone('ROOM5_UNLOCK')||this.routeState!=='ROOM6_APPROACH')return;
      const zone=this.zoneFor('bulldozer');if(!this.inZone(G.p,zone,-(G.p.r||18))||!this.beginEvent('BULLDOZER_INTRO'))return;
      if(!this.setRouteState('ROOM6_DIALOGUE'))return;this.phase='bulldozer_intro';
      this.stagePartyForEncounter(zone,{x:G.p.x,y:G.p.y},{includePlayer:false});
      this.lockDoors(['door_room5_to_room6','door_room6_to_arena']);
      this.playScene(5,()=>this.playScene(6,()=>{
        this.completeEvent('BULLDOZER_INTRO');if(!this.beginEvent('BULLDOZER_DEFENSE'))return;
        if(!this.setRouteState('BULLDOZER_SPAWN'))return;this.phase='bulldozer';this.bulldozerDefeated=false;this.bulldozerTimerDone=false;this.spawnBulldozer();
        if(!this.midboss){console.error('[factory] bulldozer spawn failed',{currentPhase:this.phase,linkedDoorId:this.linkedDoorId.BULLDOZER_UNLOCK});return;}
        if(!this.setRouteState('ROOM6_DEFENSE_30'))return;this.startTimer('bulldozer',30,zone,()=>{this.bulldozerTimerDone=true;this.phase='bulldozer_wait';this.tryFinishBulldozer();},{stage:false,prep:0});
        this.showSystem('비상문 개방 중\n00:30',900);this.playCombatLines(this.sceneLines(6,'bossReveal').filter(line=>!!line.char||line.group),null,650);startGameLoop();
      },{segment:'preBoss'}),{segment:'room6Arrival'});
    },
    tryFinishBulldozer(){
      const door=this.byDoor(this.linkedDoorId.BULLDOZER_UNLOCK);
      console.info('[factory] bulldozer gate check',{bulldozerDefeated:this.bulldozerDefeated,defense30SecondsCompleted:this.bulldozerTimerDone,currentPhase:this.phase,linkedDoorId:this.linkedDoorId.BULLDOZER_UNLOCK,doorOpen:!!door&&!door.locked,collisionEnabled:!!door&&door.locked});
      if(this.bulldozerDefeated&&this.bulldozerTimerDone&&this.setRouteState('BULLDOZER_AND_TIMER_COMPLETE'))this.finishBulldozer();
    },
    finishBulldozer(){
      if(this.phase==='bulldozer_outro'||this.phase==='to_arena'||!this.eventDone('BULLDOZER_INTRO')||this.eventState.BULLDOZER_DEFENSE!=='RUNNING'||!this.beginEvent('BULLDOZER_UNLOCK'))return;
      this.completeEvent('BULLDOZER_DEFENSE');this.phase='bulldozer_outro';
      this.playCue('철컥—!!',()=>this.playScene(6,()=>{this.lockDoors(['door_room5_to_room6']);this.openDoors(['door_room6_to_arena']);this.completeEvent('BULLDOZER_UNLOCK');if(!this.setRouteState('ROOM6_TO_ARENA_OPEN'))return;this.phase='to_arena';showToast('6번 왼쪽 출구가 열렸습니다. 7·8번 전투장으로 이동하세요.',2300);},{segment:'afterBoss'}),700);
    },
    startArena(){
      if(!this.eventDone('BULLDOZER_UNLOCK')||!this.beginEvent('ARENA_STORY'))return;
      const zone=this.zoneFor('arena');if(!this.inZone(G.p,zone,-(G.p.r||18))){this.eventState.ARENA_STORY='PENDING';return;}
      this.stagePartyForEncounter(zone,{x:G.p.x,y:G.p.y},{includePlayer:false});this.phase='arena_story';this.lockDoors(['arenaLow','arenaHigh']);
      this.playScene(7,()=>this.alert('⚠ 침입자 격리 완료','제거 절차를 시작합니다.',()=>this.playScene(7,()=>{
        this.completeEvent('ARENA_STORY');this.showSystem('3분 동안 버티세요!',1300,()=>{if(!this.beginEvent('ARENA_DEFENSE'))return;this.phase='arena_defense';this.startTimer('arena',180,this.zoneFor('arena'),()=>this.finishArenaDefense());startGameLoop();});
      },{segment:'arenaBriefing'})),{segment:'arenaLock'});
    },
    finishArenaDefense(){
      if(this.eventState.ARENA_DEFENSE!=='RUNNING'||!this.beginEvent('ROBOT_INTRO'))return;this.completeEvent('ARENA_DEFENSE');this.phase='robot_intro';
      this.playScene(8,()=>this.alert('⚠ 대형 개체 접근','정체를 알 수 없는 무거운 진동이 가까워집니다.',()=>{this.completeEvent('ROBOT_INTRO');if(!this.beginEvent('ROBOT_BOSS'))return;this.phase='robot_boss';this.spawnRobot();}),{part:'beforeBoss'});
    },
    finishRobot(){
      if(this.eventState.ROBOT_BOSS!=='RUNNING')return;this.completeEvent('ROBOT_BOSS');this.openDoors(['arenaLow','arenaHigh']);this.phase='to_room9';this.playScene(8,()=>showToast('목표: 열린 태엽문을 지나 공장 상부로 이동하세요.',2300),{part:'afterBoss'});
    },
    startRoom9(){
      if(!this.eventDone('ROBOT_BOSS')||!this.beginEvent('ROOM9_STORY'))return;const zone=this.zoneFor('room9');if(!this.inZone(G.p,zone,-(G.p.r||18))){this.eventState.ROOM9_STORY='PENDING';return;}this.stagePartyForEncounter(zone,{x:G.p.x,y:G.p.y},{includePlayer:false});this.phase='room9_story';this.lockDoors(['room9Back','room9Front']);
      this.playScene(9,()=>{this.completeEvent('ROOM9_STORY');if(!this.beginEvent('ROOM9_RAID'))return;this.phase='room9_raid';this.startRaid('room9',this.zoneFor('room9'),3,20,()=>{this.completeEvent('ROOM9_RAID');this.openDoors(['room9Back','room9Front']);this.phase='to_final';showToast('목표: 최종 셔터로 이동하세요.',2200);});});
    },
    startFinalBoss(){
      if(!this.eventDone('ROOM9_RAID')||!this.beginEvent('FINAL_STORY'))return;const finalZone=this.zoneFor('final');if(!this.inZone(G.p,finalZone,-(G.p.r||18))){this.eventState.FINAL_STORY='PENDING';return;}this.stagePartyForEncounter(finalZone,{x:finalZone.x+finalZone.w*.22,y:finalZone.y+finalZone.h*.5},{includePlayer:true});this.phase='final_story';this.lockDoors(['finalBack','final']);
      this.playScene(10,()=>this.runBlackout(()=>this.playScene(10,()=>this.playScene(11,()=>this.alert('🚨 최고 위험 개체 활성화','보안 등급 MAX',()=>{
        this.endBlackout();this.completeEvent('FINAL_STORY');if(!this.beginEvent('GIANT_BOSS'))return;this.phase='giant_boss';this.spawnGiant();
      }),{part:'beforeBoss'}),{segment:'blackoutReaction'})),{segment:'finalDoor'});
    },
    finishGiant(){
      if(this.eventState.GIANT_BOSS!=='RUNNING'||!this.beginEvent('FINAL_DEVICE'))return;this.completeEvent('GIANT_BOSS');this.phase='final_device';this.playScene(12,()=>{const p=this.findSpawnNear(this.points.finalDevice.x,this.points.finalDevice.y,80,300,this.zoneFor('final'))||this.points.finalDevice;this.device={x:p.x,y:p.y,t:0,final:true};showToast('목표: 마지막 태엽장치를 작동시키세요.',2300);});
    },
    triggerFinalDevice(){
      if(!this.device||this.eventState.FINAL_DEVICE!=='RUNNING')return;this.device=null;this.phase='final_defense_story';
      this.playScene(13,()=>this.alert('🚨 최종 셔터 개방 시작','60초 동안 버티세요!',()=>this.playScene(13,()=>{
        this.completeEvent('FINAL_DEVICE');if(!this.beginEvent('FINAL_DEFENSE'))return;this.phase='final_defense';this.startTimer('final',60,this.zoneFor('final'),()=>this.finishFinalDefense());startGameLoop();
      },{segment:'finalBriefing'})),{segment:'activation'});
    },
    finishFinalDefense(){
      if(this.eventState.FINAL_DEFENSE!=='RUNNING'||!this.beginEvent('FINAL_UNLOCK'))return;this.completeEvent('FINAL_DEFENSE');this.phase='final_unlock';
      this.runCountdown(()=>{this.openDoors(['finalBack','final']);this.playScene(14,()=>{this.completeEvent('FINAL_UNLOCK');this.phase='escape';this.portal={x:this.points.exit.x,y:this.points.exit.y,t:0};ESCAPE.portal=this.portal;showToast('출구가 열렸습니다! 끝까지 이동하세요.',2600);});});
    },
    reset(){
      this.clearSequences();this.resetEventStates();
      this.phase='intro';this.raid=null;this.timer=null;this.device=null;this.portal=null;this.guidancePath=null;this.warningAction=null;this.midboss=null;this.boss=null;this.bulldozerDefeated=false;this.bulldozerTimerDone=false;this.sceneBusy=false;this.eventSerial++;
      document.getElementById('escapeStory').classList.remove('show');document.getElementById('escapeWarning').classList.remove('show');document.getElementById('escapeAlertFlash').classList.remove('show');
      this.installDoors();ESCAPE.dialogue=null;ESCAPE.warning=null;ESCAPE.device=null;ESCAPE.portal=null;ESCAPE.defense=null;ESCAPE.ambush=null;ESCAPE.ambushBarriers=[];ESCAPE.ambushBoundaryVines=[];ESCAPE.midboss=null;ESCAPE.finalboss=null;
    },
    begin(){
      if(!this.beginEvent('INTRO'))return;this.placeParty(this.points.start);this.phase='intro';this.playScene(1,()=>{this.completeEvent('INTRO');this.phase='to_first';showToast('목표: 태엽 공장의 출구를 찾으세요.',2800);});
    },
    near(point,rad){return Math.hypot(G.p.x-point.x,G.p.y-point.y)<=rad;},
    update(dt){
      G.anchorX=G.p.x;G.anchorY=G.p.y;
      if(this.raid){this.updateRaid(dt);return;}if(this.timer){this.updateTimer(dt);return;}
      if(this.midboss&&(this.midboss.dead||!G.enemies.includes(this.midboss))){this.midboss=null;G.rhino=null;if(this.phase==='bulldozer'||this.phase==='bulldozer_wait'){this.bulldozerDefeated=true;this.tryFinishBulldozer();}}
      if(this.boss&&(this.boss.dead||!G.enemies.includes(this.boss))){const giant=this.phase==='giant_boss';this.boss=null;G.boss=null;if(giant)this.finishGiant();else if(this.phase==='robot_boss')this.finishRobot();return;}
       if(this.device){this.device.t+=dt;if(Math.hypot(G.p.x-this.device.x,G.p.y-this.device.y)<65){if(this.device.final)this.triggerFinalDevice();else if(this.routeState==='ROOM4_DEVICE_SEARCH'&&this.beginEvent('DEVICE4')){this.device=null;if(!this.setRouteState('ROOM4_DEVICE_DIALOGUE_4'))return;this.phase='device_found_story';this.playScene(4,()=>{this.completeEvent('DEVICE4');this.openDoors(['door_room4_to_room5']);if(!this.setRouteState('ROOM4_TO_ROOM5_OPEN'))return;this.phase='to_room5';this.buildGuidancePath(G.p,this.points.room5);showToast('바닥의 안내 빛을 따라 5번 방으로 이동하세요.',2600);});}}}
      if(this.portal){this.portal.t+=dt;if(Math.hypot(G.p.x-this.portal.x,G.p.y-this.portal.y)<72){this.portal=null;ESCAPE.portal=null;endGame(true,'escape');return;}}
      if(this.phase==='to_first'&&this.near(this.points.room2,300)&&this.beginEvent('FIRST_STORY')){
        this.phase='first_story';this.lockDoors(['firstBack','firstFront']);this.playScene(2,()=>this.alert('⚠ 침입자 감지','보안 시스템을 재가동합니다.',()=>this.playScene(2,()=>{
          this.completeEvent('FIRST_STORY');if(!this.beginEvent('FIRST_RAID'))return;this.phase='first_raid';this.startRaid('first',this.zoneFor('first'),3,16,()=>this.finishFirstRaid());
        },{segment:'detected'})),{segment:'sensor'});return;
      }
      if(this.phase==='to_device'&&this.near(this.points.room4,330)&&this.beginEvent('DEVICE_STORY')){
        this.phase='device_story';this.playScene(3,()=>{this.completeEvent('DEVICE_STORY');const room4Zone=this.zone(this.points.room4.x,this.points.room4.y,510,390),p=this.findSpawnNear(this.points.room4.x,this.points.room4.y,50,210,room4Zone)||this.nearestWalkable(this.points.room4.x,this.points.room4.y);this.device={x:p.x,y:p.y,t:0,final:false};if(!this.setRouteState('ROOM4_DEVICE_SEARCH'))return;this.phase='device_search';showToast('태엽장치에 가까이 가서 작동시키세요.',2200);});return;
      }
      if(this.phase==='to_room5'&&this.inZone(G.p,this.zoneFor('room5'),-(G.p.r||18))){this.startRoom5();return;}
      if(this.phase==='to_bulldozer'&&this.routeState==='ROOM6_APPROACH'&&this.inZone(G.p,this.zoneFor('bulldozer'),-(G.p.r||18))&&this.near(this.points.bulldozerTrigger,260)){this.startBulldozerEncounter();return;}
      if(this.phase==='to_arena'&&this.near(this.points.arena,480)){this.startArena();return;}
      if(this.phase==='to_room9'&&this.near(this.points.room9,360)){this.startRoom9();return;}
      if(this.phase==='to_final'&&this.inZone(G.p,this.zoneFor('final'),-12)&&this.near(this.points.finalLock,190)){this.startFinalBoss();return;}
    },
    drawVisible(g,part){
      const pad=160,l=cam.x-W/2-pad,t=cam.y-H/2-pad,r=cam.x+W/2+pad,b=cam.y+H/2+pad,dx=part.x,dy=part.y,dw=part.w*part.s,dh=part.h*part.s;
      const vl=Math.max(dx,l),vt=Math.max(dy,t),vr=Math.min(dx+dw,r),vb=Math.min(dy+dh,b);if(vr<=vl||vb<=vt)return;
      g.drawImage(part.canvas,(vl-dx)/part.s,(vt-dy)/part.s,(vr-vl)/part.s,(vb-vt)/part.s,vl,vt,vr-vl,vb-vt);
    },
    drawMap(g){
      g.fillStyle='#0d1115';g.fillRect(cam.x-W/2-180,cam.y-H/2-180,W+360,H+360);
      for(const part of this.parts)this.drawVisible(g,part);
    },
    drawDoor(d){
      if(!d.locked)return;const s=worldToScreen(d.x,d.y),th=d.thickness,count=Math.max(5,Math.ceil(d.len/35)+1),spacing=d.len/(count-1),gearR=21;
      ctx.save();ctx.translate(s.x,s.y);ctx.rotate(d.a);
      // The visible backing uses the same capsule as doorBlocked(): no invisible
      // extension and no visible edge that can be walked through.
      const capX=-d.len*.5-th*.5,capW=d.len+th;
      ctx.fillStyle='#4b321d';ctx.strokeStyle='#e0a54a';ctx.lineWidth=4;roundRect(ctx,capX,-th*.5,capW,th,th*.5);ctx.fill();ctx.stroke();
      ctx.fillStyle='#241a13';roundRect(ctx,capX+7,-th*.5+7,capW-14,th-14,(th-14)*.5);ctx.fill();
      ctx.save();roundRect(ctx,capX+3,-th*.5+3,capW-6,th-6,(th-6)*.5);ctx.clip();
      for(let row=0;row<2;row++)for(let i=0;i<count;i++){
        const x=-d.len*.5+i*spacing+(row?spacing*.5:0),y=(row?1:-1)*16;if(x>d.len*.5+gearR*.35)continue;
        ctx.save();ctx.translate(x,y);ctx.rotate(clock*((i+row)%2?2.15:-2.15));ctx.fillStyle=(i+row)%2?'#c58a34':'#9f6928';ctx.strokeStyle='#412b17';ctx.lineWidth=2.5;ctx.beginPath();
        for(let j=0;j<24;j++){const a=j/24*Math.PI*2,rr=j%2?gearR-4:gearR+2;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#211711';ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      ctx.restore();
      ctx.restore();
    },
    drawWorld(){
      for(const d of this.doors)this.drawDoor(d);
      if(this.guidancePath?.length>1){
        ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='rgba(255,224,92,.20)';ctx.lineWidth=13;ctx.beginPath();this.guidancePath.forEach((p,i)=>{const s=worldToScreen(p.x,p.y);if(i)ctx.lineTo(s.x,s.y);else ctx.moveTo(s.x,s.y);});ctx.stroke();
        const phase=(clock*2.5)%1;for(let i=1;i<this.guidancePath.length;i++){const a=this.guidancePath[i-1],b=this.guidancePath[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(!len)continue;for(let d=phase*72;d<len;d+=72){const t=d/len,s=worldToScreen(a.x+dx*t,a.y+dy*t),ang=Math.atan2(dy,dx);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(ang);ctx.fillStyle='rgba(255,238,116,.88)';ctx.shadowColor='#ffd84d';ctx.shadowBlur=9;ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(-7,-7);ctx.lineTo(-3,0);ctx.lineTo(-7,7);ctx.closePath();ctx.fill();ctx.restore();}}
        ctx.restore();
      }
      if(this.device){const s=worldToScreen(this.device.x,this.device.y),bob=Math.sin(clock*3)*5;ctx.save();ctx.translate(s.x,s.y+bob);ctx.rotate(Math.sin(clock*2)*.08);ctx.fillStyle='rgba(255,205,70,.22)';ctx.beginPath();ctx.arc(0,0,54+Math.sin(clock*4)*5,0,Math.PI*2);ctx.fill();const im=IMG['escape_windup'];if(im?.complete){const h=70*(im.height/im.width);ctx.drawImage(im,-35,-h/2,70,h);}ctx.restore();}
      if(this.portal){const s=worldToScreen(this.portal.x,this.portal.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(this.portal.t*1.4);for(let i=0;i<3;i++){ctx.strokeStyle=`rgba(255,205,80,${.85-i*.22})`;ctx.lineWidth=7-i;ctx.beginPath();ctx.arc(0,0,48-i*12,0,Math.PI*1.7);ctx.stroke();}ctx.restore();}
    },
    drawHud(){
      const r=this.raid,t=this.timer;if(!r&&!t)return;ctx.save();ctx.textAlign='center';const y=topSafe+80,alive=r?G.enemies.filter(e=>!e.dead&&e.factoryTag===r.kind).length:G.enemies.filter(e=>!e.dead&&!e.boss&&!e.midboss).length;
      ctx.fillStyle='rgba(23,31,24,.88)';roundRect(ctx,W/2-142,y-26,284,t?66:44,17);ctx.fill();ctx.strokeStyle='#f3c655';ctx.lineWidth=2;ctx.stroke();ctx.font='1000 16px system-ui';ctx.fillStyle='#ffe899';
      if(r){const packet=Math.max(1,r.packet);ctx.fillText(`몬스터 웨이브 ${packet}/${r.packets} · 남은 적 ${alive}`,W/2,y+2);}
      else{const cfg=this.timerProfile(t.kind),wave=Math.min(cfg.waves,Math.max(1,Math.floor((1-t.t/t.dur)*cfg.waves)+1)),label=t.kind==='room5'?'하부 동력실 방어':t.kind==='arena'?'중앙 투기장 방어':t.kind==='final'?'최종 셔터 방어':'비상문 개방 중';ctx.fillText(`${label} · 웨이브 ${wave}/${cfg.waves}`,W/2,y-3);ctx.font='900 14px system-ui';ctx.fillStyle=t.t<=5?'#ff665d':'#fff2b2';ctx.fillText(`${formatTime(t.t)} · 남은 적 ${alive}`,W/2,y+22);}
      ctx.restore();
    },
    progress(){const order=['intro','to_first','first_story','first_raid','to_device','device_story','device_search','device_found_story','to_room5','room5_story','room5_defense','bulldozer_story','bulldozer','bulldozer_wait','to_arena','arena_story','arena_defense','robot_intro','robot_boss','to_room9','room9_story','room9_raid','to_final','final_story','giant_boss','final_device','final_defense_story','final_defense','escape'];return Math.max(.02,Math.min(1,(order.indexOf(this.phase)+1)/order.length));}
  };

  ESCAPE.bake=function(){
    if(isFactory())F.bake();
    else{
      if(ESCAPE.factory){
        ESCAPE.baked=false;
        ESCAPE.grid=null;
        ESCAPE.mapCanvas=null;
        ESCAPE.sourceCanvas=null;
        ESCAPE.factory=false;
      }
      jungle.bake();
    }
  };
  ESCAPE.resetRun=function(){if(isFactory()){F.bake();F.reset();}else jungle.resetRun();};
  ESCAPE.positionPartyAtStart=function(){return isFactory()?F.placeParty(F.points.start):jungle.positionPartyAtStart();};
  ESCAPE.gatherPartyInZone=function(centerY,maxRadius){return isFactory()?F.placeParty(F.nearestWalkable(G.p.x,centerY)):jungle.gatherPartyInZone(centerY,maxRadius);};
  ESCAPE.findSpawnNear=function(px,py,minD,maxD){return isFactory()?F.findSpawnNear(px,py,minD,maxD):jungle.findSpawnNear(px,py,minD,maxD);};
  ESCAPE.nearestWalkable=function(x,y){return isFactory()?F.nearestWalkable(x,y):jungle.nearestWalkable(x,y);};
  ESCAPE.walkableSegmentsAtY=function(y,minWidth){return isFactory()?F.walkableSegmentsAtY(y,minWidth):jungle.walkableSegmentsAtY(y,minWidth);};
  ESCAPE.blocked=function(x,y,r){return isFactory()?F.blocked(x,y,r):jungle.blocked(x,y,r);};
  ESCAPE.cellAt=function(x,y){return isFactory()?F.cellAt(x,y):jungle.cellAt(x,y);};
  ESCAPE.drawMapLayer=function(g){if(isFactory())F.drawMap(g);else jungle.drawMapLayer(g);};
  ESCAPE.pausedForStory=function(){return isFactory()?!!(ESCAPE.dialogue||ESCAPE.warning):jungle.pausedForStory();};
  ESCAPE.beginIntro=function(){if(isFactory())F.begin();else jungle.beginIntro();};
  ESCAPE.confirmWarning=function(){if(isFactory())F.confirmWarning();else jungle.confirmWarning();};
  ESCAPE.update=function(dt){if(isFactory())F.update(dt);else jungle.update(dt);};
  ESCAPE.draw=function(worldLayer=true){if(isFactory()){if(worldLayer)F.drawWorld();else F.drawHud();}else jungle.draw(worldLayer);};
  ESCAPE.factoryProgress=()=>isFactory()?F.progress():0;
  ESCAPE.factoryState=F;
  if(window.__TOY_TEST__){
    window.__TOY_TEST__.factoryDialogueAudit=async()=>{
      await F.loadDialogue();
      const rows=[...F.scenes.entries()].flatMap(([section,lines])=>lines.map((line,index)=>({section,index,...line})));
      const leakedDirections=rows.filter(x=>/\([^)]*\)|대사 내용과 순서|진짜 30초|타이머 시작|몬스터.*(?:시작|등장|출현)|붉은 경고등|화면 중앙|방어 준비|60초 동안 버티|3분 대규모|보스전:|대사 종료 후|전투 상태/.test(x.text));
      const invalidRows=rows.filter(x=>!x.char&&!x.group&&!x.factorySfx);
      const requiredEffects=['딸깍','철컥','삐','쿠웅','쿵','쾅','틱'];
      const effectCoverage=Object.fromEntries(requiredEffects.map(word=>[word,rows.filter(x=>x.text.includes(word)).length]));
      const segments={
        scene2:Object.fromEntries(['sensor','detected'].map(segment=>[segment,rows.filter(x=>x.section===2&&x.segment===segment).length])),
        scene5:Object.fromEntries(['room5Arrival','room5Lock','room5Pulse','room5Briefing','last5','room5AfterOpen','room6Arrival'].map(segment=>[segment,rows.filter(x=>x.section===5&&x.segment===segment).length])),
        scene6:Object.fromEntries(['preBoss','bossReveal','afterBoss'].map(segment=>[segment,rows.filter(x=>x.section===6&&x.segment===segment).length])),
        scene7:Object.fromEntries(['arenaLock','arenaBriefing'].map(segment=>[segment,rows.filter(x=>x.section===7&&x.segment===segment).length])),
        scene10:Object.fromEntries(['finalDoor','blackoutReaction'].map(segment=>[segment,rows.filter(x=>x.section===10&&x.segment===segment).length])),
        scene13:Object.fromEntries(['activation','finalBriefing'].map(segment=>[segment,rows.filter(x=>x.section===13&&x.segment===segment).length]))
      };
      const allSegments=Object.values(segments).flatMap(Object.values),last5=rows.filter(x=>x.section===5&&x.segment==='last5'&&(x.char||x.group));
      return{sections:[...F.scenes.keys()],count:rows.length,groupLines:rows.filter(x=>x.name==='전원').map(x=>x.text),effectCoverage,segments,last5Count:last5.length,invalidRows,leakedDirections,pass:F.scenes.size===14&&rows.length>0&&rows.filter(x=>x.name==='전원').length>=3&&requiredEffects.every(word=>effectCoverage[word]>0)&&allSegments.every(n=>n>0)&&last5.length===8&&invalidRows.length===0&&leakedDirections.length===0};
    };
    window.__TOY_TEST__.factoryStoryFlowAudit=async()=>{
      const old={selectedMode,selectedStage,selectedParty,selectedWeapon,selected,selectedDiff};selectedMode='escape';selectedStage=2;selectedParty=3;selectedWeapon='nerf';selectedDiff='normal';selected=0;
      startGame(CHAR_ORDER[selected]);await F.loadDialogue();ESCAPE.advanceDialogue(true);stopGameLoop();
      const A='door_room4_to_room5',B='door_room5_to_room6';
      F.resetEventStates();F.eventState.ROOM5_STORY='COMPLETED';F.eventState.ROOM5_DEFENSE='RUNNING';F.routeState='ROOM5_DEFENSE_60';F.routeHistory=['ROOM5_DEFENSE_60'];F.lockDoors([A,B]);
      let last5Calls=0,timerDone=0,last5Done=null,last5LineCount=0;const systems=[],originalCombat=F.playCombatLines,originalSystem=F.showSystem;
      F.playCombatLines=(lines,done)=>{last5Calls++;last5LineCount=lines.length;last5Done=done;};F.showSystem=text=>systems.push(text);
      F.startTimer('room5',6,F.zoneFor('room5'),()=>timerDone++,{stage:false,prep:0});F.updateTimer(.8);const beforeFive={time:F.timer.t,last5Calls};F.updateTimer(.3);
      const atFive={time:F.timer.t,last5Calls,last5LineCount,last5:F.timer.last5,last5Done:F.timer.last5Done,routeState:F.routeState,modalPaused:!!ESCAPE.dialogue};F.updateTimer(2);const flowing={time:F.timer.t,last5Calls,last5Done:F.timer.last5Done,timerDone};const onceOnly=last5Calls;
      F.timer.t=3.05;F.updateTimer(.1);F.timer.t=2.05;F.updateTimer(.1);F.timer.t=1.05;F.updateTimer(.1);const countdown=systems.filter(x=>/^\d\.\.\.$/.test(x));
      F.timer.t=0;F.updateTimer(0);const atZeroWaiting={timer:!!F.timer,timerDone,entryLocked:F.byDoor(A).locked,exitLocked:F.byDoor(B).locked};
      if(typeof last5Done==='function')last5Done();const afterRead={time:F.timer.t,last5Done:F.timer.last5Done,timerDone};F.updateTimer(0);
      const atZero={timer:!!F.timer,timerDone,entryLocked:F.byDoor(A).locked,exitLocked:F.byDoor(B).locked};F.playCombatLines=originalCombat;F.showSystem=originalSystem;
      F.eventState.ROOM5_STORY='COMPLETED';F.eventState.ROOM5_DEFENSE='RUNNING';F.eventState.ROOM5_UNLOCK='PENDING';F.routeState='ROOM5_COUNTDOWN';F.routeHistory=['ROOM5_COUNTDOWN'];F.doorHistory=[];F.lockDoors([A,B]);
      const originalCue=F.playCue,originalScene=F.playScene;const cueDone=[];let sceneDone=null;F.playCue=(text,done)=>{cueDone.push(done);};F.playScene=(n,done,opts)=>{if(opts?.segment==='room5AfterOpen')sceneDone=done;};F.finishRoom5();
      const beforeOpen={phase:F.phase,entryLocked:F.byDoor(A).locked,exitLocked:F.byDoor(B).locked,unlock:F.eventState.ROOM5_UNLOCK,routeState:F.routeState,cues:cueDone.length};
      if(typeof cueDone[0]==='function')cueDone[0]();
      const afterFirstCue={entryLocked:F.byDoor(A).locked,exitLocked:F.byDoor(B).locked,cues:cueDone.length,opened:F.doorHistory.filter(x=>x.action==='OPEN').map(x=>x.id)};
      if(typeof cueDone[1]==='function')cueDone[1]();
      const afterUnlock={entryLocked:F.byDoor(A).locked,exitOpen:!F.byDoor(B).locked,opened:F.doorHistory.filter(x=>x.action==='OPEN').map(x=>x.id),unlock:F.eventState.ROOM5_UNLOCK};if(typeof sceneDone==='function')sceneDone();
      const afterDialogue={phase:F.phase,unlock:F.eventState.ROOM5_UNLOCK,routeState:F.routeState};F.playCue=originalCue;F.playScene=originalScene;
      home();selectedMode=old.selectedMode;selectedStage=old.selectedStage;selectedParty=old.selectedParty;selectedWeapon=old.selectedWeapon;selectedDiff=old.selectedDiff;selected=old.selected;
      return{beforeFive,atFive,flowing,afterRead,onceOnly,countdown,atZeroWaiting,atZero,beforeOpen,afterFirstCue,afterUnlock,afterDialogue,pass:beforeFive.last5Calls===0&&atFive.last5Calls===1&&atFive.last5LineCount===8&&atFive.last5&&!atFive.last5Done&&atFive.routeState==='ROOM5_COUNTDOWN'&&!atFive.modalPaused&&flowing.time<3&&flowing.last5Calls===1&&!flowing.last5Done&&flowing.timerDone===0&&atZeroWaiting.timer&&atZeroWaiting.timerDone===0&&atZeroWaiting.entryLocked&&atZeroWaiting.exitLocked&&afterRead.time===0&&afterRead.last5Done&&afterRead.timerDone===0&&onceOnly===1&&countdown.join(',')==='3...,2...,1...'&&!atZero.timer&&atZero.timerDone===1&&atZero.entryLocked&&atZero.exitLocked&&beforeOpen.routeState==='ROOM5_TO_ROOM6_OPEN'&&beforeOpen.entryLocked&&beforeOpen.exitLocked&&beforeOpen.unlock==='RUNNING'&&beforeOpen.cues===1&&afterFirstCue.entryLocked&&afterFirstCue.exitLocked&&afterFirstCue.cues===2&&afterFirstCue.opened.length===0&&afterUnlock.entryLocked&&afterUnlock.exitOpen&&afterUnlock.opened.length===1&&afterUnlock.opened[0]===B&&afterDialogue.phase==='to_bulldozer'&&afterDialogue.unlock==='COMPLETED'&&afterDialogue.routeState==='ROOM6_APPROACH'};
    };
    window.__TOY_TEST__.factoryEncounterAudit=async()=>{
      const old={selectedMode,selectedStage,selectedParty,selectedWeapon,selected,selectedDiff};
      selectedMode='escape';selectedStage=2;selectedParty=3;selectedWeapon='nerf';selectedDiff='normal';selected=0;startGame(CHAR_ORDER[selected]);await F.loadDialogue();ESCAPE.advanceDialogue(true);stopGameLoop();
      const destination=F.nearestWalkable(F.points.room2.x,F.points.room2.y),before={x:destination.x,y:destination.y};
      G.p.x=destination.x;G.p.y=destination.y;cam.x=G.p.x;cam.y=G.p.y;F.phase='to_first';F.update(FIXED_DT);await new Promise(resolve=>setTimeout(resolve,0));
      const afterTrigger={x:G.p.x,y:G.p.y,phase:F.phase,dialogue:!!ESCAPE.dialogue,drift:Math.hypot(G.p.x-before.x,G.p.y-before.y)};
      ESCAPE.dialogue=null;document.getElementById('escapeStory').classList.remove('show');F.sceneBusy=false;F.raid=null;G.enemies.length=0;G.enemyBullets.length=0;
      const zone=F.zoneFor('first');G.p.x=zone.x+zone.w/2;G.p.y=zone.y+zone.h/2;F.startRaid('factoryAudit',zone,1,12,()=>{});F.updateRaid(1.2);
      const fighters=[G.p,...G.allies.filter(a=>!a.dead)],enemies=G.enemies.filter(e=>!e.dead),minDistance=enemies.length?Math.min(...enemies.flatMap(e=>fighters.map(f=>Math.hypot(e.x-f.x,e.y-f.y)))):0;
      const party={count:fighters.length,outside:fighters.filter(e=>!F.inZone(e,zone,0)).length,blocked:fighters.filter(e=>F.blocked(e.x,e.y,e.r||16)).length,minSpacing:Math.min(...fighters.flatMap((a,i)=>fighters.slice(i+1).map(b=>Math.hypot(a.x-b.x,a.y-b.y))))};
      const spawn={count:enemies.length,minDistance,blocked:enemies.filter(e=>F.blocked(e.x,e.y,e.r||16)).length,outside:enemies.filter(e=>!F.inZone(e,zone,0)).length};
      home();selectedMode=old.selectedMode;selectedStage=old.selectedStage;selectedParty=old.selectedParty;selectedWeapon=old.selectedWeapon;selectedDiff=old.selectedDiff;selected=old.selected;
      return{afterTrigger,party,spawn,pass:afterTrigger.dialogue&&afterTrigger.drift<1e-6&&party.count===4&&party.outside===0&&party.blocked===0&&party.minSpacing>=50&&spawn.count===12&&spawn.minDistance>=220&&spawn.blocked===0&&spawn.outside===0};
    };
    window.__TOY_TEST__.factoryWaveBoundaryAudit=async()=>{
      const old={selectedMode,selectedStage,selectedParty,selectedWeapon,selected,selectedDiff};selectedMode='escape';selectedStage=2;selectedParty=3;selectedWeapon='nerf';selectedDiff='normal';selected=0;
      startGame(CHAR_ORDER[selected]);await F.loadDialogue();ESCAPE.advanceDialogue(true);stopGameLoop();
      const zone=F.zoneFor('room9');F.lockDoors(['room9Back','room9Front']);F.stagePartyForEncounter(zone);G.enemies.length=0;G.enemyBullets.length=0;
      const made=F.spawnEnemyBatch(zone,'boundaryAudit',20,true,zone.axis),fighters=[G.p,...G.allies.filter(a=>!a.dead)];
      const left=made.filter(e=>e.factorySide===0).length,right=made.filter(e=>e.factorySide===1).length,types=[...new Set(made.map(e=>e.type))].sort();
      const allInside=made.every(e=>F.inZone(e,zone,-(e.r||16))&&!F.blocked(e.x,e.y,e.r||16)),partyInside=fighters.every(e=>F.inZone(e,zone,-(e.r||16))&&!F.blocked(e.x,e.y,e.r||16));
      const probe=made[0],safe=probe?{x:probe.x,y:probe.y}:null;if(probe){probe.x=zone.x-zone.w;probe.y=zone.y-zone.h;probe.vx=900;probe.vy=900;clampWorldBounds(probe);}
      const restored=!!probe&&Math.hypot(probe.x-safe.x,probe.y-safe.y)<1&&probe.vx===0&&probe.vy===0&&F.inZone(probe,zone,-(probe.r||16));
      home();selectedMode=old.selectedMode;selectedStage=old.selectedStage;selectedParty=old.selectedParty;selectedWeapon=old.selectedWeapon;selectedDiff=old.selectedDiff;selected=old.selected;
      return{zone:{name:zone.name,axis:zone.axis,w:zone.w,h:zone.h},spawned:made.length,left,right,types,allInside,partyInside,restored,pass:made.length===20&&left===10&&right===10&&types.length===FACTORY_TYPES.length&&allInside&&partyInside&&restored};
    };
    window.__TOY_TEST__.factoryGateAudit=async()=>{
      const old={selectedMode,selectedStage,selectedParty,selectedWeapon,selected,selectedDiff};selectedMode='escape';selectedStage=2;selectedParty=3;selectedWeapon='nerf';selectedDiff='normal';selected=0;
      startGame(CHAR_ORDER[selected]);await F.loadDialogue();ESCAPE.advanceDialogue(true);stopGameLoop();
      F.lockDoors(F.doors.map(d=>d.id));
      const canBypass=(d,r)=>{const step=12,ca=Math.cos(d.a),sa=Math.sin(d.a),nx=-sa,ny=ca,au=Math.ceil((d.len*.5+72)/step),av=Math.ceil((d.thickness*.5+108)/step),open=new Set(),starts=[],goals=new Set(),key=(u,v)=>`${u},${v}`;for(let v=-av;v<=av;v++)for(let u=-au;u<=au;u++){const x=d.x+ca*u*step+nx*v*step,y=d.y+sa*u*step+ny*v*step;if(!F.blocked(x,y,r)){const k=key(u,v);open.add(k);if(v<=-av+1)starts.push([u,v]);if(v>=av-1)goals.add(k);}}const q=starts.slice(),seen=new Set(starts.map(x=>key(x[0],x[1])));for(let qi=0;qi<q.length;qi++){const [u,v]=q[qi],k=key(u,v);if(goals.has(k))return true;for(const [du,dv] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const nk=key(u+du,v+dv);if(open.has(nk)&&!seen.has(nk)){seen.add(nk);q.push([u+du,v+dv]);}}}return false;};
      const doorRows=F.doors.map(d=>{const ca=Math.cos(d.a),sa=Math.sin(d.a),samples=Array.from({length:17},(_,i)=>{const k=i/16-.5,x=d.x+ca*d.len*k,y=d.y+sa*d.len*k;return F.doorBlocked(x,y,0);}),edge=d.len*.5+d.thickness*.55,wallsAtEnds=F.cellAt(d.x-ca*edge,d.y-sa*edge)===0&&F.cellAt(d.x+ca*edge,d.y+sa*edge)===0,bypassSmall=canBypass(d,14),bypassPlayer=canBypass(d,18),bypassLarge=canBypass(d,26);return{id:d.id,len:d.len,thickness:d.thickness,centerWalkable:F.cellAt(d.x,d.y),sealed:samples.every(Boolean),wallsAtEnds,bypassSmall,bypassPlayer,bypassLarge};});
      const zones=['first','room5','bulldozer','arena','room9','final'].map(name=>{const zone=F.zoneFor(name),report=F.stagePartyForEncounter(zone),units=[G.p,...G.allies.filter(a=>!a.dead)];return{name,...report,minSpacing:Math.min(...units.flatMap((a,i)=>units.slice(i+1).map(b=>Math.hypot(a.x-b.x,a.y-b.y))))};});
      F.openDoors(F.doors.map(d=>d.id));const opened=F.doors.every(d=>!F.doorBlocked(d.x,d.y,0));
      home();selectedMode=old.selectedMode;selectedStage=old.selectedStage;selectedParty=old.selectedParty;selectedWeapon=old.selectedWeapon;selectedDiff=old.selectedDiff;selected=old.selected;
      return{doors:doorRows,zones,opened,pass:doorRows.every(d=>d.centerWalkable===1&&d.sealed&&!d.bypassSmall&&!d.bypassPlayer&&!d.bypassLarge&&d.len<=1500)&&zones.every(z=>z.outside===0&&z.blocked===0&&z.minSpacing>=50)&&opened};
    };
    window.__TOY_TEST__.factoryMapJoinAudit=async()=>{
      const old={selectedMode,selectedStage,selectedParty,selectedWeapon,selected,selectedDiff};selectedMode='escape';selectedStage=2;selectedParty=3;selectedWeapon='nerf';selectedDiff='normal';selected=0;
      startGame(CHAR_ORDER[selected]);await F.loadDialogue();ESCAPE.advanceDialogue(true);stopGameLoop();
      // 새 맵은 3장을 잇는 대신 하나의 원화 이미지를 그대로 쓰므로 이음매 자체가 없다.
      const joins={bridgeCount:F.bridges.length,partCount:F.parts.length};
      const A='door_room4_to_room5',B='door_room5_to_room6',C='door_room6_to_arena';F.lockDoors([A,B,C]);F.openDoors([A]);
      const path=F.buildGuidancePath(F.points.room4,F.points.room5)||[],start=path[0]||null,end=path[path.length-1]||null,room5=F.nearestWalkable(F.points.room5.x,F.points.room5.y);
      const guidance={count:path.length,mostlyDown:!!start&&!!end&&end.y>start.y+120,allWalkable:path.every(p=>F.cellAt(p.x,p.y)===1&&!F.blocked(p.x,p.y,8)),endDistance:end?Math.hypot(end.x-room5.x,end.y-room5.y):Infinity};
      const routeLocks={room4Open:!F.byDoor(A).locked,room5ExitLocked:F.byDoor(B).locked,room6ExitLocked:F.byDoor(C).locked};
      home();selectedMode=old.selectedMode;selectedStage=old.selectedStage;selectedParty=old.selectedParty;selectedWeapon=old.selectedWeapon;selectedDiff=old.selectedDiff;selected=old.selected;
      return{joins,guidance,routeLocks,pass:joins.bridgeCount===0&&joins.partCount===1&&guidance.count>2&&guidance.mostlyDown&&guidance.allWalkable&&guidance.endDistance<2&&routeLocks.room4Open&&routeLocks.room5ExitLocked&&routeLocks.room6ExitLocked};
    };
    window.__TOY_TEST__.factoryFinalBossAudit=async()=>{
      const old={selectedMode,selectedStage,selectedParty,selectedWeapon,selected,selectedDiff};selectedMode='escape';selectedStage=2;selectedParty=3;selectedWeapon='nerf';selectedDiff='normal';selected=0;
      startGame(CHAR_ORDER[selected]);await F.loadDialogue();ESCAPE.advanceDialogue(true);stopGameLoop();F.resetEventStates();F.eventState.ROOM9_RAID='COMPLETED';F.phase='to_final';
      const gate=F.points.finalLock,far=F.nearestWalkable(gate.x-260,gate.y);G.p.x=far.x;G.p.y=far.y;F.update(FIXED_DT);
      const beforeArrival={distance:Math.hypot(G.p.x-gate.x,G.p.y-gate.y),phase:F.phase,story:F.eventState.FINAL_STORY};
      F.clearSequences();ESCAPE.dialogue=null;document.getElementById('escapeStory').classList.remove('show');F.sceneBusy=false;F.eventState.FINAL_STORY='PENDING';F.phase='to_final';
      const arrival=F.nearestWalkable(gate.x,gate.y);G.p.x=arrival.x;G.p.y=arrival.y;F.update(FIXED_DT);await Promise.resolve();await Promise.resolve();
      const atArrival={distance:Math.hypot(G.p.x-gate.x,G.p.y-gate.y),phase:F.phase,story:F.eventState.FINAL_STORY,dialogue:!!ESCAPE.dialogue};
      F.clearSequences();ESCAPE.dialogue=null;document.getElementById('escapeStory').classList.remove('show');F.sceneBusy=false;F.eventState.FINAL_STORY='COMPLETED';F.eventState.GIANT_BOSS='RUNNING';F.phase='giant_boss';
      const zone=F.zoneFor('final');F.stagePartyForEncounter(zone,{x:zone.x+zone.w*.22,y:zone.y+zone.h*.5});G.p.flags.tank=true;G.p.tankX=0;G.p.tankY=0;F.syncPlayerPets();F.spawnGiant();const boss=F.boss,fighters=[G.p,...G.allies.filter(a=>!a.dead)];
      const fighterMaxX=Math.max(...fighters.map(f=>f.x)),spawn={inside:F.inZone(boss,zone,-boss.r),blocked:F.blocked(boss.x,boss.y,boss.r),minDistance:Math.min(...fighters.map(f=>Math.hypot(boss.x-f.x,boss.y-f.y))),petDistance:Math.hypot(G.p.tankX-G.p.x,G.p.tankY-G.p.y),partyLeft:fighterMaxX<=zone.x+zone.w*.48,bossRight:boss.x>=zone.x+zone.w*.55,bossCenteredY:Math.abs(boss.y-(zone.y+zone.h*.5))<=zone.h*.34};
      const safe={x:boss.x,y:boss.y};boss.factorySafeX=safe.x;boss.factorySafeY=safe.y;boss.x=0;boss.y=0;boss.vx=800;boss.vy=800;clampWorldBounds(boss);const collision={restored:Math.hypot(boss.x-safe.x,boss.y-safe.y)<1,blocked:F.blocked(boss.x,boss.y,boss.r),vx:boss.vx,vy:boss.vy};
      home();selectedMode=old.selectedMode;selectedStage=old.selectedStage;selectedParty=old.selectedParty;selectedWeapon=old.selectedWeapon;selectedDiff=old.selectedDiff;selected=old.selected;
      return{beforeArrival,atArrival,spawn,collision,pass:beforeArrival.phase==='to_final'&&beforeArrival.story==='PENDING'&&atArrival.phase==='final_story'&&atArrival.story==='RUNNING'&&atArrival.dialogue&&spawn.inside&&!spawn.blocked&&spawn.minDistance>=300&&spawn.petDistance<100&&spawn.partyLeft&&spawn.bossRight&&spawn.bossCenteredY&&collision.restored&&!collision.blocked&&collision.vx===0&&collision.vy===0};
    };
    window.__TOY_TEST__.factoryDoorPreview=async()=>{
      const old={selectedMode,selectedStage,selectedParty,selectedWeapon,selected,selectedDiff};selectedMode='escape';selectedStage=2;selectedParty=3;selectedWeapon='nerf';selectedDiff='normal';selected=0;
      startGame(CHAR_ORDER[selected]);await F.loadDialogue();ESCAPE.advanceDialogue(true);stopGameLoop();
      const requested=new URLSearchParams(location.search).get('doorPreview')||'firstBack',d=F.byDoor(requested)||F.byDoor('firstBack');F.lockDoors(F.doors.map(x=>x.id));
      const nx=-Math.sin(d.a),ny=Math.cos(d.a),spot=F.nearestWalkable(d.x+nx*150,d.y+ny*150);G.p.x=spot.x;G.p.y=spot.y;cam.x=d.x;cam.y=d.y;draw();
      window.__TOY_TEST__.factoryDoorPreviewRestore=()=>{home();selectedMode=old.selectedMode;selectedStage=old.selectedStage;selectedParty=old.selectedParty;selectedWeapon=old.selectedWeapon;selectedDiff=old.selectedDiff;selected=old.selected;};
      return{id:d.id,len:d.len,thickness:d.thickness,centerWalkable:F.cellAt(d.x,d.y),blocked:F.doorBlocked(d.x,d.y,18)};
    };
    window.__TOY_TEST__.factoryDifficultyAudit=async()=>{
      const old={selectedMode,selectedStage,selectedParty,selectedWeapon,selected,selectedDiff};const rows=[];selectedMode='escape';selectedStage=2;selectedParty=3;selectedWeapon='nerf';selected=0;
      for(const diff of ['easy','normal','hard']){
        selectedDiff=diff;startGame(CHAR_ORDER[selected]);await F.loadDialogue();ESCAPE.advanceDialogue(true);stopGameLoop();const zone=F.zoneFor('first'),nativeRandom=Math.random;let seed=0x54f17a2d;
        Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
        try{F.startRaid('diffAudit',zone,1,16,()=>{});F.updateRaid(1.2);}finally{Math.random=nativeRandom;}
        const e=G.enemies.find(x=>!x.dead),profile=F.difficultyProfile(),cfg=F.timerProfile('room5');rows.push({diff,type:e?.type||'',hp:e?.maxHp||0,damage:e?.damage||0,speed:e?.speed||0,raid:G.enemies.filter(x=>!x.dead).length,room5Cap:Math.round(cfg.cap*profile.cap),room5Gap:cfg.startGap*profile.gap});home();
      }
      selectedMode=old.selectedMode;selectedStage=old.selectedStage;selectedParty=old.selectedParty;selectedWeapon=old.selectedWeapon;selectedDiff=old.selectedDiff;selected=old.selected;
      const [easy,normal,hard]=rows;return{rows,pass:easy.hp<normal.hp&&normal.hp<hard.hp&&easy.damage<normal.damage&&normal.damage<hard.damage&&Math.abs(easy.speed-normal.speed)<.01&&Math.abs(normal.speed-hard.speed)<.01&&easy.raid<normal.raid&&normal.raid<hard.raid&&easy.room5Cap<normal.room5Cap&&normal.room5Cap<hard.room5Cap&&easy.room5Gap>normal.room5Gap&&normal.room5Gap>hard.room5Gap};
    };
    window.__TOY_TEST__.factoryBulldozerFlowAudit=async()=>{
      const old={selectedMode,selectedStage,selectedParty,selectedWeapon,selected,selectedDiff};selectedMode='escape';selectedStage=2;selectedParty=3;selectedWeapon='nerf';selectedDiff='normal';selected=0;
      const B='door_room5_to_room6',C='door_room6_to_arena';startGame(CHAR_ORDER[selected]);await F.loadDialogue();ESCAPE.advanceDialogue(true);stopGameLoop();F.resetEventStates();F.eventState.ROOM5_UNLOCK='COMPLETED';F.routeState='ROOM6_APPROACH';F.routeHistory=['ROOM6_APPROACH'];F.openDoors([B]);F.lockDoors([C]);F.doorHistory=[];
      const originalScene=F.playScene,originalCue=F.playCue,originalCombat=F.playCombatLines;let room6ArrivalDone=null,introDone=null;const seenSegments=[];F.playScene=(n,done,opts)=>{seenSegments.push(opts?.segment||'main');if(opts?.segment==='room6Arrival')room6ArrivalDone=done;else if(opts?.segment==='preBoss')introDone=done;else if(done)done();};F.playCue=(text,done)=>{if(done)done();};F.playCombatLines=()=>{};
      const bulldozerZone=F.zoneFor('bulldozer');F.stagePartyForEncounter(bulldozerZone,{x:bulldozerZone.x+bulldozerZone.w*.78,y:bulldozerZone.y+bulldozerZone.h*.62});F.startBulldozerEncounter();const beforeArrival={boss:!!F.midboss,timer:!!F.timer,state:F.eventState.BULLDOZER_INTRO,routeState:F.routeState,doorsLocked:F.byDoor(B).locked&&F.byDoor(C).locked,hasArrivalCallback:typeof room6ArrivalDone==='function',segments:[...seenSegments]};if(typeof room6ArrivalDone==='function')room6ArrivalDone();const beforeIntro={boss:!!F.midboss,timer:!!F.timer,state:F.eventState.BULLDOZER_INTRO,routeState:F.routeState,hasIntroCallback:typeof introDone==='function',segments:[...seenSegments]};if(typeof introDone==='function')introDone();const boss=F.midboss,fighters=[G.p,...G.allies.filter(a=>!a.dead)],minDistance=Math.min(...fighters.map(f=>Math.hypot(boss.x-f.x,boss.y-f.y))),startedTogether={boss:!!boss,timer:!!F.timer,time:F.timer?.t,state:F.eventState.BULLDOZER_DEFENSE,routeState:F.routeState};
      boss.dead=true;F.bulldozerDefeated=true;F.tryFinishBulldozer();const killedEarly={timerStillRunning:!!F.timer,timerDone:F.bulldozerTimerDone,doorsLocked:F.byDoor(B).locked&&F.byDoor(C).locked,routeState:F.routeState};F.timer.t=0;F.updateTimer(0);
      const completed={phase:F.phase,unlock:F.eventState.BULLDOZER_UNLOCK,forwardOpen:!F.byDoor(C).locked,backHeld:F.byDoor(B).locked,routeState:F.routeState,opened:F.doorHistory.filter(x=>x.action==='OPEN').map(x=>x.id)};F.playScene=originalScene;F.playCue=originalCue;F.playCombatLines=originalCombat;
      home();selectedMode=old.selectedMode;selectedStage=old.selectedStage;selectedParty=old.selectedParty;selectedWeapon=old.selectedWeapon;selectedDiff=old.selectedDiff;selected=old.selected;
      const zone=F.zoneFor('bulldozer'),bossInside=F.inZone(boss,zone,-(boss.r||54))&&!F.blocked(boss.x,boss.y,boss.r||54),partyInside=fighters.every(e=>F.inZone(e,zone,-(e.r||16))&&!F.blocked(e.x,e.y,e.r||16));
      const noSpawnOverlap=minDistance>=(boss.r||54)+Math.max(...fighters.map(e=>e.r||18))+44;
      return{zone:{x:zone.x,y:zone.y,w:zone.w,h:zone.h},boss:{x:boss.x,y:boss.y,r:boss.r},fighters:fighters.map(e=>({x:e.x,y:e.y,r:e.r})),beforeArrival,beforeIntro,minDistance,noSpawnOverlap,bossInside,partyInside,startedTogether,killedEarly,completed,pass:!beforeArrival.boss&&!beforeArrival.timer&&beforeArrival.state==='RUNNING'&&beforeArrival.routeState==='ROOM6_DIALOGUE'&&beforeArrival.doorsLocked&&beforeArrival.hasArrivalCallback&&beforeIntro.hasIntroCallback&&beforeIntro.segments.join(',')==='room6Arrival,preBoss'&&!beforeIntro.boss&&!beforeIntro.timer&&startedTogether.boss&&startedTogether.timer&&startedTogether.time===30&&startedTogether.state==='RUNNING'&&startedTogether.routeState==='ROOM6_DEFENSE_30'&&noSpawnOverlap&&bossInside&&partyInside&&killedEarly.timerStillRunning&&!killedEarly.timerDone&&killedEarly.doorsLocked&&killedEarly.routeState==='ROOM6_DEFENSE_30'&&completed.phase==='to_arena'&&completed.unlock==='COMPLETED'&&completed.forwardOpen&&completed.backHeld&&completed.routeState==='ROOM6_TO_ARENA_OPEN'&&completed.opened.length===1&&completed.opened[0]===C};
    };
    window.__TOY_TEST__.factoryRouteAudit=async()=>{
      const old={selectedMode,selectedStage,selectedParty,selectedWeapon,selected};
      selectedMode='escape';selectedStage=2;selectedParty=3;selectedWeapon='nerf';selected=0;startGame(CHAR_ORDER[selected]);await F.loadDialogue();ESCAPE.advanceDialogue(true);stopGameLoop();
      const A=F.byDoor('door_room4_to_room5'),B=F.byDoor('door_room5_to_room6'),C=F.byDoor('door_room6_to_arena'),bulldozerZone=F.zoneFor('bulldozer'),nearestTrigger=F.nearestWalkable(F.points.bulldozerTrigger.x,F.points.bulldozerTrigger.y);
      F.lockDoors([A.id,B.id,C.id]);
      const before={ids:[A.id,B.id,C.id],distinct:new Set([A.id,B.id,C.id]).size===3,allLocked:[A,B,C].every(d=>d.locked),allBlocked:[A,B,C].every(d=>F.doorBlocked(d.x,d.y,18))};
      F.doorHistory=[];F.openDoors([A.id]);const aOpened=F.doorHistory.filter(x=>x.action==='OPEN').map(x=>x.id);F.lockDoors([A.id]);F.doorHistory=[];F.openDoors([B.id]);const bOpened=F.doorHistory.filter(x=>x.action==='OPEN').map(x=>x.id);F.lockDoors([B.id]);F.doorHistory=[];F.openDoors([C.id]);const cOpened=F.doorHistory.filter(x=>x.action==='OPEN').map(x=>x.id);
      const after={aOpened:aOpened.join(',')===A.id,bOpened:bOpened.join(',')===B.id,cOpened:cOpened.join(',')===C.id};
      const route={entryX:A.x,room5ExitX:B.x,bulldozerExitX:C.x,triggerX:F.points.bulldozerTrigger.x,triggerInZone:F.inZone(F.points.bulldozerTrigger,bulldozerZone,0),triggerWalkableDistance:Math.hypot(nearestTrigger.x-F.points.bulldozerTrigger.x,nearestTrigger.y-F.points.bulldozerTrigger.y),linkedDoorId:{...F.linkedDoorId},stateOrder:[...F.routeOrder]};
      home();selectedMode=old.selectedMode;selectedStage=old.selectedStage;selectedParty=old.selectedParty;selectedWeapon=old.selectedWeapon;selected=old.selected;
      const expected=['ROOM4_LOCKED_DOOR_DIALOGUE_3','ROOM4_DEVICE_SEARCH','ROOM4_DEVICE_DIALOGUE_4','ROOM4_TO_ROOM5_OPEN','ROOM5_ENTER','ROOM5_INTRO_DIALOGUE','ROOM5_WARNING','ROOM5_DEFENSE_60','ROOM5_COUNTDOWN','ROOM5_TO_ROOM6_OPEN','ROOM6_APPROACH','ROOM6_DIALOGUE','BULLDOZER_SPAWN','ROOM6_DEFENSE_30','BULLDOZER_AND_TIMER_COMPLETE','ROOM6_TO_ARENA_OPEN'];
      return{before,after,route,pass:before.distinct&&before.allLocked&&before.allBlocked&&after.aOpened&&after.bOpened&&after.cOpened&&route.entryX>route.room5ExitX&&route.room5ExitX>route.bulldozerExitX&&route.triggerX<route.room5ExitX&&route.triggerInZone&&route.triggerWalkableDistance<90&&route.linkedDoorId.DEVICE4===A.id&&route.linkedDoorId.ROOM5_UNLOCK===B.id&&route.linkedDoorId.BULLDOZER_UNLOCK===C.id&&JSON.stringify(route.stateOrder)===JSON.stringify(expected)};
    };
    window.__TOY_TEST__.factoryDeviceOrderAudit=async()=>{
      const old={selectedMode,selectedStage,selectedParty,selectedWeapon,selected};
      selectedMode='escape';selectedStage=2;selectedParty=3;selectedWeapon='nerf';selected=0;startGame(CHAR_ORDER[selected]);await F.loadDialogue();ESCAPE.advanceDialogue(true);stopGameLoop();
      const target=F.nearestWalkable(F.points.room4.x,F.points.room4.y);G.p.x=target.x;G.p.y=target.y;cam.x=G.p.x;cam.y=G.p.y;F.phase='to_device';F.update(FIXED_DT);await new Promise(resolve=>setTimeout(resolve,0));
      const A='door_room4_to_room5',room4=F.zone(F.points.room4.x,F.points.room4.y,510,390);const beforePickup={phase:F.phase,scene3:!!ESCAPE.dialogue,device:!!F.device,entryLocked:F.byDoor(A).locked,routeState:F.routeState};
      ESCAPE.advanceDialogue(true);stopGameLoop();const deviceReady={phase:F.phase,device:!!F.device,sceneClosed:!ESCAPE.dialogue,entryLocked:F.byDoor(A).locked,routeState:F.routeState,insideRoom4:!!F.device&&F.inZone(F.device,room4,0)};
      if(F.device){G.p.x=F.device.x;G.p.y=F.device.y;F.update(FIXED_DT);await new Promise(resolve=>setTimeout(resolve,0));}
      const afterPickup={phase:F.phase,scene4:!!ESCAPE.dialogue,deviceRemoved:!F.device,entryLocked:F.byDoor(A).locked,routeState:F.routeState};
      ESCAPE.advanceDialogue(true);stopGameLoop();const completed={phase:F.phase,entryOpened:!F.byDoor(A).locked,routeState:F.routeState};
      home();selectedMode=old.selectedMode;selectedStage=old.selectedStage;selectedParty=old.selectedParty;selectedWeapon=old.selectedWeapon;selected=old.selected;
      return{beforePickup,deviceReady,afterPickup,completed,pass:beforePickup.scene3&&!beforePickup.device&&beforePickup.entryLocked&&beforePickup.routeState==='ROOM4_LOCKED_DOOR_DIALOGUE_3'&&deviceReady.device&&deviceReady.phase==='device_search'&&deviceReady.entryLocked&&deviceReady.routeState==='ROOM4_DEVICE_SEARCH'&&deviceReady.insideRoom4&&afterPickup.scene4&&afterPickup.deviceRemoved&&afterPickup.entryLocked&&afterPickup.routeState==='ROOM4_DEVICE_DIALOGUE_4'&&completed.phase==='to_room5'&&completed.entryOpened&&completed.routeState==='ROOM4_TO_ROOM5_OPEN'};
    };
    window.__TOY_TEST__.factoryP0RouteRegressionAudit=async(iterations=20)=>{
      const runs=[];
      for(let i=1;i<=iterations;i++){
        try{
          const device=await window.__TOY_TEST__.factoryDeviceOrderAudit();
          const room5=await window.__TOY_TEST__.factoryStoryFlowAudit();
          const room6=await window.__TOY_TEST__.factoryBulldozerFlowAudit();
          const route=await window.__TOY_TEST__.factoryRouteAudit();
          const map=await window.__TOY_TEST__.factoryMapJoinAudit();
          const finalBoss=await window.__TOY_TEST__.factoryFinalBossAudit();
          runs.push({iteration:i,device:device.pass,room5:room5.pass,room6:room6.pass,route:route.pass,map:map.pass,finalBoss:finalBoss.pass,pass:device.pass&&room5.pass&&room6.pass&&route.pass&&map.pass&&finalBoss.pass});
        }catch(error){runs.push({iteration:i,pass:false,error:String(error?.stack||error)});}
      }
      const failures=runs.filter(run=>!run.pass);
      return{iterations,passed:runs.length-failures.length,failures,runs,pass:runs.length===iterations&&failures.length===0};
    };
    const panel=document.getElementById('toyTestPanel'),output=document.getElementById('toyTestOutput');
    if(panel&&output){
      for(const [id,label,run] of [
        ['toyTestFactoryDialogue','공장 대사 검사',window.__TOY_TEST__.factoryDialogueAudit],
        ['toyTestFactoryStoryFlow','공장 대사·타이머 순서 검사',window.__TOY_TEST__.factoryStoryFlowAudit],
        ['toyTestFactoryEncounter','공장 전투 검사',window.__TOY_TEST__.factoryEncounterAudit],
        ['toyTestFactoryWaveBoundary','공장 양방향·경계 검사',window.__TOY_TEST__.factoryWaveBoundaryAudit],
        ['toyTestFactoryGate','공장 잠긴문·파티 검사',window.__TOY_TEST__.factoryGateAudit],
        ['toyTestFactoryFinalBoss','공장 최종보스 도착·벽 검사',window.__TOY_TEST__.factoryFinalBossAudit],
        ['toyTestFactoryDoorPreview','공장 태엽문 화면 검사',window.__TOY_TEST__.factoryDoorPreview],
        ['toyTestFactoryDifficulty','공장 난이도 검사',window.__TOY_TEST__.factoryDifficultyAudit],
        ['toyTestFactoryBulldozer','공장 불도저·문 순서 검사',window.__TOY_TEST__.factoryBulldozerFlowAudit],
        ['toyTestFactoryRoute','공장 동선 검사',window.__TOY_TEST__.factoryRouteAudit],
        ['toyTestFactoryDevice','공장 장치 순서 검사',window.__TOY_TEST__.factoryDeviceOrderAudit],
        ['toyTestFactoryP0Route','P0 3→4→5→6 20회 회귀검사',window.__TOY_TEST__.factoryP0RouteRegressionAudit]
      ])if(!document.getElementById(id)){const b=document.createElement('button');b.id=id;b.textContent=label;b.addEventListener('click',async()=>{try{output.textContent=JSON.stringify(await run(),null,2);}catch(err){output.textContent=JSON.stringify({pass:false,error:String(err?.stack||err)},null,2);}});panel.appendChild(b);}
      if(new URLSearchParams(location.search).has('factoryAudit')){panel.style.cssText='position:fixed;left:4px;bottom:4px;width:min(96vw,520px);max-height:80vh;overflow:auto;z-index:10050;opacity:1;background:#07170d;color:#d8ffe1;padding:8px;border:2px solid #72db8a';output.style.cssText='display:block;white-space:pre-wrap;font:11px/1.35 monospace;margin-bottom:6px';for(const button of panel.querySelectorAll('button'))button.style.cssText='display:inline-block;margin:2px;padding:6px;font-size:11px';}
    }
  }
  F.loadDialogue();
})();
