# Custom house mark

Drop a file named **`house-mark.<ext>`** in this folder (`house-mark.png`,
`house-mark.svg`, `house-mark.webp`, …) and it is picked up automatically by
`src/components/Medusa.tsx` — no code change needed. It replaces the drawn
gorgon everywhere the mark appears.

- Delete the file to fall back to the original drawn mark.
- Only the first match is used, so keep one file here.
- A custom image can't inherit `currentColor`, so it won't recolour with the
  theme the way the inline SVG does. Export it in the colour you want.
