async function test() {
  const r = await fetch('https://anshu78780.github.io/json/providers.json');
  const data = await r.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
