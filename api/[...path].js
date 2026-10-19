const TARGET = 'https://owitech.co.ke'

export default async function handler(req, res) {
  try {
    const url = `${TARGET}${req.url}`
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'

    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: hasBody
        ? typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body ?? {})
        : undefined,
    })

    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    res.send(text)
  } catch (err) {
    res.status(502).json({ success: false, error: 'Could not reach the server. Please try again.' })
  }
}