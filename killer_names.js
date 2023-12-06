// --- import userdefined seed and names from the html file ---
let initialSeed = null;
try {
	initialSeed = mySeed;
} catch (e) {
	console.error(e);
}
let defaultNames = "";
try {
	defaultNames = myNames;
} catch (e) {
	console.error(e);
}

// --- tags of the html elements ---
const textareaID = "names";
const targetCountID = "target-count";
const displayID = "display";
const playerCountID = "player-count";
const seedID = "seed-input";
const buttonID = "button-container";
const contentID = "content";
const sidebarID = "sidebar";

// --- main interface to the html file for name generation ---
function generateNames() {
	const text = document.getElementById(textareaID).value;
	const targetCount = document.getElementById(targetCountID).value;
	acceptNames(text, targetCount);
}
function acceptNames(text, targetCount = 1) {
	// split the text into an array of names at ",", "\n", or "\r" etc.
	RanGen.resetFunction();
	const parsedNames = parseNames(text);
	const sanitizedNames = sanitizeNames(parsedNames);
	const validatedNames = validateNames(sanitizedNames);

	// create a list of players
	const players = [];
	for (let i = 0; i < validatedNames.length; i++) {
		players.push(new Player(validatedNames[i]));
	}

	// assign targets
	if (targetCount >= players.length) {
		alert("The number of targets must be less than the number of players.");
		return;
	}
	if (targetCount < 1) {
		alert("The number of targets must be greater than 0.");
		return;
	}
	assignTargets(players, targetCount);

	displayTargets(players);
}
function parseNames(nameText) {
	// split the text into an array of names at ",", "\n", or "\r" etc.
	return nameText.split(/[,;\n\r]+/);
}
function sanitizeNames(names) {
	// trim the names and remove empty names
	const trimmedNames = names.map((name) => name.trim());
	return trimmedNames.filter((name) => name !== "");
}
function validateNames(names) {
	// return trimmed names with no duplicates and alert the user if there are duplicates with a list of the duplicates
	const trimmedNames = [];
	const duplicates = [];
	for (let i = 0; i < names.length; i++) {
		const name = names[i].trim();
		if (trimmedNames.includes(name)) {
			duplicates.push(name);
		} else {
			trimmedNames.push(name);
		}
	}
	if (duplicates.length > 0) {
		alert("The following names are duplicated: " + duplicates);
	}
	return trimmedNames;
}
function sortTextarea(text) {
	const nameText = text ?? document.getElementById(textareaID).value;
	const names = parseNames(nameText);
	const sanitizedNames = sanitizeNames(names);
	const validatedNames = validateNames(sanitizedNames);
	const sortedNames = validatedNames.sort();
	document.getElementById(textareaID).value = sortedNames.join(", \n");
}

// --- target assignment logic ---
Array.prototype.popAt = function (index) {
	return this.splice(index, 1)[0];
};
function factorial(n) {
	if (n <= 0) return 1;
	for (let i = n - 1; i > 0; i--) n *= i;
	return n;
}
function getNthPermutation(n, base) {
	let arr = base.slice();
	let len = arr.length - 1;
	let fact = factorial(len);
	if (n >= fact * arr.length) throw new Error("n greater than possible permutations");
	if (n < 0) throw new Error("n must be greater than 0");
	let result = [];
	for (; true; len--) {
		const index = Math.floor(n / fact); // get index of element to add
		result.push(arr.popAt(index)); // add element at index to result (and remove it from arr)
		if (len <= 0) break;
		n %= fact; // remove factor from k
		fact /= len; // get next factorial
	}
	return result;
}

class Player {
	constructor(name) {
		this.name = name;
		this.targets = [];
	}
	getTargets() {
		this.targets.sort(() => RanGen.get() - 0.5);
		return this.targets;
	}
}

function assignTargets(players, targetCount) {
	if (targetCount < 1) throw new Error("TargetCount must be greater than 0");
	if (targetCount >= players.length) throw new Error("TargetCount must be less than the number of players");

	// setup basic loop
	const ranNum = Math.floor(RanGen.get() * factorial(players.length));
	const loop = getNthPermutation(ranNum, players);

	loop.reduce((prev, curr) => {
		prev.targets.push(curr);
		return curr;
	}, loop[loop.length - 1]);

	// add additional targets
	players.forEach((p) => {
		while (p.targets.length < targetCount) {
			const target = getRandomTarget(loop, p);
			p.targets.push(target);
		}
	});
}
function getRandomTarget(targets, player) {
	// return a random target from the list of targets that is not the player
	// give targets closer to the player a higher chance of being selected
	const newTargets = targets.filter((t) => !player.targets.includes(t));
	if (newTargets.length === 0) throw new Error("No targets left");
	const weightedRan = Math.pow(RanGen.get(), 2);
	const indexOffset = Math.floor(weightedRan * (newTargets.length - 1) + 1);
	const index = (newTargets.indexOf(player) + indexOffset) % newTargets.length;
	return newTargets[index];
}

// --- display and click logic (state machine) ---
class EventManager {
	static lastListeners = { Escape: null, Enter: null, Backspace: null };
	static setListener(type, callback) {
		const content = document;
		content.removeEventListener("keydown", EventManager.lastListeners[type]);
		if (callback === null) return;
		EventManager.lastListeners[type] = (e) => {
			e.preventDefault();
			if (e.key === type && e.repeat === false) {
				callback();
			}
		};
		content.addEventListener("keydown", EventManager.lastListeners[type]);
	}

	static setEscListener(callback) {
		EventManager.setListener("Escape", callback);
	}
	static setEnterListener(callback) {
		EventManager.setListener("Enter", callback);
	}
	static setBackspaceListener(callback) {
		EventManager.setListener("Backspace", callback);
	}
}

function displayTargets(players) {
	document.getElementById(playerCountID).innerHTML = players.length;
	document.getElementById(seedID).value = RanGen.usedSeed;
	new DisplayManager(players);
}

class DisplayManager {
	constructor(players) {
		this.players = players;
		this.state = "initial";
		EventManager.setEscListener(() => this.nextState("inital"));
		this.updateDisplay();
	}
	nextState(state) {
		if (this.state === state) return;
		this.state = state;
		this.updateDisplay();
	}

	updateDisplay() {
		document.getElementById(buttonID).innerText = "";
		switch (this.state) {
			case "initial":
				EventManager.setBackspaceListener(null);
				EventManager.setListener("ArrowRight", null);
				EventManager.setListener("ArrowLeft", null);
				this.renderInitial();
				break;
			case "shureAllTargets":
				this.renderShureAllTargets();
				break;
			case "showAll":
				this.renderAll();
				break;
			case "showSingle":
				this.renderSingle();
				break;
			case "showList":
				this.currPlayer = 0;
				this.nextState("showPlayer");
				break;
			case "showPrevPlayer":
				this.currPlayer--;
				this.nextState("showPlayer");
				break;
			case "showNextPlayer":
				this.currPlayer++;
				this.nextState("showPlayer");
				break;
			case "showPlayer":
				if (this.currPlayer < 0) this.currPlayer = 0;
				if (this.currPlayer >= this.players.length) {
					this.nextState("allPlayersShown");
					return;
				}
				this.renderPlayer();
				break;
			case "showTargets":
				this.renderTargets();
				break;
			case "allPlayersShown":
				EventManager.setBackspaceListener(null);
				EventManager.setListener("ArrowRight", null);
				EventManager.setListener("ArrowLeft", null);
				this.renderAllPlayersShown();
				break;
			default:
				console.error("Invalid state: " + this.state);
				this.nextState("initial");
		}
	}
	renderInitial() {
		const display = document.getElementById(displayID);
		display.innerText = "";

		EventManager.setEnterListener(() => this.nextState("initial"));
		createHeading("Show targets one by one", display, "btn btn-big btn-hover btn-success", "button").onclick = () =>
			this.nextState("showList");
		createHeading("Skip directly to player", display, "btn btn-big btn-hover btn-warning", "button").onclick = () =>
			this.nextState("showSingle");
		createHeading("Show all targets", display, "btn btn-big btn-hover btn-danger", "button").onclick = () =>
			this.nextState("shureAllTargets");
	}
	renderShureAllTargets() {
		const display = document.getElementById(displayID);
		display.innerHTML = "";

		createHeading("Are you shure to see all targets?", display, "display-single display-warning");

		EventManager.setEnterListener(() => this.nextState("showAll"));
		createButton("Im shure! (Enter)", () => this.nextState("showAll"), "btn-success");
		createButton("To menu (ESC)", () => this.nextState("initial"), "btn-warning");
	}
	renderAll() {
		const display = document.getElementById(displayID);
		display.innerText = "";

		const allPlayers = document.createElement("div");
		allPlayers.className = "display-all all-players";
		for (let i = 0; i < this.players.length; i++) {
			const playerContainer = document.createElement("div");
			playerContainer.className = "display-all player-container";
			createHeading(this.players[i].name, playerContainer, "display-all display-player");
			createHeading(
				"player " + (i + 1) + " of " + this.players.length,
				playerContainer,
				"display-all display-progress-small",
				"h2"
			);

			const targetContainer = document.createElement("div");
			targetContainer.className = "display-all target-container";
			const targets = this.players[i].getTargets();
			for (let j = 0; j < targets.length; j++) {
				createHeading(targets[j].name, targetContainer, "display-all display-target", "h2");
			}
			playerContainer.appendChild(targetContainer);
			allPlayers.appendChild(playerContainer);
		}
		display.appendChild(allPlayers);

		EventManager.setEnterListener(null);
		createButton("To menu (ESC)", () => this.nextState("initial"), "btn-warning");
	}
	renderSingle() {
		const display = document.getElementById(displayID);
		display.innerText = "";

		const singlePlayers = document.createElement("div");
		singlePlayers.className = "display-all single-players";
		for (let i = 0; i < this.players.length; i++) {
			const playerContainer = document.createElement("div");
			playerContainer.className = "display-all player-container";
			createHeading(this.players[i].name, playerContainer, "btn btn-success", "button").onclick = () => {
				this.currPlayer = i;
				this.nextState("showPlayer");
			};
			createHeading(
				"player " + (i + 1) + " of " + this.players.length,
				playerContainer,
				"display-all display-progress",
				"h2"
			);
			singlePlayers.appendChild(playerContainer);
		}
		display.appendChild(singlePlayers);

		EventManager.setEnterListener(null);
		createButton("To menu (ESC)", () => this.nextState("initial"), "btn-warning");
	}
	renderPlayer() {
		const display = document.getElementById(displayID);
		display.innerText = "";

		createHeading(this.players[this.currPlayer].name, display, "display-single display-player");
		createHeading(
			"player " + (this.currPlayer + 1) + " of " + this.players.length,
			display,
			"display-single display-progress-small",
			"h2"
		);

		const next = () => this.nextState("showTargets");
		EventManager.setEnterListener(next);
		EventManager.setListener("ArrowRight", next);
		createButton("Show targets (Enter)", next, "btn-success");

		if (this.currPlayer !== 0) {
			const back = () => this.nextState("showPrevPlayer");
			EventManager.setBackspaceListener(back);
			EventManager.setListener("ArrowLeft", back);
			createButton("Go back (Backspace)", back, "btn-danger");
		}

		createButton("To menu (ESC)", () => this.nextState("initial"), "btn-warning");
	}
	renderTargets() {
		const display = document.getElementById(displayID);

		const targetContainer = document.createElement("div");
		targetContainer.className = "display-single target-container small";
		setTimeout(() => {
			targetContainer.className = "display-single target-container";
		}, 5);
		const targets = this.players[this.currPlayer].getTargets();
		for (let i = 0; i < targets.length; i++) {
			createHeading(targets[i].name, targetContainer, "display-single display-target", "h2");
		}
		display.appendChild(targetContainer);

		const next = () => this.nextState("showNextPlayer");
		const back = () => this.nextState("showPlayer");
		EventManager.setEnterListener(next);
		EventManager.setListener("ArrowRight", next);
		EventManager.setBackspaceListener(back);
		EventManager.setListener("ArrowLeft", back);
		createButton("Show next player (Enter)", next, "btn-success");
		createButton("Go back (Backspace)", back, "btn-danger");
		createButton("To menu (ESC)", () => this.nextState("initial"), "btn-warning");
	}
	renderAllPlayersShown() {
		const display = document.getElementById(displayID);
		display.innerHTML = "";

		createHeading(
			"All players have been shown. Press ESC to go back to the main menu.",
			display,
			"display-single display-warning",
			"h2"
		);

		createButton("To menu (ESC)", () => this.nextState("initial"), "btn-warning");
	}
}

// --- helper functions for html element creation ---
function createHeading(text, parent, className = "display-single", tag = "h1") {
	const heading = document.createElement(tag);
	heading.innerHTML = text;
	heading.className = className;
	parent.appendChild(heading);
	return heading;
}
function createButton(text, onclick, className = "") {
	const button = document.createElement("button");
	button.innerHTML = text;
	button.className = "btn btn-menu btn-hover " + className;
	button.onclick = onclick;
	document.getElementById(buttonID).appendChild(button);
	return button;
}

// --- seeded random number generator ---
class RanGen {
	static seed = initialSeed;
	static get() {
		return RanGen.currRandom();
	}
	static setSeed(stringSeed) {
		RanGen.seed = stringSeed === "" ? initialSeed : stringSeed;
		RanGen.resetFunction();
	}
	static usedSeed;
	static resetFunction() {
		RanGen.usedSeed = RanGen.seed === null ? Math.random().toString(32).substring(2) : RanGen.seed;
		const hashSeed = RanGen.cyrb128(RanGen.usedSeed);
		RanGen.currRandom = RanGen.mulberry32(hashSeed[0]);
	}
	static mulberry32(a) {
		return function () {
			var t = (a += 0x6d2b79f5);
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	static cyrb128(str) {
		let h1 = 1779033703,
			h2 = 3144134277,
			h3 = 1013904242,
			h4 = 2773480762;
		for (let i = 0, k; i < str.length; i++) {
			k = str.charCodeAt(i);
			h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
			h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
			h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
			h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
		}
		h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
		h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
		h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
		h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
		(h1 ^= h2 ^ h3 ^ h4), (h2 ^= h1), (h3 ^= h1), (h4 ^= h1);
		return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
	}
}
RanGen.resetFunction();

// --- initialization on document load ---
document.addEventListener("DOMContentLoaded", () => {
	sortTextarea(defaultNames);
	EventManager.setEnterListener(generateNames);
	document.getElementById(seedID).addEventListener("input", () => {
		RanGen.setSeed(document.getElementById(seedID).value);
	});
	document.getElementById(seedID).value = RanGen.usedSeed;

	document.getElementById(sidebarID).addEventListener("keydown", (event) => {
		event.stopPropagation();
	});
});
