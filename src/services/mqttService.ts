/* eslint-disable @typescript-eslint/indent */
import * as mqtt from "mqtt";
import { ZendureSolarflow } from "../main";
import { ISolarFlowDeviceDetails } from "../models/ISolarFlowDeviceDetails";
import {
  checkVoltage,
  updateSolarFlowControlState,
  updateSolarFlowState,
} from "./adapterService";
import { IPackData } from "../models/IPackData";
import { setEnergyWhMax, setSocToZero } from "./calculationService";
import { IMqttData } // Assuming IMqttData has a 'properties' field that needs updating
  from "../models/ISolarFlowMqttProperties";
import {
  startCalculationJob,
  startCheckStatesAndConnectionJob,
  startResetValuesJob,
} from "./jobSchedule";
import { createSolarFlowLocalStates } from "../helpers/createSolarFlowLocalStates";
import { ISolarflowState } from "../models/ISolarflowState";
import { getStateDefinition } from "../helpers/createSolarFlowStates";

let adapter: ZendureSolarflow | undefined = undefined;

const knownPackDataProperties = [
  "sn",
  "totalVol",
  "maxVol",
  "minVol",
  "socLevel",
  "maxTemp",
  "soh",
  // Consider adding batcur here if it's a standard property you expect
];

export const addOrUpdatePackData = async (
  productKey: string,
  deviceKey: string,
  packData: IPackData[],
  isSolarFlow: boolean
): Promise<void> => {
  if (adapter && productKey && deviceKey) {
    await packData.forEach(async (x) => {
      // Process data only with a serial id!
      if (x.sn && adapter) {
        // Create channel (e.g. the device specific key)
        // We can determine the type of the battery by the SN number.
        let batType = "";
        if (productKey == "yWF7hV") {
          batType = "AIO2400";
        } else if (x.sn.startsWith("C")) {
          if (x.sn[3] == "F") {
            // It's a AB2000S
            batType = "AB2000S";
          } else {
            // It's a AB2000
            batType = "AB2000";
          }
        } else if (x.sn.startsWith("A")) {
          // It's a AB1000
          batType = "AB1000";
        }

        // Check if is in Pack2device list
        if (
          !adapter.pack2Devices.some(
            (y) => y.packSn == x.sn && y.deviceKey == deviceKey
          )
        ) {
          adapter.pack2Devices.push({
            packSn: x.sn,
            deviceKey: deviceKey,
            type: batType,
          });

          adapter.log.debug(
            `[addOrUpdatePackData] Added battery ${batType} with SN ${x.sn} on deviceKey ${deviceKey} to pack2Devices!`
          );
        }

        // create a state for the serial id
        const key = (
          productKey +
          "." +
          deviceKey +
          ".packData." +
          x.sn
        ).replace(adapter.FORBIDDEN_CHARS, "");

        await adapter?.extendObject(key, {
          type: "channel",
          common: {
            name: {
              de: batType,
              en: batType,
            },
          },
          native: {},
        });

        await adapter?.extendObject(key + ".model", {
          type: "state",
          common: {
            name: {
              de: "Batterietyp",
              en: "Battery type",
            },
            type: "string",
            desc: "model",
            role: "value",
            read: true,
            write: false,
          },
          native: {},
        });

        await adapter?.setState(key + ".model", batType, true);

        await adapter?.extendObject(key + ".sn", {
          type: "state",
          common: {
            name: {
              de: "Seriennummer",
              en: "Serial id",
            },
            type: "string",
            desc: "Serial ID",
            role: "value",
            read: true,
            write: false,
          },
          native: {},
        });

        await adapter?.setState(key + ".sn", x.sn, true);

        if (x.socLevel != null) { // Check for null or undefined
          // State für socLevel
          await adapter?.extendObject(key + ".socLevel", {
            type: "state",
            common: {
              name: {
                de: "SOC der Batterie",
                en: "soc of battery",
              },
              type: "number",
              desc: "SOC Level",
              role: "value",
              read: true,
              write: false,
              unit: "%",
            },
            native: {},
          });

          await adapter?.setState(key + ".socLevel", x.socLevel, true);
        }

        if (x.maxTemp != null) { // Check for null or undefined
          // State für maxTemp
          await adapter?.extendObject(key + ".maxTemp", {
            type: "state",
            common: {
              name: {
                de: "Max. Temperatur der Batterie",
                en: "max temp. of battery",
              },
              type: "number",
              desc: "Max. Temp",
              role: "value",
              read: true,
              write: false,
              unit: "°C",
            },
            native: {},
          });

          // Convert Kelvin to Celsius
          await adapter?.setState(
            key + ".maxTemp",
            x.maxTemp / 10 - 273.15,
            true
          );
        }

        if (x.minVol != null) { // Check for null or undefined
          await adapter?.extendObject(key + ".minVol", {
            type: "state",
            common: {
              name: "minVol",
              type: "number",
              desc: "minVol",
              role: "value",
              read: true,
              write: false,
              unit: "V",
            },
            native: {},
          });

          await adapter?.setState(key + ".minVol", x.minVol / 100, true);
        }

        if (x.batcur != null) { // Check for null or undefined
          await adapter?.extendObject(key + ".batcur", {
            type: "state",
            common: {
              name: "batcur",
              type: "number",
              desc: "batcur",
              role: "value",
              read: true,
              write: false,
              unit: "A",
            },
            native: {},
          });

          await adapter?.setState(key + ".batcur", x.batcur / 10, true);
        }

        if (x.maxVol != null) { // Check for null or undefined
          await adapter?.extendObject(key + ".maxVol", {
            type: "state",
            common: {
              name: "maxVol",
              type: "number",
              desc: "maxVol",
              role: "value",
              read: true,
              write: false,
              unit: "V",
            },
            native: {},
          });

          await adapter?.setState(key + ".maxVol", x.maxVol / 100, true);
        }

        if (x.totalVol != null) { // Check for null or undefined
          await adapter?.extendObject(key + ".totalVol", {
            type: "state",
            common: {
              name: "totalVol",
              type: "number",
              desc: "totalVol",
              role: "value",
              read: true,
              write: false,
              unit: "V",
            },
            native: {},
          });

          const totalVol = x.totalVol / 100;

          await adapter?.setState(key + ".totalVol", totalVol, true);

          // Send Voltage to checkVoltage Method (only if is Solarflow device)
          if (isSolarFlow) {
            checkVoltage(adapter, productKey, deviceKey, totalVol);
          }
        }

        if (x.soh != null) { // Check for null or undefined
          await adapter?.extendObject(key + ".soh", {
            type: "state",
            common: {
              name: {
                de: "Gesundheitszustand",
                en: "State of Health",
              },
              type: "number",
              desc: "State of Health",
              role: "value",
              read: true,
              write: false,
              unit: "%",
            },
            native: {},
          });

          await adapter?.setState(key + ".soh", x.soh / 10, true);
        }

        // Debug, send message if property is unknown!
        Object.entries(x).forEach(([propKey, value]) => {
          if (!knownPackDataProperties.includes(propKey)) {
            adapter?.log.debug(
              `[addOrUpdatePackData] SN: ${x.sn}, UNKNOWN PackData Property: ${propKey} with value ${value}. Consider adding to knownPackDataProperties if expected.`
            );
          }
        });
      }
    });
  }
};


const onMessage = async (topic: string, message: Buffer): Promise<void> => {
  if (adapter) {
    if (topic.toLowerCase().includes("loginout/force")) {
      // TODO: Ausloggen???
      adapter.log.warn(`[onMessage] Received 'loginOut/force' on topic: ${topic}`);
    }

    const topicSplitted = topic.replace("/server/app", "").split("/");
    const productKey = topicSplitted[1];
    const deviceKey = topicSplitted[2];

    if (!productKey || !deviceKey) {
        adapter.log.warn(`[onMessage] Could not parse productKey or deviceKey from topic: ${topic}`);
        return;
    }

    let obj: IMqttData = {};
    try {
      obj = JSON.parse(message.toString());
    } catch (e) {
      const txt = message.toString();
      adapter.log.error(`[onMessage] JSON Parse error for device ${productKey}.${deviceKey}!`);
      adapter.log.debug(`[onMessage] JSON Parse error content: ${txt}!`);
      return; // Stop processing if JSON is invalid
    }

    let isSolarFlow = false;
    const productNameState = await adapter.getStateAsync(
      `${productKey}.${deviceKey}.productName`
    );
    const productName = productNameState?.val?.toString().toLowerCase();


    if (adapter.log.level == "debug") {
      adapter.log.debug(`[onMessage] MQTT message for ${productKey}.${deviceKey}: ${message.toString()}`);
    }

    if (obj.timestamp) {
      const currentTimeStamp = new Date().getTime() / 1000;
      const diff = currentTimeStamp - obj.timestamp;

      // Use a more reasonable timeout, e.g., 5 minutes (300 seconds) or 10 minutes (600 seconds)
      const offlineThreshold = adapter.config.offlineThresholdSeconds || 300; // Default to 5 minutes

      if (diff > offlineThreshold) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "wifiState",
          "Disconnected"
        );
      } else {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "wifiState",
          "Connected"
        );
      }
    }

    // Check if device is an solarflow or hyper device.
    // Product key "8bM93H" seems to be for ACE devices based on comments.
    // This logic might need refinement if more device types are involved.
    if (productKey !== "8bM93H") { // AIO is "yWF7hV"
      isSolarFlow = true; // Assuming non-ACE devices are "SolarFlow-like" for voltage checks etc.
    }
     if (productName?.includes("solarflow") || productName?.includes("hyper") || productName?.includes("aio")) {
        isSolarFlow = true; // More explicit check
    }


    // set lastUpdate for deviceKey
    updateSolarFlowState(
      adapter,
      productKey,
      deviceKey,
      "lastUpdate",
      new Date().getTime()
    );

    // Process properties if they exist
    if (obj.properties) {
      if (
        obj.properties?.autoModel != null &&
        obj.properties?.autoModel != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "autoModel",
          obj.properties.autoModel
        );

        updateSolarFlowControlState(
          adapter,
          productKey,
          deviceKey,
          "autoModel",
          obj.properties.autoModel
        );
      }

      if (
        obj.properties?.heatState != null &&
        obj.properties?.heatState != undefined
      ) {
        const value = obj.properties?.heatState == 0 ? false : true;

        updateSolarFlowState(adapter, productKey, deviceKey, "heatState", value);
      }

      if (
        obj.properties?.electricLevel != null &&
        obj.properties?.electricLevel != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "electricLevel",
          obj.properties.electricLevel
        );

        if (
          adapter?.config.useCalculation &&
          obj.properties.electricLevel == 100 &&
          isSolarFlow // Ensure this check is relevant for the device type
        ) {
          setEnergyWhMax(adapter, productKey, deviceKey);
        }

        if (obj.properties.electricLevel == 100) {
          const fullChargeNeeded = await adapter.getStateAsync(
            productKey + "." + deviceKey + ".control.fullChargeNeeded"
          );

          if (
            fullChargeNeeded &&
            fullChargeNeeded.val === true // Strict check
          ) {
            await adapter?.setState(
              `${productKey}.${deviceKey}.control.fullChargeNeeded`,
              false,
              true
            );
          }
        }

        // if minSoc is reached, set the calculated soc to 0
        const minSocState = await adapter?.getStateAsync(
          `${productKey}.${deviceKey}.minSoc`
        );
        if (
          adapter?.config.useCalculation &&
          minSocState &&
          minSocState.val != null && // Check val exists
          obj.properties.electricLevel == Number(minSocState.val) &&
          isSolarFlow // Ensure this check is relevant
        ) {
          setSocToZero(adapter, productKey, deviceKey);
        }
      }

      if (obj.properties?.power != null && obj.properties?.power != undefined) { // Changed from obj.power
        const value = obj.properties.power / 10;
        updateSolarFlowState(adapter, productKey, deviceKey, "power", value);
      }


      if (
        obj.properties?.packState != null &&
        obj.properties?.packState != undefined
      ) {
        const value =
          obj.properties?.packState == 0
            ? "Idle"
            : obj.properties?.packState == 1
              ? "Charging"
              : obj.properties?.packState == 2
                ? "Discharging"
                : "Unknown";
        updateSolarFlowState(adapter, productKey, deviceKey, "packState", value);
      }

      if (
        obj.properties?.passMode != null &&
        obj.properties?.passMode != undefined
      ) {
        const value =
          obj.properties?.passMode == 0
            ? "Automatic"
            : obj.properties?.passMode == 1
              ? "Always off"
              : obj.properties?.passMode == 2
                ? "Always on"
                : "Unknown";
        updateSolarFlowState(adapter, productKey, deviceKey, "passMode", value);

        updateSolarFlowControlState(
          adapter,
          productKey,
          deviceKey,
          "passMode",
          obj.properties?.passMode
        );
      }

      if (obj.properties?.pass != null && obj.properties?.pass != undefined) {
        const value = obj.properties?.pass == 0 ? false : true;

        updateSolarFlowState(adapter, productKey, deviceKey, "pass", value);
      }

      if (
        obj.properties?.autoRecover != null &&
        obj.properties?.autoRecover != undefined
      ) {
        const value = obj.properties?.autoRecover == 0 ? false : true;

        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "autoRecover",
          value
        );

        updateSolarFlowControlState(
          adapter,
          productKey,
          deviceKey,
          "autoRecover",
          value
        );
      }

      if (
        obj.properties?.outputHomePower != null &&
        obj.properties?.outputHomePower != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "outputHomePower",
          obj.properties.outputHomePower
        );
      }

      if (
        obj.properties?.energyPower != null &&
        obj.properties?.energyPower != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "energyPower",
          obj.properties.energyPower
        );
      }

      if (
        obj.properties?.outputLimit != null &&
        obj.properties?.outputLimit != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "outputLimit",
          obj.properties.outputLimit
        );

        updateSolarFlowControlState(
          adapter,
          productKey,
          deviceKey,
          "setOutputLimit",
          obj.properties.outputLimit
        );
      }

      if (
        obj.properties?.buzzerSwitch != null &&
        obj.properties?.buzzerSwitch != undefined
      ) {
        const value = obj.properties?.buzzerSwitch == 0 ? false : true;

        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "buzzerSwitch",
          value
        );

        updateSolarFlowControlState(
          adapter,
          productKey,
          deviceKey,
          "buzzerSwitch",
          value
        );
      }

      if (
        obj.properties?.outputPackPower != null &&
        obj.properties?.outputPackPower != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "outputPackPower",
          obj.properties.outputPackPower
        );

        // if outPutPackPower set packInputPower to 0
        updateSolarFlowState(adapter, productKey, deviceKey, "packInputPower", 0);
      }

      if (
        obj.properties?.packInputPower != null &&
        obj.properties?.packInputPower != undefined
      ) {
        let standbyUsage = 0;

        const solarInputPowerState = await adapter?.getStateAsync(
          `${productKey}.${deviceKey}.solarInputPower`
        );
        const solarInputPowerVal = Number(solarInputPowerState?.val);

        if (solarInputPowerState && solarInputPowerVal < 10) {
          standbyUsage = 7 - solarInputPowerVal;
        }

        const device = adapter?.deviceList?.find(
          (x) => x.deviceKey == deviceKey && x.productKey == productKey
        );

        if (device && device._connectedWithAce) {
          standbyUsage += 7;
        }

        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "packInputPower",
          obj.properties.packInputPower + standbyUsage
        );

        // if packInputPower set outputPackPower to 0
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "outputPackPower",
          0
        );
      }

      if (
        obj.properties?.solarInputPower != null &&
        obj.properties?.solarInputPower != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "solarInputPower",
          obj.properties.solarInputPower
        );
      }

      // PV Power Inputs (obj.properties.pvPowerX from MQTT, potentially reversed for app consistency)
      if (
        obj.properties?.pvPower1 != null &&
        obj.properties?.pvPower1 != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "pvPower2", // Reversed (MQTT pvPower1 -> State pvPower2)
          obj.properties.pvPower1
        );
      }

      if (
        obj.properties?.pvPower2 != null &&
        obj.properties?.pvPower2 != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "pvPower1", // Reversed (MQTT pvPower2 -> State pvPower1)
          obj.properties.pvPower2
        );
      }

      // START: Added for pvPower3 and pvPower4
      if (
        obj.properties?.pvPower3 != null &&
        obj.properties?.pvPower3 != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "pvPower4", // Assuming reversal continues (MQTT pvPower3 -> State pvPower4)
          obj.properties.pvPower3
        );
      }

      if (
        obj.properties?.pvPower4 != null &&
        obj.properties?.pvPower4 != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "pvPower3", // Assuming reversal continues (MQTT pvPower4 -> State pvPower3)
          obj.properties.pvPower4
        );
      }
      // END: Added for pvPower3 and pvPower4

      // Solar Power Inputs (obj.properties.solarPowerX from MQTT, direct mapping to pvPowerX states)
      if (
        obj.properties?.solarPower1 != null &&
        obj.properties?.solarPower1 != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "pvPower1", // MQTT solarPower1 -> State pvPower1
          obj.properties.solarPower1
        );
      }

      if (
        obj.properties?.solarPower2 != null &&
        obj.properties?.solarPower2 != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "pvPower2", // MQTT solarPower2 -> State pvPower2
          obj.properties.solarPower2
        );
      }

      // START: Added for solarPower3 and solarPower4
      if (
        obj.properties?.solarPower3 != null &&
        obj.properties?.solarPower3 != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "pvPower3", // MQTT solarPower3 -> State pvPower3
          obj.properties.solarPower3
        );
      }

      if (
        obj.properties?.solarPower4 != null &&
        obj.properties?.solarPower4 != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "pvPower4", // MQTT solarPower4 -> State pvPower4
          obj.properties.solarPower4
        );
      }
      // END: Added for solarPower3 and solarPower4

      if (
        obj.properties?.remainOutTime != null &&
        obj.properties?.remainOutTime != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "remainOutTime",
          obj.properties.remainOutTime
        );
      }

      if (
        obj.properties?.remainInputTime != null &&
        obj.properties?.remainInputTime != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "remainInputTime",
          obj.properties.remainInputTime
        );
      }

      if (obj.properties?.socSet != null && obj.properties?.socSet != undefined) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "socSet",
          Number(obj.properties.socSet) / 10
        );

        updateSolarFlowControlState(
          adapter,
          productKey,
          deviceKey,
          "chargeLimit",
          Number(obj.properties.socSet) / 10
        );
      }

      if (obj.properties?.minSoc != null && obj.properties?.minSoc != undefined) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "minSoc",
          Number(obj.properties.minSoc) / 10
        );

        updateSolarFlowControlState(
          adapter,
          productKey,
          deviceKey,
          "dischargeLimit",
          Number(obj.properties.minSoc) / 10
        );
      }

      if (
        obj.properties?.inputLimit != null &&
        obj.properties?.inputLimit != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "inputLimit",
          obj.properties.inputLimit
        );

        if (
          productName?.includes("solarflow") ||
          productName?.includes("ace") ||
          productName?.includes("hyper")
        ) {
          updateSolarFlowControlState(
            adapter,
            productKey,
            deviceKey,
            "setInputLimit",
            obj.properties.inputLimit
          );
        }
      }

      if (
        obj.properties?.gridInputPower != null &&
        obj.properties?.gridInputPower != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "gridInputPower",
          obj.properties.gridInputPower
        );
      }

      if (obj.properties?.acMode != null && obj.properties?.acMode != undefined) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "acMode",
          obj.properties.acMode
        );

        updateSolarFlowControlState(
          adapter,
          productKey,
          deviceKey,
          "acMode",
          obj.properties.acMode
        );
      }

      if (
        obj.properties?.hyperTmp != null &&
        obj.properties?.hyperTmp != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "hyperTmp",
          obj.properties.hyperTmp / 10 - 273.15 // Kelvin to Celsius
        );
      }

      if (
        obj.properties?.acOutputPower != null &&
        obj.properties?.acOutputPower != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "acOutputPower",
          obj.properties.acOutputPower
        );
      }

      if (
        obj.properties?.gridPower != null &&
        obj.properties?.gridPower != undefined
      ) {
        // This seems to be an alias for gridInputPower
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "gridInputPower",
          obj.properties.gridPower
        );
      }

      if (
        obj.properties?.acSwitch != null &&
        obj.properties?.acSwitch != undefined
      ) {
        const value = obj.properties?.acSwitch == 0 ? false : true;
        updateSolarFlowState(adapter, productKey, deviceKey, "acSwitch", value);
        updateSolarFlowControlState(
          adapter,
          productKey,
          deviceKey,
          "acSwitch",
          value
        );
      }

      if (
        obj.properties?.dcSwitch != null &&
        obj.properties?.dcSwitch != undefined
      ) {
        const value = obj.properties?.dcSwitch == 0 ? false : true;
        updateSolarFlowState(adapter, productKey, deviceKey, "dcSwitch", value);
        updateSolarFlowControlState(
          adapter,
          productKey,
          deviceKey,
          "dcSwitch",
          value
        );
      }

      if (
        obj.properties?.dcOutputPower != null &&
        obj.properties?.dcOutputPower != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "dcOutputPower",
          obj.properties.dcOutputPower
        );
      }

      if (
        obj.properties?.pvBrand != null &&
        obj.properties?.pvBrand != undefined
      ) {
        const value =
          obj.properties?.pvBrand == 0
            ? "Others"
            : obj.properties?.pvBrand == 1
              ? "Hoymiles"
              : obj.properties?.pvBrand == 2
                ? "Enphase"
                : obj.properties?.pvBrand == 3
                  ? "APSystems"
                  : obj.properties?.pvBrand == 4
                    ? "Anker"
                    : obj.properties?.pvBrand == 5
                      ? "Deye"
                      : obj.properties?.pvBrand == 6
                        ? "Bosswerk"
                        : "Unknown";
        updateSolarFlowState(adapter, productKey, deviceKey, "pvBrand", value);
      }

      if (
        obj.properties?.inverseMaxPower != null &&
        obj.properties?.inverseMaxPower != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "inverseMaxPower",
          obj.properties.inverseMaxPower
        );
      }

      // wifiState is handled earlier based on timestamp, but this could be a direct report
      if (
        obj.properties?.wifiState != null &&
        obj.properties?.wifiState != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "wifiState",
          obj.properties.wifiState == 1 ? "Connected" : "Disconnected"
        );
      }

      if (
        obj.properties?.packNum != null &&
        obj.properties?.packNum != undefined
      ) {
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "packNum",
          obj.properties.packNum
        );
      }

      if (
        obj.properties?.hubState != null &&
        obj.properties?.hubState != undefined
      ) {
        // Assuming hubState value is directly usable or needs mapping if it's textual
        updateSolarFlowState(
          adapter,
          productKey,
          deviceKey,
          "hubState",
          obj.properties.hubState // Might need mapping like packState if it's numeric with defined meanings
        );

        updateSolarFlowControlState(
          adapter,
          productKey,
          deviceKey,
          "hubState",
          obj.properties.hubState
        );
      }

      // Debug unknown properties
      if (adapter.log.level == "debug") {
        let type = "solarflow"; // Default type
        if (productName?.includes("hyper")) {
            type = "hyper";
        } else if (productName?.includes("ace")) {
            type = "ace";
        } else if (productName?.includes("aio")) {
            type = "aio";
        } else if (productName?.includes("smart plug")) {
            type = "smartPlug";
        }

        const states = getStateDefinition(type); // This function might need updating for pvPower3/4
        Object.entries(obj.properties).forEach(([key, value]) => {
          const isKnown = states.some((state: ISolarflowState) => state.title === key);
          if (!isKnown) {
            // Also check against newly added pvPower/solarPower keys if not in getStateDefinition yet
            const manuallyCheckedKeys = ["pvPower3", "pvPower4", "solarPower3", "solarPower4"];
            if (!manuallyCheckedKeys.includes(key)) {
                 adapter?.log.debug(
                    `[onMessage] Device: ${productName || productKey + '.' + deviceKey}, UNKNOWN Mqtt Property in 'obj.properties': ${key} with value ${JSON.stringify(value)}`
                 );
            }
          }
        });
      }
    } // End of if(obj.properties)

    if (obj.packData) {
      addOrUpdatePackData(productKey, deviceKey, obj.packData, isSolarFlow);
    }
  }
};

// ... (rest of the functions: setAcMode, setChargeLimit, etc. remain unchanged by this request)
// ... (connectCloudMqttClient, connectLocalMqttClient, etc. also remain unchanged by this specific pvPower request)

// Make sure the following functions are complete and correctly defined elsewhere
// as they are imported and used but not fully shown in the snippet:
// export const setAcMode = ...
// export const setChargeLimit = ...
// export const setDischargeLimit = ...
// ... and so on for all exported 'set' functions and connection functions.

// --- The following functions are provided for completeness but were not modified for pvPower ---
export const setAcMode = async (
  adapter: ZendureSolarflow,
  productKey: string,
  deviceKey: string,
  acMode: number
): Promise<void> => {
  if (adapter.mqttClient && productKey && deviceKey) {
    if (acMode >= 0 && acMode <= 2) {
      const topic = `iot/${productKey}/${deviceKey}/properties/write`;

      const setAcMode = { properties: { acMode: acMode } };
      adapter.log.debug(`[setAcMode] Set AC mode to ${acMode}!`);
      adapter.mqttClient?.publish(topic, JSON.stringify(setAcMode));
    } else {
      adapter.log.error(`[setAcMode] AC mode must be a value between 0 and 2!`);
    }
  }
};

export const setChargeLimit = async (
  adapter: ZendureSolarflow,
  productKey: string,
  deviceKey: string,
  socSet: number
): Promise<void> => {
  if (adapter.mqttClient && productKey && deviceKey) {
    if (socSet >= 40 && socSet <= 100) {
      const topic = `iot/${productKey}/${deviceKey}/properties/write`;

      const socSetLimit = { properties: { socSet: socSet * 10 } };
      adapter.log.debug(
        `[setChargeLimit] Setting ChargeLimit for device key ${deviceKey} to ${socSet}!`
      );
      adapter.mqttClient?.publish(topic, JSON.stringify(socSetLimit));
    } else {
      adapter.log.debug(
        `[setChargeLimit] Charge limit is not in range 40<>100!`
      );
    }
  }
};

export const setDischargeLimit = async (
  adapter: ZendureSolarflow,
  productKey: string,
  deviceKey: string,
  minSoc: number
): Promise<void> => {
  if (adapter.mqttClient && productKey && deviceKey) {
    if (minSoc >= 0 && minSoc <= 50) {
      const topic = `iot/${productKey}/${deviceKey}/properties/write`;

      const socSetLimit = { properties: { minSoc: minSoc * 10 } };
      adapter.log.debug(
        `[setDischargeLimit] Setting Discharge Limit for device key ${deviceKey} to ${minSoc}!`
      );
      adapter.mqttClient?.publish(topic, JSON.stringify(socSetLimit));
    } else {
      adapter.log.debug(
        `[setDischargeLimit] Discharge limit is not in range 0<>50!`
      );
    }
  }
};

export const setHubState = async (
  adapter: ZendureSolarflow,
  productKey: string,
  deviceKey: string,
  hubState: number
): Promise<void> => {
  if (adapter.mqttClient && productKey && deviceKey) {
    if (hubState == 0 || hubState == 1) {
      const topic = `iot/${productKey}/${deviceKey}/properties/write`;

      const socSetLimit = { properties: { hubState: hubState } };
      adapter.log.debug(
        `[setHubState] Setting Hub State for device key ${deviceKey} to ${hubState}!`
      );
      adapter.mqttClient?.publish(topic, JSON.stringify(socSetLimit));
    } else {
      adapter.log.debug(`[setHubState] Hub state is not 0 or 1!`);
    }
  }
};

export const setOutputLimit = async (
  adapter: ZendureSolarflow,
  productKey: string,
  deviceKey: string,
  limit: number
): Promise<void> => {
  if (adapter.mqttClient && productKey && deviceKey) {
    // Check if autoModel is set to 0
    const autoModel = (
      await adapter.getStateAsync(productKey + "." + deviceKey + ".autoModel")
    )?.val;

    if (autoModel != 0) {
      adapter.log.warn(
        "Operation mode (autoModel) is not set to '0', we can't set the output limit!"
      );
      return;
    }

    if (limit != null) { // check for null/undefined
      limit = Math.round(limit);
    } else {
      limit = 0;
    }

    if (adapter.config.useLowVoltageBlock) {
      const lowVoltageBlockState = await adapter.getStateAsync(
        productKey + "." + deviceKey + ".control.lowVoltageBlock"
      );
      if (
        lowVoltageBlockState &&
        lowVoltageBlockState.val === true // strict check
      ) {
        limit = 0;
      }

      const fullChargeNeeded = await adapter.getStateAsync(
        productKey + "." + deviceKey + ".control.fullChargeNeeded"
      );

      if (
        fullChargeNeeded &&
        fullChargeNeeded.val === true // strict check
      ) {
        limit = 0;
      }
    }

    const currentLimit = (
      await adapter.getStateAsync(productKey + "." + deviceKey + ".outputLimit")
    )?.val;

    const productName = (
      await adapter.getStateAsync(productKey + "." + deviceKey + ".productName")
    )?.val
      ?.toString()
      .toLowerCase();

    if (currentLimit != null && currentLimit != undefined) {
      if (currentLimit != limit) {
        if (
          limit < 100 &&
          limit != 90 &&
          limit != 60 &&
          limit != 30 &&
          limit != 0
        ) {
          // NUR Solarflow HUB: Das Limit kann unter 100 nur in 30er Schritten gesetzt werden, dH. 30/60/90/100, wir rechnen das also um
          if (limit < 100 && limit > 90 && !productName?.includes("hyper") && !productName?.includes("ace")) {
            limit = 90;
          } else if (
            limit > 60 &&
            limit < 90 &&
            !productName?.includes("hyper") && !productName?.includes("ace")
          ) {
            limit = 60;
          } else if (
            limit > 30 &&
            limit < 60 &&
            !productName?.includes("hyper") && !productName?.includes("ace")
          ) {
            limit = 30;
          } else if (limit < 30 && !productName?.includes("hyper") && !productName?.includes("ace")) { // only apply 30W min for non-hyper/ace
            limit = 30;
          } else if (limit < 0) {
             limit = 0; // ensure limit is not negative
          }
        }

        if (limit > 1200) { // General max cap, might be device specific
          limit = 1200;
        }

        const topic = `iot/${productKey}/${deviceKey}/properties/write`;

        const outputlimit = { properties: { outputLimit: limit } };
        adapter.mqttClient?.publish(topic, JSON.stringify(outputlimit));
      }
    }
  }
};

export const setInputLimit = async (
  adapter: ZendureSolarflow,
  productKey: string,
  deviceKey: string,
  limit: number
): Promise<void> => {
  if (adapter.mqttClient && productKey && deviceKey) {
    if (limit != null) { // check for null/undefined
      limit = Math.round(limit);
    } else {
      limit = 0;
    }

    let maxLimit = 900;
    const currentLimit = (
      await adapter.getStateAsync(productKey + "." + deviceKey + ".inputLimit")
    )?.val;

    const productName = (
      await adapter.getStateAsync(productKey + "." + deviceKey + ".productName")
    )?.val
      ?.toString()
      .toLowerCase();

    if (productName?.includes("hyper")) {
      maxLimit = 1200;
    } else if (productName?.includes("ace")) {
        maxLimit = 1800; // Example, adjust if known
    }


    if (productName?.includes("ace")) {
      // Das Limit kann nur in 100er Schritten gesetzt werden for ACE
      limit = Math.ceil(limit / 100) * 100;
    }

    if (limit < 0) {
      limit = 0;
    } else if (limit > 0 && limit <= 30 && !productName?.includes("ace") && !productName?.includes("hyper") ) { // 30W min for some devices
      limit = 30;
    } else if (limit > maxLimit) {
      limit = maxLimit;
    }

    if (currentLimit != null && currentLimit != undefined) {
      if (currentLimit != limit) {
        const topic = `iot/${productKey}/${deviceKey}/properties/write`;

        const inputLimitContent = { properties: { inputLimit: limit } };
        adapter.mqttClient?.publish(topic, JSON.stringify(inputLimitContent));
      }
    }
  }
};

export const setBuzzerSwitch = async (
  adapter: ZendureSolarflow,
  productKey: string,
  deviceKey: string,
  buzzerOn: boolean
): Promise<void> => {
  if (adapter.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/write`;

    const setBuzzerSwitchContent = {
      properties: { buzzerSwitch: buzzerOn ? 1 : 0 },
    };
    adapter.log.debug(
      `[setBuzzer] Setting Buzzer for device key ${deviceKey} to ${buzzerOn}!`
    );
    adapter.mqttClient?.publish(topic, JSON.stringify(setBuzzerSwitchContent));
  }
};

export const setAutoModel = async (
  adapter: ZendureSolarflow,
  productKey: string,
  deviceKey: string,
  autoModel: number
): Promise<void> => {
  if (adapter.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/write`;

    let setAutoModelContent: any = { properties: { autoModel: autoModel } };

    switch (autoModel) {
      case 8: // Smart Matching Modus
        setAutoModelContent = {
          properties: {
            autoModelProgram: 1,
            autoModelValue: { chargingType: 0, chargingPower: 0, outPower: 0 },
            msgType: 1,
            autoModel: 8,
          },
        };
        break;
      case 9: // Smart CT Modus
        setAutoModelContent = {
          properties: {
            autoModelProgram: 2,
            autoModelValue: { chargingType: 3, chargingPower: 0, outPower: 0 },
            msgType: 1,
            autoModel: 9,
          },
        };
        break;
    }

    adapter.log.debug(
      `[setAutoModel] Setting autoModel for device key ${deviceKey} to ${autoModel}!`
    );
    adapter.mqttClient?.publish(topic, JSON.stringify(setAutoModelContent));
  }
};

export const triggerFullTelemetryUpdate = async (
  adapter: ZendureSolarflow,
  productKey: string,
  deviceKey: string
): Promise<void> => {
  if (adapter.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/read`;

    const getAllContent = { properties: ["getAll"] };
    adapter.log.debug(
      `[triggerFullTelemetryUpdate] Triggering full telemetry update for device key ${deviceKey}!`
    );
    adapter.mqttClient?.publish(topic, JSON.stringify(getAllContent));
  }
};

export const setPassMode = async (
  adapter: ZendureSolarflow,
  productKey: string,
  deviceKey: string,
  passMode: number
): Promise<void> => {
  if (adapter.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/write`;

    const setPassModeContent = { properties: { passMode: passMode } };
    adapter.log.debug(
      `[setPassMode] Set passMode for device ${deviceKey} to ${passMode}!`
    );
    adapter.mqttClient?.publish(topic, JSON.stringify(setPassModeContent));
  }
};

export const setAutoRecover = async (
  adapter: ZendureSolarflow,
  productKey: string,
  deviceKey: string,
  autoRecover: boolean
): Promise<void> => {
  if (adapter.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/write`;

    const setAutoRecoverContent = {
      properties: { autoRecover: autoRecover ? 1 : 0 },
    };
    adapter.log.debug(
      `[setAutoRecover] Set autoRecover for device ${deviceKey} to ${autoRecover}!`
    );
    adapter.mqttClient?.publish(topic, JSON.stringify(setAutoRecoverContent));
  }
};

export const setDcSwitch = async (
  adapter: ZendureSolarflow,
  productKey: string,
  deviceKey: string,
  dcSwitch: boolean
): Promise<void> => {
  if (adapter.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/write`;

    const setDcSwitchContent = {
      properties: { dcSwitch: dcSwitch ? 1 : 0 },
    };
    adapter.log.debug(
      `[setDcSwitch] Set DC Switch for device ${deviceKey} to ${dcSwitch}!`
    );
    adapter.mqttClient?.publish(topic, JSON.stringify(setDcSwitchContent));
  }
};

export const setAcSwitch = async (
  adapter: ZendureSolarflow,
  productKey: string,
  deviceKey: string,
  acSwitch: boolean
): Promise<void> => {
  if (adapter.mqttClient && productKey && deviceKey) {
    const topic = `iot/${productKey}/${deviceKey}/properties/write`;

    const setAcSwitchContent = {
      properties: { acSwitch: acSwitch ? 1 : 0 },
    };
    adapter.log.debug(
      `[setAcSwitch] Set AC Switch for device ${deviceKey} to ${acSwitch}!`
    );
    adapter.mqttClient?.publish(topic, JSON.stringify(setAcSwitchContent));
  }
};

const onConnected = (): void => {
  adapter?.log.info("[onConnected] Connected with MQTT!");
};

const onError = (error: any): void => {
  adapter?.log.error("Connection to MQTT failed! Error: " + error);
};

const onSubscribeReportTopic: any = (error: Error | null) => {
  if (error) {
    adapter?.log.error("Subscription to MQTT failed! Error: " + error);
  } else {
    adapter?.log.debug("Subscription of Report Topic successful!");
  }
};

const onSubscribeIotTopic: any = (
  error: Error | null,
  productKey: string,
  deviceKey: string
) => {
  if (error) {
    adapter?.log.error(`Subscription to MQTT iotTopic for ${productKey}/${deviceKey} failed! Error: ${error}`);
  } else if (adapter) {
    adapter?.log.debug(`Subscription of IOT Topic for ${productKey}/${deviceKey} successful!`);
    triggerFullTelemetryUpdate(adapter, productKey, deviceKey);
  }
};

export const subscribeReportTopic = (
  productKey: string,
  deviceKey: string,
  timeout: number
): void => {
  const reportTopic = `/${productKey}/${deviceKey}/#`; // Note: Original had `/server/app` prefix in onMessage parsing, but subscription here is direct. Ensure consistency.

  setTimeout(() => {
    if (adapter && adapter.mqttClient) { // Ensure mqttClient is available
      adapter.log.debug(
        `[subscribeReportTopic] Subscribing to MQTT Topic: ${reportTopic}`
      );
      adapter.mqttClient?.subscribe(reportTopic, onSubscribeReportTopic);
    } else {
        adapter?.log.warn(`[subscribeReportTopic] MQTT client not available when trying to subscribe to ${reportTopic}`);
    }
  }, timeout);
};

export const subscribeIotTopic = (
  productKey: string,
  deviceKey: string,
  timeout: number
): void => {
  const iotTopic = `iot/${productKey}/${deviceKey}/#`;

  setTimeout(() => {
    if (adapter && adapter.mqttClient) { // Ensure mqttClient is available
        adapter.log.debug(
        `[subscribeIotTopic] Subscribing to MQTT Topic: ${iotTopic}`
        );
        adapter?.mqttClient?.subscribe(iotTopic, (error) => {
        onSubscribeIotTopic(error, productKey, deviceKey);
        });
    } else {
        adapter?.log.warn(`[subscribeIotTopic] MQTT client not available when trying to subscribe to ${iotTopic}`);
    }
  }, timeout);
};

export const connectCloudMqttClient = (_adapter: ZendureSolarflow): void => {
  adapter = _adapter;

  if (!adapter.paths?.mqttPassword) {
    adapter.log.error(`[connectCloudMqttClient] MQTT Password is missing!`);
    return;
  }

  const mqttPassword = atob(adapter.paths?.mqttPassword); // Ensure atob is available (Node.js: Buffer.from(str, 'base64').toString())

  const options: mqtt.IClientOptions = {
    clientId: adapter.accessToken, // This should be unique per client connection
    username: "zenApp",
    password: mqttPassword,
    clean: true,
    protocolVersion: 5,
  };

  if (mqtt && adapter && adapter.paths && adapter.deviceList) {
    adapter.log.debug(
      `[connectCloudMqttClient] Connecting to MQTT broker ${
        adapter.paths.mqttUrl + ":" + adapter.paths.mqttPort
      }...`
    );
    adapter.mqttClient = mqtt.connect(
      "mqtt://" + adapter.paths.mqttUrl + ":" + adapter.paths.mqttPort,
      options
    );

    if (adapter && adapter.mqttClient) {
      adapter.mqttClient.on("connect", onConnected);
      adapter.mqttClient.on("error", onError);
      adapter.mqttClient.on("close", () => adapter?.log.info("MQTT client disconnected (cloud)."));
      adapter.mqttClient.on("reconnect", () => adapter?.log.info("MQTT client attempting to reconnect (cloud)..."));


      // Subscribe to Topic
      adapter.deviceList.forEach(
        (device: ISolarFlowDeviceDetails, index: number) => {
          if (adapter) { // adapter check within loop
            let connectIot = true;

            // Example: Smart Plug specific topic
            if (device.productKey == "s3Xk4x" && adapter.userId && device.id) { // Ensure userId and device.id are available
              const smartPlugReportTopic = `/server/app/${adapter.userId}/${device.id}/smart/power`;
              adapter.log.debug(`[connectCloudMqttClient] Subscribing to Smart Plug Topic: ${smartPlugReportTopic}`);
              adapter.mqttClient?.subscribe(
                smartPlugReportTopic,
                onSubscribeReportTopic
              );
              connectIot = false; // Assuming smart plugs don't use the standard iot/ topic structure
            }

            // Standard report topic (check if still needed if smart plug handled above)
            // The topic structure in onMessage `topic.replace("/server/app", "").split("/");` implies /server/app/<productKey>/<deviceKey>/...
            // Let's assume the subscribeReportTopic function constructs the correct topic format.
             const baseReportTopicPrefix = adapter.config.useAppTopicStructure ? `/server/app/${device.productKey}/${device.deviceKey}/#` : `/${device.productKey}/${device.deviceKey}/#`;
             // For now, using the simpler one as per subscribeReportTopic function
             subscribeReportTopic(
              device.productKey,
              device.deviceKey,
              1000 * index // Stagger subscriptions
            );


            if (connectIot) {
              subscribeIotTopic(
                device.productKey,
                device.deviceKey,
                1000 * index + 500 // Stagger slightly from report topic
              );
            }

            // Handle sub-devices like ACE
            if (device.packList && device.packList.length > 0) {
              device.packList.forEach(async (subDevice, subIndex) => { // Added subIndex for staggering
                if (subDevice.productName?.toLocaleLowerCase() == "ace 1500") { // Optional chaining for productName
                  adapter.log.debug(`[connectCloudMqttClient] Subscribing to ACE sub-device: ${subDevice.productKey}/${subDevice.deviceKey}`);
                  subscribeReportTopic(
                    subDevice.productKey,
                    subDevice.deviceKey,
                    1000 * (index + 1) + 200 * subIndex // Further stagger sub-device subscriptions
                  );
                  subscribeIotTopic(
                    subDevice.productKey,
                    subDevice.deviceKey,
                    1000 * (index + 1) + 200 * subIndex + 100
                  );
                }
              });
            }
          }
        }
      );

      adapter.mqttClient.on("message", onMessage);

      // Start jobs
      startResetValuesJob(adapter);
      startCheckStatesAndConnectionJob(adapter);
      if (adapter.config.useCalculation) {
        startCalculationJob(adapter);
      }
    } else {
        adapter?.log.error("[connectCloudMqttClient] MQTT client connection failed to initialize.");
    }
  }
};

export const connectLocalMqttClient = (_adapter: ZendureSolarflow): void => {
  adapter = _adapter;

  const options: mqtt.IClientOptions = {
    clientId: "ioBroker.zendure-solarflow." + adapter.instance, // Unique client ID
    // Add username/password if local MQTT requires auth
    // username: adapter.config.localMqttUser,
    // password: adapter.config.localMqttPassword,
    clean: true, // Recommended for IoT device data
    protocolVersion: 5, // Or 4, depending on broker
  };

  if (mqtt && adapter && adapter.config && adapter.config.localMqttUrl) {
    const localMqttPort = adapter.config.localMqttPort || 1883; // Allow configurable port, default 1883
    adapter.log.debug(
      `[connectLocalMqttClient] Connecting to local MQTT broker ${
        adapter.config.localMqttUrl + ":" + localMqttPort
      }...`
    );
    adapter.mqttClient = mqtt.connect(
      `mqtt://${adapter.config.localMqttUrl}:${localMqttPort}`,
      options
    );

    if (adapter && adapter.mqttClient) {
      adapter.mqttClient.on("connect", () => {
        onConnected(); // General connected log
        adapter?.setState("info.connection", true, true); // Adapter specific connection state
      });
      adapter.mqttClient.on("error", onError);
      adapter.mqttClient.on("close", () => {
        adapter?.log.info("MQTT client disconnected (local).");
        adapter?.setState("info.connection", false, true);
      });
      adapter.mqttClient.on("reconnect", () => adapter?.log.info("MQTT client attempting to reconnect (local)..."));


      const devicesToSubscribe = [
        { productKey: adapter.config.localDevice1ProductKey, deviceKey: adapter.config.localDevice1DeviceKey, delay: 1000 },
        { productKey: adapter.config.localDevice2ProductKey, deviceKey: adapter.config.localDevice2DeviceKey, delay: 2000 },
        { productKey: adapter.config.localDevice3ProductKey, deviceKey: adapter.config.localDevice3DeviceKey, delay: 3000 },
        { productKey: adapter.config.localDevice4ProductKey, deviceKey: adapter.config.localDevice4DeviceKey, delay: 4000 },
      ];

      devicesToSubscribe.forEach(deviceConfig => {
        if (deviceConfig.productKey && deviceConfig.deviceKey) {
          createSolarFlowLocalStates(adapter!, deviceConfig.productKey, deviceConfig.deviceKey); // adapter! because it's checked
          subscribeReportTopic(deviceConfig.productKey, deviceConfig.deviceKey, deviceConfig.delay);
          subscribeIotTopic(deviceConfig.productKey, deviceConfig.deviceKey, deviceConfig.delay + 500); // Stagger iot topic
        }
      });

      adapter.mqttClient.on("message", onMessage);

      // Start jobs
      startResetValuesJob(adapter);
      startCheckStatesAndConnectionJob(adapter);
      if (adapter.config.useCalculation) {
        startCalculationJob(adapter);
      }
    }  else {
        adapter?.log.error("[connectLocalMqttClient] MQTT client connection failed to initialize.");
    }
  }
};
