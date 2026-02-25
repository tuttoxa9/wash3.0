import { describe, expect, test } from "bun:test";
import { determineEmployeeRole } from "./utils";
import { format, subDays } from "date-fns";
import type { Employee } from "./types";

describe("determineEmployeeRole", () => {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const mockEmployees: Employee[] = [
    { id: "emp1", name: "Employee 1", role: "admin" },
    { id: "emp2", name: "Employee 2", role: "washer" },
  ];

  test("should return explicit role for historical date if it exists", () => {
    const dayRoles = {
      emp1: "washer", // Explicitly recorded as washer yesterday
    };
    const role = determineEmployeeRole("emp1", yesterdayStr, dayRoles, mockEmployees);
    expect(role).toBe("washer");
  });

  test("should return 'washer' (default) for historical date if no explicit role exists", () => {
    const dayRoles = {};
    // emp1 is currently admin, but for yesterday without record it should default to washer
    const role = determineEmployeeRole("emp1", yesterdayStr, dayRoles, mockEmployees);
    expect(role).toBe("washer");
  });

  test("should return explicit role for today if it exists", () => {
    const dayRoles = {
      emp1: "washer", // Explicitly recorded as washer today
    };
    const role = determineEmployeeRole("emp1", todayStr, dayRoles, mockEmployees);
    expect(role).toBe("washer");
  });

  test("should return current employee role for today if no explicit role exists", () => {
    const dayRoles = {};
    // emp1 is currently admin, so for today without record it should use current role
    const role = determineEmployeeRole("emp1", todayStr, dayRoles, mockEmployees);
    expect(role).toBe("admin");
  });

  test("should return 'washer' for today if no explicit role exists and employee not found", () => {
    const dayRoles = {};
    const role = determineEmployeeRole("unknown", todayStr, dayRoles, mockEmployees);
    expect(role).toBe("washer");
  });
});
