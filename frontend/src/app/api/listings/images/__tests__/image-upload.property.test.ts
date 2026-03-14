/**
 * Property-Based Tests for Image Upload Constraints
 * 
 * **Validates: Requirements 2.4, 17.4, 17.5**
 * 
 * Property: Image Upload Constraints
 * For any image upload, the file must be JPEG or PNG format and not exceed 5MB in size.
 * All uploaded images must be stored in Supabase Storage with unique file names.
 * 
 * Requirements:
 * - 2.4: Images must be uploaded to Supabase Storage
 * - 17.4: Image file type must be JPEG or PNG
 * - 17.5: Image file size must not exceed 5MB
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateImageFile, generateFilePath, parseFilePath } from '@/lib/storage/image-upload';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate valid MIME types for images
 */
const validMimeTypeArb = fc.constantFrom('image/jpeg', 'image/png');

/**
 * Generate invalid MIME types
 */
const invalidMimeTypeArb = fc.constantFrom(
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'video/mp4'
);

/**
 * Generate file sizes within valid range (0 to 5MB)
 */
const validFileSizeArb = fc.integer({ min: 1, max: 5 * 1024 * 1024 });

/**
 * Generate file sizes exceeding 5MB limit
 */
const invalidFileSizeArb = fc.integer({ min: 5 * 1024 * 1024 + 1, max: 50 * 1024 * 1024 });

/**
 * Generate valid image file names
 */
const validFileNameArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.jpg`),
  fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.jpeg`),
  fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.png`)
);

/**
 * Generate UUIDs for user and listing IDs
 */
const uuidArb = fc.uuid();

/**
 * Generate image types
 */
const imageTypeArb = fc.constantFrom(
  'front_cover',
  'back_cover',
  'spine',
  'pages',
  'detail'
);

/**
 * Create a mock File object
 */
function createMockFile(name: string, type: string, size: number): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Image Upload Constraints - Property Tests', () => {
  
  /**
   * Property 1: Valid Image Files Pass Validation
   * 
   * For any file with JPEG or PNG MIME type and size <= 5MB,
   * validation must succeed.
   * 
   * **Validates: Requirements 17.4, 17.5**
   */
  it('Property 1: Valid image files (JPEG/PNG, <= 5MB) always pass validation', () => {
    fc.assert(
      fc.property(
        validMimeTypeArb,
        validFileSizeArb,
        validFileNameArb,
        (mimeType, fileSize, fileName) => {
          // Arrange
          const file = createMockFile(fileName, mimeType, fileSize);
          
          // Act
          const result = validateImageFile(file);
          
          // Assert
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 1000 }
    );
  });
  
  /**
   * Property 2: Invalid MIME Types Fail Validation
   * 
   * For any file with MIME type other than JPEG or PNG,
   * validation must fail with appropriate error message.
   * 
   * **Validates: Requirement 17.4**
   */
  it('Property 2: Files with invalid MIME types always fail validation', () => {
    fc.assert(
      fc.property(
        invalidMimeTypeArb,
        validFileSizeArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (mimeType, fileSize, fileName) => {
          // Arrange
          const file = createMockFile(fileName, mimeType, fileSize);
          
          // Act
          const result = validateImageFile(file);
          
          // Assert
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('JPEG and PNG');
        }
      ),
      { numRuns: 1000 }
    );
  });
  
  /**
   * Property 3: Files Exceeding 5MB Fail Validation
   * 
   * For any file with size > 5MB,
   * validation must fail with appropriate error message.
   * 
   * **Validates: Requirement 17.5**
   */
  it('Property 3: Files exceeding 5MB always fail validation', () => {
    fc.assert(
      fc.property(
        validMimeTypeArb,
        invalidFileSizeArb,
        validFileNameArb,
        (mimeType, fileSize, fileName) => {
          // Arrange
          const file = createMockFile(fileName, mimeType, fileSize);
          
          // Act
          const result = validateImageFile(file);
          
          // Assert
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('5MB');
        }
      ),
      { numRuns: 1000 }
    );
  });
  
  /**
   * Property 4: Generated File Paths Are Unique
   * 
   * For any two calls to generateFilePath with the same inputs,
   * the generated paths must be different (due to UUID).
   * 
   * **Validates: Requirement 21.2**
   */
  it('Property 4: Generated file paths are always unique', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        imageTypeArb,
        validFileNameArb,
        (userId, listingId, imageType, fileName) => {
          // Act
          const path1 = generateFilePath(userId, listingId, imageType, fileName);
          const path2 = generateFilePath(userId, listingId, imageType, fileName);
          
          // Assert
          expect(path1).not.toBe(path2);
        }
      ),
      { numRuns: 1000 }
    );
  });
  
  /**
   * Property 5: File Path Structure Is Consistent
   * 
   * For any generated file path, it must follow the structure:
   * {userId}/{listingId}/{imageType}_{uniqueId}.{extension}
   * 
   * **Validates: Requirement 2.4, 21.1**
   */
  it('Property 5: Generated file paths follow consistent structure', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        imageTypeArb,
        validFileNameArb,
        (userId, listingId, imageType, fileName) => {
          // Act
          const filePath = generateFilePath(userId, listingId, imageType, fileName);
          
          // Assert
          const parts = filePath.split('/');
          expect(parts).toHaveLength(3);
          expect(parts[0]).toBe(userId);
          expect(parts[1]).toBe(listingId);
          expect(parts[2]).toMatch(new RegExp(`^${imageType}_[a-f0-9]+\\.(jpg|jpeg|png)$`));
        }
      ),
      { numRuns: 1000 }
    );
  });
  
  /**
   * Property 6: File Path Parsing Is Reversible
   * 
   * For any generated file path, parsing it must correctly extract
   * userId, listingId, and imageType.
   * 
   * **Validates: Requirement 21.1**
   */
  it('Property 6: File path parsing correctly extracts metadata', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        imageTypeArb,
        validFileNameArb,
        (userId, listingId, imageType, fileName) => {
          // Arrange
          const filePath = generateFilePath(userId, listingId, imageType, fileName);
          
          // Act
          const parsed = parseFilePath(filePath);
          
          // Assert
          expect(parsed).not.toBeNull();
          expect(parsed!.userId).toBe(userId);
          expect(parsed!.listingId).toBe(listingId);
          expect(parsed!.imageType).toBe(imageType);
          expect(parsed!.uniqueId).toBeDefined();
        }
      ),
      { numRuns: 1000 }
    );
  });
  
  /**
   * Property 7: File Extension Is Preserved
   * 
   * For any file name with extension, the generated path must
   * preserve the extension in lowercase.
   * 
   * **Validates: Requirement 2.4**
   */
  it('Property 7: File extension is preserved in lowercase', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        imageTypeArb,
        fc.constantFrom('test.JPG', 'test.JPEG', 'test.PNG', 'test.jpg', 'test.jpeg', 'test.png'),
        (userId, listingId, imageType, fileName) => {
          // Act
          const filePath = generateFilePath(userId, listingId, imageType, fileName);
          
          // Assert
          const extension = filePath.split('.').pop();
          expect(extension).toMatch(/^(jpg|jpeg|png)$/);
          expect(extension).toBe(extension?.toLowerCase());
        }
      ),
      { numRuns: 1000 }
    );
  });
  
  /**
   * Property 8: Validation Is Deterministic
   * 
   * For any file, multiple validation calls must return the same result.
   * 
   * **Validates: Requirements 17.4, 17.5**
   */
  it('Property 8: Validation results are deterministic', () => {
    fc.assert(
      fc.property(
        fc.oneof(validMimeTypeArb, invalidMimeTypeArb),
        fc.integer({ min: 1, max: 50 * 1024 * 1024 }),
        validFileNameArb,
        (mimeType, fileSize, fileName) => {
          // Arrange
          const file = createMockFile(fileName, mimeType, fileSize);
          
          // Act
          const result1 = validateImageFile(file);
          const result2 = validateImageFile(file);
          
          // Assert
          expect(result1.valid).toBe(result2.valid);
          expect(result1.error).toBe(result2.error);
        }
      ),
      { numRuns: 1000 }
    );
  });
  
  /**
   * Property 9: Boundary Case - Exactly 5MB
   * 
   * Files with exactly 5MB size must pass validation.
   * 
   * **Validates: Requirement 17.5**
   */
  it('Property 9: Files with exactly 5MB size pass validation', () => {
    fc.assert(
      fc.property(
        validMimeTypeArb,
        validFileNameArb,
        (mimeType, fileName) => {
          // Arrange
          const exactSize = 5 * 1024 * 1024; // Exactly 5MB
          const file = createMockFile(fileName, mimeType, exactSize);
          
          // Act
          const result = validateImageFile(file);
          
          // Assert
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property 10: Boundary Case - 5MB + 1 Byte
   * 
   * Files with 5MB + 1 byte must fail validation.
   * 
   * **Validates: Requirement 17.5**
   */
  it('Property 10: Files with 5MB + 1 byte fail validation', () => {
    fc.assert(
      fc.property(
        validMimeTypeArb,
        validFileNameArb,
        (mimeType, fileName) => {
          // Arrange
          const overSize = 5 * 1024 * 1024 + 1; // 5MB + 1 byte
          const file = createMockFile(fileName, mimeType, overSize);
          
          // Act
          const result = validateImageFile(file);
          
          // Assert
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('5MB');
        }
      ),
      { numRuns: 100 }
    );
  });
});
