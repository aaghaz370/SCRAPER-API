async function run() {
  const r = await fetch('https://modlist.in/?type=hollywood');
  const text = await r.text();
  console.log('--- Redirect Page Content ---');
  console.log(text.substring(0, 1000));
}
run();
