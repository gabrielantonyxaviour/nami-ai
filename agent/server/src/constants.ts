type DisasterQuery = {
  category: string;
  queries: string[];
};

export const disasterQueries: DisasterQuery[] = [
  {
    category: "Breaking News Overview",
    queries: [
      '("breaking news" OR "latest") (disaster OR emergency OR crisis) after:2024-02-22 -historical',
      '"ongoing disaster" OR "current emergency" after:2024-02-22 -archive',
    ],
  },
  {
    category: "Natural Disasters",
    queries: [
      '(earthquake OR "seismic activity") "breaking news" after:2024-02-22',
      '(tsunami OR "tidal wave") "latest" after:2024-02-22',
      '(volcano OR "volcanic eruption") "current" after:2024-02-22',
      '(flood OR flooding OR "flash flood") "emergency" after:2024-02-22',
      '(landslide OR "mudslide") "breaking" after:2024-02-22',
    ],
  },
  {
    category: "Weather Events",
    queries: [
      '(hurricane OR cyclone OR typhoon) "breaking news" after:2024-02-22',
      '(tornado OR "severe storm") "current" after:2024-02-22',
      '("extreme weather" OR "severe weather") "emergency" after:2024-02-22',
      '(blizzard OR "snow storm" OR "ice storm") "latest" after:2024-02-22',
      '(drought OR "heat wave") "crisis" after:2024-02-22',
    ],
  },
  {
    category: "Human-Caused Disasters",
    queries: [
      '(explosion OR blast) "breaking news" after:2024-02-22 -historical',
      '("building collapse" OR "structure collapse") "emergency" after:2024-02-22',
      '("industrial accident" OR "factory incident") "current" after:2024-02-22',
      '("train derailment" OR "rail accident") "breaking" after:2024-02-22',
      '("plane crash" OR "aircraft incident") "latest" after:2024-02-22',
    ],
  },
  {
    category: "Geographic-Specific",
    queries: [
      '"Asia" (disaster OR emergency) "breaking news" after:2024-02-22',
      '"Europe" (disaster OR emergency) "breaking news" after:2024-02-22',
      '"North America" (disaster OR emergency) "breaking news" after:2024-02-22',
      '"South America" (disaster OR emergency) "breaking news" after:2024-02-22',
      '"Africa" (disaster OR emergency) "breaking news" after:2024-02-22',
      '"Australia" (disaster OR emergency) "breaking news" after:2024-02-22',
    ],
  },
  {
    category: "Infrastructure",
    queries: [
      '("power outage" OR blackout) "emergency" after:2024-02-22',
      '("water crisis" OR "water shortage") "current" after:2024-02-22',
      '("gas leak" OR "chemical spill") "breaking news" after:2024-02-22',
      '("bridge collapse" OR "road collapse") "emergency" after:2024-02-22',
    ],
  },
  {
    category: "Public Health",
    queries: [
      '("disease outbreak" OR epidemic) "breaking news" after:2024-02-22',
      '("public health emergency" OR "health crisis") "current" after:2024-02-22',
      '("food safety" OR contamination) "emergency" after:2024-02-22',
    ],
  },
];
