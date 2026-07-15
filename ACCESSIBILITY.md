# Accessibility standard

## Target

NeuroStack Explorer targets WCAG 2.2 Level AA for the public experience. This is
a release requirement, not a post-launch enhancement. Compliance must be
supported by automated and manual evidence; this document alone is not a claim
that the target has been met.

The current scientific source and artifact identities are verified, but the
manual accessibility matrix below remains open. Dataset verification does not
stand in for keyboard, screen-reader, contrast, reflow, or reduced-motion QA.

## Core requirements

- Use semantic landmarks, logical headings, lists, tables, labels, and buttons.
- Provide a visible skip link and visible keyboard focus.
- Keep reading and focus order aligned with the visual order.
- Support keyboard and touch without hover-only actions.
- Maintain at least 44-by-44 CSS-pixel touch targets where practical and avoid
  closely packed controls.
- Support 200% zoom, text reflow, and widths down to 320 CSS pixels without
  losing content or creating two-dimensional page scrolling.
- Do not use color, animation, position, sound, or 3D depth as the only carrier
  of information.
- Respect `prefers-reduced-motion`; provide explicit play, pause, replay, or
  static alternatives for scientific sequences.
- Preserve essential content when JavaScript, Canvas, WebGL, or a heavy chart
  library is unavailable.

## Scientific charts

Every chart or scientific visual needs:

- a descriptive title and stated scientific purpose;
- axes, units, conditions, sample definition, and relevant bin/window settings;
- a concise text summary that does not overstate interpretation;
- an accessible data table or equivalent structured alternative;
- keyboard-operable controls with visible state and programmatic names;
- legends and encodings that remain understandable without color;
- a method to reset filters and understand which data are currently included;
- announced updates only when useful, without flooding live regions.

Do not place thousands of SVG marks into the accessibility tree. Use a concise
group description, structured table/summary, and focused exploration pattern.

For the current DANDI-derived artifact, accessible labels must distinguish the
20 ms source position interval from the 100 ms browser derivative and model
observation bin. They must identify the selected unit from the eight reviewed
IDs, expose the active interval within the 600-second support, and preserve
spikes/s versus count/bin units. The source is one Long Evans rat MEC LII
session; alternative text must not generalize beyond it.

## Linked explorer interactions

Brushing, filtering, unit selection, smoothing, and model-result selection must
be possible without a pointer. Each change should expose:

- the current setting;
- the valid range and units;
- whether it changes only the view or recomputes an analysis;
- the number of observations currently represented;
- a reset action.

Every update must also identify its execution boundary. A visitor can select or
derive a bounded view from a precomputed artifact, but cannot trigger live
Python, notebook, NeMoS, PyTorch, Stan, BridgeStan, or plenoptic execution. A
status announcement must not call a client-derived view a newly fitted model.

Focus must not jump unexpectedly when linked views update. Status messages
should be polite and summarized.

## Canvas, WebGL, and dense rendering

Canvas or WebGL may render dense data, but the canvas itself is not an
accessible substitute for content. Pair it with HTML controls, a textual
description, result summary, and table or downloadable accessible data.

Decorative three-dimensional scenes must be hidden from assistive technology,
must pause off-screen, and must not block navigation or reading. Reduced-motion,
Save-Data, unavailable-context, and context-loss states need static fallbacks.

## Notebook preview and code

- Preserve notebook headings, Markdown, equations, code, output order, and
  language labels in semantic HTML.
- Give figures meaningful alternatives and tables proper headers.
- Keep source code keyboard-scrollable without trapping focus.
- Provide a downloadable notebook separately from the read-only preview.
- Identify skipped, cached, failed, or resource-limited cells truthfully.
- Avoid announcing every token or line through assistive technology.

The committed notebook is an executed, read-only verification walkthrough. Its
preview states that it opens the checksum-gated local NWB, reconstructs
Pynapple objects, refits the deterministic NeMoS, scikit-learn, and PyTorch
lanes, and inspects the committed Stan artifact. Public execution controls,
Binder, Colab, or a general-purpose kernel must not be implied.

## Scientific Figure Viewer

The shareable figure surface is an internal, read-only, Figurl-inspired viewer,
not an official hosted Figurl instance. Keyboard users must be able to move
between panels, inspect the active unit and interval, open provenance and chart
descriptions, enter and leave fullscreen without losing focus, and copy bounded
view state without exposing private paths or tokens.

## Motion and animation

No animation may be required to understand the pipeline or model result. Under
reduced motion:

- disable autoplay and large translations, zooms, and parallax;
- replace temporal sequences with a labeled static state or step controls;
- avoid pulsing/glowing effects and rapidly changing chart transitions;
- preserve the same information and actions.

## Content and language

Define specialized neuroscience and modeling terms at first use or provide a
glossary link. Use plain-language summaries beside detailed methods. Link text
must describe the destination or action; avoid interface-oriented labels such
as “click here.” Clearly identify links that open a new tab in accessible text.

## Verification matrix

Before release, record evidence for:

- [ ] landmarks, headings, names, roles, and states;
- [ ] complete keyboard-only route and interactive explorer workflow;
- [ ] focus visibility, dialog focus management, and Escape behavior;
- [ ] touch operation without hover;
- [ ] reduced-motion behavior;
- [ ] 200% zoom and 320 CSS-pixel reflow;
- [ ] text and non-text contrast;
- [ ] chart summaries, tables, units, and color-independent encoding;
- [ ] screen-reader review of at least the homepage, interactive explorer,
      pipeline, data, notebook, methods, and one tool/model route;
- [ ] no-JavaScript and unavailable-Canvas/WebGL fallbacks;
- [ ] automated accessibility scan with manually reviewed results;
- [ ] representative mobile, tablet, laptop, and wide-desktop layouts.

Record browser, operating system, assistive technology, viewport, date, and
known exceptions. Automated scans cannot replace manual scientific-chart review.
