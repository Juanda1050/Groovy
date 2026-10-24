import { useMatch } from 'react-router-dom'

export function useAppLayout() {
  const authRoute = useMatch('/auth/*')

  return { showNavigation: authRoute === null }
}
