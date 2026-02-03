export function createDamage(state){
  function addDebrisBody(body){
    body.__debris = true;
    body.frictionAir = state.DEBRIS.airFriction;
    state.debris.push({ body, ttl: Date.now() + state.DEBRIS.ttlMs, stillFrames: 0 });
    state.World.add(state.world, body);
  }

  function copyRenderMeta(srcBody, dstBody){
    dstBody.__type = srcBody.__type;
    dstBody.__tex = srcBody.__tex;
    dstBody.__sx = srcBody.__sx;
    dstBody.__sy = srcBody.__sy;
    dstBody.__breakStage = srcBody.__breakStage;
    dstBody.__broken = false;
    dstBody.__debris = true;
    dstBody.__hp = state.DMG.hpStage0;

    if (!state.DEBUG){
      dstBody.render.sprite.texture = srcBody.__tex;
      dstBody.render.sprite.xScale = srcBody.__sx;
      dstBody.render.sprite.yScale = srcBody.__sy;
    }
  }

  function makePiece(x,y,w,h,angle,srcBody){
    const piece = state.Bodies.rectangle(x, y, Math.max(10,w), Math.max(10,h), {
      isStatic:false,
      friction:0.95,
      restitution:0.05,
      density:0.0022,
      chamfer:{ radius:2 },
      render: state.DEBUG
        ? { fillStyle:"rgba(255,255,255,0.12)", strokeStyle:"rgba(255,255,255,0.5)", lineWidth:1 }
        : { sprite:{ texture: srcBody.__tex, xScale: srcBody.__sx, yScale: srcBody.__sy } }
    });
    state.Body.setAngle(piece, angle);
    copyRenderMeta(srcBody, piece);
    return piece;
  }

  function splitBodyByStage(body){
    if (!body) return;
    const stage = body.__breakStage || 0;

    if (body.__type === "manager" && body.__alive){
      body.__alive = false;
      state.stats.hits += 1;
      state.stats.score += 30;
      state.updateHUD();
      state.checkWin();
    }

    if (stage >= 2){
      state.World.remove(state.world, body);
      state.stats.broken += 1;
      state.stats.score += 6;
      state.updateHUD();
      return;
    }

    const pos = body.position;
    const angle = body.angle;
    const w = body.bounds.max.x - body.bounds.min.x;
    const h = body.bounds.max.y - body.bounds.min.y;

    const right = state.Vector.rotate({x:1,y:0}, angle);
    const down  = state.Vector.rotate({x:0,y:1}, angle);

    state.World.remove(state.world, body);

    const baseVel = body.velocity || {x:0,y:0};
    const baseAV = body.angularVelocity || 0;

    if (stage === 0){
      const splitAlongX = (w >= h);
      if (splitAlongX){
        const hw = w/2;
        const ph = h;
        const offset = w/4;

        const p1 = state.Vector.add(pos, state.Vector.mult(right, -offset));
        const p2 = state.Vector.add(pos, state.Vector.mult(right, +offset));

        const a = makePiece(p1.x, p1.y, hw*0.95, ph*0.95, angle, body);
        const b = makePiece(p2.x, p2.y, hw*0.95, ph*0.95, angle, body);

        a.__breakStage = 1; b.__breakStage = 1;
        a.__hp = state.DMG.hpStage1;
        b.__hp = state.DMG.hpStage1;

        state.Body.setVelocity(a, { x: baseVel.x + (Math.random()-0.5)*1.4, y: baseVel.y + (Math.random()-0.5)*1.4 });
        state.Body.setVelocity(b, { x: baseVel.x + (Math.random()-0.5)*1.4, y: baseVel.y + (Math.random()-0.5)*1.4 });
        state.Body.setAngularVelocity(a, baseAV + (Math.random()-0.5)*0.30);
        state.Body.setAngularVelocity(b, baseAV + (Math.random()-0.5)*0.30);

        addDebrisBody(a); addDebrisBody(b);
      } else {
        const hh = h/2;
        const pw = w;
        const offset = h/4;

        const p1 = state.Vector.add(pos, state.Vector.mult(down, -offset));
        const p2 = state.Vector.add(pos, state.Vector.mult(down, +offset));

        const a = makePiece(p1.x, p1.y, pw*0.95, hh*0.95, angle, body);
        const b = makePiece(p2.x, p2.y, pw*0.95, hh*0.95, angle, body);

        a.__breakStage = 1; b.__breakStage = 1;
        a.__hp = state.DMG.hpStage1;
        b.__hp = state.DMG.hpStage1;

        state.Body.setVelocity(a, { x: baseVel.x + (Math.random()-0.5)*1.4, y: baseVel.y + (Math.random()-0.5)*1.4 });
        state.Body.setVelocity(b, { x: baseVel.x + (Math.random()-0.5)*1.4, y: baseVel.y + (Math.random()-0.5)*1.4 });
        state.Body.setAngularVelocity(a, baseAV + (Math.random()-0.5)*0.30);
        state.Body.setAngularVelocity(b, baseAV + (Math.random()-0.5)*0.30);

        addDebrisBody(a); addDebrisBody(b);
      }

      state.stats.broken += 1;
      state.stats.score += 12;
      state.updateHUD();
      return;
    }

    // stage === 1 -> quarters
    const qw = w/2;
    const qh = h/2;
    const ox = w/4;
    const oy = h/4;

    const offsets = [
      state.Vector.add(state.Vector.mult(right, -ox), state.Vector.mult(down, -oy)),
      state.Vector.add(state.Vector.mult(right, +ox), state.Vector.mult(down, -oy)),
      state.Vector.add(state.Vector.mult(right, -ox), state.Vector.mult(down, +oy)),
      state.Vector.add(state.Vector.mult(right, +ox), state.Vector.mult(down, +oy))
    ];

    for (const off of offsets){
      const p = state.Vector.add(pos, off);
      const piece = makePiece(p.x, p.y, qw*0.92, qh*0.92, angle, body);
      piece.__breakStage = 2;
      piece.__hp = state.DMG.hpStage2;

      state.Body.setVelocity(piece, { x: baseVel.x + (Math.random()-0.5)*2.0, y: baseVel.y + (Math.random()-0.5)*2.0 });
      state.Body.setAngularVelocity(piece, baseAV + (Math.random()-0.5)*0.45);
      addDebrisBody(piece);
    }

    state.stats.broken += 1;
    state.stats.score += 16;
    state.updateHUD();
  }

  function impactEnergy(bodyA, bodyB){
    const rv = state.Vector.sub(bodyA.velocity, bodyB.velocity);
    const rel = state.Vector.magnitude(rv);
    const massRef = (state.bird && (bodyA === state.bird || bodyB === state.bird)) ? state.bird.mass : Math.min(bodyA.mass||1, bodyB.mass||1);
    return 0.5 * massRef * rel * rel;
  }

  function tryBreak(body, energy, fromBird){
    if (!body || !body.__type) return;
    if (body.isStatic) return;

    const allow = (fromBird === true) || (state.superActive === true);
    if (!allow) return;

    const mult = state.superActive ? state.DMG.superMultiplier : 1.0;
    const e = energy * mult;
    if (e < state.DMG.minHitEnergy) return;

    const dmg = e * state.DMG.dmgK;
    body.__hp = (typeof body.__hp === "number" ? body.__hp : state.DMG.hpStage0) - dmg;

    if (body.__hp > 0) return;
    splitBodyByStage(body);
  }

  return { addDebrisBody, copyRenderMeta, makePiece, splitBodyByStage, impactEnergy, tryBreak };
}
