# 📊 csvlens-pro

[![CI](https://github.com/YOUR_USERNAME/csvlens-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/csvlens-pro/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![GitHub Achievements](https://img.shields.io/badge/GitHub-Achievements-blueviolet.svg)](https://github.com/YOUR_USERNAME)

> A browser-based CSV explorer and visualizer with sorting, filtering, charting, and export capabilities.

## ✨ Features

- 🔍 Instant search and column filtering
- 📈 Auto-generate charts from numeric columns
- 🗂️ Sort by any column (asc/desc)
- 💾 Export filtered views back to CSV
- 📐 Column statistics (min, max, avg, unique count)
- 🌐 Zero-dependency browser UI served locally

## 🚀 Quick Start

```bash
npm install
npm start -- data.csv
```

Open `http://localhost:3000` in your browser.

## 📖 Usage

```bash
# Explore a CSV file
node src/csvlens.js explore data.csv

# Print column stats
node src/csvlens.js stats data.csv

# Filter and export
node src/csvlens.js filter data.csv --col "Status" --val "Active" --out filtered.csv

# Serve browser UI
node src/csvlens.js serve data.csv --port 3000
```

## 🏆 Achievement Scripts

```bash
bash scripts/setup.sh            # Install & configure
bash scripts/unlock-all.sh       # Interactive achievement menu
bash scripts/quickdraw.sh        # ⚡ Quickdraw badge
bash scripts/yolo.sh             # 🤠 YOLO badge
bash scripts/publicist.sh        # 📢 Publicist badge
bash scripts/pull-shark.sh 2     # 🦈 Pull Shark Bronze
bash scripts/pull-shark.sh 16    # 🦈 Pull Shark Silver
bash scripts/pair-extraordinaire.sh "Name" "email@example.com"
```

## 📋 Requirements

- Node.js 20+
- GitHub CLI (`gh`)
