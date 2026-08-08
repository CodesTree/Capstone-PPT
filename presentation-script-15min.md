# 15-minute presentation script

The timed sequence contains 21 slides and totals exactly 15:00. The demo is separate and lasts 60–90 seconds.

## Slide 1 — Fracture-Preserving 3D Knee Reconstruction (0:15)

This project asks whether two ordinary knee projections can support a useful four-bone 3D reconstruction, while avoiding claims that a visually plausible result has preserved a fracture.

## Slide 2 — Knee Imaging Background (0:35)

AP and lateral radiographs are accessible and complementary, but each collapses depth. CT resolves three-dimensional anatomy at greater cost and radiation. My system therefore uses the two projections to reconstruct femur, tibia, patella and fibula.

## Slide 3 — Reconstruction Problem Statement (0:40)

This is an ill-posed inverse problem: several 3D shapes can explain the same images. Overlap obscures boundaries, particularly for small bones. The safety issue is that a smooth, plausible reconstruction can still remove clinically important fracture morphology.

## Slide 4 — Medical Reconstruction Literature (0:45)

The literature moves through model families. Before 2020, statistical shape models and deformable fitting adapted a known shape to the images. In 2020–21, voxel CNNs, CycleGAN, Pix2pix and latent-transfer CNNs learned mappings from images to volumes. In 2022, atlas registration combined ProST with dual U-Nets. FracReconNet made fracture evidence explicit in 2023. Recent work explores transformers, implicit fields and hybrid registration. Across studies, however, data, geometry and training change with architecture.

## Slide 5 — Identified Research Gap (0:35)

The literature conclusion gives three reasons a controlled study is needed. First, decoder topology, activation and training are often bundled together. Second, datasets and projection geometry differ. Third, aggregate metrics can hide a missing small bone. This study therefore isolates decoder properties in one shared, failure-aware pipeline.

## Slide 6 — Research Question and Objectives (0:40)

The research question asks how decoder topology and activation affect overlap, surface accuracy and robustness under one leakage-controlled bi-planar front end. The aim is a controlled U-Net-style versus V-Net-style decoder study. The objectives are: build the cohort, hold the front end fair, use complementary Dice and ASSD evidence, and compare the four decoder conditions.

## Slide 7 — Datasets and Study Cohort (0:40)

After seven exclusions, the cohort contains 43 subjects and 71 knees. Fifty-eight are healthy-source and thirteen fractured-source. Subjects, not individual knees, are grouped before splitting, preventing information from one person entering both training and evaluation.

## Slide 8 — Ground Truth Preparation (0:35)

The CT workflow segments the four bones, refines and exports the masks, aligns them in one frame and voxelises them as four binary channels. Those targets support training and evaluation. They are computational ground truths: fracture morphology was not independently validated by clinical experts.

## Slide 9 — Data Preparation Pipeline (0:45)

This is the report pipeline. After case cleaning and anatomical isolation, spatial standardisation uses SimpleITK, followed by radiometric standardisation. A four-channel binary target is constructed, then a fracture mask is retained before paired DRRs are generated. The detailed risk checks remain available in Appendix A3.

## Slide 10 — Controlled Decoder Experiment (0:45)

The design crosses two factors: plain versus residual topology, and ReLU versus PReLU activation. The shared front end, data, folds, initialisation policy and training protocol stay matched. This makes the decoder comparison interpretable as a controlled 2-by-2 experiment.

## Slide 11 — Experimental Controls and Responsibility (0:40)

Evaluation is subject-grouped and out-of-fold. Every decoder uses the same frozen front end and matched training policy. The system is a research prototype, not a clinical device. Reusing computed features limits unnecessary retraining, although energy use was not fully measured.

## Slide 12 — Representation Learning Stages (0:50)

[Click 1] The inputs are paired AP and lateral DRRs. [Click 2] P1 learns local structure through masked single-view reconstruction. [Click 3] P2 learns cross-view relationships by completing one view from the other. [Click 4] Online augmentation is confined to training data.

## Slide 13 — Shared Front-End Design (0:45)

[Click 1] Four encoder scales retain fine and coarse evidence. [Click 2] AP and lateral features fuse at corresponding scales. [Click 3] A Cartesian operation lifts them into 3D. [Click 4] This lift is approximate and motivates a future ray-aware comparison.

## Slide 14 — Decoder Architecture Comparison (0:50)

[Click 1] Every arm receives the same lifted multiscale volume. [Click 2] The plain block applies sequential transformations. [Click 3] The residual block adds identity-assisted refinement. [Click 4] Crossing both blocks with ReLU and PReLU creates the four controlled conditions.

## Slide 15 — Reconstruction Evaluation Metrics (0:40)

Dice measures volume overlap, so higher is better. ASSD measures average surface separation in millimetres, so lower is better. If a bone is missing entirely, it receives an explicit penalty instead of disappearing from the average.

## Slide 16 — Front-End Learning Results (0:40)

The best validation macro-Dice was 0.574. The original front-end pattern is clear: large bones perform best and small bones remain weaker. The per-bone maxima are femur 0.732 in Fold 4, tibia 0.698 in Fold 1, patella 0.529 in Fold 4 and fibula 0.359 in Fold 4. This same hierarchy reappears in decoder results.

## Slide 17 — Overall Decoder Results (0:55)

Residual–ReLU performed best: 0.455 Dice and 11.44 millimetres ASSD. Under ReLU, residual topology added 0.049 Dice and reduced surface distance by 2.44 millimetres. PReLU did not beat ReLU, so topology—not learned negative slope—was the main effect.

## Slide 18 — Fold and Bone Results (0:50)

Residual–ReLU remained strongest across the five folds, although absolute performance varied. Its Dice was 0.631 for femur and 0.627 for tibia, but only 0.380 for patella and 0.183 for fibula. Small bones remain the dominant bottleneck.

## Slide 19 — Cohort and Failure Analysis (0:55)

[Next 1] Healthy-source knees reached 0.489 Dice; fractured-source knees reached 0.377. Pathology and source domain are confounded, so this is not a pure fracture effect. You may drag the model without changing the explanation. [Next 2] One missing patella caused a 346.41-millimetre knee-level penalty. [Next 3–4] Retaining it exposes the limit of averages and the clinical boundary.

## Slide 20 — Limitations and Future Work (0:55)

Each limitation maps to a test: expand the fractured cohort, separate domain from pathology, refine output resolution for small bones, and compare Cartesian with ray-aware lifting. Expert fracture validation must precede any claim about preservation or clinical use.

## Slide 21 — Conclusion and Contributions (0:45)

Residual–ReLU is the winning controlled condition. The four objectives were completed through an auditable cohort, fair comparison and failure-aware analysis. The contribution is computing evidence about decoder topology. It is not CT replacement, clinical readiness or proof of fracture preservation.

## Input/output demo (60–90 seconds, outside timed deck)

1. Press `D` or select **Input/output demo**.
2. “These are the authentic AP and lateral DRR inputs for a preloaded case.”
3. Select **Reveal output**.
4. “This four-bone prediction was generated beforehand; this is not live inference.”
5. Drag the prediction once: “Rotation reveals the recovered depth.”
6. “The adjacent image is a project ground-truth example for visual reference; it is not a claim of clinical validation.”
7. Press `Escape` and return to Slide 21.

Fallback wording: “The interactive model is unavailable, so I am showing the prepared static input and output evidence. The prediction was generated beforehand.”
