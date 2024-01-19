import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { tracks } from "@/lib/placeholder-data";
import WavePlayer from "@/components/wave-player";

describe("DOM", () => {
  test("testing works", () => {
    document.body.innerHTML = `<div>hello</div>`;
    const div = document.querySelector("div");
    expect(div?.innerText).toEqual("hello");
  });
});

describe("wave player", () => {
  test.todo("renders", async () => {
    render(WavePlayer({ id: "1337", playlist: tracks }));
    const wavePlayer = await screen.findByTestId("wave-player");
    expect(wavePlayer).toBeDefined();
  });
});