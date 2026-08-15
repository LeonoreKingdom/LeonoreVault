'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  MapPin,
  Package,
  QrCode,
  RotateCcw,
  Zap,
} from 'lucide-react';

type ScanResult = 'item' | 'spot' | 'return';

const recentScans = [
  {
    name: 'Mirrorless camera',
    location: 'Media cabinet',
    time: '2m ago',
    result: 'item' as ScanResult,
    href: '/items/item-camera',
  },
  {
    name: 'Media cabinet',
    location: 'Living room',
    time: 'Yesterday',
    result: 'spot' as ScanResult,
    href: '/locations?spot=media-cabinet#storage-map',
  },
  {
    name: 'Cordless drill',
    location: 'Tool cabinet',
    time: '3 days ago',
    result: 'item' as ScanResult,
    href: '/items/item-drill',
  },
];

export default function ScanPage() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [returnCompleted, setReturnCompleted] = useState(false);

  function resetScan() {
    setScanResult(null);
    setReturnCompleted(false);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start gap-3 sm:gap-4">
        <Link
          href="/"
          aria-label="Back to dashboard"
          className="text-muted hover:text-foreground hover:bg-hover mt-1 rounded-xl p-2 transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="text-accent mb-2 flex items-center gap-2 text-sm font-semibold">
            <QrCode size={16} />
            <span>Quick access</span>
            <span className="text-muted-light">/</span>
            <span className="text-muted font-normal">QR scanner</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Find it in a second</h1>
          <p className="text-muted mt-1">Point your camera at an item label to open its details.</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4" aria-labelledby="scanner-heading">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="scanner-heading" className="text-lg font-bold">
                Scan a QR label
              </h2>
              <p className="text-muted mt-0.5 text-sm">
                Use the camera viewfinder or upload an image.
              </p>
            </div>
            <span className="bg-success/10 text-success rounded-full px-2.5 py-1 text-xs font-semibold">
              Ready
            </span>
          </div>

          <div className="border-border bg-surface overflow-hidden rounded-2xl border p-3 shadow-sm sm:p-4">
            <div className="relative flex min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-xl bg-slate-950 px-6 py-8 text-white sm:min-h-[430px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(124,58,237,0.32),_transparent_48%)]" />
              <div className="absolute left-5 top-5 h-10 w-10 border-l-2 border-t-2 border-white/80" />
              <div className="absolute right-5 top-5 h-10 w-10 border-r-2 border-t-2 border-white/80" />
              <div className="absolute bottom-5 left-5 h-10 w-10 border-b-2 border-l-2 border-white/80" />
              <div className="absolute bottom-5 right-5 h-10 w-10 border-b-2 border-r-2 border-white/80" />

              <div className="relative z-10 flex flex-col items-center text-center">
                {!scanResult ? (
                  <>
                    <div className="border-accent/80 shadow-accent/20 relative flex h-44 w-44 items-center justify-center rounded-2xl border-2 bg-white/5 shadow-2xl sm:h-52 sm:w-52">
                      <QrCode size={112} strokeWidth={1.1} className="text-white/90" />
                      <span className="bg-accent absolute -inset-x-5 top-1/2 h-px shadow-[0_0_18px_4px_rgba(167,139,250,0.7)]" />
                    </div>
                    <p className="mt-7 text-sm font-semibold">Align the QR code inside the frame</p>
                    <p className="mt-1 text-xs text-white/60">
                      The preview is ready for the scanner connection.
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="bg-success/20 text-success flex h-20 w-20 items-center justify-center rounded-full">
                      <CheckCircle2 size={42} />
                    </div>
                    <p className="mt-5 text-lg font-bold">Label recognized</p>
                    <p className="mt-1 text-sm text-white/65">
                      {scanResult === 'item'
                        ? 'Mirrorless camera'
                        : scanResult === 'spot'
                          ? 'Media cabinet'
                          : 'Cordless drill'}
                    </p>
                  </div>
                )}
              </div>

              <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur">
                <span className="bg-success h-1.5 w-1.5 rounded-full" />
                Frontend preview
              </div>
            </div>

            <div className="flex flex-col gap-3 px-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="border-border hover:bg-hover inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors">
                <ImageIcon size={16} />
                Upload image
                <input type="file" accept="image/*" className="hidden" />
              </label>
              <div className="flex gap-2">
                {scanResult && (
                  <button
                    type="button"
                    onClick={resetScan}
                    className="border-border hover:bg-hover inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
                  >
                    <RotateCcw size={16} />
                    Scan again
                  </button>
                )}
                {!scanResult && (
                  <>
                    <button
                      type="button"
                      onClick={() => setScanResult('item')}
                      className="from-primary to-accent inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
                    >
                      <Camera size={16} />
                      Scan item
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanResult('spot')}
                      className="border-border hover:bg-hover inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
                    >
                      <MapPin size={16} />
                      Scan spot
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanResult('return')}
                      className="border-border hover:bg-hover inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
                    >
                      <RotateCcw size={16} />
                      Return item
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {scanResult === 'item' && (
            <section
              className="border-border bg-surface rounded-2xl border p-5 shadow-sm sm:p-6"
              aria-labelledby="scan-result-heading"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-success/10 text-success flex h-11 w-11 items-center justify-center rounded-xl">
                    <Package size={21} />
                  </div>
                  <div>
                    <p className="text-muted text-xs font-medium uppercase tracking-wide">
                      Scan result
                    </p>
                    <h2 id="scan-result-heading" className="font-bold">
                      Mirrorless camera
                    </h2>
                    <p className="text-muted mt-0.5 text-sm">Media cabinet · Electronics</p>
                  </div>
                </div>
                <Link
                  href="/items/item-camera"
                  className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold"
                >
                  Open item details
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </section>
          )}

          {scanResult === 'spot' && (
            <section
              className="border-border bg-surface rounded-2xl border p-5 shadow-sm sm:p-6"
              aria-labelledby="spot-result-heading"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-accent/10 text-accent flex h-11 w-11 items-center justify-center rounded-xl">
                    <MapPin size={21} />
                  </div>
                  <div>
                    <p className="text-muted text-xs font-medium uppercase tracking-wide">
                      Scan result
                    </p>
                    <h2 id="spot-result-heading" className="font-bold">
                      Media cabinet
                    </h2>
                    <p className="text-muted mt-0.5 text-sm">Living room · 5 items</p>
                  </div>
                </div>
                <Link
                  href="/locations?spot=media-cabinet#storage-map"
                  className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold"
                >
                  Open spot contents
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </section>
          )}

          {scanResult === 'return' && (
            <section
              className="border-border bg-surface rounded-2xl border p-5 shadow-sm sm:p-6"
              aria-labelledby="return-result-heading"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`${returnCompleted ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl`}
                  >
                    {returnCompleted ? <CheckCircle2 size={21} /> : <RotateCcw size={21} />}
                  </div>
                  <div>
                    <p className="text-muted text-xs font-medium uppercase tracking-wide">
                      Return flow
                    </p>
                    <h2 id="return-result-heading" className="font-bold">
                      Cordless drill
                    </h2>
                    <p className="text-muted mt-0.5 text-sm">
                      {returnCompleted
                        ? 'Returned just now'
                        : 'Checked out by Raka · Due in 3 days'}
                    </p>
                  </div>
                </div>
                {!returnCompleted ? (
                  <button
                    type="button"
                    onClick={() => setReturnCompleted(true)}
                    className="from-primary to-accent inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
                  >
                    <CheckCircle2 size={16} />
                    Mark as returned
                  </button>
                ) : (
                  <Link
                    href="/items/item-drill"
                    className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold"
                  >
                    Open item details
                    <ArrowUpRight size={15} />
                  </Link>
                )}
              </div>
              {!returnCompleted && (
                <p className="text-muted bg-warning/5 mt-5 rounded-xl p-3 text-sm leading-relaxed">
                  Confirming marks this item as back in its storage spot in the connected data flow.
                </p>
              )}
            </section>
          )}
        </section>

        <aside className="space-y-6" aria-label="Scanner information">
          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
            aria-labelledby="camera-heading"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="bg-primary/10 text-primary mb-3 flex h-9 w-9 items-center justify-center rounded-xl">
                  <Camera size={18} />
                </div>
                <h2 id="camera-heading" className="font-bold">
                  Camera source
                </h2>
                <p className="text-muted mt-0.5 text-sm">Choose the device to use.</p>
              </div>
              <Zap size={17} className="text-warning" />
            </div>
            <select
              className="border-border bg-background focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2"
              defaultValue="back"
            >
              <option value="back">Back camera</option>
              <option value="front">Front camera</option>
            </select>
            <p className="text-muted mt-3 text-xs leading-relaxed">
              Camera permissions will be connected when the scanner integration is enabled.
            </p>
          </section>

          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
            aria-labelledby="recent-scans-heading"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="recent-scans-heading" className="font-bold">
                  Recent scans
                </h2>
                <p className="text-muted mt-0.5 text-sm">Your latest quick finds.</p>
              </div>
              <Clock3 size={17} className="text-muted-light" />
            </div>
            <div className="space-y-1">
              {recentScans.map((scan) => (
                <Link
                  key={scan.name}
                  href={scan.href}
                  className="hover:bg-hover -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors"
                >
                  <span className="bg-accent/10 text-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                    {scan.result === 'item' ? <QrCode size={15} /> : <MapPin size={15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{scan.name}</span>
                    <span className="text-muted flex items-center gap-1 text-xs">
                      <MapPin size={11} />
                      {scan.location}
                    </span>
                  </span>
                  <span className="text-muted-light text-[10px]">{scan.time}</span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
