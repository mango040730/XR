// Ground planters follow the closed backs and side edges of the lounges.
// Positions are authored in world space so turning a sofa cannot move a pot
// across an entrance or the split-level pedestrian route.
export const CENTRAL_PLANTER_LAYOUT = Object.freeze({
  'tiered-forum': [{x:-5.6,z:-8.45,angle:-.25}],
  'grand-lounge': [{x:-8.38,z:6.1,angle:.8}],
  'reading-nook': [{x:-9.85,z:.45,angle:-1.15}],
  's-curve-meeting': [{x:5.25,z:-1.65,angle:-.65},{x:4.3,z:4.5,angle:.45}],
  'conversation-nook': [{x:10.1,z:3.65,angle:1.1}],
  'front': [{x:3.6,z:9.4,angle:-.35}],
});
