"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var mqttService_exports = {};
__export(mqttService_exports, {
  addOrUpdatePackData: () => addOrUpdatePackData,
  connectCloudMqttClient: () => connectCloudMqttClient,
  connectLocalMqttClient: () => connectLocalMqttClient,
  setAcMode: () => setAcMode,
  setAcSwitch: () => setAcSwitch,
  setAutoModel: () => setAutoModel,
  setAutoRecover: () => setAutoRecover,
  setBuzzerSwitch: () => setBuzzerSwitch,
  setChargeLimit: () => setChargeLimit,
  setDcSwitch: () => setDcSwitch,
  setDischargeLimit: () => setDischargeLimit,
  setHubState: () => setHubState,
  setInputLimit: () => setInputLimit,
  setOutputLimit: () => setOutputLimit,
  setPassMode: () => setPassMode,
  subscribeIotTopic: () => subscribeIotTopic,
  subscribeReportTopic: () => subscribeReportTopic,
  triggerFullTelemetryUpdate: () => triggerFullTelemetryUpdate
});
module.exports = __toCommonJS(mqttService_exports);
var mqtt = __toESM(require("mqtt"));
var import_adapterService = require("./adapterService");
var import_calculationService = require("./calculationService");
var import_jobSchedule = require("./jobSchedule");
var import_createSolarFlowLocalStates = require("../helpers/createSolarFlowLocalStates");
var import_createSolarFlowStates = require("../helpers/createSolarFlowStates");
let adapter = void 0;
const knownPackDataProperties = [
  "sn",
  "totalVol",
  "maxVol",
  "minVol",
  "socLevel",
  "maxTemp",
  "soh"
  // Consider adding batcur here if it's a standard property you expect
];
const addOrUpdatePackData = async (productKey, deviceKey, packData, isSolarFlow) => {
  if (adapter && productKey && deviceKey) {
    await packData.forEach(async (x) => {
      if (x.sn && adapter) {
        let batType = "";
        if (productKey == "yWF7hV") {
          batType = "AIO2400";
        } else if (x.sn.startsWith("C")) {
          if (x.sn[3] == "F") {
            batType = "AB2000S";
          } else {
            batType = "AB2000";
          }
        } else if (x.sn.startsWith("A")) {
          batType = "AB1000";
        }
        if (!adapter.pack2Devices.some(
          (y) => y.packSn == x.sn && y.deviceKey == deviceKey
        )) {
          adapter.pack2Devices.push({
            packSn: x.sn,
            deviceKey,
            type: batType
          });
          adapter.log.debug(
            `[addOrUpdatePackData] Added battery ${batType} with SN ${x.sn} on deviceKey ${deviceKey} to pack2Devices!`
          );
        }
        const key = (productKey + "." + deviceKey + ".packData." + x.sn).replace(adapter.FORBIDDEN_CHARS, "");
        await (adapter == null ? void 0 : adapter.extendObject(key, {
          type: "channel",
          common: {
            name: {
              de: batType,
              en: batType
            }
          },
          native: {}
        }));
        await (adapter == null ? void 0 : adapter.extendObject(key + ".model", {
          type: "state",
          common: {
            name: {
              de: "Batterietyp",
              en: "Battery type"
            },
            type: "string",
            desc: "model",
            role: "value",
            read: true,
            write: false
          },
          native: {}
        }));
        await (adapter == null ? void 0 : adapter.setState(key + ".model", batType, true));
        await (adapter == null ? void 0 : adapter.extendObject(key + ".sn", {
          type: "state",
          common: {
            name: {
              de: "Seriennummer",
              en: "Serial id"
            },
            type: "string",
            desc: "Serial ID",
            role: "value",
            read: true,
            write: false
          },
          native: {}
        }));
        await (adapter == null ? void 0 : adapter.setState(key + ".sn", x.sn, true));
        if (x.socLevel != null) {
          await (adapter == null ? void 0 : adapter.extendObject(key + ".socLevel", {
            type: "state",
            common: {
              name: {
                de: "SOC der Batterie",
                en: "soc of battery"
              },
              type: "number",
              desc: "SOC Level",
              role: "value",
              read: true,
              write: false,
              unit: "%"
            },
            native: {}
          }));
          await (adapter == null ? void 0 : adapter.setState(key + ".socLevel", x.socLevel, true));
        }
        if (x.maxTemp != null) {
          await (adapter == null ? void 0 : adapter.extendObject(key + ".maxTemp", {
            type: "state",
            common: {
              name: {
                de: "Max. Temperatur der Batterie",
                en: "max temp. of battery"
              },
              type: "number",
              desc: "Max. Temp",
              role: "value",
              read: true,
              write: false,
              unit: "\xB0C"
            },
            native: {}
          }));
          await (adapter == null ? void 0 : adapter.setState(
            key + ".maxTemp",
            x.maxTemp / 10 - 273.15,
            true
          ));
        }
        if (x.minVol != null) {
          await (adapter == null ? void 0 : adapter.extendObject(key + ".minVol", {
            type: "state",
            common: {
              name: "minVol",
              type: "number",
              desc: "minVol",
              role: "value",
              read: true,
              write: false,
              unit: "V"
            },
            native: {}
          }));
          await (adapter == null ? void 0 : adapter.setState(key + ".minVol", x.minVol / 100, true));
        }
        if (x.batcur != null) {
          await (adapter == null ? void 0 : adapter.extendObject(key + ".batcur", {
            type: "state",
            common: {
              name: "batcur",
              type: "number",
              desc: "batcur",
              role: "value",
              read: true,
              write: false,
              unit: "A"
            },
            native: {}
          }));
          await (adapter == null ? void 0 : adapter.setState(key + ".batcur", x.batcur / 10, true));
        }
        if (x.maxVol != null) {
          await (adapter == null ? void 0 : adapter.extendObject(key + ".maxVol", {
            type: "state",
            common: {
              name: "maxVol",
              type: "number",
              desc: "maxVol",
              role: "value",
              read: true,
              write: false,
              unit: "V"
            },
            native: {}
          }));
          await (adapter == null ? void 0 : adapter.setState(key + ".maxVol", x.maxVol / 100, true));
        }
        if (x.totalVol != null) {
          await (adapter == null ? void 0 : adapter.extendObject(key + ".totalVol", {
            type: "state",
            common: {
              name: "totalVol",
              type: "number",
              desc: "totalVol",
              role: "value",
              read: true,
              write: false,
              unit: "V"
            },
            native: {}
          }));
          const totalVol = x.totalVol / 100;
          await (adapter == null ? void 0 : adapter.setState(key + ".totalVol", totalVol, true));
          if (isSolarFlow) {
            (0, import_adapterService.checkVoltage)(adapter, productKey, deviceKey, totalVol);
          }
        }
        if (x.soh != null) {
          await (adapter == null ? void 0 : adapter.extendObject(key + ".soh", {
            type: "state",
            common: {
              name: {
                de: "Gesundheitszustand",
                en: "State of Health"
              },
              type: "number",
              desc: "State of Health",
              role: "value",
              read: true,
              write: false,
              unit: "%"
            },
            native: {}
          }));
          await (adapter == null ? void 0 : adapter.setState(key + ".soh", x.soh / 10, true));
        }
        Object.entries(x).forEach(([propKey, value]) => {
          if (!knownPackDataProperties.includes(propKey)) {
            adapter == null ? void 0 : adapter.log.debug(
              `[addOrUpdatePackData] SN: ${x.sn}, UNKNOWN PackData Property: ${propKey} with value ${value}. Consider adding to knownPackDataProperties if expected.`
            );
          }
        });
      }
    });
  }
};
const onMessage = async (topic, message) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N, _O, _P, _Q, _R, _S, _T, _U, _V, _W, _X, _Y, _Z, __, _$, _aa, _ba, _ca, _da, _ea, _fa, _ga, _ha, _ia, _ja, _ka, _la, _ma, _na, _oa, _pa, _qa, _ra, _sa, _ta, _ua, _va, _wa, _xa, _ya, _za, _Aa, _Ba, _Ca, _Da, _Ea, _Fa, _Ga, _Ha, _Ia, _Ja, _Ka, _La, _Ma, _Na, _Oa, _Pa, _Qa, _Ra, _Sa, _Ta, _Ua, _Va, _Wa, _Xa;
  if (adapter) {
    if (topic.toLowerCase().includes("loginout/force")) {
      adapter.log.warn(`[onMessage] Received 'loginOut/force' on topic: ${topic}`);
    }
    const topicSplitted = topic.replace("/server/app", "").split("/");
    const productKey = topicSplitted[1];
    const deviceKey = topicSplitted[2];
    if (!productKey || !deviceKey) {
      adapter.log.warn(`[onMessage] Could not parse productKey or deviceKey from topic: ${topic}`);
      return;
    }
    let obj = {};
    try {
      obj = JSON.parse(message.toString());
    } catch (e) {
      const txt = message.toString();
      adapter.log.error(`[onMessage] JSON Parse error for device ${productKey}.${deviceKey}!`);
      adapter.log.debug(`[onMessage] JSON Parse error content: ${txt}!`);
      return;
    }
    let isSolarFlow = false;
    const productNameState = await adapter.getStateAsync(
      `${productKey}.${deviceKey}.productName`
    );
    const productName = (_a = productNameState == null ? void 0 : productNameState.val) == null ? void 0 : _a.toString().toLowerCase();
    if (adapter.log.level == "debug") {
      adapter.log.debug(`[onMessage] MQTT message for ${productKey}.${deviceKey}: ${message.toString()}`);
    }
    if (obj.timestamp) {
      const currentTimeStamp = (/* @__PURE__ */ new Date()).getTime() / 1e3;
      const diff = currentTimeStamp - obj.timestamp;
      const offlineThreshold = adapter.config.offlineThresholdSeconds || 300;
      if (diff > offlineThreshold) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "wifiState",
          "Disconnected"
        );
      } else {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "wifiState",
          "Connected"
        );
      }
    }
    if (productKey !== "8bM93H") {
      isSolarFlow = true;
    }
    if ((productName == null ? void 0 : productName.includes("solarflow")) || (productName == null ? void 0 : productName.includes("hyper")) || (productName == null ? void 0 : productName.includes("aio"))) {
      isSolarFlow = true;
    }
    (0, import_adapterService.updateSolarFlowState)(
      adapter,
      productKey,
      deviceKey,
      "lastUpdate",
      (/* @__PURE__ */ new Date()).getTime()
    );
    if (obj.properties) {
      if (((_b = obj.properties) == null ? void 0 : _b.autoModel) != null && ((_c = obj.properties) == null ? void 0 : _c.autoModel) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "autoModel",
          obj.properties.autoModel
        );
        (0, import_adapterService.updateSolarFlowControlState)(
          adapter,
          productKey,
          deviceKey,
          "autoModel",
          obj.properties.autoModel
        );
      }
      if (((_d = obj.properties) == null ? void 0 : _d.heatState) != null && ((_e = obj.properties) == null ? void 0 : _e.heatState) != void 0) {
        const value = ((_f = obj.properties) == null ? void 0 : _f.heatState) == 0 ? false : true;
        (0, import_adapterService.updateSolarFlowState)(adapter, productKey, deviceKey, "heatState", value);
      }
      if (((_g = obj.properties) == null ? void 0 : _g.electricLevel) != null && ((_h = obj.properties) == null ? void 0 : _h.electricLevel) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "electricLevel",
          obj.properties.electricLevel
        );
        if ((adapter == null ? void 0 : adapter.config.useCalculation) && obj.properties.electricLevel == 100 && isSolarFlow) {
          (0, import_calculationService.setEnergyWhMax)(adapter, productKey, deviceKey);
        }
        if (obj.properties.electricLevel == 100) {
          const fullChargeNeeded = await adapter.getStateAsync(
            productKey + "." + deviceKey + ".control.fullChargeNeeded"
          );
          if (fullChargeNeeded && fullChargeNeeded.val === true) {
            await (adapter == null ? void 0 : adapter.setState(
              `${productKey}.${deviceKey}.control.fullChargeNeeded`,
              false,
              true
            ));
          }
        }
        const minSocState = await (adapter == null ? void 0 : adapter.getStateAsync(
          `${productKey}.${deviceKey}.minSoc`
        ));
        if ((adapter == null ? void 0 : adapter.config.useCalculation) && minSocState && minSocState.val != null && // Check val exists
        obj.properties.electricLevel == Number(minSocState.val) && isSolarFlow) {
          (0, import_calculationService.setSocToZero)(adapter, productKey, deviceKey);
        }
      }
      if (((_i = obj.properties) == null ? void 0 : _i.power) != null && ((_j = obj.properties) == null ? void 0 : _j.power) != void 0) {
        const value = obj.properties.power / 10;
        (0, import_adapterService.updateSolarFlowState)(adapter, productKey, deviceKey, "power", value);
      }
      if (((_k = obj.properties) == null ? void 0 : _k.packState) != null && ((_l = obj.properties) == null ? void 0 : _l.packState) != void 0) {
        const value = ((_m = obj.properties) == null ? void 0 : _m.packState) == 0 ? "Idle" : ((_n = obj.properties) == null ? void 0 : _n.packState) == 1 ? "Charging" : ((_o = obj.properties) == null ? void 0 : _o.packState) == 2 ? "Discharging" : "Unknown";
        (0, import_adapterService.updateSolarFlowState)(adapter, productKey, deviceKey, "packState", value);
      }
      if (((_p = obj.properties) == null ? void 0 : _p.passMode) != null && ((_q = obj.properties) == null ? void 0 : _q.passMode) != void 0) {
        const value = ((_r = obj.properties) == null ? void 0 : _r.passMode) == 0 ? "Automatic" : ((_s = obj.properties) == null ? void 0 : _s.passMode) == 1 ? "Always off" : ((_t = obj.properties) == null ? void 0 : _t.passMode) == 2 ? "Always on" : "Unknown";
        (0, import_adapterService.updateSolarFlowState)(adapter, productKey, deviceKey, "passMode", value);
        (0, import_adapterService.updateSolarFlowControlState)(
          adapter,
          productKey,
          deviceKey,
          "passMode",
          (_u = obj.properties) == null ? void 0 : _u.passMode
        );
      }
      if (((_v = obj.properties) == null ? void 0 : _v.pass) != null && ((_w = obj.properties) == null ? void 0 : _w.pass) != void 0) {
        const value = ((_x = obj.properties) == null ? void 0 : _x.pass) == 0 ? false : true;
        (0, import_adapterService.updateSolarFlowState)(adapter, productKey, deviceKey, "pass", value);
      }
      if (((_y = obj.properties) == null ? void 0 : _y.autoRecover) != null && ((_z = obj.properties) == null ? void 0 : _z.autoRecover) != void 0) {
        const value = ((_A = obj.properties) == null ? void 0 : _A.autoRecover) == 0 ? false : true;
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "autoRecover",
          value
        );
        (0, import_adapterService.updateSolarFlowControlState)(
          adapter,
          productKey,
          deviceKey,
          "autoRecover",
          value
        );
      }
      if (((_B = obj.properties) == null ? void 0 : _B.outputHomePower) != null && ((_C = obj.properties) == null ? void 0 : _C.outputHomePower) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "outputHomePower",
          obj.properties.outputHomePower
        );
      }
      if (((_D = obj.properties) == null ? void 0 : _D.energyPower) != null && ((_E = obj.properties) == null ? void 0 : _E.energyPower) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "energyPower",
          obj.properties.energyPower
        );
      }
      if (((_F = obj.properties) == null ? void 0 : _F.outputLimit) != null && ((_G = obj.properties) == null ? void 0 : _G.outputLimit) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "outputLimit",
          obj.properties.outputLimit
        );
        (0, import_adapterService.updateSolarFlowControlState)(
          adapter,
          productKey,
          deviceKey,
          "setOutputLimit",
          obj.properties.outputLimit
        );
      }
      if (((_H = obj.properties) == null ? void 0 : _H.buzzerSwitch) != null && ((_I = obj.properties) == null ? void 0 : _I.buzzerSwitch) != void 0) {
        const value = ((_J = obj.properties) == null ? void 0 : _J.buzzerSwitch) == 0 ? false : true;
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "buzzerSwitch",
          value
        );
        (0, import_adapterService.updateSolarFlowControlState)(
          adapter,
          productKey,
          deviceKey,
          "buzzerSwitch",
          value
        );
      }
      if (((_K = obj.properties) == null ? void 0 : _K.outputPackPower) != null && ((_L = obj.properties) == null ? void 0 : _L.outputPackPower) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "outputPackPower",
          obj.properties.outputPackPower
        );
        (0, import_adapterService.updateSolarFlowState)(adapter, productKey, deviceKey, "packInputPower", 0);
      }
      if (((_M = obj.properties) == null ? void 0 : _M.packInputPower) != null && ((_N = obj.properties) == null ? void 0 : _N.packInputPower) != void 0) {
        let standbyUsage = 0;
        const solarInputPowerState = await (adapter == null ? void 0 : adapter.getStateAsync(
          `${productKey}.${deviceKey}.solarInputPower`
        ));
        const solarInputPowerVal = Number(solarInputPowerState == null ? void 0 : solarInputPowerState.val);
        if (solarInputPowerState && solarInputPowerVal < 10) {
          standbyUsage = 7 - solarInputPowerVal;
        }
        const device = (_O = adapter == null ? void 0 : adapter.deviceList) == null ? void 0 : _O.find(
          (x) => x.deviceKey == deviceKey && x.productKey == productKey
        );
        if (device && device._connectedWithAce) {
          standbyUsage += 7;
        }
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "packInputPower",
          obj.properties.packInputPower + standbyUsage
        );
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "outputPackPower",
          0
        );
      }
      if (((_P = obj.properties) == null ? void 0 : _P.solarInputPower) != null && ((_Q = obj.properties) == null ? void 0 : _Q.solarInputPower) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "solarInputPower",
          obj.properties.solarInputPower
        );
      }
      if (((_R = obj.properties) == null ? void 0 : _R.pvPower1) != null && ((_S = obj.properties) == null ? void 0 : _S.pvPower1) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "pvPower2",
          // Reversed (MQTT pvPower1 -> State pvPower2)
          obj.properties.pvPower1
        );
      }
      if (((_T = obj.properties) == null ? void 0 : _T.pvPower2) != null && ((_U = obj.properties) == null ? void 0 : _U.pvPower2) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "pvPower1",
          // Reversed (MQTT pvPower2 -> State pvPower1)
          obj.properties.pvPower2
        );
      }
      if (((_V = obj.properties) == null ? void 0 : _V.pvPower3) != null && ((_W = obj.properties) == null ? void 0 : _W.pvPower3) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "pvPower4",
          // Assuming reversal continues (MQTT pvPower3 -> State pvPower4)
          obj.properties.pvPower3
        );
      }
      if (((_X = obj.properties) == null ? void 0 : _X.pvPower4) != null && ((_Y = obj.properties) == null ? void 0 : _Y.pvPower4) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "pvPower3",
          // Assuming reversal continues (MQTT pvPower4 -> State pvPower3)
          obj.properties.pvPower4
        );
      }
      if (((_Z = obj.properties) == null ? void 0 : _Z.solarPower1) != null && ((__ = obj.properties) == null ? void 0 : __.solarPower1) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "pvPower1",
          // MQTT solarPower1 -> State pvPower1
          obj.properties.solarPower1
        );
      }
      if (((_$ = obj.properties) == null ? void 0 : _$.solarPower2) != null && ((_aa = obj.properties) == null ? void 0 : _aa.solarPower2) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "pvPower2",
          // MQTT solarPower2 -> State pvPower2
          obj.properties.solarPower2
        );
      }
      if (((_ba = obj.properties) == null ? void 0 : _ba.solarPower3) != null && ((_ca = obj.properties) == null ? void 0 : _ca.solarPower3) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "pvPower3",
          // MQTT solarPower3 -> State pvPower3
          obj.properties.solarPower3
        );
      }
      if (((_da = obj.properties) == null ? void 0 : _da.solarPower4) != null && ((_ea = obj.properties) == null ? void 0 : _ea.solarPower4) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "pvPower4",
          // MQTT solarPower4 -> State pvPower4
          obj.properties.solarPower4
        );
      }
      if (((_fa = obj.properties) == null ? void 0 : _fa.remainOutTime) != null && ((_ga = obj.properties) == null ? void 0 : _ga.remainOutTime) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "remainOutTime",
          obj.properties.remainOutTime
        );
      }
      if (((_ha = obj.properties) == null ? void 0 : _ha.remainInputTime) != null && ((_ia = obj.properties) == null ? void 0 : _ia.remainInputTime) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "remainInputTime",
          obj.properties.remainInputTime
        );
      }
      if (((_ja = obj.properties) == null ? void 0 : _ja.socSet) != null && ((_ka = obj.properties) == null ? void 0 : _ka.socSet) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "socSet",
          Number(obj.properties.socSet) / 10
        );
        (0, import_adapterService.updateSolarFlowControlState)(
          adapter,
          productKey,
          deviceKey,
          "chargeLimit",
          Number(obj.properties.socSet) / 10
        );
      }
      if (((_la = obj.properties) == null ? void 0 : _la.minSoc) != null && ((_ma = obj.properties) == null ? void 0 : _ma.minSoc) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "minSoc",
          Number(obj.properties.minSoc) / 10
        );
        (0, import_adapterService.updateSolarFlowControlState)(
          adapter,
          productKey,
          deviceKey,
          "dischargeLimit",
          Number(obj.properties.minSoc) / 10
        );
      }
      if (((_na = obj.properties) == null ? void 0 : _na.inputLimit) != null && ((_oa = obj.properties) == null ? void 0 : _oa.inputLimit) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "inputLimit",
          obj.properties.inputLimit
        );
        if ((productName == null ? void 0 : productName.includes("solarflow")) || (productName == null ? void 0 : productName.includes("ace")) || (productName == null ? void 0 : productName.includes("hyper"))) {
          (0, import_adapterService.updateSolarFlowControlState)(
            adapter,
            productKey,
            deviceKey,
            "setInputLimit",
            obj.properties.inputLimit
          );
        }
      }
      if (((_pa = obj.properties) == null ? void 0 : _pa.gridInputPower) != null && ((_qa = obj.properties) == null ? void 0 : _qa.gridInputPower) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "gridInputPower",
          obj.properties.gridInputPower
        );
      }
      if (((_ra = obj.properties) == null ? void 0 : _ra.acMode) != null && ((_sa = obj.properties) == null ? void 0 : _sa.acMode) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "acMode",
          obj.properties.acMode
        );
        (0, import_adapterService.updateSolarFlowControlState)(
          adapter,
          productKey,
          deviceKey,
          "acMode",
          obj.properties.acMode
        );
      }
      if (((_ta = obj.properties) == null ? void 0 : _ta.hyperTmp) != null && ((_ua = obj.properties) == null ? void 0 : _ua.hyperTmp) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "hyperTmp",
          obj.properties.hyperTmp / 10 - 273.15
          // Kelvin to Celsius
        );
      }
      if (((_va = obj.properties) == null ? void 0 : _va.acOutputPower) != null && ((_wa = obj.properties) == null ? void 0 : _wa.acOutputPower) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "acOutputPower",
          obj.properties.acOutputPower
        );
      }
      if (((_xa = obj.properties) == null ? void 0 : _xa.gridPower) != null && ((_ya = obj.properties) == null ? void 0 : _ya.gridPower) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "gridInputPower",
          obj.properties.gridPower
        );
      }
      if (((_za = obj.properties) == null ? void 0 : _za.acSwitch) != null && ((_Aa = obj.properties) == null ? void 0 : _Aa.acSwitch) != void 0) {
        const value = ((_Ba = obj.properties) == null ? void 0 : _Ba.acSwitch) == 0 ? false : true;
        (0, import_adapterService.updateSolarFlowState)(adapter, productKey, deviceKey, "acSwitch", value);
        (0, import_adapterService.updateSolarFlowControlState)(
          adapter,
          productKey,
          deviceKey,
          "acSwitch",
          value
        );
      }
      if (((_Ca = obj.properties) == null ? void 0 : _Ca.dcSwitch) != null && ((_Da = obj.properties) == null ? void 0 : _Da.dcSwitch) != void 0) {
        const value = ((_Ea = obj.properties) == null ? void 0 : _Ea.dcSwitch) == 0 ? false : true;
        (0, import_adapterService.updateSolarFlowState)(adapter, productKey, deviceKey, "dcSwitch", value);
        (0, import_adapterService.updateSolarFlowControlState)(
          adapter,
          productKey,
          deviceKey,
          "dcSwitch",
          value
        );
      }
      if (((_Fa = obj.properties) == null ? void 0 : _Fa.dcOutputPower) != null && ((_Ga = obj.properties) == null ? void 0 : _Ga.dcOutputPower) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "dcOutputPower",
          obj.properties.dcOutputPower
        );
      }
      if (((_Ha = obj.properties) == null ? void 0 : _Ha.pvBrand) != null && ((_Ia = obj.properties) == null ? void 0 : _Ia.pvBrand) != void 0) {
        const value = ((_Ja = obj.properties) == null ? void 0 : _Ja.pvBrand) == 0 ? "Others" : ((_Ka = obj.properties) == null ? void 0 : _Ka.pvBrand) == 1 ? "Hoymiles" : ((_La = obj.properties) == null ? void 0 : _La.pvBrand) == 2 ? "Enphase" : ((_Ma = obj.properties) == null ? void 0 : _Ma.pvBrand) == 3 ? "APSystems" : ((_Na = obj.properties) == null ? void 0 : _Na.pvBrand) == 4 ? "Anker" : ((_Oa = obj.properties) == null ? void 0 : _Oa.pvBrand) == 5 ? "Deye" : ((_Pa = obj.properties) == null ? void 0 : _Pa.pvBrand) == 6 ? "Bosswerk" : "Unknown";
        (0, import_adapterService.updateSolarFlowState)(adapter, productKey, deviceKey, "pvBrand", value);
      }
      if (((_Qa = obj.properties) == null ? void 0 : _Qa.inverseMaxPower) != null && ((_Ra = obj.properties) == null ? void 0 : _Ra.inverseMaxPower) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "inverseMaxPower",
          obj.properties.inverseMaxPower
        );
      }
      if (((_Sa = obj.properties) == null ? void 0 : _Sa.wifiState) != null && ((_Ta = obj.properties) == null ? void 0 : _Ta.wifiState) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "wifiState",
          obj.properties.wifiState == 1 ? "Connected" : "Disconnected"
        );
      }
      if (((_Ua = obj.properties) == null ? void 0 : _Ua.packNum) != null && ((_Va = obj.properties) == null ? void 0 : _Va.packNum) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "packNum",
          obj.properties.packNum
        );
      }
      if (((_Wa = obj.properties) == null ? void 0 : _Wa.hubState) != null && ((_Xa = obj.properties) == null ? void 0 : _Xa.hubState) != void 0) {
        (0, import_adapterService.updateSolarFlowState)(
          adapter,
          productKey,
          deviceKey,
          "hubState",
          obj.properties.hubState
          // Might need mapping like packState if it's numeric with defined meanings
        );
        (0, import_adapterService.updateSolarFlowControlState)(
          adapter,
          productKey,
          deviceKey,
          "hubState",
          obj.properties.hubState
        );
      }
      if (adapter.log.level == "debug") {
        let type = "solarflow";
        if (productName == null ? void 0 : productName.includes("hyper")) {
          type = "hyper";
        } else if (productName == null ? void 0 : productName.includes("ace")) {
          type = "ace";
        } else if (productName == null ? void 0 : productName.includes("aio")) {
          type = "aio";
        } else if (productName == null ? void 0 : productName.includes("smart plug")) {
          type = "smartPlug";
        }
        const states = (0, import_createSolarFlowStates.getStateDefinition)(type);
        Object.entries(obj.properties).forEach(([key, value]) => {
          const isKnown = states.some((state) => state.title === key);
          if (!isKnown) {
            const manuallyCheckedKeys = ["pvPower3", "pvPower4", "solarPower3", "solarPower4"];
            if (!manuallyCheckedKeys.includes(key)) {
              adapter == null ? void 0 : adapter.log.debug(
                `[onMessage] Device: ${productName || productKey + "." + deviceKey}, UNKNOWN Mqtt Property in 'obj.properties': ${key} with value ${JSON.stringify(value)}`
              );
            }
          }
        });
      }
    }
    if (obj.packData) {
      addOrUpdatePackData(productKey, deviceKey, obj.packData, isSolarFlow);
    }
  }
};
const setAcMode = async (adapter2, productKey, deviceKey, acMode) => {
  var _a;
  if (adapter2.mqttClient && productKey && deviceKey) {
    if (acMode >= 0 && acMode <= 2) {
      const topic = `iot/${productKey}/${deviceKey}/properties/write`;
      const setAcMode2 = { properties: { acMode } };
      adapter2.log.debug(`[setAcMode] Set AC mode to ${acMode}!`);
      (_a = adapter2.mqttClient) == null ? void 0 : _a.publish(topic, JSON.stringify(setAcMode2));
    } else {
      adapter2.log.error(`[setAcMode] AC mode must be a value between 0 and 2!`);
    }
  }
};
const setChargeLimit = async (adapter2, productKey, deviceKey, socSet) => {
  var _a;
  if (adapter2.mqttClient && productKey && deviceKey) {
    if (socSet >= 40 && socSet <= 100) {
      const topic = `iot/${productKey}/${deviceKey}/properties/write`;
      const socSetLimit = { properties: { socSet: socSet * 10 } };
      adapter2.log.debug(
        `[setChargeLimit] Setting ChargeLimit for device key ${deviceKey} to ${socSet}!`
      );
      (_a = adapter2.mqttClient) == null ? void 0 : _a.publish(topic, JSON.stringify(socSetLimit));
    } else {
      adapter2.log.debug(
        `[setChargeLimit] Charge limit is not in range 40<>100!`
      );
    }
  }
};
const setDischargeLimit = async (adapter2, productKey, deviceKey, minSoc) => {
  var _a;
  if (adapter2.mqttClient && productKey && deviceKey) {
    if (minSoc >= 0 && minSoc <= 50) {
      const topic = `iot/${productKey}/${deviceKey}/properties/write`;
      const socSetLimit = { properties: { minSoc: minSoc * 10 } };
      adapter2.log.debug(
        `[setDischargeLimit] Setting Discharge Limit for device key ${deviceKey} to ${minSoc}!`
      );
      (_a = adapter2.mqttClient) == null ? void 0 : _a.publish(topic, JSON.stringify(socSetLimit));
    } else {
      adapter2.log.debug(
        `[setDischargeLimit] Discharge limit is not in range 0<>50!`
      );
    }
  }
};
const setHubState = async (adapter2, productKey, deviceKey, hubState) => {
  var _a;
  if (adapter2.mqttClient && productKey && deviceKey) {
    if (hubState == 0 || hubState == 1) {
      const topic = `iot/${productKey}/${deviceKey}/properties/write`;
      const socSetLimit = { properties: { hubState } };
      adapter2.log.debug(
        `[setHubState] Setting Hub State for device key ${deviceKey} to ${hubState}!`
      );
      (_a = adapter2.mqttClient) == null ? void 0 : _a.publish(topic, JSON.stringify(socSetLimit));
    } else {
      adapter2.log.debug(`[setHubState] Hub state is not 0 or 1!`);
    }
  }
};
const setOutputLimit = async (adapter2, productKey, deviceKey, limit) => {
  var _a, _b, _c, _d, _e;
  if (adapter2.mqttClient && productKey && deviceKey) {
    const autoModel = (_a = await adapter2.getStateAsync(productKey + "." + deviceKey + ".autoModel")) == null ? void 0 : _a.val;
    if (autoModel != 0) {
      adapter2.log.warn(
        "Operation mode (autoModel) is not set to '0', we can't set the output limit!"
      );
      return;
    }
    if (limit != null) {
      limit = Math.round(limit);
    } else {
      limit = 0;
    }
    if (adapter2.config.useLowVoltageBlock) {
      const lowVoltageBlockState = await adapter2.getStateAsync(
        productKey + "." + deviceKey + ".control.lowVoltageBlock"
      );
      if (lowVoltageBlockState && lowVoltageBlockState.val === true) {
        limit = 0;
      }
      const fullChargeNeeded = await adapter2.getStateAsync(
        productKey + "." + deviceKey + ".control.fullChargeNeeded"
      );
      if (fullChargeNeeded && fullChargeNeeded.val === true) {
        limit = 0;
      }
    }
    const currentLimit = (_b = await adapter2.getStateAsync(productKey + "." + deviceKey + ".outputLimit")) == null ? void 0 : _b.val;
    const productName = (_d = (_c = await adapter2.getStateAsync(productKey + "." + deviceKey + ".productName")) == null ? void 0 : _c.val) == null ? void 0 : _d.toString().toLowerCase();
    if (currentLimit != null && currentLimit != void 0) {
      if (currentLimit != limit) {
        if (limit < 100 && limit != 90 && limit != 60 && limit != 30 && limit != 0) {
          if (limit < 100 && limit > 90 && !(productName == null ? void 0 : productName.includes("hyper")) && !(productName == null ? void 0 : productName.includes("ace"))) {
            limit = 90;
          } else if (limit > 60 && limit < 90 && !(productName == null ? void 0 : productName.includes("hyper")) && !(productName == null ? void 0 : productName.includes("ace"))) {
            limit = 60;
          } else if (limit > 30 && limit < 60 && !(productName == null ? void 0 : productName.includes("hyper")) && !(productName == null ? void 0 : productName.includes("ace"))) {
            limit = 30;
          } else if (limit < 30 && !(productName == null ? void 0 : productName.includes("hyper")) && !(productName == null ? void 0 : productName.includes("ace"))) {
            limit = 30;
          } else if (limit < 0) {
            limit = 0;
          }
        }
        if (limit > 1200) {
          limit = 1200;
        }
        const topic = `iot/${productKey}/${deviceKey}/properties/write`;
        const outputlimit = { properties: { outputLimit: limit } };
        (_e = adapter2.mqttClient) == null ? void 0 : _e.publish(topic, JSON.stringify(outputlimit));
      }
    }
  }
};
const setInputLimit = async (adapter2, productKey, deviceKey, limit) => {
  var _a, _b, _c, _d;
  if (adapter2.mqttClient && productKey && deviceKey) {
    if (limit != null) {
      limit = Math.round(limit);
    } else {
      limit = 0;
    }
    let maxLimit = 1e3;
    const currentLimit = (_a = await adapter2.getStateAsync(productKey + "." + deviceKey + ".inputLimit")) == null ? void 0 : _a.val;
    const productName = (_c = (_b = await adapter2.getStateAsync(productKey + "." + deviceKey + ".productName")) == null ? void 0 : _b.val) == null ? void 0 : _c.toString().toLowerCase();
    if (productName == null ? void 0 : productName.includes("hyper")) {
      maxLimit = 1200;
    } else if (productName == null ? void 0 : productName.includes("2400")) {
      maxLimit = 2400;
    } else if (productName == null ? void 0 : productName.includes("pro")) {
      maxLimit = 1e3;
    }
    if (productName == null ? void 0 : productName.includes("ace")) {
      limit = Math.ceil(limit / 100) * 100;
    }
    if (limit < 0) {
      limit = 0;
    } else if (limit > 0 && limit <= 30 && !(productName == null ? void 0 : productName.includes("ace")) && !(productName == null ? void 0 : productName.includes("hyper"))) {
      limit = 30;
    } else if (limit > maxLimit) {
      limit = maxLimit;
    }
    if (currentLimit != null && currentLimit != void 0) {
      if (currentLimit != limit) {
        const topic = `iot/${productKey}/${deviceKey}/properties/write`;
        const inputLimitContent = { properties: { inputLimit: limit } };
        (_d = adapter2.mqttClient) == null ? void 0 : _d.publish(topic, JSON.stringify(inputLimitContent));
      }
    }
  }
};
const setBuzzerSwitch = async (adapter2, productKey, deviceKey, buzzerOn) => {
  var _a;
  if (adapter2.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/write`;
    const setBuzzerSwitchContent = {
      properties: { buzzerSwitch: buzzerOn ? 1 : 0 }
    };
    adapter2.log.debug(
      `[setBuzzer] Setting Buzzer for device key ${deviceKey} to ${buzzerOn}!`
    );
    (_a = adapter2.mqttClient) == null ? void 0 : _a.publish(topic, JSON.stringify(setBuzzerSwitchContent));
  }
};
const setAutoModel = async (adapter2, productKey, deviceKey, autoModel) => {
  var _a;
  if (adapter2.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/write`;
    let setAutoModelContent = { properties: { autoModel } };
    switch (autoModel) {
      case 8:
        setAutoModelContent = {
          properties: {
            autoModelProgram: 1,
            autoModelValue: { chargingType: 0, chargingPower: 0, outPower: 0 },
            msgType: 1,
            autoModel: 8
          }
        };
        break;
      case 9:
        setAutoModelContent = {
          properties: {
            autoModelProgram: 2,
            autoModelValue: { chargingType: 3, chargingPower: 0, outPower: 0 },
            msgType: 1,
            autoModel: 9
          }
        };
        break;
    }
    adapter2.log.debug(
      `[setAutoModel] Setting autoModel for device key ${deviceKey} to ${autoModel}!`
    );
    (_a = adapter2.mqttClient) == null ? void 0 : _a.publish(topic, JSON.stringify(setAutoModelContent));
  }
};
const triggerFullTelemetryUpdate = async (adapter2, productKey, deviceKey) => {
  var _a;
  if (adapter2.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/read`;
    const getAllContent = { properties: ["getAll"] };
    adapter2.log.debug(
      `[triggerFullTelemetryUpdate] Triggering full telemetry update for device key ${deviceKey}!`
    );
    (_a = adapter2.mqttClient) == null ? void 0 : _a.publish(topic, JSON.stringify(getAllContent));
  }
};
const setPassMode = async (adapter2, productKey, deviceKey, passMode) => {
  var _a;
  if (adapter2.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/write`;
    const setPassModeContent = { properties: { passMode } };
    adapter2.log.debug(
      `[setPassMode] Set passMode for device ${deviceKey} to ${passMode}!`
    );
    (_a = adapter2.mqttClient) == null ? void 0 : _a.publish(topic, JSON.stringify(setPassModeContent));
  }
};
const setAutoRecover = async (adapter2, productKey, deviceKey, autoRecover) => {
  var _a;
  if (adapter2.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/write`;
    const setAutoRecoverContent = {
      properties: { autoRecover: autoRecover ? 1 : 0 }
    };
    adapter2.log.debug(
      `[setAutoRecover] Set autoRecover for device ${deviceKey} to ${autoRecover}!`
    );
    (_a = adapter2.mqttClient) == null ? void 0 : _a.publish(topic, JSON.stringify(setAutoRecoverContent));
  }
};
const setDcSwitch = async (adapter2, productKey, deviceKey, dcSwitch) => {
  var _a;
  if (adapter2.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/write`;
    const setDcSwitchContent = {
      properties: { dcSwitch: dcSwitch ? 1 : 0 }
    };
    adapter2.log.debug(
      `[setDcSwitch] Set DC Switch for device ${deviceKey} to ${dcSwitch}!`
    );
    (_a = adapter2.mqttClient) == null ? void 0 : _a.publish(topic, JSON.stringify(setDcSwitchContent));
  }
};
const setAcSwitch = async (adapter2, productKey, deviceKey, acSwitch) => {
  var _a;
  if (adapter2.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/write`;
    const setAcSwitchContent = {
      properties: { acSwitch: acSwitch ? 1 : 0 }
    };
    adapter2.log.debug(
      `[setAcSwitch] Set AC Switch for device ${deviceKey} to ${acSwitch}!`
    );
    (_a = adapter2.mqttClient) == null ? void 0 : _a.publish(topic, JSON.stringify(setAcSwitchContent));
  }
};
const onConnected = () => {
  adapter == null ? void 0 : adapter.log.info("[onConnected] Connected with MQTT!");
};
const onError = (error) => {
  adapter == null ? void 0 : adapter.log.error("Connection to MQTT failed! Error: " + error);
};
const onSubscribeReportTopic = (error) => {
  if (error) {
    adapter == null ? void 0 : adapter.log.error("Subscription to MQTT failed! Error: " + error);
  } else {
    adapter == null ? void 0 : adapter.log.debug("Subscription of Report Topic successful!");
  }
};
const onSubscribeIotTopic = (error, productKey, deviceKey) => {
  if (error) {
    adapter == null ? void 0 : adapter.log.error(`Subscription to MQTT iotTopic for ${productKey}/${deviceKey} failed! Error: ${error}`);
  } else if (adapter) {
    adapter == null ? void 0 : adapter.log.debug(`Subscription of IOT Topic for ${productKey}/${deviceKey} successful!`);
    triggerFullTelemetryUpdate(adapter, productKey, deviceKey);
  }
};
const subscribeReportTopic = (productKey, deviceKey, timeout) => {
  const reportTopic = `/${productKey}/${deviceKey}/#`;
  setTimeout(() => {
    var _a;
    if (adapter && adapter.mqttClient) {
      adapter.log.debug(
        `[subscribeReportTopic] Subscribing to MQTT Topic: ${reportTopic}`
      );
      (_a = adapter.mqttClient) == null ? void 0 : _a.subscribe(reportTopic, onSubscribeReportTopic);
    } else {
      adapter == null ? void 0 : adapter.log.warn(`[subscribeReportTopic] MQTT client not available when trying to subscribe to ${reportTopic}`);
    }
  }, timeout);
};
const subscribeIotTopic = (productKey, deviceKey, timeout) => {
  const iotTopic = `iot/${productKey}/${deviceKey}/#`;
  setTimeout(() => {
    var _a;
    if (adapter && adapter.mqttClient) {
      adapter.log.debug(
        `[subscribeIotTopic] Subscribing to MQTT Topic: ${iotTopic}`
      );
      (_a = adapter == null ? void 0 : adapter.mqttClient) == null ? void 0 : _a.subscribe(iotTopic, (error) => {
        onSubscribeIotTopic(error, productKey, deviceKey);
      });
    } else {
      adapter == null ? void 0 : adapter.log.warn(`[subscribeIotTopic] MQTT client not available when trying to subscribe to ${iotTopic}`);
    }
  }, timeout);
};
const connectCloudMqttClient = (_adapter) => {
  var _a, _b;
  adapter = _adapter;
  if (!((_a = adapter.paths) == null ? void 0 : _a.mqttPassword)) {
    adapter.log.error(`[connectCloudMqttClient] MQTT Password is missing!`);
    return;
  }
  const mqttPassword = atob((_b = adapter.paths) == null ? void 0 : _b.mqttPassword);
  const options = {
    clientId: adapter.accessToken,
    // This should be unique per client connection
    username: "zenApp",
    password: mqttPassword,
    clean: true,
    protocolVersion: 5
  };
  if (mqtt && adapter && adapter.paths && adapter.deviceList) {
    adapter.log.debug(
      `[connectCloudMqttClient] Connecting to MQTT broker ${adapter.paths.mqttUrl + ":" + adapter.paths.mqttPort}...`
    );
    adapter.mqttClient = mqtt.connect(
      "mqtt://" + adapter.paths.mqttUrl + ":" + adapter.paths.mqttPort,
      options
    );
    if (adapter && adapter.mqttClient) {
      adapter.mqttClient.on("connect", onConnected);
      adapter.mqttClient.on("error", onError);
      adapter.mqttClient.on("close", () => adapter == null ? void 0 : adapter.log.info("MQTT client disconnected (cloud)."));
      adapter.mqttClient.on("reconnect", () => adapter == null ? void 0 : adapter.log.info("MQTT client attempting to reconnect (cloud)..."));
      adapter.deviceList.forEach(
        (device, index) => {
          var _a2;
          if (adapter) {
            let connectIot = true;
            if (device.productKey == "s3Xk4x" && adapter.userId && device.id) {
              const smartPlugReportTopic = `/server/app/${adapter.userId}/${device.id}/smart/power`;
              adapter.log.debug(`[connectCloudMqttClient] Subscribing to Smart Plug Topic: ${smartPlugReportTopic}`);
              (_a2 = adapter.mqttClient) == null ? void 0 : _a2.subscribe(
                smartPlugReportTopic,
                onSubscribeReportTopic
              );
              connectIot = false;
            }
            const baseReportTopicPrefix = adapter.config.useAppTopicStructure ? `/server/app/${device.productKey}/${device.deviceKey}/#` : `/${device.productKey}/${device.deviceKey}/#`;
            subscribeReportTopic(
              device.productKey,
              device.deviceKey,
              1e3 * index
              // Stagger subscriptions
            );
            if (connectIot) {
              subscribeIotTopic(
                device.productKey,
                device.deviceKey,
                1e3 * index + 500
                // Stagger slightly from report topic
              );
            }
            if (device.packList && device.packList.length > 0) {
              device.packList.forEach(async (subDevice, subIndex) => {
                var _a3;
                if (((_a3 = subDevice.productName) == null ? void 0 : _a3.toLocaleLowerCase()) == "ace 1500") {
                  if (adapter && adapter.log) {
                    adapter.log.debug(`[connectCloudMqttClient] Subscribing to ACE sub-device: ${subDevice.productKey}/${subDevice.deviceKey}`);
                  }
                  subscribeReportTopic(
                    subDevice.productKey,
                    subDevice.deviceKey,
                    1e3 * (index + 1) + 200 * subIndex
                    // Further stagger sub-device subscriptions
                  );
                  subscribeIotTopic(
                    subDevice.productKey,
                    subDevice.deviceKey,
                    1e3 * (index + 1) + 200 * subIndex + 100
                  );
                }
              });
            }
          }
        }
      );
      adapter.mqttClient.on("message", onMessage);
      (0, import_jobSchedule.startResetValuesJob)(adapter);
      (0, import_jobSchedule.startCheckStatesAndConnectionJob)(adapter);
      if (adapter.config.useCalculation) {
        (0, import_jobSchedule.startCalculationJob)(adapter);
      }
    } else {
      adapter == null ? void 0 : adapter.log.error("[connectCloudMqttClient] MQTT client connection failed to initialize.");
    }
  }
};
const connectLocalMqttClient = (_adapter) => {
  adapter = _adapter;
  const options = {
    clientId: "ioBroker.zendure-solarflow." + adapter.instance,
    // Unique client ID
    // Add username/password if local MQTT requires auth
    // username: adapter.config.localMqttUser,
    // password: adapter.config.localMqttPassword,
    clean: true,
    // Recommended for IoT device data
    protocolVersion: 5
    // Or 4, depending on broker
  };
  if (mqtt && adapter && adapter.config && adapter.config.localMqttUrl) {
    const localMqttPort = adapter.config.localMqttPort || 1883;
    adapter.log.debug(
      `[connectLocalMqttClient] Connecting to local MQTT broker ${adapter.config.localMqttUrl + ":" + localMqttPort}...`
    );
    adapter.mqttClient = mqtt.connect(
      `mqtt://${adapter.config.localMqttUrl}:${localMqttPort}`,
      options
    );
    if (adapter && adapter.mqttClient) {
      adapter.mqttClient.on("connect", () => {
        onConnected();
        adapter == null ? void 0 : adapter.setState("info.connection", true, true);
      });
      adapter.mqttClient.on("error", onError);
      adapter.mqttClient.on("close", () => {
        adapter == null ? void 0 : adapter.log.info("MQTT client disconnected (local).");
        adapter == null ? void 0 : adapter.setState("info.connection", false, true);
      });
      adapter.mqttClient.on("reconnect", () => adapter == null ? void 0 : adapter.log.info("MQTT client attempting to reconnect (local)..."));
      const devicesToSubscribe = [
        { productKey: adapter.config.localDevice1ProductKey, deviceKey: adapter.config.localDevice1DeviceKey, delay: 1e3 },
        { productKey: adapter.config.localDevice2ProductKey, deviceKey: adapter.config.localDevice2DeviceKey, delay: 2e3 },
        { productKey: adapter.config.localDevice3ProductKey, deviceKey: adapter.config.localDevice3DeviceKey, delay: 3e3 },
        { productKey: adapter.config.localDevice4ProductKey, deviceKey: adapter.config.localDevice4DeviceKey, delay: 4e3 }
      ];
      devicesToSubscribe.forEach((deviceConfig) => {
        if (deviceConfig.productKey && deviceConfig.deviceKey) {
          (0, import_createSolarFlowLocalStates.createSolarFlowLocalStates)(adapter, deviceConfig.productKey, deviceConfig.deviceKey);
          subscribeReportTopic(deviceConfig.productKey, deviceConfig.deviceKey, deviceConfig.delay);
          subscribeIotTopic(deviceConfig.productKey, deviceConfig.deviceKey, deviceConfig.delay + 500);
        }
      });
      adapter.mqttClient.on("message", onMessage);
      (0, import_jobSchedule.startResetValuesJob)(adapter);
      (0, import_jobSchedule.startCheckStatesAndConnectionJob)(adapter);
      if (adapter.config.useCalculation) {
        (0, import_jobSchedule.startCalculationJob)(adapter);
      }
    } else {
      adapter == null ? void 0 : adapter.log.error("[connectLocalMqttClient] MQTT client connection failed to initialize.");
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addOrUpdatePackData,
  connectCloudMqttClient,
  connectLocalMqttClient,
  setAcMode,
  setAcSwitch,
  setAutoModel,
  setAutoRecover,
  setBuzzerSwitch,
  setChargeLimit,
  setDcSwitch,
  setDischargeLimit,
  setHubState,
  setInputLimit,
  setOutputLimit,
  setPassMode,
  subscribeIotTopic,
  subscribeReportTopic,
  triggerFullTelemetryUpdate
});
//# sourceMappingURL=mqttService.js.map
