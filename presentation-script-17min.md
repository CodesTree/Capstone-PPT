# 17-Minute Capstone Presentation Script

Timing target: **17:00**  
Delivery pace: approximately **110–120 words per minute**, including visual pauses  
Total slides: **27**

Use slide titles as prompts instead of reading visible text word-for-word. On Slides 13–18 and 24, advance the interactive visual at each [click] cue. If time is running behind, shorten Slides 8, 9, 15 and 17 before cutting the results or conclusion.

## Slide 1 — Title | 0:00–0:20

Good morning. I am Chan Zheng Shao, and my project investigates fracture-preserving 3D knee reconstruction from two X-ray projections. Rather than comparing two complete networks with many hidden differences, I conducted a controlled comparison of U-Net-style and V-Net-style decoder blocks. The central question is which decoder property actually changes reconstruction performance.

## Slide 2 — The inverse problem | 0:20–0:55

The input contains only two images: an anterior-posterior view and a lateral view. These projections are accessible and fast, but each collapses depth and superimposes anatomy. The desired output is much richer: a three-dimensional reconstruction of the femur, tibia, patella and fibula. This is therefore an underdetermined inverse problem. The model must infer missing depth without inventing plausible but incorrect anatomy. CT remains the detailed reference; this project does not claim to replace it.

## Slide 3 — Why it matters | 0:55–1:30

This distinction matters because fracture morphology is spatial, not simply present or absent. A smooth-looking reconstruction may incorrectly close a fracture gap. It may also change fragment displacement, angulation or articular depression. Therefore, high aggregate overlap alone is not evidence that a fracture has been preserved safely. This project treats such failures explicitly and positions the output only as an experimental reconstruction prototype, not a diagnostic system.

## Slide 4 — Literature trajectory | 1:30–2:15

The literature shows a clear progression. Early work emphasized on SSMs and have calibration, focal position, orientation and anatomical superimposition as a core constrint. Kasten and colleagues then demonstrated end-to-end biplanar knee reconstruction. Later studies expanded to clinical wrist radiographs, calibrated atlas registration, fracture-aware reconstruction, neural implicit fields and transformer-based methods. My report compares eleven studies systematically across data, preprocessing, architecture, training and results, with Shakya and Khanal providing an additional benchmarking perspective. The main lesson is that reported accuracy cannot be separated from dataset and experimental design.

## Slide 5 — Research gap | 2:15–2:55

The gap is not simply that U-Net and V-Net have not been compared. The problem is that named networks bundle topology, activation, normalization, capacity, loss and training choices. Datasets and projection geometry also differ between studies. Finally, aggregate Dice can conceal small-bone, surface and fracture failures. So asking which complete network wins does not reveal the cause. A more defensible question is which decoder property changes performance when everything upstream is controlled.

## Slide 6 — Research question and objectives | 2:55–3:40

My research question is: how do decoder-block topology and activation influence overlap, surface accuracy and robustness under one shared, leakage-controlled biplanar front end? Four objectives support that question. First, assemble a cohort with verified geometry, laterality and subject separation. Second, hold the front end constant. Third, evaluate with complementary Dice and ASSD metrics, including bone and cohort analysis. Fourth, compare four decoder conditions over five subject-grouped folds. Together, these objectives connect the problem directly to the methodology.

## Slide 7 — Cohort | 3:40–4:15

The final cohort contains 43 subjects and 71 knees: 58 healthy-source knees and 13 fractured-source knees. Bilateral knees from the same person remain in the same fold, preventing subject leakage. Results are then averaged at subject level so a person with two knees does not receive twice the weight. Every test fold includes both sources. However, fracture status is confounded with dataset and acquisition source, so subgroup differences cannot be interpreted as a purely causal fracture effect.

## Slide 8 — Ground-truth meshes | 4:15–4:50

Ground truth was created by segmenting each CT into four bones, refining the masks and exporting one surface per bone. Each surface was then aligned and voxelised into the same LPS-oriented, 200-millimetre, 256-cubed grid. These four channels provide separate Dice and surface-distance references. A limitation is that the meshes and fracture regions were manually prepared without radiologist or orthopaedic-specialist validation, so clinical boundary accuracy is not guaranteed.

## Slide 9 — Preparation pipeline | 4:50–5:25

The data pipeline was designed around geometry. DICOM slices were ordered using physical coordinates rather than filenames. Bilateral anatomy was separated and laterality checked. Each knee was canonicalised to LPS orientation, cropped to a fixed physical field and converted into four fixed bone channels. Paired AP and lateral DRRs were then generated. The three major risk gates were incorrect slice order, laterality error and leakage, because any of these could be mistaken for model behaviour.

## Slide 10 — Controlled experiment | 5:25–6:00

The experiment uses a two-by-two factorial design. One factor is plain versus projected-residual topology. The other is ReLU versus PReLU activation. This produces plain-ReLU, plain-PReLU, residual-ReLU and residual-PReLU conditions. The usual U-style and V-style comparison is therefore retained, but the two extra arms separate topology from activation. The encoder, fusion, lifting, decoder widths, folds, augmentation, loss, optimiser and schedule remain fixed.

## Slide 11 — Fairness and responsible computing | 6:00–6:45

Fairness is enforced in three stages. Test subjects are excluded from encoder and decoder learning. The front end is frozen, and all arms use the same recorded initial state, loss, optimiser, seed and schedule. Evaluation is fully out of fold: twenty runs produce 71 knee predictions per arm and 43 subject-level comparisons. Responsible computing also means reporting imbalance, subgroup performance and catastrophic failures rather than only mean accuracy. The prototype is not clinically ready, and because environmental impact was not measured, I make no sustainability claim.

## Slide 12 — P1 and P2 summary | 6:45–7:20

Before supervised reconstruction, five fold-specific ConvNeXtV2 encoders were developed. In Phase P1, the model learned single-view radiographic structure using 60-percent uniform masking, without bone or fracture labels. Mean validation loss fell from 0.3788 to 0.1032. Phase P2 then added bidirectional AP-to-lateral and lateral-to-AP completion while still withholding the 3D target. Its loss fell from 0.4774 to 0.4298. These losses represent different tasks and should not be compared directly.

## Slide 13 — P1 visual grammar | 7:20–8:00

This visual shows P1 more concretely. We begin with one AP or lateral projection and no 3D answer. [click] The notebook implementation divides it into an eight-by-eight patch grid and masks 38 of 64 patches, matching the report's 60-percent objective. [click] ConvNeXt compresses the visible evidence at four spatial scales. [click] The model reconstructs only the hidden content. This adapts the encoder to radiographic appearance without introducing final-task supervision.

## Slide 14 — P2 cross-view completion | 8:00–8:40

P2 links the two projections of the same knee. [click] Each view is asked to help complete the other, in both directions. [click] In the notebook implementation, the final-grid attention mask permits communication only within the same or an adjacent superior-inferior patch row. The lines show permitted connections, not learned attention strength. [click] The result is cross-view correspondence, but still not a predicted 3D bone volume.

## Slide 15 — Four feature scales | 8:40–9:15

The encoder provides four feature resolutions. [click] The higher-resolution 64- and 32-squared maps retain local edges and smaller structures. [click] The 16- and 8-squared maps provide broader cross-view context. [click] One-by-one projections convert these maps into the decoder widths of 64, 128, 256 and 512 channels. These activation maps are evidence representations, not anatomical segmentations; they only become interpretable through supervised lifting and decoding.

## Slide 16 — Two-dimensional-to-three-dimensional lift | 9:15–9:55

The shared lift converts the fused planes into volumetric features. [click] The lateral map is flipped to match the LPS orientation. [click] AP and lateral planes are replicated along orthogonal Cartesian axes. [click] The resulting cubes are concatenated and fused with a three-dimensional convolution. The limitation is important: the input DRRs use divergent finite-source rays, but the lift receives no projection matrix or ray geometry. This mismatch later becomes a supported bottleneck hypothesis.

## Slide 17 — Decoder prediction | 9:55–10:35

The decoder starts with the coarsest eight-cubed feature volume. [click] It upsamples to sixteen cubed and combines the matching skip feature. [click] This repeats at 32 and 64 cubed. [click] The network refines at 128 cubed and emits four logits. [click] After trilinear upsampling to 256 cubed, sigmoid probabilities above 0.5 become the four occupancy masks. The surface shown is an actual held-out prediction rather than an illustrative reconstruction.

## Slide 18 — Residual refinement | 10:35–11:10

This is the architectural factor being isolated. Both block types receive the same input and use two matched three-dimensional convolutions with GroupNorm. [click] The residual version adds a shortcut around that transformation. [click] A one-by-one-by-one projection aligns the channel width when necessary. [click] Conceptually, the block learns to refine the coarse representation instead of rebuilding it completely. This is a controlled block comparison, not a universal claim that every V-Net outperforms every U-Net.

## Slide 19 — Front-end ceiling | 11:10–11:45

Before comparing decoders, the shared front end already revealed a size-dependent ceiling. Best validation macro-Dice was 0.574. Femur and tibia reached about 0.732 and 0.676, while patella and fibula reached only 0.529 and 0.359. The same hierarchy appears later in every decoder. This indicates a pipeline-level representation limitation: a fair shared front end makes the comparison valid, but fairness does not guarantee that the representation itself is strong.

## Slide 20 — Main result | 11:45–12:30

The principal result is that residual-ReLU ranked first, with a mean subject-level Dice of 0.455. V-style residual-PReLU reached 0.446, while both plain conditions were approximately 0.406. Under ReLU, adding residual topology improved Dice by 0.049 and reduced ASSD by 2.44 millimetres. Residual blocks added only about 2.1 percent decoder parameters, and training time remained approximately 37.5 to 38.3 minutes per run. Therefore, topology—not PReLU—explained the observed advantage in this controlled experiment.

## Slide 21 — Fold 4 robustness | 12:30–13:10

Fold 4 had the weakest representation evidence. Its pairing margin was only 0.000079, only five of nine subjects were positive, and every decoder recorded its lowest Dice. I retained the fold rather than removing inconvenient data. In the separate fold-level sensitivity analysis, excluding Fold 4 changed the mean Dice advantage only from approximately 0.044 to 0.043. The absolute accuracy fell, but the ordering of residual above plain conditions remained stable.

## Slide 22 — Small-bone bottleneck | 13:10–13:45

The fibula demonstrates why relative improvement must not be confused with adequate accuracy. Residual-ReLU improved fibula Dice from 0.106 to 0.183 and reduced ASSD from 25.93 to 17.51 millimetres. That is a meaningful error reduction, but 0.183 Dice is still poor reconstruction. The small-bone ceiling therefore persists even in the strongest decoder, limiting any claim about practical anatomical reliability.

## Slide 23 — Fractured anatomy | 13:45–14:15

Fractured-source anatomy was harder for every decoder. The strongest fractured-cohort Dice was 0.377. Residual-ReLU still improved on U-style by 0.041 Dice and 3.28 millimetres ASSD, so its advantage was not limited to healthy cases. However, because cohort status is confounded with dataset and scanner domain, this is an observed subgroup difference—not proof that fracture alone caused the lower performance.

## Slide 24 — Catastrophic patella failure | 14:15–15:00

This case shows why Dice and ASSD must be read together. The target contains all four bones. [click] In the V-style prediction shown, the left patella is completely empty, producing 346.41 millimetres ASSD. Residual-ReLU also missed the same left patella. [click] After bilateral subject aggregation, patella ASSD remained approximately 177.58 and 177.41 millimetres respectively. [click] Isolating the patella makes the failure unambiguous. I retained both failures rather than removing them as outliers, because average improvement did not guarantee completeness.

## Slide 25 — Pipeline constraint | 15:00–15:40

The most plausible shared bottleneck is geometry-inconsistent lifting. The DRRs were generated with divergent rays, while the feature lift copies AP and lateral planes along Cartesian axes. As a result, two features fused at one voxel may not represent the same physical point. A decisive future experiment would change only the lifting geometry—using projection-aware ray lifting or a differentiable reprojection loss—while holding the encoder, decoder, folds and training fixed. This remains a hypothesis because that ablation was not performed.

## Slide 26 — Future work | 15:40–16:15

Future work follows the same controlled philosophy: change one factor at a time. First, compare Cartesian and projection-aware lifting. Second, expand the fractured cohort and model acquisition source explicitly. Third, introduce expert-validated fracture measurements such as gap width, displacement, depression and cortical continuity. Finally, evaluate paired real radiographs and CT across scanners and institutions. Clinical, economic and environmental outcomes should be measured before claiming healthcare accessibility or sustainability.

## Slide 27 — Conclusion | 16:15–17:00

In conclusion, residual topology mattered more than activation choice under the tested conditions. Residual-ReLU used the available three-dimensional features most effectively, but absolute performance—especially for small bones and fractured-source anatomy—remained limited. The main contribution is therefore not a clinically ready reconstruction system or a universal victory for V-Net. It is a controlled, leakage-aware evaluation framework that identifies what changed, retains catastrophic failures and separates evidence from hypothesis. Thank you, and I welcome your questions.

## Timing checkpoints

- End Slide 6 by **3:40**
- End Slide 12 by **7:20**
- End Slide 18 by **11:10**
- End Slide 24 by **15:00**
- Finish Slide 27 at **17:00**
