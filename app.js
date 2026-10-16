"use strict";

const COLORS = ["#F6B65B", "#61DDC8", "#A497FF", "#FF7068", "#77D99B", "#F58CC8", "#6CA8FF", "#F3D66E", "#65D1F2", "#D48BF0"];
const STORAGE_KEY = "multicore-cpu-task-manager-workload-v2";
const THEME_KEY = "multicore-cpu-task-manager-theme";
const MAX_TIME = 100000;

const state = {
  processes: [],
  algorithm: "FCFS",
  simulation: null,
  currentTime: 0,
  playing: false,
  timer: null,
  speed: 2,
};

const els = {};

class SchedulerEngine {
  static run(inputProcesses, algorithm, numCores, quantum = 2) {
    if (!Array.isArray(inputProcesses) || inputProcesses.length === 0) {
      throw new Error("Add at least one process before running the simulator.");
    }

    const processes = inputProcesses.map((p, index) => ({
      id: String(p.id || `P${index + 1}`).trim(),
      name: String(p.name || `Process ${index + 1}`).trim(),
      arrival: Number(p.arrival),
      burst: Number(p.burst),
      priority: Number(p.priority),
      remaining: Number(p.burst),
      start: null,
      finish: null,
      quantumUsed: 0,
      done: false,
      originalIndex: index,
    }));

    const cores = new Array(numCores).fill(null);
    const coreOpenStart = new Array(numCores).fill(null);
    const readyQueue = [];
    const arrived = new Set();
    const segments = [];
    let completed = 0;
    let time = 0;
    let busyTicks = 0;

    const addArrivals = () => {
      processes.forEach((process, index) => {
        if (!arrived.has(index) && process.arrival <= time) {
          arrived.add(index);
          readyQueue.push(index);
        }
      });
    };

    const pickReadyPosition = () => {
      if (readyQueue.length === 0) return -1;
      if (algorithm === "SJF") {
        return readyQueue.reduce((bestPos, currentIndex, position) => {
          const best = processes[readyQueue[bestPos]];
          const current = processes[currentIndex];
          if (current.remaining < best.remaining) return position;
          if (current.remaining === best.remaining && current.arrival < best.arrival) return position;
          if (current.remaining === best.remaining && current.arrival === best.arrival && current.originalIndex < best.originalIndex) return position;
          return bestPos;
        }, 0);
      }
      if (algorithm === "PRIORITY") {
        return readyQueue.reduce((bestPos, currentIndex, position) => {
          const best = processes[readyQueue[bestPos]];
          const current = processes[currentIndex];
          if (current.priority < best.priority) return position;
          if (current.priority === best.priority && current.arrival < best.arrival) return position;
          if (current.priority === best.priority && current.arrival === best.arrival && current.originalIndex < best.originalIndex) return position;
          return bestPos;
        }, 0);
      }
      return 0;
    };

    while (completed < processes.length && time < MAX_TIME) {
      addArrivals();

      for (let core = 0; core < numCores; core += 1) {
        if (cores[core] !== null || readyQueue.length === 0) continue;
        const pickPos = pickReadyPosition();
        const processIndex = readyQueue.splice(pickPos, 1)[0];
        const process = processes[processIndex];
        cores[core] = processIndex;
        coreOpenStart[core] = time;
        process.quantumUsed = 0;
        if (process.start === null) process.start = time;
      }

      const anyRunning = cores.some((entry) => entry !== null);
      if (!anyRunning && readyQueue.length === 0 && completed < processes.length) {
        const futureArrivals = processes.filter((p, i) => !arrived.has(i)).map((p) => p.arrival);
        if (futureArrivals.length === 0) break;
        time = Math.min(...futureArrivals);
        continue;
      }

      for (let core = 0; core < numCores; core += 1) {
        if (cores[core] === null) continue;
        busyTicks += 1;
        const process = processes[cores[core]];
        process.remaining -= 1;
        if (algorithm === "RR") process.quantumUsed += 1;
      }

      time += 1;

      for (let core = 0; core < numCores; core += 1) {
        if (cores[core] === null) continue;
        const processIndex = cores[core];
        const process = processes[processIndex];

        if (process.remaining <= 0) {
          process.finish = time;
          process.done = true;
          completed += 1;
          segments.push({ pid: process.id, core, start: coreOpenStart[core], end: time });
          cores[core] = null;
          coreOpenStart[core] = null;
        } else if (algorithm === "RR" && process.quantumUsed >= quantum) {
          segments.push({ pid: process.id, core, start: coreOpenStart[core], end: time });
          cores[core] = null;
          coreOpenStart[core] = null;
          readyQueue.push(processIndex);
        }
      }
    }

    if (time >= MAX_TIME) throw new Error("Simulation exceeded the safety time limit. Check process values.");

    const results = processes.map((p) => ({
      id: p.id,
      name: p.name,
      arrival: p.arrival,
      burst: p.burst,
      priority: p.priority,
      start: p.start,
      finish: p.finish,
      waiting: p.finish - p.arrival - p.burst,
      turnaround: p.finish - p.arrival,
      response: p.start - p.arrival,
    }));

    const totalTime = time;
    const busyCells = segments.reduce((sum, segment) => sum + (segment.end - segment.start), 0);
    const metrics = this.summarize(results, totalTime, numCores, busyCells);

    return { algorithm, numCores, quantum, totalTime, segments, results, busyTicks, metrics };
  }

  static summarize(results, totalTime, numCores, busyCells) {
    const count = results.length;
    const safeTime = Math.max(totalTime, 1);
    return {
      avgWaiting: results.reduce((sum, item) => sum + item.waiting, 0) / count,
      avgTurnaround: results.reduce((sum, item) => sum + item.turnaround, 0) / count,
      avgResponse: results.reduce((sum, item) => sum + item.response, 0) / count,
      utilization: (busyCells / (numCores * safeTime)) * 100,
      throughput: count / safeTime,
      totalTime,
    };
  }
}

function cacheElements() {
  [
    "procBody", "algorithmGroup", "numCores", "quantum", "quantumField", "runBtn", "coreRack", "readyQueue",
    "runningCount", "readyCount", "doneCount", "playBtn", "stepBackBtn", "stepForwardBtn", "scrub", "scrubCurrent",
    "scrubTotal", "speedSeg", "ganttWrap", "processLegend", "metricsBody", "kpiGrid", "comparisonContent", "compareBtn",
    "exportCsvBtn", "randomBtn", "resetDefaultsBtn", "addProcessBtn", "clearProcessesBtn", "exportConfigBtn", "importBtn",
    "importFile", "themeBtn", "clockTime", "overviewAlgorithm", "overviewCores", "overviewProcesses", "overviewStatus",
    "simulationBadge", "configSummary", "toastRegion"
  ].forEach((id) => { els[id] = document.getElementById(id); });
}

function defaultProcesses() {
  return [
    { id: "P1", name: "Browser", arrival: 0, burst: 8, priority: 2 },
    { id: "P2", name: "Music Player", arrival: 1, burst: 4, priority: 1 },
    { id: "P3", name: "Compiler", arrival: 2, burst: 6, priority: 3 },
    { id: "P4", name: "File Manager", arrival: 3, burst: 2, priority: 1 },
  ];
}

function initialize() {
  cacheElements();
  loadTheme();
  loadSavedWorkload();
  bindEvents();
  renderProcessTable();
  updateConfigUi();
  updateOverview();
}

function bindEvents() {
  els.addProcessBtn.addEventListener("click", addProcess);
  els.resetDefaultsBtn.addEventListener("click", () => setProcesses(defaultProcesses(), "Sample workload restored."));
  els.clearProcessesBtn.addEventListener("click", () => setProcesses([], "Process queue cleared."));
  els.randomBtn.addEventListener("click", randomizeProcesses);
  els.runBtn.addEventListener("click", runSimulation);
  els.compareBtn.addEventListener("click", compareAlgorithms);
  els.exportCsvBtn.addEventListener("click", exportResultsCsv);
  els.exportConfigBtn.addEventListener("click", exportWorkload);
  els.importBtn.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importWorkload);
  els.themeBtn.addEventListener("click", toggleTheme);

  els.algorithmGroup.addEventListener("change", (event) => {
    if (!event.target.matches('input[name="algorithm"]')) return;
    state.algorithm = event.target.value;
    document.querySelectorAll(".algorithm-option").forEach((label) => label.classList.toggle("selected", label.contains(event.target)));
    invalidateSimulation();
    updateConfigUi();
    saveWorkload();
  });

  els.numCores.addEventListener("input", () => {
    els.numCores.value = clampInt(els.numCores.value, 1, 8, 4);
    invalidateSimulation();
    updateConfigUi();
    saveWorkload();
  });

  els.quantum.addEventListener("input", () => {
    els.quantum.value = clampInt(els.quantum.value, 1, 20, 2);
    invalidateSimulation();
    updateConfigUi();
    saveWorkload();
  });

  els.playBtn.addEventListener("click", togglePlay);
  els.stepBackBtn.addEventListener("click", () => stepTime(-1));
  els.stepForwardBtn.addEventListener("click", () => stepTime(1));
  els.scrub.addEventListener("input", (event) => setSimulationTime(Number(event.target.value)));

  els.speedSeg.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-speed]");
    if (!button) return;
    state.speed = Number(button.dataset.speed);
    els.speedSeg.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
    if (state.playing) startTimer();
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea")) return;
    if (event.code === "Space" && state.simulation) {
      event.preventDefault();
      togglePlay();
    }
    if (event.key === "ArrowLeft" && state.simulation) stepTime(-1);
    if (event.key === "ArrowRight" && state.simulation) stepTime(1);
  });
}

function setProcesses(processes, toastMessage = "") {
  stopPlayback();
  state.processes = processes.map((p, index) => normalizeProcess(p, index));
  state.simulation = null;
  state.currentTime = 0;
  renderProcessTable();
  resetSimulationViews();
  updateOverview();
  updateConfigUi();
  saveWorkload();
  if (toastMessage) toast(toastMessage, "success");
}

function normalizeProcess(p, index) {
  return {
    id: String(p.id || `P${index + 1}`).trim(),
    name: String(p.name || `Process ${index + 1}`).trim(),
    arrival: clampInt(p.arrival, 0, 99999, 0),
    burst: clampInt(p.burst, 1, 99999, 1),
    priority: clampInt(p.priority, 1, 9999, 1),
  };
}

function addProcess() {
  const next = nextPidNumber();
  state.processes.push({ id: `P${next}`, name: `Process ${next}`, arrival: 0, burst: 4, priority: 2 });
  invalidateSimulation();
  renderProcessTable();
  updateOverview();
  updateConfigUi();
  saveWorkload();
}

function removeProcess(index) {
  state.processes.splice(index, 1);
  invalidateSimulation();
  renderProcessTable();
  updateOverview();
  updateConfigUi();
  saveWorkload();
}

function nextPidNumber() {
  const numbers = state.processes.map((p) => Number(String(p.id).replace(/\D/g, ""))).filter(Number.isFinite);
  return Math.max(0, ...numbers) + 1;
}

function randomizeProcesses() {
  const count = Math.floor(Math.random() * 4) + 5;
  const names = ["Renderer", "Database", "Backup", "Indexer", "Browser", "Compiler", "Media", "Sync", "Terminal", "Analytics"];
  const shuffled = [...names].sort(() => Math.random() - 0.5);
  const random = Array.from({ length: count }, (_, index) => ({
    id: `P${index + 1}`,
    name: shuffled[index % shuffled.length],
    arrival: Math.floor(Math.random() * 7),
    burst: Math.floor(Math.random() * 9) + 2,
    priority: Math.floor(Math.random() * 5) + 1,
  }));
  setProcesses(random, "Random workload generated.");
}

function renderProcessTable() {
  els.procBody.innerHTML = "";
  if (state.processes.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="7"><div class="empty-table">No processes. Add one to build a workload.</div></td>';
    els.procBody.appendChild(row);
    return;
  }

  state.processes.forEach((process, index) => {
    const row = document.createElement("tr");
    const color = colorForIndex(index);
    row.innerHTML = `
      <td><span class="swatch" style="background:${color}"></span></td>
      <td><input aria-label="Process ${index + 1} ID" data-field="id" data-index="${index}" value="${escapeAttr(process.id)}"></td>
      <td><input aria-label="Process ${index + 1} name" data-field="name" data-index="${index}" value="${escapeAttr(process.name)}"></td>
      <td><input aria-label="Process ${index + 1} arrival time" data-field="arrival" data-index="${index}" type="number" min="0" value="${process.arrival}"></td>
      <td><input aria-label="Process ${index + 1} burst time" data-field="burst" data-index="${index}" type="number" min="1" value="${process.burst}"></td>
      <td><input aria-label="Process ${index + 1} priority" data-field="priority" data-index="${index}" type="number" min="1" value="${process.priority}"></td>
      <td><button class="remove-row" type="button" data-remove="${index}" aria-label="Remove ${escapeAttr(process.id)}">×</button></td>
    `;
    els.procBody.appendChild(row);
  });

  els.procBody.querySelectorAll("input[data-field]").forEach((input) => {
    input.addEventListener("change", handleProcessEdit);
  });
  els.procBody.querySelectorAll("button[data-remove]").forEach((button) => {
    button.addEventListener("click", () => removeProcess(Number(button.dataset.remove)));
  });
}

function handleProcessEdit(event) {
  const input = event.target;
  const index = Number(input.dataset.index);
  const field = input.dataset.field;
  if (!state.processes[index]) return;

  if (["arrival", "burst", "priority"].includes(field)) {
    const min = field === "arrival" ? 0 : 1;
    const value = clampInt(input.value, min, 99999, min);
    input.value = value;
    state.processes[index][field] = value;
  } else {
    state.processes[index][field] = input.value.trim() || (field === "id" ? `P${index + 1}` : `Process ${index + 1}`);
    input.value = state.processes[index][field];
  }
  invalidateSimulation();
  updateOverview();
  updateConfigUi();
  saveWorkload();
}

function validateProcesses() {
  if (state.processes.length === 0) return "Add at least one process.";
  const ids = state.processes.map((p) => p.id.toLowerCase());
  if (new Set(ids).size !== ids.length) return "Each PID must be unique.";
  for (const process of state.processes) {
    if (!process.id.trim()) return "Every process needs a PID.";
    if (!process.name.trim()) return `Process ${process.id} needs a name.`;
    if (!Number.isFinite(process.arrival) || process.arrival < 0) return `${process.id}: arrival must be 0 or greater.`;
    if (!Number.isFinite(process.burst) || process.burst < 1) return `${process.id}: burst must be at least 1.`;
    if (!Number.isFinite(process.priority) || process.priority < 1) return `${process.id}: priority must be at least 1.`;
  }
  return null;
}


function invalidateSimulation() {
  if (!state.simulation) return;
  state.simulation = null;
  state.currentTime = 0;
  resetSimulationViews();
}

function runSimulation() {
  const issue = validateProcesses();
  if (issue) return toast(issue, "error");

  stopPlayback();
  try {
    const cores = clampInt(els.numCores.value, 1, 8, 4);
    const quantum = clampInt(els.quantum.value, 1, 20, 2);
    state.simulation = SchedulerEngine.run(state.processes, state.algorithm, cores, quantum);
    state.currentTime = 0;
    els.scrub.max = state.simulation.totalTime;
    els.scrub.value = 0;
    els.scrubTotal.textContent = `${state.simulation.totalTime} ms`;
    buildCoreRack();
    renderLegend();
    renderGantt();
    renderKPIs();
    setSimulationTime(0);
    els.exportCsvBtn.disabled = false;
    els.simulationBadge.textContent = `${algorithmLabel(state.algorithm)} · ${cores} core${cores === 1 ? "" : "s"}`;
    setOverviewStatus("running", "Running");
    toast("Simulation generated successfully.", "success");
    startPlayback();
  } catch (error) {
    toast(error.message || "Unable to run the simulation.", "error");
  }
}

function buildCoreRack() {
  els.coreRack.innerHTML = "";
  for (let core = 0; core < state.simulation.numCores; core += 1) {
    const card = document.createElement("div");
    card.className = "core idle";
    card.id = `core-${core}`;
    card.innerHTML = `
      <div class="core-label"><span>Core ${core + 1}</span><span id="core-${core}-pct">0%</span></div>
      <div class="core-pid" id="core-${core}-pid">idle</div>
      <div class="core-name" id="core-${core}-name">Waiting for work</div>
      <div class="progress-track"><div class="progress-fill" id="core-${core}-bar"></div></div>
    `;
    els.coreRack.appendChild(card);
  }
}

function stateAt(result, time) {
  if (time < result.arrival) return { state: "New", core: null };
  if (result.finish !== null && time >= result.finish) return { state: "Terminated", core: null };
  const segment = state.simulation.segments.find((item) => item.pid === result.id && time >= item.start && time < item.end);
  if (segment) return { state: "Running", core: segment.core };
  return { state: "Ready", core: null };
}

function setSimulationTime(value) {
  if (!state.simulation) return;
  state.currentTime = Math.max(0, Math.min(state.simulation.totalTime, Math.round(Number(value) || 0)));
  els.scrub.value = state.currentTime;
  els.clockTime.textContent = state.currentTime;
  els.scrubCurrent.textContent = `${state.currentTime} ms`;

  renderLiveState();
  renderProcessMetrics();
  movePlayheads();

  if (state.currentTime >= state.simulation.totalTime) {
    stopPlayback();
    setOverviewStatus("done", "Complete");
  } else if (state.playing) {
    setOverviewStatus("running", "Running");
  } else {
    setOverviewStatus("idle", "Paused");
  }
}

function renderLiveState() {
  const sim = state.simulation;
  const snapshot = sim.results.map((result) => ({ result, ...stateAt(result, state.currentTime) }));

  for (let core = 0; core < sim.numCores; core += 1) {
    const running = snapshot.find((item) => item.state === "Running" && item.core === core);
    const card = document.getElementById(`core-${core}`);
    const pid = document.getElementById(`core-${core}-pid`);
    const name = document.getElementById(`core-${core}-name`);
    const pct = document.getElementById(`core-${core}-pct`);
    const bar = document.getElementById(`core-${core}-bar`);

    if (!running) {
      card.classList.remove("busy");
      card.classList.add("idle");
      card.style.removeProperty("--core-color");
      pid.textContent = "idle";
      pid.style.color = "var(--muted)";
      name.textContent = "Waiting for work";
      pct.textContent = "0%";
      bar.style.width = "0%";
      continue;
    }

    const segment = sim.segments.find((item) => item.pid === running.result.id && item.core === core && state.currentTime >= item.start && state.currentTime < item.end);
    const color = colorForPid(running.result.id);
    const progress = segment ? Math.round(((state.currentTime - segment.start) / Math.max(segment.end - segment.start, 1)) * 100) : 0;
    card.classList.add("busy");
    card.classList.remove("idle");
    card.style.setProperty("--core-color", color);
    pid.textContent = running.result.id;
    pid.style.color = color;
    name.textContent = running.result.name;
    pct.textContent = `${progress}%`;
    bar.style.width = `${progress}%`;
    bar.style.background = color;
  }

  const ready = snapshot.filter((item) => item.state === "Ready");
  const runningCount = snapshot.filter((item) => item.state === "Running").length;
  const doneCount = snapshot.filter((item) => item.state === "Terminated").length;
  els.readyQueue.innerHTML = ready.length
    ? ready.map((item) => `<span class="queue-chip" style="border-color:${colorForPid(item.result.id)}">${escapeHtml(item.result.id)}</span>`).join("")
    : '<span class="muted">Queue is empty.</span>';
  els.runningCount.textContent = runningCount;
  els.readyCount.textContent = ready.length;
  els.doneCount.textContent = doneCount;
}

function renderProcessMetrics() {
  els.metricsBody.innerHTML = "";
  state.simulation.results.forEach((result) => {
    const snapshot = stateAt(result, state.currentTime);
    const isDone = snapshot.state === "Terminated";
    const started = result.start !== null && state.currentTime >= result.start;
    const row = document.createElement("tr");
    if (isDone) row.classList.add("done");
    row.innerHTML = `
      <td><span class="pid-tag" style="background:${colorForPid(result.id)}">${escapeHtml(result.id)}</span></td>
      <td>${escapeHtml(result.name)}</td>
      <td>${result.arrival}</td>
      <td>${result.burst}</td>
      <td>${result.priority}</td>
      <td><span class="state-tag state-${snapshot.state.toLowerCase()}">${snapshot.state}</span></td>
      <td>${snapshot.core === null ? "—" : `Core ${snapshot.core + 1}`}</td>
      <td>${isDone ? result.waiting : "—"}</td>
      <td>${isDone ? result.turnaround : "—"}</td>
      <td>${started ? result.response : "—"}</td>
    `;
    els.metricsBody.appendChild(row);
  });
}

function renderLegend() {
  els.processLegend.innerHTML = state.simulation.results.map((result) => `
    <span class="legend-item"><span class="legend-dot" style="background:${colorForPid(result.id)}"></span>${escapeHtml(result.id)}</span>
  `).join("");
}

function renderGantt() {
  const sim = state.simulation;
  const pxPerMs = Math.max(12, Math.min(36, 980 / Math.max(sim.totalTime, 1)));
  const trackWidth = Math.max(sim.totalTime * pxPerMs, 440);
  let rows = "";

  for (let core = 0; core < sim.numCores; core += 1) {
    const blocks = sim.segments.filter((segment) => segment.core === core).map((segment) => {
      const width = Math.max((segment.end - segment.start) * pxPerMs, 2);
      const left = segment.start * pxPerMs;
      const label = width >= 34 ? escapeHtml(segment.pid) : "";
      return `<div class="gantt-block" style="left:${left}px;width:${width}px;background:${colorForPid(segment.pid)}" title="${escapeAttr(segment.pid)} · ${segment.start}–${segment.end} ms">${label}</div>`;
    }).join("");
    rows += `<div class="gantt-row"><div class="gantt-label">CORE ${core + 1}</div><div class="gantt-track" style="width:${trackWidth}px">${blocks}<div class="playhead" id="playhead-${core}" style="left:0"></div></div></div>`;
  }

  const step = Math.max(1, Math.ceil(sim.totalTime / 12));
  let axis = `<div class="gantt-axis" style="width:${trackWidth}px">`;
  for (let time = 0; time <= sim.totalTime; time += step) {
    axis += `<span style="left:${time * pxPerMs}px">${time}</span>`;
  }
  if (sim.totalTime % step !== 0) axis += `<span style="left:${sim.totalTime * pxPerMs}px">${sim.totalTime}</span>`;
  axis += "</div>";

  els.ganttWrap.innerHTML = `<div class="gantt-inner">${rows}${axis}</div>`;
  els.ganttWrap.dataset.pxPerMs = String(pxPerMs);
}

function movePlayheads() {
  const pxPerMs = Number(els.ganttWrap.dataset.pxPerMs || 0);
  if (!pxPerMs) return;
  for (let core = 0; core < state.simulation.numCores; core += 1) {
    const playhead = document.getElementById(`playhead-${core}`);
    if (playhead) playhead.style.left = `${state.currentTime * pxPerMs}px`;
  }
}

function renderKPIs() {
  const m = state.simulation.metrics;
  const cards = [
    [formatNumber(m.utilization, 1) + "%", "CPU utilization"],
    [formatNumber(m.avgWaiting, 2) + " ms", "Avg waiting time"],
    [formatNumber(m.avgTurnaround, 2) + " ms", "Avg turnaround"],
    [formatNumber(m.avgResponse, 2) + " ms", "Avg response time"],
    [formatNumber(m.throughput, 3) + " p/ms", "Throughput"],
    [m.totalTime + " ms", "Total execution"],
  ];
  els.kpiGrid.innerHTML = cards.map(([value, label]) => `<div class="kpi"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function compareAlgorithms() {
  const issue = validateProcesses();
  if (issue) return toast(issue, "error");
  const cores = clampInt(els.numCores.value, 1, 8, 4);
  const quantum = clampInt(els.quantum.value, 1, 20, 2);
  const algorithms = ["FCFS", "SJF", "PRIORITY", "RR"];

  try {
    const runs = algorithms.map((algorithm) => SchedulerEngine.run(state.processes, algorithm, cores, quantum));
    const bestWaiting = Math.min(...runs.map((run) => run.metrics.avgWaiting));
    els.comparisonContent.innerHTML = `
      <table class="comparison-table">
        <thead><tr><th>Algorithm</th><th>Avg wait</th><th>Avg turnaround</th><th>Avg response</th><th>CPU util.</th><th>Throughput</th><th>Total time</th></tr></thead>
        <tbody>
          ${runs.map((run) => {
            const best = Math.abs(run.metrics.avgWaiting - bestWaiting) < 1e-9;
            return `<tr class="${best ? "best" : ""}">
              <td><strong>${algorithmLabel(run.algorithm)}</strong>${best ? '<span class="best-badge">LOWEST WAIT</span>' : ""}</td>
              <td>${formatNumber(run.metrics.avgWaiting, 2)} ms</td>
              <td>${formatNumber(run.metrics.avgTurnaround, 2)} ms</td>
              <td>${formatNumber(run.metrics.avgResponse, 2)} ms</td>
              <td>${formatNumber(run.metrics.utilization, 1)}%</td>
              <td>${formatNumber(run.metrics.throughput, 3)} p/ms</td>
              <td>${run.metrics.totalTime} ms</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
    toast("Algorithm comparison generated.", "success");
  } catch (error) {
    toast(error.message || "Unable to compare algorithms.", "error");
  }
}

function togglePlay() {
  if (!state.simulation) return toast("Run a simulation first.", "error");
  if (state.currentTime >= state.simulation.totalTime) setSimulationTime(0);
  state.playing ? stopPlayback() : startPlayback();
}

function startPlayback() {
  if (!state.simulation) return;
  state.playing = true;
  els.playBtn.textContent = "⏸";
  els.playBtn.setAttribute("aria-label", "Pause simulation");
  setOverviewStatus("running", "Running");
  startTimer();
}

function startTimer() {
  clearInterval(state.timer);
  const interval = Math.max(70, 420 / state.speed);
  state.timer = setInterval(() => {
    if (!state.simulation) return stopPlayback();
    if (state.currentTime >= state.simulation.totalTime) {
      setSimulationTime(state.simulation.totalTime);
      return;
    }
    setSimulationTime(state.currentTime + 1);
  }, interval);
}

function stopPlayback() {
  state.playing = false;
  clearInterval(state.timer);
  state.timer = null;
  if (els.playBtn) {
    els.playBtn.textContent = "▶";
    els.playBtn.setAttribute("aria-label", "Play simulation");
  }
}

function stepTime(delta) {
  if (!state.simulation) return;
  stopPlayback();
  setSimulationTime(state.currentTime + delta);
}

function resetSimulationViews() {
  stopPlayback();
  els.clockTime.textContent = "0";
  els.scrub.value = 0;
  els.scrub.max = 0;
  els.scrubCurrent.textContent = "0 ms";
  els.scrubTotal.textContent = "0 ms";
  els.coreRack.innerHTML = '<div class="empty-state compact-empty">Run the simulation to initialize CPU cores.</div>';
  els.readyQueue.innerHTML = '<span class="muted">No simulation run yet.</span>';
  els.runningCount.textContent = "0";
  els.readyCount.textContent = "0";
  els.doneCount.textContent = "0";
  els.ganttWrap.innerHTML = '<div class="empty-state">Run a simulation to generate the execution timeline.</div>';
  els.ganttWrap.dataset.pxPerMs = "";
  els.processLegend.innerHTML = "";
  els.metricsBody.innerHTML = '<tr><td colspan="10"><div class="empty-table">No simulation run yet.</div></td></tr>';
  els.kpiGrid.innerHTML = ["CPU utilization", "Avg waiting time", "Avg turnaround", "Avg response time", "Throughput", "Total execution"].map((label) => `<div class="kpi"><span>${label}</span><strong>—</strong></div>`).join("");
  els.exportCsvBtn.disabled = true;
  els.simulationBadge.textContent = "No run yet";
  setOverviewStatus("idle", "Ready");
}

function updateConfigUi() {
  const cores = clampInt(els.numCores.value, 1, 8, 4);
  const quantum = clampInt(els.quantum.value, 1, 20, 2);
  els.quantumField.classList.toggle("hidden", state.algorithm !== "RR");
  els.overviewAlgorithm.textContent = algorithmLabel(state.algorithm);
  els.overviewCores.textContent = cores;
  els.overviewProcesses.textContent = state.processes.length;
  els.configSummary.textContent = state.algorithm === "RR"
    ? `${algorithmLabel(state.algorithm)} will schedule ${state.processes.length} process${state.processes.length === 1 ? "" : "es"} across ${cores} core${cores === 1 ? "" : "s"} using a ${quantum} ms time quantum.`
    : `${algorithmLabel(state.algorithm)} will schedule ${state.processes.length} process${state.processes.length === 1 ? "" : "es"} across ${cores} core${cores === 1 ? "" : "s"}.`;
}

function updateOverview() {
  els.overviewProcesses.textContent = state.processes.length;
  els.overviewAlgorithm.textContent = algorithmLabel(state.algorithm);
  els.overviewCores.textContent = clampInt(els.numCores?.value ?? 4, 1, 8, 4);
}

function setOverviewStatus(kind, label) {
  els.overviewStatus.innerHTML = `<span class="status-dot ${kind}"></span>${label}`;
}

function exportWorkload() {
  const payload = {
    app: "Multi-Core CPU Task Manager",
    version: 2,
    exportedAt: new Date().toISOString(),
    algorithm: state.algorithm,
    numCores: clampInt(els.numCores.value, 1, 8, 4),
    quantum: clampInt(els.quantum.value, 1, 20, 2),
    processes: state.processes,
  };
  downloadBlob(JSON.stringify(payload, null, 2), "multicore-workload.json", "application/json");
  toast("Workload exported.", "success");
}

async function importWorkload(event) {
  const [file] = event.target.files;
  event.target.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    if (!Array.isArray(payload.processes)) throw new Error("JSON does not contain a valid process list.");
    state.algorithm = ["FCFS", "SJF", "PRIORITY", "RR"].includes(payload.algorithm) ? payload.algorithm : "FCFS";
    els.numCores.value = clampInt(payload.numCores, 1, 8, 4);
    els.quantum.value = clampInt(payload.quantum, 1, 20, 2);
    document.querySelectorAll('input[name="algorithm"]').forEach((input) => {
      input.checked = input.value === state.algorithm;
      input.closest(".algorithm-option").classList.toggle("selected", input.checked);
    });
    setProcesses(payload.processes, "Workload imported successfully.");
  } catch (error) {
    toast(error.message || "Could not import the workload.", "error");
  }
}

function exportResultsCsv() {
  if (!state.simulation) return;
  const header = ["PID", "Name", "Arrival", "Burst", "Priority", "Start", "Finish", "Waiting", "Turnaround", "Response"];
  const rows = state.simulation.results.map((r) => [r.id, r.name, r.arrival, r.burst, r.priority, r.start, r.finish, r.waiting, r.turnaround, r.response]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  downloadBlob(csv, `${state.algorithm.toLowerCase()}-simulation-results.csv`, "text/csv;charset=utf-8");
  toast("Simulation results exported as CSV.", "success");
}

function loadSavedWorkload() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved.processes)) {
      state.processes = saved.processes.map(normalizeProcess);
      state.algorithm = ["FCFS", "SJF", "PRIORITY", "RR"].includes(saved.algorithm) ? saved.algorithm : "FCFS";
      els.numCores.value = clampInt(saved.numCores, 1, 8, 4);
      els.quantum.value = clampInt(saved.quantum, 1, 20, 2);
      document.querySelectorAll('input[name="algorithm"]').forEach((input) => {
        input.checked = input.value === state.algorithm;
        input.closest(".algorithm-option").classList.toggle("selected", input.checked);
      });
      return;
    }
  } catch (_) {
    localStorage.removeItem(STORAGE_KEY);
  }
  state.processes = defaultProcesses();
}

function saveWorkload() {
  const payload = {
    processes: state.processes,
    algorithm: state.algorithm,
    numCores: clampInt(els.numCores.value, 1, 8, 4),
    quantum: clampInt(els.quantum.value, 1, 20, 2),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved === "light" || saved === "dark" ? saved : "dark";
  document.documentElement.dataset.theme = theme;
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  toast(`${next[0].toUpperCase() + next.slice(1)} theme enabled.`);
}

function colorForIndex(index) { return COLORS[index % COLORS.length]; }
function colorForPid(pid) {
  const index = state.processes.findIndex((p) => p.id === pid);
  return colorForIndex(index < 0 ? 0 : index);
}
function algorithmLabel(value) {
  return ({ FCFS: "FCFS", SJF: "SJF", PRIORITY: "Priority", RR: "Round Robin" })[value] || value;
}
function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}
function formatNumber(value, decimals) { return Number(value).toFixed(decimals); }
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}
function escapeAttr(value) { return escapeHtml(value); }
function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
function toast(message, type = "") {
  const node = document.createElement("div");
  node.className = `toast ${type}`.trim();
  node.textContent = message;
  els.toastRegion.appendChild(node);
  window.setTimeout(() => node.remove(), 3200);
}

if (typeof document !== "undefined") initialize();
if (typeof module !== "undefined" && module.exports) module.exports = { SchedulerEngine };
