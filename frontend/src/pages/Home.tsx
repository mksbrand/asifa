import Hero from "../components/Hero";

const FEATURES = [
  {
    icon: "🗺️",
    title: "Live Route Mapping",
    desc: "Interactive OpenStreetMap route with pickup, dropoff, fuel, break, and rest markers.",
  },
  {
    icon: "⏱️",
    title: "HOS Scheduling Engine",
    desc: "Dynamically enforces the 11-hour driving limit, 14-hour window, and 30-minute break rule.",
  },
  {
    icon: "📋",
    title: "Daily ELD Logs",
    desc: "Auto-generated, print-ready electronic logging device sheets for every day of the trip.",
  },
];

export default function Home() {
  return (
    <main>
      <Hero />

      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">
            Everything a dispatcher needs, automated
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">
            One trip request produces a complete, compliant, and visual trip plan.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition-shadow hover:shadow-glow">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl">
                {f.icon}
              </div>
              <h3 className="mb-1.5 font-semibold text-navy-900">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="compliance" className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="card grid grid-cols-1 gap-8 p-8 sm:grid-cols-2 sm:p-10">
            <div>
              <h3 className="mb-3 text-lg font-bold text-navy-900">HOS assumptions used</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• 70 hours / 8-day cycle limit</li>
                <li>• 11-hour max driving after 10 hrs off duty</li>
                <li>• 14-hour driving window</li>
                <li>• 30-minute break after 8 cumulative driving hours</li>
                <li>• 10 consecutive hours off-duty / sleeper berth to reset</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-lg font-bold text-navy-900">Stop rules</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Fuel stop inserted every 1,000 miles</li>
                <li>• Pickup allotted 1 hour on-duty, not driving</li>
                <li>• Dropoff allotted 1 hour on-duty, not driving</li>
                <li>• No adverse driving conditions exception applied</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-slate-400">
          TripPilot — built for a full-stack developer hiring assessment. Not for actual dispatch use.
        </div>
      </footer>
    </main>
  );
}
