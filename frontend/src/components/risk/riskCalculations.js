export const DEFAULT_SECTOR_LIMIT = 35;
export const DEFAULT_RISK_BUDGET = 50000;

function numberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function optionalNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getStopLoss(holding) {
  return optionalNumber(holding.stop_loss ?? holding.stopLoss);
}

function buildPositionRows(holdings, totalValue) {
  return holdings.map((holding) => {
    const shares = numberValue(holding.shares);
    const price = numberValue(holding.price);
    const rate = numberValue(holding.fx_rate || 1.0);
    const value = numberValue(holding.value_thb || (shares * price * rate));
    const stopLoss = getStopLoss(holding);
    const hasValidStop = stopLoss !== null && price > 0 && shares > 0 && stopLoss < price;
    const stopDistancePct = hasValidStop ? ((price - stopLoss) / price) * 100 : null;
    const thbRisk = hasValidStop ? (price - stopLoss) * shares * rate : null;

    return {
      ...holding,
      ticker: holding.ticker || 'UNKNOWN',
      sector: holding.sector || 'Unknown',
      shares,
      price,
      value,
      weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
      stopLoss,
      stopDistancePct,
      thbRisk,
      status: hasValidStop ? 'Stop defined' : 'Missing stop-loss',
    };
  });
}

function buildSectors(positionRows, totalValue, sectorLimit) {
  const bySector = new Map();

  for (const row of positionRows) {
    const current = bySector.get(row.sector) || { sector: row.sector, value: 0, holdings: [] };
    current.value += row.value;
    current.holdings.push(row);
    bySector.set(row.sector, current);
  }

  return Array.from(bySector.values())
    .map((sector) => ({
      ...sector,
      weight: totalValue > 0 ? (sector.value / totalValue) * 100 : 0,
      limit: sectorLimit,
      statusLabel: sector.value > 0 && totalValue > 0 && (sector.value / totalValue) * 100 > sectorLimit ? 'Over limit' : 'Within limit',
    }))
    .sort((a, b) => b.weight - a.weight);
}

export function buildPortfolioRisk(holdings, options = {}) {
  const sectorLimit = options.sectorLimit ?? DEFAULT_SECTOR_LIMIT;
  const riskBudget = options.riskBudget ?? DEFAULT_RISK_BUDGET;
  const totalValue = holdings.reduce((sum, holding) => {
    const rate = numberValue(holding.fx_rate || 1.0);
    return sum + numberValue(holding.value_thb || (numberValue(holding.shares) * numberValue(holding.price) * rate));
  }, 0);
  const positions = buildPositionRows(holdings, totalValue);
  const sectors = buildSectors(positions, totalValue, sectorLimit);
  const knownRisk = positions.reduce((sum, position) => sum + numberValue(position.thbRisk), 0);
  const missingStopCount = positions.filter((position) => position.status === 'Missing stop-loss').length;

  return {
    totalValue,
    positions,
    sectors,
    overLimit: sectors.filter((sector) => sector.weight > sector.limit),
    knownRisk,
    missingStopCount,
    riskBudget,
    riskBudgetPct: riskBudget > 0 ? Math.min((knownRisk / riskBudget) * 100, 100) : 0,
  };
}
