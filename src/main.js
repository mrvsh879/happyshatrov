import { ASSETS, loadImage } from "./assets.js";
import { AIM, AUTO_RESPAWN_MS, DEBRIS, DMG, FLIGHT, GROUND_VIS, LEVEL, SLING, SPR, SUPER_VISUAL, ZOOM } from "./config.js";
import { $, toast } from "./dom.js";
import { clamp, lerp } from "./utils.js";
import { createCamera } from "./camera.js";
import { createSlingshot } from "./slingshot.js";
import { createSuperMode } from "./superMode.js";
import { createDamage } from "./damage.js";
import { createGround } from "./ground.js";
import { createCollisions } from "./collisions.js";
import { createUpdateLoop } from "./updateLoop.js";

(function(){
  "use strict";

  // ✅ START MENU CONTROL
  const startMenu = $("startMenu");
  const startBtn  = $("startBtn");
  let GAME_STARTED = false;

  function showMenu(){
    GAME_STARTED = false;
    startMenu.classList.add("show");
    if (runner) runner.enabled = false;
  }
  function hideMenu(){
    GAME_STARTED = true;
    startMenu.classList.remove("show");
    if (runner) runner.enabled = true;
  }
  startBtn.addEventListener("click", hideMenu);

  const {
    Engine, Render, Runner, World, Bodies, Body,
    Constraint, Events, Composite, Vector
  } = Matter;

  let engine, world, render, runner, ground;

  let bird = null;
  let birdLaunched = false;
  let birdRespawnTimer = null;

  let slingshot = null;
  let slingAnchor = null;

  let draggingBird = false;
  let canLaunch = true;
  let dragView = null;

  let DEBUG = false;

  // декор-стул (НЕ физика)
  let chairDecal = null;

  // SUPER
  let superActive = false;
  let superPulseT = 0;
  let superBannerFrames = 0;
  let superDim = 0;
  let superAuraPulse = 0;
  let birdSwingBaseAngle = 0;

  // шейк
  let shakeTime = 0;
  let shakeMag = 0;

  // debris
  const debris = [];

  // level
  const structure = { pillars: [], beams: [], managers: [], activated: false };
  const stats = { score:0, broken:0, hits:0, wins:0 };

  // ✅ Camera + user zoom + pan (NEW)
  const camera = {
    cx: 0, cy: 0,
    tx: 0, ty: 0,
    zoom: 1.0,
    tzoom: 1.0,
    smoothing: 0.14,

    baseZoom: 0.86,
    userZoom: 1.0,

    // ✅ pan offsets in WORLD units
    panX: 0,
    panY: 0,
    // while user pans with 2 fingers we keep it locked for some frames
    panHoldFrames: 0
  };

  const state = {
    $,
    toast,
    clamp,
    lerp,
    ASSETS,
    AIM,
    AUTO_RESPAWN_MS,
    DEBRIS,
    DMG,
    FLIGHT,
    GROUND_VIS,
    LEVEL,
    SLING,
    SPR,
    SUPER_VISUAL,
    ZOOM,
    Engine,
    Render,
    Runner,
    World,
    Bodies,
    Body,
    Constraint,
    Events,
    Composite,
    Vector,
    camera,
    structure,
    stats,
    get engine(){ return engine; },
    set engine(v){ engine = v; },
    get world(){ return world; },
    set world(v){ world = v; },
    get render(){ return render; },
    set render(v){ render = v; },
    get runner(){ return runner; },
    set runner(v){ runner = v; },
    get ground(){ return ground; },
    set ground(v){ ground = v; },
    get bird(){ return bird; },
    set bird(v){ bird = v; },
    get birdLaunched(){ return birdLaunched; },
    set birdLaunched(v){ birdLaunched = v; },
    get birdRespawnTimer(){ return birdRespawnTimer; },
    set birdRespawnTimer(v){ birdRespawnTimer = v; },
    get slingshot(){ return slingshot; },
    set slingshot(v){ slingshot = v; },
    get slingAnchor(){ return slingAnchor; },
    set slingAnchor(v){ slingAnchor = v; },
    get draggingBird(){ return draggingBird; },
    set draggingBird(v){ draggingBird = v; },
    get canLaunch(){ return canLaunch; },
    set canLaunch(v){ canLaunch = v; },
    get dragView(){ return dragView; },
    set dragView(v){ dragView = v; },
    get DEBUG(){ return DEBUG; },
    set DEBUG(v){ DEBUG = v; },
    get chairDecal(){ return chairDecal; },
    set chairDecal(v){ chairDecal = v; },
    get superActive(){ return superActive; },
    set superActive(v){ superActive = v; },
    get superPulseT(){ return superPulseT; },
    set superPulseT(v){ superPulseT = v; },
    get superBannerFrames(){ return superBannerFrames; },
    set superBannerFrames(v){ superBannerFrames = v; },
    get superDim(){ return superDim; },
    set superDim(v){ superDim = v; },
    get superAuraPulse(){ return superAuraPulse; },
    set superAuraPulse(v){ superAuraPulse = v; },
    get birdSwingBaseAngle(){ return birdSwingBaseAngle; },
    set birdSwingBaseAngle(v){ birdSwingBaseAngle = v; },
    get shakeTime(){ return shakeTime; },
    set shakeTime(v){ shakeTime = v; },
    get shakeMag(){ return shakeMag; },
    set shakeMag(v){ shakeMag = v; },
    debris,
    updateHUD: null,
    checkWin: null,
    setBirdSuper: null,
    refreshSuperButtonVisibility: null,
    applyCamera: null,
    tryBreak: null,
    impactEnergy: null,
    triggerShake: null
  };

  const { setupCameraInitial, triggerShake, applyCamera } = createCamera(state);
  const { setupSlingshot, detachSlingshot } = createSlingshot(state);
  const { setSuperActive, drawSuperOverlay } = createSuperMode(state);
  const { addDebrisBody, copyRenderMeta, makePiece, splitBodyByStage, impactEnergy, tryBreak } = createDamage(state);
  const { prepareGroundCrop, worldToScreen, worldSizeToScreen, drawGround } = createGround(state);
  const { processCollisionPairs, bindCollisions } = createCollisions(state);
  const { bindUpdateLoop } = createUpdateLoop(state);

  state.applyCamera = applyCamera;
  state.triggerShake = triggerShake;
  state.impactEnergy = impactEnergy;
  state.tryBreak = tryBreak;

  function setUserZoom(mult, showToast=true){
    camera.userZoom = clamp(mult, ZOOM.min, ZOOM.max);
    const pct = Math.round(camera.userZoom * 100);
    $("zoomLabel").textContent = pct + "%";
    $("zoomResetBtn").textContent = pct + "%";
    if (showToast) toast("ZOOM: " + pct + "%", 700);
  }

  // UI супер
  const superFlyWrap = $("superFlyWrap");
  const superFlyBtn  = $("superFlyBtn");

  function refreshSuperButtonVisibility(){
    const shouldShow = !!(bird && birdLaunched && !superActive);
    superFlyWrap.classList.toggle("show", shouldShow);
    superFlyBtn.classList.toggle("super-on", superActive);
  }
  state.refreshSuperButtonVisibility = refreshSuperButtonVisibility;

  superFlyBtn.addEventListener("click", ()=>{
    if (!bird || !birdLaunched || superActive) return;
    setSuperActive(true);
  });

  function updateHUD(){
    $("score").textContent  = String(stats.score);
    $("broken").textContent = String(stats.broken);
    $("hits").textContent   = String(stats.hits);
    $("wins").textContent   = String(stats.wins);
    $("superState").textContent = superActive ? "ON" : "OFF";
    refreshSuperButtonVisibility();
    $("zoomLabel").textContent = Math.round(camera.userZoom * 100) + "%";
  }
  state.updateHUD = updateHUD;

  // ✅ Zoom buttons
  $("zoomInBtn").addEventListener("click", ()=> setUserZoom(camera.userZoom * ZOOM.step));
  $("zoomOutBtn").addEventListener("click", ()=> setUserZoom(camera.userZoom / ZOOM.step));
  $("zoomResetBtn").addEventListener("click", ()=> setUserZoom(1.0));

  $("status").textContent = "Загрузка ассетов…";

  Promise.all([
    loadImage(ASSETS.bg),
    loadImage(ASSETS.ground),   // ✅ грузим пол

    loadImage(ASSETS.beam),
    loadImage(ASSETS.pillar),
    loadImage(ASSETS.manager),
    loadImage(ASSETS.humanIdle),
    loadImage(ASSETS.humanFly),
    loadImage(ASSETS.chair),
    loadImage(ASSETS.superSkin)
  ]).then(([imgBg, imgGround, imgBeam, imgPillar, imgManager, imgIdle, imgFly, imgChair, imgSuper])=>{
    start({imgBg, imgGround, imgBeam, imgPillar, imgManager, imgIdle, imgFly, imgChair, imgSuper});
  }).catch((e)=>{
    const failedAsset = e && (e.asset || e.message) ? (e.asset || e.message) : "unknown";
    console.error("PNG ошибка:", failedAsset, e);
    $("status").textContent = "Ошибка PNG: " + failedAsset;
    toast("PNG ошибка — проверь assets/…", 2500);
  });

  // ======== BROWSER ADAPT HELPERS ========
  function dpr(){
    return Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
  }
  function resizeCanvasToDisplaySize(canvas){
    const ratio = dpr();
    const w = Math.floor(window.innerWidth * ratio);
    const h = Math.floor(window.innerHeight * ratio);
    if (canvas.width !== w || canvas.height !== h){
      canvas.width = w;
      canvas.height = h;
    }
  }

  function start(IMGS){
    $("status").textContent = "Запуск…";

    // ✅ подготовка кропа для пола
    prepareGroundCrop(IMGS.imgGround);

    const canvas = $("c");
    const wrap = $("wrap");

    engine = Engine.create();
    world = engine.world;
    world.gravity.y = 0.98;

    engine.positionIterations = 8;
    engine.velocityIterations = 7;
    engine.constraintIterations = 3;

    resizeCanvasToDisplaySize(canvas);

    render = Render.create({
      element: wrap,
      canvas,
      engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,

        // ✅ ВАЖНО: делаем прозрачным, чтобы Matter не “затирал” наш пол
        background: "transparent",

        pixelRatio: dpr(),
        hasBounds: true
      }
    });

    runner = Runner.create();

    ground = Bodies.rectangle(
      2600,
      window.innerHeight - LEVEL.floorHeight/2,
      9000,
      LEVEL.floorHeight,
      { isStatic:true, friction:1.0, restitution:0.0,
        render: DEBUG ? { fillStyle:"rgba(255,255,255,0.10)" } : { fillStyle:"rgba(0,0,0,0)" } }
    );
    World.add(world, ground);

    buildLevel(IMGS);
    spawnBird(IMGS);
    setupSlingshot();
    setupCameraInitial();
    bindInput(IMGS);
    bindPhysics(IMGS);

    Events.on(render, "afterRender", ()=>{
      const ctx = render.context;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // ✅ Рисуем ФОН + ПОЛ “СНИЗУ”, чтобы не ломать остальной рендер
      // destination-over = рисует позади уже нарисованных тел
      ctx.globalCompositeOperation = "destination-over";
      drawGround(IMGS);
      ctx.drawImage(IMGS.imgBg, 0, 0, render.canvas.width, render.canvas.height);
      ctx.globalCompositeOperation = "source-over";

      // ---- дальше всё как было (НИЧЕГО НЕ ВЫКИНУТО) ----
      if (AIM.enabled) drawAimTrajectory();
      if (chairDecal) drawChairDecal(IMGS);
      drawSuperOverlay();

      ctx.restore();
    });

    Render.run(render);
    Runner.run(runner, engine);

    // ✅ Start paused (menu shown)
    runner.enabled = false;

    $("resetBtn").addEventListener("click", ()=>{ resetAll(IMGS); showMenu(); });
    $("debugBtn").addEventListener("click", ()=>{
      DEBUG = !DEBUG;
      toast(DEBUG ? "DEBUG: ON" : "DEBUG: OFF", 900);
      resetAll(IMGS);
      if (!GAME_STARTED) showMenu();
    });

    // ✅ wheel zoom (desktop)
    canvas.addEventListener("wheel", (e)=>{
      e.preventDefault();
      const dir = Math.sign(e.deltaY);
      if (dir > 0) setUserZoom(camera.userZoom / ZOOM.step, false);
      else setUserZoom(camera.userZoom * ZOOM.step, false);
    }, { passive:false });

    // ✅ keyboard shortcuts
    window.addEventListener("keydown", (e)=>{
      if (e.key === "r" || e.key === "R"){ resetAll(IMGS); showMenu(); }
      if (e.key === "d" || e.key === "D"){ DEBUG = !DEBUG; toast(DEBUG ? "DEBUG: ON" : "DEBUG: OFF", 900); resetAll(IMGS); if (!GAME_STARTED) showMenu(); }
      if (e.key === "+" || e.key === "="){ setUserZoom(camera.userZoom * ZOOM.step); }
      if (e.key === "-" || e.key === "_"){ setUserZoom(camera.userZoom / ZOOM.step); }
      if ((e.key === "Enter" || e.key === " ") && !GAME_STARTED){ hideMenu(); }
    });

    window.addEventListener("resize", ()=>onResize(IMGS));

    $("status").textContent = "Готово";
    setUserZoom(1.0, false);
    updateHUD();

    showMenu();
  }

  function onResize(IMGS){
    resizeCanvasToDisplaySize(render.canvas);
    render.options.pixelRatio = dpr();
    render.options.width = window.innerWidth;
    render.options.height = window.innerHeight;

    // ✅ пересчитать кроп пола при смене размеров (без влияния на механику)
    prepareGroundCrop(IMGS.imgGround);

    resetAll(IMGS);
    if (!GAME_STARTED) showMenu();
  }

  function resetAll(IMGS){
    if (birdRespawnTimer){ clearTimeout(birdRespawnTimer); birdRespawnTimer = null; }

    Composite.clear(world, false);
    World.add(world, ground);

    stats.score = 0; stats.broken = 0; stats.hits = 0; stats.wins = 0;
    structure.pillars = []; structure.beams = []; structure.managers = []; structure.activated = false;

    debris.length = 0;

    bird = null; slingshot = null; slingAnchor = null;
    draggingBird = false; canLaunch = true; birdLaunched = false; dragView = null;

    chairDecal = null;

    superActive = false; superPulseT = 0; superBannerFrames = 0; superDim = 0; superAuraPulse = 0;
    birdSwingBaseAngle = 0;

    shakeTime = 0; shakeMag = 0;

    // ✅ reset camera pan too
    camera.panX = 0;
    camera.panY = 0;
    camera.panHoldFrames = 0;

    buildLevel(IMGS);
    spawnBird(IMGS);
    setupSlingshot();
    setupCameraInitial();

    refreshSuperButtonVisibility();
    $("status").textContent = "Готово";
    updateHUD();
  }

  // ======== BREAKABLE METADATA ========
  function setBreakMeta(body, type, tex, sx, sy){
    body.__type = type;
    body.__broken = false;
    body.__breakStage = 0; // 0=целый, 1=половинки, 2=четвертинки
    body.__tex = tex;
    body.__sx = sx;
    body.__sy = sy;
    body.__hp = DMG.hpStage0;
    return body;
  }

  // ======== LEVEL BUILD ========
  function buildLevel(IMGS){
    const baseY = (typeof ground !== "undefined" && ground)
      ? (ground.position.y - LEVEL.floorHeight/2)
      : (window.innerHeight - LEVEL.floorHeight);

    structure.pillars = [];
    structure.beams = [];
    structure.managers = [];

    for (let hi=0; hi<LEVEL.houses.length; hi++){
      const H = LEVEL.houses[hi];
      const cx = Math.round(window.innerWidth * H.x);
      const w = H.w;

      const leftX  = cx - Math.round(w/2);
      const rightX = cx + Math.round(w/2);

      const pillarScale = SPR.pillarH / IMGS.imgPillar.height;
      const beamScale   = SPR.beamW   / IMGS.imgBeam.width;

      const pillarH = IMGS.imgPillar.height * pillarScale;
      const pillarW = IMGS.imgPillar.width  * pillarScale;

      const pLeft = Bodies.rectangle(leftX, baseY - pillarH/2, pillarW, pillarH, {
        isStatic:true,
        render: DEBUG ? { fillStyle:"rgba(0,210,255,0.20)", strokeStyle:"rgba(110,240,255,0.9)", lineWidth:2 }
                      : { sprite:{ texture: ASSETS.pillar, xScale: pillarScale, yScale: pillarScale } }
      });
      setBreakMeta(pLeft, "pillar", ASSETS.pillar, pillarScale, pillarScale);

      const pRight = Bodies.rectangle(rightX, baseY - pillarH/2, pillarW, pillarH, {
        isStatic:true,
        render: DEBUG ? { fillStyle:"rgba(0,210,255,0.20)", strokeStyle:"rgba(110,240,255,0.9)", lineWidth:2 }
                      : { sprite:{ texture: ASSETS.pillar, xScale: pillarScale, yScale: pillarScale } }
      });
      setBreakMeta(pRight, "pillar", ASSETS.pillar, pillarScale, pillarScale);

      const beamW = IMGS.imgBeam.width  * beamScale;
      const beamH = IMGS.imgBeam.height * beamScale;

      const yBot  = baseY - 46;
      const yMid  = baseY - 182;
      const yTop  = baseY - 318;
      const yTop2 = baseY - 454;

      function makeBeam(x,y){
        const b = Bodies.rectangle(x, y, beamW, beamH, {
          isStatic:true,
          friction:0.95,
          restitution:0.02,
          density:0.0022,
          chamfer:{ radius:4 },
          render: DEBUG ? { fillStyle:"rgba(255,120,0,0.25)", strokeStyle:"rgba(255,170,90,0.9)", lineWidth:2 }
                        : { sprite:{ texture: ASSETS.beam, xScale: beamScale, yScale: beamScale } }
        });
        setBreakMeta(b, "beam", ASSETS.beam, beamScale, beamScale);
        return b;
      }

      const bTop2 = makeBeam(cx, yTop2);
      const bTop  = makeBeam(cx, yTop);
      const bMid  = makeBeam(cx, yMid);
      const bBot  = makeBeam(cx, yBot);

      // managers
      const mScale = SPR.managerW / IMGS.imgManager.width;
      const mW = IMGS.imgManager.width * mScale;
      const mH = IMGS.imgManager.height * mScale;

      const tiers = [
        { y: yTop2 - beamH/2 - mH/2 + 10, span: w*0.50 },
        { y: yTop  - beamH/2 - mH/2 + 10, span: w*0.46 },
        { y: yMid  - beamH/2 - mH/2 + 10, span: w*0.42 }
      ];

      const managers = [];
      for (let i=0; i<H.managers; i++){
        const tier = tiers[i % tiers.length];
        const t = (i+1)/(H.managers+1);
        const x = cx - tier.span/2 + t * tier.span;
        const y = tier.y;

        const m = Bodies.rectangle(x, y, mW, mH, {
          isStatic:true,
          friction:0.85,
          restitution:0.02,
          density:0.002,
          render: DEBUG ? { fillStyle:"rgba(255,255,255,0.16)", strokeStyle:"rgba(255,255,255,0.9)", lineWidth:2 }
                        : { sprite:{ texture: ASSETS.manager, xScale: mScale, yScale: mScale } }
        });
        setBreakMeta(m, "manager", ASSETS.manager, mScale, mScale);
        m.__alive = true;
        managers.push(m);
      }

      structure.pillars.push(pLeft, pRight);
      structure.beams.push(bTop2, bTop, bMid, bBot);
      structure.managers.push(...managers);

      World.add(world, [pLeft, pRight, bTop2, bTop, bMid, bBot, ...managers]);
    }
  }

  function activateStructure(){
    if (structure.activated) return;
    structure.activated = true;

    const all = [...structure.beams, ...structure.pillars, ...structure.managers];
    for (const b of all){
      Body.setStatic(b,false);
      b.frictionAir = 0.010;
    }
  }

  // ======== BIRD ========
  function spawnBird(IMGS){
    const baseY = (typeof ground !== "undefined" && ground)
      ? (ground.position.y - LEVEL.floorHeight/2)
      : (window.innerHeight - LEVEL.floorHeight);
    const start = { x: LEVEL.birdStartX, y: baseY - LEVEL.birdStartYOffset };

    const idleScale = SPR.birdWIdle / IMGS.imgIdle.width;
    const flyScale  = SPR.birdWFly  / IMGS.imgFly.width;
    const superScale = SPR.birdWSuper / IMGS.imgIdle.width;

    bird = Bodies.circle(start.x, start.y, SPR.birdRadius, {
      restitution:0.20,
      friction:0.95,
      frictionAir:0.012,
      density:0.0048,
      render: DEBUG ? { fillStyle:"rgba(255,0,0,0.22)", strokeStyle:"rgba(255,0,0,0.9)", lineWidth:2 }
                    : { sprite:{ texture: ASSETS.humanIdle, xScale: idleScale, yScale: idleScale } }
    });

    bird.__start = start;
    bird.__idleTexture = ASSETS.humanIdle;
    bird.__idleScale = idleScale;

    bird.__flyTexture = ASSETS.humanFly;
    bird.__flyScale = flyScale;

    bird.__superTexture = ASSETS.superSkin;
    bird.__superScale = superScale;

    birdLaunched = false;
    World.add(world, bird);
    refreshSuperButtonVisibility();
  }

  function setBirdIdle(){
    if (!bird || DEBUG) return;
    bird.render.sprite.texture = bird.__idleTexture;
    bird.render.sprite.xScale = bird.__idleScale;
    bird.render.sprite.yScale = bird.__idleScale;
  }
  function setBirdFly(){
    if (!bird || DEBUG) return;
    bird.render.sprite.texture = bird.__flyTexture;
    bird.render.sprite.xScale = bird.__flyScale;
    bird.render.sprite.yScale = bird.__flyScale;
  }
  function setBirdSuper(){
    if (!bird || DEBUG) return;
    bird.render.sprite.texture = bird.__superTexture;
    bird.render.sprite.xScale = bird.__superScale;
    bird.render.sprite.yScale = bird.__superScale;
  }
  state.setBirdSuper = setBirdSuper;

  // декор-стул (не физика)
  function spawnChairDecal(IMGS, atPos){
    const chairScale = SPR.chairW / IMGS.imgChair.width;
    chairDecal = { x: atPos.x, y: atPos.y + 64, w: IMGS.imgChair.width*chairScale, h: IMGS.imgChair.height*chairScale };
  }
  function clearChairDecal(){ chairDecal = null; }

  function scheduleBirdRespawn(IMGS, delayMs){
    if (birdRespawnTimer) return;
    birdRespawnTimer = setTimeout(()=>{
      birdRespawnTimer = null;

      if (bird){ World.remove(world, bird); bird = null; }
      if (slingshot){ World.remove(world, slingshot); slingshot = null; }

      clearChairDecal();

      superActive = false;
      superPulseT = 0;
      superBannerFrames = 0;
      superDim = 0;
      superAuraPulse = 0;
      birdSwingBaseAngle = 0;

      spawnBird(IMGS);
      setupSlingshot();
      setBirdIdle();

      birdLaunched = false;
      draggingBird = false;
      canLaunch = true;
      dragView = null;

      refreshSuperButtonVisibility();
      $("status").textContent = "Готово";
      updateHUD();
    }, delayMs);
  }

  // ======== INPUT ========
  function pointerToWorld(clientX, clientY){
    const rect = render.canvas.getBoundingClientRect();
    const sx = (clientX - rect.left) / rect.width;
    const sy = (clientY - rect.top) / rect.height;
    const b = (draggingBird && dragView) ? dragView : render.bounds;
    return { x: b.min.x + sx * (b.max.x - b.min.x), y: b.min.y + sy * (b.max.y - b.min.y) };
  }

  // ✅ pinch+pan support (2 pointers)
  const pointers = new Map();
  let pinching = false;
  let pinchStartDist = 0;
  let pinchStartZoom = 1.0;

  // NEW for pan:
  let lastMid = null;

  function dist2(a,b){
    const dx = a.x-b.x, dy=a.y-b.y;
    return Math.sqrt(dx*dx+dy*dy);
  }
  function midPoint(a,b){
    return { x:(a.x+b.x)/2, y:(a.y+b.y)/2 };
  }

  function startPinchIfPossible(){
    if (pointers.size !== 2) return;
    const pts = Array.from(pointers.values());
    pinching = true;
    pinchStartDist = dist2(pts[0], pts[1]);
    pinchStartZoom = camera.userZoom;

    lastMid = midPoint(pts[0], pts[1]);

    // stop slingshot drag if pinch begins
    draggingBird = false;
    dragView = null;

    // hold pan (manual) for a bit
    camera.panHoldFrames = Math.max(camera.panHoldFrames, 60);
  }

  function updatePinchAndPan(){
    if (!pinching || pointers.size !== 2) return;

    const pts = Array.from(pointers.values());
    const d = dist2(pts[0], pts[1]);
    if (pinchStartDist > 0){
      const factor = d / pinchStartDist;
      setUserZoom(pinchStartZoom * factor, false);
    }

    // ✅ PAN: move by midpoint delta (screen -> world)
    const m = midPoint(pts[0], pts[1]);
    if (lastMid){
      const dx = (m.x - lastMid.x);
      const dy = (m.y - lastMid.y);
      lastMid = m;

      // convert screen delta to world delta using current bounds
      const rect = render.canvas.getBoundingClientRect();
      const b = render.bounds;
      const vw = (b.max.x - b.min.x);
      const vh = (b.max.y - b.min.y);

      const worldDX = (dx / rect.width)  * vw;
      const worldDY = (dy / rect.height) * vh;

      // finger drag right should move camera right (scene left),
      // so we subtract worldDX to "pull" the world
      camera.panX -= worldDX;
      camera.panY -= worldDY;

      // clamp pan a bit (avoid losing the scene)
      camera.panX = clamp(camera.panX, -2200, 2200);
      camera.panY = clamp(camera.panY, -1200, 1200);

      camera.panHoldFrames = Math.max(camera.panHoldFrames, 60);
    }
  }

  function endPinchIfNeeded(){
    if (pointers.size < 2){
      pinching = false;
      lastMid = null;
      // keep pan for a bit after gesture, then decay
      camera.panHoldFrames = Math.max(camera.panHoldFrames, 45);
    }
  }

  function onDown(clientX, clientY, setCaptureFn){
    if (!GAME_STARTED) return;
    if (pinching) return;
    if (!bird || birdLaunched || !canLaunch) return;

    const p = pointerToWorld(clientX, clientY);
    const dist = Math.hypot(p.x - bird.position.x, p.y - bird.position.y);
    if (dist <= SPR.birdRadius * 1.25){
      if (setCaptureFn) setCaptureFn();
      draggingBird = true;
      dragView = { min: { x: render.bounds.min.x, y: render.bounds.min.y }, max: { x: render.bounds.max.x, y: render.bounds.max.y } };
      Body.setStatic(bird, true);
      $("status").textContent = "Тяни…";
    }
  }

  function onMove(clientX, clientY){
    if (!GAME_STARTED) return;
    if (pinching) return;
    if (!bird || !draggingBird || birdLaunched) return;

    const start = bird.__start;
    const p = pointerToWorld(clientX, clientY);
    const dx = p.x - start.x, dy = p.y - start.y;

    const dist = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, SLING.pullMax / dist);

    Body.setPosition(bird, { x: start.x + dx * k, y: start.y + dy * k });
    Body.setVelocity(bird, { x: 0, y: 0 });
    Body.setAngularVelocity(bird, 0);
  }

  function onUp(IMGS){
    if (!GAME_STARTED) return;
    if (pinching) return;
    if (!bird || !draggingBird || birdLaunched) { draggingBird = false; dragView = null; return; }
    draggingBird = false; dragView = null;
    if (!canLaunch) return;

    activateStructure();

    setBirdFly();
    spawnChairDecal(IMGS, bird.__start);
    detachSlingshot();

    Body.setStatic(bird, false);

    const pull = Vector.sub(bird.__start, bird.position);
    const d = Math.min(Vector.magnitude(pull), SLING.pullMax);

    if (d > 8){
      const dir = Vector.normalise(pull);
      const vel = Vector.mult(dir, d * SLING.launchK);

      Body.setVelocity(bird, { x: 0, y: 0 });
      Body.setAngularVelocity(bird, 0);
      Body.setVelocity(bird, vel);

      bird.frictionAir = FLIGHT.airFrictionFlying;
      birdSwingBaseAngle = 0;
    }

    birdLaunched = true;
    canLaunch = false;
    stats.score += 1;
    updateHUD();
    $("status").textContent = "Полетел!";

    refreshSuperButtonVisibility();
    scheduleBirdRespawn(IMGS, AUTO_RESPAWN_MS);
  }

  function bindInput(IMGS){
    const canvas = render.canvas;

    if (window.PointerEvent){
      canvas.addEventListener("pointerdown", (e)=>{
        pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });

        if (pointers.size === 2){
          startPinchIfPossible();
        } else {
          onDown(e.clientX, e.clientY, ()=>canvas.setPointerCapture(e.pointerId));
        }
      });

      canvas.addEventListener("pointermove", (e)=>{
        if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });
        if (pointers.size === 2){
          updatePinchAndPan();
        } else {
          onMove(e.clientX, e.clientY);
        }
      });

      canvas.addEventListener("pointerup", (e)=>{
        pointers.delete(e.pointerId);
        endPinchIfNeeded();
        onUp(IMGS);
      });

      canvas.addEventListener("pointercancel", (e)=>{
        pointers.delete(e.pointerId);
        endPinchIfNeeded();
        onUp(IMGS);
      });

      return;
    }

    // Mouse fallback (pan on desktop can be added later if you want)
    let mouseDown = false;
    canvas.addEventListener("mousedown", (e)=>{
      mouseDown = true;
      onDown(e.clientX, e.clientY, null);
    });
    window.addEventListener("mousemove", (e)=>{
      if (!mouseDown) return;
      onMove(e.clientX, e.clientY);
    });
    window.addEventListener("mouseup", ()=>{
      mouseDown = false;
      onUp(IMGS);
    });

    // Touch fallback (single finger only)
    canvas.addEventListener("touchstart", (e)=>{
      e.preventDefault();
      const t = e.changedTouches[0];
      onDown(t.clientX, t.clientY, null);
    }, {passive:false});

    canvas.addEventListener("touchmove", (e)=>{
      e.preventDefault();
      const t = e.changedTouches[0];
      onMove(t.clientX, t.clientY);
    }, {passive:false});

    canvas.addEventListener("touchend", (e)=>{
      e.preventDefault();
      onUp(IMGS);
    }, {passive:false});

    canvas.addEventListener("touchcancel", (e)=>{
      e.preventDefault();
      onUp(IMGS);
    }, {passive:false});
  }

  // ======== TRAJECTORY (aim) ========
  function drawAimTrajectory(){
    if (!bird || birdLaunched || !draggingBird || !canLaunch) return;

    const ctx = render.context;
    const start = bird.__start;

    const pull = Vector.sub(start, bird.position);
    const dist = Math.min(Vector.magnitude(pull), SLING.pullMax);
    if (dist < 6) return;

    const dir = Vector.normalise(pull);
    const v0 = Vector.mult(dir, dist * SLING.launchK);

    const gTick = (world.gravity.y || 1) * (world.gravity.scale || 0.001) * 1000 / 60;

    let x = bird.position.x;
    let y = bird.position.y;
    let vx = v0.x;
    let vy = v0.y;

    const sA = worldToScreen(start.x, start.y);
    const sB = worldToScreen(bird.position.x, bird.position.y);

    ctx.save();
    ctx.lineWidth = 2.2;
    ctx.setLineDash([7, 8]);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(sA.x, sA.y);
    ctx.lineTo(sB.x, sB.y);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i=0; i<AIM.steps; i++){
      x += vx * AIM.stepTicks;
      y += vy * AIM.stepTicks;
      vy += gTick * AIM.stepTicks;

      if (i % AIM.dotEvery !== 0) continue;

      const p = worldToScreen(x, y);
      const a = lerp(AIM.alphaStart, AIM.alphaEnd, i / (AIM.steps - 1));

      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 225, 140, ${a})`;
      ctx.arc(p.x, p.y, AIM.dotRadius, 0, Math.PI*2);
      ctx.fill();
    }

    const sc = worldToScreen(start.x, start.y);
    const bb = render.bounds;
    const vw = (bb.max.x - bb.min.x);
    const rPx = (SLING.pullMax / vw) * render.canvas.width;

    ctx.beginPath();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "rgba(255, 225, 140, 0.18)";
    ctx.arc(sc.x, sc.y, rPx, 0, Math.PI*2);
    ctx.stroke();

    ctx.restore();
  }

  function drawChairDecal(IMGS){
    if (!chairDecal) return;
    const ctx = render.context;
    const img = IMGS.imgChair;
    const b = render.bounds;

    if (chairDecal.x < b.min.x - 500 || chairDecal.x > b.max.x + 500) return;

    const p = worldToScreen(chairDecal.x, chairDecal.y);

    const vw = (b.max.x - b.min.x);
    const sw = chairDecal.w / vw * render.canvas.width;
    const sh = chairDecal.h / (b.max.y - b.min.y) * render.canvas.height;

    ctx.save();
    ctx.drawImage(img, p.x - sw/2, p.y - sh/2, sw, sh);
    ctx.restore();
  }

  // ======== PHYSICS LOOP ========
  function bindPhysics(IMGS){
    bindCollisions();
    bindUpdateLoop();
  }

  function checkWin(){
    const alive = structure.managers.some(m => m.__alive);
    if (!alive){
      stats.wins += 1;
      stats.score += 140;
      updateHUD();
      toast("ПОБЕДА! Все менеджеры выбиты 🏆", 1600);
    }
  }
  state.checkWin = checkWin;

})();
