const request = require('supertest');
const express = require('express');
const apiRoutes = require('../src/routes/api');

// Mock dependencies
jest.mock('../src/services/marketData', () => ({ getLivePrice: jest.fn().mockResolvedValue(150.50) }));
jest.mock('../src/services/aiAnalyst', () => ({ analyzeTicker: jest.fn().mockResolvedValue("Hold") }));

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

describe('API Routes', () => {
  it('should return price and analysis on POST /api/analyze', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ ticker: 'AAPL', portfolioData: { shares: 10 } });
    
    expect(res.status).toBe(200);
    expect(res.body.price).toBe(150.50);
    expect(res.body.analysis).toBe("Hold");
  });
});
