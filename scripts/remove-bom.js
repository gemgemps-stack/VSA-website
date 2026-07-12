const fs = require('fs');
const path = 'c:/Users/Rosa/Desktop/Projects/Verida Sports Apparel/frontend/src/features/source-income/SourceIncomeView.js';
const data = fs.readFileSync(path);
if (data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF) {
  fs.writeFileSync(path, data.slice(3));
  console.log('Removed BOM from SourceIncomeView.js');
} else {
  console.log('No BOM found in SourceIncomeView.js');
}
