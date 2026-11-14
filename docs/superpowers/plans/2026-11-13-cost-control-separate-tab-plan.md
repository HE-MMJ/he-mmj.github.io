# Cost Control Separate Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create Cost Control as separate dashboard tab `#tab=cost` with shared sidebar, auth, theme, and temporary lorem ipsum content.

**Architecture:** Add `mmjT_cost` template to generated dashboard and register `cost` in `shell_loader.js`. Replace section links with tab links, preserve `data-mmj-auth="costcontrol"`, and remove old `#ex-cost` sections from Executive and HE.

**Tech Stack:** Python generator, HTML templates, JavaScript shell loader, existing verification scripts.

**Spec:** `docs/superpowers/specs/2026-11-13-cost-control-separate-tab-design.md`

## Global Constraints

- Menu destination must be `#tab=cost`.
- Permission must remain `data-mmj-auth="costcontrol"`.
- No standalone HTML file.
- No source data changes.
- Preserve HE/WT monthly loading and selector.
- No git push without explicit command.

## Review Focus

- Cost tab loads through shared shell and does not show inside Executive or HE.
- Unauthorized users do not see Cost Control menu or content.
- Existing tab navigation and hash fallback still work.
- HE monthly data and selector remain unchanged.
- Generated data remains identical to source.

---

### Task 1: Add Cost Control tab template

**Files:**
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\build_gabungan_he.py`

**Interfaces:**
- Consumes: existing shared shell generation and `bar_html` navigation.
- Produces: generated `<template id="mmjT_cost">` with guarded temporary content.

- [ ] **Step 1: Add failing generated-output assertion**

Run a Python assertion against current `index.html` requiring `mmjT_cost`, `#tab=cost`, and lorem ipsum. Expected: FAIL because template does not exist.

- [ ] **Step 2: Implement cost template generation**

Create a Cost Control template using shared sidebar/navigation shell. Add guarded cards for Total Cost, Cost / Ton, Operational Cost, and a temporary table.

- [ ] **Step 3: Rebuild and verify assertion passes**

Run `python build_gabungan_he.py` and the assertion. Expected: PASS.

### Task 2: Register cost tab and update navigation

**Files:**
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\build_gabungan_he.py`
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\shell_loader.js` only if generator patch cannot cover registration

**Interfaces:**
- Consumes: `mmjT_cost` template.
- Produces: loader map, hash validation, fallback, and menu binding for `cost`.

- [ ] **Step 1: Add failing loader/navigation assertion**

Assert generated output contains `cost: asFrag(document.getElementById("mmjT_cost"))`, hash regex support for `cost`, and `href="#tab=cost"`. Expected: FAIL.

- [ ] **Step 2: Register cost in loader and navigation**

Update generator patches or shell loader so `cost` is a valid tab, menu link uses `data-mmjtab="cost"`, and auth filtering remains active.

- [ ] **Step 3: Verify no old section links remain**

Assert generated output has no `href="#ex-cost"` and no `id="ex-cost"`.

### Task 3: Full verification

**Files:**
- Test: existing `check_login.py`, `check_data_browser.py`, `test_built_data.py`

- [ ] **Step 1: Run login and permission checks**

Run `python check_login.py`. Expected: PASS.

- [ ] **Step 2: Run browser data checks**

Run `python check_data_browser.py`. Expected: all tab decode checks PASS.

- [ ] **Step 3: Run source/build equality check**

Run `python test_built_data.py`. Expected: all data values SAMA.

- [ ] **Step 4: Browser-check Cost Control**

Open `#tab=cost`, confirm shared sidebar, Cost Control content, lorem ipsum, and no duplicate old section.

- [ ] **Step 5: Inspect git status**

Confirm only intended files changed. Do not push.
