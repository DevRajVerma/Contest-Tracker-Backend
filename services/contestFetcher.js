// services/contestFetcher.js
const axios = require('axios');
const Contest = require('../models/Contest');

async function fetchCodeforces() {
  try {
    const response = await axios.get('https://codeforces.com/api/contest.list');
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
    return contests;
  } catch (error) {
    console.error('Error fetching Codeforces contests:', error);
    return [];
  }
}

async function fetchCodechef() {
  try {
    const response = await axios.get('https://www.codechef.com/api/contests');
    const current = response.data.present.map(contest => ({
      name: contest.name,
      platform: 'CodeChef',
      url: `https://www.codechef.com/${contest.code}`,
      startTime: new Date(contest.start_date),
      endTime: new Date(contest.end_date),
      duration: (new Date(contest.end_date) - new Date(contest.start_date)) / (1000 * 60),
      status: 'ongoing'
    }));
    
    const upcoming = response.data.future.map(contest => ({
      name: contest.name,
      platform: 'CodeChef',
      url: `https://www.codechef.com/${contest.code}`,
      startTime: new Date(contest.start_date),
      endTime: new Date(contest.end_date),
      duration: (new Date(contest.end_date) - new Date(contest.start_date)) / (1000 * 60),
      status: 'upcoming'
    }));
    
    const past = response.data.past.map(contest => ({
      name: contest.name,
      platform: 'CodeChef',
      url: `https://www.codechef.com/${contest.code}`,
      startTime: new Date(contest.start_date),
      endTime: new Date(contest.end_date),
      duration: (new Date(contest.end_date) - new Date(contest.start_date)) / (1000 * 60),
      status: 'past'
    }));
    
    return [...current, ...upcoming, ...past];
  } catch (error) {
    console.error('Error fetching CodeChef contests:', error);
    return [];
  }
}

async function fetchLeetcode() {
  try {
    const response = await axios.post('https://leetcode.com/graphql', {
      query: `
        query {
          allContests {
            title
            titleSlug
            startTime
            duration
            status
          }
        }
      `
    });
    
    const contests = response.data.data.allContests.map(contest => {
      const startTime = new Date(contest.startTime * 1000);
      return {
        name: contest.title,
        platform: 'LeetCode',
        url: `https://leetcode.com/contest/${contest.titleSlug}`,
        startTime,
        endTime: new Date(startTime.getTime() + contest.duration * 1000),
        duration: contest.duration / 60,
        status: contest.status === 'UPCOMING' ? 'upcoming' : 
                contest.status === 'ONGOING' ? 'ongoing' : 'past'
      };
    });
    
    return contests;
  } catch (error) {
    console.error('Error fetching LeetCode contests:', error);
    return [];
  }
}

async function updateContests() {
  try {
    const [codeforcesContests, codechefContests, leetcodeContests] = await Promise.all([
      fetchCodeforces(),
      fetchCodechef(),
      fetchLeetcode()
    ]);
    
    const allContests = [...codeforcesContests, ...codechefContests, ...leetcodeContests];
    
    // Update contest status
    const now = new Date();
    allContests.forEach(contest => {
      if (contest.startTime > now) {
        contest.status = 'upcoming';
      } else if (contest.endTime > now) {
        contest.status = 'ongoing';
      } else {
        contest.status = 'past';
      }
    });
    
    // Bulk upsert contests
    for (const contest of allContests) {
      await Contest.findOneAndUpdate(
        { 
          name: contest.name, 
          platform: contest.platform,
          startTime: contest.startTime 
        },
        contest,
        { upsert: true, new: true }
      );
    }
    
    console.log('Contests updated successfully');
  } catch (error) {
    console.error('Error updating contests:', error);
  }
}

module.exports = { updateContests };