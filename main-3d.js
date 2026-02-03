import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const overlay = document.getElementById('overlay');
const overlayContent = document.getElementById('overlayContent');
const startBtn = document.getElementById('startBtn');
const hudText = document.getElementById('hudText');

const WORLD_SIZE = 320;
const GROUND_Y = 0;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.45;
const MOVE_SPEED = 7.5;
const JUMP_SPEED = 6.8;
const GRAVITY = -18.0;

let level = 1;
let heartsCollected = 0;
let levelStartTime = 0;
let paused = true;
let pointerLocked = false;
let thirdPerson = false;
let pauseStart = null;

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyV') thirdPerson = !thirdPerson;
});
window.addEventListener('keyup', (e) => (keys[e.code] = false));

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9ff);
scene.fog = new THREE.Fog(0x8ec9ff, 90, 300);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  800
);

const ambient = new THREE.HemisphereLight(0xdce8ff, 0x4a5a3a, 0.5);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff2d1, 1.2);
sun.position.set(140, 180, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 500;
sun.shadow.camera.left = -180;
sun.shadow.camera.right = 180;
sun.shadow.camera.top = 180;
sun.shadow.camera.bottom = -180;
scene.add(sun);

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

const grassTopTex = createBlockTexture(['#5fbf5a', '#59b354', '#64c563']);
const grassSideTex = createBlockTexture(['#4da04b', '#5fbf5a', '#8a5a2b']);
const dirtTex = createBlockTexture(['#8a5a2b', '#7a4a22', '#6b3e1d']);
const trunkTex = createBlockTexture(['#8a5a2b', '#7a4a22', '#6b3e1d']);
const leafTex = createBlockTexture(['#2f7a36', '#3c8f3f', '#2b6d2f']);
const cloudTex = createBlockTexture(['#ffffff', '#f4f6f9', '#e8f1ff']);

const grassTopMat = new THREE.MeshStandardMaterial({ map: grassTopTex });
const grassSideMat = new THREE.MeshStandardMaterial({ map: grassSideTex });
const dirtMat = new THREE.MeshStandardMaterial({ map: dirtTex });

const groundGeo = new THREE.BoxGeometry(WORLD_SIZE, 6, WORLD_SIZE);
const groundMat = [
  grassSideMat,
  grassSideMat,
  grassTopMat,
  dirtMat,
  grassSideMat,
  grassSideMat
];
const ground = new THREE.Mesh(groundGeo, groundMat);
grassTopTex.repeat.set(WORLD_SIZE / 8, WORLD_SIZE / 8);
grassSideTex.repeat.set(WORLD_SIZE / 8, 1);
dirtTex.repeat.set(WORLD_SIZE / 8, 1);

const groundTop = GROUND_Y;
ground.position.y = groundTop - 3;
ground.receiveShadow = true;
scene.add(ground);

const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTex });
const leafMat = new THREE.MeshStandardMaterial({ map: leafTex });
const cloudMat = new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, opacity: 0.95 });

const trees = [];
const treeColliders = [];

function createTree(x, z) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2), trunkMat);
  trunk.position.y = 4;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  for (let ix = -1; ix <= 1; ix++) {
    for (let iz = -1; iz <= 1; iz++) {
      for (let iy = 0; iy <= 1; iy++) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), leafMat);
        leaf.position.set(ix * 2, 8 + iy * 2, iz * 2);
        leaf.castShadow = true;
        tree.add(leaf);
      }
    }
  }

  tree.position.set(x, 0, z);
  scene.add(tree);
  trees.push(tree);
  treeColliders.push({ x, z, r: 1.4 });
}

for (let i = 0; i < 70; i++) {
  const x = (Math.random() - 0.5) * (WORLD_SIZE - 40);
  const z = (Math.random() - 0.5) * (WORLD_SIZE - 40);
  createTree(x, z);
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

function makeHeartTexture() {
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
}

const heartTexture = makeHeartTexture();
const heartMaterial = new THREE.SpriteMaterial({ map: heartTexture, transparent: true });
let hearts = [];

function spawnHearts(count) {
  hearts.forEach((h) => scene.remove(h.sprite));
  hearts = [];

  for (let i = 0; i < count; i++) {
    const sprite = new THREE.Sprite(heartMaterial.clone());
    sprite.position.set(
      (Math.random() - 0.5) * (WORLD_SIZE - 60),
      2.6,
      (Math.random() - 0.5) * (WORLD_SIZE - 60)
    );
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
  if (level === 1) return 10;
  if (level === 2) return 12;
  return 13;
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
  const target = getLevelTarget();
  hudText.textContent = `Level ${level} | Hearts ${heartsCollected}/${target} | Time ${formatTime(timeSeconds)}`;
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

function startLevel() {
  heartsCollected = 0;
  levelStartTime = clock.getElapsedTime();
  spawnHearts(getLevelTarget());
  paused = false;
  pauseStart = null;
}

function nextLevel() {
  if (level >= 3) {
    showMessage('Complete', 'All hearts collected. You can replay anytime.', 'Replay', () => {
      level = 1;
      startLevel();
      renderer.domElement.requestPointerLock();
    });
    return;
  }

  level += 1;
  startLevel();
  renderer.domElement.requestPointerLock();
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
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
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

  clampToWorld();
  resolveTreeCollisions();

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

function updateClouds(delta) {
  clouds.forEach((c) => {
    c.mesh.position.x += c.speed * delta;
    if (c.mesh.position.x > WORLD_SIZE / 2 + 30) {
      c.mesh.position.x = -WORLD_SIZE / 2 - 30;
    }
  });
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

function animate() {
  requestAnimationFrame(animate);

  if (paused || !pointerLocked) {
    renderer.render(scene, camera);
    return;
  }

  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();
  const levelTime = elapsed - levelStartTime;

  updatePlayer(delta);
  updateCamera();
  updateClouds(delta);
  updateHearts(elapsed);
  updateHud(levelTime);

  if (heartsCollected >= getLevelTarget()) {
    paused = true;
    pauseStart = pauseStart ?? elapsed;
    showMessage('Level Complete', 'Nice run. Ready for the next one?', 'Continue', () => {
      overlay.style.display = 'none';
      nextLevel();
    });
  }

  renderer.render(scene, camera);
}

startBtn.addEventListener('click', () => {
  paused = false;
  levelStartTime = clock.getElapsedTime();
  spawnHearts(getLevelTarget());
  renderer.domElement.requestPointerLock();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

updateHud(0);
animate();
