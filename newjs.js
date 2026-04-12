// ===============================
// 🌍 بيئة التطوير vs الإنتاج
// ===============================
// يتخطى reCAPTCHA تلقائياً عند العمل محلياً (localhost / 127.0.0.1)
// في السيرفر الحقيقي سيعمل التحقق بشكل طبيعي 100%
var pattern = /^(?:$|[\p{Arabic}a-zA-Z0-9_!\(\),:؟?.ـ@+\r\n -]+)$/u;
const IS_DEV_ENV = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname) || window.location.protocol === 'file:';

const element = document.querySelector('#captcha_form');
if (element) {
  element.addEventListener('submit', event => {
    event.preventDefault();
  });
}

var state = { files: [], filesArr: [], filesCount: 0 };

// ===============================
// 🆕 1) تنظيف كامل (يُستخدم عند submit / blur)
// ===============================
function sanitizeInput(text) {
  if (!text) return "";
  return text
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ===============================
// 🆕 2) إزالة الأحرف المخفية فقط (أثناء الكتابة)
// ===============================
function removeHiddenOnly(text) {
  if (!text) return "";
  return text.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, "");
}

// ===============================
// ✅ 3) التحقق من الحقل (يدعم العربية الكاملة + التشكيل)
// ===============================
function validateField(input) {
  var errorMsg = "Please match the format requested.";
  var pattern = /^[\p{Script=Arabic}a-zA-Z0-9 \-_!@,():.?+~\r\n]*$/u;
  
  var fieldValue = $(input).val() || "";
  var hasError = !pattern.test(fieldValue);
  var $input = $(input);
  
  if (typeof input.setCustomValidity === 'function') {
    input.setCustomValidity(hasError ? errorMsg : '');
  }
  
  $input.toggleClass('is-invalid', hasError);
  $input.toggleClass('is-valid', !hasError && fieldValue.length > 0);
  
  // إظهار/إخفاء رسالة الخطأ المخصصة #msqError
  var $errorDiv = $('#msqError');
  if (hasError) {
    $input.attr('title', errorMsg);
    if ($errorDiv.length) $errorDiv.text(errorMsg).show();
  } else {
    $input.removeAttr('title');
    if ($errorDiv.length) $errorDiv.text('').hide();
  }
  
  // تحديث رسائل الخطأ الأخرى ديناميكياً
  var fieldId = $(input).attr('id');
  if (fieldId) {
    var $fieldError = $('#' + fieldId.replace('_input_text', '_error'));
    if ($fieldError.length) {
      if (hasError) $fieldError.text(errorMsg).show();
      else $fieldError.text('').hide();
    }
  }
  
  return !hasError;
}

// ===============================
// 🔥 4) أثناء الكتابة
// ===============================
$('input:not([type="file"]):not(#phone_input_text), textarea:not(#msq_input_text)').on('input', function () {
  var val = $(this).val();
  var cleaned = removeHiddenOnly(val);
  if (val !== cleaned) $(this).val(cleaned);
  validateField(this);
});

$('#msq_input_text').on('input', function () {
  var val = $(this).val();
  var cleaned = removeHiddenOnly(val);
  if (val !== cleaned) $(this).val(cleaned);
  validateField(this);
});

// ===============================
// ✅ 5) عند الخروج من الحقل
// ===============================
$('input:not([type="file"]), textarea').on('blur', function () {
  var cleaned = sanitizeInput($(this).val());
  $(this).val(cleaned);
  validateField(this);
});

// ===============================
// 🔐 6) عند إرسال النموذج (التحقق + إرسال AJAX)
// ===============================
$('form').on('submit', function (e) {
  e.preventDefault();
  e.stopPropagation();
  
  var form = this;
  var isValid = true;
  
  // تنظيف والتحقق من جميع الحقول
  $('input:not([type="file"]), textarea').each(function () {
    var cleaned = sanitizeInput($(this).val());
    $(this).val(cleaned);
    if (!validateField(this)) isValid = false;
  });
  
  // 🔍 التحقق من reCAPTCHA (يتم تخطيه تلقائياً في بيئة التطوير)
  var captchaValid = true;
  var recaptchaResponse = '';
  
  if (!IS_DEV_ENV) {
    recaptchaResponse = (typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse() : '';
    if (!recaptchaResponse) {
      captchaValid = false;
      $('.recaptcha_error').css('display', 'block');
    } else {
      $('.recaptcha_error').css('display', 'none');
    }
  } else {
    console.log('%c[DEV MODE] reCAPTCHA validation skipped.', 'color: orange; font-weight: bold;');
  }
  
  if (!isValid || !captchaValid || form.checkValidity() === false) {
    $('#send-message').attr('disabled', false);
    $(form).addClass('was-validated');
    return;
  }
  
  // ✅ جمع البيانات
  var first_name = $('#name_input_text').val();
  var phone = $('#phone_input_text').val();
  var email = $('#email_input_text').val();
  var subject = $('#first_subject_input_text').text() ?
    $("select.custom-select").children("option:selected").text() + " : " + $('#second_subject_input_text').val()
    : $("select.custom-select").children("option:selected").text();
  var msg = $('#msq_input_text').val();
  var lan = $('html')[0].lang;
  var formData = new FormData();
  var emailToContact = 1;
  
  if (first_name) formData.append('first_name', first_name);
  if (phone) formData.append('phone', phone);
  if (email) formData.append('email', email);
  if (subject) formData.append('subject', subject);
  if (emailToContact) formData.append('emailToContact', emailToContact);
  if (msg) formData.append('msg', msg);
  
  // إرفاق reCAPTCHA فقط في الإنتاج
  if (!IS_DEV_ENV && recaptchaResponse) {
    formData.append('g-recaptcha-response', recaptchaResponse);
  }
  
  formData.append('lan', lan);
  
  if (state.filesArr && state.filesArr.length > 0) {
    for (var x = 0; x < state.filesArr.length; x++) {
      if (x < 5) formData.append('fileupload' + (x + 1), state.filesArr[x]);
    }
  }
  
  $.ajax({
    url: "/submit/",
    type: "POST",
     formData,
    dataType: 'json',
    cache: false,
    contentType: false,
    processData: false,
    timeout: 62000,
    beforeSend: function () {
      $('#loader-icon').attr("hidden", false);
      $('#send-message').attr('disabled', 'disabled');
    },
    success: function (data, status) {
      $('#send-message').attr('disabled', false);
      
      if (data.success) {
        $('#captcha_form')[0].reset();
        $('#first_name_error, #phone_error, #email_error, #subject_error, #msg_error, #msqError, #captcha_error').text('').hide();
        
        if (!IS_DEV_ENV && typeof grecaptcha !== 'undefined') grecaptcha.reset();
        
        $("#captcha_form").addClass("d-none").removeClass("d-block");
        $("#successForm").addClass("d-block").removeClass("d-none");
        
        if ($(window).width() > 960) {
          $('html, body').animate({ scrollTop: 0 }, 'slow');
        } else {
          $('html, body').animate({ scrollTop: $("#successMsg").offset().top });
        }
      } else {
        if (data.first_name_error) $('#first_name_error').text(data.first_name_error).show();
        if (data.phone_error) $('#phone_error').text(data.phone_error).show();
        if (data.email_error) $('#email_error').text(data.email_error).show();
        if (data.subject_error) $('#subject_error').text(data.subject_error).show();
        
        if (data.msg_error) {
          $('#msg_error').text(data.msg_error).show();
          $('#msqError').text(data.msg_error).show();
          $('#msqalert').css('display', 'block');
        } else {
          $('#msg_error, #msqError').hide();
          $('#msqalert').css('display', 'none');
        }
        if (data.captcha_error) $('#captcha_error').text(data.captcha_error).show();
        if (data.up_response) {
          $('.upload1').empty().append("<span class='filename1' style='color:red;'>" + data.up_response + "</span>").show();
        } else {
          $('.upload1').hide();
        }
        
        $('#captcha_form input, #captcha_form textarea').each(function () {
          if (typeof this.setCustomValidity === 'function') this.setCustomValidity('');
        });
        
        if (lan == "ar") {
          $("#mail-status").html('<span style="color:red">حدث خطأ ما ! </span>');
        } else {
          $("#mail-status").html('<span style="color:red">An Error occurred! </span>');
        }
        
        if (!IS_DEV_ENV && typeof grecaptcha !== 'undefined') grecaptcha.reset();
        $('#loader-icon').attr("hidden", true);
        $('.contact-info').css('margin-bottom', '180px');
      }
    },
    error: function (xhr, desc, err) {
      if (lan == "ar") {
        $("#mail-status").html('<span style="color:red">حدث خطأ ما ! </span>');
      } else {
        $("#mail-status").html('<span style="color:red">Something went wrong! </span>');
      }
      $('#loader-icon').attr("hidden", true);
      $('#send-message').attr('disabled', false);
    }
  });
  
  $(form).addClass('was-validated');
});

// ===============================
// 🌐 تهيئة Bootstrap validation
// ===============================
(function () {
  'use strict';
  window.addEventListener('load', function () {
    var forms = document.getElementsByClassName('needs-validation');
    Array.prototype.filter.call(forms, function (form) {
      form.addEventListener('submit', function (event) {
        // يتم التعامل مع الـ submit في المعالج بالأعلى
      }, false);
    });
  }, false);
})();

// ===============================
// 🔐 reCAPTCHA UI Setup
// ===============================
window.onload = function() {
  var recaptcha = document.querySelector('#g-recaptcha-response');
  if (recaptcha) {
    recaptcha.required = !IS_DEV_ENV; // لا يجعله مطلوباً في وضع التطوير
    recaptcha.oninvalid = function(e) {
      if (!IS_DEV_ENV) $('.recaptcha_error').css('display', 'block');
    };
  }
};

function invalidfn(elementInvalid) {
  var el = document.getElementById(elementInvalid);
  if (el) $(el).css('display', 'block');
}
function validfn(elementInvalid) {
  var el = document.getElementById(elementInvalid);
  if (el) $(el).css('display', 'none');
}
function recaptchaCallback() {
  $('.recaptcha_error').css('display', 'none');
}

var width = $('.g-recaptcha').parent().width();
if (width && width < 302) {
  var scale = width / 302;
  $('.g-recaptcha').css('transform', 'scale(' + scale + ')');
  $('.g-recaptcha').css('-webkit-transform', 'scale(' + scale + ')');
  $('.g-recaptcha').css('transform-origin', '0 0');
  $('.g-recaptcha').css('-webkit-transform-origin', '0 0');
}

// ===============================
// ✅ تطبيق التحقق على الحقول المحددة
// ===============================
$('#second_subject_input_text, #name_input_text').on('input', function () {
  validateField(this);
});

// ===============================
// ✅ التحقق من الهاتف
// ===============================
$('#phone_input_text').on('input', function () {
  var val = $(this).val();
  var cleaned = removeHiddenOnly(val);
  if (val !== cleaned) $(this).val(cleaned);
}).on('keypress', function(event){
  const allowedChars = '+0123456789-()/.\s';
  const char = String.fromCharCode(event.which);
  if (event.ctrlKey || event.altKey || event.metaKey || event.which < 32) return;
  if (!allowedChars.includes(char)) event.preventDefault();
});

$(document).ready(function () {
  fillSelection();
  $("select.custom-select").change(function () {
    $('#infoMessage').remove();
  });
});

// ===============================
// 📤 Upload function
// ===============================
$('#del-btn1').hide();

function updateState(newState) {
  state = { ...state, ...newState };
}

$('#btnUploadFile').click(function () { $('.upload1').fadeOut(); });

$('#btnUploadFile').change(function () {
  $('.upload1').hide();
  var curFilesCount = state.filesCount;
  var curArray = state.filesArr;
  const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg'];
  const sizeLimit = 7000000;
  var filestate = true;
  
  var pattern = /^[\p{Script=Arabic}a-zA-Z0-9\-_# !(),:؟?.ـ@+\r\n]*$/u;
  var upfiles = document.getElementsByName("file1")[0].files;
  var tempFilesCount = curFilesCount + (upfiles ? upfiles.length : 0);
  
  for (var i = 0; upfiles && i < upfiles.length; i++) {
    var file = upfiles[i];
    var FileName = file.name;
    var baseName = FileName.split('.').slice(0, -1).join('.');
    var fileSize = file.size;
    var lan = $('html')[0].lang;
    var FileExt = FileName.substr(FileName.lastIndexOf('.') + 1).toLowerCase();
    
    if (!allowedExtensions.includes(FileExt) || fileSize > sizeLimit) {
      if (lan == "ar") {
        $('.upload1').empty().append("نوع الملف غير مسموح به. الملفات المسموح بها: ('pdf', 'doc', 'docx', 'txt', 'png', 'jpg').").show();
      } else {
        $('.upload1').empty().append("File extension not allowed. Allowed extensions: ('pdf', 'doc', 'docx', 'txt', 'png', 'jpg').").show();
      }
      this.value = null; filestate = false; continue;
    }
    
    if (fileSize <= 0) {
      if (lan == "ar") $('.upload1').empty().append("الملف فارغ أو تالف.").show();
      else $('.upload1').empty().append("The file is empty or corrupted.").show();
      this.value = null; filestate = false; continue;
    }
    
    if (tempFilesCount > 5) {
      if (lan == "ar") $('.upload1').empty().append("يسمح بإرفاق 5 ملفات فقط.").show();
      else $('.upload1').empty().append("Only 5 files are allowed to be attached.").show();
      this.value = null; filestate = false; continue;
    }
    
    if (baseName.length > 50) {
      if (lan == "ar") $('.upload1').empty().append("اسم الملف طويل جداً (الحد الأقصى 50 حرفاً).").show();
      else $('.upload1').empty().append("File name exceeds 50 characters.").show();
      this.value = null; filestate = false; continue;
    }
    
    if (!pattern.test(FileName)) {
      if (lan == "ar") $('.upload1').empty().append("يحتوي اسم الملف على رموز غير مسموح بها.").show();
      else $('.upload1').empty().append("File name contains unallowed characters.").show();
      this.value = null; filestate = false; continue;
    }
  }
  
  if (filestate && upfiles && upfiles.length > 0) {
    var newFilesCount = upfiles.length;
    var newfilesArr = Array.from(upfiles);
    if (curFilesCount !== undefined) newFilesCount = curFilesCount + newFilesCount;
    if (curArray !== undefined) newfilesArr = curArray.concat(newfilesArr);
    
    updateState({ filesArr: newfilesArr, filesCount: newFilesCount });
    renderFileList();
    this.value = null;
  }
});

function renderFileList() {
  if (!state.filesArr || state.filesArr.length === 0) {
    $('#filelist').html('');
    return;
  }
  let fileMap = state.filesArr.map((file, index) => {
    let suffix = "bytes", size = file.size;
    if (size >= 1024 && size < 1024000) { suffix = "KB"; size = Math.round(size / 1024 * 100) / 100; }
    else if (size >= 1024000) { suffix = "MB"; size = Math.round(size / 1024000 * 100) / 100; }
    return `<li key="${index}">${htmlEntities(file.name)}<span class="file-size">${size} ${suffix}</span><i class="fas fa-trash" style="cursor: pointer;"></i></li>`;
  });
  $('#filelist').html(fileMap.join(''));
}

$(".filename-container1").on("click", "li > i", function (e) {
  let curCount = state.filesCount - 1;
  let key = parseInt($(this).parent().attr("key"));
  let curArr = state.filesArr;
  if (!isNaN(key) && curArr && curArr[key]) curArr.splice(key, 1);
  if (!curArr || curArr.length === 0) { curArr = null; curCount = 0; }
  renderFileList();
  updateState({ filesArr: curArr, filesCount: curCount });
});

function htmlEntities(str) {
  if (!str) return "";
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function fillSelection() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('v') == 1) $("select.custom-select").prop('selectedIndex', 2);
}