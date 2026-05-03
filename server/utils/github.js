const axios = require("axios");
require('dotenv').config()
/**
 * Parse a GitHub issue URL into owner, repo, number
 * e.g. https://github.com/expressjs/express/issues/4967
 */
function parseGithubUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) {
    throw new Error(
      "Invalid GitHub issue URL. Expected format: https://github.com/owner/repo/issues/123"
    );
  }
  return { owner: match[1], repo: match[2], number: match[3] };
}

/**
 * Fetch a single GitHub issue by owner/repo/number
 */
async function fetchIssue(owner, repo, number) {
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const { data } = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/issues/${number}`,
    { headers }
  );
  return data; // { title, body, html_url, user, labels, ... }
}

/**
 * Fetch a sample of source code files from the repo.
 * Returns array of { path, content }
 */
async function fetchCodeFiles(owner, repo) {
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    // Get the file tree (recursive)
    const { data } = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      { headers }
    );

    const CODE_EXTS = /\.(js|ts|jsx|tsx|py|go|java|rb|rs|cpp|c|cs|php)$/;
    const IGNORE    = /node_modules|dist|build|\.min\.|vendor|__pycache__/;

    // Pick small source files, skip generated/vendor dirs
    const candidates = (data.tree || [])
      .filter(f => f.type === "blob" && CODE_EXTS.test(f.path) && !IGNORE.test(f.path))
      .filter(f => !f.size || f.size < 10000)  // skip huge files
      .slice(0, 6);

    // Fetch raw content in parallel
    const results = await Promise.all(
      candidates.map(async (f) => {
        try {
          const res = await axios.get(
            `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${f.path}`,
            { timeout: 5000 }
          );
          return { path: f.path, content: String(res.data).slice(0, 2000) };
        } catch {
          return null;
        }
      })
    );

    return results.filter(Boolean).slice(0, 4);
  } catch (err) {
    // If tree fetch fails (e.g. rate limit), return empty
    console.warn("Could not fetch repo files:", err.message);
    return [];
  }
}

module.exports = { parseGithubUrl, fetchIssue, fetchCodeFiles };
