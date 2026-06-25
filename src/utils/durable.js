/**
 * 物品价格与性价比计算
 */

export function calcTotalPrice(purchasePrice, otherExpenses = [], otherIncomes = []) {
  const totalOtherExpense = otherExpenses.reduce((sum, e) => sum + (e.cost || 0), 0);
  const totalOtherIncome = otherIncomes.reduce((sum, i) => sum + (i.cost || 0), 0);
  return (purchasePrice || 0) + totalOtherExpense - totalOtherIncome;
}

export function calcDailyAverage(totalPrice, usageDuration) {
  if (!usageDuration || usageDuration <= 0) return 0;
  return totalPrice / usageDuration;
}

export function calcExpectedDailyAverage(totalPrice, purchaseDate, expectedEndDate) {
  const purchase = new Date(purchaseDate);
  const expected = new Date(expectedEndDate);
  const diffDays = (expected.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 0) return 0;
  return totalPrice / diffDays;
}
