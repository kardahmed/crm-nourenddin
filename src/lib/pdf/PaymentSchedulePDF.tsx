import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { styles } from './styles'
import { formatPrice } from '@/lib/constants'

export interface PaymentScheduleData {
  contractNumber: string
  date: string
  tenantName: string
  tenantAddress: string
  tenantPhone: string
  tenantLogo: string | null
  clientName: string
  clientNIN: string
  clientPhone: string
  unitCode: string
  projectName: string
  finalPrice: number
  financingMode: string
  schedule: Array<{ number: number; date: string; amount: number; description: string; status: string }>
  agentName: string
}

export function PaymentSchedulePDF({ data }: { data: PaymentScheduleData }) {
  const paid = data.schedule.filter(s => s.status === 'paid').reduce((s, l) => s + l.amount, 0)
  const remaining = data.finalPrice - paid

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

        <Text style={styles.title}>ÉCHÉANCIER DE PAIEMENT</Text>
        <Text style={styles.subtitle}>Contrat N° {data.contractNumber} — {data.date}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMATIONS</Text>
          <View style={styles.row}><Text style={styles.label}>Client</Text><Text style={styles.value}>{data.clientName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>NIN/CIN</Text><Text style={styles.value}>{data.clientNIN}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Bien</Text><Text style={styles.value}>{data.unitCode} — {data.projectName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Prix final</Text><Text style={styles.value}>{formatPrice(data.finalPrice)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Mode de financement</Text><Text style={styles.value}>{data.financingMode}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DÉTAIL DES VERSEMENTS</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.tableHeaderCell, width: 25 }}>#</Text>
              <Text style={{ ...styles.tableHeaderCell, width: 90 }}>Échéance</Text>
              <Text style={{ ...styles.tableHeaderCell, width: 110 }}>Montant</Text>
              <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>Description</Text>
              <Text style={{ ...styles.tableHeaderCell, width: 60 }}>Statut</Text>
            </View>
            {data.schedule.map((line, i) => (
              <View key={line.number} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={{ ...styles.tableCell, width: 25 }}>{line.number}</Text>
                <Text style={{ ...styles.tableCell, width: 90 }}>{line.date}</Text>
                <Text style={{ ...styles.tableCellBold, width: 110 }}>{formatPrice(line.amount)}</Text>
                <Text style={{ ...styles.tableCell, flex: 1 }}>{line.description}</Text>
                <Text style={{ ...styles.tableCell, width: 60, color: line.status === 'paid' ? '#00D4A0' : line.status === 'late' ? '#FF4949' : '#FF9A1E' }}>
                  {line.status === 'paid' ? 'Payé' : line.status === 'late' ? 'Retard' : 'En attente'}
                </Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 20 }}>
            <View><Text style={{ fontSize: 8, color: '#6b7280' }}>Encaissé</Text><Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#00D4A0' }}>{formatPrice(paid)}</Text></View>
            <View><Text style={{ fontSize: 8, color: '#6b7280' }}>Restant dû</Text><Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#FF9A1E' }}>{formatPrice(remaining)}</Text></View>
          </View>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}><Text style={styles.signatureLabel}>L'ACQUÉREUR</Text><View style={styles.signatureLine} /><Text style={styles.signatureName}>{data.clientName}</Text></View>
          <View style={styles.signatureBlock}><Text style={styles.signatureLabel}>LE VENDEUR</Text><View style={styles.signatureLine} /><Text style={styles.signatureName}>{data.tenantName}</Text></View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Échéancier N° {data.contractNumber}</Text>
          <Text style={styles.footerText}>{data.date}</Text>
          <Text style={styles.footerText}>Agent : {data.agentName}</Text>
        </View>
      </Page>
    </Document>
  )
}
