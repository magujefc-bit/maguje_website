// The single email allowed into owner-only areas: the Developer Page,
// Bug Reports, and the install-count stat (per the plan — these three
// are yours specifically, not shared super_admin territory).
//
// Lives in its own tiny file so both auth-gate.js and sidebar.js can
// import it without creating a circular dependency between them.
export const OWNER_EMAIL = 'fabrisvicky1@gmail.com';
