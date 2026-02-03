const BASE = new URL("../", import.meta.url);
const assetUrl = (p) => new URL(p.replace(/^\/+/, ""), BASE).toString();

export const ASSETS = {
  bg: assetUrl("assets/bg_office.png"),
  ground: assetUrl("assets/ground/ground.png"),   // ✅ ДОБАВИЛИ ПОЛ

  beam: assetUrl("assets/office/beam.png"),
  pillar: assetUrl("assets/office/pillar.png"),
  manager: assetUrl("assets/office/manager.png"),
  humanIdle: assetUrl("assets/player/human_idle.png"),
  humanFly: assetUrl("assets/player/human_fly.png"),
  chair: assetUrl("assets/player/chair.png"),
  superSkin: assetUrl("assets/player/human_idle.png")
};

export function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = ()=>{
      const err = new Error("Не загрузилась картинка: " + src);
      err.asset = src;
      reject(err);
    };
    img.src = src + (src.includes("?") ? "&" : "?") + "v=" + Date.now();
  });
}
