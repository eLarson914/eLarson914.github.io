import { physicsStep } from "./physics.js";

import { 
	setupHTMLUIstuff,
	loadPreset,
	getTypeColor,
	getTypeMass,
	getTypeCustom,
	getForceFunc,
	getTimeConst,
 } from "./html-ui-stuff.js";

import {
	setupRenderStuff,
	drawFrame,
	queueArrowDraw
} from "./render-stuff.js";

import * as vec3 from './gl-matrix/vec3.js';
import * as mat4 from "./gl-matrix/mat4.js";

let camera = [5, 5, 13];
//distance from (0, 0, 0) along Z axis, rotation around X, rotation around Y

let paused = false;

let particles = [];

function main() {

	//set up webgl stuff
	setupRenderStuff();

	//set up mouse and html input stuff
	setupHTMLUIstuff();

	loadPreset(presets.threeRotations);
	document.getElementById("velArrows").checked = true;
	document.getElementById("forceArrows").checked = false;

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
	if (particles.length > 0) {
		let forceFunc = getForceFunc();
		if (!forceFuncValid(forceFunc)) forceFunc = "0";
		physicsStep(particles, forceFunc, getTimeConst(), paused, drawVelArrows, drawForceArrows); //particles array modified in place
	}

	//render in webgl
	drawFrame(particles, camera);

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

export function moveCameraClick(deltaX, deltaY) {

	vec3.rotateY(camera, camera, [0, 0, 0], -deltaX * 0.01);
	
	//make sure camera doesn't rotate over the top
	if (vec3.angle(camera, [0, 1, 0]) > deltaY * 0.01 && vec3.angle(camera, [0, -1, 0]) > -deltaY * 0.01) {
		//axis to rotate around when mouse goes up and down
		let axis = vec3.create();
		vec3.cross(axis, camera, [0, 1, 0]);
		//making rotation mat saves me having to do math
		let mat = mat4.create(); mat4.rotate(mat, mat, deltaY * 0.01, axis);
		//rotate camera
		vec3.transformMat4(camera, camera, mat);
	}
}

export function moveCameraScroll(amt) {
	vec3.scale(camera, camera, 1 + amt * 0.1);
}

// PARTICLE -------------------------------------------------------------

function deleteParticlesIfNeeded() {
	for (let i = particles.length - 1; i >= 0; i--) {
		let p = particles[i];
		if (vec3.length(p.pos) > 30) {
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

export function getPreset(name) {
	return presets[name];
}

let presets = {
	planets: {
		m0: 1000, c0: 1, 
		m1: 0.01, c1: 1,
		m2: 1, c2: 1,
		force: "0.01 * m1 * m2 / dist_sq",
		particles: [
			[0, [0, 0, 0], [0, 0, 0]],
			[2, [7, 0, 0], [0, 0, 1.2]],
			[1, [7.2, 0, 0], [0, 0, 1.42]],
			[2, [-8, 0, 8], [-0.67, 0, -0.67]],
			[2, [0, 0, -2], [2.2, 0, 0]],
			[2, [0, 0, -18], [0.75, 0, 0]],
			[1, [0, 0, -18.4], [0.9, 0, 0]],
			[2, [0, 0, 4], [-1.6, 0, 0]]
		]
	},
	bounce: {
		m0: 1, c0: 1,
		m1: 1, c1: 1, 
		m2: 1, c2: 1,
		force: "(1 / dist_sq) - (1 / dist_sq^3)",
		particles: [
			[0, [5, 0, 0], [0, 0, 0]],
			[0, [-5, 0, 0], [0, 0, 0]],
			[1, [0, 8, 0], [0, 0, 0]],
			[1, [0, -8, 0], [0, 0, 0]],
			[2, [0, 0, 8], [0, 0, 0]],
			[2, [0, 0, -8], [0, 0, 0]]
		]
	},
	threeRotations: {
		m0: 1, c0: 1,
		m1: 1, c1: 1, 
		m2: 1, c2: 1,
		force: "0.1",
		particles: [
			[0, [2, 0, 0], [0, 1, 0]],
			[0, [-2, 0, 0], [0, -1, 0]],
			[1, [0, 2, 0], [0, 0, 1]],
			[1, [0, -2, 0], [0, 0, -1]],
			[2, [0, 0, 2], [1, 0, 0]],
			[2, [0, 0, -2], [-1, 0, 0]],
		]
	},
	boxes: {
		m0: 10000, c0: 2,
		m1: 1, c1: 1, 
		m2: 1, c2: 1,
		force: "0.1 * (c1 - c2)^2",
		particles: [
			[0, [4, 4, 4], [0, 0, 0]],
			[0, [-4, 4, 4], [0, 0, 0]],
			[0, [4, -4, 4], [0, 0, 0]],
			[0, [-4, -4, 4], [0, 0, 0]],
			[0, [4, 4, -4], [0, 0, 0]],
			[0, [-4, 4, -4], [0, 0, 0]],
			[0, [4, -4, -4], [0, 0, 0]],
			[0, [-4, -4, -4], [0, 0, 0]],

			[1, [-6, 1, 1], [0.5, 0, 0]],
			[1, [-8, 1, 1], [0.5, 0, 0]],
			[1, [-6, -1, 1], [0.5, 0, 0]],
			[1, [-8, -1, 1], [0.5, 0, 0]],
			[1, [-6, 1, -1], [0.5, 0, 0]],
			[1, [-8, 1, -1], [0.5, 0, 0]],
			[1, [-6, -1, -1], [0.5, 0, 0]],
			[1, [-8, -1, -1], [0.5, 0, 0]],
		]
	},
}

main();