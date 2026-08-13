/*
 * TOY BATTLE unified item system.
 * Shop, inventory and weapon/equipment management read from this one catalog.
 */
(()=>{
  const GRADE_COLORS={C:'#8B919A',B:'#4FAE58',A:'#9656DF','A+':'#E43D59',S:'#FF8A24',SS:'#B91C3C',SSS:'#FFD447'};
  const GRADE_ORDER={C:1,B:2,A:3,'A+':4,S:5,SS:6,SSS:7};
  const ITEM_IMG='assets/items2/';
  const SHOP_IMG='assets/shop3/';
  const WPN_IMG='assets/weapons/';
  const item=(name,category,grade,image,desc,extra={})=>Object.assign({name,category,grade,image,desc,displayScale:.84},extra);
  const TB_ITEM_CATALOG={
    gold_box:item('골드 상자','box','B',SHOP_IMG+'gold_box.png','열면 무작위 골드를 획득할 수 있는 상자.',{price:50,currency:'gem',usable:true}),
    char_shard:item('캐릭터 조각','material','A',SHOP_IMG+'char_shard.png','캐릭터 해금 및 성장에 사용하는 조각.',{price:150,currency:'silver'}),
    revive_ticket:item('부활권','consumable','A+',SHOP_IMG+'revive_ticket.png','전투 중 사망 시 1회 그 자리에서 부활하는 티켓.',{price:80,currency:'coupon'}),
    char_box:item('캐릭터 상자','box','A+',SHOP_IMG+'char_box.png','열면 무작위 캐릭터 조각을 획득할 수 있는 상자.',{price:500,currency:'gem',usable:true}),
    weapon_part:item('무기 강화 부품','material','C',ITEM_IMG+'weapon_part.png','무기 조립·강화에 사용하는 튼튼한 부품.',{price:120,currency:'gold'}),
    awaken_core:item('각성 코어','growth','A+',SHOP_IMG+'awaken_core.png','강화한 무기의 잠재력을 깨우는 고급 코어.',{price:300,currency:'gem'}),
    pet_shard:item('펫 조각','pet','A',SHOP_IMG+'pet_shard.png','펫 해금과 성장에 사용하는 조각.',{price:180,currency:'silver'}),
    toy_part:item('장난감 부품','material','B',SHOP_IMG+'toy_part.png','장비 조립과 영구 성장에 사용하는 공용 부품.',{price:100,currency:'gold'}),
    part_box:item('부품 상자','box','B',SHOP_IMG+'part_box.png','열면 무기·장난감 부품을 획득하는 상자.',{price:200,currency:'gold',usable:true}),

    toy_helmet:item('장난감 헬멧','equipment','B',ITEM_IMG+'toy_helmet.png','받는 피해를 줄여 주는 견고한 장난감 헬멧.',{price:8000,currency:'gold'}),
    windup_armor:item('태엽 갑옷','equipment','A+',ITEM_IMG+'windup_armor.png','체력과 방어력을 함께 올려 주는 희귀 태엽 갑옷.',{price:180,currency:'gem'}),
    toy_gloves:item('장난감 장갑','equipment','B',ITEM_IMG+'toy_gloves.png','무기를 안정적으로 다뤄 공격력을 높이는 장갑.',{price:10000,currency:'gold'}),
    spring_shoes:item('스프링 신발','equipment','A',ITEM_IMG+'spring_shoes.png','스프링 반동으로 이동 속도를 높이는 신발.',{price:15000,currency:'gold'}),
    lucky_badge:item('행운 배지','accessory','A',ITEM_IMG+'lucky_badge.png','치명타 확률과 희귀 보상 확률을 높이는 배지.',{price:180,currency:'silver'}),
    windup_necklace:item('태엽 목걸이','accessory','A',ITEM_IMG+'windup_necklace.png','무기 게이지 충전 속도를 높이는 목걸이.',{price:200,currency:'silver'}),

    precision_gear:item('정밀 기어','material','A',ITEM_IMG+'precision_gear.png','정밀 조립과 고급 강화에 사용하는 기어.',{price:80,currency:'silver'}),
    orbit_core:item('궤도 코어','material','A',ITEM_IMG+'orbit_core.png','ORBIT · 궤도형 무기 조립에 필요한 특수 코어.',{price:120,currency:'silver',tag:'ORBIT'}),
    flight_core:item('비행 코어','material','A',ITEM_IMG+'flight_core.png','FLIGHT · 비행형 장비 조립에 필요한 특수 코어.',{price:120,currency:'silver',tag:'FLIGHT'}),
    explosion_core:item('폭발 코어','material','A',ITEM_IMG+'explosion_core.png','EXPLOSION · 폭발형 무기 조립에 필요한 특수 코어.',{price:120,currency:'silver',tag:'EXPLOSION'}),
    fire_core:item('화염 코어','material','A',ITEM_IMG+'fire_core.png','FIRE · 화염형 무기 조립에 필요한 특수 코어.',{price:120,currency:'silver',tag:'FIRE'}),
    power_core:item('동력 코어','material','A',ITEM_IMG+'power_core.png','POWER · 고출력 장비 조립에 필요한 특수 코어.',{price:150,currency:'silver',tag:'POWER'}),
    enhancement_stone:item('강화석','growth','C',ITEM_IMG+'enhancement_stone.png','무기와 장비의 레벨을 높일 때 사용하는 강화석.',{price:2000,currency:'gold'}),
    awakening_fragment:item('각성 조각','growth','A+',ITEM_IMG+'awakening_fragment.png','레벨이 오른 장비를 각성시키는 희귀 조각.',{price:100,currency:'gem'}),
    promotion_screw:item('승급 나사','growth','A+',ITEM_IMG+'promotion_screw.png','별 등급 승급에 사용하는 정교한 황금 나사.',{price:250,currency:'silver'}),
    repair_kit:item('수리 키트','consumable','B',ITEM_IMG+'repair_kit.png','전투 중 사용하면 최대 체력의 35%를 즉시 회복.',{price:3000,currency:'gold',usable:true}),
    lucky_ticket:item('행운 티켓','consumable','A',ITEM_IMG+'lucky_ticket.png','사용하면 보너스 실버를 획득하는 행운 티켓.',{price:100,currency:'silver',usable:true}),
    weapon_box:item('무기 상자','box','A',ITEM_IMG+'weapon_box.png','사용할 때 무기 한 개를 획득하는 상자.',{price:150,currency:'gem',usable:true}),
    equipment_box:item('장비 상자','box','A',ITEM_IMG+'equipment_box.png','사용할 때 장비 한 개를 획득하는 상자.',{price:150,currency:'gem',usable:true}),
    orbit_box:item('궤도 상자','box','A',ITEM_IMG+'orbit_box.png','사용하면 궤도 코어를 획득하는 전용 상자.',{price:250,currency:'silver',usable:true}),
    premium_parts_box:item('고급 부품 상자','box','A+',ITEM_IMG+'premium_parts_box.png','정밀 기어와 고급 성장 재료가 들어 있는 상자.',{price:200,currency:'gem',usable:true})
  };
  const TB_WEAPON_CATALOG={
    nerf:item('연사 너프건','weapon','C',WPN_IMG+'nerf.webp','6발을 빠르게 연속 발사하는 기본 장난감 총.',{displayScale:.86}),
    water:item('고압 물총','weapon','B',WPN_IMG+'water.webp','물방울을 연속 발사하고 적을 느리게 만드는 총.',{displayScale:.88}),
    bubble:item('비눗방울 총','weapon','B',WPN_IMG+'bubble.webp','방울이 퍼져 나간 뒤 작은 범위로 폭발하는 총.',{displayScale:.86}),
    spring:item('스프링 펀치','weapon','A',WPN_IMG+'spring.webp','강한 주먹을 발사해 적을 크게 밀어내는 무기.',{displayScale:.88}),
    spear:item('팝업 창','weapon','A',WPN_IMG+'spear.webp','긴 직선 범위의 적을 관통하는 장난감 창.',{displayScale:.92}),
    sword:item('장난감 칼','weapon','A',WPN_IMG+'sword.webp','전방의 여러 적을 부채꼴로 베는 장난감 칼.',{displayScale:.86}),
    hammer:item('수호 해머','weapon','A+',WPN_IMG+'hammer.webp','넓은 범위를 내려찍고 일반 적을 기절시키는 해머.',{displayScale:.88}),
    revolver:item('장난감 리볼버','weapon','A+','assets/v2weapons/revolver.png','강한 단발 화력을 가진 장난감 리볼버. 정확하고 묵직한 한 발로 적을 빠르게 정리한다.',{displayScale:.86,price:1800,currency:'gem'}),
    shotgun:item('장난감 샷건','weapon','A','assets/v2weapons/shotgun.png','넓게 퍼지는 산탄으로 전방의 적을 시원하게 쓸어버리는 장난감 샷건. 근거리일수록 더욱 강력하다.',{displayScale:.86,price:1600,currency:'gem'}),
    red_moon:item('레드 문','weapon','A+','assets/v2weapons/red_moon.png','붉은 검기를 뿜어내는 강력한 상위 검. 장난감 칼보다 긴 사거리와 높은 공격력을 가지며 정확한 타이밍에는 적의 공격을 패링할 수 있다.',{displayScale:.84,price:2000,currency:'gem'})
  };
  const TB_ALL=Object.assign({},TB_ITEM_CATALOG,TB_WEAPON_CATALOG);
  window.TB_ITEM_CATALOG=TB_ITEM_CATALOG;
  window.TB_WEAPON_CATALOG=TB_WEAPON_CATALOG;
  window.TB_ITEM_GRADE_COLORS=GRADE_COLORS;

  const SHOP_CATEGORY_LIST=[
    {id:'recommend',name:'추천',items:['toy_helmet','windup_armor','lucky_badge','repair_kit','weapon_box','equipment_box','premium_parts_box','char_box']},
    {id:'package',name:'패키지',items:[]},
    {id:'currency',name:'재화',items:['gold_box']},
    {id:'equipment',name:'장비',items:['toy_helmet','windup_armor','toy_gloves','spring_shoes','lucky_badge','windup_necklace']},
    {id:'weapon',name:'무기',items:['revolver','shotgun','red_moon']},
    {id:'material',name:'재료',items:['char_shard','weapon_part','pet_shard','toy_part','precision_gear','orbit_core','flight_core','explosion_core','fire_core','power_core','enhancement_stone','awakening_fragment','promotion_screw','awaken_core']},
    {id:'box',name:'상자',items:['gold_box','part_box','char_box','weapon_box','equipment_box','orbit_box','premium_parts_box']},
    {id:'normal',name:'일반',items:['revive_ticket','repair_kit','lucky_ticket']}
  ];
  const INV_CATEGORY_LIST=[
    {id:'all',name:'전체'},{id:'weapon',name:'무기'},{id:'equipment',name:'장비'},
    {id:'accessory',name:'악세서리'},{id:'pet',name:'펫'},{id:'material',name:'재료'},
    {id:'growth',name:'성장'},{id:'consumable',name:'소모품'},{id:'box',name:'상자'}
  ];
  const MANAGE_TABS=[
    {id:'weapon',name:'무기'},{id:'equipment',name:'장비'},{id:'craft',name:'조립'},
    {id:'enhance',name:'강화'},{id:'awaken',name:'각성'},{id:'dismantle',name:'분해'}
  ];
  const CURRENCY_LABEL={gold:'코인',silver:'실버',gem:'보석',coupon:'쿠폰'};
  const CURRENCY_ICON2={gold:'🪙',silver:'🪙',gem:'💎',coupon:'🎟️'};

  function defaultManagedState(){return {level:1,star:1,awakened:false,equippedBy:null};}
  const oldDefaultSave=defaultSaveData;
  defaultSaveData=function(){
    const d=oldDefaultSave();
    d.version=2;d.equipment={};d.purchaseRecords={};
    return d;
  };
  function migrateItemSave(){
    saveData.version=2;
    saveData.inventory=saveData.inventory||{};
    saveData.weapons=saveData.weapons||{};
    saveData.equipment=saveData.equipment||{};
    saveData.purchaseRecords=saveData.purchaseRecords||{};
    saveData.settings=saveData.settings||{};
    /* 메카해머는 더 이상 사용하지 않는 무기다 — 예전 빌드에서 이미 지급/구매되어 저장된 기존 세이브도
       정리해서 인벤토리/장착창에 다시 나타나지 않게 한다 */
    if(saveData.weapons.mechammer)delete saveData.weapons.mechammer;
    Object.keys(TB_ITEM_CATALOG).forEach(id=>{if(!Number.isFinite(+saveData.inventory[id]))saveData.inventory[id]=0;else saveData.inventory[id]=Math.max(0,Math.floor(+saveData.inventory[id]));});
    Object.keys(TB_WEAPON_CATALOG).forEach(id=>{
      if(!saveData.weapons[id])saveData.weapons[id]=defaultManagedState();
      else saveData.weapons[id]=Object.assign(defaultManagedState(),saveData.weapons[id]);
    });
    Object.keys(saveData.equipment).forEach(id=>{saveData.equipment[id]=Object.assign(defaultManagedState(),saveData.equipment[id]||{});});
  }
  function persistNow(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(saveData));}catch(_){};renderTopBar();}
  saveGame=function(){clearTimeout(saveDebounceT);persistNow();};
  resetSaveData=function(){saveData=defaultSaveData();migrateItemSave();persistNow();renderInventoryIfOpen();};
  window.resetSaveData=resetSaveData;
  migrateItemSave();persistNow();

  function gradeStyle(grade){return `--grade-color:${GRADE_COLORS[grade]||GRADE_COLORS.C}`;}
  function gradeBadge(def){return `<span class="tb-grade-badge" data-grade="${def.grade}" style="${gradeStyle(def.grade)}">${def.grade}</span>`;}
  function ownedQty(id){return TB_WEAPON_CATALOG[id]?1:Math.max(0,saveData.inventory[id]||0);}
  function managedState(id){
    if(TB_WEAPON_CATALOG[id])return saveData.weapons[id]||(saveData.weapons[id]=defaultManagedState());
    if(TB_ITEM_CATALOG[id]&&['equipment','accessory'].includes(TB_ITEM_CATALOG[id].category))return saveData.equipment[id]||(saveData.equipment[id]=defaultManagedState());
    return null;
  }
  function slotHtml(id,opts={}){
    const def=TB_ALL[id];if(!def)return '';
    const qty=ownedQty(id),st=managedState(id),showQty=!TB_WEAPON_CATALOG[id]&&!['equipment','accessory'].includes(def.category);
    return `<button class="${opts.className||'inv-slot'}" data-item-id="${id}" aria-label="${def.name}">
      <div class="tb-slot-art" style="--item-scale:${Math.round((def.displayScale||.84)*100)}%">
        <img src="${def.image}" alt="${def.name}">${gradeBadge(def)}
        ${showQty?`<span class="tb-slot-qty">×${qty}</span>`:''}
        ${st?`<span class="tb-slot-level">Lv.${st.level}</span><span class="tb-slot-stars">${'★'.repeat(Math.min(7,st.star||1))}</span>`:''}
      </div><span class="tb-slot-name">${def.name}</span></button>`;
  }
  function sortIds(ids){return [...ids].sort((a,b)=>(GRADE_ORDER[TB_ALL[b].grade]-GRADE_ORDER[TB_ALL[a].grade])||TB_ALL[a].name.localeCompare(TB_ALL[b].name,'ko'));}
  function weaponIds(){return Object.keys(TB_WEAPON_CATALOG).filter(id=>!!saveData.weapons[id]);}
  function inventoryIds(category='all'){
    const itemIds=Object.keys(TB_ITEM_CATALOG).filter(id=>ownedQty(id)>0&&(category==='all'||TB_ITEM_CATALOG[id].category===category));
    const weapons=(category==='all'||category==='weapon')?weaponIds():[];
    return sortIds(weapons.concat(itemIds));
  }
  function bindItemSlots(root,handler=openInventoryDetail){root.querySelectorAll('[data-item-id]').forEach(el=>{el.onclick=()=>{AudioMgr.sfx('click');handler(el.dataset.itemId);};});}
  function ensureEquipmentState(id){if(!saveData.equipment[id])saveData.equipment[id]=defaultManagedState();return saveData.equipment[id];}
  function centerTabInScroller(el,wrap){if(!el||!wrap)return;wrap.scrollLeft=Math.max(0,el.offsetLeft-(wrap.clientWidth-el.offsetWidth)/2);}

  /* ---------------- Shop ---------------- */
  renderShopCats=function(){
    const wrap=$('#shopCats');wrap.innerHTML='';
    SHOP_CATEGORY_LIST.forEach((cat,i)=>{const b=document.createElement('button');b.className='shop-cat'+(i===shopCatIdx?' active':'');b.textContent=cat.name;b.onclick=()=>{AudioMgr.sfx('click');shopCatIdx=i;shopPage=0;renderShopCats();renderShopGrid();};wrap.appendChild(b);});
    centerTabInScroller(wrap.querySelector('.active'),wrap);
  };
  renderShopGrid=function(){
    const cat=SHOP_CATEGORY_LIST[shopCatIdx]||SHOP_CATEGORY_LIST[0],totalPages=Math.max(1,Math.ceil(cat.items.length/9));
    shopPage=clamp(shopPage,0,totalPages-1);const grid=$('#shopGrid');grid.innerHTML='';
    const ids=cat.items.slice(shopPage*9,shopPage*9+9);
    if(!ids.length)grid.innerHTML='<div class="shop-slot-empty">준비 중인 상품이에요</div>';
    ids.forEach(id=>{const def=TB_ALL[id];if(!def)return;const slot=document.createElement('button');slot.className='shop-slot';slot.style.setProperty('--item-scale',`${Math.round((def.displayScale||.84)*100)}%`);slot.innerHTML=`<div class="shop-slot-float"><div class="shop-slot-frame"><img src="${def.image}" alt="${def.name}">${gradeBadge(def)}</div></div><div class="shop-slot-name">${def.name}</div><div class="shop-slot-price">${CURRENCY_ICON2[def.currency]} ${def.price.toLocaleString('ko-KR')}</div>`;slot.onclick=()=>{AudioMgr.sfx('click');openShopDetail(id);};grid.appendChild(slot);});
    $('#shopPageLabel').textContent=`${shopPage+1} / ${totalPages}`;$('#shopPrevPage').disabled=shopPage<=0;$('#shopNextPage').disabled=shopPage>=totalPages-1;
  };
  shopMaxQty=function(def){if(!def||def.category==='weapon')return 0;const limit=Number.isFinite(def.maxPurchase)?Math.max(1,Math.floor(def.maxPurchase)):999;return Math.max(0,Math.min(limit,Math.floor((saveData.currencies[def.currency]||0)/Math.max(1,def.price))));};
  normalizeShopQty=function(raw){const def=TB_ALL[shopDetailId],max=shopMaxQty(def);let n=Math.floor(Number(raw));if(!Number.isFinite(n)||n<1)n=1;shopQty=max>0?clamp(n,1,max):1;return shopQty;};
  refreshShopDetail=function(){
    const def=TB_ALL[shopDetailId];if(!def)return;
    if(def.category==='weapon'){$('#shopQtyInput').value='1';$('#shopQtyInput').disabled=true;$('#shopQtyMinus').disabled=true;$('#shopQtyPlus').disabled=true;$('#shopQtyLimit').textContent='현재 인벤토리에 지급된 무기입니다';$('#sdBuyBtn').textContent='보유 중';$('#sdBuyBtn').disabled=true;$('#sdOwned').textContent=`보유 중 · 상점 기준 보석 ${def.price.toLocaleString('ko-KR')}`;return;}
    const max=shopMaxQty(def),total=def.price*normalizeShopQty(shopQty);
    $('#shopQtyInput').max=String(Math.max(1,max));$('#shopQtyInput').value=String(shopQty);$('#shopQtyInput').disabled=max<1;
    $('#shopQtyMinus').disabled=max<1||shopQty<=1;$('#shopQtyPlus').disabled=max<1||shopQty>=max;
    $('#shopQtyLimit').textContent=max>0?`현재 재화로 최대 ${max}개 구매 가능`:'현재 재화로 구매할 수 없습니다';
    $('#sdBuyBtn').textContent=`구매 · ${CURRENCY_LABEL[def.currency]} ${total.toLocaleString('ko-KR')}`;$('#sdBuyBtn').disabled=max<1;
    $('#sdOwned').textContent=`보유 ${ownedQty(shopDetailId).toLocaleString('ko-KR')}개 · 개당 ${CURRENCY_LABEL[def.currency]} ${def.price.toLocaleString('ko-KR')}`;
  };
  openShopDetail=function(id){
    const def=TB_ALL[id];if(!def)return;shopDetailId=id;shopQty=1;
    $('#sdName').textContent=def.name;$('#sdImg').src=def.image;$('#sdImg').alt=def.name;$('#sdImg').style.setProperty('--item-scale',`${Math.round((def.displayScale||.84)*100)}%`);
    $('#sdDesc').textContent=def.desc;$('#sdGrade').textContent=`${def.grade} 등급`;$('#sdGrade').dataset.grade=def.grade;$('#sdGrade').style.setProperty('--grade-color',GRADE_COLORS[def.grade]);
    refreshShopDetail();$('#shopDetail').classList.add('show');
  };
  closeShopDetail=function(){shopDetailId=null;shopQty=1;$('#shopDetail').classList.remove('show');};
  function buyShopItem(){
    const def=TB_ALL[shopDetailId];if(!def)return;if(def.category==='weapon'){showToast('이미 인벤토리에 지급된 무기입니다',1400);return;}const qty=normalizeShopQty($('#shopQtyInput').value),max=shopMaxQty(def),total=def.price*qty,bal=saveData.currencies[def.currency]||0;
    if(max<1||qty>max||bal<total){refreshShopDetail();showToast('재화가 부족합니다',1400);return;}
    saveData.currencies[def.currency]=bal-total;saveData.inventory[shopDetailId]=(saveData.inventory[shopDetailId]||0)+qty;
    if(['equipment','accessory'].includes(def.category))ensureEquipmentState(shopDetailId);
    saveData.purchaseRecords[shopDetailId]=(saveData.purchaseRecords[shopDetailId]||0)+qty;
    saveGame();AudioMgr.sfx('chest');showToast(`${def.name} × ${qty} 구매 완료!`,1400);closeShopDetail();
  }
  openShop=function(){AudioMgr.unlock();shopCatIdx=0;shopPage=0;renderShopCats();renderShopGrid();$('#shop').classList.add('show');};
  preloadShopImages=function(){preloadImages(Object.values(TB_ALL).map(def=>def.image));};

  /* ---------------- Inventory ---------------- */
  renderInvTabs=function(){
    $('#invTabs').innerHTML=INV_CATEGORY_LIST.map((tab,i)=>`<button class="inv-tab${i===invTabIdx?' active':''}" data-invtab="${i}">${tab.name}</button>`).join('');
    $('#invTabs').querySelectorAll('[data-invtab]').forEach(btn=>btn.onclick=()=>{AudioMgr.sfx('click');invTabIdx=+btn.dataset.invtab;renderInvTabs();renderInvBody();});
    centerTabInScroller($('#invTabs').querySelector('.active'),$('#invTabs'));
  };
  renderInvBody=function(){
    const category=INV_CATEGORY_LIST[invTabIdx]?.id||'all',ids=inventoryIds(category),body=$('#invBody');
    body.innerHTML=ids.length?`<div class="inv-grid">${ids.map(id=>slotHtml(id)).join('')}</div>`:'<div class="tb-empty-state">보유한 아이템이 없습니다</div>';
    bindItemSlots(body);
  };
  openInventory=function(){AudioMgr.unlock();invTabIdx=0;renderInvTabs();renderInvBody();$('#inventoryScreen').classList.add('show');};
  function renderInventoryIfOpen(){if($('#inventoryScreen').classList.contains('show'))renderInvBody();if($('#shop').classList.contains('show'))renderShopGrid();}
  function removeOverlay(id){document.getElementById(id)?.remove();}
  function showItemDetail(id,{parent='#inventoryScreen .inv-panel',manage=false}={}){
    removeOverlay('tbItemDetail');const def=TB_ALL[id],qty=ownedQty(id),st=managedState(id);if(!def)return;
    const canUse=!!def.usable,canManage=manage||!!st;
    const overlay=document.createElement('div');overlay.id='tbItemDetail';overlay.className='tb-item-detail';overlay.innerHTML=`<div class="tb-item-detail-card"><div class="shop-detail-grade" data-grade="${def.grade}" style="${gradeStyle(def.grade)}">${def.grade} 등급</div><img src="${def.image}" alt="${def.name}" style="width:${Math.round((def.displayScale||.84)*180)}px"><h3>${def.name}</h3><p>${def.desc}</p><p>보유 ${qty}개${st?` · Lv.${st.level} · ${'★'.repeat(st.star||1)}${st.equippedBy?` · ${CHARS[st.equippedBy]?.name||'캐릭터'} 장착 중`:''}`:''}</p><div class="tb-detail-actions">${canUse?'<button data-detail-use>사용하기</button>':''}${canManage?'<button data-detail-manage>관리하기</button>':''}<button class="secondary" data-detail-close>닫기</button></div></div>`;
    document.querySelector(parent)?.appendChild(overlay);
    overlay.querySelector('[data-detail-close]').onclick=()=>overlay.remove();
    overlay.querySelector('[data-detail-use]')?.addEventListener('click',()=>{useInventoryItem(id);overlay.remove();renderInvBody();});
    overlay.querySelector('[data-detail-manage]')?.addEventListener('click',()=>{overlay.remove();$('#inventoryScreen').classList.remove('show');openWeaponScreen();tbManageTab=['equipment','accessory'].includes(def.category)?'equipment':'weapon';renderWeaponScreen();});
  }
  function openInventoryDetail(id){showItemDetail(id);}
  function addInventory(id,qty){saveData.inventory[id]=Math.max(0,(saveData.inventory[id]||0)+qty);if(['equipment','accessory'].includes(TB_ITEM_CATALOG[id]?.category)&&saveData.inventory[id]>0)ensureEquipmentState(id);}
  function useInventoryItem(id){
    if((saveData.inventory[id]||0)<1)return;let message='';
    if(id==='gold_box'){addInventory(id,-1);const n=1000+Math.floor(Math.random()*2001);saveData.currencies.gold+=n;message=`코인 ${n.toLocaleString('ko-KR')} 획득!`;}
    else if(id==='char_box'){addInventory(id,-1);const n=5+Math.floor(Math.random()*11);addInventory('char_shard',n);message=`캐릭터 조각 ${n}개 획득!`;}
    else if(id==='part_box'){addInventory(id,-1);const a=5+Math.floor(Math.random()*6),b=3+Math.floor(Math.random()*5);addInventory('weapon_part',a);addInventory('toy_part',b);message=`무기 부품 ${a}개 · 장난감 부품 ${b}개 획득!`;}
    else if(id==='weapon_box'){
      addInventory(id,-1);const ids=Object.keys(TB_WEAPON_CATALOG),wid=ids[Math.floor(Math.random()*ids.length)],st=managedState(wid);st.star=Math.min(7,(st.star||1)+1);message=`${TB_WEAPON_CATALOG[wid].name} 승급 재료 획득!`;
    }else if(id==='equipment_box'){
      addInventory(id,-1);const ids=['toy_helmet','windup_armor','toy_gloves','spring_shoes','lucky_badge','windup_necklace'],eid=ids[Math.floor(Math.random()*ids.length)];addInventory(eid,1);message=`${TB_ITEM_CATALOG[eid].name} 획득!`;
    }else if(id==='orbit_box'){addInventory(id,-1);const n=2+Math.floor(Math.random()*3);addInventory('orbit_core',n);message=`궤도 코어 ${n}개 획득!`;}
    else if(id==='premium_parts_box'){addInventory(id,-1);addInventory('precision_gear',3);addInventory('enhancement_stone',5);addInventory('power_core',1);message='정밀 기어 3개 · 강화석 5개 · 동력 코어 1개 획득!';}
    else if(id==='lucky_ticket'){addInventory(id,-1);const n=40+Math.floor(Math.random()*61);saveData.currencies.silver+=n;message=`행운 보너스 실버 ${n} 획득!`;}
    else if(id==='repair_kit'&&G?.p&&state==='play'){addInventory(id,-1);G.p.hp=Math.min(G.p.maxHp,G.p.hp+G.p.maxHp*.35);message='체력을 35% 수리했습니다!';}
    else{showToast('이 아이템은 전투에서 자동으로 사용됩니다',1500);return;}
    saveGame();AudioMgr.sfx('chest');showToast(message,1800);
  }

  /* ---------------- Weapon / equipment management ---------------- */
  let tbManageTab='weapon',tbActionSelected=null,tbRecipeSelected='toy_helmet';
  const CRAFT_RECIPES={
    toy_helmet:{toy_part:10,precision_gear:2,gold:500},
    windup_armor:{toy_part:12,power_core:1,gold:900},
    toy_gloves:{toy_part:10,weapon_part:4,gold:650},
    spring_shoes:{toy_part:10,precision_gear:3,gold:750},
    lucky_badge:{precision_gear:4,lucky_ticket:1,gold:700},
    windup_necklace:{precision_gear:4,power_core:1,gold:800}
  };
  function manageTabsHtml(){return `<div class="wpn-system-tabs">${MANAGE_TABS.map(t=>`<button class="wpn-system-tab${tbManageTab===t.id?' active':''}" data-manage-tab="${t.id}">${t.name}</button>`).join('')}</div>`;}
  function bindManageTabs(){
    $('#wpnBody').querySelectorAll('[data-manage-tab]').forEach(btn=>btn.onclick=()=>{AudioMgr.sfx('click');tbManageTab=btn.dataset.manageTab;tbActionSelected=null;renderWeaponScreen();});
    const active=$('#wpnBody').querySelector('[data-manage-tab].active');centerTabInScroller(active,active?.parentElement);
  }
  function equipmentIds(){return sortIds(Object.keys(TB_ITEM_CATALOG).filter(id=>['equipment','accessory'].includes(TB_ITEM_CATALOG[id].category)&&ownedQty(id)>0));}
  function renderManageGrid(category){
    const ids=category==='weapon'?weaponIds():equipmentIds();
    $('#wpnBody').innerHTML=manageTabsHtml()+(ids.length?`<div class="wpn-grid">${ids.map(id=>slotHtml(id,{className:'wpn-slot'})).join('')}</div>`:'<div class="tb-empty-state">보유한 대상이 없습니다</div>');
    bindManageTabs();bindItemSlots($('#wpnBody'),id=>showManageDetail(id));
  }
  function showManageDetail(id){
    const def=TB_ALL[id],st=managedState(id);removeOverlay('tbItemDetail');
    const overlay=document.createElement('div');overlay.id='tbItemDetail';overlay.className='tb-item-detail';overlay.innerHTML=`<div class="tb-item-detail-card"><div class="shop-detail-grade" data-grade="${def.grade}" style="${gradeStyle(def.grade)}">${def.grade} 등급</div><img src="${def.image}" alt="${def.name}"><h3>${def.name}</h3><p>${def.desc}</p><p>Lv.${st.level} · ${'★'.repeat(st.star||1)}${st.awakened?' · 각성':''}<br>${st.equippedBy?`${CHARS[st.equippedBy]?.name||'캐릭터'} 장착 중`:'장착 캐릭터 없음'}</p><div class="tb-detail-actions"><button data-equip-change>장착 변경</button><button class="secondary" data-detail-close>닫기</button></div></div>`;
    $('#weaponScreen .wpn-panel').appendChild(overlay);overlay.querySelector('[data-detail-close]').onclick=()=>overlay.remove();overlay.querySelector('[data-equip-change]').onclick=()=>openCharacterPicker(id,overlay);
  }
  function openCharacterPicker(itemId,oldOverlay){
    oldOverlay.remove();const st=managedState(itemId);removeOverlay('tbPicker');const overlay=document.createElement('div');overlay.id='tbPicker';overlay.className='tb-picker';
    overlay.innerHTML=`<div class="tb-picker-card"><div class="tb-picker-head"><span>장착 캐릭터 선택</span><button class="tb-picker-close">✕</button></div><div class="tb-picker-grid">${CHAR_ORDER.map(cid=>`<button class="tb-picker-item" data-char-id="${cid}"><img src="${DATA.portraits?.[cid]||DATA.v2characters?.[cid]?.portrait||''}" alt="${CHARS[cid].name}"><strong>${CHARS[cid].name}</strong><small>${st.equippedBy===cid?'현재 장착 중':'장착하기'}</small></button>`).join('')}</div></div>`;
    $('#weaponScreen .wpn-panel').appendChild(overlay);overlay.querySelector('.tb-picker-close').onclick=()=>overlay.remove();overlay.querySelectorAll('[data-char-id]').forEach(btn=>btn.onclick=()=>{
      const cid=btn.dataset.charId;
      const stores=[saveData.weapons,saveData.equipment];stores.forEach(store=>Object.values(store||{}).forEach(other=>{if(other&&other.equippedBy===cid&&other!==st)other.equippedBy=null;}));
      st.equippedBy=st.equippedBy===cid?null:cid;saveGame();AudioMgr.sfx('chest');showToast(st.equippedBy?`${CHARS[cid].name}에게 장착했습니다`:'장착을 해제했습니다',1300);overlay.remove();renderWeaponScreen();
    });
  }
  function pickerEntries(kind){
    let ids=[];if(kind==='enhance'||kind==='awaken'||kind==='dismantle')ids=weaponIds().concat(equipmentIds());
    return ids.filter(id=>kind!=='dismantle'||!managedState(id).equippedBy);
  }
  function openActionPicker(kind){
    removeOverlay('tbPicker');const ids=pickerEntries(kind),overlay=document.createElement('div');overlay.id='tbPicker';overlay.className='tb-picker';
    overlay.innerHTML=`<div class="tb-picker-card"><div class="tb-picker-head"><span>${kind==='enhance'?'강화':kind==='awaken'?'각성':'분해'} 대상 선택</span><button class="tb-picker-close">✕</button></div>${ids.length?`<div class="tb-picker-grid">${ids.map(id=>{const def=TB_ALL[id],st=managedState(id);return `<button class="tb-picker-item" data-pick-id="${id}"><div class="tb-slot-art"><img src="${def.image}" alt="${def.name}">${gradeBadge(def)}<span class="tb-slot-level">Lv.${st.level}</span><span class="tb-slot-stars">${'★'.repeat(st.star||1)}</span></div><strong>${def.name}</strong><small>${st.equippedBy?'장착 중':'선택 가능'}</small></button>`;}).join('')}</div>`:'<div class="tb-empty-state">선택할 대상이 없습니다</div>'}</div>`;
    $('#weaponScreen .wpn-panel').appendChild(overlay);overlay.querySelector('.tb-picker-close').onclick=()=>overlay.remove();overlay.querySelectorAll('[data-pick-id]').forEach(btn=>btn.onclick=()=>{tbActionSelected=btn.dataset.pickId;overlay.remove();renderWeaponScreen();});
  }
  function actionTargetHtml(kind){
    if(!tbActionSelected)return `<button class="tb-action-target" data-action-pick><span class="tb-action-plus">＋</span></button><div class="tb-action-caption">${kind==='enhance'?'강화':kind==='awaken'?'각성':'분해'}할 대상을 선택하세요</div>`;
    const def=TB_ALL[tbActionSelected],st=managedState(tbActionSelected);return `<button class="tb-action-target" data-action-pick><img src="${def.image}" alt="${def.name}">${gradeBadge(def)}</button><div class="tb-action-caption">${def.name} · Lv.${st.level} · ${'★'.repeat(st.star||1)}<br>대상을 바꾸려면 다시 누르세요</div>`;
  }
  function materialHtml(id,need){const def=TB_ITEM_CATALOG[id],have=saveData.inventory[id]||0;return `<div class="tb-material${have<need?' short':''}"><img src="${def.image}" alt="${def.name}"><div>${def.name}</div><div>${have} / ${need}</div></div>`;}
  function renderCraft(){
    const recipeIds=Object.keys(CRAFT_RECIPES),def=TB_ITEM_CATALOG[tbRecipeSelected],req=CRAFT_RECIPES[tbRecipeSelected],can=Object.entries(req).every(([id,n])=>id==='gold'?(saveData.currencies.gold||0)>=n:(saveData.inventory[id]||0)>=n);
    $('#wpnBody').innerHTML=manageTabsHtml()+`<div class="tb-action-view"><div class="tb-action-target"><img src="${def.image}" alt="${def.name}">${gradeBadge(def)}</div><div class="tb-action-caption">완성 결과 · ${def.name}</div><div class="tb-recipe-list">${recipeIds.map(id=>{const d=TB_ITEM_CATALOG[id];return `<button class="tb-recipe${id===tbRecipeSelected?' selected':''}" data-recipe-id="${id}"><img src="${d.image}" alt="${d.name}"><span><strong>${d.name}</strong><small>${d.grade} 등급 장비 조립</small></span><b>선택</b></button>`;}).join('')}</div><div class="inv-section-label">필요 재료</div><div class="tb-material-row">${Object.entries(req).filter(([id])=>id!=='gold').map(([id,n])=>materialHtml(id,n)).join('')}</div><div class="tb-action-caption">필요 코인 ${(req.gold||0).toLocaleString('ko-KR')} · 보유 ${(saveData.currencies.gold||0).toLocaleString('ko-KR')}</div><button class="tp-primary tb-action-button" id="tbCraftBtn" ${can?'':'disabled'}>조립하기</button></div>`;
    bindManageTabs();$('#wpnBody').querySelectorAll('[data-recipe-id]').forEach(btn=>btn.onclick=()=>{tbRecipeSelected=btn.dataset.recipeId;AudioMgr.sfx('click');renderWeaponScreen();});
    $('#tbCraftBtn').onclick=()=>{if(!can)return;Object.entries(req).forEach(([id,n])=>{if(id==='gold')saveData.currencies.gold-=n;else addInventory(id,-n);});addInventory(tbRecipeSelected,1);saveGame();AudioMgr.sfx('chest');showToast(`${def.name} 조립 완료!`,1600);renderWeaponScreen();};
  }
  function renderEnhance(){
    const st=tbActionSelected?managedState(tbActionSelected):null,need=st?Math.max(1,st.level):0,gold=st?st.level*200:0,can=!!st&&(saveData.inventory.enhancement_stone||0)>=need&&(saveData.currencies.gold||0)>=gold&&st.level<30;
    $('#wpnBody').innerHTML=manageTabsHtml()+`<div class="tb-action-view">${actionTargetHtml('enhance')}${st?`<div class="inv-section-label">Lv.${st.level} → Lv.${Math.min(30,st.level+1)}</div><div class="tb-material-row">${materialHtml('enhancement_stone',need)}</div><div class="tb-action-caption">필요 코인 ${gold.toLocaleString('ko-KR')}</div>`:''}<button class="tp-primary tb-action-button" id="tbEnhanceBtn" ${can?'':'disabled'}>${st&&st.level>=30?'최대 레벨':'강화하기'}</button></div>`;
    bindManageTabs();$('#wpnBody').querySelector('[data-action-pick]').onclick=()=>openActionPicker('enhance');$('#tbEnhanceBtn').onclick=()=>{if(!can)return;addInventory('enhancement_stone',-need);saveData.currencies.gold-=gold;st.level++;saveGame();AudioMgr.sfx('chest');showToast(`강화 성공! Lv.${st.level}`,1500);renderWeaponScreen();};
  }
  function renderAwaken(){
    const st=tbActionSelected?managedState(tbActionSelected):null,frag=5,screw=1,gold=1000,eligible=!!st&&st.level>=10&&!st.awakened,can=eligible&&(saveData.inventory.awakening_fragment||0)>=frag&&(saveData.inventory.promotion_screw||0)>=screw&&(saveData.currencies.gold||0)>=gold;
    $('#wpnBody').innerHTML=manageTabsHtml()+`<div class="tb-action-view">${actionTargetHtml('awaken')}${st?`<div class="inv-section-label">각성 조건 · Lv.10 이상</div><div class="tb-action-caption">${st.awakened?'이미 각성한 대상입니다':st.level<10?`현재 Lv.${st.level} · 레벨이 부족합니다`:'각성하면 별 등급과 고유 능력이 상승합니다'}</div><div class="tb-material-row">${materialHtml('awakening_fragment',frag)}${materialHtml('promotion_screw',screw)}</div><div class="tb-action-caption">필요 코인 ${gold.toLocaleString('ko-KR')}</div>`:''}<button class="tp-primary tb-action-button" id="tbAwakenBtn" ${can?'':'disabled'}>각성하기</button></div>`;
    bindManageTabs();$('#wpnBody').querySelector('[data-action-pick]').onclick=()=>openActionPicker('awaken');$('#tbAwakenBtn').onclick=()=>{if(!can)return;addInventory('awakening_fragment',-frag);addInventory('promotion_screw',-screw);saveData.currencies.gold-=gold;st.awakened=true;st.star=Math.min(7,(st.star||1)+1);saveGame();AudioMgr.sfx('chest');showToast('각성 완료!',1600);renderWeaponScreen();};
  }
  function confirmDismantle(id,onConfirm){
    removeOverlay('tbDismantleConfirm');const def=TB_ALL[id],overlay=document.createElement('div');overlay.id='tbDismantleConfirm';overlay.className='wpn-confirm-overlay';overlay.innerHTML=`<div class="wpn-confirm-box"><p>${def.name}을(를) 정말 분해하시겠습니까?<br>분해 후 되돌릴 수 없습니다.</p><div class="wpn-confirm-btns"><button class="wpn-confirm-no">취소</button><button class="wpn-confirm-yes">분해</button></div></div>`;$('#weaponScreen .wpn-panel').appendChild(overlay);overlay.querySelector('.wpn-confirm-no').onclick=()=>overlay.remove();overlay.querySelector('.wpn-confirm-yes').onclick=()=>{overlay.remove();onConfirm();};
  }
  function renderDismantle(){
    const st=tbActionSelected?managedState(tbActionSelected):null,def=tbActionSelected?TB_ALL[tbActionSelected]:null,yieldId=def?.category==='weapon'?'weapon_part':'toy_part',yieldQty=st?5+st.level*2:0,can=!!st&&!st.equippedBy;
    $('#wpnBody').innerHTML=manageTabsHtml()+`<div class="tb-action-view">${actionTargetHtml('dismantle')}${st?`<div class="wpn-arrow-big">↓</div><div class="inv-section-label">분해 결과</div><div class="tb-material-row">${materialHtml(yieldId,yieldQty).replace(`${saveData.inventory[yieldId]||0} / ${yieldQty}`,`×${yieldQty}`)}</div>${st.equippedBy?'<div class="tb-action-caption">장착 중인 대상은 분해할 수 없습니다</div>':''}`:''}<button class="wpn-actionbtn danger tb-action-button" id="tbDismantleBtn" ${can?'':'disabled'}>분해하기</button></div>`;
    bindManageTabs();$('#wpnBody').querySelector('[data-action-pick]').onclick=()=>openActionPicker('dismantle');$('#tbDismantleBtn').onclick=()=>{if(!can)return;confirmDismantle(tbActionSelected,()=>{addInventory(yieldId,yieldQty);if(TB_WEAPON_CATALOG[tbActionSelected])delete saveData.weapons[tbActionSelected];else{addInventory(tbActionSelected,-1);delete saveData.equipment[tbActionSelected];}saveGame();AudioMgr.sfx('chest');showToast(`${def.name} 분해 완료`,1400);tbActionSelected=null;renderWeaponScreen();});};
  }
  renderWeaponScreen=function(){
    $('#wpnBackBtn').style.display='none';$('#wpnTitle').textContent='무기 · 장비';
    if(tbManageTab==='weapon'||tbManageTab==='equipment')renderManageGrid(tbManageTab);
    else if(tbManageTab==='craft')renderCraft();else if(tbManageTab==='enhance')renderEnhance();else if(tbManageTab==='awaken')renderAwaken();else renderDismantle();
  };
  openWeaponScreen=function(){AudioMgr.unlock();tbManageTab='weapon';tbActionSelected=null;renderWeaponScreen();$('#weaponScreen').classList.add('show');};

  /* Rebind handlers that stored references to the legacy implementations. */
  $('#shopBtn').onclick=openShop;$('#shopCloseBtn').onclick=()=>$('#shop').classList.remove('show');$('#shopDetailClose').onclick=closeShopDetail;
  $('#shopPrevPage').onclick=()=>{if(shopPage>0){shopPage--;renderShopGrid();}};
  $('#shopNextPage').onclick=()=>{const cat=SHOP_CATEGORY_LIST[shopCatIdx]||SHOP_CATEGORY_LIST[0],pages=Math.max(1,Math.ceil(cat.items.length/9));if(shopPage<pages-1){shopPage++;renderShopGrid();}};
  $('#shopQtyMinus').onclick=()=>{shopQty=normalizeShopQty(shopQty-1);refreshShopDetail();AudioMgr.sfx('click');};
  $('#shopQtyPlus').onclick=()=>{shopQty=normalizeShopQty(shopQty+1);refreshShopDetail();AudioMgr.sfx('click');};
  $('#shopQtyInput').oninput=e=>{shopQty=normalizeShopQty(e.target.value);refreshShopDetail();};$('#shopQtyInput').onblur=refreshShopDetail;$('#sdBuyBtn').onclick=buyShopItem;
  $('#hmInvBtn').onclick=()=>{AudioMgr.sfx('click');openInventory();};$('#csInvBtn').onclick=()=>{AudioMgr.sfx('click');openInventory();};
  $('#invCloseBtn').onclick=()=>{AudioMgr.sfx('click');removeOverlay('tbItemDetail');$('#inventoryScreen').classList.remove('show');};
  $('#hmWpnBtn').onclick=()=>{AudioMgr.sfx('click');openWeaponScreen();};$('#csWpnBtn').onclick=()=>{AudioMgr.sfx('click');openWeaponScreen();};
  $('#wpnCloseBtn').onclick=()=>{AudioMgr.sfx('click');removeOverlay('tbPicker');removeOverlay('tbItemDetail');$('#weaponScreen').classList.remove('show');};
  $('#wpnBackBtn').onclick=()=>{};

  window.__toyItemTest={
    catalogCount:()=>Object.keys(TB_ITEM_CATALOG).length,
    itemIds:()=>Object.keys(TB_ITEM_CATALOG),
    tabs:()=>({inventory:INV_CATEGORY_LIST.map(t=>t.name),manage:MANAGE_TABS.map(t=>t.name),shop:SHOP_CATEGORY_LIST.map(t=>t.name)}),
    audit:()=>({version:saveData.version,catalog:Object.keys(TB_ITEM_CATALOG).length,weapons:Object.keys(TB_WEAPON_CATALOG).length,missingImages:Object.entries(TB_ALL).filter(([,d])=>!d.image).map(([id])=>id),badGrades:Object.entries(TB_ALL).filter(([,d])=>!GRADE_COLORS[d.grade]).map(([id])=>id),inventoryTabs:INV_CATEGORY_LIST.length,manageTabs:MANAGE_TABS.length,shopTabs:SHOP_CATEGORY_LIST.length})
  };
})();
