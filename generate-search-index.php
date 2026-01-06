<?php
// generate-search-index.php
// Extracts clean content from semantic HTML tags only

$baseDir = __DIR__;
$outputFile = $baseDir . '/tmpdata.js';

$searchIndex = [];
$id = 1;

// List of folders to SKIP (case-insensitive)
$excludedFolders = ['legacy', 'admin', 'assets', 'css', 'js', 'images', 'img'];

function shouldSkipPath($relativePath, $excludedFolders) {
    $parts = explode('/', trim(strtolower($relativePath), '/'));
    foreach ($excludedFolders as $exclude) {
        if (in_array(strtolower($exclude), $parts)) {
            return true;
        }
    }
    return false;
}

function extractCleanContent($html) {
    $title = 'Untitled';
    if (preg_match('/<title[^>]*>([^<]+)<\/title>/i', $html, $matches)) {
        $title = trim(strip_tags($matches[1]));
    }

    // Remove scripts, styles, comments, and unwanted tags
    $html = preg_replace('#<script(.*?)>(.*?)</script>#is', '', $html);
    $html = preg_replace('#<style(.*?)>(.*?)</style>#is', '', $html);
    $html = preg_replace('/<!--.*?-->/s', '', $html);
    $html = preg_replace('/<nav[^>]*>.*?<\/nav>/is', '', $html); // remove nav
    $html = preg_replace('/<footer[^>]*>.*?<\/footer>/is', '', $html); // remove footer
    $html = preg_replace('/<header[^>]*>.*?<\/header>/is', '', $html); // remove header

    // Extract ONLY content from semantic containers
    $contentHtml = '';
    
    // Common content wrappers — adjust if your site uses different ones
    $wrappers = [
        '<main',        // <main>
        '<article',     // <article>
        '<section',     // <section>
        'class="content"',     // common class
        'class="page-content"',
        'id="content"',
        'id="main-content"'
    ];

    $found = false;
    foreach ($wrappers as $tag) {
        if (stripos($html, $tag) !== false) {
            // Use DOMDocument for reliable parsing
            $dom = new DOMDocument();
            libxml_use_internal_errors(true);
            $dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
            libxml_clear_errors();

            $xpath = new DOMXPath($dom);

            // Query semantic content elements
            $nodes = $xpath->query('//p | //h1 | //h2 | //h3 | //h4 | //h5 | //h6 | //li | //article//text() | //section//text() | //div//*[self::p or self::h1 or self::h2 or self::h3 or self::h4 or self::h5 or self::h6 or self::li]');

            $texts = [];
            foreach ($nodes as $node) {
                if ($node->nodeType === XML_TEXT_NODE) {
                    $texts[] = trim($node->textContent);
                } else {
                    $texts[] = trim($node->textContent);
                }
            }

            $content = implode(' ', array_filter($texts));
            $content = preg_replace('/\s+/', ' ', $content);
            return ['title' => $title, 'content' => trim($content)];
        }
    }

    // Fallback: if no wrapper found, extract from body using semantic tags only
    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();

    $xpath = new DOMXPath($dom);
    $nodes = $xpath->query('//body//p | //body//h1 | //body//h2 | //body//h3 | //body//h4 | //body//h5 | //body//h6 | //body//li');

    $texts = [];
    foreach ($nodes as $node) {
        $texts[] = trim($node->textContent);
    }

    $content = implode(' ', array_filter($texts));
    $content = preg_replace('/\s+/', ' ', $content);
    return ['title' => $title, 'content' => trim($content)];
}

// Scan files
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($baseDir, RecursiveDirectoryIterator::SKIP_DOTS)
);

foreach ($iterator as $file) {
    $filePath = $file->getPathname();
    $relPath = ltrim(str_replace('\\', '/', substr($filePath, strlen($baseDir))), '/');
    
    // Skip excluded folders
    if (shouldSkipPath($relPath, $excludedFolders)) {
        continue;
    }

    $filename = basename($filePath);
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

    // ONLY process .html and .htm — skip .php entirely
    if (!in_array($ext, ['html', 'htm'])) {
        continue;
    }

    // Skip tool files
    if ($filename === 'generate-search-index.php' || $filename === 'tmpdata.js' || $filename === 'data.js') {
        continue;
    }

    // Build URL
    $url = '/' . $relPath;
    if ($filename === 'index.html' || $filename === 'index.htm') {
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

// Output
$jsContent = "export function sitesData(){\n\n    var searchIndex = " . 
             json_encode($searchIndex, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . 
             ";\n\n    return searchIndex;\n\n}";

file_put_contents($outputFile, $jsContent, LOCK_EX);

echo "✅ tmpdata.js generated!\n";
echo "📄 Indexed " . count($searchIndex) . " clean pages.\n";
echo "📁 Output: " . realpath($outputFile) . "\n";
echo "\n👉 Review tmpdata.js, then rename to data.js if OK.\n";
?>