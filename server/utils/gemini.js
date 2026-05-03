const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Call Gemini Flash to suggest a fix for a GitHub issue
 * @param {string} apiKey   - Gemini API key
 * @param {object} issue    - { title, body }
 * @param {Array}  files    - [{ path, content }]
 * @returns {string} markdown text with suggested fix
 */
async function getSuggestedFix(apiKey, issue, files) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const codeBlock = files.length
    ? files.map(f => `// File: ${f.path}\n${f.content}`).join("\n\n---\n\n")
    : "No source files could be retrieved for this repository.";

  const prompt = `You are an expert software engineer reviewing a GitHub issue. Analyze the bug report and the repository code, then provide a concrete, actionable fix.

## Issue Title
${issue.title}

## Issue Description
${issue.body || "No description provided."}

## Repository Source Code (sample files)
\`\`\`
${codeBlock}
\`\`\`

## Your Response Format
Respond in clear markdown with these sections:

### Root Cause
Explain in 2-3 sentences what is likely causing this issue.

### Suggested Fix
Show the exact code change needed. Use a code block with the corrected snippet.

### Why This Works
Brief explanation of why your fix resolves the issue.

### Edge Cases to Watch
Any related cases or caveats the developer should be aware of.

Be direct, technical, and practical. If code files are missing, still analyze the issue description and suggest a likely fix based on common patterns.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

module.exports = { getSuggestedFix };
