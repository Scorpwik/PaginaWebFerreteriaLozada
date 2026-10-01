import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { QuoteDayCount } from '@/data/admin/stats'
import { AdminCard } from './FormControls'

function tickLabel(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  return `${day}/${month}`
}

export function QuotesByDayChart({ data }: { data: QuoteDayCount[] }) {
  return (
    <AdminCard
      title="Cotizaciones por día"
      description="Últimos 15 días, la misma ventana en la que se conservan las cotizaciones."
    >
      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid
              stroke="var(--color-ink-100)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={tickLabel}
              tick={{ fontSize: 11, fill: 'var(--color-ink-500)' }}
              axisLine={{ stroke: 'var(--color-ink-200)' }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              width={36}
              tick={{ fontSize: 11, fill: 'var(--color-ink-500)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-brand-50)' }}
              formatter={(value) => {
                const count = typeof value === 'number' ? value : Number(value ?? 0)
                const label = count === 1 ? 'cotización' : 'cotizaciones'
                return [`${count} ${label}`]
              }}
              labelFormatter={(label) => tickLabel(String(label))}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--color-ink-100)',
                fontSize: 13,
              }}
            />
            <Bar
              dataKey="count"
              fill="var(--color-brand-600)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AdminCard>
  )
}
