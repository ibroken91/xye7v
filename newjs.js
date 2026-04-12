function sanitizeInput(text) {
  return text
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function validateField(input) {
  var errorMsg = "Please match the format requested.";
  var pattern = /^$|^[\p{Script=Arabic}a-zA-Z0-9 \-_!@,():.?+~\r\n]+$/u;
  var rawValue = $(input).val();
  var fieldValue = sanitizeInput(rawValue);

  $(input).val(fieldValue);
  var hasError = !pattern.test(fieldValue);

  if (typeof input.setCustomValidity === 'function') {
    input.setCustomValidity(hasError ? errorMsg : '');
  } else {
    $(input).toggleClass('is-invalid', hasError);
    $(input).toggleClass('is-valid', !hasError);

    if (hasError) {
      $(input).attr('title', errorMsg);
    } else {
      $(input).removeAttr('title');
    }
  }

  return !hasError;
}