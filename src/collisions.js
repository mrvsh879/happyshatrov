export function createCollisions(state){
  function processCollisionPairs(pairs){
    if (!state.structure.activated) return;

    for (const pair of pairs){
      const a = pair.bodyA, b = pair.bodyB;
      const energy = state.impactEnergy(a, b);

      if (energy >= state.DMG.shakeEnergyThreshold) state.triggerShake(energy);

      if (state.bird && (a === state.bird || b === state.bird)){
        const other = (a === state.bird) ? b : a;
        state.tryBreak(other, energy, true);
      }
    }
  }

  function bindCollisions(){
    state.Events.on(state.engine, "collisionStart", (event)=>{
      processCollisionPairs(event.pairs);
    });

    state.Events.on(state.engine, "collisionActive", (event)=>{
      for (const pair of event.pairs){
        const energy = state.impactEnergy(pair.bodyA, pair.bodyB) * 0.12;
        if (energy >= state.DMG.shakeEnergyThreshold) state.triggerShake(energy);
      }
    });
  }

  return { processCollisionPairs, bindCollisions };
}
