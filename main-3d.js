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
const lanternSound = new Audio('lantern-show.mp3');
lanternSound.loop = true;
lanternSound.volume = 0.7;


const FOREST_TARGET = 10;
const ISTANBUL_TARGET = 10;

const ISTANBUL = {
  origin: new THREE.Vector3(0, 0, 0),
  length: 140,
  roadWidth: 18,
  sidewalk: 4,
  buildingDepth: 10
};

const LANTERN_DURATION = 20;
let lanternShowActive = false;
let lanternShowDone = false;
let lanternShowTimer = 0;
const lanterns = [];

const lanternMat = new THREE.MeshStandardMaterial({
  color: 0xfff1b5,
  emissive: 0xffb347,
  emissiveIntensity: 3.2,
  transparent: true,
  opacity: 0.95
});

const lanternFrameMat = new THREE.MeshStandardMaterial({
  color: 0x7a3b1d,
  roughness: 0.8
});

const lanternGlowMat = new THREE.SpriteMaterial({
  color: 0xffc65c,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

function randomLanternSpawn() {
  const pick = Math.random();
  if (pick < 0.45) {
    // behind buildings
    const side = Math.random() < 0.5 ? -1 : 1;
    return new THREE.Vector3(
      side * (ISTANBUL.roadWidth / 2 + ISTANBUL.sidewalk + ISTANBUL.buildingDepth + 2 + Math.random() * 6),
      1 + Math.random() * 0.6,
      (Math.random() - 0.5) * (ISTANBUL.length - 10)
    );
  }
  if (pick < 0.75) {
    // around Galata tower
    return new THREE.Vector3(
      (Math.random() - 0.5) * 16,
      1 + Math.random() * 0.8,
      -70 + (Math.random() - 0.5) * 14
    );
  }
  // anywhere on the street
  return new THREE.Vector3(
    (Math.random() - 0.5) * (ISTANBUL.roadWidth - 2),
    1 + Math.random() * 0.4,
    (Math.random() - 0.5) * (ISTANBUL.length - 10)
  );
}

function createLantern() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.9, 8), lanternMat);
  const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.0, 8), lanternFrameMat);
  frame.scale.set(1.05, 1.05, 1.05);

  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), lanternMat);
  flame.position.y = -0.2;

  const glow = new THREE.Sprite(lanternGlowMat.clone());
  glow.scale.set(1.6, 1.6, 1);
  glow.position.y = 0.1;

  group.add(frame, body, flame, glow);

  const pos = randomLanternSpawn();
  group.position.copy(pos);

  scene.add(group);

  lanterns.push({
    mesh: group,
    vel: new THREE.Vector3((Math.random() - 0.5) * 0.25, 1.0 + Math.random() * 0.8, (Math.random() - 0.5) * 0.25),
    sway: Math.random() * Math.PI * 2,
    life: 10 + Math.random() * 10
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

  const spawnCount = Math.floor(45 * delta) + (Math.random() < 0.7 ? 1 : 0);
  for (let i = 0; i < spawnCount; i++) createLantern();

  for (let i = lanterns.length - 1; i >= 0; i--) {
    const l = lanterns[i];
    l.sway += delta * 2;
    const swirl = Math.sin(timeSeconds * 1.2 + l.sway) * 0.04;
    l.mesh.position.x += swirl;
    l.mesh.position.z += Math.cos(l.sway) * 0.02;

    l.mesh.position.addScaledVector(l.vel, delta);
    l.life -= delta;

    if (l.life <= 0 || l.mesh.position.y > 80) {
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

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
scene.add(camera);

const ambient = new THREE.HemisphereLight(0xdce8ff, 0x4a5a3a, 0.5);
scene.add(ambient);

const sunGroup = new THREE.Group();
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(6, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xfff2c4 })
);
sunMesh.position.set(140, 180, 60);
sunGroup.add(sunMesh);
scene.add(sunGroup);

const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.4);
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
const groundMat = [grassSideMat, grassSideMat, grassTopMat, dirtMat, grassSideMat, grassSideMat];
const ground = new THREE.Mesh(groundGeo, groundMat);
grassTopTex.repeat.set(WORLD_SIZE / 8, WORLD_SIZE / 8);
grassSideTex.repeat.set(WORLD_SIZE / 8, 1);
dirtTex.repeat.set(WORLD_SIZE / 8, 1);

const groundTop = GROUND_Y;
ground.position.y = groundTop - 3;
ground.receiveShadow = true;
scene.add(ground);

const grassLayerA = 250000;
const grassLayerB = 200000;
const grassLayerC = 150000;

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

const catColors = [0xf2c89b, 0xd1a679, 0x999999, 0x222222, 0xf5f5f5];
const cats = [];

function createCat(x, z, follow = false) {
  const group = new THREE.Group();

  const baseColor = new THREE.Color(catColors[Math.floor(Math.random() * catColors.length)]);
  const bodyMat = new THREE.MeshStandardMaterial({ color: baseColor });
  const darkStripeMat = new THREE.MeshStandardMaterial({ color: baseColor.clone().multiplyScalar(0.7) });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const eyeDarkMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0xff9cb3 });
  const whiskerMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.8), bodyMat);
  body.position.y = 0.45;
  group.add(body);

  const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.7), bodyMat);
  back.position.set(-0.6, 0.5, 0);
  group.add(back);

  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.7), darkStripeMat);
    stripe.position.set(-0.3 + i * 0.25, 0.6, 0);
    group.add(stripe);
  }

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.6), bodyMat);
  head.position.set(1.0, 0.6, 0);
  group.add(head);

  const earGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const leftEar = new THREE.Mesh(earGeo, bodyMat);
  const rightEar = new THREE.Mesh(earGeo, bodyMat);
  leftEar.position.set(1.2, 0.9, -0.2);
  rightEar.position.set(1.2, 0.9, 0.2);
  group.add(leftEar, rightEar);

  const eyeGeo = new THREE.BoxGeometry(0.12, 0.18, 0.05);
  const leftEyeWhite = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  const rightEyeWhite = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  leftEyeWhite.position.set(1.15, 0.62, -0.18);
  rightEyeWhite.position.set(1.15, 0.62, 0.18);
  group.add(leftEyeWhite, rightEyeWhite);

  const pupilGeo = new THREE.BoxGeometry(0.06, 0.12, 0.05);
  const leftPupil = new THREE.Mesh(pupilGeo, eyeDarkMat);
  const rightPupil = new THREE.Mesh(pupilGeo, eyeDarkMat);
  leftPupil.position.set(1.17, 0.62, -0.18);
  rightPupil.position.set(1.17, 0.62, 0.18);
  group.add(leftPupil, rightPupil);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), noseMat);
  nose.position.set(1.3, 0.52, 0);
  group.add(nose);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.04), eyeDarkMat);
  mouth.position.set(1.23, 0.45, 0);
  group.add(mouth);

  for (let i = -1; i <= 1; i += 2) {
    const whisker = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.02), whiskerMat);
    whisker.position.set(1.25, 0.5, i * 0.25);
    group.add(whisker);
  }

  const legGeo = new THREE.BoxGeometry(0.18, 0.4, 0.18);
  const legPositions = [
    [-0.5, 0.2, -0.25],
    [-0.5, 0.2, 0.25],
    [0.5, 0.2, -0.25],
    [0.5, 0.2, 0.25]
  ];
  legPositions.forEach((p) => {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(p[0], p[1], p[2]);
    group.add(leg);
  });

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.8), bodyMat);
  tail.position.set(-1.0, 0.7, 0);
  tail.rotation.y = Math.PI / 2;
  group.add(tail);

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

const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd1b3 });
const nailMat = new THREE.MeshStandardMaterial({ color: 0xff7eb3 });
const sleeveMat = new THREE.MeshStandardMaterial({ color: 0xff4d8d });
const hairMat = new THREE.MeshStandardMaterial({ color: 0x2b1b0a });
const boyShirtMat = new THREE.MeshStandardMaterial({ color: 0x2c5aa0 });
const boyPantsMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
const girlDressMat = new THREE.MeshStandardMaterial({ color: 0xff79b0 });
const shoeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

function createHandModel({ skin, nails = null, withNails = false }) {
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.16), skin);
  palm.castShadow = true;
  hand.add(palm);

  const fingerGeo = new THREE.BoxGeometry(0.04, 0.02, 0.06);
  const nailGeo = new THREE.BoxGeometry(0.045, 0.01, 0.02);
  const offsets = [-0.08, -0.04, 0, 0.04, 0.08];
  offsets.forEach((x) => {
    const finger = new THREE.Mesh(fingerGeo, skin);
    finger.position.set(x, 0.03, -0.1);
    finger.castShadow = true;
    hand.add(finger);

    if (withNails && nails) {
      const nail = new THREE.Mesh(nailGeo, nails);
      nail.position.set(x, 0.035, -0.135);
      nail.castShadow = true;
      hand.add(nail);
    }
  });

  return hand;
}

function createHumanoid({ shirt, pants, hair, skin, shoes, withNails = false }) {
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

  const leftHand = createHandModel({ skin, nails: nailMat, withNails });
  const rightHand = createHandModel({ skin, nails: nailMat, withNails });
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

function createBoy() {
  return createHumanoid({
    shirt: boyShirtMat,
    pants: boyPantsMat,
    hair: hairMat,
    skin: skinMat,
    shoes: shoeMat,
    withNails: false
  });
}

function createGirl() {
  const girl = createHumanoid({
    shirt: girlDressMat,
    pants: girlDressMat,
    hair: hairMat,
    skin: skinMat,
    shoes: shoeMat,
    withNails: false
  });

  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.45, 0.6, 6), girlDressMat);
  skirt.position.y = 0.75;
  skirt.castShadow = true;
  girl.add(skirt);
  return girl;
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
let roseEncounter = null;

function clearEncounters() {
  encounters.forEach((enc) => {
    if (enc.boy) scene.remove(enc.boy);
    if (enc.girl) scene.remove(enc.girl);
  });
  encounters.length = 0;
}

function setupEncountersForLevel() {
  clearEncounters();
  const target = getLevelTarget();

  // only one encounter
  encounters.push({
    trigger: Math.ceil(target * 0.6),
    active: false,
    done: false,
    state: 'idle',
    timer: 0,
    boy: null,
    girl: null,
    bubble: null
  });

  roseEncounter = {
    trigger: Math.max(1, Math.floor(target * 0.5)),
    active: false,
    done: false,
    state: 'idle',
    timer: 0,
    boy: null,
    rose: null,
    dropRose: null
  };
}


function startEncounter(enc) {
  const boy = createBoy();
  const girl = createGirl();
  const angle = Math.random() * Math.PI * 2;
  const startDist = 12;
  boy.position.set(
    player.position.x + Math.cos(angle) * startDist,
    0,
    player.position.z + Math.sin(angle) * startDist
  );
  const girlAngle = angle + Math.PI * 0.9;
  girl.position.set(
    player.position.x + Math.cos(girlAngle) * 8,
    0,
    player.position.z + Math.sin(girlAngle) * 8
  );

  const bubble = createSpeechBubble('Hi!');
  bubble.position.set(0, 2.4, 0);
  bubble.visible = false;
  boy.add(bubble);

  scene.add(boy);
  scene.add(girl);

  enc.active = true;
  enc.state = 'approachPlayer';
  enc.timer = 0;
  enc.boy = boy;
  enc.girl = girl;
  enc.bubble = bubble;
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

function updateEncounters(delta) {
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

    if (enc.state === 'approachPlayer') {
      const dist = moveToward(enc.boy, player.position, 2.4, delta);
      if (dist < 2.0) {
        enc.state = 'greet';
        enc.timer = 1.6;
        enc.bubble.visible = true;
      }
    } else if (enc.state === 'greet') {
      enc.timer -= delta;
      if (enc.timer <= 0) {
        enc.state = 'approachGirl';
        enc.bubble.visible = false;
      }
    } else if (enc.state === 'approachGirl') {
      const dist = moveToward(enc.boy, enc.girl.position, 2.6, delta);
      if (dist < 1.4) {
        enc.state = 'vanish';
        enc.timer = 1.2;
      }
    } else if (enc.state === 'vanish') {
      enc.timer -= delta;
      const s = Math.max(0, enc.timer / 1.2);
      enc.boy.scale.setScalar(s);
      enc.girl.scale.setScalar(s);
      if (enc.timer <= 0) {
        scene.remove(enc.boy);
        scene.remove(enc.girl);
        enc.active = false;
        enc.done = true;
      }
    }
  });
}

function startRoseEncounter() {
  const boy = createBoy();
  const angle = Math.random() * Math.PI * 2;
  const startDist = 14;
  boy.position.set(
    player.position.x + Math.cos(angle) * startDist,
    0,
    player.position.z + Math.sin(angle) * startDist
  );

  const rose = createRose();
  rose.position.set(0.15, 0.4, 0.25);
  boy.userData.rightArm.add(rose);

  scene.add(boy);

  roseEncounter.active = true;
  roseEncounter.state = 'approach';
  roseEncounter.timer = 0;
  roseEncounter.boy = boy;
  roseEncounter.rose = rose;
  roseEncounter.dropRose = null;
}

function updateRoseEncounter(delta, timeSeconds) {
  if (!roseEncounter || roseEncounter.done) return;
  if (!roseEncounter.active && heartsCollected >= roseEncounter.trigger) {
    startRoseEncounter();
  }

  if (!roseEncounter.active) return;

  const boy = roseEncounter.boy;

  if (roseEncounter.state === 'approach') {
    const dist = moveToward(boy, player.position, 2.2, delta);
    if (dist < 2.2) {
      roseEncounter.state = 'give';
      roseEncounter.timer = 1.8;
    }
  } else if (roseEncounter.state === 'give') {
    roseEncounter.timer -= delta;
    if (roseEncounter.timer <= 0) {
      if (roseEncounter.rose) {
        boy.userData.rightArm.remove(roseEncounter.rose);
        const drop = createRose();
        drop.position.set(player.position.x + 0.4, 0, player.position.z + 0.4);
        scene.add(drop);
        roseEncounter.dropRose = drop;
      }
      roseEncounter.state = 'dance';
      roseEncounter.timer = 2.4;
    }
  } else if (roseEncounter.state === 'dance') {
    roseEncounter.timer -= delta;
    const swing = Math.sin(timeSeconds * 6) * 0.6;
    boy.userData.leftArm.rotation.z = swing;
    boy.userData.rightArm.rotation.z = -swing;
    boy.userData.leftLeg.rotation.x = Math.sin(timeSeconds * 6) * 0.4;
    boy.userData.rightLeg.rotation.x = -Math.sin(timeSeconds * 6) * 0.4;
    if (roseEncounter.timer <= 0) {
      roseEncounter.state = 'leave';
    }
  } else if (roseEncounter.state === 'leave') {
    const away = player.position.clone().add(new THREE.Vector3(12, 0, 12));
    const dist = moveToward(boy, away, 2.6, delta);
    if (dist < 0.6) {
      scene.remove(boy);
      if (roseEncounter.dropRose) scene.remove(roseEncounter.dropRose);
      roseEncounter.active = false;
      roseEncounter.done = true;
    }
  }
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
  const label = inIstanbul ? 'Galata Street' : 'Forest';
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
  trees.forEach((t) => (t.visible = flag));
  clouds.forEach((c) => (c.mesh.visible = flag));
  cats.forEach((c) => (c.mesh.visible = flag));
  birds.forEach((b) => (b.mesh.visible = flag));
  petalPile.visible = flag;
}

function resetToForest() {
  inIstanbul = false;
  if (istanbulGroup) istanbulGroup.visible = false;
  if (starField) starField.visible = false;
  setWorldVisible(true);

  scene.background = new THREE.Color(0x8ec9ff);
  scene.fog = new THREE.Fog(0x8ec9ff, 90, 300);

  sunLight.intensity = 1.4;
  sunMesh.visible = true;
  ambient.intensity = 0.5;

  player.position.set(0, PLAYER_HEIGHT / 2, 0);
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

function createStarField() {
  if (starField) return;
  const starCount = 800;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 1] = 60 + Math.random() * 120;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8 });
  starField = new THREE.Points(geom, mat);
  starField.visible = false;
  scene.add(starField);
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

function addCafeSet(group, x, z) {
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: 0x3b2b1f })
  );
  table.position.set(x, 0.4, z);
  group.add(table);

  const chairGeo = new THREE.BoxGeometry(0.3, 0.4, 0.3);
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x2f2f2f });
  for (const dx of [-0.6, 0.6]) {
    const chair = new THREE.Mesh(chairGeo, chairMat);
    chair.position.set(x + dx, 0.2, z);
    group.add(chair);
  }

  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffcc88, emissive: 0xffcc88, emissiveIntensity: 1 })
  );
  lamp.position.set(x, 0.55, z);
  group.add(lamp);
}

function createIstanbulStreet() {
  if (istanbulGroup) return;
  istanbulGroup = new THREE.Group();

  const roadTex = createCobbleTexture();
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 1 });
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ISTANBUL.roadWidth, ISTANBUL.length),
    roadMat
  );
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

        if (Math.random() < 0.35) {
          addBalcony(
            istanbulGroup,
            building.position.x,
            fy + 0.7,
            building.position.z + side * (d / 2 + 0.7),
            side
          );
        }
      }

      if (Math.random() < 0.4) {
        const neon = createNeonSign('CAFFE CAFFE', '#ff66cc');
        neon.position.set(
          building.position.x,
          2.2,
          building.position.z + side * (d / 2 + 0.6)
        );
        istanbulGroup.add(neon);
      }

      if (Math.random() < 0.4) {
        addCafeSet(
          istanbulGroup,
          side * (ISTANBUL.roadWidth / 2 + 2.2),
          building.position.z + (Math.random() - 0.5) * 4
        );
      }
    }
  }

  // String lights
  for (let z = -55; z <= 55; z += 12) {
    for (let i = 0; i < 6; i++) {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 6, 6),
        new THREE.MeshStandardMaterial({
          color: 0xffd27a,
          emissive: 0xffd27a,
          emissiveIntensity: 1
        })
      );
      bulb.position.set(-ISTANBUL.roadWidth / 2 + i * (ISTANBUL.roadWidth / 5), 7.2, z);
      istanbulGroup.add(bulb);
    }
  }

  // Galata Tower
  const towerGroup = new THREE.Group();
  const towerBase = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 7, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0x8b7f73 })
  );
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
    new THREE.MeshStandardMaterial({ color: 0x3d3d3d })
  );
  cone.position.y = 30;
  towerGroup.add(cone);

  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.5, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd27a })
  );
  spire.position.y = 36;
  towerGroup.add(spire);

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

  towerGroup.position.set(0, 0, -70);
  istanbulGroup.add(towerGroup);

  scene.add(istanbulGroup);
}

function enterIstanbulStreet() {
  createStarField();
  createIstanbulStreet();

  inIstanbul = true;
  setWorldVisible(false);

  if (istanbulGroup) istanbulGroup.visible = true;
  if (starField) starField.visible = true;

  scene.background = new THREE.Color(0x060912);
  scene.fog = new THREE.Fog(0x060912, 20, 180);

  sunLight.intensity = 0.3;
  sunMesh.visible = false;
  ambient.intensity = 0.2;

  player.position.set(0, PLAYER_HEIGHT / 2, 50);
  camera.position.copy(player.position).add(new THREE.Vector3(0, 0.6, 0));
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
    enterIstanbulStreet();
    startStage();
  } else {
    showMessage('Complete', 'You finished the Galata street scene!', 'Replay', () => {
      resetToForest();
      startStage();
      renderer.domElement.requestPointerLock();
    });
  }
}

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
  if (!inIstanbul) {
    updateClouds(delta);
  }
  updateWind(delta);
  updateCats(delta, elapsed);
  updateBirds(delta, elapsed);
  updateLanternShow(delta, elapsed);
  updateEncounters(delta);
  updateRoseEncounter(delta, elapsed);
  updatePetals(delta, elapsed);
  updateHearts(elapsed);
  updateHud(levelTime);
  updateLanternShow(delta, elapsed);


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

startBtn.addEventListener('click', () => {
  resetToForest();
  startStage();
  renderer.domElement.requestPointerLock();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

updateHud(0);
animate();
