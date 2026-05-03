const express = require("express");
const router  = express.Router();
const { parseGithubUrl, fetchIssue, fetchCodeFiles } = require("../utils/github");
const { getSuggestedFix } = require("../utils/gemini");

/**
 * POST /api/solve
 * Body: { url: string, geminiKey?: string }
 *
 * If GEMINI_API_KEY is set in .env it is used by default.
 * The client can also pass its own key (useful for the demo UI).
 */
router.post("/solve", async (req, res) => {
  const { url, geminiKey } = req.body;

  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  const apiKey = geminiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({
      error: "No Gemini API key provided. Set GEMINI_API_KEY in .env or pass geminiKey in the request body.",
    });
  }

  try {
    // 1. Parse the GitHub URL
    const parsedUrl = parseGithubUrl(url);
    const { owner, repo, number } = parsedUrl;

    // 2. Fetch the issue from GitHub
    const issue = await fetchIssue(owner, repo, number);

    // 3. Fetch code files from the repo
    const files = await fetchCodeFiles(owner, repo);

    // 4. Ask Gemini for a fix
    const fix = await getSuggestedFix(apiKey, issue, files);

    // 5. Return everything to the client
    return res.json({
      parsedUrl,
      issue: {
        title: issue.title,
        body: issue.body,
        url: issue.html_url,
        author: issue.user?.login,
        labels: issue.labels?.map(l => l.name),
      },
      files,
      fix,
    });

  } catch (err) {
    console.error("Error in /api/solve:", err.message);

    // Give the client a clean error message
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || "Internal server error";
    return res.status(status).json({ error: message });
  }
});

module.exports = router;
