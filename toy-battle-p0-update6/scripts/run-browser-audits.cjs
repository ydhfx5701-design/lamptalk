const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const context = await browser.newContext({ viewport: { width: 404, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const httpErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));
  page.on('requestfailed', request => requestFailures.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' }));
  page.on('response', response => { if (response.status() >= 400) httpErrors.push({ url: response.url(), status: response.status() }); });
  await page.goto(`http://127.0.0.1:8102/index.html?test=1&character=1&audit=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => !!window.__TOY_TEST__, null, { timeout: 30000 });
  /* 테스트 API는 스크립트 평가 직후 생기지만 탈출 충돌 격자는 이미지 디코딩 뒤에 만들어진다. */
  await page.waitForFunction(() => document.querySelector('#loading')?.classList.contains('hide'), null, { timeout: 30000 });

  const jobs = {
    timing: 'timingAudit',
    modeRuntime: 'modeRuntimeAudit',
    runtimeState: 'runtimeStateAudit',
    statOwnership: 'statOwnershipAudit',
    lifecycle: 'lifecycleAudit',
    encounterGather: 'escapeEncounterGatherAudit',
    ambush: 'escapeAmbushAudit',
    ambushZones: 'escapeAmbushZonesAudit',
    encounterOrder: 'escapeEncounterOrderAudit',
    bossOrder: 'escapeBossOrderAudit',
    burstTarget: 'burstTargetAudit',
    jungleP0Regression: 'escapeFinalRouteRegressionAudit',
    escapeMultiplier: 'escapeMultiplierAudit',
    escapeAi: 'escapeAiAudit',
    intro: 'escapeIntroAudit',
    story: 'characterStoryAudit',
    viewport: 'viewportAudit',
    loop: 'loopAudit',
    factoryDialogue: 'factoryDialogueAudit',
    factoryStoryFlow: 'factoryStoryFlowAudit',
    factoryEncounter: 'factoryEncounterAudit',
    factoryWaveBoundary: 'factoryWaveBoundaryAudit',
    factoryGates: 'factoryGateAudit',
    factoryMapJoin: 'factoryMapJoinAudit',
    factoryFinalBoss: 'factoryFinalBossAudit',
    factoryDifficulty: 'factoryDifficultyAudit',
    factoryBulldozer: 'factoryBulldozerFlowAudit',
    factoryRoute: 'factoryRouteAudit',
    factoryDeviceOrder: 'factoryDeviceOrderAudit',
    factoryP0Regression: 'factoryP0RouteRegressionAudit'
  };
  const requested = new Set((process.env.TOY_AUDITS || '').split(',').map(v => v.trim()).filter(Boolean));
  const selectedJobs = requested.size ? Object.entries(jobs).filter(([name]) => requested.has(name)) : Object.entries(jobs);
  const results = {};
  for (const [name, method] of selectedJobs) {
    results[name] = await page.evaluate(({ method }) => {
      if (method === 'lifecycleAudit') return window.__TOY_TEST__[method](30);
      if (method === 'escapeIntroAudit') return window.__TOY_TEST__[method](30);
      if (method === 'escapeFinalRouteRegressionAudit') return window.__TOY_TEST__[method](20);
      if (method === 'factoryP0RouteRegressionAudit') return window.__TOY_TEST__[method](20);
      return window.__TOY_TEST__[method]();
    }, { method });
  }
  await page.waitForTimeout(250);
  const output = { url: page.url(), consoleErrors, pageErrors, requestFailures, httpErrors, results };
  fs.writeFileSync('scripts/browser-audit-results.json', JSON.stringify(output, null, 2), 'utf8');
  const summary = Object.fromEntries(Object.entries(results).map(([name, value]) => [name, {
    pass: value && Object.prototype.hasOwnProperty.call(value, 'pass') ? value.pass : undefined,
    clean: value?.clean,
    stable: value?.stable,
    duplicateCallbacks: value?.duplicateCallbacks,
    duplicateEntityUpdates: value?.duplicateEntityUpdates,
    allMovementStable: value?.allMovementStable,
    allAttackStable: value?.allAttackStable,
    ratioPass: value?.ratioPass,
    modeStable: value?.modeStable,
    runtimeIndependent: value?.runtimeIndependent,
    hits: value?.hits,
    rows: Array.isArray(value?.rows) ? value.rows.length : undefined
  }]));
  console.log(JSON.stringify({ consoleErrors, pageErrors, requestFailures, httpErrors, summary }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
