export function createUpdateLoop(state){
  function bindUpdateLoop(){
    state.Events.on(state.engine, "beforeUpdate", ()=>{
      const baseY = (typeof state.ground !== "undefined" && state.ground)
      ? (state.ground.position.y - state.LEVEL.floorHeight/2)
      : (window.innerHeight - state.LEVEL.floorHeight);

      // debris cleanup
      for (let i = state.debris.length - 1; i >= 0; i--){
        const d = state.debris[i];
        const body = d.body;
        if (!body){ state.debris.splice(i,1); continue; }

        const sp = state.Vector.magnitude(body.velocity);
        d.stillFrames = (sp < state.DEBRIS.minSpeedToCountStill) ? (d.stillFrames + 1) : 0;

        if (Date.now() > d.ttl || d.stillFrames >= state.DEBRIS.stillFramesToVanish){
          state.World.remove(state.world, body);
          state.debris.splice(i,1);
        }
      }

      // bird smooth flight
      if (state.bird && state.birdLaunched){
        const v = state.bird.velocity;
        const speed = Math.hypot(v.x, v.y);
        if (speed > state.FLIGHT.maxSpeed){
          const k = state.FLIGHT.maxSpeed / speed;
          state.Body.setVelocity(state.bird, { x: v.x * k, y: v.y * k });
        }
        const av = state.bird.angularVelocity || 0;
        if (Math.abs(av) > state.FLIGHT.maxAngular){
          state.Body.setAngularVelocity(state.bird, Math.sign(av) * state.FLIGHT.maxAngular);
        }
        if (speed < 1.1){
          state.bird.frictionAir = state.lerp(state.bird.frictionAir, state.FLIGHT.settleFrictionAir, 0.06);
        }
      }

      // shake decay
      if (state.shakeTime > 0){
        state.shakeTime -= 1;
        state.shakeMag = state.lerp(state.shakeMag, 0, 0.22);
      }

      // super fade
      if (state.superActive){
        state.superDim = state.lerp(state.superDim, state.SUPER_VISUAL.dimTarget, 0.10);
        state.superAuraPulse = state.lerp(state.superAuraPulse, 1.0, 0.10);
      } else {
        state.superDim = state.lerp(state.superDim, 0.0, 0.12);
        state.superAuraPulse = state.lerp(state.superAuraPulse, 0.0, 0.12);
      }
      if (state.superBannerFrames > 0) state.superBannerFrames -= 1;

      // SUPER: скин + качание + аура ударов
      if (state.superActive && state.bird && state.birdLaunched){
        state.superPulseT += 1;
        state.setBirdSuper();

        const swing = Math.sin(state.superPulseT * 0.24) * 0.55;
        const targetAngle = state.birdSwingBaseAngle + swing;
        state.Body.setAngularVelocity(state.bird, 0);
        state.Body.setAngle(state.bird, targetAngle);

        if ((state.superPulseT % state.DMG.superAuraTickEvery) === 0){
          const bodies = state.Composite.allBodies(state.world);
          const r = state.DMG.superAuraRadius;
          const r2 = r*r;

          for (const obj of bodies){
            if (!obj || obj === state.bird) continue;
            if (!obj.__type) continue;

            const dx = obj.position.x - state.bird.position.x;
            const dy = obj.position.y - state.bird.position.y;
            const dist2 = dx*dx + dy*dy;
            if (dist2 > r2) continue;

            const t = 1 - (Math.sqrt(dist2) / r);
            const bonusEnergy = state.DMG.superAuraEnergyPerTick * (0.35 + 0.65*t);

            state.tryBreak(obj, bonusEnergy, false);

            if (!obj.isStatic){
              const dir = state.Vector.normalise({x:dx, y:dy});
              state.Body.applyForce(obj, obj.position, { x: dir.x * 0.016 * t, y: dir.y * 0.016 * t });
            }
          }
        }
      }

      // camera during drag (keep as before)
      if (state.draggingBird && !state.birdLaunched){
        state.camera.tx = state.camera.cx; state.camera.ty = state.camera.cy; state.camera.tzoom = state.camera.zoom;
        state.applyCamera(false);
        return;
      }

      // ✅ base follow
      const followZoom = (state.bird && state.birdLaunched) ? 1.10 : 0.86;

      let baseTx, baseTy;
      if (state.bird && state.birdLaunched){
        baseTx = state.bird.position.x + 280;
        baseTy = state.bird.position.y - 140;
      } else {
        baseTx = 900;
        baseTy = baseY - 300;
      }

      // ✅ pan hold/decay: if user recently panned, keep; otherwise slowly return to 0
      if (state.camera.panHoldFrames > 0){
        state.camera.panHoldFrames -= 1;
      } else {
        state.camera.panX = state.lerp(state.camera.panX, 0, 0.045);
        state.camera.panY = state.lerp(state.camera.panY, 0, 0.045);
        if (Math.abs(state.camera.panX) < 0.15) state.camera.panX = 0;
        if (Math.abs(state.camera.panY) < 0.15) state.camera.panY = 0;
      }

      state.camera.tx = baseTx + state.camera.panX;
      state.camera.ty = baseTy + state.camera.panY;
      state.camera.tzoom = followZoom * state.camera.userZoom;

      state.applyCamera(false);
      state.refreshSuperButtonVisibility();
    });
  }

  return { bindUpdateLoop };
}
