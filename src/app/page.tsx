import WavePlayer from "@/components/wave-player";
import ThemeToggle from "@/components/theme-toggle";
import { tracks } from "@/lib/placeholder-data";

export default function Home() {
  return (
    <main className="p-14 flex min-h-screen flex-col gap-14 items-center justify-center">
      <div className="w-full max-w-3xl flex flex-row items-center justify-between">
        <h1 className="text-xl font-bold">wave-player</h1>
        <ThemeToggle />
      </div>
      <WavePlayer
        id="1337"
        playlist={tracks}
      />
    </main>
  )
}
