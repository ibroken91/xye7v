<?php
// generate-search-index.php
// Safe version — NO DOMDocument (works on basic PHP installs)

$baseDir = __DIR__;
$outputFile = $baseDir . '/tmpdata.js';

// Folders to skip (case-insensitive)
$excludedFolders = ['legacy', 'admin', 'assets', 'css', 'js', 'images', 'img', 'fonts'];

function shouldSkipPath($relPath, $excluded) {
    $parts = explode('/', strtolower(trim($relPath, '/')));
    foreach ($excluded as $folder) {
        if (in_array(strtolower($folder), $parts)) return true;
    }
    return false;
}

function extractTextFromTags($html, $tags) {
    $content = '';
    foreach ($tags as $tag) {
        // Match opening and closing tags (e.g., <p>, </p>)
        $pattern = '/<' . preg_quote($tag, '/') . '(\s[^>]*)?>(.*?)<\/' . preg_quote($tag, '/') . '>/isu';
        if (preg_match_all($pattern, $html, $matches)) {
            foreach ($matches[2] as $text) {
                // Recursively strip any nested tags
                $text = strip_tags($text);
                if (trim($text)) {
                    $content .= ' ' . trim($text);
                }
            }
        }
    }
    return preg_replace('/\s+/', ' ', trim($content));
}

function extractCleanContent($html) {
    // Extract title
    $title = 'Untitled';
    if (preg_match('/<title[^>]*>([^<]+)<\/title>/i', $html, $matches)) {
        $title = trim(strip_tags($matches[1]));
    }

    // Remove unwanted sections: nav, footer, header, scripts, styles
    $html = preg_replace('/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/is', '', $html);
    $html = preg_replace('/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/is', '', $html);
    $html = preg_replace('/<nav\b[^>]*>.*?<\/nav>/is', '', $html);
    $html = preg_replace('/<footer\b[^>]*>.*?<\/footer>/is', '', $html);
    $html = preg_replace('/<header\b[^>]*>.*?<\/header>/is', '', $html);
    $html = preg_replace('/<!--.*?-->/s', '', $html);

    // Try to isolate main content area (common patterns)
    $mainContent = '';
    $contentPatterns = [
        '/<main\b[^>]*>(.*?)<\/main>/is',
        '/<article\b[^>]*>(.*?)<\/article>/is',
        '/<section\b[^>]*>(.*?)<\/section>/is',
        '/<div[^>]*id=["\']content["\'][^>]*>(.*?)<\/div>/is',
        '/<div[^>]*class=["\'][^"\']*content[^"\']*["\'][^>]*>(.*?)<\/div>/is',
        '/<div[^>]*id=["\']main-content["\'][^>]*>(.*?)<\/div>/is',
    ];

    foreach ($contentPatterns as $pattern) {
        if (preg_match($pattern, $html, $matches)) {
            $mainContent = $matches[1];
            break;
        }
    }

    // If no main area found, use whole body
    if ($mainContent === '') {
        if (preg_match('/<body[^>]*>(.*?)<\/body>/is', $html, $matches)) {
            $mainContent = $matches[1];
        } else {
            $mainContent = $html; // fallback
        }
    }

    // Extract text from semantic tags
    $semanticTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li'];
    $content = extractTextFromTags($mainContent, $semanticTags);

    return ['title' => $title, 'content' => $content];
}

// Scan files
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($baseDir, RecursiveDirectoryIterator::SKIP_DOTS)
);

$searchIndex = [];
$id = 1;

foreach ($iterator as $file) {
    $filePath = $file->getPathname();
    $relPath = ltrim(str_replace('\\', '/', substr($filePath, strlen($baseDir))), '/');
    
    // Skip excluded folders
    if (shouldSkipPath($relPath, $excludedFolders)) {
        continue;
    }

    $filename = basename($filePath);
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

    // ONLY .html and .htm — skip .php
    if (!in_array($ext, ['html', 'htm'])) {
        continue;
    }

    // Skip utility files
    if (in_array($filename, ['generate-search-index.php', 'tmpdata.js', 'data.js'])) {
        continue;
    }

    // Build URL
    $url = '/' . $relPath;
    if (in_array($filename, ['index.html', 'index.htm'])) {
        $url = '/' . trim(dirname($relPath), '/') . '/';
        if ($url === '//') $url = '/';
    } else {
        $url = preg_replace('/\.(html|htm)$/i', '/', $url);
    }

    $html = file_get_contents($filePath);
    $extracted = extractCleanContent($html);

    if (strlen($extracted['content']) < 30) {
        continue; // too short
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

// Generate JS file
$jsContent = "export function sitesData(){\n\n    var searchIndex = " . 
             json_encode($searchIndex, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . 
             ";\n\n    return searchIndex;\n\n}";

file_put_contents($outputFile, $jsContent, LOCK_EX);

echo "✅ tmpdata.js generated successfully!\n";
echo "📄 Indexed " . count($searchIndex) . " pages.\n";
echo "📁 File: " . realpath($outputFile) . "\n";
echo "\n👉 Review tmpdata.js, then rename to data.js when ready.\n";
?>