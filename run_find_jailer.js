const fs = require('fs');

(async () => {
    try {
        console.log("Fetching local home API...");
        const res = await fetch(`http://localhost:9093/api/netmirror`);
        const json = await res.json();
        const itemsStr = JSON.stringify(json.data.items);
        if (itemsStr.toLowerCase().includes("jailer")) {
             console.log("Found Jailer in home page!");
             const items = json.data.items;
             const jailer = items.find(i => i.title.toLowerCase().includes("jailer"));
             console.log(jailer);
        } else {
             console.log("Jailer not in home page.");
        }
    } catch(err) {
        console.error("Error:", err);
    }
})();
