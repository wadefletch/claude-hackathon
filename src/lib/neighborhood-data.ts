export interface NeighborhoodFact {
  label: string
  value: string
}

export interface NeighborhoodSnapshot {
  overview: string
  transit: string[]
  essentials: string[]
  facts: NeighborhoodFact[]
}

export const neighborhoodSnapshots: Record<string, NeighborhoodSnapshot> = {
  "rogers-park": {
    overview:
      "A lakefront neighborhood with a lively mix of residential blocks, small businesses, and cultural destinations near Chicago's northern edge.",
    transit: [
      "CTA Red Line at Howard or Jarvis",
      "CTA bus service on Clark, Sheridan, and Howard",
    ],
    essentials: [
      "Clark Street shops and groceries",
      "Loyola Park and lakefront paths",
      "Rogers Park Branch Library",
    ],
    facts: [
      { label: "Setting", value: "Far North Side · lakefront" },
      { label: "Local hub", value: "Howard Street" },
      { label: "Good for", value: "Beach and park access" },
    ],
  },
  edgewater: {
    overview:
      "A dense lakefront neighborhood where apartment corridors, independent businesses, and beaches sit close together.",
    transit: [
      "CTA Red Line at Thorndale, Granville, or Bryn Mawr",
      "Frequent buses on Broadway and Sheridan",
    ],
    essentials: [
      "Broadway grocery and retail corridor",
      "Lakefront beaches and parks",
      "Edgewater Branch Library",
    ],
    facts: [
      { label: "Setting", value: "Far North Side · lakefront" },
      { label: "Local hub", value: "Broadway" },
      { label: "Good for", value: "Car-light daily errands" },
    ],
  },
  "albany-park": {
    overview:
      "A residential Northwest Side neighborhood known for global food businesses and active commercial streets along Lawrence and Kedzie.",
    transit: [
      "CTA Brown Line at Kedzie",
      "CTA buses on Kedzie, Lawrence, and Kimball",
    ],
    essentials: [
      "Lawrence Avenue markets and restaurants",
      "River Park and North Branch trails",
      "Albany Park Branch Library",
    ],
    facts: [
      { label: "Setting", value: "Northwest Side · river nearby" },
      { label: "Local hub", value: "Lawrence & Kedzie" },
      { label: "Good for", value: "International food options" },
    ],
  },
  uptown: {
    overview:
      "A busy lakefront neighborhood combining historic entertainment venues, high-rise living, and easy access to parks and beaches.",
    transit: [
      "CTA Red and Purple Lines at Wilson",
      "CTA buses on Broadway, Sheridan, and Clark",
    ],
    essentials: [
      "Wilson and Broadway shops",
      "Montrose Beach and lakefront trails",
      "Bezazian Branch Library",
    ],
    facts: [
      { label: "Setting", value: "North Side · lakefront" },
      { label: "Local hub", value: "Wilson & Broadway" },
      { label: "Good for", value: "Transit and entertainment" },
    ],
  },
  avondale: {
    overview:
      "A Northwest Side neighborhood with residential side streets, an evolving Milwaukee Avenue corridor, and convenient regional connections.",
    transit: [
      "CTA Blue Line at Belmont",
      "CTA buses on Milwaukee, Belmont, and Diversey",
    ],
    essentials: [
      "Milwaukee Avenue shops and dining",
      "Brands Park and Avondale Park",
      "Logan Square Branch Library nearby",
    ],
    facts: [
      { label: "Setting", value: "Northwest Side" },
      { label: "Local hub", value: "Belmont & Milwaukee" },
      { label: "Good for", value: "Blue Line access" },
    ],
  },
  "logan-square": {
    overview:
      "A walkable Northwest Side neighborhood centered on boulevards, independent shops, restaurants, and arts venues.",
    transit: [
      "CTA Blue Line at California or Logan Square",
      "CTA buses on Kedzie, Fullerton, and Milwaukee",
    ],
    essentials: [
      "Milwaukee Avenue retail and dining",
      "Palmer Square Park",
      "Logan Square Branch Library",
    ],
    facts: [
      { label: "Setting", value: "Northwest Side · boulevards" },
      { label: "Local hub", value: "Logan Square" },
      { label: "Good for", value: "Shops and nightlife" },
    ],
  },
  lakeview: {
    overview:
      "A dense North Side neighborhood with strong commercial corridors, varied entertainment, and lakefront recreation to the east.",
    transit: [
      "CTA Brown Line at Paulina or Southport",
      "CTA buses on Ashland, Belmont, and Diversey",
    ],
    essentials: [
      "Belmont and Southport shopping",
      "Lakefront parks and trails",
      "Lincoln Belmont Branch Library",
    ],
    facts: [
      { label: "Setting", value: "North Side" },
      { label: "Local hub", value: "Belmont corridor" },
      { label: "Good for", value: "Everyday walkability" },
    ],
  },
  "humboldt-park": {
    overview:
      "A West Side neighborhood anchored by its large namesake park and the cultural and business activity of Paseo Boricua.",
    transit: [
      "CTA buses on Division, North, Western, and California",
      "Blue Line connections available by bus east or north",
    ],
    essentials: [
      "Division Street shops and services",
      "Humboldt Park fieldhouse and lagoon",
      "Humboldt Park Branch Library",
    ],
    facts: [
      { label: "Setting", value: "West Side · park-centered" },
      { label: "Local hub", value: "Division Street" },
      { label: "Good for", value: "Green space" },
    ],
  },
  "west-town": {
    overview:
      "A close-in West Side area with neighborhood shops, restaurants, and straightforward bus connections toward downtown.",
    transit: [
      "CTA Blue Line at Division",
      "CTA buses on Chicago, Ashland, and Milwaukee",
    ],
    essentials: [
      "Chicago Avenue shops and groceries",
      "Eckhart Park",
      "West Town Branch Library",
    ],
    facts: [
      { label: "Setting", value: "Near Northwest Side" },
      { label: "Local hub", value: "Chicago Avenue" },
      { label: "Good for", value: "Downtown proximity" },
    ],
  },
  "near-west": {
    overview:
      "A central West Side neighborhood mixing major institutions, residential pockets, parks, and dining near the West Loop and Medical District.",
    transit: [
      "CTA Green and Pink Lines at Damen",
      "CTA buses on Madison, Damen, and Western",
    ],
    essentials: [
      "Madison Street services and dining",
      "Union Park",
      "Near West Side Branch Library",
    ],
    facts: [
      { label: "Setting", value: "Near West Side" },
      { label: "Local hub", value: "Madison Street" },
      { label: "Good for", value: "Central location" },
    ],
  },
  loop: {
    overview:
      "Chicago's downtown core puts offices, universities, cultural institutions, parks, and multiple transit lines within a compact area.",
    transit: [
      "Multiple CTA 'L' lines in the Loop",
      "Red Line at Harrison and extensive downtown bus service",
    ],
    essentials: [
      "State Street retail and groceries",
      "Grant Park and the lakefront",
      "Harold Washington Library Center",
    ],
    facts: [
      { label: "Setting", value: "Downtown" },
      { label: "Local hub", value: "State Street" },
      { label: "Good for", value: "Regional transit links" },
    ],
  },
  bronzeville: {
    overview:
      "A historic South Side community with landmark architecture, cultural institutions, and convenient access to the lakefront.",
    transit: [
      "CTA Green Line at 35th-Bronzeville-IIT",
      "CTA buses on King Drive, State, and 31st",
    ],
    essentials: [
      "35th Street shops and services",
      "Lake Meadows Market area",
      "Chicago Bee Branch Library",
    ],
    facts: [
      { label: "Setting", value: "South Side · near lakefront" },
      { label: "Local hub", value: "35th Street" },
      { label: "Good for", value: "History and culture" },
    ],
  },
  "little-village": {
    overview:
      "A vibrant Southwest Side neighborhood whose 26th Street corridor is lined with locally owned shops, markets, and restaurants.",
    transit: [
      "CTA Pink Line at Kedzie or California",
      "CTA buses on Cermak, Kedzie, and California",
    ],
    essentials: [
      "26th Street shopping district",
      "La Villita Park",
      "Little Village Branch Library",
    ],
    facts: [
      { label: "Setting", value: "Southwest Side" },
      { label: "Local hub", value: "26th Street" },
      { label: "Good for", value: "Local shopping" },
    ],
  },
  englewood: {
    overview:
      "A South Side community with established residential blocks, neighborhood institutions, and commercial corridors around Halsted and 63rd.",
    transit: [
      "CTA Green Line at Halsted or Ashland/63rd",
      "CTA buses on Halsted, 63rd, and Racine",
    ],
    essentials: [
      "63rd and Halsted services",
      "Kennedy-King College campus",
      "Englewood Branch Library",
    ],
    facts: [
      { label: "Setting", value: "South Side" },
      { label: "Local hub", value: "63rd & Halsted" },
      { label: "Good for", value: "Bus and Green Line options" },
    ],
  },
  "hyde-park": {
    overview:
      "A lakefront South Side neighborhood shaped by university life, museums, bookstores, and compact commercial districts.",
    transit: [
      "Metra Electric at 55th-56th-57th Street",
      "CTA buses on 55th, 59th, Cottage Grove, and Lake Park",
    ],
    essentials: [
      "53rd Street shops and groceries",
      "Promontory Point and lakefront parks",
      "Blackstone Branch Library",
    ],
    facts: [
      { label: "Setting", value: "South Side · lakefront" },
      { label: "Local hub", value: "53rd Street" },
      { label: "Good for", value: "Culture and recreation" },
    ],
  },
  "south-shore": {
    overview:
      "A South Side lakefront neighborhood with beaches, historic architecture, and commercial activity along 71st and 75th Streets.",
    transit: [
      "Metra Electric at Windsor Park or 75th Street",
      "CTA buses on South Shore Drive, 75th, and 79th",
    ],
    essentials: [
      "75th Street shops and services",
      "Rainbow Beach and lakefront parks",
      "South Shore Branch Library",
    ],
    facts: [
      { label: "Setting", value: "South Side · lakefront" },
      { label: "Local hub", value: "75th Street" },
      { label: "Good for", value: "Beach access" },
    ],
  },
}

export function getNeighborhoodSnapshot(
  homeId: string,
  neighborhoodName?: string
): NeighborhoodSnapshot {
  return (
    neighborhoodSnapshots[homeId] ??
    fallbackSnapshot(neighborhoodName ?? "This area")
  )
}

// Real Chicago developments fall outside the 16 curated neighborhoods; return a
// generic-but-valid snapshot so the detail dialog always has content to render.
function fallbackSnapshot(name: string): NeighborhoodSnapshot {
  return {
    overview: `${name} is a Chicago community area with a mix of residential blocks, local businesses, and access to city services. Detailed neighborhood data isn't available for this building yet.`,
    transit: [
      "CTA bus and rail service across the city",
      "Check the CTA trip planner for nearby stops",
    ],
    essentials: [
      "Neighborhood grocery and retail options",
      "Nearby parks and public services",
      "Local Chicago Public Library branch",
    ],
    facts: [
      { label: "Setting", value: "Chicago community area" },
      { label: "Data", value: "Generated placeholder" },
    ],
  }
}
