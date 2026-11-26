# Scenario packs

A pack is the content of the drill: the platform, its "tenants" (restaurants here), services,
people and wording. The generator turns a pack plus a seed into an incident with exactly one
correct rollback.

## Fields

| Field | What it is |
|---|---|
| `id`, `name`, `platform` | Identifiers and the platform shown to players |
| `restaurants` | At least 9 `{ "name", "area" }` entries with unique names (any kind of tenant works) |
| `services`, `authors`, `flagNames` | Used to fill change titles and metadata |
| `headlines` | Incident titles |
| `errorMessages` | One is picked per incident as the symptom |
| `healthyMessages` | Shown for healthy restaurants |
| `changeTitles.deploy` / `.flag_rollout` / `.config_change` | Templates with `{service}`, `{version}`, `{flag}` |

## Add a pack

1. Copy `food-delivery.json` and edit it. Keep everything fictional.
2. Run `npm run validate-scenarios`. It checks the fields and proves 2,000 incidents are solvable.
3. Register the pack in `src/game/packs.ts` (add it to `PACKS`; set `DEFAULT_PACK` to play it).
