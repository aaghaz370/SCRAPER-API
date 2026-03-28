const fs = require('fs');

async function findIds() {
  const j = await (await fetch('https://anshu78780.github.io/json/cookies.json')).json();
  const cookies = j.cookies;

  const queries = ['Loki', 'Star Wars', 'Marvel', 'Mandalorian', 'Ahsoka', 'Avengers'];
  const disneyIds = [];
  
  for (const q of queries) {
    const url = `https://net52.cc/search.php?s=${encodeURIComponent(q)}&t=${Date.now()}`;
    const r = await fetch(url, { headers: { 'Cookie': cookies, 'Referer': 'https://net52.cc/' }});
    const d = await r.json();
    const res = d.searchResult || d;
    if (Array.isArray(res)) {
      res.slice(0, 3).forEach(item => {
        disneyIds.push(`'${item.id}', // ${item.t}`);
      });
    }
  }

  const lQueries = ['John Wick', 'Saw', 'The Hunger Games', 'Twilight', 'Expendables', 'Hitman'];
  const lionsgateIds = [];
  for (const q of lQueries) {
    const url = `https://net52.cc/search.php?s=${encodeURIComponent(q)}&t=${Date.now()}`;
    const r = await fetch(url, { headers: { 'Cookie': cookies, 'Referer': 'https://net52.cc/' }});
    const d = await r.json();
    const res = d.searchResult || d;
    if (Array.isArray(res)) {
      res.slice(0, 3).forEach(item => {
        lionsgateIds.push(`'${item.id}', // ${item.t}`);
      });
    }
  }

  console.log('Disney IDs:\n' + disneyIds.join('\n'));
  console.log('\nLionsgate IDs:\n' + lionsgateIds.join('\n'));
}

findIds().catch(console.error);
