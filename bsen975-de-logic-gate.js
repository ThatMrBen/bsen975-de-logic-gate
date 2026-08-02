/*
 * bsen975-de-logic-gate / TuringSimulator engine
 *
 * A dependency-free digital circuit simulator and Gandi/TurboWarp extension.
 * Signals use explicit port widths (1, 2, 4, or 8 bits). This keeps the
 * execution model deterministic and makes wiring mistakes fail early.
 */
(function (root) {
  "use strict";

  const MAX_PROPAGATION_ITERATIONS = 100;
  const EXTENSION_ID = "bsen975DeLogicGate";
  const EXTENSION_SIDEBAR_ICON_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAQPSURBVHhe7Zo7bNNQFIYzMrKAYzehjDAV7JangIJAFCqqgngUUQESA2xlQGrtAuElIlLRVmWALiDBAEgIFlQQC3SqhBBMgBiADdg6Ml50Gl3LOX6dazvxtckv/VLrmzg+n+859j12odBWW221VSgUtB5rXWdXZTne/t9IMcwrim7+VXTzrtI1uhqP514AoGhYzLZuvVCM8V78udzKBcC2uaB0m0P487mTPwDbP1V97Hxu6wQBAJ8Ri0VjfCp3dQIDUDde8ggeWbcer9StTXhfmRQG0LHvJisPTTFt93VW7B53B9/gHNQJLwCrTt1ZcvnE9NL/6oYwEBmuE0EAbJ+cYaUDt5i6OSw9MlgnSAAcLh+cYNr2qx7BI2elTogCsEEcm6zXCRw4tm69VQ1zEP+uNIoKwAYBdaKPVieKhnWuc0dlGT6GVBUXgG2ROqFb1RU9F4r4WFJRYgAcJtcJw3wAq1F8TC1VMwBwl45MMm2X5HWimQC4y8enWcdeSetEKwDYHp5hpf6qXHWipQAcLg3WmLat4hE8dpPrRFoAuFOvE2kD4KbWCUW3viq6dTqxOiELANvDM6xjfzV8Wa5bv+HYY9cJCgCuiw/fNWzvrzxd2v76w/eG7WvP3mO1Zwvsx59F+7vwmTPTL137hu1Bmpv/4g7eYWjoQp1QDXMNjo0kEQAgCC4IAIy///ar4TtOzc59FAIA46XDt5m285oreGzFsF4V14/14RgDJQrAGYAXABgHAQQY51BGZt/Y+zhafe76DTDMMBCeadxQJ7Q9N0IbNUJ1QgQAn9I8MAwAAuXqHX3k2g8P8Mn8Z9eYc9wPgO0k64QIAB4wnF3YjgHgcezukfv2vvAYmAzA4dJAjWlbg+8nAuuECAD4G84eCKa0HwBcFP32hR0FADfUCbU3Qp0QBeA8i5DLIAzAbwZAWjj3hR0HADc0dNUtl12BY0cGAOYHymuCaA3wmyGxAEA/YqBGCL6+zogFAIyv8Xw7vwqAeLXHVwGv+wFwFAB25zqsIPqtNKMC4NMfFOc+wGkRAORnF2FriKgAwPwmBk9pgABBOGcJQPE789wUAOVDE6RiR15FUgCkbsH8DrzuY0kNAG54iPkd+cmUjACot7yJPJuUCQB10ZPoUycZAFBuZ5v23DE1AAILmsj5TVGrAZDzWzc/wZIWH2/iahUAgfxu7VtqzQZAaX+n+p5iUwBQH4DUGxZjTctvipIEQG1ttyy/KUoCAPXhhqsZIYPiAKDmt287SgYJAxDL7+CGpAyiAqC+CiPUkpZBYQCoL0NJmd8U+QHI1GsucYQBQNCh+R2l8SCrMIAQezcWsywSgLDGYpYVDCDj+U2RG0C98ZCL/KbIASB6YzHLgqZi7MZiW221lTX9A92+2qVddVwJAAAAAElFTkSuQmCC";
  const EXTENSION_ICON_URI = "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSI0Ny43MjU2NyIgaGVpZ2h0PSIzNi4yNzQ2MiIgdmlld0JveD0iMCwwLDQ3LjcyNTY3LDM2LjI3NDYyIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMjk2LjE1MTc5LC0xNjEuODYxNDYpIj48ZyBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiPjxwYXRoIGQ9Ik0yOTcuMTUxNzksMTk2LjY4NzV2LTMzLjM3NWw0My45MTA3MSwxNi43MjczM3oiIGZpbGw9IiMxZTVmOTMiIHN0cm9rZT0iIzE4MzM3YSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzAwLjI2MTE2LDE4NC41MjEzNikgc2NhbGUoMC4zMDc1OSwwLjMwNzU5KSIgZm9udC1zaXplPSI0MCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjEiIGZvbnQtZmFtaWx5PSJTYW5zIFNlcmlmIiBmb250LXdlaWdodD0iNDAwIiB0ZXh0LWFuY2hvcj0ic3RhcnQiPjx0c3BhbiB4PSIwIiBkeT0iMCI+Tk9UPC90c3Bhbj48L3RleHQ+PC9nPjwvZz48L3N2Zz4=";
  const EXTENSION_COVER_URI = "data:image/png;base64,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";

  class LogicOscillationError extends Error {
    constructor(message = "逻辑震荡", englishMessage = "Logic oscillation") {
      super(message);
      this.name = "LogicOscillationError";
      this.englishMessage = englishMessage;
    }
  }

  class CircuitError extends Error {
    constructor(message, englishMessage = message) {
      super(message);
      this.name = "CircuitError";
      this.englishMessage = englishMessage;
    }
  }

  function englishErrorLabel(label) {
    return ({
      "验证输入数据": "Validation input data",
      "验证期望数据": "Validation expected data",
      "输入数据": "Input data",
      "ROM 数据": "ROM data",
      "端口列表": "Port list",
      "电路数据": "Circuit data",
      "连线起点": "Connection start",
      "连线终点": "Connection end",
      "端口": "Port",
      "输入": "input",
      "期望输出": "expected output"
    })[label] || label;
  }

  const input = (width) => ({ direction: "input", width });
  const output = (width) => ({ direction: "output", width });
  const passive = () => ({ direction: "passive", width: null });

  function gatePorts(count) {
    const ports = {};
    for (let index = 0; index < count; index++) ports[String.fromCharCode(65 + index)] = input(1);
    ports.OUT = output(1);
    return ports;
  }

  function splitterPorts(width) {
    const ports = { IN: input(width) };
    for (let bit = 0; bit < width; bit++) ports[`B${bit}`] = output(1);
    return ports;
  }

  function hubPorts(width) {
    const ports = {};
    for (let bit = 0; bit < width; bit++) ports[`B${bit}`] = input(1);
    ports.OUT = output(width);
    return ports;
  }

  function converterPorts(inputCount, outputCount, totalWidth) {
    const ports = {};
    const inputWidth = totalWidth / inputCount;
    const outputWidth = totalWidth / outputCount;
    for (let index = 0; index < inputCount; index++) ports[`IN${index}`] = input(inputWidth);
    for (let index = 0; index < outputCount; index++) ports[`OUT${index}`] = output(outputWidth);
    return ports;
  }

  function converterDefinition(inputCount, outputCount, totalWidth = 8) {
    return {
      ports: converterPorts(inputCount, outputCount, totalWidth),
      combinational: true,
      converter: { inputCount, outputCount, totalWidth }
    };
  }

  // Fixed ports declare a width; passive VIA ports derive it from their current net.
  const COMPONENT_DEFINITIONS = Object.freeze({
    INPUT: { ports: { OUT: output(1) }, external: "OUT" },
    OUTPUT: { ports: { IN: input(1) }, observed: "IN" },
    LEVEL_INPUT: { ports: { OUT: output(1) }, external: "OUT" },
    LEVEL_OUTPUT: { ports: { IN: input(1) }, observed: "IN" },
    VIA: { ports: { IO: passive() }, autoWidth: true },
    SWITCH: { ports: { A: input(1), S: input(1), OUT: output(1) }, combinational: true },
    ALWAYS_ON: { ports: { OUT: output(1) }, combinational: true },
    ALWAYS_OFF: { ports: { OUT: output(1) }, combinational: true },
    BUS2_INPUT: { ports: { OUT: output(2) }, external: "OUT" },
    BUS2_OUTPUT: { ports: { IN: input(2) }, observed: "IN" },
    BUS4_INPUT: { ports: { OUT: output(4) }, external: "OUT" },
    BUS4_OUTPUT: { ports: { IN: input(4) }, observed: "IN" },
    BUS_INPUT: { ports: { OUT: output(8) }, external: "OUT" },
    BUS_OUTPUT: { ports: { IN: input(8) }, observed: "IN" },
    NAND: { ports: { A: input(1), B: input(1), OUT: output(1) }, combinational: true },
    AND: { ports: { A: input(1), B: input(1), OUT: output(1) }, combinational: true },
    OR: { ports: { A: input(1), B: input(1), OUT: output(1) }, combinational: true },
    XOR: { ports: { A: input(1), B: input(1), OUT: output(1) }, combinational: true },
    NOT: { ports: { A: input(1), OUT: output(1) }, combinational: true },
    NOR: { ports: { A: input(1), B: input(1), OUT: output(1) }, combinational: true },
    XNOR: { ports: { A: input(1), B: input(1), OUT: output(1) }, combinational: true },
    HALF_ADDER: {
      ports: { A: input(1), B: input(1), SUM: output(1), CARRY: output(1) },
      combinational: true
    },
    FULL_ADDER: {
      ports: { A: input(1), B: input(1), CIN: input(1), SUM: output(1), COUT: output(1) },
      combinational: true
    },
    MUX: { ports: { A: input(1), B: input(1), SEL: input(1), OUT: output(1) }, combinational: true },
    AOI: { ports: { A: input(1), B: input(1), C: input(1), OUT: output(1) }, combinational: true },
    OAI: { ports: { A: input(1), B: input(1), C: input(1), OUT: output(1) }, combinational: true },
    "3AND": { ports: gatePorts(3), combinational: true },
    "3OR": { ports: gatePorts(3), combinational: true },
    "3NAND": { ports: gatePorts(3), combinational: true },
    "3NOR": { ports: gatePorts(3), combinational: true },
    "3XOR": { ports: gatePorts(3), combinational: true },
    "3XNOR": { ports: gatePorts(3), combinational: true },
    "4AND": { ports: gatePorts(4), combinational: true },
    "4OR": { ports: gatePorts(4), combinational: true },
    "4NAND": { ports: gatePorts(4), combinational: true },
    "4NOR": { ports: gatePorts(4), combinational: true },
    "4XOR": { ports: gatePorts(4), combinational: true },
    "4XNOR": { ports: gatePorts(4), combinational: true },
    ADDER4: {
      ports: { A: input(4), B: input(4), CIN: input(1), SUM: output(4), COUT: output(1) },
      combinational: true
    },
    ADDER8: {
      ports: { A: input(8), B: input(8), CIN: input(1), SUM: output(8), COUT: output(1) },
      combinational: true
    },
    REGISTER: {
      ports: { D: input(8), CLK: input(1), Q: output(8) },
      sequential: true
    },
    DELAY: { ports: { IN: input(1), OUT: output(1) }, sequential: true },
    SPLITTER: {
      ports: {
        IN: input(8), B0: output(1), B1: output(1), B2: output(1), B3: output(1),
        B4: output(1), B5: output(1), B6: output(1), B7: output(1)
      },
      combinational: true
    },
    HUB: {
      ports: {
        B0: input(1), B1: input(1), B2: input(1), B3: input(1),
        B4: input(1), B5: input(1), B6: input(1), B7: input(1), OUT: output(8)
      },
      combinational: true
    },
    SPLITTER2: { ports: splitterPorts(2), combinational: true },
    HUB2: { ports: hubPorts(2), combinational: true },
    SPLITTER4: { ports: splitterPorts(4), combinational: true },
    HUB4: { ports: hubPorts(4), combinational: true },
    CONVERTER_2_TO_8: converterDefinition(2, 8),
    CONVERTER_8_TO_2: converterDefinition(8, 2),
    CONVERTER_4_TO_2: converterDefinition(4, 2),
    CONVERTER_2_TO_4: converterDefinition(2, 4),
    CONVERTER_4_TO_8: converterDefinition(4, 8),
    CONVERTER_8_TO_4: converterDefinition(8, 4),
    ROM: { ports: { ADDR: input(8), DATA: output(8) }, combinational: true, memory: true },
    RAM: {
      ports: { ADDR: input(8), DIN: input(8), WE: input(1), CLK: input(1), DOUT: output(8) },
      combinational: true,
      sequential: true,
      memory: true
    }
  });

  // These component ports can be instantiated as 1, 2, 4, or 8-bit buses.
  // Control pins such as Switch.S and MUX.SEL deliberately remain one bit.
  const SCALABLE_PORTS = Object.freeze({
    INPUT: ["OUT"], OUTPUT: ["IN"], LEVEL_INPUT: ["OUT"], LEVEL_OUTPUT: ["IN"],
    SWITCH: ["A", "OUT"], ALWAYS_ON: ["OUT"], ALWAYS_OFF: ["OUT"],
    NOT: ["A", "OUT"], DELAY: ["IN", "OUT"],
    NAND: ["A", "B", "OUT"], AND: ["A", "B", "OUT"], OR: ["A", "B", "OUT"],
    XOR: ["A", "B", "OUT"], NOR: ["A", "B", "OUT"], XNOR: ["A", "B", "OUT"],
    MUX: ["A", "B", "OUT"], AOI: ["A", "B", "C", "OUT"], OAI: ["A", "B", "C", "OUT"],
    "3AND": ["A", "B", "C", "OUT"], "3OR": ["A", "B", "C", "OUT"],
    "3NAND": ["A", "B", "C", "OUT"], "3NOR": ["A", "B", "C", "OUT"],
    "3XOR": ["A", "B", "C", "OUT"], "3XNOR": ["A", "B", "C", "OUT"],
    "4AND": ["A", "B", "C", "D", "OUT"], "4OR": ["A", "B", "C", "D", "OUT"],
    "4NAND": ["A", "B", "C", "D", "OUT"], "4NOR": ["A", "B", "C", "D", "OUT"],
    "4XOR": ["A", "B", "C", "D", "OUT"], "4XNOR": ["A", "B", "C", "D", "OUT"]
  });

  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  class TuringSimulator {
    constructor() {
      this.components = new Map();
      this.nets = new Map();
      this.endpointToNet = new Map();
      this.connections = new Map();
      this.connectionByEndpoints = new Map();
      this.validationInputs = new Set();
      this.validationOutputs = new Set();
      this.validationInputVectors = [];
      this.validationExpectedVectors = [];
      this.validationResetBeforeEachCase = false;
      this._nextNetId = 1;
      this._nextLineId = 1;
    }

    addComponent(id, type, width = 1) {
      const normalizedId = this._normalizeId(id);
      const requestedType = String(type).trim().toUpperCase();
      const normalizedType = requestedType;
      const baseDefinition = COMPONENT_DEFINITIONS[normalizedType];
      if (!baseDefinition) {
        throw new CircuitError(`未知元件类型: ${type}`, `Unknown component type: ${type}`);
      }
      if (this.components.has(normalizedId)) {
        throw new CircuitError(`元件 ID 已存在: ${normalizedId}`, `Component ID already exists: ${normalizedId}`);
      }

      const scalablePorts = SCALABLE_PORTS[normalizedType];
      let bitWidth = null;
      let definition = baseDefinition;
      if (scalablePorts) {
        bitWidth = Number(width);
        if (![1, 2, 4, 8].includes(bitWidth)) {
          throw new CircuitError(
            `元件位宽必须是 1、2、4 或 8: ${width}`,
            `Component width must be 1, 2, 4, or 8: ${width}`
          );
        }
        const ports = {};
        for (const [port, meta] of Object.entries(baseDefinition.ports)) ports[port] = { ...meta };
        for (const port of scalablePorts) ports[port].width = bitWidth;
        definition = { ...baseDefinition, ports };
      }

      const pins = new Map();
      for (const port of Object.keys(definition.ports)) pins.set(port, 0);

      const component = {
        id: normalizedId,
        type: normalizedType,
        bitWidth,
        definition,
        pins,
        ...(definition.ports.CLK ? { previousClock: 0 } : {}),
        memory: definition.memory ? new Uint8Array(256) : null
      };
      this.components.set(normalizedId, component);
      if (normalizedType === "LEVEL_INPUT") this.validationInputs.add(normalizedId);
      if (normalizedType === "LEVEL_OUTPUT") this.validationOutputs.add(normalizedId);
      return component;
    }

    createLine(lineId, id1, port1, id2, port2) {
      const first = this._getEndpoint(id1, port1);
      const second = this._getEndpoint(id2, port2);
      if (first.key === second.key) {
        throw new CircuitError(
          `线路不能将端口连接到自身: ${first.key}`,
          `A line cannot connect a port to itself: ${first.key}`
        );
      }

      let normalizedLineId = this._normalizeLineId(lineId, true);
      if (normalizedLineId && this.connections.has(normalizedLineId)) {
        throw new CircuitError(
          `线路 ID 已存在: ${normalizedLineId}`,
          `Line ID already exists: ${normalizedLineId}`
        );
      }

      const key = this._connectionKey(first.key, second.key);
      if (this.connectionByEndpoints.has(key)) {
        throw new CircuitError(
          `两个端口之间已存在线路: ${first.key} 与 ${second.key}`,
          `A line already exists between ports: ${first.key} and ${second.key}`
        );
      }

      const hasPassivePort = first.meta.direction === "passive" || second.meta.direction === "passive";
      if (!hasPassivePort && first.meta.direction === second.meta.direction) {
        throw new CircuitError(
          `端口方向不兼容: ${first.key}(${first.meta.direction}) 与 ${second.key}(${second.meta.direction})`,
          `Incompatible port directions: ${first.key}(${first.meta.direction}) and ${second.key}(${second.meta.direction})`
        );
      }

      const mergedEndpoints = new Set([first.key, second.key]);
      for (const endpoint of [first, second]) {
        const netId = this.endpointToNet.get(endpoint.key);
        const net = netId && this.nets.get(netId);
        if (net) for (const member of net.endpoints) mergedEndpoints.add(member);
      }
      const widthExamples = new Map();
      for (const endpointKey of mergedEndpoints) {
        const endpoint = this._getEndpointByKey(endpointKey);
        if (endpoint.meta.width == null || widthExamples.has(endpoint.meta.width)) continue;
        widthExamples.set(endpoint.meta.width, endpoint.key);
      }
      if (widthExamples.size > 1) {
        const [[firstWidth, firstKey], [secondWidth, secondKey]] = Array.from(widthExamples.entries());
        throw new CircuitError(
          `端口位宽不匹配: ${firstKey}(${firstWidth}) 与 ${secondKey}(${secondWidth})`,
          `Port width mismatch: ${firstKey}(${firstWidth}) and ${secondKey}(${secondWidth})`
        );
      }
      const drivers = Array.from(mergedEndpoints, (endpointKey) => this._getEndpointByKey(endpointKey))
        .filter((endpoint) => endpoint.meta.direction === "output");
      if (drivers.length > 1) {
        const driverList = drivers.map((item) => item.key).join(", ");
        throw new CircuitError(
          `连接会产生多个驱动端: ${driverList}`,
          `Connection would create multiple drivers: ${driverList}`
        );
      }

      if (!normalizedLineId) normalizedLineId = this._generateLineId();
      this.connections.set(normalizedLineId, {
        id: normalizedLineId,
        first: first.key,
        second: second.key
      });
      this.connectionByEndpoints.set(key, normalizedLineId);
      this._rebuildNets();
      return normalizedLineId;
    }

    removeLine(lineId) {
      const normalizedLineId = this._normalizeLineId(lineId);
      if (!this.connections.has(normalizedLineId)) {
        throw new CircuitError(
          `线路不存在: ${normalizedLineId}`,
          `Line does not exist: ${normalizedLineId}`
        );
      }
      this._deleteLine(normalizedLineId);
      this._rebuildNets();
      return true;
    }

    mergeViaIntoPort(viaId, targetId, targetPort) {
      const via = this._getComponent(viaId);
      if (via.type !== "VIA") {
        throw new CircuitError(
          `元件不是 VIA: ${via.id}`,
          `Component is not a VIA: ${via.id}`
        );
      }
      const viaKey = `${via.id}.IO`;
      const target = this._getEndpoint(targetId, targetPort);
      if (target.key === viaKey) {
        throw new CircuitError(
          `VIA 不能合并到自身端口: ${viaKey}`,
          `A VIA cannot be merged into its own port: ${viaKey}`
        );
      }

      const rewiredLineIds = [];
      const removedLineIds = [];
      const proposedConnections = [];
      for (const connection of this.connections.values()) {
        const viaIsFirst = connection.first === viaKey;
        const viaIsSecond = connection.second === viaKey;
        if (!viaIsFirst && !viaIsSecond) {
          proposedConnections.push({ id: connection.id, from: connection.first, to: connection.second });
          continue;
        }

        const otherKey = viaIsFirst ? connection.second : connection.first;
        if (otherKey === target.key) {
          removedLineIds.push(connection.id);
          continue;
        }
        rewiredLineIds.push(connection.id);
        proposedConnections.push({
          id: connection.id,
          from: viaIsFirst ? target.key : connection.first,
          to: viaIsSecond ? target.key : connection.second
        });
      }

      // Build and validate the complete candidate before touching the live simulator.
      const replacement = new TuringSimulator();
      replacement.importCircuit({
        version: 1,
        components: Array.from(this.components.values())
          .filter((component) => component.id !== via.id)
          .map((component) => ({
            id: component.id,
            type: component.type,
            width: component.definition.autoWidth ? 0 : component.bitWidth == null ? 1 : component.bitWidth
          })),
        connections: proposedConnections
      });

      // Preserve runtime state while applying the same zeroing rules as a normal net rebuild.
      for (const [id, component] of replacement.components) {
        const current = this.components.get(id);
        for (const [port, meta] of Object.entries(component.definition.ports)) {
          const endpointKey = `${id}.${port}`;
          const netId = replacement.endpointToNet.get(endpointKey);
          const net = netId && replacement.nets.get(netId);
          const hasDriver = net && Array.from(net.endpoints).some((key) => (
            replacement._getEndpointByKey(key).meta.direction === "output"
          ));
          if (meta.direction === "output" || hasDriver) component.pins.set(port, current.pins.get(port));
        }
        if (own(component, "previousClock")) component.previousClock = current.previousClock;
        if (component.memory) component.memory.set(current.memory);
      }

      const validationInputVectors = this.validationInputVectors;
      const validationExpectedVectors = this.validationExpectedVectors;
      const validationResetBeforeEachCase = this.validationResetBeforeEachCase;
      const nextLineId = this._nextLineId;
      this._adoptSimulator(replacement);
      this.validationInputVectors = validationInputVectors;
      this.validationExpectedVectors = validationExpectedVectors;
      this.validationResetBeforeEachCase = validationResetBeforeEachCase;
      this._nextLineId = nextLineId;
      return { viaId: via.id, target: target.key, rewiredLineIds, removedLineIds };
    }

    getLineInfo(lineId) {
      const normalizedLineId = this._normalizeLineId(lineId);
      const connection = this.connections.get(normalizedLineId);
      if (!connection) {
        throw new CircuitError(
          `线路不存在: ${normalizedLineId}`,
          `Line does not exist: ${normalizedLineId}`
        );
      }
      return this._lineInfo(connection);
    }

    getLines() {
      return Array.from(this.connections.values(), (connection) => this._lineInfo(connection));
    }

    clear() {
      this.components.clear();
      this.nets.clear();
      this.endpointToNet.clear();
      this.connections.clear();
      this.connectionByEndpoints.clear();
      this.validationInputs.clear();
      this.validationOutputs.clear();
      this.validationInputVectors = [];
      this.validationExpectedVectors = [];
      this.validationResetBeforeEachCase = false;
      this._nextNetId = 1;
      this._nextLineId = 1;
      return this;
    }

    resetState() {
      for (const component of this.components.values()) {
        for (const port of component.pins.keys()) component.pins.set(port, 0);
        if (own(component, "previousClock")) component.previousClock = 0;
        if (component.type === "RAM") component.memory.fill(0);
      }
      for (const net of this.nets.values()) net.value = 0;
      this._settleCombinational();
      return this;
    }

    removeComponent(id) {
      const component = this._getComponent(id);
      const prefix = `${component.id}.`;
      for (const [lineId, connection] of this.connections) {
        if (connection.first.startsWith(prefix) || connection.second.startsWith(prefix)) {
          this._deleteLine(lineId);
        }
      }
      this.components.delete(component.id);
      this.validationInputs.delete(component.id);
      this.validationOutputs.delete(component.id);
      this._rebuildNets();
      return true;
    }

    getComponentIds() {
      return Array.from(this.components.keys());
    }

    getPortDefinitions(id) {
      const component = this._getComponent(id);
      return Object.entries(component.definition.ports).map(([name, meta]) => ({
        name,
        direction: meta.direction,
        width: this._getEndpointWidth(this._getEndpoint(component.id, name)),
        value: component.pins.get(name),
        connected: this.endpointToNet.has(`${component.id}.${name}`)
      }));
    }

    getPortWidth(id, port) {
      return this._getEndpointWidth(this._getEndpoint(id, port));
    }

    setComponentWidth(id, width) {
      const component = this._getComponent(id);
      const scalablePorts = SCALABLE_PORTS[component.type];
      if (!scalablePorts) {
        throw new CircuitError(
          `元件类型不支持修改位宽: ${component.type}`,
          `Component type does not support width changes: ${component.type}`
        );
      }
      const bitWidth = Number(width);
      if (![1, 2, 4, 8].includes(bitWidth)) {
        throw new CircuitError(
          `元件位宽必须是 1、2、4 或 8: ${width}`,
          `Component width must be 1, 2, 4, or 8: ${width}`
        );
      }
      if (component.bitWidth === bitWidth) return { width: bitWidth, disconnected: [] };

      const scalableSet = new Set(scalablePorts);
      const disconnected = [];
      for (const [lineId, connection] of this.connections) {
        const first = this._getEndpointByKey(connection.first);
        const second = this._getEndpointByKey(connection.second);
        const changedEndpoint = first.component === component && scalableSet.has(first.port)
          ? first
          : second.component === component && scalableSet.has(second.port) ? second : null;
        if (!changedEndpoint) continue;
        const otherKey = changedEndpoint === first ? second.key : first.key;
        const otherWidths = new Set();
        for (const endpointKey of this._connectedEndpointKeys(otherKey, lineId)) {
          const endpoint = this._getEndpointByKey(endpointKey);
          const endpointWidth = endpoint.component === component && scalableSet.has(endpoint.port)
            ? bitWidth
            : endpoint.meta.width;
          if (endpointWidth != null) otherWidths.add(endpointWidth);
        }
        if (otherWidths.size === 0 || (otherWidths.size === 1 && otherWidths.has(bitWidth))) continue;
        disconnected.push({ id: connection.id, from: connection.first, to: connection.second });
        this._deleteLine(lineId);
      }

      const ports = {};
      for (const [port, meta] of Object.entries(component.definition.ports)) {
        ports[port] = { ...meta, width: scalableSet.has(port) ? bitWidth : meta.width };
      }
      component.bitWidth = bitWidth;
      component.definition = { ...component.definition, ports };
      for (const [port, meta] of Object.entries(ports)) {
        const maximum = (2 ** meta.width) - 1;
        component.pins.set(port, component.pins.get(port) & maximum);
      }
      this._rebuildNets();
      return { width: bitWidth, disconnected };
    }

    setPort(id, port, value) {
      const endpoint = this._getEndpoint(id, port);
      const externalPort = endpoint.component.definition.external;
      if (externalPort !== endpoint.port) {
        throw new CircuitError(
          `端口不可由外部写入: ${endpoint.key}`,
          `Port cannot be written externally: ${endpoint.key}`
        );
      }
      endpoint.component.pins.set(endpoint.port, this._normalizeSignal(value, endpoint.meta.width, endpoint.key));
      return this;
    }

    setInputs(values) {
      if (!values || typeof values !== "object" || Array.isArray(values)) {
        throw new CircuitError(
          "输入向量必须是以元件 ID 为键的对象",
          "The input vector must be an object keyed by component ID"
        );
      }
      const updates = [];
      for (const [id, value] of Object.entries(values)) {
        const component = this._getComponent(id);
        const port = component.definition.external;
        if (!port) throw new CircuitError(`元件不是输入端: ${id}`, `Component is not an input: ${id}`);
        updates.push({
          component,
          port,
          value: this._normalizeSignal(value, component.definition.ports[port].width, `${component.id}.${port}`)
        });
      }
      for (const update of updates) update.component.pins.set(update.port, update.value);
      return this;
    }

    getPort(id, port) {
      return this._getEndpoint(id, port).component.pins.get(String(port).trim().toUpperCase());
    }

    readPorts(portList) {
      let parsed = portList;
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); }
        catch (error) {
          throw new CircuitError(
            `端口列表不是有效 JSON: ${error.message}`,
            `Port list is not valid JSON: ${error.message}`
          );
        }
      }
      if (!Array.isArray(parsed)) {
        throw new CircuitError("端口列表必须是数组", "The port list must be an array");
      }
      const result = Object.create(null);
      for (const item of parsed) {
        let id;
        let port;
        if (typeof item === "string") {
          const separator = item.lastIndexOf(".");
          if (separator <= 0 || separator === item.length - 1) {
            throw new CircuitError(
              `端口格式必须是“元件ID.端口”: ${item}`,
              `Port format must be componentID.port: ${item}`
            );
          }
          id = item.slice(0, separator);
          port = item.slice(separator + 1);
        } else if (item && typeof item === "object" && !Array.isArray(item)) {
          ({ id, port } = item);
        } else {
          throw new CircuitError(
            "端口列表项目必须是字符串或包含 id、port 的对象",
            "Each port list item must be a string or an object containing id and port"
          );
        }
        const endpoint = this._getEndpoint(id, port);
        result[endpoint.key] = endpoint.component.pins.get(endpoint.port);
      }
      return result;
    }

    hasComponent(id) {
      return this.components.has(String(id).trim());
    }

    getComponentInfo(id) {
      const component = this._getComponent(id);
      const links = [];
      for (const connection of this.connections.values()) {
        if (connection.first.startsWith(`${component.id}.`) || connection.second.startsWith(`${component.id}.`)) {
          links.push({ id: connection.id, from: connection.first, to: connection.second });
        }
      }
      return {
        id: component.id,
        type: component.type,
        bitWidth: component.definition.autoWidth ? this.getPortWidth(component.id, "IO") : component.bitWidth,
        ports: Object.fromEntries(Object.entries(component.definition.ports).map(([name, meta]) => [
          name,
          { ...meta, width: this.getPortWidth(component.id, name) }
        ])),
        pins: Object.fromEntries(component.pins),
        links
      };
    }

    exportGraph() {
      return {
        components: Array.from(this.components.values(), (component) => ({
          id: component.id,
          type: component.type,
          bitWidth: component.definition.autoWidth ? this.getPortWidth(component.id, "IO") : component.bitWidth,
          ports: Object.fromEntries(Object.entries(component.definition.ports).map(([name, meta]) => [
            name,
            { ...meta, width: this.getPortWidth(component.id, name) }
          ])),
          pins: Object.fromEntries(component.pins)
        })),
        connections: Array.from(this.connections.values(), ({ id, first, second }) => ({ id, from: first, to: second })),
        nets: Array.from(this.nets.values(), (net) => ({
          id: net.id,
          width: net.width,
          value: net.value,
          endpoints: Array.from(net.endpoints)
        }))
      };
    }

    tick(count = 1) {
      const normalizedCount = Number(count);
      if (!Number.isInteger(normalizedCount) || normalizedCount < 1 || normalizedCount > 10000) {
        throw new CircuitError("Tick 数必须是 1-10000 的整数", "Tick count must be an integer from 1 to 10000");
      }
      let iterations = 0;
      for (let index = 0; index < normalizedCount; index++) iterations += this.propagate();
      return { ticks: normalizedCount, iterations };
    }

    settle() {
      return { iterations: this._settleCombinational() };
    }

    async settleAtRate(hz = 0) {
      const frequency = this._normalizeFrequency(hz);
      if (frequency === 0) return { ...this.settle(), hz: 0 };
      let evaluations = 0;
      for (const unused of this._combinationalEvaluations()) {
        evaluations++;
        await this._waitForTicks(1, frequency);
      }
      if (evaluations === 0) await this._waitForTicks(1, frequency);
      return { iterations: Math.max(1, evaluations), hz: frequency };
    }

    pulseClock(id, count = 1) {
      const component = this._getComponent(id);
      const port = component.definition.external;
      if (!port || component.definition.ports[port].width !== 1) {
        throw new CircuitError(
          `时钟源必须是 1 位输入元件: ${id}`,
          `Clock source must be a 1-bit input component: ${id}`
        );
      }
      const normalizedCount = Number(count);
      if (!Number.isInteger(normalizedCount) || normalizedCount < 1 || normalizedCount > 10000) {
        throw new CircuitError(
          "时钟脉冲数必须是 1-10000 的整数",
          "Clock pulse count must be an integer from 1 to 10000"
        );
      }
      let iterations = 0;
      for (let index = 0; index < normalizedCount; index++) {
        this.setPort(component.id, port, 0);
        iterations += this.propagate();
        this.setPort(component.id, port, 1);
        iterations += this.propagate();
      }
      return { pulses: normalizedCount, iterations };
    }

    loadROM(id, data, offset = 0) {
      const component = this._getComponent(id);
      if (component.type !== "ROM") {
        throw new CircuitError(`元件不是 ROM: ${id}`, `Component is not ROM: ${id}`);
      }
      if (!Number.isInteger(offset) || offset < 0 || offset > 255) {
        throw new CircuitError(`ROM 偏移量越界: ${offset}`, `ROM offset is out of range: ${offset}`);
      }
      if (data == null || typeof data[Symbol.iterator] !== "function") {
        throw new CircuitError(
          "ROM 数据必须是可迭代的字节序列",
          "ROM data must be an iterable byte sequence"
        );
      }
      const bytes = Array.from(data);
      if (offset + bytes.length > 256) {
        throw new CircuitError("ROM 数据超出 256 字节容量", "ROM data exceeds the 256-byte capacity");
      }
      const normalizedBytes = bytes.map((value, index) => (
        this._normalizeSignal(value, 8, `ROM[${offset + index}]`)
      ));
      component.memory.set(normalizedBytes, offset);
      return this;
    }

    readMemory(id, address) {
      const component = this._getComponent(id);
      if (!component.memory) {
        throw new CircuitError(`元件不是存储器: ${id}`, `Component is not memory: ${id}`);
      }
      const normalizedAddress = this._normalizeSignal(address, 8, `${id} 地址`);
      return component.memory[normalizedAddress];
    }

    writeRAM(id, address, value) {
      const component = this._getComponent(id);
      if (component.type !== "RAM") {
        throw new CircuitError(`元件不是 RAM: ${id}`, `Component is not RAM: ${id}`);
      }
      const normalizedAddress = this._normalizeSignal(address, 8, `${id} 地址`);
      component.memory[normalizedAddress] = this._normalizeSignal(value, 8, `${id}[${normalizedAddress}]`);
      return this;
    }

    clearRAM(id) {
      const component = this._getComponent(id);
      if (component.type !== "RAM") {
        throw new CircuitError(`元件不是 RAM: ${id}`, `Component is not RAM: ${id}`);
      }
      component.memory.fill(0);
      return this;
    }

    dumpMemory(id) {
      const component = this._getComponent(id);
      if (!component.memory) {
        throw new CircuitError(`元件不是存储器: ${id}`, `Component is not memory: ${id}`);
      }
      return Array.from(component.memory);
    }

    exportCircuit() {
      return {
        version: 1,
        kind: "structure",
        components: Array.from(this.components.values(), (component) => ({
          id: component.id,
          type: component.type,
          width: component.definition.autoWidth ? 0 : component.bitWidth == null ? 1 : component.bitWidth
        })),
        connections: Array.from(this.connections.values(), ({ id, first, second }) => ({
          id,
          from: first,
          to: second
        }))
      };
    }

    exportSnapshot() {
      return {
        version: 1,
        kind: "snapshot",
        circuit: this.exportCircuit(),
        state: {
          components: Array.from(this.components.values(), (component) => {
            const state = { id: component.id, pins: Object.fromEntries(component.pins) };
            if (own(component, "previousClock")) state.previousClock = component.previousClock;
            if (component.memory) state.memory = Array.from(component.memory);
            return state;
          })
        }
      };
    }

    importCircuit(value) {
      let data = value;
      if (typeof data === "string") {
        try { data = JSON.parse(data); }
        catch (error) {
          throw new CircuitError(
            `电路数据不是有效 JSON: ${error.message}`,
            `Circuit data is not valid JSON: ${error.message}`
          );
        }
      }
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new CircuitError("电路数据必须是对象", "Circuit data must be an object");
      }
      if (data.kind === "snapshot") return this._importSnapshot(data);
      if (data.version !== 1) {
        throw new CircuitError(
          `不支持的电路数据版本: ${data.version}`,
          `Unsupported circuit data version: ${data.version}`
        );
      }
      if (!Array.isArray(data.components) || !Array.isArray(data.connections)) {
        throw new CircuitError(
          "电路数据必须包含 components 和 connections 数组",
          "Circuit data must contain components and connections arrays"
        );
      }

      const replacement = new TuringSimulator();
      for (const component of data.components) {
        if (!component || typeof component !== "object" || Array.isArray(component)) {
          throw new CircuitError("元件定义必须是对象", "A component definition must be an object");
        }
        replacement.addComponent(component.id, component.type, component.width == null ? 1 : component.width);
      }
      for (const connection of data.connections) {
        if (!connection || typeof connection !== "object" || Array.isArray(connection)) {
          throw new CircuitError("连线定义必须是对象", "A connection definition must be an object");
        }
        const lineId = replacement._normalizeLineId(connection.id);
        const first = this._splitEndpointKey(connection.from, "连线起点");
        const second = this._splitEndpointKey(connection.to, "连线终点");
        replacement.createLine(
          lineId,
          first.id,
          first.port,
          second.id,
          second.port
        );
      }

      this._adoptSimulator(replacement);
      return this;
    }

    _importSnapshot(data) {
      if (data.version !== 1) {
        throw new CircuitError(
          `不支持的电路数据版本: ${data.version}`,
          `Unsupported circuit data version: ${data.version}`
        );
      }
      if (!data.circuit || !data.state || !Array.isArray(data.state.components)) {
        throw new CircuitError(
          "快照必须包含 circuit 和 state.components",
          "Snapshot must contain circuit and state.components"
        );
      }
      const replacement = new TuringSimulator();
      replacement.importCircuit(data.circuit);
      const stateById = new Map();
      for (const state of data.state.components) {
        if (!state || typeof state !== "object" || Array.isArray(state) || typeof state.id !== "string") {
          throw new CircuitError("快照元件状态必须是带 ID 的对象", "Snapshot component state must be an object with an ID");
        }
        if (!replacement.components.has(state.id)) {
          throw new CircuitError(
            `快照包含未知元件状态: ${state.id}`,
            `Snapshot contains state for an unknown component: ${state.id}`
          );
        }
        if (stateById.has(state.id)) {
          throw new CircuitError(
            `快照包含重复元件状态: ${state.id}`,
            `Snapshot contains duplicate component state: ${state.id}`
          );
        }
        stateById.set(state.id, state);
      }
      for (const component of replacement.components.values()) {
        const state = stateById.get(component.id);
        if (!state || !state.pins || typeof state.pins !== "object" || Array.isArray(state.pins)) {
          throw new CircuitError(
            `快照缺少元件状态: ${component.id}`,
            `Snapshot is missing component state: ${component.id}`
          );
        }
        for (const port of Object.keys(component.definition.ports)) {
          if (!own(state.pins, port)) {
            throw new CircuitError(
              `快照缺少端口状态: ${component.id}.${port}`,
              `Snapshot is missing port state: ${component.id}.${port}`
            );
          }
          component.pins.set(
            port,
            replacement._normalizeSignal(
              state.pins[port],
              replacement.getPortWidth(component.id, port),
              `${component.id}.${port}`
            )
          );
        }
        if (own(component, "previousClock")) {
          if (!own(state, "previousClock")) {
            throw new CircuitError(
              `快照缺少时钟历史: ${component.id}`,
              `Snapshot is missing clock history: ${component.id}`
            );
          }
          component.previousClock = replacement._normalizeSignal(
            state.previousClock,
            1,
            `${component.id}.previousClock`
          );
        }
        if (component.memory) {
          if (!Array.isArray(state.memory) || state.memory.length !== 256) {
            throw new CircuitError(
              `快照存储器必须包含 256 字节: ${component.id}`,
              `Snapshot memory must contain 256 bytes: ${component.id}`
            );
          }
          const bytes = state.memory.map((value, address) => (
            replacement._normalizeSignal(value, 8, `${component.id}[${address}]`)
          ));
          component.memory.set(bytes);
        }
      }
      replacement._settleCombinational();
      this._adoptSimulator(replacement);
      return this;
    }

    _adoptSimulator(replacement) {
      this.components = replacement.components;
      this.nets = replacement.nets;
      this.endpointToNet = replacement.endpointToNet;
      this.connections = replacement.connections;
      this.connectionByEndpoints = replacement.connectionByEndpoints;
      this.validationInputs = replacement.validationInputs;
      this.validationOutputs = replacement.validationOutputs;
      this.validationInputVectors = [];
      this.validationExpectedVectors = [];
      this.validationResetBeforeEachCase = false;
      this._nextNetId = replacement._nextNetId;
      this._nextLineId = replacement._nextLineId;
    }

    setValidationData(inputList, expectedList, options = {}) {
      const inputs = this._parseVectorList(inputList, "验证输入数据");
      const expected = this._parseVectorList(expectedList, "验证期望数据");
      this._validateVectorLists(inputs, expected, false);
      this.validationInputVectors = inputs;
      this.validationExpectedVectors = expected;
      this.validationResetBeforeEachCase = typeof options === "boolean"
        ? options
        : Boolean(options && options.resetBeforeEachCase);
      return this;
    }

    async validate(inputList, expectedList, options = {}) {
      const inputs = this._parseVectorList(inputList, "验证输入数据");
      const expected = this._parseVectorList(expectedList, "验证期望数据");
      this._validateVectorLists(inputs, expected);

      for (let index = 0; index < inputs.length; index++) {
        this._validateVectorKeys(inputs[index], this.validationInputs, "输入", index);
        this._validateVectorKeys(expected[index], this.validationOutputs, "期望输出", index);
      }

      const failures = [];
      let passedCount = 0;
      const resetBeforeEachCase = typeof options === "boolean"
        ? options
        : Boolean(options && options.resetBeforeEachCase);
      const frequency = typeof options === "object" && options
        ? this._normalizeFrequency(options.hz)
        : 0;
      const requestedCase = typeof options === "object" && options ? options.caseIndex : null;
      let indices;
      if (requestedCase == null) indices = inputs.map((unused, index) => index);
      else {
        const index = Number(requestedCase);
        if (!Number.isInteger(index) || index < 0 || index >= inputs.length) {
          throw new CircuitError(
            `测试用例编号必须是 1-${inputs.length} 的整数: ${index + 1}`,
            `Test case number must be an integer from 1 to ${inputs.length}: ${index + 1}`
          );
        }
        indices = [index];
      }
      for (const index of indices) {
        if (resetBeforeEachCase) this.resetState();
        this.setInputs(inputs[index]);
        this.propagate();
        await this._waitForTicks(1, frequency);

        const actual = Object.create(null);
        const differences = Object.create(null);
        for (const outputId of this.validationOutputs) {
          const component = this._getComponent(outputId);
          const value = component.pins.get(component.definition.observed);
          actual[outputId] = value;
          if (value !== expected[index][outputId]) {
            differences[outputId] = { expected: expected[index][outputId], actual: value };
          }
        }
        if (Object.keys(differences).length === 0) passedCount++;
        else failures.push({ index, expected: expected[index], actual, differences });
      }

      return {
        passed: failures.length === 0,
        total: indices.length,
        passedCount,
        failures,
        ...(requestedCase != null ? { caseNumber: indices[0] + 1 } : {})
      };
    }

    validateLoadedData(options = {}) {
      return this.validate(
        this.validationInputVectors,
        this.validationExpectedVectors,
        {
          resetBeforeEachCase: this.validationResetBeforeEachCase,
          hz: options && options.hz
        }
      );
    }

    validateLoadedCase(caseNumber, options = {}) {
      const numericCase = Number(caseNumber);
      return this.validate(
        this.validationInputVectors,
        this.validationExpectedVectors,
        {
          resetBeforeEachCase: this.validationResetBeforeEachCase,
          hz: options && options.hz,
          caseIndex: numericCase - 1
        }
      );
    }

    propagate() {
      let iterations = this._settleCombinational();
      let sequentialChanged = false;

      // All sequential devices sample the same stable circuit snapshot.
      const updates = [];
      for (const component of this.components.values()) {
        if (!component.definition.sequential) continue;
        if (component.type === "DELAY") {
          updates.push({ component, kind: "delay", value: component.pins.get("IN") });
          continue;
        }
        const clock = component.pins.get("CLK");
        const rising = component.previousClock === 0 && clock === 1;
        if (rising && component.type === "REGISTER") {
          updates.push({ component, kind: "register", value: component.pins.get("D") });
        } else if (rising && component.type === "RAM" && component.pins.get("WE") === 1) {
          updates.push({
            component,
            kind: "ram",
            address: component.pins.get("ADDR"),
            value: component.pins.get("DIN")
          });
        }
      }

      for (const update of updates) {
        if (update.kind === "delay") {
          if (update.component.pins.get("OUT") !== update.value) sequentialChanged = true;
          update.component.pins.set("OUT", update.value);
        } else if (update.kind === "register") {
          if (update.component.pins.get("Q") !== update.value) sequentialChanged = true;
          update.component.pins.set("Q", update.value);
        } else {
          if (update.component.memory[update.address] !== update.value) sequentialChanged = true;
          update.component.memory[update.address] = update.value;
        }
      }
      for (const component of this.components.values()) {
        if (own(component, "previousClock")) component.previousClock = component.pins.get("CLK");
      }

      if (sequentialChanged) iterations += this._settleCombinational();
      return iterations;
    }

    _settleCombinational() {
      let evaluations = 0;
      for (const unused of this._combinationalEvaluations()) evaluations++;
      return Math.max(1, evaluations);
    }

    *_combinationalEvaluations() {
      const queue = [];
      const queued = new Set();
      const enqueue = (component) => {
        if (!component.definition.combinational || queued.has(component.id)) return;
        queued.add(component.id);
        queue.push(component);
      };

      // Seed constants and newly-created gates, then propagate external/sequential outputs.
      for (const component of this.components.values()) enqueue(component);
      for (const net of this.nets.values()) this._resolveNet(net, enqueue);

      const evaluationLimit = Math.max(
        MAX_PROPAGATION_ITERATIONS,
        (this.components.size + this.nets.size + this.connections.size) * 16
      );
      let evaluations = 0;
      for (let index = 0; index < queue.length; index++) {
        const component = queue[index];
        queued.delete(component.id);
        if (++evaluations > evaluationLimit) throw new LogicOscillationError();

        const nextPins = new Map(component.pins);
        this._evaluateComponent(component, nextPins);
        for (const [port, meta] of Object.entries(component.definition.ports)) {
          if (meta.direction !== "output") continue;
          const next = nextPins.get(port);
          if (component.pins.get(port) === next) continue;
          component.pins.set(port, next);
          const netId = this.endpointToNet.get(`${component.id}.${port}`);
          if (netId) this._resolveNet(this.nets.get(netId), enqueue);
        }
        yield;
      }
    }

    _resolveNet(net, enqueue) {
      const drivers = [];
      for (const endpointKey of net.endpoints) {
        const endpoint = this._getEndpointByKey(endpointKey);
        if (endpoint.meta.direction === "output") drivers.push(endpoint);
      }
      if (drivers.length > 1) {
        const driverList = drivers.map((item) => item.key).join(", ");
        throw new CircuitError(
          `网络 ${net.id} 存在多个驱动端: ${driverList}`,
          `Net ${net.id} has multiple drivers: ${driverList}`
        );
      }
      const value = drivers.length === 1 ? drivers[0].component.pins.get(drivers[0].port) : 0;
      net.value = value;
      for (const endpointKey of net.endpoints) {
        const endpoint = this._getEndpointByKey(endpointKey);
        if (
          !["input", "passive"].includes(endpoint.meta.direction) ||
          endpoint.component.pins.get(endpoint.port) === value
        ) continue;
        endpoint.component.pins.set(endpoint.port, value);
        enqueue(endpoint.component);
      }
    }

    _evaluateComponent(component, next) {
      const pin = (name) => component.pins.get(name);
      const bitMask = component.bitWidth ? (2 ** component.bitWidth) - 1 : 1;
      if (component.definition.converter) {
        const { inputCount, outputCount, totalWidth } = component.definition.converter;
        const inputWidth = totalWidth / inputCount;
        const outputWidth = totalWidth / outputCount;
        const outputMask = (2 ** outputWidth) - 1;
        let packed = 0;
        for (let index = 0; index < inputCount; index++) {
          packed |= pin(`IN${index}`) << (index * inputWidth);
        }
        for (let index = 0; index < outputCount; index++) {
          next.set(`OUT${index}`, (packed >>> (index * outputWidth)) & outputMask);
        }
        return;
      }
      switch (component.type) {
        case "ALWAYS_ON": next.set("OUT", bitMask); break;
        case "ALWAYS_OFF": next.set("OUT", 0); break;
        case "SWITCH": next.set("OUT", pin("S") ? pin("A") : 0); break;
        case "NAND": next.set("OUT", (~(pin("A") & pin("B"))) & bitMask); break;
        case "AND": next.set("OUT", (pin("A") & pin("B")) & bitMask); break;
        case "OR": next.set("OUT", (pin("A") | pin("B")) & bitMask); break;
        case "XOR": next.set("OUT", (pin("A") ^ pin("B")) & bitMask); break;
        case "NOT": next.set("OUT", (~pin("A")) & bitMask); break;
        case "NOR": next.set("OUT", (~(pin("A") | pin("B"))) & bitMask); break;
        case "XNOR": next.set("OUT", (~(pin("A") ^ pin("B"))) & bitMask); break;
        case "HALF_ADDER":
          next.set("SUM", (pin("A") ^ pin("B")) & 1);
          next.set("CARRY", (pin("A") & pin("B")) & 1);
          break;
        case "FULL_ADDER": {
          const total = pin("A") + pin("B") + pin("CIN");
          next.set("SUM", total & 1);
          next.set("COUT", (total >>> 1) & 1);
          break;
        }
        case "MUX": next.set("OUT", pin("SEL") ? pin("B") : pin("A")); break;
        case "AOI": next.set("OUT", (~((pin("A") & pin("B")) | pin("C"))) & bitMask); break;
        case "OAI": next.set("OUT", (~((pin("A") | pin("B")) & pin("C"))) & bitMask); break;
        case "3AND": next.set("OUT", (pin("A") & pin("B") & pin("C")) & bitMask); break;
        case "3OR": next.set("OUT", (pin("A") | pin("B") | pin("C")) & bitMask); break;
        case "3NAND": next.set("OUT", (~(pin("A") & pin("B") & pin("C"))) & bitMask); break;
        case "3NOR": next.set("OUT", (~(pin("A") | pin("B") | pin("C"))) & bitMask); break;
        case "3XOR": next.set("OUT", (pin("A") ^ pin("B") ^ pin("C")) & bitMask); break;
        case "3XNOR": next.set("OUT", (~(pin("A") ^ pin("B") ^ pin("C"))) & bitMask); break;
        case "4AND": next.set("OUT", (pin("A") & pin("B") & pin("C") & pin("D")) & bitMask); break;
        case "4OR": next.set("OUT", (pin("A") | pin("B") | pin("C") | pin("D")) & bitMask); break;
        case "4NAND": next.set("OUT", (~(pin("A") & pin("B") & pin("C") & pin("D"))) & bitMask); break;
        case "4NOR": next.set("OUT", (~(pin("A") | pin("B") | pin("C") | pin("D"))) & bitMask); break;
        case "4XOR": next.set("OUT", (pin("A") ^ pin("B") ^ pin("C") ^ pin("D")) & bitMask); break;
        case "4XNOR": next.set("OUT", (~(pin("A") ^ pin("B") ^ pin("C") ^ pin("D"))) & bitMask); break;
        case "ADDER4":
        case "ADDER8": {
          const width = component.type === "ADDER4" ? 4 : 8;
          const total = pin("A") + pin("B") + pin("CIN");
          next.set("SUM", total & ((1 << width) - 1));
          next.set("COUT", (total >>> width) & 1);
          break;
        }
        case "SPLITTER":
          for (let bit = 0; bit < 8; bit++) next.set(`B${bit}`, (pin("IN") >>> bit) & 1);
          break;
        case "SPLITTER2":
          for (let bit = 0; bit < 2; bit++) next.set(`B${bit}`, (pin("IN") >>> bit) & 1);
          break;
        case "SPLITTER4":
          for (let bit = 0; bit < 4; bit++) next.set(`B${bit}`, (pin("IN") >>> bit) & 1);
          break;
        case "HUB": {
          let value = 0;
          for (let bit = 0; bit < 8; bit++) value |= (pin(`B${bit}`) & 1) << bit;
          next.set("OUT", value & 0xff);
          break;
        }
        case "HUB2": {
          let value = 0;
          for (let bit = 0; bit < 2; bit++) value |= (pin(`B${bit}`) & 1) << bit;
          next.set("OUT", value & 3);
          break;
        }
        case "HUB4": {
          let value = 0;
          for (let bit = 0; bit < 4; bit++) value |= (pin(`B${bit}`) & 1) << bit;
          next.set("OUT", value & 15);
          break;
        }
        case "ROM": next.set("DATA", component.memory[pin("ADDR")]); break;
        case "RAM": next.set("DOUT", component.memory[pin("ADDR")]); break;
        default: break;
      }
    }

    _validateVectorLists(inputs, expected, requireInterfaces = true) {
      if (inputs.length !== expected.length) {
        throw new CircuitError(
          `验证数据长度不一致: 输入 ${inputs.length}，期望 ${expected.length}`,
          `Validation data length mismatch: ${inputs.length} inputs, ${expected.length} expected outputs`
        );
      }
      if (inputs.length === 0) {
        throw new CircuitError("验证数据不能为空", "Validation data cannot be empty");
      }
      if (requireInterfaces && (this.validationInputs.size === 0 || this.validationOutputs.size === 0)) {
        throw new CircuitError(
          "必须至少注册一个 Level_Input 和一个 Level_Output",
          "At least one LEVEL_INPUT and one LEVEL_OUTPUT must be registered"
        );
      }
    }

    _validateVectorKeys(vector, configured, label, index) {
      if (!vector || typeof vector !== "object" || Array.isArray(vector)) {
        throw new CircuitError(
          `第 ${index} 组${label}必须是对象`,
          `${englishErrorLabel(label)} vector ${index} must be an object`
        );
      }
      for (const id of configured) {
        if (!own(vector, id)) {
          throw new CircuitError(
            `第 ${index} 组${label}缺少元件 ID: ${id}；验证 JSON 必须使用 Level 接口的元件 ID，不能使用类型名称`,
            `${englishErrorLabel(label)} vector ${index} is missing component ID ${id}; validation JSON must use interface component IDs, not type names`
          );
        }
      }
      for (const id of Object.keys(vector)) {
        if (!configured.has(id)) {
          throw new CircuitError(
            `第 ${index} 组${label}包含未配置元件: ${id}`,
            `${englishErrorLabel(label)} vector ${index} contains unconfigured component ${id}`
          );
        }
        const component = this._getComponent(id);
        const port = component.definition.external || component.definition.observed;
        vector[id] = this._normalizeSignal(vector[id], component.definition.ports[port].width, `${id}.${port}`);
      }
    }

    _parseVectorList(value, label) {
      let parsed = value;
      if (typeof value === "string") {
        try { parsed = JSON.parse(value); }
        catch (error) {
          throw new CircuitError(
            `${label}不是有效 JSON: ${error.message}`,
            `${englishErrorLabel(label)} is not valid JSON: ${error.message}`
          );
        }
      }
      if (!Array.isArray(parsed)) {
        throw new CircuitError(`${label}必须是数组`, `${englishErrorLabel(label)} must be an array`);
      }
      return parsed.map((vector) => ({ ...vector }));
    }

    _normalizeFrequency(value) {
      if (value == null || value === "") return 0;
      const frequency = Number(value);
      if (!Number.isFinite(frequency) || frequency < 0 || frequency > 1000) {
        throw new CircuitError(
          `模拟频率必须是 0-1000 Hz 的数字: ${value}`,
          `Simulation frequency must be a number from 0 to 1000 Hz: ${value}`
        );
      }
      return frequency;
    }

    async _waitForTicks(count, hz) {
      if (hz <= 0) {
        await Promise.resolve();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.ceil((Number(count) * 1000) / hz)));
    }

    _normalizeSignal(value, width, label) {
      const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
      const maximum = (2 ** width) - 1;
      if (!Number.isInteger(number) || number < 0 || number > maximum) {
        throw new CircuitError(
          `${label} 必须是 0-${maximum} 的整数`,
          `${englishErrorLabel(label)} must be an integer from 0 to ${maximum}`
        );
      }
      return number;
    }

    _normalizeId(id) {
      const normalized = String(id).trim();
      if (!normalized) throw new CircuitError("元件 ID 不能为空", "Component ID cannot be empty");
      if (normalized.includes(".")) {
        throw new CircuitError("元件 ID 不能包含句点", "Component ID cannot contain a period");
      }
      return normalized;
    }

    _normalizeLineId(lineId, allowEmpty = false) {
      const normalized = lineId == null ? "" : String(lineId).trim();
      if (!normalized && !allowEmpty) {
        throw new CircuitError("线路 ID 不能为空", "Line ID cannot be empty");
      }
      return normalized;
    }

    _generateLineId() {
      let lineId;
      do { lineId = `line-${this._nextLineId++}`; } while (this.connections.has(lineId));
      return lineId;
    }

    _deleteLine(lineId) {
      const connection = this.connections.get(lineId);
      if (!connection) return false;
      this.connections.delete(lineId);
      this.connectionByEndpoints.delete(this._connectionKey(connection.first, connection.second));
      return true;
    }

    _lineInfo(connection) {
      const netId = this.endpointToNet.get(connection.first) || null;
      const net = netId && this.nets.get(netId);
      return {
        id: connection.id,
        from: connection.first,
        to: connection.second,
        width: net ? net.width : 0,
        value: net ? net.value : 0,
        netId
      };
    }

    _getComponent(id) {
      const normalized = this._normalizeId(id);
      const component = this.components.get(normalized);
      if (!component) {
        throw new CircuitError(`元件不存在: ${normalized}`, `Component does not exist: ${normalized}`);
      }
      return component;
    }

    _getEndpoint(id, port) {
      const component = this._getComponent(id);
      const normalizedPort = String(port).trim().toUpperCase();
      const meta = component.definition.ports[normalizedPort];
      if (!meta) {
        throw new CircuitError(
          `端口不存在: ${component.id}.${normalizedPort}`,
          `Port does not exist: ${component.id}.${normalizedPort}`
        );
      }
      return { component, port: normalizedPort, meta, key: `${component.id}.${normalizedPort}` };
    }

    _getEndpointByKey(key) {
      const endpoint = this._splitEndpointKey(key, "端口");
      return this._getEndpoint(endpoint.id, endpoint.port);
    }

    _getEndpointWidth(endpoint) {
      if (endpoint.meta.width != null) return endpoint.meta.width;
      const netId = this.endpointToNet.get(endpoint.key);
      const net = netId && this.nets.get(netId);
      return net ? net.width : 0;
    }

    _connectedEndpointKeys(startKey, excludedLineId = null) {
      const adjacency = new Map();
      const addNeighbor = (from, to) => {
        if (!adjacency.has(from)) adjacency.set(from, []);
        adjacency.get(from).push(to);
      };
      for (const [lineId, connection] of this.connections) {
        if (lineId === excludedLineId) continue;
        addNeighbor(connection.first, connection.second);
        addNeighbor(connection.second, connection.first);
      }
      const visited = new Set([startKey]);
      const queue = [startKey];
      for (let index = 0; index < queue.length; index++) {
        for (const neighbor of adjacency.get(queue[index]) || []) {
          if (visited.has(neighbor)) continue;
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
      return visited;
    }

    _splitEndpointKey(key, label) {
      const normalized = String(key);
      const separator = normalized.lastIndexOf(".");
      if (separator <= 0 || separator === normalized.length - 1) {
        throw new CircuitError(
          `${label}格式必须是“元件ID.端口”: ${normalized}`,
          `${englishErrorLabel(label)} format must be componentID.port: ${normalized}`
        );
      }
      return { id: normalized.slice(0, separator), port: normalized.slice(separator + 1) };
    }

    _connectionKey(first, second) {
      return first < second ? `${first}\u0000${second}` : `${second}\u0000${first}`;
    }

    _rebuildNets() {
      this.nets.clear();
      this.endpointToNet.clear();
      const parent = new Map();
      const find = (value) => {
        if (parent.get(value) !== value) parent.set(value, find(parent.get(value)));
        return parent.get(value);
      };
      const add = (value) => { if (!parent.has(value)) parent.set(value, value); };
      for (const connection of this.connections.values()) {
        add(connection.first);
        add(connection.second);
        const firstRoot = find(connection.first);
        const secondRoot = find(connection.second);
        if (firstRoot !== secondRoot) parent.set(secondRoot, firstRoot);
      }

      const groups = new Map();
      for (const endpoint of parent.keys()) {
        const rootKey = find(endpoint);
        if (!groups.has(rootKey)) groups.set(rootKey, []);
        groups.get(rootKey).push(endpoint);
      }
      for (const endpoints of groups.values()) {
        const id = `net-${this._nextNetId++}`;
        const widths = new Set();
        for (const endpointKey of endpoints) {
          const width = this._getEndpointByKey(endpointKey).meta.width;
          if (width != null) widths.add(width);
        }
        if (widths.size > 1) {
          throw new CircuitError(
            `网络包含不兼容位宽: ${Array.from(widths).join(", ")}`,
            `Net contains incompatible widths: ${Array.from(widths).join(", ")}`
          );
        }
        const width = widths.size === 1 ? Array.from(widths)[0] : 0;
        const net = { id, width, endpoints: new Set(endpoints), value: 0 };
        this.nets.set(id, net);
        for (const endpoint of endpoints) this.endpointToNet.set(endpoint, id);

        const hasDriver = endpoints.some((endpointKey) => (
          this._getEndpointByKey(endpointKey).meta.direction === "output"
        ));
        if (!hasDriver) {
          for (const endpointKey of endpoints) {
            const endpoint = this._getEndpointByKey(endpointKey);
            if (["input", "passive"].includes(endpoint.meta.direction)) {
              endpoint.component.pins.set(endpoint.port, 0);
            }
          }
        }
      }

      // Non-driving ports disconnected from every net immediately return to zero.
      for (const component of this.components.values()) {
        for (const [port, meta] of Object.entries(component.definition.ports)) {
          if (
            !["input", "passive"].includes(meta.direction) ||
            this.endpointToNet.has(`${component.id}.${port}`)
          ) continue;
          component.pins.set(port, 0);
        }
      }
    }
  }

  const TRANSLATION_PREFIX = "bsen975LogicGate.";
  const ZH_CN_TRANSLATIONS = Object.freeze({
    "locale.code": "zh",
    "status.notValidated": "尚未验证",
    name: "电路模拟器",
    "section.simulator": "模拟器",
    "section.build": "电路搭建",
    "section.signal": "信号与时钟",
    "section.validation": "测试与验证",
    "section.memory": "存储器初始化与调试",
    "section.binding": "角色绑定",
    "button.guide": "打开使用指南",
    "help.title": "BSEN975 电路模拟器使用指南",
    "help.close": "关闭使用指南",
    "help.intro": "模拟器平时保持静止，只在执行传播、时钟、步进或验证积木时计算。按照下面的顺序搭建、运行和验证电路；逻辑门名称与端口名称始终使用英文缩写。",
    "help.quickStart": "快速开始",
    "help.step1": "启动电路模拟器，然后清空当前电路。",
    "help.step2": "添加测试输入、逻辑门和测试输出，并为每个元件设置唯一 ID。",
    "help.step3": "为每条线路填写唯一线路 ID，再按“元件ID.端口”连接，例如 wire-1：input.OUT → gate.A。",
    "help.step4": "设置输入值，再按所需 Hz 执行“传播电路直到稳定”；0 Hz 表示不限速。",
    "help.step5": "DELAY 使用“模拟电路”按步推进；寄存器或 RAM 使用时钟时，执行“让时钟输入产生脉冲”。",
    "help.step6": "载入测试用例后，可按编号运行单组，也可按指定 Hz 运行全部测试，再从测试结果 JSON 读取结果。",
    "help.rules": "接线规则",
    "help.rule1": "元件 ID 区分大小写，端口名称不区分大小写。",
    "help.rule2": "输出可连接输入，VIA.IO 可连接任意方向；输入不能直连输入，输出不能直连输出。端口位宽必须一致，一个网络只能有一个输出驱动端。",
    "help.rule3": "未连接的输入默认为 0。组合逻辑传播不会推进 DELAY，也不会触发寄存器或 RAM；“模拟电路 N 步”始终只推进 N 步。",
    "help.rule4": "测试输入和测试输出会自动成为验证接口；普通外部输入和输出不会。",
    "help.viaRule": "VIA 是只有 IO 一个无源端口的过孔。所有交汇分支连接同一个 VIA.IO；没有 VIA 的几何交叉不会合并网络。",
    "help.delayRule": "DELAY 有 IN 和 OUT 两个可变位宽端口。每个完整模拟步骤末尾把 IN 锁存到 OUT；多个 DELAY 同时采样，因此串联时每级精确延迟一个 Tick。",
    "help.memoryWiring": "正常运行时，ROM 和 RAM 必须通过 ADDR、DATA、DIN、DOUT、WE、CLK 引脚与其他元件连接。直接装载、读写和清空存储器的积木只用于关卡初始化、存档和调试。",
    "help.testing": "测试数据示例",
    "help.testingNote": "下面的数据验证 input → NOT → output：",
    "help.more": "完整元件端口可在“元件的端口列表 JSON”中查询；每条线路可从“线路信息 JSON”检查，全部信号可从运行状态 JSON 检查。",
    "help.widthTitle": "比特位宽",
    "help.widthNote": "添加可变宽度元件时，位宽可以设置为 1、2、4 或 8。数据引脚会采用所选位宽，SEL、CLK、WE 等控制引脚仍为 1 位。VIA 忽略添加积木中的位宽，IO 会根据相连线路自动推导；未连接时为 0。",
    "help.widthChange": "已添加的可变宽度元件可以使用“将元件的位宽改为”再次修改。修改后，与新位宽不兼容的连线会自动断开。",
    "help.pinTable": "元件引脚对应表",
    "help.pinNote": "W 表示添加元件时选择的位宽。可将“端口的属性”切换为“位宽”，查询任意已添加元件的具体引脚。",
    "help.blockReference": "积木功能与结果",
    "help.blockReferenceNote": "下表说明每个可见积木会读取或修改什么，以及成功执行后的结果。命令积木失败时不会静默继续，错误可从“最近一次错误”读取。",
    "help.columnBlock": "积木",
    "help.columnPurpose": "用途",
    "help.columnResult": "成功后的结果",
    "help.columnType": "类型",
    "help.columnInputs": "输入引脚",
    "help.columnOutputs": "输出引脚",
    "help.columnWidth": "引脚位宽",
    "help.none": "无",
    "help.variableWidth": "W = 1 / 2 / 4 / 8",
    "help.allOneBit": "全部：1",
    "help.busPins8": "总线：8；B 引脚：1",
    "help.busPins2": "总线：2；B 引脚：1",
    "help.busPins4": "总线：4；B 引脚：1",
    "help.busWidth2": "总线：2",
    "help.busWidth4": "总线：4",
    "help.busWidth8": "总线：8",
    "help.viaWidth": "IO：自动 0 / 1 / 2 / 4 / 8",
    "block.start": "启动电路模拟器",
    "block.stop": "关闭电路模拟器",
    "block.running": "电路模拟器已启动？",
    "block.lastError": "最近一次错误",
    "block.clear": "清空当前电路",
    "block.reset": "重置电路运行状态",
    "block.add": "添加 [type] 元件 ID [id] 位宽 [width] 绑定 [dependency]",
    "block.remove": "删除元件 ID [id]",
    "block.exists": "存在元件 ID [id]？",
    "block.createLine": "连接线路 ID [lineId]：[id1].[port1] 到 [id2].[port2]",
    "block.removeLine": "删除线路 ID [lineId]",
    "block.mergeVia": "将 VIA [viaId] 合并到端口 [id].[port]",
    "block.lineInfo": "线路 [lineId] 信息 JSON",
    "block.lines": "全部线路 JSON",
    "block.componentIds": "所有元件 ID JSON",
    "block.ports": "元件 [id] 的端口列表 JSON",
    "block.portProperty": "端口 [id].[port] 的 [property]",
    "block.setWidth": "将元件 [id] 的位宽改为 [width]",
    "block.import": "导入电路结构或快照 JSON [json]",
    "block.setInput": "将输入 [id] 设为 [value]",
    "block.setInputs": "批量设置输入 JSON [json]",
    "block.readPorts": "批量读取端口 JSON [json]",
    "block.settle": "以 [hz] Hz 传播电路直到稳定",
    "block.pulse": "让时钟输入 [id] 产生 [count] 次脉冲",
    "block.steps": "模拟电路 [ticks] 步（高级）",
    "block.loadTests": "载入测试用例 输入 [inputs] 期望 [expected] 模式 [mode]",
    "block.runCase": "以 [hz] Hz 运行第 [caseNumber] 组测试用例",
    "block.runTests": "以 [hz] Hz 运行全部测试用例",
    "block.testResult": "测试结果 JSON",
    "block.loadRom": "将数据 JSON [data] 从地址 [offset] 写入 ROM [id]",
    "block.readMemory": "存储器 [id] 地址 [address] 的值",
    "block.writeRam": "将 RAM [id] 地址 [address] 设为 [value]",
    "block.clearRam": "清空 RAM [id]",
    "block.dumpMemory": "存储器 [id] 内容 JSON",
    "block.isBound": "[target] 已绑定电路元件？",
    "block.boundInfo": "[target] 绑定元件的 [property]",
    "block.circuitData": "当前电路的 [kind] JSON",
    "menu.noBinding": "不绑定",
    "menu.currentTarget": "当前角色",
    "menu.currentClone": "当前克隆体",
    "menu.stage": "舞台",
    "menu.unnamedTarget": "未命名角色",
    "menu.self": "自己",
    "menu.cloneSuffix": "（克隆体）",
    "menu.componentId": "元件 ID",
    "menu.type": "类型",
    "menu.width": "位宽",
    "menu.links": "连线",
    "menu.value": "值",
    "menu.bitWidth": "位宽",
    "menu.structure": "结构",
    "menu.state": "运行状态",
    "menu.snapshot": "完整快照",
    "menu.resetEach": "每组重置",
    "menu.preserveState": "连续保留状态"
  });

  function createTranslator(Scratch) {
    const translate = Scratch && Scratch.translate;
    if (translate && typeof translate.setup === "function") {
      const translations = {};
      for (const [key, value] of Object.entries(ZH_CN_TRANSLATIONS)) {
        translations[`${TRANSLATION_PREFIX}${key}`] = value;
      }
      translate.setup({ zh: translations, "zh-cn": translations });
    }
    return (key, defaultText) => {
      if (typeof translate !== "function") return defaultText;
      return translate({ id: `${TRANSLATION_PREFIX}${key}`, default: defaultText });
    };
  }

  function typeMenu() {
    return Object.keys(COMPONENT_DEFINITIONS);
  }

  function createWorkerSource() {
    return `
      "use strict";
      const MAX_PROPAGATION_ITERATIONS = ${MAX_PROPAGATION_ITERATIONS};
      ${LogicOscillationError.toString()}
      ${CircuitError.toString()}
      const COMPONENT_DEFINITIONS = Object.freeze(${JSON.stringify(COMPONENT_DEFINITIONS)});
      const SCALABLE_PORTS = Object.freeze(${JSON.stringify(SCALABLE_PORTS)});
      ${own.toString()}
      ${englishErrorLabel.toString()}
      ${TuringSimulator.toString()}
      let simulator = new TuringSimulator();
      let operationQueue = Promise.resolve();
      self.onmessage = (event) => {
        const { requestId, method, args } = event.data;
        operationQueue = operationQueue.then(async () => {
          try {
            const result = await simulator[method](...(args || []));
            self.postMessage({ requestId, result: result === simulator ? true : result });
          } catch (error) {
            self.postMessage({
              requestId,
              error: { name: error.name, message: error.message, englishMessage: error.englishMessage }
            });
          }
        });
      };
    `;
  }

  class LogicCoreController {
    constructor() {
      this.worker = null;
      this.localSimulator = null;
      this.localQueue = Promise.resolve();
      this.pending = new Map();
      this.nextRequestId = 1;
    }

    get running() {
      return Boolean(this.worker || this.localSimulator);
    }

    start() {
      if (this.running) return this.worker ? "worker" : "local";
      if (typeof root.Worker === "function" && root.Blob && root.URL && root.URL.createObjectURL) {
        try {
          const url = root.URL.createObjectURL(new root.Blob([createWorkerSource()], { type: "text/javascript" }));
          this.worker = new root.Worker(url);
          const worker = this.worker;
          root.URL.revokeObjectURL(url);
          worker.onmessage = (event) => this._handleMessage(event.data);
          worker.onerror = (event) => this._handleWorkerError(worker, event);
          return "worker";
        } catch (error) {
          this.worker = null;
        }
      }
      // Node and restricted Scratch hosts use the exact same engine locally.
      this.localSimulator = new TuringSimulator();
      this.localQueue = Promise.resolve();
      return "local";
    }

    stop() {
      if (this.worker) this.worker.terminate();
      this._failAll(new CircuitError("逻辑门核心已关闭", "The circuit simulator has stopped"));
      this.worker = null;
      this.localSimulator = null;
      this.localQueue = Promise.resolve();
    }

    async call(method, ...args) {
      if (!this.running) {
        throw new CircuitError("逻辑门核心未开启", "The circuit simulator is not running");
      }
      if (this.localSimulator) {
        const simulator = this.localSimulator;
        const operation = this.localQueue.then(() => simulator[method](...args));
        this.localQueue = operation.catch(() => {});
        return await operation;
      }
      const requestId = this.nextRequestId++;
      return new Promise((resolve, reject) => {
        this.pending.set(requestId, { resolve, reject });
        try {
          this.worker.postMessage({ requestId, method, args });
        } catch (error) {
          this.pending.delete(requestId);
          reject(error);
        }
      });
    }

    _handleWorkerError(worker, event) {
      if (this.worker !== worker) return;
      this.worker = null;
      worker.terminate();
      this._failAll(new CircuitError(
        event.message || "逻辑门核心线程异常",
        event.message || "Circuit simulator worker error"
      ));
    }

    _handleMessage(message) {
      const request = this.pending.get(message.requestId);
      if (!request) return;
      this.pending.delete(message.requestId);
      if (message.error) {
        const error = new Error(message.error.message);
        error.name = message.error.name;
        error.englishMessage = message.error.englishMessage;
        request.reject(error);
      } else request.resolve(message.result);
    }

    _failAll(error) {
      for (const request of this.pending.values()) request.reject(error);
      this.pending.clear();
    }
  }

  class Bsen975LogicGateExtension {
    constructor() {
      this.core = new LogicCoreController();
      this.targetBindings = new Map();
      this.componentBindings = new Map();
      this.targetIds = new WeakMap();
      this.nextTargetId = 1;
      this._t = createTranslator(root.Scratch || {});
      this.lastValidationResult = JSON.stringify({
        passed: false,
        status: this._t("status.notValidated", "Not validated")
      });
      this.lastError = "";
      const runtime = root.Scratch && root.Scratch.vm && root.Scratch.vm.runtime;
      if (runtime && typeof runtime.on === "function") {
        runtime.on("targetWasRemoved", (target) => this._releaseTarget(target));
      }
    }

    getInfo() {
      const Scratch = root.Scratch || {};
      const BlockType = Scratch.BlockType || {};
      const ArgumentType = Scratch.ArgumentType || {};
      const command = BlockType.COMMAND || "command";
      const reporter = BlockType.REPORTER || "reporter";
      const boolean = BlockType.BOOLEAN || "Boolean";
      const label = BlockType.LABEL || "label";
      const button = BlockType.BUTTON || "button";
      const string = ArgumentType.STRING || "string";
      const number = ArgumentType.NUMBER || "number";
      const t = this._t = createTranslator(Scratch);
      const section = (key, defaultText) => ({ blockType: label, text: `=== ${t(key, defaultText)} ===` });
      return {
        id: EXTENSION_ID,
        name: t("name", "Circuit Simulator"),
        blockIconURI: EXTENSION_ICON_URI,
        menuIconURI: EXTENSION_SIDEBAR_ICON_URI,
        color1: "#146C94",
        color2: "#105776",
        color3: "#0B4058",
        blocks: [
          { blockType: button, text: t("button.guide", "Open User Guide"), func: "openUserGuide" },
          section("section.simulator", "Simulator"),
          { opcode: "startCore", blockType: command, text: t("block.start", "start circuit simulator") },
          { opcode: "stopCore", blockType: command, text: t("block.stop", "stop circuit simulator") },
          { opcode: "isCoreRunning", blockType: boolean, text: t("block.running", "circuit simulator running?") },
          { opcode: "getLastError", blockType: reporter, text: t("block.lastError", "last error") },

          section("section.build", "Circuit Building"),
          { opcode: "clearCircuit", blockType: command, text: t("block.clear", "clear current circuit") },
          { opcode: "resetCircuitState", blockType: command, text: t("block.reset", "reset circuit state") },
          {
            opcode: "registerComponent", blockType: command,
            text: t("block.add", "add [type] component ID [id] width [width] bind to [dependency]"),
            arguments: {
              dependency: { type: string, menu: "dependencies", defaultValue: "NONE" },
              id: { type: string, defaultValue: "gate1" },
              type: { type: string, menu: "componentTypes", defaultValue: "AND" },
              width: { type: number, defaultValue: 1 }
            }
          },
          {
            opcode: "removeComponent", blockType: command, text: t("block.remove", "remove component ID [id]"),
            arguments: { id: { type: string, defaultValue: "gate1" } }
          },
          {
            opcode: "hasComponent", blockType: boolean, text: t("block.exists", "component ID [id] exists?"),
            arguments: { id: { type: string, defaultValue: "gate1" } }
          },
          {
            opcode: "createNamedLine", blockType: command,
            text: t("block.createLine", "connect line ID [lineId]: [id1].[port1] to [id2].[port2]"),
            arguments: {
              lineId: { type: string, defaultValue: "line-1" },
              id1: { type: string, defaultValue: "input1" },
              port1: { type: string, defaultValue: "OUT" },
              id2: { type: string, defaultValue: "gate1" },
              port2: { type: string, defaultValue: "A" }
            }
          },
          {
            opcode: "removeNamedLine", blockType: command,
            text: t("block.removeLine", "remove line ID [lineId]"),
            arguments: { lineId: { type: string, defaultValue: "line-1" } }
          },
          {
            opcode: "mergeViaIntoPort", blockType: command,
            text: t("block.mergeVia", "merge VIA [viaId] into port [id].[port]"),
            arguments: {
              viaId: { type: string, defaultValue: "via-1" },
              id: { type: string, defaultValue: "not-1" },
              port: { type: string, defaultValue: "OUT" }
            }
          },
          {
            opcode: "getLineInfo", blockType: reporter,
            text: t("block.lineInfo", "line [lineId] info JSON"),
            arguments: { lineId: { type: string, defaultValue: "line-1" } }
          },
          { opcode: "getLines", blockType: reporter, text: t("block.lines", "all lines JSON") },
          { opcode: "getComponentIds", blockType: reporter, text: t("block.componentIds", "all component IDs JSON") },
          {
            opcode: "getPortDefinitions", blockType: reporter, text: t("block.ports", "ports of component [id] JSON"),
            arguments: { id: { type: string, defaultValue: "gate1" } }
          },
          {
            opcode: "setComponentWidth", blockType: command, text: t("block.setWidth", "set component [id] width to [width]"),
            arguments: {
              id: { type: string, defaultValue: "gate1" },
              width: { type: number, defaultValue: 1 }
            }
          },
          {
            opcode: "getCircuitData", blockType: reporter, text: t("block.circuitData", "current circuit [kind] JSON"),
            arguments: { kind: { type: string, menu: "circuitDataKinds", defaultValue: "STRUCTURE" } }
          },
          {
            opcode: "importCircuit", blockType: command, text: t("block.import", "import circuit structure or snapshot JSON [json]"),
            arguments: { json: { type: string, defaultValue: "{\"version\":1,\"components\":[],\"connections\":[]}" } }
          },

          section("section.signal", "Signals and Clock"),
          {
            opcode: "setInputLevel", blockType: command, text: t("block.setInput", "set input [id] to [value]"),
            arguments: {
              id: { type: string, defaultValue: "Level_Input" },
              value: { type: number, defaultValue: 1 }
            }
          },
          {
            opcode: "setInputLevels", blockType: command, text: t("block.setInputs", "set inputs from JSON [json]"),
            arguments: { json: { type: string, defaultValue: "{\"inputA\":0,\"inputB\":1}" } }
          },
          {
            opcode: "getPortProperty", blockType: reporter, text: t("block.portProperty", "[property] of port [id].[port]"),
            arguments: {
              id: { type: string, defaultValue: "gate1" },
              port: { type: string, defaultValue: "OUT" },
              property: { type: string, menu: "portProperties", defaultValue: "VALUE" }
            }
          },
          {
            opcode: "readPorts", blockType: reporter, text: t("block.readPorts", "read ports from JSON [json]"),
            arguments: { json: { type: string, defaultValue: "[\"gate1.OUT\"]" } }
          },
          {
            opcode: "settleCircuit", blockType: command,
            text: t("block.settle", "settle circuit until stable at [hz] Hz"),
            arguments: { hz: { type: number, defaultValue: 60 } }
          },
          {
            opcode: "pulseClock", blockType: command, text: t("block.pulse", "pulse clock input [id] [count] times"),
            arguments: { id: { type: string, defaultValue: "clock" }, count: { type: number, defaultValue: 1 } }
          },
          {
            opcode: "advanceTicks", blockType: command, text: t("block.steps", "simulate circuit for [ticks] steps (advanced)"),
            arguments: { ticks: { type: number, defaultValue: 1 } }
          },

          section("section.validation", "Tests and Validation"),
          {
            opcode: "loadLevelData", blockType: command,
            text: t("block.loadTests", "load test cases inputs [inputs] expected [expected] mode [mode]"),
            arguments: {
              inputs: { type: string, defaultValue: "[{\"Level_Input\":0},{\"Level_Input\":1}]" },
              expected: { type: string, defaultValue: "[{\"Level_Output\":1},{\"Level_Output\":0}]" },
              mode: { type: string, menu: "validationModes", defaultValue: "RESET" }
            }
          },
          {
            opcode: "runValidationCase", blockType: command,
            text: t("block.runCase", "run test case [caseNumber] at [hz] Hz"),
            arguments: {
              caseNumber: { type: number, defaultValue: 1 },
              hz: { type: number, defaultValue: 60 }
            }
          },
          {
            opcode: "runValidation", blockType: command,
            text: t("block.runTests", "run all test cases at [hz] Hz"),
            arguments: { hz: { type: number, defaultValue: 60 } }
          },
          { opcode: "getValidationResult", blockType: reporter, text: t("block.testResult", "test result JSON") },

          section("section.memory", "Memory Setup and Debugging"),
          {
            opcode: "loadROM", blockType: command, text: t("block.loadRom", "load data JSON [data] into ROM [id] at address [offset]"),
            arguments: {
              data: { type: string, defaultValue: "[0,1,2,3]" },
              offset: { type: number, defaultValue: 0 },
              id: { type: string, defaultValue: "rom" }
            }
          },
          {
            opcode: "readMemory", blockType: reporter, text: t("block.readMemory", "value at address [address] of memory [id]"),
            arguments: { id: { type: string, defaultValue: "ram" }, address: { type: number, defaultValue: 0 } }
          },
          {
            opcode: "writeRAM", blockType: command, text: t("block.writeRam", "set RAM [id] address [address] to [value]"),
            arguments: {
              id: { type: string, defaultValue: "ram" },
              address: { type: number, defaultValue: 0 },
              value: { type: number, defaultValue: 0 }
            }
          },
          {
            opcode: "clearRAM", blockType: command, text: t("block.clearRam", "clear RAM [id]"),
            arguments: { id: { type: string, defaultValue: "ram" } }
          },
          {
            opcode: "dumpMemory", blockType: reporter, text: t("block.dumpMemory", "contents of memory [id] JSON"),
            arguments: { id: { type: string, defaultValue: "ram" } }
          },

          section("section.binding", "Target Binding"),
          {
            opcode: "isTargetRegistered", blockType: boolean, text: t("block.isBound", "[target] has a bound circuit component?"),
            arguments: { target: { type: string, menu: "targets", defaultValue: "SELF" } }
          },
          {
            opcode: "getTargetInfo", blockType: reporter, text: t("block.boundInfo", "[property] of component bound to [target]"),
            arguments: {
              target: { type: string, menu: "targets", defaultValue: "SELF" },
              property: { type: string, menu: "componentProperties", defaultValue: "ID" }
            }
          }
        ],
        menus: {
          componentTypes: { acceptReporters: true, items: typeMenu() },
          dependencies: { acceptReporters: true, items: "getDependencyMenu" },
          componentProperties: {
            acceptReporters: false,
            items: [
              { text: t("menu.componentId", "component ID"), value: "ID" },
              { text: t("menu.type", "type"), value: "TYPE" },
              { text: t("menu.width", "width"), value: "WIDTH" },
              { text: t("menu.links", "connections"), value: "LINKS" }
            ]
          },
          portProperties: {
            acceptReporters: false,
            items: [
              { text: t("menu.value", "value"), value: "VALUE" },
              { text: t("menu.bitWidth", "bit width"), value: "WIDTH" }
            ]
          },
          circuitDataKinds: {
            acceptReporters: false,
            items: [
              { text: t("menu.structure", "structure"), value: "STRUCTURE" },
              { text: t("menu.state", "runtime state"), value: "STATE" },
              { text: t("menu.snapshot", "full snapshot"), value: "SNAPSHOT" }
            ]
          },
          validationModes: {
            acceptReporters: false,
            items: [
              { text: t("menu.resetEach", "reset each case"), value: "RESET" },
              { text: t("menu.preserveState", "preserve sequential state"), value: "PRESERVE" }
            ]
          },
          targets: { acceptReporters: true, items: "getTargetMenu" }
        }
      };
    }

    openUserGuide() {
      const document = root.document;
      if (!document || !document.body) {
        return this._recordError(new CircuitError(
          "当前环境无法显示使用指南",
          "The user guide cannot be displayed in this environment"
        ));
      }

      const existing = document.getElementById("bsen975-logic-gate-guide");
      if (existing) existing.remove();

      const t = this._t;
      const dialog = document.createElement("dialog");
      dialog.id = "bsen975-logic-gate-guide";
      dialog.setAttribute("aria-labelledby", "bsen975-logic-gate-guide-title");
      dialog.style.cssText = [
        "box-sizing:border-box",
        "position:fixed",
        "inset:0",
        "z-index:2147483647",
        "width:min(760px,calc(100vw - 32px))",
        "max-height:min(760px,calc(100vh - 32px))",
        "padding:0",
        "border:1px solid #c8d2dc",
        "border-radius:8px",
        "background:#ffffff",
        "color:#17212b",
        "box-shadow:0 20px 60px rgba(18,33,46,.28)",
        "font:14px/1.65 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        "margin:auto",
        "overflow:hidden"
      ].join(";");

      const style = document.createElement("style");
      style.textContent = [
        "#bsen975-logic-gate-guide::backdrop{background:rgba(19,31,42,.58)}",
        "#bsen975-logic-gate-guide button:focus-visible{outline:3px solid #3b82b8;outline-offset:2px}",
        "#bsen975-logic-gate-guide code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}"
      ].join("");
      dialog.appendChild(style);

      const header = document.createElement("header");
      header.style.cssText = "display:flex;align-items:center;gap:16px;padding:16px 18px;border-bottom:1px solid #dce3e9;background:#f6f8fa";
      const title = document.createElement("h1");
      title.id = "bsen975-logic-gate-guide-title";
      title.textContent = t("help.title", "BSEN975 Circuit Simulator User Guide");
      title.style.cssText = "flex:1;margin:0;font-size:19px;line-height:1.35;font-weight:700;letter-spacing:0";
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.textContent = "×";
      closeButton.title = t("help.close", "Close user guide");
      closeButton.setAttribute("aria-label", closeButton.title);
      closeButton.style.cssText = "flex:0 0 36px;width:36px;height:36px;padding:0;border:1px solid #b8c4ce;border-radius:6px;background:#fff;color:#263746;font-size:24px;line-height:32px;cursor:pointer";
      const closeDialog = () => {
        if (typeof dialog.close === "function") dialog.close();
        else dialog.remove();
      };
      closeButton.addEventListener("click", closeDialog);
      header.append(title, closeButton);
      dialog.appendChild(header);

      const body = document.createElement("div");
      body.style.cssText = "box-sizing:border-box;max-height:calc(min(760px,100vh - 32px) - 69px);padding:20px 22px 24px;overflow:auto";
      const addParagraph = (text) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        paragraph.style.cssText = "margin:0 0 16px";
        body.appendChild(paragraph);
      };
      const addHeading = (text) => {
        const heading = document.createElement("h2");
        heading.textContent = text;
        heading.style.cssText = "margin:22px 0 8px;font-size:16px;line-height:1.4;font-weight:700;letter-spacing:0;color:#0f4f70";
        body.appendChild(heading);
      };
      const addList = (items, ordered = false) => {
        const list = document.createElement(ordered ? "ol" : "ul");
        list.style.cssText = "margin:0 0 16px;padding-left:24px";
        for (const item of items) {
          const listItem = document.createElement("li");
          listItem.textContent = item;
          listItem.style.margin = "5px 0";
          list.appendChild(listItem);
        }
        body.appendChild(list);
      };
      const addTable = (headers, rows, wrap = false) => {
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "margin:0 0 18px;overflow:auto;border:1px solid #cbd6df;border-radius:6px";
        const table = document.createElement("table");
        table.style.cssText = `width:100%;${wrap ? "min-width:700px;white-space:normal" : "white-space:nowrap"};border-collapse:collapse;font-size:13px`;
        const head = document.createElement("thead");
        const headRow = document.createElement("tr");
        for (const headerText of headers) {
          const headerCell = document.createElement("th");
          headerCell.textContent = headerText;
          headerCell.style.cssText = "padding:8px 10px;border-bottom:1px solid #cbd6df;background:#eef3f6;text-align:left;font-weight:700";
          headRow.appendChild(headerCell);
        }
        head.appendChild(headRow);
        table.appendChild(head);
        const tableBody = document.createElement("tbody");
        rows.forEach((row, rowIndex) => {
          const tableRow = document.createElement("tr");
          for (const value of row) {
            const cell = document.createElement("td");
            cell.textContent = value;
            cell.style.cssText = `padding:7px 10px;vertical-align:top;border-bottom:${rowIndex === rows.length - 1 ? "0" : "1px solid #e1e7ec"}`;
            tableRow.appendChild(cell);
          }
          tableBody.appendChild(tableRow);
        });
        table.appendChild(tableBody);
        wrapper.appendChild(table);
        body.appendChild(wrapper);
      };

      addParagraph(t(
        "help.intro",
        "The simulator stays idle until a settle, clock, step, or validation block runs. Use the workflow below to build, run, and validate a circuit. Gate and port names always use English abbreviations."
      ));
      addHeading(t("help.quickStart", "Quick Start"));
      addList([
        t("help.step1", "Start the circuit simulator, then clear the current circuit."),
        t("help.step2", "Add Test Input, gates, and Test Output components. Give every component a unique ID."),
        t("help.step3", "Give each line a unique line ID, then connect componentID.port endpoints, for example wire-1: input.OUT → gate.A."),
        t("help.step4", "Set input values, then settle at the requested Hz. Use 0 Hz for unlimited speed."),
        t("help.step5", "Advance DELAY components with simulate steps. For registers or RAM, pulse the connected clock input."),
        t("help.step6", "Load test cases, then run one numbered case or all cases at the requested Hz and read the result JSON.")
      ], true);
      addHeading(t("help.rules", "Wiring Rules"));
      addList([
        t("help.rule1", "Component IDs are case-sensitive. Port names are case-insensitive."),
        t("help.rule2", "Outputs connect to inputs, while VIA.IO can connect to any direction. Inputs cannot connect directly to inputs, and outputs cannot connect directly to outputs. Widths must match and each net can have only one output driver."),
        t("help.rule3", "Unconnected inputs default to 0. Settling does not advance DELAY or trigger registers/RAM, and simulate N steps always advances exactly N steps."),
        t("help.rule4", "Test Input and Test Output automatically become validation interfaces; regular external I/O does not.")
      ]);
      addParagraph(t(
        "help.viaRule",
        "VIA is a junction with one passive IO port. Connect every intersecting branch to the same VIA.IO; geometric crossings without a VIA remain separate nets."
      ));
      addParagraph(t(
        "help.delayRule",
        "DELAY has scalable IN and OUT ports. At the end of each full simulation step it latches IN to OUT. All DELAY components sample together, so each stage in a chain adds exactly one tick."
      ));
      addParagraph(t(
        "help.memoryWiring",
        "During normal execution, ROM and RAM connect to other components through ADDR, DATA, DIN, DOUT, WE, and CLK pins. Direct memory load, read, write, and clear blocks are only for level setup, saves, and debugging."
      ));
      addHeading(t("help.widthTitle", "Bit Width"));
      addParagraph(t(
        "help.widthNote",
        "For scalable components, choose a width of 1, 2, 4, or 8 when adding the component. Data pins use that width, while control pins such as SEL, CLK, and WE remain 1 bit. VIA ignores the add-block width and infers IO from connected wires; it reports 0 while disconnected."
      ));
      addParagraph(t(
        "help.widthChange",
        "Use the set component width block to resize an existing scalable component. Connections that are incompatible with the new width are disconnected automatically."
      ));
      addHeading(t("help.pinTable", "Component Pin Reference"));
      addParagraph(t(
        "help.pinNote",
        "W is the width selected when the component is added. Use the port bit width block to query any pin on an existing component."
      ));
      const none = t("help.none", "None");
      const variableWidth = t("help.variableWidth", "W = 1 / 2 / 4 / 8");
      addTable([
        t("help.columnType", "Type"),
        t("help.columnInputs", "Input Pins"),
        t("help.columnOutputs", "Output Pins"),
        t("help.columnWidth", "Pin Widths")
      ], [
        ["LEVEL_INPUT / INPUT", none, "OUT", `OUT: W; ${variableWidth}`],
        ["LEVEL_OUTPUT / OUTPUT", "IN", none, `IN: W; ${variableWidth}`],
        ["VIA", "IO (passive)", none, t("help.viaWidth", "IO: auto 0 / 1 / 2 / 4 / 8")],
        ["SWITCH", "A, S", "OUT", `A/OUT: W; S: 1; ${variableWidth}`],
        ["ALWAYS_ON / ALWAYS_OFF", none, "OUT", `OUT: W; ${variableWidth}`],
        ["NOT", "A", "OUT", `A/OUT: W; ${variableWidth}`],
        ["AND / OR / NAND / NOR / XOR / XNOR", "A, B", "OUT", `A/B/OUT: W; ${variableWidth}`],
        ["3AND / 3OR / 3NAND / 3NOR / 3XOR / 3XNOR", "A, B, C", "OUT", `A/B/C/OUT: W; ${variableWidth}`],
        ["4AND / 4OR / 4NAND / 4NOR / 4XOR / 4XNOR", "A, B, C, D", "OUT", `A/B/C/D/OUT: W; ${variableWidth}`],
        ["HALF_ADDER", "A, B", "SUM, CARRY", t("help.allOneBit", "all: 1")],
        ["FULL_ADDER", "A, B, CIN", "SUM, COUT", t("help.allOneBit", "all: 1")],
        ["MUX", "A, B, SEL", "OUT", `A/B/OUT: W; SEL: 1; ${variableWidth}`],
        ["AOI / OAI", "A, B, C", "OUT", `A/B/C/OUT: W; ${variableWidth}`],
        ["ADDER4", "A, B, CIN", "SUM, COUT", "A/B/SUM: 4; CIN/COUT: 1"],
        ["ADDER8", "A, B, CIN", "SUM, COUT", "A/B/SUM: 8; CIN/COUT: 1"],
        ["SPLITTER / HUB", "IN / B0...B7", "B0...B7 / OUT", t("help.busPins8", "bus: 8; B pins: 1")],
        ["SPLITTER2 / HUB2", "IN / B0...B1", "B0...B1 / OUT", t("help.busPins2", "bus: 2; B pins: 1")],
        ["SPLITTER4 / HUB4", "IN / B0...B3", "B0...B3 / OUT", t("help.busPins4", "bus: 4; B pins: 1")],
        ["CONVERTER_2_TO_8", "IN0...IN1", "OUT0...OUT7", "IN: 4; OUT: 1"],
        ["CONVERTER_8_TO_2", "IN0...IN7", "OUT0...OUT1", "IN: 1; OUT: 4"],
        ["CONVERTER_4_TO_2", "IN0...IN3", "OUT0...OUT1", "IN: 2; OUT: 4"],
        ["CONVERTER_2_TO_4", "IN0...IN1", "OUT0...OUT3", "IN: 4; OUT: 2"],
        ["CONVERTER_4_TO_8", "IN0...IN3", "OUT0...OUT7", "IN: 2; OUT: 1"],
        ["CONVERTER_8_TO_4", "IN0...IN7", "OUT0...OUT3", "IN: 1; OUT: 2"],
        ["REGISTER", "D, CLK", "Q", "D/Q: 8; CLK: 1"],
        ["DELAY", "IN", "OUT", `IN/OUT: W; ${variableWidth}`],
        ["ROM", "ADDR", "DATA", "ADDR/DATA: 8"],
        ["RAM", "ADDR, DIN, WE, CLK", "DOUT", "ADDR/DIN/DOUT: 8; WE/CLK: 1"],
        ["BUS2_INPUT / BUS2_OUTPUT", `IN / ${none}`, `${none} / OUT`, t("help.busWidth2", "bus: 2")],
        ["BUS4_INPUT / BUS4_OUTPUT", `IN / ${none}`, `${none} / OUT`, t("help.busWidth4", "bus: 4")],
        ["BUS_INPUT / BUS_OUTPUT", `IN / ${none}`, `${none} / OUT`, t("help.busWidth8", "bus: 8")]
      ]);
      addHeading(t("help.blockReference", "Block Behavior and Results"));
      addParagraph(t(
        "help.blockReferenceNote",
        "This table describes what every visible block reads or changes and the result after a successful call. Failed commands expose their error through the last error reporter."
      ));
      const isChinese = t("locale.code", "en") === "zh";
      const local = (chinese, english) => isChinese ? chinese : english;
      addTable([
        t("help.columnBlock", "Block"),
        t("help.columnPurpose", "Purpose"),
        t("help.columnResult", "Result on Success")
      ], [
        [t("button.guide", "Open User Guide"), local("查看离线快速指南和完整参考。", "Show the offline quick start and full reference."), local("打开当前弹窗；不修改电路。", "Opens this dialog without changing the circuit.")],
        [t("block.start", "start circuit simulator"), local("创建计算引擎。", "Create the simulation engine."), local("启动 Worker；不支持时使用本地引擎。重复执行不会清空电路。", "Starts a worker or local fallback. Calling it again does not clear the circuit.")],
        [t("block.stop", "stop circuit simulator"), local("释放计算引擎。", "Release the simulation engine."), local("删除运行中的电路和角色绑定，并终止 Worker。", "Deletes the running circuit and bindings, then terminates the worker.")],
        [t("block.running", "circuit simulator running?"), local("检查引擎状态。", "Check engine availability."), local("返回布尔值，不修改状态。", "Returns a Boolean without changing state.")],
        [t("block.lastError", "last error"), local("读取最近失败原因。", "Read the most recent failure."), local("返回本地化错误文字；下一次成功操作会清空它。", "Returns a localized message; the next successful operation clears it.")],
        [t("block.clear", "clear current circuit"), local("删除当前电路。", "Delete the current circuit."), local("移除全部元件、连线、测试数据和绑定。", "Removes all components, wires, test data, and bindings.")],
        [t("block.reset", "reset circuit state"), local("重新初始化运行状态。", "Reinitialize runtime state."), local("保留元件和连线；清零引脚、DELAY、寄存器和 RAM，保留 ROM。", "Keeps components and wires; clears pins, DELAY stages, registers, and RAM while preserving ROM.")],
        [t("block.add", "add [type] component ID [id] width [width] bind to [dependency]"), local("创建一个元件实例。", "Create a component instance."), local("加入指定 ID 和类型；普通可变宽度元件使用所选位宽，VIA 忽略该参数并自动适应线路。LEVEL 接口自动加入测试。", "Adds the selected ID and type; regular scalable components use the selected width, while VIA ignores it and adapts to its net. LEVEL interfaces join validation.")],
        [t("block.remove", "remove component ID [id]"), local("删除一个元件。", "Delete one component."), local("同时移除其连线、测试接口登记和角色绑定。", "Also removes its wires, validation-interface entry, and target binding.")],
        [t("block.exists", "component ID [id] exists?"), local("检查 ID 是否已使用。", "Check whether an ID is in use."), local("返回布尔值，不修改电路。", "Returns a Boolean without changing the circuit.")],
        [t("block.createLine", "connect line ID [lineId]: [id1].[port1] to [id2].[port2]"), local("创建一条可供前端绘制的命名线路。", "Create a named line that the frontend can draw."), local("保存稳定线路 ID 和两个端点；空 ID 自动生成。方向、位宽、重复端点或多驱动不合法时原子失败。", "Stores a stable line ID and endpoints; an empty ID is generated. Invalid direction, width, duplicate endpoints, or multiple drivers fails atomically.")],
        [t("block.removeLine", "remove line ID [lineId]"), local("精确删除一条线路。", "Remove one exact line."), local("重建剩余网络并重新推导 VIA 位宽；其他分支不受影响。", "Rebuilds remaining nets and re-infers VIA widths without removing other branches.")],
        [t("block.mergeVia", "merge VIA [viaId] into port [id].[port]"), local("用元件端口原子替换 VIA。", "Atomically replace a VIA with a component port."), local("保留并改写相连线路的 ID，删除目标端口到 VIA 的零长度线路；完整校验通过后才删除 VIA 并提交。", "Preserves and rewires connected line IDs, removes the zero-length target-to-VIA line, and deletes the VIA only after full validation succeeds.")],
        [t("block.lineInfo", "line [lineId] info JSON"), local("查询一条线路。", "Inspect one line."), local("返回 ID、起点、终点、网络 ID、位宽和当前值。", "Returns ID, endpoints, net ID, width, and current value.")],
        [t("block.lines", "all lines JSON"), local("批量查询全部线路。", "Inspect every line at once."), local("按创建顺序返回线路信息数组，供前端检查和绘制。", "Returns line information in creation order for frontend inspection and drawing.")],
        [t("block.componentIds", "all component IDs JSON"), local("枚举电路元件。", "Enumerate circuit components."), local("返回按添加顺序排列的 ID 数组 JSON。", "Returns a JSON array of IDs in insertion order.")],
        [t("block.ports", "ports of component [id] JSON"), local("检查元件全部引脚。", "Inspect every pin on a component."), local("返回名称、方向、位宽、当前值和连接状态。", "Returns name, direction, width, current value, and connection state.")],
        [t("block.setWidth", "set component [id] width to [width]"), local("修改可变宽度元件。", "Resize a scalable component."), local("更新普通数据引脚到 1/2/4/8 位并断开不兼容连线；VIA 不支持手动修改。", "Changes regular data pins to 1/2/4/8 bits and disconnects incompatible wires; VIA cannot be resized manually.")],
        [t("block.circuitData", "current circuit [kind] JSON"), local("导出结构、调试状态或完整快照。", "Export structure, debug state, or a full snapshot."), local("结构用于模板；运行状态用于观察信号；快照还保存 DELAY、RAM、ROM、寄存器和时钟历史。", "Structure is for templates, runtime state observes signals, and snapshots also preserve DELAY, RAM, ROM, registers, and clock history.")],
        [t("block.import", "import circuit structure or snapshot JSON [json]"), local("载入已保存的结构或快照。", "Load a saved structure or snapshot."), local("完整校验后原子替换电路，并清除旧绑定和测试数据；失败时保留原电路。", "Atomically replaces the circuit after full validation and clears bindings/tests; failure preserves the old circuit.")],
        [t("block.setInput", "set input [id] to [value]"), local("设置单个外部输入。", "Set one external input."), local("只修改输入源 OUT；需要随后传播或产生时钟。", "Changes only the source OUT pin; settle or pulse afterward.")],
        [t("block.setInputs", "set inputs from JSON [json]"), local("一次设置多个输入。", "Set multiple inputs at once."), local("按 ID 写入所有给定输入；不会自动传播。", "Writes every supplied input by ID without settling automatically.")],
        [t("block.portProperty", "[property] of port [id].[port]"), local("查询单个引脚的值或位宽。", "Read one pin's value or width."), local("返回一个数字，不修改电路。", "Returns a number without changing the circuit.")],
        [t("block.readPorts", "read ports from JSON [json]"), local("批量读取引脚值。", "Read several pin values."), local("返回以“元件ID.端口”为键的对象 JSON。", "Returns a JSON object keyed by componentID.port.")],
        [t("block.settle", "settle circuit until stable at [hz] Hz"), local("按指定频率传播组合逻辑。", "Propagate combinational logic at the requested rate."), local("计算到稳定或报告振荡；Hz 限制传播节拍，0 表示不限速；不会推进 DELAY 或采样寄存器/RAM 上升沿。", "Runs until stable or reports oscillation; Hz limits propagation pacing, 0 is unlimited, and DELAY/register/RAM state is not advanced.")],
        [t("block.pulse", "pulse clock input [id] [count] times"), local("产生完整时钟脉冲。", "Generate complete clock pulses."), local("每次执行低、高两个完整步骤，触发寄存器和 WE=1 的 RAM；DELAY 因而推进两次，最终 CLK 为 1。", "Each pulse runs low and high as two full steps, triggers registers and WE=1 RAM, advances DELAY twice, and ends with CLK high.")],
        [t("block.steps", "simulate circuit for [ticks] steps (advanced)"), local("精确推进指定数量的完整模拟步骤。", "Advance exactly the requested number of full simulation steps."), local("每步先稳定组合逻辑，再让全部 DELAY 同时锁存并采样当前 CLK 上升沿；不会在后台继续运行。", "Each step settles combinational logic, latches all DELAY stages together, then samples CLK edges; no background execution continues.")],
        [t("block.loadTests", "load test cases inputs [inputs] expected [expected] mode [mode]"), local("保存输入、期望向量和状态模式。", "Store input vectors, expected vectors, and state mode."), local("每组重置会在用例前清寄存器/RAM；连续模式按顺序保留时序状态。", "Reset mode clears registers/RAM before each case; preserve mode carries sequential state forward.")],
        [t("block.runCase", "run test case [caseNumber] at [hz] Hz"), local("只执行指定编号的已载入测试。", "Execute one loaded test case by number."), local("按状态模式处理该组，写输入、推进一个含 DELAY 的完整步骤并比较 LEVEL_OUTPUT；结果 total 为 1。", "Applies the state mode, writes inputs, advances one full step including DELAY, and compares LEVEL_OUTPUT; result total is 1.")],
        [t("block.runTests", "run all test cases at [hz] Hz"), local("按指定频率执行全部已载入测试。", "Execute all loaded tests at the requested rate."), local("每个用例占一个验证节拍；0 Hz 表示不限速。按顺序比较输出，并保留最后一组状态。", "Each case consumes one validation tick; 0 Hz is unlimited. Cases run in order and leave the final state.")],
        [t("block.testResult", "test result JSON"), local("读取最近测试报告。", "Read the latest test report."), local("返回通过数、总数和每个失败差异的 JSON。", "Returns JSON with pass count, total, and per-case differences.")],
        [t("block.loadRom", "load data JSON [data] into ROM [id] at address [offset]"), local("在关卡开始前初始化 ROM 字节。", "Initialize ROM bytes before circuit execution."), local("这是后端装载接口，不是电路信号；运行时仍由相连的 ADDR 引脚选择、DATA 引脚输出。", "This is a backend loading interface, not a signal; during execution, connected ADDR selects data exposed through DATA.")],
        [t("block.readMemory", "value at address [address] of memory [id]"), local("直接调试 RAM 或 ROM。", "Inspect RAM or ROM directly."), local("返回指定地址字节，不改变引脚。", "Returns the addressed byte without changing pins.")],
        [t("block.writeRam", "set RAM [id] address [address] to [value]"), local("直接写入 RAM。", "Write RAM directly."), local("立即修改存储字节；DOUT 在下一次传播后更新。", "Changes the stored byte immediately; DOUT updates after the next settle.")],
        [t("block.clearRam", "clear RAM [id]"), local("清空单个 RAM。", "Clear one RAM."), local("256 个字节全部变为 0；DOUT 在下一次传播后更新。", "Sets all 256 bytes to 0; DOUT updates after the next settle.")],
        [t("block.dumpMemory", "contents of memory [id] JSON"), local("导出 RAM 或 ROM 内容。", "Export RAM or ROM contents."), local("返回包含 256 个字节的数组 JSON。", "Returns a JSON array containing 256 bytes.")],
        [t("block.isBound", "[target] has a bound circuit component?"), local("检查目标绑定。", "Check target binding."), local("仅当绑定记录和元件都存在时返回 true。", "Returns true only when both the binding and component still exist.")],
        [t("block.boundInfo", "[property] of component bound to [target]"), local("读取绑定元件信息。", "Read bound-component metadata."), local("返回 ID、类型、位宽或连线 JSON；未绑定时返回空文本。", "Returns ID, type, width, or connections JSON; returns empty text when unbound.")]
      ], true);
      addHeading(t("help.testing", "Test Data Example"));
      addParagraph(t("help.testingNote", "The following data validates input → NOT → output:"));
      const code = document.createElement("pre");
      code.textContent = [
        'inputs:   [{"input":0},{"input":1}]',
        'expected: [{"output":1},{"output":0}]'
      ].join("\n");
      code.style.cssText = "box-sizing:border-box;margin:0 0 18px;padding:12px 14px;border:1px solid #cbd6df;border-radius:6px;background:#f5f7f9;color:#17212b;overflow:auto;font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace";
      body.appendChild(code);
      addParagraph(t(
        "help.more",
        "Use component ports JSON for complete pin metadata, line info JSON for one physical line, and runtime state JSON for all signal diagnostics."
      ));
      dialog.appendChild(body);

      dialog.addEventListener("click", (event) => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog();
      });
      dialog.addEventListener("close", () => dialog.remove(), { once: true });
      document.body.appendChild(dialog);
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      return "";
    }

    startCore() {
      try {
        const mode = this.core.start();
        this.lastError = "";
        return mode;
      } catch (error) {
        return this._recordError(error);
      }
    }

    stopCore() {
      this.core.stop();
      this.targetBindings.clear();
      this.componentBindings.clear();
      return "";
    }

    isCoreRunning() {
      return this.core.running;
    }

    getLastError() {
      return this.lastError;
    }

    async clearCircuit() {
      return this._command(async () => {
        await this.core.call("clear");
        this.targetBindings.clear();
        this.componentBindings.clear();
        this.lastValidationResult = JSON.stringify({
          passed: false,
          status: this._t("status.notValidated", "Not validated")
        });
      });
    }

    async resetCircuitState() {
      return this._command(() => this.core.call("resetState"));
    }

    async registerComponent(args, util) {
      return this._command(async () => {
        const dependency = String(args.dependency);
        const normalizedDependency = dependency.toUpperCase();
        let target = null;
        if (normalizedDependency === "SELF") target = util && util.target;
        else if (normalizedDependency === "CLONE") {
          target = util && util.target;
          if (!target || target.isOriginal !== false) {
            throw new CircuitError(
              "“当前克隆体”只能由克隆体执行",
              "Current clone can only be selected by a clone"
            );
          }
        } else if (normalizedDependency !== "NONE") {
          target = this._resolveTarget(dependency, util);
          if (!target) {
            throw new CircuitError(
              "选择的角色或克隆体不存在",
              "The selected target or clone does not exist"
            );
          }
        }
        let targetKey = null;
        if (normalizedDependency !== "NONE") {
          if (!target) {
            throw new CircuitError(
              "当前运行环境没有可绑定的角色或克隆体",
              "No target or clone is available for binding"
            );
          }
          targetKey = this._targetKey(target);
          if (this.targetBindings.has(targetKey)) {
            throw new CircuitError(
              "该角色或克隆体已经绑定了元件",
              "The selected target or clone already has a bound component"
            );
          }
        }
        await this.core.call("addComponent", args.id, args.type, args.width == null ? 1 : args.width);
        if (targetKey) {
          const id = String(args.id).trim();
          this.targetBindings.set(targetKey, id);
          this.componentBindings.set(id, targetKey);
        }
      });
    }

    async removeComponent(args) {
      return this._command(async () => {
        const id = String(args.id).trim();
        await this.core.call("removeComponent", id);
        const targetKey = this.componentBindings.get(id);
        if (targetKey) this.targetBindings.delete(targetKey);
        this.componentBindings.delete(id);
      });
    }

    async hasComponent(args) {
      if (!this.core.running) return false;
      try {
        const result = await this.core.call("hasComponent", args.id);
        this.lastError = "";
        return Boolean(result);
      } catch (error) {
        this._recordError(error);
        return false;
      }
    }

    async getComponentIds() {
      return this._reporter(async () => JSON.stringify(await this.core.call("getComponentIds")));
    }

    async getPortDefinitions(args) {
      return this._reporter(async () => JSON.stringify(await this.core.call("getPortDefinitions", args.id)));
    }

    async getPortProperty(args) {
      const method = String(args.property).toUpperCase() === "WIDTH" ? "getPortWidth" : "getPort";
      return this._reporter(() => this.core.call(method, args.id, args.port));
    }

    async setComponentWidth(args) {
      return this._command(() => this.core.call("setComponentWidth", args.id, args.width));
    }

    async getCircuitData(args) {
      const kind = String(args.kind).toUpperCase();
      const method = kind === "SNAPSHOT" ? "exportSnapshot" : kind === "STATE" ? "exportGraph" : "exportCircuit";
      return this._reporter(async () => JSON.stringify(await this.core.call(method)));
    }

    async importCircuit(args) {
      return this._command(async () => {
        await this.core.call("importCircuit", args.json);
        this.targetBindings.clear();
        this.componentBindings.clear();
        this.lastValidationResult = JSON.stringify({
          passed: false,
          status: this._t("status.notValidated", "Not validated")
        });
      });
    }

    async createNamedLine(args) {
      return this._command(() => this.core.call(
        "createLine",
        args.lineId,
        args.id1,
        args.port1,
        args.id2,
        args.port2
      ));
    }

    async removeNamedLine(args) {
      return this._command(() => this.core.call("removeLine", args.lineId));
    }

    async mergeViaIntoPort(args) {
      return this._command(async () => {
        const viaId = String(args.viaId).trim();
        await this.core.call("mergeViaIntoPort", viaId, args.id, args.port);
        const targetKey = this.componentBindings.get(viaId);
        if (targetKey) this.targetBindings.delete(targetKey);
        this.componentBindings.delete(viaId);
      });
    }

    async getLineInfo(args) {
      return this._reporter(async () => JSON.stringify(await this.core.call("getLineInfo", args.lineId)));
    }

    async getLines() {
      return this._reporter(async () => JSON.stringify(await this.core.call("getLines")));
    }

    async setInputLevel(args) {
      return this._command(() => this.core.call("setPort", args.id, "OUT", args.value));
    }

    async setInputLevels(args) {
      return this._command(() => this.core.call("setInputs", this._parseJSON(args.json, "输入数据")));
    }

    async readPorts(args) {
      return this._reporter(async () => JSON.stringify(await this.core.call("readPorts", args.json)));
    }

    async settleCircuit(args = {}) {
      return this._command(() => this.core.call("settleAtRate", args.hz == null ? 0 : args.hz));
    }

    async pulseClock(args) {
      return this._command(() => this.core.call("pulseClock", args.id, args.count));
    }

    async loadROM(args) {
      return this._command(() => this.core.call(
        "loadROM",
        args.id,
        this._parseJSON(args.data, "ROM 数据"),
        Number(args.offset)
      ));
    }

    async readMemory(args) {
      return this._reporter(() => this.core.call("readMemory", args.id, Number(args.address)));
    }

    async writeRAM(args) {
      return this._command(() => this.core.call("writeRAM", args.id, Number(args.address), Number(args.value)));
    }

    async clearRAM(args) {
      return this._command(() => this.core.call("clearRAM", args.id));
    }

    async dumpMemory(args) {
      return this._reporter(async () => JSON.stringify(await this.core.call("dumpMemory", args.id)));
    }

    async isTargetRegistered(args, util) {
      const target = this._resolveTarget(args.target, util);
      if (!target) return false;
      const id = this.targetBindings.get(this._targetKey(target));
      if (!id || !this.core.running) return false;
      try { return Boolean(await this.core.call("hasComponent", id)); }
      catch (error) { this._recordError(error); return false; }
    }

    async getTargetInfo(args, util) {
      return this._reporter(async () => {
        const target = this._resolveTarget(args.target, util);
        if (!target) return "";
        const id = this.targetBindings.get(this._targetKey(target));
        if (!id) return "";
        const info = await this.core.call("getComponentInfo", id);
        switch (String(args.property).toUpperCase()) {
          case "TYPE": return info.type;
          case "WIDTH": return info.bitWidth == null ? "固定" : info.bitWidth;
          case "LINKS": return JSON.stringify(info.links);
          default: return info.id;
        }
      });
    }

    async loadLevelData(args) {
      return this._command(() => this.core.call(
        "setValidationData",
        args.inputs,
        args.expected,
        { resetBeforeEachCase: String(args.mode).toUpperCase() === "RESET" }
      ));
    }

    async runValidationCase(args = {}) {
      return this._command(async () => {
        const result = await this.core.call(
          "validateLoadedCase",
          args.caseNumber,
          { hz: args.hz == null ? 0 : args.hz }
        );
        this.lastValidationResult = JSON.stringify(result);
      }, true);
    }

    async runValidation(args = {}) {
      return this._command(async () => {
        const result = await this.core.call(
          "validateLoadedData",
          { hz: args.hz == null ? 0 : args.hz }
        );
        this.lastValidationResult = JSON.stringify(result);
      }, true);
    }

    getValidationResult() {
      return this.lastValidationResult;
    }

    async advanceTicks(args) {
      return this._command(() => this.core.call("tick", args.ticks));
    }

    getDependencyMenu() {
      const items = [
        { text: this._t("menu.noBinding", "No binding"), value: "NONE" },
        { text: this._t("menu.currentTarget", "Current target"), value: "SELF" },
        { text: this._t("menu.currentClone", "Current clone"), value: "CLONE" }
      ];
      for (const target of this._runtimeTargets()) {
        const name = this._targetDisplayName(target);
        const suffix = target.isOriginal === false ? this._t("menu.cloneSuffix", " (clone)") : "";
        items.push({ text: `${name}${suffix}`, value: `TARGET:${this._targetKey(target)}` });
      }
      return items;
    }

    getTargetMenu() {
      const items = [{ text: this._t("menu.self", "Myself"), value: "SELF" }];
      for (const target of this._runtimeTargets()) {
        const name = this._targetDisplayName(target);
        const suffix = target.isOriginal === false ? this._t("menu.cloneSuffix", " (clone)") : "";
        items.push({ text: `${name}${suffix}`, value: this._targetKey(target) });
      }
      return items;
    }

    _runtimeTargets() {
      const runtime = root.Scratch && root.Scratch.vm && root.Scratch.vm.runtime;
      return runtime && Array.isArray(runtime.targets) ? runtime.targets : [];
    }

    _targetDisplayName(target) {
      if (target && (target.isStage === true || (target.sprite && target.sprite.isStage === true))) {
        return this._t("menu.stage", "Stage");
      }
      let name = null;
      if (target && typeof target.getName === "function") {
        try { name = target.getName(); }
        catch (error) { name = null; }
      }
      if (!name && target && target.sprite) name = target.sprite.name;
      if (!name && target) name = target.name;
      return name ? String(name) : this._t("menu.unnamedTarget", "Unnamed target");
    }

    async _command(operation, validation = false) {
      try {
        await operation();
        this.lastError = "";
        return "";
      } catch (error) {
        const encoded = this._recordError(error);
        if (validation) this.lastValidationResult = encoded;
        return encoded;
      }
    }

    async _reporter(operation) {
      try {
        const result = await operation();
        this.lastError = "";
        return result;
      } catch (error) {
        return this._recordError(error);
      }
    }

    _recordError(error) {
      const sourceMessage = error && error.message ? error.message : String(error);
      const message = this._t("locale.code", "en") === "zh"
        ? sourceMessage
        : (error && error.englishMessage) || sourceMessage;
      this.lastError = message;
      return JSON.stringify({ error: { name: error.name || "Error", message } });
    }

    _parseJSON(value, label) {
      if (typeof value !== "string") return value;
      try { return JSON.parse(value); }
      catch (error) {
        throw new CircuitError(
          `${label}不是有效 JSON: ${error.message}`,
          `${englishErrorLabel(label)} is not valid JSON: ${error.message}`
        );
      }
    }

    _targetKey(target) {
      if (target && target.id) return String(target.id);
      if (!this.targetIds.has(target)) this.targetIds.set(target, `target-${this.nextTargetId++}`);
      return this.targetIds.get(target);
    }

    _resolveTarget(value, util) {
      if (String(value).toUpperCase() === "SELF") return util && util.target;
      const rawValue = String(value);
      const targetKey = rawValue.toUpperCase().startsWith("TARGET:") ? rawValue.slice(7) : rawValue;
      return this._runtimeTargets().find((target) => this._targetKey(target) === targetKey) || null;
    }

    async _releaseTarget(target) {
      if (!target) return;
      const targetKey = this._targetKey(target);
      const id = this.targetBindings.get(targetKey);
      if (!id) return;
      this.targetBindings.delete(targetKey);
      this.componentBindings.delete(id);
      if (this.core.running) {
        try { await this.core.call("removeComponent", id); }
        catch (error) { this._recordError(error); }
      }
    }
  }

  root.TuringSimulator = TuringSimulator;
  root.Bsen975LogicGateExtension = Bsen975LogicGateExtension;
  root.tempExt = {
    Extension: Bsen975LogicGateExtension,
    info: {
      name: `${EXTENSION_ID}.name`,
      description: `${EXTENSION_ID}.description`,
      extensionId: EXTENSION_ID,
      iconURL: EXTENSION_COVER_URI,
      insetIconURL: EXTENSION_SIDEBAR_ICON_URI,
      featured: true,
      disabled: false
    },
    l10n: {
      "zh-cn": {
        [`${EXTENSION_ID}.name`]: "BSEN975 电路模拟器",
        [`${EXTENSION_ID}.description`]: "搭建、运行和验证使用命名线路的数字逻辑电路。"
      },
      en: {
        [`${EXTENSION_ID}.name`]: "BSEN975 Circuit Simulator",
        [`${EXTENSION_ID}.description`]: "Build, run, and validate digital logic circuits with named physical lines."
      }
    }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      TuringSimulator,
      Bsen975LogicGateExtension,
      LogicCoreController,
      LogicOscillationError,
      CircuitError,
      COMPONENT_DEFINITIONS,
      EXTENSION_ID,
      EXTENSION_SIDEBAR_ICON_URI,
      EXTENSION_ICON_URI,
      EXTENSION_COVER_URI
    };
  }

  if (root.Scratch && root.Scratch.extensions && typeof root.Scratch.extensions.register === "function") {
    root.Scratch.extensions.register(new Bsen975LogicGateExtension());
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
