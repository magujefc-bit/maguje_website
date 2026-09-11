// Single source of truth for the officials.official_role check
// constraint's allowed values. Keep this in sync with the SQL
// constraint in the officials table if the list ever changes.
export const OFFICIAL_ROLES = [
  'Patron',
  'Team Manager',
  'Head Coach',
  'Assistant Coach',
  'Fitness Coach',
  'Club Treasurer',
  'Club Secretary',
  'Team Doctor',
  'Performance Analyst',
  'Kit Manager',
  'Media Manager',
];

