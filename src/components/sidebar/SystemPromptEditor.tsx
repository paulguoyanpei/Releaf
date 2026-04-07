import { useState, useEffect, useRef } from 'react';
import { KEYS } from '../../utils/storage-keys';

export function SystemPromptEditor() {
  const [value, setValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load on mount
  useEffect(() => {
    chrome.storage.sync.get(KEYS.SYSTEM_PROMPT_GLOBAL).then((result) => {
      const saved = result[KEYS.SYSTEM_PROMPT_GLOBAL] as string | undefined;
      if (saved) setValue(saved);
    });
  }, []);

  // Save with debounce
  function handleChange(newValue: string) {
    setValue(newValue);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      chrome.storage.sync.set({ [KEYS.SYSTEM_PROMPT_GLOBAL]: newValue });
    }, 500);
  }

  return (
    <textarea
      className="system-prompt-textarea"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="e.g., You are an expert in machine learning. I am writing for NeurIPS 2026. Use formal academic English."
    />
  );
}
