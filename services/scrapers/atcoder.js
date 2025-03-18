const axios = require('../utils/axios-config');
const cheerio = require('cheerio');

async function scrapeAtcoder() {
  try {
    console.log('Scraping AtCoder contests...');
    
    const response = await axios.get('https://atcoder.jp/contests/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    const $ = cheerio.load(response.data);
    const contests = [];
    
    // Process upcoming contests
    $('#contest-table-upcoming table tbody tr').each((i, element) => {
      try {
        const startTimeStr = $(element).find('td:nth-child(1)').text().trim();
        const durationStr = $(element).find('td:nth-child(2)').text().trim();
        
        const linkElement = $(element).find('td:nth-child(3) a');
        const name = linkElement.text().trim();
        const url = 'https://atcoder.jp' + linkElement.attr('href');
        
        // Parse start time
        const startTime = new Date(startTimeStr);
        
        // Parse duration (format: "01:30")
        let durationMinutes = 90; // Default
        const durationMatch = durationStr.match(/(\d+):(\d+)/);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          durationMinutes = hours * 60 + minutes;
        }
        
        const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
        
        if (name && url && !isNaN(startTime.getTime())) {
          contests.push({
            name,
            platform: 'AtCoder',
            url,
            startTime,
            endTime,
            duration: durationMinutes,
            status: 'upcoming'
          });
        }
      } catch (err) {
        console.error('Error processing an AtCoder contest:', err.message);
      }
    });
    
    // Process ongoing contests
    $('#contest-table-action table tbody tr').each((i, element) => {
      try {
        const startTimeStr = $(element).find('td:nth-child(1)').text().trim();
        const durationStr = $(element).find('td:nth-child(2)').text().trim();
        
        const linkElement = $(element).find('td:nth-child(3) a');
        const name = linkElement.text().trim();
        const url = 'https://atcoder.jp' + linkElement.attr('href');
        
        // Parse start time
        const startTime = new Date(startTimeStr);
        
        // Parse duration (format: "01:30")
        let durationMinutes = 90; // Default
        const durationMatch = durationStr.match(/(\d+):(\d+)/);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          durationMinutes = hours * 60 + minutes;
        }
        
        const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
        
        if (name && url && !isNaN(startTime.getTime())) {
          contests.push({
            name,
            platform: 'AtCoder',
            url,
            startTime,
            endTime,
            duration: durationMinutes,
            status: 'ongoing'
          });
        }
      } catch (err) {
        console.error('Error processing an AtCoder contest:', err.message);
      }
    });
    
    console.log(`Scraped ${contests.length} AtCoder contests successfully`);
    return contests;
  } catch (error) {
    console.error('Error scraping AtCoder contests:', error.message);
    return [];
  }
}

module.exports = scrapeAtcoder;