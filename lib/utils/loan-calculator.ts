// Loan Calculator - FLAT Rate Method

export interface LoanCalculationParams {
  principalAmount: number;
  interestRate: number; // Annual percentage
  termMonths: number;
}

export interface InstallmentSchedule {
  installmentNumber: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  installmentAmount: number;
  remainingPrincipal: number;
}

export class LoanCalculator {
  /**
   * Calculate FLAT rate loan installments
   * Flat rate: Interest is calculated on the original principal amount
   */
  static calculateFlatRate(params: LoanCalculationParams): {
    totalInterest: number;
    totalAmount: number;
    monthlyInstallment: number;
    schedules: InstallmentSchedule[];
  } {
    const { principalAmount, interestRate, termMonths } = params;
    
    // Monthly interest rate
    const monthlyInterestRate = interestRate / 100 / 12;
    
    // Total interest (flat rate: calculated on original principal)
    const totalInterest = principalAmount * monthlyInterestRate * termMonths;
    
    // Total amount to be paid
    const totalAmount = principalAmount + totalInterest;
    
    // Monthly installment (equal for all months in flat rate)
    const monthlyInstallment = totalAmount / termMonths;
    
    // Monthly principal payment
    const monthlyPrincipal = principalAmount / termMonths;
    
    // Monthly interest payment
    const monthlyInterest = totalInterest / termMonths;
    
    // Generate schedule
    const schedules: InstallmentSchedule[] = [];
    let remainingPrincipal = principalAmount;
    const startDate = new Date();
    startDate.setDate(1); // Start from first day of month
    
    for (let i = 1; i <= termMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + i);
      
      remainingPrincipal -= monthlyPrincipal;
      
      schedules.push({
        installmentNumber: i,
        dueDate,
        principalAmount: monthlyPrincipal,
        interestAmount: monthlyInterest,
        installmentAmount: monthlyInstallment,
        remainingPrincipal: Math.max(0, remainingPrincipal),
      });
    }
    
    return {
      totalInterest,
      totalAmount,
      monthlyInstallment,
      schedules,
    };
  }
  
  /**
   * Recalculate schedules with manual installment amounts
   */
  static recalculateWithManualAmounts(
    params: LoanCalculationParams,
    manualAmounts: Map<number, number> // installmentNumber -> amount
  ): InstallmentSchedule[] {
    const { principalAmount, interestRate, termMonths } = params;
    const monthlyInterestRate = interestRate / 100 / 12;
    const monthlyInterest = principalAmount * monthlyInterestRate;
    
    const schedules: InstallmentSchedule[] = [];
    let remainingPrincipal = principalAmount;
    const startDate = new Date();
    startDate.setDate(1);
    
    for (let i = 1; i <= termMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + i);
      
      const manualAmount = manualAmounts.get(i);
      let installmentAmount: number;
      let principalAmount: number;
      
      if (manualAmount !== undefined) {
        // Manual amount specified
        installmentAmount = manualAmount;
        principalAmount = Math.max(0, installmentAmount - monthlyInterest);
      } else {
        // Auto-calculate
        const remainingInstallments = termMonths - i + 1;
        principalAmount = remainingPrincipal / remainingInstallments;
        installmentAmount = principalAmount + monthlyInterest;
      }
      
      remainingPrincipal -= principalAmount;
      
      schedules.push({
        installmentNumber: i,
        dueDate,
        principalAmount,
        interestAmount: monthlyInterest,
        installmentAmount,
        remainingPrincipal: Math.max(0, remainingPrincipal),
      });
    }
    
    return schedules;
  }
}
