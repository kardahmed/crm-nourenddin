import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { styles } from './styles'
import { formatPrice } from '@/lib/constants'
import i18n from '@/i18n'

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`pdf.${key}`, opts)

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
            <Text style={styles.companyInfo}>{t('addr_phone', { a: data.tenantAddress, p: data.tenantPhone })}</Text>
          </View>
          {data.tenantLogo && <Image src={data.tenantLogo} style={styles.logo} />}
        </View>

        <Text style={styles.title}>{t('receipt_title')}</Text>
        <Text style={styles.subtitle}>{t('receipt_short', { n: data.receiptNumber, d: data.date })}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('receipt_buyer')}</Text>
          <View style={styles.row}><Text style={styles.label}>{t('full_name')}</Text><Text style={styles.value}>{data.clientName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('nin_short')}</Text><Text style={styles.value}>{data.clientNIN}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('phone')}</Text><Text style={styles.value}>{data.clientPhone}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('reserved_unit')}</Text>
          <View style={styles.row}><Text style={styles.label}>{t('project')}</Text><Text style={styles.value}>{data.projectName}</Text></View>
          {data.projectLocation && <View style={styles.row}><Text style={styles.label}>{t('location')}</Text><Text style={styles.value}>{data.projectLocation}</Text></View>}
          <View style={styles.row}><Text style={styles.label}>{t('unit_code')}</Text><Text style={styles.value}>{data.unitCode}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('unit_type')}</Text><Text style={styles.value}>{data.unitType}</Text></View>
          {data.unitSurface && <View style={styles.row}><Text style={styles.label}>{t('surface')}</Text><Text style={styles.value}>{data.unitSurface} m²</Text></View>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('reservation_terms')}</Text>
          <View style={styles.row}><Text style={styles.label}>{t('duration')}</Text><Text style={styles.value}>{t('days', { n: data.durationDays })}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('expires_at')}</Text><Text style={styles.value}>{data.expiresAt}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('deposit_amount')}</Text><Text style={{ ...styles.value, color: '#00D4A0', fontSize: 11 }}>{formatPrice(data.depositAmount)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('payment_method_label')}</Text><Text style={styles.value}>{data.depositMethod}</Text></View>
          {data.depositReference && <View style={styles.row}><Text style={styles.label}>{t('reference')}</Text><Text style={styles.value}>{data.depositReference}</Text></View>}
        </View>

        <View style={{ ...styles.section, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 4, borderWidth: 1, borderColor: '#bbf7d0' }}>
          <Text style={{ fontSize: 9, color: '#166534', lineHeight: 1.6 }}>
            {t('receipt_legal', { days: data.durationDays })}
          </Text>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}><Text style={styles.signatureLabel}>{t('buyer_signature')}</Text><View style={styles.signatureLine} /><Text style={styles.signatureName}>{data.clientName}</Text></View>
          <View style={styles.signatureBlock}><Text style={styles.signatureLabel}>{t('seller_signature')}</Text><View style={styles.signatureLine} /><Text style={styles.signatureName}>{data.tenantName}</Text></View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{t('receipt_number_short', { n: data.receiptNumber })}</Text>
          <Text style={styles.footerText}>{data.date}</Text>
          <Text style={styles.footerText}>{t('agent_label')} : {data.agentName}</Text>
        </View>
      </Page>
    </Document>
  )
}
