import Link from 'next/link'
import { getCurrentUserWithProfile } from '@/utils/supabase/queries'

export default async function Navbar() {
  const { user, profile } = await getCurrentUserWithProfile()

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          fly<span className="text-orange-500">drop</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/trips" className="hover:text-orange-500">
            Viagens
          </Link>
          <Link href="/orders" className="hover:text-orange-500">
            Pedidos
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-orange-500">
                Painel
              </Link>
              <Link
                href="/profile"
                className="hover:text-orange-500"
              >
                {profile?.full_name?.split(' ')[0] || 'Perfil'}
              </Link>
              <form action="/auth/signout" method="post">
                <button className="text-neutral-500 hover:text-orange-500">Sair</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-orange-500">
                Entrar
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600"
              >
                Cadastrar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
