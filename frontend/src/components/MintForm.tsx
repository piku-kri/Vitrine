import { useState } from "react";

interface MintFormProps {
  connected: boolean;
  minting: boolean;
  onMint: (title: string, medium: string) => void;
}

export function MintForm({ connected, minting, onMint }: MintFormProps) {
  const [title, setTitle] = useState("");
  const [medium, setMedium] = useState("");

  const valid = title.trim().length > 0 && title.length <= 80 && medium.trim().length > 0 && medium.length <= 40;

  function submit() {
    if (!valid) return;
    onMint(title.trim(), medium.trim());
    setTitle("");
    setMedium("");
  }

  return (
    <div className="mint-form">
      <span className="mint-form__eyebrow">submit a piece</span>
      <input
        className="mint-form__input"
        placeholder="Title"
        value={title}
        maxLength={80}
        onChange={(e) => setTitle(e.target.value)}
        disabled={!connected || minting}
      />
      <input
        className="mint-form__input"
        placeholder="Medium (e.g. oil on canvas, generative code)"
        value={medium}
        maxLength={40}
        onChange={(e) => setMedium(e.target.value)}
        disabled={!connected || minting}
      />
      <button className="gallery-btn" onClick={submit} disabled={!connected || minting || !valid}>
        {minting ? "minting…" : "mint & hang"}
      </button>
    </div>
  );
}
