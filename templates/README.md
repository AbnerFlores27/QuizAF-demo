# Quiz question CSV template

This folder holds the quiz question CSVs for bulk question import (the admin CSV upload feature arrives in Phase 4).

## Files

    templates/questions.csv
    templates/questions-template.csv

## Columns

| Column | Meaning | Rules |
|---|---|---|
| quiz_id | Which quiz the question belongs to | Must be an existing quiz ID (shown in the app once quizzes are seeded in Phase 2) |
| question_text | The question | Not empty, 255 characters max |
| choice_a, choice_b, choice_c, choice_d | The four answer choices | All four required, 255 characters max each |
| correct_answer | Which choice is correct | Exactly one letter: A, B, C, or D |

## How the upload works (Phase 4)

1. Upload the file in the admin CSV page
2. The server validates every row and shows a preview: row number, the question, and pass/fail with a reason for failures (for example: "correct_answer must be A-D", "empty field in row 7", "duplicate question")
3. The Confirm Import button stays DISABLED until every row is valid - nothing imports while any row is broken
4. Fix the file, re-upload, repeat until the preview is all green, then import

## Notes

- questions.csv holds the full Phase 1 set: 50 real questions, 10 per topic. quiz_id maps to a topic: 1 = GAMING HISTORY, 2 = SPORTS, 3 = TECH & INTERNET, 4 = MOVIES & TV, 5 = MUSIC. The quizzes themselves get created when the database is seeded in Phase 2
- The two rows in the template CSV are real sample questions - copy that format when writing more
- Keep commas out of question text, or wrap the text in double quotes (standard CSV)
- Invalid rows are reported BEFORE import, so bad data can never silently corrupt the quizzes
