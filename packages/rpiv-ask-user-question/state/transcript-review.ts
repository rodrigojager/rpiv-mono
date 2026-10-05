import { isKeyRelease, Key, matchesKey, type TUI } from "@earendil-works/pi-tui";

type ViewportHost = TUI & { scrollBy?: (lines: number) => void };

/** Keep the questionnaire mounted and its answers untouched while reading the chat. */
export class TranscriptReview {
	active = false;
	private readonly tui: ViewportHost;
	constructor(
		tui: TUI,
		private readonly keybindings: { matches(data: string, name: string): boolean },
	) {
		this.tui = tui as ViewportHost;
	}

	handleInput(data: string): boolean {
		if (typeof this.tui.scrollBy !== "function") return false;
		const up = this.keybindings.matches(data, "tui.altScreen.pageUp") || matchesKey(data, Key.pageUp);
		const down = this.keybindings.matches(data, "tui.altScreen.pageDown") || matchesKey(data, Key.pageDown);
		// SGR wheel reports. Other mouse buttons/movement must never approve an answer.
		const wheel = data.match(/^\x1b\[<(\d+);\d+;\d+M$/);
		const button = wheel ? Number(wheel[1]) : undefined;
		const verticalWheel = button !== undefined && ((button & 0b11000011) === 64 || (button & 0b11000011) === 65);
		if (up || down || verticalWheel) {
			if (isKeyRelease(data)) return true;
			this.active = true;
			const page = Math.max(1, this.tui.terminal.rows - 4);
			const lines = verticalWheel ? (button! & 1 ? 1 : -1) * (button! & 8 ? 5 : 1) : up ? -page : page;
			this.tui.scrollBy(lines);
			this.tui.requestRender();
			return true;
		}
		if (!this.active) return false;
		// Swallow mouse sequences and releases while reviewing; the first real key
		// restores the full UI and is not forwarded to submit/cancel/text editors.
		if (data.startsWith("\x1b[<") || isKeyRelease(data)) return true;
		this.active = false;
		this.tui.requestRender();
		return true;
	}
}
