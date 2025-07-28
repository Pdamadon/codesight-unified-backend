-- Get multiple training examples to analyze the new OpenAI format
SELECT 
    substring("jsonlData", 1, 2000) as training_example,
    '---NEXT-EXAMPLE---' as separator
FROM training_data 
WHERE "sessionId" = 'session_1753720411864_qanml1j98' 
LIMIT 3;