/**
 * GitHub side of gh-prs-inbox: fetch the PRs awaiting your review via the `gh`
 * CLI and map them to inbox activity entries.
 *
 * @module
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

/** A PR row as returned by `gh search prs --json`. */
export type Pr = {
	number: number;
	title: string;
	url: string;
	updatedAt: string;
	repository: { nameWithOwner: string };
};

/** An inbox activity entry (the `activity.add` payload). */
export type Entry = { id: string; text: string; url: string };

/** Map a PR to a stable, human-readable activity entry. */
export function prToEntry(pr: Pr): Entry {
	const ref = `${pr.repository.nameWithOwner}#${pr.number}`;
	return { id: ref, text: `${ref} — ${pr.title}`, url: pr.url };
}

/**
 * The entries to show in the feed: most-recently-updated first, capped to
 * `limit`. The inbox `activity` feed is a fixed-size ring buffer, so showing
 * more than it retains would silently evict entries; we cap to its size and let
 * the counter report the true total.
 */
export function feedEntries(prs: Pr[], limit: number): Entry[] {
	return [...prs]
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.slice(0, limit)
		.map(prToEntry);
}

/** Split search syntax into CLI arguments, preserving quoted qualifier values. */
export function filterArgs(filter: string): string[] {
	const args: string[] = [];
	let token = "";
	let quoted = false;
	for (let i = 0; i < filter.length; i++) {
		const char = filter[i];
		if (quoted && char === "\\" && i + 1 < filter.length) {
			token += char + filter[++i];
			continue;
		}
		if (char === '"') quoted = !quoted;
		if (!quoted && (/\s/.test(char) || char === "(" || char === ")")) {
			if (token) args.push(token);
			token = "";
			if (char === "(" || char === ")") args.push(char);
		} else {
			token += char;
		}
	}
	if (quoted) throw new Error("GH_PR_FILTER contains an unclosed double quote");
	if (token) args.push(token);
	return args;
}

/** Ask the `gh` CLI for PRs matching the configured GitHub search filter. */
export async function fetchPrs(): Promise<Pr[]> {
	const { stdout } = await exec("gh", [
		"search",
		"prs",
		// gh defaults to 30; raise to the API max so a large queue isn't truncated.
		"--limit=1000",
		"--json",
		"number,title,url,updatedAt,repository",
		"--",
		...filterArgs(
			process.env.GH_PR_FILTER?.trim() || "review-requested:@me state:open",
		),
	]);
	return JSON.parse(stdout) as Pr[];
}
