export function createCamera(state){
  const { camera, LEVEL, lerp, clamp } = state;

  function setupCameraInitial(){
    const baseY = (typeof state.ground !== "undefined" && state.ground)
      ? (state.ground.position.y - LEVEL.floorHeight/2)
      : (window.innerHeight - LEVEL.floorHeight);
    camera.cx = camera.tx = 900;
    camera.cy = camera.ty = baseY - 300;
    camera.baseZoom = 0.86;
    camera.zoom = camera.tzoom = camera.baseZoom * camera.userZoom;
    applyCamera(true);
  }

  function triggerShake(energy){
    const over = energy - state.DMG.shakeEnergyThreshold;
    const strength = clamp(over * 2.0, 6, state.DMG.shakeMax);
    state.shakeMag = Math.max(state.shakeMag, strength);
    state.shakeTime = Math.max(state.shakeTime, 20);
  }

  function applyCamera(force=false){
    camera.cx = force ? camera.tx : lerp(camera.cx, camera.tx, camera.smoothing);
    camera.cy = force ? camera.ty : lerp(camera.cy, camera.ty, camera.smoothing);
    camera.zoom = force ? camera.tzoom : lerp(camera.zoom, camera.tzoom, camera.smoothing);

    let sx = 0, sy = 0;
    if (state.shakeTime > 0){
      const amp = state.shakeMag * (state.shakeTime / 20);
      sx = (Math.random()*2 - 1) * amp;
      sy = (Math.random()*2 - 1) * amp;
    }

    const vw = window.innerWidth / camera.zoom;
    const vh = window.innerHeight / camera.zoom;

    const render = state.render;
    if (!render) return;

    render.bounds.min.x = (camera.cx + sx) - vw/2;
    render.bounds.min.y = (camera.cy + sy) - vh/2;
    render.bounds.max.x = render.bounds.min.x + vw;
    render.bounds.max.y = render.bounds.min.y + vh;

    state.Render.lookAt(render, { min: render.bounds.min, max: render.bounds.max });
  }

  return { setupCameraInitial, triggerShake, applyCamera };
}
