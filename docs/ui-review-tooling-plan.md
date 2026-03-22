# UI Review Tooling Plan

## Purpose
Define a practical workflow for reviewing UI changes in Flow-Do with local screenshots attached to pull requests.

This is especially useful for visual changes where code review alone is not enough.

---

## Goal
Enable a repeatable workflow where Thoobius can:
1. run the app locally
2. open the changed UI in a browser
3. capture screenshots
4. attach those screenshots to a pull request

---

## Why this matters
UI changes are easier to review when reviewers can see:
- what changed visually
- whether the change improved clarity
- whether the result matches intent
- whether anything looks broken or awkward

For Flow-Do specifically, this would be useful for:
- hierarchy/lineage visuals
- spacing and readability changes
- interaction affordances
- color treatment
- layout changes
- calendar-related UI work

---

## Current Gaps
At the moment, the local environment is missing some pieces needed for a full screenshot workflow.

### Known gaps
- no first-class browser automation tool is set up yet
- frontend build tooling is incomplete in the current checkout environment (`tsc` was not available during a build attempt)
- no screenshot capture convention exists yet
- no PR screenshot upload workflow exists yet

---

## Recommended Tooling Stack

### 1. Local app run capability
Need a reliable way to run:
- backend locally
- frontend locally

This includes:
- dependencies installed
- environment variables configured
- app accessible on local URLs

### 2. Browser automation
Preferred option:
- **Playwright**

Why Playwright:
- reliable browser automation
- can drive local apps
- can capture screenshots
- can be used for future smoke tests and regression tests

### 3. Screenshot artifact convention
Suggested path:
- `artifacts/screenshots/`

Example naming:
- `artifacts/screenshots/issue-4-parent-child-colors-dashboard.png`
- `artifacts/screenshots/issue-4-before.png`
- `artifacts/screenshots/issue-4-after.png`

### 4. PR attachment workflow
Possible approaches:
- upload screenshots manually to the PR comment/body
- or use GitHub CLI/API to add comment text with links to uploaded images if a suitable hosting flow exists

A simple first step may be:
- generate screenshots locally
- save them in a predictable folder
- attach them manually or via future automation

---

## Recommended Phased Approach

## Phase 1 — Get local frontend/backend running reliably
Before automation, make sure:
- frontend dependencies are installed
- backend dependencies are installed
- local dev startup is documented and repeatable
- app can be opened locally without friction

### Deliverable
A clean local runbook for Flow-Do development.

---

## Phase 2 — Add Playwright
Install and configure Playwright in the repo.

### Initial goals
- launch local frontend
- navigate to the main dashboard
- capture one baseline screenshot
- prove local browser automation works

### Deliverable
A minimal screenshot script or Playwright test that captures a baseline app view.

---

## Phase 3 — Add screenshot workflow for UI issues
For UI-related issues:
- run app locally
- open target screen/state
- capture screenshot(s)
- include screenshot references in PRs

### Deliverable
A lightweight repeatable review process for visual changes.

---

## Phase 4 — Optional future enhancements
Later improvements could include:
- before/after screenshot generation
- visual regression checks
- PR comment automation
- smoke-test navigation flows

---

## Suggested First Implementation Tasks
If we want to pursue this soon, the best initial tasks are:

1. verify frontend local dev environment and install missing tooling
2. document local run commands clearly
3. add Playwright to the repo
4. create a basic screenshot capture script
5. define screenshot artifact naming/location
6. test attaching screenshot artifacts to a PR workflow

---

## Practical Notes
For now, if browser automation is not yet available, a hybrid workflow can still work:
- Thoobius makes the code change
- app is run locally
- Josh reviews in browser or takes screenshots manually
- future tooling closes the loop later

But the long-term goal should be automated screenshot capture.

---

## Recommended Next Step
Before implementing screenshot automation, get the local frontend toolchain into a clean working state.

That will make everything else much easier.

---

Prepared for Flow-Do as a UI review and screenshot workflow plan.