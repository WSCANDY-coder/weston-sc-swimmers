# Weston SC - Swimmers & Parents Hub (`weston-sc-swimmers`)

This repository is the public-facing, read-only web portal for Weston SC swimmers, parents, and coaches. It provides fast mobile access to personal best times, Swim England progression history, squad allocations, weekly training schedules, target open meets, and club notices.

---

## 🌟 Public Features Included

1. **Swimmer PBs & Progression (`#view-swimmers`)**:
   * Individual swimmer time history, WA points, dates, and venues.
   * Direct links to official **Swim England Progression Graphs** (`tstroke` & `tcourse`).
   * Somerset County Qualification Time (`🏆 County QT`) badges.
   * **Rolling 12-Month Form Filter**: View times from the past 12 months, 6 months, or 2026 season.

2. **Squad Movements & Schedules (`#view-movements`)**:
   * Current squad allocations (Club Link to Regional Performance).
   * Weekly pool training session times (`⏰ Tues/Thurs 7:40-9.00`).
   * Weekend extra session badges (`🗓️ Sat 7-8am`).

3. **Meet Calendar (`#view-calendar`)**:
   * Scheduled galas, target open meets, entry deadlines, and pool venues.

4. **Club Notices & Urgent News (`#view-overview`)**:
   * Top alert banner for high-priority news (gala entry closing dates).
   * Interactive Club Notices modal for detailed announcements.

---

## 🚀 Quick Setup & GitHub Pages Deployment Guide

### Step 1: Create the GitHub Repository
1. On GitHub, create a new public repository named **`weston-sc-swimmers`**.
2. Do not initialize with a README (this repository contains all necessary files).

### Step 2: Upload or Push the Code
Upload or push the following files to the `main` branch of `weston-sc-swimmers`:
* `index.html`
* `app.js`
* `data.js`
* `raw_data.js`
* `README.md`

### Step 3: Enable GitHub Pages
1. On GitHub, navigate to **Settings > Pages** in your `weston-sc-swimmers` repository.
2. Under **Build and deployment**:
   * **Source**: Select `Deploy from a branch`.
   * **Branch**: Select `main` / `root (/)`.
3. Click **Save**.
4. Your public portal will be live at:
   `https://<your-github-username>.github.io/weston-sc-swimmers/`

---

## 🔄 6-Week Post-Meet Update Workflow (One-Step Sync)

When a new open meet concludes:
1. Import the meet timing export into your master Google Sheet.
2. Export/update `data.js` and `raw_data.js`.
3. Copy the updated `data.js` and `raw_data.js` into both `weston-sc-dashboard` and `weston-sc-swimmers`.
4. Both sites update instantly upon browser refresh — no code re-editing required!
