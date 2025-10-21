import type { CostCentre } from "@shared/types";

export interface ICostCentreAdapter {
  list(): Promise<CostCentre[]>;
  getByCode(code: string): Promise<CostCentre | null>;
}

// Mock implementation - replace with actual API calls
export const CostCentreAdapter: ICostCentreAdapter = {
  list: async () => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return [
      { code: "300-CORP", name: "Corporate Sales" },
      { code: "400-OPS", name: "Operations" },
      { code: "500-TRN", name: "Training & Development" },
      { code: "600-HR", name: "Human Resources" },
      { code: "700-IT", name: "Information Technology" },
      { code: "800-FIN", name: "Finance" },
    ];
  },
  
  getByCode: async (code: string) => {
    const centres = await CostCentreAdapter.list();
    return centres.find(c => c.code === code) || null;
  },
};
