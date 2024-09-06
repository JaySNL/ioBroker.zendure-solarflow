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
var webService_exports = {};
__export(webService_exports, {
  getDeviceList: () => getDeviceList,
  login: () => login
});
module.exports = __toCommonJS(webService_exports);
var import_axios = __toESM(require("axios"));
const config = {
  headers: {
    "Content-Type": "application/json",
    "Accept-Language": "de-DE",
    appVersion: "4.3.1",
    "User-Agent": "Zendure/4.3.1 (iPhone; iOS 14.4.2; Scale/3.00)",
    Accept: "*/*",
    Authorization: "Basic Q29uc3VtZXJBcHA6NX4qUmRuTnJATWg0WjEyMw==",
    "Blade-Auth": "bearer (null)"
  },
  timeout: 1e4
};
const login = (adapter) => {
  if (adapter.accessToken) {
    return new Promise((resolve) => {
      if (adapter.accessToken) {
        resolve(adapter.accessToken);
      }
    });
  }
  const auth = Buffer.from(
    `${adapter.config.userName}:${adapter.config.password}`
  ).toString("base64");
  if (!config || !config.headers) {
    adapter.log.info("[login] Axios config is invalid!");
    return Promise.reject(void 0);
  }
  config.headers.Authorization = "Basic " + auth;
  const authBody = {
    password: adapter.config.password,
    account: adapter.config.userName,
    appId: "121c83f761305d6cf7b",
    appType: "iOS",
    grantType: "password",
    tenantId: ""
  };
  if (adapter.paths && adapter.paths.solarFlowTokenUrl) {
    return import_axios.default.post(adapter.paths.solarFlowTokenUrl, authBody, config).then(function(response) {
      var _a, _b, _c, _d, _e, _f;
      if (response.data.success) {
        adapter.log.info("[login] Login to Zendure Rest API successful!");
        if ((_b = (_a = response.data) == null ? void 0 : _a.data) == null ? void 0 : _b.userId) {
          adapter.userId = (_d = (_c = response.data) == null ? void 0 : _c.data) == null ? void 0 : _d.userId;
        }
        if ((_f = (_e = response.data) == null ? void 0 : _e.data) == null ? void 0 : _f.accessToken) {
          return response.data.data.accessToken;
        }
      } else {
        return void 0;
      }
    });
  } else {
    return Promise.reject(void 0);
  }
};
const getDeviceList = (adapter) => {
  adapter.log.debug(
    "[getDeviceList] Getting device list from Zendure Rest API!"
  );
  if (adapter && adapter.paths && adapter.accessToken && config && config.headers) {
    config.headers["Blade-Auth"] = "bearer " + adapter.accessToken;
    const body = {};
    return import_axios.default.post(
      adapter.paths.solarFlowQueryDeviceListUrl,
      JSON.stringify(body),
      config
    ).then(function(response) {
      if (response.data.data && response.data.data.length > 0) {
        return response.data.data;
      } else {
        return [];
      }
    });
  } else {
    adapter.log.error("[getDeviceList] No Access Token found!");
    return Promise.reject("No Access Token found!");
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getDeviceList,
  login
});
//# sourceMappingURL=webService.js.map
