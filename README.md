# Axiom CLI

> **"it is true but cannot be proved"**  
> *Developed & maintained by Ruphak*

Axiom is a powerful, universal agentic coding assistant for the terminal. It is designed to be a significant upgrade over existing CLIs by allowing you to bring your own API keys for **any** OpenAI-compatible endpoint (Anthropic, OpenAI, DeepSeek, Gemini, Ollama, Groq, etc.).

## 🚀 Features

- **Universal Provider Support:** Use any LLM model with via native adapters or generic OpenAI endpoints.
- **Mid-Session Profile Switching:** Type `/profile local` mid-chat to switch from Claude 3.5 Sonnet to Llama 3 on Ollama without losing context.
- **Agentic Workflow:** Employs a robust "think → act → observe" loop.
- **Parallel Tool Execution:** Safe (read-only) tools run in parallel for speed.
- **Sub-Agents:** The `task` tool lets the main agent spawn isolated sub-agents to delegate complex problems.
- **Task Planning:** Visual checklist in the terminal managed by the model using `write_todos`.
- **Context Management:** Auto-summarizes long conversations to save tokens and loads `AXIOM.md` project docs automatically.
- **Sessions:** Auto-saves your chat. Resume easily with `/session load <id>`.

## 📦 Installation

```bash
npm install -g axiom-cli
```

## 🛠️ Usage

When you run `axiom` for the first time, a setup wizard will guide you through adding your first provider profile.

### Start the REPL
```bash
axiom
```

### One-shot command
```bash
axiom "Read package.json and generate a README"
```

### Pipe execution
```bash
git diff | axiom "Write a commit message for this diff"
```

## ⌨️ Interactive Commands

Inside the Axiom REPL, you can use slash commands:
- `/help` — Show command options
- `/clear` — Wipe the current conversation
- `/profile [name]` — Switch providers mid-session
- `/model [name]` — Change current model
- `/add` — Setup a new LLM provider profile
- `/sessions` — List saved conversations
- `/session load <id>` — Resume an older chat
- `/usage` — View your session token usage
- `/yolo` — Toggle auto-approval for shell commands and write tools

## 🧰 Built-in Tools

- `read_file` — Read content (supports line ranges)
- `write_file` — Create/overwrite fles
- `edit_file` — Surgical find-replace edits
- `execute` — Trigger shell commands
- `grep` — Regex search codebase
- `find` — Glob pattern file search
- `list_dir` — Peek into folders
- `web_fetch` — Scrape and extract web content
- `write_todos` — Tracks a live checklist
- `task` — Spawn isolated sub-agents

## ⚙️ Configuration
All configuration and sessions are stored in `~/.axiom`. 
You can define multiple profiles in `~/.axiom/config.json`.

---
*Built by Ruphak*
