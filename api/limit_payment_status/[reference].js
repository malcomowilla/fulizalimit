const TARGET = 'https://owitech.co.ke'

export default async function handler(req, res) {
  try {
    const reference = encodeURIComponent(String(req.query.reference || ''))
    const upstream = await fetch(`${TARGET}/api/limit_payment_status/${reference}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; NgoribratheProxy/1.0)',
      },
    })

    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    res.send(text)
  } catch (err) {
    res.status(502).json({ success: false, error: 'Could not reach the server. Please try again.' })
  }
}