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
  constructor(canvas, particleCount = 12000) {
    this.canvas = canvas;
    this.particleCount = particleCount;
    this.gl = this.canvas.getContext("webgl");
    this.gl.getExtension("OES_texture_float");
    this.initializeParticles();
  }

  initializeParticles() {
    // Set up shaders, buffers, and initialize particle properties here

    // 1. Create shaders (vertex and fragment)
    // 2. Create buffers for particle positions, sizes, and colors
    // 3. Initialize particle positions, sizes, velocities, and colors with random values

    // Vertex shader
    const vertexShaderSource = `
      attribute vec3 a_position;
      attribute float a_size;
      attribute vec3 a_color;
    
      uniform float u_time;
      uniform float u_liveliness;
      uniform vec2 u_center;
    
      varying vec3 v_color;
    
      // Function to create pseudo-random numbers
      float random(vec3 scale, float seed) {
        return fract(sin(dot(a_position.xyz + seed, scale)) * 43758.5453 + seed);
      }
    
      void main() {
        vec3 position = a_position;
        float angle = random(position.xyz, 1.0) * 2.0 * 3.14159;
        float speed = random(position.xyz, 3.0) * u_liveliness;
    
        // Calculate the new position based on the angle, speed, and time
        position.x += cos(angle) * speed * u_time;
        position.y += sin(angle) * speed * u_time;
    
        // Update the position based on the center point
        position.xy += u_center;
    
        // Set the varying color value
        v_color = a_color;
    
        gl_Position = vec4(position, 1.0);
        gl_PointSize = a_size;
      }
    `;

    // Fragment shader
    const fragmentShaderSource = `
      precision mediump float;

      varying vec3 v_color;

      void main() {
        gl_FragColor = vec4(v_color, 1.0);
      }
    `;

    // Compile shaders and create shader program
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertexShader, vertexShaderSource);
    this.gl.compileShader(vertexShader);

    if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
      console.error(
        "Vertex shader compilation failed: ",
        this.gl.getShaderInfoLog(vertexShader)
      );
      return;
    }

    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragmentShader, fragmentShaderSource);
    this.gl.compileShader(fragmentShader);

    if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
      console.error(
        "Fragment shader compilation failed: ",
        this.gl.getShaderInfoLog(fragmentShader)
      );
      return;
    }

    this.shaderProgram = this.gl.createProgram();
    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);
    this.gl.linkProgram(this.shaderProgram);

    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      console.error(
        "Shader program linking failed: ",
        this.gl.getProgramInfoLog(this.shaderProgram)
      );
      return;
    }

    // Create buffers for particle positions, sizes, and colors
    this.positionBuffer = this.gl.createBuffer();
    this.sizeBuffer = this.gl.createBuffer();
    this.colorBuffer = this.gl.createBuffer();

    // Initialize particle properties
    const positions = [];
    const sizes = [];
    const colors = [];

    for (let i = 0; i < this.particleCount; i++) {
      // Random position
      positions.push(randomRange(-1, 1));
      positions.push(randomRange(-1, 1));
      positions.push(randomRange(-1, 1));

      // Random size
      sizes.push(randomRange(0.001, 0.01));

      // Random color (RGB)
      const h = randomRange(0, 360);
      const s = 1;
      const l = randomRange(0.5, 1);
      const rgb = hslToRgb(h, s, l);
      colors.push(...rgb);
    }

    // Load data into buffers
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(positions),
      this.gl.STATIC_DRAW
    );
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sizeBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(sizes),
      this.gl.STATIC_DRAW
    );
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(colors),
      this.gl.STATIC_DRAW
    );
  }

  drawParticles(x, y, liveliness) {
    // 4. Update particle positions, colors, and sizes based on the provided x, y, and liveliness values

    // ... update particles based on x, y, and liveliness ...
    // ... draw particles ...

    // Set WebGL settings
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.useProgram(this.shaderProgram);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);

    // Bind and enable position buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    const positionAttributeLocation = this.gl.getAttribLocation(
      this.shaderProgram,
      "a_position"
    );
    this.gl.enableVertexAttribArray(positionAttributeLocation);
    this.gl.vertexAttribPointer(
      positionAttributeLocation,
      3,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Bind and enable size buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sizeBuffer);
    const sizeAttributeLocation = this.gl.getAttribLocation(
      this.shaderProgram,
      "a_size"
    );
    this.gl.enableVertexAttribArray(sizeAttributeLocation);
    this.gl.vertexAttribPointer(
      sizeAttributeLocation,
      1,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Bind and enable color buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    const colorAttributeLocation = this.gl.getAttribLocation(
      this.shaderProgram,
      "a_color"
    );
    this.gl.enableVertexAttribArray(colorAttributeLocation);
    this.gl.vertexAttribPointer(
      colorAttributeLocation,
      3,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Set uniform variables
    const u_time = this.gl.getUniformLocation(this.shaderProgram, "u_time");
    const u_liveliness = this.gl.getUniformLocation(
      this.shaderProgram,
      "u_liveliness"
    );
    const u_center = this.gl.getUniformLocation(this.shaderProgram, "u_center");
    this.gl.uniform1f(u_time, performance.now() / 1000);
    this.gl.uniform1f(u_liveliness, liveliness);
    this.gl.uniform2f(u_center, x, y);

    // Draw particles
    this.gl.drawArrays(this.gl.POINTS, 0, this.particleCount);

    // Disable attribute arrays
    this.gl.disableVertexAttribArray(positionAttributeLocation);
    this.gl.disableVertexAttribArray(sizeAttributeLocation);
    this.gl.disableVertexAttribArray(colorAttributeLocation);
  }
}
