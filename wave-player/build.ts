/**
 * Build the WavePlayer package bundle
 */
async function buildWavePlayer() {
  const result = await Bun.build({
    entrypoints: ["./wave-player/index.tsx"],
    outdir: "./wave-player/out",
    external: ["react", "react-dom", "next"],
    minify: true,
  });

  if (!result.success) {
    console.error("[wave-player] Build failed");
    for (const message of result.logs) {
      console.error(message);
    }
  }

  console.log(`[wave-player] Build complete!\n`);
  for (const artifact of result.outputs) {
    console.log(artifact);
  }
}

buildWavePlayer();