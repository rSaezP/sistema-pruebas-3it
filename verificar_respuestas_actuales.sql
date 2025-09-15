-- Verificar respuestas recientes con puntuaciones
SELECT 
  a.id, 
  a.answer_text, 
  a.score, 
  a.percentage_score,
  a.session_id,
  q.title,
  q.type,
  q.correct_answer,
  q.options,
  ts.percentage_score as session_total_score,
  ts.token
FROM answers a 
JOIN questions q ON a.question_id = q.id 
JOIN test_sessions ts ON a.session_id = ts.id
WHERE q.type = 'multiple_choice' 
ORDER BY a.id DESC 
LIMIT 10;

-- También verificar sesiones recientes
SELECT 
  ts.id,
  ts.percentage_score as session_score,
  ts.status,
  c.name as candidate_name,
  COUNT(a.id) as total_answers,
  SUM(a.score) as total_score_from_answers,
  AVG(a.percentage_score) as avg_percentage
FROM test_sessions ts
LEFT JOIN candidates c ON ts.candidate_id = c.id  
LEFT JOIN answers a ON ts.id = a.session_id
GROUP BY ts.id
ORDER BY ts.id DESC
LIMIT 5;