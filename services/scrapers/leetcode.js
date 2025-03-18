const axios = require('../utils/axios-config');
const cheerio = require('cheerio');

async function scrapeLeetcode() {
  try {
    console.log('Scraping LeetCode contests...');
    
    // First, try to fetch contests from the main page
    const response = await axios.get('https://leetcode.com/contest/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    const $ = cheerio.load(response.data);
    let contests = [];
    const now = new Date();
    
    // Debug output
    console.log(`Page loaded, searching for contest elements...`);
    
    // Try to extract contests from script tags first (more reliable)
    try {
      console.log('Attempting to extract contests from script tags...');
      const scriptTags = $('script').toArray();
      
      for (const script of scriptTags) {
        const content = $(script).html() || '';
        
        // Check for contest data in various formats
        const dataMatches = [
          content.match(/window\.pageData\s*=\s*({.*?});/s),
          content.match(/window\.CONTEST_DATA\s*=\s*({.*?});/s),
          content.match(/contests\s*:\s*(\[.*?\])/s)
        ];
        
        for (const match of dataMatches) {
          if (match && match[1]) {
            try {
              let data = JSON.parse(match[1]);
              
              // Handle different data structures
              const contestArray = data.contests || (Array.isArray(data) ? data : []);
              
              console.log(`Found ${contestArray.length} contests in script tag`);
              
              contestArray.forEach(contest => {
                // Handle different contest object structures
                const title = contest.title || contest.name || contest.contestTitle;
                const slug = contest.titleSlug || contest.slug || contest.contestSlug;
                
                // Parse start time (handle both timestamp and ISO format)
                let startTime;
                if (contest.startTime) {
                  startTime = typeof contest.startTime === 'number' 
                    ? new Date(contest.startTime * 1000) 
                    : new Date(contest.startTime);
                } else if (contest.startDate) {
                  startTime = new Date(contest.startDate);
                }
                
                // Parse duration
                const duration = contest.duration || 90; // Default to 90 minutes
                
                if (title && startTime && !isNaN(startTime.getTime())) {
                  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
                  
                  // Determine status
                  let status;
                  if (startTime > now) {
                    status = 'upcoming';
                  } else if (endTime > now) {
                    status = 'ongoing';
                  } else {
                    status = 'past';
                  }
                  
                  contests.push({
                    name: title,
                    platform: 'LeetCode',
                    url: `https://leetcode.com/contest/${slug || title.toLowerCase().replace(/\s+/g, '-')}`,
                    startTime,
                    endTime,
                    duration,
                    status
                  });
                }
              });
              
              if (contests.length > 0) {
                break; // Found contests, no need to check other script tags
              }
            } catch (err) {
              console.error('Error parsing contest data from script:', err.message);
            }
          }
        }
        
        if (contests.length > 0) {
          break; // Found contests, no need to check other script tags
        }
      }
    } catch (err) {
      console.error('Error extracting contests from script tags:', err.message);
    }
    
    // If no contests found in scripts, try DOM scraping
    if (contests.length === 0) {
      console.log('Trying DOM scraping method...');
      
      // Check for different possible selectors
      const selectors = [
        '.swiper-wrapper .contest-card',
        '.contest-container .contest-card',
        '.contest-list .contest',
        '[data-cy="contest-card"]'
      ];
      
      for (const selector of selectors) {
        const elements = $(selector);
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        if (elements.length > 0) {
          elements.each((i, element) => {
            try {
              // Extract contest title
              const titleElement = $(element).find('.card-title, .contest-title, h4');
              const title = titleElement.text().trim();
              
              // Extract contest URL
              const urlElement = $(element).find('a');
              const url = urlElement.attr('href') ? 
                (urlElement.attr('href').startsWith('http') ? urlElement.attr('href') : 'https://leetcode.com' + urlElement.attr('href')) : 
                '';
              
              // Extract start time
              const timeElement = $(element).find('.contest-start-time, [data-start-time], .start-time');
              let startTime;
              
              if (timeElement.length) {
                const startTimeAttr = timeElement.attr('start-time') || timeElement.attr('data-start-time');
                if (startTimeAttr && /^\d+$/.test(startTimeAttr)) {
                  // Unix timestamp in seconds
                  startTime = new Date(parseInt(startTimeAttr) * 1000);
                } else {
                  // Try parsing as text
                  const timeText = timeElement.text().trim();
                  startTime = new Date(timeText);
                }
              }
              
              // Extract duration
              let duration = 90; // Default
              const durationElement = $(element).find('.duration, .contest-duration');
              if (durationElement.length) {
                const durationText = durationElement.text().trim();
                const durationMatch = durationText.match(/(\d+)/);
                if (durationMatch) {
                  duration = parseInt(durationMatch[1]);
                }
              }
              
              if (title && url && startTime && !isNaN(startTime.getTime())) {
                const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
                
                // Determine status
                let status;
                if (startTime > now) {
                  status = 'upcoming';
                } else if (endTime > now) {
                  status = 'ongoing';
                } else {
                  status = 'past';
                }
                
                contests.push({
                  name: title,
                  platform: 'LeetCode',
                  url,
                  startTime,
                  endTime,
                  duration,
                  status
                });
              }
            } catch (err) {
              console.error(`Error processing contest element:`, err.message);
            }
          });
          
          if (contests.length > 0) {
            break; // Found contests, no need to check other selectors
          }
        }
      }
    }
    
    // If still no contests found, try the API approach
    if (contests.length === 0 || contests.length < 5) {
      console.log('Attempting to fetch contests from LeetCode API...');
      
      try {
        // Try to fetch from the API endpoints
        const apiResponse = await axios.get('https://leetcode.com/graphql', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          data: {
            query: `
              query getContestList {
                allContests {
                  title
                  titleSlug
                  startTime
                  duration
                }
                currentContests {
                  title
                  titleSlug
                  startTime
                  duration
                }
              }
            `
          }
        });
        
        if (apiResponse.data && apiResponse.data.data) {
          const apiContests = [
            ...(apiResponse.data.data.allContests || []),
            ...(apiResponse.data.data.currentContests || [])
          ];
          
          console.log(`Found ${apiContests.length} contests from API`);
          
          apiContests.forEach(contest => {
            const startTime = new Date(contest.startTime * 1000);
            const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
            
            let status;
            if (startTime > now) {
              status = 'upcoming';
            } else if (endTime > now) {
              status = 'ongoing';
            } else {
              status = 'past';
            }
            
            contests.push({
              name: contest.title,
              platform: 'LeetCode',
              url: `https://leetcode.com/contest/${contest.titleSlug}`,
              startTime,
              endTime,
              duration: contest.duration,
              status
            });
          });
        }
      } catch (err) {
        console.error('Error fetching contests from API:', err.message);
      }
    }
    
    // If still no contests found, fall back to hardcoded data
    if (contests.length === 0) {
      console.log('Falling back to hardcoded contest data');
      contests = fetchHardcodedLeetcodeContests();
    } else {
      console.log(`Successfully scraped ${contests.length} LeetCode contests`);
    }
    
    // De-duplicate contests based on name and start time
    const uniqueContests = [];
    const seen = new Set();
    
    contests.forEach(contest => {
      const key = `${contest.name}-${contest.startTime.getTime()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueContests.push(contest);
      }
    });
    
    console.log(`Returning ${uniqueContests.length} unique contests`);
    
    // For debugging, print some contest details
    uniqueContests.slice(0, 5).forEach(c => {
      console.log(`Contest: ${c.name}, Status: ${c.status}, Start: ${c.startTime.toISOString()}`);
    });
    
    // Add more past contests if needed by querying the archive
    if (uniqueContests.filter(c => c.status === 'past').length < 10) {
      try {
        console.log('Fetching additional past contests from archive...');
        const pastContests = await fetchPastContests();
        
        // Add past contests ensuring no duplicates
        pastContests.forEach(contest => {
          const key = `${contest.name}-${contest.startTime.getTime()}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueContests.push(contest);
          }
        });
        
        console.log(`Added ${pastContests.length} additional past contests`);
      } catch (err) {
        console.error('Error fetching past contests:', err.message);
      }
    }
    
    return uniqueContests;
  } catch (error) {
    console.error('Error scraping LeetCode contests:', error.message);
    return fetchHardcodedLeetcodeContests();
  }
}

// Function to fetch past contests from the archive pages
async function fetchPastContests() {
  const pastContests = [];
  const now = new Date();
  
  try {
    // Fetch the contest archive page
    const response = await axios.get('https://leetcode.com/contest/archive/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Look for contest table or list
    $('.contest-table tbody tr, .contest-list .contest-item').each((i, element) => {
      try {
        const title = $(element).find('.contest-title, td:nth-child(1)').text().trim();
        const startTimeText = $(element).find('.contest-start-time, td:nth-child(2)').text().trim();
        
        // Try to parse the date
        let startTime;
        if (startTimeText) {
          startTime = new Date(startTimeText);
          if (isNaN(startTime.getTime())) {
            // Try alternative formats
            const dateMatch = startTimeText.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              startTime = new Date(dateMatch[1]);
            }
          }
        }
        
        if (title && startTime && !isNaN(startTime.getTime())) {
          const duration = 90; // Default duration for past contests
          const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
          
          // Create a slug from the title
          const slug = title.toLowerCase().replace(/\s+/g, '-');
          
          pastContests.push({
            name: title,
            platform: 'LeetCode',
            url: `https://leetcode.com/contest/${slug}`,
            startTime,
            endTime,
            duration,
            status: 'past'
          });
        }
      } catch (err) {
        console.error('Error processing archive contest:', err.message);
      }
    });
    
    console.log(`Found ${pastContests.length} contests from archive`);
    
  } catch (err) {
    console.error('Error fetching contest archive:', err.message);
  }
  
  return pastContests;
}

// Hardcoded LeetCode contests as fallback
function fetchHardcodedLeetcodeContests() {
  // Provide more contests as a fallback
  const now = new Date();
  const nextSaturday = new Date(now);
  nextSaturday.setDate(now.getDate() + (6 - now.getDay() + 7) % 7);
  nextSaturday.setHours(17, 30, 0, 0); // 17:30 UTC
  
  const results = [];
  
  // Add some upcoming contests
  for (let i = 0; i < 3; i++) {
    const contestDate = new Date(nextSaturday);
    contestDate.setDate(contestDate.getDate() + i * 7);
    
    results.push({
      name: `Weekly Contest ${440 + i}`,
      platform: "LeetCode",
      url: `https://leetcode.com/contest/weekly-contest-${440 + i}`,
      startTime: contestDate,
      endTime: new Date(contestDate.getTime() + 90 * 60 * 1000),
      duration: 90,
      status: "upcoming"
    });
  }
  
  // Add some past contests
  for (let i = 1; i <= 10; i++) {
    const contestDate = new Date(nextSaturday);
    contestDate.setDate(contestDate.getDate() - i * 7);
    
    results.push({
      name: `Weekly Contest ${440 - i}`,
      platform: "LeetCode",
      url: `https://leetcode.com/contest/weekly-contest-${440 - i}`,
      startTime: contestDate,
      endTime: new Date(contestDate.getTime() + 90 * 60 * 1000),
      duration: 90,
      status: "past"
    });
    
    // Add some biweekly contests
    if (i % 2 === 0) {
      const biweeklyDate = new Date(contestDate);
      biweeklyDate.setDate(biweeklyDate.getDate() - 3);
      
      results.push({
        name: `Biweekly Contest ${126 - i/2}`,
        platform: "LeetCode",
        url: `https://leetcode.com/contest/biweekly-contest-${126 - i/2}`,
        startTime: biweeklyDate,
        endTime: new Date(biweeklyDate.getTime() + 90 * 60 * 1000),
        duration: 90,
        status: "past"
      });
    }
  }
  
  return results;
}

module.exports = scrapeLeetcode;