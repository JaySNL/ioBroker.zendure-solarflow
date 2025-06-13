// @ts-nocheck
import { setInputLimit } from "./mqttService";
import { ZendureSolarflow } from "../main";
import * as sinon from "sinon";
import { expect } from "chai"; // Using chai for assertions

// Mock the ZendureSolarflow adapter and its methods
const mockGetStateAsync = sinon.stub();
const mockPublish = sinon.stub();

const mockAdapter = {
  getStateAsync: mockGetStateAsync,
  mqttClient: {
    publish: mockPublish,
  },
  log: {
    debug: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    info: sinon.stub(),
  },
  config: {}, // Add any necessary config properties
} as unknown as ZendureSolarflow;

describe("setInputLimit", () => {
  beforeEach(() => {
    // Clear mock calls and implementations before each test
    mockGetStateAsync.reset();
    mockPublish.resetHistory(); // Use resetHistory for sinon stubs
  });

  // Test case 1: productName is "solarflow 800 pro", limit is 1200
  it("should set limit to 1000 for 'solarflow 800 pro' when input limit is 1200", async () => {
    mockGetStateAsync.callsFake((stateId) => {
      if (stateId.endsWith(".productName")) {
        return Promise.resolve({ val: "solarflow 800 pro" });
      }
      if (stateId.endsWith(".inputLimit")) {
        return Promise.resolve({ val: 500 }); // Some current limit
      }
      return Promise.resolve({ val: null });
    });

    await setInputLimit(mockAdapter, "productKey1", "deviceKey1", 1200);

    expect(mockPublish.calledOnceWith(
      "iot/productKey1/deviceKey1/properties/write",
      JSON.stringify({ properties: { inputLimit: 1000 } })
    )).to.be.true;
  });

  // Test case 2: productName is "solarflow 800", limit is 900
  it("should set limit to 800 for 'solarflow 800' when input limit is 900", async () => {
    mockGetStateAsync.callsFake((stateId) => {
      if (stateId.endsWith(".productName")) {
        return Promise.resolve({ val: "solarflow 800" });
      }
      if (stateId.endsWith(".inputLimit")) {
        return Promise.resolve({ val: 500 });
      }
      return Promise.resolve({ val: null });
    });

    await setInputLimit(mockAdapter, "productKey2", "deviceKey2", 900);

    expect(mockPublish.calledOnceWith(
      "iot/productKey2/deviceKey2/properties/write",
      JSON.stringify({ properties: { inputLimit: 800 } })
    )).to.be.true;
  });

  // Test case 3: productName is "solarflow 800 pro", limit is 700
  it("should set limit to 700 for 'solarflow 800 pro' when input limit is 700", async () => {
    mockGetStateAsync.callsFake((stateId) => {
      if (stateId.endsWith(".productName")) {
        return Promise.resolve({ val: "solarflow 800 pro" });
      }
      if (stateId.endsWith(".inputLimit")) {
        return Promise.resolve({ val: 500 });
      }
      return Promise.resolve({ val: null });
    });

    await setInputLimit(mockAdapter, "productKey3", "deviceKey3", 700);

    expect(mockPublish.calledOnceWith(
      "iot/productKey3/deviceKey3/properties/write",
      JSON.stringify({ properties: { inputLimit: 700 } })
    )).to.be.true;
  });

  // Test case 4: productName is "solarflow 800", limit is 700
  it("should set limit to 700 for 'solarflow 800' when input limit is 700", async () => {
    mockGetStateAsync.callsFake((stateId) => {
      if (stateId.endsWith(".productName")) {
        return Promise.resolve({ val: "solarflow 800" });
      }
      if (stateId.endsWith(".inputLimit")) {
        return Promise.resolve({ val: 500 });
      }
      return Promise.resolve({ val: null });
    });

    await setInputLimit(mockAdapter, "productKey4", "deviceKey4", 700);

    expect(mockPublish.calledOnceWith(
      "iot/productKey4/deviceKey4/properties/write",
      JSON.stringify({ properties: { inputLimit: 700 } })
    )).to.be.true;
  });

  // Test case 5: productName is "hyper 2000", limit is 1300
  it("should set limit to 1200 for 'hyper 2000' when input limit is 1300", async () => {
    mockGetStateAsync.callsFake((stateId) => {
      if (stateId.endsWith(".productName")) {
        return Promise.resolve({ val: "hyper 2000" });
      }
      if (stateId.endsWith(".inputLimit")) {
        return Promise.resolve({ val: 500 });
      }
      return Promise.resolve({ val: null });
    });

    await setInputLimit(mockAdapter, "productKey5", "deviceKey5", 1300);

    expect(mockPublish.calledOnceWith(
      "iot/productKey5/deviceKey5/properties/write",
      JSON.stringify({ properties: { inputLimit: 1200 } })
    )).to.be.true;
  });

  // Test case 6: productName is "2400 ac", limit is 2500
  it("should set limit to 2400 for '2400 ac' when input limit is 2500", async () => {
    mockGetStateAsync.callsFake((stateId) => {
      if (stateId.endsWith(".productName")) {
        return Promise.resolve({ val: "solarflow 2400 ac" }); // Added solarflow to match includes()
      }
      if (stateId.endsWith(".inputLimit")) {
        return Promise.resolve({ val: 500 });
      }
      return Promise.resolve({ val: null });
    });

    await setInputLimit(mockAdapter, "productKey6", "deviceKey6", 2500);

    expect(mockPublish.calledOnceWith(
      "iot/productKey6/deviceKey6/properties/write",
      JSON.stringify({ properties: { inputLimit: 2400 } })
    )).to.be.true;
  });

  // Test case 7: productName is "some other device", limit is 1000
  it("should set limit to 900 for 'some other device' when input limit is 1000 (default maxLimit)", async () => {
    mockGetStateAsync.callsFake((stateId) => {
      if (stateId.endsWith(".productName")) {
        return Promise.resolve({ val: "some other device" });
      }
      if (stateId.endsWith(".inputLimit")) {
        return Promise.resolve({ val: 500 });
      }
      return Promise.resolve({ val: null });
    });

    await setInputLimit(mockAdapter, "productKey7", "deviceKey7", 1000);

    expect(mockPublish.calledOnceWith(
      "iot/productKey7/deviceKey7/properties/write",
      JSON.stringify({ properties: { inputLimit: 900 } }) // Default maxLimit is 900
    )).to.be.true;
  });

  // Test case 8: limit is -10
  it("should set limit to 0 when input limit is -10", async () => {
    mockGetStateAsync.callsFake((stateId) => {
      if (stateId.endsWith(".productName")) {
        return Promise.resolve({ val: "any device" }); // Product name doesn't matter here
      }
      if (stateId.endsWith(".inputLimit")) {
        return Promise.resolve({ val: 500 });
      }
      return Promise.resolve({ val: null });
    });

    await setInputLimit(mockAdapter, "productKey8", "deviceKey8", -10);

    expect(mockPublish.calledOnceWith(
      "iot/productKey8/deviceKey8/properties/write",
      JSON.stringify({ properties: { inputLimit: 0 } })
    )).to.be.true;
  });

  // Test case 9: limit is 20
  it("should set limit to 30 when input limit is 20", async () => {
    mockGetStateAsync.callsFake((stateId) => {
      if (stateId.endsWith(".productName")) {
        return Promise.resolve({ val: "any device" });
      }
      if (stateId.endsWith(".inputLimit")) {
        return Promise.resolve({ val: 500 });
      }
      return Promise.resolve({ val: null });
    });

    await setInputLimit(mockAdapter, "productKey9", "deviceKey9", 20);

    expect(mockPublish.calledOnceWith(
      "iot/productKey9/deviceKey9/properties/write",
      JSON.stringify({ properties: { inputLimit: 30 } })
    )).to.be.true;
  });

  // Test case 10: productName is "ace", limit is 120
  it("should set limit to 200 for 'ace' when input limit is 120 (rounds up to nearest 100)", async () => {
    mockGetStateAsync.callsFake((stateId) => {
      if (stateId.endsWith(".productName")) {
        return Promise.resolve({ val: "ace device" }); // "ace" should be included
      }
      if (stateId.endsWith(".inputLimit")) {
        return Promise.resolve({ val: 50 });
      }
      return Promise.resolve({ val: null });
    });

    await setInputLimit(mockAdapter, "productKey10", "deviceKey10", 120);

    expect(mockPublish.calledOnceWith(
      "iot/productKey10/deviceKey10/properties/write",
      JSON.stringify({ properties: { inputLimit: 200 } })
    )).to.be.true;
  });

  // Test case: currentLimit is same as new limit, should not publish
  it("should not publish if currentLimit is the same as the new calculated limit", async () => {
    mockGetStateAsync.callsFake((stateId) => {
      if (stateId.endsWith(".productName")) {
        return Promise.resolve({ val: "solarflow 800 pro" });
      }
      if (stateId.endsWith(".inputLimit")) {
        return Promise.resolve({ val: 700 }); // Current limit is already 700
      }
      return Promise.resolve({ val: null });
    });

    await setInputLimit(mockAdapter, "productKey11", "deviceKey11", 700);

    expect(mockPublish.notCalled).to.be.true;
  });

  // Test case: productName is "solarflow 800", limit is 0
  it("should set limit to 0 for 'solarflow 800' when input limit is 0", async () => {
    mockGetStateAsync.callsFake((stateId) => {
      if (stateId.endsWith(".productName")) {
        return Promise.resolve({ val: "solarflow 800" });
      }
      if (stateId.endsWith(".inputLimit")) {
        return Promise.resolve({ val: 500 });
      }
      return Promise.resolve({ val: null });
    });

    await setInputLimit(mockAdapter, "productKey12", "deviceKey12", 0);

    expect(mockPublish.calledOnceWith(
      "iot/productKey12/deviceKey12/properties/write",
      JSON.stringify({ properties: { inputLimit: 0 } })
    )).to.be.true;
  });

  // Test case: productName is "solarflow 800 pro", limit is 30
  it("should set limit to 30 for 'solarflow 800 pro' when input limit is 30", async () => {
    mockGetStateAsync.callsFake((stateId) => {
      if (stateId.endsWith(".productName")) {
        return Promise.resolve({ val: "solarflow 800 pro" });
      }
      if (stateId.endsWith(".inputLimit")) {
        return Promise.resolve({ val: 500 });
      }
      return Promise.resolve({ val: null });
    });

    await setInputLimit(mockAdapter, "productKey13", "deviceKey13", 30);

    expect(mockPublish.calledOnceWith(
      "iot/productKey13/deviceKey13/properties/write",
      JSON.stringify({ properties: { inputLimit: 30 } })
    )).to.be.true;
  });
});
