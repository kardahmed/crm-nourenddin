import { useState } from 'react'
import { Copy, Send, Check } from 'lucide-react'
import { Modal } from '@/components/common'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

interface MessageTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  clientName: string
  clientPhone: string
  agentName?: string
  projectName?: string
}

const TEMPLATES = [
  {
    id: 'relance',
    label: 'Relance client',
    message: 'Bonjour {nom}, j\'espere que vous allez bien. Suite a notre dernier echange, je me permets de revenir vers vous concernant votre projet immobilier. Avez-vous des questions ? Cordialement, {agent}',
  },
  {
    id: 'visite_confirm',
    label: 'Confirmation visite',
    message: 'Bonjour {nom}, je vous confirme votre visite prevue. Merci de vous presenter a l\'heure au bureau. A bientot, {agent}',
  },
  {
    id: 'rappel_paiement',
    label: 'Rappel paiement',
    message: 'Bonjour {nom}, nous vous rappelons que votre echeance de paiement est proche. Merci de vous rapprocher de notre service commercial. Cordialement, {agent}',
  },
  {
    id: 'felicitations',
    label: 'Felicitations vente',
    message: 'Felicitations {nom} ! Votre acquisition au sein du projet {projet} est finalisee. Nous vous souhaitons beaucoup de bonheur dans votre nouveau bien. {agent}',
  },
  {
    id: 'bienvenue',
    label: 'Bienvenue',
    message: 'Bonjour {nom}, bienvenue et merci de l\'interet que vous portez a nos programmes immobiliers. Je suis {agent}, votre conseiller dedie. N\'hesitez pas a me contacter pour toute question.',
  },
]

export function MessageTemplateModal({ isOpen, onClose, clientName, clientPhone, agentName, projectName }: MessageTemplateModalProps) {
  const [selected, setSelected] = useState<string>('relance')
  const [copied, setCopied] = useState(false)

  const template = TEMPLATES.find(t => t.id === selected) ?? TEMPLATES[0]

  // Replace variables
  const message = template.message
    .replace(/\{nom\}/g, clientName)
    .replace(/\{agent\}/g, agentName ?? 'Votre conseiller')
    .replace(/\{projet\}/g, projectName ?? 'notre projet')
    .replace(/\{telephone\}/g, clientPhone)

  function handleCopy() {
    navigator.clipboard.writeText(message)
    setCopied(true)
    toast.success('Message copié')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsApp() {
    const phone = clientPhone.replace(/[\s\-()]/g, '').replace(/^0/, '213')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Envoyer un message" subtitle={clientName} size="md">
      <div className="space-y-4">
        {/* Template selector */}
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selected === t.id
                  ? 'bg-immo-accent-green/10 text-immo-accent-green'
                  : 'border border-immo-border-default text-immo-text-muted hover:text-immo-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Message preview */}
        <div className="rounded-lg border border-immo-border-default bg-immo-bg-primary p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-immo-text-primary">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={handleCopy} className="text-immo-text-secondary">
            {copied ? <Check className="mr-1.5 h-4 w-4 text-immo-accent-green" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copied ? 'Copie !' : 'Copier'}
          </Button>
          <Button onClick={handleWhatsApp} className="bg-[#25D366] font-semibold text-white hover:bg-[#128C7E]">
            <Send className="mr-1.5 h-4 w-4" /> Envoyer via WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  )
}
