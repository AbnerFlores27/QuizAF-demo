# Quiz question CSV template

This folder holds the standard CSV template for uploading quiz questions in bulk (the admin CSV upload feature arrives in Phase 4).

## File

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

- The two example rows in the template are placeholders - delete them and replace them with real questions
- Keep commas out of question text, or wrap the text in double quotes (standard CSV)
- Invalid rows are reported BEFORE import, so bad data can never silently corrupt the quizzes
