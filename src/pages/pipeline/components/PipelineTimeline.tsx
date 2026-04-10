import { Check } from 'lucide-react'
import { PIPELINE_STAGES } from '@/types'
import type { PipelineStage } from '@/types'
import { PIPELINE_ORDER } from '@/lib/constants'

interface PipelineTimelineProps {
  currentStage: PipelineStage
  onStageClick: (stage: PipelineStage) => void
}

export function PipelineTimeline({ currentStage, onStageClick }: PipelineTimelineProps) {
  const currentIdx = PIPELINE_ORDER.indexOf(currentStage)

  return (
    <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-4">
      <div className="flex items-center">
        {PIPELINE_ORDER.map((stage, i) => {
          const meta = PIPELINE_STAGES[stage]
          const isPast = i < currentIdx
          const isCurrent = i === currentIdx

          return (
            <div key={stage} className="flex flex-1 items-center">
              {/* Connector line */}
              {i > 0 && (
                <div
                  className={`h-0.5 flex-1 ${
                    isPast || isCurrent ? 'bg-immo-accent-green' : 'bg-immo-border-default'
                  }`}
                />
              )}

              {/* Step circle */}
              <button
                onClick={() => onStageClick(stage)}
                title={meta.label}
                className="group relative flex flex-col items-center"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'border-immo-accent-green bg-immo-accent-green text-immo-bg-primary shadow-md shadow-immo-accent-green/25'
                      : isPast
                        ? 'border-immo-accent-green bg-immo-accent-green/15 text-immo-accent-green'
                        : 'border-immo-border-default bg-immo-bg-primary text-immo-text-muted hover:border-immo-text-muted'
                  }`}
                >
                  {isPast ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>

                {/* Label */}
                <span
                  className={`absolute -bottom-5 whitespace-nowrap text-[9px] ${
                    isCurrent
                      ? 'font-semibold text-immo-accent-green'
                      : isPast
                        ? 'text-immo-text-secondary'
                        : 'text-immo-text-muted'
                  }`}
                >
                  {meta.label}
                </span>
              </button>

              {/* Connector line after */}
              {i < PIPELINE_ORDER.length - 1 && i === PIPELINE_ORDER.length - 1 ? null : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
