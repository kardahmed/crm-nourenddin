import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { styles } from './styles'
import { formatPrice } from '@/lib/constants'

export interface ReservationReceiptData {
  receiptNumber: string
  date: string
  tenantName: string
  tenantAddress: string
  tenantPhone: string
  tenantLogo: string | null
  clientName: string
  clientNIN: string
  clientPhone: string
  unitCode: string
  unitType: string
  unitSurface: number | null
  projectName: string
  projectLocation: string | null
  depositAmount: number
  depositMethod: string
  depositReference: string | null
  durationDays: number
  expiresAt: string
  agentName: string
}

export function ReservationReceiptPDF({ data }: { data: ReservationReceiptData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{data.tenantName}</Text>
            <Text style={styles.companyInfo}>{data.tenantAddress} | Tél : {data.tenantPhone}</Text>
          </View>
          {data.tenantLogo && <Image src={data.tenantLogo} style={styles.logo} />}
        </View>

        <Text style={styles.title}>BON DE RÉSERVATION</Text>
        <Text style={styles.subtitle}>N° {data.receiptNumber} — {data.date}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACQUÉREUR</Text>
          <View style={styles.row}><Text style={styles.label}>Nom complet</Text><Text style={styles.value}>{data.clientName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>NIN/CIN</Text><Text style={styles.value}>{data.clientNIN}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Téléphone</Text><Text style={styles.value}>{data.clientPhone}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BIEN RÉSERVÉ</Text>
          <View style={styles.row}><Text style={styles.label}>Projet</Text><Text style={styles.value}>{data.projectName}</Text></View>
          {data.projectLocation && <View style={styles.row}><Text style={styles.label}>Localisation</Text><Text style={styles.value}>{data.projectLocation}</Text></View>}
          <View style={styles.row}><Text style={styles.label}>Code du bien</Text><Text style={styles.value}>{data.unitCode}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Type</Text><Text style={styles.value}>{data.unitType}</Text></View>
          {data.unitSurface && <View style={styles.row}><Text style={styles.label}>Surface</Text><Text style={styles.value}>{data.unitSurface} m²</Text></View>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONDITIONS DE RÉSERVATION</Text>
          <View style={styles.row}><Text style={styles.label}>Durée de validité</Text><Text style={styles.value}>{data.durationDays} jours</Text></View>
          <View style={styles.row}><Text style={styles.label}>Date d'expiration</Text><Text style={styles.value}>{data.expiresAt}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Montant de l'acompte</Text><Text style={{ ...styles.value, color: '#00D4A0', fontSize: 11 }}>{formatPrice(data.depositAmount)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Méthode de paiement</Text><Text style={styles.value}>{data.depositMethod}</Text></View>
          {data.depositReference && <View style={styles.row}><Text style={styles.label}>Référence</Text><Text style={styles.value}>{data.depositReference}</Text></View>}
        </View>

        <View style={{ ...styles.section, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 4, borderWidth: 1, borderColor: '#bbf7d0' }}>
          <Text style={{ fontSize: 9, color: '#166534', lineHeight: 1.6 }}>
            Le présent bon de réservation engage le vendeur à réserver le bien désigné ci-dessus pour une durée de {data.durationDays} jours
            à compter de la date de signature. Passé ce délai, la réservation sera automatiquement annulée sauf conclusion d'un contrat de vente.
            L'acompte versé sera déduit du prix de vente en cas de conclusion. En cas de désistement de l'acquéreur, l'acompte sera restitué
            conformément aux conditions générales de vente.
          </Text>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}><Text style={styles.signatureLabel}>L'ACQUÉREUR</Text><View style={styles.signatureLine} /><Text style={styles.signatureName}>{data.clientName}</Text></View>
          <View style={styles.signatureBlock}><Text style={styles.signatureLabel}>LE VENDEUR</Text><View style={styles.signatureLine} /><Text style={styles.signatureName}>{data.tenantName}</Text></View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Bon N° {data.receiptNumber}</Text>
          <Text style={styles.footerText}>{data.date}</Text>
          <Text style={styles.footerText}>Agent : {data.agentName}</Text>
        </View>
      </Page>
    </Document>
  )
}
