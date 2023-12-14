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

// --- constants ---
const maxTries = 1000;
const maxDecentFractionOfTargets = 0.3;

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
	let players = [];
	validatedNames.forEach((name) => players.push(new Player(name)));

	// validate target count
	const nAssignments = parseInt(targetCount);
	if (isNaN(nAssignments) || nAssignments < 1) {
		DisplayManager.error(`Invalid target count: ${nAssignments}. Must be a positive integer.`);
		return;
	}
	if (nAssignments > players.length) {
		DisplayManager.error(`Invalid target count: ${nAssignments}. Must be smaller than the player count.`);
		return;
	}
	if (nAssignments > players.length * maxDecentFractionOfTargets) {
		const message = `The target count is ${nAssignments}, which is more than ${(
			maxDecentFractionOfTargets * 100
		).toFixed(0)}% of the player count. This might result in a bad or failing target assignment.`;
		DisplayManager.warn(message);
	}

	// assign targets
	try {
		assignTargets(players, nAssignments);
	} catch (e) {
		if (!(e instanceof AssignmentError)) throw e;
		const message =
			e +
			" No new targets are displayed.\n" +
			"Try to increase the player count, decrease the target count, or change the seed.";
		DisplayManager.error(message);
		return;
	}

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

class AssignmentError extends Error {
	constructor(message) {
		super(message);
		this.name = "AssignmentError";
	}
}

function assignTargets(players, nAssignments) {
	for (let i = 0; i < nAssignments; i++) {
		retryAddTargets(players);
	}
}

function retryAddTargets(players) {
	let tries = 1;
	while (!addTargets(players)) {
		if (tries >= maxTries) throw new AssignmentError("Failed to add targets after " + tries + " tries.");
		tries++;
	}
}

function isValidTarget(player, target, allInvalids, currInvalid) {
	return (
		player !== target &&
		target !== currInvalid &&
		!allInvalids.includes(target) &&
		!player.targets.includes(target) &&
		!target.targets.includes(player)
	);
}

function addTargets(players) {
	let targets = [];
	for (let i = 0; i < players.length; i++) {
		const validTs = players.filter((t, j) => isValidTarget(players[i], t, targets, targets[j] ?? null));
		if (validTs.length === 0) return false;
		targets.push(validTs[RanGen.int(validTs.length)]);
	}
	players.forEach((p, i) => p.targets.push(targets[i]));
	return true;
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
	static warn(text) {
		alert(text);
	}
	static error(text) {
		alert(text);
	}

	constructor(players) {
		this.players = players;
		this.state = "initial";
		EventManager.setEscListener(() => this.nextState("initial"));
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
	static int(max) {
		return Math.floor(RanGen.get() * max);
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
