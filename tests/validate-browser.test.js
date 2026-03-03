import { describe, it, expect } from 'vitest';
import { validate, listSchemas, getSchema } from '../src/validate-browser.js';
import { validate as validateNode, listSchemas as listSchemasNode } from '../src/validate.js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures');

describe('validate-browser', () => {
  describe('listSchemas', () => {
    it('returns all 16 schemas', () => {
      const names = listSchemas();
      expect(names).toHaveLength(16);
    });

    it('matches the Node entrypoint schema list', () => {
      expect(listSchemas()).toEqual(listSchemasNode());
    });
  });

  describe('getSchema', () => {
    it('returns a schema object for a valid name', () => {
      const schema = getSchema('resolved_map.v1');
      expect(schema).toBeDefined();
      expect(schema.$id).toContain('resolved_map.v1');
    });

    it('returns undefined for an unknown name', () => {
      expect(getSchema('nonexistent.v1')).toBeUndefined();
    });

    it('returns schemas for every listed name', () => {
      for (const name of listSchemas()) {
        const schema = getSchema(name);
        expect(schema, `getSchema("${name}") should return a schema`).toBeDefined();
        expect(schema.$id).toContain(name);
      }
    });
  });

  describe('validate', () => {
    it('returns { valid: true } for a valid fixture', () => {
      const fixture = JSON.parse(
        readFileSync(join(FIXTURES_DIR, 'resolved_map.v1.example.json'), 'utf-8')
      );
      const result = validate('resolved_map.v1', fixture);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns errors for invalid data', () => {
      const result = validate('resolved_map.v1', { bad: 'data' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('returns error for unknown schema', () => {
      const result = validate('nonexistent.v1', {});
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Unknown schema: "nonexistent.v1"']);
    });

    it('produces identical results to the Node entrypoint for all fixtures', () => {
      const fixtureFiles = readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.example.json'));
      for (const file of fixtureFiles) {
        const name = file.replace('.example.json', '');
        const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, file), 'utf-8'));
        const browserResult = validate(name, fixture);
        const nodeResult = validateNode(name, fixture);
        expect(browserResult, `Mismatch for ${name}`).toEqual(nodeResult);
      }
    });
  });
});
