import { createHash } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { listSchemas, validate } from '../src/validate.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures');

// Hardcoded canonical v1 schema list — update when adding new schemas
const CANONICAL_SCHEMAS = [
  'asset_requirements.v1',
  'encounter_change_set.v1',
  'entity_catalog.v1',
  'game_design.v1',
  'level_intent.v1',
  'material_registry.v1',
  'pack_completeness.v1',
  'populated_level.v1',
  'quest_catalog.v1',
  'remediation_recipe.v1',
  'resolved_map.v1',
  'terrain_pack.v1',
  'validation_report.v1',
  'zone.v1',
];

const fixtures = readdirSync(FIXTURES_DIR)
  .filter(f => f.endsWith('.example.json'))
  .map(f => ({
    name: f.replace('.example.json', ''),
    content: JSON.parse(readFileSync(join(FIXTURES_DIR, f), 'utf-8')),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

describe('Validation API Confidence', () => {
  it('listSchemas is deterministic and complete', () => {
    const schemas = listSchemas();
    // Must contain all canonical schemas
    for (const name of CANONICAL_SCHEMAS) {
      expect(schemas, `missing schema: ${name}`).toContain(name);
    }
    // Must be sorted
    expect(schemas).toEqual([...schemas].sort());
    // listSchemas() should be deterministic across calls
    expect(listSchemas()).toEqual(schemas);
  });

  it('validate accepts all golden fixtures', () => {
    for (const fixture of fixtures) {
      const result = validate(fixture.name, fixture.content);
      expect(result.valid, fixture.name).toBe(true);
      expect(result.errors).toEqual([]);
    }
  });

  it('returns explicit error for unknown schema', () => {
    expect(validate('missing_schema.v1', {})).toEqual({
      valid: false,
      errors: ['Unknown schema: "missing_schema.v1"'],
    });
  });

  it('returns validation errors for malformed data', () => {
    const invalid = structuredClone(fixtures[0].content);
    delete invalid.schema;
    const result = validate(fixtures[0].name, invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('keeps seeded resolved_map golden fixture stable', () => {
    const resolvedMap = JSON.parse(
      readFileSync(join(FIXTURES_DIR, 'resolved_map.v1.example.json'), 'utf-8')
    );
    expect(resolvedMap.seed).toBe(42);
    const hash = createHash('sha256')
      .update(JSON.stringify(resolvedMap))
      .digest('hex');
    expect(hash).toBe('ebb34dc61afbdc5ffac8b5f1c3f8a251248ae123f97f464600ba454b2d8e6380');
  });
});
