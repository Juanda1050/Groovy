import { Navigate } from 'react-router-dom'
import { AuthForm } from '@/components/AuthForm'
import { PageSkeleton } from '@/components/PageSkeleton'
import { Card } from '@/components/ui/card'
import { useAuthForm } from '@/hooks/useAuthForm'
import { useAuthStore } from '@/stores/authStore'

export default function AuthPage() {
  const status = useAuthStore((state) => state.status)
  const form = useAuthForm()

  if (status === 'loading') {
    return <PageSkeleton />
  }

  if (status === 'authenticated') {
    return <Navigate to="/library" replace />
  }

  return (
    <section className="mx-auto w-full max-w-md sm:pt-4">
      <Card
        className="
          glassPanel gap-0 overflow-hidden
          rounded-2xl py-6 shadow-sm sm:rounded-3xl sm:py-8
        "
      >
        <AuthForm {...form} />
      </Card>
    </section>
  )
}