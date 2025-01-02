
import { physicsStep } from "./physics.js";

import { 
	setupHTMLUIstuff,
	loadPreset,
	getTypeColor,
	getTypeMass,
	getTypeCustom,
	getForceFuncs,
	getTimeConst,
 } from "./html-ui-stuff.js";

import {
	setupRenderStuff,
	drawFrame,
	//viewportPosToDevicePos,
	//getCameraProperties,
	//getWorldtoDeviceCoords,
	//getDeviceToWorldCoords,
	queueArrowDraw
} from "./render-stuff.js";

import * as vec3 from './gl-matrix/vec3.js';

let camera = {
	pos: [0, 7, 12],
	rot: [-Math.PI/6, 0] //rotation around X (tilt up/down), rotation around Y (pan right/left)
}

//for where to add particles
//let cursor3d = [0, 0, 0];

let paused = false;

let particles = [];

function main() {

	//set up webgl stuff
	setupRenderStuff();

	//set up mouse and html input stuff
	setupHTMLUIstuff();

	loadPreset(presets.threeRotations);

	// animate and draw
	animateScene();
}

function animateScene() {
	//update particle mass / c / color from input fields
	for (let particle of particles) {
		let type = particle.type; //int index
		particle.mass = getTypeMass(type);
		particle.c = getTypeCustom(type);
		particle.color = getTypeColor(type);
	}

	let drawVelArrows = document.getElementById("velArrows").checked;
	let drawForceArrows = document.getElementById("forceArrows").checked;

	//physics
	if (!paused && particles.length > 0) {
		let forceFuncs = getForceFuncs();
		physicsStep(particles, forceFuncs, getTimeConst(), drawVelArrows, drawForceArrows); //particles array modified in place
	}
	else if (drawVelArrows) { //even while paused, draw velocity arrows
		for (let particle of particles) queueArrowDraw(particle.pos, particle.vel, [0, 1, 0, 1]);
	}

	//render in webgl
	drawFrame(particles, camera);//, cursor3d);

	//check if particles should be deleted (too far away)
	deleteParticlesIfNeeded();

	requestAnimationFrame((currentTime) => {
		animateScene();
	});
}

export function forceFuncValid(forceFunc) {
	if (forceFunc == "") return false;
	let scope = {
		m1: -1,
		m2: -1,
		c1: -1,
		c2: -1,
		dist_sq: 1
	}
	try {
		let value = math.evaluate(forceFunc, scope);
		if (!isNaN(value) && isNumber(value)) return true;
		return false;
	} catch {
		return false;
	}
}

export function setPaused(isPaused) {
	paused = isPaused;
}

export function isPaused() {
	return paused;
}

export function moveCameraClick(deltaX, deltaY, rotating) {
	if (rotating) {
		//rotate camera
		camera.rot[0] += deltaY * 0.001;
		camera.rot[1] += deltaX * 0.001;
	}
	else {
		//move camera

		//local space
		let move = [-deltaX * 0.02, deltaY * 0.02, 0];
		
		//rotate with camera rotation
		vec3.rotateX(
			move, //out
			move, //vec3 to rotate
			[0, 0, 0], //origin
			camera.rot[0] //angle in rad
		);
		
		vec3.rotateY(
			move, //out
			move, //vec3 to rotate
			[0, 0, 0], //origin
			camera.rot[1] //angle in rad
		);
		camera.pos[0] += move[0];
		camera.pos[1] += move[1];
		camera.pos[2] += move[2];
	}
}

export function moveCameraScroll(amt) {
	let move = [0, 0, amt];
	vec3.rotateX(
		move, //out
		move, //vec3 to rotate
		[0, 0, 0], //origin
		camera.rot[0] //angle in rad
	);
	vec3.rotateY(
		move, //out
		move, //vec3 to rotate
		[0, 0, 0], //origin
		camera.rot[1] //angle in rad
	);
	camera.pos[0] += move[0];
	camera.pos[1] += move[1];
	camera.pos[2] += move[2];
}

// PARTICLE -------------------------------------------------------------

function deleteParticlesIfNeeded() {
	for (let i = particles.length - 1; i >= 0; i--) {
		let p = particles[i];
		if (vec3.length(p.pos) > 100) {
			console.log("deleting particle at position: " + p.pos);
			particles.splice(i, 1);
			p = null;
		}
	}
}

export function deleteParticlesAll() {
	particles = [];
}

export function createParticle(type, pos, vel) {
	for (let p of particles) {
		if (p.pos[0] == pos[0] && p.pos[1] == pos[1] && p.pos[2] == pos[2]) {
			console.log("can't create particle at same position as other particle");
			return;
		}
	}

	let particle = new Particle(type, pos, vel);
	particles.push(particle);
}

function Particle(type, pos, vel) {
	this.type = type;
	this.pos = vec3.fromValues(pos[0], pos[1], pos[2]);
	this.vel = vec3.fromValues(vel[0], vel[1], vel[2]);
	this.mass = null; //to be assiged every frame in animateScene
	this.charge = null; //^
	this.color = null; //^

	console.log("creating particle with position: " + this.pos + ", velocity: " + this.vel);
}


// -------------------------------------------------------------

function vec3toString(vector3) {
	return "" + 
		vector3[0].toFixed(3) + ", " + 
		vector3[1].toFixed(3) + ", " + 
		vector3[2].toFixed(3);
}

export function isNumber(str) {
	return !isNaN(parseFloat(str)) && isFinite(str);
}

export function vec3copy(vec) {
	let copy = vec3.create(); vec3.copy(copy, vec);
	return copy;
}

//3D CURSOR STUFF ------------------------------------------------------

/*

function moveCursor3dToMouse(mouseClientX, mouseClientY, axis) {
	let mousePosDev = viewportPosToDevicePos(mouseClientX, mouseClientY);
	mousePosDev = [mousePosDev[0], mousePosDev[1], 0, 1];
	let mousePosWorld = getDeviceToWorldCoords(mousePosDev);

	let mousePointDirectionWorld = vec3.create();
	vec3.subtract(mousePointDirectionWorld, mousePosWorld, camera.pos);
	vec3.normalize(mousePointDirectionWorld, mousePointDirectionWorld);

	let cursorPos = vec3copy(cursor3d);

	let p = nearestPoint(cursorPos, axis, camera.pos, mousePointDirectionWorld);
	vec3.subtract(p, p, axis);
	cursor3d = p;
}

//returns point on line 1 closest to line 2
function nearestPoint(p1, d1, p2, d2) {
	let n = vec3.create(); vec3.cross(n, d1, d2);
	let n2 = vec3.create(); vec3.cross(n2, d2, n);
	let num = vec3.create(); vec3.subtract(num, p2, p1);
	num = vec3.dot(num, n2);
	let den = vec3.dot(d1, n2);
	let c1 = vec3.create(); vec3.scale(c1, d1, num / den);
	vec3.add(c1, p1, c1);
	return c1;
}

function proj(v1, onto) { //project vec1 onto vec2
	return math.multiply(onto, math.divide(math.dot(v1, onto), math.dot(onto, onto)));
}

function checkCursor3dClick(clientX, clientY) {
	let xArrowCoord = vec3.create(); vec3.add(xArrowCoord, cursor3d, [1, 0, 0]);
	let yArrowCoord = vec3.create(); vec3.add(yArrowCoord, cursor3d, [0, 1, 0]);
	let zArrowCoord = vec3.create(); vec3.add(zArrowCoord, cursor3d, [0, 0, 1]);
	xArrowCoord = getWorldtoDeviceCoords(xArrowCoord);
	yArrowCoord = getWorldtoDeviceCoords(yArrowCoord);
	zArrowCoord = getWorldtoDeviceCoords(zArrowCoord);

	let mousePos = viewportPosToDevicePos(clientX, clientY);

	let clickDistance = 30 / canvas.clientHeight;

	if (vec2.distance(xArrowCoord, mousePos) < clickDistance) return 2;
	else if (vec2.distance(yArrowCoord, mousePos) < clickDistance) return 3;
	else if (vec2.distance(zArrowCoord, mousePos) < clickDistance) return 4;
	return 0;
}

*/

export function getPreset(name) {
	return presets[name];
}

let presets = {
	planets: {
		m0: 1000, c0: 1, 
		m1: 0.01, c1: 1,
		m2: 1, c2: 1,
		force0: "0.01 * m1 * m2 / dist_sq", force1: "0", force2: "0",
		particles: [
			[0, [0, 0, 0], [0, 0, 0]],
			[2, [7, 0, 0], [0, 0, 1.2]],
			[1, [7.2, 0, 0], [0, 0, 1.42]],
			[2, [-8, 0, 8], [-0.67, 0, -0.67]],
			[2, [0, 0, -2], [2.2, 0, 0]],
			[2, [0, 0, -18], [0.75, 0, 0]],
			[1, [0, 0, -18.4], [0.9, 0, 0]],
		]
	},
	splash: {
		m0: 1, c0: 1, 
		m1: 1, c1: 1, 
		m2: 1, c2: 1,
		force0: "0.01 / dist_sq", 
		force1: "0", force2: "0",
		particles: []
	},
	bounce: {
		m0: 1, c0: 1,
		m1: 1, c1: 1, 
		m2: 1, c2: 1,
		force0: "1 / dist_sq", 
		force1: "-1 / dist_sq^3", force2: "0",
		particles: [
			[0, [5, 0, 0], [0, 0, 0]],
			[0, [-5, 0, 0], [0, 0, 0]],
			[1, [0, 8, 0], [0, 0, 0]],
			[1, [0, -8, 0], [0, 0, 0]],
			[2, [0, 0, 8], [0, 0, 0]],
			[2, [0, 0, -8], [0, 0, 0]]
		]
	},
	bounce2: {
		m0: 1, c0: 1,
		m1: 1, c1: 1, 
		m2: 1, c2: 1,
		force0: "-1 / dist_sq", 
		force1: "0.2", force2: "0",
		particles: [
			[1, [2, 0, 0], [0, 0, 0]],
			[1, [-2, 0, 0], [0, 0, 0]],
			[1, [4, 0, 0], [0, 0, 0]],
			[1, [-4, 0, 0], [0, 0, 0]],
			[1, [6, 0, 0], [0, 0, 0]],
			[1, [-6, 0, 0], [0, 0, 0]],
		]
	},
	threeRotations: {
		m0: 1, c0: 1,
		m1: 1, c1: 1, 
		m2: 1, c2: 1,
		force0: "0.1", 
		force1: "0", force2: "0",
		particles: [
			[0, [2, 0, 0], [0, 1, 0]],
			[0, [-2, 0, 0], [0, -1, 0]],
			[1, [0, 2, 0], [0, 0, 1]],
			[1, [0, -2, 0], [0, 0, -1]],
			[2, [0, 0, 2], [1, 0, 0]],
			[2, [0, 0, -2], [-1, 0, 0]],
		]
	}
}

//splash preset
for (let i = 0; i < 10; i++) {
	let theta = (Math.PI * 2 * i) / 10;
	let x = Math.cos(theta);
	let y = Math.sin(theta);
	presets.splash.particles.push([2, [x, y, 0], [0, 0, 0]]);
}

main();