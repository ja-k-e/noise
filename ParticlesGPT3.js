export default class Particles {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl");
    this.width = canvas.width;
    this.height = canvas.height;

    this.numParticles = 100;
    this.particleData = new Float32Array(this.numParticles * 4);

    this.vertexShader = `
      attribute vec2 position;
      attribute vec4 color;

      varying vec4 vColor;

      void main() {
        gl_Position = vec4(position, 0, 1);
        gl_PointSize = 1.0;
        vColor = color;
      }
    `;

    this.fragmentShader = `
      precision mediump float;

      varying vec4 vColor;

      void main() {
        gl_FragColor = vColor;
      }
    `;

    this.program = this.createProgram(this.vertexShader, this.fragmentShader);

    this.positionAttributeLocation = this.gl.getAttribLocation(
      this.program,
      "position"
    );
    this.colorAttributeLocation = this.gl.getAttribLocation(
      this.program,
      "color"
    );

    this.positionBuffer = this.gl.createBuffer();
    this.colorBuffer = this.gl.createBuffer();

    this.color = [1, 1, 1, 0.5];

    this.updateParticles(0, 0, 0);
  }

  createProgram(vertexShaderSource, fragmentShaderSource) {
    const vertexShader = this.loadShader(
      this.gl.VERTEX_SHADER,
      vertexShaderSource
    );
    const fragmentShader = this.loadShader(
      this.gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error(
        `Unable to initialize the shader program: ${this.gl.getProgramInfoLog(
          program
        )}`
      );
      return null;
    }

    return program;
  }

  loadShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(
        `An error occurred compiling the shaders: ${this.gl.getShaderInfoLog(
          shader
        )}`
      );
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  updateParticles(x, y, hue) {
    const centerX = x;
    const centerY = y;
    for (let i = 0; i < this.numParticles; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const radius = Math.random() * 200;
      const transparency = 0.5 + (1 - radius / 200);
      const size = 0.5 + Math.random() * 1;

      this.particleData[i * 4] = centerX + Math.cos(angle) * radius;
      this.particleData[i * 4 + 1] = centerY + Math.sin(angle) * radius;
      this.particleData[i * 4 + 2] = hue;
      this.particleData[i * 4 + 3] = size;

      const color = [this.color[0], this.color[1], this.color[2], transparency];
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.particleData.subarray(0, this.numParticles * 4),
      this.gl.STREAM_DRAW
    );
    const colorData = new Float32Array(this.numParticles * 4)
      .fill(this.color[0])
      .fill(this.color[1], 1)
      .fill(this.color[2], 2)
      .fill(this.color[3], 3);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, colorData, this.gl.STREAM_DRAW);
  }

  draw(x, y, hue) {
    this.updateParticles(x, y, hue);

    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.gl.useProgram(this.program);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.vertexAttribPointer(
      this.positionAttributeLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(this.positionAttributeLocation);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.vertexAttribPointer(
      this.colorAttributeLocation,
      4,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(this.colorAttributeLocation);

    this.gl.drawArrays(this.gl.POINTS, 0, this.numParticles);

    this.gl.disableVertexAttribArray(this.positionAttributeLocation);
    this.gl.disableVertexAttribArray(this.colorAttributeLocation);
  }
}
