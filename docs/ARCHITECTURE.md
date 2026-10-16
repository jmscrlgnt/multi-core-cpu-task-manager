# Architecture

## Overview

The project is intentionally dependency-free and split into three primary frontend layers:

- `index.html` — semantic application structure
- `styles.css` — responsive visual system and component styling
- `app.js` — scheduler engine, application state, rendering, persistence, and file export/import

## Scheduler Engine

`SchedulerEngine.run()` receives:

- process definitions
- scheduling algorithm
- CPU core count
- Round Robin quantum

The engine performs a discrete-time simulation. Each tick:

1. Newly arrived processes are added to the ready queue.
2. Free CPU cores request work from the selected scheduling policy.
3. Running processes execute for one simulated millisecond.
4. Completed processes are finalized.
5. Round Robin processes that exhaust the quantum are returned to the ready queue.

The engine returns execution segments and computed metrics. Rendering code does not make scheduling decisions.

## Application State

The `state` object stores:

- current workload
- selected algorithm
- latest simulation result
- playback time
- playback status and speed

UI components render from this state instead of duplicating scheduling data in the DOM.

## Persistence

The current workload, core count, algorithm, and quantum are stored in `localStorage`. Users can also export/import workloads as JSON.

## Data Flow

```text
Process inputs
    ↓
Validation
    ↓
SchedulerEngine.run()
    ↓
Simulation result
    ├── Live core state
    ├── Ready queue
    ├── Gantt timeline
    ├── Process metrics
    ├── Performance KPIs
    └── CSV export
```

## Design Decisions

- No framework or build tool is required so the project is easy to inspect and run.
- Scheduling logic is encapsulated in `SchedulerEngine` for clearer separation of concerns.
- Tables and timelines use bounded scroll containers to avoid destroying the page layout when workloads grow.
- Export/import features make the project feel like an actual tool rather than a static classroom demo.
