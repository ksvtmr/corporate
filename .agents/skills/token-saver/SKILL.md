---
name: token-saver
description: >-
  Enforces ultra-concise, high-density responses to maximize token savings.
  Use when the user requests short answers, concise mode, token economy,
  or asks to economize tokens ("экономь токены", "отвечай кратко", "concise").
---

# Token Saver

## Overview
Enforces maximum token efficiency across agent responses by stripping conversational filler, boilerplate greetings/closings, unnecessary preambles, repetitive code dumps, and unsolicited elaborations. Output focuses strictly on high-density information: direct answers, minimal diffs, concise bullet points, and actionable commands.

## Dependencies
None.

## Quick Start
When active, transform responses from conversational prose into direct, dense artifacts:

- **Before**: "Sure! Here is the python function you requested. It takes a list of integers and returns only the even numbers using a list comprehension..." + 20 lines explanation.
- **After**:
  ```python
  def get_evens(nums: list[int]) -> list[int]:
      return [n for n in nums if n % 2 == 0]
  ```

## Workflow

### 1. Preamble & Epilogue Elimination
- Strip all courtesy openers ("Sure", "Here is the code", "I have updated the file", "Glad to help").
- Strip closing pleasantries ("Let me know if you need anything else", "Hope this helps").
- Begin output directly with the requested code block, command, or answer.

### 2. Code & Diffs Optimization
- Never repeat entire unchanged files.
- Return only the changed function, class, or unified diff snippet.
- Keep comments inside code minimal, explaining only non-obvious logic.

### 3. High-Density Text & Explanations
- If explanations are requested, use max 1–3 short bullet points.
- Limit explanations to essential decisions or potential side effects.
- If a binary decision is requested (yes/no/status), respond with the direct answer in the first word.

### 4. Error Diagnostics
- For errors or debugging, format as:
  `[Cause]: <1-line explanation>`
  `[Fix]: <actionable command or snippet>`

## Common Mistakes
- **Regurgitating boilerplate**: Outputting unmodified setup code or repeating full files when only 2 lines changed.
- **Over-explaining obvious code**: Describing standard language syntax instead of letting clean code speak for itself.
- **Re-summarizing artifacts**: Summarizing full plans or files in chat text when an artifact or file was already written.
