export function createGround(state){
  function prepareGroundCrop(img){
    img.__cropY = 0;
    img.__cropH = img.height;

    if (!state.GROUND_VIS.autoCrop) return;

    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently:true });
    ctx.drawImage(img, 0, 0);

    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    const thr = state.GROUND_VIS.cropThreshold;
    const rowMean = new Float32Array(img.height);

    for (let y=0; y<img.height; y++){
      let sum = 0;
      let count = 0;
      const rowStart = y * img.width * 4;
      for (let x=0; x<img.width; x++){
        const i = rowStart + x*4;
        const r = data[i], g = data[i+1], b = data[i+2];
        const m = (r + g + b) / 3;
        sum += m;
        count++;
      }
      rowMean[y] = sum / Math.max(1, count);
    }

    let top = -1, bottom = -1;
    for (let y=0; y<img.height; y++){
      if (rowMean[y] > thr){ top = y; break; }
    }
    for (let y=img.height-1; y>=0; y--){
      if (rowMean[y] > thr){ bottom = y; break; }
    }

    // если ничего не нашли — оставляем как есть
    if (top === -1 || bottom === -1 || bottom - top < 20) return;

    const pad = state.GROUND_VIS.cropPadding;
    top = Math.max(0, top - pad);
    bottom = Math.min(img.height-1, bottom + pad);

    img.__cropY = top;
    img.__cropH = (bottom - top + 1);
  }

  function worldToScreen(x, y){
    const b = state.render.bounds;
    return {
      x: (x - b.min.x) / (b.max.x - b.min.x) * state.render.canvas.width,
      y: (y - b.min.y) / (b.max.y - b.min.y) * state.render.canvas.height
    };
  }

  function worldSizeToScreen(w, h){
    const b = state.render.bounds;
    const vw = (b.max.x - b.min.x);
    const vh = (b.max.y - b.min.y);
    return {
      w: (w / vw) * state.render.canvas.width,
      h: (h / vh) * state.render.canvas.height
    };
  }

  function drawGround(IMGS){
    if (!IMGS || !IMGS.imgGround) return;

    const img = IMGS.imgGround;
    const b = state.render.bounds;

    const baseY = (typeof state.ground !== "undefined" && state.ground)
      ? (state.ground.position.y - state.LEVEL.floorHeight/2)
      : (window.innerHeight - state.LEVEL.floorHeight);
    const topY = baseY - state.GROUND_VIS.overlap;
    const hWorld = state.GROUND_VIS.hWorld + state.GROUND_VIS.overlap;

    const srcY = (typeof img.__cropY === "number") ? img.__cropY : 0;
    const srcH = (typeof img.__cropH === "number") ? img.__cropH : img.height;

    // высоту задаём в world, чтобы при зуме выглядело естественно
    const scale = hWorld / srcH;
    const tileWWorld = img.width * scale;

    const xStart = Math.floor((b.min.x - tileWWorld) / tileWWorld) * tileWWorld;
    const xEnd = b.max.x + tileWWorld;

    const tileSizePx = worldSizeToScreen(tileWWorld, hWorld);
    const tileWpx = tileSizePx.w;
    const tileHpx = tileSizePx.h;

    const sY = worldToScreen(0, topY).y;

    const ctx = state.render.context;
    ctx.save();

    for (let x = xStart; x <= xEnd; x += tileWWorld){
      const sX = worldToScreen(x, topY).x;
      ctx.drawImage(
        img,
        0, srcY, img.width, srcH,
        sX, sY, tileWpx, tileHpx
      );
    }

    // лёгкая тень для “массы”
    if (state.GROUND_VIS.shadeAlpha > 0){
      ctx.globalAlpha = state.GROUND_VIS.shadeAlpha;
      ctx.fillStyle = "rgba(0,0,0,1)";
      const left = worldToScreen(b.min.x, topY).x;
      const right = worldToScreen(b.max.x, topY).x;
      const width = (right - left);
      const height = worldSizeToScreen(0, hWorld).h;
      ctx.fillRect(left, sY, width, height);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  return { prepareGroundCrop, worldToScreen, worldSizeToScreen, drawGround };
}
