const { execSync } = require('child_process');

function searchProduct(query) {
  // Call the Python search script
  const result = execSync(
    `python3 scripts/search.py "${query.replace(/"/g, '')}"`
  ).toString();

  return JSON.parse(result); // { article_number, item_title, score }
}

module.exports = { searchProduct };