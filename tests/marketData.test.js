const { getLivePrice } = require('../src/services/marketData');

jest.mock('yahoo-finance2', () => ({
  default: {
    quote: jest.fn().mockResolvedValue({ regularMarketPrice: 150.50 })
  }
}));

describe('Market Data Service', () => {
  it('should return the regular market price for a given ticker', async () => {
    const price = await getLivePrice('AAPL');
    expect(price).toBe(150.50);
  });
});
