const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('requestfailed', request => {
      console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
    });
    page.on('response', resp => {
      if(resp.url().includes('8000')) console.log('API RESPONSE STATUS:', resp.status());
    });
    
    await page.goto('http://localhost:3000');
    console.log('Clicking the topic chip...');
    await page.evaluate(() => {
        runSearch('Jeffrey Epstein');
    });
    console.log('Evaluated runSearch, waiting 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));
    const isLoaderOn = await page.evaluate(() => document.getElementById('loader').classList.contains('on'));
    const isResultsOn = await page.evaluate(() => document.getElementById('results').classList.contains('on'));
    const isLandingOn = await page.evaluate(() => document.getElementById('landing-page').style.display !== 'none');
    console.log('Loader on?', isLoaderOn);
    console.log('Results on?', isResultsOn);
    console.log('Landing page on?', isLandingOn);
    
    await browser.close();
})();
