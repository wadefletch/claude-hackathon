import type { UserProfile } from "../profile"

/**
 * A realistic seed profile to drive the demo before the config-panel form
 * exists: a single parent with one school-age child, working in the Loop,
 * preferring transit, prioritizing groceries and parks.
 */
export const sampleProfile: UserProfile = {
  id: "sample-profile-1",
  members: [
    {
      id: "member-parent",
      role: "adult",
      name: "Maria",
      ageBand: "adult",
      work: {
        lat: 41.8827,
        lng: -87.6289,
        address: "50 W Washington St, Chicago, IL 60602",
        label: "Daley Center",
        employer: "Cook County Clerk",
        communityArea: "Loop",
        zip: "60602",
        preferredMode: "transit",
        maxCommuteMinutes: 45,
      },
    },
    {
      id: "member-child",
      role: "child",
      name: "Diego",
      ageBand: "5-11",
      schoolAge: true,
    },
  ],
  priorities: [
    { category: "groceries", weight: 5 },
    { category: "parks", weight: 4 },
    { category: "schools", weight: 5 },
    { category: "transit", weight: 4 },
    { category: "pharmacy", weight: 2 },
  ],
  housingNeeds: {
    bedroomsNeeded: 2,
    maxRentUsd: 1400,
    monthlyIncomeUsd: 2600,
    accessibility: false,
    pets: false,
    preferredCommunityAreas: ["Logan Square", "Avondale", "Irving Park"],
  },
}
