// All 68 eligible Power 4 + Notre Dame teams for 68 Ski-Doo
// These are the ONLY teams that can be used for picks

const CONFERENCES = {
  ACC: [
    'Boston College', 'California', 'Clemson', 'Duke', 'Florida State',
    'Georgia Tech', 'Louisville', 'Miami', 'NC State', 'North Carolina',
    'Pittsburgh', 'SMU', 'Stanford', 'Syracuse', 'Virginia Tech',
    'Virginia', 'Wake Forest'
  ],
  'Big Ten': [
    'Illinois', 'Indiana', 'Iowa', 'Maryland', 'Michigan',
    'Michigan State', 'Minnesota', 'Nebraska', 'Northwestern', 'Ohio State',
    'Oregon', 'Penn State', 'Purdue', 'Rutgers', 'UCLA',
    'USC', 'Washington', 'Wisconsin'
  ],
  'Big 12': [
    'Arizona', 'Arizona State', 'Baylor', 'BYU', 'Cincinnati',
    'Colorado', 'Houston', 'Iowa State', 'Kansas', 'Kansas State',
    'Oklahoma State', 'TCU', 'Texas Tech', 'UCF', 'Utah',
    'West Virginia'
  ],
  Independent: ['Notre Dame'],
  SEC: [
    'Alabama', 'Arkansas', 'Auburn', 'Florida', 'Georgia',
    'Kentucky', 'LSU', 'Mississippi State', 'Missouri', 'Oklahoma',
    'Ole Miss', 'South Carolina', 'Tennessee', 'Texas', 'Texas A&M',
    'Vanderbilt'
  ]
};

// Flat list of all 68 teams
const ALL_TEAMS = Object.values(CONFERENCES).flat();

// Set for O(1) lookup
const POWER4_SET = new Set(ALL_TEAMS);

const isPower4 = (teamName) => POWER4_SET.has(teamName);

const getConference = (teamName) => {
  for (const [conf, teams] of Object.entries(CONFERENCES)) {
    if (teams.includes(teamName)) return conf;
  }
  return null;
};

// Picks required per week
// Week 1 = Week 0/1 combined
const PICKS_PER_WEEK = {
  1: 4, // Week 0/1
  2: 4,
  3: 5, 4: 5, 5: 5, 6: 5, 7: 5,
  8: 5, 9: 5, 10: 5, 11: 5, 12: 5,
  13: 5, 14: 5
};
// Total: 4+4+(12×5) = 68 ✓

const TOTAL_SEASON_PICKS = 68;

const POINT_VALUES = {
  win_vs_power4: 1,
  upset_loss: 2
};

// CFBD team name mappings (API names can differ from our display names)
// Key = our display name, Value = CFBD API name
const CFBD_NAME_MAP = {
  'California': 'California',
  'Pittsburgh': 'Pittsburgh',
  'NC State': 'North Carolina State',
  'Ole Miss': 'Mississippi',
  'Mississippi State': 'Mississippi State',
  'TCU': 'TCU',
  'BYU': 'BYU',
  'UCF': 'UCF',
  'SMU': 'SMU',
  'LSU': 'LSU',
  'USC': 'USC',
  'UCLA': 'UCLA',
};

const toCFBDName = (displayName) => CFBD_NAME_MAP[displayName] || displayName;
const fromCFBDName = (cfbdName) => {
  const reverse = Object.entries(CFBD_NAME_MAP).find(([, v]) => v === cfbdName);
  return reverse ? reverse[0] : cfbdName;
};

module.exports = {
  CONFERENCES,
  ALL_TEAMS,
  POWER4_SET,
  isPower4,
  getConference,
  PICKS_PER_WEEK,
  TOTAL_SEASON_PICKS,
  POINT_VALUES,
  toCFBDName,
  fromCFBDName,
};
