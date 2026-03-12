import { expect, test, describe } from "bun:test";
import { determineEmployeeRole, calculateEmployeeShare, type MinimumPaymentSettings } from "./employee-utils";

describe("employee-utils", () => {
  describe("determineEmployeeRole", () => {
    test("should use dayRoles if available", () => {
      const role = determineEmployeeRole("1", "2024-01-01", { "1": "admin" }, []);
      expect(role).toBe("admin");
    });
    test("should return washer by default", () => {
      const role = determineEmployeeRole("1", "2024-01-01", {}, []);
      expect(role).toBe("washer");
    });
  });

  describe("calculateEmployeeShare", () => {
    const settings: MinimumPaymentSettings = {
      minimumPaymentAdmin: 0,
      minimumPaymentWasher: 0,
      percentageWasher: 30,
      percentageWasherDryclean: 40,
      adminCashPercentage: 10,
      adminCarWashPercentage: 15,
      adminDrycleanPercentage: 20,
      showAdminBonusDetail: false
    };

    test("should calculate share for washer (wash)", () => {
      const record = { price: 100, employeeIds: ["1"], serviceType: "wash" } as any;
      const share = calculateEmployeeShare(record, "1", "washer", settings);
      expect(share).toBe(30); // 100 * 30%
    });

    test("should split share between multiple workers", () => {
      const record = { price: 100, employeeIds: ["1", "2"], serviceType: "wash" } as any;
      const share = calculateEmployeeShare(record, "1", "washer", settings);
      expect(share).toBe(15); // (100 / 2) * 30%
    });

    test("should calculate share for admin (dryclean)", () => {
      const record = { price: 200, employeeIds: ["1", "2"], serviceType: "dryclean" } as any;
      const share = calculateEmployeeShare(record, "1", "admin", settings);
      expect(share).toBe(20); // (200 / 2) * 20%
    });
  });
});
