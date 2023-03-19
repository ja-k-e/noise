import { createNoise2D } from "https://unpkg.com/simplex-noise@4.0.1/dist/esm/simplex-noise.js";

// Utility function to generate a random number within a range
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Utility function to convert from HSL to RGB
function hslToRgb(h, s, l) {
  if (s === 0) {
    // If the saturation is 0, it's a shade of gray
    return [l, l, l];
  }

  const hueToRgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h / 360 + 1 / 3);
  const g = hueToRgb(p, q, h / 360);
  const b = hueToRgb(p, q, h / 360 - 1 / 3);

  return [r, g, b];
}

export default class Particles {
  constructor(
    canvas,
    particleCount = window.innerWidth * window.innerHeight * 0.01
  ) {
    this.canvas = canvas;
    this.particleCount = particleCount;
    this.easingFactor = 0.08;
    this.noise2d = createNoise2D();
    this.noiseScale = 0.03;

    this.initializeParticles();
  }

  initializeParticles() {
    this.scene = new THREE.Scene();
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      0,
      width,
      0,
      height,
      -10000,
      10000
    );
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // create a geometry with many particles
    const particleGeometry = new THREE.BufferGeometry();
    this.positions = [];
    this.colors = [];
    this.particles = [];
    const windowMinSize = Math.min(window.innerWidth, window.innerHeight);
    for (let i = 0; i < this.particleCount; i++) {
      const size = randomRange(0.5, 1);
      const angle = randomRange(0, 2 * Math.PI);
      const angleSpeed =
        randomRange(0.001, 0.01) * (Math.random() > 0.5 ? 1 : -1);
      const radius = randomRange(windowMinSize * 0.001, windowMinSize * 0.5);
      const radiusRange = randomRange(
        windowMinSize * 0.001,
        windowMinSize * 0.05
      );
      const minRadius = radius - radiusRange / 2;
      const maxRadius = radius + radiusRange / 2;
      const speed = randomRange(0.01, 0.05);
      const direction = Math.random() > 0.5 ? 1 : -1;
      const zSpeed = randomRange(0.001, 0.01);
      const zDirection = Math.random() > 0.5 ? 1 : -1;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = randomRange(-1, 1);

      const particle = {
        x,
        y,
        z,
        size,
        angle,
        angleSpeed,
        radius,
        minRadius,
        maxRadius,
        speed,
        direction,
        zSpeed,
        zDirection,
        targetX: x,
        targetY: y,
      };

      this.particles.push(particle);
      this.positions.push(x, y, z);
      this.colors.push(1, 1, 1);
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(this.positions, 3)
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(this.colors, 3)
    );

    // create a material for the particles
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 1,
    });

    // create a particle system and add it to the scene
    this.points = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.points);
  }

  drawParticles(x, y, liveliness) {
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];
      // Add noise to the target position updates
      const noiseX = this.noise2d(
        particle.x * this.noiseScale,
        particle.y * this.noiseScale
      );
      const noiseY = this.noise2d(
        particle.y * this.noiseScale,
        particle.x * this.noiseScale
      );
      // Ease the particle towards the new target position
      const dx = x - particle.targetX + noiseX * 400;
      const dy = y - particle.targetY + noiseY * 400;
      particle.targetX += dx * (Math.random() * this.easingFactor);
      particle.targetY += dy * (Math.random() * this.easingFactor);

      // Check the distance between the current position and the target position
      const targetDistance = Math.sqrt(
        Math.pow(particle.x - particle.targetX, 2) +
          Math.pow(particle.y - particle.targetY, 2)
      );

      // Update the particle's position based on the eased target position
      const dTheta = particle.speed * particle.direction * liveliness;
      const dz = particle.zSpeed * liveliness;
      particle.angle += dTheta;
      particle.z += dz;
      if (particle.z > Math.PI * 2) particle.z -= Math.PI * 2;
      if (particle.z < 0) particle.z += Math.PI * 2;
      particle.x =
        particle.targetX +
        particle.radius * Math.cos(particle.angle) * Math.cos(particle.z);
      particle.y =
        particle.targetY +
        particle.radius * Math.sin(particle.angle) * Math.cos(particle.z);

      // Update the angle, radius, and z based on speed, direction, and randomness
      const radiusDiff =
        (particle.maxRadius - particle.minRadius) * Math.sin(particle.z);
      particle.radius = particle.minRadius + radiusDiff;
      particle.speed =
        Math.pow(randomRange(0.01, 0.05), 2) *
        (1 - Math.abs(radiusDiff) / (particle.maxRadius - particle.minRadius));
      particle.angle += particle.angleSpeed * liveliness;
      particle.z +=
        particle.zSpeed *
        particle.zDirection *
        liveliness *
        (1 + Math.random() * 0.1 - 0.05);

      // Calculate the new position based on the angle, radius, and center point
      const px = particle.x + Math.cos(particle.angle) * particle.radius;
      const py = particle.y + Math.sin(particle.angle) * particle.radius;

      // Calculate the hue, saturation, and lightness
      const hue = (px / this.canvas.width) * 360 + 180;
      const saturation = 1;
      const lightness = 1 - (py / this.canvas.height) * 0.8 + 0.1;
      // const alpha =
      //   1 - Math.min(1, (targetDistance - minDistanceToTarget) / 1000);

      // Convert HSL to RGB
      const [r, g, b] = hslToRgb(hue, saturation, lightness);

      this.colors[i * 3] = r;
      this.colors[i * 3 + 1] = g;
      this.colors[i * 3 + 2] = b;

      this.positions[i * 3] = px;
      this.positions[i * 3 + 1] = py;
      this.positions[i * 3 + 2] = particle.z;
    }
    this.points.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(this.positions, 3)
    );
    this.points.geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(this.colors, 3)
    );
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }
}
