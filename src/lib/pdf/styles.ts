import { StyleSheet } from '@react-pdf/renderer'

export const theme = {
  primary: '#0A1030',
  accent: '#00D4A0',
  text: '#1a1a2e',
  muted: '#6b7280',
  border: '#d1d5db',
  bg: '#f9fafb',
  white: '#ffffff',
}

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: theme.text,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: theme.accent,
  },
  headerLeft: { flex: 1 },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: theme.primary, marginBottom: 4 },
  companyInfo: { fontSize: 8, color: theme.muted, lineHeight: 1.5 },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  // Title
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: theme.primary,
    marginBottom: 20,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 8,
    textAlign: 'center',
    color: theme.muted,
    marginBottom: 20,
    marginTop: -15,
  },
  // Sections
  section: { marginBottom: 15 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: theme.primary,
    backgroundColor: theme.bg,
    padding: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.accent,
  },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 140, fontSize: 9, color: theme.muted },
  value: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  // Table
  table: { marginTop: 5 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.primary,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableHeaderCell: { fontSize: 8, color: theme.white, fontFamily: 'Helvetica-Bold' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.border,
  },
  tableRowAlt: { backgroundColor: theme.bg },
  tableCell: { fontSize: 8, color: theme.text },
  tableCellBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: theme.text },
  // Totals
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  totalLabel: { fontSize: 10, color: theme.muted, marginRight: 20 },
  totalValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: theme.accent },
  // Signature
  signatureRow: { flexDirection: 'row', marginTop: 40, justifyContent: 'space-between' },
  signatureBlock: { width: 200, alignItems: 'center' },
  signatureLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: theme.primary, marginBottom: 40 },
  signatureLine: { width: 160, borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 4 },
  signatureName: { fontSize: 8, color: theme.muted },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: theme.border,
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: theme.muted },
})
