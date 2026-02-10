import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const overlay = document.getElementById('overlay');
const overlayContent = document.getElementById('overlayContent');
let startBtn = document.getElementById('startBtn');
const hudText = document.getElementById('hudText');
// =============================================================================
// Level 1 Music + Volume Controls
// =============================================================================
const natureSound = new Audio('naturesound.mp3');
const musicSound = new Audio('Music.mp3');
[natureSound, musicSound].forEach((a) => {
  a.loop = true;
  a.volume = 0.6;
});

const audioControls = document.createElement('div');
audioControls.style.position = 'fixed';
audioControls.style.right = '12px';
audioControls.style.top = '12px';
audioControls.style.zIndex = '2';
audioControls.style.background = 'rgba(0,0,0,0.55)';
audioControls.style.padding = '8px 12px';
audioControls.style.border = '2px solid rgba(255,255,255,0.2)';
audioControls.style.borderRadius = '8px';
audioControls.style.fontFamily = 'VT323, monospace';
audioControls.style.fontSize = '18px';
audioControls.style.display = 'none';
audioControls.innerHTML = `
  <div style="margin-bottom:6px;">
    Music volume
    <input id="musicVol" type="range" min="0" max="1" step="0.01" value="0.6" style="width:120px;">
  </div>
  <div>
    Nature sound volume
    <input id="natureVol" type="range" min="0" max="1" step="0.01" value="0.6" style="width:120px;">
  </div>
`;
document.body.appendChild(audioControls);

const musicVol = audioControls.querySelector('#musicVol');
const natureVol = audioControls.querySelector('#natureVol');
musicVol.addEventListener('input', () => (musicSound.volume = Number(musicVol.value)));
natureVol.addEventListener('input', () => (natureSound.volume = Number(natureVol.value)));

function setAudioControlsVisible(flag) {
  audioControls.style.display = flag ? 'block' : 'none';
}

function startLevel1Audio() {
  natureSound.play().catch(() => {});
  musicSound.play().catch(() => {});
}

function stopLevel1Audio() {
  natureSound.pause();
  musicSound.pause();
  natureSound.currentTime = 0;
  musicSound.currentTime = 0;
}
const overlayDefaultHTML = overlayContent.innerHTML;
const overlayDefaultClass = overlayContent.className;

let introAccepted = false;

function bindStartButton() {
  startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.onclick = handleStartClick;
}

function restoreOverlayCard() {
  overlayContent.className = overlayDefaultClass;
  overlayContent.style.background = '';
  overlayContent.style.boxShadow = '';
  overlayContent.style.padding = '';
  overlayContent.innerHTML = overlayDefaultHTML;
  bindStartButton();
}

function handleStartClick() {
  if (!introAccepted) {
    resetToForest();
    showIntroLetter();
    return;
  }
  renderer.domElement.requestPointerLock();
}

bindStartButton();

const hint = document.createElement('div');
hint.style.position = 'fixed';
hint.style.left = '50%';
hint.style.top = '18%';
hint.style.transform = 'translateX(-50%)';
hint.style.padding = '10px 16px';
hint.style.background = 'rgba(0,0,0,0.6)';
hint.style.color = '#fff';
hint.style.border = '1px solid rgba(255,255,255,0.2)';
hint.style.borderRadius = '10px';
hint.style.fontFamily = 'VT323, monospace';
hint.style.fontSize = '20px';
hint.style.zIndex = '4';
hint.style.opacity = '0';
hint.style.pointerEvents = 'none';
hint.style.transition = 'opacity 0.3s ease';
document.body.appendChild(hint);

function showHint(text, duration = 2000) {
  hint.textContent = text;
  hint.style.opacity = '1';
  if (duration > 0) {
    setTimeout(() => {
      hint.style.opacity = '0';
    }, duration);
  }
}

const WORLD_SIZE = 320;
const GROUND_Y = 0;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.45;
const MOVE_SPEED = 7.5;
const JUMP_SPEED = 6.8;
const GRAVITY = -18.0;

const LEVEL1_SKY = new THREE.Color(0xc9d4ff);
const LEVEL1_FOG = new THREE.Color(0xf2c0c8);
const BEACH = {
  centerZ: -120,
  width: 140,
  depth: 80,
  seaDepth: 90
};

const FOREST_TARGET = 10;
const ISTANBUL_TARGET = 10;

const ISTANBUL = {
  origin: new THREE.Vector3(0, 0, 0),
  length: 140,
  roadWidth: 18,
  sidewalk: 4,
  buildingDepth: 10
};

const lanternSound = new Audio('lantern-show.mp3');
lanternSound.loop = true;
lanternSound.volume = 0.7;

const LANTERN_DURATION = 132;
let lanternShowActive = false;
let lanternShowDone = false;
let lanternShowTimer = 0;
const lanterns = [];

const lanternPaperMat = new THREE.MeshStandardMaterial({
  color: 0xfff4c7,
  emissive: 0xffc85a,
  emissiveIntensity: 3.2,
  transparent: true,
  opacity: 0.9
});

const lanternGlowMat = new THREE.SpriteMaterial({
  color: 0xffd27a,
  transparent: true,
  opacity: 0.95,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

let introLetterActive = false;
let beachIntroActive = false;
let beachIntroTimer = 0;
let beachGroup = null;
let beachSea = null;
let beachSeaBase = null;
let beachBoat = null;
let beachBoatBaseY = 0;
let beachStick = null;
let beachClouds = [];
let sunHome = null;

const BAKERY = {
  x: -70,
  z: 40,
  width: 16,
  depth: 12,
  height: 9
};
let bakeryGroup = null;
let bakeryDoorPivot = null;
let bakeryDoorTarget = 0;
let bakeryBoy = null;
let bakeryBubble = null;
let bakeryBubbleTimer = 0;
let bakeryInShop = false;

let inIstanbul = false;
let istanbulGroup = null;
let starField = null;
let stageLocked = false;

let heartsCollected = 0;
let levelStartTime = 0;
let paused = true;
let pointerLocked = false;
let thirdPerson = false;
let pauseStart = null;

const keys = {};
// =============================================================================
// Touch Controls (Mobile)
// =============================================================================
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

if (isTouchDevice) {
  document.body.style.touchAction = 'none';

  const touchUI = document.createElement('div');
  touchUI.style.position = 'fixed';
  touchUI.style.inset = '0';
  touchUI.style.pointerEvents = 'none';
  touchUI.style.zIndex = '2';
  document.body.appendChild(touchUI);

  // Left joystick
  const leftBase = document.createElement('div');
  const leftStick = document.createElement('div');
  leftBase.style.position = 'absolute';
  leftBase.style.left = '5%';
  leftBase.style.bottom = '10%';
  leftBase.style.width = '120px';
  leftBase.style.height = '120px';
  leftBase.style.borderRadius = '50%';
  leftBase.style.background = 'rgba(255,255,255,0.08)';
  leftBase.style.border = '1px solid rgba(255,255,255,0.2)';
  leftBase.style.pointerEvents = 'auto';

  leftStick.style.position = 'absolute';
  leftStick.style.left = '50%';
  leftStick.style.top = '50%';
  leftStick.style.width = '52px';
  leftStick.style.height = '52px';
  leftStick.style.marginLeft = '-26px';
  leftStick.style.marginTop = '-26px';
  leftStick.style.borderRadius = '50%';
  leftStick.style.background = 'rgba(255,255,255,0.25)';
  leftStick.style.border = '1px solid rgba(255,255,255,0.35)';
  leftBase.appendChild(leftStick);

  // Right look pad
  const rightPad = document.createElement('div');
  rightPad.style.position = 'absolute';
  rightPad.style.right = '5%';
  rightPad.style.bottom = '10%';
  rightPad.style.width = '140px';
  rightPad.style.height = '140px';
  rightPad.style.borderRadius = '50%';
  rightPad.style.background = 'rgba(255,255,255,0.05)';
  rightPad.style.border = '1px solid rgba(255,255,255,0.2)';
  rightPad.style.pointerEvents = 'auto';

  // Jump button
  const jumpBtn = document.createElement('div');
  jumpBtn.textContent = 'JUMP';
  jumpBtn.style.position = 'absolute';
  jumpBtn.style.right = '6%';
  jumpBtn.style.bottom = '30%';
  jumpBtn.style.width = '80px';
  jumpBtn.style.height = '80px';
  jumpBtn.style.borderRadius = '50%';
  jumpBtn.style.background = 'rgba(255,77,141,0.8)';
  jumpBtn.style.border = '2px solid rgba(255,255,255,0.4)';
  jumpBtn.style.color = '#fff';
  jumpBtn.style.fontFamily = 'VT323, monospace';
  jumpBtn.style.fontSize = '18px';
  jumpBtn.style.display = 'flex';
  jumpBtn.style.alignItems = 'center';
  jumpBtn.style.justifyContent = 'center';
  jumpBtn.style.pointerEvents = 'auto';

  touchUI.appendChild(leftBase);
  touchUI.appendChild(rightPad);
  touchUI.appendChild(jumpBtn);

  const moveState = { active: false, x: 0, y: 0, cx: 0, cy: 0 };
  const lookState = { active: false, x: 0, y: 0 };

  function setMoveKeys(x, y) {
    const dead = 0.2;
    keys['KeyW'] = y < -dead;
    keys['ArrowUp'] = keys['KeyW'];
    keys['KeyS'] = y > dead;
    keys['ArrowDown'] = keys['KeyS'];
    keys['KeyA'] = x < -dead;
    keys['ArrowLeft'] = keys['KeyA'];
    keys['KeyD'] = x > dead;
    keys['ArrowRight'] = keys['KeyD'];
  }

  leftBase.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    moveState.active = true;
    moveState.cx = t.clientX;
    moveState.cy = t.clientY;
  }, { passive: true });

  leftBase.addEventListener('touchmove', (e) => {
    if (!moveState.active) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - moveState.cx;
    const dy = t.clientY - moveState.cy;
    const max = 45;
    const clampedX = Math.max(-max, Math.min(max, dx));
    const clampedY = Math.max(-max, Math.min(max, dy));
    leftStick.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    moveState.x = clampedX / max;
    moveState.y = clampedY / max;
    setMoveKeys(moveState.x, moveState.y);
  }, { passive: true });

  leftBase.addEventListener('touchend', () => {
    moveState.active = false;
    moveState.x = 0;
    moveState.y = 0;
    leftStick.style.transform = 'translate(0, 0)';
    setMoveKeys(0, 0);
  }, { passive: true });

  rightPad.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    lookState.active = true;
    lookState.x = t.clientX;
    lookState.y = t.clientY;
  }, { passive: true });

  rightPad.addEventListener('touchmove', (e) => {
    if (!lookState.active) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - lookState.x;
    const dy = t.clientY - lookState.y;
    lookState.x = t.clientX;
    lookState.y = t.clientY;
    const sensitivity = 0.004;
    yaw -= dx * sensitivity;
    pitch -= dy * sensitivity;
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
  }, { passive: true });

  rightPad.addEventListener('touchend', () => {
    lookState.active = false;
  }, { passive: true });

  jumpBtn.addEventListener('touchstart', () => {
    keys['Space'] = true;
  }, { passive: true });

  jumpBtn.addEventListener('touchend', () => {
    keys['Space'] = false;
  }, { passive: true });

  document.addEventListener('touchstart', () => {
    if (overlay.style.display === 'none') {
      pointerLocked = true;
      paused = false;
    }
  }, { passive: true });
}

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyV') thirdPerson = !thirdPerson;
});
window.addEventListener('keyup', (e) => (keys[e.code] = false));

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = LEVEL1_SKY;
scene.fog = new THREE.Fog(LEVEL1_FOG, 90, 300);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
scene.add(camera);

const ambient = new THREE.HemisphereLight(0xdce8ff, 0x4a5a3a, 0.5);
scene.add(ambient);

const sunGroup = new THREE.Group();
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(6, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xfff2c4 })
);
sunMesh.position.set(-160, 150, 40);
sunGroup.add(sunMesh);
scene.add(sunGroup);
sunHome = sunMesh.position.clone();

const sunLight = new THREE.DirectionalLight(0xffd1a3, 1.4);
sunLight.position.copy(sunMesh.position);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 600;
sunLight.shadow.camera.left = -200;
sunLight.shadow.camera.right = 200;
sunLight.shadow.camera.top = 200;
sunLight.shadow.camera.bottom = -200;
scene.add(sunLight);

sunLight.target.position.set(0, 0, 0);
scene.add(sunLight.target);

function createBeachScene() {
  if (beachGroup) return;
  beachGroup = new THREE.Group();

  const sandMat = new THREE.MeshStandardMaterial({ color: 0xe6c28a, roughness: 1 });
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0x5aa9c9,
    transparent: true,
    opacity: 0.85,
    roughness: 0.35,
    metalness: 0.05
  });

  const sand = new THREE.Mesh(new THREE.PlaneGeometry(BEACH.width, BEACH.depth), sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, BEACH.centerZ);
  beachGroup.add(sand);

  const seaGeo = new THREE.PlaneGeometry(BEACH.width * 1.2, BEACH.seaDepth, 36, 10);
  seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.position.set(0, 0.01, BEACH.centerZ - BEACH.depth / 2 - BEACH.seaDepth / 2);
  beachSea = sea;
  beachSeaBase = seaGeo.attributes.position.array.slice();
  beachGroup.add(sea);

  const boat = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 0.6), hullMat);
  hull.position.y = 0.15;
  boat.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), hullMat);
  mast.position.y = 0.75;
  boat.add(mast);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), sailMat);
  sail.position.set(0.35, 0.8, 0);
  sail.rotation.y = Math.PI / 2;
  boat.add(sail);
  boat.position.set(6, 0.08, sea.position.z + 14);
  beachBoat = boat;
  beachBoatBaseY = boat.position.y;
  beachGroup.add(boat);

  const girl = new THREE.Group();
  const dress = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xff6fa3 }));
  dress.position.y = 0.2;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshStandardMaterial({ color: 0xffd1b3 }));
  head.position.set(0, 0.55, 0);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.28), new THREE.MeshStandardMaterial({ color: 0x2b1b0a }));
  hair.position.set(0, 0.63, 0);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.1), new THREE.MeshStandardMaterial({ color: 0xffd1b3 }));
  arm.position.set(0.25, 0.25, 0);
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
  );
  stick.position.set(0.12, -0.35, 0);
  stick.rotation.z = -0.6;
  arm.add(stick);
  beachStick = stick;
  girl.add(dress, head, hair, arm);
  girl.position.set(-2, 0, BEACH.centerZ + 8);
  beachGroup.add(girl);

  function createBeachCat(x, z) {
    const cat = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xd1a679 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.35), mat);
    body.position.y = 0.15;
    const headC = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.22, 0.22), mat);
    headC.position.set(0.35, 0.22, 0);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.4), mat);
    tail.position.set(-0.35, 0.25, 0);
    tail.rotation.y = Math.PI / 2;
    cat.add(body, headC, tail);
    cat.position.set(x, 0, z);
    beachGroup.add(cat);
  }

  createBeachCat(1.5, BEACH.centerZ + 6);
  createBeachCat(3.0, BEACH.centerZ + 10);
  createBeachCat(-3.0, BEACH.centerZ + 7);

  for (let i = 0; i < 5; i++) {
    const cloud = new THREE.Mesh(
      new THREE.BoxGeometry(6, 2, 3),
      new THREE.MeshStandardMaterial({ color: 0xf2f6fb })
    );
    cloud.position.set(-30 + i * 15, 22 + Math.random() * 4, BEACH.centerZ - 30);
    beachGroup.add(cloud);
    beachClouds.push(cloud);
  }

  beachGroup.visible = false;
  scene.add(beachGroup);
}

function setBeachVisible(flag) {
  if (!beachGroup) return;
  beachGroup.visible = flag;
}

function updateBeachScene(delta, timeSeconds) {
  if (!beachGroup || !beachGroup.visible) return;
  if (beachSea && beachSeaBase) {
    const pos = beachSea.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const idx = i * 3;
      const x = beachSeaBase[idx];
      const z = beachSeaBase[idx + 2];
      pos.array[idx + 1] = beachSeaBase[idx + 1] + Math.sin(timeSeconds * 0.9 + x * 0.08 + z * 0.1) * 0.08;
    }
    pos.needsUpdate = true;
    beachSea.geometry.computeVertexNormals();
  }
  if (beachBoat) {
    beachBoat.position.y = beachBoatBaseY + Math.sin(timeSeconds * 1.1) * 0.05;
    beachBoat.rotation.z = Math.sin(timeSeconds * 0.8) * 0.03;
    beachBoat.rotation.x = Math.cos(timeSeconds * 0.9) * 0.02;
  }
  if (beachStick) {
    beachStick.rotation.z = -0.6 + Math.sin(timeSeconds * 1.6) * 0.08;
  }
  beachClouds.forEach((c, idx) => {
    c.position.x += delta * (0.8 + idx * 0.15);
    if (c.position.x > 40) c.position.x = -40;
  });
}

function createBlockTexture(palette, size = 64, block = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < size; y += block) {
    for (let x = 0; x < size; x += block) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      ctx.fillStyle = color;
      ctx.fillRect(x, y, block, block);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createCobbleTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#4b4b4b';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 8) {
    for (let x = 0; x < size; x += 8) {
      const shade = 60 + Math.random() * 30;
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x + 1, y + 1, 6, 6);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 18);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function createBrickTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#7b5a4a';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 12) {
    for (let x = 0; x < size; x += 24) {
      ctx.fillStyle = Math.random() < 0.5 ? '#6f5145' : '#8c6a5a';
      ctx.fillRect(x + (y % 24 === 0 ? 0 : 12), y + 2, 20, 8);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createPlasterTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#b89b7a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createStoneTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#8f8579';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 10) {
    for (let x = 0; x < size; x += 16) {
      const shade = 120 + Math.random() * 30;
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x + (y % 20 === 0 ? 0 : 8), y + 2, 14, 7);
    }
  }

  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  return tex;
}

function createArchedWindowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 64, 96);
  ctx.fillStyle = 'rgba(255,200,140,0.95)';
  ctx.beginPath();
  ctx.moveTo(12, 50);
  ctx.lineTo(12, 90);
  ctx.lineTo(52, 90);
  ctx.lineTo(52, 50);
  ctx.arc(32, 50, 20, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(14, 70, 36, 18);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function createNeonSign(text, color) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 32px Arial';
  const pad = 16;
  const w = ctx.measureText(text).width + pad * 2;
  canvas.width = w;
  canvas.height = 60;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillText(text, pad, 40);

  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(canvas.width / 35, canvas.height / 35),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
}

function createNeonSignFont(text, color, font = 'bold 32px Calibri') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  const pad = 16;
  const w = ctx.measureText(text).width + pad * 2;
  canvas.width = w;
  canvas.height = 60;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillText(text, pad, 40);

  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(canvas.width / 35, canvas.height / 35),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
}

function createFrameTexture(label, color = '#5b3d2d', bg = '#f7e7d2') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = 'bold 16px Calibri';
  ctx.fillText(label, 12, 52);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function createBakery() {
  if (bakeryGroup) return;
  bakeryGroup = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf4d3b4, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xc0906f, roughness: 0.8 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe9caa5, roughness: 1 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(BAKERY.width, BAKERY.depth), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(BAKERY.x, 0.02, BAKERY.z);
  bakeryGroup.add(floor);

  const back = new THREE.Mesh(new THREE.PlaneGeometry(BAKERY.width, BAKERY.height), wallMat);
  back.position.set(BAKERY.x, BAKERY.height / 2, BAKERY.z - BAKERY.depth / 2);
  bakeryGroup.add(back);

  const left = new THREE.Mesh(new THREE.PlaneGeometry(BAKERY.depth, BAKERY.height), wallMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(BAKERY.x - BAKERY.width / 2, BAKERY.height / 2, BAKERY.z);
  bakeryGroup.add(left);

  const right = new THREE.Mesh(new THREE.PlaneGeometry(BAKERY.depth, BAKERY.height), wallMat);
  right.rotation.y = -Math.PI / 2;
  right.position.set(BAKERY.x + BAKERY.width / 2, BAKERY.height / 2, BAKERY.z);
  bakeryGroup.add(right);

  const frontLeft = new THREE.Mesh(new THREE.PlaneGeometry(BAKERY.width * 0.35, BAKERY.height), wallMat);
  frontLeft.position.set(BAKERY.x - BAKERY.width * 0.325, BAKERY.height / 2, BAKERY.z + BAKERY.depth / 2);
  frontLeft.rotation.y = Math.PI;
  bakeryGroup.add(frontLeft);

  const frontRight = new THREE.Mesh(new THREE.PlaneGeometry(BAKERY.width * 0.35, BAKERY.height), wallMat);
  frontRight.position.set(BAKERY.x + BAKERY.width * 0.325, BAKERY.height / 2, BAKERY.z + BAKERY.depth / 2);
  frontRight.rotation.y = Math.PI;
  bakeryGroup.add(frontRight);

  const frontTop = new THREE.Mesh(new THREE.PlaneGeometry(BAKERY.width * 0.3, BAKERY.height * 0.35), wallMat);
  frontTop.position.set(BAKERY.x, BAKERY.height * 0.825, BAKERY.z + BAKERY.depth / 2);
  frontTop.rotation.y = Math.PI;
  bakeryGroup.add(frontTop);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(BAKERY.width + 0.5, 0.4, BAKERY.depth + 0.5), roofMat);
  roof.position.set(BAKERY.x, BAKERY.height + 0.2, BAKERY.z);
  bakeryGroup.add(roof);

  const doorMat = new THREE.MeshStandardMaterial({ color: 0x99c7ff, transparent: true, opacity: 0.45 });
  bakeryDoorPivot = new THREE.Group();
  bakeryDoorPivot.position.set(BAKERY.x - 1.0, 0.1, BAKERY.z + BAKERY.depth / 2 + 0.02);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.0, 0.08), doorMat);
  door.position.set(1.0, 2.0, 0);
  bakeryDoorPivot.add(door);
  bakeryGroup.add(bakeryDoorPivot);

  const caseMat = new THREE.MeshStandardMaterial({ color: 0xd9b08c });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xb9e0ff, transparent: true, opacity: 0.35 });
  const caseBase = new THREE.Mesh(new THREE.BoxGeometry(6, 0.9, 1.6), caseMat);
  caseBase.position.set(BAKERY.x, 0.45, BAKERY.z + 2.0);
  bakeryGroup.add(caseBase);
  const caseGlass = new THREE.Mesh(new THREE.BoxGeometry(6, 0.9, 1.6), glassMat);
  caseGlass.position.set(BAKERY.x, 1.35, BAKERY.z + 2.0);
  bakeryGroup.add(caseGlass);

  for (let i = 0; i < 10; i++) {
    const cake = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.25, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x6b3e2e })
    );
    cake.position.set(BAKERY.x - 2.5 + i * 0.55, 1.05, BAKERY.z + 2.0);
    bakeryGroup.add(cake);
  }

  const tableMat = new THREE.MeshStandardMaterial({ color: 0x3b2b1f });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x2f2f2f });
  for (let i = 0; i < 2; i++) {
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 12), tableMat);
    table.position.set(BAKERY.x - 3 + i * 6, 0.5, BAKERY.z - 1.5);
    bakeryGroup.add(table);
    for (const dx of [-1.0, 1.0]) {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), chairMat);
      chair.position.set(table.position.x + dx, 0.25, table.position.z);
      bakeryGroup.add(chair);
    }
  }

  const frameTex1 = createFrameTexture('TIRAMISU');
  const frameTex2 = createFrameTexture('CAKE');
  const frameMat1 = new THREE.MeshStandardMaterial({ map: frameTex1 });
  const frameMat2 = new THREE.MeshStandardMaterial({ map: frameTex2 });
  const frame1 = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.5), frameMat1);
  frame1.position.set(BAKERY.x - 4.5, 4.0, BAKERY.z - 5.8);
  bakeryGroup.add(frame1);
  const frame2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.5), frameMat2);
  frame2.position.set(BAKERY.x + 4.5, 4.0, BAKERY.z - 5.8);
  bakeryGroup.add(frame2);

  const neon = createNeonSignFont("TANU'S TIRA'S", '#ff66cc', 'bold 30px Calibri');
  neon.position.set(BAKERY.x, BAKERY.height - 1.2, BAKERY.z + BAKERY.depth / 2 + 0.1);
  bakeryGroup.add(neon);

  const nameSign = createNeonSignFont('TIRAMISSYOU', '#ffd27a', 'bold 28px Calibri');
  nameSign.position.set(BAKERY.x, BAKERY.height - 2.0, BAKERY.z + BAKERY.depth / 2 + 0.12);
  bakeryGroup.add(nameSign);

  bakeryBoy = createBoy();
  bakeryBoy.position.set(BAKERY.x, 0, BAKERY.z - 2);
  bakeryBubble = createSpeechBubble('Hi, Love would you like to have some TIRAMISU ?');
  bakeryBubble.position.set(0, 2.4, 0);
  bakeryBubble.visible = false;
  bakeryBoy.add(bakeryBubble);
  bakeryGroup.add(bakeryBoy);

  scene.add(bakeryGroup);
}

function updateBakery(delta) {
  if (!bakeryGroup) return;

  const doorPos = new THREE.Vector3(BAKERY.x, 0, BAKERY.z + BAKERY.depth / 2);
  const dist = player.position.distanceTo(doorPos);
  bakeryDoorTarget = dist < 4 ? -Math.PI / 2 : 0;

  if (bakeryDoorPivot) {
    bakeryDoorPivot.rotation.y += (bakeryDoorTarget - bakeryDoorPivot.rotation.y) * 0.12;
  }

  const inside =
    Math.abs(player.position.x - BAKERY.x) < BAKERY.width / 2 - 1 &&
    Math.abs(player.position.z - BAKERY.z) < BAKERY.depth / 2 - 1;

  if (inside && !bakeryInShop) {
    bakeryInShop = true;
    bakeryBubble.visible = true;
    bakeryBubbleTimer = 2.5;
  }
  if (!inside) {
    bakeryInShop = false;
  }
  if (bakeryBubbleTimer > 0) {
    bakeryBubbleTimer -= delta;
    if (bakeryBubbleTimer <= 0 && bakeryBubble) bakeryBubble.visible = false;
  }
}

function createStarField() {
  if (starField) return;
  const starCount = 900;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 1] = 60 + Math.random() * 140;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.9 });
  starField = new THREE.Points(geom, mat);
  starField.visible = false;
  scene.add(starField);
}

const grassTopTex = createBlockTexture(['#5fbf5a', '#59b354', '#64c563']);
const grassSideTex = createBlockTexture(['#4da04b', '#5fbf5a', '#8a5a2b']);
const dirtTex = createBlockTexture(['#8a5a2b', '#7a4a22', '#6b3e1d']);
const trunkTex = createBlockTexture(['#8a5a2b', '#7a4a22', '#6b3e1d']);
const blossomTex = createBlockTexture(['#f8c6db', '#f6b3d0', '#f29ac2', '#e57aa5', '#fbd9e8', '#ffd6e7']);
const cloudTex = createBlockTexture(['#ffffff', '#f4f6f9', '#e8f1ff']);

const grassTopMat = new THREE.MeshStandardMaterial({ map: grassTopTex });
const grassSideMat = new THREE.MeshStandardMaterial({ map: grassSideTex });
const dirtMat = new THREE.MeshStandardMaterial({ map: dirtTex });

const groundGeo = new THREE.BoxGeometry(WORLD_SIZE, 6, WORLD_SIZE);
const groundMat = [grassSideMat, grassSideMat, grassTopMat, dirtMat, grassSideMat, grassSideMat];
const ground = new THREE.Mesh(groundGeo, groundMat);
grassTopTex.repeat.set(WORLD_SIZE / 8, WORLD_SIZE / 8);
grassSideTex.repeat.set(WORLD_SIZE / 8, 1);
dirtTex.repeat.set(WORLD_SIZE / 8, 1);

ground.position.y = GROUND_Y - 3;
ground.receiveShadow = true;
scene.add(ground);

const GRASS_MULTIPLIER = 20;
const grassLayerA = 50000 * GRASS_MULTIPLIER;
const grassLayerB = 25000 * GRASS_MULTIPLIER;
const grassLayerC = 15000 * GRASS_MULTIPLIER;

const grassGeoA = new THREE.PlaneGeometry(0.05, 0.22);
const grassGeoB = new THREE.PlaneGeometry(0.06, 0.28);
const grassGeoC = new THREE.PlaneGeometry(0.07, 0.32);

const grassMatA = new THREE.MeshStandardMaterial({ color: 0x4aa24f, side: THREE.DoubleSide });
const grassMatB = new THREE.MeshStandardMaterial({ color: 0x45984a, side: THREE.DoubleSide });
const grassMatC = new THREE.MeshStandardMaterial({ color: 0x3f8f45, side: THREE.DoubleSide });

const grassA = new THREE.InstancedMesh(grassGeoA, grassMatA, grassLayerA);
const grassB = new THREE.InstancedMesh(grassGeoB, grassMatB, grassLayerB);
const grassC = new THREE.InstancedMesh(grassGeoC, grassMatC, grassLayerC);

grassA.receiveShadow = true;
grassB.receiveShadow = true;
grassC.receiveShadow = true;

scene.add(grassA);
scene.add(grassB);
scene.add(grassC);

function scatterGrass(mesh, count, heightMin, heightMax) {
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * (WORLD_SIZE - 4);
    const z = (Math.random() - 0.5) * (WORLD_SIZE - 4);
    const h = heightMin + Math.random() * (heightMax - heightMin);
    dummy.position.set(x, h * 0.5, z);
    dummy.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, 0);
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

scatterGrass(grassA, grassLayerA, 0.12, 0.2);
scatterGrass(grassB, grassLayerB, 0.16, 0.26);
scatterGrass(grassC, grassLayerC, 0.2, 0.3);

const flowerCount = 140 * 3;
const stemGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.45, 5);
const stemMat = new THREE.MeshStandardMaterial({ color: 0x4f9f4a });
const flowerGeo = new THREE.IcosahedronGeometry(0.12, 0);
const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf8c6db });
const stemMesh = new THREE.InstancedMesh(stemGeo, stemMat, flowerCount);
const flowerMesh = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
scene.add(stemMesh);
scene.add(flowerMesh);

{
  const dummy = new THREE.Object3D();
  for (let i = 0; i < flowerCount; i++) {
    const x = (Math.random() - 0.5) * (WORLD_SIZE - 12);
    const z = (Math.random() - 0.5) * (WORLD_SIZE - 12);
    const h = 0.35 + Math.random() * 0.25;
    dummy.position.set(x, h * 0.5, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    stemMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.y = h + 0.08;
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    flowerMesh.setMatrixAt(i, dummy.matrix);
  }
  stemMesh.instanceMatrix.needsUpdate = true;
  flowerMesh.instanceMatrix.needsUpdate = true;
}

const whiteFlowerCount = 6600;
const whiteFlowerTex = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const x = 32 + Math.cos(angle) * 12;
    const y = 32 + Math.sin(angle) * 12;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd27a';
  ctx.beginPath();
  ctx.arc(32, 32, 6, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
})();

const whiteFlowerMat = new THREE.MeshStandardMaterial({
  map: whiteFlowerTex,
  transparent: true,
  alphaTest: 0.2,
  side: THREE.DoubleSide
});
const whiteFlowerGeo = new THREE.PlaneGeometry(0.2, 0.2);
const whiteFlowers = new THREE.InstancedMesh(whiteFlowerGeo, whiteFlowerMat, whiteFlowerCount);
scene.add(whiteFlowers);

{
  const dummy = new THREE.Object3D();
  for (let i = 0; i < whiteFlowerCount; i++) {
    const x = (Math.random() - 0.5) * (WORLD_SIZE - 8);
    const z = (Math.random() - 0.5) * (WORLD_SIZE - 8);
    dummy.position.set(x, 0.05, z);
    dummy.rotation.set(-Math.PI / 2, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    whiteFlowers.setMatrixAt(i, dummy.matrix);
  }
  whiteFlowers.instanceMatrix.needsUpdate = true;
}

const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTex });
const blossomMat = new THREE.MeshStandardMaterial({ map: blossomTex });
const cloudMat = new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, opacity: 0.95 });
const blossomGeo = new THREE.IcosahedronGeometry(1.4, 0);
const blossomSmallGeo = new THREE.IcosahedronGeometry(0.9, 0);
const petalGeo = new THREE.PlaneGeometry(0.32, 0.22);
const petalMat = new THREE.MeshStandardMaterial({
  color: 0xf7b2d9,
  transparent: true,
  opacity: 0.85,
  side: THREE.DoubleSide
});
const petals = [];
const petalPileCount = 420;
const petalPileMat = new THREE.MeshStandardMaterial({
  color: 0xf4a9cf,
  transparent: true,
  opacity: 0.7,
  side: THREE.DoubleSide
});
const petalPile = new THREE.InstancedMesh(petalGeo, petalPileMat, petalPileCount);
petalPile.receiveShadow = true;
petalPile.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(petalPile);
const petalPileDummy = new THREE.Object3D();
let petalPileIndex = 0;

{
  for (let i = 0; i < petalPileCount; i++) {
    petalPileDummy.scale.set(0, 0, 0);
    petalPileDummy.updateMatrix();
    petalPile.setMatrixAt(i, petalPileDummy.matrix);
  }
  petalPile.instanceMatrix.needsUpdate = true;
}

let windStrength = 0;
let windTarget = 0;
let windAngle = 0;
let windAngleTarget = 0;
let windTimer = 0;

const trees = [];
const treeColliders = [];

function createTree(x, z) {
  const tree = new THREE.Group();
  const trunkHeight = 7.5 + Math.random() * 3.5;
  const trunkRadius = 0.8 + Math.random() * 0.25;
  const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.6, trunkRadius, trunkHeight, 8);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  const blossomVarMat = blossomMat.clone();
  const blossomColor = new THREE.Color(0xf7b2d9);
  blossomColor.offsetHSL((Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12);
  blossomVarMat.color.copy(blossomColor);

  const branchCount = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < branchCount; i++) {
    const startY = trunkHeight * 0.45 + Math.random() * trunkHeight * 0.35;
    const length = 2.2 + Math.random() * 2.2;
    const radius = trunkRadius * 0.45;
    const angleY = Math.random() * Math.PI * 2;
    const angleUp = THREE.MathUtils.degToRad(25 + Math.random() * 35);

    const holder = new THREE.Group();
    holder.position.y = startY;
    holder.rotation.y = angleY;
    holder.rotation.z = angleUp;

    const branchGeo = new THREE.CylinderGeometry(radius * 0.4, radius, length, 6);
    const branch = new THREE.Mesh(branchGeo, trunkMat);
    branch.position.y = length / 2;
    branch.castShadow = true;
    holder.add(branch);
    tree.add(holder);

    const horiz = Math.sin(angleUp) * length;
    const tipX = Math.sin(angleY) * horiz;
    const tipZ = Math.cos(angleY) * horiz;
    const tipY = startY + Math.cos(angleUp) * length;

    for (let b = 0; b < 3; b++) {
      const bloom = new THREE.Mesh(blossomSmallGeo, blossomVarMat);
      bloom.position.set(
        tipX + (Math.random() - 0.5) * 1.2,
        tipY + (Math.random() - 0.5) * 1.2,
        tipZ + (Math.random() - 0.5) * 1.2
      );
      bloom.scale.setScalar(0.7 + Math.random() * 0.5);
      bloom.castShadow = true;
      tree.add(bloom);
    }
  }

  const canopyCount = 22 + Math.floor(Math.random() * 10);
  for (let i = 0; i < canopyCount; i++) {
    const bloom = new THREE.Mesh(blossomGeo, blossomVarMat);
    const radius = 2.8 + Math.random() * 3.5;
    const angle = Math.random() * Math.PI * 2;
    const y = trunkHeight * 0.6 + Math.random() * 4.2;
    bloom.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    bloom.scale.setScalar(0.5 + Math.random() * 0.8);
    bloom.castShadow = true;
    tree.add(bloom);
  }

  tree.position.set(x, 0, z);
  tree.userData.spawnY = trunkHeight + 4;
  tree.userData.spawnRadius = 5.5;
  scene.add(tree);
  trees.push(tree);
  treeColliders.push({ x, z, r: 2.4 });
}

for (let i = 0; i < 70; i++) {
  const x = (Math.random() - 0.5) * (WORLD_SIZE - 40);
  const z = (Math.random() - 0.5) * (WORLD_SIZE - 40);
  createTree(x, z);
}

function spawnPetalFromTree(tree) {
  const petal = new THREE.Mesh(petalGeo, petalMat);
  const radius = tree.userData.spawnRadius ?? 5;
  const height = tree.userData.spawnY ?? 10;
  petal.position.set(
    tree.position.x + (Math.random() - 0.5) * radius * 2,
    height + Math.random() * 2,
    tree.position.z + (Math.random() - 0.5) * radius * 2
  );
  petal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  petal.castShadow = true;
  scene.add(petal);

  petals.push({
    mesh: petal,
    vel: new THREE.Vector3((Math.random() - 0.5) * 0.6, -0.4 - Math.random() * 0.4, (Math.random() - 0.5) * 0.6),
    spin: new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3),
    life: 8 + Math.random() * 4
  });
}

function placePetalPile(position) {
  const offset = 0.4;
  petalPileDummy.position.set(
    position.x + (Math.random() - 0.5) * offset,
    0.03,
    position.z + (Math.random() - 0.5) * offset
  );
  petalPileDummy.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
  const scale = 0.4 + Math.random() * 0.8;
  petalPileDummy.scale.set(scale, scale, scale);
  petalPileDummy.updateMatrix();
  petalPile.setMatrixAt(petalPileIndex, petalPileDummy.matrix);
  petalPileIndex = (petalPileIndex + 1) % petalPileCount;
  petalPile.instanceMatrix.needsUpdate = true;
}

const clouds = [];
function createCloud(x, y, z) {
  const cloud = new THREE.Group();
  const puffGeo = new THREE.BoxGeometry(6, 3, 4);
  const puffCount = 4 + Math.floor(Math.random() * 3);

  for (let i = 0; i < puffCount; i++) {
    const puff = new THREE.Mesh(puffGeo, cloudMat);
    puff.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 6);
    puff.castShadow = true;
    cloud.add(puff);
  }

  cloud.position.set(x, y, z);
  scene.add(cloud);
  clouds.push({ mesh: cloud, speed: 1 + Math.random() * 0.6 });
}

for (let i = 0; i < 14; i++) {
  createCloud(
    (Math.random() - 0.5) * WORLD_SIZE,
    26 + Math.random() * 20,
    (Math.random() - 0.5) * WORLD_SIZE
  );
}

createBakery();

const cats = [];
const catMoods = ['lazy', 'happy', 'jumpy'];

function createCat(x, z, follow = false) {
  const group = new THREE.Group();

  const baseColor = new THREE.Color([0xf2c89b, 0xd1a679, 0x999999, 0x222222, 0xf5f5f5][Math.floor(Math.random() * 5)]);
  const bodyMat = new THREE.MeshStandardMaterial({ color: baseColor });
  const stripeMat = new THREE.MeshStandardMaterial({ color: baseColor.clone().multiplyScalar(0.7) });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const eyeDarkMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0xff9cb3 });
  const whiskerMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.75), bodyMat);
  body.position.y = 0.45;
  group.add(body);

  const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.7), bodyMat);
  back.position.set(-0.65, 0.48, 0);
  group.add(back);

  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.68), stripeMat);
    stripe.position.set(-0.25 + i * 0.22, 0.6, 0);
    group.add(stripe);
  }

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.6), bodyMat);
  head.position.set(1.0, 0.6, 0);
  group.add(head);

  const earGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const leftEar = new THREE.Mesh(earGeo, bodyMat);
  const rightEar = new THREE.Mesh(earGeo, bodyMat);
  leftEar.position.set(1.15, 0.85, -0.2);
  rightEar.position.set(1.15, 0.85, 0.2);
  group.add(leftEar, rightEar);

  const eyeGeo = new THREE.BoxGeometry(0.12, 0.18, 0.05);
  const leftEyeWhite = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  const rightEyeWhite = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  leftEyeWhite.position.set(1.12, 0.6, -0.18);
  rightEyeWhite.position.set(1.12, 0.6, 0.18);
  group.add(leftEyeWhite, rightEyeWhite);

  const pupilGeo = new THREE.BoxGeometry(0.06, 0.12, 0.05);
  const leftPupil = new THREE.Mesh(pupilGeo, eyeDarkMat);
  const rightPupil = new THREE.Mesh(pupilGeo, eyeDarkMat);
  leftPupil.position.set(1.14, 0.6, -0.18);
  rightPupil.position.set(1.14, 0.6, 0.18);
  group.add(leftPupil, rightPupil);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), noseMat);
  nose.position.set(1.28, 0.52, 0);
  group.add(nose);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.04), eyeDarkMat);
  mouth.position.set(1.22, 0.45, 0);
  group.add(mouth);

  for (let i = -1; i <= 1; i += 2) {
    const whisker = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.02), whiskerMat);
    whisker.position.set(1.2, 0.5, i * 0.25);
    group.add(whisker);
  }

  const legGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.45, 6);
  const legPositions = [
    [-0.55, 0.2, -0.25],
    [-0.55, 0.2, 0.25],
    [0.45, 0.2, -0.25],
    [0.45, 0.2, 0.25]
  ];
  legPositions.forEach((p) => {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(p[0], p[1], p[2]);
    group.add(leg);
  });

  const tailPivot = new THREE.Group();
  tailPivot.position.set(-1.2, 0.7, 0);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.8, 6), bodyMat);
  tail.position.y = 0.4;
  tail.rotation.z = Math.PI / 2;
  tailPivot.add(tail);
  group.add(tailPivot);

  const mood = catMoods[Math.floor(Math.random() * catMoods.length)];
  const speed = mood === 'lazy' ? 0.8 : mood === 'jumpy' ? 1.6 : 1.2;

  group.position.set(x, 0, z);
  scene.add(group);

  cats.push({
    mesh: group,
    tail: tailPivot,
    mood,
    mode: follow ? 'follow' : 'wander',
    speed: follow ? 2.1 : speed,
    target: new THREE.Vector3(x, 0, z),
    timer: Math.random() * 4 + 2,
    followOffset: new THREE.Vector3(Math.random() * 3 - 1.5, 0, Math.random() * 3 - 1.5),
    bob: Math.random() * Math.PI * 2
  });
}

for (let i = 0; i < 6; i++) {
  const x = (Math.random() - 0.5) * (WORLD_SIZE - 80);
  const z = (Math.random() - 0.5) * (WORLD_SIZE - 80);
  createCat(x, z, i < 2);
}

const birds = [];
const birdColors = [0xf7d170, 0xf2c06b, 0xf59b2c];

function createBird(x, y, z) {
  const group = new THREE.Group();
  const bodyColor = new THREE.Color(birdColors[Math.floor(Math.random() * birdColors.length)]);
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor });
  const wingMat = new THREE.MeshStandardMaterial({ color: bodyColor.clone().offsetHSL(0, -0.1, -0.12) });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59b2c });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), bodyMat);
  body.scale.set(1.3, 0.9, 0.9);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), bodyMat);
  head.position.set(0.5, 0.05, 0);
  head.castShadow = true;
  group.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), beakMat);
  beak.rotation.z = Math.PI / 2;
  beak.position.set(0.66, 0.02, 0);
  beak.castShadow = true;
  group.add(beak);

  const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(0.52, 0.08, -0.1);
  rightEye.position.set(0.52, 0.08, 0.1);
  group.add(leftEye, rightEye);

  const wingGeo = new THREE.BoxGeometry(0.6, 0.06, 1.1);
  const leftWingPivot = new THREE.Group();
  const rightWingPivot = new THREE.Group();
  leftWingPivot.position.set(0.05, 0.02, -0.4);
  rightWingPivot.position.set(0.05, 0.02, 0.4);
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.z = -0.55;
  rightWing.position.z = 0.55;
  leftWing.castShadow = true;
  rightWing.castShadow = true;
  leftWingPivot.add(leftWing);
  rightWingPivot.add(rightWing);
  group.add(leftWingPivot, rightWingPivot);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), wingMat);
  tail.rotation.z = -Math.PI / 2;
  tail.position.set(-0.5, 0.02, 0);
  tail.castShadow = true;
  group.add(tail);

  group.position.set(x, y, z);
  scene.add(group);

  birds.push({
    mesh: group,
    leftWing: leftWingPivot,
    rightWing: rightWingPivot,
    speed: 6 + Math.random() * 4,
    phase: Math.random() * Math.PI * 2
  });
}

for (let i = 0; i < 10; i++) {
  createBird(
    (Math.random() - 0.5) * WORLD_SIZE,
    18 + Math.random() * 10,
    (Math.random() - 0.5) * WORLD_SIZE
  );
}

const butterflies = [];
const butterflyCount = 18;

function createButterflyMesh() {
  const group = new THREE.Group();
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xff92c7,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide
  });

  const topWingGeo = new THREE.CircleGeometry(0.22, 16);
  const botWingGeo = new THREE.CircleGeometry(0.16, 16);

  const leftWing = new THREE.Group();
  const rightWing = new THREE.Group();

  const topL = new THREE.Mesh(topWingGeo, wingMat);
  const botL = new THREE.Mesh(botWingGeo, wingMat);
  topL.position.set(0.0, 0.05, 0);
  botL.position.set(0.0, -0.08, 0);
  leftWing.add(topL, botL);

  const topR = new THREE.Mesh(topWingGeo, wingMat);
  const botR = new THREE.Mesh(botWingGeo, wingMat);
  topR.position.set(0.0, 0.05, 0);
  botR.position.set(0.0, -0.08, 0);
  rightWing.add(topR, botR);

  leftWing.position.set(-0.08, 0, 0);
  rightWing.position.set(0.08, 0, 0);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
  body.rotation.z = Math.PI / 2;

  group.add(leftWing, rightWing, body);

  return { group, leftWing, rightWing };
}

function createButterfly(x, y, z) {
  const { group, leftWing, rightWing } = createButterflyMesh();
  group.position.set(x, y, z);
  scene.add(group);

  butterflies.push({
    group,
    leftWing,
    rightWing,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 0.8,
    height: 2 + Math.random() * 2,
    dir: Math.random() * Math.PI * 2
  });
}

for (let i = 0; i < butterflyCount; i++) {
  createButterfly(
    (Math.random() - 0.5) * (WORLD_SIZE - 40),
    2 + Math.random() * 2,
    (Math.random() - 0.5) * (WORLD_SIZE - 40)
  );
}

const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd1b3 });
const hairMat = new THREE.MeshStandardMaterial({ color: 0x2b1b0a });
const boyShirtMat = new THREE.MeshStandardMaterial({ color: 0x2c5aa0 });
const boyPantsMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
const shoeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

function createHandModel({ skin }) {
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.16), skin);
  palm.castShadow = true;
  hand.add(palm);
  return hand;
}

function createHumanoid({ shirt, pants, hair, skin, shoes }) {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), shirt);
  torso.position.y = 1.0;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skin);
  head.position.y = 1.55;
  head.castShadow = true;
  group.add(head);

  const hairPiece = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.42), hair);
  hairPiece.position.set(0, 1.72, 0);
  hairPiece.castShadow = true;
  group.add(hairPiece);

  const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.02);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.08, 1.58, 0.2);
  rightEye.position.set(0.08, 1.58, 0.2);
  group.add(leftEye, rightEye);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.06), skin);
  nose.position.set(0, 1.5, 0.22);
  group.add(nose);

  const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
  const leftLeg = new THREE.Mesh(legGeo, pants);
  const rightLeg = new THREE.Mesh(legGeo, pants);
  leftLeg.position.set(-0.15, 0.25, 0);
  rightLeg.position.set(0.15, 0.25, 0);
  leftLeg.castShadow = true;
  rightLeg.castShadow = true;
  group.add(leftLeg, rightLeg);

  const shoeGeo = new THREE.BoxGeometry(0.22, 0.08, 0.3);
  const leftShoe = new THREE.Mesh(shoeGeo, shoes);
  const rightShoe = new THREE.Mesh(shoeGeo, shoes);
  leftShoe.position.set(-0.15, 0.05, 0.03);
  rightShoe.position.set(0.15, 0.05, 0.03);
  group.add(leftShoe, rightShoe);

  const armGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const leftArmMesh = new THREE.Mesh(armGeo, shirt);
  const rightArmMesh = new THREE.Mesh(armGeo, shirt);
  leftArmMesh.position.y = -0.25;
  rightArmMesh.position.y = -0.25;
  leftArmMesh.castShadow = true;
  rightArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  rightArm.add(rightArmMesh);

  const leftHand = createHandModel({ skin });
  const rightHand = createHandModel({ skin });
  leftHand.position.set(0, -0.55, -0.02);
  rightHand.position.set(0, -0.55, -0.02);
  leftArm.add(leftHand);
  rightArm.add(rightHand);

  leftArm.position.set(-0.45, 1.15, 0);
  rightArm.position.set(0.45, 1.15, 0);
  group.add(leftArm, rightArm);

  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  group.userData.leftLeg = leftLeg;
  group.userData.rightLeg = rightLeg;
  group.userData.head = head;

  return group;
}

function createShirtLabel(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 28px Arial';
  const padding = 16;
  const w = ctx.measureText(text).width + padding * 2;
  canvas.width = w;
  canvas.height = 50;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 6;
  ctx.fillText(text, padding, 34);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(canvas.width / 80, canvas.height / 80), mat);
  plane.renderOrder = 2;
  return plane;
}

function createBoy() {
  const boy = createHumanoid({
    shirt: boyShirtMat,
    pants: boyPantsMat,
    hair: hairMat,
    skin: skinMat,
    shoes: shoeMat
  });

  const label = createShirtLabel('KIRMADA');
  label.position.set(0, 1.05, 0.17);
  boy.add(label);

  const beard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.05), hairMat);
  beard.position.set(0, 1.42, 0.22);
  boy.add(beard);

  return boy;
}

function createSpeechBubble(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '24px monospace';
  const padding = 12;
  const textWidth = ctx.measureText(text).width;
  canvas.width = textWidth + padding * 2;
  canvas.height = 44;

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 8);
  } else {
    ctx.rect(2, 2, canvas.width - 4, canvas.height - 4);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#222';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padding, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(canvas.width / 35, canvas.height / 35, 1);
  return sprite;
}

function createRose() {
  const rose = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x3f8f3f })
  );
  stem.position.y = 0.25;
  stem.castShadow = true;
  rose.add(stem);

  const bloom = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.12, 0),
    new THREE.MeshStandardMaterial({ color: 0xe9345b })
  );
  bloom.position.y = 0.55;
  bloom.castShadow = true;
  rose.add(bloom);

  const leaf = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.02, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x4f9f4a })
  );
  leaf.position.set(0.06, 0.35, 0);
  leaf.rotation.z = 0.4;
  rose.add(leaf);

  return rose;
}

const encounters = [];
let boyEncounterDone = false;

function setupEncountersForLevel() {
  encounters.length = 0;
  boyEncounterDone = false;
  encounters.push({
    trigger: Math.ceil(getLevelTarget() * 0.6),
    active: false,
    done: false,
    state: 'idle',
    timer: 0,
    boy: null,
    bubble: null,
    rose: null,
    leaveTarget: null
  });
}

function startEncounter(enc) {
  const boy = createBoy();
  const angle = Math.random() * Math.PI * 2;
  const startDist = 12;
  boy.position.set(
    player.position.x + Math.cos(angle) * startDist,
    0,
    player.position.z + Math.sin(angle) * startDist
  );

  const bubble = createSpeechBubble('Hi!');
  bubble.position.set(0, 2.4, 0);
  bubble.visible = false;
  boy.add(bubble);

  const rose = createRose();
  rose.position.set(0.15, 0.4, 0.25);
  boy.userData.rightArm.add(rose);

  scene.add(boy);

  enc.active = true;
  enc.state = 'approach';
  enc.timer = 0;
  enc.boy = boy;
  enc.bubble = bubble;
  enc.rose = rose;
  enc.leaveTarget = new THREE.Vector3(
    player.position.x + (Math.random() * 2 - 1) * 16,
    0,
    player.position.z + (Math.random() * 2 - 1) * 16
  );
}

function moveToward(obj, target, speed, delta) {
  const dir = target.clone().sub(obj.position);
  dir.y = 0;
  const dist = dir.length();
  if (dist > 0.01) {
    dir.normalize();
    obj.position.addScaledVector(dir, speed * delta);
    obj.rotation.y = Math.atan2(dir.x, dir.z);
  }
  return dist;
}

function updateEncounters(delta, timeSeconds) {
  const active = encounters.find((enc) => enc.active);
  if (!active) {
    for (const enc of encounters) {
      if (!enc.done && heartsCollected >= enc.trigger) {
        startEncounter(enc);
        break;
      }
    }
  }

  encounters.forEach((enc) => {
    if (!enc.active) return;
    const boy = enc.boy;

    if (enc.state === 'approach') {
      const dist = moveToward(boy, player.position, 2.4, delta);
      if (dist < 2.0) {
        enc.state = 'greet';
        enc.timer = 1.2;
        enc.bubble.visible = true;
      }
    } else if (enc.state === 'greet') {
      enc.timer -= delta;
      if (enc.timer <= 0) {
        enc.bubble.visible = false;
        enc.state = 'give';
        enc.timer = 1.4;
      }
    } else if (enc.state === 'give') {
      enc.timer -= delta;
      if (enc.timer <= 0) {
        boy.userData.rightArm.remove(enc.rose);
        const drop = createRose();
        drop.position.set(player.position.x + 0.4, 0, player.position.z + 0.4);
        scene.add(drop);
        enc.state = 'dance';
        enc.timer = 2.0;
      }
    } else if (enc.state === 'dance') {
      enc.timer -= delta;
      const swing = Math.sin(timeSeconds * 6) * 0.6;
      boy.userData.leftArm.rotation.z = swing;
      boy.userData.rightArm.rotation.z = -swing;
      boy.userData.leftLeg.rotation.x = Math.sin(timeSeconds * 6) * 0.4;
      boy.userData.rightLeg.rotation.x = -Math.sin(timeSeconds * 6) * 0.4;
      if (enc.timer <= 0) {
        enc.state = 'leave';
      }
    } else if (enc.state === 'leave') {
      const dist = moveToward(boy, enc.leaveTarget, 2.6, delta);
      if (dist < 0.6) {
        scene.remove(boy);
        enc.active = false;
        enc.done = true;
        boyEncounterDone = true;
      }
    }
  });
}

const heartTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.clearRect(0, 0, 64, 64);
  ctx.translate(32, 32);
  ctx.scale(1.6, 1.6);
  ctx.fillStyle = '#ff3b7a';
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.bezierCurveTo(-16, -6, -20, -14, 0, -6);
  ctx.bezierCurveTo(20, -14, 16, -6, 0, 12);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
})();

const heartMaterial = new THREE.SpriteMaterial({ map: heartTexture, transparent: true });
let hearts = [];

function spawnHearts(count) {
  hearts.forEach((h) => scene.remove(h.sprite));
  hearts = [];

  for (let i = 0; i < count; i++) {
    const sprite = new THREE.Sprite(heartMaterial.clone());

    let px, pz;
    if (inIstanbul) {
      px = (Math.random() - 0.5) * (ISTANBUL.roadWidth - 4);
      pz = (Math.random() - 0.5) * (ISTANBUL.length - 10);
    } else {
      px = (Math.random() - 0.5) * (WORLD_SIZE - 60);
      pz = (Math.random() - 0.5) * (WORLD_SIZE - 60);
    }

    sprite.position.set(px, 2.6, pz);
    sprite.scale.set(2.4, 2.4, 1);
    scene.add(sprite);

    hearts.push({
      sprite,
      baseY: sprite.position.y,
      floatOffset: Math.random() * Math.PI * 2
    });
  }
}

function getLevelTarget() {
  return inIstanbul ? ISTANBUL_TARGET : FOREST_TARGET;
}

const playerMat = new THREE.MeshStandardMaterial({ color: 0xff4d8d });
const playerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, PLAYER_HEIGHT, 0.9), playerMat);
playerMesh.castShadow = true;
playerMesh.visible = false;
scene.add(playerMesh);

const shadowDisc = new THREE.Mesh(
  new THREE.CircleGeometry(0.6, 16),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 })
);
shadowDisc.rotation.x = -Math.PI / 2;
shadowDisc.position.y = GROUND_Y + 0.02;
scene.add(shadowDisc);

const player = {
  position: new THREE.Vector3(0, PLAYER_HEIGHT / 2, 0),
  velocity: new THREE.Vector3(),
  onGround: true
};

let yaw = 0;
let pitch = 0;

renderer.domElement.addEventListener('click', () => {
  if (!pointerLocked) renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === renderer.domElement;
  overlay.style.display = pointerLocked ? 'none' : 'flex';
  if (!pointerLocked) {
    paused = true;
    pauseStart = pauseStart ?? clock.getElapsedTime();
    return;
  }

  if (pauseStart !== null) {
    levelStartTime += clock.getElapsedTime() - pauseStart;
    pauseStart = null;
  }
  paused = false;
});

document.addEventListener('mousemove', (event) => {
  if (!pointerLocked) return;
  const sensitivity = 0.0022;
  yaw -= event.movementX * sensitivity;
  pitch -= event.movementY * sensitivity;
  pitch = Math.max(-1.2, Math.min(1.2, pitch));
});

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${minutes}:${sec.toString().padStart(2, '0')}`;
}

function updateHud(timeSeconds) {
  const label = inIstanbul ? 'Dream City' : 'Love City';
  const target = getLevelTarget();
  hudText.textContent = `${label} | Hearts ${heartsCollected}/${target} | Time ${formatTime(timeSeconds)}`;
}

function showMessage(title, body, buttonLabel, onClick) {
  if (pointerLocked) document.exitPointerLock();
  overlay.style.display = 'flex';
  overlayContent.innerHTML = `
    <h2>${title}</h2>
    <p>${body}</p>
    <button id="overlayBtn">${buttonLabel}</button>
  `;
  document.getElementById('overlayBtn').onclick = onClick;
}

function showLevel2Quiz(onCorrect) {
  if (pointerLocked) document.exitPointerLock();
  overlay.style.display = 'flex';
  overlayContent.className = 'overlay-card';
  overlayContent.style.background = 'rgba(15, 23, 32, 0.92)';
  overlayContent.style.boxShadow = '0 18px 40px rgba(0,0,0,0.4)';
  overlayContent.style.padding = '24px 28px';

  overlayContent.innerHTML = `
    <h2>Level 2 Gate</h2>
    <p>Do you know when was the first time you said I love you to me?</p>
    <div style="text-align:left;margin:16px 0;">
      <label style="display:block;margin:8px 0;">
        <input type="radio" name="lvl2" value="a"> a. 10th March 2024
      </label>
      <label style="display:block;margin:8px 0;">
        <input type="radio" name="lvl2" value="b"> b. 22nd Jan 2024
      </label>
      <label style="display:block;margin:8px 0;">
        <input type="radio" name="lvl2" value="c"> c. 29th Feb 2024
      </label>
    </div>
    <div id="mcqMsg" style="min-height:18px;"></div>
    <button id="mcqBtn">Submit</button>
  `;

  const msg = document.getElementById('mcqMsg');
  document.getElementById('mcqBtn').onclick = () => {
    const sel = document.querySelector('input[name="lvl2"]:checked');
    if (!sel) {
      msg.textContent = 'Please select an answer.';
      return;
    }
    if (sel.value === 'a') {
      overlay.style.display = 'none';
      msg.textContent = '';
      onCorrect();
    } else {
      msg.textContent = 'Wrong answer. Try again.';
    }
  };
}

function setIntroCamera() {
  camera.position.set(6, 2.3, BEACH.centerZ + 20);
  camera.lookAt(-1.5, 0.8, BEACH.centerZ + 8);
}

function spawnPlayerAtBeach() {
  player.position.set(0, PLAYER_HEIGHT / 2, BEACH.centerZ + 10);
  yaw = 0;
  pitch = 0;
  thirdPerson = false;
  updateCamera();
  playerMesh.position.copy(player.position);
  shadowDisc.position.x = player.position.x;
  shadowDisc.position.z = player.position.z;
}

function showIntroLetter() {
  paused = true;
  introLetterActive = true;
  createBeachScene();
  setWorldVisible(false);
  setBeachVisible(true);

  scene.background = LEVEL1_SKY;
  scene.fog = new THREE.Fog(LEVEL1_FOG, 60, 220);
  sunMesh.position.set(-160, 150, 40);
  sunLight.position.copy(sunMesh.position);
  setIntroCamera();

  overlay.style.display = 'flex';
  overlay.style.background = 'rgba(0,0,0,0.35)';
  overlayContent.className = 'vintage';
  overlayContent.style.background = 'transparent';
  overlayContent.style.boxShadow = 'none';
  overlayContent.style.padding = '0';

  overlayContent.innerHTML = `
    <div style="
      position: relative;
      background: #f8e1c2;
      border: 6px solid #c19055;
      border-radius: 10px;
      padding: 28px 28px 38px;
      box-shadow: 0 18px 40px rgba(0,0,0,0.5);
      font-family: 'Courier New', 'Lucida Console', monospace;
      color: #3b2f2f;
    ">
      <div style="
        position: absolute;
        left: 18px;
        right: 18px;
        bottom: -16px;
        height: 14px;
        background: #e6c49a;
        border: 4px solid #c19055;
        border-top: none;
        border-radius: 0 0 10px 10px;
      "></div>

      <h2 style="margin-top:0;">Love Quest — Letter</h2>
      <p><strong>Controls:</strong> WASD or Arrow keys to move, Space to jump, Mouse to look.</p>

      <p>This game is consist of 3 level. If you clear all of them and collect all the hearts you will recieve a big gift at the end.</p>

      <p><strong>Rules -</strong><br>
      Collect all the hearts.<br>
      Love me forever and ever and ever.</p>

      <p>You are advised to agree the follow:</p>

      <label style="display:block;margin:8px 0;">
        <input type="checkbox" class="intro-check"> i love the developer by all my heart.
      </label>
      <label style="display:block;margin:8px 0;">
        <input type="checkbox" class="intro-check"> I will play this game with all the love i have for him.
      </label>
      <label style="display:block;margin:8px 0;">
        <input type="checkbox" class="intro-check"> He is a bit stupid though (cause he is not with me)
      </label>

      <div id="introMsg" style="margin-top:12px;font-size:14px;min-height:18px;"></div>

      <button id="introAccept" style="
        margin-top:12px;width:100%;padding:12px;font-weight:bold;
        background:#ff3b7a;color:#fff;border:none;border-radius:8px;cursor:pointer;
      ">Next</button>

      <button id="introReject" style="
        margin-top:8px;width:100%;padding:10px;font-weight:bold;
        background:#333;color:#fff;border:none;border-radius:8px;cursor:pointer;
      ">Reject</button>
    </div>
  `;

  const checks = Array.from(document.querySelectorAll('.intro-check'));
  const msg = document.getElementById('introMsg');

  document.getElementById('introAccept').onclick = () => {
    const allChecked = checks.every((c) => c.checked);
    if (!allChecked) {
      msg.textContent = 'Please tick all the boxes to continue.';
      return;
    }
    overlay.style.display = 'none';
    overlay.style.background = '';
    introLetterActive = false;
    introAccepted = true;
    restoreOverlayCard();
    beginBeachIntro();
  };

  document.getElementById('introReject').onclick = () => {
    msg.textContent = 'You must accept to play.';
  };
}

function beginBeachIntro() {
  resetToForest();
  createBeachScene();
  setBeachVisible(true);
  spawnPlayerAtBeach();
  startStage();
  beachIntroActive = true;
  beachIntroTimer = 2;
  paused = false;
  renderer.domElement.requestPointerLock();
}

function startStage() {
  heartsCollected = 0;
  levelStartTime = clock.getElapsedTime();
  spawnHearts(getLevelTarget());
  setupEncountersForLevel();
  paused = false;
  pauseStart = null;
  stageLocked = false;
}

function setWorldVisible(flag) {
  ground.visible = flag;
  grassA.visible = flag;
  grassB.visible = flag;
  grassC.visible = flag;
  stemMesh.visible = flag;
  flowerMesh.visible = flag;
  whiteFlowers.visible = flag;
  if (bakeryGroup) bakeryGroup.visible = flag;
  if (beachGroup) beachGroup.visible = flag;
  trees.forEach((t) => (t.visible = flag));
  clouds.forEach((c) => (c.mesh.visible = flag));
  cats.forEach((c) => (c.mesh.visible = flag));
  birds.forEach((b) => (b.mesh.visible = flag));
  butterflies.forEach((b) => (b.group.visible = flag));
  petalPile.visible = flag;
}

function resetToForest() {
  inIstanbul = false;
  if (istanbulGroup) istanbulGroup.visible = false;
  if (starField) starField.visible = false;
  setWorldVisible(true);

  scene.background = LEVEL1_SKY;
  scene.fog = new THREE.Fog(LEVEL1_FOG, 90, 300);

  sunLight.intensity = 1.4;
  sunMesh.visible = true;
  ambient.intensity = 0.5;
  if (sunHome) {
    sunMesh.position.copy(sunHome);
    sunLight.position.copy(sunHome);
  }

  setAudioControlsVisible(true);
  startLevel1Audio();
  player.position.set(0, PLAYER_HEIGHT / 2, 0);
}

function addBalcony(group, x, y, z, side) {
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.15, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  base.position.set(x, y, z);
  group.add(base);

  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.4, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  rail.position.set(x, y + 0.25, z + side * 0.55);
  group.add(rail);

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.18, 8),
    new THREE.MeshStandardMaterial({ color: 0x6a3b2a })
  );
  pot.position.set(x - 0.6, y + 0.2, z);
  group.add(pot);

  const plant = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x3e8f3e })
  );
  plant.position.set(x - 0.6, y + 0.35, z);
  group.add(plant);
}

function addCafeCluster(group, x, z) {
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x3b2b1f });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x2f2f2f });

  const tableGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.1, 12);
  const chairGeo = new THREE.BoxGeometry(0.35, 0.45, 0.35);

  const offsets = [
    [-0.9, -1.0], [0.9, -1.0],
    [-0.9, 0.0], [0.9, 0.0],
    [-0.9, 1.0], [0.9, 1.0]
  ];

  offsets.forEach((o) => {
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(x + o[0], 0.42, z + o[1]);
    group.add(table);

    for (const dx of [-0.8, 0.8]) {
      const chair = new THREE.Mesh(chairGeo, chairMat);
      chair.position.set(x + o[0] + dx, 0.22, z + o[1]);
      group.add(chair);
    }

    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffcc88, emissive: 0xffcc88, emissiveIntensity: 1 })
    );
    lamp.position.set(x + o[0], 0.6, z + o[1]);
    group.add(lamp);
  });
}

function createIstanbulStreet() {
  if (istanbulGroup) return;
  istanbulGroup = new THREE.Group();

  const roadTex = createCobbleTexture();
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 1 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ISTANBUL.roadWidth, ISTANBUL.length), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(ISTANBUL.origin.x, 0.01, ISTANBUL.origin.z);
  istanbulGroup.add(road);

  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const sidewalkGeo = new THREE.PlaneGeometry(ISTANBUL.sidewalk, ISTANBUL.length);
  const leftSide = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  const rightSide = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  leftSide.rotation.x = -Math.PI / 2;
  rightSide.rotation.x = -Math.PI / 2;
  leftSide.position.set(-ISTANBUL.roadWidth / 2 - ISTANBUL.sidewalk / 2, 0.02, 0);
  rightSide.position.set(ISTANBUL.roadWidth / 2 + ISTANBUL.sidewalk / 2, 0.02, 0);
  istanbulGroup.add(leftSide, rightSide);

  const brickTex = createBrickTexture();
  const plasterTex = createPlasterTexture();

  const colors = [0xc94b4b, 0xd6b65d, 0x8fbf7d, 0xb27fca, 0x7ea7d8];
  for (let z = -60; z < 60; z += 14) {
    for (const side of [-1, 1]) {
      const w = 8 + Math.random() * 4;
      const h = 10 + Math.random() * 12;
      const d = ISTANBUL.buildingDepth;

      const useBrick = Math.random() < 0.4;
      const buildingMat = new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        map: useBrick ? brickTex : plasterTex,
        roughness: 1
      });

      const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
      building.position.set(
        side * (ISTANBUL.roadWidth / 2 + ISTANBUL.sidewalk + w / 2),
        h / 2,
        z + (Math.random() - 0.5) * 4
      );
      istanbulGroup.add(building);

      for (let fy = 2; fy < h - 2; fy += 3) {
        for (let wx = -w / 2 + 1; wx < w / 2 - 1; wx += 2.5) {
          const win = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 1, 0.1),
            new THREE.MeshStandardMaterial({
              color: 0x222222,
              emissive: 0xffcc88,
              emissiveIntensity: 0.8
            })
          );
          win.position.set(
            building.position.x + wx,
            fy + 1,
            building.position.z + side * (d / 2 + 0.05)
          );
          istanbulGroup.add(win);
        }

        if (Math.random() < 0.4) {
          addBalcony(
            istanbulGroup,
            building.position.x,
            fy + 0.7,
            building.position.z + side * (d / 2 + 0.7),
            side
          );
        }
      }

      if (Math.random() < 0.5) {
        const neon = createNeonSign('CAFFE CAFFE', '#ff66cc');
        neon.position.set(
          building.position.x,
          2.2,
          building.position.z + side * (d / 2 + 0.6)
        );
        istanbulGroup.add(neon);
      }

      if (Math.random() < 0.5) {
        addCafeCluster(
          istanbulGroup,
          side * (ISTANBUL.roadWidth / 2 + 2.6),
          building.position.z + (Math.random() - 0.5) * 4
        );
      }
    }
  }

  for (let z = -55; z <= 55; z += 12) {
    for (let i = 0; i < 6; i++) {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 6, 6),
        new THREE.MeshStandardMaterial({
          color: 0xffd27a,
          emissive: 0xffd27a,
          emissiveIntensity: 1.1
        })
      );
      bulb.position.set(-ISTANBUL.roadWidth / 2 + i * (ISTANBUL.roadWidth / 5), 7.2, z);
      istanbulGroup.add(bulb);
    }
  }

  const towerGroup = new THREE.Group();
  const towerStoneTex = createStoneTexture();
  const towerMat = new THREE.MeshStandardMaterial({ map: towerStoneTex, roughness: 0.9 });

  const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 24, 16), towerMat);
  towerBase.position.y = 12;
  towerGroup.add(towerBase);

  const balcony = new THREE.Mesh(
    new THREE.CylinderGeometry(7.2, 7.2, 1.2, 16),
    new THREE.MeshStandardMaterial({ color: 0x6f6258 })
  );
  balcony.position.y = 24.5;
  towerGroup.add(balcony);

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(6.5, 10, 16),
    new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.7 })
  );
  cone.position.y = 30;
  towerGroup.add(cone);

  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.5, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd27a })
  );
  spire.position.y = 36;
  towerGroup.add(spire);

  const archedTex = createArchedWindowTexture();
  const archedMat = new THREE.MeshStandardMaterial({
    map: archedTex,
    transparent: true,
    emissive: 0xffc27a,
    emissiveIntensity: 1.2
  });

  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), archedMat);
    win.position.set(Math.cos(angle) * 6.6, 22, Math.sin(angle) * 6.6);
    win.lookAt(0, 22, 0);
    towerGroup.add(win);
  }

  for (let i = 0; i < 12; i++) {
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.2, 0.2),
      new THREE.MeshStandardMaterial({
        color: 0x222222,
        emissive: 0xffcc88,
        emissiveIntensity: 1
      })
    );
    const angle = (i / 12) * Math.PI * 2;
    win.position.set(Math.cos(angle) * 6.5, 14 + (i % 3) * 4, Math.sin(angle) * 6.5);
    win.lookAt(0, win.position.y, 0);
    towerGroup.add(win);
  }

  const towerLight = new THREE.PointLight(0xffd2a4, 1.6, 80, 2);
  towerLight.position.set(0, 18, -70);
  towerGroup.add(towerLight);

  towerGroup.position.set(0, 0, -70);
  istanbulGroup.add(towerGroup);

  scene.add(istanbulGroup);
}

function enterIstanbulStreet() {
  stopLevel1Audio();
  setAudioControlsVisible(false);
  createStarField();
  createIstanbulStreet();

  inIstanbul = true;
  setBeachVisible(false);
  setWorldVisible(false);

  if (istanbulGroup) istanbulGroup.visible = true;
  if (starField) starField.visible = true;

  scene.background = new THREE.Color(0x060912);
  scene.fog = new THREE.Fog(0x060912, 20, 180);

  sunLight.intensity = 0.25;
  sunMesh.visible = false;
  ambient.intensity = 0.2;

  player.position.set(0, PLAYER_HEIGHT / 2, 50);
  camera.position.copy(player.position).add(new THREE.Vector3(0, 0.6, 0));
}

function randomLanternSpawn() {
  const pick = Math.random();
  let pos;
  if (pick < 0.5) {
    const side = Math.random() < 0.5 ? -1 : 1;
    pos = new THREE.Vector3(
      side * (ISTANBUL.roadWidth / 2 + ISTANBUL.sidewalk + ISTANBUL.buildingDepth + 2 + Math.random() * 6),
      1 + Math.random() * 0.6,
      (Math.random() - 0.5) * (ISTANBUL.length - 10)
    );
  } else if (pick < 0.8) {
    pos = new THREE.Vector3(
      (Math.random() - 0.5) * 16,
      1 + Math.random() * 0.8,
      -70 + (Math.random() - 0.5) * 14
    );
  } else {
    pos = new THREE.Vector3(
      (Math.random() - 0.5) * (ISTANBUL.roadWidth - 2),
      1 + Math.random() * 0.4,
      (Math.random() - 0.5) * (ISTANBUL.length - 10)
    );
  }

  if (pos.z < -50 && Math.abs(pos.x) < 5) {
    pos.x = (pos.x < 0 ? -1 : 1) * (6 + Math.random() * 6);
  }

  return pos;
}

function createLantern() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.9, 10), lanternPaperMat);
  group.add(body);

  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), lanternPaperMat);
  flame.position.y = -0.2;
  group.add(flame);

  const glow = new THREE.Sprite(lanternGlowMat.clone());
  glow.scale.set(2.0, 2.0, 1);
  glow.position.y = 0.1;
  group.add(glow);

  const pos = randomLanternSpawn();
  group.position.copy(pos);

  scene.add(group);

  lanterns.push({
    mesh: group,
    vel: new THREE.Vector3((Math.random() - 0.5) * 0.22, 1.0 + Math.random() * 0.8, (Math.random() - 0.5) * 0.22),
    sway: Math.random() * Math.PI * 2,
    life: 14 + Math.random() * 10
  });
}

function startLanternShow() {
  lanternShowActive = true;
  lanternShowDone = false;
  lanternShowTimer = LANTERN_DURATION;

  lanternSound.currentTime = 0;
  lanternSound.play().catch(() => {});
}

function updateLanternShow(delta, timeSeconds) {
  if (!lanternShowActive) return;

  lanternShowTimer -= delta;

  const spawnCount = Math.floor(35 * delta) + (Math.random() < 0.6 ? 1 : 0);
  for (let i = 0; i < spawnCount; i++) createLantern();

  for (let i = lanterns.length - 1; i >= 0; i--) {
    const l = lanterns[i];
    l.sway += delta * 2;
    const swirl = Math.sin(timeSeconds * 1.2 + l.sway) * 0.04;
    l.mesh.position.x += swirl;
    l.mesh.position.z += Math.cos(l.sway) * 0.02;

    l.mesh.position.addScaledVector(l.vel, delta);
    l.life -= delta;

    if (l.life <= 0 || l.mesh.position.y > 90) {
      scene.remove(l.mesh);
      lanterns.splice(i, 1);
    }
  }

  if (lanternShowTimer <= 0) {
    lanternShowActive = false;
    lanternShowDone = true;
    lanternSound.pause();
    lanternSound.currentTime = 0;
  }
}

function clampToWorld() {
  const limit = WORLD_SIZE / 2 - 6;
  player.position.x = Math.max(-limit, Math.min(limit, player.position.x));
  player.position.z = Math.max(-limit, Math.min(limit, player.position.z));
}

function resolveTreeCollisions() {
  for (const t of treeColliders) {
    const dx = player.position.x - t.x;
    const dz = player.position.z - t.z;
    const dist = Math.hypot(dx, dz);
    const minDist = PLAYER_RADIUS + t.r;
    if (dist > 0 && dist < minDist) {
      const push = (minDist - dist) / dist;
      player.position.x += dx * push;
      player.position.z += dz * push;
    }
  }
}

function updatePlayer(delta) {
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));
  const move = new THREE.Vector3();

  if (keys['KeyW'] || keys['ArrowUp']) move.add(forward);
  if (keys['KeyS'] || keys['ArrowDown']) move.sub(forward);
  if (keys['KeyA'] || keys['ArrowLeft']) move.sub(right);
  if (keys['KeyD'] || keys['ArrowRight']) move.add(right);

  if (move.lengthSq() > 0) move.normalize();

  player.velocity.x = move.x * MOVE_SPEED;
  player.velocity.z = move.z * MOVE_SPEED;

  if ((keys['Space'] || keys['KeyX']) && player.onGround) {
    player.velocity.y = JUMP_SPEED;
    player.onGround = false;
  }

  player.velocity.y += GRAVITY * delta;

  player.position.x += player.velocity.x * delta;
  player.position.z += player.velocity.z * delta;
  player.position.y += player.velocity.y * delta;

  if (player.position.y <= PLAYER_HEIGHT / 2) {
    player.position.y = PLAYER_HEIGHT / 2;
    player.velocity.y = 0;
    player.onGround = true;
  }

  if (!inIstanbul) {
    clampToWorld();
    resolveTreeCollisions();
  }

  playerMesh.position.copy(player.position);
  shadowDisc.position.x = player.position.x;
  shadowDisc.position.z = player.position.z;
}

function updateCamera() {
  if (thirdPerson) {
    const offset = new THREE.Vector3(0, 3.2, 7.5);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    camera.position.copy(player.position).add(offset);
    camera.lookAt(player.position.x, player.position.y + 1.0, player.position.z);
  } else {
    camera.position.copy(player.position).add(new THREE.Vector3(0, 0.6, 0));
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }
}

function updateBeachIntro(delta, timeSeconds) {
  updateBeachScene(delta, timeSeconds);

  if (!beachIntroActive) return;

  beachIntroTimer -= delta;
  if (beachIntroTimer <= 0) {
    beachIntroActive = false;
    showHint('Press V to toggle first/third person. Move mouse to explore the game.', 2500);
  }
}

function updateClouds(delta) {
  clouds.forEach((c) => {
    c.mesh.position.x += c.speed * delta;
    if (c.mesh.position.x > WORLD_SIZE / 2 + 30) {
      c.mesh.position.x = -WORLD_SIZE / 2 - 30;
    }
  });
}

function updateWind(delta) {
  windTimer -= delta;
  if (windTimer <= 0) {
    windTarget = (Math.random() * 2 - 1) * 0.9;
    windAngleTarget = Math.random() * Math.PI * 2;
    windTimer = 2 + Math.random() * 3.5;
  }
  windStrength += (windTarget - windStrength) * 0.8 * delta;
  windAngle += (windAngleTarget - windAngle) * 0.6 * delta;
}

function updateCats(delta, timeSeconds) {
  const limit = WORLD_SIZE / 2 - 10;
  cats.forEach((cat) => {
    if (cat.mode === 'wander') {
      cat.timer -= delta;
      const dist = cat.mesh.position.distanceTo(cat.target);
      if (cat.timer <= 0 || dist < 0.6) {
        cat.target.set(
          (Math.random() - 0.5) * (WORLD_SIZE - 60),
          0,
          (Math.random() - 0.5) * (WORLD_SIZE - 60)
        );
        cat.timer = Math.random() * 4 + 2;
      }
    } else {
      cat.target.copy(player.position).add(cat.followOffset);
      cat.target.y = 0;
    }

    const dir = cat.target.clone().sub(cat.mesh.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist > 0.05) {
      dir.normalize();
      cat.mesh.position.addScaledVector(dir, cat.speed * delta);
      cat.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    }

    for (const t of treeColliders) {
      const dx = cat.mesh.position.x - t.x;
      const dz = cat.mesh.position.z - t.z;
      const d = Math.hypot(dx, dz);
      if (d > 0 && d < t.r + 0.7) {
        const push = (t.r + 0.7 - d) / d;
        cat.mesh.position.x += dx * push;
        cat.mesh.position.z += dz * push;
      }
    }

    cat.mesh.position.x = Math.max(-limit, Math.min(limit, cat.mesh.position.x));
    cat.mesh.position.z = Math.max(-limit, Math.min(limit, cat.mesh.position.z));
    cat.mesh.position.y = 0;

    cat.tail.rotation.y = Math.sin(timeSeconds * 6 + cat.mesh.position.x * 0.2) * 0.6;
    if (cat.mood === 'jumpy') {
      cat.mesh.position.y = Math.abs(Math.sin(timeSeconds * 4 + cat.bob)) * 0.05;
    }
  });
}

function updateBirds(delta, timeSeconds) {
  const wrap = WORLD_SIZE / 2 + 40;
  birds.forEach((bird) => {
    bird.phase += delta * 6;
    const flap = Math.sin(bird.phase) * 0.9;
    bird.leftWing.rotation.z = flap;
    bird.rightWing.rotation.z = -flap;

    bird.mesh.position.x += bird.speed * delta;
    bird.mesh.position.z += Math.sin(timeSeconds + bird.phase) * 0.3 * delta;
    bird.mesh.rotation.y = Math.PI / 2;

    if (bird.mesh.position.x > wrap) {
      bird.mesh.position.x = -wrap;
      bird.mesh.position.z = (Math.random() - 0.5) * WORLD_SIZE;
      bird.mesh.position.y = 18 + Math.random() * 10;
      bird.speed = 6 + Math.random() * 4;
    }
  });
}

function updateButterflies(delta, timeSeconds) {
  butterflies.forEach((b) => {
    b.phase += delta * 8;
    const flap = Math.sin(b.phase) * 0.9;
    b.leftWing.rotation.y = flap;
    b.rightWing.rotation.y = -flap;

    b.group.position.y = b.height + Math.sin(timeSeconds * 2 + b.phase) * 0.3;
    b.group.position.x += Math.cos(b.dir) * b.speed * delta;
    b.group.position.z += Math.sin(b.dir) * b.speed * delta;

    if (Math.abs(b.group.position.x) > WORLD_SIZE / 2) b.group.position.x *= -1;
    if (Math.abs(b.group.position.z) > WORLD_SIZE / 2) b.group.position.z *= -1;
  });
}

function updatePetals(delta, timeSeconds) {
  if (trees.length > 0 && petals.length < 260 && Math.random() < 0.5) {
    const tree = trees[Math.floor(Math.random() * trees.length)];
    spawnPetalFromTree(tree);
  }

  const gustX = Math.cos(windAngle) * windStrength;
  const gustZ = Math.sin(windAngle) * windStrength;
  const swirlBase = Math.sin(timeSeconds * 0.7) * 0.2;
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];
    const swirl = Math.sin(timeSeconds * 1.4 + p.mesh.position.y) * 0.25 + swirlBase;
    p.vel.x += (gustX + -gustZ * swirl) * delta;
    p.vel.z += (gustZ + gustX * swirl) * delta;
    p.vel.y += Math.sin(timeSeconds + p.mesh.position.x) * 0.01;
    p.mesh.position.addScaledVector(p.vel, delta);
    p.mesh.rotation.x += p.spin.x * delta;
    p.mesh.rotation.y += p.spin.y * delta;
    p.mesh.rotation.z += p.spin.z * delta;
    p.life -= delta;

    if (p.mesh.position.y <= 0.05) {
      placePetalPile(p.mesh.position);
      scene.remove(p.mesh);
      petals.splice(i, 1);
      continue;
    }

    if (p.life <= 0) {
      scene.remove(p.mesh);
      petals.splice(i, 1);
    }
  }
}

function updateHearts(timeSeconds) {
  for (let i = hearts.length - 1; i >= 0; i -= 1) {
    const h = hearts[i];
    h.sprite.position.y = h.baseY + Math.sin(timeSeconds * 2 + h.floatOffset) * 0.35;
    h.sprite.material.rotation = timeSeconds;

    const distance = h.sprite.position.distanceTo(player.position);
    if (distance < 1.5) {
      scene.remove(h.sprite);
      hearts.splice(i, 1);
      heartsCollected += 1;
    }
  }
}

const clock = new THREE.Clock();

function handleStageCompletion() {
  if (stageLocked) return;
  stageLocked = true;

  if (!inIstanbul) {
    showLevel2Quiz(() => {
      enterIstanbulStreet();
      startStage();
      renderer.domElement.requestPointerLock();
    });
  } else {
    showMessage(
      'Game Complete',
      "Kindly share feedback or game advancement on Kirmada's WhatsApp / Gmail ID - geetppatil3000@gmail.com",
      'Replay',
      () => {
        resetToForest();
        startStage();
        renderer.domElement.requestPointerLock();
      }
    );
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();
  const levelTime = elapsed - levelStartTime;

  updateBeachIntro(delta, elapsed);

  if (introLetterActive) {
    renderer.render(scene, camera);
    return;
  }

  if (paused || !pointerLocked) {
    renderer.render(scene, camera);
    return;
  }

  updatePlayer(delta);
  updateCamera();
  updateBakery(delta);
  if (!inIstanbul) {
    updateClouds(delta);
  }
  updateWind(delta);
  updateCats(delta, elapsed);
  updateBirds(delta, elapsed);
  updateButterflies(delta, elapsed);
  updateEncounters(delta, elapsed);
  updateLanternShow(delta, elapsed);
  updatePetals(delta, elapsed);
  updateHearts(elapsed);
  updateHud(levelTime);

  if (heartsCollected >= getLevelTarget()) {
    if (inIstanbul) {
      if (!lanternShowActive && !lanternShowDone) startLanternShow();
      if (lanternShowDone) handleStageCompletion();
    } else {
      handleStageCompletion();
    }
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

updateHud(0);
animate();
