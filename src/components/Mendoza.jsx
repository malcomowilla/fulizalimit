import React, { useEffect, useState } from 'react'

const tiers = [
  { limit: 5000, fee: 99 },
  { limit: 7500, fee: 150 },
  { limit: 10000, fee: 240 },
  { limit: 12500, fee: 360 },
  { limit: 16000, fee: 450 },
  { limit: 21000, fee: 570 },
  { limit: 25500, fee: 670, popular: true },
  { limit: 30000, fee: 780, popular: true },
  { limit: 35000, fee: 910 },
  { limit: 40000, fee: 1050 },
  { limit: 45000, fee: 1200 },
  { limit: 50000, fee: 1400 },
  { limit: 60000, fee: 1600 },
  { limit: 70000, fee: 2000 },
]

const POLL_MS = 3000
const POLL_MAX = 30 // ~90s

const fmt = (n) => n.toLocaleString('en-KE')

// Only ever render strings. Proxies/CDNs can return { error: { code, message } } objects.
const toText = (v, fallback) => (typeof v === 'string' && v.trim() ? v : fallback)

// Accepts 07XXXXXXXX, 01XXXXXXXX, 7XXXXXXXX, 1XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX
const normalizePhone = (raw) => {
  const d = raw.replace(/\D/g, '')
  if (/^0[17]\d{8}$/.test(d)) return `254${d.slice(1)}`
  if (/^[17]\d{8}$/.test(d)) return `254${d}`
  if (/^254[17]\d{8}$/.test(d)) return d
  return null
}

const PayModal = ({ tier, onClose }) => {
  const [idNumber, setIdNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  // form | waiting | paid | failed | timeout
  const [step, setStep] = useState('form')
  const [reference, setReference] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [failMsg, setFailMsg] = useState('')

  // Close on Escape + lock body scroll while open
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [loading, onClose])

  // Poll payment status while waiting for the STK push to be completed
  useEffect(() => {
    if (step !== 'waiting' || !reference) return
    let cancelled = false
    let tries = 0

    const tick = async () => {
      if (cancelled) return
      tries += 1
      try {
        const res = await fetch(`/api/limit_payment_status/${encodeURIComponent(reference)}`, {
          headers: { Accept: 'application/json' },
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (data.status === 'paid') {
          setReceipt(typeof data.mpesa_receipt === 'string' ? data.mpesa_receipt : null)
          setStep('paid')
          return
        }
        if (data.status === 'failed') {
          setFailMsg(toText(data.message, 'The payment was not completed.'))
          setStep('failed')
          return
        }
      } catch (_) {
        // network blip, keep polling
      }
      if (tries >= POLL_MAX) {
        if (!cancelled) setStep('timeout')
        return
      }
      timer = setTimeout(tick, POLL_MS)
    }

    let timer = setTimeout(tick, POLL_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [step, reference])

  const validate = () => {
    const e = {}
    if (!/^\d{6,10}$/.test(idNumber.trim())) e.idNumber = 'Enter a valid ID number (6-10 digits)'
    if (!normalizePhone(phone)) e.phone = 'Enter a valid Safaricom number e.g. 0712345678'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handlePay = async (e) => {
    e.preventDefault()
    if (loading || !validate()) return
    setLoading(true)
    setApiError('')
    try {
      const res = await fetch('/api/make_limit_payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          id_number: idNumber.trim(),
          phone: normalizePhone(phone),
          new_limit: tier.limit,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        setApiError(
          toText(data.error, 'Could not send the M-Pesa prompt. Please try again.')
        )
        return
      }
      setReference(data.reference)
      setStep('waiting')
    } catch (_) {
      setApiError('Network error. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const retry = () => {
    setApiError('')
    setFailMsg('')
    setReference(null)
    setStep('form')
  }

  const inputCls = (err) =>
    `mt-1.5 w-full rounded-xl border bg-emerald-950 px-4 py-3 text-sm text-white placeholder-emerald-300/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 ${
      err ? 'border-red-400' : 'border-emerald-800'
    }`

  const primaryBtn =
    'mt-6 w-full rounded-xl bg-lime-300 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-lime-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center
       bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => !loading && onClose()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-emerald-800 bg-emerald-900 p-6 shadow-2xl sm:rounded-3xl"
      >
        {step === 'waiting' && (
          <div className="py-4 text-center">
            <h2 id="pay-modal-title" className="text-xl font-bold text-white">
              Check your phone
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-emerald-200/70">
              An M-Pesa prompt for Ksh {fmt(tier.fee)} has been sent to {phone}. Enter your PIN to
              complete the request.
            </p>
            <p className="mt-5 animate-pulse text-xs text-emerald-300/70">
              Waiting for confirmation...
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl border border-emerald-700 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {step === 'paid' && (
          <div className="py-4 text-center">
            <h2 id="pay-modal-title" className="text-xl font-bold text-white">
              Payment received
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-emerald-200/70">
              Your request to raise your limit to Ksh {fmt(tier.limit)} has been submitted.
            </p>
            {receipt && (
              <p className="mt-3 text-xs text-emerald-300/70">M-Pesa receipt: {receipt}</p>
            )}
            <button type="button" onClick={onClose} className={primaryBtn}>
              Done
            </button>
          </div>
        )}

        {step === 'failed' && (
          <div className="py-4 text-center">
            <h2 id="pay-modal-title" className="text-xl font-bold text-white">
              Payment not completed
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-emerald-200/70">{failMsg}</p>
            <button type="button" onClick={retry} className={primaryBtn}>
              Try again
            </button>
          </div>
        )}

        {step === 'timeout' && (
          <div className="py-4 text-center">
            <h2 id="pay-modal-title" className="text-xl font-bold text-white">
              Still waiting
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-emerald-200/70">
              We have not received confirmation yet. If you already entered your PIN, it should
              reflect shortly. Otherwise you can try again.
            </p>
            <button type="button" onClick={retry} className={primaryBtn}>
              Try again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-xl border border-emerald-700 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handlePay} noValidate>
            <h2 id="pay-modal-title" className="text-xl font-bold text-white">
              Complete Your Request
            </h2>
            <p className="mt-1 text-sm text-emerald-200/70">Enter your details to boost your limit</p>

            {/* Summary */}
            <div className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-950/60 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-300/70">New limit</span>
                <span className="font-semibold text-white">Ksh {fmt(tier.limit)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-emerald-800 pt-3 text-sm">
                <span className="text-emerald-300/70">Processing fee</span>
                <span className="font-semibold text-lime-300">Ksh {fmt(tier.fee)}</span>
              </div>
            </div>

            {/* ID */}
            <div className="mt-5">
              <label htmlFor="id-number" className="text-xs font-medium text-emerald-200">
                ID Number
              </label>
              <input
                id="id-number"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="e.g. 12345678"
                disabled={loading}
                className={inputCls(errors.idNumber)}
              />
              {errors.idNumber && <p className="mt-1 text-xs text-red-300">{errors.idNumber}</p>}
            </div>

            {/* Phone */}
            <div className="mt-4">
              <label htmlFor="mpesa-phone" className="text-xs font-medium text-emerald-200">
                M-Pesa Phone Number
              </label>
              <input
                id="mpesa-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0712345678"
                disabled={loading}
                className={inputCls(errors.phone)}
              />
              {errors.phone ? (
                <p className="mt-1 text-xs text-red-300">{errors.phone}</p>
              ) : (
                <p className="mt-1 text-xs text-emerald-300/60">
                  You will receive an M-Pesa STK push on this number
                </p>
              )}
            </div>

            {apiError && (
              <p className="mt-4 rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                {apiError}
              </p>
            )}

            {/* Actions */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl border border-emerald-700 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-lime-300 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-lime-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-70 cursor-pointer"
              >
                {loading ? 'Sending...' : 'Pay now'}
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-emerald-300/60">
              Secure payment powered by M-Pesa
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

const Mendoza = () => {
  const [selected, setSelected] = useState(tiers[6])
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="min-h-screen bg-emerald-950 text-emerald-50">
      <div className="mx-auto max-w-5xl px-4 pb-40 pt-10 sm:px-6 ">

        <header className="mb-10 max-w-xl">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Boost your Fuliza Limit
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-emerald-200/70">
           Choose your target limit and complete a secure payment to upgrade instantly.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 ">
          {tiers.map((t) => {
            const active = selected.limit === t.limit
            return (
              <button
                key={t.limit}
                onClick={() => setSelected(t)}
                aria-pressed={active}
                className={`relative rounded-2xl border p-4 text-left
                   transition focus:outline-none focus-visible:ring-2
                    focus-visible:ring-lime-300 ${
                  active
                    ? 'border-lime-300 bg-lime-300 text-emerald-950 cursor-pointer'
                    : 'border-emerald-800 bg-emerald-900/60 hover:border-emerald-600 cursor-pointer'
                }`}
              >
                {t.popular && (
                  <span
                    className={`absolute -top-2.5 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      active
                        ? 'bg-emerald-950 text-lime-300'
                        : 'bg-lime-300 text-emerald-950'
                    }`}
                  >
                    Most popular
                  </span>
                )}
                <p className={`text-xs ${active ? 'text-emerald-900' : 'text-emerald-300/70'}`}>
                  New limit
                </p>
                <p className="mt-1 text-xl font-bold">Ksh {fmt(t.limit)}</p>
                <div
                  className={`mt-4 flex items-center justify-between border-t pt-3 text-xs ${
                    active ? 'border-emerald-950/20' : 'border-emerald-800'
                  }`}
                >
                  <span className={active ? 'text-emerald-900' : 'text-emerald-300/70'}>Fee</span>
                  <span className="text-sm font-semibold">Ksh {fmt(t.fee)}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sticky summary */}
      <div className="fixed inset-x-0 bottom-0 border-t border-emerald-800 bg-emerald-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs text-emerald-300/70">Selected</p>
            <p className="text-lg font-bold text-white">
              Ksh {fmt(selected.limit)}
              <span className="ml-2 text-sm font-normal text-emerald-300/70">
                fee Ksh {fmt(selected.fee)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-lime-300 px-6 py-3 text-sm
             font-semibold text-emerald-950 transition hover:bg-lime-200
             focus:outline-none focus-visible:ring-2 focus-visible:ring-white
             cursor-pointer
             "
          >
            Continue
          </button>
        </div>
      </div>

      {showModal && <PayModal tier={selected} onClose={() => setShowModal(false)} />}
    </div>
  )
}

export default Mendoza