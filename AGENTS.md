# AGENTS.md

## Project Context

This repository is meant to be a website presentation based on the capstone report stored in capstone-report that is meant to last 15 mins + 5 mins for my demo. The goal of the website presentation is to be a interactive, short and concise presentation that is able to explain the entirety of the capstone report and achieve the excellent band for the marking criteria.

## Marking Criteria

1. Topic Knowledge (Background and Literature Review) : Displayed an excellent grasp of the research topic. Demonstrated excellent knowledge of content, application and implications. Excellent research depth exhibited across a range of resources when executing computing activities.
2. Technical Approach (Problem Statement, Objective and Methodology): Methodology proposed strongly supports the problem statements and objectives, while considering the consequences to society and the environment when executing computing activities. Shows a well-developed and innovative problem-solving strategy.
3. Critical Thinking (Expected Outcome/Results, Analysis and Conclusions): Displays project outcome and include extensive elaboration and critical explanation to the presented outcome
4. Quality of Visual Aids (Presentation Slides): Slides are highly professional, visually engaging, and seamlessly integrated; design, clarity, and visual elements significantly enhance communication and audience engagement.
5. Professionalism in Presentation: Shows highly professional behavior and attitude; well-prepared, punctual, and confidently presents; attire and communication fully appropriate, engaging, and polished.

## Project Diretory

Capstone-PPT/
├── build/ # Temporary build artifacts, renders, extracted files, QA outputs, and local dependencies.
├── capstone-assets/ # Images, charts, diagrams, and 3D/modeling visual assets used by the presentation.
├── capstone-css/ # Stylesheets for presentation scenes and modeling visuals.
├── capstone-js/ # JavaScript for slide navigation, interactive scenes, and presentation runtime behavior.
├── capstone-report/ # Source capstone report document used as the presentation’s research reference.
├── output/ # Generated PowerPoint decks and presentation audit workbooks.
├── qa-renders/ # Render-based quality-assurance reports.
├── qa-renders-chrome/ # Browser-rendered QA reports for the interactive presentation.
├── tools/ # Build, validation, asset-generation, and deck QA utility scripts.
├── capstone-presentation.html # Main interactive web presentation.
├── presentation-script-15min.md # Speaker notes/script for the 15-minute presentation.
├── README.md # Project overview and usage notes.
├── AGENTS.md # Project context and guidance for coding agents.
└── .gitignore # Git ignore rules.

## Behavioural Guidelines

1. Think Before Coding
   Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.

2. Simplicity First
   Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
   Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
   Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
   Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Frontend-slides skill

The main source for where the frontend skill is derived is in github/zarazhangrui/frontend-slides, start from SKILL.md and load only the referenced support files it needs: STYLE_PRESETS.md , viewport-base.css , html-template.md , animation-patterns.md , bold-template-pack/, scripts/.
