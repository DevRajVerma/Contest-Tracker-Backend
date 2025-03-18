const axios = require('../utils/axios-config');

async function fetchCodeforces() {
  try {
    const response = await axios.get('https://codeforces.com/api/contest.list');
    if (!response.data || !response.data.result) {
      console.error('Invalid Codeforces API response structure:', response.data);
      return [];
    }
    
    const contests = response.data.result.map(contest => ({
      name: contest.name,
      platform: 'Codeforces',
      url: `https://codeforces.com/contest/${contest.id}`,
      startTime: new Date(contest.startTimeSeconds * 1000),
      endTime: new Date((contest.startTimeSeconds + contest.durationSeconds) * 1000),
      duration: contest.durationSeconds / 60,
      status: contest.phase === 'BEFORE' ? 'upcoming' : 
              contest.phase === 'CODING' ? 'ongoing' : 'past'
    }));
    
    console.log(`Fetched ${contests.length} Codeforces contests successfully`);
    return contests;
  } catch (error) {
    console.error('Error fetching Codeforces contests:', error.message);
    return [];
  }
}

module.exports = fetchCodeforces;