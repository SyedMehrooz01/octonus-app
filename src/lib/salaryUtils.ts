/**
 * Utility functions for Pakistani salary structure and tax calculations
 */

export const calculateTax = (annualSalary: number): number => {
  let tax = 0;
  if (annualSalary <= 600000) {
    tax = 0;
  } else if (annualSalary <= 1200000) {
    tax = (annualSalary - 600000) * 0.025;
  } else if (annualSalary <= 2400000) {
    tax = 15000 + (annualSalary - 1200000) * 0.125;
  } else if (annualSalary <= 3600000) {
    tax = 165000 + (annualSalary - 2400000) * 0.225;
  } else if (annualSalary <= 6000000) {
    tax = 435000 + (annualSalary - 3600000) * 0.275;
  } else {
    tax = 1095000 + (annualSalary - 6000000) * 0.35;
  }
  return tax / 12; // Monthly tax
};

export const calculateEOBI = (salary: number): number => {
  return salary * 0.01; // 1% of salary
};

export const calculatePESSI = (salary: number): number => {
  // PESSI/SESSI is typically a fixed amount per employee paid by employer, 
  // but sometimes deducted. User mentioned it as a deduction.
  return 600; // Fixed amount as per user requirement
};

export const calculateOvertime = (hourlyRate: number, hours: number): number => {
  return hourlyRate * 1.5 * hours;
};

export const getHourlyRate = (monthlySalary: number): number => {
  // Assuming standard 22 working days, 8 hours a day = 176 hours/month
  return monthlySalary / 176;
};

export const calculateNetSalary = (
  basic: number,
  allowances: { houseRent: number; medical: number; conveyance: number; special: number },
  overtimePay: number,
  deductions: { tax: number; eobi: number; pessi: number; loan: number; late: number; absence: number }
) => {
  const gross = basic + allowances.houseRent + allowances.medical + allowances.conveyance + allowances.special + overtimePay;
  const totalDeductions = deductions.tax + deductions.eobi + deductions.pessi + deductions.loan + deductions.late + deductions.absence;
  return {
    gross,
    totalDeductions,
    net: gross - totalDeductions
  };
};
