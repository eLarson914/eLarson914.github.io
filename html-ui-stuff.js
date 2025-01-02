import { 
    deleteParticlesAll,
    createParticle,
    forceFuncValid,
    moveCameraClick,
    moveCameraScroll,
    getPreset,
    pauseToggle,
    isNumber
} from "./apricot.js";

import * as vec3 from './gl-matrix/vec3.js';

let forceInputs = [
    document.getElementById("force0"),
    document.getElementById("force1"),
    document.getElementById("force2")
];
let mInputs = [
    document.getElementById("m0"),
    document.getElementById("m1"),
    document.getElementById("m2")
];
let cInputs = [
    document.getElementById("c0"),
    document.getElementById("c1"),
    document.getElementById("c2")
];
let colorInputs = [
    document.getElementById("color0"),
    document.getElementById("color1"),
    document.getElementById("color2")
];

//for mouse movement
//0: no movement
//1: moving camera
//2: moving cursor3d along x axis
//3: moving cursor3d along y axis
//4: moving cursor3d along z axis
let mouseMoveState = 0;

let canvas = document.getElementById("gl-canvas");

export function enableOrDisableForceInput(enable) {
	for (let forceInput of forceInputs) {
		forceInput.disabled = !enable;
	}
}

function addParticlesFromInput() {
    for (let tr of document.getElementsByClassName("particleTr")) {
        let type = Number(tr.children[0].children[0].value) - 1;
        let pos = [
            tr.children[1].children[0].value,
            tr.children[2].children[0].value,
            tr.children[3].children[0].value
        ];
        let vel = [
            tr.children[4].children[0].value,
            tr.children[5].children[0].value,
            tr.children[6].children[0].value
        ];

        let valid = true;
        for (let p of pos) {
            if (!isNumber(p)) {
                valid = false;
                break;
            }
        }
        for (let v of vel) {
            if (!isNumber(v)) {
                valid = false;
                break;
            }
        }
        if (valid) {
            createParticle(type, pos, vel);
        }
    }
}

export function getTypeColor(type) {
    return colorInputs[type].value;
}

export function getTypeMass(type) {
    return mInputs[type].value;
}

export function getTypeCustom(type) {
    return cInputs[type].value;
}

export function getForceFuncs() {
	let forceFuncs = [];
	for (let forceInput of forceInputs) {
		if (forceFuncValid(forceInput.value)) {
			forceFuncs.push(forceInput.value);
		}
		else {
			forceInput.value = 0;
		}
	}
	return forceFuncs;
}

//between 0.01 and 0.1
export function getTimeConst() {
	return document.getElementById("timeConst").value / 100;
}


function checkInputZero(event) {
	if (event.target.value == 0) {
		event.target.value = 0.001;
	}
}

export function loadPreset(preset) {
	deleteParticlesAll();

	document.getElementById("m0").value = preset.m0;
	document.getElementById("c0").value = preset.c0;
	document.getElementById("m1").value = preset.m1;
	document.getElementById("c1").value = preset.c1;
	document.getElementById("m2").value = preset.m2;
	document.getElementById("c2").value = preset.c2;

	document.getElementById("force0").value = preset.force0;
	document.getElementById("force1").value = preset.force1;
	document.getElementById("force2").value = preset.force2;

	for (let typeposvel of preset.particles) {
		createParticle(typeposvel[0], typeposvel[1], typeposvel[2]);
	}
}



function newRow() {
    let rowClone = document.getElementById("firstTr").cloneNode(true);
    document.getElementById("firstTr").parentElement.appendChild(rowClone);

    for (let i = 0; i < 6; i++) {
        rowClone.children[i + 1].children[0].value = 0;
    }

    let button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute("style", "min-width: 0px; background-color: red; color:white;");
    button.innerHTML = "x";
    button.addEventListener("click", () => rowClone.remove());
    rowClone.children[rowClone.children.length - 1].appendChild(button);
}

function showMenu(event) {
    let i = event.target.getAttribute("i");

    for (let j = 0; j < document.getElementById("blobContainer").children.length; j++) {
        let menu = document.getElementById("blobContainer").children[j];
        if (i == j) {
            if (menu.style.display == "none") menu.style.display = "block";
            else menu.style.display = "none";
        }
        else menu.style.display = "none";
    }
}


// MOUSE STUFF -----------------------------------------------------

function onMouseMove(event) {
    if (mouseMoveState == 0) {
        canvas.style.cursor = "grab";
        return;
    }
    //else if (mouseMoveState == 1) { //moving

        //get proper action based on radio inputs on canvas

    let rotating = document.getElementById("rotate").checked;
    if (rotating != event.shiftKey) rotating = true;
    else rotating = false;
    
    moveCameraClick(event.movementX, event.movementY, rotating);
    //}
    /*
    else if (mouseMoveState == 2) {
        moveCursor3dToMouse(event.clientX, event.clientY, [1, 0, 0]);
    }
    else if (mouseMoveState == 3) {
        moveCursor3dToMouse(event.clientX, event.clientY, [0, 1, 0]);
    }
    else if (mouseMoveState == 4) {
        moveCursor3dToMouse(event.clientX, event.clientY, [0, 0, 1]);
    }
    */
}

let touchLast = null;
function onTouchStart(event) {
    touchLast = [event.touches[0].clientX, event.touches[0].clientY];
}
function onTouchMove(event) {
    if (touchLast == null) return;
    let deltaX = event.touches[0].clientX - touchLast[0];
    let deltaY = event.touches[0].clientY - touchLast[1];

    let rotating = document.getElementById("rotate").checked;
    moveCameraClick(deltaX, deltaY, rotating);
    touchLast[0] = event.touches[0].clientX;
    touchLast[1] = event.touches[0].clientY;
}
function onTouchEnd(event) {
    touchLast = null;
}

// ---------------------------------------------------------

export function setupUIstuff() {
	canvas.addEventListener(
		"mousedown", (event) => {
			if (event.button == 0) {
				/*
				let clickingCursor3dArrow = checkCursor3dClick(event.clientX, event.clientY);
				if (clickingCursor3dArrow != 0) {
					mouseMoveState = clickingCursor3dArrow; //moving 3d cursor
				}
				else {
					mouseMoveState = 1; //moving camera
				}
				*/
				mouseMoveState = 1; //moving camera
                canvas.style.cursor = "grabbing";
			}
			event.preventDefault();
			
	});
	canvas.addEventListener("mousemove", onMouseMove);
	canvas.addEventListener("touchmove", onTouchMove);
	canvas.addEventListener("touchstart", onTouchStart);
	canvas.addEventListener("touchend", onTouchEnd);
	document.addEventListener(
		"mouseup", () => {
			mouseMoveState = 0; //not moving camera
		}
	);
	canvas.addEventListener("wheel", (event) => {
		let amt = 1;
		if (event.deltaY < 0) {
			amt = -1;
		}

        moveCameraScroll(amt);
		event.preventDefault();
	});

	document.getElementById("pauseButton").addEventListener("click", pauseToggle);

	document.getElementById("removeAll").addEventListener("click", deleteParticlesAll);

	document.getElementById("addButton").addEventListener("click", addParticlesFromInput);

	document.getElementById("newRow").addEventListener("click", newRow);

    for (let bottomButton of document.getElementsByClassName("bottomButton")) {
        let i = bottomButton.getAttribute("i");
        let menu = document.getElementById("blobContainer").children[i];
        menu.style.display = "none";

        bottomButton.addEventListener("click", showMenu);
    }

	document.getElementById("m0").addEventListener("input", checkInputZero);
	document.getElementById("m1").addEventListener("input", checkInputZero);
	document.getElementById("m2").addEventListener("input", checkInputZero);
	

	document.getElementById("move").checked = true; //radio for what happens when you drag mouse on screen
	document.getElementById("timeConst").value = "2";

    for (let exampleButton of document.getElementsByClassName("exampleButton")) {
        exampleButton.addEventListener("click", () => loadPreset(getPreset(exampleButton.getAttribute("exampleName"))));
    }
}