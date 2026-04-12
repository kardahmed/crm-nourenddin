import { Check, RotateCcw, XCircle } from 'lucide-react'
import { PIPELINE_STAGES } from '@/types'
import type { PipelineStage } from '@/types'

const PROGRESSION_STAGES: PipelineStage[] = [
  'accueil', 'visite_a_gerer', 'visite_confirmee', 'visite_terminee',
  'negociation', 'reservation', 'vente',
]

const END_STAGES: PipelineStage[] = ['relancement', 'perdue']

interface PipelineTimelineProps {
  currentStage: PipelineStage
  onStageClick: (stage: PipelineStage) => void
}

export function PipelineTimeline({ currentStage, onStageClick }: PipelineTimelineProps) {
  const isEndState = END_STAGES.includes(currentStage)
  const currentIdx = isEndState ? -1 : PROGRESSION_STAGES.indexOf(currentStage)

  return (
    <div className="rounded-xl border border-immo-border-default bg-immo-bg-card p-4">
      {/* Main progression - use relative positioning for the line */}
      <div className="relative flex items-center justify-between">
        {/* Background line connecting all circles */}
        <div className="absolute left-[14px] right-[14px] top-[14px] h-0.5 bg-immo-border-default" />
        {/* Progress line */}
        {currentIdx > 0 && !isEndState && (
          <div className="absolute left-[14px] top-[14px] h-0.5 bg-immo-accent-green" style={{ width: `${(currentIdx / (PROGRESSION_STAGES.length - 1)) * 100}%` }} />
        )}

        {PROGRESSION_STAGES.map((stage, i) => {
          const meta = PIPELINE_STAGES[stage]
          const isPast = !isEndState && i < currentIdx
          const isCurrent = !isEndState && i === currentIdx

          return (
            <button key={stage} onClick={() => onStageClick(stage)} title={meta.label}
              className="relative z-10 flex flex-col items-center">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all ${
                isCurrent
                  ? 'border-immo-accent-green bg-immo-accent-green text-white shadow-md shadow-immo-accent-green/25'
                  : isPast
                    ? 'border-immo-accent-green bg-immo-accent-green/15 text-immo-accent-green'
                    : 'border-immo-border-default bg-immo-bg-card text-immo-text-muted hover:border-immo-text-muted'
              }`}>
                {isPast ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`mt-1.5 whitespace-nowrap text-[9px] ${
                isCurrent ? 'font-semibold text-immo-accent-green' :
                isPast ? 'text-immo-text-secondary' : 'text-immo-text-muted'
              }`}>
                {meta.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* End state banner */}
      {isEndState && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
            currentStage === 'perdue'
              ? 'bg-immo-status-red/10 text-immo-status-red border border-immo-status-red/20'
              : 'bg-immo-status-orange/10 text-immo-status-orange border border-immo-status-orange/20'
          }`}>
            {currentStage === 'perdue' ? <XCircle className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
            {PIPELINE_STAGES[currentStage].label}
          </div>
          <button onClick={() => onStageClick('accueil')}
            className="rounded-full border border-immo-accent-green/30 bg-immo-accent-green/5 px-3 py-1.5 text-[10px] font-medium text-immo-accent-green hover:bg-immo-accent-green/10">
            Remettre dans le pipeline
          </button>
        </div>
      )}

      {/* Quick access to end states */}
      {!isEndState && (
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => onStageClick('relancement')}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-immo-status-orange/30 text-immo-status-orange hover:bg-immo-status-orange/10 transition-colors" title="Relancement">
            <RotateCcw className="h-3 w-3" />
          </button>
          <button onClick={() => onStageClick('perdue')}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-immo-status-red/30 text-immo-status-red hover:bg-immo-status-red/10 transition-colors" title="Perdue">
            <XCircle className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
