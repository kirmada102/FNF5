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
const blossomTex = createBlockTexture(['#f8c6db', '#f6b3d0', '#f29ac2', '#e57aa5', '#fbd9e8', '#ffd6e7']);
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

const grassTuftCount = 450;
const grassGeo = new THREE.PlaneGeometry(0.35, 0.8);
const grassMat = new THREE.MeshStandardMaterial({ color: 0x57b85a, side: THREE.DoubleSide });
const grassA = new THREE.InstancedMesh(grassGeo, grassMat, grassTuftCount);
const grassB = new THREE.InstancedMesh(grassGeo, grassMat, grassTuftCount);
grassA.receiveShadow = true;
grassB.receiveShadow = true;
scene.add(grassA);
scene.add(grassB);

const flowerCount = 140;
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
  for (let i = 0; i < grassTuftCount; i++) {
    const x = (Math.random() - 0.5) * (WORLD_SIZE - 8);
    const z = (Math.random() - 0.5) * (WORLD_SIZE - 8);
    const h = 0.5 + Math.random() * 0.6;
    dummy.position.set(x, h * 0.5, z);
    dummy.rotation.set(0, Math.random() * Math.PI, 0);
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    grassA.setMatrixAt(i, dummy.matrix);
    dummy.rotation.y += Math.PI / 2;
    dummy.updateMatrix();
    grassB.setMatrixAt(i, dummy.matrix);
  }
  grassA.instanceMatrix.needsUpdate = true;
  grassB.instanceMatrix.needsUpdate = true;

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
      const bloom = new THREE.Mesh(blossomSmallGeo, blossomMat);
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
    const bloom = new THREE.Mesh(blossomGeo, blossomMat);
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
  petal.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  petal.castShadow = true;
  scene.add(petal);

  petals.push({
    mesh: petal,
    vel: new THREE.Vector3((Math.random() - 0.5) * 0.6, -0.4 - Math.random() * 0.4, (Math.random() - 0.5) * 0.6),
    spin: new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3),
    life: 8 + Math.random() * 4
  });
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

const catColors = [0xf2c89b, 0xd1a679, 0x999999, 0x222222, 0xf5f5f5];
const catMats = catColors.map((color) => new THREE.MeshStandardMaterial({ color }));
const cats = [];

function createCat(x, z, follow = false) {
  const group = new THREE.Group();
  const mat = catMats[Math.floor(Math.random() * catMats.length)];

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.6), mat);
  body.position.y = 0.35;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), mat);
  head.position.set(0.9, 0.55, 0);
  head.castShadow = true;
  group.add(head);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.15), mat);
  tail.position.set(-0.9, 0.45, 0);
  tail.castShadow = true;
  group.add(tail);

  const legGeo = new THREE.BoxGeometry(0.15, 0.35, 0.15);
  for (const dx of [-0.5, 0.5]) {
    for (const dz of [-0.2, 0.2]) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(dx, 0.15, dz);
      leg.castShadow = true;
      group.add(leg);
    }
  }

  group.position.set(x, 0, z);
  scene.add(group);

  cats.push({
    mesh: group,
    tail,
    mode: follow ? 'follow' : 'wander',
    speed: follow ? 2.1 : 1.2,
    target: new THREE.Vector3(x, 0, z),
    timer: Math.random() * 4 + 2,
    followOffset: new THREE.Vector3(Math.random() * 3 - 1.5, 0, Math.random() * 3 - 1.5)
  });
}

for (let i = 0; i < 6; i++) {
  const x = (Math.random() - 0.5) * (WORLD_SIZE - 80);
  const z = (Math.random() - 0.5) * (WORLD_SIZE - 80);
  createCat(x, z, i < 2);
}

const birdMat = new THREE.MeshStandardMaterial({ color: 0xf7d170 });
const birds = [];

function createBird(x, y, z) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.4), birdMat);
  body.castShadow = true;
  group.add(body);

  const wingGeo = new THREE.BoxGeometry(0.6, 0.1, 1.2);
  const leftWing = new THREE.Mesh(wingGeo, birdMat);
  leftWing.position.set(0, 0, -0.8);
  const rightWing = new THREE.Mesh(wingGeo, birdMat);
  rightWing.position.set(0, 0, 0.8);
  group.add(leftWing, rightWing);

  group.position.set(x, y, z);
  scene.add(group);

  birds.push({
    mesh: group,
    leftWing,
    rightWing,
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
  });
}

function updateBirds(delta, timeSeconds) {
  const wrap = WORLD_SIZE / 2 + 40;
  birds.forEach((bird) => {
    bird.phase += delta * 6;
    const flap = Math.sin(bird.phase) * 0.8;
    bird.leftWing.rotation.x = flap;
    bird.rightWing.rotation.x = -flap;

    bird.mesh.position.x += bird.speed * delta;
    bird.mesh.position.z += Math.sin(timeSeconds + bird.phase) * 0.3 * delta;

    if (bird.mesh.position.x > wrap) {
      bird.mesh.position.x = -wrap;
      bird.mesh.position.z = (Math.random() - 0.5) * WORLD_SIZE;
      bird.mesh.position.y = 18 + Math.random() * 10;
      bird.speed = 6 + Math.random() * 4;
    }
  });
}

function updatePetals(delta, timeSeconds) {
  if (trees.length > 0 && petals.length < 260 && Math.random() < 0.5) {
    const tree = trees[Math.floor(Math.random() * trees.length)];
    spawnPetalFromTree(tree);
  }

  const wind = Math.sin(timeSeconds * 0.25) * 0.3;
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];
    p.vel.x += wind * delta * 0.2;
    p.mesh.position.addScaledVector(p.vel, delta);
    p.mesh.rotation.x += p.spin.x * delta;
    p.mesh.rotation.y += p.spin.y * delta;
    p.mesh.rotation.z += p.spin.z * delta;
    p.life -= delta;

    if (p.life <= 0 || p.mesh.position.y <= 0.05) {
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
  updateCats(delta, elapsed);
  updateBirds(delta, elapsed);
  updatePetals(delta, elapsed);
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
