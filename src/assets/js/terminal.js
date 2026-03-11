function runTerminal() {

	LICK_SVG = "Aw shoot, looks like this isn't loaded yet."

	// ── Edit these ─────────────────────────────────────────────
	const CONFIG = {
		since: '2026-01-01T00:00:00', // site uptime counter start date
		tz: 'America/New_York', // timezone for clock display
	};

	const FACTS = [
		{ text: 'Have fun exploring my site! Here are some random facts while you do.', raw: false },
		{ text: 'Use Gmail? Hate spam? Delete it with [this](https://github.com/rtyocum/gmail-purge)', raw: false },
		{ text: 'No longer suffering in VSCode...', raw: false },
		{ text: 'Like books? Check out my [goodreads](https://www.goodreads.com/ryan-yocum)', raw: false },
		{ text: 'I co-hosted a workshop on Angular @ RIT. Its a bit dated but [check it out](https://www.se.rit.edu/~rty4159/)', raw: false },
		{ text: 'From my favorite book: ""Sometimes I think my papa is an accordion."', raw: false },
		{ text: `Do you like jazz?\n${LICK_SVG}\nIf you know you know....`, raw: true },
	]

	// ──────────────────────────────────────────────────────────

	const link_regex = /\[([^\]]+)\]\(([^)]+)\)/g;

	const _res = `${window.screen.width}x${window.screen.height}`;
	const _ua = navigator.userAgentData?.brands?.find(b =>
		!['Chromium', 'Not/A)Brand', 'Not A(Brand'].includes(b.brand)
	)?.brand
		|| (/Firefox/.test(navigator.userAgent) ? 'firefox'
			: /Edg/.test(navigator.userAgent) ? 'edge'
				: /OPR|Opera/.test(navigator.userAgent) ? 'opera'
					: /Chrome/.test(navigator.userAgent) ? 'chrome'
						: /Safari/.test(navigator.userAgent) ? 'safari'
							: 'unknown');
	const neofetch = [
		`${_ua}@portfolio`,
		'─────────────────────────────',
		'OS:         Jekyll 4.4.1',
		'Kernel:     GitHub Pages',
		'Shell:      Liquid Templates',
		'WM:         Bulma 1.0.4',
		'Terminal:   JetBrains Mono',
		`Resolution: ${_res}`,
		'─────────────────────────────',
	];

	const scroll = document.getElementById('twScroll');
	const TYPE = 34;
	const MAX = 50;
	let factIdx = 0;

	const sleep = ms => new Promise(r => setTimeout(r, ms));

	// clock
	function updateClock() {
		document.getElementById('terminalClock').textContent =
			new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: CONFIG.tz });
	}
	updateClock();
	setInterval(updateClock, 10000);

	function scrollToBottom() {
		scroll.scrollTop = scroll.scrollHeight;
	}

	function trim() {
		while (scroll.children.length > MAX) scroll.removeChild(scroll.firstChild);
	}

	function blank() {
		const d = document.createElement('div');
		d.className = 'terminal-blank-line';
		scroll.appendChild(d);
		trim();
	}

	function out(text, cls, raw = false) {
		const d = document.createElement('div');
		d.className = 'terminal-line show terminal-out' + (cls ? ' terminal-' + cls : '');

		if (raw) {
			d.innerHTML = text;
			scroll.appendChild(d);
			trim();
			scrollToBottom();
			return;
		}

		let lastIdx = 0, m;
		while (m = link_regex.exec(text)) {
			d.append(document.createTextNode(text.slice(lastIdx, m.index)));
			const a = document.createElement('a');
			a.href = m[2];
			a.textContent = m[1];
			a.target = '_blank';
			a.className = 'terminal-link';
			d.appendChild(a);
			lastIdx = m.index + m[0].length;
		}

		d.append(document.createTextNode(text.slice(lastIdx)));
		scroll.appendChild(d);
		trim();
		scrollToBottom();
	}

	async function cmd(text) {
		const d = document.createElement('div');
		d.className = 'terminal-line show';
		const p = document.createElement('span');
		p.className = 'terminal-prompt'; p.textContent = '❯ ';
		const t = document.createElement('span');
		t.className = 'terminal-cmd';
		d.append(p, t);
		scroll.appendChild(d);
		trim();
		for (const ch of text) {
			scrollToBottom();
			t.textContent += ch;
			await sleep(TYPE + (Math.random() * 12 - 6));
		}
		return d; // so caller can append cursor
	}

	function addCursor(line) {
		const c = document.createElement('span');
		c.className = 'terminal-cursor';
		line.appendChild(c);
		return c;
	}

	async function runBlock(block) {
		const { command, outputs, delay } = block;
		const line = await cmd(command);
		await sleep(320);
		for (const o of outputs) {
			await sleep(o.pause || 120);
			out(o.text, o.cls || null, o.raw || false);
		}

		await sleep(delay || 700);
		blank();
	}

	function buildSession() {
		const fact = FACTS[factIdx++ % FACTS.length];
		const hour = new Date().getHours();
		const greet = 'Good ' + (hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening') + '. Welcome to my website!';

		const factText = fact.text;
		const raw = fact.raw;
		const _start = new Date(CONFIG.since);
		const _now = new Date();
		const _diff = Math.floor((_now - _start) / 1000);
		const _days = Math.floor(_diff / 86400);
		const _hours = Math.floor((_diff % 86400) / 3600);
		const _mins = Math.floor((_diff % 3600) / 60);
		const uptimeStr = `${_days}d ${_hours}h ${_mins}m`;

		return [
			{
				command: 'whoami',
				delay: 3000,
				outputs: [
					{ text: `${greet}.`, cls: 'dim' },
					{ text: `> ${factText}`, cls: 'hi', raw: raw },
				]
			},
			{
				command: `uptime`,
				delay: 3000,
				outputs: [
					{ text: `↑ ${uptimeStr}  load: 0.42`, cls: 'ok' },
				]
			},
			{
				command: 'neofetch',
				delay: 4000,
				outputs: neofetch.map((line, i) => ({
					text: line,
					cls: i === 0 ? 'hi' : i === 1 || i === neofetch.length - 1 ? 'ok' : 'out',
					pause: i === 0 ? 140 : 60,
				})),
			},
			{
				command: 'idf.py flash -p /dev/ttyUSB0',
				delay: 3000,
				outputs: [
					{ text: 'Executing action: flash', cls: 'dim', pause: 100 },
					{ text: 'Running ninja in /build...', cls: 'dim', pause: 300 },
					{ text: 'ninja: no work to do.', cls: 'dim', pause: 200 },
					{ text: 'Flashing binaries to serial port /dev/ttyUSB0...', cls: 'out', pause: 400 },
					{ text: 'esptool.py v4.7.0  Serial port /dev/ttyUSB0', cls: 'dim', pause: 120 },
					{ text: 'Connecting... ████████████████ 100%', cls: 'ok', pause: 800 },
					{ text: 'Chip is ESP32S3', cls: 'out', pause: 120 },
					{ text: 'Writing at 0x00010000... ████████████████ 100%', cls: 'ok', pause: 600 },
					{ text: 'Writing at 0x00008000... ████████████████ 100%', cls: 'ok', pause: 400 },
					{ text: 'Hash of data verified.', cls: 'ok', pause: 300 },
					{ text: 'Hard resetting via RTS pin...', cls: 'dim', pause: 200 },
					{ text: '✓ Flashed rtyocum.dev successfully. Enjoy :)', cls: 'hi', pause: 100 },
				],
			},
		];
	}


	const container = document.getElementById('terminalContainer');
	const root = document.getElementById('terminalRoot');
	const openBtn = document.getElementById('terminalOpen');
	const terminalClose = document.getElementById('terminalClose');
	terminalClose.addEventListener('click', () => {
		container.classList.add('closing');
		setTimeout(() => {
			container.classList.remove('closing');
			root.classList.add('is-invisible');
			openBtn.classList.remove('is-hidden');
		}, 1600);
	});

	const terminalOpen = document.getElementById('terminalOpen');
	terminalOpen.addEventListener('click', () => {
		openBtn.classList.add('is-hidden');
		root.classList.remove('is-invisible');
		container.classList.add('opening');
		setTimeout(() => {
			container.classList.remove('opening');
		}, 1600);
	});

	async function loop() {
		// boot line
		out(`Last login: ${new Date().toDateString()} on ttys001`, 'dim');
		blank();

		while (true) {
			const blocks = buildSession();
			for (const b of blocks) await runBlock(b);

			// idle cursor
			const idleLine = await cmd('');
			const cur = addCursor(idleLine);
			await sleep(3000);
			cur.remove();
			idleLine.remove();
			blank();
		}
	}

	setTimeout(loop, 300);
}

fetch(LICK_URL).then(r => r.text()).then(svg => {
	LICK_SVG = svg;
});

// Its hidden on mobile, so don't waste resources running it if we don't have to
const root = document.getElementById('terminalRoot');
if (root && window.getComputedStyle(root).display !== 'none') {
	runTerminal();
}
