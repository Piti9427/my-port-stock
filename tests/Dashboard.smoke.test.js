const fs = require('fs');
const path = require('path');

describe('Dashboard Component Check', () => {
  it('should exist and export default', () => {
    const filePath = path.join(__dirname, '../frontend/src/Dashboard.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('export default');
  });
});
