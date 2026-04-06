# Bugfix Requirements Document

## Introduction

On the listing creation flow (`CreateListingForm`), when the AI scan completes but fails to detect the original price (MRP), a warning banner is shown at Step 3 with a "Rescan Book" button. This button is intended to re-run the AI scan using the already-uploaded images — but it incorrectly calls `setStep(1)`, navigating the user back to the image upload screen and discarding all uploaded images. The user is forced to re-upload all 4 photos from scratch, which is a poor experience and inconsistent with the "Rescan (same images)" button that already works correctly on the Step 2 scan error screen.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the AI scan completes at Step 3 AND the original price (MRP) is not detected AND the user clicks "Rescan Book" in the price-not-found warning banner THEN the system navigates back to Step 1 (image upload screen)

1.2 WHEN the system navigates back to Step 1 via the "Rescan Book" button THEN the system discards the already-uploaded images, forcing the user to re-upload all 4 photos from scratch

### Expected Behavior (Correct)

2.1 WHEN the AI scan completes at Step 3 AND the original price (MRP) is not detected AND the user clicks "Rescan Book" in the price-not-found warning banner THEN the system SHALL re-trigger the AI scan pipeline by calling `handleImagesComplete(uploadedImages!)` with the already-uploaded images

2.2 WHEN the "Rescan Book" button re-triggers the scan THEN the system SHALL transition to Step 2 (scanning screen) and run the full scan without requiring the user to re-upload any images

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the AI scan fails entirely at Step 2 AND the user clicks "Rescan (same images)" THEN the system SHALL CONTINUE TO re-trigger the AI scan using the already-uploaded images without navigating to Step 1

3.2 WHEN the AI scan fails entirely at Step 2 AND the user clicks "Upload new images" THEN the system SHALL CONTINUE TO navigate back to Step 1 to allow re-uploading

3.3 WHEN the AI scan completes successfully with a detected MRP AND the user is at Step 3 THEN the system SHALL CONTINUE TO display the price-not-found warning banner only when `original_price` is null or undefined

3.4 WHEN the user is at Step 3 AND clicks the "Rescan" button at the bottom of the form THEN the system SHALL CONTINUE TO navigate back to Step 1 (this button is intentionally for uploading new images)

3.5 WHEN the AI scan completes with a valid MRP AND the user proceeds through Steps 3 and 4 THEN the system SHALL CONTINUE TO calculate pricing and submit the listing correctly
