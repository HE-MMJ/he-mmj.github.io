# Dashboard Theme Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make HE and all dashboard tabs share one theme state.

**Architecture:** Use `mmjTheme` as canonical localStorage key. HE reads and writes `mmjTheme`; legacy `heTheme` and `dashTheme3` remain read-only fallbacks. HE listens for `storage` changes so separate browser tabs update immediately.

**Tech Stack:** Vanilla JavaScript, Python build generator, Playwright/browser checks.

**Spec:** Approved theme synchronization design in conversation.

## Global Constraints

- Do not change dashboard color tokens.
- Do not push to Git without explicit user command.
- Preserve legacy theme keys as fallback only.
- Verify HE-to-other-tab and other-tab-to-HE synchronization.

## Review Focus

- Existing `mmjTheme=dark` must load HE dark.
- Existing only `heTheme=dark` must migrate/read as dark.
- Clicking HE must update `mmjTheme` and not only `heTheme`.
- Storage event must update HE label and `data-theme`.
- Light mode must remove `data-theme` and persist `light`.

---

### Task 1: Add theme synchronization regression test

**Files:**
- Create: `dashboard-mmj/tools/gabungan/test_theme_sync.py`

- [ ] Test generated HE theme source contains `mmjTheme`, fallback reads, click write, and storage listener.
- [ ] Run test before implementation; expect failure.

### Task 2: Implement shared HE theme state

**Files:**
- Modify: `dashboard-mmj/tools/gabungan/build_gabungan_he.py` around `HE_THEME_JS`.
- Generated: `assets/js/tab/he-theme.js` via build.

- [ ] Replace HE-only `heTheme` persistence with canonical `mmjTheme`.
- [ ] Keep `dashTheme3` and `heTheme` as fallback reads.
- [ ] Add `storage` listener for `mmjTheme`, `dashTheme3`, and `heTheme`.
- [ ] Keep button label and root `data-theme` synchronized.

### Task 3: Build and verify

**Files:**
- Generated build assets only.

- [ ] Run `python build_gabungan_he.py`.
- [ ] Run `test_theme_sync.py`, `test_built_data.py`, `check_data_browser.py`, and visual checks.
- [ ] Browser verify HE dark → other tab dark, other tab light → HE light, refresh persistence.
- [ ] Inspect `git diff` and status; no push.
