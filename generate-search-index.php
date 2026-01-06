<?php
// generate-search-index.php
// Generates tmpdata.js — safe for review before replacing data.js

$baseDir = __DIR__; // Website root
$outputFile = $baseDir . '/tmpdata.js'; // ← SAFE NAME: tmpdata.js
$baseUrl = '';

$searchIndex = [];
$id = 1;

// Extract clean title and text from HTML/PHP content
function extractPlainText($html) {
    // Remove scripts, styles, and comments
    $html = preg_replace('#<script(.*?)>(.*?)</script>#is', '', $html);
    $html = preg_replace('#<style(.*?)>(.*?)</style>#is', '', $html);
    $html = preg_replace('/<!--.*?-->/', '', $html);
    
    // Extract title
    $title = 'Untitled';
    if (preg_match('/<title[^>]*>([^<]+)<\/title>/i', $html, $matches)) {
        $title = trim(strip_tags($matches[1]));
    }

    // Convert to plain text
    $text = strip_tags($html);
    $text = preg_replace('/\s+/', ' ', $text); // Normalize spaces
    $text = trim($text);

    return ['title' => $title, 'content' => $text];
}

// Recursively scan all .html, .htm, .php files
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($baseDir, RecursiveDirectoryIterator::SKIP_DOTS)
);

foreach ($iterator as $file) {
    $filePath = $file->getPathname();
    $filename = basename($filePath);
    $ext = pathinfo($filePath, PATHINFO_EXTENSION);

    // Skip this script, data files, and non-content files
    if (
        $filename === 'generate-search-index.php' ||
        $filename === 'data.js' ||
        $filename === 'tmpdata.js'
    ) {
        continue;
    }

    if (in_array(strtolower($ext), ['html', 'htm', 'php'])) {
        $relPath = ltrim(str_replace('\\', '/', substr($filePath, strlen($baseDir))), '/');
        
        // Build clean URL
        $url = '/' . $relPath;
        if (in_array($filename, ['index.html', 'index.htm', 'index.php'])) {
            $url = '/' . trim(dirname($relPath), '/') . '/';
            if ($url === '//') $url = '/';
        } else {
            $url = preg_replace('/\.(html|htm|php)$/i', '/', $url);
        }

        $content = file_get_contents($filePath);
        $extracted = extractPlainText($content);

        // Skip very short pages (adjust threshold if needed)
        if (strlen($extracted['content']) < 50) {
            continue;
        }

        $searchIndex[] = [
            'title' => $extracted['title'],
            'id' => (string)$id,
            'url' => $url,
            'content' => $extracted['content'],
            'summary' => ''
        ];

        $id++;
    }
}

// Generate JavaScript content
$jsContent = "export function sitesData(){\n\n    var searchIndex = " . 
             json_encode($searchIndex, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . 
             ";\n\n    return searchIndex;\n\n}";

file_put_contents($outputFile, $jsContent, LOCK_EX);

echo "✅ tmpdata.js generated successfully!\n";
echo "📄 Indexed " . count($searchIndex) . " pages.\n";
echo "📁 File saved: " . realpath($outputFile) . "\n";
echo "\n👉 Please review tmpdata.js, then rename it to data.js if correct.\n";
?>