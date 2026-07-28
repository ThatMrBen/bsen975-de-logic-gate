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

test("disconnected inputs return to zero", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("input", "LEVEL_INPUT");
  simulator.addComponent("output", "LEVEL_OUTPUT");
  simulator.connect("input", "OUT", "output", "IN");
  simulator.setPort("input", "OUT", 1);
  simulator.tick();

  simulator.disconnect("input", "OUT", "output", "IN");

  assert.equal(simulator.getPort("output", "IN"), 0);
});

test("a second driver is rejected without changing the graph", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("a", "LEVEL_INPUT");
  simulator.addComponent("b", "LEVEL_INPUT");
  simulator.addComponent("output", "LEVEL_OUTPUT");
  simulator.connect("a", "OUT", "output", "IN");

  assert.throws(
    () => simulator.connect("b", "OUT", "output", "IN"),
    (error) => error instanceof CircuitError && /多个驱动端/.test(error.message)
  );
  assert.deepEqual(simulator.exportGraph().connections, [
    { from: "a.OUT", to: "output.IN" }
  ]);
  assert.doesNotThrow(() => simulator.tick());
});

test("one driver can still fan out to multiple inputs", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("input", "LEVEL_INPUT");
  simulator.addComponent("left", "LEVEL_OUTPUT");
  simulator.addComponent("right", "LEVEL_OUTPUT");
  simulator.connect("input", "OUT", "left", "IN");
  simulator.connect("input", "OUT", "right", "IN");
  simulator.setPort("input", "OUT", 1);
  simulator.tick();

  assert.equal(simulator.getPort("left", "IN"), 1);
  assert.equal(simulator.getPort("right", "IN"), 1);
});

test("validation handles prototype-sensitive component IDs", async () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("input", "LEVEL_INPUT");
  simulator.addComponent("__proto__", "LEVEL_OUTPUT");
  simulator.connect("input", "OUT", "__proto__", "IN");

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
    simulator.connect(previous, "OUT", id, "A");
    previous = id;
  }
  simulator.addComponent("output", "LEVEL_OUTPUT");
  simulator.connect(previous, "OUT", "output", "IN");
  simulator.setPort("input", "OUT", 1);

  assert.doesNotThrow(() => simulator.tick());
  assert.equal(simulator.getPort("output", "IN"), 1);
});

test("a real feedback oscillator is still rejected", () => {
  const simulator = new TuringSimulator();
  simulator.addComponent("not", "NOT");
  simulator.connect("not", "OUT", "not", "A");

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
  simulator.connect("data", "OUT", "register", "D");
  simulator.connect("clock", "OUT", "register", "CLK");
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
  simulator.connect("input", "OUT", "not", "A");
  const exported = simulator.exportCircuit();

  const restored = new TuringSimulator();
  restored.importCircuit(JSON.stringify(exported));
  assert.deepEqual(restored.exportCircuit(), exported);

  assert.throws(() => restored.importCircuit({
    version: 1,
    components: [{ id: "only", type: "NOT" }],
    connections: [{ from: "only.OUT", to: "missing.IN" }]
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
  simulator.connect("data", "OUT", "register", "D");
  simulator.connect("clock", "OUT", "register", "CLK");
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
  source.connect("data", "OUT", "register", "D");
  source.connect("clock", "OUT", "register", "CLK");
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
  simulator.connect("input", "OUT", "output", "IN");
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
    simulator.connect("data", "OUT", "register", "D");
    simulator.connect("clock", "OUT", "register", "CLK");
    simulator.connect("register", "Q", "output", "IN");
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
  simulator.connect("input", "OUT", "output", "IN");
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
  simulator.connect("source", "OUT", "output", "IN");
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
  simulator.connect("input", "OUT", "and", "A");
  simulator.connect("and", "OUT", "output", "IN");

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
  await extension.getPort({ id: "missing", port: "OUT" });
  assert.equal(extension.getLastError(), "The circuit simulator is not running");
  extension.startCore();
  await extension.registerComponent({ dependency: "NONE", id: "bad", type: "UNKNOWN", width: 1 });
  assert.equal(extension.getLastError(), "Unknown component type: UNKNOWN");
  await extension.registerComponent({ dependency: "NONE", id: "badWidth", type: "AND", width: 3 });
  assert.equal(extension.getLastError(), "Component width must be 1, 2, 4, or 8: 3");
  await extension.registerComponent({ dependency: "NONE", id: "one", type: "LEVEL_INPUT", width: 1 });
  await extension.registerComponent({ dependency: "NONE", id: "four", type: "AND", width: 4 });
  await extension.operateConnection({ action: "CONNECT", id1: "one", port1: "OUT", id2: "four", port2: "A" });
  assert.match(extension.getLastError(), /^Port width mismatch:/);
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
  await extension.operateConnection({
    action: "CONNECT", id1: "input", port1: "OUT", id2: "output", port2: "IN"
  });
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
  const visibleBlocks = blocks.filter((block) => !block.hideFromPalette);
  const buttons = info.blocks.filter((block) => block.func);

  assert.equal(info.name, "BSEN975 Circuit Simulator");
  assert.ok(blocks.length > 20);
  for (const block of blocks) {
    assert.equal(typeof extension[block.opcode], "function", `missing opcode ${block.opcode}`);
  }
  assert.ok(visibleBlocks.some((block) => block.opcode === "getPortProperty"));
  assert.ok(visibleBlocks.some((block) => block.opcode === "getCircuitData"));
  for (const legacyOpcode of ["getPort", "getPortWidth", "exportCircuit", "getGraph"]) {
    const legacyBlock = blocks.find((block) => block.opcode === legacyOpcode);
    assert.equal(legacyBlock.hideFromPalette, true, `${legacyOpcode} must stay registered but hidden`);
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
