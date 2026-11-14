# Cost Control Monitoring Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Cost Control clickable from every Monitoring tab, including Heavy Equipment, with temporary lorem ipsum content while preserving permission control.

**Architecture:** Keep one shared Monitoring navigation. Add one permission-guarded Cost Control section to the shared rendered dashboard structure, and ensure HE uses the same section/navigation path. Existing `#ex-cost` remains the destination.

**Tech Stack:** Python generator, HTML templates, JavaScript shell loader, existing verification scripts.

**Spec:** `docs/superpowers/specs/2026-11-13-heavy-equipment-monitoring-unification-design.md`

## Global Constraints

- Keep `data-mmj-auth="costcontrol"` on menu and content.
- Keep destination `#ex-cost`.
- No new route.
- No source data changes.
- Preserve HE/WT monthly data loading and selector.
- No git push without explicit command.

## Review Focus

- Cost Control target exists in every active tab, including HE; test generated template counts.
- Unauthorized users do not see menu or content; run permission checks.
- Temporary content renders without changing dashboard data; run data equality checks.
- HE monthly selector still works after shared-shell changes; run browser/data checks.
- Navigation order remains Cost Control immediately before Heavy Equipment; inspect generated markup.

---

### Task 1: Add shared Cost Control content

**Files:**
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\exec_template.html`
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\build_gabungan_he.py`

**Interfaces:**
- Consumes: existing `#ex-cost` navigation and `data-mmj-auth` permission filtering.
- Produces: permission-guarded Cost Control section with temporary cards/table.

- [ ] **Step 1: Add temporary Cost Control markup**

Add cards for `Total Cost`, `Cost / Ton`, `Operational Cost`, plus a table containing clearly labeled lorem ipsum placeholder rows. Keep section wrapper and all content marked `data-mmj-auth="costcontrol" hidden`.

- [ ] **Step 2: Ensure shared templates receive the section**

Update generator so Cost Control content is present when HE or other Monitoring tabs are mounted, without duplicating the section in one rendered tab.

- [ ] **Step 3: Build and inspect generated markup**

Run `python build_gabungan_he.py`.
Expected: generated `index.html` contains one `#ex-cost` section per relevant template and Cost Control anchor before HE.

### Task 2: Unify HE with Monitoring navigation and loading

**Files:**
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\build_gabungan_he.py`
- Modify: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\shell_loader.js` only if required by the generated-template test

**Interfaces:**
- Consumes: existing `nav_item`, `cost_item`, `bar_html`, `srcData()`, and `mountBulan()`.
- Produces: HE tab using same Monitoring sidebar and content target behavior.

- [ ] **Step 1: Verify HE template path**

Inspect generated HE template and confirm shared navigation contains Cost Control before Heavy Equipment and that `#ex-cost` content exists.

- [ ] **Step 2: Remove only the HE-specific divergence**

Move any remaining HE-only navigation injection into the shared Monitoring generation path. Preserve HE data scripts and monthly controls.

- [ ] **Step 3: Rebuild and verify order**

Run the build and a small Python assertion that each active template has one Cost Control anchor, one `#ex-cost` section, and Cost Control precedes Heavy Equipment.

### Task 3: Run full verification

**Files:**
- Test: existing `check_login.py`, `check_data_browser.py`, `test_built_data.py`

- [ ] **Step 1: Run permission verification**

Run `python check_login.py`.
Expected: `OK` and permission menu checks pass.

- [ ] **Step 2: Run browser data verification**

Run `python check_data_browser.py`.
Expected: all tab decode checks pass.

- [ ] **Step 3: Run source/build data equality verification**

Run `python test_built_data.py`.
Expected: all source and generated data values remain identical.

- [ ] **Step 4: Browser-check HE and Cost Control**

Open generated dashboard, load `#tab=he`, confirm Cost Control is visible for authorized user, click it, confirm `#ex-cost` section renders, and confirm temporary lorem ipsum content appears.

- [ ] **Step 5: Inspect git status**

Confirm only intended source, generated dashboard, and design/plan files changed. Do not push.
