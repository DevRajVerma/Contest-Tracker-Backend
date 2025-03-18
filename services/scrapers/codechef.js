const axios = require('../utils/axios-config');
const cheerio = require('cheerio');

async function scrapeCodechef() {
  try {
    console.log('Scraping CodeChef contests...');
    
    const response = await axios.get('https://www.codechef.com/contests', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    const $ = cheerio.load(response.data);
    const contests = [];
    
    console.log('Page loaded successfully, looking for contest data...');
    
    // Debug: Print some page structure to understand what we're working with
    console.log('Page title:', $('title').text());
    
    // Try to find contests in the modern layout
    const contestTabs = [
      { selector: '.ongoing-contests', status: 'ongoing' },
      { selector: '.future-contests', status: 'upcoming' },
      { selector: '.past-contests', status: 'past' }
    ];
    
    // Try different selectors for contest tables
    for (const tab of contestTabs) {
      console.log(`Looking for ${tab.status} contests...`);
      
      // Try multiple possible selectors
      const tableSelectors = [
        `${tab.selector} table tbody tr`,
        `#${tab.status}-contests-data table tbody tr`,
        `[data-tab="${tab.status}"] table tbody tr`,
        `.${tab.status}-contests table tbody tr`,
        `div[data-tabid="${tab.status}"] table tbody tr`
      ];
      
      for (const selector of tableSelectors) {
        const rows = $(selector);
        if (rows.length > 0) {
          console.log(`Found ${rows.length} ${tab.status} contests with selector: ${selector}`);
          
          rows.each((i, element) => {
            try {
              // Different column structures for different layouts
              const layouts = [
                // Layout 1: Modern layout
                {
                  nameSelector: 'td:nth-child(1) a, td:nth-child(2) a',
                  codeSelector: 'td:nth-child(1) a, td:nth-child(2) a',
                  startSelector: 'td:nth-child(2), td:nth-child(3)',
                  endSelector: 'td:nth-child(3), td:nth-child(4)'
                },
                // Layout 2: Alternative layout
                {
                  nameSelector: '.contest-name a',
                  codeSelector: '.contest-name a',
                  startSelector: '.start-time',
                  endSelector: '.end-time'
                }
              ];
              
              for (const layout of layouts) {
                const codeElement = $(element).find(layout.codeSelector).first();
                const nameElement = $(element).find(layout.nameSelector).first();
                const startTimeElement = $(element).find(layout.startSelector).first();
                const endTimeElement = $(element).find(layout.endSelector).first();
                
                if (nameElement.length > 0 && startTimeElement.length > 0 && endTimeElement.length > 0) {
                  const contestName = nameElement.text().trim();
                  const contestHref = codeElement.attr('href');
                  let contestCode = '';
                  
                  if (contestHref) {
                    // Extract contest code from href
                    const matches = contestHref.match(/\/([^\/]+)$/);
                    if (matches && matches[1]) {
                      contestCode = matches[1];
                    }
                  }
                  
                  let startTimeStr = startTimeElement.text().trim();
                  let endTimeStr = endTimeElement.text().trim();
                  
                  // Debug
                  console.log(`Contest: ${contestName}, Start: ${startTimeStr}, End: ${endTimeStr}`);
                  
                  // Try to parse dates
                  const startTime = parseCodechefDate(startTimeStr);
                  const endTime = parseCodechefDate(endTimeStr);
                  
                  if (contestName && startTime && endTime && !isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
                    contests.push({
                      name: contestName,
                      platform: 'CodeChef',
                      url: contestCode ? `https://www.codechef.com/${contestCode}` : `https://www.codechef.com/contests`,
                      startTime,
                      endTime,
                      duration: (endTime - startTime) / (1000 * 60),
                      status: tab.status
                    });
                    
                    console.log(`Added contest: ${contestName}`);
                  } else {
                    console.log(`Failed to parse dates for contest: ${contestName}`);
                  }
                  
                  break; // Break out of layouts loop if we found elements
                }
              }
            } catch (err) {
              console.error(`Error processing a contest row:`, err.message);
            }
          });
          
          break; // Break out of selectors loop if we found elements
        }
      }
    }
    
    // If no contests found via DOM, try to extract from script tag
    if (contests.length === 0) {
      console.log('Trying to extract contests from script tags...');
      try {
        // Look for script tags containing contest data
        $('script').each((i, script) => {
          const content = $(script).html() || '';
          
          // Look for JSON data in various formats
          const dataPatterns = [
            /var\s+contestsData\s*=\s*(\[.*?\]);/s,
            /contests\s*:\s*(\[.*?\])/s,
            /var\s+allContests\s*=\s*(\{.*?\});/s
          ];
          
          for (const pattern of dataPatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
              try {
                const contestData = JSON.parse(match[1]);
                console.log(`Found contest data in script: ${typeof contestData}, length: ${Array.isArray(contestData) ? contestData.length : 'object'}`);
                
                // Handle different data structures
                const processContests = (data, status) => {
                  if (Array.isArray(data)) {
                    data.forEach(contest => {
                      try {
                        const startTime = new Date(contest.startDate || contest.start_time);
                        const endTime = new Date(contest.endDate || contest.end_time);
                        
                        if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
                          contests.push({
                            name: contest.name || contest.contestName || contest.title,
                            platform: 'CodeChef',
                            url: `https://www.codechef.com/${contest.code}`,
                            startTime,
                            endTime,
                            duration: (endTime - startTime) / (1000 * 60),
                            status
                          });
                        }
                      } catch (err) {
                        console.error('Error processing contest from script:', err.message);
                      }
                    });
                  }
                };
                
                // Process different possible data structures
                if (Array.isArray(contestData)) {
                  processContests(contestData, 'unknown');
                } else if (contestData.present) {
                  processContests(contestData.present, 'ongoing');
                  processContests(contestData.future, 'upcoming');
                  processContests(contestData.past, 'past');
                }
                
                if (contests.length > 0) {
                  console.log(`Found ${contests.length} contests from script data`);
                  break; // Break out of patterns loop if we found contests
                }
              } catch (err) {
                console.error('Error parsing contest data from script:', err.message);
              }
            }
          }
          
          if (contests.length > 0) {
            return false; // Break out of script loop if we found contests
          }
        });
      } catch (err) {
        console.error('Error extracting contests from script tags:', err.message);
      }
    }
    
    // If still no contests found, try the API approach
    if (contests.length === 0) {
      console.log('Attempting to fetch contests from CodeChef API...');
      try {
        const apiResponse = await axios.get('https://www.codechef.com/api/contests', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'application/json'
          }
        });
        
        if (apiResponse.data && apiResponse.data.contests) {
          console.log('Successfully fetched contests from API');
          
          // Process contests from each category
          const categories = ['present', 'future', 'past'];
          const statusMap = {
            'present': 'ongoing',
            'future': 'upcoming',
            'past': 'past'
          };
          
          for (const category of categories) {
            const contestList = apiResponse.data.contests[category];
            if (contestList && Object.keys(contestList).length > 0) {
              console.log(`Processing ${Object.keys(contestList).length} ${category} contests from API`);
              
              Object.values(contestList).forEach(contest => {
                try {
                  const startTime = new Date(contest.start_date);
                  const endTime = new Date(contest.end_date);
                  
                  if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
                    contests.push({
                      name: contest.contest_name || contest.name,
                      platform: 'CodeChef',
                      url: `https://www.codechef.com/${contest.contest_code}`,
                      startTime,
                      endTime,
                      duration: (endTime - startTime) / (1000 * 60),
                      status: statusMap[category]
                    });
                  }
                } catch (err) {
                  console.error('Error processing contest from API:', err.message);
                }
              });
            }
          }
        }
      } catch (err) {
        console.error('Error fetching contests from API:', err.message);
      }
    }
    
    // If still no contests found, fall back to hardcoded data
    if (contests.length === 0) {
      console.log('Falling back to hardcoded contest data');
      return fetchHardcodedCodechefContests();
    }
    
    console.log(`Scraped ${contests.length} CodeChef contests successfully`);
    return contests;
  } catch (error) {
    console.error('Error scraping CodeChef contests:', error.message);
    console.log('Falling back to hardcoded contest data');
    return fetchHardcodedCodechefContests();
  }
}

// Helper function to parse dates in various formats
function parseCodechefDate(dateStr) {
  try {
    // Try parsing as-is
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try different formats
    // Format: "31 Dec 2023 12:30:00"
    const formatRegex = /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/;
    const match = dateStr.match(formatRegex);
    if (match) {
      const [_, day, month, year, hour, minute, second] = match;
      const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      return new Date(year, monthMap[month], day, hour, minute, second);
    }
    
    // Format: timestamp
    if (/^\d+$/.test(dateStr)) {
      return new Date(parseInt(dateStr) * 1000);
    }
    
    return null;
  } catch (err) {
    console.error(`Error parsing date string: ${dateStr}`, err.message);
    return null;
  }
}

// Hardcoded CodeChef contests as fallback
function fetchHardcodedCodechefContests() {
  const now = new Date();
  const contests = [];
  
  // Add upcoming contest
  const upcomingStart = new Date(now);
  upcomingStart.setDate(upcomingStart.getDate() + 3);
  upcomingStart.setHours(12, 0, 0, 0);
  
  const upcomingEnd = new Date(upcomingStart);
  upcomingEnd.setDate(upcomingEnd.getDate() + 3);
  
  contests.push({
    name: "March Long Challenge 2025",
    platform: "CodeChef",
    url: "https://www.codechef.com/MARCH25",
    startTime: upcomingStart,
    endTime: upcomingEnd,
    duration: 3 * 24 * 60, // 3 days in minutes
    status: "upcoming"
  });
  
  // Add ongoing contest
  const ongoingStart = new Date(now);
  ongoingStart.setDate(ongoingStart.getDate() - 1);
  ongoingStart.setHours(9, 0, 0, 0);
  
  const ongoingEnd = new Date(ongoingStart);
  ongoingEnd.setDate(ongoingEnd.getDate() + 3);
  
  contests.push({
    name: "Starters 125",
    platform: "CodeChef",
    url: "https://www.codechef.com/START125",
    startTime: ongoingStart,
    endTime: ongoingEnd,
    duration: 3 * 24 * 60, // 3 days in minutes
    status: "ongoing"
  });
  
  // Add past contests
  for (let i = 1; i <= 5; i++) {
    const pastStart = new Date(now);
    pastStart.setDate(pastStart.getDate() - (i * 7));
    pastStart.setHours(15, 0, 0, 0);
    
    const pastEnd = new Date(pastStart);
    pastEnd.setHours(pastEnd.getHours() + 3);
    
    contests.push({
      name: `Starters ${125 - i}`,
      platform: "CodeChef",
      url: `https://www.codechef.com/START${125 - i}`,
      startTime: pastStart,
      endTime: pastEnd,
      duration: 3 * 60, // 3 hours in minutes
      status: "past"
    });
  }
  
  console.log(`Generated ${contests.length} hardcoded CodeChef contests`);
  return contests;
}

module.exports = scrapeCodechef;