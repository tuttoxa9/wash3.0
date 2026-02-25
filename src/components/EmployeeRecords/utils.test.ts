import { expect, describe, it } from "bun:test";
import { getPaymentMethodLabel, getPaymentMethodColor } from "./utils";
import type { Organization } from "@/lib/types";

describe("EmployeeRecords utils", () => {
  const mockOrganizations: Organization[] = [
    { id: "org1", name: "Organization 1" },
    { id: "org2", name: "Organization 2" },
  ];

  describe("getPaymentMethodLabel", () => {
    it("should return 'Наличные' for 'cash'", () => {
      expect(getPaymentMethodLabel("cash", mockOrganizations)).toBe("Наличные");
    });

    it("should return 'Карта' for 'card'", () => {
      expect(getPaymentMethodLabel("card", mockOrganizations)).toBe("Карта");
    });

    it("should return 'Долг' for 'debt'", () => {
      expect(getPaymentMethodLabel("debt", mockOrganizations)).toBe("Долг");
    });

    it("should return organization name when method is 'organization' and id is found", () => {
      expect(getPaymentMethodLabel("organization", mockOrganizations, "org1")).toBe("Organization 1");
      expect(getPaymentMethodLabel("organization", mockOrganizations, "org2")).toBe("Organization 2");
    });

    it("should return 'Организация' when method is 'organization' but id is not found", () => {
      expect(getPaymentMethodLabel("organization", mockOrganizations, "unknown")).toBe("Организация");
    });

    it("should return 'Организация' when method is 'organization' and id is missing", () => {
      expect(getPaymentMethodLabel("organization", mockOrganizations)).toBe("Организация");
    });

    it("should return the method string itself for unknown methods", () => {
      expect(getPaymentMethodLabel("unknown_method", mockOrganizations)).toBe("unknown_method");
    });
  });

  describe("getPaymentMethodColor", () => {
    describe("dark theme", () => {
      it("should return correct colors for all methods in dark theme", () => {
        expect(getPaymentMethodColor("cash", "dark")).toBe("text-green-300 bg-green-500/10 border-green-500/20");
        expect(getPaymentMethodColor("card", "dark")).toBe("text-blue-300 bg-blue-500/10 border-blue-500/20");
        expect(getPaymentMethodColor("organization", "dark")).toBe("text-purple-300 bg-purple-500/10 border-purple-500/20");
        expect(getPaymentMethodColor("debt", "dark")).toBe("text-red-300 bg-red-500/10 border-red-500/20");
        expect(getPaymentMethodColor("unknown", "dark")).toBe("text-gray-300 bg-gray-500/10 border-gray-500/20");
      });
    });

    describe("black theme", () => {
      it("should return correct colors for all methods in black theme", () => {
        expect(getPaymentMethodColor("cash", "black")).toBe("text-green-400 bg-green-500/5 border-green-500/30");
        expect(getPaymentMethodColor("card", "black")).toBe("text-blue-400 bg-blue-500/5 border-blue-500/30");
        expect(getPaymentMethodColor("organization", "black")).toBe("text-purple-400 bg-purple-500/5 border-purple-400/30");
        expect(getPaymentMethodColor("debt", "black")).toBe("text-red-400 bg-red-500/5 border-red-500/30");
        expect(getPaymentMethodColor("unknown", "black")).toBe("text-gray-400 bg-gray-500/5 border-gray-500/30");
      });
    });

    describe("default/light theme", () => {
      it("should return correct colors for all methods in light theme", () => {
        expect(getPaymentMethodColor("cash", "light")).toBe("text-green-600 bg-green-50 border-green-200");
        expect(getPaymentMethodColor("card", "light")).toBe("text-blue-600 bg-blue-50 border-blue-200");
        expect(getPaymentMethodColor("organization", "light")).toBe("text-purple-600 bg-purple-50 border-purple-200");
        expect(getPaymentMethodColor("debt", "light")).toBe("text-red-600 bg-red-50 border-red-200");
        expect(getPaymentMethodColor("unknown", "light")).toBe("text-gray-600 bg-gray-50 border-gray-200");
      });
    });
  });
});
