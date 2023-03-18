const PARTICLE_COUNT = 96000;

export default class Particles {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = this.canvas.getContext("webgl");
    this.gl.getExtension("OES_texture_float");

    let vertexShaderSrc = `
attribute vec2 a_position;
attribute vec2 a_velocity;
attribute float a_startTime;
attribute float a_size;
attribute float a_randomAngle;
attribute float a_swirlRadius;
attribute float a_swirlDirection;


uniform float u_time;
uniform vec2 u_target;
uniform float u_liveliness;
uniform float u_friction;
uniform float u_canvasWidth;
uniform float u_canvasHeight;
uniform float u_particleSize;
varying float v_alpha;


void main() {
  float age = u_time - a_startTime;

  // Calculate the force towards the target
  vec2 direction = normalize(u_target - a_position);
  vec2 force = direction * u_liveliness * age;
  // vec2 force = direction * u_liveliness;

  // Apply friction to the velocity
  // vec2 frictionedVelocity = a_velocity * pow(u_friction, age);
  vec2 frictionedVelocity = a_velocity * u_friction;

  // Calculate the angle for swirling
  float angle = a_randomAngle + u_time * u_liveliness * a_swirlDirection;

  // Calculate the swirling position
  vec2 swirlPosition = u_target + a_swirlRadius * vec2(cos(angle), sin(angle));

  // Calculate the current position with the force, friction, and swirl applied
  vec2 position = a_position + frictionedVelocity * age + force + (swirlPosition - u_target) * age;

  // Calculate the distance from the target
  float distance = length(position - u_target);

  // Calculate the alpha value based on distance
  v_alpha = 1.0 - distance * 0.5;

  // Apply the position
  gl_Position = vec4(position, 0, 1);
  gl_PointSize = u_particleSize * a_size;
}
`;

    let vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertexShader, vertexShaderSrc);
    this.gl.compileShader(vertexShader);

    // Fragment shader
    let fragmentShaderSrc = `
      precision mediump float;

      uniform vec4 u_particleColor;
      varying float v_alpha;
      varying float v_updatedStartTime;

      void main() {
        gl_FragColor = vec4(u_particleColor.rgb * v_alpha, u_particleColor.a);
      }
    `;

    let fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragmentShader, fragmentShaderSrc);
    this.gl.compileShader(fragmentShader);

    // Shader program
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    // Attributes and uniforms
    this.canvasWidthLocation = this.gl.getUniformLocation(
      this.program,
      "u_canvasWidth"
    );
    this.canvasHeightLocation = this.gl.getUniformLocation(
      this.program,
      "u_canvasHeight"
    );
    this.sizeLocation = this.gl.getAttribLocation(this.program, "a_size");
    this.particleSizeLocation = this.gl.getUniformLocation(
      this.program,
      "u_particleSize"
    );

    this.positionLocation = this.gl.getAttribLocation(
      this.program,
      "a_position"
    );
    this.randomAngleLocation = this.gl.getAttribLocation(
      this.program,
      "a_randomAngle"
    );
    this.velocityLocation = this.gl.getAttribLocation(
      this.program,
      "a_velocity"
    );
    this.startTimeLocation = this.gl.getAttribLocation(
      this.program,
      "a_startTime"
    );
    this.timeLocation = this.gl.getUniformLocation(this.program, "u_time");
    this.targetLocation = this.gl.getUniformLocation(this.program, "u_target");
    this.swirlRadiusLocation = this.gl.getUniformLocation(
      this.program,
      "u_swirlRadius"
    );
    // Add friction and age threshold uniforms
    this.frictionLocation = this.gl.getUniformLocation(
      this.program,
      "u_friction"
    );

    this.livelinessLocation = this.gl.getUniformLocation(
      this.program,
      "u_liveliness"
    );
    this.particleColorLocation = this.gl.getUniformLocation(
      this.program,
      "u_particleColor"
    );

    this.updatedStartTimeLocation = this.gl.getUniformLocation(
      this.program,
      "u_updatedStartTime"
    );

    // Buffers
    this.positions = new Float32Array(PARTICLE_COUNT * 2);
    let velocities = new Float32Array(PARTICLE_COUNT * 2);
    this.startTimes = new Float32Array(PARTICLE_COUNT);
    let randomAngles = new Float32Array(PARTICLE_COUNT);
    let swirlRadii = new Float32Array(PARTICLE_COUNT); // Add this line
    let swirlDirections = new Float32Array(PARTICLE_COUNT); // Add this line
    let sizes = new Float32Array(PARTICLE_COUNT);

    function randomPointInCircle(radius) {
      // Generate a random angle
      const angle = Math.random() * 2 * Math.PI;

      // Generate a random radius within the given range
      const r = Math.sqrt(Math.random()) * radius;

      // Calculate the x and y coordinates
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);

      return { x, y };
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const { x, y } = randomPointInCircle(0.5);
      this.positions[i * 2] = x * 2;
      this.positions[i * 2 + 1] = y * 2;

      let angle = Math.random() * Math.PI * 2;
      let speed = Math.random() * 0.1;
      velocities[i * 2] = Math.cos(angle) * speed;
      velocities[i * 2 + 1] = Math.sin(angle) * speed;

      this.startTimes[i] = Math.random() * 10;
      randomAngles[i] = Math.random() * 2.0 * Math.PI;
      swirlRadii[i] = Math.random() * 0.2 + 0.1; // Generate random swirl radius, change range as needed
      swirlDirections[i] = Math.random() > 0.5 ? 1.0 : -1.0; // Add this line
      sizes[i] = Math.random() * 10 + 1;
    }

    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.positions,
      this.gl.STATIC_DRAW
    );

    this.swirlDirectionBuffer = this.gl.createBuffer(); // Add this line
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.swirlDirectionBuffer); // Add this line
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      swirlDirections,
      this.gl.STATIC_DRAW
    ); // Add this line

    this.randomAngleBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.randomAngleBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, randomAngles, this.gl.STATIC_DRAW);

    this.swirlRadiusBuffer = this.gl.createBuffer(); // Add this line
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.swirlRadiusBuffer); // Add this line
    this.gl.bufferData(this.gl.ARRAY_BUFFER, swirlRadii, this.gl.STATIC_DRAW); // Add this line

    this.sizeBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sizeBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, sizes, this.gl.STATIC_DRAW);

    this.velocityBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.velocityBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, velocities, this.gl.STATIC_DRAW);

    this.startTimeBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.startTimeBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.startTimes,
      this.gl.STATIC_DRAW
    );
  }

  drawParticles(x, y, liveliness, particleColor) {
    // Update canvas size
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // Clear the canvas
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Use the shader program
    this.gl.useProgram(this.program);

    // Set the time uniform
    this.gl.uniform1f(this.timeLocation, performance.now() / 1000);

    this.gl.uniform1f(this.canvasWidthLocation, this.canvas.width);
    this.gl.uniform1f(this.canvasHeightLocation, this.canvas.height);
    // Set the friction uniform
    this.gl.uniform1f(this.frictionLocation, 0.99); // Adjust this value for more or less friction

    this.gl.uniform1fv(this.updatedStartTimeLocation, this.startTimes);

    // Set the target uniform
    this.gl.uniform2f(this.targetLocation, x * 2 - 1, 1 - y * 2);
    // Set the swirl radius
    this.gl.uniform1f(this.swirlRadius, 0.1);
    // Set the liveliness uniform
    this.gl.uniform1f(this.livelinessLocation, liveliness);

    // Set the particle color uniform
    this.gl.uniform4fv(this.particleColorLocation, particleColor);
    this.gl.uniform1f(this.particleSizeLocation, 0.1); // Change this value to adjust the particle size

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.swirlDirectionBuffer);
    this.gl.enableVertexAttribArray(
      this.gl.getAttribLocation(this.program, "a_swirlDirection")
    );
    this.gl.vertexAttribPointer(
      this.gl.getAttribLocation(this.program, "a_swirlDirection"),
      1,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sizeBuffer);
    this.gl.enableVertexAttribArray(this.sizeLocation);
    this.gl.vertexAttribPointer(
      this.sizeLocation,
      1,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Set up the swirl radius attribute // Add these lines
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.swirlRadiusBuffer);
    this.gl.enableVertexAttribArray(
      this.gl.getAttribLocation(this.program, "a_swirlRadius")
    );
    this.gl.vertexAttribPointer(
      this.gl.getAttribLocation(this.program, "a_swirlRadius"),
      1,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Set up the velocity attribute
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.velocityBuffer);
    this.gl.enableVertexAttribArray(this.velocityLocation);
    this.gl.vertexAttribPointer(
      this.velocityLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Update start times for off-screen particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const position = {
        x: 2 * x - 1 + this.positions[i * 2],
        y: 1 - 2 * y + this.positions[i * 2 + 1],
      };
      const offScreen =
        position.x < -1.0 ||
        position.x > 1.0 ||
        position.y < -1.0 ||
        position.y > 1.0;

      if (offScreen) {
        this.startTimes[i] = performance.now() / 1000;
        this.positions[i * 2] = (Math.random() - 0.5) * 2;
        this.positions[i * 2 + 1] = (Math.random() - 0.5) * 2;
      }
    }

    // Set up the position attribute
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(
      this.positionLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Upload the updated start times to the GPU
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.startTimeBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.startTimes,
      this.gl.STATIC_DRAW
    );

    // Set up the startTime attribute
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.startTimeBuffer);
    this.gl.enableVertexAttribArray(this.startTimeLocation);
    this.gl.vertexAttribPointer(
      this.startTimeLocation,
      1,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Draw the particles
    this.gl.drawArrays(this.gl.POINTS, 0, PARTICLE_COUNT);
  }
}
