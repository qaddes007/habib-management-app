import { CAT_LABELS, getFrameGaugeLabel } from '../api/client'

/**
 * 80mm thermal bill with a centered logo and compact item columns.
 */
function normalizeGaugeText(value) {
  const raw = String(value ?? '').trim()
  if (!raw || raw === '0') return '12 Gauge'
  const compact = raw.replace(/\s+/g, ' ').replace(/\s*Gauge\s*$/i, '').trim()
  if (!compact || compact === '0') return '12 Gauge'
  return /^\d+(?:\.\d+)?$/i.test(compact) ? `${compact} Gauge` : raw.trim()
}

function formatBoolText(value) {
  if (value === true || value === 1 || value === '1') return 'Y'
  if (value === false || value === 0 || value === '0' || value === null || value === undefined || value === '') return ''
  return String(value)
}

export default function ThermalPrint({ bill, onClose }) {
  if (!bill) return null

  const frames = bill.frames || []
  const company = bill.company || {}
  const billBend = frames.reduce(
    (s, f) => s + (parseFloat(f.bend_rate) || 0) * (parseFloat(f.bend_count) || 0),
    0
  )

  const printThermal = async () => {
    const el = document.getElementById('thermal-print-area')
    if (!el) return
    const style = document.createElement('style')
    style.dataset.thermalPrint = 'true'
    style.textContent = `
      @media print {
        @page { size: 80mm auto; margin: 0; }
        html, body, #root {
          width: 80mm !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          color: #000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body * { visibility: hidden !important; }
        #thermal-print-area, #thermal-print-area * { visibility: visible !important; }
        .modal-overlay, .modal {
          position: static !important;
          overflow: visible !important;
          transform: none !important;
          animation: none !important;
        }
        #thermal-print-area {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 72mm !important;
          max-width: 72mm !important;
          margin: 0 !important;
          padding: 1.5mm !important;
          overflow: visible !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: #fff !important;
          color: #000 !important;
          font: 12px/1.35 Arial, Helvetica, sans-serif !important;
          font-weight: 700 !important;
        }
        #thermal-text, #thermal-text * {
          color: #000 !important;
          font-weight: 700 !important;
          text-rendering: optimizeLegibility;
        }
        #thermal-text { width: 100% !important; font-size: 12px !important; line-height: 1.35 !important; }
        #thermal-text table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; }
        #thermal-text th, #thermal-text td {
          padding: 3px 1px !important;
          vertical-align: top !important;
          overflow-wrap: anywhere !important;
          word-break: normal !important;
        }
        #thermal-text th { border-bottom: 1px solid #000 !important; font-size: 10px !important; }
        #thermal-text td { border-bottom: 1px solid #000 !important; font-size: 11px !important; }
        #thermal-text [style*="font-size: 7px"] { font-size: 9px !important; }
        #thermal-text [style*="font-size: 8px"] { font-size: 10px !important; }
        #thermal-text [style*="font-size: 9px"] { font-size: 11px !important; }
        #thermal-text [style*="font-size: 10px"] { font-size: 12px !important; }
        #thermal-text [style*="font-size: 11px"] { font-size: 13px !important; }
        #thermal-text img { max-width: 100% !important; }
        #thermal-text img[alt="logo"] {
          display: block !important;
          width: auto !important;
          height: auto !important;
          max-width: 88px !important;
          max-height: 88px !important;
          object-fit: contain !important;
        }
        #thermal-text img[alt="location"] {
          display: block !important;
          width: 100% !important;
          height: 50mm !important;
          max-height: none !important;
          object-fit: contain !important;
          transform: scaleY(1.3) !important;
          transform-origin: top !important;
        }
        #thermal-location-crop { height: 50mm !important; }
        #thermal-text tr { break-inside: avoid !important; page-break-inside: avoid !important; }
      }
    `
    document.head.appendChild(style)
    const cleanup = () => style.remove()
    window.addEventListener('afterprint', cleanup, { once: true })

    try {
      await Promise.all(Array.from(el.querySelectorAll('img'), async image => {
        if (!image.complete) {
          await new Promise((resolve, reject) => {
            image.addEventListener('load', resolve, { once: true })
            image.addEventListener('error', () => reject(new Error(`Could not load bill image: ${image.alt}`)), { once: true })
          })
        }
        if (!image.naturalWidth) throw new Error(`Could not load bill image: ${image.alt}`)
        if (image.decode) await image.decode()
      }))
      window.print()
    } catch (error) {
      cleanup()
      window.removeEventListener('afterprint', cleanup)
      window.alert(`Could not prepare bill images for printing: ${error.message}`)
    }
  }

  const copyText = () => {
    const text = document.getElementById('thermal-text')?.innerText || ''
    navigator.clipboard?.writeText(text).then(() => alert('Copied!')).catch(() => {})
  }

  const money = (n) =>
    Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <h2 style={{ fontSize: '0.95rem' }}>80mm PRINT — Preview</h2>
        {bill.offline_summary && (
          <div className="offline-notice" role="status" style={{ marginBottom: 10 }}>
            Offline summary only — item details were not saved on this computer.
          </div>
        )}

        <div
          id="thermal-print-area"
          style={{
            background: '#fff',
            color: '#000',
            padding: 10,
            borderRadius: 6,
            fontFamily: "'Courier New', monospace",
            fontSize: 11,
            width: '100%',
            maxWidth: 280,
            margin: '0 auto',
            overflow: 'hidden',
          }}
        >
          <div id="thermal-text">
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <img
                src="/logo.png.jpeg"
                alt="logo"
                style={{
                  maxWidth: 84,
                  maxHeight: 84,
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto',
                  border: 0,
                  outline: 0,
                  boxShadow: 'none',
                  filter: 'none',
                }}
                onError={e => { e.target.style.display = 'none' }}
              />
            </div>

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 11, lineHeight: 1.2 }}>
              S. HABIB STEEL &amp; LASER CRAFT
            </div>
            <div style={{ textAlign: 'center', fontSize: 8, lineHeight: 1.35, marginTop: 2 }}>
              {company.tagline || ''}
              {company.phones && <><br />{company.phones}</>}
              {company.address && <><br />{company.address}</>}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
              <span>Bill #{bill.sr_no}</span>
              <span>{bill.created_at?.slice(0, 16)}</span>
            </div>
            <div style={{ textAlign: 'center', fontSize: 10, marginTop: 2 }}>
              {bill.client_name}
              {bill.client_phone ? ` | ${bill.client_phone}` : ''}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* ===== Items table — each header in its own column ===== */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: '7%', textAlign: 'left', fontSize: 8, borderBottom: '1px solid #000', padding: '3px 1px' }}>#</th>
                  <th style={{ width: '26%', textAlign: 'left', fontSize: 8, borderBottom: '1px solid #000', padding: '3px 1px' }}>MAT</th>
                  <th style={{ width: '10%', textAlign: 'center', fontSize: 8, borderBottom: '1px solid #000', padding: '3px 1px' }}>G</th>
                  <th style={{ width: '14%', textAlign: 'center', fontSize: 8, borderBottom: '1px solid #000', padding: '3px 1px' }}>SIZE</th>
                  <th style={{ width: '12%', textAlign: 'center', fontSize: 8, borderBottom: '1px solid #000', padding: '3px 1px' }}>SQFT</th>
                  <th style={{ width: '13%', textAlign: 'center', fontSize: 8, borderBottom: '1px solid #000', padding: '3px 1px' }}>RATE</th>
                  <th style={{ width: '18%', textAlign: 'right', fontSize: 8, borderBottom: '1px solid #000', padding: '3px 1px' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {bill.offline_summary && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '6px 1px', borderBottom: '1px dotted #bbb' }}>
                      Item details unavailable offline
                    </td>
                  </tr>
                )}
                {frames.map((f, i) => {
                  const isBendOnly = f.bill_category === 'bending_only'
                  const isBending = f.bill_category === 'bending_sheet'
                  const gaugeLabel = getFrameGaugeLabel(f, true)
                  const gauge = gaugeLabel ? normalizeGaugeText(gaugeLabel).replace(/ Gauge/gi, '') : ''
                  const mat = (f.material || f.cnc_material || '—').slice(0, 14)
                  const catLabel = CAT_LABELS[f.bill_category] || ''
                  const w = Number(f.width) || 0
                  const l = Number(f.length) || 0
                  const isFancy = f.bill_category === 'fancy'
                  const isSheetSale = f.bill_category === 'sheet_sale'
                  const isOnlyCutting = f.bill_category === 'only_cutting'
                  const sizeStr = isFancy
                    ? `${Number(f.area || f.width || 0).toFixed(1)} sqft`
                    : isBendOnly
                      ? `${f.sheet_size || '4x8'} / ${Number(f.bend_count || 0).toFixed(1)}kg`
                      : isBending
                        ? '—'
                      : (isSheetSale || isOnlyCutting) ? `${f.sheet_size || '4x8'}` : `${w}x${l}`
                  const colorFit = []
                  if (f.bill_category === 'cnc_pipe') {
                    const colorText = f.color_yes ? 'Y' : (f.color_no ? 'N' : '')
                    const fittingText = f.fitting_yes ? 'Y' : (f.fitting_no ? 'N' : '')
                    if (colorText) colorFit.push(`Color:${colorText}`)
                    if (fittingText) colorFit.push(`Fit:${fittingText}`)
                  }
                  const tags = typeof f.tags === 'string' ? JSON.parse(f.tags || '[]') : (f.tags || [])

                  return (
                    <tr key={i}>
                      <td style={{ fontSize: 9, padding: '4px 1px', verticalAlign: 'top', borderBottom: '1px dotted #bbb' }}>
                        {i + 1}
                      </td>
                      <td style={{ fontSize: 8, padding: '4px 1px', verticalAlign: 'top', borderBottom: '1px dotted #bbb', lineHeight: 1.25 }}>
                        <div style={{ fontWeight: 'bold' }}>{mat}</div>
                        {catLabel ? <div style={{ fontSize: 7 }}>{catLabel}</div> : null}
                        {isOnlyCutting ? <div style={{ fontSize: 7 }}>Qty: {Number(f.pcs) || 1}</div> : null}
                        {tags.length > 0 ? <div style={{ fontSize: 7 }}>{tags.join(', ')}</div> : null}
                        {colorFit.length > 0 ? <div style={{ fontSize: 7 }}>{colorFit.join(' ')}</div> : null}
                      </td>
                      <td style={{ fontSize: 9, textAlign: 'center', padding: '4px 1px', verticalAlign: 'top', borderBottom: '1px dotted #bbb' }}>
                        {gauge || '—'}
                      </td>
                      <td style={{ fontSize: 8, textAlign: 'center', padding: '4px 1px', verticalAlign: 'top', borderBottom: '1px dotted #bbb' }}>
                        {sizeStr}
                      </td>
                      <td style={{ fontSize: 9, textAlign: 'center', padding: '4px 1px', verticalAlign: 'top', borderBottom: '1px dotted #bbb' }}>
                        {isOnlyCutting || isSheetSale || isBending || isBendOnly ? '—' : Number(f.area || (isFancy ? f.width : 0) || 0).toFixed(2)}
                      </td>
                      <td style={{ fontSize: 9, textAlign: 'center', padding: '4px 1px', verticalAlign: 'top', borderBottom: '1px dotted #bbb' }}>
                        {isBendOnly ? `${money(f.bend_rate || 0)}/kg` : isBending ? `${money(f.bend_rate || 0)}/bend` : isFancy ? `${money(f.rate || 0)}/sf` : isSheetSale ? `${money(f.direct_price || 0)}/sheet` : isOnlyCutting ? '—' : money(f.rate || f.direct_price || 0)}
                      </td>
                      <td style={{ fontSize: 9, textAlign: 'right', padding: '4px 1px', verticalAlign: 'top', borderBottom: '1px dotted #bbb', fontWeight: 'bold' }}>
                        {money(f.total)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {billBend > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                <span>Bending Total</span>
                <span>PKR {money(billBend)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
              <span>Grand Total</span>
              <span>PKR {money(bill.grand_total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
              <span>Discount</span>
              <span>PKR {money(bill.discount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
              <span>Paid</span>
              <span>PKR {money(bill.paid_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 11 }}>
              <span>Due</span>
              <span>PKR {money(bill.remaining_balance)}</span>
            </div>

            <div style={{ borderTop: '1px double #000', margin: '6px 0' }} />

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 9 }}>
              QUALITY • ACCURACY • RELIABILITY
            </div>
            <div style={{ textAlign: 'center', fontSize: 8, marginTop: 2 }}>
              Developed by: ENGR. Usama Rehman<br />
              usamarehman067@gmail.com
            </div>
            <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '4px 0', fontSize: 10 }}>
              *** Thank You ***
            </div>

            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <div style={{ fontSize: 8 }}>Shop Location</div>
              <div id="thermal-location-crop" style={{ height: 180, overflow: 'hidden', marginTop: 3 }}>
                <img
                  src="/address.png"
                  alt="location"
                  style={{ width: '100%', height: 'auto', objectFit: 'contain', objectPosition: 'top', transform: 'scaleY(1.3)', transformOrigin: 'top' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-green btn-sm" onClick={copyText}>Copy Text</button>
          <button className="btn btn-blue btn-sm" onClick={printThermal}>Print 80mm Bill</button>
          <button className="btn btn-red btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
