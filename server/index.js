require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const solveRouter = require("./routes/solve");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API Routes ──────────────────────────────────────────────────────────────
app.use("/api", solveRouter);

// ── Serve React build in production ─────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const clientBuild = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientBuild));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
}

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 IssueSolver server running on http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/solve`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`   Start React dev server: cd client && npm run dev`);
  }
});
