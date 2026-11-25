import './screens.css'

interface IntroProps {
  timerSeconds: number
  practice: boolean
  onStart: () => void
}

export function Intro({ timerSeconds, practice, onStart }: IntroProps) {
  return (
    <main className="screen">
      {practice && <p className="banner">Practice mode: nothing is recorded.</p>}
      <h1>Rollback Drill</h1>
      <p className="lead">
        Dinner rush. Orders are failing at some restaurants, and three changes shipped in the last half hour. You
        have {timerSeconds} seconds to choose which one to roll back first.
      </p>
      <ol className="rules">
        <li>You get one attempt. Only your first answer counts.</li>
        <li>Stay on this tab until you answer.</li>
        <li>No outside help, please: no AI, no friends. We're testing the screen, not you.</li>
      </ol>
      <button className="btn" type="button" onClick={onStart} autoFocus>
        Start the {timerSeconds}-second drill
      </button>
      <p className="privacy">
        Privacy: this browser stores a random ID so you get one attempt. No name, email or tracking cookies.
      </p>
    </main>
  )
}
