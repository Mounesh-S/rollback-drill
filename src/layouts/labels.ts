import type { ChangeKind } from '../game/types.ts'

export const KIND_LABEL: Record<ChangeKind, string> = {
  deploy: 'DEPLOY',
  flag_rollout: 'FLAG',
  config_change: 'CONFIG',
}
