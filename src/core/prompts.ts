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
Your task is to analyze the provided ${shell} command, which has already parsed into its individual tokens.
ONLY provide descriptions for the parsed tokens provided. The result should contain a description for every token in the parsedTokens array. 
If you can't describe a token, provide an empty string as its description. 
ALWAYS provide a description for every token, if you can't describe it, use an empty string.
The length of the descriptions array MUST match the length of the parsedTokens array.
You will be provided with the following context:
parsedTokens: an array of strings representing each token in the command
context: relevant man pages and relevant documentation exerps available for any of the identifiable commands. 
`.trim();
}
