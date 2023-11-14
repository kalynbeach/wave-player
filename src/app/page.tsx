import WavePlayer from "@/components/wave-player";
import { tracks } from "@/lib/placeholder-data";

export default function Home() {
  return (
    <main className="p-24 flex min-h-screen flex-col gap-6 items-center justify-center">
      <h1 className="text-xl font-bold">wave-player</h1>
      <WavePlayer
        tracks={tracks}
      />
    </main>
  )
}
