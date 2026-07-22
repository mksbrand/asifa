import TripForm from "./TripForm";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero-gradient">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_60%,transparent_100%)]" />

      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-2">
          <div className="animate-fadeUp">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5">
              <span className="text-xs font-semibold text-brand-700">FMCSA Property-Carrying Driver Rules</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-navy-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Plan smarter.
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
                Drive compliant.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
              Generate optimized routes, HOS-compliant schedules, rest stops, fuel stops, and
              daily ELD logs in seconds — built for property-carrying commercial drivers.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-slate-200 pt-8">
              <div>
                <p className="text-2xl font-extrabold text-navy-900">70/8</p>
                <p className="text-xs font-medium text-slate-500">Hour cycle rule</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-navy-900">11 hr</p>
                <p className="text-xs font-medium text-slate-500">Max driving limit</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-navy-900">100%</p>
                <p className="text-xs font-medium text-slate-500">Dynamically calculated</p>
              </div>
            </div>
          </div>

          <div className="animate-fadeUp [animation-delay:100ms]">
            <TripForm />
          </div>
        </div>
      </div>
    </section>
  );
}
