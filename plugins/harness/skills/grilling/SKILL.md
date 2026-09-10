---
name: grilling
description: Deeply examine a plan, decision, or idea through dependent questions. Use when the user requests grilling or Harness Planner selects it after assessing unresolved product decisions; not automatically for every planning request.
---

## Harness adapter

Planner decides whether to use this Skill under [the planning gate](../../agents/planner.md#grilling-gate).
The interview below is upstream text, unchanged; apply these Harness-specific boundaries when using it here:

- Planner chooses the unresolved scope and existing canonical destinations under the user's instructions. Keep settled decisions and explicit delegation; record delegated assumptions, but never treat silence as delegation. Explore the agreed scope, not every possible product extension. Implementation details remain Generator's responsibility.
- Prefer available host-native question UI (Claude Code `AskUserQuestion`, Codex structured user input) over the decorative format below. Respect each tool's availability and batch limits, splitting a frontier as needed; there is no total question cap. Without that UI, ask concise questions in chat. If a child role cannot ask, relay its questions and the user's answers through the orchestrator.
- Use fact-finding subagents when available. Without them, read the relevant files/tools locally, or ask the orchestrator to relay the lookup. Missing tools do not authorize guessing user decisions. For doubtful scope or skipping, use the Planner gate's consultation path; ordinary Skill calls need no separate permission.
- Confirm shared understanding of newly resolved decisions before finalizing the contract. Existing user approval or explicit delegation within that scope remains valid; do not reopen it just to repeat this confirmation.

## Upstream provenance

- Source: [mattpocock/skills — grilling](https://github.com/mattpocock/skills/blob/3cca18b368ae95cdbdebbff572ccafa662551015/skills/productivity/grilling/SKILL.md)
- Revision: `3cca18b368ae95cdbdebbff572ccafa662551015`
- Copyright (c) 2026 Matt Pocock. [MIT License](LICENSE).
- Only discovery frontmatter and the Harness adapter above are local; the interview body below is verbatim.

<!-- upstream-body:start -->
Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
<!-- upstream-body:end -->
