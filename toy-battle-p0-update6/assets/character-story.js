/* TOY BOTTLE — 캐릭터 표정 대사와 장난감 밀림 탈출 연출
   기존 게임 루프/맵 구조는 유지하고, 구간 트리거에 스토리만 연결한다. */
(() => {
  'use strict';
  if (typeof ESCAPE === 'undefined') return;

  const SECTION_NUM = {'①':1,'②':2,'③':3,'④':4,'⑤':5,'⑥':6,'⑦':7,'⑧':8,'⑨':9,'⑩':10,'⑪':11,'⑫':12,'⑬':13,'⑭':14,'⑮':15};
  const NAME_TO_CHAR = {기어:'windup_soldier',미유:'plush_cat',우디:'wooden_puppet',덕키:'rubber_duck',페이퍼:'paper_robot',피코:'clown_doll',랜슬롯:'toy_knight'};
  const EXPR_TO_DIR = {
    '기본 표정':'normal','기본':'normal','웃는 얼굴':'smile','웃는 표정':'smile',
    '놀란 표정':'surprised','당황 표정':'flustered','진지한 표정':'serious','진지한 얼굴':'serious',
    '화난 표정':'angry','겁먹은 표정':'scared'
  };
  const storyState = {};
  const scenes = new Map();
  const portraitCache = new Map();
  let portraitToken = 0;
  let storyRun = 0;
  let storyBeatToken = 0;

  const STORY_DIRECTION = /(울음소리|부스럭|쿵|콰|쾅|쿠웅|스르르|철컥|딸깍|팅!|정적|움찔|수풀.*(?:소리|흔들|튀어나|뚫고)|땅이 흔들|거대한 그림자|(?:몬스터|개체).*(?:멈춤|물러|도망|사라|더 이상.*따라|회피)|사이렌|우우우|문 .*개방|덩굴.*(?:올라|닫힘)|뱀이 쓰러|포탈이 나타)/;
  const STORY_META = /^(STG\.|목표:|→|⚠|[①-⑮]|(?:코뿔소 처치 후|20~40초 구간|마지막 5초|화면 중앙 큰 빨간 글씨|0~20초|20~40초|40~55초|55~60초|00:00|방어전 2차|60초 동안 버티세요|방어 준비|이번 방어전은|이번에는 첫 방어전보다|전부 잡고|다만 정지해서|여기는 1·2차보다|플레이어와 AI|탈출 성공)[.:!]?)/;

  function effectStrength(text) {
    if (/(콰아앙|콰직|쿠웅|쾅|쿵.*쿵|땅이 흔들|수풀.*(?:튀어나|뚫고)|거대한.*등장)/.test(text)) return 'strong';
    if (/(철컥.*철컥|우우우|사이렌|움찔|수풀.*흔들|부스럭)/.test(text)) return 'medium';
    if (/(딸깍|철컥|팅!|스르르|울음소리|정적)/.test(text)) return 'light';
    return '';
  }

  function clearsRetreatingEnemies(text) {
    return /(?:몬스터|개체).*(?:멈춤|물러|도망|사라|더 이상.*따라|회피)/.test(text);
  }

  function playStorySound(line, token) {
    const audio = window.__toyAudio;
    if (!audio || !line?.effect) return;
    const text = line.text || '';
    const later = (delay, fn) => setTimeout(() => { if (token === storyBeatToken) fn(); }, delay);
    const thud = strength => {
      audio.sfx('hammer', strength);
      audio.tone(72, .18, 'sine', .16 * strength, -28);
    };
    if (/(콰아앙|콰직|쾅|쿠웅|쿵)/.test(text)) {
      const hits = Math.max(1, Math.min(4, (text.match(/쿵|쾅|콰아앙|콰직|쿠웅/g) || []).length));
      for (let i=0; i<hits; i++) later(i*145, () => thud(line.effect === 'strong' ? .92 : .72));
      return;
    }
    if (/(철컥|딸깍|팅)/.test(text)) {
      const clicks = Math.max(1, Math.min(4, (text.match(/철컥|딸깍|팅/g) || []).length));
      for (let i=0; i<clicks; i++) later(i*115, () => { audio.sfx('click', .82); audio.tone(620-i*55, .045, 'square', .08, 120); });
      return;
    }
    if (/(사이렌|우우우)/.test(text)) {
      audio.sfx('boss', .62);
      later(130, () => audio.tone(430, .30, 'sawtooth', .12, -120));
      return;
    }
    if (/(울음소리|태엽 소리|너무 큰데)/.test(text)) {
      audio.sfx('boss', .42);
      audio.tone(118, .28, 'sawtooth', .09, -32);
      return;
    }
    if (/(부스럭|수풀|풀숲|사사삭|스르르)/.test(text)) {
      audio.noise(line.effect === 'medium' ? .28 : .18, .15, /스르르/.test(text) ? 900 : 1700);
      return;
    }
    if (/정적/.test(text)) audio.tone(86, .15, 'sine', .035, -18);
  }

  function parseDialogue(raw) {
    let section = 0, dialogueIndex = 0;
    for (const rawLine of raw.replace(/\r/g,'').split('\n')) {
      const line = rawLine.trim();
      const header = line.match(/^([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])/);
      if (header) {
        section = SECTION_NUM[header[1]] || 0;
        dialogueIndex = 0;
        if (section && !scenes.has(section)) scenes.set(section, []);
        continue;
      }
      if (!section || !line) continue;
      const match = line.match(/^([^:：]+)[:：]\s*[“"](.+?)[”"](?:\s*\((.+?)\))?\s*$/);
      if (match) {
        const name = match[1].trim(), text = match[2].trim(), group = name === '전원';
        scenes.get(section).push({
          char: group ? null : (NAME_TO_CHAR[name] || null),
          name,
          text,
          expression: (match[3] || '기본 표정').trim(),
          system: group,
          effect: effectStrength(text),
          clearEnemies: clearsRetreatingEnemies(text),
          dialogueIndex: dialogueIndex++
        });
        continue;
      }
      if (!STORY_META.test(line) && STORY_DIRECTION.test(line)) {
        scenes.get(section).push({char:null,name:'',text:line,expression:'기본 표정',system:true,effect:effectStrength(line),clearEnemies:clearsRetreatingEnemies(line),dialogueIndex});
      }
    }
    return scenes;
  }

  const STORY_ASSET_VERSION = '20260809-2';
  const ready = fetch(`assets/dialog/escape-dialogue.txt?v=${STORY_ASSET_VERSION}`, {cache:'no-store'})
    .then(r => { if (!r.ok) throw new Error(`dialogue ${r.status}`); return r.text(); })
    .then(parseDialogue)
    .catch(err => { console.error('[TOY BOTTLE] escape dialogue load failed', err); return scenes; });

  function expressionPath(line) {
    const dir = EXPR_TO_DIR[line.expression] || 'normal';
    return `assets/dialog/expressions/${dir}/${line.char}.${dir === 'smile' ? 'webp' : 'png'}?v=${STORY_ASSET_VERSION}`;
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  /* PNG에 실제로 박혀 있는 회색/흰색 체크무늬만 바깥 테두리에서 flood-fill로 제거한다.
     캐릭터 안쪽의 흰색 눈/얼굴은 검은 외곽선에 둘러싸여 있으므로 보존된다. */
  function cleanedPortrait(url) {
    if (portraitCache.has(url)) return portraitCache.get(url);
    const promise = loadImage(url).then(img => {
      if (/\.webp(?:\?|$)/i.test(url)) return url;
      const maxSide = 520, scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const g = canvas.getContext('2d', {willReadFrequently:true});
      g.drawImage(img, 0, 0, w, h);
      const frame = g.getImageData(0, 0, w, h), data = frame.data, total = w * h;
      const seen = new Uint8Array(total), queue = new Int32Array(total); let head = 0, tail = 0;
      const background = index => {
        const p = index * 4, r = data[p], gg = data[p+1], b = data[p+2], a = data[p+3];
        return a > 0 && Math.max(r,gg,b) - Math.min(r,gg,b) < 15 && Math.min(r,gg,b) > 180;
      };
      const add = index => { if (index >= 0 && index < total && !seen[index] && background(index)) { seen[index] = 1; queue[tail++] = index; } };
      for (let x=0; x<w; x++) { add(x); add((h-1)*w+x); }
      for (let y=0; y<h; y++) { add(y*w); add(y*w+w-1); }
      while (head < tail) {
        const index = queue[head++], x = index % w, p = index * 4; data[p+3] = 0;
        if (x > 0) add(index-1); if (x+1 < w) add(index+1); if (index >= w) add(index-w); if (index+w < total) add(index+w);
      }
      g.putImageData(frame, 0, 0);
      return canvas.toDataURL('image/png');
    }).catch(err => { console.warn('[TOY BOTTLE] portrait cleanup fallback', url, err); return url; });
    portraitCache.set(url, promise);
    return promise;
  }

  function showPortrait(line) {
    const img = document.getElementById('escapeStoryPortrait'), token = ++portraitToken;
    if (!img) return;
    img.style.visibility = 'hidden';
    if (!line.char) return;
    cleanedPortrait(expressionPath(line)).then(src => {
      if (token !== portraitToken || !ESCAPE.dialogue) return;
      img.onload = () => { if (token === portraitToken) img.style.visibility = 'visible'; };
      img.src = src;
      if (img.complete && img.naturalWidth) img.style.visibility = 'visible';
    });
  }

  function resetStoryState() {
    storyRun++;
    storyBeatToken++;
    for (const key of Object.keys(storyState)) delete storyState[key];
  }

  function applyStoryBeat(line) {
    if (!line) return;
    if (line.clearEnemies && G && Array.isArray(G.enemies)) {
      G.enemies = G.enemies.filter(enemy => enemy.boss || enemy.midboss);
      if (Array.isArray(G.enemyBullets)) G.enemyBullets.length = 0;
    }
    if (!line.effect) return;
    const game = document.getElementById('game'), token = ++storyBeatToken;
    playStorySound(line, token);
    if (!game) return;
    game.classList.remove('story-shake-light','story-shake-medium','story-shake-strong');
    void game.offsetWidth;
    game.classList.add(`story-shake-${line.effect}`);
    const duration = line.effect === 'strong' ? 540 : line.effect === 'medium' ? 340 : 200;
    setTimeout(() => { if (token === storyBeatToken) game.classList.remove(`story-shake-${line.effect}`); }, duration);
  }

  function playSection(section, onDone, options={}) {
    const run = storyRun, game = G;
    stopGameLoop();
    ready.then(() => {
      if (run !== storyRun || !game || G !== game || G.mode !== 'escape' || state !== 'play') return;
      const all = scenes.get(section) || [], hasRange = options.start != null || options.end != null;
      const start = options.start == null ? 0 : options.start, end = options.end == null ? Infinity : options.end;
      const lines = hasRange ? all.filter(line => line.dialogueIndex >= start && line.dialogueIndex < end) : all.slice();
      if (!lines.length) { if (onDone) onDone(); if (!ESCAPE.pausedForStory()) startGameLoop(); return; }
      ESCAPE.beginDialogue(lines, onDone, options.skippable !== false);
    });
  }

  function blockWithStory(key, section, onDone, options={}) {
    if (storyState[key] === 'done') return false;
    if (!storyState[key]) {
      storyState[key] = 'playing';
      playSection(section, () => { storyState[key] = 'done'; if (onDone) onDone(); }, options);
    }
    return true;
  }

  function beginCombatSection(key, section, options={}) {
    if (storyState[key] || ESCAPE.combatStory) return;
    const all = scenes.get(section) || [], start = options.start == null ? 0 : options.start, end = options.end == null ? Infinity : options.end;
    const lines = all.filter(line => line.dialogueIndex >= start && line.dialogueIndex < end && !line.system);
    storyState[key] = 'playing';
    if (!lines.length) { storyState[key] = 'done'; return; }
    ESCAPE.combatStory = {key,lines,index:0,t:.01,serial:Date.now()};
    document.getElementById('escapeStorySkip').style.display='none';
    document.getElementById('escapeStory').classList.add('show','combat-story');
  }

  function updateCombatStory(dt) {
    const c=ESCAPE.combatStory;if(!c)return;
    c.t-=dt;if(c.t>0)return;
    if(c.index>=c.lines.length){storyState[c.key]='done';ESCAPE.combatStory=null;document.getElementById('escapeStory').classList.remove('show','combat-story');return;}
    const line=c.lines[c.index++],serial=c.serial;
    document.getElementById('escapeStorySpeaker').textContent=line.name||'';
    document.getElementById('escapeStoryLine').textContent=line.text;
    const card=document.querySelector('.escape-dialog');if(card)card.classList.remove('system','no-portrait');
    const img=document.getElementById('escapeStoryPortrait');img.style.visibility='hidden';
    cleanedPortrait(expressionPath(line)).then(src=>{if(ESCAPE.combatStory?.serial!==serial)return;img.src=src;img.style.visibility='visible';});
    applyStoryBeat(line);c.t=.54;
  }

  const original = {
    resetRun: ESCAPE.resetRun.bind(ESCAPE),
    renderDialogue: ESCAPE.renderDialogue.bind(ESCAPE),
    startAmbushZone: ESCAPE.startAmbushZone.bind(ESCAPE),
    startDefense: ESCAPE.startDefense.bind(ESCAPE),
    updateDefense: ESCAPE.updateDefense.bind(ESCAPE),
    update: ESCAPE.update.bind(ESCAPE)
  };

  ESCAPE.story = {ready, scenes, state:storyState, play:playSection, reset:resetStoryState};

  ESCAPE.resetRun = function() {
    original.resetRun();
    resetStoryState();
    this.combatStory=null;
    document.getElementById('escapeStory').classList.remove('combat-story');
  };

  ESCAPE.renderDialogue = function() {
    if (!this.dialogue) return;
    const line = this.dialogue.lines[this.dialogue.index];
    const card = document.querySelector('.escape-dialog');
    if (card) card.classList.toggle('system', !!line.system || !line.char);
    document.getElementById('escapeStorySpeaker').textContent = line.name || '';
    document.getElementById('escapeStoryLine').textContent = line.text;
    showPortrait(line);
    if (this.dialogue.storyBeatIndex !== this.dialogue.index) {
      this.dialogue.storyBeatIndex = this.dialogue.index;
      applyStoryBeat(line);
    }
    const next = this.dialogue.lines[this.dialogue.index+1];
    if (next?.char) cleanedPortrait(expressionPath(next));
  };

  ESCAPE.beginIntro = function() {
    if (!this.introPositions) this.positionPartyAtStart();
    blockWithStory('intro', 1, () => {
      const now = [G.p,...G.allies];
      this.introDrift = this.introPositions.reduce((m,p,i) => Math.max(m,Math.hypot(now[i].x-p.x,now[i].y-p.y)),0);
      this.phase = 'travel1';
      showToast('목표: 밀림 깊은 곳의 탈출구를 찾으세요.',2800);
    });
  };

  ESCAPE.startAmbushZone = function(id, centerY) {
    const section = {a1:2,a2:8,a3:10}[id];
    const key = `ambush_${id}`;
    if (section && storyState[key] !== 'done') {
      if (!storyState[key]) {
        storyState[key] = 'playing';
        playSection(section, () => {
          storyState[key] = 'done';
          original.startAmbushZone(id, centerY);
        });
      }
      return;
    }
    original.startAmbushZone(id, centerY);
  };

  ESCAPE.startDefense = function(gate, dur, label, opts={}) {
    const isGateB = gate && gate === this.gateB;
    const isMiddle = !gate && this.midDefenseStarted && !this.midDefenseDone;
    const begin = () => {
      original.startDefense(gate,dur,label,opts);
      if (!this.defense) return;
      if (gate === this.gateA) this.defense.storyKind = 'first';
      else if (gate === this.gateD || opts.final) this.defense.storyKind = 'final';
      else if (isMiddle) this.defense.storyKind = 'middle';
    };
    if (isGateB && storyState.gateBDefense !== 'done') {
      if (!storyState.gateBDefense) {
        storyState.gateBDefense = 'playing';
        playSection(7, () => { storyState.gateBDefense = 'done'; begin(); });
      }
      return;
    }
    if (isMiddle && storyState.middleDefenseIntro !== 'done') {
      if (!storyState.middleDefenseIntro) {
        storyState.middleDefenseIntro = 'playing';
        playSection(9, () => { storyState.middleDefenseIntro = 'done'; begin(); }, {start:0,end:9});
      }
      return;
    }
    begin();
  };

  ESCAPE.updateDefense = function(dt) {
    const d = this.defense;
    if (!d) return;
    updateCombatStory(dt);
    const elapsed = d.dur - d.t;
    if (d.storyKind === 'first') {
      if (elapsed >= 20 && d.t > 5 && blockWithStory('firstDefenseMid',6,null,{start:0,end:7})) return;
      if (d.t <= 5 && d.openingT <= 0 && blockWithStory('firstDefenseLast5',6,null,{start:7,end:14})) return;
      if (d.openingT > 0 && blockWithStory('firstDefenseOpen',6,null,{start:14,end:22})) return;
    } else if (d.storyKind === 'middle') {
      if (d.t <= 5 && d.openingT <= 0 && blockWithStory('middleDefenseLast5',9,null,{start:9,end:13})) return;
      if (d.openingT > 0 && blockWithStory('middleDefenseOpen',9,null,{start:13,end:14})) return;
    } else if (d.storyKind === 'final') {
      if (d.t <= 5 && d.openingT <= 0) beginCombatSection('finalDefenseLast5',14);
    }
    original.updateDefense(dt);
  };

  ESCAPE.triggerDevice = function() {
    const dv = this.device;
    if (!dv || dv.armed) return;
    dv.armed = true;
    const finalDevice = !!dv.final;
    if(finalDevice){
      if(this.finalRouteState!=='FINAL_DEVICE_DROPPED')return;
      this.setFinalRouteState('FINAL_DEVICE_COLLECTED');
    }
    const key = finalDevice ? 'finalDevice' : 'firstDevice';
    const section = finalDevice ? 13 : 5;
    blockWithStory(key, section, () => {
      if(finalDevice){this.setFinalRouteState('FINAL_DEVICE_DIALOGUE');this.finalDeviceStoryDone=true;}
      this.showDefenseWarning(dv);
    }, {skippable:true});
  };

  ESCAPE.update = function(dt) {
    if (!this.baked) return;
    const py = G.p.y;

    if (this.midboss && this.midboss.dead && this.lockY && blockWithStory('rhinoDefeat',3,null,{start:18,end:21})) return;
    const rhinoReady = !this.midboss && !this.midbossDefeated && py < this.midbossY+140 && py > this.midbossY-260 && this.ambushDone.a1;
    if (rhinoReady && blockWithStory('rhinoIntro',3,null,{start:0,end:18})) return;

    const gateAReady = this.gateA && this.gateA.state === 'LOCKED' && this.midbossDefeated && !this.device && py < this.gateAY+420 && py > this.gateAY-320;
    if (gateAReady && blockWithStory('firstGate',4)) return;

    if (this.finalboss && this.finalboss.dead && this.lockY) {
      if(blockWithStory('snakeDefeat',12,()=>{
        this.finalbossDefeated=true;this.finalboss=null;G.boss=null;
        this.setFinalRouteState('SNAKE_DEFEATED');this.dropFinalDevice();
        showToast('마지막 태엽장치가 떨어졌습니다.',2200);
      }))return;
    }
    const snakeReady = !this.finalboss && !this.finalbossDefeated && this.finalRouteState==='RUSH_3_COMPLETE' && py < this.gateCY+420;
    if (snakeReady) {
      this.setFinalRouteState('FINAL_GATE_APPROACH');
      blockWithStory('snakeIntro',11,()=>{
        this.setFinalRouteState('SNAKE_INTRO_DIALOGUE');
        this.beginFinalBossBattle();
      });
      return;
    }

    if (this.portal && this.finalRouteState==='EXIT_PORTAL' && Math.hypot(G.p.x-this.portal.x,G.p.y-this.portal.y) < 70) {
      if (blockWithStory('portal',15,() => { this.setFinalRouteState('CLEARED');this.portal=null;endGame(true,'escape'); })) return;
    }
    original.update(dt);
  };

  if (typeof TOY_TEST_MODE !== 'undefined' && TOY_TEST_MODE) {
    ready.then(() => {
      window.__TOY_ESCAPE_STORY_AUDIT__ = () => ({
        sections:[...scenes.entries()].map(([section,lines]) => ({section,lines:lines.length,expressions:[...new Set(lines.map(x=>x.expression))]})),
        totalLines:[...scenes.values()].reduce((n,lines)=>n+lines.length,0),
        characterLines:[...scenes.values()].flat().filter(line=>!line.system).length,
        systemLines:[...scenes.values()].flat().filter(line=>line.system).length,
        mappedNames:Object.entries(NAME_TO_CHAR),
        portraitAssets:[...scenes.values()].flat().filter(line=>line.char).map(expressionPath).filter((x,i,a)=>a.indexOf(x)===i),
        dialogueLines:[...scenes.entries()].flatMap(([section,lines]) => lines.map((line,index) => ({
          section,index:index+1,dialogueIndex:line.dialogueIndex+1,name:line.name||'(연출)',char:line.char||'',expression:line.expression,
          portrait:line.char?expressionPath(line):'',system:line.system,text:line.text
        })))
      });
    });
  }
})();
