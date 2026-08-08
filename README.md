# Capstone web presentation

`capstone-presentation.html` is a fixed-stage 1920×1080 web presentation for the capstone report. It contains 21 timed main slides, eight appendix slides and a separate precomputed input/output demo.

## Run locally

From the repository root, serve the directory over HTTP, then open `capstone-presentation.html` in a Chromium browser. The authored 1920×1080 stage scales uniformly to the viewport without responsive reflow.

## Controls

- `←` / `→`, `Page Up` / `Page Down`, mouse wheel or swipe: navigate within the active mode.
- `Home` / `End`: first or last slide in the active mode.
- `A`: open appendix A1. Appendix hashes are `#a1` through `#a8`.
- `D`: open the input/output demo from any main slide and return focus to Slide 21.
- `Escape`: close the demo, or leave appendix mode and return to the previous main slide.
- `E`: toggle inline editing.
- `Ctrl+S` / `Cmd+S`: save edits and download an updated HTML copy.

The on-screen controls provide previous, appendix, next and demo actions. Main progress always displays `1 / 21` through `21 / 21`; appendix progress displays `A1 / A8` through `A8 / A8`.

## Design guidelines

- Keep titles direct, sentence case, three to seven words and on one line. The formal project title is the only exception.
- Use no more than three marked visual regions per slide. Prefer one dominant visual with up to two supporting visuals and leave clear space between them.
- Use no more than three concise bullets and approximately 40–45 visible narrative words. Move detail into the speaker script before reducing type size.
- Keep slide titles at 36–44 pt or larger, body text at 22–26 pt, diagram labels at least 18 pt and source rails at 14–16 pt.
- Retain the warm off-white paper, black ink and red emphasis. Use blue for femur, orange for tibia, green for patella and red for fibula.
- Use authentic project inputs, targets and predictions. Do not imply CT replacement, clinical readiness, live inference or proven fracture preservation.

## Editing and evidence

Editable text uses stable `data-edit-id` values and the `capstone-knee-deck-edits-v3` local-storage key. Only compatible v2 fields migrate. Medical visuals come from project assets or embedded precomputed models; the demo does not run inference and must not be described as clinical validation.

## Presentation script

Use `presentation-script-15min.md`. The main script totals exactly 15:00. The demo script is separate and targets 60–90 seconds.
