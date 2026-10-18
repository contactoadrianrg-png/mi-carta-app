import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

/* ── Animaciones ──────────────────────────────────────────────
   Van aquí y no en index.css / tailwind.config.js a propósito:
   el componente es autocontenido. Todo dentro de
   prefers-reduced-motion: no-preference — sin animación los
   elementos ya están en su estado final y visibles.          */
const HERO_CSS = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes msa-rise {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes msa-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-3px); }
  }
  .msa-rise  { animation: msa-rise .55s cubic-bezier(.22,.61,.36,1) both; }
  .msa-float { animation: msa-float 8s ease-in-out infinite; }
}
`

/* Contenido de muestra de la carta. Sin precios y sin fotos:
   los recuadros de imagen quedan en gris hasta tener fotos reales. */
const CATEGORIES = ['Entrantes', 'Principales', 'Postres']
const DISHES = ['Pasta cremosa', 'Tarta de queso']

/* ── Cabecera del móvil de muestra ──────────────────────────── */
function PhoneHeader() {
  return (
    <div className="bg-[#FF6B35] px-3 pt-3 pb-2.5">
      <p className="text-white text-[11px] font-bold leading-tight">Nuestra carta</p>
      <p className="text-white/75 text-[8px] leading-tight mt-0.5">messa.app</p>
    </div>
  )
}

/* ── Marco del móvil ────────────────────────────────────────── */
function Phone({ tilt, floatDelay, children }) {
  return (
    <div style={{ transform: `rotate(${tilt}deg)` }}>
      <div className="msa-float" style={{ animationDelay: floatDelay }}>
        <div className="w-[150px] sm:w-[168px] rounded-[26px] bg-white border border-[#EFE4DA] p-2 shadow-[0_8px_24px_rgba(26,26,26,0.07)]">
          <div className="rounded-[20px] overflow-hidden bg-[#FFF8F2]">
            <PhoneHeader />
            <div className="p-2.5">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FFF8F2] text-[#1A1A1A]">
      <style>{HERO_CSS}</style>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="overflow-hidden px-5 pt-10 pb-14 sm:pt-14">
        <div className="max-w-md mx-auto text-center sm:max-w-lg">

          {/* Logo */}
          <p
            className="msa-rise text-[22px] font-bold tracking-tight text-[#FF6B35]"
            style={{ animationDelay: '.05s' }}
          >
            Messa
          </p>

          {/* Titular */}
          <h1
            className="msa-rise mt-6 text-[30px] sm:text-[38px] font-bold leading-[1.18] tracking-tight"
            style={{ animationDelay: '.15s' }}
          >
            La carta de tu restaurante,{' '}
            <span className="text-[#FF6B35]">en el móvil.</span>
          </h1>

          {/* Subtítulo */}
          <p
            className="msa-rise mt-4 text-[15px] sm:text-[17px] text-[#1A1A1A]/60"
            style={{ animationDelay: '.25s' }}
          >
            Tus platos. Tus precios. Siempre al día.
          </p>

          {/* Botones */}
          <div
            className="msa-rise mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center"
            style={{ animationDelay: '.35s' }}
          >
            <a
              href="/carta/comeycalla-mp3s28ri"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-2xl bg-[#FF6B35] px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#F25C25]"
            >
              Ver carta de ejemplo
            </a>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-2xl border border-[#FF6B35] px-7 py-3.5 text-[15px] font-semibold text-[#FF6B35] transition-colors hover:bg-[#FF6B35]/5"
            >
              Crear mi carta
            </Link>
          </div>

          {/* Enlace secundario */}
          <p className="msa-rise mt-5" style={{ animationDelay: '.45s' }}>
            <Link to="/login" className="text-[13px] text-[#1A1A1A]/50 underline-offset-4 hover:underline">
              Ya tengo cuenta
            </Link>
          </p>

          {/* ── Móviles de muestra ── */}
          <div className="mt-12 flex items-start justify-center gap-3 sm:gap-6">

            {/* Móvil 1 — categorías */}
            <Phone tilt={-6} floatDelay="0s">
              {CATEGORIES.map((cat, i) => (
                <div
                  key={cat}
                  className="msa-rise flex items-center justify-between rounded-xl bg-white px-2.5 py-2 mb-1.5 last:mb-0"
                  style={{ animationDelay: `${0.6 + i * 0.12}s` }}
                >
                  <span className="text-[10px] font-semibold text-[#1A1A1A]">{cat}</span>
                  <ChevronRight size={11} className="text-[#FF6B35]" />
                </div>
              ))}
            </Phone>

            {/* Móvil 2 — platos destacados */}
            <Phone tilt={5} floatDelay="-4s">
              {DISHES.map((dish, i) => (
                <div
                  key={dish}
                  className="msa-rise rounded-xl bg-white p-2 mb-2 last:mb-0"
                  style={{ animationDelay: `${0.78 + i * 0.12}s` }}
                >
                  {/* Hueco de foto: gris hasta tener imágenes reales */}
                  <div className="h-12 rounded-lg bg-[#ECECEC]" />
                  <p className="mt-1.5 text-[9.5px] font-semibold leading-snug text-[#1A1A1A]">
                    {dish}
                  </p>
                </div>
              ))}
            </Phone>
          </div>
        </div>
      </section>

      {/* TODO: cómo funciona · funciones · precios · preguntas frecuentes */}
    </div>
  )
}
