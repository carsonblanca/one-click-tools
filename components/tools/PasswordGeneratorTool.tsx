"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolCheckbox,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

function getRandomIndex(max: number) {
  const values = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;

  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);

  return values[0] % max;
}

function pickCharacter(characters: string) {
  return characters[getRandomIndex(characters.length)];
}

function shuffleCharacters(characters: string[]) {
  const shuffled = [...characters];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomIndex(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled.join("");
}

export default function PasswordGeneratorTool() {
  const [length, setLength] = useState("16");
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [password, setPassword] = useState("");

  const selectedSets = [
    includeUppercase ? UPPERCASE : "",
    includeLowercase ? LOWERCASE : "",
    includeNumbers ? NUMBERS : "",
    includeSymbols ? SYMBOLS : "",
  ].filter(Boolean);

  const generatePassword = () => {
    const requestedLength = Number(length);

    if (
      !Number.isInteger(requestedLength) ||
      requestedLength < 4 ||
      requestedLength > 128
    ) {
      alert("Choose a password length from 4 to 128.");
      return;
    }

    if (selectedSets.length === 0) {
      alert("Select at least one character type.");
      return;
    }

    const allCharacters = selectedSets.join("");
    const requiredCharacters = selectedSets
      .slice(0, requestedLength)
      .map((characters) => pickCharacter(characters));

    const remainingCharacters = Array.from(
      { length: requestedLength - requiredCharacters.length },
      () => pickCharacter(allCharacters),
    );

    setPassword(
      shuffleCharacters([...requiredCharacters, ...remainingCharacters]),
    );
  };

  const copyPassword = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
  };

  return (
    <ToolPanel>
      <div>
        <ToolLabel>Password length</ToolLabel>
        <ToolInput
          type="number"
          value={length}
          onChange={setLength}
          placeholder="16"
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolCheckbox
          checked={includeUppercase}
          onChange={setIncludeUppercase}
        >
          Uppercase letters
        </ToolCheckbox>
        <ToolCheckbox
          checked={includeLowercase}
          onChange={setIncludeLowercase}
        >
          Lowercase letters
        </ToolCheckbox>
        <ToolCheckbox checked={includeNumbers} onChange={setIncludeNumbers}>
          Numbers
        </ToolCheckbox>
        <ToolCheckbox checked={includeSymbols} onChange={setIncludeSymbols}>
          Symbols
        </ToolCheckbox>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={generatePassword}>Generate Password</ToolButton>
        <ToolButton onClick={copyPassword} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={() => setPassword("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!password}>
        {password || "Generated password will appear here."}
      </ToolResultBox>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolStatCard label="Length" value={password.length || "-"} />
        <ToolStatCard label="Character types" value={selectedSets.length} />
      </div>
    </ToolPanel>
  );
}
