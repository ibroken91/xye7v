// Example starter JavaScript for disabling form submissions if there are invalid fields
const element = document.querySelector('#captcha_form');
element.addEventListener('submit', event => {
  event.preventDefault();

})
var state = { files: [], filesArr: [], filesCount: 0 };
//ajax request
(function () {
  'use strict';
  window.addEventListener('load', function () {
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    var forms = document.getElementsByClassName('needs-validation');
    // Loop over them and prevent submission
    var validation = Array.prototype.filter.call(forms, function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (form.checkValidity() === false) {
          $('#send-message').attr('disabled', false);
        }
        else {
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
          //var emailToContact = $('#first_subject_input_text').val();
          var emailToContact = 1;
          if (first_name) {
            formData.append('first_name', first_name);
          }
          if (phone) {
            formData.append('phone', phone);
          }
          if (email) {
            formData.append('email', email);
          }
          if (subject) {
            formData.append('subject', subject);
          }
          if(emailToContact){
            formData.append('emailToContact', emailToContact);
          }
          if (msg) {
            formData.append('msg', msg);
          }
          if (recaptcha) {
            formData.append('g-recaptcha-response', recaptcha);
          }

          formData.append('lan', lan);
          if (state.filesArr.length > 0) {
            for (var x = 0; x < state.filesArr.length; x++) {
              var f = x + 1
              if (x !== 5) {
                formData.append('fileupload' + f + '', state.filesArr[x]);
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
              // var obj = JSON.parse(data);
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

                $("#captcha_form").addClass("d-none");
                $("#captcha_form").removeClass("d-block");
                $("#successForm").addClass("d-block");
                $("#successForm").removeClass("d-none");

                if ($(window).width() > 960) {
                  $('html, body').animate({ scrollTop: 0 }, 'slow');
                }
                else {
                  $('html, body').animate({
                    scrollTop: $("#successMsg").offset().top
                  });
                }
              }
              else {
                $('#first_name_error').text(data.first_name_error).show();
                $('#captcha_form input').each(function () { this.setCustomValidity(''); });
                $('#phone_error').text(data.phone_error);
                $('#phone_error').text(data.phone_error);
                $('#email_error').text(data.email_error);
                $('#up_error1').text(data.up_response);

                if (data.up_response == null) {
                  $('.upload1').hide();
                }
                else {
                  $('.upload1').empty().append("<span  class='filename1' style='color:red;'>" + data.up_response + "</span>").show();
                }


                $('#subject_error').text(data.subject_error);
                $('#msg_error').text(data.msg_error);
                if (!data.msg_error == "") {
                  $('#msqalert').css('display', 'block');
                }

                $('#captcha_error').text(data.captcha_error);
                if (lan == "ar") {
                  $("#mail-status").html('<span style="color:red">حدث خطأ ما !</span>');
                }
                else {
                  $("#mail-status").html('<span style="color:red">An Error occurred!</span>');
                }

                $('#send-message').attr('disabled', false);

                $('.contact-info').css('margin-bottom', '180px');
                 grecaptcha.reset();
                $('#loader-icon').attr("hidden", true);

              }
            },
            error: function (xhr, desc, err) {
              if (lan == "ar") {
                $("#mail-status").html('<span style="color:red">حدث خطأ ما !</span>');
              }
              else {
                $("#mail-status").html('<span style="color:red">Something went wrong!</span>');
              }
              $('#loader-icon').attr("hidden", true);
              $('#send-message').attr('disabled', false);
            }
          })
          event.preventDefault();
        }
        form.classList.add('was-validated');
      }, false);
    });
  }, false);
})();


////////////////////////////////
//recaptcha
  window.onload = function() {
  var recaptcha = document.querySelector('#g-recaptcha-response');
 if(recaptcha) {
 recaptcha.required = true
 recaptcha.oninvalid = function(e) {
 
 $('.recaptcha_error').css('display', 'block');
}
 }
}

function invalidfn(elementInvalid) {
  var elementInvalid = document.getElementById(elementInvalid);

  $(elementInvalid).css('display', 'block');

}
function validfn(elementInvalid) {
  var elementInvalid = document.getElementById(elementInvalid);

  $(elementInvalid).css('display', 'none');

}
function recaptchaCallback() {
  $('.recaptcha_error').css('display', 'none');
};

var width = $('.g-recaptcha').parent().width();
if (width < 302) {
  var scale = width / 302;
  $('.g-recaptcha').css('transform', 'scale(' + scale + ')');
  $('.g-recaptcha').css('-webkit-transform', 'scale(' + scale + ')');
  $('.g-recaptcha').css('transform-origin', '0 0');
  $('.g-recaptcha').css('-webkit-transform-origin', '0 0');

}

function validateField(input) {
  var errorMsg = "Please match the format requested.";

  // Whitelist only (blocks <>&" etc. for XSS): Latin/digits/punctuation; Arabic letters & Indic digits;
  // Tatweel (U+0640); harakat & Arabic marks (U+064B–U+065F); superscript alif (U+0670).
  var pattern = new RegExp(/^$|^[\u0621-\u064A\u0660-\u0669a-zA-Z0-9\-_ !(),:؟?.ـ@+\r\n\u0640\u064B-\u065F\u0670]+$/);
  
  var fieldValue = $(input).val();
  
  var hasError = !fieldValue.match(pattern);
  
  if (typeof input.setCustomValidity === 'function') {
    input.setCustomValidity(hasError ? errorMsg : '');
  } else {
    $(input).toggleClass('is-invalid', !!hasError);
    $(input).toggleClass('is-valid', !hasError);
    if (hasError) {
      $(input).attr('title', errorMsg);
    } else {
      $(input).removeAttr('title');
    }
  }
  
  return !hasError;
}

// Apply validation to the msq_input_text textarea (input: IME/diacritics & paste; keyup: legacy)
$('#msq_input_text').on('input keyup', function () {
  validateField(this);
});

// Apply validation to other textarea and text input elements by their IDs
$('#second_subject_input_text, #name_input_text').on('input', function () {
  validateField(this);
  
});

$('#phone_input_text').on('keypress', function(event){
  const allowedChars = '+0123456789-()/.\s';
  const char = String.fromCharCode(event.which);

  //Allow control keys (e.g., backspace , delete ,arrows)
  if(event.ctrlKey || event.altKey || event.metaKey || event.which <32) {
    return;
  }

  if (!allowedChars.includes(char)) {
    event.preventDefault();
  }
});

$(document).ready(function () {
  fillSelection();
  var length = $('select.custom-select > option').length;
  $("select.custom-select").change(function () {
    var selectedSubject = $("select.custom-select").children("option:selected").index();
    var inputs = document.querySelectorAll('.form-control');
    var fileinput = document.querySelector('.form-control-file');
    var sendbtn = document.querySelector('#send-message');
    $('#infoMessage').remove();
  //   if (selectedSubject == length - 1) {
  //     $("#subject-1").attr("hidden", false)
  //     $("#second_subject_input_text").attr("required", true)
  //      emailToContact = 1;
  //      inputs.forEach(function(input){
  //       input.disabled = false;
  //     });
  //     fileinput.disabled = false;
  //     sendbtn.disabled = false;
  //   }
  //  else if (selectedSubject == length - 2) {
  //   $("#subject-1").attr("hidden", true)
  //   $("#second_subject_input_text").attr("required", false)
  //    var lan = $('html')[0].lang;
  //     fileinput.disabled = true;
  //     sendbtn.disabled = true;
  //     inputs.forEach(function(input){
  //       input.disabled = true;
  //     });
  //     if (lan == "ar") {
  //     var msgDiv = $(`
  //     <div id="infoMessage" class="col-xl-7 mb-3">
  //       <div class="alert alert-info" role="alert">
  //         <h4 class="alert-heading"> توجيه لجهة الإختصاص </h4>
  //           <p>في حال تعرض الأفراد للابتزاز او الإحتيال الإلكتروني فيمكنهم التواصل مع الجهة المختصة ( شرطة عُمان السلطانية) عبر قنوات التواصل </p>
  //             <hr>
  //             <p> رقم الهاتف : 80077444</p>
  //             <p> البريد الإلكتروني : ecocrime@rop.gov.om</p>
  //       </div>
  //     </div>
  //     `);
  //     }
  //     else {
  //       var msgDiv = $(`
  //     <div id="infoMessage" class="col-xl-7 mb-3">
  //       <div class="alert alert-info" role="alert">
  //         <h4 class="alert-heading"> Referral to the competent authority </h4>
  //           <p>Members of the public who experience blackmail or fraud online should communicate with the competent authority (Royal Oman Police) via contact </p>
  //             <hr>
  //             <p> Tel : 80077444</p>
  //             <p> Email : ecocrime@rop.gov.om</p>
  //       </div>
  //     </div>
  //     `);
  //     }
  //     $('#first_subject_input_text').closest('.form-row').append(msgDiv);
  //   }
  //   else {
  //     $("#subject-1").attr("hidden", true)
  //     $("#second_subject_input_text").attr("required", false)
  //      emailToContact = 2;
  //      inputs.forEach(function(input){
  //       input.disabled = false;
  //     });
  //     fileinput.disabled = false;
  //     sendbtn.disabled = false;
  //   }
  });
});
////////////////////////////////////
// no react or anything
//Upload function
//upload 1
$('#del-btn1').hide();
// state management
function updateState(newState) {
  state = { ...state, ...newState };
}
$('#btnUploadFile').click(function () { $('.upload1').fadeOut(); });
$('#btnUploadFile').change(function () {
  $('.upload1').hide();
  var curFilesCount = state.filesCount;
  var curArray = state.filesArr;
  const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg'],
    sizeLimit = 7000000, maxFileNameLimit = 50; // 7 megabyte
  var filestate = true;
  var pattern = new RegExp(/^$|^[\u0621-\u064A\u0660-\u0669a-zA-Z0-9\-_# !(),:؟?.ـ@+\r\n]+$/);
  var upfiles = document.getElementsByName("file1")[0].files;
  var tempFilesCount = curFilesCount + upfiles.length;
  for (var i = 0; i < upfiles.length; i++) {
    var file = upfiles[i];
    var FileName = file.name;
    var baseName = FileName.split('.').slice(0,-1).join('.');
    var fileSize = file.size;
    var lan = $('html')[0].lang;
    var FileExt = FileName.substr(FileName.lastIndexOf('.') + 1);
    if (!allowedExtensions.includes(FileExt) || fileSize > sizeLimit) {
      if (lan == "ar") {
        $('.upload1').empty().append("<span  class='filename1' style='color:red;'> نوع الملف غير مسموح به <br>الملفات المسموح بها ('pdf', 'doc', 'docx', 'txt', 'png', 'jpg') <br></span> <span  class='filename1' style='color:red;'>   إذا رغبت برفع ملف من نوع آخر، يرجى التواصل على الخط الساخن <span style='direction: ltr;'>  8000&nbsp;8080.</span>  </span>").show();
      }
      else {
        $('.upload1').empty().append("<span  class='filename1' style='color:red;'> File extention not allowed. <br>Allowed file extentions are ('pdf', 'doc', 'docx', 'txt', 'png', 'jpg').</span> <span  class='filename1' style='color:red;'><br>  If you want to upload another file extention, please call the hotline<span style='direction: ltr;'>8000&nbsp;8080.</span>  </span>").show();
      }
      this.value = null;
      var filestate = false;
    }
    if (fileSize > sizeLimit || fileSize <= 0) {
      if (lan == "ar") {
        $('.upload1').empty().append("<span  class='filename1' style='color:red;'>   تجاوز حجم الملف الحد المسموح به أو أن الملف فارغ. وإذا  رغبت برفع ملف بحجم أكبر يرجى التواصل على الخط الساخن <span style='direction: ltr;'>  1333</span>  <br> الحجم المسموح به : 7 ميجا بايت</span>").show();
      }
      else {
        $('.upload1').empty().append("<span  class='filename1' style='color:red;'> The file size exceeded the allowed limit or the file is empty. If you want to upload a file of a bigger size, please call through the hotline 1333. <br> Allowed size: 7 MB</span>").show();
      }
      this.value = null;
      var filestate = false;
    }
    if (tempFilesCount > 5) {
      if (lan == "ar") {
        $('.upload1').empty().append("<span  class='filename1' style='color:red;'>  يسمح بإرفاق عدد 5 ملفات فقط.</span>").show();
      }
      else {
        $('.upload1').empty().append("<span  class='filename1' style='color:red;'> Only 5 files are allowed to be attached.</span>").show();
      }
      this.value = null;
      var filestate = false;
    }
    if (baseName.length > 150) {
      if (lan == "ar") {
        $('.upload1').empty().append("<span  class='filename1' style='color:red;'>  يرجى التحقق من طول اسم الملف ، يجب ان لايتجاوز عدد 50 احرف.</span>").show();
      }
      else {
        $('.upload1').empty().append("<span  class='filename1' style='color:red;'> The file name exceeded the allowed limit. It must not contain more than 50 characters </span>").show();
      }
      this.value = null;
      var filestate = false;
    }
    if (!FileName.match(pattern)) {
      if (lan == "ar") {
        $('.upload1').empty().append("<span  class='filename1' style='color:red;'>  يحتوي اسم الملف على رموز غير مسموح بها. يرجى إعادة تسمية الملف .</span>").show();
      }
      else {
        $('.upload1').empty().append("<span  class='filename1' style='color:red;'> File name contains unallowed characters. Please rename the file.</span>").show();
      }
      this.value = null;
      var filestate = false;
    }
  }
  if (filestate) {
    var files = document.getElementsByName("file1")[0].files;
    var newFilesCount = files.length;
    var newfilesArr = Array.from(files);
    if (curFilesCount != undefined) {
      newFilesCount = curFilesCount + newFilesCount;
    }
    if (curArray != undefined) {
      newfilesArr = curArray.concat(newfilesArr);
    }
    updateState({
      filesArr: newfilesArr,
      filesCount: newFilesCount
    });
    renderFileList();
    this.value = null;
  }
})
// event handlers
function renderFileList() {
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
    return `<li key="${index}" >${htmlEntities(file.name)
      } <span class="file-size">${size} ${suffix}</span><i class="fas fa-trash" style='cursor: pointer;'> </i></li>`;
  });
  $('#filelist').html(fileMap);
}

$(".filename-container1").on("click", "li > i", function (e) {
  let curCount = state.filesCount;
  curCount = curCount - 1;
  let key = $(this).parent().attr("key");
  let curArr = state.filesArr;
  curArr.splice(key, 1);
  if (curArr.length == 0) {
    curArr = null;
  }
  renderFileList();
  updateState({
    filesArr: curArr,
    filesCount: curCount
  });
});
///////////////////////////////////
function htmlEntities(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fillSelection() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('v') == 1)
    $("select.custom-select").prop('selectedIndex', 2)
}
