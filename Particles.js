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

uniform float u_time;
uniform vec2 u_target;
uniform float u_liveliness;
uniform float u_friction;
uniform float u_ageThreshold;
varying float v_alpha;
varying float v_updatedStartTime;

void main() {
  float age = u_time - a_startTime;

  // Reset the particle age if it exceeds the age threshold
  // if (age > u_ageThreshold) {
  //   age = 0.0;
  //   // Pass the updated start time to the fragment shader
  //   float updatedStartTime = age > u_ageThreshold ? u_time : a_startTime;
  //   gl_PointSize = a_size;
  // }

  // Calculate the force towards the target
  vec2 direction = normalize(u_target - a_position);
  vec2 force = direction * u_liveliness * age;

  // Apply friction to the velocity
  vec2 frictionedVelocity = a_velocity * pow(u_friction, age);

  // Calculate the current position with the force and friction applied
  vec2 position = a_position + frictionedVelocity * age + force;

  // Reset the particle position and start time if out of bounds
  if (position.x < -1.0 || position.x > 1.0 || position.y < -1.0 || position.y > 1.0) {
    position = a_position;
    age = 0.0;
  }

  // Calculate the distance from the target
  float distance = length(position - u_target);

  // Calculate the alpha value based on distance
  v_alpha = 1.0 - distance * 0.5;

  // Apply the position
  gl_Position = vec4(position, 0, 1);
  gl_PointSize = a_size;
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
    this.positionLocation = this.gl.getAttribLocation(
      this.program,
      "a_position"
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
    // Add friction and age threshold uniforms
    this.frictionLocation = this.gl.getUniformLocation(
      this.program,
      "u_friction"
    );
    this.ageThresholdLocation = this.gl.getUniformLocation(
      this.program,
      "u_ageThreshold"
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
    let positions = new Float32Array(2000 * 2);
    let velocities = new Float32Array(2000 * 2);
    this.startTimes = new Float32Array(2000);

    for (let i = 0; i < 2000; i++) {
      positions[i * 2] = (Math.random() - 0.5) * 2;
      positions[i * 2 + 1] = (Math.random() - 0.5) * 2;

      let angle = Math.random() * Math.PI * 2;
      let speed = Math.random() * 0.01;
      velocities[i * 2] = Math.cos(angle) * speed;
      velocities[i * 2 + 1] = Math.sin(angle) * speed;

      this.startTimes[i] = Math.random() * 10;
    }

    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

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

    // Set the friction uniform
    this.gl.uniform1f(this.frictionLocation, 0.99); // Adjust this value for more or less friction

    // Set the age threshold uniform
    this.gl.uniform1f(this.ageThresholdLocation, 10.0); // Adjust this value for a different age threshold

    this.gl.uniform1fv(this.updatedStartTimeLocation, this.startTimes);

    // Set the target uniform
    this.gl.uniform2f(this.targetLocation, x * 2 - 1, 1 - y * 2);

    // Set the liveliness uniform
    this.gl.uniform1f(this.livelinessLocation, liveliness);

    // Set the particle color uniform
    this.gl.uniform4fv(this.particleColorLocation, particleColor);

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
    this.gl.drawArrays(this.gl.POINTS, 0, 2000);

    // Update the start times buffer with the new start times
    let updatedStartTimes = new Float32Array(2000);
    this.gl.readPixels(
      0,
      0,
      2000,
      1,
      this.gl.RGBA,
      this.gl.FLOAT,
      updatedStartTimes
    );
    for (let i = 0; i < 2000; i++) {
      this.startTimes[i] = updatedStartTimes[i * 4];
    }
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.startTimeBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.startTimes,
      this.gl.STATIC_DRAW
    );
  }
}
