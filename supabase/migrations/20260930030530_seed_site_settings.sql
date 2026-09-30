insert into public.site_settings (key, value) values
  ('business_name', '"Ferretería Lozada"'::jsonb),
  ('whatsapp_number', '"593995307272"'::jsonb),
  ('whatsapp_display', '"+593 99 530 7272"'::jsonb),
  ('address', '"Av. Mariscal Sucre s27-184, Chillogallo, Quito"'::jsonb),
  ('maps_embed_url', '"https://www.google.com/maps?q=Av.+Mariscal+Sucre+s27-184,+Chillogallo,+Quito&output=embed"'::jsonb),
  ('quote_validity_days', '15'::jsonb),
  ('schedule', jsonb_build_object(
      'weekdays', 'Lunes a viernes de 8:30 a 17:15',
      'saturday', 'Cerrado',
      'sunday', 'Cerrado',
      'holidays', 'Feriados: consultar disponibilidad'
   )),
  ('home_hero', jsonb_build_object(
      'title', 'Todo para tu obra, en Chillogallo desde 2002',
      'subtitle', 'Te asesoramos antes de venderte. Cuéntanos qué estás haciendo y te decimos qué te conviene para tu proyecto y tu bolsillo.',
      'image_url', '',
      'image_alt', 'Local de Ferretería Lozada en Chillogallo',
      'primary_cta', 'Ver catálogo',
      'secondary_cta', 'Pedir por WhatsApp'
   )),
  ('home_process', jsonb_build_array(
      jsonb_build_object('title', 'Busca tu producto', 'text', 'Por nombre, medida, código o marca.'),
      jsonb_build_object('title', 'Elige la medida', 'text', 'Selecciona medida, color o presentación según lo que necesites.'),
      jsonb_build_object('title', 'Añádelo al carrito', 'text', 'Arma tu lista completa sin apuro.'),
      jsonb_build_object('title', 'Envía por WhatsApp', 'text', 'Te generamos la cotización en PDF y el pedido llega al chat.'),
      jsonb_build_object('title', 'Confirmamos contigo', 'text', 'Revisamos disponibilidad y coordinamos la entrega.')
   )),
  ('about_history', to_jsonb('Ferretería Lozada nació en 2002 como un proyecto familiar en el Sur de Quito. Desde entonces hemos crecido junto al barrio, atendiendo a Chillogallo, Ciudadela Ibarra y Conocoto, y enviando por encomienda a otras provincias. Trabajamos con maestros de obra, cerrajeros, carpinteros, gente de metalmecánica, contratistas y constructoras, y también con quien simplemente está arreglando algo en casa. Nos gusta explicar y recomendar: si hay una opción que cuesta menos y te sirve igual, te lo decimos.'::text)),
  ('about_coverage', to_jsonb('Atendemos Chillogallo, Ciudadela Ibarra y Conocoto. Hacemos envíos por encomienda a otras provincias.'::text)),
  ('social_links', '{}'::jsonb),
  ('logo_url', '""'::jsonb),
  ('seo', jsonb_build_object(
      'title', 'Ferretería Lozada | Chillogallo, Quito',
      'description', 'Ferretería en Chillogallo desde 2002. Herramientas, fijaciones y materiales para obra. Cotiza por WhatsApp y te asesoramos antes de comprar.',
      'og_image', ''
   ))
on conflict (key) do nothing;
