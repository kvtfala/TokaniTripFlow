export interface IBudgetAdapter {
  getAvailableFor(costCentreCode: string): Promise<number>;
  getSpentFor(costCentreCode: string): Promise<number>;
  getAllocatedFor(costCentreCode: string): Promise<number>;
}

// Mock implementation - replace with actual API calls
export const BudgetAdapter: IBudgetAdapter = {
  getAvailableFor: async (costCentreCode: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock budget data (in FJD)
    const budgets: Record<string, number> = {
      "300-CORP": 10000,
      "400-OPS": 5000,
      "500-TRN": 2500,
      "600-HR": 3000,
      "700-IT": 4000,
      "800-FIN": 8000,
    };
    
    return budgets[costCentreCode] || 1000;
  },
  
  getSpentFor: async (costCentreCode: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock spent data (in FJD)
    const spent: Record<string, number> = {
      "300-CORP": 7500,
      "400-OPS": 3200,
      "500-TRN": 1800,
      "600-HR": 1500,
      "700-IT": 2000,
      "800-FIN": 5000,
    };
    
    return spent[costCentreCode] || 0;
  },
  
  getAllocatedFor: async (costCentreCode: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock allocated data (in FJD)
    const allocated: Record<string, number> = {
      "300-CORP": 15000,
      "400-OPS": 8000,
      "500-TRN": 4000,
      "600-HR": 5000,
      "700-IT": 6000,
      "800-FIN": 12000,
    };
    
    return allocated[costCentreCode] || 2000;
  },
};
