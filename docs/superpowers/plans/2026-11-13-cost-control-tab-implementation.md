# Cost Control Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Separate Cost Control from the HE dashboard and implement it as a standalone dashboard tab with its own data loader and UI, consistent with other dashboards (Haul, Batu, LT).

**Architecture:** 
1. Create dedicated `mmjT_cost` template in the shell.
2. Register `cost` in `shell_loader.js`.
3. Create `assets/js/tab/cost.js` for app logic.
4. Create/link `assets/data/cost.js` for cost data.
5. Update `build_gabungan_he.py` to support this module and remove the section from other dashboards.

**Tech Stack:** Python generator, HTML/CSS/JS.

**Spec:** (Design in progress, to be defined in next step)

## Global Constraints
- Use `#tab=cost`.
- Use `data-mmj-auth="costcontrol"`.
- Remove `#ex-cost` section from other templates.
- Maintain existing data/dashboard structure.

## Task Breakdown
1. **Task 1: Setup Infrastructure** - Update `shell_loader.js` and `build_gabungan_he.py` to register the new `cost` module.
2. **Task 2: Implement UI & Data** - Create template, data file, and JS app logic for Cost Control.
3. **Task 3: Cleanup** - Remove old `#ex-cost` sections from other dashboards.
4. **Task 4: Verification** - Validate with existing build and test scripts.
