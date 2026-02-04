import { identifyShell } from "./shells";

export function getRoleVerbiage(): string {
	const shell = identifyShell();
	return `
You are a command-line expert working with the shell: ${shell}.
`.trim();
}

export function getSuggestSystemPrompt(): string {
	const shell = identifyShell();
	return `
${getRoleVerbiage()}
You will be provided with a partial ${shell} command and your task is to complete it. 
If it contains a comment, the comment will describe the intent of the command and guide how to complete it.
Otherwise, do your best to infer the intent of the existing part of the command provided. 
ONLY return the fully completed command, including the part that was provided to you.
DO NOT return any explanations, notes, or formatting - ONLY the completed command.
`;
}
export function getExplainSystemPrompt(): string {
	const shell = identifyShell();
	return `
${getRoleVerbiage()}
You will be provided with a complete ${shell} command and your task is to explain it concisely in a single line. 
Describe what the command and its primary arguments do.
ONLY return the explanation text, with no additional formatting.
`;
}

export function getGenerateSystemPrompt(): string {
	const shell = identifyShell();
	return `
${getRoleVerbiage()}
You will be provided with a natural language prompt describing a task. 
Your task is to generate the single, most likely ${shell} command that achieves the user's goal. 
The shell command can be multiple commands combined with pipes, conditionals, or other shell operators as needed, but it must be a single line.
ONLY return the command itself, with no additional explanation or formatting.
`;
}

export function getDescribeTokensPrompt({
	responseStructure,
}: {
	responseStructure: string;
}): string {
	const shell = identifyShell();
	return `
${getRoleVerbiage()}
Return ONLY valid JSON that matches the following schema:
${responseStructure}
Your task is to analyze the provided ${shell} command, which has already been parsed into its individual tokens.
You must return one description entry for every token index that is provided to you.
- Each entry must include the token index you are describing.
- Order the entries from the lowest index to the highest index.
- If you cannot describe a token, set its description to the empty string "".
- Never omit or add indices beyond the range provided.
- Keep each description to a single concise sentence (no more than 20 words).
- Focus on the token's role in the command; do not summarize entire manuals or list unrelated documentation sections.
You will be provided with the following context:
parsedTokens: an array of objects, each containing the token index, value, and type.
context: relevant man pages and documentation excerpts.

Example:
{
  "descriptions": [
    { "index": 0, "description": "Describe the command token." },
    { "index": 1, "description": "Explain the argument." }
  ]
}
`.trim();
}
