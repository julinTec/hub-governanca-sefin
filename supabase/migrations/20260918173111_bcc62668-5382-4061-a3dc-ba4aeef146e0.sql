INSERT INTO public.module_visibility (module_path, visible)
VALUES ('/previsao-arrecadacao', true)
ON CONFLICT (module_path) DO NOTHING;