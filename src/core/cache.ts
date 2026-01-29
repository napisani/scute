import { Database } from "bun:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ParsedCommand } from "./shells/common";

const CACHE_DIR = path.join(os.homedir(), ".cache", "brash");
const CACHE_PATH = path.join(CACHE_DIR, "brash.sqlite");

let cacheDb: Database | null = null;

function getDb(): Database {
	if (cacheDb) {
		return cacheDb;
	}
	fs.mkdirSync(CACHE_DIR, { recursive: true });
	cacheDb = new Database(CACHE_PATH);
	cacheDb.exec(`
		CREATE TABLE IF NOT EXISTS token_descriptions (
			command TEXT NOT NULL,
			source_hash TEXT NOT NULL,
			token_index INTEGER NOT NULL,
			token_value TEXT NOT NULL,
			description TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			PRIMARY KEY (command, source_hash, token_index)
		);
	`);
	return cacheDb;
}

export function getCachedDescriptions(
	parsedCommand: ParsedCommand,
	sourceHash: string,
): string[] | null {
	const db = getDb();
	const query = db.query(
		`SELECT token_index, description FROM token_descriptions
		 WHERE command = ? AND source_hash = ?
		 ORDER BY token_index ASC`,
	);
	const rows = query.all(parsedCommand.originalCommand, sourceHash) as Array<{
		token_index: number;
		description: string;
	}>;
	if (!rows.length || rows.length !== parsedCommand.tokens.length) {
		return null;
	}
	const descriptions = new Array(parsedCommand.tokens.length).fill("");
	for (const row of rows) {
		descriptions[row.token_index] = row.description;
	}
	return descriptions;
}

export function saveDescriptions(
	parsedCommand: ParsedCommand,
	sourceHash: string,
	descriptions: string[],
): void {
	const db = getDb();
	const insert = db.query(
		`INSERT OR REPLACE INTO token_descriptions
		 (command, source_hash, token_index, token_value, description, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
	);
	const now = Date.now();
	for (let i = 0; i < parsedCommand.tokens.length; i++) {
		const tokenValue = parsedCommand.tokens[i] ?? "";
		const description = descriptions[i] ?? "";
		insert.run(
			parsedCommand.originalCommand,
			sourceHash,
			i,
			tokenValue,
			description,
			now,
		);
	}
}

export function clearCache(): void {
	const db = getDb();
	db.exec("DELETE FROM token_descriptions;");
}
