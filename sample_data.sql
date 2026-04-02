-- ============================================================
--  LifeOS sample data — run AFTER signing up your test account
--  Replace 'your@email.com' with the email you used at sign up
-- ============================================================

DO $$
DECLARE
  uid INT;
BEGIN

  SELECT id INTO uid FROM users WHERE email = 'your@email.com';
  IF uid IS NULL THEN
    RAISE EXCEPTION 'User not found. Update the email at the top of this script.';
  END IF;

  -- Journal Reflections 

  INSERT INTO journals (user_id, title, content, mood, created_at) VALUES

  (uid, 'Long week but a good one',
   'Finally wrapped up that project at work that has been dragging on for two weeks. Stayed late Thursday to get it done but it was worth it. Came home and actually felt proud of it for once instead of just relieved it was over.',
   'Excellent', NOW() - INTERVAL '14 days'),

  (uid, 'Actually took the weekend off',
   'Did not open the laptop once this weekend. Took the kids to the park Saturday, had dinner with my parents Sunday. Came back to Monday feeling like a different person. I always forget how much I need this until I actually do it.',
   'Good', NOW() - INTERVAL '7 days'),

  (uid, 'Checking in',
   'Couldn''t lock in today. Kept jumping between tasks and finished none of them. Tomorrow I''m starting with one thing and not moving on until it''s done.',
   'Okay', NOW() - INTERVAL '1 day');

  -- Tasks 

  INSERT INTO tasks (user_id, title, description, priority, completed, created_at) VALUES
  (uid, 'Pay rent',            NULL,                                          'high',   true,  NOW() - INTERVAL '10 days'),
  (uid, 'Grocery run',         'Check the fridge before going.',              'medium', true,  NOW() - INTERVAL '8 days'),
  (uid, 'Do laundry',          NULL,                                          'low',    true,  NOW() - INTERVAL '5 days'),
  (uid, 'Book dentist checkup', NULL,                                         'high',   false, NOW() - INTERVAL '2 days'),
  (uid, 'Clean out the car',   'Been putting this off for weeks.',                   'medium', false, NOW() - INTERVAL '1 day');

  -- Focus Sessions 

  INSERT INTO focus_sessions (user_id, duration, session_type, completed_at) VALUES
  (uid, 25, 'focus', NOW() - INTERVAL '12 days'),
  (uid, 25, 'focus', NOW() - INTERVAL '10 days'),
  (uid, 25, 'focus', NOW() - INTERVAL '10 days'),
  (uid, 25, 'focus', NOW() - INTERVAL '7 days'),
  (uid, 25, 'focus', NOW() - INTERVAL '7 days'),
  (uid, 25, 'focus', NOW() - INTERVAL '5 days'),
  (uid, 25, 'focus', NOW() - INTERVAL '5 days'),
  (uid, 25, 'focus', NOW() - INTERVAL '3 days'),
  (uid, 25, 'focus', NOW() - INTERVAL '2 days'),
  (uid, 25, 'focus', NOW() - INTERVAL '1 day');

END $$;
