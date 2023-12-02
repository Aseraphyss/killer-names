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

const textareaID = "names";
const targetCountID = "target-count";
const displayID = "display";
const playerCountID = "player-count";
const seedID = "seed-input";
const buttonID = "button-container";

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
	for (let i = 0; i < targetCount; i++) {
		tryAssignTargets(players);
	}

	displayTargets(players);
}
function tryAssignTargets(players) {
	for (let tries = 0; tries < 100; tries++) {
		try {
			assignTargets(players);
			return;
		} catch (error) {
			console.error(error);
		}
	}
}
function assignTargets(players) {
	// add a random target to each player so that a closed loop is created
	let remainingTargets = [...players];
	let currPlayer = remainingTargets.pop();
	const firstPlayer = currPlayer;
	while (remainingTargets.length > 0) {
		const target = getRandomTarget(remainingTargets, currPlayer);
		currPlayer.targets.push(target);
		remainingTargets = remainingTargets.filter((p) => p !== target);
		currPlayer = target;
	}
	// add the first player as the target of the last player
	currPlayer.targets.push(firstPlayer);
}

function getRandomTarget(targets, player) {
	// return a random target from the list of targets that is not the player
	const newTargets = targets.filter((t) => !player.targets.includes(t));
	if (newTargets.length === 0) throw new Error("No new targets left. Target assignment failed.");
	let target;
	do {
		target = newTargets[Math.floor(RanGen.get() * newTargets.length)];
	} while (target === player);
	return target;
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

function displayTargets(players) {
	document.getElementById(playerCountID).innerHTML = players.length;
	document.getElementById(seedID).value = RanGen.usedSeed;
	new DisplayManager(players);
}

class EventManager {
	static lastEsc = null;
	static lastEnter = null;

	static setEscListener(callback) {
		document.removeEventListener("keydown", EventManager.lastEsc);
		EventManager.lastEsc = (event) => {
			if (event.key === "Escape" && event.repeat === false) {
				callback();
			}
		};
		document.addEventListener("keydown", EventManager.lastEsc);
	}
	static setEnterListener(callback) {
		document.removeEventListener("keydown", EventManager.lastEnter);
		EventManager.lastEnter = (event) => {
			if (event.key === "Enter" && event.repeat === false) {
				callback();
			}
		};
		document.addEventListener("keydown", EventManager.lastEnter);
	}
}

class DisplayManager {
	constructor(players) {
		this.players = players;
		this.state = "initial";
		this.updateDisplay();
		EventManager.setEscListener(() => this.setState("inital"));
	}
	setState(state) {
		if (this.state === state) return;
		this.state = state;
		this.updateDisplay();
	}
	updateDisplay() {
		document.getElementById(buttonID).innerText = "";
		switch (this.state) {
			case "initial":
				EventManager.setEnterListener(() => this.setState("initial"));
				this.renderInitial();
				break;
			case "shureAllTargets":
				this.renderShureAllTargets();
				break;
			case "showAll":
				this.renderAll();
				break;
			case "showSingle":
				this.currPlayer = -1;
				this.setState("showNextPlayer");
				break;
			case "showNextPlayer":
				this.currPlayer++;
				if (this.currPlayer >= this.players.length) {
					this.setState("allPlayersShown");
					return;
				}
				this.renderNextPlayer();
				break;
			case "showNextTargets":
				this.renderNextTargets();
				break;
			case "allPlayersShown":
				this.renderAllPlayersShown();
				break;
			default:
				console.error("Invalid state: " + this.state);
				this.setState("initial");
		}
	}
	renderInitial() {
		const display = document.getElementById(displayID);
		display.innerText = "";

		EventManager.setEnterListener(() => this.setState("showSingle"));
		createHeading("Show targets one by one", display, "btn btn-big btn-success").onclick = () =>
			this.setState("showSingle");
		createHeading("Show all targets selections", display, "btn btn-big btn-danger").onclick = () =>
			this.setState("shureAllTargets");
	}
	renderShureAllTargets() {
		const display = document.getElementById(displayID);
		display.innerHTML = "";

		createHeading("Are you shure to see all targets?", display, "display-single display-warning");

		EventManager.setEnterListener(() => this.setState("showAll"));
		createButton("Im shure! (Enter)", () => this.setState("showAll"), "btn btn-menue btn-success");
		createButton("Back to menu (ESC)", () => this.setState("initial"), "btn btn-menue btn-danger");
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
				"display-all display-progress",
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
		createButton("Back to menu (ESC)", () => this.setState("initial"), "btn btn-menue btn-danger");
	}
	renderNextPlayer() {
		const display = document.getElementById(displayID);
		display.innerText = "";

		createHeading(this.players[this.currPlayer].name, display, "display-single display-player");
		createHeading(
			"player " + (this.currPlayer + 1) + " of " + this.players.length,
			display,
			"display-single display-progress",
			"h2"
		);

		EventManager.setEnterListener(() => this.setState("showNextTargets"));
		createButton("Show targets (Enter)", () => this.setState("showNextTargets"), "btn btn-menue btn-success");
		createButton("Back to menu (ESC)", () => this.setState("initial"), "btn btn-menue btn-danger");
	}
	renderNextTargets() {
		const display = document.getElementById(displayID);
		// display.innerText = "";

		// createHeading(this.players[this.currPlayer].name, display, "display-single display-player");
		// createHeading(
		// 	"player " + (this.currPlayer + 1) + " of " + this.players.length,
		// 	display,
		// 	"display-single display-progress",
		// 	"h2"
		// );

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

		EventManager.setEnterListener(() => this.setState("showNextPlayer"));
		createButton("Show next player (Enter)", () => this.setState("showNextPlayer"), "btn btn-menue btn-success");
		createButton("Back to menu (ESC)", () => this.setState("initial"), "btn btn-menue btn-danger");
	}
	renderAllPlayersShown() {
		const display = document.getElementById(displayID);
		display.innerHTML = "";

		createHeading(
			"All players have been shown. Press ESC to go back to the main menue.",
			display,
			"display-single display-warning",
			"h2"
		);

		EventManager.setEscListener(() => this.setState("initial"));
		createButton("Back to menu (ESC)", () => this.setState("initial"), "btn btn-menue btn-success");
	}
}

function createHeading(text, parent, className = "display-single", tag = "h1") {
	const heading = document.createElement(tag);
	heading.innerHTML = text;
	heading.className = className;
	parent.appendChild(heading);
	return heading;
}
function createButton(text, onclick, className = "btn") {
	const button = document.createElement("button");
	button.innerHTML = text;
	button.className = className;
	button.onclick = onclick;
	document.getElementById(buttonID).appendChild(button);
	return button;
}

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

document.addEventListener("DOMContentLoaded", () => {
	sortTextarea(defaultNames);
	EventManager.setEnterListener(generateNames);
	document.getElementById(seedID).addEventListener("input", () => {
		RanGen.setSeed(document.getElementById(seedID).value);
	});
	document.getElementById(seedID).value = RanGen.usedSeed;
});
