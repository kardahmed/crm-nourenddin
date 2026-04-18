import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F9FC] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src="/logo-180.png" alt="IMMO PRO-X" className="h-12 w-12" />
          <span className="text-2xl font-bold text-[#0A2540]">IMMO PRO-X</span>
        </div>

        <div className="rounded-2xl border border-[#E3E8EF] bg-white p-8 shadow-lg shadow-black/[0.04]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0579DA]/10">
            <ShieldAlert className="h-7 w-7 text-[#0579DA]" />
          </div>
          <h1 className="text-xl font-bold text-[#0A2540]">Inscription desactivee</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#8898AA]">
            Contactez votre administrateur pour obtenir un compte.
          </p>
          <Link
            to="/login"
            className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[#0579DA] text-sm font-bold text-white transition-all hover:bg-[#0460B8] hover:shadow-lg hover:shadow-[#0579DA]/20"
          >
            Se connecter
          </Link>
        </div>

        <p className="mt-4 text-center text-[13px] text-[#8898AA]">
          Deja inscrit ? <Link to="/login" className="font-medium text-[#0579DA] hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
