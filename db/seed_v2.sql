-- Add new exercises
INSERT INTO exercises (id, name, tags) VALUES
  ('e_cossack', 'Cossack squat', ARRAY['gym','home','mobility','strength'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO bb_exercises (id, name, tags) VALUES
  ('b_chestfly_db',    'Chest fly (dumbbell)', ARRAY['chest','dumbbell']),
  ('b_chestfly_cable', 'Chest fly (cable)',    ARRAY['chest','cable'])
ON CONFLICT (id) DO NOTHING;
