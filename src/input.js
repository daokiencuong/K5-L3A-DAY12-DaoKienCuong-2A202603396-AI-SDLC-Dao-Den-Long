// Camera-relative keyboard axes. At yaw zero the view faces +Z and screen-right is -X.
export const DEFAULT_BINDINGS={forward:'w',back:'s',left:'a',right:'d',jump:'space',dash:'shift',interact:'e',pulse:'f',pause:'escape'};
export function keyboardMove(keys,bindings=DEFAULT_BINDINGS){
  return [Number(keys.has(bindings.left))-Number(keys.has(bindings.right)),Number(keys.has(bindings.forward))-Number(keys.has(bindings.back))];
}
