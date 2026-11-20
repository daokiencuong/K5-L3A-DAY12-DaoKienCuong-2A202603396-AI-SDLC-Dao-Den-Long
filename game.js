import * as THREE from 'three';
import { Simulation, TUNING } from './src/sim.js';
import { keyboardMove } from './src/input.js';

export function startGame(onUpdate) {
  const canvas = document.querySelector('#world');
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#101a28');
  scene.fog = new THREE.FogExp2('#111b28', .012);
  const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 150);
  scene.add(new THREE.HemisphereLight('#dbe7ff', '#203027', 2.1));
  const moon = new THREE.DirectionalLight('#c8d7f0', 2.2);
  moon.position.set(-18, 32, -12);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -38; moon.shadow.camera.right = 38;
  moon.shadow.camera.top = 38; moon.shadow.camera.bottom = -38;
  scene.add(moon);
  const warmFill = new THREE.PointLight('#f0bd69', 85, 50, 2);
  scene.add(warmFill);

  const sim = new Simulation(12026);
  const clock = new THREE.Clock();
  const keys = new Set();
  const queued = {interact: false, pulse: false, jump: false};
  const moteMeshes = new Map(), shadeMeshes = new Map(), lanternMeshes = [];
  let yaw = 0, cameraDistance = 17, accumulator = 0, elapsed = 0;
  let drag = null, raf = 0, stopped = false, gameEnded = false;
  let toastText = '', toastId = 0;

  const material = (color, roughness = .82, metalness = 0, extra = {}) =>
    new THREE.MeshStandardMaterial({color, roughness, metalness, ...extra});
  const mats = {
    grass: material('#334838'), grassLight: material('#536349'), rock: material('#59606a'),
    wood: material('#513d31'), gold: material('#c3924d', .42, .38), iron: material('#454954', .38, .62),
    cloth: material('#d8c9a7'), skin: material('#edc995'), hat: material('#a94f43'),
    shadow: new THREE.MeshBasicMaterial({color:'#080d12',transparent:true,opacity:.31}),
    shade: material('#241b36',.3,.08), shadeGlow: material('#8c6aba',.24,.1,{emissive:'#472b76',emissiveIntensity:.9}),
    mote: material('#b4efff',.24,.1,{emissive:'#75dfff',emissiveIntensity:2.2}),
    flame: material('#ffcf70',.25,0,{emissive:'#ff9d30',emissiveIntensity:2.6}),
    unlit: material('#313844',.55,.25), water: material('#111c2a',.36,.22)
  };
  const addMesh = (geometry, mat, parent = scene, cast = true, receive = true) => {
    const object = new THREE.Mesh(geometry, mat);
    object.castShadow = cast; object.receiveShadow = receive; parent.add(object); return object;
  };
  function glowSprite(color) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64,64,1,64,64,64);
    g.addColorStop(0,color+'aa'); g.addColorStop(.22,color+'55'); g.addColorStop(1,color+'00');
    x.fillStyle = g; x.fillRect(0,0,128,128);
    return new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  }
  const moteHalo = glowSprite('#82eaff'), fireHalo = glowSprite('#ffc366'), shadeHalo = glowSprite('#9066ce');

  // A round garden island floating over a softly lit cloud sea.
  const sea = addMesh(new THREE.PlaneGeometry(260,260), mats.water);
  sea.rotation.x = -Math.PI / 2; sea.position.y = -2.3;
  const island = addMesh(new THREE.CylinderGeometry(30,30.8,1.35,80), material('#32463d',.98));
  island.position.y = -.58;
  const top = addMesh(new THREE.CircleGeometry(29.9,80), material('#43513e',1));
  top.rotation.x = -Math.PI / 2; top.position.y = .1;
  const rim = addMesh(new THREE.TorusGeometry(30,.48,10,96), material('#718076',.92));
  rim.rotation.x = Math.PI / 2; rim.position.y = -.43;
  const cloudMat = new THREE.MeshStandardMaterial({color:'#728091',roughness:1,transparent:true,opacity:.23,depthWrite:false});
  for (let i=0;i<16;i++) {
    const a=i*Math.PI/8,r=36+Math.sin(i*3)*2;
    const cloud=addMesh(new THREE.SphereGeometry(1,12,8),cloudMat,scene,false,false);
    cloud.scale.set(6+Math.sin(i)*2,1.2,3.2); cloud.position.set(Math.cos(a)*r,-1.8,Math.sin(a)*r);
  }
  let seed=7331;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<46;i++){
    const a=i*2.399,r=5+random()*22,x=Math.cos(a)*r,z=Math.sin(a)*r,size=.22+random()*.42;
    const rock=addMesh(new THREE.DodecahedronGeometry(size,0),i%4===0?mats.rock:mats.grassLight);
    rock.position.set(x,size*.45,z);rock.rotation.set(random(),random()*3,random());
    if(i%3===0){const bush=addMesh(new THREE.IcosahedronGeometry(size*1.3,0),mats.grass);bush.position.set(x,size*.55,z)}
  }

  for(const lantern of sim.lanterns){
    const group=new THREE.Group();group.position.set(lantern.pos[0],0,lantern.pos[2]);scene.add(group);
    const base=addMesh(new THREE.CylinderGeometry(.6,.72,.22,8),mats.iron,group);base.position.y=.12;
    const post=addMesh(new THREE.CylinderGeometry(.12,.17,2.05,8),mats.wood,group);post.position.y=1.17;
    const collar=addMesh(new THREE.TorusGeometry(.44,.08,8,12),mats.gold,group);collar.position.y=2.02;
    const basket=addMesh(new THREE.OctahedronGeometry(.66,0),mats.unlit,group);basket.position.y=2.55;basket.scale.y=1.18;
    const core=addMesh(new THREE.SphereGeometry(.27,12,10),mats.unlit,group);core.position.y=2.55;
    const cap=addMesh(new THREE.ConeGeometry(.62,.43,8),mats.wood,group);cap.position.y=3.15;
    const aura=new THREE.Sprite(fireHalo);aura.scale.set(8,8,1);aura.position.y=2.45;group.add(aura);aura.visible=false;
    const light=new THREE.PointLight('#ffbf60',0,11,2);light.position.y=2.5;group.add(light);
    lanternMeshes.push({group,basket,core,aura,light,lantern});
  }

  const playerRoot=new THREE.Group();scene.add(playerRoot);
  const playerShadow=addMesh(new THREE.CircleGeometry(.75,24),mats.shadow,playerRoot,false,false);playerShadow.rotation.x=-Math.PI/2;playerShadow.position.y=.04;
  const robe=addMesh(new THREE.ConeGeometry(.58,1.15,9),mats.cloth,playerRoot);robe.position.y=.78;
  const sash=addMesh(new THREE.TorusGeometry(.34,.055,6,16),mats.gold,playerRoot);sash.position.y=.57;sash.rotation.x=Math.PI/2;
  const head=addMesh(new THREE.SphereGeometry(.31,18,14),mats.skin,playerRoot);head.position.y=1.58;
  const face=addMesh(new THREE.SphereGeometry(.09,12,10),material('#45312c'),playerRoot,false,false);face.scale.set(1,.55,.3);face.position.set(0,1.57,.28);
  const hat=addMesh(new THREE.ConeGeometry(.74,.27,12),mats.hat,playerRoot);hat.position.y=1.89;
  const hatBand=addMesh(new THREE.TorusGeometry(.31,.035,6,16),mats.gold,playerRoot);hatBand.position.y=1.83;hatBand.rotation.x=Math.PI/2;
  const handLantern=new THREE.Group();handLantern.position.set(.48,1.08,.1);playerRoot.add(handLantern);
  const handLoop=addMesh(new THREE.TorusGeometry(.19,.035,6,12),mats.gold,handLantern,false,false);handLoop.position.y=.16;
  const handCore=addMesh(new THREE.OctahedronGeometry(.19,0),mats.flame,handLantern,false,false);handCore.position.y=-.02;
  const handLight=new THREE.PointLight('#ffca71',2.2,4,2);handLantern.add(handLight);

  function addMote(item){
    const group=new THREE.Group();scene.add(group);addMesh(new THREE.IcosahedronGeometry(.22,1),mats.mote,group,false,false);
    const halo=new THREE.Sprite(moteHalo);halo.scale.set(2.3,2.3,1);group.add(halo);
    moteMeshes.set(item.id,{root:group,item});
  }
  function addShade(item){
    const group=new THREE.Group();scene.add(group);const body=addMesh(new THREE.SphereGeometry(.6,16,12),mats.shade,group);body.scale.set(.9,1.05,.78);
    const tail=addMesh(new THREE.ConeGeometry(.35,.7,9),mats.shade,group);tail.position.set(0,-.68,-.08);tail.rotation.x=Math.PI;
    const eyes=material('#dfb8ff',.3,0,{emissive:'#bb81f2',emissiveIntensity:1.6});
    for(const x of [-.19,.19]){const eye=addMesh(new THREE.SphereGeometry(.055,8,8),eyes,group,false,false);eye.position.set(x,.12,.5)}
    const aura=new THREE.Sprite(shadeHalo);aura.scale.set(3.6,3.6,1);group.add(aura);shadeMeshes.set(item.id,{root:group,body});
  }
  sim.motes.forEach(addMote);sim.shades.forEach(addShade);

  function hudState(){return{
    score:sim.score,timeLeft:sim.timeLeft,flames:sim.player.flames,carried:sim.player.carried,
    lit:sim.lanterns.filter(x=>x.lit).length,cooldown:sim.cooldown,
    shades:sim.shades.map(x=>({id:x.id,state:x.state,pos:[...x.pos]})),
    lanterns:sim.lanterns.map(x=>({id:x.id,lit:x.lit,pos:[...x.pos]})),
    player:[...sim.player.pos],toast:toastText,
    result:sim.state==='playing'?null:{state:sim.state,score:sim.score}
  }}
  function updateHud(){onUpdate(hudState())}
  function showToast(text){toastText=text;const id=++toastId;updateHud();setTimeout(()=>{if(id===toastId){toastText='';updateHud()}},1900)}
  function events(){
    let changed=false;
    for(const event of sim.events){
      if(event.name==='mote_picked'){showToast('Đom đóm thu thập được · +10');changed=true}
      if(event.name==='lantern_lit'){showToast(`${event.data.lantern_id} đã bừng sáng · +100`);changed=true}
      if(event.name==='player_hit'){showToast('Bóng Mực chạm phải Mây!');changed=true}
      if(event.name==='pulse'&&event.data.stunned_ids.length){showToast('Ánh sáng xua Bóng Mực!');changed=true}
      if(event.name==='shade_spawned'){const shade=sim.shades.find(x=>x.id===event.data.id);if(shade)addShade(shade)}
      if(event.name==='game_over')changed=true;
    }
    sim.events.length=0;return changed;
  }
  function action(key){if(key==='e')queued.interact=true;else if(key==='f')queued.pulse=true;else if(key===' ')queued.jump=true}
  function onAction(event){action(event.detail)}
  function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
  function keyDown(event){
    const key=event.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))event.preventDefault();
    if(!keys.has(key)){if(key==='e'||key==='f'||key===' ')action(key)}keys.add(key);
  }
  function keyUp(event){keys.delete(event.key.toLowerCase())}
  function pointerDown(event){drag={x:event.clientX,yaw};canvas.setPointerCapture(event.pointerId)}
  function pointerMove(event){if(drag)yaw=drag.yaw+(event.clientX-drag.x)*.004}
  function pointerUp(){drag=null}
  function wheel(event){cameraDistance=THREE.MathUtils.clamp(cameraDistance+event.deltaY*.012,11,24)}
  window.addEventListener('game-action',onAction);window.addEventListener('resize',resize);
  window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('wheel',wheel,{passive:true});

  function animate(){
    if(stopped)return;raf=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;
    if(!gameEnded){
      accumulator+=dt;
      while(accumulator>=1/60){
        // View basis: at yaw zero the camera faces +Z; screen-right is -X.
        const move=keyboardMove(keys);
        sim.step({move,cam_yaw_deg:yaw*180/Math.PI,...queued});
        queued.interact=false;queued.pulse=false;queued.jump=false;
        const changed=events();accumulator-=1/60;
        if(changed||sim.tick%6===0)updateHud();
        if(sim.state!=='playing'){gameEnded=true;updateHud();break}
      }
    }
    playerRoot.position.set(sim.player.pos[0],sim.jump>0?Math.sin(sim.jump/.55*Math.PI)*.9:0,sim.player.pos[2]);
    playerRoot.rotation.y=yaw;playerRoot.scale.setScalar(sim.invulnerable>0&&Math.floor(elapsed*14)%2===0?.72:1);
    for(const item of lanternMeshes){const active=item.lantern.lit;item.basket.material=active?mats.flame:mats.unlit;item.core.material=active?mats.flame:mats.unlit;item.aura.visible=active;item.light.intensity=active?5.5:0;item.group.scale.setScalar(1+Math.sin(elapsed*2+item.lantern.pos[0])*.012)}
    for(const [id,item]of moteMeshes){const mote=sim.motes.find(x=>x.id===id);if(!mote){scene.remove(item.root);moteMeshes.delete(id);continue}item.root.position.set(mote.pos[0],.9+Math.sin(elapsed*2+id.length)*.18,mote.pos[2]);item.root.rotation.y=elapsed*.7}
    for(const [id,item]of shadeMeshes){const shade=sim.shades.find(x=>x.id===id);if(!shade){scene.remove(item.root);shadeMeshes.delete(id);continue}item.root.position.set(shade.pos[0],.7+Math.sin(elapsed*3+shade.pos[0])*.13,shade.pos[2]);item.root.rotation.y=Math.atan2(sim.player.pos[0]-shade.pos[0],sim.player.pos[2]-shade.pos[2]);item.body.material=shade.state==='stunned'?mats.shadeGlow:mats.shade}
    camera.position.set(sim.player.pos[0]-Math.sin(yaw)*cameraDistance,8.5,sim.player.pos[2]-Math.cos(yaw)*cameraDistance);camera.lookAt(sim.player.pos[0],1.15,sim.player.pos[2]);warmFill.position.set(sim.player.pos[0],8,sim.player.pos[2]);renderer.render(scene,camera);
  }
  updateHud();animate();
  return ()=>{
    stopped=true;cancelAnimationFrame(raf);window.removeEventListener('game-action',onAction);window.removeEventListener('resize',resize);
    window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);
    canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('wheel',wheel);
    renderer.dispose();
  };
}
