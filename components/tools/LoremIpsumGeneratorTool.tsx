"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
} from "../tool-ui/ToolUI";

const sentences = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Integer vitae ligula sed augue facilisis dignissim.",
  "Suspendisse potenti, sed feugiat neque pulvinar non.",
  "Praesent commodo felis at sapien tincidunt, vitae luctus nibh gravida.",
  "Curabitur euismod sem nec tortor posuere, ac fermentum neque posuere.",
  "Donec luctus magna id arcu laoreet, non hendrerit mauris consequat.",
];

function buildParagraph(index: number) {
  const rotated = sentences
    .slice(index % sentences.length)
    .concat(sentences.slice(0, index % sentences.length));

  return rotated.slice(0, 4).join(" ");
}

function generateLorem(paragraphCount: number) {
  return Array.from({ length: paragraphCount }, (_, index) =>
    buildParagraph(index),
  ).join("\n\n");
}

export default function LoremIpsumGeneratorTool() {
  const [paragraphs, setParagraphs] = useState("3");
  const [text, setText] = useState("");

  const generate = () => {
    const count = Number(paragraphs);

    if (!Number.isInteger(count) || count < 1 || count > 20) {
      alert("Choose between 1 and 20 paragraphs.");
      return;
    }

    setText(generateLorem(count));
  };

  const copy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  return (
    <ToolPanel>
      <div>
        <ToolLabel>Paragraphs</ToolLabel>
        <ToolInput
          type="number"
          value={paragraphs}
          onChange={setParagraphs}
          placeholder="3"
        />
      </div>

      <ToolButtonRow>
        <ToolButton onClick={generate}>Generate</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={() => setText("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!text}>
        {text ? (
          <div className="whitespace-pre-wrap">{text}</div>
        ) : (
          "Generated lorem ipsum will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
