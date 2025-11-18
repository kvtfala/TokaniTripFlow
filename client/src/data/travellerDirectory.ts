import type { Traveller } from "@shared/types";

// Mock traveller directory - in production this would come from an API/LDAP
export const TRAVELLER_DIRECTORY: Traveller[] = [
  {
    id: "emp_001",
    name: "Ratu Epeli Cakobau",
    employeeNumber: "EMP001",
    position: "CEO",
    department: "Executive",
    manager: "Board of Directors",
    managerId: "board_001",
  },
  {
    id: "emp_002",
    name: "Mere Delana",
    employeeNumber: "EMP002",
    position: "CFO",
    department: "Finance",
    manager: "Ratu Epeli Cakobau",
    managerId: "emp_001",
  },
  {
    id: "emp_003",
    name: "Jone Ratudina",
    employeeNumber: "EMP003",
    position: "Finance Manager",
    department: "Finance",
    manager: "Mere Delana",
    managerId: "emp_002",
  },
  {
    id: "emp_004",
    name: "Salote Ratuvuki",
    employeeNumber: "EMP004",
    position: "HR Manager",
    department: "HR",
    manager: "Ratu Epeli Cakobau",
    managerId: "emp_001",
  },
  {
    id: "emp_005",
    name: "Tomasi Ravouvou",
    employeeNumber: "EMP005",
    position: "Production Manager",
    department: "Production",
    manager: "Ratu Epeli Cakobau",
    managerId: "emp_001",
  },
  {
    id: "emp_006",
    name: "Ana Korovulavula",
    employeeNumber: "EMP006",
    position: "Sales Manager",
    department: "Sales",
    manager: "Ratu Epeli Cakobau",
    managerId: "emp_001",
  },
  {
    id: "emp_007",
    name: "Setareki Nakau",
    employeeNumber: "EMP007",
    position: "Quality Assurance Lead",
    department: "Quality",
    manager: "Tomasi Ravouvou",
    managerId: "emp_005",
  },
  {
    id: "emp_008",
    name: "Litia Vuniyayawa",
    employeeNumber: "EMP008",
    position: "Purchasing Officer",
    department: "Procurement",
    manager: "Mere Delana",
    managerId: "emp_002",
  },
  {
    id: "emp_009",
    name: "Nemani Tui",
    employeeNumber: "EMP009",
    position: "Export Coordinator",
    department: "Exports",
    manager: "Ana Korovulavula",
    managerId: "emp_006",
  },
  {
    id: "emp_010",
    name: "Losana Qere",
    employeeNumber: "EMP010",
    position: "Logistics Supervisor",
    department: "Logistics",
    manager: "Tomasi Ravouvou",
    managerId: "emp_005",
  },
];

// Recently used travellers (for quick access)
export const RECENT_TRAVELLERS = [
  TRAVELLER_DIRECTORY[2], // Jone Ratudina
  TRAVELLER_DIRECTORY[7], // Litia Vuniyayawa
  TRAVELLER_DIRECTORY[8], // Nemani Tui
];

// Search travellers by name or employee number
export function searchTravellers(query: string): Traveller[] {
  if (!query.trim()) return [];
  
  const lowerQuery = query.toLowerCase();
  return TRAVELLER_DIRECTORY.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.employeeNumber.toLowerCase().includes(lowerQuery) ||
      t.department.toLowerCase().includes(lowerQuery)
  );
}

// Get traveller by ID
export function getTravellerById(id: string): Traveller | undefined {
  return TRAVELLER_DIRECTORY.find((t) => t.id === id);
}
