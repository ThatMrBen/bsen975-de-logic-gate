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

  // Port metadata is the single source of truth for width and direction checks.
  const COMPONENT_DEFINITIONS = Object.freeze({
    INPUT: { ports: { OUT: output(1) }, external: "OUT" },
    OUTPUT: { ports: { IN: input(1) }, observed: "IN" },
    LEVEL_INPUT: { ports: { OUT: output(1) }, external: "OUT" },
    LEVEL_OUTPUT: { ports: { IN: input(1) }, observed: "IN" },
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
    NOT: ["A", "OUT"],
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

  const TYPE_ALIASES = Object.freeze({
    HALFADDER: "HALF_ADDER",
    FULLADDER: "FULL_ADDER",
    ALWAYSON: "ALWAYS_ON",
    ALWAYSOFF: "ALWAYS_OFF",
    "4BIT_ADDER": "ADDER4",
    "8BIT_ADDER": "ADDER8",
    "4比特加法器": "ADDER4",
    "8比特加法器": "ADDER8",
    "1TO8分线器": "SPLITTER",
    "8TO1集线器": "HUB",
    "1TO2分线器": "SPLITTER2",
    "2TO1集线器": "HUB2",
    "1TO4分线器": "SPLITTER4",
    "1TO4": "SPLITTER4",
    "4TO1集线器": "HUB4",
    "4TO1": "HUB4",
    "2TO8": "CONVERTER_2_TO_8",
    "2TO8转换器": "CONVERTER_2_TO_8",
    "8TO2": "CONVERTER_8_TO_2",
    "8TO2转换器": "CONVERTER_8_TO_2",
    "4TO2": "CONVERTER_4_TO_2",
    "4TO2转换器": "CONVERTER_4_TO_2",
    "2TO4": "CONVERTER_2_TO_4",
    "2TO4转换器": "CONVERTER_2_TO_4",
    "4TO8": "CONVERTER_4_TO_8",
    "4TO8转换器": "CONVERTER_4_TO_8",
    "8TO4": "CONVERTER_8_TO_4",
    "8TO4转换器": "CONVERTER_8_TO_4"
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
      this.validationInputs = new Set();
      this.validationOutputs = new Set();
      this.validationInputVectors = [];
      this.validationExpectedVectors = [];
      this.validationResetBeforeEachCase = false;
      this._nextNetId = 1;
    }

    addComponent(id, type, width = 1) {
      const normalizedId = this._normalizeId(id);
      const requestedType = String(type).trim().toUpperCase();
      const normalizedType = TYPE_ALIASES[requestedType] || requestedType;
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
        ...(definition.sequential ? { previousClock: 0 } : {}),
        memory: definition.memory ? new Uint8Array(256) : null
      };
      this.components.set(normalizedId, component);
      if (normalizedType === "LEVEL_INPUT") this.validationInputs.add(normalizedId);
      if (normalizedType === "LEVEL_OUTPUT") this.validationOutputs.add(normalizedId);
      return component;
    }

    connect(id1, port1, id2, port2) {
      const first = this._getEndpoint(id1, port1);
      const second = this._getEndpoint(id2, port2);
      if (first.meta.width !== second.meta.width) {
        throw new CircuitError(
          `端口位宽不匹配: ${first.key}(${first.meta.width}) 与 ${second.key}(${second.meta.width})`,
          `Port width mismatch: ${first.key}(${first.meta.width}) and ${second.key}(${second.meta.width})`
        );
      }
      if (first.key === second.key) return this.endpointToNet.get(first.key) || null;

      const key = this._connectionKey(first.key, second.key);
      if (!this.connections.has(key)) {
        const mergedEndpoints = new Set([first.key, second.key]);
        for (const endpoint of [first, second]) {
          const netId = this.endpointToNet.get(endpoint.key);
          const net = netId && this.nets.get(netId);
          if (net) for (const member of net.endpoints) mergedEndpoints.add(member);
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
        this.connections.set(key, { first: first.key, second: second.key });
        this._rebuildNets();
      }
      return this.endpointToNet.get(first.key);
    }

    disconnect(id1, port1, id2, port2) {
      const first = this._getEndpoint(id1, port1);
      const second = this._getEndpoint(id2, port2);
      const removed = this.connections.delete(this._connectionKey(first.key, second.key));
      if (removed) this._rebuildNets();
      return removed;
    }

    clear() {
      this.components.clear();
      this.nets.clear();
      this.endpointToNet.clear();
      this.connections.clear();
      this.validationInputs.clear();
      this.validationOutputs.clear();
      this.validationInputVectors = [];
      this.validationExpectedVectors = [];
      this.validationResetBeforeEachCase = false;
      this._nextNetId = 1;
      return this;
    }

    resetState() {
      for (const component of this.components.values()) {
        for (const port of component.pins.keys()) component.pins.set(port, 0);
        if (component.definition.sequential) component.previousClock = 0;
        if (component.type === "RAM") component.memory.fill(0);
      }
      for (const net of this.nets.values()) net.value = 0;
      this._settleCombinational();
      return this;
    }

    removeComponent(id) {
      const component = this._getComponent(id);
      const prefix = `${component.id}.`;
      for (const [key, connection] of this.connections) {
        if (connection.first.startsWith(prefix) || connection.second.startsWith(prefix)) {
          this.connections.delete(key);
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
        width: meta.width,
        value: component.pins.get(name),
        connected: this.endpointToNet.has(`${component.id}.${name}`)
      }));
    }

    getPortWidth(id, port) {
      return this._getEndpoint(id, port).meta.width;
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
      const proposedWidth = (endpoint) => (
        endpoint.component === component && scalableSet.has(endpoint.port) ? bitWidth : endpoint.meta.width
      );
      const disconnected = [];
      for (const [key, connection] of this.connections) {
        const first = this._getEndpointByKey(connection.first);
        const second = this._getEndpointByKey(connection.second);
        if (first.component !== component && second.component !== component) continue;
        if (proposedWidth(first) === proposedWidth(second)) continue;
        disconnected.push({ from: connection.first, to: connection.second });
        this.connections.delete(key);
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
          links.push({ from: connection.first, to: connection.second });
        }
      }
      return {
        id: component.id,
        type: component.type,
        bitWidth: component.bitWidth,
        ports: component.definition.ports,
        pins: Object.fromEntries(component.pins),
        links
      };
    }

    exportGraph() {
      return {
        components: Array.from(this.components.values(), (component) => ({
          id: component.id,
          type: component.type,
          bitWidth: component.bitWidth,
          ports: component.definition.ports,
          pins: Object.fromEntries(component.pins)
        })),
        connections: Array.from(this.connections.values(), ({ first, second }) => ({ from: first, to: second })),
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
          width: component.bitWidth == null ? 1 : component.bitWidth
        })),
        connections: Array.from(this.connections.values(), ({ first, second }) => ({
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
            if (component.definition.sequential) state.previousClock = component.previousClock;
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
        const first = this._splitEndpointKey(connection.from, "连线起点");
        const second = this._splitEndpointKey(connection.to, "连线终点");
        replacement.connect(first.id, first.port, second.id, second.port);
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
        for (const [port, meta] of Object.entries(component.definition.ports)) {
          if (!own(state.pins, port)) {
            throw new CircuitError(
              `快照缺少端口状态: ${component.id}.${port}`,
              `Snapshot is missing port state: ${component.id}.${port}`
            );
          }
          component.pins.set(
            port,
            replacement._normalizeSignal(state.pins[port], meta.width, `${component.id}.${port}`)
          );
        }
        if (component.definition.sequential) {
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
      this.validationInputs = replacement.validationInputs;
      this.validationOutputs = replacement.validationOutputs;
      this.validationInputVectors = [];
      this.validationExpectedVectors = [];
      this.validationResetBeforeEachCase = false;
      this._nextNetId = replacement._nextNetId;
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
        if (update.kind === "register") {
          if (update.component.pins.get("Q") !== update.value) sequentialChanged = true;
          update.component.pins.set("Q", update.value);
        } else {
          if (update.component.memory[update.address] !== update.value) sequentialChanged = true;
          update.component.memory[update.address] = update.value;
        }
      }
      for (const component of this.components.values()) {
        if (component.definition.sequential) component.previousClock = component.pins.get("CLK");
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
        if (endpoint.meta.direction !== "input" || endpoint.component.pins.get(endpoint.port) === value) continue;
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
        const width = this._getEndpointByKey(endpoints[0]).meta.width;
        const net = { id, width, endpoints: new Set(endpoints), value: 0 };
        this.nets.set(id, net);
        for (const endpoint of endpoints) this.endpointToNet.set(endpoint, id);
      }

      // Inputs disconnected from every net immediately return to their documented default value.
      for (const component of this.components.values()) {
        for (const [port, meta] of Object.entries(component.definition.ports)) {
          if (meta.direction !== "input" || this.endpointToNet.has(`${component.id}.${port}`)) continue;
          component.pins.set(port, 0);
        }
      }
    }
  }

  const TRANSLATION_PREFIX = "bsen975LogicGate.";
  const ZH_CN_TRANSLATIONS = Object.freeze({
    "locale.code": "zh",
    "status.notValidated": "尚未验证",
    name: "BSEN975 电路模拟器",
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
    "help.step3": "按“元件ID.端口”连接端口，例如 input.OUT → gate.A。",
    "help.step4": "设置输入值，再按所需 Hz 执行“传播电路直到稳定”；0 Hz 表示不限速。",
    "help.step5": "寄存器或 RAM 使用时钟时，执行“让时钟输入产生脉冲”。",
    "help.step6": "载入测试用例后，可按编号运行单组，也可按指定 Hz 运行全部测试，再从测试结果 JSON 读取结果。",
    "help.rules": "接线规则",
    "help.rule1": "元件 ID 区分大小写，端口名称不区分大小写。",
    "help.rule2": "只能连接相同位宽的端口；一个网络只能有一个输出驱动端。",
    "help.rule3": "未连接的输入默认为 0。组合逻辑传播不会触发寄存器或 RAM；“模拟电路 N 步”始终只推进 N 步。",
    "help.rule4": "测试输入和测试输出会自动成为验证接口；普通外部输入和输出不会。",
    "help.memoryWiring": "正常运行时，ROM 和 RAM 必须通过 ADDR、DATA、DIN、DOUT、WE、CLK 引脚与其他元件连接。直接装载、读写和清空存储器的积木只用于关卡初始化、存档和调试。",
    "help.testing": "测试数据示例",
    "help.testingNote": "下面的数据验证 input → NOT → output：",
    "help.more": "完整元件端口可在“元件的端口列表 JSON”中查询，运行状态可从“当前电路的运行状态 JSON”检查。",
    "help.widthTitle": "比特位宽",
    "help.widthNote": "添加可变宽度元件时，位宽可以设置为 1、2、4 或 8。数据引脚会采用所选位宽，SEL、CLK、WE 等控制引脚仍为 1 位。固定结构元件使用下表中的固定位宽。",
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
    "block.start": "启动电路模拟器",
    "block.stop": "关闭电路模拟器",
    "block.running": "电路模拟器已启动？",
    "block.lastError": "最近一次错误",
    "block.clear": "清空当前电路",
    "block.reset": "重置电路运行状态",
    "block.add": "添加 [type] 元件 ID [id] 位宽 [width] 绑定 [dependency]",
    "block.remove": "删除元件 ID [id]",
    "block.exists": "存在元件 ID [id]？",
    "block.connection": "[action] 端口 [id1].[port1] 和 [id2].[port2]",
    "block.componentIds": "所有元件 ID JSON",
    "block.ports": "元件 [id] 的端口列表 JSON",
    "block.portWidth": "端口 [id].[port] 的位宽",
    "block.portProperty": "端口 [id].[port] 的 [property]",
    "block.setWidth": "将元件 [id] 的位宽改为 [width]",
    "block.export": "导出电路结构 JSON",
    "block.import": "导入电路结构或快照 JSON [json]",
    "block.setInput": "将输入 [id] 设为 [value]",
    "block.setInputs": "批量设置输入 JSON [json]",
    "block.getPort": "端口 [id].[port] 的值",
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
    "block.graph": "当前电路状态 JSON",
    "block.circuitData": "当前电路的 [kind] JSON",
    "menu.noBinding": "不绑定",
    "menu.currentTarget": "当前角色",
    "menu.currentClone": "当前克隆体",
    "menu.stage": "舞台",
    "menu.unnamedTarget": "未命名角色",
    "menu.self": "自己",
    "menu.cloneSuffix": "（克隆体）",
    "menu.connect": "连接",
    "menu.disconnect": "断开",
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
      const TYPE_ALIASES = Object.freeze(${JSON.stringify(TYPE_ALIASES)});
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
        id: "bsen975DeLogicGate",
        name: t("name", "BSEN975 Circuit Simulator"),
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
            opcode: "operateConnection", blockType: command,
            text: t("block.connection", "[action] ports [id1].[port1] and [id2].[port2]"),
            arguments: {
              action: { type: string, menu: "connectionActions", defaultValue: "CONNECT" },
              id1: { type: string, defaultValue: "input1" },
              port1: { type: string, defaultValue: "OUT" },
              id2: { type: string, defaultValue: "gate1" },
              port2: { type: string, defaultValue: "A" }
            }
          },
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
          },

          // Keep legacy opcodes registered so existing projects continue to run.
          {
            opcode: "getPort", blockType: reporter, hideFromPalette: true,
            text: t("block.getPort", "value of port [id].[port]"),
            arguments: {
              id: { type: string, defaultValue: "gate1" },
              port: { type: string, defaultValue: "OUT" }
            }
          },
          {
            opcode: "getPortWidth", blockType: reporter, hideFromPalette: true,
            text: t("block.portWidth", "bit width of port [id].[port]"),
            arguments: {
              id: { type: string, defaultValue: "gate1" },
              port: { type: string, defaultValue: "OUT" }
            }
          },
          {
            opcode: "exportCircuit", blockType: reporter, hideFromPalette: true,
            text: t("block.export", "export circuit structure JSON")
          },
          {
            opcode: "getGraph", blockType: reporter, hideFromPalette: true,
            text: t("block.graph", "current circuit state JSON")
          }
        ],
        menus: {
          componentTypes: { acceptReporters: true, items: typeMenu() },
          dependencies: { acceptReporters: true, items: "getDependencyMenu" },
          connectionActions: {
            acceptReporters: false,
            items: [
              { text: t("menu.connect", "connect"), value: "CONNECT" },
              { text: t("menu.disconnect", "disconnect"), value: "DISCONNECT" }
            ]
          },
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
        t("help.step3", "Connect ports as componentID.port, for example input.OUT → gate.A."),
        t("help.step4", "Set input values, then settle at the requested Hz. Use 0 Hz for unlimited speed."),
        t("help.step5", "For registers or RAM, pulse the connected clock input."),
        t("help.step6", "Load test cases, then run one numbered case or all cases at the requested Hz and read the result JSON.")
      ], true);
      addHeading(t("help.rules", "Wiring Rules"));
      addList([
        t("help.rule1", "Component IDs are case-sensitive. Port names are case-insensitive."),
        t("help.rule2", "Only ports with equal widths can connect. Each net can have only one output driver."),
        t("help.rule3", "Unconnected inputs default to 0. Settling does not trigger registers or RAM, and simulate N steps always advances exactly N steps."),
        t("help.rule4", "Test Input and Test Output automatically become validation interfaces; regular external I/O does not.")
      ]);
      addParagraph(t(
        "help.memoryWiring",
        "During normal execution, ROM and RAM connect to other components through ADDR, DATA, DIN, DOUT, WE, and CLK pins. Direct memory load, read, write, and clear blocks are only for level setup, saves, and debugging."
      ));
      addHeading(t("help.widthTitle", "Bit Width"));
      addParagraph(t(
        "help.widthNote",
        "For scalable components, choose a width of 1, 2, 4, or 8 when adding the component. Data pins use that width, while control pins such as SEL, CLK, and WE remain 1 bit. Fixed-layout components use the widths below."
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
        [t("block.reset", "reset circuit state"), local("重新初始化运行状态。", "Reinitialize runtime state."), local("保留元件和连线；清零引脚、寄存器和 RAM，保留 ROM。", "Keeps components and wires; clears pins, registers, and RAM while preserving ROM.")],
        [t("block.add", "add [type] component ID [id] width [width] bind to [dependency]"), local("创建一个元件实例。", "Create a component instance."), local("加入指定 ID、类型和位宽的元件；LEVEL 接口自动加入测试，选定目标会建立绑定。", "Adds the selected ID, type, and width; LEVEL interfaces join validation and a selected target is bound.")],
        [t("block.remove", "remove component ID [id]"), local("删除一个元件。", "Delete one component."), local("同时移除其连线、测试接口登记和角色绑定。", "Also removes its wires, validation-interface entry, and target binding.")],
        [t("block.exists", "component ID [id] exists?"), local("检查 ID 是否已使用。", "Check whether an ID is in use."), local("返回布尔值，不修改电路。", "Returns a Boolean without changing the circuit.")],
        [t("block.connection", "[action] ports [id1].[port1] and [id2].[port2]"), local("连接或断开两个端口。", "Connect or disconnect two ports."), local("连接会合并网络；断开只删除指定边。位宽不一致或多驱动时失败。", "Connect merges nets; disconnect removes only that edge. Width mismatch or multiple drivers fails.")],
        [t("block.componentIds", "all component IDs JSON"), local("枚举电路元件。", "Enumerate circuit components."), local("返回按添加顺序排列的 ID 数组 JSON。", "Returns a JSON array of IDs in insertion order.")],
        [t("block.ports", "ports of component [id] JSON"), local("检查元件全部引脚。", "Inspect every pin on a component."), local("返回名称、方向、位宽、当前值和连接状态。", "Returns name, direction, width, current value, and connection state.")],
        [t("block.setWidth", "set component [id] width to [width]"), local("修改可变宽度元件。", "Resize a scalable component."), local("更新数据引脚到 1/2/4/8 位，固定控制脚不变，并断开不兼容连线。", "Changes data pins to 1/2/4/8 bits, preserves fixed control pins, and disconnects incompatible wires.")],
        [t("block.circuitData", "current circuit [kind] JSON"), local("导出结构、调试状态或完整快照。", "Export structure, debug state, or a full snapshot."), local("结构用于模板；运行状态用于观察信号；快照还保存 RAM、ROM、寄存器和时钟历史。", "Structure is for templates, runtime state observes signals, and snapshots also preserve RAM, ROM, registers, and clock history.")],
        [t("block.import", "import circuit structure or snapshot JSON [json]"), local("载入已保存的结构或快照。", "Load a saved structure or snapshot."), local("完整校验后原子替换电路，并清除旧绑定和测试数据；失败时保留原电路。", "Atomically replaces the circuit after full validation and clears bindings/tests; failure preserves the old circuit.")],
        [t("block.setInput", "set input [id] to [value]"), local("设置单个外部输入。", "Set one external input."), local("只修改输入源 OUT；需要随后传播或产生时钟。", "Changes only the source OUT pin; settle or pulse afterward.")],
        [t("block.setInputs", "set inputs from JSON [json]"), local("一次设置多个输入。", "Set multiple inputs at once."), local("按 ID 写入所有给定输入；不会自动传播。", "Writes every supplied input by ID without settling automatically.")],
        [t("block.portProperty", "[property] of port [id].[port]"), local("查询单个引脚的值或位宽。", "Read one pin's value or width."), local("返回一个数字，不修改电路。", "Returns a number without changing the circuit.")],
        [t("block.readPorts", "read ports from JSON [json]"), local("批量读取引脚值。", "Read several pin values."), local("返回以“元件ID.端口”为键的对象 JSON。", "Returns a JSON object keyed by componentID.port.")],
        [t("block.settle", "settle circuit until stable at [hz] Hz"), local("按指定频率传播组合逻辑。", "Propagate combinational logic at the requested rate."), local("计算到稳定或报告振荡；Hz 限制传播节拍，0 表示不限速；不会采样寄存器和 RAM 上升沿。", "Runs until stable or reports oscillation; Hz limits propagation pacing, 0 is unlimited, and register/RAM edges are not sampled.")],
        [t("block.pulse", "pulse clock input [id] [count] times"), local("产生完整时钟脉冲。", "Generate complete clock pulses."), local("每次执行低电平传播再执行上升沿传播，触发寄存器和 WE=1 的 RAM，最终 CLK 为 1。", "Each pulse settles low then rising high, triggering registers and WE=1 RAM; CLK ends high.")],
        [t("block.steps", "simulate circuit for [ticks] steps (advanced)"), local("精确推进指定数量的完整模拟步骤。", "Advance exactly the requested number of full simulation steps."), local("只执行 ticks 步；每步先稳定组合逻辑，再采样当前 CLK 上升沿，不会在后台继续运行。", "Runs exactly ticks steps; each settles combinational logic then samples CLK edges, with no background execution.")],
        [t("block.loadTests", "load test cases inputs [inputs] expected [expected] mode [mode]"), local("保存输入、期望向量和状态模式。", "Store input vectors, expected vectors, and state mode."), local("每组重置会在用例前清寄存器/RAM；连续模式按顺序保留时序状态。", "Reset mode clears registers/RAM before each case; preserve mode carries sequential state forward.")],
        [t("block.runCase", "run test case [caseNumber] at [hz] Hz"), local("只执行指定编号的已载入测试。", "Execute one loaded test case by number."), local("按载入时选择的状态模式处理该组，写输入、传播并比较 LEVEL_OUTPUT；结果 JSON 的 total 为 1。", "Applies the loaded state mode, writes inputs, settles, and compares LEVEL_OUTPUT; result JSON has total 1.")],
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
        "Use the component ports JSON block for complete port metadata and current circuit state JSON for runtime diagnostics."
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

    async getPortWidth(args) {
      return this._reporter(() => this.core.call("getPortWidth", args.id, args.port));
    }

    async getPortProperty(args) {
      const method = String(args.property).toUpperCase() === "WIDTH" ? "getPortWidth" : "getPort";
      return this._reporter(() => this.core.call(method, args.id, args.port));
    }

    async setComponentWidth(args) {
      return this._command(() => this.core.call("setComponentWidth", args.id, args.width));
    }

    async exportCircuit() {
      return this._reporter(async () => JSON.stringify(await this.core.call("exportCircuit")));
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

    async operateConnection(args) {
      return this._command(async () => {
        const method = String(args.action).toUpperCase() === "DISCONNECT" ? "disconnect" : "connect";
        await this.core.call(method, args.id1, args.port1, args.id2, args.port2);
      });
    }

    async setInputLevel(args) {
      return this._command(() => this.core.call("setPort", args.id, "OUT", args.value));
    }

    async setInputLevels(args) {
      return this._command(() => this.core.call("setInputs", this._parseJSON(args.json, "输入数据")));
    }

    async getPort(args) {
      return this._reporter(() => this.core.call("getPort", args.id, args.port));
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

    async getGraph() {
      return this._reporter(async () => JSON.stringify(await this.core.call("exportGraph")));
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
  root.Bsen975LogicGateEngine = TuringSimulator;
  root.Bsen975LogicGateExtension = Bsen975LogicGateExtension;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      TuringSimulator,
      Bsen975LogicGateEngine: TuringSimulator,
      Bsen975LogicGateExtension,
      LogicCoreController,
      LogicOscillationError,
      CircuitError,
      COMPONENT_DEFINITIONS
    };
  }

  if (root.Scratch && root.Scratch.extensions && typeof root.Scratch.extensions.register === "function") {
    root.Scratch.extensions.register(new Bsen975LogicGateExtension());
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
