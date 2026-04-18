// Runtime file-type validation based on magic bytes. The browser File
// object's `type` is just a hint from the OS and is trivially spoofed,
// so before we pass files to the uploader we compare the first bytes
// against a whitelist of signatures.

export interface DetectedType {
  mime: string
  ext: string
}

const SIGNATURES: Array<{ mime: string; ext: string; match: (b: Uint8Array) => boolean }> = [
  { mime: 'image/jpeg', ext: 'jpg', match: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png',  ext: 'png', match: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: 'image/gif',  ext: 'gif', match: b => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  { mime: 'image/webp', ext: 'webp', match: b =>
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
  { mime: 'image/bmp',  ext: 'bmp', match: b => b[0] === 0x42 && b[1] === 0x4d },
  { mime: 'image/avif', ext: 'avif', match: b =>
    // ftyp avif / avis
    b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 &&
    ((b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x66) ||
     (b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x73)) },
  { mime: 'application/pdf', ext: 'pdf', match: b => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
]

export async function detectFileType(file: File): Promise<DetectedType | null> {
  const head = await file.slice(0, 16).arrayBuffer()
  const bytes = new Uint8Array(head)
  for (const sig of SIGNATURES) {
    if (sig.match(bytes)) return { mime: sig.mime, ext: sig.ext }
  }
  return null
}

export async function isAllowedImage(file: File): Promise<boolean> {
  const detected = await detectFileType(file)
  return !!detected && detected.mime.startsWith('image/')
}

export async function validateFile(
  file: File,
  opts: { maxSizeMB?: number; allowedMimes?: string[] } = {},
): Promise<{ ok: true; detected: DetectedType } | { ok: false; reason: string }> {
  const maxSize = (opts.maxSizeMB ?? 10) * 1024 * 1024
  if (file.size > maxSize) return { ok: false, reason: `Fichier > ${opts.maxSizeMB ?? 10}MB` }
  if (file.size === 0) return { ok: false, reason: 'Fichier vide' }

  const detected = await detectFileType(file)
  if (!detected) return { ok: false, reason: 'Type de fichier non reconnu' }

  if (opts.allowedMimes && opts.allowedMimes.length > 0) {
    const ok = opts.allowedMimes.some(m =>
      m === detected.mime || (m.endsWith('/*') && detected.mime.startsWith(m.slice(0, -1))),
    )
    if (!ok) return { ok: false, reason: `Type ${detected.mime} non autorise` }
  }

  return { ok: true, detected }
}
