import QRCode from 'qrcode'

/**
 * Renders `url` as a QR PNG and decodes it into an <img>, ready for
 * ctx.drawImage. QRCode.toDataURL is promise-based, so callers must resolve
 * this once ahead of time and hand the result to drawCard — drawCard itself
 * must stay synchronous (API Contract §2.4, "drawCard never awaits").
 * The url is fixed (points at /watch), so one load per page session is enough.
 */
export async function loadQrImage(url: string): Promise<HTMLImageElement> {
  const dataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    width: 256,
    color: { dark: '#000000', light: '#ffffff' },
  })

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('could not decode generated QR code'))
    img.src = dataUrl
  })
}
