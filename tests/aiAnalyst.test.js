// tests/aiAnalyst.test.js
const { analyzeTicker } = require('../src/services/aiAnalyst');

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: jest.fn().mockResolvedValue({ text: "Buy based on strong support." })
      }
    }))
  };
});

describe('AI Analyst Service', () => {
  it('should return analysis text for a specific ticker', async () => {
    const analysis = await analyzeTicker('AAPL', { shares: 100 }, 150.50);
    expect(analysis).toBe("Buy based on strong support.");
  });
});
