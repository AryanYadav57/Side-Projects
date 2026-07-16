import Papa from 'papaparse';
import { type Dimensions } from '../store/useProjectStore';

type Unit = 'cm' | 'mm' | 'in' | 'inch' | 'inches' | 'ft' | 'feet' | 'm' | 'meter' | 'meters';
type LegStyle = Dimensions['leg_style'];

const UNIT_SUFFIXES: Record<string, Unit> = {
  length_cm: 'cm',
  width_cm: 'cm',
  height_cm: 'cm',
  top_thickness_cm: 'cm',
  leg_thickness_cm: 'cm',
  length_mm: 'mm',
  width_mm: 'mm',
  height_mm: 'mm',
  top_thickness_mm: 'mm',
  leg_thickness_mm: 'mm',
  length_m: 'm',
  width_m: 'm',
  height_m: 'm',
  top_thickness_m: 'm',
  leg_thickness_m: 'm',
};

function toCm(value: number, unit: Unit): number {
  switch (unit) {
    case 'mm':
      return value / 10;
    case 'in':
    case 'inch':
    case 'inches':
      return value * 2.54;
    case 'ft':
    case 'feet':
      return value * 30.48;
    case 'm':
    case 'meter':
    case 'meters':
      return value * 100;
    case 'cm':
    default:
      return value;
  }
}

function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/_(cm|mm|m)$/, '');
}

function normalizeLegStyle(value: unknown): LegStyle {
  return String(value).trim().toLowerCase() === 'round' ? 'round' : 'square';
}

function parseValueWithUnit(raw: string | number, fallbackUnit: Unit = 'cm'): number {
  if (typeof raw === 'number') return toCm(raw, fallbackUnit);

  const match = raw.trim().toLowerCase().match(/^(-?\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) throw new Error(`Cannot parse value: "${raw}"`);

  const numVal = Number(match[1]);
  const unit = (match[2] || fallbackUnit) as Unit;
  return toCm(numVal, unit);
}

export interface ParseResult {
  success: boolean;
  dimensions?: Dimensions;
  errors?: string[];
}

function parseCSV(content: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(content.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length) {
    return { success: false, errors: result.errors.map((error) => error.message) };
  }

  const rows = result.data;
  if (!rows.length) {
    return { success: false, errors: ['CSV file has no data rows.'] };
  }

  const dimMap: Record<string, number> = {};
  let legStyle: LegStyle = 'square';

  try {
    if ('field' in rows[0]) {
      for (const row of rows) {
        const field = normalizeKey(row.field || '');
        if (!field) continue;

        if (field === 'leg_style') {
          legStyle = normalizeLegStyle(row.value);
          continue;
        }

        const unit = ((row.unit || 'cm').trim().toLowerCase() || 'cm') as Unit;
        dimMap[field] = parseValueWithUnit(row.value, unit);
      }
    } else {
      const row = rows[0];
      for (const key of Object.keys(row)) {
        const normalized = normalizeKey(key);
        if (normalized === 'leg_style') {
          legStyle = normalizeLegStyle(row[key]);
          continue;
        }
        dimMap[normalized] = parseValueWithUnit(row[key], UNIT_SUFFIXES[key.toLowerCase()] ?? 'cm');
      }
    }
  } catch (error) {
    return { success: false, errors: [error instanceof Error ? error.message : 'Could not parse CSV values.'] };
  }

  return buildDimensions(dimMap, legStyle);
}

function parseJSON(content: string): ParseResult {
  try {
    const json = JSON.parse(content);
    const raw = json.dimensions ?? json;
    const dimMap: Record<string, number> = {};
    let legStyle = normalizeLegStyle(raw.leg_style ?? json.leg_style);

    for (const key of Object.keys(raw)) {
      const normalized = normalizeKey(key);
      if (normalized === 'leg_style') {
        legStyle = normalizeLegStyle(raw[key]);
        continue;
      }

      if (typeof raw[key] === 'number' || typeof raw[key] === 'string') {
        dimMap[normalized] = parseValueWithUnit(raw[key], UNIT_SUFFIXES[key.toLowerCase()] ?? 'cm');
      }
    }

    return buildDimensions(dimMap, legStyle);
  } catch (error) {
    return { success: false, errors: [`JSON parse error: ${error instanceof Error ? error.message : 'Invalid JSON'}`] };
  }
}

function buildDimensions(dimMap: Record<string, number>, legStyle: LegStyle = 'square'): ParseResult {
  const errors: string[] = [];

  for (const key of ['length', 'width', 'height']) {
    if (dimMap[key] === undefined || !Number.isFinite(dimMap[key]) || dimMap[key] <= 0) {
      errors.push(`Missing or invalid required field: "${key}"`);
    }
  }

  if (errors.length) return { success: false, errors };

  return {
    success: true,
    dimensions: {
      length_cm: roundCm(dimMap.length),
      width_cm: roundCm(dimMap.width),
      height_cm: roundCm(dimMap.height),
      top_thickness_cm: roundCm(dimMap.top_thickness ?? 4),
      leg_thickness_cm: roundCm(dimMap.leg_thickness ?? 5),
      leg_style: legStyle,
    },
  };
}

function roundCm(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseDimensionFile(content: string, mimeType: string): ParseResult {
  const trimmed = content.trimStart();
  const isJson = mimeType.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[');
  return isJson ? parseJSON(content) : parseCSV(content);
}

export function formatDimensionsSummary(d: Dimensions): string {
  return `L ${d.length_cm}cm x W ${d.width_cm}cm x H ${d.height_cm}cm`;
}
