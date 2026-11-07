const gallery = document.querySelector(".gallery-controls");
const hero = document.querySelector(".hero");
const heroCopy = document.querySelector(".hero-copy");
const messages = document.querySelectorAll("#hero-message [data-copy]");
const screen = document.querySelector("#phone-screen");
const rotor = document.querySelector(".phone-rotor");
const galleryStage = document.querySelector(".gallery-stage");
const galleryNote = document.querySelector(".gallery-note");
const notePanels = galleryNote.querySelectorAll("[data-note]");
const focusPoint = document.querySelector(".screen-focus span");
const connector = document.querySelector(".gallery-connector path");
const buttons = gallery.querySelectorAll("button");
const slides = Array.from(buttons, (button) => button.dataset.screen);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const wideHero = matchMedia("(min-width: 701px)");
const copySides = Object.fromEntries(Array.from(buttons, (button) => [
  button.dataset.screen,
  button.dataset.copySide || "left",
]));
const altText = {
  typo: "iPhone 試打截圖。第一個謝的注音打錯，候選列以橘色顯示「謝謝你的幫忙」。",
  notone: "iPhone 試打截圖。輸入沒有聲調的 ㄋㄧㄏㄠ，第一個候選是「你好」。",
  learned: "iPhone 試打截圖。輸入 ㄊㄚㄇㄣˊ，候選列以藍色把「她們」排在第一位。",
  delete: "iPhone 試打截圖。鍵盤右下角的 ㄥ 和刪除鍵相鄰，兩個鍵已框出。",
};
let selected = "typo";
let flip;
let copyMotion;
let wheelRevealPending = false;
let scrollHoldUntil = 0;

function positionConnector() {
  const stage = galleryStage.getBoundingClientRect();
  const note = galleryNote.getBoundingClientRect();
  const art = heroArt.getBoundingClientRect();
  const maskX = note.left + note.width / 2 - art.left;
  const maskY = note.top + note.height / 2 - art.top;
  heroArt.style.setProperty("--note-cutout", `radial-gradient(ellipse ${note.width * .9}px ${note.height * .9}px at ${maskX}px ${maskY}px, transparent 80%, #000 100%)`);
  const target = focusPoint.getBoundingClientRect();
  const x1 = (galleryStage.dataset.screen === "delete" ? note.left : note.right) - stage.left;
  const y1 = note.top + note.height / 2 - stage.top;
  const x2 = target.left - stage.left;
  const y2 = target.top - stage.top;
  const midpoint = (x1 + x2) / 2;
  connector.setAttribute("d", `M${x1} ${y1} C${midpoint} ${y1} ${midpoint} ${y2} ${x2} ${y2}`);
}

function finishFlip() {
  positionConnector();
  galleryStage.classList.remove("is-flipping");
}

function showScreen(id) {
  screen.src = "assets/ios-" + id + ".webp";
  screen.alt = altText[id];
  hero.dataset.screen = id;
  hero.dataset.copySide = copySides[id];
  for (const message of messages) {
    message.setAttribute("aria-hidden", String(message.dataset.copy !== id));
  }
  hero.classList.remove("is-changing-copy");
  galleryStage.dataset.screen = id;
  for (const panel of notePanels) panel.hidden = panel.dataset.note !== id;
}

async function selectScreen(id, scrollDriven = false) {
  if (id === selected) return;
  const direction = slides.indexOf(id) > slides.indexOf(selected) ? 1 : -1;
  selected = id;
  for (const button of buttons) {
    button.setAttribute("aria-pressed", String(button.dataset.screen === id));
  }
  flip?.cancel();
  copyMotion?.cancel();
  const holdWheel = storyMode.matches;
  wheelRevealPending = holdWheel;
  if (reduceMotion.matches || !rotor.animate) {
    showScreen(id);
    finishFlip();
    wheelRevealPending = false;
    if (holdWheel) scrollHoldUntil = performance.now() + 100;
    return;
  }
  galleryStage.classList.add("is-flipping");
  hero.classList.add("is-changing-copy");
  const exitDuration = scrollDriven ? 80 : 175;
  const enterDuration = scrollDriven ? 165 : 460;
  const previous = rotor.getBoundingClientRect();
  const copyMoves = wideHero.matches && hero.dataset.copySide !== copySides[id];
  const previousCopyLeft = copyMoves ? heroCopy.getBoundingClientRect().left : 0;
  try {
    flip = rotor.animate(
      [
        { opacity: 1, transform: "translate3d(0, 0, 0) rotateY(0deg) rotateZ(0deg) scale(1)" },
        { opacity: 0, transform: `translate3d(${-26 * direction}px, 10px, 0) rotateY(${-25 * direction}deg) rotateZ(${-4 * direction}deg) scale(.96)` },
      ],
      { duration: exitDuration, easing: "cubic-bezier(.4,0,.8,1)", fill: "forwards" }
    );
    if (copyMoves) {
      copyMotion = heroCopy.animate(
        [
          { opacity: 1, transform: "translate(0, 0)" },
          { opacity: 0, transform: `translate(${18 * direction}px, -8px)` },
        ],
        { duration: exitDuration, easing: "ease-in", fill: "forwards" }
      );
    }
    await flip.finished;
    showScreen(id);
    flip.cancel();
    copyMotion?.cancel();
    const next = rotor.getBoundingClientRect();
    const travel = previous.left + previous.width / 2 - next.left - next.width / 2;
    const entrance = Math.max(-170, Math.min(170, travel * .72 + 24 * direction));
    flip = rotor.animate(
      [
        { opacity: .08, transform: `translate3d(${entrance}px, 19px, 0) rotateY(${28 * direction}deg) rotateZ(${5 * direction}deg) scale(.95)` },
        { opacity: 1, offset: .48 },
        { opacity: 1, transform: "translate3d(0, 0, 0) rotateY(0deg) rotateZ(0deg) scale(1)" },
      ],
      { duration: enterDuration, easing: "cubic-bezier(.2,.72,.26,1)" }
    );
    if (copyMoves) {
      const copyTravel = previousCopyLeft - heroCopy.getBoundingClientRect().left;
      const copyEntrance = Math.max(-180, Math.min(180, copyTravel * .45 - 22 * direction));
      copyMotion = heroCopy.animate(
        [
          { opacity: 0, transform: `translate(${copyEntrance}px, 12px)` },
          { opacity: 1, transform: "translate(0, 0)" },
        ],
        { duration: enterDuration - 20, easing: "cubic-bezier(.2,.72,.26,1)" }
      );
    }
    const arrival = flip;
    await arrival.finished;
    finishFlip();
    if (holdWheel) {
      const fades = [galleryNote, connector.ownerSVGElement].flatMap((element) => element.getAnimations());
      await Promise.allSettled(fades.map((fade) => fade.finished));
      await new Promise(requestAnimationFrame);
      if (flip === arrival && storyMode.matches) {
        scrollHoldUntil = performance.now() + 100;
        wheelRevealPending = false;
      }
    }
  } catch {
    // A newer selection cancelled this flip.
  }
}

gallery.hidden = false;
if ("ResizeObserver" in window) {
  const annotationResize = new ResizeObserver(positionConnector);
  annotationResize.observe(galleryStage);
  annotationResize.observe(galleryNote);
}
window.addEventListener("resize", positionConnector);
window.addEventListener("load", () => {
  for (const id of slides.slice(1)) {
    const preload = new Image();
    preload.src = "assets/ios-" + id + ".webp";
  }
}, { once: true });

const heroBand = document.querySelector(".hero-band");
const heroFrame = document.querySelector(".hero-frame");
const heroArt = document.querySelector(".hero-art");
const siteHeader = document.querySelector("#site-header");
const desktopMotion = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const storyMode = matchMedia(`${desktopMotion} and (min-width: 701px) and (min-height: 520px), ${desktopMotion} and (min-height: 800px)`);
let scrollStep = -1;
let scrollFrame = 0;
let headerHeight = 0;
let wheelRecovery = null;
let wheelRemainder = 0;

function storyPosition() {
  return headerHeight - heroBand.getBoundingClientRect().top;
}

function storyStep(position, segment) {
  return Math.max(0, Math.min(slides.length - 1, Math.floor(position / segment)));
}

function clearWheelRecovery() {
  wheelRecovery = null;
  wheelRemainder = 0;
}

function storyWheelTop() {
  if (wheelRecovery && performance.now() >= wheelRecovery.expires) wheelRecovery = null;
  return wheelRecovery?.top ?? window.scrollY;
}

function syncStoryToScroll() {
  scrollFrame = 0;
  const top = storyWheelTop();
  if (top !== window.scrollY) {
    window.scrollTo(0, top);
    return;
  }
  const distance = heroBand.clientHeight - heroFrame.offsetHeight;
  if (!storyMode.matches || distance <= 0) return;
  const step = storyStep(storyPosition(), distance / slides.length);
  if (step === scrollStep) return;
  scrollStep = step;
  selectScreen(slides[step], true);
}

function applyStoryWheel(event, top) {
  event.preventDefault();
  if (top !== window.scrollY) window.scrollTo(0, top);
  wheelRemainder = top - window.scrollY;

  // Some momentum events cannot be canceled. Correct any native movement
  // before the scroll listener can select a different card.
  if (!event.cancelable || wheelRecovery) {
    wheelRecovery = { top: window.scrollY, expires: performance.now() + 220 };
    scheduleStorySync();
  }
}

function stepStoryWithWheel(event) {
  if (!storyMode.matches || event.ctrlKey) return;
  const mode = event.deltaMode;
  if (!event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

  const distance = heroBand.clientHeight - heroFrame.offsetHeight;
  const top = storyWheelTop();
  const position = storyPosition() + top - window.scrollY;
  if (distance <= 0 || position < 0 || position > distance) return;

  if (wheelRevealPending || galleryStage.classList.contains("is-flipping") || performance.now() < scrollHoldUntil) {
    applyStoryWheel(event, top);
    return;
  }

  const segment = distance / slides.length;
  const step = storyStep(position, segment);
  const unit = mode === 1 ? 16 : mode === 2 ? heroFrame.offsetHeight : 1;
  const destination = position + event.deltaY * unit + wheelRemainder;
  if (Math.floor(destination / segment) === step) {
    applyStoryWheel(event, top + destination - position);
    return;
  }

  const next = step + Math.sign(event.deltaY);
  if (next < 0 || next >= slides.length) {
    clearWheelRecovery();
    return;
  }

  const first = next * segment + 2;
  const last = (next + 1) * segment - 2;
  const target = Math.min(last, Math.max(first, destination));
  applyStoryWheel(event, top + target - position);
  scrollStep = next;
  selectScreen(slides[next], true);
}

function scheduleStorySync() {
  if (storyMode.matches && !scrollFrame) scrollFrame = requestAnimationFrame(syncStoryToScroll);
}

function configureStory() {
  heroBand.classList.toggle("is-scroll-story", storyMode.matches);
  scrollStep = -1;
  wheelRevealPending = false;
  scrollHoldUntil = 0;
  clearWheelRecovery();
  scheduleStorySync();
}

function syncHeaderHeight() {
  const height = siteHeader.offsetHeight;
  if (height !== headerHeight) {
    headerHeight = height;
    document.documentElement.style.setProperty("--site-header-height", height + "px");
  }
  scheduleStorySync();
}

function onPageScroll() {
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
  scheduleStorySync();
}

for (const [index, button] of buttons.entries()) {
  button.addEventListener("click", () => {
    if (storyMode.matches) {
      const distance = heroBand.clientHeight - heroFrame.offsetHeight;
      const start = window.scrollY + heroBand.getBoundingClientRect().top - headerHeight;
      window.scrollTo(0, start + distance * (index + .5) / slides.length);
    }
    selectScreen(button.dataset.screen);
  });
}

storyMode.addEventListener("change", configureStory);
window.addEventListener("scroll", onPageScroll, { passive: true });
window.addEventListener("wheel", stepStoryWithWheel, { passive: false });
window.addEventListener("pointerdown", clearWheelRecovery, { passive: true });
window.addEventListener("keydown", clearWheelRecovery);
window.addEventListener("resize", syncHeaderHeight);
if ("ResizeObserver" in window) {
  new ResizeObserver(syncHeaderHeight).observe(siteHeader);
}
reduceMotion.addEventListener("change", () => {
  if (reduceMotion.matches && flip) {
    flip.cancel();
    copyMotion?.cancel();
    showScreen(selected);
    finishFlip();
  }
});
syncHeaderHeight();
configureStory();
onPageScroll();
positionConnector();

const sand = document.createDocumentFragment();
for (let index = 0; index < 48; index++) {
  const grain = document.createElement("span");
  const duration = 12 + Math.random() * 15;
  grain.className = "sand-grain";
  grain.style.setProperty("--origin", (4 + Math.random() * 92) + "%");
  grain.style.setProperty("--size", (1 + Math.random() * 1.6) + "px");
  grain.style.setProperty("--brightness", String(.18 + Math.random() * .44));
  grain.style.setProperty("--drift", (-22 + Math.random() * 44) + "px");
  grain.style.setProperty("--duration", duration + "s");
  grain.style.setProperty("--delay", (-Math.random() * duration) + "s");
  sand.append(grain);
}
heroArt.append(sand);

if ("IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => {
    heroArt.classList.toggle("is-offscreen", !entry.isIntersecting);
  }).observe(heroFrame);
}

const releaseLinks = new Map();
for (const link of document.querySelectorAll("[data-link]")) {
  const platform = link.dataset.link;
  const url = window.LUANDA_RELEASES?.[platform];
  if (typeof url !== "string" || !url.trim()) continue;
  const path = url.trim();
  try {
    const destination = new URL(path, document.baseURI);
    const root = new URL("./", document.baseURI);
    const local = path.startsWith("./") && destination.href.startsWith(root.href);
    const secure = path.startsWith("https://") && !destination.username && !destination.password;
    if (!local && !secure) continue;
    link.href = destination.href;
    link.hidden = false;
    releaseLinks.set(platform, link);
    const state = document.querySelector('[data-release="' + platform + '"]');
    state.dataset.ready = "";
    state.textContent = platform === "ios" ? "TestFlight 測試中" : "可下載";
  } catch {
    // Keep the release state visible while the link is unset or invalid.
  }
}

const platformDetails = {
  ios: { id: "iphone", view: "查看 iPhone 版" },
  macos: { id: "mac", view: "查看 macOS Apple 晶片版" },
  windows: { id: "windows", view: "查看 Windows x64 版" },
};

function visitorPlatform() {
  const ua = navigator.userAgent;
  const platform = navigator.userAgentData?.platform?.toLowerCase();
  if (/\biPhone\b/i.test(ua)) return "ios";
  if (/\b(?:iPad|iPod|Android)\b/i.test(ua)) return null;
  if (platform === "windows" || (!platform && /\bWindows NT\b/i.test(ua))) return "windows";
  if (platform === "macos" || (!platform && /\bMacintosh\b/i.test(ua))) {
    // iPad desktop browsing can present a Mac user agent.
    return navigator.maxTouchPoints > 1 ? null : "macos";
  }
  return null;
}

async function setPlatformCta() {
  const platform = visitorPlatform();
  if (!platform) return;
  const cta = document.querySelector("#platform-cta");
  const label = cta.querySelector("span");
  const details = platformDetails[platform];
  const release = releaseLinks.get(platform);
  let compatible = platform === "ios" ? true : null;
  const hints = navigator.userAgentData;
  if (platform !== "ios" && hints?.getHighEntropyValues) {
    try {
      const { architecture, bitness, wow64 } = await hints.getHighEntropyValues(["architecture", "bitness", "wow64"]);
      if (platform === "macos") {
        if (architecture === "arm") compatible = true;
        if (architecture === "x86") compatible = false;
      } else if (architecture === "arm" || (bitness === "32" && wow64 === false)) {
        compatible = false;
      } else if (architecture === "x86" && (bitness === "64" || wow64 === true)) {
        compatible = true;
      }
    } catch {
      // The platform guide also works when the browser withholds architecture.
    }
  }
  if (compatible === false) return;

  if (release && compatible) {
    const releaseLabel = release.querySelector("span");
    cta.href = release.href;
    label.textContent = releaseLabel.textContent;
    cta.querySelector("svg").replaceWith(release.querySelector("svg").cloneNode(true));
  } else {
    cta.href = "#" + details.id;
    label.textContent = details.view;
  }
}

setPlatformCta();
