-- Check video count
SELECT COUNT(*) as video_count FROM videos;

-- Sample of videos
SELECT id, title, uploader, platform 
FROM videos 
LIMIT 5;

-- Check article count
SELECT COUNT(*) as article_count FROM articles;

-- Sample of articles
SELECT id, title, date, source 
FROM articles 
LIMIT 5;

-- Check video categories
SELECT category, COUNT(*) as count 
FROM videos 
GROUP BY category;

-- Check video platforms
SELECT platform, COUNT(*) as count 
FROM videos 
GROUP BY platform;

-- Check recent videos
SELECT id, title, publish_date 
FROM videos 
ORDER BY publish_date DESC 
LIMIT 5; 