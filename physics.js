import * as mat4 from './gl-matrix/mat4.js'
import * as vec4 from './gl-matrix/vec4.js'
import * as vec3 from './gl-matrix/vec3.js'

import { queueArrowDraw } from './render-stuff.js';
import { vec3copy } from './apricot.js';

function physicsStep(particlesArray, forceFunc, timeConst, paused, drawVelArrows, drawForceArrows) {
    //get accelerations
    for (let i = 0; i < particlesArray.length; i++) {
        let particle1 = particlesArray[i];
        for (let j = i + 1; j < particlesArray.length; j++) {
            let particle2 = particlesArray[j];
            let displacement = vec3.create(); vec3.subtract(displacement, particle2.pos, particle1.pos);
            let direction = vec3.create(); vec3.normalize(direction, displacement);

            let force = vec3.create();
            vec3.scale(
                force, 
                direction,
                calculateForce(particle1, particle2, forceFunc)
            );

            let forceNeg = vec3.create(); vec3.scale(forceNeg, force, -1);

            if (drawForceArrows) {
                queueArrowDraw(particle1.pos, [force[0]*1, force[1]*1, force[2]*1], [1, 1, 1, 1]);
                queueArrowDraw(particle2.pos, [forceNeg[0], forceNeg[1], forceNeg[2]], [1, 1, 1, 1]);
            }
            
            if (!paused) { //if not paused
                //update both particles's velocities from force between them
                applyForce(particle1, force, timeConst);
                applyForce(particle2, forceNeg, timeConst);
            }
        }
        if (!paused) { //if not paused
            //update pos from particle velocity
            let velTimestep = vec3.create(); vec3.scale(velTimestep, particle1.vel, timeConst);

            vec3.add(particle1.pos, particle1.pos, velTimestep);
            if (isNaN(particle1.pos[0]) || isNaN(particle1.pos[1]) || isNaN(particle1.pos[2])) {
                throw new Error("position NaN");
            }
        }
        
        if (drawVelArrows) queueArrowDraw(particle1.pos, particle1.vel, [0, 1, 0, 1]);
    }
}

function applyForce(particle, force, timeConst) {
    let scale = (1 / particle.mass) * timeConst;
    let accelTimestep = vec3.create(); vec3.scale(accelTimestep, force, scale);
    vec3.add(particle.vel, particle.vel, accelTimestep);
}

function calculateForce(particle1, particle2, forceFunc) {
    let scope = {
		m1: particle1.mass,
		m2: particle2.mass,
		c1: particle1.c,
		c2: particle2.c,
		dist_sq: vec3.squaredDistance(particle1.pos, particle2.pos)
	}
    return math.evaluate(forceFunc, scope);
}

export { physicsStep };


