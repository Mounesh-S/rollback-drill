// The rules of one round as a pure state machine. No timers, no DOM: easy to test and explain.
//
//   intro --start--> playing --submit--> done (answered)
//                            --timeout-> done (timeout)
// A round that was started but never finished (page reloaded) is recorded as 'abandoned'.

export type Ending = 'answered' | 'timeout' | 'abandoned'

export interface RoundState {
  phase: 'intro' | 'playing' | 'done'
  startedAt: number | null // clock ms when Start was pressed
  selectedId: string | null // change the player is about to roll back
  answerId: string | null // first and only submitted answer
  decisionMs: number | null
  ending: Ending | null
  tabLeft: boolean // the tab was hidden at any point while playing
}

export type RoundAction =
  | { type: 'start'; now: number }
  | { type: 'select'; changeId: string }
  | { type: 'submit'; now: number }
  | { type: 'timeout' }
  | { type: 'tabLeft' }

export const initialRound: RoundState = {
  phase: 'intro',
  startedAt: null,
  selectedId: null,
  answerId: null,
  decisionMs: null,
  ending: null,
  tabLeft: false,
}

export function roundReducer(state: RoundState, action: RoundAction): RoundState {
  switch (action.type) {
    case 'start':
      return state.phase === 'intro' ? { ...state, phase: 'playing', startedAt: action.now } : state
    case 'select':
      return state.phase === 'playing' ? { ...state, selectedId: action.changeId } : state
    case 'submit':
      if (state.phase !== 'playing' || state.selectedId === null || state.startedAt === null) return state
      return {
        ...state,
        phase: 'done',
        answerId: state.selectedId,
        decisionMs: Math.max(0, Math.round(action.now - state.startedAt)),
        ending: 'answered',
      }
    case 'timeout':
      return state.phase === 'playing' ? { ...state, phase: 'done', ending: 'timeout' } : state
    case 'tabLeft':
      return state.phase === 'playing' ? { ...state, tabLeft: true } : state
  }
}

export interface RoundScore {
  correct: boolean // the player named the culprit
  counts: boolean // ...and it counts for the experiment's primary metric
}

/** Primary metric rule: correct first answer, in time, without leaving the tab. */
export function scoreRound(state: RoundState, culpritId: string): RoundScore {
  const correct = state.ending === 'answered' && state.answerId === culpritId
  return { correct, counts: correct && !state.tabLeft }
}
