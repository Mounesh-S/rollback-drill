# Flagsmith setup, step by step

The exact commands used to set up this experiment with the Flagsmith CLI (v2). Replace
`<ENV>` with the environment's client-side key and the ids with the ones each command returns.

```bash
flagsmith login
flagsmith init --project <project id> --environment <ENV>

# 1. Flags (created project-wide)
flagsmith feature create incident_evidence_layout --value chronological --enabled
flagsmith feature variant add incident_evidence_layout --value grouped --key grouped --weight 0
flagsmith feature create game_enabled --enabled
flagsmith feature create drill_config --value '{"timerSeconds":75}' --enabled

# 2. Metrics (per environment). Metric direction accepts: up, down, informational.
M=api/v1/environments/<ENV>/experiment-metrics/
echo '{"name":"correct_first_rollback","aggregation":"occurrence","direction":"up","definition":{"version":1,"event":"correct_first_rollback"}}' | flagsmith api $M --input -
echo '{"name":"decision_time_ms","aggregation":"mean","direction":"down","definition":{"version":1,"event":"decision_submitted"}}' | flagsmith api $M --input -
echo '{"name":"decision_submitted","aggregation":"occurrence","direction":"up","definition":{"version":1,"event":"decision_submitted"}}' | flagsmith api $M --input -
echo '{"name":"tab_left","aggregation":"occurrence","direction":"down","definition":{"version":1,"event":"tab_left"}}' | flagsmith api $M --input -
echo '{"name":"self_reported_help","aggregation":"occurrence","direction":"informational","definition":{"version":1,"event":"self_reported_help"}}' | flagsmith api $M --input -

# 3. Experiment. All metrics must be attached now: they cannot be changed later.
#    expected_direction accepts: increase, decrease, not_increase, not_decrease.
echo '{"feature":<flag id>,"name":"Rollback Drill","hypothesis":"...",
  "metrics":[{"metric":<correct_first_rollback>,"expected_direction":"increase"},
             {"metric":<decision_time_ms>,"expected_direction":"decrease"},
             {"metric":<decision_submitted>,"expected_direction":"not_decrease"},
             {"metric":<tab_left>,"expected_direction":"not_increase"},
             {"metric":<self_reported_help>,"expected_direction":"not_increase"}],
  "experiment_rollout":{"enabled":true,"rollout_percentage":100,
    "feature_state_value":{"type":"string","value":"chronological"},
    "multivariate_feature_state_values":[{"multivariate_feature_option":<grouped variant id>,"percentage_allocation":50}]}}' \
  | flagsmith api api/v1/environments/<ENV>/experiments/ --input -

# 4. Start, then confirm a new identity is enrolled before sharing the link
flagsmith api api/v1/environments/<ENV>/experiments/<id>/start/ -X POST
curl -s "https://edge.api.flagsmith.com/api/v1/identities/?identifier=probe-$(date +%s)" \
  -H "X-Environment-Key: <ENV>"      # flags[].metadata.experiment.in_experiment must be true

# 5. Results (refresh allowed once every 5 minutes)
flagsmith api api/v1/environments/<ENV>/experiments/<id>/results/refresh/ -X POST
flagsmith api api/v1/environments/<ENV>/experiments/<id>/results/ > results.json
npm run srm -- results.json

# 6. End: keep control, or roll the winning variant out to everyone
echo '{"rollout_decision":"control"}' | flagsmith api api/v1/environments/<ENV>/experiments/<id>/complete/ -X POST --input -
echo '{"rollout_decision":"variant","rollout_variant":<grouped variant id>}' | flagsmith api api/v1/environments/<ENV>/experiments/<id>/complete/ -X POST --input -
```
