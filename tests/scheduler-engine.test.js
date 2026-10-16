"use strict";

const assert = require("node:assert/strict");
const { SchedulerEngine } = require("../app.js");

function process(id, arrival, burst, priority = 1) {
  return { id, name: id, arrival, burst, priority };
}

// FCFS: verifies the standard waiting/response equations on one core.
{
  const sim = SchedulerEngine.run([
    process("P1", 0, 5),
    process("P2", 1, 3),
  ], "FCFS", 1, 2);

  assert.equal(sim.totalTime, 8);
  assert.equal(sim.results[0].waiting, 0);
  assert.equal(sim.results[1].waiting, 4);
  assert.equal(sim.results[1].response, 4);
}

// Two identical jobs on two cores should complete in parallel at 100% utilization.
{
  const sim = SchedulerEngine.run([
    process("P1", 0, 4),
    process("P2", 0, 4),
  ], "FCFS", 2, 2);

  assert.equal(sim.totalTime, 4);
  assert.equal(sim.metrics.utilization, 100);
}

// SJF should select the shorter ready process first.
{
  const sim = SchedulerEngine.run([
    process("P1", 0, 6),
    process("P2", 0, 2),
    process("P3", 0, 4),
  ], "SJF", 1, 2);

  assert.deepEqual(sim.segments.map((segment) => segment.pid), ["P2", "P3", "P1"]);
}

// Priority uses the lower number as the higher priority.
{
  const sim = SchedulerEngine.run([
    process("P1", 0, 2, 3),
    process("P2", 0, 2, 1),
    process("P3", 0, 2, 2),
  ], "PRIORITY", 1, 2);

  assert.deepEqual(sim.segments.map((segment) => segment.pid), ["P2", "P3", "P1"]);
}

// Round Robin must create multiple execution segments when the quantum is smaller than the burst.
{
  const sim = SchedulerEngine.run([
    process("P1", 0, 5),
    process("P2", 0, 3),
  ], "RR", 1, 2);

  assert.equal(sim.totalTime, 8);
  assert.ok(sim.segments.length >= 4);
  assert.deepEqual(sim.segments.slice(0, 4).map((segment) => segment.pid), ["P1", "P2", "P1", "P2"]);
}

console.log("✓ Scheduler engine tests passed");
