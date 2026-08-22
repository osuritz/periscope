import GameScreen from './ui/screens/GameScreen'
import PlacementScreen from './ui/screens/PlacementScreen'
import TitleScreen from './ui/screens/TitleScreen'
import VictoryScreen from './ui/screens/VictoryScreen'
import { useGameStore } from './ui/store/gameStore'

export default function App() {
  const screen = useGameStore((s) => s.screen)
  const phase = useGameStore((s) => s.game.phase)

  if (screen === 'title') return <TitleScreen />
  if (phase === 'setup') return <PlacementScreen />
  if (phase === 'over') return <VictoryScreen />
  return <GameScreen />
}
