import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { styles } from './styles'
import { formatPrice } from '@/lib/constants'
import i18n from '@/i18n'

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`pdf.${key}`, opts)

export interface SaleContractData {
  contractNumber: string
  date: string
  // Tenant
  tenantName: string
  tenantAddress: string
  tenantPhone: string
  tenantEmail: string
  tenantLogo: string | null
  // Client
  clientName: string
  clientNIN: string
  clientAddress: string
  clientPhone: string
  // Unit
  unitCode: string
  unitType: string
  unitSurface: number | null
  unitFloor: number | null
  unitBuilding: string | null
  projectName: string
  projectLocation: string | null
  deliveryDate: string | null
  // Financial
  totalPrice: number
  discountAmount: number
  finalPrice: number
  financingMode: string
  // Schedule
  schedule: Array<{
    number: number
    date: string
    amount: number
    description: string
  }>
  // Agent
  agentName: string
}

export function SaleContractPDF({ data }: { data: SaleContractData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{data.tenantName}</Text>
            <Text style={styles.companyInfo}>{data.tenantAddress}</Text>
            <Text style={styles.companyInfo}>{t('tel_email', { p: data.tenantPhone, e: data.tenantEmail })}</Text>
          </View>
          {data.tenantLogo && <Image src={data.tenantLogo} style={styles.logo} />}
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('contract_title')}</Text>
        <Text style={styles.subtitle}>{t('contract_number', { n: data.contractNumber, d: data.date })}</Text>

        {/* Section: Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('section_buyer')}</Text>
          <View style={styles.row}><Text style={styles.label}>{t('full_name')}</Text><Text style={styles.value}>{data.clientName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('nin')}</Text><Text style={styles.value}>{data.clientNIN}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('address')}</Text><Text style={styles.value}>{data.clientAddress}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('phone')}</Text><Text style={styles.value}>{data.clientPhone}</Text></View>
        </View>

        {/* Section: Unit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('section_unit')}</Text>
          <View style={styles.row}><Text style={styles.label}>{t('project')}</Text><Text style={styles.value}>{data.projectName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('location')}</Text><Text style={styles.value}>{data.projectLocation ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('unit_code')}</Text><Text style={styles.value}>{data.unitCode}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('unit_type')}</Text><Text style={styles.value}>{data.unitType}</Text></View>
          {data.unitSurface && <View style={styles.row}><Text style={styles.label}>{t('surface')}</Text><Text style={styles.value}>{data.unitSurface} m²</Text></View>}
          {data.unitFloor != null && <View style={styles.row}><Text style={styles.label}>{t('floor')}</Text><Text style={styles.value}>{data.unitFloor}</Text></View>}
          {data.unitBuilding && <View style={styles.row}><Text style={styles.label}>{t('building')}</Text><Text style={styles.value}>{data.unitBuilding}</Text></View>}
          {data.deliveryDate && <View style={styles.row}><Text style={styles.label}>{t('delivery_date')}</Text><Text style={styles.value}>{data.deliveryDate}</Text></View>}
        </View>

        {/* Section: Financial */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('section_finance')}</Text>
          <View style={styles.row}><Text style={styles.label}>{t('total_price')}</Text><Text style={styles.value}>{formatPrice(data.totalPrice)}</Text></View>
          {data.discountAmount > 0 && (
            <View style={styles.row}><Text style={styles.label}>{t('discount')}</Text><Text style={styles.value}>-{formatPrice(data.discountAmount)}</Text></View>
          )}
          <View style={styles.row}><Text style={styles.label}>{t('final_price')}</Text><Text style={{ ...styles.value, color: '#00D4A0', fontSize: 11 }}>{formatPrice(data.finalPrice)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{t('financing_mode')}</Text><Text style={styles.value}>{data.financingMode}</Text></View>
        </View>

        {/* Section: Schedule */}
        {data.schedule.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('section_schedule')}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ ...styles.tableHeaderCell, width: 30 }}>{t('sched_num')}</Text>
                <Text style={{ ...styles.tableHeaderCell, width: 100 }}>{t('sched_date')}</Text>
                <Text style={{ ...styles.tableHeaderCell, width: 120 }}>{t('sched_amount')}</Text>
                <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>{t('sched_description')}</Text>
              </View>
              {data.schedule.map((line, i) => (
                <View key={line.number} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={{ ...styles.tableCell, width: 30 }}>{line.number}</Text>
                  <Text style={{ ...styles.tableCell, width: 100 }}>{line.date}</Text>
                  <Text style={{ ...styles.tableCellBold, width: 120 }}>{formatPrice(line.amount)}</Text>
                  <Text style={{ ...styles.tableCell, flex: 1 }}>{line.description}</Text>
                </View>
              ))}
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('total')}</Text>
              <Text style={styles.totalValue}>{formatPrice(data.finalPrice)}</Text>
            </View>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>{t('buyer_signature')}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{data.clientName}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>{t('seller_signature')}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{data.tenantName}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{t('contract_number', { n: data.contractNumber, d: data.date })}</Text>
          <Text style={styles.footerText}>{data.date}</Text>
          <Text style={styles.footerText}>{t('agent_label')} : {data.agentName}</Text>
        </View>
      </Page>
    </Document>
  )
}
