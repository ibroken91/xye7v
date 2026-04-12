// Example starter JavaScript for disabling form submissions if there are invalid fields
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
    // إزالة الأحرف المخفية (Unicode hidden chars)
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, "")
    // توحيد المسافات
    .replace(/\s+/g, " ")
    // حذف المسافات الزائدة
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
// ✅ 3) التحقق من الحقل (مُحدَّث - يدعم العربية الكاملة + التشكيل)
// ===============================
function validateField(input) {
  var errorMsg = "Please match the format requested.";
  // ✅ النمط الحديث: يدعم كل الحروف العربية وعلامات التشكيل (ً ٍ ٌ َ ُ ِ ...)
  var pattern = /^[\p{Script=Arabic}a-zA-Z0-9 \-_!@,():.?+~\r\n]*$/u;
  
  var fieldValue = $(input).val() || "";
  var hasError = !pattern.test(fieldValue);
  var $input = $(input);
  
  // 🔹 HTML5 Constraint Validation API
  if (typeof input.setCustomValidity === 'function') {
    input.setCustomValidity(hasError ? errorMsg : '');
  }
  
  // 🔹 Bootstrap validation classes
  $input.toggleClass('is-invalid', hasError);
  $input.toggleClass('is-valid', !hasError && fieldValue.length > 0);
  
  // 🔹 🆕 إظهار/إخفاء رسالة الخطأ المخصصة #msqError (لحل مشكلة عدم الظهور)
  var $errorDiv = $('#msqError');
  if (hasError) {
    $input.attr('title', errorMsg);
    if ($errorDiv.length) {
      $errorDiv.text(errorMsg).show(); // ✅ إظهار الرسالة وتحديث النص
    }
  } else {
    $input.removeAttr('title');
    if ($errorDiv.length) {
      $errorDiv.text('').hide(); // ✅ إخفاء الرسالة عند النجاح
    }
  }
  
  // 🔹 تحديث رسائل الخطأ الأخرى إن وُجدت
  var fieldId = $(input).attr('id');
  if (fieldId) {
    var $fieldError = $('#' + fieldId.replace('_input_text', '_error'));
    if ($fieldError.length) {
      if (hasError) {
        $fieldError.text(errorMsg).show();
      } else {
        $fieldError.text('').hide();
      }
    }
  }
  
  return !hasError;
}

// ===============================
// 🔥 4) أثناء الكتابة: إزالة الأحرف المخفية فقط (بدون تخريب تجربة المستخدم)
// ===============================
$('input:not([type="file"]):not(#phone_input_text), textarea:not(#msq_input_text)').on('input', function () {
  var val = $(this).val();
  var cleaned = removeHiddenOnly(val);
  if (val !== cleaned) {
    $(this).val(cleaned);
  }
  validateField(this);
});

// ✅ معالجة خاصة لـ #msq_input_text (لضمان ظهور #msqError)
$('#msq_input_text').on('input', function () {
  var val = $(this).val();
  var cleaned = removeHiddenOnly(val);
  if (val !== cleaned) {
    $(this).val(cleaned);
  }
  validateField(this);
});

// ===============================
// ✅ 5) عند الخروج من الحقل: تنظيف كامل
// ===============================
$('input:not([type="file"]), textarea').on('blur', function () {
  var cleaned = sanitizeInput($(this).val());
  $(this).val(cleaned);
  validateField(this);
});

// ===============================
// 🔐 6) عند إرسال النموذج: تنظيف نهائي + تحقق شامل
// ===============================
$('form').on('submit', function (e) {
  e.preventDefault();
  e.stopPropagation();
  
  var form = this;
  var isValid = true;
  
  // تنظيف والتحقق من جميع الحقول (باستثناء ملفات الـ upload)
  $('input:not([type="file"]), textarea').each(function () {
    var cleaned = sanitizeInput($(this).val());
    $(this).val(cleaned);
    if (!validateField(this)) {
      isValid = false;
    }
  });
  
  // التحقق من reCAPTCHA
  var recaptcha = grecaptcha ? grecaptcha.getResponse() : '';
  if (!recaptcha) {
    $('.recaptcha_error').css('display', 'block');
    isValid = false;
  } else {
    $('.recaptcha_error').css('display', 'none');
  }
  
  // التحقق من Bootstrap native validation
  if (!isValid || form.checkValidity() === false) {
    $('#send-message').attr('disabled', false);
    $(form).addClass('was-validated');
    return;
  }
  
  // ✅ كل شيء صالح: متابعة الإرسال عبر AJAX
  var first_name = $('#name_input_text').val();
  var phone = $('#phone_input_text').val();
  var email = $('#email_input_text').val();
  var subject = $('#first_subject_input_text').text() ?
    $("select.custom-select").children("option:selected").text() + " : " + $('#second_subject_input_text').val()
    : $("select.custom-select").children("option:selected").text();
  var msg = $('#msq_input_text').val();
  var lan = $('html')[0].lang;
  var recaptchaResponse = grecaptcha ? grecaptcha.getResponse() : '';
  var formData = new FormData();
  var emailToContact = 1;
  
  if (first_name) formData.append('first_name', first_name);
  if (phone) formData.append('phone', phone);
  if (email) formData.append('email', email);
  if (subject) formData.append('subject', subject);
  if (emailToContact) formData.append('emailToContact', emailToContact);
  if (msg) formData.append('msg', msg);
  if (recaptchaResponse) formData.append('g-recaptcha-response', recaptchaResponse);
  formData.append('lan', lan);
  
  if (state.filesArr && state.filesArr.length > 0) {
    for (var x = 0; x < state.filesArr.length; x++) {
      var f = x + 1;
      if (x < 5) {
        formData.append('fileupload' + f, state.filesArr[x]);
      }
    }
  }
  
  $.ajax({
    url: "/submit/",
    type: "POST",
    data: formData,
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
        $('#first_name_error').text('').hide();
        $('#phone_error').text('').hide();
        $('#email_error').text('').hide();
        $('#subject_error').text('').hide();
        $('#msg_error').text('').hide();
        $('#msqError').text('').hide(); // ✅ تصفير رسالة الخطأ المخصصة
        $('#captcha_error').text('').hide();
        
        if (grecaptcha) grecaptcha.reset();
        
        $("#captcha_form").addClass("d-none").removeClass("d-block");
        $("#successForm").addClass("d-block").removeClass("d-none");
        
        if ($(window).width() > 960) {
          $('html, body').animate({ scrollTop: 0 }, 'slow');
        } else {
          $('html, body').animate({
            scrollTop: $("#successMsg").offset().top
          });
        }
      } else {
        // عرض رسائل الخطأ القادمة من السيرفر
        if (data.first_name_error) $('#first_name_error').text(data.first_name_error).show();
        if (data.phone_error) $('#phone_error').text(data.phone_error).show();
        if (data.email_error) $('#email_error').text(data.email_error).show();
        if (data.subject_error) $('#subject_error').text(data.subject_error).show();
        if (data.msg_error) {
          $('#msg_error').text(data.msg_error).show();
          $('#msqError').text(data.msg_error).show(); // ✅ عرض الخطأ في #msqError أيضاً
          $('#msqalert').css('display', 'block');
        } else {
          $('#msg_error').hide();
          $('#msqError').hide();
          $('#msqalert').css('display', 'none');
        }
        if (data.captcha_error) $('#captcha_error').text(data.captcha_error).show();
        if (data.up_response) {
          $('.upload1').empty().append("<span class='filename1' style='color:red;'>" + data.up_response + "</span>").show();
        } else {
          $('.upload1').hide();
        }
        
        // إعادة تعيين custom validity
        $('#captcha_form input, #captcha_form textarea').each(function () {
          if (typeof this.setCustomValidity === 'function') {
            this.setCustomValidity('');
          }
        });
        
        if (lan == "ar") {
          $("#mail-status").html('<span style="color:red">حدث خطأ ما ! </span>');
        } else {
          $("#mail-status").html('<span style="color:red">An Error occurred! </span>');
        }
        
        if (grecaptcha) grecaptcha.reset();
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
// 🌐 تحميل الصفحة: تهيئة Bootstrap validation
// ===============================
(function () {
  'use strict';
  window.addEventListener('load', function () {
    var forms = document.getElementsByClassName('needs-validation');
    Array.prototype.filter.call(forms, function (form) {
      // لا نمنع الإرسال هنا لأننا نتعامل معه في submit handler بالأعلى
      form.addEventListener('submit', function (event) {
        // تم التعامل مع submit في الكود بالأعلى
      }, false);
    });
  }, false);
})();

// ===============================
// 🔐 reCAPTCHA setup
// ===============================
window.onload = function() {
  var recaptcha = document.querySelector('#g-recaptcha-response');
  if (recaptcha) {
    recaptcha.required = true;
    recaptcha.oninvalid = function(e) {
      $('.recaptcha_error').css('display', 'block');
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

// reCAPTCHA responsive scaling
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
// ✅ التحقق من الهاتف (نفس المنطق الأصلي + إزالة أحرف مخفية)
// ===============================
$('#phone_input_text').on('input', function () {
  var val = $(this).val();
  var cleaned = removeHiddenOnly(val);
  if (val !== cleaned) {
    $(this).val(cleaned);
  }
}).on('keypress', function(event){
  const allowedChars = '+0123456789-()/.\s';
  const char = String.fromCharCode(event.which);
  // Allow control keys (backspace, delete, arrows, etc.)
  if (event.ctrlKey || event.altKey || event.metaKey || event.which < 32) {
    return;
  }
  if (!allowedChars.includes(char)) {
    event.preventDefault();
  }
});

// ===============================
// 📋 تهيئة الصفحة
// ===============================
$(document).ready(function () {
  fillSelection();
  var length = $('select.custom-select > option').length;
  $("select.custom-select").change(function () {
    var selectedSubject = $("select.custom-select").children("option:selected").index();
    var inputs = document.querySelectorAll('.form-control');
    var fileinput = document.querySelector('.form-control-file');
    var sendbtn = document.querySelector('#send-message');
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

$('#btnUploadFile').click(function () { 
  $('.upload1').fadeOut(); 
});

$('#btnUploadFile').change(function () {
  $('.upload1').hide();
  var curFilesCount = state.filesCount;
  var curArray = state.filesArr;
  const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg'];
  const sizeLimit = 7000000; // 7 MB
  var filestate = true;
  
  // ✅ نمط محسّن لأسماء الملفات: يدعم العربية الكاملة + التشكيل + #
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
    
    // التحقق من الامتداد والحجم
    if (!allowedExtensions.includes(FileExt) || fileSize > sizeLimit) {
      if (lan == "ar") {
        $('.upload1').empty().append("نوع الملف غير مسموح به. الملفات المسموح بها: ('pdf', 'doc', 'docx', 'txt', 'png', 'jpg'). إذا رغبت برفع ملف من نوع آخر، يرجى التواصل على الخط الساخن 1333.").show();
      } else {
        $('.upload1').empty().append("File extension not allowed. Allowed file extensions are ('pdf', 'doc', 'docx', 'txt', 'png', 'jpg'). If you want to upload another file extension, please call the hotline 1333.").show();
      }
      this.value = null;
      filestate = false;
      continue;
    }
    
    if (fileSize <= 0) {
      if (lan == "ar") {
        $('.upload1').empty().append("الملف فارغ أو تالف. يرجى التحقق منه وإعادة المحاولة.").show();
      } else {
        $('.upload1').empty().append("The file is empty or corrupted. Please check and try again.").show();
      }
      this.value = null;
      filestate = false;
      continue;
    }
    
    if (tempFilesCount > 5) {
      if (lan == "ar") {
        $('.upload1').empty().append("يسمح بإرفاق 5 ملفات فقط.").show();
      } else {
        $('.upload1').empty().append("Only 5 files are allowed to be attached.").show();
      }
      this.value = null;
      filestate = false;
      continue;
    }
    
    if (baseName.length > 50) {
      if (lan == "ar") {
        $('.upload1').empty().append("اسم الملف طويل جداً. يرجى اختصاره إلى 50 حرفاً كحد أقصى.").show();
      } else {
        $('.upload1').empty().append("File name is too long. Please shorten it to max 50 characters.").show();
      }
      this.value = null;
      filestate = false;
      continue;
    }
    
    // ✅ التحقق من النمط (يدعم التشكيل الآن)
    if (!pattern.test(FileName)) {
      if (lan == "ar") {
        $('.upload1').empty().append("يحتوي اسم الملف على رموز غير مسموح بها. يرجى إعادة تسمية الملف.").show();
      } else {
        $('.upload1').empty().append("File name contains unallowed characters. Please rename the file.").show();
      }
      this.value = null;
      filestate = false;
      continue;
    }
  }
  
  if (filestate && upfiles && upfiles.length > 0) {
    var newFilesCount = upfiles.length;
    var newfilesArr = Array.from(upfiles);
    
    if (curFilesCount !== undefined) {
      newFilesCount = curFilesCount + newFilesCount;
    }
    if (curArray !== undefined) {
      newfilesArr = curArray.concat(newfilesArr);
    }
    
    updateState({
      filesArr: newfilesArr,
      filesCount: newFilesCount
    });
    
    renderFileList();
    this.value = null;
  }
});

// ===============================
// 📋 عرض قائمة الملفات المرفقة
// ===============================
function renderFileList() {
  if (!state.filesArr || state.filesArr.length === 0) {
    $('#filelist').html('');
    return;
  }
  
  let fileMap = state.filesArr.map((file, index) => {
    let suffix = "bytes";
    let size = file.size;
    
    if (size >= 1024 && size < 1024000) {
      suffix = "KB";
      size = Math.round(size / 1024 * 100) / 100;
    } else if (size >= 1024000) {
      suffix = "MB";
      size = Math.round(size / 1024000 * 100) / 100;
    }
    
    return `<li key="${index}">${htmlEntities(file.name)}<span class="file-size">${size} ${suffix}</span><i class="fas fa-trash" style="cursor: pointer;"></i></li>`;
  });
  
  $('#filelist').html(fileMap.join(''));
}

// ===============================
// 🗑️ حذف ملف من القائمة
// ===============================
$(".filename-container1").on("click", "li > i", function (e) {
  let curCount = state.filesCount;
  curCount = curCount - 1;
  let key = parseInt($(this).parent().attr("key"));
  let curArr = state.filesArr;
  
  if (!isNaN(key) && curArr && curArr[key]) {
    curArr.splice(key, 1);
  }
  
  if (!curArr || curArr.length === 0) {
    curArr = null;
    curCount = 0;
  }
  
  renderFileList();
  updateState({
    filesArr: curArr,
    filesCount: curCount
  });
});

// ===============================
// 🔒 تشفير HTML لمنع XSS
// ===============================
function htmlEntities(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ===============================
// 🎯 ملء الاختيار بناءً على رابط الصفحة
// ===============================
function fillSelection() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('v') == 1) {
    $("select.custom-select").prop('selectedIndex', 2);
  }
}