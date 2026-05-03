import { useState } from "react";
import axios from "axios";
import "./App.css";

const EXAMPLES = [
  { label: "expressjs/express #4967", url: "https://github.com/expressjs/express/issues/4967" },
  { label: "axios #5013", url: "https://github.com/axios/axios/issues/5013" },
  { label: "next.js #49940", url: "https://github.com/vercel/next.js/issues/49940" },
];

const STEPS = [
  { id: "parse", icon: "🔗", label: "Parse URL" },
  { id: "fetch", icon: "📡", label: "Fetch Issue" },
  { id: "code",  icon: "📂", label: "Read Code" },
  { id: "ai",    icon: "✨", label: "Gemini AI" },
];

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState({});
  const [issue, setIssue] = useState(null);
  const [files, setFiles] = useState([]);
  const [fix, setFix] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPanels, setShowPanels] = useState(false);

  function setStep(id, state, msg) {
    setSteps(prev => ({ ...prev, [id]: { state, msg } }));
  }

  function resetAll() {
    setSteps({});
    setIssue(null);
    setFiles([]);
    setFix("");
    setError("");
    setShowPanels(false);
  }

  async function runAgent() {
    if (!url.trim()) { setError("Please enter a GitHub issue URL."); return; }
    setLoading(true);
    resetAll();
    setShowPanels(true);

    try {
      // Step 1 — parse (visual only, done server-side too)
      setStep("parse", "active", "parsing...");
      await delay(300);

      // Call backend
      setStep("parse", "active", "parsing...");
      const res = await axios.post("/api/solve", { url: url.trim() });
      const { parsedUrl, issue: fetchedIssue, files: fetchedFiles, fix: generatedFix } = res.data;

      setStep("parse", "done", `${parsedUrl.owner}/${parsedUrl.repo} #${parsedUrl.number}`);
      setIssue(fetchedIssue);
      setStep("fetch", "done", fetchedIssue.title.slice(0, 30) + "…");
      setFiles(fetchedFiles);
      setStep("code", "done", `${fetchedFiles.length} file${fetchedFiles.length !== 1 ? "s" : ""} loaded`);
      setStep("ai", "done", "fix ready");
      setFix(generatedFix);

    } catch (e) {
      const msg = e.response?.data?.error || e.message || "Something went wrong.";
      setError(msg);
      // mark active step as failed
      STEPS.forEach(s => {
        setSteps(prev => {
          if (prev[s.id]?.state === "active") return { ...prev, [s.id]: { state: "error", msg: "failed" } };
          return prev;
        });
      });
    } finally {
      setLoading(false);
    }
  }

  function copyFix() {
    navigator.clipboard.writeText(fix).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function renderMarkdown(text) {
    // basic markdown → HTML (for display only)
    return text
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
        `<pre><code class="code-block">${escHtml(code.trim())}</code></pre>`)
      .replace(/`([^`]+)`/g, (_, c) => `<code class="inline-code">${escHtml(c)}</code>`)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h3>$1</h3>")
      .replace(/^# (.+)$/gm, "<h3>$1</h3>")
      .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
      .replace(/<\/ul>\s*<ul>/g, "")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br/>");
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
        </div>
        <div>
          <div className="brand">Issue<span>Solver</span></div>
          <div className="tagline">AI-powered GitHub issue debugging agent</div>
        </div>
        <div className="badge">GEMINI FLASH</div>
      </header>

      {/* URL Input */}
      <div className="section-label">GitHub Issue URL</div>
      <div className="input-row">
        <input
          className="url-input"
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && runAgent()}
          placeholder="https://github.com/owner/repo/issues/42"
        />
        <button className="solve-btn" onClick={runAgent} disabled={loading}>
          {loading ? <span className="spinner" /> : (
            <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {/* Examples */}
      <div className="examples">
        <span className="section-label" style={{ marginBottom: 0, alignSelf: "center" }}>Try:</span>
        {EXAMPLES.map(ex => (
          <button key={ex.url} className="ex-chip" onClick={() => setUrl(ex.url)}>
            {ex.label}
          </button>
        ))}
      </div>

      {/* Pipeline Steps */}
      <div className="pipeline">
        {STEPS.map(s => {
          const step = steps[s.id] || {};
          return (
            <div key={s.id} className={`step ${step.state || ""}`}>
              <div className="step-icon">{s.icon}</div>
              <div className="step-name">{s.label}</div>
              <div className="step-status">
                {step.state === "active" ? (
                  <><span className="spinner-sm" /> {step.msg}</>
                ) : step.msg || "waiting"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Panels */}
      {showPanels && (
        <div className="panels">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Issue</span>
              <div className={`panel-dot ${issue ? "green" : ""}`} />
            </div>
            <div className="panel-body">
              {issue ? (
                <>
                  <strong className="issue-title">{issue.title}</strong>
                  <br /><br />
                  <span className="muted">{(issue.body || "No description.").slice(0, 400)}{(issue.body || "").length > 400 ? "…" : ""}</span>
                </>
              ) : <span className="empty">No issue loaded</span>}
            </div>
          </div>
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Repo Files Found</span>
              <div className={`panel-dot ${files.length > 0 ? "amber" : ""}`} />
            </div>
            <div className="panel-body">
              {files.length > 0 ? (
                files.map(f => (
                  <div key={f.path} className="file-item">
                    <span className="file-check">✓</span>
                    <span className="file-path">{f.path}</span>
                    <pre className="file-preview">{f.content.slice(0, 100)}…</pre>
                  </div>
                ))
              ) : <span className="empty">No files yet</span>}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-box">
          <strong>Error</strong>
          <span>{error}</span>
        </div>
      )}

      {/* Fix Output */}
      {fix ? (
        <div className="fix-panel fade-in">
          <div className="fix-header">
            <div className="fix-header-title">Suggested Fix</div>
            <button className="copy-btn" onClick={copyFix}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div
            className="fix-body"
            dangerouslySetInnerHTML={{ __html: `<p>${renderMarkdown(fix)}</p>` }}
          />
        </div>
      ) : !showPanels && (
        <div className="empty-state">
          <div className="big-icon">🤖</div>
          <p>Paste a GitHub issue URL above and hit <strong>Analyze</strong><br />
          The agent will fetch the issue, read the code, and suggest a fix.</p>
        </div>
      )}
    </div>
  );
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
