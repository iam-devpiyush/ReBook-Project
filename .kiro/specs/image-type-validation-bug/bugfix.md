# Bugfix Requirements Document

## Introduction

In the book image scanning flow, Step 4 of 4 ("Inside Pages") requires the user to upload a photo of the book's inside pages. However, the AI validation accepts any image that contains a book — regardless of whether it matches the expected image type for that step. A user uploading a spine photo during the "Inside Pages" step receives a passing validation message ("The image shows the spine of a book with a title and publisher clearly visible.") instead of a rejection. The same permissive behavior affects all four steps: front cover, back cover, spine, and inside pages prompts are functionally identical and do not enforce type-specific requirements.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user uploads an image of the book's spine during the "Inside Pages" step (imageType = "pages") THEN the system accepts the image as valid and returns a passing reason describing the spine content.

1.2 WHEN the user uploads an image of the front cover during the "Back Cover" step (imageType = "back_cover") THEN the system accepts the image as valid instead of rejecting it.

1.3 WHEN the user uploads an image of the inside pages during the "Spine" step (imageType = "spine") THEN the system accepts the image as valid instead of rejecting it.

1.4 WHEN any book image is uploaded for any step THEN the system only checks whether the image contains a book, not whether it matches the specific image type required by that step.

### Expected Behavior (Correct)

2.1 WHEN the user uploads an image of the book's spine during the "Inside Pages" step (imageType = "pages") THEN the system SHALL reject the image as invalid and return a reason indicating that inside pages are required.

2.2 WHEN the user uploads an image of the front cover during the "Back Cover" step (imageType = "back_cover") THEN the system SHALL reject the image as invalid and return a reason indicating that the back cover is required.

2.3 WHEN the user uploads an image of the inside pages during the "Spine" step (imageType = "spine") THEN the system SHALL reject the image as invalid and return a reason indicating that the spine is required.

2.4 WHEN the user uploads an image that matches the required type for the current step THEN the system SHALL accept the image as valid.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user uploads a correct front cover image during the "Front Cover" step (imageType = "front_cover") THEN the system SHALL CONTINUE TO accept the image as valid.

3.2 WHEN the user uploads a correct back cover image during the "Back Cover" step (imageType = "back_cover") THEN the system SHALL CONTINUE TO accept the image as valid.

3.3 WHEN the user uploads a correct spine image during the "Spine" step (imageType = "spine") THEN the system SHALL CONTINUE TO accept the image as valid.

3.4 WHEN the user uploads a correct inside pages image during the "Inside Pages" step (imageType = "pages") THEN the system SHALL CONTINUE TO accept the image as valid.

3.5 WHEN the uploaded image is not a book at all (e.g. a photo of food or a landscape) THEN the system SHALL CONTINUE TO reject the image as invalid for any step.

3.6 WHEN the Gemini API is unavailable or rate-limited THEN the system SHALL CONTINUE TO return an api_unavailable result without crashing.
