import ThemeToggle from "@/components/theme/theme-toggle";
import { WavePlayer } from "@/components/wave-player";
import { PLACEHOLDER_TRACKS } from "@/data/tracks";
import { WavePlayerProvider } from "@/contexts/wave-player-context";

export default function Home() {
  return (
    <div className="grid grid-rows-[36px_1fr_36px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="row-start-1 flex items-center justify-center">
        <h1 className="text-xl font-mono font-bold">wave-player</h1>
      </header>
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <WavePlayerProvider>
          <WavePlayer tracks={PLACEHOLDER_TRACKS} />
        </WavePlayerProvider>
        {/* NOTE: track list placeholder */}
        <div className="flex flex-col gap-2 p-3 bg-muted/70 rounded-sm border font-mono">
          <p className="font-semibold">Tracks</p>
          <ol className="flex flex-col gap-1 list-decimal list-inside">
            {PLACEHOLDER_TRACKS.map((track) => (
              <li key={track.id} className="text-sm">{track.title}</li>
            ))}
          </ol>
        </div>
      </main>
      <footer className="row-start-3 flex items-center justify-center">
        <ThemeToggle />
      </footer>
    </div>
  );
}
