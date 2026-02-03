export function createSlingshot(state){
  const { World, Constraint } = state;

  function setupSlingshot(){
    const start = state.bird.__start;
    state.slingAnchor = { x:start.x, y:start.y };
    state.slingshot = Constraint.create({
      pointA: { x:state.slingAnchor.x, y:state.slingAnchor.y },
      bodyB: state.bird,
      stiffness: 0.035,
      damping: 0.06,
      length: 0,
      render: { visible: state.DEBUG }
    });
    World.add(state.world, state.slingshot);
  }

  function detachSlingshot(){
    if (!state.slingshot) return;
    World.remove(state.world, state.slingshot);
    state.slingshot = null;
  }

  return { setupSlingshot, detachSlingshot };
}
