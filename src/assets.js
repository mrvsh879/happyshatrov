export const ASSETS = {
  bg: "assets/bg_office.png",
  ground: "assets/ground/ground.png",   // ✅ ДОБАВИЛИ ПОЛ

  beam: "assets/office/beam.png",
  pillar: "assets/office/pillar.png",
  manager: "assets/office/manager.png",
  humanIdle: "assets/player/human_idle.png",
  humanFly: "assets/player/human_fly.png",
  chair: "assets/player/chair.png",
  superSkin: "assets/player/human_idle.png"
};

export function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = ()=>reject(new Error("Не загрузилась картинка: " + src));
    img.src = src + (src.includes("?") ? "&" : "?") + "v=" + Date.now();
  });
}
