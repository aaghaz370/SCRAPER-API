const fs = require('fs');

(async () => {
    try {
        const fetchUrl = async (url) => {
            const res = await fetch(url);
            return await res.json();
        };

        const executeScenario = async (query) => {
             console.log(`\n\n--- Testing Scenario: ${query} ---`);
             // 1. Search
             console.log(`Searching for "${query}"...`);
             const searchRes = await fetchUrl(`http://localhost:9093/api/netmirror?action=search&q=${encodeURIComponent(query)}`);
             
             let id = null;
             if (searchRes && searchRes.data && searchRes.data.searchResults) {
                  const results = searchRes.data.searchResults;
                  if (results.rawResponse) {
                       const raw = results.rawResponse;
                       // Find first data-post="xxxx"
                       const match = raw.match(/data-post=["'](\d+)["']/);
                       if (match) {
                           id = match[1];
                       } else {
                           console.log("Regex didn't match. rawResponse snippet:", raw.substring(0, 500));
                       }
                  } else {
                       // it's an object/array already parsed.
                       if (results.searchResult && Array.isArray(results.searchResult) && results.searchResult.length > 0) {
                           id = results.searchResult[0].id;
                       }
                       else if (Array.isArray(results) && results.length > 0) id = results[0].id || results[0].v_id;
                       else if (results.id) id = results.id;
                  }
             }
             
             if (!id) {
                 console.log(`Could not extract ID for ${query}. Search Result was:`, JSON.stringify(searchRes).substring(0, 200));
                 return null;
             }

             console.log(`Found ID for "${query}": ${id}`);

             // 2. Get Post Details (Seasons, Ep, language, qual, etc.)
             console.log(`Fetching Post Details for ID: ${id}...`);
             const postRes = await fetchUrl(`http://localhost:9093/api/netmirror?action=getpost&id=${id}`);
             
             // 3. Get Stream
             let streamId = id;
             // If series, grab first episode's ID to stream.
             if (postRes && postRes.data && postRes.data.episodes && postRes.data.episodes.length > 0 && postRes.data.episodes[0]) {
                  streamId = postRes.data.episodes[0].id; // play 1st ep
                  console.log(`Looks like a series! Grabbing Stream for Episode 1 (ID: ${streamId})`);
             }

             console.log(`Fetching Stream Data for ID: ${streamId}...`);
             const streamRes = await fetchUrl(`http://localhost:9093/api/netmirror?action=stream&id=${streamId}`);

             return {
                 query,
                 extracted_id: id,
                 stream_id_tested: streamId,
                 details: postRes,
                 stream: streamRes
             };
        };

        const saiyaaraData = await executeScenario('saiyaara');

        fs.writeFileSync('test_saiyaara.json', JSON.stringify({ saiyaara: saiyaaraData }, null, 2));
        console.log('\n✅ Scrape complete! Output saved to test_saiyaara.json');

    } catch(err) {
        console.error("Test Error:", err);
    }
})();
