# BreadCrumbs

A lightweight, browser-based investigation mapping tool for cybersecurity analysts. Map artifacts, trace relationships, and build timelines as you investigate not after.

## What It Is

BreadCrumbs is a visual thinking tool for threat hunts, incident response, and CTF investigations. It lets you drop in nodes (hosts, IPs, users, files, domains, processes), connect them with timestamped directional relationships, and watch the investigation take shape as a force-directed graph. A timeline view auto-generates from your data so you can review event chronology without double-entry.

It is not a SIEM, a case management system, or a data ingestion platform. It is the digital equivalent of the whiteboard you'd use during an investigation to map out what you're seeing, except it persists, exports, and doesn't get erased by the next person who needs the room.

## Features

- **Interactive graph workspace** with force-directed auto-layout and manual override. Zoom, pan, drag, and reposition nodes to build your investigation map.
- **Typed nodes** — Host, User, IP Address, Domain, File, Process, Email Address, Registry Key, or Custom. Color-coded for quick visual identification.
- **Directional edges** with timestamps and relationship labels. Supports unidirectional, bidirectional, and non-directional connections.
- **Auto-generated timeline** derived from timestamped nodes and edges. Read-only chronological view for reviewing event sequence before writing your report.
- **Notable findings scratchpad** for observations that don't yet merit a node. Optionally visible on the timeline via toggle.
- **Persistent storage** via localStorage. Close the tab, come back, your data is there.
- **JSON import/export** for backing up investigations or moving them between machines.
- **Dark UI** designed for long sessions.
- **Zero dependencies at runtime** runs entirely in your browser. No accounts, no cloud, no telemetry.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)

### Installation

```bash
git clone https://github.com/oaboelrous/breadcrumbs.git
cd breadcrumbs
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Tech Stack

- React 18
- Vite 5
- No external graph libraries — custom SVG-based force-directed layout

## License

MIT

## Contributing

Issues and pull requests are welcome. If you use BreadCrumbs in your workflow and have ideas for improvement, open an issue.
