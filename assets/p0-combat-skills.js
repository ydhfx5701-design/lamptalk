(function(){
  'use strict';
  const P0={
    skillId:null,cooldown:0,parryT:0,parryMotionT:0,shieldT:0,
    lastDir:{x:1,y:0},shots:[],slams:[],visuals:[],parryFeedbackAt:0,revShots:[],revElapsed:0,
    metrics:{parryAttempts:0,parrySuccess:0,parryReflections:0,shotgunBlasts:0,shotgunTimes:[],hammerImpacts:0,revolverShots:0,revolverTimes:[]}
  };
  const SHOT_TIMES=[0,.18,1.18,1.34,1.50,1.66];
  const REVOLVER_INTERVAL=.11;
  const SKILL_COOLDOWNS={parry:4,shotgun_guard_burst:16,revolver_six_shot:12};
  const button=document.createElement('button');
  button.id='combatActiveSkill';button.type='button';button.setAttribute('aria-label','무기 액티브 스킬');
  button.innerHTML='<span class="p0-icon">◆</span><span class="p0-time"></span>';
  const style=document.createElement('style');
  style.textContent=`#combatActiveSkill{position:fixed;z-index:8600;left:max(10px,env(safe-area-inset-left));bottom:calc(max(42px,env(safe-area-inset-bottom)) + 58px);width:68px;height:68px;border:3px solid #e8fbff;border-radius:50%;padding:0;color:#fff;background:conic-gradient(#53d9ff var(--ready,100%),rgba(9,29,46,.88) 0);box-shadow:0 0 0 3px #17496d,0 3px 12px #0009,inset 0 0 18px #48cfff88;font:900 25px/1 system-ui;display:none;touch-action:manipulation}.p0-icon{position:absolute;inset:5px;display:grid;place-items:center;border-radius:50%;background:#11344fe8;text-shadow:0 0 8px #8ff}.p0-time{position:absolute;inset:0;display:grid;place-items:center;font-size:16px;color:#fff;text-shadow:0 2px 3px #000}.p0-parry .p0-icon:before{content:'⚔';font-size:25px}.p0-shotgun .p0-icon:before{content:'▰';font-size:26px;transform:rotate(-18deg)}.p0-revolver .p0-icon:before{content:'✹';font-size:24px}.p0-parry .p0-icon,.p0-shotgun .p0-icon,.p0-revolver .p0-icon{font-size:0}#combatActiveSkill:active{transform:scale(.94)}`;
  document.head.appendChild(style);document.body.appendChild(button);

  function primaryWeapon(p){return p?.weapons?.[0]?.id||null;}
  function syncButton(){
    const p=(typeof G!=='undefined'&&G)?G.p:null,id=primaryWeapon(p),active=(typeof state!=='undefined'&&state==='play'&&p&&!p.dead&&(id==='red_moon'||id==='shotgun'||id==='revolver'));
    button.style.display=active?'block':'none';if(!active)return;
    const next=id==='red_moon'?'parry':id==='shotgun'?'shotgun_guard_burst':'revolver_six_shot';P0.skillId=next;
    button.className=next==='parry'?'p0-parry':next==='shotgun_guard_burst'?'p0-shotgun':'p0-revolver';button.querySelector('.p0-time').textContent=P0.cooldown>0?Math.ceil(P0.cooldown):'';
    button.style.setProperty('--ready',`${100*(1-Math.min(1,P0.cooldown/(SKILL_COOLDOWNS[next]||4)))}%`);
    button.disabled=P0.cooldown>0;
  }
  function addVisual(type,x,y,extra={}){P0.visuals.push(Object.assign({type,x,y,t:0,life:.28},extra));}
  function triggerParry(){if(P0.cooldown>0)return;P0.parryT=.20;P0.parryMotionT=.38;P0.parryFeedbackAt=performance.now();P0.cooldown=4;addVisual('parryReady',G.p.x,G.p.y,{owner:G.p,life:.30});}
  function triggerShotgun(){
    if(P0.cooldown>0)return;const p=G.p;P0.cooldown=16;P0.shieldT=1.78;p.invul=Math.max(p.invul||0,1.78);
    if(G.pendingShots)for(let i=G.pendingShots.length-1;i>=0;i--)if(G.pendingShots[i].owner===p&&G.pendingShots[i].kind==='shotgun')G.pendingShots.splice(i,1);
    p.weapons[0].cd=Math.max(p.weapons[0].cd,.05);
    P0.shots=SHOT_TIMES.map((time,index)=>({time,index,fired:false}));P0.metrics.shotgunBlasts=0;P0.metrics.shotgunTimes=[];
    addVisual('shield',p.x,p.y,{owner:p,life:1.78,fullLife:1.78});
  }
  /* 리볼버 6연사 스킬 — 사거리 안의 서로 다른 최대 6마리에게 한 발씩, 6마리 미만이면 살아있는 적을 순환하며 채운다 */
  function pickRevolverTargets(p){
    const range=WEAPONS.revolver.range*(p.weaponRange||1);
    const cands=G.enemies.filter(e=>!e.dead&&onScreen(e,40)&&Math.hypot(e.x-p.x,e.y-p.y)<=range)
      .sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
    const unique=cands.slice(0,6);
    if(!unique.length)return[];
    const seq=[];
    for(let i=0;i<6;i++)seq.push(unique[i%unique.length]);
    return seq;
  }
  function triggerRevolver(){
    if(P0.cooldown>0)return;const p=G.p;
    const seq=pickRevolverTargets(p);
    if(!seq.length)return;
    P0.cooldown=12;P0.revElapsed=0;P0.metrics.revolverShots=0;P0.metrics.revolverTimes=[];
    P0.revShots=seq.map((t,i)=>({time:i*REVOLVER_INTERVAL,index:i,fired:false,target:t}));
  }
  function revolverBlast(p,target,elapsed){
    let t=(target&&!target.dead)?target:null;
    if(!t){
      const range=WEAPONS.revolver.range*(p.weaponRange||1);
      t=G.enemies.filter(e=>!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<=range).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
    }
    if(!t)return;
    const a=Math.atan2(t.y-p.y,t.x-p.x);
    p.aim=a;p.attackWeapon='revolver';p.attackDur=.16;p.attackT=.16;
    const mx=p.x+Math.cos(a)*42,my=p.y+Math.sin(a)*38-3,z=rollDamage(p,WEAPONS.revolver.damage*.85),speed=900;
    AudioMgr.sfx('revolver',1);
    addProj({type:'revolverShot',x:mx,y:my,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:4.5,life:1.05,dmg:z.value,crit:z.crit,color:'#ffd45e',owner:p});
    muzzle(mx,my,WEAPONS.revolver.color,a);
    P0.metrics.revolverShots++;P0.metrics.revolverTimes.push(+elapsed.toFixed(3));
  }
  function activate(){if(!G?.p||G.p.dead||P0.cooldown>0)return;const id=primaryWeapon(G.p);if(id==='red_moon')triggerParry();else if(id==='shotgun')triggerShotgun();else if(id==='revolver')triggerRevolver();syncButton();}
  button.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();activate();},{passive:false});

  function currentManualAngle(p){const x=p.moveX||0,y=p.moveY||0,d=Math.hypot(x,y);if(d>.12){P0.lastDir={x:x/d,y:y/d};}return Math.atan2(P0.lastDir.y,P0.lastDir.x);}
  function shotgunBlast(p,elapsed){
    const a=currentManualAngle(p),count=WEAPONS.shotgun.shots,fan=.52,speedBase=700;
    p.aim=a;p.attackWeapon='shotgun';p.attackDur=.22;p.attackT=.22;
    const mx=p.x+Math.cos(a)*38,my=p.y+Math.sin(a)*38-3;AudioMgr.sfx('shotgun',1);
    for(let n=0;n<count;n++){
      const aa=a+(n-(count-1)/2)*(fan/Math.max(1,count-1))+rnd(.014,-.014),z=rollDamage(p,WEAPONS.shotgun.damage*.75),speed=rnd(speedBase+30,speedBase-35);
      addProj({type:'shotgunPellet',x:mx,y:my,vx:Math.cos(aa)*speed,vy:Math.sin(aa)*speed,r:4,life:.36,dmg:z.value,crit:z.crit,color:'#50c7ff',owner:p});
    }
    G.effects.push({type:'shotgunFlash',x:mx,y:my,a,t:0,life:.11,scale:1.08},{type:'shotgunFootFlash',x:p.x,y:p.y+18,a:0,t:0,life:.12,scale:1.02});
    P0.metrics.shotgunBlasts++;P0.metrics.shotgunTimes.push(+elapsed.toFixed(3));
  }
  function updateP0(dt){
    if(P0.cooldown>0)P0.cooldown=Math.max(0,P0.cooldown-dt);if(P0.parryT>0)P0.parryT=Math.max(0,P0.parryT-dt);if(P0.parryMotionT>0)P0.parryMotionT=Math.max(0,P0.parryMotionT-dt);if(P0.shieldT>0)P0.shieldT=Math.max(0,P0.shieldT-dt);
    /* 샷건 스킬 진행 중에는 일반 자동사격(적 자동조준)이 끼어들지 않도록 무기 게이지를 강제로 잠가둔다 —
       스킬은 반드시 플레이어 조작 방향으로만 쏴야 하므로, 몬스터가 있어도 기본 사격의 acquireTarget 발사가 섞이면 안 된다 */
    if(P0.shots.length&&G?.p?.weapons?.[0]&&G.p.weapons[0].id==='shotgun')G.p.weapons[0].cd=Math.max(G.p.weapons[0].cd,.05);
    if(G?.p){currentManualAngle(G.p);if(P0.shots.length){const elapsed=1.78-P0.shieldT;for(const s of P0.shots)if(!s.fired&&elapsed+1e-6>=s.time){s.fired=true;shotgunBlast(G.p,elapsed);}if(P0.shots.every(s=>s.fired))P0.shots=[];}
      if(P0.revShots.length){P0.revElapsed+=dt;for(const s of P0.revShots)if(!s.fired&&P0.revElapsed+1e-6>=s.time){s.fired=true;revolverBlast(G.p,s.target,P0.revElapsed);}if(P0.revShots.every(s=>s.fired))P0.revShots=[];}}
    for(let i=P0.slams.length-1;i>=0;i--){const s=P0.slams[i];s.t+=dt;
      if(s.t<.18)s.phase='WINDUP';
      else if(s.t<.30){s.phase='BOOSTER_IGNITION';if(!s.boosted){s.boosted=true;addVisual('mechaBoostCustom',s.owner.x,s.owner.y,{owner:s.owner,a:s.a+Math.PI,life:.24});}}
      else if(s.t<.48)s.phase='ACCELERATION';
      else if(!s.impacted){s.phase='IMPACT';s.impacted=true;mechammerImpact(s.owner,s.a,s.mul);}
      else if(s.t<.64)s.phase='SHOCKWAVE';else if(s.t<.78)s.phase='RECOVERY';else P0.slams.splice(i,1);
    }
    for(let i=P0.visuals.length-1;i>=0;i--){const v=P0.visuals[i];v.t+=dt;v.life-=dt;if(v.life<=0)P0.visuals.splice(i,1);}
    syncButton();
  }

  const baseUpdateEffects=updateEffects;
  updateEffects=function(dt){updateP0(dt);return baseUpdateEffects(dt);};

  const baseHurtFighter=hurtFighter;
  function parryFeedback(u,a){const now=performance.now(),at=Math.max(now,P0.parryFeedbackAt||now),delay=Math.max(0,at-now);P0.parryFeedbackAt=at+55;setTimeout(()=>{if(!u)return;P0.parryMotionT=Math.max(P0.parryMotionT,.34);addVisual('parryHit',u.x,u.y,{owner:u,a,life:.24});AudioMgr.sfx('parry',1);if(u.isPlayer&&typeof shake!=='undefined'&&(!P0._lastShakeT||now-P0._lastShakeT>150)){shake=Math.max(shake,4);P0._lastShakeT=now;}},delay);}
  hurtFighter=function(u,dmg,attack){
    if(u===G?.p&&P0.parryT>0&&primaryWeapon(u)==='red_moon'){
      P0.metrics.parryAttempts++;P0.metrics.parrySuccess++;u.invul=Math.max(u.invul||0,.12);
      const enemies=G.enemies.filter(e=>!e.dead).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)),target=attack?.source&&!attack.source.dead?attack.source:enemies[0];
      const a=target?Math.atan2(target.y-u.y,target.x-u.x):(u.aim||0);
      if(attack?.projectile&&target){const speed=720;addProj({type:'parryReflect',x:u.x+Math.cos(a)*25,y:u.y+Math.sin(a)*25,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:5,life:.85,dmg,color:'#c8fbff',owner:u});P0.metrics.parryReflections++;}
      else if(target){const recoil=target.boss?45:120;target.vx=(target.vx||0)+Math.cos(a)*recoil;target.vy=(target.vy||0)+Math.sin(a)*recoil;target.stun=Math.max(target.stun||0,target.boss?.08:.24);}
      parryFeedback(u,a);return 0;
    }
    if(u===G?.p&&P0.shieldT>0&&primaryWeapon(u)==='shotgun'){addVisual('shieldRipple',u.x,u.y,{owner:u,a:Math.random()*TAU,life:.22});return 0;}
    return baseHurtFighter(u,dmg);
  };

  const baseFireWeapon=fireWeapon;
  fireWeapon=function(p,w,t){
    if(w.id!=='mechammer')return baseFireWeapon(p,w,t);
    const a=Math.atan2(t.y-p.y,t.x-p.x);p.aim=a;p.attackWeapon='mechammer';p.attackDur=.78;p.attackT=.78;p.attackCount++;reserveWeaponFire(p,w);
    P0.slams.push({owner:p,a,mul:1,t:0,phase:'WINDUP',boosted:false,impacted:false});
  };
  function mechammerImpact(p,a,mul=1){
    if(!p||p.dead)return;commitWeaponFire(p,p.weapons?.find(w=>w.id==='mechammer')||p.weapons?.[0]);
    const rad=WEAPONS.mechammer.range*(p.weaponRange||1),ix=p.x+Math.cos(a)*rad*.58,iy=p.y+Math.sin(a)*rad*.58;AudioMgr.sfx('mechammer',weaponSoundGain(p));
    G.effects.push({type:'mechaImpactSprite',x:ix,y:iy,a,rad:rad*1.05,t:0,life:.36});addVisual('hammerRing',ix,iy,{a,rad:rad*.88,life:.34});
    for(let j=0;j<10;j++)addVisual('debris',ix,iy,{a:rnd(TAU),speed:rnd(190,80),life:rnd(.42,.24)});
    for(const e of G.enemies){if(e.dead||Math.hypot(e.x-ix,e.y-iy)>rad*.88+e.r)continue;const aa=Math.atan2(e.y-iy,e.x-ix),z=rollDamage(p,WEAPONS.mechammer.damage*mul);e.stun=Math.max(e.stun,.34);hitEnemy(e,z.value,aa,560,'#59d9ff',z.crit,null,p);}
    shake=Math.max(shake,p.isPlayer?8:4);P0.metrics.hammerImpacts++;
  }
  const baseWeaponPose=weaponPose;
  weaponPose=function(e,size,bob,id){
    const pose=baseWeaponPose(e,size,bob,id);
    if(id==='red_moon'&&e===G?.p&&P0.parryMotionT>0){const q=clamp(1-P0.parryMotionT/.38,0,1),aim=e.aim||0;return Object.assign(pose,{a:aim-1.22+q*2.44,q,active:true});}
    if(id!=='mechammer')return pose;
    const aim=e.aim||0,active=e.attackT>0&&e.attackWeapon==='mechammer',q=active?clamp(1-e.attackT/e.attackDur,0,1):0;let a=aim-.58;
    if(active){if(q<.30){const u=q/.30;a=aim-.58-u*.92;}else if(q<.62){const u=(q-.30)/.32;a=aim-1.50+u*1.82;}else{const u=(q-.62)/.38;a=aim+.32-u*.90;}}
    const reach=size*.085;return Object.assign(pose,{a,gx:e.x+Math.cos(aim)*reach,gy:e.y-size*.06+bob+Math.sin(aim)*reach,q,active});
  };

  function drawP0(){
    for(const v of P0.visuals){const o=v.owner;if(o){v.x=o.x;v.y=o.y;}const s=worldToScreen(v.x,v.y),k=1-v.life/(v.fullLife||Math.max(v.life+v.t,.001));ctx.save();ctx.translate(s.x,s.y);
      if(v.type==='shield'){ctx.globalAlpha=.36+.10*Math.sin(v.t*18);ctx.strokeStyle='#91efff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,38+Math.sin(v.t*9)*2,0,TAU);ctx.stroke();ctx.globalAlpha=.13;ctx.fillStyle='#56d8ff';ctx.beginPath();ctx.arc(0,0,37,0,TAU);ctx.fill();}
      else if(v.type==='shieldRipple'){ctx.globalAlpha=1-k;ctx.strokeStyle='#d9ffff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,28+k*23,v.a-1,v.a+1);ctx.stroke();}
      else if(v.type==='parryReady'||v.type==='parryHit'){
        const big=v.type==='parryHit';
        if(big&&!v.centerFlash){v.centerFlash=1;const g0=ctx.createRadialGradient(0,0,0,0,0,46);g0.addColorStop(0,'rgba(255,255,255,.95)');g0.addColorStop(.45,'rgba(220,250,255,.55)');g0.addColorStop(1,'rgba(220,250,255,0)');ctx.fillStyle=g0;ctx.beginPath();ctx.arc(0,0,46,0,TAU);ctx.fill();}
        ctx.save();ctx.rotate((v.a||0)-3.02);ctx.globalAlpha=Math.max(.55,1-k*.35);
        const frames=DATA.redMoonFx||[],idx=Math.min(frames.length-1,Math.floor(k*frames.length)),im=frames.length?IMG[frames[idx]]:null;
        if(im&&im.complete&&im.naturalWidth){const fw=(big?106:88)*1.7,fh=fw*(im.naturalHeight/im.naturalWidth);ctx.drawImage(im,-fw*.18,-fh*.5,fw,fh);}
        ctx.restore();
        ctx.globalCompositeOperation='screen';
        ctx.strokeStyle='#eaffff';ctx.lineWidth=big?5:3;ctx.beginPath();ctx.arc(0,0,(big?32:25)+k*(big?30:19),-1.05,1.05);ctx.stroke();
        ctx.strokeStyle='rgba(140,235,255,.75)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,10+k*(big?54:32),0,TAU);ctx.stroke();
        const sparkN=big?9:6;
        for(let i=0;i<sparkN;i++){const a=-1.1+i*(2.2/(sparkN-1)),r=(big?30:23)+k*(big?42:32);ctx.fillStyle=i%2?'#fff':'#66e8ff';const sz=big?5:4;ctx.fillRect(Math.cos(a)*r-sz/2,Math.sin(a)*r-sz/2,sz,sz);}
      }
      else if(v.type==='mechaBoostCustom'){ctx.rotate(v.a);ctx.globalAlpha=1-k;const g=ctx.createLinearGradient(0,0,42,0);g.addColorStop(0,'#fff');g.addColorStop(.28,'#ffcc4c');g.addColorStop(1,'rgba(255,82,16,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(44,0);ctx.lineTo(0,8);ctx.closePath();ctx.fill();}
      else if(v.type==='hammerRing'){ctx.scale(1.30,.72);ctx.globalAlpha=1-k;ctx.strokeStyle='#64dcff';ctx.lineWidth=6*(1-k)+2;ctx.beginPath();ctx.arc(0,0,(v.rad||60)*(.30+.72*k),0,TAU);ctx.stroke();}
      else if(v.type==='debris'){const d=v.t*(v.speed||100);ctx.rotate(v.a);ctx.translate(d,0);ctx.globalAlpha=1-k;ctx.fillStyle='#8fe8ff';ctx.fillRect(-3,-2,6,4);}
      ctx.restore();
    }
  }
  const baseDrawEffects=drawEffects;drawEffects=function(){baseDrawEffects();drawP0();};

  window.__P0_COMBAT__={
    version:'redmoon-shotgun-mechhammer-2',state:P0,activate,
    config:{redMoon:{weaponId:'red_moon',damage:68,cooldown:1,range:129,crit:.08,supportsParry:true,parryActive:.20,parryMotion:.38,successInvulnerability:.12,parryCooldown:4},shotgun:{skillId:'shotgun_guard_burst',cooldown:16,blastTimes:SHOT_TIMES.slice(),shieldDuration:1.78,damageMultiplier:.75,autoAim:false},revolver:{skillId:'revolver_six_shot',cooldown:12,shotInterval:REVOLVER_INTERVAL,shotCount:6,damageMultiplier:.85},mechammer:{phases:['READY','WINDUP','BOOSTER_IGNITION','ACCELERATION','IMPACT','SHOCKWAVE','RECOVERY'],impactAt:.48,damageOnlyAtImpact:true,thrust:false}},
    syntheticParry:(count=5)=>{const p=G.p;P0.parryT=.20;const hp=p.hp;P0.metrics.parrySuccess=0;for(let i=0;i<count;i++)hurtFighter(p,10,{projectile:true});return{count,hpBefore:hp,hpAfter:p.hp,damageTaken:hp-p.hp,events:P0.metrics.parrySuccess,pass:p.hp===hp&&P0.metrics.parrySuccess===count};}
  };
  syncButton();
  /* updateP0()는 게임 루프가 도는 동안(state==='play')에만 호출되므로, 게임을 나가서 루프가
     멈추면 버튼이 마지막 상태(보임)로 그대로 남는 버그가 있었다. 게임 상태와 무관하게 항상
     주기적으로 버튼 표시 여부를 재확인해 캐릭터 선택/메인 화면 등에서는 확실히 숨긴다 */
  setInterval(syncButton, 250);
})();
