// elements
const floorSel = document.getElementById("floorSelect");
const fsBtn    = document.getElementById("fsBtn");
const img      = document.getElementById("floorImg");
const canvas   = document.getElementById("canvas");
const dirBox   = document.getElementById("directions");

let currentFloor = "overview";
let pinEl = null;

// 1. full‑screen
fsBtn.onclick = () => {
  const el = document.documentElement;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    el.requestFullscreen().catch(console.error);
  }
};

// 2. floor switching
floorSel.onchange = () => {
  currentFloor = floorSel.value;
  img.src = `assets/img/${currentFloor}.png`;
  clearPin();
};



// 4. navigate + pin
function goTo(dest) {
  const loc = (LOCATIONS[currentFloor] || {})[dest];
  if (!loc) {
    alert(`"${dest}" not found on ${currentFloor}`);
    return;
  }
  clearPin();
  // place pin
  pinEl = document.createElement("div");
  pinEl.className = "pin";
  pinEl.style.left = `${loc.x}px`;
  pinEl.style.top  = `${loc.y}px`;
  canvas.appendChild(pinEl);

  // auto‑scroll viewport so the pin is visible (+center bias)
  const viewport = document.getElementById("viewport");
  const centerX = loc.x - viewport.clientWidth / 2;
  const centerY = loc.y - viewport.clientHeight / 2;
  viewport.scrollTo({ left: centerX, top: centerY, behavior: "smooth" });

  // simple text direction from Block A, if available
  const ref = (LOCATIONS[currentFloor] || {})["Block A"];
  if (ref) {
    const dx = loc.x - ref.x;
    const dy = loc.y - ref.y;
    const dir =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "east"
          : "west"
        : dy > 0
        ? "south"
        : "north";
    dirBox.textContent = `From Block A walk roughly ${dir} to reach ${dest}.`;
    dirBox.style.display = "block";
  }
}

function clearPin() {
  pinEl?.remove();
  pinEl = null;
  dirBox.style.display = "none";
}
/* add to the very bottom of app.js (or wrap in an IIFE) */
(function () {
  const viewport = document.getElementById("viewport");
  const canvas   = document.getElementById("canvas");
  const img      = document.getElementById("floorImg");

  img.onload = scaleToFit;
  window.addEventListener("resize", scaleToFit);

function scaleToFit() {
  const naturalW = img.naturalWidth;             // image width in pixels
  const naturalH = img.naturalHeight;            // image height in pixels
  const vw       = viewport.clientWidth * 0.95;  // 95 % of viewport width
  const scale    = Math.min(1, vw / naturalW);   // never upscale above 1

  // 1. scale image + pins together
  canvas.style.transform       = `scale(${scale})`;
  canvas.style.transformOrigin = "top left";

  // 2. expose the new bounding box so flexbox can centre it
  canvas.style.width  = `${naturalW * scale}px`;
  canvas.style.height = `${naturalH * scale}px`;
}

  if (img.complete) scaleToFit();
})();
