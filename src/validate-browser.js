import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import assetRequirements from '../schemas/asset_requirements.v1.schema.json' with { type: 'json' };
import compositionReport from '../schemas/composition_report.v1.schema.json' with { type: 'json' };
import encounterChangeSet from '../schemas/encounter_change_set.v1.schema.json' with { type: 'json' };
import entityCatalog from '../schemas/entity_catalog.v1.schema.json' with { type: 'json' };
import gameDesign from '../schemas/game_design.v1.schema.json' with { type: 'json' };
import levelIntent from '../schemas/level_intent.v1.schema.json' with { type: 'json' };
import materialRegistry from '../schemas/material_registry.v1.schema.json' with { type: 'json' };
import packCompleteness from '../schemas/pack_completeness.v1.schema.json' with { type: 'json' };
import populatedLevel from '../schemas/populated_level.v1.schema.json' with { type: 'json' };
import questCatalog from '../schemas/quest_catalog.v1.schema.json' with { type: 'json' };
import remediationRecipe from '../schemas/remediation_recipe.v1.schema.json' with { type: 'json' };
import resolvedMap from '../schemas/resolved_map.v1.schema.json' with { type: 'json' };
import terrainPack from '../schemas/terrain_pack.v1.schema.json' with { type: 'json' };
import tilesetRecipe from '../schemas/tileset_recipe.v1.schema.json' with { type: 'json' };
import validationReport from '../schemas/validation_report.v1.schema.json' with { type: 'json' };
import zone from '../schemas/zone.v1.schema.json' with { type: 'json' };

const schemas = {
  'asset_requirements.v1': assetRequirements,
  'composition_report.v1': compositionReport,
  'encounter_change_set.v1': encounterChangeSet,
  'entity_catalog.v1': entityCatalog,
  'game_design.v1': gameDesign,
  'level_intent.v1': levelIntent,
  'material_registry.v1': materialRegistry,
  'pack_completeness.v1': packCompleteness,
  'populated_level.v1': populatedLevel,
  'quest_catalog.v1': questCatalog,
  'remediation_recipe.v1': remediationRecipe,
  'resolved_map.v1': resolvedMap,
  'terrain_pack.v1': terrainPack,
  'tileset_recipe.v1': tilesetRecipe,
  'validation_report.v1': validationReport,
  'zone.v1': zone,
};

let _ajv = null;

function getAjv() {
  if (_ajv) return _ajv;
  _ajv = new Ajv({ allErrors: true, strict: false, validateSchema: false });
  addFormats(_ajv);
  for (const schema of Object.values(schemas)) {
    _ajv.addSchema(schema);
  }
  return _ajv;
}

/**
 * Validate data against a named contract schema.
 * @param {string} schemaName - Schema name, e.g. "resolved_map.v1"
 * @param {unknown} data - The data to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validate(schemaName, data) {
  const ajv = getAjv();
  const schemaId = `https://forge-contracts.amerzel.dev/${schemaName}.schema.json`;
  const validateFn = ajv.getSchema(schemaId);
  if (!validateFn) {
    return { valid: false, errors: [`Unknown schema: "${schemaName}"`] };
  }
  const valid = validateFn(data);
  if (valid) return { valid: true, errors: [] };
  const errors = validateFn.errors.map(
    e => `${e.instancePath || '/'}: ${e.message}`
  );
  return { valid: false, errors };
}

/**
 * List all available schema names.
 * @returns {string[]}
 */
export function listSchemas() {
  return Object.keys(schemas).sort();
}

/**
 * Get the raw JSON Schema object for a given schema name.
 * @param {string} schemaName - Schema name, e.g. "resolved_map.v1"
 * @returns {object|undefined}
 */
export function getSchema(schemaName) {
  return schemas[schemaName];
}
