import type { TUI } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import { TranscriptReview } from "./transcript-review.js";

function setup() {
	const scrollBy = vi.fn();
	const requestRender = vi.fn();
	const review = new TranscriptReview({ terminal: { rows: 30 }, scrollBy, requestRender } as unknown as TUI, {
		matches: () => false,
	});
	return { review, scrollBy, requestRender };
}

describe("transcript review", () => {
	it("pages and wheel events scroll the host without forwarding them to choices", () => {
		const { review, scrollBy } = setup();
		expect(review.handleInput("\x1b[5~")).toBe(true);
		expect(scrollBy).toHaveBeenLastCalledWith(-26);
		expect(review.active).toBe(true);
		expect(review.handleInput("\x1b[6~")).toBe(true);
		expect(scrollBy).toHaveBeenLastCalledWith(26);
		expect(review.handleInput("\x1b[<64;2;5M")).toBe(true);
		expect(scrollBy).toHaveBeenLastCalledWith(-1);
		expect(review.handleInput("\x1b[<73;2;5M")).toBe(true);
		expect(scrollBy).toHaveBeenLastCalledWith(5);
	});

	it("first key restores the questions, without confirming an unseen answer", () => {
		const { review } = setup();
		review.handleInput("\x1b[5~");
		expect(review.handleInput("\r")).toBe(true);
		expect(review.active).toBe(false);
		expect(review.handleInput("\r")).toBe(false);
	});

	it("mouse clicks and movement cannot close review or submit questions", () => {
		const { review } = setup();
		review.handleInput("\x1b[5~");
		expect(review.handleInput("\x1b[<0;2;5M")).toBe(true);
		expect(review.handleInput("\x1b[<32;2;5M")).toBe(true);
		expect(review.active).toBe(true);
	});

	it("hosts without a fullscreen viewport keep existing question routing", () => {
		const review = new TranscriptReview({ terminal: { rows: 30 } } as unknown as TUI, { matches: () => false });
		expect(review.handleInput("\x1b[5~")).toBe(false);
		expect(review.active).toBe(false);
	});
});
