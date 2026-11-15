// The glossary: the words Stats uses, in a sentence or two each. In
// alphabetical order; the page gives each an anchor from its id.

export interface Term {
  id: string;
  term: string;
  definition: string;
}

export const TERMS: readonly Term[] = [
  {
    id: 'active-military',
    term: 'Active military',
    definition:
      'People serving full time in the armed forces. Reserves, who train a few weeks a year and are called up in a crisis, are not counted.',
  },
  {
    id: 'age-structure',
    term: 'Age structure',
    definition: 'How a population is spread across ages: how many children, how many of working age, how many elders. A population pyramid draws it.',
  },
  {
    id: 'capital-share',
    term: 'Capital share',
    definition:
      'The share of a country’s people who live in its capital, suburbs included. Small countries often keep a third of their people there; large ones rarely more than a tenth.',
  },
  {
    id: 'catch-up-growth',
    term: 'Catch-up growth',
    definition:
      'The fast growth open to a poorer economy that adopts methods and machines richer ones already use. It slows as the gap closes, which is why rich economies seldom grow fast for long.',
  },
  {
    id: 'central-government',
    term: 'Central government',
    definition:
      'The national government alone, without states, provinces or town halls. In a federal country it does a smaller part of all public spending than in a unitary one.',
  },
  {
    id: 'city-state',
    term: 'City-state',
    definition: 'A country that is one city and little else, such as Singapore or Monaco. Its density and its capital share are far above any larger country’s.',
  },
  {
    id: 'constant-prices',
    term: 'Constant prices',
    definition: 'Money figures with inflation taken out, so that two years can be compared. Real growth is growth at constant prices.',
  },
  {
    id: 'demographic-transition',
    term: 'Demographic transition',
    definition:
      'The shift every country studied has made or is making: from many births and many early deaths to few of each. Deaths fall first, so the population grows fast in between.',
  },
  {
    id: 'density',
    term: 'Density',
    definition: 'People for every square kilometre of land. It says how crowded a country is on average, not how its people are spread: most of Egypt is empty.',
  },
  {
    id: 'dependency-ratio',
    term: 'Dependency ratio',
    definition: 'The number of children under 15 and elders over 64 for every 100 people of working age. A rough measure of how many each worker supports.',
  },
  {
    id: 'derived-number',
    term: 'Derived number',
    definition: 'A number worked out from two you entered, such as density from population and area. Most of the checks are on derived numbers, because sizes alone say little.',
  },
  {
    id: 'fertility-rate',
    term: 'Fertility rate',
    definition:
      'The total fertility rate: the number of children an average woman would have over her life at today’s birth rates. It is a rate for one year, not a count of real families.',
  },
  {
    id: 'full-spread',
    term: 'Full spread',
    definition: 'The whole range of a number among comparable real countries, from the lowest to the highest. Outside it, no such country exists today.',
  },
  {
    id: 'gdp',
    term: 'GDP',
    definition:
      'Gross domestic product: the value of everything a country produces in a year. It measures the size of an economy, not how well its people live.',
  },
  {
    id: 'gdp-per-person',
    term: 'GDP per person',
    definition: 'GDP divided by population, also called GDP per capita. The usual first measure of how rich a country is.',
  },
  {
    id: 'general-government',
    term: 'General government',
    definition: 'All levels of government taken together: national, regional and local, with social security funds. The fair measure for comparing countries, where it is published.',
  },
  {
    id: 'government-spending',
    term: 'Government spending',
    definition: 'What the government spends in a year, here as a share of GDP. It covers wages, pensions, benefits, interest and the running of public services.',
  },
  {
    id: 'income-group',
    term: 'Income group',
    definition:
      'A set of countries of similar GDP per person. Stats sorts real countries into four equal groups, from the lowest GDP per person to the highest, and compares your nation with the group it would fall in.',
  },
  {
    id: 'infant-mortality',
    term: 'Infant mortality',
    definition: 'Deaths before the first birthday for every 1,000 births. It moves life expectancy more than any other single cause: where it is high, life expectancy is low even if adults live long.',
  },
  {
    id: 'international-dollar',
    term: 'International dollar',
    definition: 'The unit of PPP figures: a dollar that buys in any country what a US dollar buys in the United States.',
  },
  {
    id: 'land-area',
    term: 'Land area',
    definition: 'A country’s area without its lakes, rivers and coastal waters. Density is counted on land area.',
  },
  {
    id: 'life-expectancy',
    term: 'Life expectancy',
    definition:
      'Life expectancy at birth: how long a newborn would live if today’s death rates at every age stayed as they are. It is an average, pulled down hard by deaths in infancy.',
  },
  {
    id: 'median-age',
    term: 'Median age',
    definition: 'The age that splits a population in two equal halves. About 15 in the youngest countries and nearly 50 in the oldest.',
  },
  {
    id: 'military-spending',
    term: 'Military spending',
    definition: 'What a country spends on its armed forces in a year, here as a share of GDP: pay, pensions, equipment, operations and research.',
  },
  {
    id: 'nominal-gdp',
    term: 'Nominal GDP',
    definition:
      'GDP converted to US dollars at the market exchange rate. The right measure for what a country can buy abroad: oil, aircraft, foreign debt.',
  },
  {
    id: 'paramilitary',
    term: 'Paramilitary',
    definition: 'Armed forces outside the regular military, such as a gendarmerie, border guards or a coast guard. Some sources count them with the military and some do not.',
  },
  {
    id: 'peers',
    term: 'Peers',
    definition: 'The real countries a number is compared with: those of similar income, population or area, depending on the check, or every country when it makes no difference.',
  },
  {
    id: 'percentile',
    term: 'Percentile',
    definition: 'A place in a ranking out of 100. A country on the 95th percentile is higher than 95% of the others.',
  },
  {
    id: 'plausible',
    term: 'Plausible',
    definition: 'The verdict for a number inside the typical band: nine in ten comparable real countries are in the same range.',
  },
  {
    id: 'population-pyramid',
    term: 'Population pyramid',
    definition:
      'A chart of a population by age and sex: men on one side, women on the other, the oldest at the top. Wide at the bottom in a young country, top-heavy in an old one.',
  },
  {
    id: 'ppp',
    term: 'PPP',
    definition:
      'Purchasing power parity: GDP counted at what money buys at home, not at the exchange rate. The right measure for living standards and for anything paid for locally, such as soldiers’ wages.',
  },
  {
    id: 'price-level',
    term: 'Price level',
    definition:
      'How expensive a country is next to the United States: nominal GDP as a percentage of PPP GDP. Poorer countries are cheaper, because wages are lower and haircuts can’t be imported.',
  },
  {
    id: 'primate-city',
    term: 'Primate city',
    definition: 'A city far larger than any other in its country, and usually its capital. Bangkok and Budapest are the textbook cases.',
  },
  {
    id: 'real-growth',
    term: 'Real growth',
    definition: 'The yearly growth of GDP after inflation is taken out. Stats compares it with real countries’ averages over ten years, since any one year can be a boom or a slump.',
  },
  {
    id: 'replacement-fertility',
    term: 'Replacement fertility',
    definition:
      'The fertility rate at which each generation replaces itself: about 2.1 where few children die, and higher where many do. Below it, a population shrinks in the long run unless people move in.',
  },
  {
    id: 'snapshot',
    term: 'Snapshot',
    definition: 'The dated copy of real-world numbers that Stats compares with. It is saved with the tool and refreshed about once a year; nothing is fetched while you use it.',
  },
  {
    id: 'spending-per-soldier',
    term: 'Spending per soldier',
    definition: 'Military spending divided by active personnel. Low for a large conscript army with old equipment, high for a small professional one with ships and aircraft.',
  },
  {
    id: 'stable-population',
    term: 'Stable population',
    definition: 'What a population becomes when birth and death rates stay the same for generations: its age structure stops changing. The starting point of the estimated pyramid.',
  },
  {
    id: 'stretch',
    term: 'Stretch',
    definition: 'The verdict for a number outside the typical band but inside the full spread: unusual, with at least one real country further out. It wants a reason.',
  },
  {
    id: 'typical-band',
    term: 'Typical band',
    definition: 'The range that holds the middle 90% of comparable real countries, from the 5th percentile to the 95th. One in twenty is below it and one in twenty above.',
  },
  {
    id: 'unlikely',
    term: 'Unlikely',
    definition: 'The verdict for a number beyond every comparable real country today, or for numbers that can’t be true together, such as a capital larger than its country.',
  },
  {
    id: 'urban-share',
    term: 'Urban share',
    definition: 'The share of people who live in towns and cities. Each country draws the line between town and village its own way, so small differences mean little.',
  },
];
