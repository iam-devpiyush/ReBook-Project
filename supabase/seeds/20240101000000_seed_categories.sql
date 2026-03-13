-- Seed Initial Categories
-- This file populates the categories table with initial hierarchical structure

-- ============================================================================
-- SCHOOL BOOKS CATEGORIES
-- ============================================================================

-- Main School Category
INSERT INTO public.categories (id, name, type, metadata) VALUES
('00000000-0000-0000-0000-000000000001', 'School Books', 'school', '{}');

-- CBSE Board
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000011', 'CBSE', 'school', '00000000-0000-0000-0000-000000000001', '{"board": "CBSE"}');

-- CBSE Classes
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000111', 'Class 1-5', 'school', '00000000-0000-0000-0000-000000000011', '{"board": "CBSE", "class_level": "1-5"}'),
('00000000-0000-0000-0000-000000000112', 'Class 6-8', 'school', '00000000-0000-0000-0000-000000000011', '{"board": "CBSE", "class_level": "6-8"}'),
('00000000-0000-0000-0000-000000000113', 'Class 9-10', 'school', '00000000-0000-0000-0000-000000000011', '{"board": "CBSE", "class_level": "9-10"}'),
('00000000-0000-0000-0000-000000000114', 'Class 11-12 Science', 'school', '00000000-0000-0000-0000-000000000011', '{"board": "CBSE", "class_level": "11-12", "stream": "Science"}'),
('00000000-0000-0000-0000-000000000115', 'Class 11-12 Commerce', 'school', '00000000-0000-0000-0000-000000000011', '{"board": "CBSE", "class_level": "11-12", "stream": "Commerce"}'),
('00000000-0000-0000-0000-000000000116', 'Class 11-12 Arts', 'school', '00000000-0000-0000-0000-000000000011', '{"board": "CBSE", "class_level": "11-12", "stream": "Arts"}');

-- ICSE Board
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000012', 'ICSE', 'school', '00000000-0000-0000-0000-000000000001', '{"board": "ICSE"}');

-- State Boards
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000013', 'State Boards', 'school', '00000000-0000-0000-0000-000000000001', '{"board": "State"}');

-- ============================================================================
-- COMPETITIVE EXAM CATEGORIES
-- ============================================================================

-- Main Competitive Exam Category
INSERT INTO public.categories (id, name, type, metadata) VALUES
('00000000-0000-0000-0000-000000000002', 'Competitive Exams', 'competitive_exam', '{}');

-- Engineering Exams
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000021', 'JEE Main', 'competitive_exam', '00000000-0000-0000-0000-000000000002', '{"exam_type": "JEE Main"}'),
('00000000-0000-0000-0000-000000000022', 'JEE Advanced', 'competitive_exam', '00000000-0000-0000-0000-000000000002', '{"exam_type": "JEE Advanced"}');

-- Medical Exams
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000023', 'NEET', 'competitive_exam', '00000000-0000-0000-0000-000000000002', '{"exam_type": "NEET"}'),
('00000000-0000-0000-0000-000000000024', 'AIIMS', 'competitive_exam', '00000000-0000-0000-0000-000000000002', '{"exam_type": "AIIMS"}');

-- Civil Services
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000025', 'UPSC', 'competitive_exam', '00000000-0000-0000-0000-000000000002', '{"exam_type": "UPSC"}'),
('00000000-0000-0000-0000-000000000026', 'State PSC', 'competitive_exam', '00000000-0000-0000-0000-000000000002', '{"exam_type": "State PSC"}');

-- Banking & SSC
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000027', 'Banking Exams', 'competitive_exam', '00000000-0000-0000-0000-000000000002', '{"exam_type": "Banking"}'),
('00000000-0000-0000-0000-000000000028', 'SSC', 'competitive_exam', '00000000-0000-0000-0000-000000000002', '{"exam_type": "SSC"}');

-- ============================================================================
-- COLLEGE TEXTBOOKS CATEGORIES
-- ============================================================================

-- Main College Category
INSERT INTO public.categories (id, name, type, metadata) VALUES
('00000000-0000-0000-0000-000000000003', 'College Textbooks', 'college', '{}');

-- Engineering
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000031', 'Engineering', 'college', '00000000-0000-0000-0000-000000000003', '{"stream": "Engineering"}');

INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000311', 'Computer Science', 'college', '00000000-0000-0000-0000-000000000031', '{"stream": "Engineering", "branch": "Computer Science"}'),
('00000000-0000-0000-0000-000000000312', 'Mechanical', 'college', '00000000-0000-0000-0000-000000000031', '{"stream": "Engineering", "branch": "Mechanical"}'),
('00000000-0000-0000-0000-000000000313', 'Electrical', 'college', '00000000-0000-0000-0000-000000000031', '{"stream": "Engineering", "branch": "Electrical"}'),
('00000000-0000-0000-0000-000000000314', 'Civil', 'college', '00000000-0000-0000-0000-000000000031', '{"stream": "Engineering", "branch": "Civil"}');

-- Medical
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000032', 'Medical', 'college', '00000000-0000-0000-0000-000000000003', '{"stream": "Medical"}');

-- Commerce
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000033', 'Commerce', 'college', '00000000-0000-0000-0000-000000000003', '{"stream": "Commerce"}');

-- Arts & Humanities
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000034', 'Arts & Humanities', 'college', '00000000-0000-0000-0000-000000000003', '{"stream": "Arts"}');

-- ============================================================================
-- GENERAL READING CATEGORIES
-- ============================================================================

-- Main General Category
INSERT INTO public.categories (id, name, type, metadata) VALUES
('00000000-0000-0000-0000-000000000004', 'General Reading', 'general', '{}');

-- Fiction
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000041', 'Fiction', 'general', '00000000-0000-0000-0000-000000000004', '{"genre": "Fiction"}');

-- Non-Fiction
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000042', 'Non-Fiction', 'general', '00000000-0000-0000-0000-000000000004', '{"genre": "Non-Fiction"}');

-- Self-Help
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000043', 'Self-Help', 'general', '00000000-0000-0000-0000-000000000004', '{"genre": "Self-Help"}');

-- Biography
INSERT INTO public.categories (id, name, type, parent_id, metadata) VALUES
('00000000-0000-0000-0000-000000000044', 'Biography', 'general', '00000000-0000-0000-0000-000000000004', '{"genre": "Biography"}');
