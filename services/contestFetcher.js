const fetchCodeforces = require('./scrapers/codeforces');
const scrapeCodechef = require('./scrapers/codechef');
const scrapeLeetcode = require('./scrapers/leetcode');
const scrapeAtcoder = require('./scrapers/atcoder');
const Contest = require('../models/Contest'); // Make sure this path is correct

async function updateContests() {
  try {
    console.log('Starting contest update process...');
    
    // Use Promise.allSettled to ensure all requests run even if some fail
    const results = await Promise.allSettled([
      fetchCodeforces(),
      scrapeCodechef(),
      scrapeLeetcode(),
      scrapeAtcoder()
    ]);
    
    // Extract results and handle failures
    const [codeforcesResult, codechefResult, leetcodeResult, atcoderResult] = results;
    
    let codeforcesContests = codeforcesResult.status === 'fulfilled' ? codeforcesResult.value : [];
    let codechefContests = codechefResult.status === 'fulfilled' ? codechefResult.value : [];
    let leetcodeContests = leetcodeResult.status === 'fulfilled' ? leetcodeResult.value : [];
    let atcoderContests = atcoderResult.status === 'fulfilled' ? atcoderResult.value : [];
    
    // Log individual platform results
    console.log(`Fetched contests: Codeforces (${codeforcesContests.length}), CodeChef (${codechefContests.length}), LeetCode (${leetcodeContests.length}), AtCoder (${atcoderContests.length})`);
    
    // Warnings for empty results
    if (codeforcesContests.length === 0) console.warn('Failed to fetch Codeforces contests');
    if (codechefContests.length === 0) console.warn('Failed to fetch CodeChef contests');
    if (leetcodeContests.length === 0) console.warn('Failed to fetch LeetCode contests');
    if (atcoderContests.length === 0) console.warn('Failed to fetch AtCoder contests');
    
    const allContests = [
      ...codeforcesContests, 
      ...codechefContests, 
      ...leetcodeContests,
      ...atcoderContests
    ];
    
    if (allContests.length === 0) {
      console.error('No contests fetched from any platform!');
      return;
    }
    
    console.log(`Total contests fetched: ${allContests.length}`);
    
    // Update contest status
    const now = new Date();
    allContests.forEach(contest => {
      if (!contest.startTime || !contest.endTime) {
        console.warn(`Contest missing time data: ${contest.name} (${contest.platform})`);
        return;
      }
      
      if (contest.startTime > now) {
        contest.status = 'upcoming';
      } else if (contest.endTime > now) {
        contest.status = 'ongoing';
      } else {
        contest.status = 'past';
      }
    });
    
    // Bulk upsert contests
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const contest of allContests) {
      try {
        // Skip contests with invalid data
        if (!contest.name || !contest.platform || !contest.startTime || !contest.endTime) {
          console.warn(`Skipping contest with missing required fields: ${contest.name || 'unnamed'} (${contest.platform || 'unknown platform'})`);
          continue;
        }
        
        // Ensure dates are valid before inserting
        if (isNaN(contest.startTime.getTime()) || isNaN(contest.endTime.getTime())) {
          console.warn(`Skipping contest with invalid dates: ${contest.name} (${contest.platform})`);
          continue;
        }
        
        await Contest.findOneAndUpdate(
          { 
            name: contest.name, 
            platform: contest.platform,
            startTime: contest.startTime 
          },
          contest,
          { upsert: true, new: true }
        );
        updatedCount++;
      } catch (err) {
        console.error(`Error upserting contest ${contest.name} (${contest.platform}):`, err.message);
        errorCount++;
      }
    }
    
    console.log(`Successfully updated ${updatedCount} out of ${allContests.length} contests (${errorCount} errors)`);
    
    // Return stats for potential monitoring
    return {
      total: allContests.length,
      updated: updatedCount,
      errors: errorCount,
      platforms: {
        codeforces: codeforcesContests.length,
        codechef: codechefContests.length,
        leetcode: leetcodeContests.length,
        atcoder: atcoderContests.length
      }
    };
  } catch (error) {
    console.error('Error in updateContests:', error.message);
    throw error; // Let the caller handle the error
  }
}

module.exports = { 
  updateContests,
  fetchCodeforces,
  scrapeCodechef,
  scrapeLeetcode,
  scrapeAtcoder
};