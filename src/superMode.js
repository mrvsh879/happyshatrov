export function createSuperMode(state){
  const { SUPER_VISUAL, clamp } = state;

  function setSuperActive(next){
    state.superActive = next;

    if (state.superActive){
      state.superPulseT = 0;
      state.superBannerFrames = 180;
      state.superDim = Math.max(state.superDim, SUPER_VISUAL.dimTarget);
      state.superAuraPulse = 1.0;
      state.birdSwingBaseAngle = (state.bird && typeof state.bird.angle === "number") ? state.bird.angle : 0;
      state.toast("SUPER ON ⚡", 900);
      if (state.bird && state.birdLaunched) state.setBirdSuper();
    } else {
      state.toast("SUPER OFF", 700);
    }

    state.$("superState").textContent = state.superActive ? "ON" : "OFF";
    state.refreshSuperButtonVisibility();
  }

  function drawSuperOverlay(){
    if (!state.superActive && state.superDim <= 0.004 && state.superBannerFrames <= 0) return;

    const ctx = state.render.context;
    const W = state.render.canvas.width;
    const H = state.render.canvas.height;

    if (state.superDim > 0.004){
      ctx.save();
      ctx.globalAlpha = clamp(state.superDim, 0, 0.80);
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillRect(0,0,W,H);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = clamp(SUPER_VISUAL.vignette * state.superDim, 0, 0.60);
      const grdV = ctx.createRadialGradient(W*0.5, H*0.52, Math.min(W,H)*0.18, W*0.5, H*0.52, Math.min(W,H)*0.78);
      grdV.addColorStop(0, "rgba(0,0,0,0)");
      grdV.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = grdV;
      ctx.fillRect(0,0,W,H);
      ctx.restore();

      const pulse = 0.16 + Math.sin((state.superPulseT||0)*0.10)*0.07;
      ctx.save();
      ctx.globalAlpha = clamp(state.superAuraPulse * pulse, 0, 0.30);
      const grd = ctx.createRadialGradient(W*0.5, H*0.50, 40, W*0.5, H*0.50, Math.min(W,H)*0.62);
      grd.addColorStop(0, "rgba(255,210,70,0.70)");
      grd.addColorStop(1, "rgba(255,210,70,0.0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,W,H);
      ctx.restore();
    }

    if (state.superBannerFrames > 0){
      const t = state.superBannerFrames / 180;
      const alpha = clamp(0.10 + t, 0, 1);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const big = Math.max(120, Math.min(210, Math.floor(W * 0.13)));
      ctx.font = `900 ${big}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;

      ctx.lineWidth = 16;
      ctx.strokeStyle = "rgba(0,0,0,0.68)";
      ctx.strokeText("Раскачаемся!!!", W*0.50, H*0.22);

      ctx.shadowColor = "rgba(255,210,70,0.98)";
      ctx.shadowBlur = 34;

      ctx.fillStyle = "rgba(255,235,170,0.98)";
      ctx.fillText("Раскачаемся!!!", W*0.50, H*0.22);

      ctx.shadowBlur = 0;
      ctx.globalAlpha = alpha * 0.16;
      const huge = Math.max(180, Math.min(320, Math.floor(W * 0.20)));
      ctx.font = `900 ${huge}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      ctx.fillStyle = "rgba(255,210,70,0.85)";
      ctx.fillText("Раскачаемся!!!", W*0.50, H*0.54);

      ctx.restore();
    }
  }

  return { setSuperActive, drawSuperOverlay };
}
