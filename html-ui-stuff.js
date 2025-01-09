import { 
    deleteParticlesAll,
    createParticle,
    forceFuncValid,
    moveCameraClick,
    moveCameraScroll,
    getPreset,
    isPaused,
    isNumber,
    setPaused
} from "./apricot.js";


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
let mouseMoveState = 0;

let canvas = document.getElementById("gl-canvas");

export function getTypeColor(type) {
    return colorInputs[type].value;
}

export function getTypeMass(type) {
    return mInputs[type].value;
}

export function getTypeCustom(type) {
    return cInputs[type].value;
}

export function getForceFunc() {
	return document.getElementById("force").value;
}

//between 0.01 and 0.1
export function getTimeConst() {
	return document.getElementById("timeConst").value / 100;
}






// MAKE SURE INPUTS ARE VALID AT ALL TIMES =============================================
// AT ALL TIMES WHILE PLAYING, AND AFTER INPUT CHANGE:
// MASS PROPERTY CANNOT BE ZERO
// CUSTOM PROPERTY CANNOT BE EMPTY
// FORCE EQUATION MUST BE VALID

// AFTER INPUT CHANGE:
// THE ADD / DELETE FORM'S POS XYZ / VEL XYZ FIELDS MUST NOT BE EMPTY

function massNotZeroWhenPlaying(event) {
    if (!isPaused()) { //if not paused
        if (!isNumber(event.target.value) || event.target.value <= 0) {
            event.target.value = 0.01;
        }
    }
}
function massNotZeroAfterChange(event) {
    if (!isNumber(event.target.value) || event.target.value <= 0) {
        event.target.value = 0.01;
    }
}

function customNotEmptyWhenPlaying(event) {
    if (!isPaused()) { //if not paused
        if (!isNumber(event.target.value)) {
            event.target.value = 0;
        }
    }
}
function numberInputNotEmptyAfterChange(event) {
    if (!isNumber(event.target.value)) {
        event.target.value = 0;
    }
}

function forceValidAfterChange(event) {
    if (!forceFuncValid(event.target.value)) {
        event.target.value = 0;
    }
}

function enableDisableForceEquations(paused) {
    if (paused) document.getElementById("force").disabled = false;
    if (!paused) document.getElementById("force").disabled = true;
}

function setupInputValidListeners() {
    // MASS
    for (let massInput of document.getElementsByClassName("massInput")) {
        massInput.addEventListener("input", massNotZeroWhenPlaying); //CANNOT BE ZERO WHILE PLAYING
        massInput.addEventListener("change", massNotZeroAfterChange); //CANNOT BE ZERO AFTER CHANGED
    }

    // CUSTOM
    for (let customInputinput of document.getElementsByClassName("customInput")) {
        customInputinput.addEventListener("input", customNotEmptyWhenPlaying); //CANNOT BE EMPTY WHILE PLAYING
        customInputinput.addEventListener("change", numberInputNotEmptyAfterChange); //CANNOT BE EMPTY AFTER CHANGED
    }

    // FORCE EQUATION
    document.getElementById("force").addEventListener("change", forceValidAfterChange); //MUST BE VALID AFTER CHANGED

    //ADD / DELETE POS / VEL XYZ
    for (let xyzInput of document.getElementsByClassName("xyzInput")) {
        xyzInput.addEventListener("change", numberInputNotEmptyAfterChange);
    }
}

// ======================================================================================




//pause button hit
function pauseToggle(event) {
    let newPausedState = !isPaused();
    setPaused(newPausedState);
    if (!newPausedState) { //if not paused anymore
        event.target.innerHTML = "&#x23F8;";
        document.getElementById("forcePauseSpan").style.display = "block";
    }
    else { //if paused now
        event.target.innerHTML = "&#x23F5;";
        document.getElementById("forcePauseSpan").style.display = "none";
    }
    enableDisableForceEquations(newPausedState);
}


//load data and create particles for example i.e. Solar System
export function loadPreset(preset) {
	deleteParticlesAll();

	document.getElementById("m0").value = preset.m0;
	document.getElementById("c0").value = preset.c0;
	document.getElementById("m1").value = preset.m1;
	document.getElementById("c1").value = preset.c1;
	document.getElementById("m2").value = preset.m2;
	document.getElementById("c2").value = preset.c2;

	document.getElementById("force").value = preset.force;

	for (let typeposvel of preset.particles) {
		createParticle(typeposvel[0], typeposvel[1], typeposvel[2]);
	}
}


//when bottom button is pressed, open "Add/delete" or "Properties" or "Forces" menu etc.
function showMenu(event) {
    let n = event.target.getAttribute("n");

    for (let i = 0; i < document.getElementById("bottomButtons").children.length; i++) {
        let button = document.getElementById("bottomButtons").children[i];
        let menu = document.getElementById("bottomBlobs").children[i];
        if (i == n) {
            if (menu.style.display == "none") {
                button.style = "background-color: antiquewhite; color: black;"
                menu.style.display = "block";
            }
            else {
                button.style = null;
                menu.style.display = "none";
            }
        }
        else {
            button.style = null;
            menu.style.display = "none";
        }
    }
}





//ADD / DELETE MENU =======================================================================

function addParticlesFromInput() {
    for (let tr of document.getElementsByClassName("particleTr")) {
        let type = Number(tr.children[0].children[0].value) - 1;
        let pos = [
            tr.children[2].children[0].value,
            tr.children[3].children[0].value,
            tr.children[4].children[0].value
        ];
        let vel = [
            tr.children[6].children[0].value,
            tr.children[7].children[0].value,
            tr.children[8].children[0].value
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

//adds new row to Add/delete menu
function newRow() {
    let rowClone = document.getElementById("firstTr").cloneNode(true);
    document.getElementById("firstTr").parentElement.appendChild(rowClone);
    let numberInputIndeces = [2, 3, 4, 6, 7, 8];
    for (let i of numberInputIndeces) {
        rowClone.children[i].children[0].value = 0;
        rowClone.children[i].children[0].addEventListener("change", numberInputNotEmptyAfterChange);
    }

    let button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute("class", "xButton");
    button.innerHTML = "x";
    button.addEventListener("click", () => rowClone.remove());
    rowClone.children[rowClone.children.length - 1].appendChild(button);
}

// MOUSE STUFF =======================================================

function onMouseMove(event) {
    if (mouseMoveState == 0) {
        canvas.style.cursor = "grab";
    }
    else {
        moveCameraClick(event.movementX, event.movementY);
    }
}

let touchLast = null;
function onTouchStart(event) {
    touchLast = [event.touches[0].clientX, event.touches[0].clientY];
}
function onTouchMove(event) {
    if (touchLast == null) return;
    let deltaX = event.touches[0].clientX - touchLast[0];
    let deltaY = event.touches[0].clientY - touchLast[1];

    moveCameraClick(deltaX, deltaY);
    touchLast[0] = event.touches[0].clientX;
    touchLast[1] = event.touches[0].clientY;
}
function onTouchEnd(event) {
    touchLast = null;
}

// ==========================================================================


export function setupHTMLUIstuff() {
    //mouse click starts camera move
	canvas.addEventListener(
		"mousedown", (event) => {
            mouseMoveState = 1; //moving camera
            canvas.style.cursor = "grabbing";
			event.preventDefault();
	});
	canvas.addEventListener("mousemove", onMouseMove); //mouse move
	canvas.addEventListener("touchmove", onTouchMove); //mobile touch move
	canvas.addEventListener("touchstart", onTouchStart); //mobile touch start
	canvas.addEventListener("touchend", onTouchEnd); //mobile touch end
	document.addEventListener( //mouse up ends camera move
		"mouseup", (event) => {
			mouseMoveState = 0; //not moving camera
		}
	);
	canvas.addEventListener("wheel", (event) => { //mouse wheel moves camera forward
		let amt = 1;
		if (event.deltaY < 0) {
			amt = -1;
		}

        moveCameraScroll(amt);
		event.preventDefault();
	});

    //pause button
	document.getElementById("pauseButton").addEventListener("click", pauseToggle);

    //remove all particles button
	document.getElementById("deleteButton").addEventListener("click", deleteParticlesAll);

    //add particles from form button
	document.getElementById("addButton").addEventListener("click", addParticlesFromInput);

    //new row for add particles form
	document.getElementById("newRow").addEventListener("click", newRow);

    //buttons at bottom tab for opening menus
    for (let bottomButton of document.getElementsByClassName("bottomButton")) {
        let n = bottomButton.getAttribute("n");
        let menu = document.getElementById("bottomBlobs").children[n];
        menu.style.display = "none";

        bottomButton.addEventListener("click", showMenu);
    }

    //time constant slider
	document.getElementById("timeConst").value = "2";

    //button to load example scenario
    for (let exampleButton of document.getElementsByClassName("exampleButton")) {
        exampleButton.addEventListener("click", () => loadPreset(getPreset(exampleButton.getAttribute("exampleName"))));
    }

    setupInputValidListeners();
}