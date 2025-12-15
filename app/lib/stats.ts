import { loadLocalDataset, UFOSighting } from './dataset';
import { loadHuggingFaceDataset } from './huggingface';

export interface DatasetStats {
  totalRecords: number;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
  geographicBounds: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
  };
  topStates: Array<{ state: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
}

export async function getDatasetStats(): Promise<DatasetStats> {
  let records: UFOSighting[] = [];
  
  // Try local file first
  const localData = await loadLocalDataset();
  if (localData.length > 0) {
    records = localData;
  } else {
    // Use Hugging Face API
    const dataset = await loadHuggingFaceDataset();
    records = await dataset.toArray() as UFOSighting[];
  }

  if (records.length === 0) {
    throw new Error('Dataset is empty or not accessible');
  }

  // Calculate statistics
  const dates = records
    .map(r => new Date(r.t_utc))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const earliest = dates[0]?.toISOString() || null;
  const latest = dates[dates.length - 1]?.toISOString() || null;

  // Geographic bounds
  const lats = records.map(r => r.lat).filter(l => l !== undefined && !isNaN(l));
  const lons = records.map(r => r.lon).filter(l => l !== undefined && !isNaN(l));

  const latMin = lats.length > 0 ? Math.min(...lats) : -90;
  const latMax = lats.length > 0 ? Math.max(...lats) : 90;
  const lonMin = lons.length > 0 ? Math.min(...lons) : -180;
  const lonMax = lons.length > 0 ? Math.max(...lons) : 180;

  // Top states
  const stateCounts = new Map<string, number>();
  records.forEach(r => {
    if (r.state) {
      stateCounts.set(r.state, (stateCounts.get(r.state) || 0) + 1);
    }
  });
  const topStates = Array.from(stateCounts.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top countries
  const countryCounts = new Map<string, number>();
  records.forEach(r => {
    if (r.country) {
      countryCounts.set(r.country, (countryCounts.get(r.country) || 0) + 1);
    }
  });
  const topCountries = Array.from(countryCounts.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalRecords: records.length,
    dateRange: {
      earliest,
      latest,
    },
    geographicBounds: {
      latMin,
      latMax,
      lonMin,
      lonMax,
    },
    topStates,
    topCountries,
  };
}

