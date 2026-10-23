import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { IconChartBar } from '@tabler/icons-react'

const ORANGE = '#E65100'
const ORANGE_LIGHT = '#FFF3E0'
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function getMondayOfCurrentWeek() {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function trendPct(current, previous) {
  if (!previous || previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/* ── Metric card ─────────────────────────────────────── */
function MetricCard({ value, label, trend }) {
  return (
    <div style={{
      background: '#FFF', borderRadius: 16,
      border: '0.5px solid #E5E7EB',
      padding: '14px 10px', textAlign: 'center',
    }}>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1A1A1A', lineHeight: 1 }}>
        {value ?? '—'}
      </p>
      {trend !== null && trend !== undefined && (
        <p style={{ margin: '4px 0 2px', fontSize: 10, fontWeight: 700, color: '#22C55E', lineHeight: 1 }}>
          ↑ {Math.abs(trend)}%
        </p>
      )}
      <p style={{
        margin: trend !== null && trend !== undefined ? 0 : '5px 0 0',
        fontSize: 10, color: '#9CA3AF', lineHeight: 1.3,
      }}>
        {label}
      </p>
    </div>
  )
}

/* ── Main component ──────────────────────────────────── */
export default function StatsPanel({ restaurantId }) {
  const [period, setPeriod] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [tablesMissing, setTablesMissing] = useState(false)

  // Metric counters
  const [cartaTotal, setCartaTotal]       = useState(0)
  const [plateTotal, setPlateTotal]       = useState(0)
  const [cartaPrev, setCartaPrev]         = useState(0)
  const [platePrev, setPlatePrev]         = useState(0)

  // Chart — current calendar week
  const [weekCounts, setWeekCounts] = useState(Array(7).fill(0))

  // Ranking
  const [topPlates, setTopPlates] = useState([])

  useEffect(() => {
    if (!restaurantId) return
    load()
  }, [restaurantId, period])

  async function load() {
    setLoading(true)

    const now        = new Date()
    const monday     = getMondayOfCurrentWeek()
    const sunday     = new Date(monday); sunday.setDate(monday.getDate() + 7)

    // Previous week bounds (for trend)
    const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7)

    // Period start date
    let periodFrom = null
    let prevFrom   = null
    let prevTo     = null

    if (period === '7d') {
      periodFrom = monday
      prevFrom   = prevMonday
      prevTo     = monday
    } else if (period === '30d') {
      periodFrom = new Date(now - 30 * 24 * 60 * 60 * 1000)
      prevFrom   = new Date(now - 60 * 24 * 60 * 60 * 1000)
      prevTo     = periodFrom
    }
    // 'total' → no date filter

    try {
      // ── Carta views counter (period)
      let cq = supabase.from('carta_views').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId)
      if (periodFrom) cq = cq.gte('viewed_at', periodFrom.toISOString())
      const { count: cCount, error: cErr } = await cq
      if (cErr) { setTablesMissing(true); setLoading(false); return }
      setCartaTotal(cCount ?? 0)

      // ── Plate views counter (period)
      let pq = supabase.from('plate_views').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId)
      if (periodFrom) pq = pq.gte('viewed_at', periodFrom.toISOString())
      const { count: pCount } = await pq
      setPlateTotal(pCount ?? 0)

      // ── Previous period counters (trend)
      if (prevFrom && prevTo) {
        const [prevC, prevP] = await Promise.all([
          supabase.from('carta_views').select('*', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .gte('viewed_at', prevFrom.toISOString())
            .lt('viewed_at', prevTo.toISOString()),
          supabase.from('plate_views').select('*', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .gte('viewed_at', prevFrom.toISOString())
            .lt('viewed_at', prevTo.toISOString()),
        ])
        setCartaPrev(prevC.count ?? 0)
        setPlatePrev(prevP.count ?? 0)
      } else {
        setCartaPrev(0); setPlatePrev(0)
      }

      // ── Current week chart data (always Mon–Sun of current week)
      const { data: weekData } = await supabase
        .from('carta_views')
        .select('viewed_at')
        .eq('restaurant_id', restaurantId)
        .gte('viewed_at', monday.toISOString())
        .lt('viewed_at', sunday.toISOString())

      const counts = Array(7).fill(0)
      ;(weekData || []).forEach(row => {
        const d   = new Date(row.viewed_at)
        const idx = (d.getDay() + 6) % 7 // Monday = 0
        counts[idx]++
      })
      setWeekCounts(counts)

      // ── Top plates (all time, for ranking)
      let allPlatesQ = supabase.from('plate_views').select('plate_name').eq('restaurant_id', restaurantId)
      if (periodFrom) allPlatesQ = allPlatesQ.gte('viewed_at', periodFrom.toISOString())
      const { data: platesData } = await allPlatesQ

      const tally = {}
      ;(platesData || []).forEach(r => {
        if (!r.plate_name) return
        tally[r.plate_name] = (tally[r.plate_name] || 0) + 1
      })
      const sorted = Object.entries(tally)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))
      setTopPlates(sorted)

    } catch {
      setTablesMissing(true)
    }

    setLoading(false)
  }

  /* ── Loading ─────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: ORANGE }} />
      </div>
    )
  }

  /* ── Tables missing (SQL not run yet) ───────────── */
  if (tablesMissing) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <IconChartBar size={48} color="#D1D5DB" />
        <p style={{ margin: '16px 0 6px', fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>
          Estadísticas no configuradas
        </p>
        <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF', lineHeight: 1.6, maxWidth: 280, marginInline: 'auto' }}>
          Ejecuta el SQL de migración en Supabase para activar el tracking.
        </p>
      </div>
    )
  }

  /* ── Empty state ─────────────────────────────────── */
  const isEmpty = cartaTotal === 0 && plateTotal === 0
  if (isEmpty) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <IconChartBar size={48} color="#D1D5DB" />
        <p style={{ margin: '16px 0 6px', fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>
          Aún no hay visitas registradas
        </p>
        <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF', lineHeight: 1.6, maxWidth: 260, marginInline: 'auto' }}>
          Comparte tu carta para empezar a ver estadísticas.
        </p>
      </div>
    )
  }

  const maxWeek    = Math.max(...weekCounts, 1)
  const cartaTrend = period !== 'total' ? trendPct(cartaTotal, cartaPrev) : null
  const plateTrend = period !== 'total' ? trendPct(plateTotal, platePrev) : null

  return (
    <div style={{ padding: '20px 16px 8px' }}>

      {/* ── 3 metric cards ─────────────────────────── */}
      <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>
        Resumen
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        <MetricCard value={cartaTotal} label="Visitas carta"  trend={cartaTrend} />
        <MetricCard value={plateTotal} label="Clics platos"   trend={plateTrend} />
        <MetricCard value="—"          label="T. medio"        trend={null} />
      </div>

      {/* ── Bar chart ──────────────────────────────── */}
      <div style={{
        background: '#FFF', borderRadius: 16,
        border: '0.5px solid #E5E7EB',
        padding: '16px 16px 12px', marginBottom: 16,
      }}>
        {/* Header + period filter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>
            Visitas esta semana
          </p>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['7d', '7d'], ['30d', '30d'], ['total', 'Total']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setPeriod(val)}
                style={{
                  padding: '3px 9px', borderRadius: 99,
                  fontSize: 11, fontWeight: 600,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: period === val ? ORANGE : '#F3F4F6',
                  color:      period === val ? '#FFF'  : '#6B7280',
                  transition: 'background 0.15s',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
          {weekCounts.map((val, i) => {
            const isMax = val > 0 && val === maxWeek
            const barH  = val > 0 ? Math.max((val / maxWeek) * 80, 6) : 3
            return (
              <div key={i} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end',
              }}>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  background: isMax ? ORANGE : ORANGE_LIGHT,
                  height: barH,
                  transition: 'height 0.35s ease',
                }} />
                <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>
                  {DAY_LABELS[i]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Ranking platos más vistos ───────────────── */}
      {topPlates.length > 0 && (
        <div style={{
          background: '#FFF', borderRadius: 16,
          border: '0.5px solid #E5E7EB', padding: 16,
          marginBottom: 8,
        }}>
          <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>
            Platos más vistos
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topPlates.map((plate, i) => {
              const pct = Math.round((plate.count / topPlates[0].count) * 100)
              const isFirst = i === 0
              return (
                <div key={plate.name + i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: isFirst ? ORANGE_LIGHT : '#F9FAFB',
                  borderRadius: 10, padding: '10px 12px',
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, flexShrink: 0, width: 16,
                    color: isFirst ? ORANGE : '#9CA3AF',
                  }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: '0 0 5px', fontSize: 13, fontWeight: 600, color: '#1A1A1A',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {plate.name}
                    </p>
                    <div style={{ background: '#E5E7EB', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 99,
                        background: isFirst ? ORANGE : '#D1D5DB',
                      }} />
                    </div>
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                    color: isFirst ? ORANGE : '#6B7280',
                  }}>
                    {plate.count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
