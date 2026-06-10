const express = require('express');
const { getLivePrice } = require('../services/marketData');
const { analyzeTicker } = require('../services/aiAnalyst');

const router = express.Router();

router.post('/analyze', async (req, res) => {
  const { ticker, portfolioData } = req.body;
  try {
    const price = await getLivePrice(ticker);
    const analysis = await analyzeTicker(ticker, portfolioData, price);
    res.json({ ticker, price, analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
