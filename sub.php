<?php
/**
 * Contact form API — validation matches js/contact.js (validateField whitelist + Arabic marks).
 * Served as /submit/ via submit/index.php (PHP built-in server or Apache).
 *
 * Set RECAPTCHA_SECRET_KEY (and optionally CDC_CONTACT_MAIL_TO) in the environment for production.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

/**
 * Same character whitelist as contact.js validateField (must use /u for UTF-8).
 * Tatweel \x{0640}; harakat / marks \x{064B}-\x{065F}; superscript alif \x{0670}.
 */
const CONTACT_TEXT_REGEXP = '/^$|^[\x{0621}-\x{064A}\x{0660}-\x{0669}a-zA-Z0-9\x{2D}_ !(),:\x{061F}?.\x{0640}@+\r\n\x{0640}\x{064B}-\x{065F}\x{0670}]+$/u';

/** File base name whitelist (matches contact.js upload RegExp; includes #). */
const CONTACT_FILENAME_REGEXP = '/^$|^[\x{0621}-\x{064A}\x{0660}-\x{0669}a-zA-Z0-9\x{2D}_# !(),:\x{061F}?.\x{0640}@+\r\n]+$/u';

const CONTACT_PHONE_REGEXP = '/^(?:\+\d{1,3}\s?)?(?:[0-9\-\(\)\/\.]\s?){7,15}[0-9]{1}$/';

/**
 * Trim, enforce max length (UTF-8 grapheme-safe count), whitelist via FILTER_VALIDATE_REGEXP.
 * Replaces deprecated FILTER_SANITIZE_STRING — validation is the safety boundary; escape on output.
 *
 * @return string|false The trimmed string if valid, false if too long or characters disallowed
 */
function filterName(string $field, int $maxlimit)
{
    $field = str_replace("\0", '', trim($field));
    if (mb_strlen($field, 'UTF-8') > $maxlimit) {
        return false;
    }

    $filtered = filter_var(
        $field,
        FILTER_VALIDATE_REGEXP,
        ['options' => ['regexp' => CONTACT_TEXT_REGEXP]]
    );

    return $filtered === false ? false : (string) $filtered;
}

function filterContactFilename(string $filename, int $maxBaseLength): bool
{
    $filename = str_replace("\0", '', $filename);
    $base = pathinfo($filename, PATHINFO_FILENAME);
    if (mb_strlen($base, 'UTF-8') > $maxBaseLength) {
        return false;
    }
    $filtered = filter_var(
        $filename,
        FILTER_VALIDATE_REGEXP,
        ['options' => ['regexp' => CONTACT_FILENAME_REGEXP]]
    );
    return $filtered !== false;
}

function verifyRecaptcha(string $response, string $secret): bool
{
    if ($secret === '') {
        return true;
    }
    if ($response === '') {
        return false;
    }
    $payload = http_build_query([
        'secret'   => $secret,
        'response' => $response,
        'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
    ]);
    $ctx = stream_context_create([
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => $payload,
            'timeout' => 10,
        ],
    ]);
    $raw = @file_get_contents('https://www.google.com/recaptcha/api/siteverify', false, $ctx);
    if ($raw === false) {
        return false;
    }
    $json = json_decode($raw, true);
    return is_array($json) && !empty($json['success']);
}

function contact_submit_errors(bool $isAr): array
{
    if ($isAr) {
        return [
            'first_name' => 'يُرجى إدخال اسم صالح',
            'phone'      => 'يُرجى إدخال رقم هاتف صالح',
            'email'      => 'البريد الإلكتروني غير صالح',
            'subject'    => 'يُرجى اختيار موضوع صالح',
            'msg'        => 'يجب أن تحتوي مدخلات الرسالة على احرف صحيحة (الرموز الخاصة المسموح بها: ! ( ) : . ؟ ? # @ + . ).',
            'captcha'    => 'يُرجى التحقق من أنك لست روبوتًا',
            'upload'     => 'خطأ في المرفقات',
        ];
    }
    return [
        'first_name' => 'Please enter a valid name',
        'phone'      => 'Please enter a valid number',
        'email'      => 'Your email is not correct',
        'subject'    => 'Please choose a valid subject',
        'msg'        => 'Message entries must contain valid characters (Allowed characters: ! ( ) , : ؟ ? . ـ @ + ).',
        'captcha'    => 'Please complete the captcha verification',
        'upload'     => 'Attachment validation failed',
    ];
}

function contact_handle_submit(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false]);
        return;
    }

    $lan = isset($_POST['lan']) ? (string) $_POST['lan'] : 'en';
    $isAr = ($lan === 'ar');
    $err = contact_submit_errors($isAr);

    $out = [
        'success'          => false,
        'first_name_error' => '',
        'phone_error'      => '',
        'email_error'      => '',
        'subject_error'    => '',
        'msg_error'        => '',
        'captcha_error'    => '',
        'up_response'      => null,
    ];

    $secret = getenv('RECAPTCHA_SECRET_KEY') ?: '';
    $captchaResponse = isset($_POST['g-recaptcha-response']) ? (string) $_POST['g-recaptcha-response'] : '';
    if (!verifyRecaptcha($captchaResponse, $secret)) {
        $out['captcha_error'] = $err['captcha'];
        echo json_encode($out);
        return;
    }

    $firstName = isset($_POST['first_name']) ? (string) $_POST['first_name'] : '';
    $firstOk = filterName($firstName, 40);
    if ($firstOk === false) {
        $out['first_name_error'] = $err['first_name'];
    }

    $phone = isset($_POST['phone']) ? (string) $_POST['phone'] : '';
    $phoneOk = true;
    if ($phone !== '') {
        $phoneOk = (bool) preg_match(CONTACT_PHONE_REGEXP, $phone) && strlen($phone) <= 30;
        if (!$phoneOk) {
            $out['phone_error'] = $err['phone'];
        }
    }

    $email = isset($_POST['email']) ? (string) $_POST['email'] : '';
    $emailOk = true;
    if ($email !== '') {
        $emailOk = filter_var($email, FILTER_VALIDATE_EMAIL) !== false && strlen($email) <= 120;
        if (!$emailOk) {
            $out['email_error'] = $err['email'];
        }
    }

    $subject = isset($_POST['subject']) ? (string) $_POST['subject'] : '';
    $subjectOk = filterName($subject, 280);
    if ($subjectOk === false || $subjectOk === '') {
        $out['subject_error'] = $err['subject'];
        $subjectOk = false;
    }

    $msg = isset($_POST['msg']) ? (string) $_POST['msg'] : '';
    $msgOk = filterName($msg, 5000);
    if ($msgOk === false || $msgOk === '') {
        $out['msg_error'] = $err['msg'];
        $msgOk = false;
    }

    $allowedExt = ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg'];
    $sizeLimit = 7000000;
    $uploadCount = 0;
    $uploadError = null;
    for ($i = 1; $i <= 5; $i++) {
        $key = 'fileupload' . $i;
        if (empty($_FILES[$key]['name']) || !is_string($_FILES[$key]['name'])) {
            continue;
        }
        $uploadCount++;
        $f = $_FILES[$key];
        if (!empty($f['error']) && (int) $f['error'] !== UPLOAD_ERR_OK) {
            $uploadError = $err['upload'];
            break;
        }
        $name = $f['name'];
        $size = (int) $f['size'];
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExt, true) || $size > $sizeLimit || $size <= 0) {
            $uploadError = $err['upload'];
            break;
        }
        if (!filterContactFilename($name, 150)) {
            $uploadError = $err['upload'];
            break;
        }
    }
    if ($uploadCount > 5) {
        $uploadError = $err['upload'];
    }

    if ($uploadError !== null) {
        $out['up_response'] = $uploadError;
    }

    $ok = $firstOk !== false
        && $phoneOk
        && $emailOk
        && $subjectOk !== false
        && $msgOk !== false
        && $uploadError === null;

    if (!$ok) {
        echo json_encode($out);
        return;
    }

    $to = getenv('CDC_CONTACT_MAIL_TO') ?: '';
    if ($to !== '') {
        $safeName = $firstOk;
        $safeSubj = $subjectOk;
        $safeMsg = $msgOk;
        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/plain; charset=UTF-8',
            'From: noreply@localhost',
        ];
        $body = "Name: {$safeName}\nPhone: {$phone}\nEmail: {$email}\nSubject: {$safeSubj}\n\n{$safeMsg}\n";
        @mail($to, '[Contact] ' . mb_substr($safeSubj, 0, 200, 'UTF-8'), $body, implode("\r\n", $headers));
    }

    $out['success'] = true;
    echo json_encode($out);
}

contact_handle_submit();
