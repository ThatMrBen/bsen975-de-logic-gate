"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  TuringSimulator,
  LogicCoreController,
  Bsen975LogicGateExtension,
  CircuitError,
  COMPONENT_DEFINITIONS
} = require("./bsen975-de-logic-gate.js");

function addLine(simulator, id1, port1, id2, port2) {
  return simulator.createLine("", id1, port1, id2, port2);
}

function removeLineBetween(simulator, id1, port1, id2, port2) {
  const endpoints = new Set([`${id1}.${port1}`, `${id2}.${port2}`]);
  const line = simulator.getLines().find(({ from, to }) => endpoints.has(from) && endpoints.has(to));
  return line ? simulator.removeLine(line.id) : false;
}

test("disconnected inputs return to zero", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("input", "LEVEL_INPUT");
  simulator.addComponent("output", "LEVEL_OUTPUT");
  addLine(simulator, "input", "OUT", "output", "IN");
  simulator.setPort("input", "OUT", 1);
  simulator.tick();

  removeLineBetween(simulator, "input", "OUT", "output", "IN");

  assert.equal(simulator.getPort("output", "IN"), 0);
});

test("a second driver is rejected without changing the graph", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("a", "LEVEL_INPUT");
  simulator.addComponent("b", "LEVEL_INPUT");
  simulator.addComponent("output", "LEVEL_OUTPUT");
  addLine(simulator, "a", "OUT", "output", "IN");

  assert.throws(
    () => addLine(simulator, "b", "OUT", "output", "IN"),
    (error) => error instanceof CircuitError && /多个驱动端/.test(error.message)
  );
  assert.deepEqual(simulator.exportGraph().connections, [
    { id: "line-1", from: "a.OUT", to: "output.IN" }
  ]);
  assert.doesNotThrow(() => simulator.tick());
});

test("one driver can still fan out to multiple inputs", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("input", "LEVEL_INPUT");
  simulator.addComponent("left", "LEVEL_OUTPUT");
  simulator.addComponent("right", "LEVEL_OUTPUT");
  addLine(simulator, "input", "OUT", "left", "IN");
  addLine(simulator, "input", "OUT", "right", "IN");
  simulator.setPort("input", "OUT", 1);
  simulator.tick();

  assert.equal(simulator.getPort("left", "IN"), 1);
  assert.equal(simulator.getPort("right", "IN"), 1);
});

test("named lines can be inspected, drawn, and removed independently", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("source", "LEVEL_INPUT", 4);
  simulator.addComponent("sink", "LEVEL_OUTPUT", 4);

  assert.equal(simulator.createLine("front-wire", "source", "OUT", "sink", "IN"), "front-wire");
  simulator.setPort("source", "OUT", 10);
  simulator.tick();

  const line = simulator.getLineInfo("front-wire");
  assert.deepEqual(line, {
    id: "front-wire",
    from: "source.OUT",
    to: "sink.IN",
    width: 4,
    value: 10,
    netId: line.netId
  });
  assert.match(line.netId, /^net-/);
  assert.deepEqual(simulator.getLines(), [line]);
  assert.deepEqual(simulator.getComponentInfo("source").links, [{
    id: "front-wire", from: "source.OUT", to: "sink.IN"
  }]);

  assert.equal(simulator.removeLine("front-wire"), true);
  assert.deepEqual(simulator.getLines(), []);
  assert.equal(simulator.getPort("sink", "IN"), 0);
  assert.throws(() => simulator.getLineInfo("front-wire"), /线路不存在/);
});

test("ports accept multiple lines while direction and duplicate rules remain atomic", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("source", "LEVEL_INPUT");
  simulator.addComponent("sink", "LEVEL_OUTPUT");
  simulator.addComponent("otherSink", "LEVEL_OUTPUT");
  simulator.addComponent("via", "VIA");

  simulator.createLine("main", "source", "OUT", "sink", "IN");
  simulator.createLine("branch-at-input", "sink", "IN", "via", "IO");
  simulator.createLine("branch-out", "via", "IO", "otherSink", "IN");
  assert.equal(simulator.getLines().length, 3);

  const before = simulator.exportGraph().connections;
  assert.throws(
    () => simulator.createLine("duplicate", "sink", "IN", "source", "OUT"),
    /已存在线路/
  );
  assert.throws(
    () => simulator.createLine("input-input", "sink", "IN", "otherSink", "IN"),
    /方向不兼容/
  );
  assert.throws(
    () => simulator.createLine("self", "via", "IO", "via", "IO"),
    /连接到自身/
  );
  assert.deepEqual(simulator.exportGraph().connections, before);
});

test("direct output-output connections fail before changing automatic line numbering", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("left", "LEVEL_INPUT");
  simulator.addComponent("right", "LEVEL_INPUT");
  simulator.addComponent("sink", "LEVEL_OUTPUT");

  assert.throws(() => simulator.createLine("", "left", "OUT", "right", "OUT"), /方向不兼容/);
  simulator.createLine("", "left", "OUT", "sink", "IN");
  assert.deepEqual(simulator.exportCircuit().connections, [{
    id: "line-1", from: "left.OUT", to: "sink.IN"
  }]);
  assert.throws(
    () => simulator.createLine("line-1", "right", "OUT", "sink", "IN"),
    /线路 ID 已存在/
  );
});

test("component removal and clear discard line endpoint indexes", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("source", "LEVEL_INPUT");
  simulator.addComponent("sink", "LEVEL_OUTPUT");
  simulator.createLine("first", "source", "OUT", "sink", "IN");

  simulator.removeComponent("sink");
  assert.deepEqual(simulator.getLines(), []);
  simulator.addComponent("sink", "LEVEL_OUTPUT");
  assert.doesNotThrow(() => simulator.createLine("second", "source", "OUT", "sink", "IN"));

  simulator.clear();
  simulator.addComponent("source", "LEVEL_INPUT");
  simulator.addComponent("sink", "LEVEL_OUTPUT");
  assert.equal(simulator.createLine("", "source", "OUT", "sink", "IN"), "line-1");
});

test("VIA is a passive single-port junction with automatic width", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("source", "LEVEL_INPUT", 4);
  simulator.addComponent("via", "VIA", 8);
  simulator.addComponent("left", "LEVEL_OUTPUT", 4);
  simulator.addComponent("right", "LEVEL_OUTPUT", 4);

  assert.equal(simulator.getPortWidth("via", "IO"), 0);
  assert.deepEqual(simulator.getPortDefinitions("via"), [{
    name: "IO", direction: "passive", width: 0, value: 0, connected: false
  }]);

  addLine(simulator, "source", "OUT", "via", "IO");
  addLine(simulator, "via", "IO", "left", "IN");
  addLine(simulator, "via", "IO", "right", "IN");
  assert.equal(simulator.getPortWidth("via", "IO"), 4);
  const viaState = simulator.exportGraph().components.find(({ id }) => id === "via");
  assert.equal(viaState.ports.IO.width, 4);
  assert.equal(viaState.bitWidth, 4);
  assert.equal(simulator.getComponentInfo("via").bitWidth, 4);

  simulator.setPort("source", "OUT", 11);
  assert.equal(simulator.settle().iterations, 1);
  assert.equal(simulator.getPort("via", "IO"), 11);
  assert.equal(simulator.getPort("left", "IN"), 11);
  assert.equal(simulator.getPort("right", "IN"), 11);
  assert.equal(COMPONENT_DEFINITIONS.VIA.combinational, undefined);
  assert.equal(Array.from(simulator._combinationalEvaluations()).length, 0);
  assert.throws(() => simulator.setComponentWidth("via", 8), /不支持修改位宽/);

  removeLineBetween(simulator, "source", "OUT", "via", "IO");
  assert.equal(simulator.getPortWidth("via", "IO"), 4);
  assert.equal(simulator.getPort("via", "IO"), 0);
  assert.equal(simulator.getPort("left", "IN"), 0);
  assert.equal(simulator.getPort("right", "IN"), 0);
});

test("VIA chains infer width and reject mixed widths atomically", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("wide", "BUS_OUTPUT");
  simulator.addComponent("narrow", "OUTPUT");
  simulator.addComponent("via1", "VIA");
  simulator.addComponent("via2", "VIA");
  addLine(simulator, "via1", "IO", "via2", "IO");
  assert.equal(simulator.getPortWidth("via1", "IO"), 0);
  assert.equal(simulator.getPortWidth("via2", "IO"), 0);

  addLine(simulator, "wide", "IN", "via1", "IO");
  assert.equal(simulator.getPortWidth("via1", "IO"), 8);
  assert.equal(simulator.getPortWidth("via2", "IO"), 8);
  const before = simulator.exportGraph().connections;
  assert.throws(() => addLine(simulator, "narrow", "IN", "via2", "IO"), /端口位宽不匹配/);
  assert.deepEqual(simulator.exportGraph().connections, before);

  removeLineBetween(simulator, "wide", "IN", "via1", "IO");
  assert.equal(simulator.getPortWidth("via1", "IO"), 0);
  assert.equal(simulator.getPortWidth("via2", "IO"), 0);
});

test("VIA networks still reject multiple real drivers", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("first", "LEVEL_INPUT", 4);
  simulator.addComponent("second", "LEVEL_INPUT", 4);
  simulator.addComponent("via", "VIA");
  addLine(simulator, "first", "OUT", "via", "IO");
  const before = simulator.exportGraph().connections;

  assert.throws(() => addLine(simulator, "second", "OUT", "via", "IO"), /多个驱动端/);
  assert.deepEqual(simulator.exportGraph().connections, before);
});

test("VIA adapts to compatible resizes and isolates conflicting networks", () => {
  const adaptable = new TuringSimulator();
  adaptable.addComponent("source", "LEVEL_INPUT", 4);
  adaptable.addComponent("via", "VIA");
  addLine(adaptable, "source", "OUT", "via", "IO");
  const kept = adaptable.setComponentWidth("source", 8);
  assert.deepEqual(kept.disconnected, []);
  assert.equal(adaptable.getPortWidth("via", "IO"), 8);
  assert.equal(adaptable.exportGraph().connections.length, 1);

  const conflicting = new TuringSimulator();
  conflicting.addComponent("source", "LEVEL_INPUT", 4);
  conflicting.addComponent("sink", "LEVEL_OUTPUT", 4);
  conflicting.addComponent("via", "VIA");
  addLine(conflicting, "source", "OUT", "via", "IO");
  addLine(conflicting, "via", "IO", "sink", "IN");
  const changed = conflicting.setComponentWidth("source", 8);
  assert.deepEqual(changed.disconnected, [{ id: "line-1", from: "source.OUT", to: "via.IO" }]);
  assert.equal(conflicting.getPortWidth("via", "IO"), 4);
  assert.deepEqual(conflicting.exportGraph().connections, [{ id: "line-2", from: "via.IO", to: "sink.IN" }]);
});

test("structures require line IDs and component types must be canonical", () => {
  const simulator = new TuringSimulator();
  assert.throws(() => simulator.importCircuit({
    version: 1,
    components: [
      { id: "source", type: "LEVEL_INPUT", width: 1 },
      { id: "sink", type: "LEVEL_OUTPUT", width: 1 }
    ],
    connections: [{ from: "source.OUT", to: "sink.IN" }]
  }), /线路 ID 不能为空/);
  assert.deepEqual(simulator.exportCircuit().components, []);
  assert.throws(() => simulator.addComponent("old-name", "HalfAdder"), /未知元件类型/);
});

test("VIA structure and snapshots round-trip inferred width and value", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("source", "LEVEL_INPUT", 4);
  simulator.addComponent("via", "VIA");
  simulator.addComponent("sink", "LEVEL_OUTPUT", 4);
  addLine(simulator, "source", "OUT", "via", "IO");
  addLine(simulator, "via", "IO", "sink", "IN");
  simulator.setPort("source", "OUT", 9);
  simulator.settle();

  const structure = simulator.exportCircuit();
  assert.equal(structure.components.find(({ id }) => id === "via").width, 0);
  const restoredStructure = new TuringSimulator();
  restoredStructure.importCircuit(structure);
  assert.equal(restoredStructure.getPortWidth("via", "IO"), 4);

  const restoredSnapshot = new TuringSimulator();
  restoredSnapshot.importCircuit(JSON.stringify(simulator.exportSnapshot()));
  assert.equal(restoredSnapshot.getPortWidth("via", "IO"), 4);
  assert.equal(restoredSnapshot.getPort("via", "IO"), 9);
  assert.equal(restoredSnapshot.getPort("sink", "IN"), 9);
});

test("validation handles prototype-sensitive component IDs", async () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("input", "LEVEL_INPUT");
  simulator.addComponent("__proto__", "LEVEL_OUTPUT");
  addLine(simulator, "input", "OUT", "__proto__", "IN");

  const result = await simulator.validate(
    '[{"input":0}]',
    '[{"__proto__":1}]'
  );

  assert.equal(result.passed, false);
  assert.equal(result.passedCount, 0);
  assert.deepEqual(
    { ...result.failures[0].differences.__proto__ },
    { expected: 1, actual: 0 }
  );
});

test("deep acyclic circuits are not reported as oscillating", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("input", "LEVEL_INPUT");
  let previous = "input";
  for (let index = 0; index < 150; index++) {
    const id = `not-${index}`;
    simulator.addComponent(id, "NOT");
    addLine(simulator, previous, "OUT", id, "A");
    previous = id;
  }
  simulator.addComponent("output", "LEVEL_OUTPUT");
  addLine(simulator, previous, "OUT", "output", "IN");
  simulator.setPort("input", "OUT", 1);

  assert.doesNotThrow(() => simulator.tick());
  assert.equal(simulator.getPort("output", "IN"), 1);
});

test("a real feedback oscillator is still rejected", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("not", "NOT");
  addLine(simulator, "not", "OUT", "not", "A");

  assert.throws(
    () => simulator.tick(),
    (error) => error.name === "LogicOscillationError"
  );
});

test("a failed worker leaves the controller stopped and restartable", async (context) => {
  const originalWorker = globalThis.Worker;
  const originalBlob = globalThis.Blob;
  const originalURL = globalThis.URL;

  class FailingWorker {
    constructor() {
      this.terminated = false;
      queueMicrotask(() => this.onerror({ message: "worker failed" }));
    }

    postMessage() {}

    terminate() {
      this.terminated = true;
    }
  }

  context.after(() => {
    globalThis.Worker = originalWorker;
    globalThis.Blob = originalBlob;
    globalThis.URL = originalURL;
  });
  globalThis.Worker = FailingWorker;
  globalThis.Blob = class Blob {};
  globalThis.URL = {
    createObjectURL: () => "blob:test",
    revokeObjectURL: () => {}
  };

  const controller = new LogicCoreController();
  assert.equal(controller.start(), "worker");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.running, false);
  assert.equal(controller.start(), "worker");
  controller.stop();
});

test("settling and clock pulses have distinct sequential behavior", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("data", "LEVEL_INPUT", 8);
  simulator.addComponent("clock", "LEVEL_INPUT", 1);
  simulator.addComponent("register", "REGISTER");
  addLine(simulator, "data", "OUT", "register", "D");
  addLine(simulator, "clock", "OUT", "register", "CLK");
  simulator.setInputs({ data: 37, clock: 1 });

  simulator.settle();
  assert.equal(simulator.getPort("register", "Q"), 0);

  simulator.pulseClock("clock", 1);
  assert.equal(simulator.getPort("register", "Q"), 37);
});

test("reset clears runtime state while preserving topology and ROM", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("rom", "ROM");
  simulator.addComponent("ram", "RAM");
  simulator.loadROM("rom", [11, 22], 0);
  simulator.writeRAM("ram", 5, 99);
  const before = simulator.exportCircuit();

  simulator.resetState();

  assert.deepEqual(simulator.exportCircuit(), before);
  assert.equal(simulator.readMemory("rom", 1), 22);
  assert.equal(simulator.readMemory("ram", 5), 0);
});

test("circuit import is atomic and round-trips structure", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("input", "LEVEL_INPUT");
  simulator.addComponent("not", "NOT");
  addLine(simulator, "input", "OUT", "not", "A");
  const exported = simulator.exportCircuit();

  const restored = new TuringSimulator();
  restored.importCircuit(JSON.stringify(exported));
  assert.deepEqual(restored.exportCircuit(), exported);

  assert.throws(() => restored.importCircuit({
    version: 1,
    components: [{ id: "only", type: "NOT" }],
    connections: [{ id: "broken-line", from: "only.OUT", to: "missing.IN" }]
  }), /元件不存在/);
  assert.deepEqual(restored.exportCircuit(), exported);
});

test("full snapshots restore memory, registers, and clock history", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("data", "LEVEL_INPUT", 8);
  simulator.addComponent("clock", "LEVEL_INPUT");
  simulator.addComponent("register", "REGISTER");
  simulator.addComponent("rom", "ROM");
  simulator.addComponent("ram", "RAM");
  addLine(simulator, "data", "OUT", "register", "D");
  addLine(simulator, "clock", "OUT", "register", "CLK");
  simulator.loadROM("rom", [11, 22], 0);
  simulator.writeRAM("ram", 7, 99);
  simulator.setPort("data", "OUT", 42);
  simulator.pulseClock("clock");
  const snapshot = simulator.exportSnapshot();

  const restored = new TuringSimulator();
  restored.importCircuit(JSON.stringify(snapshot));
  assert.equal(restored.getPort("register", "Q"), 42);
  assert.equal(restored.readMemory("rom", 1), 22);
  assert.equal(restored.readMemory("ram", 7), 99);

  restored.setPort("data", "OUT", 7);
  restored.tick();
  assert.equal(restored.getPort("register", "Q"), 42);
  restored.pulseClock("clock");
  assert.equal(restored.getPort("register", "Q"), 7);
});

test("snapshot import rejects ambiguous state atomically", () => {
  const source = new TuringSimulator();
  source.addComponent("data", "LEVEL_INPUT", 8);
  source.addComponent("clock", "LEVEL_INPUT");
  source.addComponent("register", "REGISTER");
  addLine(source, "data", "OUT", "register", "D");
  addLine(source, "clock", "OUT", "register", "CLK");
  const snapshot = source.exportSnapshot();

  const target = new TuringSimulator();
  target.addComponent("existing", "LEVEL_INPUT");
  const original = target.exportCircuit();

  const duplicate = JSON.parse(JSON.stringify(snapshot));
  duplicate.state.components.push({ ...duplicate.state.components[0] });
  assert.throws(() => target.importCircuit(duplicate), /重复元件状态/);
  assert.deepEqual(target.exportCircuit(), original);

  const missingClock = JSON.parse(JSON.stringify(snapshot));
  delete missingClock.state.components.find((state) => state.id === "register").previousClock;
  assert.throws(() => target.importCircuit(missingClock), /缺少时钟历史/);
  assert.deepEqual(target.exportCircuit(), original);
});

test("batch port reads return endpoint-keyed values", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("input", "LEVEL_INPUT", 4);
  simulator.setPort("input", "OUT", 9);

  const values = simulator.readPorts('["input.OUT"]');

  assert.equal(values["input.OUT"], 9);
});

test("batch inputs and ROM loads are atomic on validation errors", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("left", "LEVEL_INPUT");
  simulator.addComponent("right", "LEVEL_INPUT");
  simulator.addComponent("rom", "ROM");
  simulator.setInputs({ left: 1, right: 0 });
  simulator.loadROM("rom", [10, 20], 0);

  assert.throws(() => simulator.setInputs({ left: 0, right: 2 }), /必须是 0-1/);
  assert.equal(simulator.getPort("left", "OUT"), 1);
  assert.equal(simulator.getPort("right", "OUT"), 0);

  assert.throws(() => simulator.loadROM("rom", [30, 999], 0), /必须是 0-255/);
  assert.equal(simulator.readMemory("rom", 0), 10);
  assert.equal(simulator.readMemory("rom", 1), 20);
});

test("validation prechecks every vector before changing circuit state", async () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("input", "LEVEL_INPUT");
  simulator.addComponent("output", "LEVEL_OUTPUT");
  addLine(simulator, "input", "OUT", "output", "IN");
  simulator.setPort("input", "OUT", 1);

  await assert.rejects(
    simulator.validate(
      [{ input: 0 }, {}],
      [{ output: 0 }, { output: 0 }]
    ),
    /缺少元件 ID/
  );
  assert.equal(simulator.getPort("input", "OUT"), 1);
});

test("validation supports reset-per-case and sequential-preserve modes", async () => {
  const build = () => {
    const simulator = new TuringSimulator();
    simulator.addComponent("data", "LEVEL_INPUT", 8);
    simulator.addComponent("clock", "LEVEL_INPUT");
    simulator.addComponent("register", "REGISTER");
    simulator.addComponent("output", "LEVEL_OUTPUT", 8);
    addLine(simulator, "data", "OUT", "register", "D");
    addLine(simulator, "clock", "OUT", "register", "CLK");
    addLine(simulator, "register", "Q", "output", "IN");
    return simulator;
  };
  const inputs = [{ data: 5, clock: 1 }, { data: 7, clock: 1 }];

  const resetResult = await build().validate(
    inputs,
    [{ output: 5 }, { output: 7 }],
    { resetBeforeEachCase: true }
  );
  assert.equal(resetResult.passed, true);

  const preserveResult = await build().validate(
    inputs,
    [{ output: 5 }, { output: 5 }],
    { resetBeforeEachCase: false }
  );
  assert.equal(preserveResult.passed, true);
});

test("loaded validation can run one numbered case at a selected frequency", async () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("input", "LEVEL_INPUT");
  simulator.addComponent("output", "LEVEL_OUTPUT");
  addLine(simulator, "input", "OUT", "output", "IN");
  simulator.setValidationData(
    [{ input: 0 }, { input: 1 }],
    [{ output: 0 }, { output: 1 }],
    { resetBeforeEachCase: true }
  );
  const waits = [];
  simulator._waitForTicks = async (ticks, hz) => { waits.push({ ticks, hz }); };

  const result = await simulator.validateLoadedCase(2, { hz: 25 });

  assert.equal(result.passed, true);
  assert.equal(result.total, 1);
  assert.equal(result.caseNumber, 2);
  assert.equal(simulator.getPort("input", "OUT"), 1);
  assert.deepEqual(waits, [{ ticks: 1, hz: 25 }]);
  await assert.rejects(() => simulator.validateLoadedCase(3), /测试用例编号必须是 1-2/);

  waits.length = 0;
  const allResult = await simulator.validateLoadedData({ hz: 10 });
  assert.equal(allResult.total, 2);
  assert.deepEqual(waits, [{ ticks: 1, hz: 10 }, { ticks: 1, hz: 10 }]);
});

test("settling rate is validated and paced without background ticks", async () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("source", "ALWAYS_ON");
  simulator.addComponent("output", "LEVEL_OUTPUT");
  addLine(simulator, "source", "OUT", "output", "IN");
  const waits = [];
  simulator._waitForTicks = async (ticks, hz) => { waits.push({ ticks, hz }); };

  const result = await simulator.settleAtRate(50);

  assert.equal(result.hz, 50);
  assert.equal(simulator.getPort("output", "IN"), 1);
  assert.equal(waits.length, result.iterations);
  assert.ok(waits.every(({ ticks, hz }) => ticks === 1 && hz === 50));
  await assert.rejects(() => simulator.settleAtRate(1001), /模拟频率必须是 0-1000 Hz/);
});

test("port width queries return instantiated data and control widths", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("and", "AND", 4);
  simulator.addComponent("mux", "MUX", 8);
  simulator.addComponent("register", "REGISTER");

  assert.equal(simulator.getPortWidth("and", "A"), 4);
  assert.equal(simulator.getPortWidth("and", "OUT"), 4);
  assert.equal(simulator.getPortWidth("mux", "A"), 8);
  assert.equal(simulator.getPortWidth("mux", "SEL"), 1);
  assert.equal(simulator.getPortWidth("register", "D"), 8);
  assert.equal(simulator.getPortWidth("register", "CLK"), 1);
});

test("scalable component widths can change and incompatible wires are removed", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("input", "LEVEL_INPUT", 4);
  simulator.addComponent("and", "AND", 4);
  simulator.addComponent("output", "LEVEL_OUTPUT", 4);
  addLine(simulator, "input", "OUT", "and", "A");
  addLine(simulator, "and", "OUT", "output", "IN");

  const result = simulator.setComponentWidth("and", 8);

  assert.equal(simulator.getPortWidth("and", "A"), 8);
  assert.equal(simulator.getPortWidth("and", "OUT"), 8);
  assert.equal(result.disconnected.length, 2);
  assert.deepEqual(simulator.exportGraph().connections, []);
  assert.throws(() => simulator.setComponentWidth("register", 4), /元件不存在/);
  simulator.addComponent("register", "REGISTER");
  assert.throws(() => simulator.setComponentWidth("register", 4), /不支持修改位宽/);
});

test("dependency menu can bind a component to another target", async (context) => {
  const originalScratch = globalThis.Scratch;
  const current = { id: "current", isOriginal: true, getName: () => "当前角色" };
  const stage = { id: "stage", isOriginal: true, isStage: true, getName: () => undefined };
  const other = {
    id: "other",
    isOriginal: true,
    getName: () => undefined,
    sprite: { name: "其他角色" }
  };
  globalThis.Scratch = {
    vm: { runtime: { targets: [stage, current, other], on: () => {} } }
  };
  context.after(() => { globalThis.Scratch = originalScratch; });

  const extension = new Bsen975LogicGateExtension();
  const menu = extension.getDependencyMenu();
  assert.ok(menu.some((item) => item.value === "TARGET:stage" && item.text === "Stage"));
  assert.ok(menu.some((item) => item.value === "TARGET:other" && /其他角色/.test(item.text)));
  extension.startCore();
  await extension.registerComponent({
    dependency: "TARGET:other",
    id: "bound",
    type: "NOT",
    width: 1
  }, { target: current });

  assert.equal(extension.targetBindings.get("other"), "bound");
  assert.equal(extension.targetBindings.has("current"), false);
  extension.stopCore();
});

test("extension errors are English by default", async () => {
  const extension = new Bsen975LogicGateExtension();
  await extension.getPortProperty({ id: "missing", port: "OUT", property: "VALUE" });
  assert.equal(extension.getLastError(), "The circuit simulator is not running");
  extension.startCore();
  await extension.registerComponent({ dependency: "NONE", id: "bad", type: "UNKNOWN", width: 1 });
  assert.equal(extension.getLastError(), "Unknown component type: UNKNOWN");
  await extension.registerComponent({ dependency: "NONE", id: "badWidth", type: "AND", width: 3 });
  assert.equal(extension.getLastError(), "Component width must be 1, 2, 4, or 8: 3");
  await extension.registerComponent({ dependency: "NONE", id: "one", type: "LEVEL_INPUT", width: 1 });
  await extension.registerComponent({ dependency: "NONE", id: "four", type: "AND", width: 4 });
  await extension.createNamedLine({
    lineId: "bad-width", id1: "one", port1: "OUT", id2: "four", port2: "A"
  });
  assert.match(extension.getLastError(), /^Port width mismatch:/);
  await extension.registerComponent({ dependency: "NONE", id: "otherSource", type: "LEVEL_INPUT", width: 1 });
  await extension.createNamedLine({
    lineId: "bad-direction", id1: "one", port1: "OUT", id2: "otherSource", port2: "OUT"
  });
  assert.match(extension.getLastError(), /^Incompatible port directions:/);
  await extension.registerComponent({ dependency: "NONE", id: "register", type: "REGISTER", width: 1 });
  await extension.setComponentWidth({ id: "register", width: 4 });
  assert.equal(extension.getLastError(), "Component type does not support width changes: REGISTER");
  await extension.importCircuit({ json: "{" });
  assert.match(extension.getLastError(), /^Circuit data is not valid JSON:/);
  assert.doesNotMatch(extension.getLastError(), /[\u3400-\u9fff]/u);
  await extension.settleCircuit({ hz: 1001 });
  assert.equal(extension.getLastError(), "Simulation frequency must be a number from 0 to 1000 Hz: 1001");
  extension.stopCore();
});

test("consolidated port and circuit reporters preserve both result modes", async () => {
  const extension = new Bsen975LogicGateExtension();
  extension.startCore();
  await extension.registerComponent({ dependency: "NONE", id: "input", type: "LEVEL_INPUT", width: 4 });
  await extension.setInputLevel({ id: "input", value: 9 });

  assert.equal(await extension.getPortProperty({ id: "input", port: "OUT", property: "VALUE" }), 9);
  assert.equal(await extension.getPortProperty({ id: "input", port: "OUT", property: "WIDTH" }), 4);
  const structure = JSON.parse(await extension.getCircuitData({ kind: "STRUCTURE" }));
  const state = JSON.parse(await extension.getCircuitData({ kind: "STATE" }));
  const snapshot = JSON.parse(await extension.getCircuitData({ kind: "SNAPSHOT" }));
  assert.equal(structure.version, 1);
  assert.equal(structure.components[0].id, "input");
  assert.equal(state.components[0].pins.OUT, 9);
  assert.equal(snapshot.kind, "snapshot");
  extension.stopCore();
});

test("extension exposes paced settling and single-case validation blocks", async () => {
  const extension = new Bsen975LogicGateExtension();
  const info = extension.getInfo();
  const settleBlock = info.blocks.find((block) => block.opcode === "settleCircuit");
  const caseBlock = info.blocks.find((block) => block.opcode === "runValidationCase");
  const allBlock = info.blocks.find((block) => block.opcode === "runValidation");
  assert.equal(settleBlock.arguments.hz.defaultValue, 60);
  assert.equal(caseBlock.arguments.hz.defaultValue, 60);
  assert.equal(allBlock.arguments.hz.defaultValue, 60);

  extension.startCore();
  await extension.registerComponent({ dependency: "NONE", id: "input", type: "LEVEL_INPUT", width: 1 });
  await extension.registerComponent({ dependency: "NONE", id: "output", type: "LEVEL_OUTPUT", width: 1 });
  await extension.createNamedLine({
    lineId: "test-wire", id1: "input", port1: "OUT", id2: "output", port2: "IN"
  });
  assert.equal(JSON.parse(await extension.getLineInfo({ lineId: "test-wire" })).id, "test-wire");
  assert.equal(JSON.parse(await extension.getLines()).length, 1);
  await extension.loadLevelData({
    inputs: '[{"input":0},{"input":1}]',
    expected: '[{"output":0},{"output":1}]',
    mode: "RESET"
  });
  await extension.runValidationCase({ caseNumber: 2, hz: 0 });
  const result = JSON.parse(extension.getValidationResult());
  assert.equal(result.passed, true);
  assert.equal(result.caseNumber, 2);
  assert.equal(result.total, 1);
  await extension.runValidation();
  assert.equal(JSON.parse(extension.getValidationResult()).total, 2);
  extension.stopCore();
});

test("local controller serializes asynchronous operations", async () => {
  const controller = new LogicCoreController();
  const events = [];
  controller.localSimulator = {
    async slow() {
      events.push("slow:start");
      await Promise.resolve();
      events.push("slow:end");
    },
    fast() {
      events.push("fast");
    }
  };

  await Promise.all([controller.call("slow"), controller.call("fast")]);
  assert.deepEqual(events, ["slow:start", "slow:end", "fast"]);
  controller.stop();
});

test("every visible block has an extension implementation", () => {
  const extension = new Bsen975LogicGateExtension();
  const info = extension.getInfo();
  const blocks = info.blocks.filter((block) => block.opcode);
  const buttons = info.blocks.filter((block) => block.func);

  assert.equal(info.name, "BSEN975 Circuit Simulator");
  assert.ok(blocks.length > 20);
  for (const block of blocks) {
    assert.equal(typeof extension[block.opcode], "function", `missing opcode ${block.opcode}`);
  }
  assert.ok(blocks.some((block) => block.opcode === "getPortProperty"));
  assert.ok(blocks.some((block) => block.opcode === "getCircuitData"));
  assert.ok(blocks.every((block) => !block.hideFromPalette));
  for (const removedOpcode of ["operateConnection", "getPort", "getPortWidth", "exportCircuit", "getGraph"]) {
    assert.equal(blocks.some((block) => block.opcode === removedOpcode), false);
    assert.equal(typeof extension[removedOpcode], "undefined");
  }
  assert.ok(buttons.some((button) => button.text === "Open User Guide" && button.func === "openUserGuide"));
  for (const button of buttons) {
    assert.equal(typeof extension[button.func], "function", `missing button handler ${button.func}`);
  }

  const componentTypes = info.menus.componentTypes.items;
  assert.ok(componentTypes.every((item) => typeof item === "string"));
  assert.deepEqual([...componentTypes].sort(), Object.keys(COMPONENT_DEFINITIONS).sort());
});

test("Simplified Chinese UI uses translations while component types stay canonical", async (context) => {
  const originalScratch = globalThis.Scratch;
  let localeTable = {};
  const translate = ({ id, default: defaultText }) => localeTable[id] || defaultText;
  translate.setup = (locales) => { localeTable = locales["zh-cn"]; };
  const stage = { id: "stage", isOriginal: true, isStage: true, getName: () => undefined };
  const sprite = { id: "sprite", isOriginal: true, getName: () => undefined, sprite: { name: "角色1" } };
  globalThis.Scratch = {
    translate,
    vm: { runtime: { targets: [stage, sprite], on: () => {} } }
  };
  context.after(() => { globalThis.Scratch = originalScratch; });

  const extension = new Bsen975LogicGateExtension();
  const info = extension.getInfo();
  assert.equal(info.name, "BSEN975 电路模拟器");
  assert.ok(info.blocks.some((block) => block.text === "打开使用指南" && block.func === "openUserGuide"));
  assert.ok(info.blocks.some((block) => block.text === "=== 电路搭建 ==="));
  assert.ok(info.blocks.some((block) => block.text === "启动电路模拟器"));
  assert.ok(info.blocks.some((block) => block.text.includes("连接线路 ID [lineId]")));
  assert.ok(info.blocks.some((block) => block.text === "全部线路 JSON"));
  const dependencyMenu = extension.getDependencyMenu();
  assert.ok(dependencyMenu.some((item) => item.text === "舞台"));
  assert.ok(dependencyMenu.some((item) => item.text === "角色1"));

  const gateTypes = new Set([
    "NOT", "AND", "OR", "NAND", "NOR", "XOR", "XNOR", "MUX", "AOI", "OAI",
    "3AND", "3OR", "3NAND", "3NOR", "3XOR", "3XNOR",
    "4AND", "4OR", "4NAND", "4NOR", "4XOR", "4XNOR"
  ]);
  for (const item of info.menus.componentTypes.items) {
    const value = typeof item === "string" ? item : item.value;
    if (!gateTypes.has(value)) continue;
    const text = typeof item === "string" ? item : item.text;
    assert.equal(text, value);
  }

  extension.startCore();
  await extension.registerComponent({ dependency: "NONE", id: "bad", type: "UNKNOWN", width: 1 });
  assert.equal(extension.getLastError(), "未知元件类型: UNKNOWN");
  await extension.registerComponent({ dependency: "NONE", id: "left", type: "LEVEL_INPUT", width: 1 });
  await extension.registerComponent({ dependency: "NONE", id: "right", type: "LEVEL_INPUT", width: 1 });
  await extension.createNamedLine({
    lineId: "方向错误", id1: "left", port1: "OUT", id2: "right", port2: "OUT"
  });
  assert.match(extension.getLastError(), /^端口方向不兼容:/);
  extension.stopCore();
});

test("user guide button creates and closes an offline guide dialog", (context) => {
  const originalDocument = globalThis.document;

  class FakeElement {
    constructor(tagName, ownerDocument) {
      this.tagName = tagName.toUpperCase();
      this.ownerDocument = ownerDocument;
      this.children = [];
      this.style = {};
      this.listeners = new Map();
      this.attributes = new Map();
      this.parentNode = null;
      this.textContent = "";
      this.id = "";
    }

    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }

    append(...children) {
      for (const child of children) this.appendChild(child);
    }

    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    }

    addEventListener(name, handler) {
      if (!this.listeners.has(name)) this.listeners.set(name, []);
      this.listeners.get(name).push(handler);
    }

    dispatch(name, event = {}) {
      for (const handler of this.listeners.get(name) || []) handler({ target: this, ...event });
    }

    showModal() {
      this.open = true;
    }

    close() {
      this.open = false;
      this.dispatch("close");
    }

    remove() {
      if (!this.parentNode) return;
      this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
      this.parentNode = null;
    }

    getBoundingClientRect() {
      return { left: 100, right: 700, top: 100, bottom: 700 };
    }
  }

  const fakeDocument = {
    body: null,
    createElement(tagName) { return new FakeElement(tagName, this); },
    getElementById(id) {
      const visit = (element) => {
        if (element.id === id) return element;
        for (const child of element.children) {
          const match = visit(child);
          if (match) return match;
        }
        return null;
      };
      return visit(this.body);
    }
  };
  fakeDocument.body = new FakeElement("body", fakeDocument);
  globalThis.document = fakeDocument;
  context.after(() => { globalThis.document = originalDocument; });

  const extension = new Bsen975LogicGateExtension();
  assert.equal(extension.openUserGuide(), "");
  const dialog = fakeDocument.getElementById("bsen975-logic-gate-guide");
  assert.ok(dialog);
  assert.equal(dialog.open, true);
  const allText = (element) => element.textContent + element.children.map(allText).join("");
  assert.match(allText(dialog), /Circuit Simulator User Guide/);
  assert.match(allText(dialog), /input\.OUT/);
  assert.match(allText(dialog), /Component Pin Reference/);
  assert.match(allText(dialog), /Block Behavior and Results/);
  assert.match(allText(dialog), /REGISTER/);
  assert.match(allText(dialog), /D\/Q: 8; CLK: 1/);

  const closeButton = dialog.children
    .flatMap((child) => child.children)
    .find((child) => child.tagName === "BUTTON");
  assert.ok(closeButton);
  closeButton.dispatch("click");
  assert.equal(fakeDocument.getElementById("bsen975-logic-gate-guide"), null);
});
