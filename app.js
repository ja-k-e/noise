import Particles from "./Particles.js";
import Sound from "./Sound.js";

const canvas = document.querySelector("canvas");
canvas.addEventListener("dragstart", (e) => e.preventDefault());

function preventPullToRefresh(element) {
  var prevent = false;

  element.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) {
      return;
    }

    var scrollY =
      window.pageYOffset ||
      document.body.scrollTop ||
      document.documentElement.scrollTop;
    prevent = scrollY === 0;
  });

  element.addEventListener("touchmove", function (e) {
    if (prevent) {
      prevent = false;
      e.preventDefault();
    }
  });
}

preventPullToRefresh(canvas);

const particles = new Particles(canvas);

let x = 0;
let y = 0;
let i = 0;
let sound;

document.body.addEventListener("click", onCanvasTap);

function onCanvasTap(event) {
  if (!sound) {
    document.querySelector("h1").remove();
    document.body.style.cursor = "crosshair";
    sound = new Sound();

    tick();

    document.body.addEventListener("touchmove", (e) => {
      x = e.touches[0].clientX / window.innerWidth;
      y = e.touches[0].clientY / window.innerHeight;
    });
    document.body.addEventListener("mousemove", (e) => {
      x = e.clientX / window.innerWidth;
      y = e.clientY / window.innerHeight;
    });
  }
  x = event.clientX / window.innerWidth;
  y = event.clientY / window.innerHeight;
}

function tick() {
  requestAnimationFrame(tick);
  sound.tick(x, y);
  particles.drawParticles(
    x * canvas.width,
    y * canvas.height,
    (1 - y) * 7.75 + 0.25
  );

  i++;
}
