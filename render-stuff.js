import * as mat4 from './gl-matrix/mat4.js'
import * as vec4 from './gl-matrix/vec4.js'
import * as vec3 from './gl-matrix/vec3.js'

let circleVertexCount;
let circleBuffer;
let circleShaderProgram;

let bigCircleVertexCount;
let bigCircleBuffer;
let bigCircleShaderProgram;

let arrowVertexCount;
let arrowBuffer;
let arrowShaderProgram;

let lineVertexCount;
let lineBuffer;
let lineShaderProgram;

let gl = document.getElementById("gl-canvas").getContext("webgl");

const fovY = Math.PI / 4;
let aspect = gl.canvas.width / gl.canvas.height;
const zNear = 0.1;
const zFar = 100.0;

let viewMat = mat4.create();

let arrowsToDraw = [];

export function setupRenderStuff() {
	resize();

    //alpha blend
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA);

    initShaderProgramsAndBuffers();

	addEventListener("resize", resize);
}

export function drawFrame(particlesArray, camera) {//, cursor3d) {
	gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    setViewMat(camera);

    //DRAW GRID LINES
    drawGridLines(viewMat);

    //PARTICLES FOR LOOP
    for (let i = 0; i < particlesArray.length; i++) {
        drawParticle(particlesArray[i], camera);
    }

	//DRAW ARROWS
	for (let arrow of arrowsToDraw) {
		drawArrow(arrow[0], arrow[1], arrow[2]);
	}
	arrowsToDraw = [];

	//DRAW 3D CURSOR
	//drawCursor3d(cursor3d);
	
	//DRAW AXIS ARROWS
	drawAxisArrows();
}

function drawParticle(particle, camera) {
	let particlePosMat = mat4.create();
    mat4.translate(particlePosMat, particlePosMat, particle.pos); //translation to particlePos
    let uMat = mat4.create();
    mat4.multiply(uMat, viewMat, particlePosMat); //viewMat * translation

    //BOTH CIRCLES counteract rotation so they always face camera
    let counteractRotationMat = mat4.create();
    mat4.rotateY(counteractRotationMat, counteractRotationMat, camera.rot[1]);
    mat4.rotateX(counteractRotationMat, counteractRotationMat, camera.rot[0]);
    mat4.multiply(uMat, uMat, counteractRotationMat);

    //BIGCIRCLE -----------------------------------
    gl.useProgram(bigCircleShaderProgram);

    //BIGCIRCLE uniforms
    setUniformMat4(bigCircleShaderProgram, "uMatrix", uMat);
	let color = colorHexToRGB(particle.color);
	setUniformVec3(bigCircleShaderProgram, "uColor", color);

    //BIGCIRCLE vertex attribute
    setupVertexPosAttribute(bigCircleShaderProgram, bigCircleBuffer, 2);
    
    gl.drawArrays(gl.TRIANGLE_FAN, 0, bigCircleVertexCount);


    //CIRCLE --------------------------------------

    gl.useProgram(circleShaderProgram);

    //CIRCLE uniform
    setUniformMat4(circleShaderProgram, "uMatrix", uMat);

    //CIRCLE vertex attribute
    setupVertexPosAttribute(circleShaderProgram, circleBuffer, 2);
    
    gl.drawArrays(gl.TRIANGLE_FAN, 0, circleVertexCount);
}

/*
function drawCursor3d(cursor3d) {
	const axisDirections = [
		[1, 0, 0], //X
		[0, 1, 0], //Y
		[0, 0, 1] //Z
	];
	const colors = [
		[1, 0, 0, 1], //X red
		[0, 1, 0, 1], //Y green
		[0, 0, 1, 1], //Z blue
	];

	for (let i = 0; i < 3; i++) { //for each axis xyz
		drawArrow(cursor3d, axisDirections[i], colors[i]);
	}
}
	*/

function drawAxisArrows() {
	const axisDirections = [
		[1, 0, 0], //X
		[0, 1, 0], //Y
		[0, 0, 1] //Z
	];
	const colors = [
		[1, 0, 0, 1], //X red
		[0, 1, 0, 1], //Y green
		[0, 0, 1, 1], //Z blue
	];

	for (let i = 0; i < 3; i++) { //for each axis xyz
		drawArrow([0, 0, 0], axisDirections[i], colors[i]);
	}
}

export function queueArrowDraw(pos, displacement, color) {
	arrowsToDraw.push([pos, displacement, color]);
}

function drawArrow(pos, displacement, uColor = [1, 1, 1, 1]) {
	gl.useProgram(arrowShaderProgram);
	setupVertexPosAttribute(arrowShaderProgram, arrowBuffer, 3);

	//uMatrix
	let uMatrix = mat4.create();
	mat4.translate(uMatrix, uMatrix, pos);

	

	let rotationAxis = vec3.create(); //axis to rotate the arrow around to point it the right way
	
	//by default, the arrow is pointing up at +y as defined in its vertices [0, 1, 0]
	//if the displacement is also purely along the y-axis, just pick an arbitrary axis to rotate it by
	if (displacement[0] == 0 && displacement[2] == 0) {
		rotationAxis = vec3.fromValues(1, 0, 0);
	}
	else { //else find out the proper rotationAxis by cross product
		vec3.cross(rotationAxis, [0, 1, 0], displacement);
	}

	let angle = vec3.angle([0, 1, 0], displacement);
	mat4.rotate(uMatrix, uMatrix, angle, rotationAxis);

	//scale to the proper length
	let scale = vec3.length(displacement);
	mat4.scale(uMatrix, uMatrix, [scale, scale, scale]);

	mat4.multiply(uMatrix, viewMat, uMatrix);

	setUniformMat4(arrowShaderProgram, "uMatrix", uMatrix);
	setUniformVec4(arrowShaderProgram, "uColor", uColor);
	gl.drawArrays(gl.LINE_STRIP, 0, arrowVertexCount);
}


function drawGridLines() {
    gl.useProgram(lineShaderProgram);
	
	setupVertexPosAttribute(lineShaderProgram, lineBuffer, 3);

    // lines running along x, spaced every 1 z
    for (let z = -20; z <= 20; z++) {
        
        let lineMatrix = mat4.create();
        mat4.translate(lineMatrix, lineMatrix, [0, 0, z]);
        mat4.multiply(lineMatrix, viewMat, lineMatrix);
        setUniformMat4(lineShaderProgram, "uMatrix", lineMatrix);

        gl.drawArrays(gl.LINE_STRIP, 0, lineVertexCount);
    }

    //lines running along z, spaced every 1 x
    for (let x = -20; x <= 20; x++) {
        
        let lineMatrix = mat4.create();
        mat4.rotateY(lineMatrix, lineMatrix, Math.PI / 2);
        mat4.translate(lineMatrix, lineMatrix, [0, 0, x]); //not 100% sure why the x goes here, something to do with rotation
        mat4.multiply(lineMatrix, viewMat, lineMatrix);
        setUniformMat4(lineShaderProgram, "uMatrix", lineMatrix);

        gl.drawArrays(gl.LINE_STRIP, 0, lineVertexCount);
    }
}

//sets up the vertex position attribute for shader program
//assumes the attribute name in the shader program is aVertexPos
function setupVertexPosAttribute(program, buffer, numComponentsPer) {
	let aVertexPos = gl.getAttribLocation(program, "aVertexPos");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	// binds the buffer currently bound to gl.ARRAY_BUFFER to a generic vertex attribute
    // of the current vertex buffer object and specifies its layout
	gl.vertexAttribPointer(
        aVertexPos, //uint index of attribute to be modified
        numComponentsPer, //int number of components per attribute
        gl.FLOAT, //enum type
        false, //boolean normalized
        0, //sizei stride (byte offset between consecutive attributes)
        0, //const void* pointer (offset to start of first component in buffer)
    );
    gl.enableVertexAttribArray(aVertexPos);
}


function setUniformMat4(program, name, matrix) {
	let u = gl.getUniformLocation(program, name);
	gl.uniformMatrix4fv(u, false, matrix);
}
function setUniformVec3(program, name, vec) {
	let u = gl.getUniformLocation(program, name);
	gl.uniform3fv(u, vec);
}
function setUniformVec4(program, name, vec) {
	let u = gl.getUniformLocation(program, name);
	gl.uniform4fv(u, vec);
}



function resize() {
	gl.canvas.width = window.innerWidth;
	gl.canvas.height = window.innerHeight;
	aspect = gl.canvas.width / gl.canvas.height;
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}



function colorHexToRGB(hex) {
	let r = Number("0x" + hex.slice(1, 3)) / 255;
	let g = Number("0x" + hex.slice(3, 5)) / 255;
	let b = Number("0x" + hex.slice(5, 7)) / 255;
	return [r, g, b];
}


//multiplying view matrix by a vec3 gets its position in screen space
function setViewMat(camera) {
	//projection matrix
	let projectionMatrix = mat4.create();
	mat4.perspective(projectionMatrix, fovY, aspect, zNear, zFar);
	//mat4.ortho(projectionMatrix, -10, 10, -10, 10, 0.1, 100);


	//camera matrix - camera's rotation and position in world space
    let cameraMat = mat4.create(); //identity
    mat4.translate(cameraMat, cameraMat, camera.pos); //translation to camera.pos
    mat4.rotateY(cameraMat, cameraMat, camera.rot[1]); //pan around y axis FIRST
    mat4.rotateX(cameraMat, cameraMat, camera.rot[0]); //THEN tilt around x axis
    
	//view matrix - inverting the camera transformations and projecting to 2D
    mat4.invert(viewMat, cameraMat);
    mat4.multiply(viewMat, projectionMatrix, viewMat);
}

export function getWorldtoDeviceCoords(pWorld) {
	let pDev = vec3.create(); vec3.transformMat4(pDev, pWorld, viewMat);
	return pDev;
}

export function getDeviceToWorldCoords(pDev) {
	let viewMatInv = mat4.create(); mat4.invert(viewMatInv, viewMat);
	let pWorld = vec3.create(); vec3.transformMat4(pWorld, pDev, viewMatInv);
	return pWorld;
}

export function getCameraProperties() {
	return [fovY, aspect, zNear, zFar];
}

export function viewportPosToDevicePos(clientX, clientY) {
	let rect = gl.canvas.getBoundingClientRect();

	let x = clientX - rect.left;
	let y = clientY - rect.top;
	

	let originX = gl.canvas.clientWidth / 2;
	let originY = gl.canvas.clientHeight / 2;

	x = x - originX;
	y = y - originY;

	x = x / (gl.canvas.clientWidth / 2);
	y = -y / (gl.canvas.clientHeight / 2);

	return [x, y];
}

// Initialize a shader program, so WebGL knows how to draw our data
function initShaderProgram(gl, vsSource, fsSource) {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
	//create shader program
	const shaderProgram = gl.createProgram();
  	gl.attachShader(shaderProgram, vertexShader);
  	gl.attachShader(shaderProgram, fragmentShader);
  	gl.linkProgram(shaderProgram);

  	// If creating the shader program failed, alert

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    	alert(
      		`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram,)}`,
    	);
   		return null;
	}

	return shaderProgram;
}

// creates a shader of the given type, uploads the source and compiles it.
function loadShader(gl, type, source) {
	const shader = gl.createShader(type);

	//send the source shader script to the shader object
	gl.shaderSource(shader, source);
	//compile
	gl.compileShader(shader);
	//check it compiled successfully
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(
			`An error occurred compiling the shaders:
			${gl.getShaderInfoLog(shader)}`,
		);
		gl.deleteShader(shader);
		return null;
	}
	return shader
}



function initShaderProgramsAndBuffers() {
	//basic vertex shader
	const basicvsSource = `
		attribute vec4 aVertexPos;
		uniform mat4 uMatrix;

		void main() {
			gl_Position = uMatrix * aVertexPos;
		}
	`;

	//CIRCLE vertices
	const circleVertices = [0, 0];
	for (let i = 0; i < 9; i++)
	{
		let x = Math.sin(i * Math.PI / 4) * 0.05;
		let y = Math.cos(i * Math.PI / 4) * 0.05;
		circleVertices[i*2 + 0 + 2] = x;
		circleVertices[i*2 + 1 + 2] = y;
	}
	circleVertexCount = 10;

	//CIRCLE vertex shader = basic
	//CIRCLE fragment shader
	const circlefsSource = `
		void main() {
			gl_FragColor = vec4(1, 1, 1, 1);
		}
	`;

	//BIGCIRCLE vertices

	const bigCircleVertices = [0, 0];
	bigCircleVertexCount = 20;
	let numUniqueOutsideVertices = bigCircleVertexCount - 2; //one at (0,0), one overlaps
	let anglePerVertex = 2 * Math.PI / numUniqueOutsideVertices;
	for (let i = 0; i < numUniqueOutsideVertices + 1; i++)
	{
		let x = Math.sin(i * anglePerVertex) * 2;
		let y = Math.cos(i * anglePerVertex) * 2;
		bigCircleVertices[i*2 + 0 + 2] = x;
		bigCircleVertices[i*2 + 1 + 2] = y;
	}

	//BIGCIRCLE vertex shader
	const bigCirclevsSource = `
		attribute vec4 aVertexPos;

		uniform mat4 uMatrix;

		varying vec3 vDisplacement;

		void main() {
			gl_Position = uMatrix * aVertexPos;

			//displacement from the particle origin is just the circle vertices
			vDisplacement = vec3(
				aVertexPos[0], aVertexPos[1], aVertexPos[2]
			);
		}
	`;

	//BIGCIRCLE fragment shader
	const bigCirclefsSource = `
		precision mediump float;

		uniform vec3 uColor;

		varying vec3 vDisplacement;

		void main() {
			float dist_sq = dot(vDisplacement, vDisplacement); //0..0.5..1..2..10..inf
			float distInv = 1.0 / (10.0 * dist_sq + 1.0) - 0.03; //1..0.27..0.16..0.02..0

			vec4 color = vec4(uColor[0], uColor[1], uColor[2], distInv);
			gl_FragColor = color;
		}
	`;


	//ARROW VERTICES
	const arrowVertices = [ //line link
		0, 0, 0,
		0, 1, 0,
		-0.1, 0.8, 0,
		0.1, 0.8, 0,
		0, 1, 0,
		0, 0.8, -0.1,
		0, 0.8, 0.1,
		0, 1, 0
	];
	arrowVertexCount = 8;
	//ARROW VERTEX SHADER = basic
	//ARROW FRAGMENT SHADER
	const arrowfsSource = `
		precision mediump float;
		uniform vec4 uColor;
		void main() {
			gl_FragColor = uColor;
		}
	`;



	//LINE VERTICES
	const lineVertices = [ //lines
		-20, 0, 0,
		20, 0, 0
	];
	lineVertexCount = 2;
	//LINE VERTEX SHADER = basic
	//LINE FRAGMENT SHADER
	const linefsSource = `
		void main() {
			gl_FragColor = vec4(1, 1, 1, 0.2);
		}
	`;


	//CIRCLE buffer, fill it with the array
	circleBuffer = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
	// ^ this is all that happens to that array of positions and the position buffer ^

	// Initialize circle shader program
	circleShaderProgram = initShaderProgram(gl, basicvsSource, circlefsSource);


	//BIGCIRCLE buffer
	bigCircleBuffer = gl.createBuffer(); 
	gl.bindBuffer(gl.ARRAY_BUFFER, bigCircleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bigCircleVertices), gl.STATIC_DRAW);

	//BIGCIRCLE shader program
	bigCircleShaderProgram = initShaderProgram(gl, bigCirclevsSource, bigCirclefsSource);


	//ARROW buffer
	arrowBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, arrowBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrowVertices), gl.STATIC_DRAW);
	//ARROW shader program
	arrowShaderProgram = initShaderProgram(gl, basicvsSource, arrowfsSource);


	//LINE buffer
	lineBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertices), gl.STATIC_DRAW);
	//LINE shader program
	lineShaderProgram = initShaderProgram(gl, basicvsSource, linefsSource);
}