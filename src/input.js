// Camera-relative keyboard axes. At yaw zero the view faces +Z and screen-right is -X.
export function keyboardMove(keys){
  return [Number(keys.has('a'))-Number(keys.has('d')),Number(keys.has('w'))-Number(keys.has('s'))];
}
