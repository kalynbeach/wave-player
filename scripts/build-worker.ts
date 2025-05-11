// WavePlayer Web Worker (wave-player.worker.ts)
const workerBuildOutput = await Bun.build({
  entrypoints: ["./lib/wave-player/worker/wave-player.worker.ts"],
  outdir: "./public/workers",
  banner: "/// <reference lib=\"webworker\" />\n/// <reference types=\"@types/dom-webcodecs\" />",
  // minify: true,
});

console.log(
  `[build-worker] Worker build ${workerBuildOutput.success ? "complete" : "failed"} (${workerBuildOutput.outputs[0].hash})\n`
);

export {};