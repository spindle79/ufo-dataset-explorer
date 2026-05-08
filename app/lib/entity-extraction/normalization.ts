/**
 * Entity Normalization
 * Canonical names, deduplication, alias merging
 */

import type {
  PeopleEntity,
  LocationsEntity,
  CompaniesEntity,
  ProgramsEntity,
} from '../entity-schemas';

/**
 * Normalize a person name (remove honorifics, normalize case)
 */
export function normalizeName(name: string): string {
  return name
    .replace(
      /^(?:Dr|Mr|Mrs|Ms|Prof|President|CEO|CFO|CTO|Sen|Rep|Gov|Mayor|Judge|General|Colonel|Captain|Lieutenant|Sergeant)\.?\s+/i,
      ''
    )
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normalize a location name
 */
export function normalizeLocation(name: string): string {
  // Handle common abbreviations
  const abbreviations: Record<string, string> = {
    'NYC': 'New York City',
    'LA': 'Los Angeles',
    'SF': 'San Francisco',
    'DC': 'Washington DC',
    'UK': 'United Kingdom',
    'USA': 'United States',
    'US': 'United States',
  };

  const normalized = name.trim();
  return abbreviations[normalized] || normalized;
}

/**
 * Normalize a company name (remove legal suffixes)
 */
export function normalizeCompany(name: string): string {
  return name
    .replace(/\s+(?:Inc|LLC|Corp|Corporation|Ltd|Limited|Co|Company)\.?$/i, '')
    .trim();
}

/**
 * Normalize people entities
 */
export function normalizePeople(
  people: PeopleEntity[]
): Array<PeopleEntity & { canonicalName: string }> {
  const normalized = people.map((p) => ({
    ...p,
    canonicalName: normalizeName(p.name),
    aliases: [
      ...(p.aliases || []).map((a) => normalizeName(a)),
      p.name, // Include original name as alias
    ].filter((a) => a !== normalizeName(p.name)),
  }));

  // Deduplicate by canonical name
  const seen = new Map<string, typeof normalized[0]>();
  for (const person of normalized) {
    const key = person.canonicalName.toLowerCase();
    if (seen.has(key)) {
      // Merge aliases
      const existing = seen.get(key)!;
      existing.aliases = [
        ...new Set([...existing.aliases, ...person.aliases, person.name]),
      ].filter((a) => a !== existing.canonicalName);
    } else {
      seen.set(key, person);
    }
  }

  return Array.from(seen.values());
}

/**
 * Normalize location entities
 */
export function normalizeLocations(
  locations: LocationsEntity[]
): Array<LocationsEntity & { canonicalName: string }> {
  const normalized = locations.map((l) => ({
    ...l,
    canonicalName: normalizeLocation(l.name),
    aliases: [
      ...(l.aliases || []).map((a) => normalizeLocation(a)),
      l.name,
    ].filter((a) => a !== normalizeLocation(l.name)),
  }));

  // Deduplicate by canonical name
  const seen = new Map<string, typeof normalized[0]>();
  for (const location of normalized) {
    const key = location.canonicalName.toLowerCase();
    if (seen.has(key)) {
      const existing = seen.get(key)!;
      existing.aliases = [
        ...new Set([...existing.aliases, ...location.aliases, location.name]),
      ].filter((a) => a !== existing.canonicalName);

      // Merge additional data (prefer non-null values)
      if (location.latitude && !existing.latitude) {
        existing.latitude = location.latitude;
      }
      if (location.longitude && !existing.longitude) {
        existing.longitude = location.longitude;
      }
      if (location.address && !existing.address) {
        existing.address = location.address;
      }
      if (location.city && !existing.city) {
        existing.city = location.city;
      }
      if (location.state && !existing.state) {
        existing.state = location.state;
      }
      if (location.country && !existing.country) {
        existing.country = location.country;
      }
    } else {
      seen.set(key, location);
    }
  }

  return Array.from(seen.values());
}

/**
 * Normalize company entities
 */
export function normalizeCompanies(
  companies: CompaniesEntity[]
): Array<CompaniesEntity & { canonicalName: string }> {
  const normalized = companies.map((c) => ({
    ...c,
    canonicalName: normalizeCompany(c.name),
    aliases: [
      ...(c.aliases || []).map((a) => normalizeCompany(a)),
      c.name,
    ].filter((a) => a !== normalizeCompany(c.name)),
  }));

  // Deduplicate by canonical name
  const seen = new Map<string, typeof normalized[0]>();
  for (const company of normalized) {
    const key = company.canonicalName.toLowerCase();
    if (seen.has(key)) {
      const existing = seen.get(key)!;
      existing.aliases = [
        ...new Set([...existing.aliases, ...company.aliases, company.name]),
      ].filter((a) => a !== existing.canonicalName);
    } else {
      seen.set(key, company);
    }
  }

  return Array.from(seen.values());
}

/**
 * Normalize program entities
 */
export function normalizePrograms(
  programs: ProgramsEntity[]
): Array<ProgramsEntity & { canonicalName: string }> {
  const normalized = programs.map((p) => ({
    ...p,
    canonicalName: p.name.trim(),
    aliases: [
      ...(p.aliases || []).map((a) => a.trim()),
      p.name,
    ].filter((a) => a !== p.name.trim()),
  }));

  // Deduplicate by canonical name
  const seen = new Map<string, typeof normalized[0]>();
  for (const program of normalized) {
    const key = program.canonicalName.toLowerCase();
    if (seen.has(key)) {
      const existing = seen.get(key)!;
      existing.aliases = [
        ...new Set([...existing.aliases, ...program.aliases, program.name]),
      ].filter((a) => a !== existing.canonicalName);

      // Merge description (prefer longer/more detailed)
      if (program.description && (!existing.description || program.description.length > existing.description.length)) {
        existing.description = program.description;
      }
    } else {
      seen.set(key, program);
    }
  }

  return Array.from(seen.values());
}

/**
 * Merge aliases from multiple sources
 */
export function mergeAliases(
  existingAliases: string[],
  newAliases: string[]
): string[] {
  return [...new Set([...existingAliases, ...newAliases])];
}
