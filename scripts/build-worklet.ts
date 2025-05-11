// WavePlayer Audio Worklet (wave-player.processor.ts)
const workletBuildOutput = await Bun.build({
  entrypoints: ["./lib/wave-player/worklet/wave-player.processor.ts"],
  outdir: "./public/worklets",
  banner: "/// <reference types=\"@types/audioworklet\" />",
  // minify: true,
});

console.log(
  `[build-worklet] Worklet build ${workletBuildOutput.success ? "complete" : "failed"} (${workletBuildOutput.outputs[0].hash})\n`
);

export {};