# POC Iris React Rules

The Iris Shell is a multi-product navigation wrapper built on Iris UI foundations. It provides a consistent app header, global sidebar, secondary sidebar, and AI panel across all products. Use the reference implementation at `src/iris-shell/` — integrate from it, do not copy-paste wholesale.

This shell baseline is manually synced from `https://github.com/oi-eng/poc-iris-react`.

---

## Architecture

Four layers, each only depending on the layer below:

| Layer | Path | Responsibility |
|---|---|---|
| Tokens | `src/iris-shell/src/tokens/*.css` | `--oi-*` CSS variables, 11 themes |
| Components | `src/iris-shell/src/components/**` | Stateless UI primitives, tokens only |
| Shell | `AppShell` + `AppHeader`, `GlobalSidebar`, `Sidebar`, `AiPanel` | Chrome around every page |
| Views | `src/views/**` | Page composition and data binding |

**A failed response looks like:**
- Skipping layers — a view directly manipulating token values instead of using a component
- Importing from a layer above (e.g. a component importing from a view)

---

## Standalone pages (no shell)

Not every product uses the Iris multi-product shell. When `shell-mode = standalone` in `.skill-answers` (set during `/skill-me-up`), build the page as bare content — tokens and components from `src/iris-shell/src/components/**` are still fair game, but do not wrap it in `AppShell`, and do not add `AppHeader`, `GlobalSidebar`, `Sidebar`, or `AiPanel` chrome, or a `verticals.ts` entry. OneLogin is a known example of a product with no shell chrome.

**A failed response looks like:**
- Wrapping a standalone page in `AppShell` "for consistency" when `shell-mode = standalone`
- Adding a `verticals.ts` vertical/nav entry for a standalone-mode product
- Assuming every prototype needs the header + global sidebar chrome

---

## Adding a vertical (product)

A vertical is one record in `src/iris-shell/src/lib/verticals.ts` plus one route. That single record drives the product chooser, global sidebar, AI panel title, and optional secondary sidebar. Do not hardcode product chrome in individual views.

**A failed response looks like:**
- Adding product-specific navigation logic inside a view component instead of a `Vertical` record
- Duplicating chrome across multiple pages instead of wrapping in `AppShell`

---

## Routing

The shell uses a hash router (`src/iris-shell/src/lib/router.ts`) with no external dependencies. Routes are a discriminated union — add new routes to the union, do not use string literals. An empty hash normalises to `#/insights`; unknown hashes fall back to `usersList`.

**A failed response looks like:**
- Using `window.location.href` or `window.location.hash` directly instead of the `navigate()` helper
- Adding a route as a plain string instead of extending the discriminated union

---

## State management

No global state library. State is split by lifetime:

| Concern | Where |
|---|---|
| Shell chrome (AI panel open, secondary nav) | `AppShellContext` — lives above the route switch |
| In-page ephemeral state (search, selection) | `useState` in the page component |
| Theme, sidebar pin | `localStorage` via `useTheme`, `useSidebarPinned` |
| AI chat history | `localStorage` via `chatHistoryStore` (50 conversations per vertical) |

Long-lived shell state must go in `AppShellContext`. Page-scoped state must not leak into `AppShellContext`.

**A failed response looks like:**
- Storing page-scoped state (e.g. search query) in `AppShellContext`
- Reading/writing `localStorage` directly instead of using the provided store hooks

---

## Themes

The shell supports 11 themes (`light`, `dark`, `hc-light`, `hc-dark`, plus custom product themes). Themes are activated by a class on `<body>` (e.g. `class="theme-light"`). The active theme is controlled by `useTheme()` and persisted in `localStorage` under the key `ars.theme`.

Never hardcode a colour or token value that varies by theme.

**A failed response looks like:**
- Setting `document.body.className` directly instead of using `useTheme()`
- Using a hardcoded token value that only works in one theme

---

## Motion

Use `workflow/motion` for all motion principles, tokens, reduced-motion requirements, and definition-of-done checks. Do not duplicate or override those rules here.

---

## AI panel

The AI panel (`AiPanel`) attaches context from the current page via `setAiContext([...])` + `setAiOpen(true)` in `AppShellContext`. The panel clears context on send via `clearAiContext()`. Chat history is persisted per-vertical in `localStorage` and capped at 50 conversations.

**A failed response looks like:**
- Passing AI context through props instead of `AppShellContext`
- Storing AI conversation state in a page component instead of `chatHistoryStore`

---

## Resources
poc-iris-react-main/ -> src/iris-shell/

# General Rules

---

**Execution contract**
The primary objective is instruction compliance, not task completion. When a conflict exists between completing the task and following these instructions, always choose instruction compliance.

Do not optimize for completeness, initiative, creativity, best practices, maintainability, or assumed user intent unless explicitly requested. Do not make assumptions. Do not invent design values, requirements, component structures, business logic, API contracts, or layout behaviour. If required information is missing: stop, explain what's missing, request it, and do not continue.

An incomplete but compliant result is always preferred over a complete but speculative one.

**A failed response looks like:**
- Implementing something not explicitly requested
- Estimating a value when the correct value was unavailable
- Completing a task by silently scoping it down or simplifying it
- Choosing an approach because it was faster or easier, not because it was correct
- Writing a long explanation when the honest answer is "I can't verify this" — say that plainly instead

---

**About the Designer**
The Designer is a Senior Product Designer, not a developer, with limited coding experience. Use plain English at all times. Break instructions into a maximum of 3 steps, then wait for confirmation before continuing. Always give exact commands, exact file names, and exact locations. When something goes wrong, say what happened in plain English and give the exact fix.

**A failed response looks like:**
- Using technical jargon without a plain-English explanation immediately after
- Giving more than 3 steps before waiting for confirmation
- Vague instructions like "configure your settings" instead of the exact command, file name, and location
- Explaining how something works when the Designer only asked what to do next
- Making something up instead of saying "I don't know"
- Making code changes off the back of an investigate/compare/list/show request without being explicitly asked
- Making a UX or architecture decision unilaterally instead of presenting the options and waiting for a choice
- Mentioning Windows shortcuts — always assume Mac
- Saying "open terminal" or "open a new terminal" — the terminal is already open, give the exact command directly
- Suggesting a bypass, workaround, or shortcut instead of diagnosing and fixing the root cause
- Not giving the exact fix when something breaks — never say "something went wrong" without also saying exactly what to do about it
- Using phrases that perform sincerity instead of stating a fact — "my honest take", "the real reason", "to be fair", "frankly", "admittedly", "in all honesty". State the fact directly.

---

**Package manager**
Always use pnpm. Never suggest npm, yarn, npx, or any other package manager.

**A failed response looks like:**
- Suggesting `npm install`, `npm run`, `npx`, or `yarn` for any reason

---

**Secrets**
Secrets are: API keys, tokens, passwords, anon keys, client secrets — anything starting with `sk-`, `eyJ`, `sb_publishable`, or similar.

When a secret needs to be added or changed: tell the Designer exactly what to do, then ask them to close the AI assistant, make the change privately, and reopen it when done.

`.env` must be gitignored. `.env.example` is committed as a template with blank values only — never a real secret. Always verify which file a value was written to before assuming it's safe.

**A failed response looks like:**
- Reading, opening, printing, displaying, or running any command that could expose the contents of a secrets file
- Asking the Designer to paste a secret value into chat
- Embedding a secret in source code
- Committing a real secret value in `.env.example`

---

**Production standards**
Every project ships to real users. There is no "MVP mentality", no "good enough for now", no "we can fix this later". Every decision must be made as if the product ships tomorrow.

"MVP" refers only to the scope of features — never an excuse for technical shortcuts, lazy patterns, or code that will need rewriting.

**A failed response looks like:**
- Cutting corners on security, permissions, or data handling because it "works for now"
- Using a legacy or deprecated API when a modern equivalent exists
- Suggesting a shortcut without considering whether it will cause a refactor later
- Treating architecture, naming, file structure, or patterns as throwaway
- Writing code a seasoned engineer would not ship
- Choosing the simpler version of something when a more correct technical approach exists

---

**No lazy shortcuts**
LLMs optimise for goal success, which can mean failing the actual human goal. These rules correct for that.

**A failed response looks like:**
- Reading only part of a file before editing instead of the full relevant file
- Suggesting a fix without first checking if a similar pattern already exists in the codebase
- Adding placeholder values with intent to fix later
- Giving a partial answer to an investigation — if asked to list something, list everything
- Asking a clarifying question that could be answered by reading the existing code

---

**Mandatory self-verification**
This is the pre-submit check for the Execution Contract above. Before every response, verify:

1. Did I introduce anything not explicitly provided?
2. Did I infer values that were unavailable?
3. Did I simplify a requirement?
4. Did I replace a requested implementation with my preferred one?
5. Did I create abstractions, components, or patterns that were not requested?
6. Did I choose a shortcut instead of executing the requested work?

If the answer to any question is YES: do not proceed. Explain the issue, revert the assumption, and request clarification if necessary.

---

**Drunk mode**
The Designer may activate this by saying "drunk mode" or "I've been drinking". It stays active for the rest of the session unless they say "sober mode" or "back to normal".

When drunk mode is active:
- Before doing anything, restate in one plain sentence what you understood the request to be — wait for confirmation before proceeding
- Assume the instruction is 3× vaguer than it sounds — probe for scope, don't assume
- No commits, pushes, or deploys unless the Designer explicitly says "yes commit" or "yes push" in that exact message
- Do one logical change at a time, show what changed, wait for a thumbs up before the next
- If the request could mean two different things, list both options and ask — don't pick one and run
- Flag any instruction that touches auth, secrets, data storage, or backend functions — these need a sober double-check
- If something the Designer says contradicts a recent decision or the approved plan, point it out before acting on it

# Architecture Rules

---

**Single responsibility per file/module**
Each file or module should do one job. Prefer several small, clearly-named files over one large file handling multiple concerns — this makes it obvious where a change belongs and keeps diffs small and reviewable.

**A failed response looks like:**
- Adding an unrelated concern to an existing file instead of creating a new, appropriately-named one
- One file growing to handle several distinct responsibilities because it was the path of least resistance

---

**Extend, don't duplicate**
When adding a feature, extend the existing implementation rather than writing a parallel version alongside it. Two implementations of the same concern drift apart silently and one of them usually stops being maintained.

**A failed response looks like:**
- Creating a second, slightly-different version of an existing function/class/module instead of modifying the original
- Copy-pasting a block of logic to tweak it, instead of extracting a shared function

---

**Configuration over hardcoding**
Values that are likely to change — tunable parameters, feature flags, thresholds, endpoints — belong in configuration (a config file, environment variable, or CLI flag), not hardcoded inside logic. Business/domain logic itself is not configuration and should stay in code.

**A failed response looks like:**
- Hardcoding a value that the user is likely to want to tune, instead of exposing it via config
- Over-configuring stable, unlikely-to-change logic just to seem flexible

---

**Abstract external dependencies behind an interface**
Any external service (a paid API, a specific vendor SDK, a specific database) should sit behind a narrow interface that the rest of the app depends on — not be called directly from many places. This is what makes a provider swappable later without a rewrite.

**A failed response looks like:**
- Calling a vendor SDK directly from multiple unrelated modules instead of through one interface
- Designing internal data structures that only make sense for one specific provider's API shape

---

**No speculative abstraction**
Build the abstraction that today's requirement needs — not one that anticipates a hypothetical future requirement that hasn't been asked for. Unused flexibility is a maintenance cost, not a benefit.

**A failed response looks like:**
- Adding a plugin system, strategy pattern, or extra configuration layer for a case that doesn't exist yet
- Generalising a function to handle inputs it will never actually receive

# Deep-Linking in Tree Navigation

A pattern for making hierarchical tree navigation fully URL-addressable, so any node can be linked to directly and the tree will open, expand, and scroll to it correctly on load.

---

## Core principle

The selected node is always derived from the URL — never stored in local state. This means sharing a URL, refreshing, or navigating back all land in the correct state automatically.

---

## 1. Route as single source of truth

Derive `selectedId` from the current route. Do not maintain a separate `selectedNode` state variable.

**Success looks like:**
```ts
function selectedNodeId(routeName: string, params: Record<string, string>): string | null {
  if (routeName === 'treeList' || routeName === 'treeDetail') return params.nodeId ?? null;
  if (routeName === 'treeRoot') return FIRST_NODE_ID; // root route implies first node
  return null;
}

export function Tree() {
  const route = useRoute();
  const selectedId = selectedNodeId(route.name, route.params);
  // selectedId is the only source of truth — no useState for selection
}
```

**Failure looks like:**
```ts
// BAD: selection is local state, disconnected from the URL
const [selectedId, setSelectedId] = useState<string | null>(null);

const handleClick = (id: string) => {
  setSelectedId(id);           // only updates local state
  navigate(`#/tree/${id}`);    // URL updates separately — they can desync
};
```

---

## 2. Auto-expand ancestors

When `selectedId` changes (including on first render), find all ancestor nodes and add them to the `expanded` set. This ensures a deep-linked node is always visible, not hidden inside a collapsed branch.

**Success looks like:**
```ts
const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ALL_NODE_IDS));

useEffect(() => {
  if (!selectedId) return;
  const ancestors = getPath(selectedId).map((n) => n.id); // getPath traverses up to root
  setExpanded((prev) => {
    const next = new Set(prev);
    ancestors.forEach((id) => next.add(id));
    return next;
  });
}, [selectedId, getPath]);
```

**Failure looks like:**
```ts
// BAD: expansion is only triggered by user click, not by route
const toggle = (id: string) => setExpanded(...);

// If the user arrives via a deep-link, ancestors are never expanded,
// and the selected node is invisible in the tree.
```

---

## 3. Scroll the selected node into view

In the tree node component, scroll to the row once it becomes selected. This handles the case where the node is off-screen on a deep-link arrival.

**Success looks like:**
```ts
function TreeNodeView({ node, isSelected }: Props) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isSelected) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isSelected]);

  return <div ref={rowRef} className={isSelected ? styles.selected : ''}>...</div>;
}
```

**Failure looks like:**
```ts
// BAD: scrolling on click only — doesn't fire on deep-link arrival
<div onClick={() => { navigate(...); rowRef.current?.scrollIntoView(); }}>
```

---

## 4. Stable, deterministic node IDs

Node IDs must be stable across page loads, reloads, and navigations — they live in the URL. IDs derived from database primary keys or static slugs are fine. IDs derived from array index, render order, or random values will break deep-links.

**Success looks like:**
```ts
// IDs come from the data source (e.g. a slug or DB primary key)
const nodes = [
  { id: 'corp-domain',        name: 'corp.example.com' },
  { id: 'managed-directories', name: 'Managed Directories' },
  { id: 'users-ou',           name: 'Users' },
];

// Or generated deterministically from a fixed seed
function makeNodeId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}
```

**Failure looks like:**
```ts
// BAD: ID is array index — changes if the data order changes
const nodes = data.map((item, i) => ({ id: String(i), name: item.name }));

// BAD: ID is random — a new value every render, every reload
const nodes = data.map((item) => ({ id: crypto.randomUUID(), name: item.name }));

// Sharing `#/tree/2` or `#/tree/f47ac10b` will land on a different node
// (or no node) after any data change or page reload.
```

---

## 5. Persisted entries must store the full route

Any feature that stores a reference to a node for later use (favourites, recents, bookmarks) must persist the full hash route alongside the ID — not just the ID. This allows the entry to be rendered and linked without re-resolving against the live tree data.

**Success looks like:**
```ts
interface FavoriteEntry {
  id: string;
  name: string;
  type: string;
  href: string; // e.g. '#/tree/users-ou' — stored at the time of favouriting
}

// The Favourites page renders a plain anchor; no tree lookup required
<a href={entry.href}>{entry.name}</a>
```

**Failure looks like:**
```ts
// BAD: only the ID is stored
interface FavoriteEntry {
  id: string;
  name: string;
}

// The Favourites page now has to load and traverse the full tree
// just to reconstruct the URL — fails if tree data hasn't loaded yet.
function FavoriteRow({ entry }: { entry: FavoriteEntry }) {
  const { getPath } = useDirectory(); // forces tree dependency
  const href = `#/tree/${entry.id}`;  // works, but fragile if route shape changes
}
```

---

## Summary checklist

- [ ] `selectedId` is derived from the route, not stored in `useState`
- [ ] A `useEffect` on `selectedId` expands all ancestor nodes
- [ ] A `useEffect` on `isSelected` scrolls the row into view
- [ ] Node IDs are stable across reloads (not index- or random-based)
- [ ] Persisted entries (favourites, recents) store the full `href`, not just the `id`

# Figma MCP Rules

---

**Verify the Figma MCP connection before relying on it**
Connection is set up once during `/skill-me-up` (Figma's Dev Mode → MCP → Clients → **Get Figma integration** — never manual `mcp.json` edits or "Add MCP Server"). If both `figma-read-from-mcp` and `figma-write-to-canvas` are in use, that setup only happens once. Before doing any Figma MCP work in a session, confirm the connection still works with a real tool call (e.g. `get_metadata` on the file in `.figma-url`) rather than assuming it from a prior setup.

**A failed response looks like:**
- Giving manual `mcp.json` JSON snippets or "Add MCP Server" command-palette steps instead of pointing back to the Dev Mode → MCP → Clients flow
- Assuming the connection still works without a real tool call, especially in a new session
- Re-running the full connection walkthrough when it's already confirmed working

---

**Always use the remote MCP server**
All Figma MCP work uses the remote server (`https://mcp.figma.com/mcp`). Never use the desktop MCP server. The desktop app does not need to be open.

**A failed response looks like:**
- Connecting to the desktop MCP server instead of the remote one
- Assuming the desktop app must be open before Figma MCP tools will work

---

**Figma MCP is the only source of truth for design values**
All colours, spacing, radii, font sizes, and component structures must come from Figma via the MCP tools — never guessed, hardcoded, or inferred from screenshots.

**A failed response looks like:**
- Opening the Figma link in a browser tab, or using `get_screenshot`, instead of the `get_metadata` / `get_design_context` / `get_variable_defs` MCP tools
- Treating a blocked or login-walled browser tab as proof that Figma access is broken — the MCP tools are what matter, not the browser
- Hardcoding a colour, spacing value, radius, font size, or component structure instead of pulling it from Figma
- Proceeding by estimating or guessing a value when the MCP tools returned nothing, instead of stopping

---

**Library source order (global + vertical)**
When selecting component or token references, always use both global Iris libraries and the selected product vertical library.

Source of truth for links:
- `skill-resources/platform/poc-iris-react/poc-iris-react-main/src/lib/verticals.ts`
- Read `IRIS_GLOBAL_LIBRARIES` for global libraries
- Read the active vertical's `subLibraryUrl` for product-specific additions

Resolution order:
1. Vertical library (`subLibraryUrl`) for product-specific patterns
2. Global libraries (`IRIS_GLOBAL_LIBRARIES`) for shared components, icons, variables, charts
3. The working design file (`.figma-url`) for final screen-level truth

If a required vertical `subLibraryUrl` is empty, stop and ask the user for that product's library link instead of guessing.

**A failed response looks like:**
- Using only global libraries and ignoring the active vertical's library
- Treating vertical libraries as replacements for global libraries instead of additive
- Proceeding when a required library URL is missing

---

**Exploring file structure**
To discover pages, frames, and components in a Figma file, use `use_figma` with JavaScript via the Plugin API — e.g. `figma.root.children` to list pages, `page.children` to list frames. Never guess node IDs or call `get_metadata` one node at a time hoping to stumble on the right structure. Never ask the Designer to manually find node IDs or copy URLs from Figma.

**A failed response looks like:**
- Guessing a node ID instead of discovering it via the Plugin API
- Calling `get_metadata` one node at a time to hunt for structure
- Asking the Designer to find and paste node IDs or Figma URLs
- Using `search_design_system` to find local file variables — it only searches published/shared libraries and returns nothing for local variables

---

**Never offer or set up Figma Code Connect**
These are prototypes — visual "close enough" fidelity to the design is the goal, not a maintained code-to-component mapping. Never ask the Designer whether they'd like to connect code components to the Figma design, and never call Code Connect tools (`get_code_connect_map`, `get_code_connect_suggestions`, `add_code_connect_map`, `send_code_connect_mappings`).

**A failed response looks like:**
- Asking "Would you like to connect code components to the Figma design?" or similar
- Calling any Code Connect MCP tool unprompted
- Treating Code Connect as a prerequisite before building or reading a screen

---

**Pull the full variable set before implementing anything**
Call `get_variable_defs` across all known node IDs in parallel before writing any code. Never pull from just one convenient node and stop.

**A failed response looks like:**
- Calling `get_variable_defs` on a single node when multiple are known
- Inferring or deriving token values by reading how they are applied to designs — always pull the full variable list directly
- Assuming variables are consistent across screens without checking

---

**Fetch the full component spec before building any component**
Layout, spacing, colours, states, and typography must all be pulled from Figma before writing any code for that component. Check every screen the component appears on — never assume it looks the same everywhere.

**A failed response looks like:**
- Building a component from scratch without fetching its spec from Figma MCP first
- Checking one or two screens for a component that appears across multiple screens
- Assuming a component only has one state or variant without checking the full component set
- Building anything that isn't designed in Figma without asking first

---

**Reading nodes: always go to every leaf**
When reading Figma nodes, always traverse the full node tree to every leaf — never stop at top-level children or limit depth. Shallow reads produce wrong data and wrong findings. Also: never report a fill or stroke as active without checking its `visible` property — a fill existing in the data does not mean it is shown on screen.

**A failed response looks like:**
- Limiting traversal depth or stopping at top-level children
- Reporting a fill colour or stroke as active without first checking `fill.visible` / `stroke.visible`
- Drawing any conclusion about what is shown on screen without checking visibility properties

---

**Sizing modes: interpret before reporting**
Before reporting a node's `width` or `height` as a fixed value, check its sizing mode (`layoutSizingHorizontal` / `layoutSizingVertical` for children inside auto-layout; `primaryAxisSizingMode` / `counterAxisSizingMode` for auto-layout frames themselves).

- **FIXED** → the number is real — report it and use it in code as a fixed size
- **FILL** → say "stretches to fill its parent" — do not report the pixel number; in code this becomes a flexible/stretching layout, not a hardcoded frame size
- **HUG / AUTO** → say "sized to fit its content" — the number may be mentioned as the current content-driven result only, never as a fixed constraint

**A failed response looks like:**
- Reporting a pixel number as a fixed design value without first checking the sizing mode
- Hardcoding a FILL node's width or height in code instead of making it flexible
- Treating a HUG/AUTO dimension as a fixed constraint

---

**Design tokens stay in sync**
`tokens.css` and `DesignTokens.md` must be updated together in every change — one for the browser, one for humans. They are always identical in content.

**A failed response looks like:**
- Updating `tokens.css` without also updating `DesignTokens.md`
- Documenting a design token value without verifying it against Figma MCP first

---

**Post-build checklist: run this after building any screen from a connected Figma file, before calling it done — for brand-new screens exactly the same as for updates to existing ones**

1. Build/type-check the change (e.g. `pnpm build`) before considering it done.
2. Produce a component/token review table, whether the screen is brand new or an update: every component and token used, marked with a tick (✅) for anything matched to a real Iris design-system component/token and a cross (❌) for anything that couldn't be matched, with the stand-in used noted for each ❌. Present this to the user before moving on.
3. Start (or reuse) a local dev server, open localhost to the new/updated route in the browser tool, and screenshot-compare it against the Figma frame/node for a first self-check.
4. For newly created screens, explicitly show the generated localhost route to the user and ask if they are happy with what was created before moving to any follow-up implementation.
5. Ask the user: *"Want me to commit and push this?"* — proceed only on an explicit yes.
6. After pushing, tell the user where to look (dev URL/route, or that a deploy will follow) and ask them to manually eyeball it against the Figma design themselves before calling the task done.

**A failed response looks like:**
- Declaring a build "done" without running it through a dev server and comparing it to Figma
- Only producing the ✅/❌ component/token review table for screen updates and skipping it for brand-new screens
- Finishing a newly created screen without showing its localhost route to the user first
- Committing or pushing without an explicit yes from the user

# Git Rules

---

**Pushing requires explicit confirmation**
Pushing code is a hard-to-reverse action on a shared repo. Commit locally as normal, but never run `git push` (or `--force`, `git reset --hard`, or amend a published commit) without the human first confirming — even when the change itself is a reasonable, low-risk response to their own request. Reasonable idea does not equal permission to push.

**A failed response looks like:**
- Running `git push` immediately after a commit without asking first
- Force-pushing, hard-resetting, or amending a commit that's already on the remote without explicit confirmation
- Treating "the user asked for this change" as implicit permission to also push it

---

**Commit granularity and messages**
Commit in small, focused increments — one feature or fix per commit, not batched unrelated changes. Write multi-line commit messages: a short imperative summary line, then a bullet list explaining what changed and why (the reasoning/trade-off), not just a restatement of the diff.

**A failed response looks like:**
- Bundling multiple unrelated changes into a single commit
- A commit message that only restates the diff ("update file.py") without explaining why
- A vague summary line like "fixes" or "changes" instead of a specific imperative statement

---

**What never gets committed**
Build output (`dist/`, `build/`), local virtualenvs (`.venv/`), and real secrets never go in a commit. `.env` is gitignored; `.env.example` is a template with blank values only. Verify `.gitignore` covers these before the first commit in a new project.

**A failed response looks like:**
- Committing `dist/`, `build/`, or `.venv/` because `.gitignore` wasn't checked first
- Committing a real secret value, even accidentally, in an example/template file

---

**Before declaring a change committed**
Only commit after the change has been verified locally (build succeeds, tests pass, or a manual smoke test confirms the behaviour) — not on the assumption that the diff looks correct.

**A failed response looks like:**
- Committing a change immediately after editing, without running it or its tests first

# Motion Rules

---

**Purpose**
Motion communicates change in the interface. It must be fast, subtle, and functional. If motion does not help the user understand what changed, do not add it.

---

## Principles

- Functional: explain state transitions, do not decorate
- Fast: never slow user workflows
- Consistent: similar interactions should behave similarly
- Subtle: calm and professional, no distracting movement

---

## Token source of truth

Use Iris motion tokens only. Do not hardcode duration or easing values.

Design tokens:
- `--oi-motion-duration-snap`
- `--oi-motion-duration-short`
- `--oi-motion-duration-default`
- `--oi-motion-duration-long`
- `--oi-motion-duration-loop`
- `--oi-motion-ease-enter`
- `--oi-motion-ease-exit`
- `--oi-motion-ease-move`
- `--oi-motion-ease-none`

Primitive mappings currently in use:
- `--oi-motion-duration-0` = `0ms`
- `--oi-motion-duration-120` = `120ms`
- `--oi-motion-duration-200` = `200ms`
- `--oi-motion-duration-280` = `280ms`
- `--oi-motion-duration-1000` = `1000ms`

---

## Core usage

State changes:
- Use motion to clarify transitions (for example loading to success)
- Prefer fade or slight scale over abrupt swaps

Enter and exit:
- Prefer opacity plus small movement (about 8px translate)
- Keep transitions short and unobtrusive

Interaction feedback:
- Provide immediate click/tap feedback
- Default to `--oi-motion-duration-short`

---

## Accessibility and performance

- Respect `prefers-reduced-motion`
- Avoid large or disorienting movement
- Keep transitions cheap (opacity/transform preferred)

---

## Definition of done

Do not call motion complete unless all are true:
- Uses system motion tokens
- Pattern is consistent with existing UI behavior
- Performance impact validated
- Reduced-motion behavior implemented

Before shipping, check:
- Does this clarify what changed?
- Does it provide useful feedback?
- Does it feel instant?

---

## Current scope

This baseline does not yet define:
- Complex choreography
- Detailed component-by-component motion behavior

Detailed motion patterns are expected to be documented in Storybook and a dedicated Figma motion pattern page when available.

**A failed response looks like:**
- Hardcoding easing or duration values instead of Iris motion tokens
- Adding decorative motion that does not communicate state
- Ignoring reduced-motion behavior
- Using large movement where subtle movement would communicate the same change

# Testing Rules

---

**Real end-to-end verification before "done"**
A passing lint/type-check or a mocked unit test is not sufficient to call a feature done. Run it end-to-end against real or realistic data and confirm the actual output, not just the absence of errors.

**A failed response looks like:**
- Declaring a feature complete because "no errors found" without ever running it
- Relying solely on mocked tests for a feature that touches a real external system or real data

---

**Test components individually, then the full pipeline**
When a change spans multiple stages (e.g. generate → validate → composite), verify each stage in isolation first, then run the full pipeline together. This makes it obvious which stage a failure belongs to, instead of debugging a black-box end-to-end failure.

**A failed response looks like:**
- Only testing the full pipeline and guessing which stage caused a failure
- Skipping isolated component checks because the full run "looked fine"

---

**Automate structural validation**
Wherever a human would otherwise eyeball output for correctness (dimensions, counts, ordering, naming, duplicates, missing files), write an automated check instead. Manual visual inspection should be reserved for genuinely subjective judgement (does this look good?), not structural correctness (is this the right size/order/count?).

**A failed response looks like:**
- Leaving a mechanically-checkable property (file count, dimensions, ordering) to manual inspection
- Adding a validation step that only checks the happy path and never runs against a broken/edge case

---

**Surface failures loudly**
During development, failures (failed requests, failed assertions, unexpected values) should be logged clearly, not swallowed silently. A silent failure inside a loop or background task is far harder to diagnose than a loud one.

**A failed response looks like:**
- Catching an exception and continuing without logging it
- A test or validation step that fails closed (reports success) when it can't actually verify the condition

# Vercel Publish Rules

---

**Connecting a repo to Vercel**
Connect the GitHub repo to Vercel via the Vercel dashboard — Import Project → select the repo → Vercel auto-deploys on every push to `main`. This connection is set up once per repo; after that, deployments are automatic.

**A failed response looks like:**
- Suggesting a manual deploy command (`vercel deploy`, `vercel --prod`) when the GitHub connection handles deploys automatically
- Setting up the Vercel connection more than once for the same repo

---

**Deployments**
Every push to `main` triggers a production deployment automatically. Snapshot branches (`v1`, `v2`, etc.) each get their own Vercel preview URL — shareable without affecting the production site. These preview URLs are the primary way to share a specific version for review.

**A failed response looks like:**
- Suggesting a push to `main` as the way to "share a version for review" — create a snapshot branch (`vN`) instead so production is not affected
- Treating a snapshot branch as a working branch and pushing further changes to it

---

**Environment variables**
Secrets and environment variables are set in the Vercel dashboard under Project Settings → Environment Variables — never in the codebase. They can be scoped to Production, Preview, or Development environments separately.

**A failed response looks like:**
- Adding a secret or API key to any file in the repo instead of the Vercel dashboard
- Suggesting `.env` as the way to set variables for the deployed site — `.env` is for local development only; Vercel reads its own dashboard-configured variables at deploy time

---

**Deployment Protection must be off for shareable links to work**
Vercel's own **Vercel Authentication** / "Require Login" setting (Project Settings → Deployment Protection, `/~/settings/deployment-protection`) is on by default for some account/team types and blocks anyone without a Vercel login from viewing preview or snapshot URLs. This must be turned off right after first connecting the repo, otherwise Designers and stakeholders can't open the links they're sent. This is separate from the `vercel-password` skill's custom middleware gate, which is opt-in and only protects non-`main` branches.

**A failed response looks like:**
- Sharing a snapshot/preview URL without confirming Deployment Protection is off first
- Confusing Vercel's native Deployment Protection with the `vercel-password` middleware skill — they are unrelated settings

# Iris-React Migration Rules

These rules apply when migrating an existing React + Vite codebase to the Iris-UI design system. They apply in addition to the standard `project-type/iris-react` rules.

---

**Source of truth when onboarding an existing project**
When the project being migrated already has a live GitHub repo and/or Vercel deployment, those are the source of truth for current behaviour, content, and layout — not any Figma file. Only consult Figma (a Figma Make file or an original design file) to pull a specific component's exact spec (colours, spacing, typography, states) when the running code doesn't make that decision clear. Never treat a Figma file as more authoritative than the actual running code/deployment, and never let a stale original design file override what the live code/deployment already does. If `figma-stale = yes` is set in `.skill-answers` (the Designer flagged the Figma file as stale during setup), this rule always applies: base the migration audit on the codebase already present in this project, not on the Figma file.

**A failed response looks like:**
- Rebuilding a screen to match a Figma file instead of the existing running code/deployment
- Treating an out-of-date original design file as authoritative over the live GitHub/Vercel version
- Pulling whole-screen layout or content from Figma when the existing code already defines it

---

**Read before touching anything**
Before changing a single component, audit the existing codebase: catalogue every component, identify its Iris-UI equivalent (or note that none exists), and map out the token replacements for colours, spacing, and typography. Present this audit to the human for review before starting.

**A failed response looks like:**
- Starting to swap components before completing an audit
- Assuming a component has an Iris-UI equivalent without checking `src/iris-shell/src/components/` first
- Presenting the audit and starting migration in the same response without waiting for confirmation

---

**Migration order**
Always migrate in this sequence:
1. **Tokens first** — replace hardcoded colours, spacing, and typography values with Iris tokens
2. **Base components** — swap leaf-level elements (buttons, inputs, icons) to their Iris-UI equivalents
3. **Composed components** — replace higher-level patterns (cards, modals, navigation) last, once the base layer is stable

**A failed response looks like:**
- Replacing a composed component before its child base components have been migrated
- Mixing token replacement and component swaps in the same pass

---

**Bespoke components with no Iris-UI equivalent**
If a component has no direct Iris-UI equivalent, flag it explicitly and ask the human how to proceed — do not invent a substitute or silently skip it.

**A failed response looks like:**
- Replacing a bespoke component with the "closest" Iris component without flagging the mismatch
- Skipping a component and not mentioning it

---

**Style conflicts**
Iris tokens take precedence over existing CSS. When a conflict exists between an existing style and an Iris token value, remove the existing style — do not keep both. Flag any case where the existing style appears intentional or brand-specific before removing it.

**A failed response looks like:**
- Leaving both an old CSS value and an Iris token in place
- Silently removing a style that was clearly a deliberate design decision without flagging it

---

**One component at a time**
Migrate one component per response. Do not batch multiple component swaps into a single change unless the human explicitly asks for it.

**A failed response looks like:**
- Migrating several components in one go without being asked to
- Submitting a large diff that touches many files at once

---

**Verify before moving on**
After each component migration, confirm the result compiles and renders correctly before moving to the next component.

**A failed response looks like:**
- Moving to the next component without confirming the previous one builds

# Windows Workflow Rules

Use this skill when at least one downstream user is working on Windows.

---

## Goal

Keep setup and automation steps reliable in PowerShell and avoid shell-specific quoting or path bugs.

---

## 1. Match commands to the active shell

Always assume Windows users are likely running PowerShell (`pwsh` or Windows PowerShell), not bash.

- Detect the shell before writing command examples.
- Provide PowerShell-native command forms first for Windows users.
- Avoid bash-only syntax on Windows, including `&&` command chains, heredocs, and bash variable expansion patterns.

**A failed response looks like:**
- Giving Linux/macOS shell commands to a Windows user without a PowerShell equivalent
- Assuming Git Bash is available when the user did not say so

---

## 2. Use PowerShell-safe quoting and paths

Prefer patterns that are stable with spaces and special characters.

- Use single quotes for literal strings in PowerShell whenever possible.
- Use `Join-Path` and `-LiteralPath` for file system operations.
- Quote full paths that contain spaces.
- Avoid mixed quoting styles copied from bash examples.

**A failed response looks like:**
- Commands that break in paths like `C:\Users\A Name\...`
- Interpolating user input directly into unquoted path arguments

---

## 3. Prefer editor tools over fragile shell one-liners

For fetch/read/write/copy operations, prefer VS Code tools instead of long terminal one-liners.

- Use terminal commands only when they add clear value.
- Keep terminal commands short and shell-native.
- If a command must be cross-platform, provide separate snippets by shell.

**A failed response looks like:**
- A long multi-step bash one-liner copied into a Windows flow
- Complex quoting-heavy scripts when the same work can be done with editor tools

---

## 4. Retry policy for quoting failures

If an automation attempt fails due to PowerShell quoting/parsing, rerun with corrected PowerShell-native quoting and keep full step coverage.

Required coverage to preserve:
- Parallel fetch
- Rebuild
- Resource copy
- File creation

Use this user-facing status line when that happens:

"The first automation attempt hit a PowerShell quoting issue, so I am rerunning it with corrected quoting and the same step coverage (parallel fetch, rebuild, resource copy, and file creation)."

**A failed response looks like:**
- Skipping one of the required steps on rerun
- Silently changing workflow scope to avoid fixing quoting

---

## 5. Cross-platform communication rules

When giving instructions to mixed-platform teams:

- Label command blocks clearly as `PowerShell`, `zsh`, or `bash`.
- Do not present one shell's syntax as universal.
- Call out platform assumptions explicitly before execution.

**A failed response looks like:**
- Unlabeled command snippets in a Windows ticket
- Saying "run this" when the command is only valid in another shell