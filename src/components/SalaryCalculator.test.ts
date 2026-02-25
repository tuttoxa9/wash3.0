import { expect, describe, it } from "bun:test";
import { SalaryCalculator } from "./SalaryCalculator";
import type { CarWashRecord, MinimumPaymentSettings, EmployeeRole } from "@/lib/types";

describe("SalaryCalculator", () => {
  const mockSettings: MinimumPaymentSettings = {
    minimumPaymentWasher: 1000,
    percentageWasher: 40,
    percentageWasherDryclean: 50,
    minimumPaymentAdmin: 1500,
    adminCashPercentage: 5,
    adminCarWashPercentage: 10,
    adminDrycleanPercentage: 15,
  };

  const mockEmployees = [
    { id: "w1", name: "Washer 1" },
    { id: "w2", name: "Washer 2" },
    { id: "a1", name: "Admin 1" },
  ];

  const mockRoles: Record<string, EmployeeRole> = {
    w1: "washer",
    w2: "washer",
    a1: "admin",
  };

  it("should calculate washer salary correctly when percentage is above minimum", () => {
    const records: CarWashRecord[] = [
      {
        id: "1",
        date: "2023-10-01",
        time: "10:00",
        carInfo: "A123BC",
        service: "Wash",
        serviceType: "wash",
        price: 3000,
        paymentMethod: { type: "cash" },
        employeeIds: ["w1"],
      },
    ];

    const calculator = new SalaryCalculator(mockSettings, records, mockRoles, mockEmployees);
    const results = calculator.calculateSalaries();
    const w1Result = results.find((r) => r.employeeId === "w1");

    expect(w1Result).toBeDefined();
    // 3000 * 40% = 1200. 1200 > 1000, so salary should be 1200.
    expect(w1Result?.calculatedSalary).toBe(1200);
    expect(w1Result?.breakdown.washerPercentage).toBe(1200);
    expect(w1Result?.breakdown.minimumGuaranteed).toBe(1000);
  });

  it("should return minimum payment for washer when percentage is below minimum", () => {
    const records: CarWashRecord[] = [
      {
        id: "1",
        date: "2023-10-01",
        time: "10:00",
        carInfo: "A123BC",
        service: "Wash",
        serviceType: "wash",
        price: 1000,
        paymentMethod: { type: "cash" },
        employeeIds: ["w1"],
      },
    ];

    const calculator = new SalaryCalculator(mockSettings, records, mockRoles, mockEmployees);
    const results = calculator.calculateSalaries();
    const w1Result = results.find((r) => r.employeeId === "w1");

    // 1000 * 40% = 400. 400 < 1000, so salary should be 1000.
    expect(w1Result?.calculatedSalary).toBe(1000);
  });

  it("should split revenue correctly between multiple washers", () => {
    const records: CarWashRecord[] = [
      {
        id: "1",
        date: "2023-10-01",
        time: "10:00",
        carInfo: "A123BC",
        service: "Wash",
        serviceType: "wash",
        price: 4000,
        paymentMethod: { type: "cash" },
        employeeIds: ["w1", "w2"],
      },
    ];

    const calculator = new SalaryCalculator(mockSettings, records, mockRoles, mockEmployees);
    const results = calculator.calculateSalaries();
    const w1Result = results.find((r) => r.employeeId === "w1");
    const w2Result = results.find((r) => r.employeeId === "w2");

    // Price 4000, 2 washers. Personal revenue each = 2000.
    // 2000 * 40% = 800. 800 < 1000, so salary should be 1000 for each.
    expect(w1Result?.calculatedSalary).toBe(1000);
    expect(w2Result?.calculatedSalary).toBe(1000);
    expect(w1Result?.totalPersonalRevenue).toBe(2000);
  });

  it("should calculate admin salary correctly (percentage above minimum)", () => {
    const records: CarWashRecord[] = [
      {
        id: "1",
        date: "2023-10-01",
        time: "10:00",
        carInfo: "A123BC",
        service: "Wash",
        serviceType: "wash",
        price: 40000, // Total revenue 40000
        paymentMethod: { type: "cash" },
        employeeIds: ["w1"],
      },
    ];

    const calculator = new SalaryCalculator(mockSettings, records, mockRoles, mockEmployees);
    const results = calculator.calculateSalaries();
    const a1Result = results.find((r) => r.employeeId === "a1");

    // Admin 1 (a1) has no personal wash revenue.
    // Total revenue = 40000.
    // Base cash bonus = 40000 * 5% = 2000.
    // 2000 > 1500, so salary should be 2000.
    expect(a1Result?.calculatedSalary).toBe(2000);
    expect(a1Result?.breakdown.adminCashBonus).toBe(2000);
  });

  it("should split admin cash bonus between multiple admins", () => {
    const records: CarWashRecord[] = [
      {
        id: "1",
        date: "2023-10-01",
        time: "10:00",
        carInfo: "A123BC",
        service: "Wash",
        serviceType: "wash",
        price: 40000,
        paymentMethod: { type: "cash" },
        employeeIds: ["w1"],
      },
    ];

    const extraRoles = { ...mockRoles, a2: "admin" as EmployeeRole };
    const extraEmployees = [...mockEmployees, { id: "a2", name: "Admin 2" }];

    const calculator = new SalaryCalculator(mockSettings, records, extraRoles, extraEmployees);
    const results = calculator.calculateSalaries();
    const a1Result = results.find((r) => r.employeeId === "a1");
    const a2Result = results.find((r) => r.employeeId === "a2");

    // Total revenue = 40000.
    // Total cash bonus = 40000 * 5% = 2000.
    // Split between 2 admins = 1000 each.
    // 1000 < 1500 (minimum), so salary should be 1500 for each.
    expect(a1Result?.calculatedSalary).toBe(1500);
    expect(a2Result?.calculatedSalary).toBe(1500);
    expect(a1Result?.breakdown.adminCashBonus).toBe(1000);
  });

  it("should include personal wash bonus for admin", () => {
    const records: CarWashRecord[] = [
      {
        id: "1",
        date: "2023-10-01",
        time: "10:00",
        carInfo: "A123BC",
        service: "Wash",
        serviceType: "wash",
        price: 10000,
        paymentMethod: { type: "cash" },
        employeeIds: ["a1"], // Admin washes the car himself
      },
    ];

    const calculator = new SalaryCalculator(mockSettings, records, mockRoles, mockEmployees);
    const results = calculator.calculateSalaries();
    const a1Result = results.find((r) => r.employeeId === "a1");

    // Total revenue = 10000.
    // Cash bonus = 10000 * 5% = 500.
    // Personal wash bonus = 10000 * 10% = 1000.
    // Total percentage = 500 + 1000 = 1500.
    // 1500 matches minimum 1500.
    expect(a1Result?.calculatedSalary).toBe(1500);
    expect(a1Result?.breakdown.adminCarWashBonus).toBe(1000);
  });

  it("should handle dryclean percentage separately", () => {
     const records: CarWashRecord[] = [
      {
        id: "1",
        date: "2023-10-01",
        time: "10:00",
        carInfo: "A123BC",
        service: "Dryclean",
        serviceType: "dryclean",
        price: 10000,
        paymentMethod: { type: "cash" },
        employeeIds: ["w1"],
      },
    ];

    const calculator = new SalaryCalculator(mockSettings, records, mockRoles, mockEmployees);
    const results = calculator.calculateSalaries();
    const w1Result = results.find((r) => r.employeeId === "w1");

    // Washer dryclean percentage = 50%.
    // 10000 * 50% = 5000.
    expect(w1Result?.calculatedSalary).toBe(5000);
  });

  it("should respect minimum guarantee override", () => {
    const records: CarWashRecord[] = [
      {
        id: "1",
        date: "2023-10-01",
        time: "10:00",
        carInfo: "A123BC",
        service: "Wash",
        serviceType: "wash",
        price: 1000,
        paymentMethod: { type: "cash" },
        employeeIds: ["w1"],
      },
    ];

    // Override minimum for w1
    const override = { w1: false };

    const calculator = new SalaryCalculator(mockSettings, records, mockRoles, mockEmployees, override);
    const results = calculator.calculateSalaries();
    const w1Result = results.find((r) => r.employeeId === "w1");

    // 1000 * 40% = 400. Minimum is disabled, so should be 400.
    expect(w1Result?.calculatedSalary).toBe(400);
    expect(w1Result?.breakdown.minimumGuaranteed).toBe(0);
  });

  it("should handle empty records", () => {
    const calculator = new SalaryCalculator(mockSettings, [], mockRoles, mockEmployees);
    const results = calculator.calculateSalaries();

    const w1Result = results.find((r) => r.employeeId === "w1");
    const a1Result = results.find((r) => r.employeeId === "a1");

    expect(w1Result?.calculatedSalary).toBe(1000);
    expect(a1Result?.calculatedSalary).toBe(1500);
  });

  it("should default unknown employee role to washer", () => {
     const records: CarWashRecord[] = [
      {
        id: "1",
        date: "2023-10-01",
        time: "10:00",
        carInfo: "A123BC",
        service: "Wash",
        serviceType: "wash",
        price: 10000,
        paymentMethod: { type: "cash" },
        employeeIds: ["unknown"],
      },
    ];
    const employeesWithUnknown = [...mockEmployees, { id: "unknown", name: "Unknown" }];
    // unknown not in mockRoles

    const calculator = new SalaryCalculator(mockSettings, records, mockRoles, employeesWithUnknown);
    const results = calculator.calculateSalaries();
    const unknownResult = results.find((r) => r.employeeId === "unknown");

    expect(unknownResult?.role).toBe("washer");
    // 10000 * 40% = 4000.
    expect(unknownResult?.calculatedSalary).toBe(4000);
  });
});
