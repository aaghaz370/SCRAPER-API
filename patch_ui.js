const fs = require('fs');
const path = 'app/api/movies/ui.ts';
let content = fs.readFileSync(path, 'utf8');

let fixed = content
  .replace(
    'await extractAndDownloadHub(data.episodes[0].hubCloudUrl, btnElement, intermediateUrl);',
    'return processDownload(data.episodes[0].hubCloudUrl, btnElement, intermediateUrl);'
  )
  .replace(
    'epBtn.onclick = () => extractAndDownloadHub(ep.hubCloudUrl, epBtn, intermediateUrl);',
    'epBtn.onclick = () => processDownload(ep.hubCloudUrl, epBtn, intermediateUrl);'
  )
  .replace(
    "throw new Error('No hub URL found in mdrive response');",
    "throw new Error('No episodes found in directory response');"
  );

if (fixed === content) {
  console.log('ERROR: No replacements made!');
  process.exit(1);
} else {
  fs.writeFileSync(path, fixed);
  console.log('Done! Applied patches.');
}
