# Availability KPI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace separate MA and PA KPI cards with one Availability card showing both metrics independently.

**Architecture:** Preserve current MA/PA calculations and thresholds. Add combined vendor and unit detail for the new card kind, then keep HE source, built tab, and generated bundle synchronized.

**Tech Stack:** Browser JavaScript, CSS, HTML, existing PowerShell HE bundle rebuild script.

**Spec:** `docs/superpowers/specs/2026-11-23-availability-kpi-design.md`

## Global Constraints

- MA threshold remains `<85%`; PA threshold remains `<80%`.
- Do not change formulas, filters, or other KPI cards.
- Do not commit or push.

## Review Focus

- MA/PA warning states stay independent at values below their respective thresholds; verify each side below, at, and above threshold.
- Empty or zero metric values render without invalid or misleading combined values.
- Vendor selection shows both metrics for matching units; verify MA and PA values and warning colors remain separate.
- Keyboard activation and dialog close behavior remain usable after changing card kind.
- Standalone HE and combined HE bundle render same KPI and drill-down.

---

### Task 1: Combined Availability KPI and vendor details

**Files:**
- Modify: `D:\Timesheet\Dashboard\js\app.js`
- Modify: `D:\Timesheet\Dashboard\css\style.css` only if existing card styles cannot fit two labeled values
- Test: Existing dashboard UI; use browser smoke checks (no dedicated test harness identified)

**Interfaces:**
- Consumes: Existing `avgMA`, `avgPA`, `openVendorPanel(kind)`, `vendorBreakdown(kind)`, and `vendorUnits(kind, vendor)`.
- Produces: One `data-card="availability"` card with MA and PA values; vendor and unit detail with distinct MA/PA columns.

- [ ] **Step 1: Verify existing UI baseline**

Open HE dashboard. Record current card count and confirm clicking MA and PA separately opens correct vendor details.

- [ ] **Step 2: Replace two cards with one Availability card**

Keep `avgMA` and `avgPA` calculations. Render labeled MA and PA values independently. Set warning styling independently at MA `<85%` and PA `<80%`; do not reuse one warning state for both.

- [ ] **Step 3: Add combined availability vendor/unit detail**

Use existing vendor aggregation and range-filtered rows. Present MA and PA separately per vendor and unit, with independent threshold styling. Preserve dialog keyboard and close behavior.

- [ ] **Step 4: Verify standalone HE UI**

Check one Availability card, unchanged remaining KPI cards, both metric labels and values, independent below/at/above threshold states, zero/empty values, click-to-dialog, vendor selection, and keyboard activation.

Expected: no regression in data filters or other KPI values; MA and PA remain distinct throughout.

### Task 2: Synchronize built and combined HE outputs

**Files:**
- Modify: `D:\Timesheet\Dashboard\assets\js\tab\he.js`
- Modify: `D:\Timesheet\Dashboard\assets\css\he.css` only if Task 1 changes source styles
- Modify/rebuild: `D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan\he_index.html` and related generated bundle outputs, as required by the existing rebuild script

**Interfaces:**
- Consumes: Combined KPI and vendor detail behavior from Task 1.
- Produces: Built standalone and combined HE pages matching source behavior.

- [ ] **Step 1: Synchronize built HE tab**

Apply the same KPI, vendor detail, unit detail, and styling changes to built files, following existing source/build conventions.

- [ ] **Step 2: Rebuild combined HE bundle**

Run `C:\Users\Rizualdi Fadli\Documents\WB SBL Report\rebuild_gabungan_he.ps1` only if its documented behavior and current working tree confirm it is the correct generator for these changed inputs.

- [ ] **Step 3: Verify source/build parity**

Open standalone and combined HE pages. Repeat KPI and drill-down checks from Task 1 and confirm equivalent presentation and thresholds.
