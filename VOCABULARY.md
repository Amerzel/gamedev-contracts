# Shared Vocabulary for ForgeContracts

**Authority:** This document defines the universal conventions for all data that crosses tool boundaries. Internal representations are unconstrained — these rules apply only at the point where one tool's output becomes another tool's input.

**Reference:** [RFC_SHARED_CONTRACTS.md](../docs/RFC_SHARED_CONTRACTS.md) (Rev 4)

---

## 1. Document Identity

Every JSON document at a tool boundary **MUST** have a `schema` field as the root-level discriminator:

```json
{
  "schema": "resolved_map.v1"
}
```

- Format: `<name>.v<N>` where `N` is a major version integer.
- The schema field is the primary way tools detect what kind of document they're reading.

Every document **SHOULD** include a `producer` stamp:

```json
{
  "producer": {
    "tool": "TerrainComposer",
    "version": "0.1.0",
    "generatedAt": "2026-02-24T15:30:00.000Z"
  }
}
```

**Deprecated fields** (do not use in new code):
- `contract_version` — redundant with the version in `schema`
- `contract_name` — redundant with the name in `schema`
- `producer_tool` / `producer_version` — use the `producer` object instead

---

## 2. Dimensions

Spatial dimensions at the document root **MUST** use flat integer fields:

```json
{
  "width": 150,
  "height": 100
}
```

**Do not use:** `size: { w: 150, h: 100 }` or any nested size object at the boundary.

Tools may use any internal representation they prefer. The conversion happens at serialization.

---

## 3. RLE Encoding

Tile layer data uses run-length encoding with the following format:

```json
{
  "encoding": "rle",
  "rows": [
    "0:150",
    "1:10,0:130,2:10",
    "0:150"
  ]
}
```

### Rules

- **Separator:** `:` between tile ID and run length (not `x`).
- **Structure:** Array of strings, one per row. This preserves row boundaries for O(1) row access without decoding the entire layer.
- **Each row string:** Comma-separated `tileId:runLength` pairs. Run lengths are always ≥ 1.
- **Encoding value:** `"rle"` (not `"rle-row-major"` or `"flat"`).
- **Tile IDs:** Non-negative integers matching entries in the `tileLookup` array.
- **Row count:** The `rows` array length **MUST** equal the document's `height`.
- **Row sum:** The sum of run lengths in each row **MUST** equal the document's `width`.

---

## 4. Tile Lookups

The `tileLookup` field maps numeric tile IDs (used in RLE data) to tile metadata:

```json
{
  "tileLookup": [
    { "id": 0, "tileId": "grass_base", "material": "grass", "kind": "base" },
    { "id": 1, "tileId": "dirt_grass_ms0001", "material": "dirt", "kind": "transition" },
    { "id": 2, "tileId": "water_base", "material": "water", "kind": "base" }
  ]
}
```

### Rules

- **Shape:** Array of objects, ordered by `id`.
- **`id` field:** **MUST be an integer.** This is the numeric value that appears in RLE-encoded row data. It is NOT the string `tileId`.
- **`tileId` field:** String slug identifying the tile in the terrain pack (e.g., `"grass_base"`).
- **`material` field:** String identifying the terrain material.
- **`kind` field:** One of `"base"`, `"transition"`, `"fallback"`.

**Do not use:** Dictionary keyed by string ID (e.g., `{"0": {tileId, kind}}`). The array format is self-describing and avoids the string-to-integer conversion bugs that caused silent data corruption.

---

## 5. Layer Names

Layers in a resolved map use these standard names:

| Name | Purpose |
|------|---------|
| `terrain` | Base ground material (the primary surface) |
| `transition` | Material boundary tiles (marching squares, etc.) |
| `clutter` | Decorative objects (rocks, flowers, grass tufts) |
| `object` | Interactive objects (chests, signs, doors) |
| `encounter` | Enemy/NPC spawn regions |

**Do not use:** `base` for the ground layer. Use `terrain`.

---

## 6. Metadata & Extensions

Documents may include a `meta` object with known fields and a tool-specific extension point:

```json
{
  "meta": {
    "description": "Ashwood Forest main zone",
    "extensions": {
      "director": {
        "source_zone": "ashwood-forest",
        "generated_by": "intent-v2"
      },
      "terrainComposer": {
        "wfc_enabled": true,
        "clutter_density": 0.3
      }
    }
  }
}
```

### Rules

- `meta` has a defined set of known fields per schema (e.g., `description`, `author`). These are validated strictly.
- `meta.extensions` allows `additionalProperties: true`. Tools put their custom metadata under `meta.extensions.<toolName>`.
- Consumers **MUST** ignore unknown keys under `meta.extensions`. They **MUST NOT** reject a document because of unfamiliar extensions.
- This replaces tool-specific workarounds like Director's `_director` namespace + `stripDirectorFields()`.

---

## 7. Cross-Tool References

When one tool's data references an entity owned by another tool, use prefixed IDs:

| Prefix | Tool | Example |
|--------|------|---------|
| `ea:` | EntityArchitect | `ea:iron-sword`, `ea:goblin-warrior` |
| `qf:` | QuestForge | `qf:goblin-hunt`, `qf:main-quest-chain` |
| `tc:` | TerrainComposer | `tc:lpc-terrain-basic` |
| `ec:` | EncounterComposer | `ec:wolf-pack-01` |
| `le:` | LoreEngine | `le:ashwood-lore` |

### Rules

- Format: `{prefix}:{kebab-case-id}`
- Bare IDs (without prefix) are used for tool-internal references only.
- Director's ref resolution system (`extractRefs` / `resolveRefs`) already uses this pattern — adopt universally.

---

## 8. Producer vs Provenance

Two distinct metadata concepts that **coexist** on the same document:

### Producer (who generated it)

```json
{
  "producer": {
    "tool": "TerrainComposer",
    "version": "0.1.0",
    "generatedAt": "2026-02-24T15:30:00.000Z"
  }
}
```

Answers: "What tool created this document, and when?"

### Provenance (what inputs were used)

```json
{
  "provenance": {
    "requestId": "req_abc123",
    "runId": "run_456",
    "semanticMapRef": "ashwood-forest_semantic.v1.json",
    "levelIntentRef": "ashwood-forest_intent.v1.json"
  }
}
```

Answers: "What source data was used to generate this document?"

Both fields are optional. `producer` is defined by this vocabulary (all tools). `provenance` is tool-specific (currently used by TerrainComposer) and its shape varies by schema.

---

## 9. Transition Positions

Transition entries in `terrain_pack.v1` and provenance records in `resolved_map.v1` use a `positions` array to identify which spatial locations around a tile have the secondary material present. This replaces the bit-encoded `cornerBits` string, which suffered from LSB-vs-MSB ambiguity across tools.

### Position Vocabularies per Model

Each tile model defines its own set of named positions:

**Marching Squares (MS-14)** — 4 corner positions:

```
UL ──── UR
│        │
│  tile  │
│        │
DL ──── DR
```

Enum: `DL`, `DR`, `UL`, `UR`

**Blob-47** — 8 neighbor directions:

```
NW   N   NE
  ╲  │  ╱
W ── ■ ── E
  ╱  │  ╲
SW   S   SE
```

Enum: `E`, `N`, `NE`, `NW`, `S`, `SE`, `SW`, `W`

Corner directions (`NE`, `SE`, `SW`, `NW`) require both adjacent edges to be set.

### Rules

- **Array order:** `positions` arrays **MUST** be alphabetically sorted. Example: case 5 → `["DR", "UL"]`, not `["UL", "DR"]`.
- **Uniqueness:** No duplicate entries. Schemas enforce `uniqueItems: true`.
- **Case-sensitive:** Values are uppercase. Schemas enforce exact enum matching.
- **Model-conditional validation:** The valid enum values depend on the `model` field. The schema uses `allOf` conditional blocks to validate the correct set per model.
- **`caseId` retained:** The numeric `case` field remains as an internal implementation detail for mask generator lookups. It is not deprecated.

### Field Authority During Migration

During the dual-write migration period (v1 schemas), both `positions` and `cornerBits` may be present. The authority rule is:

**`positions` is authoritative when present.** `cornerBits` exists solely for backward compatibility with consumers that have not yet adopted the named format.

**Reader algorithm (all consumers):**

1. If `positions` array is present → use it (authoritative)
2. Else if `case` (caseId) is present → derive via `idToPositions(case, model)`
3. Else if `cornerBits` is present → derive via `cornerBitsToId(bits, "lsb")` → `idToPositions()`
4. Else → error (insufficient data)

**Writer convention:** During dual-write, derive `positions` first (from the canonical case definition), then derive `cornerBits` from `positions` for backward compatibility. The named array is the source of truth at write time.

### Why This Replaced `cornerBits`

The bit-encoded `cornerBits` string had an inherent ambiguity: the compose pipeline wrote strings in LSB-first order (`[DR, UR, UL, DL]`), but JavaScript's `parseInt(raw, 2)` reads MSB-first. Different tools independently chose different conventions — the pack writer used LSB-first while the map resolver used `toString(2).padStart()` (MSB-first) — producing opposite strings for the same case without runtime failures (because the resolver keyed on numeric `caseId`). Named position arrays eliminate this class of encoding mismatch entirely.

---

## §10 — Asset & Engine Reference Policy

### Canonical references

- All cross-tool references in Forge contracts use abstract prefixed IDs (§7).
- Entity references: `ea:{kebab-case-id}` (e.g., `ea:ember-wolf`)
- Quest references: `qf:{kebab-case-id}`
- Behavior references: `behavior:{kebab-case-id}`
- Terrain/tileset references: `tc:{kebab-case-id}`, `ts:{kebab-case-id}`

### Pack-relative artifact paths

- Manifest artifact entries use pack-relative paths (e.g., `./terrain/resolved_map.v1.json`).
- Never absolute paths or engine-specific paths in manifests.

### Engine-specific path resolution

- Engine-specific paths (e.g., Godot `res://`, Unity `Assets/`) are resolved by the consumer adapter.
- Forge exports **MUST NOT** embed engine-specific paths in canonical contract outputs.
- Adapter outputs (e.g., `.tres` files, `.gd` scripts) **MAY** use engine paths — these are explicitly classified as adapter artifacts, not canonical contracts.

### referencePolicy field

- Exports that follow this policy **SHOULD** include `referencePolicy: 'abstract-id'` in their envelope.
- This signals to consumers that all references are abstract and need adapter resolution.

### Per-domain reference conventions

- Terrain tiles: pack-internal atlas coordinates (col/row in tileset)
- Entities: `ea:` prefixed IDs
- Quests: `qf:` prefixed IDs
- Encounters: reference entities via `ea:` IDs, quests via `qf:` IDs
- Behaviors: `behavior:` prefixed IDs, linked to entities via optional `behavior.ref` field in entity schema
- Assets: pack-relative paths within zone pack, or abstract asset IDs
