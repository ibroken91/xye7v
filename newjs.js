// ===============================
// 🆕 sanitize + hidden cleaner
// ===============================
function sanitizeInput(text) {
  return text
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function removeHiddenOnly(text) {
  return text.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, "");
}


// ===============================
// 🆕 regex validation
// ===============================
function validateField(input) {
  var pattern = /^$|^[\p{Script=Arabic}a-zA-Z0-9 \-_!@,():.?+~\r\n]+$/u;

  var value = input.value;

  var isValid = pattern.test(value);

  input.setCustomValidity(isValid ? '' : 'Please match the format requested.');

  return isValid;
}


// ===============================
// 🆕 أثناء الكتابة (UX آمن)
// ===============================
$('input, textarea').on('input', function () {
  var val = $(this).val();

  var cleaned = removeHiddenOnly(val);

  if (val !== cleaned) {
    $(this).val(cleaned);
  }

  validateField(this);
});


// ===============================
// 🆕 عند الخروج من الحقل
// ===============================
$('input, textarea').on('blur', function () {
  var cleaned = sanitizeInput($(this).val());
  $(this).val(cleaned);

  validateField(this);
});


// ===============================
// الحالة الأصلية
// ===============================
var state = { files: [], filesArr: [], filesCount: 0 };


// ===============================
// AJAX + Bootstrap validation
// ===============================
(function () {
  'use strict';
  window.addEventListener('load', function () {

    var forms = document.getElementsByClassName('needs-validation');

    Array.prototype.filter.call(forms, function (form) {

      form.addEventListener('submit', function (event) {

        event.preventDefault();
        event.stopPropagation();

        // 🆕 تنظيف جميع الحقول قبل أي شيء
        $('input, textarea').each(function () {
          var cleaned = sanitizeInput($(this).val());
          $(this).val(cleaned);
        });

        // 🆕 تحقق إضافي regex
        var inputs = form.querySelectorAll('input, textarea');
        var customValid = true;

        inputs.forEach(function (input) {
          if (!validateField(input)) {
            customValid = false;
          }
        });

        if (form.checkValidity() === false || !customValid) {
          $('#send-message').attr('disabled', false);
        }
        else {

          // ===============================
          // 🆕 القيم بعد التنظيف
          // ===============================
          var first_name = $('#name_input_text').val();
          var phone = $('#phone_input_text').val();
          var email = $('#email_input_text').val();

          var subject = $('#first_subject_input_text').text() ?
            $("select.custom-select").children("option:selected").text() + " : " + $('#second_subject_input_text').val()
            : $("select.custom-select").children("option:selected").text();

          var msg = $('#msq_input_text').val();
          var lan = $('html')[0].lang;
          var recaptcha = grecaptcha.getResponse();

          var formData = new FormData();
          var emailToContact = 1;

          if (first_name) formData.append('first_name', first_name);
          if (phone) formData.append('phone', phone);
          if (email) formData.append('email', email);
          if (subject) formData.append('subject', subject);
          if (emailToContact) formData.append('emailToContact', emailToContact);
          if (msg) formData.append('msg', msg);
          if (recaptcha) formData.append('g-recaptcha-response', recaptcha);

          formData.append('lan', lan);

          if (state.filesArr.length > 0) {
            for (var x = 0; x < state.filesArr.length; x++) {
              var f = x + 1;
              if (x !== 5) {
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

            success: function (data) {
              $('#send-message').attr('disabled', false);

              if (data.success) {
                $('#captcha_form')[0].reset();

                $('#first_name_error').text('');
                $('#phone_error').text('');
                $('#email_error').text('');
                $('#subject_error').text('');
                $('#msg_error').text('');
                $('#captcha_error').text('');

                grecaptcha.reset();

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

                $('#first_name_error').text(data.first_name_error);
                $('#phone_error').text(data.phone_error);
                $('#email_error').text(data.email_error);
                $('#subject_error').text(data.subject_error);
                $('#msg_error').text(data.msg_error);
                $('#captcha_error').text(data.captcha_error);

                $('#up_error1').text(data.up_response);

                if (data.up_response == null) {
                  $('.upload1').hide();
                } else {
                  $('.upload1')
                    .empty()
                    .append("<span class='filename1' style='color:red;'>" + data.up_response + "</span>")
                    .show();
                }

                if (data.msg_error !== "") {
                  $('#msqalert').css('display', 'block');
                }

                $("#mail-status").html(
                  lan === "ar"
                    ? '<span style="color:red">حدث خطأ ما !</span>'
                    : '<span style="color:red">An Error occurred!</span>'
                );

                $('#send-message').attr('disabled', false);
                $('.contact-info').css('margin-bottom', '180px');

                grecaptcha.reset();
                $('#loader-icon').attr("hidden", true);
              }
            },

            error: function () {
              $("#mail-status").html(
                $('html')[0].lang === "ar"
                  ? '<span style="color:red">حدث خطأ ما !</span>'
                  : '<span style="color:red">Something went wrong!</span>'
              );

              $('#loader-icon').attr("hidden", true);
              $('#send-message').attr('disabled', false);
            }
          });
        }

        form.classList.add('was-validated');

      }, false);
    });
  }, false);
})();