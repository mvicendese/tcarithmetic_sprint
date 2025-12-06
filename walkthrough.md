# Verification Walkthrough: Teacher Toggles & Test Results

## 1. Verify Teacher Toggles & UI Updates
> **Goal**: Confirm that icons are updated, tooltips are correct, and toggles work.

1.  **Log in as a Teacher** (or Admin).
2.  Navigate to a **Class View**.
3.  Find a student (e.g., [Student Name]).
4.  **Check Tooltips**:
    -   Hover over the **AI Ready** (Favicon) button.
        -   *Expected*: "Turn on/off ai analysis for [Name]"
    -   Hover over the **Lock** button.
        -   *Expected*: "Turn on/off access to tests for [Name]"
    -   Hover over the **Remove** button (now an icon).
        -   *Expected*: "Remove [Name] from [Class]"
5.  **Test Toggles**: Click them and ensure they still work.

## 2. Verify Student Test Results (Fix for Missing Results)
> **Goal**: Confirm that test results now appear in the Student Profile.

1.  **Log in as a Teacher**.
2.  Navigate to the **Class View**.
3.  Click on a student's name (e.g., [Student Name]) to open their **Profile**.
4.  **Check Results Table**:
    -   *Expected*: You should now see the list of past test results (dates, scores, levels).
    -   *Note*: If it was empty before, it should now populate because the **Firestore Index** has been deployed.

## 3. Verify Level Progression
> **Goal**: Confirm student level updates immediately after a test.

1.  **Log in as a Student** (or use "Test Drive" as a Teacher).
2.  Complete a test and pass it.
3.  **Check Dashboard**:
    -   *Expected*: The "Start Test" button should immediately show the *new* level (e.g., "Start Level 2 Test").

## 4. Verify Bulk Edit & Add
> **Goal**: Confirm bulk operations work.

1.  **Log in as a Teacher** and go to a Class.
2.  Click **Bulk Add** -> Paste a list of emails.
3.  Click **Bulk Edit** -> Modify names or Year Levels.
4.  **Save**:
    -   *Expected*: Page reloads (for now) and changes are reflected.

