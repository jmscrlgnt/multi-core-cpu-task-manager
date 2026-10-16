# Multi-Core CPU Task Manager

A polished, browser-based **CPU scheduling simulator** for visualizing how processes are assigned and executed across multiple processor cores. Built as an OS101 project and upgraded into a portfolio-ready GitHub repository using only HTML, CSS, and vanilla JavaScript.

## Highlights

- Multi-core scheduling with **1–8 simulated CPU cores**
- **FCFS**, **SJF**, **Priority**, and **Round Robin** scheduling
- Editable process queue with arrival time, burst time, and priority
- Live CPU core state and ready-queue visualization
- Play, pause, step, scrub, and 1× / 2× / 4× playback controls
- Scrollable **Gantt execution timeline**
- Per-process waiting, turnaround, and response time metrics
- Performance summary including utilization, throughput, and total execution time
- Side-by-side **algorithm comparison** using the same workload
- JSON workload import/export
- CSV result export
- Auto-save through `localStorage`
- Dark/light themes
- Responsive layout and accessible keyboard controls
- Zero runtime dependencies and no build step
- Node-based scheduler tests plus a GitHub Actions test workflow

## Demo

Open `index.html` directly in a modern browser, or serve the repository locally:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

Run the scheduler unit tests with:

```bash
npm test
```

## Scheduling Models

| Algorithm | Behavior in this simulator |
| --- | --- |
| FCFS | Non-preemptive; dispatches ready processes in arrival/FIFO order |
| SJF | Non-preemptive; selects the available process with the shortest remaining burst |
| Priority | Non-preemptive; lower priority number is selected first |
| Round Robin | Preemptive; rotates processes after the configured time quantum |

All algorithms can run across multiple CPU cores. When several cores are free, the scheduler fills them from the current ready queue according to the selected policy.

## Metrics

For each process, the simulator calculates:

- **Turnaround time** = Finish time − Arrival time
- **Waiting time** = Turnaround time − Burst time
- **Response time** = First start time − Arrival time

The summary also calculates:

- CPU utilization
- Average waiting time
- Average turnaround time
- Average response time
- Throughput
- Total execution time

## Project Structure

```text
multi-core-cpu-task-manager/
├── index.html
├── styles.css
├── app.js
├── README.md
├── LICENSE
├── package.json
├── .gitignore
├── tests/
│   └── scheduler-engine.test.js
├── docs/
│   └── ARCHITECTURE.md
├── .github/workflows/
│   └── test.yml
└── assets/
```

## Keyboard Controls

After running a simulation:

- `Space` — Play / pause
- `←` — Step backward by 1 ms
- `→` — Step forward by 1 ms

## Portfolio Notes

This project demonstrates:

- Algorithmic thinking and scheduling simulation
- State-driven UI rendering
- Data validation and safe input handling
- Responsive frontend design
- File import/export in the browser
- Separation between scheduling logic and UI logic
- Clear project documentation suitable for GitHub review

## Limitations

This is an **educational discrete-time simulator**, not a replacement for a real operating-system scheduler. It intentionally abstracts context switching, I/O blocking, interrupts, CPU affinity, cache effects, and OS-specific scheduling policies.

## Suggested GitHub Screenshots

For a strong repository presentation, add these screenshots to `assets/` and embed them in this README:

1. Main process queue + scheduler configuration
2. Live core state during a running simulation
3. Gantt execution timeline
4. Process metrics + performance summary
5. Algorithm comparison table

## License

MIT — see [LICENSE](LICENSE).
