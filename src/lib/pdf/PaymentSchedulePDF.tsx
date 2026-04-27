import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { styles } from './styles'
import { formatPrice } from '@/lib/constants'
import i18n from '@/i18n'

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`pdf.${key}`, opts)

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
            <Text style={styles.companyInfo}>{t('addr_phone', { a: data.tenantAddress, p: data.tenantPhone })}</Text>
          </View>
          {data.tenantLogo && <Image src={data.tenantLogo} style={styles.logo} />}
        </View>

        <Text style={styles.title}>{t('schedule_title')}</Text>
        <Text style={styles.subtitle}>{t('contract_number', { n: data.contractNumber, d: data.date })}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('info')}</Text>
          <View style={styles.row}><Text style={styles.label}>{t('client')}</Text><Text style={styles.value}>{data.clientName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('nin_short')}</Text><Text style={styles.value}>{data.clientNIN}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('unit')}</Text><Text style={styles.value}>{data.unitCode} — {data.projectName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('final_price')}</Text><Text style={styles.value}>{formatPrice(data.finalPrice)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('financing_mode')}</Text><Text style={styles.value}>{data.financingMode}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('schedule_detail')}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.tableHeaderCell, width: 25 }}>{t('sched_num')}</Text>
              <Text style={{ ...styles.tableHeaderCell, width: 90 }}>{t('sched_due')}</Text>
              <Text style={{ ...styles.tableHeaderCell, width: 110 }}>{t('sched_amount')}</Text>
              <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>{t('sched_description')}</Text>
              <Text style={{ ...styles.tableHeaderCell, width: 60 }}>{t('sched_status')}</Text>
            </View>
            {data.schedule.map((line, i) => (
              <View key={line.number} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={{ ...styles.tableCell, width: 25 }}>{line.number}</Text>
                <Text style={{ ...styles.tableCell, width: 90 }}>{line.date}</Text>
                <Text style={{ ...styles.tableCellBold, width: 110 }}>{formatPrice(line.amount)}</Text>
                <Text style={{ ...styles.tableCell, flex: 1 }}>{line.description}</Text>
                <Text style={{ ...styles.tableCell, width: 60, color: line.status === 'paid' ? '#00D4A0' : line.status === 'late' ? '#FF4949' : '#FF9A1E' }}>
                  {line.status === 'paid' ? t('status_paid') : line.status === 'late' ? t('status_late') : t('status_pending')}
                </Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 20 }}>
            <View><Text style={{ fontSize: 8, color: '#6b7280' }}>{t('collected')}</Text><Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#00D4A0' }}>{formatPrice(paid)}</Text></View>
            <View><Text style={{ fontSize: 8, color: '#6b7280' }}>{t('remaining')}</Text><Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#FF9A1E' }}>{formatPrice(remaining)}</Text></View>
          </View>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}><Text style={styles.signatureLabel}>{t('buyer_signature')}</Text><View style={styles.signatureLine} /><Text style={styles.signatureName}>{data.clientName}</Text></View>
          <View style={styles.signatureBlock}><Text style={styles.signatureLabel}>{t('seller_signature')}</Text><View style={styles.signatureLine} /><Text style={styles.signatureName}>{data.tenantName}</Text></View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{t('schedule_number', { n: data.contractNumber })}</Text>
          <Text style={styles.footerText}>{data.date}</Text>
          <Text style={styles.footerText}>{t('agent_label')} : {data.agentName}</Text>
        </View>
      </Page>
    </Document>
  )
}
