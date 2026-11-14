# Cost Control Index Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Cost Control as a shared `index.html` section using `#ex-cost`, not as a separate tab.

**Architecture:** Keep Cost Control markup in the shared Executive/Monitoring template and inject the same section into HE's generated shell. The shared sidebar keeps one permission-guarded `#ex-cost` anchor; remove all `cost` tab registration and `mmjT_cost` generation.

**Tech Stack:** Python generator, HTML templates, JavaScript loader, existing checks.

**Spec:** `docs/superpowers/specs/2026-11-13-cost-control-index-section-design.md`

## Global Constraints

- Use `href="#ex-cost"`.
- Do not use `#tab=cost`.
- Do not generate `mmjT_cost`.
- Preserve `data-mmj-auth="costcontrol"`.
- No source data changes.
- No git push without explicit command.

## Review Focus

- HE includes shared Cost Control section.
- No stale `cost` route or `mmjT_cost` remains.
- Permission hides menu/content for unauthorized users.
- Clicking menu targets `#ex-cost` in active combined dashboard.
- Existing data checks stay unchanged.

---

### Task 1: Restore shared section and menu

**Files:**
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\exec_template.html`
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\build_gabungan_he.py`

**Interfaces:**
- Consumes: existing shared `exec_template.html` and HE template builder.
- Produces: one permission-guarded `#ex-cost` section in shared dashboard templates.

- [ ] **Step 1: Assert current wrong structure fails**

Run Python assertion requiring `href="#ex-cost"`, no `mmjT_cost`, and `id="ex-cost"` in generated output. Expected: FAIL because current build uses `#tab=cost` and `mmjT_cost`.

- [ ] **Step 2: Restore Cost Control markup**

Add the guarded section and temporary cards/table to the shared template. Use `data-mmj-auth="costcontrol" hidden` on section content.

- [ ] **Step 3: Inject section into HE shell**

Ensure HE generated markup includes the same `#ex-cost` section before shell close, without creating a new template.

- [ ] **Step 4: Rebuild and verify structure**

Run `python build_gabungan_he.py` and assert `#ex-cost` exists, `mmjT_cost` does not, and `#tab=cost` does not.

### Task 2: Remove separate cost tab routing

**Files:**
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\build_gabungan_he.py`
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\shell_loader.js`
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\check_login.py`

**Interfaces:**
- Consumes: shared `#ex-cost` section.
- Produces: loader with only existing dashboard tabs and permission-guarded section links.

- [ ] **Step 1: Remove cost from loader keys and hash validation**

Delete `cost` from `KEYS`, tab selection, hash regex, and fallback validation. Keep `he` behavior intact.

- [ ] **Step 2: Change menu link**

Set Cost Control anchor to `href="#ex-cost"` without `data-mmjtab="cost"`.

- [ ] **Step 3: Remove `mmjT_cost` generation**

Delete standalone Cost template generation and exclude it from template replacement block.

- [ ] **Step 4: Update login check**

Check for `data-mmj-auth="costcontrol"` and `ex-cost` again.

### Task 3: Full verification

**Files:** existing verification scripts.

- [ ] **Step 1:** Run `python check_login.py`; expected PASS.
- [ ] **Step 2:** Run `python check_data_browser.py`; expected all PASS.
- [ ] **Step 3:** Run `python test_built_data.py`; expected all SAMA.
- [ ] **Step 4:** Browser-check `#tab=he`, click Cost Control, confirm section and lorem ipsum render.
- [ ] **Step 5:** Inspect git status; do not push.
