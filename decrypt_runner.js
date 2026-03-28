const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url.split('?')[0];
    if (filePath == './') filePath = './decrypt.html';
    const extname = path.extname(filePath);
    const contentType = extname === '.js' ? 'text/javascript' : 'text/html';
    fs.readFile(filePath, (err, content) => {
        if (err) { 
             console.log("NOT FOUND: ", filePath);
             res.writeHead(404); res.end('Error'); 
        }
        else { res.writeHead(200, { 'Content-Type': contentType }); res.end(content, 'utf-8'); }
    });
});

server.listen(8080, async () => {
    try {
        const browser = await puppeteer.launch({headless: true});
        const page = await browser.newPage();
        page.on('console', msg => console.log('PAGE:', msg.text()));
        await page.goto('http://localhost:8080/decrypt.html?v=K8R6OOjS7');
        await page.waitForSelector('#output', {timeout: 5000});
        const out = await page.$eval('#output', el => el.innerText);
        console.log('FINAL DECRYPTED: ', out);
        await browser.close();
    } catch(e) {
        console.error(e);
    }
    server.close();
});
