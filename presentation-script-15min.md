# 15-Minute Capstone Presentation Script

Timing target: **15:00**, followed by **5 minutes of Q&A/demo**. The numbered sections follow the 17-slide core route; use **+ Explore** only during Q&A.

## 1. Title | 0:00–0:20

Good morning. This project tests which decoder properties improve four-bone 3D knee reconstruction from paired AP and lateral X-ray projections. The contribution is a controlled comparison, not a claim of clinical readiness.

## 2. The inverse problem | 0:20–1:00

Two radiographs are fast and accessible, but each collapses depth and superimposes anatomy. The output must recover separate femur, tibia, patella and fibula volumes. CT remains the ground-truth reference, so this is an underdetermined reconstruction problem.

## 3. Why it matters | 1:00–1:35

Fracture morphology is spatial. A smooth reconstruction can still close a fracture gap or distort a surface. That is why average overlap alone is not enough, and why the project includes surface and failure analysis.

## 4. Literature and gap | 1:35–2:15

Prior work moved from geometric fitting to direct, biplanar and fracture-aware learning. However, named architectures change many things at once: topology, activation, capacity and training. Different data and projection geometry further confound comparisons. The gap is causal attribution under controlled conditions.

## 5. Research question and objectives | 2:15–2:50

The question is: how do decoder topology and activation affect overlap, surface accuracy and robustness under one fixed biplanar front end? I validate the cohort, freeze the representation pipeline, use complementary metrics, and compare four conditions across grouped folds.

## 6. Dataset and ground truth | 2:50–3:30

The cohort has 43 subjects and 71 knees: 58 healthy-source and 13 fractured-source knees. CT segmentations supply four separate bone targets; clinical X-rays are used only as a plausibility check. Fracture status remains confounded with source dataset, so subgroup differences are not causal fracture effects.

## 7. Preprocessing | 3:30–4:10

The six checks are physical DICOM ordering, anatomical isolation, spatial standardisation, fixed four-bone channels, paired AP/LAT DRRs and subject-grouped folds. The critical safeguards are correct volume order, laterality and bilateral-leakage prevention.

## 8. Experimental design | 4:10–4:45

This is a 2×2 factorial comparison: plain or residual topology, each with ReLU or PReLU. Encoder, fusion, lifting, widths, data, folds and training are held constant. The cross-over arms let us separate topology, activation and their interaction.

## 9. Architecture | 4:45–5:35

The pipeline starts with paired AP/LAT DRRs, encodes each view, fuses them, lifts the shared representation to 3D and decodes four bone channels. The stage diagram is interactive in Q&A: click a stage to focus it, then open its detailed evidence route.

## 10. Shared front end | 5:35–6:05

The shared front end gives every decoder the same representation. This is essential: a decoder result is meaningful only if upstream image features, fusion and lifting are unchanged.

## 11. Decoder comparison | 6:05–6:35

The two tested factors are topology and activation. A projected residual shortcut preserves the coarse feature and learns a refinement; PReLU is compared with ReLU without altering the rest of the decoder. The detailed decoder walkthrough is reserved for Q&A.

## 12. Main results | 6:35–7:30

Across the tested setup, residual topology produced the stronger independent effect, while PReLU added little benefit. Interpret the ranking as evidence about these matched decoder blocks—not as a universal claim that V-Net beats U-Net.

## 13. Fold robustness | 7:30–8:10

The fold view asks whether the result repeats rather than relying on one aggregate score. Grouped folds reduce leakage, but the cohort is still small, so variation across folds is part of the conclusion rather than noise to ignore.

## 14. Cohort and bone results | 8:10–8:55

Bone-level and cohort-level summaries expose differences an overall Dice can hide. They show where a condition works consistently and where small or difficult structures remain fragile.

## 15. Failure analysis | 8:55–9:50

Failure cases are central evidence. A plausible global shape can omit a small bone, blur a surface or fail around a fracture. These examples set the boundary of the claim: reconstruction quality is not yet sufficient for clinical decision-making.

## 16. Lifting limitation and evaluation | 9:50–10:50

The shared lifting stage is a representation bottleneck. A better decoder cannot recover detail never made available upstream. Within this scope, the project achieved controlled factor attribution, cohort safeguards and complementary evaluation; it did not achieve clinical validation.

## 17. Conclusion and Q&A | 10:50–11:30

Residual-ReLU was the strongest tested condition. The more durable contribution is the controlled evaluation framework that supports that conclusion and exposes its limits. I will now take questions; the Q&A buttons open the data, architecture, decoder, results, failure and future-work evidence.

## Q&A / demo | after 15:00

Use the final hub for the five-minute discussion and demo. For architecture questions, focus a stage on the modelling diagram and open its evidence route. For methodology, show the P1/P2, decoder or protocol routes. For interpretation, show the ceiling, failure or lift routes. Return to the conclusion after each answer.

## Speaker expansion cues

Use these short additions while pointing to the visual. They bring the prepared delivery to approximately 15 minutes without adding dense slide text.

1. Point to the project title and state that the comparison isolates decoder choices after the input representation has been fixed.
2. Trace AP and LAT in turn: each resolves some superimposition from the other, but neither directly supplies full three-dimensional depth.
3. Give one concrete failure: a reconstructed surface can look continuous while a clinically important fracture gap has been smoothed away.
4. Point to the three gap cards and explain that an uncontrolled leaderboard cannot tell whether a gain came from topology, data or training.
5. Read the four objectives as a chain: trustworthy cohort, fair input, richer evaluation, then causal decoder comparison.
6. Emphasise that healthy and fractured records come from different sources; this keeps the fracture analysis honest about what it can conclude.
7. Pause at the final preprocessing stage: grouping is performed before model fitting, so related knees cannot appear on opposite sides of a fold.
8. Use the matrix to name all four arms. Explain that the two diagonal comparisons alone would confound the variables; the cross-over cells solve that problem.
9. Click the architecture stages once. Explain that P1 and P2 prepare a shared representation, while only the controlled decoder stage changes between arms.
10. Clarify that freezing the front end is a fairness decision, not a claim that this representation is the best possible representation.
11. Point to the topology and activation cards: the shortcut is the architectural hypothesis; the activation test checks whether the effect is merely nonlinearity choice.
12. Pause on the result visual and state the careful scope: strongest tested condition, shared protocol, small research cohort.
13. Point to the fold spread before the mean. Consistency across held-out subject groups is stronger evidence than one pooled number.
14. Name the smallest or hardest structures when discussing the bone view, because those are where aggregate scores can be most misleading.
15. Let the failure visual remain visible for a beat. It demonstrates why the project reports limits alongside favourable metrics.
16. Link the lifting limitation to future work: improvements may require a richer 3D representation, more data or clinically validated targets, not only another decoder.
17. End with the defensible claim and invite questions about either the controls, evidence or limitations.
