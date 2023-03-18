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
    this.ctx = this.canvas.getContext("2d");
    this.easingFactor = 0.06;
    this.noise2d = createNoise2D();
    this.noiseScale = 0.01;

    this.initializeParticles();
  }

  initializeParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      const size = randomRange(0.5, 2);
      const angle = randomRange(0, 2 * Math.PI);
      const angleSpeed =
        randomRange(0.001, 0.01) * (Math.random() > 0.5 ? 1 : -1);
      const radius = randomRange(
        10,
        Math.min(window.innerWidth, window.innerHeight)
      );
      const radiusRange = randomRange(10, 100);
      const minRadius = Math.max(radius - radiusRange / 2, 100);
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
    }
  }

  drawParticles(x, y, liveliness) {
    this.canvas.width = window.innerWidth * 2;
    this.canvas.height = window.innerHeight * 2;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const minDistanceToTarget = 50; // Minimum distance to target before changing direction

    for (const particle of this.particles) {
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

      // If the particle is too close to the target, reverse its direction
      if (targetDistance < minDistanceToTarget) {
        particle.direction *= -1;
      }

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
      const distanceFromCenter = Math.sqrt(
        Math.pow(px - this.canvas.width / 2, 2) +
          Math.pow(py - this.canvas.height / 2, 2)
      );
      const maxDistance = Math.sqrt(
        Math.pow(this.canvas.width, 2) + Math.pow(this.canvas.height, 2)
      );
      const hue = (distanceFromCenter / maxDistance) * 360;
      const saturation = 1;
      const lightness = 1 - py / this.canvas.height;
      const alpha =
        1 - Math.min(1, (targetDistance - minDistanceToTarget) / 1000);

      // Convert HSL to RGB
      const [r, g, b] = hslToRgb(hue, saturation, lightness);

      // Draw the particle
      this.ctx.beginPath();
      this.ctx.arc(px, py, particle.size, 0, 2 * Math.PI);
      this.ctx.fillStyle = `rgba(${r * 255},  ${g * 255}, ${
        b * 255
      }, ${alpha})`;
      this.ctx.fill();
    }
  }
}
