import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const app = document.getElementById('app');
const previewOverlay = document.getElementById('previewOverlay');
const previewTitle = document.getElementById('previewTitle');
const previewImage = document.getElementById('previewImage');
const previewClose = document.getElementById('previewClose');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f1115);
scene.fog = new THREE.Fog(0x0f1115, 35, 120);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 22, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
app.appendChild(renderer.domElement);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 2.5, 0);
controls.minDistance = 12;
controls.maxDistance = 90;
controls.maxPolarAngle = Math.PI * 0.49;

const hemi = new THREE.HemisphereLight(0xb6d2ff, 0x101218, 0.9);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
keyLight.position.set(18, 25, 12);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);

const targetArea = 345;
const totalWidthDepthRatio = { width: 18, depth: 7 };
const roomWidth = Math.sqrt((targetArea * totalWidthDepthRatio.width) / totalWidthDepthRatio.depth);
const roomDepth = targetArea / roomWidth;
const wallHeight = 4;
const wallThickness = 0.2;

const roomRatio = {
  lab1: 2,
  lab2: 1,
  lab3: 1
};
const ratioTotal = roomRatio.lab1 + roomRatio.lab2 + roomRatio.lab3;
const lab1Width = (roomWidth * roomRatio.lab1) / ratioTotal;
const lab2Width = (roomWidth * roomRatio.lab2) / ratioTotal;
const lab3Width = (roomWidth * roomRatio.lab3) / ratioTotal;

const roomBands = {
  lab1: {
    minX: -roomWidth / 2,
    maxX: -roomWidth / 2 + lab1Width
  },
  lab2: {
    minX: -roomWidth / 2 + lab1Width,
    maxX: -roomWidth / 2 + lab1Width + lab2Width
  },
  lab3: {
    minX: -roomWidth / 2 + lab1Width + lab2Width,
    maxX: roomWidth / 2
  }
};

const roomCenters = {
  lab1: (roomBands.lab1.minX + roomBands.lab1.maxX) / 2,
  lab2: (roomBands.lab2.minX + roomBands.lab2.maxX) / 2,
  lab3: (roomBands.lab3.minX + roomBands.lab3.maxX) / 2
};

const frontZ = -roomDepth / 2;
const doorWidth = 1.45;
const doorHeaderWidth = 1.9;
const doorInsetRatios = [0.2, 0.8];

const roomDoorCenters = {
  lab1: doorInsetRatios.map((ratio) => roomBands.lab1.minX + (roomBands.lab1.maxX - roomBands.lab1.minX) * ratio),
  lab2: doorInsetRatios.map((ratio) => roomBands.lab2.minX + (roomBands.lab2.maxX - roomBands.lab2.minX) * ratio),
  lab3: doorInsetRatios.map((ratio) => roomBands.lab3.minX + (roomBands.lab3.maxX - roomBands.lab3.minX) * ratio)
};

const allDoorCenters = [...roomDoorCenters.lab1, ...roomDoorCenters.lab2, ...roomDoorCenters.lab3].sort((a, b) => a - b);
const movingToyCars = [];
const hoveringDroneSwarm = [];
const lab1ShelfAlignedZ = [frontZ + 4.0, frontZ + 6.4];
const chairAnchors = { lab1: [], lab2: [], lab3: [] };
const walkingTeachers = [];
const clickableDisplays = [];

function getTexturePreviewSource(texture) {
  const image = texture?.image;
  if (image && typeof image.toDataURL === 'function') {
    return image.toDataURL('image/png');
  }
  return '';
}

function openDisplayPreview(title, texture) {
  if (!previewOverlay || !previewTitle || !previewImage) {
    return;
  }
  previewTitle.textContent = title;
  previewImage.src = getTexturePreviewSource(texture);
  previewOverlay.classList.remove('hidden');
}

function closeDisplayPreview() {
  if (!previewOverlay) {
    return;
  }
  previewOverlay.classList.add('hidden');
}

function registerDisplayPreview(mesh, previewName, previewTexture) {
  mesh.userData.previewName = previewName;
  mesh.userData.previewTexture = previewTexture;
  clickableDisplays.push(mesh);
}

function addClickMe3DLabel(x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 92;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(10, 18, 28, 0.92)';
  ctx.fillRect(6, 6, canvas.width - 12, canvas.height - 12);
  ctx.strokeStyle = 'rgba(136, 231, 255, 0.95)';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  ctx.fillStyle = '#d8fbff';
  ctx.font = '700 42px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Click me', canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(1.18, 0.39, 1);
  sprite.position.set(x, y, z);
  roomGroup.add(sprite);
}

if (previewClose) {
  previewClose.addEventListener('click', closeDisplayPreview);
}

if (previewOverlay) {
  previewOverlay.addEventListener('click', (event) => {
    if (event.target === previewOverlay) {
      closeDisplayPreview();
    }
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeDisplayPreview();
  }
});

renderer.domElement.addEventListener('click', (event) => {
  if (!clickableDisplays.length) {
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hit = raycaster.intersectObjects(clickableDisplays, false)[0];
  if (!hit) {
    return;
  }

  const { previewName, previewTexture } = hit.object.userData;
  openDisplayPreview(previewName ?? 'Display Preview', previewTexture);
});

function getLabKeyByX(x) {
  if (x <= roomBands.lab1.maxX) {
    return 'lab1';
  }
  if (x <= roomBands.lab2.maxX) {
    return 'lab2';
  }
  return 'lab3';
}

const roomGroup = new THREE.Group();
scene.add(roomGroup);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(roomWidth, roomDepth),
  new THREE.MeshStandardMaterial({ color: 0xdfdfdf, roughness: 0.88, metalness: 0.03 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
roomGroup.add(floor);

const boundaryMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.72 });
const partitionMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccf, roughness: 0.72 });
const glassMaterial = new THREE.MeshStandardMaterial({
  color: 0x9fd0ff,
  roughness: 0.12,
  metalness: 0.12,
  transparent: true,
  opacity: 0.3
});

function makeWall(width, depth, height, x, y, z, material) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  wall.position.set(x, y, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  roomGroup.add(wall);
  return wall;
}

// Outer walls.
makeWall(roomWidth, wallThickness, wallHeight, 0, wallHeight / 2, roomDepth / 2, boundaryMaterial);
makeWall(wallThickness, roomDepth, wallHeight, -roomWidth / 2, wallHeight / 2, 0, boundaryMaterial);
makeWall(wallThickness, roomDepth, wallHeight, roomWidth / 2, wallHeight / 2, 0, boundaryMaterial);

// Front wall with six entry openings (two per room).
const openingPadding = 0.12;
const frontOpenings = allDoorCenters.map((x) => ({ left: x - doorWidth / 2 - openingPadding, right: x + doorWidth / 2 + openingPadding }));

let cursor = -roomWidth / 2;
frontOpenings.forEach((opening) => {
  if (opening.left > cursor) {
    const width = opening.left - cursor;
    makeWall(width, wallThickness, wallHeight, cursor + width / 2, wallHeight / 2, frontZ, boundaryMaterial);
  }
  cursor = Math.max(cursor, opening.right);
});

if (cursor < roomWidth / 2) {
  const width = roomWidth / 2 - cursor;
  makeWall(width, wallThickness, wallHeight, cursor + width / 2, wallHeight / 2, frontZ, boundaryMaterial);
}

const grid = new THREE.GridHelper(42, 42, 0x3f4b5d, 0x2c3440);
grid.position.y = -0.01;
scene.add(grid);

const partitionGroup = new THREE.Group();
roomGroup.add(partitionGroup);

const foldMarkerMaterial = new THREE.MeshStandardMaterial({
  color: 0x9aa4b5,
  roughness: 0.55,
  metalness: 0.3,
  transparent: true,
  opacity: 0.85
});

function makePartition(x) {
  const partition = new THREE.Group();

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, roomDepth - 0.8),
    partitionMaterial
  );
  panel.castShadow = true;
  panel.receiveShadow = true;
  partition.add(panel);

  const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, roomDepth - 1.4, 14), foldMarkerMaterial);
  marker.rotation.x = Math.PI / 2;
  marker.position.set(0.2, 1.25, 0);
  partition.add(marker);

  const kickPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.16, roomDepth - 1),
    new THREE.MeshStandardMaterial({ color: 0xaeb5bf, roughness: 0.65, metalness: 0.2 })
  );
  kickPlate.position.set(0.03, -wallHeight / 2 + 0.08, 0);
  partition.add(kickPlate);

  partition.position.set(x, wallHeight / 2, 0);
  partitionGroup.add(partition);
  return partition;
}

const partition1 = makePartition(roomBands.lab1.maxX);
const partition2 = makePartition(roomBands.lab2.maxX);

function makeDoor(x) {
  const sidePanel = new THREE.Mesh(
    new THREE.BoxGeometry(doorHeaderWidth, 0.08, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x3b4658, roughness: 0.46, metalness: 0.4 })
  );
  sidePanel.position.set(x, 2.8, frontZ + 0.02);
  roomGroup.add(sidePanel);

  const glassPanel = new THREE.Mesh(new THREE.BoxGeometry(doorHeaderWidth, 2.65, 0.06), glassMaterial);
  glassPanel.position.set(x, 1.35, frontZ + 0.03);
  roomGroup.add(glassPanel);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth, 2.8, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x74b9ff, transparent: true, opacity: 0.45 })
  );
  frame.position.set(x, 1.4, frontZ + 0.06);
  roomGroup.add(frame);

  const swingArc = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(
      new Array(24).fill(0).map((_, index) => {
        const angle = (Math.PI / 2) * (index / 23);
        return new THREE.Vector3(x - 0.8 + Math.cos(angle) * 0.8, 0.06, frontZ + 0.82 - Math.sin(angle) * 0.8);
      })
    ),
    new THREE.LineBasicMaterial({ color: 0xff9e76 })
  );
  roomGroup.add(swingArc);
}

allDoorCenters.forEach((doorCenter) => makeDoor(doorCenter));

function makeScreenTexture(title, subtitle, primaryColor, secondaryColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, primaryColor);
  gradient.addColorStop(1, secondaryColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 12;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(54, 70, 240, 48);
  ctx.fillRect(54, 140, 420, 20);
  ctx.fillRect(54, 180, 360, 20);

  ctx.fillStyle = '#f8fcff';
  ctx.font = '700 64px Inter, sans-serif';
  ctx.fillText(title, 56, 300);

  ctx.font = '500 34px Inter, sans-serif';
  ctx.fillStyle = 'rgba(236,246,255,0.94)';
  ctx.fillText(subtitle, 56, 355);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const screenTextures = {
  option1: {
    lab1: makeScreenTexture('AI LAB 1', 'Robotics Control & Motion AI', '#1a4f8f', '#0f243e'),
    lab2: makeScreenTexture('AI LAB 2', 'Code Copilot + LLM Ops', '#6042bf', '#1d1640'),
    lab3: makeScreenTexture('AI LAB 3', 'Computer Vision Workflow', '#0a7d82', '#0c3133')
  },
  option2Merged: makeScreenTexture('AI LAB 2 + 3', 'Shared Applied AI Program', '#2b5f97', '#1b2f4a'),
  openStudioShared: makeScreenTexture('OPEN STUDIO', 'Unified AI Showcase Stream', '#475a2f', '#1f2a1a')
};

function makeCodePeopleTexture(title, accentColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#11151d');
  gradient.addColorStop(1, '#1c2635');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = accentColor;
  ctx.font = '700 54px Inter, sans-serif';
  ctx.fillText(title, 46, 74);

  ctx.fillStyle = 'rgba(145, 222, 255, 0.92)';
  ctx.font = '500 28px Menlo, Consolas, monospace';
  const codeLines = [
    'def run_inference(model, frames):',
    '    people = detector.find_people(frames)',
    '    return analytics.predict(people)',
    'for stream in camera_streams:',
    '    status = run_inference(llm_model, stream)'
  ];
  codeLines.forEach((line, index) => {
    ctx.fillText(line, 42, 150 + index * 40);
  });

  const peoplePanelX = 650;
  const peoplePanelY = 120;
  const peoplePanelW = 330;
  const peoplePanelH = 390;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(peoplePanelX, peoplePanelY, peoplePanelW, peoplePanelH);
  ctx.strokeStyle = 'rgba(183,233,255,0.5)';
  ctx.lineWidth = 4;
  ctx.strokeRect(peoplePanelX, peoplePanelY, peoplePanelW, peoplePanelH);

  const portraitCenters = [
    { x: 735, y: 220 },
    { x: 890, y: 220 },
    { x: 812, y: 360 }
  ];
  portraitCenters.forEach((center, index) => {
    const hue = 180 + index * 24;
    ctx.fillStyle = `hsla(${hue}, 75%, 70%, 0.95)`;
    ctx.beginPath();
    ctx.arc(center.x, center.y - 28, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsla(${hue}, 70%, 55%, 0.95)`;
    ctx.beginPath();
    ctx.moveTo(center.x - 42, center.y + 52);
    ctx.quadraticCurveTo(center.x, center.y - 12, center.x + 42, center.y + 52);
    ctx.closePath();
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeLearningDashboardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0f1d2c');
  gradient.addColorStop(1, '#1a2f45');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#9ce6ff';
  ctx.font = '700 46px Inter, sans-serif';
  ctx.fillText('AI LAB 3 · LEARNING ACTIVITY DASHBOARD', 30, 62);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(30, 82, 964, 120);
  ctx.strokeStyle = 'rgba(179,234,255,0.65)';
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 82, 964, 120);

  const kpis = [
    { label: 'Active Learners', value: '25 / 25' },
    { label: 'On-task Rate', value: '92%' },
    { label: 'Avg Progress', value: '78%' },
    { label: 'Help Requests', value: '04' }
  ];

  kpis.forEach((kpi, index) => {
    const x = 52 + index * 236;
    ctx.fillStyle = '#d4f3ff';
    ctx.font = '600 24px Inter, sans-serif';
    ctx.fillText(kpi.label, x, 122);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 42px Inter, sans-serif';
    ctx.fillText(kpi.value, x, 172);
  });

  ctx.fillStyle = '#a8e7ff';
  ctx.font = '700 28px Inter, sans-serif';
  ctx.fillText('Student Device Screens', 34, 246);

  const cols = 5;
  const rows = 3;
  const tileW = 180;
  const tileH = 92;
  const startX = 34;
  const startY = 262;
  const gapX = 14;
  const gapY = 14;

  let deviceIndex = 1;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = startX + col * (tileW + gapX);
      const y = startY + row * (tileH + gapY);

      ctx.fillStyle = 'rgba(12,20,32,0.9)';
      ctx.fillRect(x, y, tileW, tileH);
      ctx.strokeStyle = 'rgba(130,220,255,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, tileW, tileH);

      ctx.fillStyle = '#7ad9ff';
      ctx.font = '600 18px Menlo, Consolas, monospace';
      ctx.fillText(`device_${deviceIndex.toString().padStart(2, '0')}`, x + 10, y + 24);

      ctx.fillStyle = 'rgba(173,236,255,0.95)';
      ctx.font = '500 16px Menlo, Consolas, monospace';
      ctx.fillText('lesson: vision-lab', x + 10, y + 46);
      ctx.fillText('status: active', x + 10, y + 66);

      ctx.fillStyle = '#94f0c8';
      ctx.fillRect(x + tileW - 74, y + tileH - 24, 64, 14);
      deviceIndex += 1;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeDataScienceLab2PreviewTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#0f1729');
  grad.addColorStop(1, '#1a2b46');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#a6e6ff';
  ctx.font = '700 52px Inter, sans-serif';
  ctx.fillText('AI LAB 2 · DATA SCIENCE SESSION', 38, 64);

  // Left: regression graph panel
  const graphX = 42;
  const graphY = 104;
  const graphW = 560;
  const graphH = 360;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(graphX, graphY, graphW, graphH);
  ctx.strokeStyle = 'rgba(180,232,255,0.7)';
  ctx.lineWidth = 3;
  ctx.strokeRect(graphX, graphY, graphW, graphH);

  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(graphX + 56, graphY + 24);
  ctx.lineTo(graphX + 56, graphY + graphH - 34);
  ctx.lineTo(graphX + graphW - 24, graphY + graphH - 34);
  ctx.stroke();

  ctx.fillStyle = '#87d6ff';
  for (let i = 0; i < 18; i += 1) {
    const x = graphX + 72 + i * 25;
    const y = graphY + graphH - 54 - (i * 9 + (i % 4) * 5);
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#7dffcb';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(graphX + 64, graphY + graphH - 56);
  ctx.lineTo(graphX + graphW - 40, graphY + 122);
  ctx.stroke();

  ctx.fillStyle = '#dbf7ff';
  ctx.font = '600 24px Inter, sans-serif';
  ctx.fillText('Linear Regression Fit', graphX + 20, graphY + 34);

  // Right top: calculations
  const calcX = 636;
  const calcY = 104;
  const calcW = 602;
  const calcH = 250;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(calcX, calcY, calcW, calcH);
  ctx.strokeStyle = 'rgba(180,232,255,0.7)';
  ctx.strokeRect(calcX, calcY, calcW, calcH);

  ctx.fillStyle = '#f5fbff';
  ctx.font = '600 28px Menlo, Consolas, monospace';
  ctx.fillText('y = β₀ + β₁x + ε', calcX + 24, calcY + 48);
  ctx.fillText('β₁ = Σ((x- x̄)(y-ȳ)) / Σ((x- x̄)²)', calcX + 24, calcY + 92);
  ctx.fillText('MSE = (1/n) Σ(yᵢ - ŷᵢ)²', calcX + 24, calcY + 136);
  ctx.fillText('R² = 1 - SSE/SST', calcX + 24, calcY + 180);
  ctx.fillStyle = '#9af0c5';
  ctx.fillText('Current model: R² = 0.87 | RMSE = 2.14', calcX + 24, calcY + 226);

  // Right bottom: theory + checklist
  const theoryX = 636;
  const theoryY = 384;
  const theoryW = 602;
  const theoryH = 290;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(theoryX, theoryY, theoryW, theoryH);
  ctx.strokeStyle = 'rgba(180,232,255,0.7)';
  ctx.strokeRect(theoryX, theoryY, theoryW, theoryH);

  ctx.fillStyle = '#d9f3ff';
  ctx.font = '700 28px Inter, sans-serif';
  ctx.fillText('Theory Notes', theoryX + 22, theoryY + 40);
  ctx.font = '500 23px Inter, sans-serif';
  const notes = [
    '• Assumptions: linearity, independence, homoscedasticity',
    '• Feature scaling improves gradient convergence',
    '• Residual analysis validates model stability',
    '• Train/validation split: 80/20 with k-fold checks',
    '• Interpretability: coefficient sensitivity review'
  ];
  notes.forEach((line, index) => {
    ctx.fillText(line, theoryX + 22, theoryY + 84 + index * 38);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeOutsidePoseRecognitionTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#112038');
  gradient.addColorStop(1, '#1f385f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#a5ecff';
  ctx.font = '700 52px Inter, sans-serif';
  ctx.fillText('AI LAB SHOWCASE · POSE RECOGNITION', 36, 64);

  // Camera view panel
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(40, 102, 760, 580);
  ctx.strokeStyle = 'rgba(170,231,255,0.75)';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 102, 760, 580);

  // Skeleton pose mockup
  ctx.strokeStyle = '#8bf2c8';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(410, 220, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(410, 256);
  ctx.lineTo(410, 390);
  ctx.moveTo(410, 285);
  ctx.lineTo(330, 320);
  ctx.moveTo(410, 285);
  ctx.lineTo(492, 320);
  ctx.moveTo(410, 390);
  ctx.lineTo(355, 490);
  ctx.moveTo(410, 390);
  ctx.lineTo(465, 490);
  ctx.stroke();

  // Guidance text
  ctx.fillStyle = '#e7f9ff';
  ctx.font = '600 30px Inter, sans-serif';
  ctx.fillText('Try this yoga pose: Warrior II', 74, 650);

  // Right status panel
  ctx.fillStyle = 'rgba(9,16,28,0.9)';
  ctx.fillRect(842, 102, 398, 580);
  ctx.strokeStyle = 'rgba(154, 229, 255, 0.8)';
  ctx.strokeRect(842, 102, 398, 580);

  ctx.fillStyle = '#9ee8ff';
  ctx.font = '700 34px Inter, sans-serif';
  ctx.fillText('Pose Match', 874, 152);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 64px Inter, sans-serif';
  ctx.fillText('88%', 872, 228);

  ctx.fillStyle = '#99f1cf';
  ctx.fillRect(874, 264, 320, 28);
  ctx.fillStyle = '#13212f';
  ctx.font = '600 22px Inter, sans-serif';
  ctx.fillText('Great alignment', 886, 286);

  ctx.fillStyle = '#c5efff';
  ctx.font = '600 24px Inter, sans-serif';
  ctx.fillText('• Raise left arm slightly', 874, 348);
  ctx.fillText('• Keep shoulders level', 874, 390);
  ctx.fillText('• Hold for 10 seconds', 874, 432);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeOutsideHeatmapTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#1c2132');
  gradient.addColorStop(1, '#25324a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#b2d8ff';
  ctx.font = '700 50px Inter, sans-serif';
  ctx.fillText('AI LAB SHOWCASE · CAMPUS HEATMAP', 34, 62);

  // Map panel
  const mapX = 42;
  const mapY = 102;
  const mapW = 880;
  const mapH = 580;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = 'rgba(190,221,255,0.75)';
  ctx.lineWidth = 3;
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  // School block outlines
  ctx.strokeStyle = 'rgba(230,240,255,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(mapX + 48, mapY + 56, 260, 170);
  ctx.strokeRect(mapX + 350, mapY + 64, 220, 150);
  ctx.strokeRect(mapX + 600, mapY + 90, 230, 210);
  ctx.strokeRect(mapX + 140, mapY + 290, 300, 220);
  ctx.strokeRect(mapX + 500, mapY + 340, 280, 180);

  function drawHeatSpot(x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHeatSpot(mapX + 180, mapY + 170, 90, 'rgba(255,70,50,0.72)');
  drawHeatSpot(mapX + 700, mapY + 220, 80, 'rgba(255,140,40,0.66)');
  drawHeatSpot(mapX + 360, mapY + 470, 95, 'rgba(255,80,80,0.72)');
  drawHeatSpot(mapX + 640, mapY + 440, 84, 'rgba(255,170,40,0.62)');

  // Legend panel
  ctx.fillStyle = 'rgba(11,16,28,0.9)';
  ctx.fillRect(954, 102, 286, 580);
  ctx.strokeStyle = 'rgba(190,221,255,0.75)';
  ctx.strokeRect(954, 102, 286, 580);

  ctx.fillStyle = '#cbe6ff';
  ctx.font = '700 30px Inter, sans-serif';
  ctx.fillText('Live Stats', 980, 152);
  ctx.font = '600 22px Inter, sans-serif';
  ctx.fillText('Students on campus: 612', 980, 204);
  ctx.fillText('High-density zones: 4', 980, 238);
  ctx.fillText('Low-density zones: 7', 980, 272);

  ctx.fillStyle = '#dbeeff';
  ctx.font = '700 24px Inter, sans-serif';
  ctx.fillText('Heat Index', 980, 338);

  const legendColors = ['#2dd4bf', '#facc15', '#fb923c', '#ef4444'];
  const legendLabels = ['Low', 'Moderate', 'Busy', 'Very High'];
  legendColors.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(982, 362 + index * 48, 34, 20);
    ctx.fillStyle = '#f5f9ff';
    ctx.font = '600 20px Inter, sans-serif';
    ctx.fillText(legendLabels[index], 1030, 379 + index * 48);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeSingaporeFlagTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');

  // Red upper half
  ctx.fillStyle = '#ef3340';
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

  // White lower half
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

  // Crescent
  const crescentCx = 185;
  const crescentCy = 150;
  const outerR = 74;
  const innerR = 58;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(crescentCx, crescentCy, outerR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef3340';
  ctx.beginPath();
  ctx.arc(crescentCx + 22, crescentCy, innerR, 0, Math.PI * 2);
  ctx.fill();

  function drawStar(cx, cy, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * i) / 5;
      const r = i % 2 === 0 ? outer : inner;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  // Five stars
  ctx.fillStyle = '#ffffff';
  const stars = [
    [285, 88],
    [335, 124],
    [316, 182],
    [254, 182],
    [235, 124]
  ];
  stars.forEach(([x, y]) => drawStar(x, y, 17, 7));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const backTvTextures = {
  lab1: makeCodePeopleTexture('AI LAB 1 · ROBOTICS CODE', '#7ed3ff'),
  lab2: makeCodePeopleTexture('AI LAB 2 · MODEL OPS', '#b8a4ff'),
  lab3: makeLearningDashboardTexture()
};

const backTvClickPreviewTextures = {
  lab1: backTvTextures.lab1,
  lab2: makeDataScienceLab2PreviewTexture(),
  lab3: backTvTextures.lab3
};

function addProjectorScreen(x, roomMinX, roomMaxX) {
  const availableWidth = roomMaxX - roomMinX;
  const screenWidth = Math.min(availableWidth * 0.42, 2.4);

  const screenFrame = new THREE.Mesh(
    new THREE.BoxGeometry(screenWidth + 0.16, 1.5, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x3b4658, roughness: 0.45, metalness: 0.25 })
  );
  screenFrame.position.set(x, 2.2, frontZ + 0.2);
  roomGroup.add(screenFrame);

  const screenPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(screenWidth, 1.32),
    new THREE.MeshStandardMaterial({ color: 0xf5f8fc, roughness: 0.7, metalness: 0.03, side: THREE.DoubleSide })
  );
  screenPanel.position.set(x, 2.2, frontZ + 0.24);
  roomGroup.add(screenPanel);

  return screenPanel;
}

const projectorScreens = {
  lab1: addProjectorScreen((roomDoorCenters.lab1[0] + roomDoorCenters.lab1[1]) / 2, roomBands.lab1.minX, roomBands.lab1.maxX),
  lab2: addProjectorScreen((roomDoorCenters.lab2[0] + roomDoorCenters.lab2[1]) / 2, roomBands.lab2.minX, roomBands.lab2.maxX),
  lab3: addProjectorScreen((roomDoorCenters.lab3[0] + roomDoorCenters.lab3[1]) / 2, roomBands.lab3.minX, roomBands.lab3.maxX)
};

function setScreenTexturesByMode(mode) {
  if (mode === 'option1') {
    projectorScreens.lab1.material.map = screenTextures.option1.lab1;
    projectorScreens.lab2.material.map = screenTextures.option1.lab2;
    projectorScreens.lab3.material.map = screenTextures.option1.lab3;
  } else if (mode === 'option2') {
    projectorScreens.lab1.material.map = screenTextures.option1.lab1;
    projectorScreens.lab2.material.map = screenTextures.option2Merged;
    projectorScreens.lab3.material.map = screenTextures.option2Merged;
  } else {
    projectorScreens.lab1.material.map = screenTextures.openStudioShared;
    projectorScreens.lab2.material.map = screenTextures.openStudioShared;
    projectorScreens.lab3.material.map = screenTextures.openStudioShared;
  }

  projectorScreens.lab1.material.needsUpdate = true;
  projectorScreens.lab2.material.needsUpdate = true;
  projectorScreens.lab3.material.needsUpdate = true;
}

function addTeacherTable(x, roomMinX, roomMaxX) {
  const roomSpan = roomMaxX - roomMinX;
  const tableWidth = Math.min(2.2, Math.max(1.5, roomSpan * 0.32));
  const teacherTopMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5566, roughness: 0.52, metalness: 0.18 });
  const teacherLegMaterial = new THREE.MeshStandardMaterial({ color: 0x2f3744, roughness: 0.5, metalness: 0.32 });
  const teacherTableZ = roomDepth / 2 - 1.35;

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(tableWidth, 0.1, 0.9),
    teacherTopMaterial
  );
  top.position.set(x, 0.76, teacherTableZ);
  top.castShadow = true;
  top.receiveShadow = true;
  roomGroup.add(top);

  for (const legX of [-tableWidth / 2 + 0.12, tableWidth / 2 - 0.12]) {
    for (const legZ of [-0.34, 0.34]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.08), teacherLegMaterial);
      leg.position.set(x + legX, 0.36, teacherTableZ + legZ);
      roomGroup.add(leg);
    }
  }
}

addTeacherTable((roomDoorCenters.lab1[0] + roomDoorCenters.lab1[1]) / 2, roomBands.lab1.minX, roomBands.lab1.maxX);
addTeacherTable((roomDoorCenters.lab2[0] + roomDoorCenters.lab2[1]) / 2, roomBands.lab2.minX, roomBands.lab2.maxX);
addTeacherTable((roomDoorCenters.lab3[0] + roomDoorCenters.lab3[1]) / 2, roomBands.lab3.minX, roomBands.lab3.maxX);

function addLaptop(x, y, z, rotationY = 0) {
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.02, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x2a2f39, roughness: 0.4, metalness: 0.55 })
  );
  base.position.set(x, y, z);
  base.rotation.y = rotationY;
  roomGroup.add(base);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.16, 0.015),
    new THREE.MeshStandardMaterial({ color: 0x8fe5ff, emissive: 0x2b7fa7, emissiveIntensity: 0.35, roughness: 0.3 })
  );
  screen.position.set(x + Math.sin(rotationY) * 0.085, y + 0.085, z + Math.cos(rotationY) * 0.085);
  screen.rotation.y = rotationY;
  screen.rotation.x = -Math.PI / 3.5;
  roomGroup.add(screen);
}

function createRoundTableCluster(zoneCenterX, roomMinX, roomMaxX, options = {}) {
  const topMaterial = new THREE.MeshStandardMaterial({ color: 0xdaf3f9, roughness: 0.54, metalness: 0.08 });
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x5ee5ea, roughness: 0.46, metalness: 0.1 });
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x7c8797, roughness: 0.45, metalness: 0.42 });
  const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x4f89ff, roughness: 0.52, metalness: 0.22 });
  const tableRadius = 0.68;
  const chairRingRadius = 0.94;
  const chairBackOffset = 0.17;
  const safeRadius = tableRadius + chairRingRadius + chairBackOffset;

  function addSixChairsAroundTable(tableX, tableZ) {
    const chairLegMaterial = new THREE.MeshStandardMaterial({ color: 0x2e3644, roughness: 0.6, metalness: 0.35 });
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      const chairX = tableX + Math.cos(angle) * chairRingRadius;
      const chairZ = tableZ + Math.sin(angle) * chairRingRadius;
      const facingYaw = Math.atan2(tableX - chairX, tableZ - chairZ);

      const chairGroup = new THREE.Group();
      chairGroup.position.set(chairX, 0, chairZ);
      chairGroup.rotation.y = facingYaw;
      roomGroup.add(chairGroup);

      const labKey = getLabKeyByX(chairX);
      chairAnchors[labKey].push({ x: chairX, z: chairZ, rotationY: facingYaw });

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.4), chairMaterial);
      seat.position.set(0, 0.48, 0);
      chairGroup.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.06), chairMaterial);
      back.position.set(0, 0.74, -0.17);
      chairGroup.add(back);

      for (const legX of [-0.15, 0.15]) {
        for (const legZ of [-0.15, 0.15]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.04), chairLegMaterial);
          leg.position.set(legX, 0.23, legZ);
          chairGroup.add(leg);
        }
      }
    }
  }

  const roomUsableWidth = Math.max(2.2, roomMaxX - roomMinX - 1.2);
  const defaultColumnCount = roomUsableWidth > 8 ? 3 : 2;
  const columnCount = options.columnCount ?? defaultColumnCount;
  const rowCount = options.rowCount ?? 4;
  const maxTables = options.maxTables ?? columnCount * rowCount;
  const maxClusterWidth = Math.max(0, roomMaxX - roomMinX - safeRadius * 2 - 0.2);
  const preferredClusterWidth = options.clusterWidth ?? Math.max(1.5, roomUsableWidth - 3.3);
  const clusterWidth = Math.min(preferredClusterWidth, maxClusterWidth);

  const frontClearanceZ = frontZ + 2.3;
  const backClearanceZ = roomDepth / 2 - safeRadius - 0.08;
  const maxAllowedPitch = rowCount > 1 ? (backClearanceZ - frontClearanceZ) / (rowCount - 1) : 0;
  const preferredPitch = options.rowPitch ?? 2.35;
  const rowPitch = rowCount > 1 ? Math.max(0.5, Math.min(preferredPitch, maxAllowedPitch)) : 0;
  const startZ = frontClearanceZ;
  const skipBackCount = options.skipBackCount ?? 0;

  const candidatePlacements = [];
  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < columnCount; col += 1) {
      const xOffset = columnCount === 1 ? 0 : (col / (columnCount - 1) - 0.5) * clusterWidth;
      candidatePlacements.push({
        x: zoneCenterX + xOffset,
        z: startZ + row * rowPitch
      });
    }
  }

  // Remove tables closest to teacher table (back wall side) when requested.
  const sortedByBack = [...candidatePlacements].sort((a, b) => b.z - a.z);
  const skipSet = new Set(sortedByBack.slice(0, skipBackCount).map((placement) => `${placement.x.toFixed(3)}:${placement.z.toFixed(3)}`));
  const placements = candidatePlacements.filter((placement) => !skipSet.has(`${placement.x.toFixed(3)}:${placement.z.toFixed(3)}`));

  let createdTables = 0;

  for (const placement of placements) {
    if (createdTables >= maxTables) {
      break;
    }
    const x = placement.x;
    const z = placement.z;

    const sectorGap = 0.02;
    const sectorLength = Math.PI * 2 / 3 - sectorGap;

    for (let section = 0; section < 3; section += 1) {
      const thetaStart = (Math.PI * 2 * section) / 3 + sectorGap / 2;
      const sectorTop = new THREE.Mesh(
        new THREE.CylinderGeometry(tableRadius, tableRadius, 0.08, 36, 1, false, thetaStart, sectorLength),
        topMaterial
      );
      sectorTop.position.set(x, 0.8, z);
      sectorTop.castShadow = true;
      sectorTop.receiveShadow = true;
      roomGroup.add(sectorTop);
    }

    const tableEdge = new THREE.Mesh(new THREE.TorusGeometry(tableRadius - 0.02, 0.02, 12, 48), edgeMaterial);
    tableEdge.rotation.x = Math.PI / 2;
    tableEdge.position.set(x, 0.84, z);
    roomGroup.add(tableEdge);

    const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 20), edgeMaterial);
    centerHub.position.set(x, 0.85, z);
    roomGroup.add(centerHub);

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.72, 20), legMaterial);
    pedestal.position.set(x, 0.42, z);
    roomGroup.add(pedestal);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 24), legMaterial);
    base.position.set(x, 0.04, z);
    roomGroup.add(base);

    addSixChairsAroundTable(x, z);
    addLaptop(x + 0.12, 0.85, z - 0.08, Math.PI * 0.2);
    createdTables += 1;
  }
}

function addLab1CageDisplays() {
  const cageBarMaterial = new THREE.MeshStandardMaterial({ color: 0x748396, roughness: 0.38, metalness: 0.5 });
  const shelfPanelMaterial = new THREE.MeshStandardMaterial({ color: 0xdfe5ec, roughness: 0.64, metalness: 0.08 });
  const cageX = roomBands.lab1.minX + 1.1;
  const cageDepth = 1.0;
  const cageLength = 1.8;
  const cageHeight = 2.7;
  const cageZCenters = lab1ShelfAlignedZ;

  function addCageFrame(centerZ) {
    const frame = new THREE.Group();
    const cornerOffsets = [
      [-cageDepth / 2, -cageLength / 2],
      [cageDepth / 2, -cageLength / 2],
      [-cageDepth / 2, cageLength / 2],
      [cageDepth / 2, cageLength / 2]
    ];

    cornerOffsets.forEach(([xOffset, zOffset]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, cageHeight, 0.04), cageBarMaterial);
      post.position.set(cageX + xOffset, cageHeight / 2, centerZ + zOffset);
      frame.add(post);
    });

    for (const y of [0.6, 1.35, 2.1]) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(cageDepth - 0.06, 0.04, cageLength - 0.08), shelfPanelMaterial);
      shelf.position.set(cageX, y, centerZ);
      frame.add(shelf);
    }

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(cageDepth, 0.04, cageLength), cageBarMaterial);
    topRail.position.set(cageX, cageHeight, centerZ);
    frame.add(topRail);

    roomGroup.add(frame);
  }

  function addWheeledRobot(x, y, z) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.3), new THREE.MeshStandardMaterial({ color: 0x4f89ff, roughness: 0.4, metalness: 0.3 }));
    body.position.set(x, y, z);
    roomGroup.add(body);

    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x2b303a, roughness: 0.8 });
    for (const wheelX of [-0.18, 0.18]) {
      for (const wheelZ of [-0.13, 0.13]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 14), wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x + wheelX, y - 0.12, z + wheelZ);
        roomGroup.add(wheel);
      }
    }
  }

  function addDrone(x, y, z) {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 14), new THREE.MeshStandardMaterial({ color: 0x96f4ff, roughness: 0.35, metalness: 0.25 }));
    core.position.set(x, y, z);
    roomGroup.add(core);

    for (let i = 0; i < 4; i += 1) {
      const angle = (Math.PI / 2) * i;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.03), new THREE.MeshStandardMaterial({ color: 0x6f7f94, roughness: 0.45, metalness: 0.45 }));
      arm.position.set(x + Math.cos(angle) * 0.11, y, z + Math.sin(angle) * 0.11);
      arm.rotation.y = angle;
      roomGroup.add(arm);

      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 16), new THREE.MeshStandardMaterial({ color: 0xb7f7ff, roughness: 0.25, metalness: 0.12 }));
      rotor.position.set(x + Math.cos(angle) * 0.23, y + 0.01, z + Math.sin(angle) * 0.23);
      roomGroup.add(rotor);
    }
  }

  function addAIScreenDisplay(x, y, z) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.06), new THREE.MeshStandardMaterial({ color: 0x707d8d, roughness: 0.5, metalness: 0.45 }));
    stand.position.set(x, y, z);
    roomGroup.add(stand);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.34, 0.04), new THREE.MeshStandardMaterial({ color: 0x8ce9ff, emissive: 0x208fbe, emissiveIntensity: 0.4, roughness: 0.28 }));
    screen.position.set(x, y + 0.28, z);
    screen.rotation.y = Math.PI / 2;
    roomGroup.add(screen);
  }

  addCageFrame(cageZCenters[0]);
  addCageFrame(cageZCenters[1]);

  addWheeledRobot(cageX, 0.74, cageZCenters[0] - 0.35);
  addDrone(cageX, 1.5, cageZCenters[0] + 0.2);
  addAIScreenDisplay(cageX + 0.02, 2.12, cageZCenters[0] - 0.1);

  addWheeledRobot(cageX, 0.74, cageZCenters[1] + 0.2);
  addDrone(cageX, 1.5, cageZCenters[1] - 0.25);
  addAIScreenDisplay(cageX + 0.02, 2.12, cageZCenters[1] + 0.15);
}

function addLab1PlayTableRoadAndCars() {
  const playTableWidth = 4.6;
  const playTableDepth = 2.7;
  const playTopY = 0.78;
  const cornerClearance = 0.45;
  const tableCenterX = roomBands.lab1.minX + playTableWidth / 2 + cornerClearance;
  const tableCenterZ = roomDepth / 2 - playTableDepth / 2 - cornerClearance;

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(playTableWidth, 0.1, playTableDepth),
    new THREE.MeshStandardMaterial({ color: 0x101317, roughness: 0.64, metalness: 0.12 })
  );
  top.position.set(tableCenterX, playTopY, tableCenterZ);
  top.castShadow = true;
  top.receiveShadow = true;
  roomGroup.add(top);

  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x3a404c, roughness: 0.5, metalness: 0.3 });
  for (const legX of [-playTableWidth / 2 + 0.18, playTableWidth / 2 - 0.18]) {
    for (const legZ of [-playTableDepth / 2 + 0.18, playTableDepth / 2 - 0.18]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 0.1), legMaterial);
      leg.position.set(tableCenterX + legX, 0.36, tableCenterZ + legZ);
      roomGroup.add(leg);
    }
  }

  const roadBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: 0.5, metalness: 0.08 });
  const laneMarkMaterial = new THREE.MeshStandardMaterial({ color: 0xeff3f8, roughness: 0.35, metalness: 0.06 });

  function localPoint(localX, localZ, y = playTopY + 0.06) {
    return new THREE.Vector3(tableCenterX + localX, y, tableCenterZ + localZ);
  }

  function drawRoadCurve(curve, width, thickness, material, segments = 72) {
    for (let index = 0; index < segments; index += 1) {
      const t1 = index / segments;
      const t2 = (index + 1) / segments;
      const p1 = curve.getPointAt(t1);
      const p2 = curve.getPointAt(t2);
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length < 0.001) {
        continue;
      }

      const strip = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, length), material);
      strip.position.set((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2);
      strip.rotation.y = Math.atan2(dx, dz);
      roomGroup.add(strip);
    }
  }

  const mainRoadCurve = new THREE.CatmullRomCurve3(
    [
      localPoint(-1.95, -0.95),
      localPoint(-1.15, -1.02),
      localPoint(-0.2, -0.58),
      localPoint(0.8, -1.02),
      localPoint(1.85, -0.75),
      localPoint(1.95, 0.15),
      localPoint(1.3, 0.95),
      localPoint(0.35, 0.85),
      localPoint(-0.55, 0.35),
      localPoint(-1.35, 0.92),
      localPoint(-1.95, 0.42),
      localPoint(-1.65, -0.45),
      localPoint(-0.95, -0.2),
      localPoint(-0.15, 0.25),
      localPoint(0.75, -0.2),
      localPoint(1.42, 0.2),
      localPoint(1.1, 0.85),
      localPoint(0.1, 1.02),
      localPoint(-0.9, 0.58),
      localPoint(-1.6, 0.05)
    ],
    true,
    'catmullrom',
    0.45
  );

  const uTurnBranchTop = new THREE.CatmullRomCurve3(
    [localPoint(-0.35, 0.68), localPoint(0.05, 1.08), localPoint(0.55, 0.68)],
    false,
    'catmullrom',
    0.5
  );

  const uTurnBranchBottom = new THREE.CatmullRomCurve3(
    [localPoint(-0.15, -0.68), localPoint(0.35, -1.08), localPoint(0.85, -0.68)],
    false,
    'catmullrom',
    0.5
  );

  const sTurnBranch = new THREE.CatmullRomCurve3(
    [localPoint(-1.2, -0.05), localPoint(-0.55, 0.35), localPoint(0.1, -0.35), localPoint(0.82, 0.12)],
    false,
    'catmullrom',
    0.5
  );

  drawRoadCurve(mainRoadCurve, 0.32, 0.018, roadBodyMaterial, 120);
  drawRoadCurve(uTurnBranchTop, 0.3, 0.018, roadBodyMaterial, 28);
  drawRoadCurve(uTurnBranchBottom, 0.3, 0.018, roadBodyMaterial, 28);
  drawRoadCurve(sTurnBranch, 0.28, 0.018, roadBodyMaterial, 34);

  drawRoadCurve(mainRoadCurve, 0.05, 0.021, laneMarkMaterial, 120);
  drawRoadCurve(uTurnBranchTop, 0.04, 0.021, laneMarkMaterial, 28);
  drawRoadCurve(uTurnBranchBottom, 0.04, 0.021, laneMarkMaterial, 28);
  drawRoadCurve(sTurnBranch, 0.04, 0.021, laneMarkMaterial, 34);

  function addMiniBuilding(localX, localZ, width, depth, height, colorHex) {
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.58, metalness: 0.18 })
    );
    building.position.set(tableCenterX + localX, playTopY + 0.05 + height / 2, tableCenterZ + localZ);
    building.castShadow = true;
    building.receiveShadow = true;
    roomGroup.add(building);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.05, 0.03, depth + 0.05),
      new THREE.MeshStandardMaterial({ color: 0x2e3b4f, roughness: 0.5, metalness: 0.22 })
    );
    roof.position.set(tableCenterX + localX, playTopY + 0.05 + height + 0.015, tableCenterZ + localZ);
    roomGroup.add(roof);

    const windowMat = new THREE.MeshStandardMaterial({ color: 0x93e9ff, emissive: 0x266b8d, emissiveIntensity: 0.25, roughness: 0.25 });
    const windowRows = Math.max(1, Math.floor(height / 0.22));
    for (let row = 0; row < windowRows; row += 1) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(width * 0.46, 0.05, 0.01), windowMat);
      window.position.set(tableCenterX + localX, playTopY + 0.2 + row * 0.18, tableCenterZ + localZ + depth / 2 + 0.006);
      roomGroup.add(window);
    }
  }

  addMiniBuilding(-2.02, -1.02, 0.42, 0.36, 0.52, 0xaeb9c7);
  addMiniBuilding(-2.0, 0.88, 0.34, 0.3, 0.42, 0x95a4b7);
  addMiniBuilding(1.95, -0.98, 0.38, 0.34, 0.48, 0xbec8d4);
  addMiniBuilding(1.85, 0.95, 0.44, 0.38, 0.58, 0x8f9db1);
  addMiniBuilding(0.05, 0.05, 0.3, 0.28, 0.36, 0xc2c9d6);

  function createToyCar(colorHex, phase, speed) {
    const carGroup = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.09, 0.2),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.34, metalness: 0.32 })
    );
    body.position.y = playTopY + 0.11;
    carGroup.add(body);

    const cockpit = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.06, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xb9f3ff, emissive: 0x1f5368, emissiveIntensity: 0.2, roughness: 0.3 })
    );
    cockpit.position.set(0.02, playTopY + 0.17, 0);
    carGroup.add(cockpit);

    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1e232b, roughness: 0.8 });
    for (const wheelX of [-0.11, 0.11]) {
      for (const wheelZ of [-0.09, 0.09]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 14), wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wheelX, playTopY + 0.07, wheelZ);
        carGroup.add(wheel);
      }
    }

    roomGroup.add(carGroup);
    movingToyCars.push({ mesh: carGroup, path: mainRoadCurve, phase, speed });
  }

  createToyCar(0xff8a4a, 0, 0.6);
  createToyCar(0x4ab8ff, Math.PI, 0.55);
}

function addHoveringDroneSwarm() {
  const boundaryX = roomBands.lab1.maxX - 1.65;
  const boundaryZ = 0;
  const droneCount = 6;

  function createDroneGroup(colorHex) {
    const drone = new THREE.Group();

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.06, 14),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.34, metalness: 0.24 })
    );
    drone.add(core);

    for (let armIndex = 0; armIndex < 4; armIndex += 1) {
      const angle = (Math.PI / 2) * armIndex;
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.02, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x6f7f94, roughness: 0.45, metalness: 0.45 })
      );
      arm.position.set(Math.cos(angle) * 0.12, 0, Math.sin(angle) * 0.12);
      arm.rotation.y = angle;
      drone.add(arm);

      const rotor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.01, 16),
        new THREE.MeshStandardMaterial({ color: 0xbef7ff, emissive: 0x2c8ba8, emissiveIntensity: 0.25, roughness: 0.28 })
      );
      rotor.position.set(Math.cos(angle) * 0.24, 0.01, Math.sin(angle) * 0.24);
      rotor.name = 'rotor';
      drone.add(rotor);
    }

    roomGroup.add(drone);
    return drone;
  }

  function addLoopGate(x, y, z, rotationY = 0) {
    const gate = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.035, 14, 50),
      new THREE.MeshStandardMaterial({ color: 0x8de8ff, emissive: 0x2e90ad, emissiveIntensity: 0.35, roughness: 0.32, metalness: 0.22 })
    );
    gate.position.set(x, y, z);
    gate.rotation.x = 0;
    gate.rotation.y = rotationY;
    roomGroup.add(gate);
  }

  const gate1 = new THREE.Vector3(boundaryX, 2.2, boundaryZ - 1.05);
  const gate2 = new THREE.Vector3(boundaryX, 2.75, boundaryZ + 1.05);

  // Two gates, facing each other, separated apart and placed in open space.
  addLoopGate(gate1.x, gate1.y, gate1.z, 0);
  addLoopGate(gate2.x, gate2.y, gate2.z, Math.PI);

  const loopPoints = [
    // Loop around gate 1 then pass through it.
    new THREE.Vector3(gate1.x - 0.85, gate1.y + 0.15, gate1.z - 0.35),
    new THREE.Vector3(gate1.x - 0.15, gate1.y + 0.4, gate1.z - 0.78),
    new THREE.Vector3(gate1.x + 0.7, gate1.y + 0.1, gate1.z - 0.3),
    new THREE.Vector3(gate1.x + 0.2, gate1.y - 0.2, gate1.z + 0.36),
    new THREE.Vector3(gate1.x, gate1.y, gate1.z),

    // Transition towards gate 2.
    new THREE.Vector3(boundaryX - 0.35, 2.45, boundaryZ),

    // Loop around gate 2 then pass through it.
    new THREE.Vector3(gate2.x - 0.8, gate2.y + 0.15, gate2.z + 0.35),
    new THREE.Vector3(gate2.x - 0.15, gate2.y + 0.42, gate2.z + 0.78),
    new THREE.Vector3(gate2.x + 0.72, gate2.y + 0.12, gate2.z + 0.28),
    new THREE.Vector3(gate2.x + 0.22, gate2.y - 0.22, gate2.z - 0.32),
    new THREE.Vector3(gate2.x, gate2.y, gate2.z),

    // Return leg to complete cycle.
    new THREE.Vector3(boundaryX + 0.35, 2.55, boundaryZ),
    new THREE.Vector3(gate1.x + 0.12, gate1.y + 0.22, gate1.z - 0.6)
  ];

  const swarmPath = new THREE.CatmullRomCurve3(loopPoints, true, 'catmullrom', 0.45);

  for (let index = 0; index < droneCount; index += 1) {
    const phase = (Math.PI * 2 * index) / droneCount;
    const droneMesh = createDroneGroup(index % 2 === 0 ? 0x79d7ff : 0x5ba3ff);
    hoveringDroneSwarm.push({
      mesh: droneMesh,
      path: swarmPath,
      pathSpeed: 0.46,
      bobSpeed: 1.5 + (index % 3) * 0.24,
      bobAmount: 0.08 + (index % 2) * 0.02,
      phase
    });
  }
}

function addLab1DisplayShelvesAndSideTables() {
  const shelfMaterial = new THREE.MeshStandardMaterial({ color: 0xd5dce5, roughness: 0.62, metalness: 0.1 });
  const shelfAccent = new THREE.MeshStandardMaterial({ color: 0x8896a9, roughness: 0.45, metalness: 0.28 });
  const shelfHeight = wallHeight - 0.2;
  const shelfDepth = 0.45;
  const shelfLength = 1.9;
  const shelfX = roomBands.lab1.minX + wallThickness / 2 + shelfDepth / 2 + 0.02;
  const shelfZPositions = lab1ShelfAlignedZ;

  shelfZPositions.forEach((shelfZ) => {
    const shelfBody = new THREE.Mesh(new THREE.BoxGeometry(shelfDepth, shelfHeight, shelfLength), shelfMaterial);
    shelfBody.position.set(shelfX, shelfHeight / 2, shelfZ);
    shelfBody.castShadow = true;
    shelfBody.receiveShadow = true;
    roomGroup.add(shelfBody);

    for (const offsetY of [-1.2, -0.35, 0.5, 1.35]) {
      const shelfPlank = new THREE.Mesh(new THREE.BoxGeometry(shelfDepth - 0.05, 0.05, shelfLength - 0.08), shelfAccent);
      shelfPlank.position.set(shelfX, shelfHeight / 2 + offsetY, shelfZ);
      roomGroup.add(shelfPlank);
    }
  });

}

function addBackWallTvScreens() {
  const backWallDisplayRotation = Math.PI;
  const tvSpecs = [
    { key: 'lab1', x: roomCenters.lab1, texture: backTvTextures.lab1 },
    { key: 'lab2', x: roomCenters.lab2, texture: backTvTextures.lab2 },
    { key: 'lab3', x: roomCenters.lab3, texture: backTvTextures.lab3 }
  ];

  tvSpecs.forEach((spec) => {
    const tvFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 2.2, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x2f3744, roughness: 0.4, metalness: 0.35 })
    );
    tvFrame.position.set(spec.x, 2.35, roomDepth / 2 - 0.2);
    roomGroup.add(tvFrame);

    const tvScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.45, 1.9),
      new THREE.MeshStandardMaterial({ map: spec.texture, roughness: 0.25, metalness: 0.05, side: THREE.DoubleSide })
    );
    tvScreen.position.set(spec.x, 2.35, roomDepth / 2 - 0.27);
    tvScreen.rotation.y = backWallDisplayRotation;
    roomGroup.add(tvScreen);
    registerDisplayPreview(tvScreen, 'TV Screen Preview', backTvClickPreviewTextures[spec.key] ?? spec.texture);
    addClickMe3DLabel(spec.x + 1.22, 3.02, roomDepth / 2 - 0.08);
  });
}

function addOutsideShowcaseScreens() {
  const outsideShowcase = [
    {
      x: roomCenters.lab1 + 0.3,
      z: frontZ - 1.75,
      title: 'Outside Showcase · Pose Recognition',
      texture: makeOutsidePoseRecognitionTexture()
    },
    {
      x: roomCenters.lab3 - 0.6,
      z: frontZ - 1.75,
      title: 'Outside Showcase · Campus Heatmap',
      texture: makeOutsideHeatmapTexture()
    }
  ];

  outsideShowcase.forEach((item) => {
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 2.0, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x2b3443, roughness: 0.5, metalness: 0.38 })
    );
    stand.position.set(item.x, 1.0, item.z);
    roomGroup.add(stand);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 1.95, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x1f2735, roughness: 0.42, metalness: 0.34 })
    );
    frame.position.set(item.x, 2.2, item.z);
    frame.rotation.y = Math.PI;
    roomGroup.add(frame);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 1.65),
      new THREE.MeshStandardMaterial({ map: item.texture, roughness: 0.25, metalness: 0.06, side: THREE.DoubleSide })
    );
    screen.position.set(item.x, 2.2, item.z - 0.06);
    screen.rotation.y = Math.PI;
    roomGroup.add(screen);
    registerDisplayPreview(screen, item.title, item.texture);
    addClickMe3DLabel(item.x + 1.0, 3.05, item.z - 0.12);
  });
}

function addLab3SingaporeFlag() {
  const flagTexture = makeSingaporeFlagTexture();

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 1.35, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x313b4c, roughness: 0.45, metalness: 0.28 })
  );
  frame.position.set(roomBands.lab3.maxX - 0.14, 2.35, roomDepth / 2 - 2.8);
  frame.rotation.y = -Math.PI / 2;
  roomGroup.add(frame);

  const flagPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.84, 1.22),
    new THREE.MeshStandardMaterial({ map: flagTexture, roughness: 0.24, metalness: 0.05, side: THREE.DoubleSide })
  );
  flagPanel.position.set(roomBands.lab3.maxX - 0.21, 2.35, roomDepth / 2 - 2.8);
  flagPanel.rotation.y = -Math.PI / 2;
  roomGroup.add(flagPanel);
}

function addPeopleFigurines() {
  const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xf2d4bf, roughness: 0.62, metalness: 0.05 });
  const darkCloth = new THREE.MeshStandardMaterial({ color: 0x3e6aa1, roughness: 0.58, metalness: 0.12 });
  const lightCloth = new THREE.MeshStandardMaterial({ color: 0x8e78c8, roughness: 0.56, metalness: 0.1 });
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2f3744, roughness: 0.58, metalness: 0.18 });

  function createStandingFigure(x, z, facingY, shirtMat) {
    const person = new THREE.Group();
    person.position.set(x, 0, z);
    person.rotation.y = facingY;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 18), skinMaterial);
    head.position.set(0, 1.58, 0);
    person.add(head);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.42, 8, 12), shirtMat);
    torso.position.set(0, 1.2, 0);
    person.add(torso);

    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.62, 10), legMaterial);
    leftLeg.position.set(-0.06, 0.63, 0.01);
    person.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.62, 10), legMaterial);
    rightLeg.position.set(0.06, 0.63, -0.01);
    person.add(rightLeg);

    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.44, 10), skinMaterial);
    leftArm.position.set(-0.16, 1.2, -0.05);
    leftArm.rotation.z = 0.45;
    person.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.44, 10), skinMaterial);
    rightArm.position.set(0.16, 1.18, -0.06);
    rightArm.rotation.z = -0.45;
    person.add(rightArm);

    const ipad = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.14, 0.015),
      new THREE.MeshStandardMaterial({ color: 0xb0edff, emissive: 0x2c6d8f, emissiveIntensity: 0.25, roughness: 0.25 })
    );
    ipad.position.set(0, 1.18, -0.2);
    ipad.rotation.x = -0.4;
    person.add(ipad);

    roomGroup.add(person);
  }

  function createSeatedFigureOnChair(chairAnchor, shirtMat) {
    const person = new THREE.Group();
    person.position.set(chairAnchor.x, 0, chairAnchor.z);
    person.rotation.y = chairAnchor.rotationY;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), skinMaterial);
    head.position.set(0, 1.18, 0);
    person.add(head);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 8, 10), shirtMat);
    torso.position.set(0, 0.95, 0);
    person.add(torso);

    const upperLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 10), legMaterial);
    upperLegL.position.set(-0.08, 0.74, 0.12);
    upperLegL.rotation.x = Math.PI / 2;
    person.add(upperLegL);

    const upperLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 10), legMaterial);
    upperLegR.position.set(0.08, 0.74, 0.12);
    upperLegR.rotation.x = Math.PI / 2;
    person.add(upperLegR);

    const lowerLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 10), legMaterial);
    lowerLegL.position.set(-0.08, 0.6, 0.26);
    lowerLegL.rotation.x = 0;
    person.add(lowerLegL);

    const lowerLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 10), legMaterial);
    lowerLegR.position.set(0.08, 0.6, 0.26);
    lowerLegR.rotation.x = 0;
    person.add(lowerLegR);

    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 10), skinMaterial);
    leftArm.position.set(-0.13, 0.96, -0.02);
    leftArm.rotation.z = 0.4;
    leftArm.rotation.x = -0.3;
    person.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 10), skinMaterial);
    rightArm.position.set(0.13, 0.96, -0.02);
    rightArm.rotation.z = -0.4;
    rightArm.rotation.x = -0.3;
    person.add(rightArm);

    roomGroup.add(person);
  }

  function createWalkingTeacher(x, z, facingY, shirtMat) {
    const teacher = new THREE.Group();
    teacher.position.set(x, 0, z);
    teacher.rotation.y = facingY;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 18), skinMaterial);
    head.position.set(0, 1.6, 0);
    teacher.add(head);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.45, 8, 12), shirtMat);
    torso.position.set(0, 1.22, 0);
    teacher.add(torso);

    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.66, 10), legMaterial);
    leftLeg.position.set(-0.07, 0.63, 0.02);
    teacher.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.66, 10), legMaterial);
    rightLeg.position.set(0.07, 0.63, -0.02);
    teacher.add(rightLeg);

    const ipad = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.14, 0.015),
      new THREE.MeshStandardMaterial({ color: 0xb0edff, emissive: 0x2c6d8f, emissiveIntensity: 0.25, roughness: 0.25 })
    );
    ipad.position.set(-0.14, 1.12, -0.18);
    ipad.rotation.x = -0.25;
    ipad.rotation.y = 0.22;
    teacher.add(ipad);

    roomGroup.add(teacher);
    return teacher;
  }

  // Standing iPad workers near the play table and display zone.
  createStandingFigure(roomBands.lab1.minX + 4.5, roomDepth / 2 - 2.6, Math.PI * 0.9, darkCloth);
  createStandingFigure(roomBands.lab1.minX + 5.5, roomDepth / 2 - 2.15, Math.PI * 1.05, lightCloth);
  createStandingFigure(roomBands.lab1.maxX - 0.9, -0.2, -Math.PI / 2, darkCloth);

  // Seated discussion groups using existing chairs in Lab 2.
  chairAnchors.lab2.slice(0, 2).forEach((anchor, index) => {
    createSeatedFigureOnChair(anchor, index % 2 === 0 ? lightCloth : darkCloth);
  });

  // Fill Lab 3 with ~25 seated figurines on existing chairs.
  chairAnchors.lab3.slice(0, 25).forEach((anchor, index) => {
    createSeatedFigureOnChair(anchor, index % 2 === 0 ? darkCloth : lightCloth);
    const laptopDistance = 0.56;
    const laptopX = anchor.x + Math.sin(anchor.rotationY) * laptopDistance;
    const laptopZ = anchor.z + Math.cos(anchor.rotationY) * laptopDistance;
    addLaptop(laptopX, 0.83, laptopZ, anchor.rotationY);
  });

  // Teacher walking to and fro near the back teaching zone in Lab 3.
  const teacherBackLaneZ = roomDepth / 2 - 2.35;
  const teacherMesh = createWalkingTeacher(roomCenters.lab3 - 1.0, teacherBackLaneZ, 0, darkCloth);
  walkingTeachers.push({
    mesh: teacherMesh,
    startX: roomCenters.lab3 - 0.9,
    endX: roomCenters.lab3 + 0.9,
    z: teacherBackLaneZ,
    speed: 0.9,
    phase: 0
  });
}

function addLab1ScientificPosters() {
  const backWallDisplayRotation = Math.PI;
  function makePosterTexture(title, subtitle, accent, mockLines) {
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, canvas.width, 140);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 58px Arial, sans-serif';
    ctx.fillText(title, 28, 88);

    ctx.fillStyle = '#111827';
    ctx.font = '700 32px Arial, sans-serif';
    ctx.fillText(subtitle, 32, 196);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(30, 230, 640, 70);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 30px Arial, sans-serif';
    ctx.fillText('SCIENTIFIC POSTER MOCKUP', 46, 275);

    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 330, 640, 620);

    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(54, 356, 592, 566);

    ctx.fillStyle = '#111827';
    ctx.font = '700 30px Arial, sans-serif';
    ctx.fillText('KEY FINDINGS', 72, 404);

    ctx.font = '700 26px Arial, sans-serif';
    const visibleLines = mockLines.slice(0, 5);
    visibleLines.forEach((line, index) => {
      ctx.fillText(`• ${line}`, 72, 456 + index * 78);
    });

    ctx.fillStyle = '#0b3a5e';
    ctx.font = '700 28px Arial, sans-serif';
    ctx.fillText('Methods  •  Metrics  •  Deployment', 72, 910);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  const posters = [
    {
      x: roomBands.lab1.minX + 1.8,
      texture: makePosterTexture('AI RESEARCH', 'Autonomous Systems and RL', '#2e6ea3', [
        'Swarm policy training for',
        'real-time obstacle search',
        'with multi-agent rewards.',
        'Latency cut by 34%.',
        'Field test accuracy: 92.4%',
        'False positives reduced 18%',
        'Edge model memory: 210MB',
        'Live pilot: 6 classrooms'
      ])
    },
    {
      x: roomBands.lab1.maxX - 1.8,
      texture: makePosterTexture('DATA SCIENCE', 'Vision + Human-AI Collaboration', '#5a5fc5', [
        'Vision pipeline tracks',
        'team interactions and flow',
        'using privacy-safe features.',
        'Dashboard refresh: 2.1s',
        'Model drift monitor enabled',
        'Prompt tuning loop active',
        'Analyst feedback integrated',
        'Weekly report auto-generated'
      ])
    }
  ];

  posters.forEach((poster) => {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 2.65, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x2f3744, roughness: 0.4, metalness: 0.25 })
    );
    frame.position.set(poster.x, 2.2, roomDepth / 2 - 0.2);
    roomGroup.add(frame);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.75, 2.45),
      new THREE.MeshStandardMaterial({ map: poster.texture, roughness: 0.22, metalness: 0.05, side: THREE.DoubleSide })
    );
    panel.position.set(poster.x, 2.2, roomDepth / 2 - 0.24);
    panel.rotation.y = backWallDisplayRotation;
    roomGroup.add(panel);
    registerDisplayPreview(panel, 'Scientific Poster Preview', poster.texture);
    addClickMe3DLabel(poster.x + 0.55, 3.45, roomDepth / 2 - 0.08);
  });
}

createRoundTableCluster(roomCenters.lab1 + 0.9, roomBands.lab1.minX, roomBands.lab1.maxX, {
  columnCount: 3,
  rowCount: 3,
  maxTables: 9,
  clusterWidth: 4.8,
  rowPitch: 3.0
});
createRoundTableCluster(roomCenters.lab2, roomBands.lab2.minX, roomBands.lab2.maxX, {
  skipBackCount: 2,
  clusterWidth: 3.0,
  rowPitch: 2.75
});
createRoundTableCluster(roomCenters.lab3, roomBands.lab3.minX, roomBands.lab3.maxX, {
  skipBackCount: 2,
  clusterWidth: 3.0,
  rowPitch: 2.75
});
addLab1DisplayShelvesAndSideTables();
addLab1CageDisplays();
addLab1PlayTableRoadAndCars();
addHoveringDroneSwarm();
addBackWallTvScreens();
addLab3SingaporeFlag();
addLab1ScientificPosters();
addPeopleFigurines();
addOutsideShowcaseScreens();

const partitionSet = [partition1, partition2];
let currentMode = 'option1';

function setMode(mode) {
  currentMode = mode;
  partition1.visible = mode === 'option1' || mode === 'option2';
  partition2.visible = mode === 'option1';
  partitionSet.forEach((partition) => {
    partition.scale.x = 1;
    partition.position.y = wallHeight / 2;
  });

  setScreenTexturesByMode(mode);

  document.getElementById('option1').classList.toggle('active', mode === 'option1');
  document.getElementById('option2').classList.toggle('active', mode === 'option2');
  document.getElementById('openStudio').classList.toggle('active', mode === 'open');
}

document.getElementById('option1').addEventListener('click', () => setMode('option1'));
document.getElementById('option2').addEventListener('click', () => setMode('option2'));
document.getElementById('openStudio').addEventListener('click', () => setMode('open'));

setMode('option1');

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  movingToyCars.forEach((car) => {
    const t = (elapsed * car.speed * 0.1 + car.phase / (Math.PI * 2)) % 1;
    const point = car.path.getPointAt(t);
    const tangent = car.path.getTangentAt(t);
    car.mesh.position.set(point.x, 0, point.z);
    car.mesh.rotation.y = Math.atan2(tangent.x, tangent.z);
  });

  hoveringDroneSwarm.forEach((drone, index) => {
    const t = (elapsed * drone.pathSpeed * 0.11 + drone.phase / (Math.PI * 2)) % 1;
    const point = drone.path.getPointAt(t);
    const tangent = drone.path.getTangentAt(t);
    const bob = Math.sin(elapsed * drone.bobSpeed + drone.phase) * drone.bobAmount;

    const safeMargin = 0.8;
    const clampedX = THREE.MathUtils.clamp(point.x, roomBands.lab1.minX + safeMargin, roomBands.lab1.maxX - safeMargin);
    const clampedZ = THREE.MathUtils.clamp(point.z, frontZ + safeMargin, roomDepth / 2 - safeMargin);

    drone.mesh.position.set(clampedX, point.y + bob, clampedZ);
    drone.mesh.rotation.y = Math.atan2(tangent.x, tangent.z);

    drone.mesh.children.forEach((child) => {
      if (child.name === 'rotor') {
        child.rotation.y = elapsed * (11 + index * 0.4);
      }
    });
  });

  walkingTeachers.forEach((teacher) => {
    const travel = (Math.sin(elapsed * teacher.speed + teacher.phase) + 1) / 2;
    teacher.mesh.position.x = THREE.MathUtils.lerp(teacher.startX, teacher.endX, travel);
    teacher.mesh.position.z = teacher.z;
    teacher.mesh.rotation.y = (Math.cos(elapsed * teacher.speed + teacher.phase) >= 0 ? 0 : Math.PI) + Math.PI;
  });

  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
